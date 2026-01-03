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
CREATE POLICY "profile_photos_select_own" ON profile_photos
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can only insert their own photos
CREATE POLICY "profile_photos_insert_own" ON profile_photos
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can only update their own photos (e.g., set as primary)
CREATE POLICY "profile_photos_update_own" ON profile_photos
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can only delete their own photos
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
-- ============================================================================
-- Backtrack Push Tokens Schema Migration
-- ============================================================================
-- This migration creates the expo_push_tokens table for storing Expo push
-- notification tokens for users. Tokens are used by Edge Functions to send
-- push notifications when matches or messages occur.
-- ============================================================================

-- ============================================================================
-- EXPO_PUSH_TOKENS TABLE
-- ============================================================================
-- Stores Expo push notification tokens for authenticated users
-- Each user can have multiple tokens (multiple devices)
-- Tokens are registered when users grant notification permissions

CREATE TABLE IF NOT EXISTS expo_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL UNIQUE,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment on expo_push_tokens table and columns
COMMENT ON TABLE expo_push_tokens IS 'Expo push notification tokens for sending notifications to user devices';
COMMENT ON COLUMN expo_push_tokens.id IS 'Unique identifier for the token record';
COMMENT ON COLUMN expo_push_tokens.user_id IS 'User who owns this push token';
COMMENT ON COLUMN expo_push_tokens.token IS 'Expo push token string (e.g., ExponentPushToken[xxx])';
COMMENT ON COLUMN expo_push_tokens.device_info IS 'Optional JSONB containing device information (platform, model, etc.)';
COMMENT ON COLUMN expo_push_tokens.created_at IS 'Timestamp when the token was first registered';
COMMENT ON COLUMN expo_push_tokens.updated_at IS 'Timestamp when the token was last updated';

-- Create indexes for push token queries
CREATE INDEX IF NOT EXISTS idx_expo_push_tokens_user_id ON expo_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_expo_push_tokens_token ON expo_push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_expo_push_tokens_created_at ON expo_push_tokens(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Apply updated_at trigger to expo_push_tokens table
-- (reuses update_updated_at_column() from 001_initial_schema.sql)
DROP TRIGGER IF EXISTS update_expo_push_tokens_updated_at ON expo_push_tokens;
CREATE TRIGGER update_expo_push_tokens_updated_at
    BEFORE UPDATE ON expo_push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE expo_push_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- EXPO_PUSH_TOKENS POLICIES
-- ============================================================================
-- Users can only see and modify their own push tokens
-- Service role can read all tokens (for sending notifications via Edge Functions)
-- Service role can delete invalid tokens (when Expo API returns 400/404)

-- Allow users to view their own tokens
CREATE POLICY "expo_push_tokens_select_own"
  ON expo_push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own tokens
CREATE POLICY "expo_push_tokens_insert_own"
  ON expo_push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own tokens
CREATE POLICY "expo_push_tokens_update_own"
  ON expo_push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own tokens
CREATE POLICY "expo_push_tokens_delete_own"
  ON expo_push_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS ON POLICIES
-- ============================================================================

COMMENT ON POLICY "expo_push_tokens_select_own" ON expo_push_tokens IS 'Users can only view their own push tokens';
COMMENT ON POLICY "expo_push_tokens_insert_own" ON expo_push_tokens IS 'Users can only register push tokens for themselves';
COMMENT ON POLICY "expo_push_tokens_update_own" ON expo_push_tokens IS 'Users can only update their own push tokens';
COMMENT ON POLICY "expo_push_tokens_delete_own" ON expo_push_tokens IS 'Users can only delete their own push tokens';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to upsert a push token (register or update existing)
-- This handles the common case where a user re-registers their token
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

-- Function to get all push tokens for a user (used by Edge Functions)
CREATE OR REPLACE FUNCTION get_user_push_tokens(p_user_id UUID)
RETURNS TABLE (token TEXT, device_info JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT ept.token, ept.device_info
    FROM expo_push_tokens ept
    WHERE ept.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_push_tokens(UUID) IS 'Get all push tokens for a user (for sending notifications)';

-- Function to remove invalid push tokens (called when Expo API returns 400/404)
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
-- SETUP NOTES
-- ============================================================================
-- After running this migration:
-- 1. Edge Functions can use service_role key to read all tokens
-- 2. Frontend uses authenticated user context to manage own tokens
-- 3. Call upsert_push_token() to register tokens (handles duplicates)
-- 4. Call remove_invalid_push_token() when Expo API returns 400/404
-- ============================================================================
-- ============================================================================
-- Event Integration Schema Migration
-- ============================================================================
-- This migration creates the tables for event-based missed connections:
-- - events: External events synced from Eventbrite/Meetup APIs
-- - event_posts: Links posts to specific events (many-to-many)
-- - user_event_tokens: OAuth tokens for external event platforms
-- - event_reminders: Scheduled post-event reminder notifications
--
-- Key features:
-- - Events sourced from external APIs (Eventbrite, Meetup)
-- - Posts can be tagged to specific events
-- - OAuth tokens stored securely for API access
-- - Reminders scheduled for 24 hours after events end
-- ============================================================================

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
-- Stores events synced from external platforms (Eventbrite, Meetup)
-- Each event is uniquely identified by external_id + platform combination

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

-- Comment on events table and columns
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

-- ============================================================================
-- EVENTS INDEXES
-- ============================================================================

-- Index for date-based queries (upcoming events)
CREATE INDEX IF NOT EXISTS idx_events_date_time ON events(date_time);

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_events_location ON events(latitude, longitude);

-- PostGIS geospatial index for proximity queries
CREATE INDEX IF NOT EXISTS idx_events_geo ON events USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index for platform filtering
CREATE INDEX IF NOT EXISTS idx_events_platform ON events(platform);

-- Index for external ID lookups
CREATE INDEX IF NOT EXISTS idx_events_external_id ON events(external_id, platform);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category) WHERE category IS NOT NULL;

-- Index for sync operations
CREATE INDEX IF NOT EXISTS idx_events_synced_at ON events(synced_at DESC);

-- Composite index for common query pattern: upcoming events sorted by date
CREATE INDEX IF NOT EXISTS idx_events_upcoming ON events(date_time ASC)
    WHERE date_time > NOW();

-- ============================================================================
-- EVENT_POSTS TABLE
-- ============================================================================
-- Junction table linking posts to events (many-to-many relationship)
-- A post can be associated with one event, events can have many posts

CREATE TABLE IF NOT EXISTS event_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Prevent duplicate event-post associations
    CONSTRAINT event_posts_unique UNIQUE(event_id, post_id)
);

