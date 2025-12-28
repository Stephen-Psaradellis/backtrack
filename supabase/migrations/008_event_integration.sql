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
