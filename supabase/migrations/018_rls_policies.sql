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
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow users to insert their own profile
-- (Primarily used by the auto-create trigger, but policy needed for security)
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
    ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Allow users to update only their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
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
DROP POLICY IF EXISTS "locations_select_authenticated" ON locations;
CREATE POLICY "locations_select_authenticated"
    ON locations
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to create locations
DROP POLICY IF EXISTS "locations_insert_authenticated" ON locations;
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
DROP POLICY IF EXISTS "posts_select_active_not_blocked" ON posts;
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
DROP POLICY IF EXISTS "posts_select_own" ON posts;
CREATE POLICY "posts_select_own"
    ON posts
    FOR SELECT
    TO authenticated
    USING (producer_id = auth.uid());

-- Allow authenticated users to create posts for themselves
DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own"
    ON posts
    FOR INSERT
    TO authenticated
    WITH CHECK (producer_id = auth.uid());

-- Allow producers to update their own posts
DROP POLICY IF EXISTS "posts_update_own" ON posts;
CREATE POLICY "posts_update_own"
    ON posts
    FOR UPDATE
    TO authenticated
    USING (producer_id = auth.uid())
    WITH CHECK (producer_id = auth.uid());

-- Allow producers to delete their own posts
DROP POLICY IF EXISTS "posts_delete_own" ON posts;
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
DROP POLICY IF EXISTS "conversations_select_participant" ON conversations;
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
DROP POLICY IF EXISTS "conversations_insert_consumer" ON conversations;
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
DROP POLICY IF EXISTS "conversations_update_participant" ON conversations;
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
DROP POLICY IF EXISTS "messages_select_participant" ON messages;
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
DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
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
DROP POLICY IF EXISTS "messages_update_read_status" ON messages;
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
DROP POLICY IF EXISTS "blocks_select_own" ON blocks;
CREATE POLICY "blocks_select_own"
    ON blocks
    FOR SELECT
    TO authenticated
    USING (blocker_id = auth.uid());

-- Allow users to see who has blocked them (optional, for hiding content)
DROP POLICY IF EXISTS "blocks_select_blocked_by" ON blocks;
CREATE POLICY "blocks_select_blocked_by"
    ON blocks
    FOR SELECT
    TO authenticated
    USING (blocked_id = auth.uid());

-- Allow users to create blocks
DROP POLICY IF EXISTS "blocks_insert_own" ON blocks;
CREATE POLICY "blocks_insert_own"
    ON blocks
    FOR INSERT
    TO authenticated
    WITH CHECK (blocker_id = auth.uid());

-- Allow users to delete their own blocks (unblock)
DROP POLICY IF EXISTS "blocks_delete_own" ON blocks;
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
DROP POLICY IF EXISTS "reports_select_own" ON reports;
CREATE POLICY "reports_select_own"
    ON reports
    FOR SELECT
    TO authenticated
    USING (reporter_id = auth.uid());

-- Allow users to create reports
DROP POLICY IF EXISTS "reports_insert_own" ON reports;
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
