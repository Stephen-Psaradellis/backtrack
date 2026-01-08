-- ============================================================================
-- Avatar Snapshots Storage Bucket Migration
-- ============================================================================
-- This migration creates the 'avatar-snapshots' storage bucket for caching
-- 3D avatar renderings as static images.
--
-- Task 16 of AVATAR_3D_PLAN.md - Snapshot Storage Service
--
-- Key features:
-- - PUBLIC bucket for fast, cacheable avatar images
-- - Content addressed storage using config hashes as filenames
-- - Long cache duration (immutable content based on hash)
-- - Authenticated write access only
-- ============================================================================

-- ============================================================================
-- CREATE AVATAR SNAPSHOTS STORAGE BUCKET
-- ============================================================================
-- The bucket is PUBLIC because avatar images are not sensitive
-- and need to be efficiently served without signed URLs.
-- Content is effectively immutable (hash-based filenames).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatar-snapshots',
    'avatar-snapshots',
    true,  -- Public bucket for cacheable avatar images
    1048576,  -- 1MB max file size (PNG/JPEG snapshots are typically <100KB)
    ARRAY['image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE OBJECT POLICIES FOR AVATAR-SNAPSHOTS BUCKET
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SELECT (Download) Policy - Public Read
-- ----------------------------------------------------------------------------
-- Anyone can read avatar snapshots (public bucket).
-- This enables efficient CDN caching and fast image loading.

DROP POLICY IF EXISTS "avatar_snapshots_public_read" ON storage.objects;
CREATE POLICY "avatar_snapshots_public_read"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'avatar-snapshots');

-- ----------------------------------------------------------------------------
-- INSERT (Upload) Policy - Authenticated Only
-- ----------------------------------------------------------------------------
-- Only authenticated users can upload snapshots.
-- This prevents abuse while allowing the app to cache generated images.

DROP POLICY IF EXISTS "avatar_snapshots_authenticated_insert" ON storage.objects;
CREATE POLICY "avatar_snapshots_authenticated_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'avatar-snapshots');

-- ----------------------------------------------------------------------------
-- UPDATE Policy - Authenticated Only
-- ----------------------------------------------------------------------------
-- Allow authenticated users to update/replace snapshots.
-- This enables upsert behavior for the same config hash.

DROP POLICY IF EXISTS "avatar_snapshots_authenticated_update" ON storage.objects;
CREATE POLICY "avatar_snapshots_authenticated_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'avatar-snapshots')
    WITH CHECK (bucket_id = 'avatar-snapshots');

-- ----------------------------------------------------------------------------
-- DELETE Policy - Authenticated Only
-- ----------------------------------------------------------------------------
-- Allow authenticated users to delete snapshots.
-- Primarily for cleanup operations.

DROP POLICY IF EXISTS "avatar_snapshots_authenticated_delete" ON storage.objects;
CREATE POLICY "avatar_snapshots_authenticated_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'avatar-snapshots');

-- ============================================================================
-- SNAPSHOT CACHE TABLE (Optional - for tracking and analytics)
-- ============================================================================
-- Tracks generated snapshots for analytics and potential cleanup.
-- This is optional but useful for monitoring cache usage.

CREATE TABLE IF NOT EXISTS avatar_snapshot_cache (
    -- Hash of the avatar config (primary key, used as filename)
    config_hash TEXT PRIMARY KEY,

    -- Storage path in the bucket
    storage_path TEXT NOT NULL,

    -- Snapshot metadata
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    format TEXT NOT NULL DEFAULT 'png',
    file_size_bytes INTEGER,

    -- Generation metadata
    generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Access tracking (updated on each access)
    last_accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    access_count INTEGER DEFAULT 0 NOT NULL,

    -- Constraints
    CONSTRAINT avatar_snapshot_cache_valid_format CHECK (
        format IN ('png', 'jpeg', 'jpg')
    ),
    CONSTRAINT avatar_snapshot_cache_valid_dimensions CHECK (
        width > 0 AND width <= 2048 AND height > 0 AND height <= 2048
    )
);

