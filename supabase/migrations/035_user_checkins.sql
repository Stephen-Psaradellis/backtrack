-- ============================================================================
-- User Check-ins Schema Migration
-- ============================================================================
-- This migration creates the user_checkins table for tracking explicit user
-- check-ins at physical locations. Unlike location_visits (which are ephemeral
-- and auto-cleanup after 3 hours), check-ins persist and support explicit
-- check-out, enabling tiered matching for missed connections.
--
-- Key features:
-- - Tracks when users check in/out of locations
-- - GPS verification (200m radius) for verified check-ins
-- - Supports ongoing presence tracking with check-out timestamps
-- - Enables Tier 1 matching: verified presence at location during time window
-- ============================================================================

-- ============================================================================
-- USER_CHECKINS TABLE
-- ============================================================================
-- Tracks explicit user check-ins for presence verification
-- Users can only have one active check-in per location at a time

CREATE TABLE IF NOT EXISTS user_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,

    -- Time tracking
    checked_in_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    checked_out_at TIMESTAMPTZ,

    -- Verification data
    verified BOOLEAN DEFAULT FALSE NOT NULL,
    verification_lat DOUBLE PRECISION NOT NULL,
    verification_lon DOUBLE PRECISION NOT NULL,
    verification_accuracy DOUBLE PRECISION,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT valid_checkout CHECK (checked_out_at IS NULL OR checked_out_at > checked_in_at)
);

-- Comments
COMMENT ON TABLE user_checkins IS 'Tracks explicit user check-ins at locations for tiered matching verification';
COMMENT ON COLUMN user_checkins.id IS 'Unique identifier for the check-in record';
COMMENT ON COLUMN user_checkins.user_id IS 'User who checked in';
COMMENT ON COLUMN user_checkins.location_id IS 'Location where user checked in';
COMMENT ON COLUMN user_checkins.checked_in_at IS 'Timestamp when user checked in';
COMMENT ON COLUMN user_checkins.checked_out_at IS 'Timestamp when user checked out (NULL if still checked in)';
COMMENT ON COLUMN user_checkins.verified IS 'Whether check-in was GPS-verified (within 200m)';
COMMENT ON COLUMN user_checkins.verification_lat IS 'GPS latitude at time of check-in';
COMMENT ON COLUMN user_checkins.verification_lon IS 'GPS longitude at time of check-in';
COMMENT ON COLUMN user_checkins.verification_accuracy IS 'GPS accuracy in meters at time of check-in';
COMMENT ON COLUMN user_checkins.created_at IS 'Timestamp when record was created';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for querying user's check-ins
CREATE INDEX IF NOT EXISTS idx_user_checkins_user_id
    ON user_checkins(user_id);

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_user_checkins_location_id
    ON user_checkins(location_id);

-- Composite index for user's check-ins at a specific location
CREATE INDEX IF NOT EXISTS idx_user_checkins_user_location
    ON user_checkins(user_id, location_id);

-- Index for finding check-ins by time (for matching with posts)
CREATE INDEX IF NOT EXISTS idx_user_checkins_location_time
    ON user_checkins(location_id, checked_in_at DESC);

-- Partial index for active (not checked out) check-ins - most common query
CREATE INDEX IF NOT EXISTS idx_user_checkins_active
    ON user_checkins(user_id)
    WHERE checked_out_at IS NULL;

-- Index for verified check-ins (Tier 1 matching)
CREATE INDEX IF NOT EXISTS idx_user_checkins_verified
    ON user_checkins(location_id, checked_in_at)
    WHERE verified = TRUE;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_checkins ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own check-ins
