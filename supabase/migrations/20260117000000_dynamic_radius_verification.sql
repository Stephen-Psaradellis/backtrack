-- ============================================================================
-- Dynamic Radius Verification Migration
-- ============================================================================
-- This migration updates the check-in verification system to use dynamic
-- radius adjustment based on GPS accuracy. Instead of a fixed 200m radius,
-- the effective verification radius now scales based on the reported GPS
-- accuracy from the device.
--
-- Key improvements:
-- - Rejects check-ins when GPS accuracy is too poor (> 75m)
-- - Uses dynamic radius: base_radius + min(accuracy * buffer_factor, max_buffer)
-- - Returns detailed calculation info for debugging/transparency
-- - Flags suspiciously precise readings (< 1m) as potential spoofing
--
-- Formula: effective_radius = 50m + min(accuracy * 1.5, 100m)
-- Range: 50m (perfect GPS) to 150m (poor GPS), reject > 75m accuracy
-- ============================================================================

-- ============================================================================
-- CHECKIN_TO_LOCATION FUNCTION (Updated with Dynamic Radius)
-- ============================================================================
-- Checks a user into a location with GPS verification using dynamic radius.
--
-- Parameters:
--   p_location_id: UUID of the location to check in to
--   p_user_lat: User's current latitude (DOUBLE PRECISION)
--   p_user_lon: User's current longitude (DOUBLE PRECISION)
--   p_accuracy: GPS accuracy in meters (DOUBLE PRECISION), required for dynamic radius
--
-- Returns: JSON with success, checkin_id, verified, already_checked_in,
--          distance_meters, effective_radius, accuracy_info, error

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
    v_current_user_id UUID;

    -- Dynamic radius configuration
    v_base_radius CONSTANT DOUBLE PRECISION := 50.0;       -- Minimum verification radius
    v_buffer_factor CONSTANT DOUBLE PRECISION := 1.5;      -- Accuracy multiplier
    v_max_buffer CONSTANT DOUBLE PRECISION := 100.0;       -- Maximum buffer cap
    v_max_acceptable_accuracy CONSTANT DOUBLE PRECISION := 75.0;  -- Reject if accuracy worse
    v_min_acceptable_accuracy CONSTANT DOUBLE PRECISION := 1.0;   -- Flag if suspiciously precise
    v_effective_radius DOUBLE PRECISION;
    v_accuracy_buffer DOUBLE PRECISION;
    v_effective_accuracy DOUBLE PRECISION;
    v_accuracy_status TEXT := 'unknown';
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Handle NULL or zero accuracy (use conservative default)
    IF p_accuracy IS NULL OR p_accuracy <= 0 THEN
        v_effective_accuracy := 50.0;  -- Assume moderate accuracy if not provided
        v_accuracy_status := 'defaulted';
    ELSE
        v_effective_accuracy := p_accuracy;
    END IF;

    -- Check for suspiciously precise GPS (potential spoofing)
    IF v_effective_accuracy < v_min_acceptable_accuracy THEN
        v_accuracy_status := 'suspicious';
        -- Allow but flag - could be legitimate high-end GPS
    END IF;

    -- Reject if GPS accuracy is too poor
    IF v_effective_accuracy > v_max_acceptable_accuracy THEN
        RETURN json_build_object(
            'success', false,
            'error', 'GPS accuracy too low. Please move to an area with better signal.',
            'accuracy', v_effective_accuracy,
            'max_allowed', v_max_acceptable_accuracy,
            'suggestion', 'Try moving outdoors or away from buildings'
        );
    END IF;

    -- Calculate dynamic verification radius
    v_accuracy_buffer := LEAST(v_effective_accuracy * v_buffer_factor, v_max_buffer);
    v_effective_radius := v_base_radius + v_accuracy_buffer;

    -- Set accuracy status if not already set
    IF v_accuracy_status = 'unknown' THEN
        IF v_effective_accuracy <= 10 THEN
            v_accuracy_status := 'excellent';
        ELSIF v_effective_accuracy <= 25 THEN
            v_accuracy_status := 'good';
        ELSIF v_effective_accuracy <= 50 THEN
            v_accuracy_status := 'fair';
        ELSE
            v_accuracy_status := 'poor';
        END IF;
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

    -- Dynamic radius verification
    IF v_distance <= v_effective_radius THEN
        v_verified := TRUE;
    END IF;

    -- Check if already checked in at this location (active check-in)
    SELECT id INTO v_checkin_id
    FROM user_checkins
    WHERE user_id = v_current_user_id
        AND location_id = p_location_id
        AND checked_out_at IS NULL;

    IF v_checkin_id IS NOT NULL THEN
        -- Already checked in, return existing with updated info
        RETURN json_build_object(
            'success', true,
            'checkin_id', v_checkin_id,
            'already_checked_in', true,
            'verified', v_verified,
            'distance_meters', ROUND(v_distance::numeric, 2),
            'effective_radius', ROUND(v_effective_radius::numeric, 2),
            'accuracy_info', json_build_object(
                'reported', ROUND(v_effective_accuracy::numeric, 2),
                'status', v_accuracy_status,
                'buffer', ROUND(v_accuracy_buffer::numeric, 2)
            )
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
        v_effective_accuracy
    )
    RETURNING id INTO v_checkin_id;

    RETURN json_build_object(
        'success', true,
        'checkin_id', v_checkin_id,
        'verified', v_verified,
        'already_checked_in', false,
        'distance_meters', ROUND(v_distance::numeric, 2),
        'effective_radius', ROUND(v_effective_radius::numeric, 2),
        'accuracy_info', json_build_object(
            'reported', ROUND(v_effective_accuracy::numeric, 2),
            'status', v_accuracy_status,
            'buffer', ROUND(v_accuracy_buffer::numeric, 2),
            'formula', 'base(50) + min(accuracy * 1.5, 100)'
        )
    );
END;
$$;

COMMENT ON FUNCTION checkin_to_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) IS
    'Checks user into a location with dynamic GPS verification. Radius scales with accuracy: 50m base + min(accuracy * 1.5, 100m). Rejects accuracy > 75m. Returns JSON with success, checkin_id, verified status, distance, and accuracy info.';
