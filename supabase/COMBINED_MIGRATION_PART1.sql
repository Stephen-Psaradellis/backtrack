-- ============================================================================
-- Backtrack Initial Schema Migration
-- ============================================================================
-- This migration creates the core tables for the Backtrack app:
-- - profiles: User profiles extending Supabase auth.users
-- - locations: Physical venues/locations where posts can be created
-- - posts: "Missed connection" posts with avatar descriptions
-- - conversations: Conversations between producers and consumers
-- - messages: Individual messages within conversations
-- - notifications: In-app notifications for users
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Extends Supabase auth.users with additional profile information
-- Each authenticated user has exactly one profile record

CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT,
    username TEXT UNIQUE,
    own_avatar JSONB,
    avatar_config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment on profiles table and columns
COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON COLUMN profiles.id IS 'References auth.users(id) - the primary key';
COMMENT ON COLUMN profiles.display_name IS 'Optional display name for the user';
COMMENT ON COLUMN profiles.username IS 'Optional unique username for the user';
COMMENT ON COLUMN profiles.own_avatar IS 'JSONB avatar configuration describing the user themselves (for matching)';
COMMENT ON COLUMN profiles.avatar_config IS 'JSONB configuration for user''s Avataaars avatar';
COMMENT ON COLUMN profiles.created_at IS 'Timestamp when the profile was created';
COMMENT ON COLUMN profiles.updated_at IS 'Timestamp when the profile was last updated';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at DESC);
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);
CREATE INDEX IF NOT EXISTS profiles_updated_at_idx ON profiles(updated_at DESC);

-- ============================================================================
-- LOCATIONS TABLE
-- ============================================================================
-- Stores physical venues/locations where users can create posts
-- Locations are tied to Google Maps place IDs when available

CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_place_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    place_id TEXT,
    place_types TEXT[],
    post_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment on locations table and columns
COMMENT ON TABLE locations IS 'Physical venues where users can create missed connection posts';
COMMENT ON COLUMN locations.id IS 'Unique identifier for the location';
COMMENT ON COLUMN locations.google_place_id IS 'Unique identifier from Google Places API';
COMMENT ON COLUMN locations.name IS 'Name of the venue/location';
COMMENT ON COLUMN locations.address IS 'Full address of the location';
COMMENT ON COLUMN locations.latitude IS 'GPS latitude coordinate';
COMMENT ON COLUMN locations.longitude IS 'GPS longitude coordinate';
COMMENT ON COLUMN locations.place_id IS 'Google Maps place ID for venue identification';
COMMENT ON COLUMN locations.place_types IS 'Array of place types from Google (e.g., gym, cafe)';
COMMENT ON COLUMN locations.post_count IS 'Count of posts at this location';
COMMENT ON COLUMN locations.created_at IS 'Timestamp when the location was first added';

-- PostGIS geospatial index for proximity queries
-- Uses SRID 4326 (WGS 84) which is standard for GPS coordinates
CREATE INDEX IF NOT EXISTS locations_geo_idx ON locations USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

-- Create indexes for location queries
CREATE INDEX IF NOT EXISTS idx_locations_place_id ON locations(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_created_at ON locations(created_at DESC);
CREATE INDEX IF NOT EXISTS locations_google_place_id_idx ON locations(google_place_id);
CREATE INDEX IF NOT EXISTS locations_post_count_idx ON locations(post_count DESC);
CREATE INDEX IF NOT EXISTS locations_name_idx ON locations(name);

-- ============================================================================
-- POSTS TABLE
-- ============================================================================
-- "Missed connection" posts created by producers
-- Contains avatar description of person of interest and anonymous note

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
    selfie_url TEXT NOT NULL,
    target_avatar JSONB NOT NULL,
    target_description TEXT,
    message TEXT NOT NULL,
    note TEXT,
    seen_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days') NOT NULL
);