-- Comment on event_posts table and columns
COMMENT ON TABLE event_posts IS 'Links posts to events for event-specific missed connections';
COMMENT ON COLUMN event_posts.id IS 'Unique identifier for the event-post link';
COMMENT ON COLUMN event_posts.event_id IS 'Reference to the event';
COMMENT ON COLUMN event_posts.post_id IS 'Reference to the post';
COMMENT ON COLUMN event_posts.created_at IS 'Timestamp when the link was created';

-- ============================================================================
-- EVENT_POSTS INDEXES
-- ============================================================================

-- Index for querying posts by event
CREATE INDEX IF NOT EXISTS idx_event_posts_event_id ON event_posts(event_id);

-- Index for querying events by post
CREATE INDEX IF NOT EXISTS idx_event_posts_post_id ON event_posts(post_id);

-- Composite index for event posts sorted by creation time
CREATE INDEX IF NOT EXISTS idx_event_posts_event_created ON event_posts(event_id, created_at DESC);

-- ============================================================================
-- USER_EVENT_TOKENS TABLE
-- ============================================================================
-- Stores OAuth tokens for external event platform APIs (Eventbrite, Meetup)
-- Tokens are encrypted at rest by Supabase

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

-- Comment on user_event_tokens table and columns
COMMENT ON TABLE user_event_tokens IS 'OAuth tokens for external event platform APIs (Eventbrite, Meetup)';
COMMENT ON COLUMN user_event_tokens.id IS 'Unique identifier for the token record';
COMMENT ON COLUMN user_event_tokens.user_id IS 'User who authorized the token';
COMMENT ON COLUMN user_event_tokens.provider IS 'OAuth provider: eventbrite or meetup';
COMMENT ON COLUMN user_event_tokens.access_token IS 'OAuth access token for API calls';
COMMENT ON COLUMN user_event_tokens.refresh_token IS 'OAuth refresh token for obtaining new access tokens';
COMMENT ON COLUMN user_event_tokens.expires_at IS 'Timestamp when the access token expires';
COMMENT ON COLUMN user_event_tokens.scope IS 'OAuth scopes granted to this token';
COMMENT ON COLUMN user_event_tokens.created_at IS 'Timestamp when the token was first stored';
COMMENT ON COLUMN user_event_tokens.updated_at IS 'Timestamp when the token was last updated/refreshed';

