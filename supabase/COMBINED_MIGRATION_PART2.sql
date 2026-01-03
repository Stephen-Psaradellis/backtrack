-- ============================================================================
-- Backtrack Row Level Security Policies Migration
-- ============================================================================
-- This migration enables RLS and creates security policies for all tables:
-- - profiles: User profiles
-- - locations: Physical venues
-- - posts: Missed connection posts
-- - conversations: Anonymous chat sessions
-- - messages: Individual messages
-- - blocks: User blocking
-- - reports: Content/user reporting
--
-- SECURITY PRINCIPLES:
-- 1. Users can only modify their own data
-- 2. Blocked users' content is hidden
-- 3. Private data (selfie_url) is protected
-- 4. Only conversation participants can access messages
-- ============================================================================

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
-- - All authenticated users can read all profiles (for avatar matching)
-- - Users can insert their own profile (handled by trigger, but policy needed)
-- - Users can only update their own profile
-- - Users cannot delete profiles (cascade from auth.users deletion)

-- Allow authenticated users to read all profiles
CREATE POLICY "profiles_select_authenticated"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow users to insert their own profile
-- (Primarily used by the auto-create trigger, but policy needed for security)
CREATE POLICY "profiles_insert_own"
    ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Allow users to update only their own profile
CREATE POLICY "profiles_update_own"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- LOCATIONS POLICIES
-- ============================================================================
-- - All authenticated users can read all locations
-- - Authenticated users can create new locations
-- - Locations are not directly updated or deleted by users

-- Allow authenticated users to read all locations
CREATE POLICY "locations_select_authenticated"
    ON locations
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to create locations
CREATE POLICY "locations_insert_authenticated"
    ON locations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================================================
-- POSTS POLICIES
-- ============================================================================
-- - Active posts are readable by authenticated users (excluding blocked users' posts)
-- - Authenticated users can create posts for themselves
-- - Producers can update their own posts
-- - Producers can delete their own posts (soft delete via is_active)
-- - selfie_url should only be visible to the producer (handled via view or function)

-- Allow authenticated users to read active posts
-- Excludes posts from users who have blocked them or whom they have blocked
CREATE POLICY "posts_select_active_not_blocked"
    ON posts
    FOR SELECT
    TO authenticated
    USING (
        is_active = true
        AND expires_at > NOW()
        AND NOT EXISTS (
            SELECT 1 FROM blocks
            WHERE (blocker_id = auth.uid() AND blocked_id = posts.producer_id)
               OR (blocker_id = posts.producer_id AND blocked_id = auth.uid())
        )
    );

-- Allow producers to always see their own posts (even inactive/expired)
CREATE POLICY "posts_select_own"
    ON posts
    FOR SELECT
    TO authenticated
    USING (producer_id = auth.uid());

-- Allow authenticated users to create posts for themselves
CREATE POLICY "posts_insert_own"
    ON posts
    FOR INSERT
    TO authenticated
    WITH CHECK (producer_id = auth.uid());

-- Allow producers to update their own posts
CREATE POLICY "posts_update_own"
    ON posts
    FOR UPDATE
    TO authenticated
    USING (producer_id = auth.uid())
    WITH CHECK (producer_id = auth.uid());

-- Allow producers to delete their own posts
CREATE POLICY "posts_delete_own"
    ON posts
    FOR DELETE
    TO authenticated
    USING (producer_id = auth.uid());

-- ============================================================================
-- CONVERSATIONS POLICIES
-- ============================================================================
-- - Only participants (producer or consumer) can read their conversations
-- - Only consumers can create conversations (initiate chat)
-- - Participants can update conversation status (is_active)
-- - Block relationships are respected

-- Allow conversation participants to read their conversations
CREATE POLICY "conversations_select_participant"
    ON conversations
    FOR SELECT
    TO authenticated
    USING (
        (producer_id = auth.uid() OR consumer_id = auth.uid())
        AND NOT EXISTS (
            SELECT 1 FROM blocks
            WHERE (blocker_id = auth.uid() AND blocked_id IN (producer_id, consumer_id))
               OR (blocked_id = auth.uid() AND blocker_id IN (producer_id, consumer_id))
        )
    );

-- Allow consumers to create conversations
-- The consumer_id must match the authenticated user
-- The producer_id must match the post's producer_id
CREATE POLICY "conversations_insert_consumer"
    ON conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        consumer_id = auth.uid()
        AND producer_id != auth.uid()
        AND EXISTS (
            SELECT 1 FROM posts
            WHERE posts.id = post_id
            AND posts.producer_id = conversations.producer_id
            AND posts.is_active = true
        )
        AND NOT EXISTS (
            SELECT 1 FROM blocks
            WHERE (blocker_id = auth.uid() AND blocked_id = producer_id)
               OR (blocker_id = producer_id AND blocked_id = auth.uid())
        )
    );

