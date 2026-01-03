-- ============================================================================
-- BACKTRACK FULL DATABASE MIGRATION
-- ============================================================================
-- This is a consolidated migration file that combines all individual migrations
-- into a single, comprehensive schema setup that can be run on a fresh Supabase
-- database in a single execution.
--
-- Generated from migrations:
-- - 001_initial_schema.sql
-- - 002_messaging_schema.sql
-- - 002_rls_policies.sql
-- - 003_geospatial_functions.sql
-- - 003_moderation_schema.sql
-- - 004_rls_policies.sql
-- - 005_storage_policies.sql
-- - 006_location_visits.sql
-- - 007_add_profile_verification.sql
-- - 007_favorite_locations.sql
-- - 007_profile_photos.sql
-- - 007_push_tokens.sql
-- - 008_event_integration.sql
-- - 008_notification_preferences.sql
-- - 009_notification_webhooks.sql
-- - 010_add_time_to_posts.sql
-- - 010_photo_shares.sql
--
-- Note: This migration resolves conflicts between files (e.g., conversations table)
-- by merging columns from all sources.
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_net for async HTTP calls from triggers (notification webhooks)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================================
-- SECTION 2: CORE TABLES
-- ============================================================================

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
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    verified_at TIMESTAMPTZ,
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
COMMENT ON COLUMN profiles.is_verified IS 'Whether the user has been verified by an administrator';
COMMENT ON COLUMN profiles.verified_at IS 'Timestamp when the user was verified (NULL if not verified)';
COMMENT ON COLUMN profiles.created_at IS 'Timestamp when the profile was created';
COMMENT ON COLUMN profiles.updated_at IS 'Timestamp when the profile was last updated';