-- Comment on posts table and columns
COMMENT ON TABLE posts IS 'Missed connection posts created by producers at locations';
COMMENT ON COLUMN posts.id IS 'Unique identifier for the post';
COMMENT ON COLUMN posts.producer_id IS 'User who created this post';
COMMENT ON COLUMN posts.location_id IS 'Location where this post was created';
COMMENT ON COLUMN posts.selfie_url IS 'URL to producer''s selfie in Supabase Storage';
COMMENT ON COLUMN posts.target_avatar IS 'JSONB avatar configuration describing the person of interest';
COMMENT ON COLUMN posts.target_description IS 'Additional text description';
COMMENT ON COLUMN posts.message IS 'The note left for the person';
COMMENT ON COLUMN posts.note IS 'Anonymous note/message left by the producer';
COMMENT ON COLUMN posts.seen_at IS 'When the producer saw the person of interest';
COMMENT ON COLUMN posts.created_at IS 'Timestamp when the post was created';
COMMENT ON COLUMN posts.expires_at IS 'Timestamp when the post expires (defaults to 30 days)';
COMMENT ON COLUMN posts.is_active IS 'Whether the post is currently active and visible';

-- Create indexes for post queries
CREATE INDEX IF NOT EXISTS idx_posts_producer_id ON posts(producer_id);
CREATE INDEX IF NOT EXISTS idx_posts_location_id ON posts(location_id);
CREATE INDEX IF NOT EXISTS posts_location_idx ON posts(location_id);
CREATE INDEX IF NOT EXISTS posts_producer_idx ON posts(producer_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON posts(expires_at);
CREATE INDEX IF NOT EXISTS idx_posts_is_active ON posts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS posts_active_idx ON posts(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_expires_at_idx ON posts(expires_at) WHERE is_active = TRUE;

-- Composite index for location-based active posts queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_posts_location_active_created
    ON posts(location_id, created_at DESC)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS posts_location_active_idx ON posts(location_id, is_active, created_at DESC);

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================
-- Conversations between post producers and consumers

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    producer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    consumer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    producer_accepted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Prevent duplicate responses to the same post by the same consumer
    CONSTRAINT conversations_unique_response UNIQUE(post_id, consumer_id),

    -- Ensure producer and consumer are different users
    CONSTRAINT conversations_different_users CHECK (producer_id != consumer_id),

    -- Validate status values
    CONSTRAINT conversations_valid_status CHECK (status IN ('pending', 'active', 'declined', 'blocked'))
);

COMMENT ON TABLE conversations IS 'Conversations between post producers and consumers who respond';
COMMENT ON COLUMN conversations.status IS 'Conversation status: pending, active, declined, or blocked';

-- Create indexes for conversation queries
CREATE INDEX IF NOT EXISTS conversations_producer_idx ON conversations(producer_id);
CREATE INDEX IF NOT EXISTS conversations_consumer_idx ON conversations(consumer_id);
CREATE INDEX IF NOT EXISTS conversations_post_idx ON conversations(post_id);
CREATE INDEX IF NOT EXISTS conversations_status_idx ON conversations(status);
CREATE INDEX IF NOT EXISTS conversations_user_active_idx ON conversations(producer_id, status) WHERE status = 'active';

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
-- Individual messages within conversations

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE messages IS 'Individual messages within conversations';

-- Create indexes for message queries
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_unread_idx ON messages(conversation_id, is_read) WHERE is_read = FALSE;

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
-- In-app notifications for users

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    reference_id UUID,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Validate notification types
    CONSTRAINT notifications_valid_type CHECK (type IN ('new_response', 'new_message', 'response_accepted'))
);

COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON COLUMN notifications.type IS 'Notification type: new_response, new_message, or response_accepted';
COMMENT ON COLUMN notifications.reference_id IS 'References conversation_id or post_id depending on type';

-- Create indexes for notification queries
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications(user_id, type);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create profile on user signup
-- This ensures every auth.users entry has a corresponding profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, display_name, created_at, updated_at)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NULL), NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deactivate expired posts (can be called by cron job or edge function)
CREATE OR REPLACE FUNCTION deactivate_expired_posts()
RETURNS INTEGER AS $$
DECLARE
    rows_updated INTEGER;