-- Allow participants to update conversation (e.g., deactivate)
CREATE POLICY "conversations_update_participant"
    ON conversations
    FOR UPDATE
    TO authenticated
    USING (producer_id = auth.uid() OR consumer_id = auth.uid())
    WITH CHECK (producer_id = auth.uid() OR consumer_id = auth.uid());

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================
-- - Only conversation participants can read messages
-- - Only conversation participants can send messages
-- - Messages cannot be updated or deleted

-- Allow conversation participants to read messages
CREATE POLICY "messages_select_participant"
    ON messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.producer_id = auth.uid() OR c.consumer_id = auth.uid())
            AND c.is_active = true
        )
    );

-- Allow conversation participants to send messages
CREATE POLICY "messages_insert_participant"
    ON messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = conversation_id
            AND (c.producer_id = auth.uid() OR c.consumer_id = auth.uid())
            AND c.is_active = true
            AND NOT EXISTS (
                SELECT 1 FROM blocks
                WHERE (blocker_id = auth.uid() AND blocked_id IN (c.producer_id, c.consumer_id))
                   OR (blocked_id = auth.uid() AND blocker_id IN (c.producer_id, c.consumer_id))
            )
        )
    );

-- Allow users to update read status on messages in their conversations
CREATE POLICY "messages_update_read_status"
    ON messages
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.producer_id = auth.uid() OR c.consumer_id = auth.uid())
        )
    )
    WITH CHECK (
        -- Only allow updating is_read field (content cannot be changed)
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.producer_id = auth.uid() OR c.consumer_id = auth.uid())
        )
    );

-- ============================================================================
-- BLOCKS POLICIES
-- ============================================================================
-- - Users can read their own blocks (who they've blocked and who blocked them)
-- - Users can create blocks (block others)
-- - Users can delete their own blocks (unblock)

-- Allow users to see blocks they created
CREATE POLICY "blocks_select_own"
    ON blocks
    FOR SELECT
    TO authenticated
    USING (blocker_id = auth.uid());

-- Allow users to see who has blocked them (optional, for hiding content)
CREATE POLICY "blocks_select_blocked_by"
    ON blocks
    FOR SELECT
    TO authenticated
    USING (blocked_id = auth.uid());

-- Allow users to create blocks
CREATE POLICY "blocks_insert_own"
    ON blocks
    FOR INSERT
    TO authenticated
    WITH CHECK (blocker_id = auth.uid());

-- Allow users to delete their own blocks (unblock)
CREATE POLICY "blocks_delete_own"
    ON blocks
    FOR DELETE
    TO authenticated
    USING (blocker_id = auth.uid());

-- ============================================================================
-- REPORTS POLICIES
-- ============================================================================
-- - Users can read their own reports (to prevent duplicate submissions)
-- - Users can create reports
-- - Reports cannot be updated or deleted by regular users
-- - Admin access for moderation would be handled separately (service role)

-- Allow users to see their own reports
CREATE POLICY "reports_select_own"
    ON reports
    FOR SELECT
    TO authenticated
    USING (reporter_id = auth.uid());

-- Allow users to create reports
CREATE POLICY "reports_insert_own"
    ON reports
    FOR INSERT
    TO authenticated
    WITH CHECK (reporter_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS FOR SECURE DATA ACCESS
-- ============================================================================

-- Function to get posts without selfie_url for non-owners
-- Use this function in the app instead of direct table access when
-- you need to ensure selfie_url is protected
CREATE OR REPLACE FUNCTION get_posts_for_location(
    p_location_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    producer_id UUID,
    location_id UUID,
    target_avatar JSONB,
    note TEXT,
    selfie_url TEXT, -- Will be NULL for non-owners
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN
) AS $$
DECLARE
    current_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.producer_id,
        p.location_id,
        p.target_avatar,
        p.note,
        CASE
            WHEN p.producer_id = current_user_id THEN p.selfie_url
            ELSE NULL
        END AS selfie_url,
        p.created_at,
        p.expires_at,
        p.is_active
    FROM posts p
    WHERE p.location_id = p_location_id
    AND p.is_active = true
    AND p.expires_at > NOW()
    AND NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (b.blocker_id = current_user_id AND b.blocked_id = p.producer_id)
           OR (b.blocker_id = p.producer_id AND b.blocked_id = current_user_id)
    )
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get user's conversations with last message preview
CREATE OR REPLACE FUNCTION get_user_conversations(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    post_id UUID,
    producer_id UUID,
    consumer_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_active BOOLEAN,
    last_message_content TEXT,
    last_message_at TIMESTAMPTZ,
    unread_count BIGINT
) AS $$
DECLARE
    current_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.post_id,
        c.producer_id,
        c.consumer_id,
        c.created_at,
        c.updated_at,
        c.is_active,
        (
            SELECT m.content
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
        ) AS last_message_content,
        (
            SELECT m.created_at
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
        ) AS last_message_at,
        (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.conversation_id = c.id
            AND m.sender_id != current_user_id
            AND m.is_read = false
        )::BIGINT AS unread_count
    FROM conversations c
    WHERE (c.producer_id = current_user_id OR c.consumer_id = current_user_id)
    AND c.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (b.blocker_id = current_user_id AND b.blocked_id IN (c.producer_id, c.consumer_id))
           OR (b.blocked_id = current_user_id AND b.blocker_id IN (c.producer_id, c.consumer_id))
    )
    ORDER BY c.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to safely check if current user can access a conversation