-- ============================================================================
-- USER_EVENT_TOKENS INDEXES
-- ============================================================================

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_event_tokens_user_id ON user_event_tokens(user_id);

-- Index for provider lookups
CREATE INDEX IF NOT EXISTS idx_user_event_tokens_provider ON user_event_tokens(provider);

-- Index for expired token cleanup
CREATE INDEX IF NOT EXISTS idx_user_event_tokens_expires_at ON user_event_tokens(expires_at)
    WHERE expires_at IS NOT NULL;

-- ============================================================================
-- EVENT_REMINDERS TABLE
-- ============================================================================
-- Scheduled notifications to remind users to check for missed connections
-- after events they've attended or shown interest in

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

-- Comment on event_reminders table and columns
COMMENT ON TABLE event_reminders IS 'Scheduled post-event reminder notifications for missed connections';
COMMENT ON COLUMN event_reminders.id IS 'Unique identifier for the reminder';
COMMENT ON COLUMN event_reminders.user_id IS 'User to receive the reminder';
COMMENT ON COLUMN event_reminders.event_id IS 'Event the reminder is about';
COMMENT ON COLUMN event_reminders.reminder_type IS 'Type of reminder: post_event_check, event_starting, or new_post';
COMMENT ON COLUMN event_reminders.scheduled_for IS 'Timestamp when the reminder should be sent';
COMMENT ON COLUMN event_reminders.sent IS 'Whether the reminder has been sent';
COMMENT ON COLUMN event_reminders.sent_at IS 'Timestamp when the reminder was actually sent';
COMMENT ON COLUMN event_reminders.created_at IS 'Timestamp when the reminder was scheduled';

-- ============================================================================
-- EVENT_REMINDERS INDEXES
-- ============================================================================

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_event_reminders_user_id ON event_reminders(user_id);

-- Index for event lookups
CREATE INDEX IF NOT EXISTS idx_event_reminders_event_id ON event_reminders(event_id);

-- Partial index for efficient unsent reminder queries (main job queue pattern)
CREATE INDEX IF NOT EXISTS idx_event_reminders_pending ON event_reminders(scheduled_for ASC)
    WHERE sent = FALSE;

-- Index for cleanup of sent reminders
CREATE INDEX IF NOT EXISTS idx_event_reminders_sent ON event_reminders(sent_at DESC)
    WHERE sent = TRUE;

-- ============================================================================
-- ROW LEVEL SECURITY - EVENTS TABLE
-- ============================================================================
-- Events are publicly readable but only system can insert/update
-- (events are synced from external APIs, not user-created)

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view events
CREATE POLICY "events_select_authenticated"
    ON events
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow service role to manage events (for API sync)
CREATE POLICY "events_manage_service"
    ON events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON POLICY "events_select_authenticated" ON events IS 'All authenticated users can view events';
COMMENT ON POLICY "events_manage_service" ON events IS 'Service role can manage events for API sync';

-- ============================================================================
-- ROW LEVEL SECURITY - EVENT_POSTS TABLE
-- ============================================================================
-- Event posts follow same visibility as regular posts

ALTER TABLE event_posts ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view event-post links
CREATE POLICY "event_posts_select_authenticated"
    ON event_posts
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow users to create event-post links for their own posts
CREATE POLICY "event_posts_insert_own"
    ON event_posts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM posts
            WHERE posts.id = event_posts.post_id
            AND posts.producer_id = auth.uid()
        )
    );

-- Allow users to delete event-post links for their own posts
CREATE POLICY "event_posts_delete_own"
    ON event_posts
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM posts
            WHERE posts.id = event_posts.post_id
            AND posts.producer_id = auth.uid()
        )
    );

