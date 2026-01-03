-- ============================================================================
-- Backtrack Profile Photos Migration
-- ============================================================================
-- This migration creates the profile_photos table for user verification photos
-- with automated content moderation via Google Cloud Vision SafeSearch API.
-- ============================================================================

-- ============================================================================
-- PROFILE PHOTOS TABLE
-- ============================================================================
-- Stores user verification photos that can be reused across posts.
-- Each photo goes through automated content moderation before approval.

CREATE TABLE IF NOT EXISTS profile_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    storage_path TEXT NOT NULL,
    moderation_status TEXT DEFAULT 'pending' NOT NULL,
    moderation_result JSONB,
    is_primary BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Validate moderation status values
    CONSTRAINT profile_photos_valid_status CHECK (
        moderation_status IN ('pending', 'approved', 'rejected', 'error')
    )
);

-- Comment on profile_photos table and columns
COMMENT ON TABLE profile_photos IS 'User verification photos for post creation with content moderation';
COMMENT ON COLUMN profile_photos.id IS 'Unique identifier for the photo';
COMMENT ON COLUMN profile_photos.user_id IS 'User who owns this photo';
COMMENT ON COLUMN profile_photos.storage_path IS 'Path to the photo in Supabase Storage (selfies bucket)';
COMMENT ON COLUMN profile_photos.moderation_status IS 'Content moderation status: pending, approved, rejected, or error';
COMMENT ON COLUMN profile_photos.moderation_result IS 'JSONB result from Google Cloud Vision SafeSearch API';
COMMENT ON COLUMN profile_photos.is_primary IS 'Whether this is the user''s primary/default photo';
COMMENT ON COLUMN profile_photos.created_at IS 'Timestamp when the photo was uploaded';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_profile_photos_user_id ON profile_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_photos_status ON profile_photos(moderation_status);
CREATE INDEX IF NOT EXISTS idx_profile_photos_created_at ON profile_photos(created_at DESC);

-- Composite index for fetching user's approved photos (common query pattern)
CREATE INDEX IF NOT EXISTS idx_profile_photos_user_approved
    ON profile_photos(user_id, created_at DESC)
    WHERE moderation_status = 'approved';

-- Composite index for fetching user's primary photo
CREATE INDEX IF NOT EXISTS idx_profile_photos_user_primary
    ON profile_photos(user_id)
    WHERE is_primary = TRUE;

-- ============================================================================
-- ADD PHOTO REFERENCE TO POSTS TABLE
-- ============================================================================
-- Add optional photo_id column to posts table for referencing profile photos.
-- This allows posts to reference reusable profile photos instead of per-post selfies.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS photo_id UUID REFERENCES profile_photos(id) ON DELETE SET NULL;

-- Create index for photo lookups on posts
CREATE INDEX IF NOT EXISTS idx_posts_photo_id ON posts(photo_id) WHERE photo_id IS NOT NULL;

-- Comment on the new column
COMMENT ON COLUMN posts.photo_id IS 'Optional reference to a profile photo used for verification (alternative to selfie_url)';

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on profile_photos table
ALTER TABLE profile_photos ENABLE ROW LEVEL SECURITY;

-- Users can only view their own photos
DROP POLICY IF EXISTS "profile_photos_select_own" ON profile_photos;
CREATE POLICY "profile_photos_select_own" ON profile_photos
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can only insert their own photos
DROP POLICY IF EXISTS "profile_photos_insert_own" ON profile_photos;
CREATE POLICY "profile_photos_insert_own" ON profile_photos
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can only update their own photos (e.g., set as primary)
DROP POLICY IF EXISTS "profile_photos_update_own" ON profile_photos;
CREATE POLICY "profile_photos_update_own" ON profile_photos
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can only delete their own photos
DROP POLICY IF EXISTS "profile_photos_delete_own" ON profile_photos;
CREATE POLICY "profile_photos_delete_own" ON profile_photos
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- FUNCTIONS FOR PROFILE PHOTOS
-- ============================================================================

