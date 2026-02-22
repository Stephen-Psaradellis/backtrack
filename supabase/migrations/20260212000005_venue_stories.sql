-- ============================================================================
-- Venue Stories Migration
-- ============================================================================
-- Creates the venue_stories table and RPC functions for the "What Happened Here"
-- feature that allows users to post ephemeral (4-hour) stories about venues.
--
-- Stories require an active check-in at the venue within the last 24 hours
-- and expire automatically after 4 hours.
-- ============================================================================

-- ============================================================================
-- VENUE_STORIES TABLE
-- ============================================================================
-- Stores ephemeral stories posted by users at specific venues

CREATE TABLE IF NOT EXISTS venue_stories (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Story content (140 characters max, like original Twitter)
    content TEXT NOT NULL CHECK(length(content) >= 1 AND length(content) <= 140),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '4 hours')
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for fetching stories by location (ordered by expiry for cleanup)
CREATE INDEX idx_venue_stories_location_expires
    ON venue_stories(location_id, expires_at DESC);

-- Index for cleanup queries (finding expired stories)
CREATE INDEX idx_venue_stories_expires_at
    ON venue_stories(expires_at);

-- Index for user's own stories
CREATE INDEX idx_venue_stories_user_id
    ON venue_stories(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE venue_stories ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read non-expired stories
CREATE POLICY "Anyone can read non-expired venue stories"
    ON venue_stories
    FOR SELECT
    TO authenticated
    USING (expires_at > NOW());

-- Policy: Users can insert their own stories IF they have checked in at the venue in last 24h
CREATE POLICY "Users can create stories at checked-in venues"
    ON venue_stories
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- User must be the story author
        auth.uid() = user_id
        AND
        -- User must have an active or recent check-in at this location (within 24 hours)
        EXISTS (
            SELECT 1
            FROM user_checkins uc
            WHERE uc.user_id = auth.uid()
                AND uc.location_id = venue_stories.location_id
                AND uc.checked_in_at >= NOW() - INTERVAL '24 hours'
        )
    );

-- Policy: Users can delete their own stories
CREATE POLICY "Users can delete their own venue stories"
    ON venue_stories
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user can post a story at a location
CREATE OR REPLACE FUNCTION can_post_venue_story(p_location_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user has an active or recent check-in at this location (within 24 hours)
    RETURN EXISTS (
        SELECT 1
        FROM user_checkins uc
        WHERE uc.user_id = auth.uid()
            AND uc.location_id = p_location_id
            AND uc.checked_in_at >= NOW() - INTERVAL '24 hours'
    );
END;
$$;

COMMENT ON FUNCTION can_post_venue_story(UUID) IS
    'Returns true if the current user can post a story at the given location (must have checked in within 24h).';

GRANT EXECUTE ON FUNCTION can_post_venue_story(UUID) TO authenticated;

-- Function to get active stories for a location with user details
CREATE OR REPLACE FUNCTION get_venue_stories(p_location_id UUID)
RETURNS TABLE (
    id UUID,
    location_id UUID,
    user_id UUID,
    content TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    display_name TEXT,
    avatar JSONB,
    is_verified BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        vs.id,
        vs.location_id,
        vs.user_id,
        vs.content,
        vs.created_at,
        vs.expires_at,
        p.display_name,
        p.avatar::JSONB,
        p.is_verified
    FROM venue_stories vs
    JOIN profiles p ON p.id = vs.user_id
    WHERE vs.location_id = p_location_id
        AND vs.expires_at > NOW()
    ORDER BY vs.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_venue_stories(UUID) IS
    'Returns all non-expired stories for a location with user profile details.';

GRANT EXECUTE ON FUNCTION get_venue_stories(UUID) TO authenticated;

-- ============================================================================
-- CLEANUP FUNCTION (for periodic maintenance)
-- ============================================================================

-- Function to delete expired stories (can be called by cron job or trigger)
CREATE OR REPLACE FUNCTION cleanup_expired_venue_stories()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM venue_stories
    WHERE expires_at <= NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_venue_stories() IS
    'Deletes all expired venue stories. Returns the number of stories deleted. Can be called by cron job.';

GRANT EXECUTE ON FUNCTION cleanup_expired_venue_stories() TO authenticated;