COMMENT ON POLICY "event_posts_select_authenticated" ON event_posts IS 'All authenticated users can view event-post associations';
COMMENT ON POLICY "event_posts_insert_own" ON event_posts IS 'Users can link their own posts to events';
COMMENT ON POLICY "event_posts_delete_own" ON event_posts IS 'Users can unlink their own posts from events';

-- ============================================================================
-- ROW LEVEL SECURITY - USER_EVENT_TOKENS TABLE
-- ============================================================================
-- Tokens are private - users can only see and manage their own

ALTER TABLE user_event_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own tokens
CREATE POLICY "user_event_tokens_select_own"
    ON user_event_tokens
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Allow users to insert only their own tokens
CREATE POLICY "user_event_tokens_insert_own"
    ON user_event_tokens
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update only their own tokens
CREATE POLICY "user_event_tokens_update_own"
    ON user_event_tokens
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete only their own tokens
CREATE POLICY "user_event_tokens_delete_own"
    ON user_event_tokens
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

COMMENT ON POLICY "user_event_tokens_select_own" ON user_event_tokens IS 'Users can only view their own OAuth tokens';
COMMENT ON POLICY "user_event_tokens_insert_own" ON user_event_tokens IS 'Users can only create their own OAuth tokens';
COMMENT ON POLICY "user_event_tokens_update_own" ON user_event_tokens IS 'Users can only update their own OAuth tokens';
COMMENT ON POLICY "user_event_tokens_delete_own" ON user_event_tokens IS 'Users can only delete their own OAuth tokens';

-- ============================================================================
-- ROW LEVEL SECURITY - EVENT_REMINDERS TABLE
-- ============================================================================
-- Reminders are private - users can only see and manage their own

ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own reminders
CREATE POLICY "event_reminders_select_own"
    ON event_reminders
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Allow users to insert only their own reminders
CREATE POLICY "event_reminders_insert_own"
    ON event_reminders
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update only their own reminders
CREATE POLICY "event_reminders_update_own"
    ON event_reminders
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete only their own reminders
CREATE POLICY "event_reminders_delete_own"
    ON event_reminders
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Allow service role to manage all reminders (for sending notifications)
CREATE POLICY "event_reminders_manage_service"
    ON event_reminders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON POLICY "event_reminders_select_own" ON event_reminders IS 'Users can only view their own reminders';
COMMENT ON POLICY "event_reminders_insert_own" ON event_reminders IS 'Users can only create their own reminders';
COMMENT ON POLICY "event_reminders_update_own" ON event_reminders IS 'Users can only update their own reminders';
COMMENT ON POLICY "event_reminders_delete_own" ON event_reminders IS 'Users can only delete their own reminders';
COMMENT ON POLICY "event_reminders_manage_service" ON event_reminders IS 'Service role can manage all reminders for notification sending';

-- ============================================================================
-- HELPER FUNCTION: GET_EVENT_POST_COUNT
-- ============================================================================
-- Returns the count of posts associated with an event

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

-- ============================================================================
-- HELPER FUNCTION: GET_UPCOMING_EVENTS
-- ============================================================================
-- Returns upcoming events within a specified radius of coordinates
-- Uses PostGIS for accurate distance calculations

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
            p_radius_km * 1000  -- Convert km to meters
        )
    ORDER BY e.date_time ASC
    LIMIT p_limit;
$$;

COMMENT ON FUNCTION get_upcoming_events(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) IS
    'Returns upcoming events within a specified radius, sorted by date. Uses PostGIS for accurate distance calculations.';

-- ============================================================================
-- HELPER FUNCTION: SCHEDULE_POST_EVENT_REMINDER
-- ============================================================================
-- Schedules a reminder for 24 hours after an event ends

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
    -- Get the event details
    SELECT * INTO v_event
    FROM events
    WHERE id = p_event_id;

    IF v_event IS NULL THEN
        RETURN NULL;
    END IF;

    -- Schedule reminder for 24 hours after event ends (or starts if no end time)
    v_scheduled_time := COALESCE(v_event.end_time, v_event.date_time) + INTERVAL '24 hours';

    -- Insert the reminder (will fail silently if duplicate due to unique constraint)
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
    'Schedules a post-event reminder for 24 hours after an event ends. Returns the reminder or NULL if already scheduled.';

-- ============================================================================
-- TRIGGER: UPDATE_USER_EVENT_TOKENS_UPDATED_AT
-- ============================================================================
-- Automatically updates updated_at timestamp when token is modified

