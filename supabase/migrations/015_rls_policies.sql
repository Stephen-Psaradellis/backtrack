-- Backtrack Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- Description: Implements RLS policies for all tables to ensure proper data access control
-- Security Model:
--   - Profiles: Read all, modify own only
--   - Locations: Read all, create when authenticated
--   - Posts: Read all active, modify own only
--   - Conversations: Only visible to participants (producer/consumer)
--   - Messages: Only visible to conversation participants
--   - Notifications: Only visible to owner

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
-- Users can read all profiles (to view other users' avatars/usernames)
-- Users can only modify their own profile

-- Allow anyone to read profiles
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all"
  ON profiles
  FOR SELECT
  USING (true);

-- Allow users to insert their own profile (on signup)
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update only their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to delete only their own profile
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own"
  ON profiles
  FOR DELETE
  USING (auth.uid() = id);

-- ============================================================================
-- LOCATIONS POLICIES
-- ============================================================================
-- Anyone can read locations (for map browsing)
-- Authenticated users can create new locations (when posting to a new place)
-- Only service role can update/delete locations (for maintenance)

-- Allow anyone to read locations
DROP POLICY IF EXISTS "locations_select_all" ON locations;
CREATE POLICY "locations_select_all"
  ON locations
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert new locations
DROP POLICY IF EXISTS "locations_insert_authenticated" ON locations;
CREATE POLICY "locations_insert_authenticated"
  ON locations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Note: UPDATE is intentionally not allowed for regular users
-- The post_count is maintained via triggers, not direct updates
-- Only service_role can update locations for administrative purposes

-- ============================================================================
-- POSTS POLICIES
-- ============================================================================
-- Anyone can read active posts (for browsing ledgers)
-- Users can only create posts for themselves
-- Users can only update/delete their own posts

-- Allow anyone to read active posts
DROP POLICY IF EXISTS "posts_select_active" ON posts;
CREATE POLICY "posts_select_active"
  ON posts
  FOR SELECT
  USING (is_active = true OR auth.uid() = producer_id);

-- Allow authenticated users to insert their own posts
DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own"
  ON posts
  FOR INSERT
  WITH CHECK (auth.uid() = producer_id);

-- Allow users to update only their own posts
DROP POLICY IF EXISTS "posts_update_own" ON posts;
CREATE POLICY "posts_update_own"
  ON posts
  FOR UPDATE
  USING (auth.uid() = producer_id)
  WITH CHECK (auth.uid() = producer_id);

-- Allow users to delete only their own posts
DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own"
  ON posts
  FOR DELETE
  USING (auth.uid() = producer_id);

-- ============================================================================
-- CONVERSATIONS POLICIES
-- ============================================================================
-- Conversations are only visible to participants (producer or consumer)
-- Consumer can create a conversation by responding to a post
-- Producer can update conversation status (accept/decline)
-- Either participant can delete the conversation

-- Allow participants to view their conversations
DROP POLICY IF EXISTS "conversations_select_participant" ON conversations;
CREATE POLICY "conversations_select_participant"
  ON conversations
  FOR SELECT
  USING (
    auth.uid() = producer_id OR
    auth.uid() = consumer_id
  );

-- Allow users to create conversations (respond to posts)
-- The consumer initiating must be the authenticated user
-- Note: The constraint in the table prevents self-responses
DROP POLICY IF EXISTS "conversations_insert_consumer" ON conversations;
CREATE POLICY "conversations_insert_consumer"
  ON conversations
  FOR INSERT
  WITH CHECK (
    auth.uid() = consumer_id AND
    -- Verify user is not responding to their own post
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id
      AND posts.producer_id != auth.uid()
      AND posts.is_active = true
    )
  );

-- Allow producer to update conversation (accept/decline/block)
-- Allow consumer to update conversation (they can also mark as blocked from their side)
DROP POLICY IF EXISTS "conversations_update_participant" ON conversations;
CREATE POLICY "conversations_update_participant"
  ON conversations
  FOR UPDATE
  USING (
    auth.uid() = producer_id OR
    auth.uid() = consumer_id
  )
  WITH CHECK (
    auth.uid() = producer_id OR
    auth.uid() = consumer_id
  );

