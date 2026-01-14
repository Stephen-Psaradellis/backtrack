-- ============================================================================
-- Check-in Permissions Schema Migration
-- ============================================================================
-- This migration adds:
-- 1. Profile columns for tracking settings (always_on_tracking, prompt minutes)
-- 2. Permission functions (can_post_to_location, can_match_post)
-- 3. Live check-in view function
-- 4. Updated RLS policies for check-ins visibility
--
-- Key features:
-- - Users can enable always-on location tracking
-- - Configure check-in prompt timing (1-60 minutes)
-- - Posting requires being a Regular OR checked in within 12 hours
-- - Matching requires being a Regular OR checked in within 24h of post time
-- ============================================================================

-- ============================================================================
-- PROFILE COLUMNS
-- ============================================================================
-- Add tracking settings to profiles table

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS always_on_tracking_enabled BOOLEAN DEFAULT false;

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS checkin_prompt_minutes INTEGER DEFAULT 5
    CHECK (checkin_prompt_minutes >= 1 AND checkin_prompt_minutes <= 60);

COMMENT ON COLUMN profiles.always_on_tracking_enabled IS
    'Whether user has enabled always-on location tracking for auto check-in prompts';
COMMENT ON COLUMN profiles.checkin_prompt_minutes IS
    'Minutes to wait before prompting user to check in when at same location (1-60)';

-- ============================================================================
-- FUNCTION: is_user_regular_at_location
-- ============================================================================
-- Helper function to check if user is a Regular at a location
--
-- Parameters:
--   p_user_id: UUID of the user
--   p_location_id: UUID of the location
--
-- Returns: BOOLEAN