BEGIN
    UPDATE posts
    SET is_active = false
    WHERE is_active = true
    AND expires_at < NOW();

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- Function to increment location post count
CREATE OR REPLACE FUNCTION increment_location_post_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE locations
    SET post_count = post_count + 1
    WHERE id = NEW.location_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement location post count
CREATE OR REPLACE FUNCTION decrement_location_post_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE locations
    SET post_count = GREATEST(post_count - 1, 0)
    WHERE id = OLD.location_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Apply updated_at trigger to profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to conversations table
DROP TRIGGER IF EXISTS conversations_updated_at ON conversations;
CREATE TRIGGER conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create profile when new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Increment post count when a new post is created
DROP TRIGGER IF EXISTS posts_increment_location_count ON posts;
CREATE TRIGGER posts_increment_location_count
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION increment_location_post_count();

-- Decrement post count when a post is deleted
DROP TRIGGER IF EXISTS posts_decrement_location_count ON posts;
CREATE TRIGGER posts_decrement_location_count
    AFTER DELETE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION decrement_location_post_count();-- ============================================================================
-- Backtrack Messaging Schema Migration
-- ============================================================================
-- This migration creates the messaging tables for the Backtrack app:
-- - conversations: Anonymous chat sessions between producer and consumer
-- - messages: Individual messages within conversations
-- ============================================================================

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================
-- Anonymous chat sessions initiated when a consumer matches with a post
-- Links a post's producer with an interested consumer

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    producer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    consumer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- Comment on conversations table and columns
COMMENT ON TABLE conversations IS 'Anonymous chat sessions between post producer and consumer';
COMMENT ON COLUMN conversations.id IS 'Unique identifier for the conversation';
COMMENT ON COLUMN conversations.post_id IS 'The post that initiated this conversation';
COMMENT ON COLUMN conversations.producer_id IS 'User who created the original post';
COMMENT ON COLUMN conversations.consumer_id IS 'User who initiated the conversation (matched with the post)';
COMMENT ON COLUMN conversations.created_at IS 'Timestamp when the conversation was started';
COMMENT ON COLUMN conversations.updated_at IS 'Timestamp of the last activity in the conversation';
COMMENT ON COLUMN conversations.is_active IS 'Whether the conversation is currently active';

-- Create indexes for conversation queries
CREATE INDEX IF NOT EXISTS idx_conversations_post_id ON conversations(post_id);
CREATE INDEX IF NOT EXISTS idx_conversations_producer_id ON conversations(producer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_consumer_id ON conversations(consumer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_is_active ON conversations(is_active) WHERE is_active = true;

-- Composite index for user's active conversations (common query pattern)
CREATE INDEX IF NOT EXISTS idx_conversations_producer_active_updated
    ON conversations(producer_id, updated_at DESC)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_conversations_consumer_active_updated
    ON conversations(consumer_id, updated_at DESC)
    WHERE is_active = true;

-- Ensure one conversation per post-consumer pair (prevent duplicate conversations)
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_post_consumer_unique
    ON conversations(post_id, consumer_id);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
-- Individual messages within a conversation
-- Both producer and consumer can send messages

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL
);

-- Comment on messages table and columns
COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON COLUMN messages.id IS 'Unique identifier for the message';
COMMENT ON COLUMN messages.conversation_id IS 'The conversation this message belongs to';
COMMENT ON COLUMN messages.sender_id IS 'User who sent this message';
COMMENT ON COLUMN messages.content IS 'The message text content';
COMMENT ON COLUMN messages.created_at IS 'Timestamp when the message was sent';
COMMENT ON COLUMN messages.is_read IS 'Whether the recipient has read this message';

-- Create indexes for message queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read) WHERE is_read = false;