-- Allow participants to delete their conversations
DROP POLICY IF EXISTS "conversations_delete_participant" ON conversations;
CREATE POLICY "conversations_delete_participant"
  ON conversations
  FOR DELETE
  USING (
    auth.uid() = producer_id OR
    auth.uid() = consumer_id
  );

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================
-- Messages are only visible to conversation participants
-- Either participant can send messages in active conversations
-- Participants can update messages (mark as read)
-- Sender can delete their own messages

-- Allow participants to view messages in their conversations
DROP POLICY IF EXISTS "messages_select_participant" ON messages;
CREATE POLICY "messages_select_participant"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.producer_id = auth.uid() OR
        conversations.consumer_id = auth.uid()
      )
    )
  );

-- Allow participants to send messages in active conversations
DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant"
  ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND conversations.status = 'active'
      AND (
        conversations.producer_id = auth.uid() OR
        conversations.consumer_id = auth.uid()
      )
    )
  );

-- Allow participants to update messages (e.g., mark as read)
DROP POLICY IF EXISTS "messages_update_participant" ON messages;
CREATE POLICY "messages_update_participant"
  ON messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.producer_id = auth.uid() OR
        conversations.consumer_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.producer_id = auth.uid() OR
        conversations.consumer_id = auth.uid()
      )
    )
  );

-- Allow sender to delete their own messages
DROP POLICY IF EXISTS "messages_delete_sender" ON messages;
CREATE POLICY "messages_delete_sender"
  ON messages
  FOR DELETE
  USING (auth.uid() = sender_id);

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================
-- Users can only see and modify their own notifications

-- Allow users to view their own notifications
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow system to insert notifications (via triggers or service role)
-- Users can also create notifications for themselves (edge case)
DROP POLICY IF EXISTS "notifications_insert_for_user" ON notifications;
CREATE POLICY "notifications_insert_for_user"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own notifications (mark as read)
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own notifications
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTION FOR CONVERSATION PARTICIPATION CHECK
-- ============================================================================
-- This function can be used for efficient participant checking

CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conv_id
    AND (producer_id = auth.uid() OR consumer_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "profiles_select_all" ON profiles IS 'Anyone can view profiles to see usernames and avatars';
COMMENT ON POLICY "profiles_insert_own" ON profiles IS 'Users can only create their own profile (on signup)';
COMMENT ON POLICY "profiles_update_own" ON profiles IS 'Users can only update their own profile';
COMMENT ON POLICY "profiles_delete_own" ON profiles IS 'Users can only delete their own profile';

COMMENT ON POLICY "locations_select_all" ON locations IS 'Anyone can view locations for map browsing';
COMMENT ON POLICY "locations_insert_authenticated" ON locations IS 'Authenticated users can create new locations';

COMMENT ON POLICY "posts_select_active" ON posts IS 'Anyone can view active posts; producers can view their inactive posts';
COMMENT ON POLICY "posts_insert_own" ON posts IS 'Users can only create posts as themselves';
COMMENT ON POLICY "posts_update_own" ON posts IS 'Users can only update their own posts';
COMMENT ON POLICY "posts_delete_own" ON posts IS 'Users can only delete their own posts';

COMMENT ON POLICY "conversations_select_participant" ON conversations IS 'Only producer and consumer can view the conversation';
COMMENT ON POLICY "conversations_insert_consumer" ON conversations IS 'Users can initiate conversations on posts they did not create';
COMMENT ON POLICY "conversations_update_participant" ON conversations IS 'Participants can update conversation status';
COMMENT ON POLICY "conversations_delete_participant" ON conversations IS 'Participants can delete the conversation';

COMMENT ON POLICY "messages_select_participant" ON messages IS 'Only conversation participants can view messages';
COMMENT ON POLICY "messages_insert_participant" ON messages IS 'Participants can send messages in active conversations';
COMMENT ON POLICY "messages_update_participant" ON messages IS 'Participants can update messages (mark as read)';
COMMENT ON POLICY "messages_delete_sender" ON messages IS 'Senders can delete their own messages';

COMMENT ON POLICY "notifications_select_own" ON notifications IS 'Users can only view their own notifications';
COMMENT ON POLICY "notifications_insert_for_user" ON notifications IS 'Notifications are created for specific users';
COMMENT ON POLICY "notifications_update_own" ON notifications IS 'Users can mark their notifications as read';
COMMENT ON POLICY "notifications_delete_own" ON notifications IS 'Users can delete their notifications';

COMMENT ON FUNCTION is_conversation_participant(UUID) IS 'Helper function to check if current user is a participant in a conversation';
