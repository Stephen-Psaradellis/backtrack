-- ============================================================================
-- Love Ledger Storage Bucket & Policies Migration
-- ============================================================================
-- This migration creates the 'selfies' storage bucket and access policies:
-- - Private bucket for storing producer selfies
-- - Only authenticated users can upload their own selfies
-- - Only the selfie owner can access/download their images
-- - Automatic file path structure: {user_id}/{post_id}.jpg
--
-- PRIVACY PRINCIPLES:
-- 1. Selfies are NEVER publicly accessible
-- 2. Only the producer who uploaded the selfie can view it
-- 3. Consumers NEVER see the producer's selfie
-- 4. File paths use user_id to enforce ownership
-- ============================================================================

-- ============================================================================
-- CREATE SELFIES STORAGE BUCKET
-- ============================================================================
-- The bucket is created as private (public = false)
-- This ensures files require authenticated access

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'selfies',
    'selfies',
    false,  -- CRITICAL: Bucket is private, not public
    5242880,  -- 5MB max file size
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Add comment for documentation
COMMENT ON TABLE storage.buckets IS
'Storage buckets for the Love Ledger app. The selfies bucket stores producer verification images privately.';

-- ============================================================================
-- STORAGE OBJECT POLICIES FOR SELFIES BUCKET
-- ============================================================================
-- Storage uses RLS similar to regular tables
-- Policies control who can SELECT (download), INSERT (upload), UPDATE, DELETE

-- ----------------------------------------------------------------------------
-- SELECT (Download) Policy
-- ----------------------------------------------------------------------------
-- Users can ONLY download their own selfies
-- Path format: selfies/{user_id}/{filename}

CREATE POLICY "selfies_select_own"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'selfies'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ----------------------------------------------------------------------------
-- INSERT (Upload) Policy
-- ----------------------------------------------------------------------------
-- Users can ONLY upload to their own folder
-- Enforces path format: {user_id}/{post_id}.{ext}

CREATE POLICY "selfies_insert_own"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'selfies'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ----------------------------------------------------------------------------
-- UPDATE Policy
-- ----------------------------------------------------------------------------
-- Users can ONLY update their own selfies (e.g., replace with new version)

CREATE POLICY "selfies_update_own"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'selfies'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'selfies'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ----------------------------------------------------------------------------
-- DELETE Policy
-- ----------------------------------------------------------------------------
-- Users can ONLY delete their own selfies

CREATE POLICY "selfies_delete_own"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'selfies'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================================
-- HELPER FUNCTIONS FOR STORAGE OPERATIONS
-- ============================================================================

-- Function to generate the storage path for a selfie
-- Usage: SELECT get_selfie_storage_path(auth.uid(), post_id);
CREATE OR REPLACE FUNCTION get_selfie_storage_path(
    p_user_id UUID,
    p_post_id UUID
)
RETURNS TEXT AS $$
BEGIN
    RETURN p_user_id::text || '/' || p_post_id::text || '.jpg';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get the full storage URL for a selfie (owner only)
-- Returns NULL if user is not the owner
CREATE OR REPLACE FUNCTION get_selfie_url(
    p_user_id UUID,
    p_post_id UUID
)
RETURNS TEXT AS $$
DECLARE
    current_user_id UUID := auth.uid();
    storage_path TEXT;
BEGIN
    -- Only owner can get their selfie URL
    IF current_user_id != p_user_id THEN
        RETURN NULL;
    END IF;

    storage_path := get_selfie_storage_path(p_user_id, p_post_id);

    -- Return the internal path - actual URL generation happens in the app
    -- using supabase.storage.from('selfies').getPublicUrl() or createSignedUrl()
    RETURN storage_path;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if a selfie exists for a post
CREATE OR REPLACE FUNCTION selfie_exists(
    p_user_id UUID,
    p_post_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    storage_path TEXT;
BEGIN
    storage_path := get_selfie_storage_path(p_user_id, p_post_id);

    RETURN EXISTS (
        SELECT 1 FROM storage.objects
        WHERE bucket_id = 'selfies'
        AND name = storage_path
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to delete a selfie when a post is deleted
-- This should be called via trigger or explicitly when deleting posts
CREATE OR REPLACE FUNCTION delete_post_selfie()
RETURNS TRIGGER AS $$
DECLARE
    storage_path TEXT;
BEGIN
    -- Only delete selfie if post is being deleted
    storage_path := get_selfie_storage_path(OLD.producer_id, OLD.id);

    -- Delete from storage
    DELETE FROM storage.objects
    WHERE bucket_id = 'selfies'
    AND name = storage_path;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-delete selfie when post is deleted
DROP TRIGGER IF EXISTS trigger_delete_post_selfie ON posts;
CREATE TRIGGER trigger_delete_post_selfie
    BEFORE DELETE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION delete_post_selfie();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_selfie_storage_path(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_selfie_url(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION selfie_exists(UUID, UUID) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify storage is properly configured:
--
-- Check bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'selfies';
--
-- Check policies exist:
-- SELECT policyname, cmd FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects';
--
-- Test upload path validation (should succeed for own user_id):
-- -- In app: supabase.storage.from('selfies').upload(`${user_id}/${post_id}.jpg`, file)
--
-- ============================================================================
-- USAGE NOTES
-- ============================================================================
--
-- Client-side Upload Example (React Native):
-- ---------------------------------------------
-- const uploadSelfie = async (userId: string, postId: string, imageUri: string) => {
--   const formData = new FormData();
--   formData.append('file', {
--     uri: imageUri,
--     type: 'image/jpeg',
--     name: `${postId}.jpg`,
--   });
--
--   const { data, error } = await supabase.storage
--     .from('selfies')
--     .upload(`${userId}/${postId}.jpg`, formData, {
--       contentType: 'image/jpeg',
--       upsert: true,
--     });
--
--   return data?.path;
-- };
--
-- Client-side Download Example (React Native):
-- ---------------------------------------------
-- const getSelfieUrl = async (userId: string, postId: string) => {
--   // Only works if userId matches auth.uid() due to RLS
--   const { data } = await supabase.storage
--     .from('selfies')
--     .createSignedUrl(`${userId}/${postId}.jpg`, 3600); // 1 hour expiry
--
--   return data?.signedUrl;
-- };
--
-- IMPORTANT:
-- - Always use createSignedUrl() for downloads since bucket is private
-- - Never expose signed URLs to other users
-- - Selfies are for producer verification only, never shown to consumers
-- ============================================================================