CREATE OR REPLACE FUNCTION update_user_event_tokens_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER user_event_tokens_updated_at_trigger
    BEFORE UPDATE ON user_event_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_user_event_tokens_updated_at();

COMMENT ON FUNCTION update_user_event_tokens_updated_at() IS 'Updates the updated_at timestamp when a token record is modified';
COMMENT ON TRIGGER user_event_tokens_updated_at_trigger ON user_event_tokens IS 'Automatically updates updated_at on token modification';
-- ============================================================================
-- Backtrack Notification Preferences Schema Migration
-- ============================================================================
-- This migration creates the notification_preferences table for storing user
-- notification settings. Users can enable/disable different notification types
-- (matches, messages) through the app settings UI.
-- ============================================================================

-- ============================================================================
-- NOTIFICATION_PREFERENCES TABLE
-- ============================================================================
-- Stores user notification preferences for push notifications
-- Each user has one preferences record (created automatically or on first update)
-- Preferences persist across app restarts

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    match_notifications BOOLEAN DEFAULT true NOT NULL,
    message_notifications BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment on notification_preferences table and columns
COMMENT ON TABLE notification_preferences IS 'User preferences for push notification delivery';
COMMENT ON COLUMN notification_preferences.id IS 'Unique identifier for the preferences record';
COMMENT ON COLUMN notification_preferences.user_id IS 'User who owns these preferences (one record per user)';
COMMENT ON COLUMN notification_preferences.match_notifications IS 'Whether to send push notifications for new matches';
COMMENT ON COLUMN notification_preferences.message_notifications IS 'Whether to send push notifications for new messages';
COMMENT ON COLUMN notification_preferences.created_at IS 'Timestamp when the preferences were first created';
COMMENT ON COLUMN notification_preferences.updated_at IS 'Timestamp when the preferences were last updated';

-- Create indexes for notification preferences queries
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_created_at ON notification_preferences(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Apply updated_at trigger to notification_preferences table
-- (reuses update_updated_at_column() from 001_initial_schema.sql)
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NOTIFICATION_PREFERENCES POLICIES
-- ============================================================================
-- Users can only see and modify their own notification preferences
-- Service role can read all preferences (for Edge Functions to check before sending)

-- Allow users to view their own preferences
CREATE POLICY "notification_preferences_select_own"
  ON notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own preferences
CREATE POLICY "notification_preferences_insert_own"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own preferences
CREATE POLICY "notification_preferences_update_own"
  ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own preferences
CREATE POLICY "notification_preferences_delete_own"
  ON notification_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS ON POLICIES
-- ============================================================================

COMMENT ON POLICY "notification_preferences_select_own" ON notification_preferences IS 'Users can only view their own notification preferences';
COMMENT ON POLICY "notification_preferences_insert_own" ON notification_preferences IS 'Users can only create notification preferences for themselves';
COMMENT ON POLICY "notification_preferences_update_own" ON notification_preferences IS 'Users can only update their own notification preferences';
COMMENT ON POLICY "notification_preferences_delete_own" ON notification_preferences IS 'Users can only delete their own notification preferences';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to upsert notification preferences (create or update)
-- This handles the common case where preferences may or may not exist yet
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
-- Returns default values (true, true) if no preferences record exists
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

    -- If no row found, return defaults
    IF NOT FOUND THEN
        RETURN QUERY SELECT true AS match_notifications, true AS message_notifications;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_notification_preferences(UUID) IS 'Get notification preferences for a user (returns defaults if not set)';

-- Function to check if a specific notification type is enabled for a user
-- Used by Edge Functions before sending notifications
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

    -- If no preferences found, default to enabled
    IF NOT FOUND THEN
        RETURN true;
    END IF;

    RETURN is_enabled;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_notification_enabled(UUID, TEXT) IS 'Check if a specific notification type is enabled for a user';

-- ============================================================================
-- SETUP NOTES
-- ============================================================================
-- After running this migration:
-- 1. Frontend can use upsert_notification_preferences() to save settings
-- 2. Frontend can use get_notification_preferences() to retrieve settings
-- 3. Edge Functions use is_notification_enabled() before sending notifications
-- 4. Default behavior is to enable all notifications if no preferences exist
-- ============================================================================