-- Function to ensure only one primary photo per user
-- When setting a photo as primary, unset any existing primary photo
CREATE OR REPLACE FUNCTION set_primary_photo(p_photo_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the user_id for this photo
    SELECT user_id INTO v_user_id
    FROM profile_photos
    WHERE id = p_photo_id AND user_id = auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Photo not found or access denied';
    END IF;

    -- Unset any existing primary photo for this user
    UPDATE profile_photos
    SET is_primary = FALSE
    WHERE user_id = v_user_id AND is_primary = TRUE;

    -- Set the new primary photo
    UPDATE profile_photos
    SET is_primary = TRUE
    WHERE id = p_photo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's approved photos
CREATE OR REPLACE FUNCTION get_approved_photos(p_user_id UUID DEFAULT NULL)
RETURNS SETOF profile_photos AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM profile_photos
    WHERE user_id = COALESCE(p_user_id, auth.uid())
    AND moderation_status = 'approved'
    ORDER BY is_primary DESC, created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get user's primary photo
CREATE OR REPLACE FUNCTION get_primary_photo(p_user_id UUID DEFAULT NULL)
RETURNS profile_photos AS $$
DECLARE
    v_photo profile_photos;
BEGIN
    SELECT * INTO v_photo
    FROM profile_photos
    WHERE user_id = COALESCE(p_user_id, auth.uid())
    AND moderation_status = 'approved'
    AND is_primary = TRUE
    LIMIT 1;

    -- If no primary photo, return the most recent approved photo
    IF v_photo.id IS NULL THEN
        SELECT * INTO v_photo
        FROM profile_photos
        WHERE user_id = COALESCE(p_user_id, auth.uid())
        AND moderation_status = 'approved'
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    RETURN v_photo;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user has any approved photos
CREATE OR REPLACE FUNCTION has_approved_photo(p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profile_photos
        WHERE user_id = COALESCE(p_user_id, auth.uid())
        AND moderation_status = 'approved'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get photo count for user (for enforcing limits)
CREATE OR REPLACE FUNCTION get_photo_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM profile_photos
    WHERE user_id = COALESCE(p_user_id, auth.uid())
    AND moderation_status IN ('pending', 'approved');

    RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to update moderation status (called by Edge Function)
-- Uses service role, not authenticated user
CREATE OR REPLACE FUNCTION update_photo_moderation(
    p_photo_id UUID,
    p_status TEXT,
    p_result JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE profile_photos
    SET
        moderation_status = p_status,
        moderation_result = p_result
    WHERE id = p_photo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER FOR AUTO-DELETE REJECTED PHOTOS FROM STORAGE
-- ============================================================================
-- Note: This creates a trigger that fires when moderation_status changes to 'rejected'.
-- The actual storage deletion should be handled by an Edge Function or webhook
-- since Supabase triggers can't directly delete from Storage.

-- We'll create a notification mechanism instead - rejected photos table
-- that can be processed by a cleanup job

CREATE TABLE IF NOT EXISTS rejected_photo_cleanup_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL,
    storage_path TEXT NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE rejected_photo_cleanup_queue IS 'Queue of rejected photos pending storage cleanup';

-- Function to queue rejected photos for cleanup
CREATE OR REPLACE FUNCTION queue_rejected_photo_cleanup()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when status changes to 'rejected'
    IF NEW.moderation_status = 'rejected' AND
       (OLD.moderation_status IS NULL OR OLD.moderation_status != 'rejected') THEN
        INSERT INTO rejected_photo_cleanup_queue (photo_id, storage_path, user_id)
        VALUES (NEW.id, NEW.storage_path, NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rejected photo cleanup queue
DROP TRIGGER IF EXISTS profile_photos_rejection_cleanup ON profile_photos;
CREATE TRIGGER profile_photos_rejection_cleanup
    AFTER UPDATE ON profile_photos
    FOR EACH ROW
    EXECUTE FUNCTION queue_rejected_photo_cleanup();

-- ============================================================================
-- STORAGE POLICIES FOR PROFILE PHOTOS
-- ============================================================================
-- Storage path pattern: selfies/{user_id}/profile/{photo_id}.jpg
-- These policies extend the existing selfies bucket policies

-- Note: Storage policies are typically set via Supabase Dashboard or separate
-- storage policy files. The path pattern for profile photos is:
-- selfies/{user_id}/profile/{photo_id}.jpg

-- ============================================================================
-- SETUP NOTES
-- ============================================================================
-- After running this migration:
-- 1. Deploy the moderate-image Edge Function for Google Cloud Vision integration
-- 2. Set GOOGLE_CLOUD_VISION_API_KEY secret in Supabase Edge Functions
-- 3. Update storage policies to allow the profile/ subdirectory pattern
-- 4. Consider setting up a cron job to process rejected_photo_cleanup_queue
-- 5. Maximum photos per user is enforced at application level (5 recommended)
-- ============================================================================