DROP POLICY IF EXISTS "user_checkins_select_own" ON user_checkins;
CREATE POLICY "user_checkins_select_own"
    ON user_checkins
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to insert only their own check-ins
DROP POLICY IF EXISTS "user_checkins_insert_own" ON user_checkins;
CREATE POLICY "user_checkins_insert_own"
    ON user_checkins
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update only their own check-ins (for checkout)
DROP POLICY IF EXISTS "user_checkins_update_own" ON user_checkins;
CREATE POLICY "user_checkins_update_own"
    ON user_checkins
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Comments on policies
COMMENT ON POLICY "user_checkins_select_own" ON user_checkins IS 'Users can only view their own check-ins for privacy';
COMMENT ON POLICY "user_checkins_insert_own" ON user_checkins IS 'Users can only create their own check-ins';
COMMENT ON POLICY "user_checkins_update_own" ON user_checkins IS 'Users can only update their own check-ins (for checkout)';

-- ============================================================================
-- CHECKIN_TO_LOCATION FUNCTION
-- ============================================================================
-- Checks a user into a location with GPS verification.
-- Uses ST_DWithin with 200m radius for verification (more generous than visits).
-- Automatically checks out from any other active check-ins at different locations.
--
-- Parameters:
--   p_location_id: UUID of the location to check in to
--   p_user_lat: User's current latitude (DOUBLE PRECISION)
--   p_user_lon: User's current longitude (DOUBLE PRECISION)
--   p_accuracy: GPS accuracy in meters (DOUBLE PRECISION), optional
--
-- Returns: JSON with success, checkin_id, verified, already_checked_in, distance_meters, error

CREATE OR REPLACE FUNCTION checkin_to_location(
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
    v_checkin_id UUID;
    v_verified BOOLEAN := FALSE;
    v_proximity_radius CONSTANT DOUBLE PRECISION := 200.0; -- 200 meters for check-ins
    v_current_user_id UUID;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Get location
    SELECT * INTO v_location FROM locations WHERE id = p_location_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Location not found');
    END IF;

    -- Calculate distance using PostGIS (lon, lat order!)
    SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint(p_user_lon, p_user_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(v_location.longitude, v_location.latitude), 4326)::geography
    ) INTO v_distance;

    -- Verify within 200m
    IF v_distance <= v_proximity_radius THEN
        v_verified := TRUE;
    END IF;

    -- Check if already checked in at this location (active check-in)
    SELECT id INTO v_checkin_id
    FROM user_checkins
    WHERE user_id = v_current_user_id
        AND location_id = p_location_id
        AND checked_out_at IS NULL;

    IF v_checkin_id IS NOT NULL THEN
        -- Already checked in, return existing
        RETURN json_build_object(
            'success', true,
            'checkin_id', v_checkin_id,
            'already_checked_in', true,
            'verified', v_verified,
            'distance_meters', ROUND(v_distance::numeric, 2)
        );
    END IF;

    -- Check out of any existing active check-ins at OTHER locations
    UPDATE user_checkins
    SET checked_out_at = NOW()
    WHERE user_id = v_current_user_id
        AND checked_out_at IS NULL
        AND location_id != p_location_id;

    -- Create new check-in
    INSERT INTO user_checkins (
        user_id,
        location_id,
        checked_in_at,
        verified,
        verification_lat,
        verification_lon,
        verification_accuracy
    ) VALUES (
        v_current_user_id,
        p_location_id,
        NOW(),
        v_verified,
        p_user_lat,
        p_user_lon,
        p_accuracy
    )
    RETURNING id INTO v_checkin_id;

    RETURN json_build_object(
        'success', true,
        'checkin_id', v_checkin_id,
        'verified', v_verified,
        'already_checked_in', false,
        'distance_meters', ROUND(v_distance::numeric, 2)
    );
END;
$$;

COMMENT ON FUNCTION checkin_to_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) IS
    'Checks user into a location with GPS verification (200m radius). Auto-checkouts from other locations. Returns JSON with success, checkin_id, verified status, and distance.';

