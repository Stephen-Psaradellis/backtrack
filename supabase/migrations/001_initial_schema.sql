-- ============================================================================
-- Love Ledger Initial Schema Migration
-- ============================================================================
-- This migration creates the core tables for the Love Ledger app:
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

-- Create indexes for location queries
CREATE INDEX IF NOT EXISTS idx_locations_place_id ON locations(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_created_at ON locations(created_at DESC);
CREATE INDEX IF NOT EXISTS locations_google_place_id_idx ON locations(google_place_id);
CREATE INDEX IF NOT EXISTS locations_post_count_idx ON locations(post_count DESC);
CREATE INDEX IF NOT EXISTS locations_name_idx ON locations(name);

-- PostGIS geospatial index for proximity queries
-- Uses SRID 4326 (WGS 84) which is standard for GPS coordinates
CREATE INDEX IF NOT EXISTS locations_geo_idx ON locations USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

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
    EXECUTE FUNCTION decrement_location_post_count();

-- ============================================================================
-- VALIDATION CONSTRAINTS
-- ============================================================================

-- Ensure note has content
ALTER TABLE posts ADD CONSTRAINT posts_message_not_empty CHECK (LENGTH(TRIM(message)) > 0);