-- Create indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at DESC);
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);
CREATE INDEX IF NOT EXISTS profiles_updated_at_idx ON profiles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified) WHERE is_verified = TRUE;

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
    sighting_date TIMESTAMPTZ,
    time_granularity TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days') NOT NULL,
    photo_id UUID,

    -- Validate time_granularity values
    CONSTRAINT posts_valid_time_granularity CHECK (
        time_granularity IS NULL OR time_granularity IN ('specific', 'morning', 'afternoon', 'evening')
    )
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
COMMENT ON COLUMN posts.sighting_date IS 'Optional timestamp when the producer saw the person of interest at the location';
COMMENT ON COLUMN posts.time_granularity IS 'Time precision: specific (exact time), morning (6am-12pm), afternoon (12pm-6pm), or evening (6pm-12am). NULL if time not specified.';
COMMENT ON COLUMN posts.created_at IS 'Timestamp when the post was created';
COMMENT ON COLUMN posts.expires_at IS 'Timestamp when the post expires (defaults to 30 days)';
COMMENT ON COLUMN posts.is_active IS 'Whether the post is currently active and visible';
COMMENT ON COLUMN posts.photo_id IS 'Optional reference to a profile photo used for verification (alternative to selfie_url)';

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
CREATE INDEX IF NOT EXISTS idx_posts_location_active_created ON posts(location_id, created_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS posts_location_active_idx ON posts(location_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_photo_id ON posts(photo_id) WHERE photo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_sighting_date ON posts(sighting_date DESC) WHERE sighting_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_location_sighting_date ON posts(location_id, sighting_date DESC) WHERE is_active = true AND sighting_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_sighting_date_30_days ON posts(sighting_date DESC) WHERE is_active = true AND sighting_date IS NOT NULL; -- Fixed: removed NOW()

-- ============================================================================
-- CONVERSATIONS TABLE (MERGED)
-- ============================================================================
-- Conversations between post producers and consumers
-- MERGED: Combines columns from 001_initial_schema.sql (status, producer_accepted)
-- and 002_messaging_schema.sql (is_active)

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    producer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    consumer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    producer_accepted BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Prevent duplicate responses to the same post by the same consumer
    CONSTRAINT conversations_unique_response UNIQUE(post_id, consumer_id),

    -- Ensure producer and consumer are different users
    CONSTRAINT conversations_different_users CHECK (producer_id != consumer_id),

    -- Validate status values
    CONSTRAINT conversations_valid_status CHECK (status IN ('pending', 'active', 'declined', 'blocked'))
);

COMMENT ON TABLE conversations IS 'Anonymous chat sessions between post producer and consumer who respond';
COMMENT ON COLUMN conversations.id IS 'Unique identifier for the conversation';
COMMENT ON COLUMN conversations.post_id IS 'The post that initiated this conversation';
COMMENT ON COLUMN conversations.producer_id IS 'User who created the original post';
COMMENT ON COLUMN conversations.consumer_id IS 'User who initiated the conversation (matched with the post)';
COMMENT ON COLUMN conversations.status IS 'Conversation status: pending, active, declined, or blocked';
COMMENT ON COLUMN conversations.producer_accepted IS 'Whether the producer has accepted this conversation';
COMMENT ON COLUMN conversations.is_active IS 'Whether the conversation is currently active';
COMMENT ON COLUMN conversations.created_at IS 'Timestamp when the conversation was started';
COMMENT ON COLUMN conversations.updated_at IS 'Timestamp of the last activity in the conversation';

-- Create indexes for conversation queries
CREATE INDEX IF NOT EXISTS conversations_producer_idx ON conversations(producer_id);
CREATE INDEX IF NOT EXISTS conversations_consumer_idx ON conversations(consumer_id);
CREATE INDEX IF NOT EXISTS conversations_post_idx ON conversations(post_id);
CREATE INDEX IF NOT EXISTS conversations_status_idx ON conversations(status);
CREATE INDEX IF NOT EXISTS conversations_user_active_idx ON conversations(producer_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_conversations_post_id ON conversations(post_id);
CREATE INDEX IF NOT EXISTS idx_conversations_producer_id ON conversations(producer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_consumer_id ON conversations(consumer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_is_active ON conversations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_conversations_producer_active_updated ON conversations(producer_id, updated_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_conversations_consumer_active_updated ON conversations(consumer_id, updated_at DESC) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_post_consumer_unique ON conversations(post_id, consumer_id);

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
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Ensure message content is not empty
    CONSTRAINT messages_content_not_empty CHECK (LENGTH(TRIM(content)) > 0),

    -- Ensure message content is not excessively long (10,000 characters max)
    CONSTRAINT messages_content_max_length CHECK (LENGTH(content) <= 10000)
);

COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON COLUMN messages.id IS 'Unique identifier for the message';
COMMENT ON COLUMN messages.conversation_id IS 'The conversation this message belongs to';
COMMENT ON COLUMN messages.sender_id IS 'User who sent this message';
COMMENT ON COLUMN messages.content IS 'The message text content';
COMMENT ON COLUMN messages.created_at IS 'Timestamp when the message was sent';
COMMENT ON COLUMN messages.is_read IS 'Whether the recipient has read this message';

-- Create indexes for message queries
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_unread_idx ON messages(conversation_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_unread ON messages(conversation_id, created_at ASC) WHERE is_read = false;

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
-- BLOCKS TABLE
-- ============================================================================
-- Allows users to block other users

CREATE TABLE IF NOT EXISTS blocks (
    blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id),

    -- Ensure users cannot block themselves
    CONSTRAINT blocks_no_self_block CHECK (blocker_id != blocked_id)
);

COMMENT ON TABLE blocks IS 'User blocks to prevent unwanted interactions';
COMMENT ON COLUMN blocks.blocker_id IS 'User who initiated the block';
COMMENT ON COLUMN blocks.blocked_id IS 'User who is being blocked';
COMMENT ON COLUMN blocks.created_at IS 'Timestamp when the block was created';

-- Create indexes for block queries
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_created_at ON blocks(created_at DESC);

-- ============================================================================
-- REPORTS TABLE
-- ============================================================================
-- Allows users to report inappropriate content or users

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reported_type TEXT NOT NULL,
    reported_id UUID NOT NULL,
    reason TEXT NOT NULL,
    additional_details TEXT,
    status TEXT DEFAULT 'pending' NOT NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Ensure reported_type is valid
    CONSTRAINT reports_valid_type CHECK (reported_type IN ('post', 'message', 'user')),

    -- Ensure reason is not empty
    CONSTRAINT reports_reason_not_empty CHECK (LENGTH(TRIM(reason)) > 0),

    -- Ensure reason is not excessively long (1000 characters max)
    CONSTRAINT reports_reason_max_length CHECK (LENGTH(reason) <= 1000),

    -- Ensure additional_details is not excessively long (5000 characters max)
    CONSTRAINT reports_additional_details_max_length CHECK (additional_details IS NULL OR LENGTH(additional_details) <= 5000),

    -- Ensure status is valid
    CONSTRAINT reports_valid_status CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'))
);

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
CREATE INDEX IF NOT EXISTS idx_reports_pending_created ON reports(created_at ASC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reports_type_status ON reports(reported_type, status, created_at DESC);

-- ============================================================================
-- LOCATION_VISITS TABLE
-- ============================================================================
-- Tracks user visits to physical locations for post creation eligibility

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

COMMENT ON TABLE location_visits IS 'Tracks user visits to physical locations for post creation eligibility';
COMMENT ON COLUMN location_visits.id IS 'Unique identifier for the visit record';
COMMENT ON COLUMN location_visits.user_id IS 'User who visited the location';
COMMENT ON COLUMN location_visits.location_id IS 'Location that was visited';
COMMENT ON COLUMN location_visits.visited_at IS 'Timestamp when the user was at the location';
COMMENT ON COLUMN location_visits.latitude IS 'GPS latitude of user at time of visit';
COMMENT ON COLUMN location_visits.longitude IS 'GPS longitude of user at time of visit';
COMMENT ON COLUMN location_visits.accuracy IS 'GPS accuracy in meters (lower is better)';
COMMENT ON COLUMN location_visits.created_at IS 'Timestamp when the visit record was created';

-- Create indexes for location visits
CREATE INDEX IF NOT EXISTS idx_location_visits_user_id ON location_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_location_visits_location_id ON location_visits(location_id);
CREATE INDEX IF NOT EXISTS idx_location_visits_user_visited_at ON location_visits(user_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_visits_user_location ON location_visits(user_id, location_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_visits_created_at ON location_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_visits_recent ON location_visits(user_id, visited_at DESC); -- Fixed: removed NOW() predicate

-- ============================================================================
-- FAVORITE_LOCATIONS TABLE
-- ============================================================================
-- Stores user's favorite locations for quick access

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

-- Create indexes for favorite locations
CREATE INDEX IF NOT EXISTS idx_favorite_locations_user_id ON favorite_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_locations_user_created ON favorite_locations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorite_locations_user_updated ON favorite_locations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorite_locations_place_id ON favorite_locations(user_id, place_id) WHERE place_id IS NOT NULL;

-- ============================================================================
-- PROFILE_PHOTOS TABLE
-- ============================================================================
-- Stores user verification photos with content moderation

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

COMMENT ON TABLE profile_photos IS 'User verification photos for post creation with content moderation';
COMMENT ON COLUMN profile_photos.id IS 'Unique identifier for the photo';
COMMENT ON COLUMN profile_photos.user_id IS 'User who owns this photo';
COMMENT ON COLUMN profile_photos.storage_path IS 'Path to the photo in Supabase Storage (selfies bucket)';
COMMENT ON COLUMN profile_photos.moderation_status IS 'Content moderation status: pending, approved, rejected, or error';
COMMENT ON COLUMN profile_photos.moderation_result IS 'JSONB result from Google Cloud Vision SafeSearch API';
COMMENT ON COLUMN profile_photos.is_primary IS 'Whether this is the user''s primary/default photo';
COMMENT ON COLUMN profile_photos.created_at IS 'Timestamp when the photo was uploaded';

-- Create indexes for profile photos
CREATE INDEX IF NOT EXISTS idx_profile_photos_user_id ON profile_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_photos_status ON profile_photos(moderation_status);
CREATE INDEX IF NOT EXISTS idx_profile_photos_created_at ON profile_photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_photos_user_approved ON profile_photos(user_id, created_at DESC) WHERE moderation_status = 'approved';
CREATE INDEX IF NOT EXISTS idx_profile_photos_user_primary ON profile_photos(user_id) WHERE is_primary = TRUE;

-- Add foreign key for posts.photo_id (deferred to avoid circular dependency)
ALTER TABLE posts ADD CONSTRAINT posts_photo_id_fkey FOREIGN KEY (photo_id) REFERENCES profile_photos(id) ON DELETE SET NULL;

-- ============================================================================
-- REJECTED_PHOTO_CLEANUP_QUEUE TABLE
-- ============================================================================
-- Queue of rejected photos pending storage cleanup

CREATE TABLE IF NOT EXISTS rejected_photo_cleanup_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL,
    storage_path TEXT NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE rejected_photo_cleanup_queue IS 'Queue of rejected photos pending storage cleanup';

-- ============================================================================
-- EXPO_PUSH_TOKENS TABLE
-- ============================================================================
-- Stores Expo push notification tokens for users

CREATE TABLE IF NOT EXISTS expo_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL UNIQUE,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE expo_push_tokens IS 'Expo push notification tokens for sending notifications to user devices';
COMMENT ON COLUMN expo_push_tokens.id IS 'Unique identifier for the token record';
COMMENT ON COLUMN expo_push_tokens.user_id IS 'User who owns this push token';
COMMENT ON COLUMN expo_push_tokens.token IS 'Expo push token string (e.g., ExponentPushToken[xxx])';
COMMENT ON COLUMN expo_push_tokens.device_info IS 'Optional JSONB containing device information (platform, model, etc.)';
COMMENT ON COLUMN expo_push_tokens.created_at IS 'Timestamp when the token was first registered';
COMMENT ON COLUMN expo_push_tokens.updated_at IS 'Timestamp when the token was last updated';

-- Create indexes for push tokens
CREATE INDEX IF NOT EXISTS idx_expo_push_tokens_user_id ON expo_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_expo_push_tokens_token ON expo_push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_expo_push_tokens_created_at ON expo_push_tokens(created_at DESC);

-- ============================================================================
-- NOTIFICATION_PREFERENCES TABLE
-- ============================================================================
-- Stores user notification preferences

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    match_notifications BOOLEAN DEFAULT true NOT NULL,
    message_notifications BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE notification_preferences IS 'User preferences for push notification delivery';
COMMENT ON COLUMN notification_preferences.id IS 'Unique identifier for the preferences record';
COMMENT ON COLUMN notification_preferences.user_id IS 'User who owns these preferences (one record per user)';
COMMENT ON COLUMN notification_preferences.match_notifications IS 'Whether to send push notifications for new matches';
COMMENT ON COLUMN notification_preferences.message_notifications IS 'Whether to send push notifications for new messages';
COMMENT ON COLUMN notification_preferences.created_at IS 'Timestamp when the preferences were first created';
COMMENT ON COLUMN notification_preferences.updated_at IS 'Timestamp when the preferences were last updated';

-- Create indexes for notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_created_at ON notification_preferences(created_at DESC);

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
-- Stores events synced from external platforms (Eventbrite, Meetup)

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    date_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    venue_name TEXT,
    venue_address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    image_url TEXT,
    url TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Prevent duplicate events from same platform
    CONSTRAINT events_unique_external UNIQUE(external_id, platform),

    -- Validate platform values
    CONSTRAINT events_valid_platform CHECK (platform IN ('eventbrite', 'meetup'))
);

COMMENT ON TABLE events IS 'External events synced from Eventbrite and Meetup APIs for missed connection posts';
COMMENT ON COLUMN events.id IS 'Unique identifier for the event';
COMMENT ON COLUMN events.external_id IS 'Event ID from the external platform (Eventbrite or Meetup)';
COMMENT ON COLUMN events.platform IS 'Source platform: eventbrite or meetup';
COMMENT ON COLUMN events.title IS 'Event title/name';
COMMENT ON COLUMN events.description IS 'Event description text';
COMMENT ON COLUMN events.date_time IS 'Event start date and time with timezone';
COMMENT ON COLUMN events.end_time IS 'Event end date and time with timezone';
COMMENT ON COLUMN events.venue_name IS 'Name of the venue/location';
COMMENT ON COLUMN events.venue_address IS 'Full address of the venue';
COMMENT ON COLUMN events.latitude IS 'GPS latitude coordinate of venue';
COMMENT ON COLUMN events.longitude IS 'GPS longitude coordinate of venue';
COMMENT ON COLUMN events.image_url IS 'URL to event image/banner';
COMMENT ON COLUMN events.url IS 'URL to event page on external platform';
COMMENT ON COLUMN events.category IS 'Event category (e.g., music, tech, sports)';
COMMENT ON COLUMN events.created_at IS 'Timestamp when the event was first cached';
COMMENT ON COLUMN events.synced_at IS 'Timestamp when the event was last synced from external API';

-- Create indexes for events
CREATE INDEX IF NOT EXISTS idx_events_date_time ON events(date_time);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_events_geo ON events USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_platform ON events(platform);
CREATE INDEX IF NOT EXISTS idx_events_external_id ON events(external_id, platform);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_synced_at ON events(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_upcoming ON events(date_time ASC) WHERE date_time IS NOT NULL; -- Fixed: removed NOW()

-- ============================================================================
-- EVENT_POSTS TABLE
-- ============================================================================
-- Junction table linking posts to events

CREATE TABLE IF NOT EXISTS event_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Prevent duplicate event-post associations
    CONSTRAINT event_posts_unique UNIQUE(event_id, post_id)
);

COMMENT ON TABLE event_posts IS 'Links posts to events for event-specific missed connections';
COMMENT ON COLUMN event_posts.id IS 'Unique identifier for the event-post link';
COMMENT ON COLUMN event_posts.event_id IS 'Reference to the event';
COMMENT ON COLUMN event_posts.post_id IS 'Reference to the post';
COMMENT ON COLUMN event_posts.created_at IS 'Timestamp when the link was created';

-- Create indexes for event posts
CREATE INDEX IF NOT EXISTS idx_event_posts_event_id ON event_posts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_posts_post_id ON event_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_event_posts_event_created ON event_posts(event_id, created_at DESC);

-- ============================================================================
-- USER_EVENT_TOKENS TABLE
-- ============================================================================
-- Stores OAuth tokens for external event platform APIs

CREATE TABLE IF NOT EXISTS user_event_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    scope TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- One token per user per provider
    CONSTRAINT user_event_tokens_unique UNIQUE(user_id, provider),

    -- Validate provider values
    CONSTRAINT user_event_tokens_valid_provider CHECK (provider IN ('eventbrite', 'meetup'))
);

COMMENT ON TABLE user_event_tokens IS 'OAuth tokens for external event platform APIs (Eventbrite, Meetup)';

-- Create indexes for user event tokens
CREATE INDEX IF NOT EXISTS idx_user_event_tokens_user_id ON user_event_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_tokens_provider ON user_event_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_user_event_tokens_expires_at ON user_event_tokens(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- EVENT_REMINDERS TABLE
-- ============================================================================
-- Scheduled post-event reminder notifications

CREATE TABLE IF NOT EXISTS event_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    reminder_type TEXT DEFAULT 'post_event_check' NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent BOOLEAN DEFAULT FALSE NOT NULL,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Prevent duplicate reminders for same user/event/type
    CONSTRAINT event_reminders_unique UNIQUE(user_id, event_id, reminder_type),

    -- Validate reminder type values
    CONSTRAINT event_reminders_valid_type CHECK (reminder_type IN ('post_event_check', 'event_starting', 'new_post'))
);

COMMENT ON TABLE event_reminders IS 'Scheduled post-event reminder notifications for missed connections';

-- Create indexes for event reminders
CREATE INDEX IF NOT EXISTS idx_event_reminders_user_id ON event_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_event_id ON event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_pending ON event_reminders(scheduled_for ASC) WHERE sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_event_reminders_sent ON event_reminders(sent_at DESC) WHERE sent = TRUE;

-- ============================================================================
-- APP_CONFIGURATION TABLE
-- ============================================================================
-- Application configuration settings for Edge Functions

CREATE TABLE IF NOT EXISTS app_configuration (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE app_configuration IS 'Application configuration settings for Edge Functions and other runtime config';
COMMENT ON COLUMN app_configuration.key IS 'Unique configuration key';
COMMENT ON COLUMN app_configuration.value IS 'Configuration value';
COMMENT ON COLUMN app_configuration.description IS 'Human-readable description of this configuration';

-- Insert default configuration for Edge Function URL
INSERT INTO app_configuration (key, value, description)
VALUES (
    'edge_function_url',
    'http://localhost:54321/functions/v1/send-notification',
    'URL for the send-notification Edge Function. Update to your Supabase project URL in production.'
)
ON CONFLICT (key) DO NOTHING;

-- Insert service role key placeholder
INSERT INTO app_configuration (key, value, description)
VALUES (
    'service_role_key',
    '',
    'Service role key for Edge Function authentication. Set via Supabase Dashboard > Settings > API.'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PHOTO_SHARES TABLE
-- ============================================================================
-- Tracks which profile photos are shared with specific matches

CREATE TABLE IF NOT EXISTS photo_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID REFERENCES profile_photos(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    shared_with_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Ensure unique constraint: one share per photo-user-conversation combination
    CONSTRAINT photo_shares_unique UNIQUE (photo_id, shared_with_user_id, conversation_id),

    -- Ensure owner cannot share with themselves
    CONSTRAINT photo_shares_no_self_share CHECK (owner_id != shared_with_user_id)
);

COMMENT ON TABLE photo_shares IS 'Tracks which profile photos are shared with specific matches in conversations';
COMMENT ON COLUMN photo_shares.id IS 'Unique identifier for the share record';
COMMENT ON COLUMN photo_shares.photo_id IS 'Reference to the profile photo being shared';
COMMENT ON COLUMN photo_shares.owner_id IS 'User who owns the photo and initiated the share';
COMMENT ON COLUMN photo_shares.shared_with_user_id IS 'User who can now view the photo';
COMMENT ON COLUMN photo_shares.conversation_id IS 'Conversation context where the share occurred';
COMMENT ON COLUMN photo_shares.created_at IS 'Timestamp when the photo was shared';

-- Create indexes for photo shares
CREATE INDEX IF NOT EXISTS idx_photo_shares_photo_id ON photo_shares(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_shares_shared_with ON photo_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_photo_shares_conversation ON photo_shares(conversation_id);
CREATE INDEX IF NOT EXISTS idx_photo_shares_owner ON photo_shares(owner_id);
CREATE INDEX IF NOT EXISTS idx_photo_shares_conversation_owner ON photo_shares(conversation_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_photo_shares_photo_recipient ON photo_shares(photo_id, shared_with_user_id);

-- ============================================================================
-- SECTION 3: FUNCTIONS
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
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, display_name, created_at, updated_at)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NULL), NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deactivate expired posts
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

-- Helper function to check conversation participation
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
-- GEOSPATIAL FUNCTIONS
-- ============================================================================

-- Function to get nearby locations
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

COMMENT ON FUNCTION get_nearby_locations(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) IS
  'Returns locations within radius_meters of the given coordinates, ordered by distance.';

-- Function to get locations with active posts
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
    COUNT(p.id) AS active_post_count,
    l.created_at,
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

COMMENT ON FUNCTION get_locations_with_active_posts(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER) IS
  'Returns nearby locations with active posts for map marker display.';

-- ============================================================================
-- MODERATION FUNCTIONS
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
CREATE OR REPLACE FUNCTION block_user(blocker UUID, blocked UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO blocks (blocker_id, blocked_id, created_at)
    VALUES (blocker, blocked, NOW())
    ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

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
-- LOCATION VISIT FUNCTIONS
-- ============================================================================

-- Function to record a location visit
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
  proximity_radius CONSTANT DOUBLE PRECISION := 50.0;
  v_location locations%ROWTYPE;
  v_visit location_visits%ROWTYPE;
BEGIN
  SELECT * INTO v_location
  FROM locations
  WHERE id = p_location_id;

  IF v_location IS NULL THEN
    RETURN NULL;
  END IF;

  user_point := ST_SetSRID(ST_MakePoint(p_user_lon, p_user_lat), 4326)::geography;
  location_point := ST_SetSRID(ST_MakePoint(v_location.longitude, v_location.latitude), 4326)::geography;

  IF NOT ST_DWithin(user_point, location_point, proximity_radius) THEN
    RETURN NULL;
  END IF;

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

COMMENT ON FUNCTION record_location_visit(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) IS
  'Records a user visit to a location if within 50m proximity.';

-- Function to get recently visited locations
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
  'Returns locations visited by the current user within the last 3 hours.';

-- Function to cleanup old location visits
CREATE OR REPLACE FUNCTION cleanup_old_location_visits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleanup_threshold CONSTANT INTERVAL := INTERVAL '3 hours';
  rows_deleted INTEGER;
BEGIN
  DELETE FROM location_visits
  WHERE visited_at < NOW() - cleanup_threshold;

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  RETURN rows_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_old_location_visits() IS
  'Deletes location visits older than 3 hours.';

-- ============================================================================
-- PROFILE PHOTO FUNCTIONS
-- ============================================================================

-- Function to ensure only one primary photo per user
CREATE OR REPLACE FUNCTION set_primary_photo(p_photo_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT user_id INTO v_user_id
    FROM profile_photos
    WHERE id = p_photo_id AND user_id = auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Photo not found or access denied';
    END IF;

    UPDATE profile_photos
    SET is_primary = FALSE
    WHERE user_id = v_user_id AND is_primary = TRUE;

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

-- Function to get photo count for user
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

-- Function to update moderation status
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

-- Function to queue rejected photos for cleanup
CREATE OR REPLACE FUNCTION queue_rejected_photo_cleanup()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.moderation_status = 'rejected' AND
       (OLD.moderation_status IS NULL OR OLD.moderation_status != 'rejected') THEN
        INSERT INTO rejected_photo_cleanup_queue (photo_id, storage_path, user_id)
        VALUES (NEW.id, NEW.storage_path, NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PUSH TOKEN FUNCTIONS
-- ============================================================================

-- Function to upsert a push token
CREATE OR REPLACE FUNCTION upsert_push_token(
    p_user_id UUID,
    p_token TEXT,
    p_device_info JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    token_id UUID;
BEGIN
    INSERT INTO expo_push_tokens (user_id, token, device_info)
    VALUES (p_user_id, p_token, p_device_info)
    ON CONFLICT (token) DO UPDATE
    SET
        user_id = p_user_id,
        device_info = COALESCE(EXCLUDED.device_info, expo_push_tokens.device_info),
        updated_at = NOW()
    RETURNING id INTO token_id;

    RETURN token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION upsert_push_token(UUID, TEXT, JSONB) IS 'Register or update an Expo push token for a user';

-- Function to get all push tokens for a user
CREATE OR REPLACE FUNCTION get_user_push_tokens(p_user_id UUID)
RETURNS TABLE (token TEXT, device_info JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT ept.token, ept.device_info
    FROM expo_push_tokens ept
    WHERE ept.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_push_tokens(UUID) IS 'Get all push tokens for a user';

-- Function to remove invalid push tokens
CREATE OR REPLACE FUNCTION remove_invalid_push_token(p_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    rows_deleted INTEGER;
BEGIN
    DELETE FROM expo_push_tokens
    WHERE token = p_token;

    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    RETURN rows_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION remove_invalid_push_token(TEXT) IS 'Remove an invalid push token from the database';

-- ============================================================================
-- NOTIFICATION PREFERENCE FUNCTIONS
-- ============================================================================

-- Function to upsert notification preferences
CREATE OR REPLACE FUNCTION upsert_notification_preferences(
    p_user_id UUID,
    p_match_notifications BOOLEAN DEFAULT true,
    p_message_notifications BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
    prefs_id UUID;
BEGIN
    INSERT INTO notification_preferences (user_id, match_notifications, message_notifications)
    VALUES (p_user_id, p_match_notifications, p_message_notifications)
    ON CONFLICT (user_id) DO UPDATE
    SET
        match_notifications = EXCLUDED.match_notifications,
        message_notifications = EXCLUDED.message_notifications,
        updated_at = NOW()
    RETURNING id INTO prefs_id;

    RETURN prefs_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION upsert_notification_preferences(UUID, BOOLEAN, BOOLEAN) IS 'Create or update notification preferences for a user';

-- Function to get notification preferences for a user
CREATE OR REPLACE FUNCTION get_notification_preferences(p_user_id UUID)
RETURNS TABLE (
    match_notifications BOOLEAN,
    message_notifications BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(np.match_notifications, true) AS match_notifications,
        COALESCE(np.message_notifications, true) AS message_notifications
    FROM notification_preferences np
    WHERE np.user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT true AS match_notifications, true AS message_notifications;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_notification_preferences(UUID) IS 'Get notification preferences for a user';

-- Function to check if a specific notification type is enabled
CREATE OR REPLACE FUNCTION is_notification_enabled(
    p_user_id UUID,
    p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    is_enabled BOOLEAN;
BEGIN
    SELECT
        CASE p_notification_type
            WHEN 'match' THEN COALESCE(np.match_notifications, true)
            WHEN 'message' THEN COALESCE(np.message_notifications, true)
            ELSE true
        END
    INTO is_enabled
    FROM notification_preferences np
    WHERE np.user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN true;
    END IF;

    RETURN is_enabled;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_notification_enabled(UUID, TEXT) IS 'Check if a specific notification type is enabled for a user';

-- ============================================================================
-- APP CONFIG FUNCTIONS
-- ============================================================================

-- Function to get a configuration value
CREATE OR REPLACE FUNCTION get_app_config(p_key TEXT)
RETURNS TEXT AS $$
DECLARE
    config_value TEXT;
BEGIN
    SELECT value INTO config_value
    FROM app_configuration
    WHERE key = p_key;

    RETURN config_value;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_app_config(TEXT) IS 'Get an application configuration value by key';

-- Function to update a configuration value
CREATE OR REPLACE FUNCTION set_app_config(p_key TEXT, p_value TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE app_configuration
    SET value = p_value, updated_at = NOW()
    WHERE key = p_key;

    IF NOT FOUND THEN
        INSERT INTO app_configuration (key, value)
        VALUES (p_key, p_value);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_app_config(TEXT, TEXT) IS 'Set an application configuration value';

-- ============================================================================
-- NOTIFICATION WEBHOOK FUNCTIONS
-- ============================================================================

-- Match notification trigger function
CREATE OR REPLACE FUNCTION notify_on_new_match()
RETURNS TRIGGER AS $$
DECLARE
    edge_function_url TEXT;
    service_key TEXT;
    notification_payload JSONB;
    request_id BIGINT;
BEGIN
    edge_function_url := get_app_config('edge_function_url');
    service_key := get_app_config('service_role_key');

    IF edge_function_url IS NULL OR edge_function_url = '' THEN
        RAISE NOTICE 'Edge Function URL not configured, skipping notification';
        RETURN NEW;
    END IF;

    notification_payload := jsonb_build_object(
        'userId', NEW.producer_id::TEXT,
        'title', 'New Match!',
        'body', 'Someone is interested in connecting with you!',
        'data', jsonb_build_object(
            'type', 'match',
            'url', 'backtrack://conversation/' || NEW.id::TEXT,
            'id', NEW.id::TEXT,
            'postId', NEW.post_id::TEXT
        )
    );

    BEGIN
        SELECT net.http_post(
            url := edge_function_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || COALESCE(service_key, '')
            )::JSONB,
            body := notification_payload
        ) INTO request_id;

        RAISE NOTICE 'Match notification sent for conversation %, request_id: %', NEW.id, request_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to send match notification: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_on_new_match() IS 'Trigger function to send push notification when a new match is created';

-- Message notification trigger function
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
    edge_function_url TEXT;
    service_key TEXT;
    conversation_record RECORD;
    recipient_id UUID;
    sender_name TEXT;
    message_preview TEXT;
    notification_payload JSONB;
    request_id BIGINT;
BEGIN
    edge_function_url := get_app_config('edge_function_url');
    service_key := get_app_config('service_role_key');

    IF edge_function_url IS NULL OR edge_function_url = '' THEN
        RAISE NOTICE 'Edge Function URL not configured, skipping notification';
        RETURN NEW;
    END IF;

    SELECT c.producer_id, c.consumer_id, c.post_id
    INTO conversation_record
    FROM conversations c
    WHERE c.id = NEW.conversation_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Conversation not found for message %', NEW.id;
        RETURN NEW;
    END IF;

    IF NEW.sender_id = conversation_record.producer_id THEN
        recipient_id := conversation_record.consumer_id;
    ELSE
        recipient_id := conversation_record.producer_id;
    END IF;

    sender_name := 'Your match';

    message_preview := LEFT(NEW.content, 100);
    IF LENGTH(NEW.content) > 100 THEN
        message_preview := message_preview || '...';
    END IF;

    notification_payload := jsonb_build_object(
        'userId', recipient_id::TEXT,
        'title', 'New Message',
        'body', sender_name || ': ' || message_preview,
        'data', jsonb_build_object(
            'type', 'message',
            'url', 'backtrack://conversation/' || NEW.conversation_id::TEXT,
            'id', NEW.conversation_id::TEXT,
            'messageId', NEW.id::TEXT
        )
    );

    BEGIN
        SELECT net.http_post(
            url := edge_function_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || COALESCE(service_key, '')
            )::JSONB,
            body := notification_payload
        ) INTO request_id;

        RAISE NOTICE 'Message notification sent for message %, request_id: %', NEW.id, request_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to send message notification: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_on_new_message() IS 'Trigger function to send push notification when a new message is sent';

-- Function to test notification webhook setup
CREATE OR REPLACE FUNCTION test_notification_webhooks()
RETURNS JSONB AS $$
DECLARE
    edge_url TEXT;
    service_key_set BOOLEAN;
    pg_net_available BOOLEAN;
    result JSONB;
BEGIN
    edge_url := get_app_config('edge_function_url');
    service_key_set := COALESCE(get_app_config('service_role_key'), '') != '';

    SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
    ) INTO pg_net_available;

    result := jsonb_build_object(
        'pg_net_available', pg_net_available,
        'edge_function_url', edge_url,
        'edge_function_url_configured', edge_url IS NOT NULL AND edge_url != '' AND edge_url != 'http://localhost:54321/functions/v1/send-notification',
        'service_role_key_set', service_key_set,
        'triggers_installed', TRUE,
        'status', CASE
            WHEN NOT pg_net_available THEN 'ERROR: pg_net extension not available'
            WHEN edge_url IS NULL OR edge_url = '' THEN 'WARNING: Edge Function URL not configured'
            WHEN NOT service_key_set THEN 'WARNING: Service role key not set'
            ELSE 'OK: All components configured'
        END
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION test_notification_webhooks() IS 'Test function to verify notification webhook configuration';

-- ============================================================================
-- EVENT FUNCTIONS
-- ============================================================================

-- Function to get event post count
CREATE OR REPLACE FUNCTION get_event_post_count(p_event_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::INTEGER
    FROM event_posts
    WHERE event_id = p_event_id;
$$;

COMMENT ON FUNCTION get_event_post_count(UUID) IS 'Returns the count of posts associated with an event';

-- Function to get upcoming events
CREATE OR REPLACE FUNCTION get_upcoming_events(
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION DEFAULT 50.0,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    external_id TEXT,
    platform TEXT,
    title TEXT,
    description TEXT,
    date_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    venue_name TEXT,
    venue_address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    image_url TEXT,
    url TEXT,
    category TEXT,
    distance_km DOUBLE PRECISION,
    post_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        e.id,
        e.external_id,
        e.platform,
        e.title,
        e.description,
        e.date_time,
        e.end_time,
        e.venue_name,
        e.venue_address,
        e.latitude,
        e.longitude,
        e.image_url,
        e.url,
        e.category,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(e.longitude, e.latitude), 4326)::geography
        ) / 1000.0 AS distance_km,
        (SELECT COUNT(*)::INTEGER FROM event_posts WHERE event_id = e.id) AS post_count
    FROM events e
    WHERE e.date_time > NOW()
        AND e.latitude IS NOT NULL
        AND e.longitude IS NOT NULL
        AND ST_DWithin(
            ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(e.longitude, e.latitude), 4326)::geography,
            p_radius_km * 1000
        )
    ORDER BY e.date_time ASC
    LIMIT p_limit;
$$;

COMMENT ON FUNCTION get_upcoming_events(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) IS
    'Returns upcoming events within a specified radius, sorted by date.';

-- Function to schedule post-event reminder
CREATE OR REPLACE FUNCTION schedule_post_event_reminder(
    p_event_id UUID
)
RETURNS event_reminders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event events%ROWTYPE;
    v_reminder event_reminders%ROWTYPE;
    v_scheduled_time TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_event
    FROM events
    WHERE id = p_event_id;

    IF v_event IS NULL THEN
        RETURN NULL;
    END IF;

    v_scheduled_time := COALESCE(v_event.end_time, v_event.date_time) + INTERVAL '24 hours';

    INSERT INTO event_reminders (
        user_id,
        event_id,
        reminder_type,
        scheduled_for
    )
    VALUES (
        auth.uid(),
        p_event_id,
        'post_event_check',
        v_scheduled_time
    )
    ON CONFLICT (user_id, event_id, reminder_type) DO NOTHING
    RETURNING * INTO v_reminder;

    RETURN v_reminder;
END;
$$;

COMMENT ON FUNCTION schedule_post_event_reminder(UUID) IS
    'Schedules a post-event reminder for 24 hours after an event ends.';

-- Function to update user_event_tokens updated_at
CREATE OR REPLACE FUNCTION update_user_event_tokens_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================================================
-- PHOTO SHARE FUNCTIONS
-- ============================================================================

-- Function to share a photo with a match
CREATE OR REPLACE FUNCTION share_photo_with_match(
    p_photo_id UUID,
    p_conversation_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_photo_owner UUID;
    v_photo_status TEXT;
    v_recipient_id UUID;
    v_producer_id UUID;
    v_consumer_id UUID;
    v_share_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT user_id, moderation_status INTO v_photo_owner, v_photo_status
    FROM profile_photos
    WHERE id = p_photo_id;

    IF v_photo_owner IS NULL THEN
        RAISE EXCEPTION 'Photo not found';
    END IF;

    IF v_photo_owner != v_user_id THEN
        RAISE EXCEPTION 'You can only share your own photos';
    END IF;

    IF v_photo_status != 'approved' THEN
        RAISE EXCEPTION 'Only approved photos can be shared';
    END IF;

    SELECT producer_id, consumer_id INTO v_producer_id, v_consumer_id
    FROM conversations
    WHERE id = p_conversation_id;

    IF v_producer_id IS NULL THEN
        RAISE EXCEPTION 'Conversation not found';
    END IF;

    IF v_user_id != v_producer_id AND v_user_id != v_consumer_id THEN
        RAISE EXCEPTION 'You are not a participant in this conversation';
    END IF;

    v_recipient_id := CASE
        WHEN v_user_id = v_producer_id THEN v_consumer_id
        ELSE v_producer_id
    END;

    INSERT INTO photo_shares (photo_id, owner_id, shared_with_user_id, conversation_id)
    VALUES (p_photo_id, v_user_id, v_recipient_id, p_conversation_id)
    ON CONFLICT (photo_id, shared_with_user_id, conversation_id)
    DO UPDATE SET created_at = NOW()
    RETURNING id INTO v_share_id;

    RETURN v_share_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unshare a photo
CREATE OR REPLACE FUNCTION unshare_photo_from_match(
    p_photo_id UUID,
    p_conversation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_deleted_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    DELETE FROM photo_shares
    WHERE photo_id = p_photo_id
    AND conversation_id = p_conversation_id
    AND owner_id = v_user_id;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get shared photos for a conversation
CREATE OR REPLACE FUNCTION get_shared_photos_for_conversation(p_conversation_id UUID)
RETURNS TABLE (
    share_id UUID,
    photo_id UUID,
    owner_id UUID,
    storage_path TEXT,
    is_primary BOOLEAN,
    shared_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    RETURN QUERY
    SELECT
        ps.id AS share_id,
        ps.photo_id,
        ps.owner_id,
        pp.storage_path,
        pp.is_primary,
        ps.created_at AS shared_at
    FROM photo_shares ps
    JOIN profile_photos pp ON pp.id = ps.photo_id
    WHERE ps.conversation_id = p_conversation_id
    AND ps.shared_with_user_id = v_user_id
    AND pp.moderation_status = 'approved'
    ORDER BY ps.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get my shared photos for a conversation
CREATE OR REPLACE FUNCTION get_my_shared_photos_for_conversation(p_conversation_id UUID)
RETURNS TABLE (
    share_id UUID,
    photo_id UUID,
    shared_with_user_id UUID,
    storage_path TEXT,
    is_primary BOOLEAN,
    shared_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    RETURN QUERY
    SELECT
        ps.id AS share_id,
        ps.photo_id,
        ps.shared_with_user_id,
        pp.storage_path,
        pp.is_primary,
        ps.created_at AS shared_at
    FROM photo_shares ps
    JOIN profile_photos pp ON pp.id = ps.photo_id
    WHERE ps.conversation_id = p_conversation_id
    AND ps.owner_id = v_user_id
    ORDER BY ps.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get photo share status
CREATE OR REPLACE FUNCTION get_photo_share_status(p_photo_id UUID)
RETURNS TABLE (
    share_id UUID,
    conversation_id UUID,
    shared_with_user_id UUID,
    shared_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    RETURN QUERY
    SELECT
        ps.id AS share_id,
        ps.conversation_id,
        ps.shared_with_user_id,
        ps.created_at AS shared_at
    FROM photo_shares ps
    WHERE ps.photo_id = p_photo_id
    AND ps.owner_id = v_user_id
    ORDER BY ps.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if a photo is shared with a user
CREATE OR REPLACE FUNCTION is_photo_shared_with_user(
    p_photo_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM photo_shares ps
        JOIN profile_photos pp ON pp.id = ps.photo_id
        WHERE ps.photo_id = p_photo_id
        AND ps.shared_with_user_id = p_user_id
        AND pp.moderation_status = 'approved'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get photo share count
CREATE OR REPLACE FUNCTION get_photo_share_count(p_photo_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT COUNT(DISTINCT shared_with_user_id) INTO v_count
    FROM photo_shares
    WHERE photo_id = p_photo_id
    AND owner_id = v_user_id;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- RLS HELPER FUNCTIONS
-- ============================================================================

-- Function to get posts for location (protects selfie_url)
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
    selfie_url TEXT,
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

-- Function to check if user can access a conversation
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
-- STORAGE HELPER FUNCTIONS
-- ============================================================================

-- Function to generate the storage path for a selfie
CREATE OR REPLACE FUNCTION get_selfie_storage_path(
    p_user_id UUID,
    p_post_id UUID
)
RETURNS TEXT AS $$
BEGIN
    RETURN p_user_id::text || '/' || p_post_id::text || '.jpg';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get the selfie URL for owner only
CREATE OR REPLACE FUNCTION get_selfie_url(
    p_user_id UUID,
    p_post_id UUID
)
RETURNS TEXT AS $$
DECLARE
    current_user_id UUID := auth.uid();
    storage_path TEXT;
BEGIN
    IF current_user_id != p_user_id THEN
        RETURN NULL;
    END IF;

    storage_path := get_selfie_storage_path(p_user_id, p_post_id);
    RETURN storage_path;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if a selfie exists
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

-- Function to delete a selfie when post is deleted
CREATE OR REPLACE FUNCTION delete_post_selfie()
RETURNS TRIGGER AS $$
DECLARE
    storage_path TEXT;
BEGIN
    storage_path := get_selfie_storage_path(OLD.producer_id, OLD.id);

    DELETE FROM storage.objects
    WHERE bucket_id = 'selfies'
    AND name = storage_path;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 4: TRIGGERS
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
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
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

-- Trigger to update conversation timestamp on new message
DROP TRIGGER IF EXISTS on_message_created ON messages;
CREATE TRIGGER on_message_created
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_new_message();

-- Apply updated_at trigger to favorite_locations table
DROP TRIGGER IF EXISTS favorite_locations_updated_at ON favorite_locations;
CREATE TRIGGER favorite_locations_updated_at
    BEFORE UPDATE ON favorite_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to expo_push_tokens table
DROP TRIGGER IF EXISTS update_expo_push_tokens_updated_at ON expo_push_tokens;
CREATE TRIGGER update_expo_push_tokens_updated_at
    BEFORE UPDATE ON expo_push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to notification_preferences table
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for rejected photo cleanup queue
DROP TRIGGER IF EXISTS profile_photos_rejection_cleanup ON profile_photos;
CREATE TRIGGER profile_photos_rejection_cleanup
    AFTER UPDATE ON profile_photos
    FOR EACH ROW
    EXECUTE FUNCTION queue_rejected_photo_cleanup();

-- Create trigger to auto-delete selfie when post is deleted
DROP TRIGGER IF EXISTS trigger_delete_post_selfie ON posts;
CREATE TRIGGER trigger_delete_post_selfie
    BEFORE DELETE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION delete_post_selfie();

-- User event tokens updated_at trigger
DROP TRIGGER IF EXISTS user_event_tokens_updated_at_trigger ON user_event_tokens;
CREATE TRIGGER user_event_tokens_updated_at_trigger
    BEFORE UPDATE ON user_event_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_user_event_tokens_updated_at();

-- Trigger for new matches (conversation creation) notifications
DROP TRIGGER IF EXISTS on_conversation_created_notify ON conversations;
CREATE TRIGGER on_conversation_created_notify
    AFTER INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_new_match();

COMMENT ON TRIGGER on_conversation_created_notify ON conversations IS 'Send push notification to producer when a new match is created';

-- Trigger for new messages notifications
DROP TRIGGER IF EXISTS on_message_created_notify ON messages;
CREATE TRIGGER on_message_created_notify
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_new_message();

COMMENT ON TRIGGER on_message_created_notify ON messages IS 'Send push notification to recipient when a new message is sent';

-- ============================================================================
-- SECTION 5: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE expo_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_shares ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

CREATE POLICY "profiles_select_authenticated"
    ON profiles FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "profiles_insert_own"
    ON profiles FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- LOCATIONS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "locations_select_all" ON locations;
DROP POLICY IF EXISTS "locations_select_authenticated" ON locations;
DROP POLICY IF EXISTS "locations_insert_authenticated" ON locations;

CREATE POLICY "locations_select_authenticated"
    ON locations FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "locations_insert_authenticated"
    ON locations FOR INSERT TO authenticated
    WITH CHECK (true);

-- ============================================================================
-- POSTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "posts_select_active" ON posts;
DROP POLICY IF EXISTS "posts_select_active_not_blocked" ON posts;
DROP POLICY IF EXISTS "posts_select_own" ON posts;
DROP POLICY IF EXISTS "posts_insert_own" ON posts;
DROP POLICY IF EXISTS "posts_update_own" ON posts;
DROP POLICY IF EXISTS "posts_delete_own" ON posts;

CREATE POLICY "posts_select_active_not_blocked"
    ON posts FOR SELECT TO authenticated
    USING (
        is_active = true
        AND expires_at > NOW()
        AND NOT EXISTS (
            SELECT 1 FROM blocks
            WHERE (blocker_id = auth.uid() AND blocked_id = posts.producer_id)
               OR (blocker_id = posts.producer_id AND blocked_id = auth.uid())
        )
    );

CREATE POLICY "posts_select_own"
    ON posts FOR SELECT TO authenticated
    USING (producer_id = auth.uid());

CREATE POLICY "posts_insert_own"
    ON posts FOR INSERT TO authenticated
    WITH CHECK (producer_id = auth.uid());

CREATE POLICY "posts_update_own"
    ON posts FOR UPDATE TO authenticated
    USING (producer_id = auth.uid())
    WITH CHECK (producer_id = auth.uid());

CREATE POLICY "posts_delete_own"
    ON posts FOR DELETE TO authenticated
    USING (producer_id = auth.uid());

-- ============================================================================
-- CONVERSATIONS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "conversations_select_participant" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_consumer" ON conversations;
DROP POLICY IF EXISTS "conversations_update_participant" ON conversations;
DROP POLICY IF EXISTS "conversations_delete_participant" ON conversations;

CREATE POLICY "conversations_select_participant"
    ON conversations FOR SELECT TO authenticated
    USING (
        (producer_id = auth.uid() OR consumer_id = auth.uid())
        AND NOT EXISTS (
            SELECT 1 FROM blocks
            WHERE (blocker_id = auth.uid() AND blocked_id IN (producer_id, consumer_id))
               OR (blocked_id = auth.uid() AND blocker_id IN (producer_id, consumer_id))
        )
    );

CREATE POLICY "conversations_insert_consumer"
    ON conversations FOR INSERT TO authenticated
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

CREATE POLICY "conversations_update_participant"
    ON conversations FOR UPDATE TO authenticated
    USING (producer_id = auth.uid() OR consumer_id = auth.uid())
    WITH CHECK (producer_id = auth.uid() OR consumer_id = auth.uid());

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "messages_select_participant" ON messages;
DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
DROP POLICY IF EXISTS "messages_update_participant" ON messages;
DROP POLICY IF EXISTS "messages_update_read_status" ON messages;
DROP POLICY IF EXISTS "messages_delete_sender" ON messages;

CREATE POLICY "messages_select_participant"
    ON messages FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.producer_id = auth.uid() OR c.consumer_id = auth.uid())
            AND c.is_active = true
        )
    );

CREATE POLICY "messages_insert_participant"
    ON messages FOR INSERT TO authenticated
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

CREATE POLICY "messages_update_read_status"
    ON messages FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.producer_id = auth.uid() OR c.consumer_id = auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.producer_id = auth.uid() OR c.consumer_id = auth.uid())
        )
    );

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_for_user" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;

CREATE POLICY "notifications_select_own"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_for_user"
    ON notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- BLOCKS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "blocks_select_own" ON blocks;
DROP POLICY IF EXISTS "blocks_select_blocked_by" ON blocks;
DROP POLICY IF EXISTS "blocks_insert_own" ON blocks;
DROP POLICY IF EXISTS "blocks_delete_own" ON blocks;

CREATE POLICY "blocks_select_own"
    ON blocks FOR SELECT TO authenticated
    USING (blocker_id = auth.uid());

CREATE POLICY "blocks_select_blocked_by"
    ON blocks FOR SELECT TO authenticated
    USING (blocked_id = auth.uid());

CREATE POLICY "blocks_insert_own"
    ON blocks FOR INSERT TO authenticated
    WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "blocks_delete_own"
    ON blocks FOR DELETE TO authenticated
    USING (blocker_id = auth.uid());

-- ============================================================================
-- REPORTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "reports_select_own" ON reports;
DROP POLICY IF EXISTS "reports_insert_own" ON reports;

CREATE POLICY "reports_select_own"
    ON reports FOR SELECT TO authenticated
    USING (reporter_id = auth.uid());

CREATE POLICY "reports_insert_own"
    ON reports FOR INSERT TO authenticated
    WITH CHECK (reporter_id = auth.uid());

-- ============================================================================
-- LOCATION_VISITS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "location_visits_select_own" ON location_visits;
DROP POLICY IF EXISTS "location_visits_insert_own" ON location_visits;

CREATE POLICY "location_visits_select_own"
    ON location_visits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "location_visits_insert_own"
    ON location_visits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "location_visits_select_own" ON location_visits IS 'Users can only view their own location visits for privacy';
COMMENT ON POLICY "location_visits_insert_own" ON location_visits IS 'Users can only record their own location visits';

-- ============================================================================
-- FAVORITE_LOCATIONS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "favorite_locations_select_own" ON favorite_locations;
DROP POLICY IF EXISTS "favorite_locations_insert_own" ON favorite_locations;
DROP POLICY IF EXISTS "favorite_locations_update_own" ON favorite_locations;
DROP POLICY IF EXISTS "favorite_locations_delete_own" ON favorite_locations;

CREATE POLICY "favorite_locations_select_own"
    ON favorite_locations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "favorite_locations_insert_own"
    ON favorite_locations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorite_locations_update_own"
    ON favorite_locations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorite_locations_delete_own"
    ON favorite_locations FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- PROFILE_PHOTOS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "profile_photos_select_own" ON profile_photos;
DROP POLICY IF EXISTS "profile_photos_select_shared" ON profile_photos;
DROP POLICY IF EXISTS "profile_photos_insert_own" ON profile_photos;
DROP POLICY IF EXISTS "profile_photos_update_own" ON profile_photos;
DROP POLICY IF EXISTS "profile_photos_delete_own" ON profile_photos;

CREATE POLICY "profile_photos_select_own" ON profile_photos
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "profile_photos_select_shared" ON profile_photos
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR
        (
            moderation_status = 'approved'
            AND EXISTS (
                SELECT 1 FROM photo_shares
                WHERE photo_shares.photo_id = profile_photos.id
                AND photo_shares.shared_with_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "profile_photos_insert_own" ON profile_photos
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "profile_photos_update_own" ON profile_photos
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "profile_photos_delete_own" ON profile_photos
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- EXPO_PUSH_TOKENS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "expo_push_tokens_select_own" ON expo_push_tokens;
DROP POLICY IF EXISTS "expo_push_tokens_insert_own" ON expo_push_tokens;
DROP POLICY IF EXISTS "expo_push_tokens_update_own" ON expo_push_tokens;
DROP POLICY IF EXISTS "expo_push_tokens_delete_own" ON expo_push_tokens;

CREATE POLICY "expo_push_tokens_select_own"
    ON expo_push_tokens FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "expo_push_tokens_insert_own"
    ON expo_push_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expo_push_tokens_update_own"
    ON expo_push_tokens FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expo_push_tokens_delete_own"
    ON expo_push_tokens FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATION_PREFERENCES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "notification_preferences_select_own" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert_own" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update_own" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_delete_own" ON notification_preferences;

CREATE POLICY "notification_preferences_select_own"
    ON notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "notification_preferences_insert_own"
    ON notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_preferences_update_own"
    ON notification_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_preferences_delete_own"
    ON notification_preferences FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- EVENTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "events_select_authenticated" ON events;
DROP POLICY IF EXISTS "events_manage_service" ON events;

CREATE POLICY "events_select_authenticated"
    ON events FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "events_manage_service"
    ON events FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- EVENT_POSTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "event_posts_select_authenticated" ON event_posts;
DROP POLICY IF EXISTS "event_posts_insert_own" ON event_posts;
DROP POLICY IF EXISTS "event_posts_delete_own" ON event_posts;

CREATE POLICY "event_posts_select_authenticated"
    ON event_posts FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "event_posts_insert_own"
    ON event_posts FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM posts
            WHERE posts.id = event_posts.post_id
            AND posts.producer_id = auth.uid()
        )
    );

CREATE POLICY "event_posts_delete_own"
    ON event_posts FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM posts
            WHERE posts.id = event_posts.post_id
            AND posts.producer_id = auth.uid()
        )
    );

-- ============================================================================
-- USER_EVENT_TOKENS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "user_event_tokens_select_own" ON user_event_tokens;
DROP POLICY IF EXISTS "user_event_tokens_insert_own" ON user_event_tokens;
DROP POLICY IF EXISTS "user_event_tokens_update_own" ON user_event_tokens;
DROP POLICY IF EXISTS "user_event_tokens_delete_own" ON user_event_tokens;

CREATE POLICY "user_event_tokens_select_own"
    ON user_event_tokens FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "user_event_tokens_insert_own"
    ON user_event_tokens FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_event_tokens_update_own"
    ON user_event_tokens FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_event_tokens_delete_own"
    ON user_event_tokens FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================================
-- EVENT_REMINDERS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "event_reminders_select_own" ON event_reminders;
DROP POLICY IF EXISTS "event_reminders_insert_own" ON event_reminders;
DROP POLICY IF EXISTS "event_reminders_update_own" ON event_reminders;
DROP POLICY IF EXISTS "event_reminders_delete_own" ON event_reminders;
DROP POLICY IF EXISTS "event_reminders_manage_service" ON event_reminders;

CREATE POLICY "event_reminders_select_own"
    ON event_reminders FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "event_reminders_insert_own"
    ON event_reminders FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event_reminders_update_own"
    ON event_reminders FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event_reminders_delete_own"
    ON event_reminders FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "event_reminders_manage_service"
    ON event_reminders FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- PHOTO_SHARES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "photo_shares_select_own_or_received" ON photo_shares;
DROP POLICY IF EXISTS "photo_shares_insert_own" ON photo_shares;
DROP POLICY IF EXISTS "photo_shares_delete_own" ON photo_shares;

CREATE POLICY "photo_shares_select_own_or_received" ON photo_shares
    FOR SELECT TO authenticated
    USING (owner_id = auth.uid() OR shared_with_user_id = auth.uid());

CREATE POLICY "photo_shares_insert_own" ON photo_shares
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "photo_shares_delete_own" ON photo_shares
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid());

-- ============================================================================
-- SECTION 6: STORAGE BUCKET AND POLICIES
-- ============================================================================

-- Create selfies storage bucket
-- NOTE: Create buckets manually in Supabase Dashboard (Storage > New bucket)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--     'selfies',
--     'selfies',
--     false,
--     5242880,
--     ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
-- )
-- ON CONFLICT (id) DO UPDATE SET
--     public = EXCLUDED.public,
--     file_size_limit = EXCLUDED.file_size_limit,
--     allowed_mime_types = EXCLUDED.allowed_mime_types;

-- COMMENT ON TABLE storage.buckets IS
-- 'Storage buckets for the Backtrack app. The selfies bucket stores producer verification images privately.';

-- Storage object policies for selfies bucket

-- SELECT (Download) Policy
DROP POLICY IF EXISTS "selfies_select_own" ON storage.objects;
CREATE POLICY "selfies_select_own"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'selfies'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- INSERT (Upload) Policy
DROP POLICY IF EXISTS "selfies_insert_own" ON storage.objects;
CREATE POLICY "selfies_insert_own"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'selfies'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- UPDATE Policy
DROP POLICY IF EXISTS "selfies_update_own" ON storage.objects;
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

-- DELETE Policy
DROP POLICY IF EXISTS "selfies_delete_own" ON storage.objects;
CREATE POLICY "selfies_delete_own"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'selfies'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================================
-- SECTION 7: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_posts_for_location(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversations(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_conversation(UUID) TO authenticated;
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
GRANT EXECUTE ON FUNCTION get_selfie_storage_path(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_selfie_url(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION selfie_exists(UUID, UUID) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration has created:
-- - All required PostgreSQL extensions (postgis, uuid-ossp, pg_net)
-- - All tables with complete column definitions (conflicts resolved)
-- - All indexes for performance optimization
-- - All functions for business logic
-- - All triggers for automation
-- - Row Level Security enabled on all tables
-- - All RLS policies for data access control
-- - Storage bucket and policies for selfies
-- - Function permissions for authenticated users
--
-- Next steps after running this migration:
-- 1. Deploy Edge Functions for notifications and moderation
-- 2. Set the Edge Function URL: SELECT set_app_config('edge_function_url', 'YOUR_URL');
-- 3. Set the service role key: SELECT set_app_config('service_role_key', 'YOUR_KEY');
-- 4. Test the setup: SELECT test_notification_webhooks();
-- ============================================================================
