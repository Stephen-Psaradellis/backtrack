-- ============================================================================
-- Event Attendance Schema Migration
-- ============================================================================
-- This migration adds attendance tracking for events, allowing users to
-- indicate interest or confirm they're going to events.
--
-- Key features:
-- - Track user attendance status (interested, going, went, skipped)
-- - Event attendees view for showing who's going
-- - Event stats aggregation
-- - Auto-create reminder when marking "going"
-- ============================================================================

-- ============================================================================
-- EXTEND EVENTS TABLE
-- ============================================================================
-- Add featured flag for promoted events

ALTER TABLE events ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

COMMENT ON COLUMN events.is_featured IS 'Whether this event is featured/promoted';

-- ============================================================================
-- EVENT_ATTENDANCE TABLE
-- ============================================================================
-- Tracks user attendance status for events

CREATE TABLE IF NOT EXISTS event_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'going'
        CHECK (status IN ('interested', 'going', 'went', 'skipped')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Comments
COMMENT ON TABLE event_attendance IS 'Tracks user attendance status for events';
COMMENT ON COLUMN event_attendance.status IS 'Attendance status: interested, going, went, or skipped';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for querying attendees of an event
CREATE INDEX IF NOT EXISTS idx_event_attendance_event_id
    ON event_attendance(event_id);

-- Index for querying a user's events
CREATE INDEX IF NOT EXISTS idx_event_attendance_user_id
    ON event_attendance(user_id);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_event_attendance_status
    ON event_attendance(status);

-- Composite index for event + status queries (who's going to this event)
CREATE INDEX IF NOT EXISTS idx_event_attendance_event_status
    ON event_attendance(event_id, status)
    WHERE status IN ('interested', 'going');

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;

-- Users can view all attendance (for seeing who's going)
DROP POLICY IF EXISTS "event_attendance_select_all" ON event_attendance;
CREATE POLICY "event_attendance_select_all"
    ON event_attendance
    FOR SELECT
    USING (true);

-- Users can only insert their own attendance
DROP POLICY IF EXISTS "event_attendance_insert_own" ON event_attendance;
CREATE POLICY "event_attendance_insert_own"
    ON event_attendance
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own attendance
DROP POLICY IF EXISTS "event_attendance_update_own" ON event_attendance;
CREATE POLICY "event_attendance_update_own"
    ON event_attendance
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can only delete their own attendance
DROP POLICY IF EXISTS "event_attendance_delete_own" ON event_attendance;
CREATE POLICY "event_attendance_delete_own"
    ON event_attendance
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- VIEW: Event Attendees
-- ============================================================================
-- Provides easy access to event attendees with profile info

CREATE OR REPLACE VIEW event_attendees AS
SELECT
    ea.id,
    ea.event_id,
    ea.user_id,
    ea.status,
    ea.created_at,
    p.display_name,
    p.own_avatar,
    p.is_verified
FROM event_attendance ea
JOIN profiles p ON p.id = ea.user_id
WHERE ea.status IN ('going', 'interested');

COMMENT ON VIEW event_attendees IS
    'View of event attendees with profile info for display';

-- ============================================================================
-- VIEW: Event Stats
-- ============================================================================
-- Aggregates attendance and post counts per event

CREATE OR REPLACE VIEW event_stats AS
SELECT
    e.id AS event_id,
    COUNT(DISTINCT ep.post_id) AS post_count,
    COUNT(DISTINCT CASE WHEN ea.status = 'going' THEN ea.user_id END) AS going_count,
    COUNT(DISTINCT CASE WHEN ea.status = 'interested' THEN ea.user_id END) AS interested_count
FROM events e
LEFT JOIN event_posts ep ON ep.event_id = e.id
LEFT JOIN event_attendance ea ON ea.event_id = e.id
GROUP BY e.id;

COMMENT ON VIEW event_stats IS
    'Aggregated stats per event: post count, going count, interested count';

-- ============================================================================
-- FUNCTION: Set Event Attendance
-- ============================================================================
-- Upserts attendance record for a user/event

CREATE OR REPLACE FUNCTION set_event_attendance(
    p_user_id UUID,
    p_event_id UUID,
    p_status VARCHAR(20)
)
RETURNS event_attendance
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result event_attendance%ROWTYPE;
BEGIN
    -- Validate status
    IF p_status NOT IN ('interested', 'going', 'went', 'skipped') THEN
        RAISE EXCEPTION 'Invalid status: %', p_status;
    END IF;

    -- Upsert attendance record
    INSERT INTO event_attendance (user_id, event_id, status)
    VALUES (p_user_id, p_event_id, p_status)
    ON CONFLICT (user_id, event_id)
    DO UPDATE SET
        status = p_status,
        updated_at = NOW()
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION set_event_attendance(UUID, UUID, VARCHAR) IS
    'Sets or updates a user''s attendance status for an event';

-- ============================================================================
-- FUNCTION: Remove Event Attendance
-- ============================================================================
-- Removes attendance record for a user/event

CREATE OR REPLACE FUNCTION remove_event_attendance(
    p_user_id UUID,
    p_event_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted BOOLEAN;
BEGIN
    DELETE FROM event_attendance
    WHERE user_id = p_user_id AND event_id = p_event_id;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN v_deleted > 0;
END;
$$;

COMMENT ON FUNCTION remove_event_attendance(UUID, UUID) IS
    'Removes a user''s attendance record for an event';

-- ============================================================================
-- FUNCTION: Get User Events
-- ============================================================================
-- Returns events the user is attending with stats

CREATE OR REPLACE FUNCTION get_user_events(
    p_user_id UUID,
    p_status VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE (
    event_id UUID,
    title TEXT,
    date_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    venue_name TEXT,
    venue_address TEXT,
    image_url TEXT,
    user_status VARCHAR(20),
    going_count BIGINT,
    interested_count BIGINT,
    post_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.title,
        e.date_time,
        e.end_time,
        e.venue_name,
        e.venue_address,
        e.image_url,
        ea.status AS user_status,
        COALESCE(es.going_count, 0),
        COALESCE(es.interested_count, 0),
        COALESCE(es.post_count, 0)
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    LEFT JOIN event_stats es ON es.event_id = e.id
    WHERE ea.user_id = p_user_id
      AND (p_status IS NULL OR ea.status = p_status)
    ORDER BY e.date_time ASC;
END;
$$;

COMMENT ON FUNCTION get_user_events(UUID, VARCHAR) IS
    'Returns events a user is attending, optionally filtered by status';

-- ============================================================================
-- FUNCTION: Get Event Attendees
-- ============================================================================
-- Returns attendees for an event with profile info

CREATE OR REPLACE FUNCTION get_event_attendees(
    p_event_id UUID,
    p_status VARCHAR(20) DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    own_avatar JSONB,
    is_verified BOOLEAN,
    status VARCHAR(20),
    attended_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ea.user_id,
        p.display_name,
        p.own_avatar,
        p.is_verified,
        ea.status,
        ea.created_at AS attended_at
    FROM event_attendance ea
    JOIN profiles p ON p.id = ea.user_id
    WHERE ea.event_id = p_event_id
      AND (p_status IS NULL OR ea.status = p_status)
    ORDER BY ea.created_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_event_attendees(UUID, VARCHAR, INTEGER) IS
    'Returns attendees for an event with profile info';

-- ============================================================================
-- FUNCTION: Get Event With Stats
-- ============================================================================
-- Returns a single event with stats and user's attendance status

CREATE OR REPLACE FUNCTION get_event_with_stats(
    p_event_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
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
    is_featured BOOLEAN,
    going_count BIGINT,
    interested_count BIGINT,
    post_count BIGINT,
    user_status VARCHAR(20)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
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
        e.is_featured,
        COALESCE(es.going_count, 0),
        COALESCE(es.interested_count, 0),
        COALESCE(es.post_count, 0),
        ea.status AS user_status
    FROM events e
    LEFT JOIN event_stats es ON es.event_id = e.id
    LEFT JOIN event_attendance ea ON ea.event_id = e.id AND ea.user_id = p_user_id
    WHERE e.id = p_event_id;
END;
$$;

COMMENT ON FUNCTION get_event_with_stats(UUID, UUID) IS
    'Returns a single event with attendance stats and user''s status';

-- ============================================================================
-- TRIGGER: Auto-create Reminder on Going
-- ============================================================================
-- When user marks "going", automatically create a reminder

CREATE OR REPLACE FUNCTION trigger_auto_create_event_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event events%ROWTYPE;
BEGIN
    -- Only trigger when status is 'going'
    IF NEW.status = 'going' THEN
        -- Get event details
        SELECT * INTO v_event FROM events WHERE id = NEW.event_id;

        -- Only create reminder if event is in the future (at least 1 day away)
        IF v_event.date_time > NOW() + INTERVAL '1 day' THEN
            INSERT INTO event_reminders (user_id, event_id, scheduled_for, reminder_type)
            VALUES (
                NEW.user_id,
                NEW.event_id,
                v_event.date_time - INTERVAL '1 day',
                'day_before'
            )
            ON CONFLICT (user_id, event_id, reminder_type) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_attendance_going_reminder ON event_attendance;
CREATE TRIGGER on_attendance_going_reminder
    AFTER INSERT OR UPDATE ON event_attendance
    FOR EACH ROW
    WHEN (NEW.status = 'going')
    EXECUTE FUNCTION trigger_auto_create_event_reminder();

COMMENT ON FUNCTION trigger_auto_create_event_reminder() IS
    'Auto-creates a reminder when user marks "going" for an event';

-- ============================================================================
-- TRIGGER: Update Updated_at on Change
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_event_attendance_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_event_attendance_update ON event_attendance;
CREATE TRIGGER on_event_attendance_update
    BEFORE UPDATE ON event_attendance
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_event_attendance_timestamp();