-- Comment on table
COMMENT ON TABLE avatar_snapshot_cache IS 'Cache tracking table for avatar snapshots';
COMMENT ON COLUMN avatar_snapshot_cache.config_hash IS 'Deterministic hash of the avatar config';
COMMENT ON COLUMN avatar_snapshot_cache.storage_path IS 'Path to the snapshot in avatar-snapshots bucket';
COMMENT ON COLUMN avatar_snapshot_cache.access_count IS 'Number of times this snapshot has been accessed';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_avatar_snapshot_cache_last_accessed
    ON avatar_snapshot_cache(last_accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_avatar_snapshot_cache_generated_by
    ON avatar_snapshot_cache(generated_by);

-- ============================================================================
-- ROW LEVEL SECURITY FOR CACHE TABLE
-- ============================================================================

ALTER TABLE avatar_snapshot_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read cache entries (public data)
DROP POLICY IF EXISTS "avatar_snapshot_cache_public_read" ON avatar_snapshot_cache;
CREATE POLICY "avatar_snapshot_cache_public_read"
    ON avatar_snapshot_cache
    FOR SELECT
    TO public
    USING (true);

-- Authenticated users can insert cache entries
DROP POLICY IF EXISTS "avatar_snapshot_cache_authenticated_insert" ON avatar_snapshot_cache;
CREATE POLICY "avatar_snapshot_cache_authenticated_insert"
    ON avatar_snapshot_cache
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Authenticated users can update cache entries (for access tracking)
DROP POLICY IF EXISTS "avatar_snapshot_cache_authenticated_update" ON avatar_snapshot_cache;
CREATE POLICY "avatar_snapshot_cache_authenticated_update"
    ON avatar_snapshot_cache
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Only the creator or service role can delete cache entries
DROP POLICY IF EXISTS "avatar_snapshot_cache_delete_own" ON avatar_snapshot_cache;
CREATE POLICY "avatar_snapshot_cache_delete_own"
    ON avatar_snapshot_cache
    FOR DELETE
    TO authenticated
    USING (generated_by = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to record a snapshot cache entry
CREATE OR REPLACE FUNCTION record_avatar_snapshot(
    p_config_hash TEXT,
    p_storage_path TEXT,
    p_width INTEGER,
    p_height INTEGER,
    p_format TEXT DEFAULT 'png',
    p_file_size_bytes INTEGER DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO avatar_snapshot_cache (
        config_hash,
        storage_path,
        width,
        height,
        format,
        file_size_bytes,
        generated_by
    )
    VALUES (
        p_config_hash,
        p_storage_path,
        p_width,
        p_height,
        p_format,
        p_file_size_bytes,
        auth.uid()
    )
    ON CONFLICT (config_hash) DO UPDATE SET
        last_accessed_at = NOW(),
        access_count = avatar_snapshot_cache.access_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update access tracking
CREATE OR REPLACE FUNCTION track_snapshot_access(p_config_hash TEXT)
RETURNS void AS $$
BEGIN
    UPDATE avatar_snapshot_cache
    SET
        last_accessed_at = NOW(),
        access_count = access_count + 1
    WHERE config_hash = p_config_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old, unused snapshots
-- Call this periodically (e.g., weekly) to remove stale cache entries
CREATE OR REPLACE FUNCTION cleanup_stale_avatar_snapshots(
    p_days_stale INTEGER DEFAULT 90,
    p_min_access_count INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete cache entries that haven't been accessed in p_days_stale days
    -- and have less than p_min_access_count accesses
    DELETE FROM avatar_snapshot_cache
    WHERE last_accessed_at < NOW() - (p_days_stale || ' days')::INTERVAL
    AND access_count < p_min_access_count;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- Note: Actual storage file deletion should be handled by a separate
    -- cleanup job that reads from this table and deletes from storage

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION record_avatar_snapshot(TEXT, TEXT, INTEGER, INTEGER, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION track_snapshot_access(TEXT) TO authenticated;
-- cleanup_stale_avatar_snapshots should only be called by service role (cron jobs)

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the migration:
--
-- Check bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'avatar-snapshots';
--
-- Check policies exist:
-- SELECT policyname, cmd FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects'
-- AND policyname LIKE 'avatar_snapshots%';
--
-- Check table exists:
-- SELECT * FROM avatar_snapshot_cache LIMIT 0;
--
-- ============================================================================
-- USAGE NOTES
-- ============================================================================
--
-- Storage Path Pattern:
-- avatars/{first_2_chars_of_hash}/{full_hash}.{format}
-- Example: avatars/a3/a3b5c7d9e1f20004.png
--
-- This pattern allows for:
-- 1. Efficient directory listing (max ~256 subdirs)
-- 2. Deterministic URLs based on config hash
-- 3. Easy cleanup based on hash prefix
--
-- The hash is generated client-side using a deterministic algorithm
-- that produces the same output for the same avatar config.
--
-- ============================================================================