CREATE OR REPLACE FUNCTION is_user_regular_at_location(
    p_user_id UUID,
    p_location_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_is_regular BOOLEAN;
BEGIN
    SELECT is_regular INTO v_is_regular
    FROM location_regulars
    WHERE user_id = p_user_id
        AND location_id = p_location_id;

    RETURN COALESCE(v_is_regular, false);
END;
$$;

COMMENT ON FUNCTION is_user_regular_at_location(UUID, UUID) IS
    'Checks if a user is a Regular at a specific location';

-- ============================================================================
-- FUNCTION: has_recent_checkin_at_location
-- ============================================================================
-- Helper function to check if user has checked in within a time window
--
-- Parameters:
--   p_user_id: UUID of the user
--   p_location_id: UUID of the location
--   p_hours: Number of hours to look back (default 12)
--
-- Returns: BOOLEAN

CREATE OR REPLACE FUNCTION has_recent_checkin_at_location(
    p_user_id UUID,
    p_location_id UUID,
    p_hours INTEGER DEFAULT 12
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_has_checkin BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM user_checkins
        WHERE user_id = p_user_id
            AND location_id = p_location_id
            AND checked_in_at >= NOW() - (p_hours || ' hours')::INTERVAL
    ) INTO v_has_checkin;

    RETURN v_has_checkin;
END;
$$;

COMMENT ON FUNCTION has_recent_checkin_at_location(UUID, UUID, INTEGER) IS
    'Checks if user has checked in to a location within specified hours';

-- ============================================================================
-- FUNCTION: can_post_to_location
-- ============================================================================
-- Checks if a user can create a post at a location.
-- User must be either:
-- 1. A Regular at the location, OR
-- 2. Have checked in within the last 12 hours
--
-- Parameters:
--   p_user_id: UUID of the user
--   p_location_id: UUID of the location
--
-- Returns: JSON with can_post boolean and reason if false

CREATE OR REPLACE FUNCTION can_post_to_location(
    p_user_id UUID,
    p_location_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_is_regular BOOLEAN;
    v_has_recent_checkin BOOLEAN;
    v_location_name TEXT;
BEGIN
    -- Get location name for error message
    SELECT name INTO v_location_name
    FROM locations
    WHERE id = p_location_id;

    IF v_location_name IS NULL THEN
        RETURN json_build_object(
            'can_post', false,
            'reason', 'Location not found',
            'is_regular', false,
            'has_recent_checkin', false
        );
    END IF;

    -- Check if user is a Regular
    v_is_regular := is_user_regular_at_location(p_user_id, p_location_id);

    -- Check if user has recent check-in (within 12 hours)
    v_has_recent_checkin := has_recent_checkin_at_location(p_user_id, p_location_id, 12);

    IF v_is_regular OR v_has_recent_checkin THEN
        RETURN json_build_object(
            'can_post', true,
            'reason', null,
            'is_regular', v_is_regular,
            'has_recent_checkin', v_has_recent_checkin,
            'location_name', v_location_name
        );
    ELSE
        RETURN json_build_object(
            'can_post', false,
            'reason', format('Only Regulars of %s or users who have checked into %s within the last 12 hours can post here', v_location_name, v_location_name),
            'is_regular', false,
            'has_recent_checkin', false,
            'location_name', v_location_name
        );
    END IF;
END;
$$;

COMMENT ON FUNCTION can_post_to_location(UUID, UUID) IS
    'Checks if user can post at a location (must be Regular OR checked in <12h)';

-- ============================================================================
-- FUNCTION: can_match_post
-- ============================================================================
-- Checks if a user can respond to/match with a post.
-- User must be either:
-- 1. A Regular at the post's location, OR
-- 2. Have checked in within 24 hours of the post's sighting time
--    (or checked in within 24 hours from now if no sighting time)
--
-- Parameters:
--   p_user_id: UUID of the user (responder/consumer)
--   p_post_id: UUID of the post
--
-- Returns: JSON with can_match boolean and reason if false

CREATE OR REPLACE FUNCTION can_match_post(
    p_user_id UUID,
    p_post_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_post RECORD;
    v_is_regular BOOLEAN;
    v_has_matching_checkin BOOLEAN;
    v_location_name TEXT;
    v_time_reference TIMESTAMPTZ;
BEGIN
    -- Get post details
    SELECT
        p.id,
        p.location_id,
        p.producer_id,
        p.seen_at,
        p.sighting_date,
        p.created_at,
        l.name as location_name
    INTO v_post
    FROM posts p
    JOIN locations l ON l.id = p.location_id
    WHERE p.id = p_post_id;

    IF v_post IS NULL THEN
        RETURN json_build_object(
            'can_match', false,
            'reason', 'Post not found',
            'is_regular', false,
            'has_matching_checkin', false
        );
    END IF;

    v_location_name := v_post.location_name;

    -- Don't allow matching your own post
    IF v_post.producer_id = p_user_id THEN
        RETURN json_build_object(
            'can_match', false,
            'reason', 'Cannot match your own post',
            'is_regular', false,
            'has_matching_checkin', false
        );
    END IF;

    -- Check if user is a Regular
    v_is_regular := is_user_regular_at_location(p_user_id, v_post.location_id);

    -- Determine time reference for check-in matching
    -- Priority: seen_at > sighting_date > created_at
    v_time_reference := COALESCE(v_post.seen_at, v_post.sighting_date, v_post.created_at);

    -- Check if user has check-in within 24h of the time reference
    SELECT EXISTS (
        SELECT 1
        FROM user_checkins
        WHERE user_id = p_user_id
            AND location_id = v_post.location_id
            -- Check-in must overlap with 24h window around post time
            AND checked_in_at <= v_time_reference + INTERVAL '24 hours'
            AND COALESCE(checked_out_at, NOW() + INTERVAL '24 hours') >= v_time_reference - INTERVAL '24 hours'
    ) INTO v_has_matching_checkin;

    IF v_is_regular OR v_has_matching_checkin THEN
        RETURN json_build_object(
            'can_match', true,
            'reason', null,
            'is_regular', v_is_regular,
            'has_matching_checkin', v_has_matching_checkin,
            'location_name', v_location_name
        );
    ELSE
        RETURN json_build_object(
            'can_match', false,
            'reason', format('You must be a Regular at %s or have checked in within 24 hours of when this post was created to respond', v_location_name),
            'is_regular', false,
            'has_matching_checkin', false,
            'location_name', v_location_name
        );
    END IF;
END;
$$;

COMMENT ON FUNCTION can_match_post(UUID, UUID) IS
    'Checks if user can match/respond to a post (must be Regular OR checked in within 24h of post time)';

-- ============================================================================
-- FUNCTION: get_active_checkins_at_location
-- ============================================================================
-- Gets users who are currently checked in at a location (active check-ins).
-- Only returns data if the requesting user:
-- 1. Is currently checked in at the location AND within 200m, OR
-- 2. Is a Regular at the location
--
-- Parameters:
--   p_location_id: UUID of the location
--
-- Returns: TABLE of checked-in users with their avatars

CREATE OR REPLACE FUNCTION get_active_checkins_at_location(
    p_location_id UUID
)
RETURNS TABLE (
    user_id UUID,
    checkin_id UUID,
    checked_in_at TIMESTAMPTZ,
    avatar JSONB,
    display_name TEXT,
    is_verified BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_has_access BOOLEAN;
BEGIN
    v_current_user_id := auth.uid();

    IF v_current_user_id IS NULL THEN
        RETURN; -- Return empty for unauthenticated users
    END IF;

    -- Check if current user has access (Regular OR active check-in at location)
    SELECT (
        is_user_regular_at_location(v_current_user_id, p_location_id)
        OR EXISTS (
            SELECT 1
            FROM user_checkins uc
            WHERE uc.user_id = v_current_user_id
                AND uc.location_id = p_location_id
                AND uc.checked_out_at IS NULL
                AND uc.verified = TRUE -- Must be within 200m
        )
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RETURN; -- Return empty if no access
    END IF;

    -- Return active check-ins at the location
    RETURN QUERY
    SELECT
        uc.user_id,
        uc.id as checkin_id,
        uc.checked_in_at,
        p.avatar,
        p.display_name,
        p.is_verified
    FROM user_checkins uc
    JOIN profiles p ON p.id = uc.user_id
    WHERE uc.location_id = p_location_id
        AND uc.checked_out_at IS NULL
        AND uc.user_id != v_current_user_id -- Don't include self
    ORDER BY uc.checked_in_at DESC;
END;
$$;

COMMENT ON FUNCTION get_active_checkins_at_location(UUID) IS
    'Gets users currently checked in at a location (only if requester is Regular or checked in)';

-- ============================================================================
-- FUNCTION: get_active_checkin_count_at_location
-- ============================================================================
-- Gets count of users currently checked in at a location.
-- This count is public (no access restrictions).
--
-- Parameters:
--   p_location_id: UUID of the location
--
-- Returns: INTEGER count

CREATE OR REPLACE FUNCTION get_active_checkin_count_at_location(
    p_location_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM user_checkins
    WHERE location_id = p_location_id
        AND checked_out_at IS NULL;

    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION get_active_checkin_count_at_location(UUID) IS
    'Gets count of users currently checked in at a location (public)';

-- ============================================================================
-- FUNCTION: check_in_user (with 200m validation)
-- ============================================================================
-- Wrapper that validates 200m proximity before allowing check-in.
-- This function enforces the proximity constraint.
--
-- Parameters:
--   p_location_id: UUID of the location
--   p_user_lat: User's latitude
--   p_user_lon: User's longitude
--   p_accuracy: GPS accuracy (optional)
--
-- Returns: JSON with success status and check-in details or error

CREATE OR REPLACE FUNCTION check_in_user(
    p_location_id UUID,
    p_user_lat DOUBLE PRECISION,
    p_user_lon DOUBLE PRECISION,
    p_accuracy DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_location locations%ROWTYPE;
    v_distance DOUBLE PRECISION;
    v_max_distance CONSTANT DOUBLE PRECISION := 200.0;
BEGIN
    -- Get location
    SELECT * INTO v_location FROM locations WHERE id = p_location_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Location not found');
    END IF;

    -- Calculate distance (PostGIS uses lon, lat order!)
    SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint(p_user_lon, p_user_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(v_location.longitude, v_location.latitude), 4326)::geography
    ) INTO v_distance;

    -- Enforce 200m proximity
    IF v_distance > v_max_distance THEN
        RETURN json_build_object(
            'success', false,
            'error', format('You must be within 200m of %s to check in. You are %.0fm away.', v_location.name, v_distance),
            'distance_meters', ROUND(v_distance::numeric, 2)
        );
    END IF;

    -- Delegate to existing checkin_to_location function
    RETURN checkin_to_location(p_location_id, p_user_lat, p_user_lon, p_accuracy);
END;
$$;

COMMENT ON FUNCTION check_in_user(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) IS
    'Validates 200m proximity and creates a check-in. Returns error if too far.';

-- ============================================================================
-- FUNCTION: update_tracking_settings
-- ============================================================================
-- Updates user's tracking settings
--
-- Parameters:
--   p_always_on_enabled: Whether to enable always-on tracking
--   p_prompt_minutes: Minutes before prompting (1-60)
--
-- Returns: JSON with success status

CREATE OR REPLACE FUNCTION update_tracking_settings(
    p_always_on_enabled BOOLEAN,
    p_prompt_minutes INTEGER DEFAULT 5
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
BEGIN
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Validate prompt minutes
    IF p_prompt_minutes < 1 OR p_prompt_minutes > 60 THEN
        RETURN json_build_object('success', false, 'error', 'Prompt minutes must be between 1 and 60');
    END IF;

    UPDATE profiles
    SET
        always_on_tracking_enabled = p_always_on_enabled,
        checkin_prompt_minutes = p_prompt_minutes,
        updated_at = NOW()
    WHERE id = v_current_user_id;

    RETURN json_build_object(
        'success', true,
        'always_on_tracking_enabled', p_always_on_enabled,
        'checkin_prompt_minutes', p_prompt_minutes
    );
END;
$$;

COMMENT ON FUNCTION update_tracking_settings(BOOLEAN, INTEGER) IS
    'Updates user tracking settings (always-on tracking and prompt minutes)';

-- ============================================================================
-- FUNCTION: get_tracking_settings
-- ============================================================================
-- Gets user's tracking settings
--
-- Returns: JSON with tracking settings

CREATE OR REPLACE FUNCTION get_tracking_settings()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_settings RECORD;
BEGIN
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    SELECT
        always_on_tracking_enabled,
        checkin_prompt_minutes
    INTO v_settings
    FROM profiles
    WHERE id = v_current_user_id;

    RETURN json_build_object(
        'success', true,
        'always_on_tracking_enabled', COALESCE(v_settings.always_on_tracking_enabled, false),
        'checkin_prompt_minutes', COALESCE(v_settings.checkin_prompt_minutes, 5)
    );
END;
$$;

COMMENT ON FUNCTION get_tracking_settings() IS
    'Gets current user tracking settings';

-- ============================================================================
-- UPDATED RLS POLICIES FOR USER_CHECKINS
-- ============================================================================
-- Allow users to view check-ins at locations where they are also checked in OR are Regulars

-- Drop existing select policy
DROP POLICY IF EXISTS "user_checkins_select_own" ON user_checkins;

-- Create new policy: view own OR view at shared locations
CREATE POLICY "user_checkins_select_accessible"
    ON user_checkins
    FOR SELECT
    USING (
        -- Own check-ins
        auth.uid() = user_id
        OR
        -- Check-ins at locations where current user is checked in
        (
            checked_out_at IS NULL
            AND EXISTS (
                SELECT 1 FROM user_checkins uc2
                WHERE uc2.location_id = user_checkins.location_id
                  AND uc2.user_id = auth.uid()
                  AND uc2.checked_out_at IS NULL
            )
        )
        OR
        -- Check-ins at locations where current user is a Regular
        (
            checked_out_at IS NULL
            AND is_user_regular_at_location(auth.uid(), user_checkins.location_id)
        )
    );

COMMENT ON POLICY "user_checkins_select_accessible" ON user_checkins IS
    'Users can view own check-ins, or active check-ins at locations where they are checked in or are Regulars';

-- ============================================================================
-- INDEXES FOR NEW QUERIES
-- ============================================================================

-- Index for checking recent check-ins by user and location
CREATE INDEX IF NOT EXISTS idx_user_checkins_user_location_time
    ON user_checkins(user_id, location_id, checked_in_at DESC);

-- Index for finding active check-ins at a location
CREATE INDEX IF NOT EXISTS idx_user_checkins_location_active
    ON user_checkins(location_id)
    WHERE checked_out_at IS NULL;

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION is_user_regular_at_location(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_recent_checkin_at_location(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION can_post_to_location(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_match_post(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_checkins_at_location(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_checkin_count_at_location(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_in_user(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION update_tracking_settings(BOOLEAN, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tracking_settings() TO authenticated;

-- ============================================================================
-- FUNCTION: get_locations_near_point
-- ============================================================================
-- Finds locations within a radius of a point.
-- Used by the check-in button to find nearby POIs.
--
-- Parameters:
--   p_lat: User's latitude
--   p_lon: User's longitude
--   p_radius_meters: Search radius in meters (default 200)
--   p_limit: Maximum number of results (default 10)
--
-- Returns: TABLE of locations with distance

CREATE OR REPLACE FUNCTION get_locations_near_point(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION,
    p_radius_meters INTEGER DEFAULT 200,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id,
        l.name,
        l.address,
        l.latitude,
        l.longitude,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography
        ) as distance_meters
    FROM locations l
    WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography,
        p_radius_meters
    )
    ORDER BY distance_meters ASC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_locations_near_point(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER) IS
    'Finds locations within a radius of a point. Returns locations sorted by distance.';

GRANT EXECUTE ON FUNCTION get_locations_near_point(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER) TO authenticated;