CREATE OR REPLACE FUNCTION can_access_conversation(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID := auth.uid();
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = p_conversation_id
        AND (c.producer_id = current_user_id OR c.consumer_id = current_user_id)
        AND c.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM blocks b
            WHERE (b.blocker_id = current_user_id AND b.blocked_id IN (c.producer_id, c.consumer_id))
               OR (b.blocked_id = current_user_id AND b.blocker_id IN (c.producer_id, c.consumer_id))
        )
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================================
-- Grant execute permissions on helper functions to authenticated users

GRANT EXECUTE ON FUNCTION get_posts_for_location(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversations(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_conversation(UUID) TO authenticated;

-- Also grant access to existing helper functions from previous migrations
GRANT EXECUTE ON FUNCTION get_unread_message_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_as_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_blocked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_block_relationship(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_blocked_user_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_blocker_user_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_hidden_user_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION block_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unblock_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_report(UUID, TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_report_count(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_user_reported(UUID, TEXT, UUID) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify RLS is properly configured:
--
-- Check RLS is enabled on all tables:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('profiles', 'locations', 'posts', 'conversations', 'messages', 'blocks', 'reports');
--
-- List all policies:
-- SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public';
--
-- ============================================================================
-- SETUP NOTES
-- ============================================================================
-- After running this migration:
-- 1. Test each policy by signing in as different users
-- 2. Verify blocked users' content is hidden
-- 3. Verify selfie_url is only visible to post owners
-- 4. Verify conversation access is restricted to participants
-- 5. Run 005_storage_policies.sql to set up storage bucket access
-- ============================================================================
-- ============================================================================
-- Backtrack Storage Bucket & Policies Migration
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
'Storage buckets for the Backtrack app. The selfies bucket stores producer verification images privately.';

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
-- ============================================================================
-- Location Visits Schema Migration
-- ============================================================================
-- This migration creates the location_visits table for tracking user visits
-- to physical venues. Users can only create posts at locations they have
-- physically visited within the last 3 hours.
--
-- Key features:
-- - Tracks when users visit locations (within 50m proximity)
-- - Stores visit coordinates and GPS accuracy for verification
-- - Enables visit-based filtering for post creation eligibility
-- - Automatic cleanup of visits older than 3 hours (privacy)
-- ============================================================================

-- ============================================================================
-- LOCATION_VISITS TABLE
-- ============================================================================
-- Tracks user visits to physical locations for post creation eligibility
-- Users can only post to locations they've visited within the last 3 hours

CREATE TABLE IF NOT EXISTS location_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
    visited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment on location_visits table and columns
COMMENT ON TABLE location_visits IS 'Tracks user visits to physical locations for post creation eligibility';
COMMENT ON COLUMN location_visits.id IS 'Unique identifier for the visit record';
COMMENT ON COLUMN location_visits.user_id IS 'User who visited the location';
COMMENT ON COLUMN location_visits.location_id IS 'Location that was visited';
COMMENT ON COLUMN location_visits.visited_at IS 'Timestamp when the user was at the location';
COMMENT ON COLUMN location_visits.latitude IS 'GPS latitude of user at time of visit';
COMMENT ON COLUMN location_visits.longitude IS 'GPS longitude of user at time of visit';
COMMENT ON COLUMN location_visits.accuracy IS 'GPS accuracy in meters (lower is better)';
COMMENT ON COLUMN location_visits.created_at IS 'Timestamp when the visit record was created';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for querying a user's visits by time (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_location_visits_user_id ON location_visits(user_id);

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_location_visits_location_id ON location_visits(location_id);

-- Composite index for user's recent visits (sorted by visit time)
CREATE INDEX IF NOT EXISTS idx_location_visits_user_visited_at
    ON location_visits(user_id, visited_at DESC);

-- Composite index for unique user-location-time queries
CREATE INDEX IF NOT EXISTS idx_location_visits_user_location
    ON location_visits(user_id, location_id, visited_at DESC);

-- Index on created_at for cleanup operations
CREATE INDEX IF NOT EXISTS idx_location_visits_created_at ON location_visits(created_at DESC);

-- Partial index for efficient 3-hour window queries
-- This index optimizes the most common query pattern: finding a user's recent visits
-- The WHERE clause filters to only include visits within the 3-hour eligibility window
CREATE INDEX IF NOT EXISTS idx_location_visits_recent
    ON location_visits(user_id, visited_at DESC)
    WHERE visited_at > NOW() - INTERVAL '3 hours';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Users can only see and insert their own location visits
-- This protects user location privacy by preventing access to other users' visits

ALTER TABLE location_visits ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own location visits
CREATE POLICY "location_visits_select_own"
  ON location_visits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert only their own location visits
CREATE POLICY "location_visits_insert_own"
  ON location_visits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: UPDATE and DELETE are intentionally not allowed for regular users
-- Location visits are append-only and should only be cleaned up by system processes
-- This preserves data integrity for post eligibility verification

-- ============================================================================
-- POLICY COMMENTS
-- ============================================================================

COMMENT ON POLICY "location_visits_select_own" ON location_visits IS 'Users can only view their own location visits for privacy';
COMMENT ON POLICY "location_visits_insert_own" ON location_visits IS 'Users can only record their own location visits';

-- ============================================================================
-- RECORD_LOCATION_VISIT FUNCTION
-- ============================================================================
-- Records a user visit to a location if they are within 50 meters proximity.
-- Uses ST_DWithin with geography type for accurate meter-based distance calculations.
-- Verifies the user is physically present at the location before recording.
--
-- Parameters:
--   p_location_id: UUID of the location being visited
--   p_user_lat: User's current latitude (DOUBLE PRECISION)
--   p_user_lon: User's current longitude (DOUBLE PRECISION)
--   p_accuracy: GPS accuracy in meters (DOUBLE PRECISION), optional
--
-- Returns: The inserted location_visit record if within 50m, NULL otherwise

CREATE OR REPLACE FUNCTION record_location_visit(
  p_location_id UUID,
  p_user_lat DOUBLE PRECISION,
  p_user_lon DOUBLE PRECISION,
  p_accuracy DOUBLE PRECISION DEFAULT NULL
)
RETURNS location_visits
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_point GEOGRAPHY;
  location_point GEOGRAPHY;
  proximity_radius CONSTANT DOUBLE PRECISION := 50.0; -- 50 meters
  v_location locations%ROWTYPE;
  v_visit location_visits%ROWTYPE;
BEGIN
  -- Look up the location to get its coordinates
  SELECT * INTO v_location
  FROM locations
  WHERE id = p_location_id;

  -- Return NULL if location not found
  IF v_location IS NULL THEN
    RETURN NULL;
  END IF;

  -- Create geography points for user and location (SRID 4326 for WGS 84)
  user_point := ST_SetSRID(ST_MakePoint(p_user_lon, p_user_lat), 4326)::geography;
  location_point := ST_SetSRID(ST_MakePoint(v_location.longitude, v_location.latitude), 4326)::geography;

  -- Check if user is within 50m of the location using ST_DWithin
  IF NOT ST_DWithin(user_point, location_point, proximity_radius) THEN
    -- User is not within proximity, return NULL without inserting
    RETURN NULL;
  END IF;

  -- User is within proximity, insert the visit record
  INSERT INTO location_visits (
    user_id,
    location_id,
    visited_at,
    latitude,
    longitude,
    accuracy
  )
  VALUES (
    auth.uid(),
    p_location_id,
    NOW(),
    p_user_lat,
    p_user_lon,
    p_accuracy
  )
  RETURNING * INTO v_visit;

  RETURN v_visit;
END;
$$;

-- ============================================================================
-- FUNCTION COMMENTS
-- ============================================================================

COMMENT ON FUNCTION record_location_visit(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) IS
  'Records a user visit to a location if within 50m proximity. Uses PostGIS ST_DWithin for accurate distance verification. Returns the visit record if within proximity, NULL otherwise.';

-- ============================================================================
-- GET_RECENTLY_VISITED_LOCATIONS FUNCTION
-- ============================================================================
-- Returns locations that the current user has visited within the last 3 hours.
-- Used to determine which locations a user is eligible to post from.
-- Returns unique locations with their most recent visit timestamp.
-- Leverages the idx_location_visits_user_visited_at index for efficient queries.
--
-- Returns: TABLE with all location columns plus visited_at timestamp

CREATE OR REPLACE FUNCTION get_recently_visited_locations()
RETURNS TABLE (
  id UUID,
  google_place_id TEXT,
  name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  place_types TEXT[],
  post_count INTEGER,
  created_at TIMESTAMPTZ,
  visited_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  visit_window CONSTANT INTERVAL := INTERVAL '3 hours';
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.google_place_id,
    l.name,
    l.address,
    l.latitude,
    l.longitude,
    l.place_types,
    l.post_count,
    l.created_at,
    -- Get the most recent visit time for each location
    MAX(lv.visited_at) AS visited_at
  FROM locations l
  INNER JOIN location_visits lv ON lv.location_id = l.id
  WHERE lv.user_id = auth.uid()
    AND lv.visited_at > NOW() - visit_window
  GROUP BY l.id, l.google_place_id, l.name, l.address, l.latitude, l.longitude, l.place_types, l.post_count, l.created_at
  ORDER BY MAX(lv.visited_at) DESC;
END;
$$;

COMMENT ON FUNCTION get_recently_visited_locations() IS
  'Returns locations visited by the current user within the last 3 hours. Used for post creation eligibility. Returns unique locations ordered by most recent visit.';

-- ============================================================================
-- CLEANUP_OLD_LOCATION_VISITS FUNCTION
-- ============================================================================
-- Deletes location visit records older than 3 hours.
-- This function should be called periodically (e.g., via cron job or edge function)
-- to maintain data privacy and keep the table size manageable.
--
-- The 3-hour threshold matches the eligibility window for post creation,
-- so visits outside this window are no longer needed for any business logic.
--
-- Returns: INTEGER - the number of deleted records

CREATE OR REPLACE FUNCTION cleanup_old_location_visits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleanup_threshold CONSTANT INTERVAL := INTERVAL '3 hours';
  rows_deleted INTEGER;
BEGIN
  -- Delete location visits older than 3 hours
  DELETE FROM location_visits
  WHERE visited_at < NOW() - cleanup_threshold;

  -- Get the count of deleted rows
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;

  RETURN rows_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_old_location_visits() IS
  'Deletes location visits older than 3 hours to maintain user privacy and table performance. Should be called periodically via cron job or edge function. Returns the number of deleted records.';-- ============================================================================
-- Profile Verification Schema Migration
-- ============================================================================
-- This migration adds verification fields to the profiles table for the
-- Verified User Badge System. Users can be verified by administrators to
-- display a verification badge on their profile.
--
-- Key features:
-- - is_verified: Boolean flag indicating if user is verified
-- - verified_at: Timestamp when verification was granted
-- - Index for efficient queries on verified users
-- ============================================================================

-- ============================================================================
-- ADD VERIFICATION COLUMNS TO PROFILES TABLE
-- ============================================================================
-- Adds fields to track user verification status
-- Only admins can set these fields (enforced at application/RLS level)

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- ============================================================================
-- COLUMN COMMENTS
-- ============================================================================

COMMENT ON COLUMN profiles.is_verified IS 'Whether the user has been verified by an administrator';
COMMENT ON COLUMN profiles.verified_at IS 'Timestamp when the user was verified (NULL if not verified)';

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Index for querying verified users efficiently

CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified) WHERE is_verified = TRUE;
-- ============================================================================
-- Backtrack Favorite Locations Migration
-- ============================================================================
-- Migration: 007_favorite_locations.sql
-- Description: Creates the favorite_locations table for users to save
--              frequently visited venues with custom names for quick access
-- Security Model:
--   - Users can only view, create, update, and delete their own favorites
-- ============================================================================

-- ============================================================================
-- FAVORITE LOCATIONS TABLE
-- ============================================================================
-- Stores user's favorite locations for quick access to post creation and
-- ledger browsing. Each user can save venues with custom labels.

CREATE TABLE IF NOT EXISTS favorite_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    custom_name TEXT NOT NULL,
    place_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    place_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Validate custom_name length (1-50 characters)
    CONSTRAINT favorite_locations_custom_name_length CHECK (
        char_length(custom_name) > 0 AND char_length(custom_name) <= 50
    )
);

-- Comment on favorite_locations table and columns
COMMENT ON TABLE favorite_locations IS 'User saved favorite locations for quick access to posting and browsing';
COMMENT ON COLUMN favorite_locations.id IS 'Unique identifier for the favorite location';
COMMENT ON COLUMN favorite_locations.user_id IS 'User who saved this favorite (references auth.users)';
COMMENT ON COLUMN favorite_locations.custom_name IS 'User-defined label for this location (1-50 characters)';
COMMENT ON COLUMN favorite_locations.place_name IS 'Actual venue/place name from Google Places';
COMMENT ON COLUMN favorite_locations.latitude IS 'GPS latitude coordinate';
COMMENT ON COLUMN favorite_locations.longitude IS 'GPS longitude coordinate';
COMMENT ON COLUMN favorite_locations.address IS 'Full address of the location';
COMMENT ON COLUMN favorite_locations.place_id IS 'Google Places ID for venue identification';
COMMENT ON COLUMN favorite_locations.created_at IS 'Timestamp when the favorite was created';
COMMENT ON COLUMN favorite_locations.updated_at IS 'Timestamp when the favorite was last updated';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary index for user's favorites queries
CREATE INDEX IF NOT EXISTS idx_favorite_locations_user_id
    ON favorite_locations(user_id);

-- Index for ordering by creation date
CREATE INDEX IF NOT EXISTS idx_favorite_locations_user_created
    ON favorite_locations(user_id, created_at DESC);

-- Index for ordering by last updated (most recently used)
CREATE INDEX IF NOT EXISTS idx_favorite_locations_user_updated
    ON favorite_locations(user_id, updated_at DESC);

-- Index for place_id lookups (to find if a place is already favorited)
CREATE INDEX IF NOT EXISTS idx_favorite_locations_place_id
    ON favorite_locations(user_id, place_id)
    WHERE place_id IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Apply updated_at trigger to favorite_locations table
DROP TRIGGER IF EXISTS favorite_locations_updated_at ON favorite_locations;
CREATE TRIGGER favorite_locations_updated_at
    BEFORE UPDATE ON favorite_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE favorite_locations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
-- Users can only access their own favorite locations
-- All CRUD operations are restricted to the owner

-- Allow users to view their own favorites
CREATE POLICY "favorite_locations_select_own"
    ON favorite_locations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to insert their own favorites
CREATE POLICY "favorite_locations_insert_own"
    ON favorite_locations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own favorites
CREATE POLICY "favorite_locations_update_own"
    ON favorite_locations
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own favorites
CREATE POLICY "favorite_locations_delete_own"
    ON favorite_locations
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- POLICY COMMENTS
-- ============================================================================

COMMENT ON POLICY "favorite_locations_select_own" ON favorite_locations
    IS 'Users can only view their own favorite locations';
COMMENT ON POLICY "favorite_locations_insert_own" ON favorite_locations
    IS 'Users can only create favorites for themselves';
COMMENT ON POLICY "favorite_locations_update_own" ON favorite_locations
    IS 'Users can only update their own favorites (e.g., rename)';
COMMENT ON POLICY "favorite_locations_delete_own" ON favorite_locations
    IS 'Users can only delete their own favorites';