-- ============================================================================
-- CHECKOUT_FROM_LOCATION FUNCTION
-- ============================================================================
-- Checks out a user from a location (or all locations if no location specified).
--
-- Parameters:
--   p_location_id: UUID of the location to check out from (NULL = all locations)
--
-- Returns: JSON with success and checkouts count

CREATE OR REPLACE FUNCTION checkout_from_location(
    p_location_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
    v_current_user_id UUID;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    IF p_location_id IS NULL THEN
        -- Checkout from all locations
        UPDATE user_checkins
        SET checked_out_at = NOW()
        WHERE user_id = v_current_user_id
            AND checked_out_at IS NULL;
    ELSE
        -- Checkout from specific location
        UPDATE user_checkins
        SET checked_out_at = NOW()
        WHERE user_id = v_current_user_id
            AND location_id = p_location_id
            AND checked_out_at IS NULL;
    END IF;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN json_build_object('success', true, 'checkouts', v_count);
END;
$$;

COMMENT ON FUNCTION checkout_from_location(UUID) IS
    'Checks out user from a specific location or all locations. Returns JSON with success and number of checkouts.';

-- ============================================================================
-- GET_ACTIVE_CHECKIN FUNCTION
-- ============================================================================
-- Gets the user's current active check-in (if any).
--
-- Returns: JSON with checkin details or null if not checked in

CREATE OR REPLACE FUNCTION get_active_checkin()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_checkin RECORD;
    v_current_user_id UUID;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    SELECT
        uc.id,
        uc.location_id,
        l.name as location_name,
        uc.checked_in_at,
        uc.verified
    INTO v_checkin
    FROM user_checkins uc
    JOIN locations l ON l.id = uc.location_id
    WHERE uc.user_id = v_current_user_id
        AND uc.checked_out_at IS NULL
    ORDER BY uc.checked_in_at DESC
    LIMIT 1;

    IF v_checkin IS NULL THEN
        RETURN json_build_object('success', true, 'checkin', null);
    END IF;

    RETURN json_build_object(
        'success', true,
        'checkin', json_build_object(
            'id', v_checkin.id,
            'location_id', v_checkin.location_id,
            'location_name', v_checkin.location_name,
            'checked_in_at', v_checkin.checked_in_at,
            'verified', v_checkin.verified
        )
    );
END;
$$;

COMMENT ON FUNCTION get_active_checkin() IS
    'Gets the current user active check-in with location details. Returns null if not checked in.';

-- ============================================================================
-- GET_USERS_CHECKED_IN_AT_LOCATION FUNCTION
-- ============================================================================
-- Gets users who have verified check-ins at a location within a time window.
-- Used for matching posts with potential consumers (Tier 1).
-- Only returns user IDs (not full profiles) for privacy.
--
-- Parameters:
--   p_location_id: UUID of the location
--   p_time_start: Start of time window (default: 4 hours ago)
--   p_time_end: End of time window (default: now + 2 hours for flexibility)
--
-- Returns: TABLE of user_ids with verified check-ins

CREATE OR REPLACE FUNCTION get_users_checked_in_at_location(
    p_location_id UUID,
    p_time_start TIMESTAMPTZ DEFAULT NOW() - INTERVAL '4 hours',
    p_time_end TIMESTAMPTZ DEFAULT NOW() + INTERVAL '2 hours'
)
RETURNS TABLE (
    user_id UUID,
    checkin_id UUID,
    checked_in_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        uc.user_id,
        uc.id as checkin_id,
        uc.checked_in_at,
        uc.checked_out_at
    FROM user_checkins uc
    WHERE uc.location_id = p_location_id
        AND uc.verified = TRUE
        -- Check-in overlaps with time window
        AND uc.checked_in_at <= p_time_end
        AND COALESCE(uc.checked_out_at, NOW() + INTERVAL '4 hours') >= p_time_start;
END;
$$;

COMMENT ON FUNCTION get_users_checked_in_at_location(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
    'Gets users with verified check-ins at a location within a time window. Used for Tier 1 matching.';