-- Composite index for conversation messages (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON messages(conversation_id, created_at ASC);

-- Composite index for unread messages per conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_unread
    ON messages(conversation_id, created_at ASC)
    WHERE is_read = false;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Apply updated_at trigger to conversations table
-- (reuses update_updated_at_column() from 001_initial_schema.sql)
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation updated_at when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp on new message
DROP TRIGGER IF EXISTS on_message_created ON messages;
CREATE TRIGGER on_message_created
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_new_message();

-- ============================================================================
-- VALIDATION CONSTRAINTS
-- ============================================================================

-- Ensure message content is not empty
ALTER TABLE messages ADD CONSTRAINT messages_content_not_empty
    CHECK (LENGTH(TRIM(content)) > 0);

-- Ensure message content is not excessively long (10,000 characters max)
ALTER TABLE messages ADD CONSTRAINT messages_content_max_length
    CHECK (LENGTH(content) <= 10000);

-- Ensure producer and consumer are different users
ALTER TABLE conversations ADD CONSTRAINT conversations_different_users
    CHECK (producer_id != consumer_id);

-- ============================================================================
-- FUNCTIONS FOR MESSAGING
-- ============================================================================

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO unread_count
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE m.is_read = false
    AND m.sender_id != user_id
    AND (c.producer_id = user_id OR c.consumer_id = user_id)
    AND c.is_active = true;

    RETURN unread_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to mark all messages in a conversation as read for a user
CREATE OR REPLACE FUNCTION mark_conversation_as_read(conv_id UUID, user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    rows_updated INTEGER;
BEGIN
    UPDATE messages
    SET is_read = true
    WHERE conversation_id = conv_id
    AND sender_id != user_id
    AND is_read = false;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SETUP NOTES
-- ============================================================================
-- After running this migration:
-- 1. Run 004_rls_policies.sql to enable Row Level Security
-- 2. Configure Supabase Realtime for messages table for live updates
-- 3. Test conversation creation and message sending
-- ============================================================================
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
CREATE POLICY "profiles_select_all"
  ON profiles
  FOR SELECT
  USING (true);

-- Allow users to insert their own profile (on signup)
CREATE POLICY "profiles_insert_own"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update only their own profile
CREATE POLICY "profiles_update_own"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to delete only their own profile
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
CREATE POLICY "locations_select_all"
  ON locations
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert new locations
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
CREATE POLICY "posts_select_active"
  ON posts
  FOR SELECT
  USING (is_active = true OR auth.uid() = producer_id);

-- Allow authenticated users to insert their own posts
CREATE POLICY "posts_insert_own"
  ON posts
  FOR INSERT
  WITH CHECK (auth.uid() = producer_id);

-- Allow users to update only their own posts
CREATE POLICY "posts_update_own"
  ON posts
  FOR UPDATE
  USING (auth.uid() = producer_id)
  WITH CHECK (auth.uid() = producer_id);

-- Allow users to delete only their own posts
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
CREATE POLICY "messages_delete_sender"
  ON messages
  FOR DELETE
  USING (auth.uid() = sender_id);

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================
-- Users can only see and modify their own notifications

-- Allow users to view their own notifications
CREATE POLICY "notifications_select_own"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow system to insert notifications (via triggers or service role)
-- Users can also create notifications for themselves (edge case)
CREATE POLICY "notifications_insert_for_user"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "notifications_update_own"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own notifications
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
-- Backtrack Geospatial Functions
-- Migration: 003_geospatial_functions.sql
-- Description: Creates PostGIS-powered functions for efficient nearby location queries
-- Uses ST_DWithin for O(log n) spatial queries with the existing GIST index

-- ============================================================================
-- GET_NEARBY_LOCATIONS FUNCTION
-- ============================================================================
-- Returns locations within a specified radius of a given point, ordered by distance.
-- Uses ST_DWithin with geography type for accurate meter-based distance calculations.
-- Leverages the existing locations_geo_idx GIST index for efficient queries.
--
-- Parameters:
--   user_lat: User's latitude (DOUBLE PRECISION)
--   user_lon: User's longitude (DOUBLE PRECISION)
--   radius_meters: Search radius in meters (DOUBLE PRECISION), default 5000 (5km)
--   max_results: Maximum number of results to return (INTEGER), default 50
--
-- Returns: TABLE with all location columns plus distance_meters

CREATE OR REPLACE FUNCTION get_nearby_locations(
  user_lat DOUBLE PRECISION,
  user_lon DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 5000,
  max_results INTEGER DEFAULT 50
)
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
  distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_point GEOGRAPHY;
BEGIN
  -- Create a geography point from user coordinates (SRID 4326 for WGS 84)
  user_point := ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography;

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
    -- Calculate distance in meters using geography for accuracy
    ST_Distance(
      user_point,
      ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography
    ) AS distance_meters
  FROM locations l
  WHERE ST_DWithin(
    user_point,
    ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography,
    radius_meters
  )
  ORDER BY distance_meters ASC
  LIMIT max_results;
END;
$$;

-- ============================================================================
-- GET_LOCATIONS_WITH_ACTIVE_POSTS FUNCTION
-- ============================================================================
-- Returns nearby locations that have active posts, optimized for map marker display.
-- Calculates actual active post counts by joining with posts table.
-- Uses ST_DWithin with geography type for accurate meter-based distance calculations.
-- Leverages the existing locations_geo_idx GIST index for efficient queries.
--
-- Parameters:
--   user_lat: User's latitude (DOUBLE PRECISION)
--   user_lon: User's longitude (DOUBLE PRECISION)
--   radius_meters: Search radius in meters (DOUBLE PRECISION), default 5000 (5km)
--   min_post_count: Minimum number of active posts required (INTEGER), default 1
--   max_results: Maximum number of results to return (INTEGER), default 50
--
-- Returns: TABLE with location columns, active_post_count, and distance_meters

CREATE OR REPLACE FUNCTION get_locations_with_active_posts(
  user_lat DOUBLE PRECISION,
  user_lon DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 5000,
  min_post_count INTEGER DEFAULT 1,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  google_place_id TEXT,
  name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  place_types TEXT[],
  active_post_count BIGINT,
  created_at TIMESTAMPTZ,
  distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_point GEOGRAPHY;
BEGIN
  -- Create a geography point from user coordinates (SRID 4326 for WGS 84)
  user_point := ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography;

  RETURN QUERY
  SELECT
    l.id,
    l.google_place_id,
    l.name,
    l.address,
    l.latitude,
    l.longitude,
    l.place_types,
    -- Count only active, non-expired posts for this location
    COUNT(p.id) AS active_post_count,
    l.created_at,
    -- Calculate distance in meters using geography for accuracy
    ST_Distance(
      user_point,
      ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography
    ) AS distance_meters
  FROM locations l
  INNER JOIN posts p ON p.location_id = l.id
    AND p.is_active = TRUE
    AND p.expires_at > NOW()
  WHERE ST_DWithin(
    user_point,
    ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography,
    radius_meters
  )
  GROUP BY l.id, l.google_place_id, l.name, l.address, l.latitude, l.longitude, l.place_types, l.created_at
  HAVING COUNT(p.id) >= min_post_count
  ORDER BY distance_meters ASC
  LIMIT max_results;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_nearby_locations(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) IS
  'Returns locations within radius_meters of the given coordinates, ordered by distance. Uses PostGIS ST_DWithin for efficient spatial queries with GIST index.';

COMMENT ON FUNCTION get_locations_with_active_posts(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER) IS
  'Returns nearby locations with active posts for map marker display. Only includes locations meeting the minimum active post count threshold. Uses PostGIS ST_DWithin for efficient spatial queries with GIST index.';
-- ============================================================================
-- Backtrack Moderation Schema Migration
-- ============================================================================
-- This migration creates the moderation tables for the Backtrack app:
-- - blocks: User blocking to prevent unwanted interactions
-- - reports: Content/user reporting for app store compliance
-- ============================================================================

-- ============================================================================
-- BLOCKS TABLE
-- ============================================================================
-- Allows users to block other users, hiding their content and preventing
-- any interaction. This is required for app store compliance.

CREATE TABLE IF NOT EXISTS blocks (
    blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id)
);

-- Comment on blocks table and columns
COMMENT ON TABLE blocks IS 'User blocks to prevent unwanted interactions';
COMMENT ON COLUMN blocks.blocker_id IS 'User who initiated the block';
COMMENT ON COLUMN blocks.blocked_id IS 'User who is being blocked';
COMMENT ON COLUMN blocks.created_at IS 'Timestamp when the block was created';

-- Create indexes for block queries
-- Index for checking if a specific user is blocked by another
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_created_at ON blocks(created_at DESC);

-- ============================================================================
-- REPORTS TABLE
-- ============================================================================
-- Allows users to report inappropriate content or users
-- This is required for app store compliance and content moderation

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reported_type TEXT NOT NULL, -- 'post', 'message', 'user'
    reported_id UUID NOT NULL, -- ID of the reported entity
    reason TEXT NOT NULL,
    additional_details TEXT, -- Optional additional context from reporter
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'reviewed', 'resolved', 'dismissed'
    reviewed_at TIMESTAMPTZ, -- When the report was reviewed (if applicable)
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment on reports table and columns
COMMENT ON TABLE reports IS 'User reports for content moderation and app store compliance';
COMMENT ON COLUMN reports.id IS 'Unique identifier for the report';
COMMENT ON COLUMN reports.reporter_id IS 'User who submitted the report';
COMMENT ON COLUMN reports.reported_type IS 'Type of entity being reported: post, message, or user';
COMMENT ON COLUMN reports.reported_id IS 'UUID of the reported entity (post, message, or user)';
COMMENT ON COLUMN reports.reason IS 'Primary reason for the report (e.g., spam, harassment, inappropriate)';
COMMENT ON COLUMN reports.additional_details IS 'Optional additional context provided by the reporter';
COMMENT ON COLUMN reports.status IS 'Current status of the report: pending, reviewed, resolved, or dismissed';
COMMENT ON COLUMN reports.reviewed_at IS 'Timestamp when the report was reviewed by a moderator';
COMMENT ON COLUMN reports.created_at IS 'Timestamp when the report was submitted';

-- Create indexes for report queries
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_type ON reports(reported_type);
CREATE INDEX IF NOT EXISTS idx_reports_reported_id ON reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Composite index for pending reports (common moderation query)
CREATE INDEX IF NOT EXISTS idx_reports_pending_created
    ON reports(created_at ASC)
    WHERE status = 'pending';

-- Composite index for reports by type and status (moderation dashboard)
CREATE INDEX IF NOT EXISTS idx_reports_type_status
    ON reports(reported_type, status, created_at DESC);

-- ============================================================================
-- VALIDATION CONSTRAINTS
-- ============================================================================

-- Ensure users cannot block themselves
ALTER TABLE blocks ADD CONSTRAINT blocks_no_self_block
    CHECK (blocker_id != blocked_id);

-- Ensure reported_type is valid
ALTER TABLE reports ADD CONSTRAINT reports_valid_type
    CHECK (reported_type IN ('post', 'message', 'user'));

-- Ensure reason is not empty
ALTER TABLE reports ADD CONSTRAINT reports_reason_not_empty
    CHECK (LENGTH(TRIM(reason)) > 0);

-- Ensure reason is not excessively long (1000 characters max)
ALTER TABLE reports ADD CONSTRAINT reports_reason_max_length
    CHECK (LENGTH(reason) <= 1000);

-- Ensure additional_details is not excessively long (5000 characters max)
ALTER TABLE reports ADD CONSTRAINT reports_additional_details_max_length
    CHECK (additional_details IS NULL OR LENGTH(additional_details) <= 5000);

-- Ensure status is valid
ALTER TABLE reports ADD CONSTRAINT reports_valid_status
    CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'));

-- ============================================================================
-- FUNCTIONS FOR MODERATION
-- ============================================================================

-- Function to check if user A has blocked user B
CREATE OR REPLACE FUNCTION is_user_blocked(blocker UUID, blocked UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocks
        WHERE blocker_id = blocker
        AND blocked_id = blocked
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if there is a mutual block between two users
-- (either user has blocked the other)
CREATE OR REPLACE FUNCTION has_block_relationship(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocks
        WHERE (blocker_id = user_a AND blocked_id = user_b)
           OR (blocker_id = user_b AND blocked_id = user_a)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all user IDs that a user has blocked
CREATE OR REPLACE FUNCTION get_blocked_user_ids(user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT blocked_id FROM blocks
    WHERE blocker_id = user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all user IDs that have blocked a user
CREATE OR REPLACE FUNCTION get_blocker_user_ids(user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT blocker_id FROM blocks
    WHERE blocked_id = user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all user IDs that should be hidden from a user
-- (users they've blocked + users who have blocked them)
CREATE OR REPLACE FUNCTION get_hidden_user_ids(user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT blocked_id FROM blocks WHERE blocker_id = user_id
    UNION
    SELECT DISTINCT blocker_id FROM blocks WHERE blocked_id = user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to create a block between users
-- Also automatically deactivates any conversations between them
CREATE OR REPLACE FUNCTION block_user(blocker UUID, blocked UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert the block
    INSERT INTO blocks (blocker_id, blocked_id, created_at)
    VALUES (blocker, blocked, NOW())
    ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

    -- Deactivate any conversations between these users
    UPDATE conversations
    SET is_active = false
    WHERE (producer_id = blocker AND consumer_id = blocked)
       OR (producer_id = blocked AND consumer_id = blocker);
END;
$$ LANGUAGE plpgsql;

-- Function to unblock a user
CREATE OR REPLACE FUNCTION unblock_user(blocker UUID, blocked UUID)
RETURNS BOOLEAN AS $$
DECLARE
    rows_deleted INTEGER;
BEGIN
    DELETE FROM blocks
    WHERE blocker_id = blocker
    AND blocked_id = blocked;

    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    RETURN rows_deleted > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to submit a report
CREATE OR REPLACE FUNCTION submit_report(
    p_reporter_id UUID,
    p_reported_type TEXT,
    p_reported_id UUID,
    p_reason TEXT,
    p_additional_details TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    report_id UUID;
BEGIN
    INSERT INTO reports (reporter_id, reported_type, reported_id, reason, additional_details)
    VALUES (p_reporter_id, p_reported_type, p_reported_id, p_reason, p_additional_details)
    RETURNING id INTO report_id;

    RETURN report_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get report count for a specific entity
-- Useful for determining if content should be auto-hidden
CREATE OR REPLACE FUNCTION get_report_count(p_reported_type TEXT, p_reported_id UUID)
RETURNS INTEGER AS $$
DECLARE
    report_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO report_count
    FROM reports
    WHERE reported_type = p_reported_type
    AND reported_id = p_reported_id
    AND status != 'dismissed';

    RETURN report_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user has already reported an entity
CREATE OR REPLACE FUNCTION has_user_reported(
    p_reporter_id UUID,
    p_reported_type TEXT,
    p_reported_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM reports
        WHERE reporter_id = p_reporter_id
        AND reported_type = p_reported_type
        AND reported_id = p_reported_id
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- SETUP NOTES
-- ============================================================================
-- After running this migration:
-- 1. Run 004_rls_policies.sql to enable Row Level Security on these tables
-- 2. Consider implementing auto-hide logic when report_count exceeds threshold
-- 3. Set up moderation dashboard to review pending reports
-- 4. The block_user() function automatically deactivates conversations
-- ============================================================================
