-- ============================================================================
-- CHECKIN 3-HOUR EXPIRY FOR NON-TRACKING USERS
-- ============================================================================
-- When a user does NOT have background tracking enabled, their check-ins
-- automatically expire after 3 hours. Users with always_on_tracking_enabled
-- keep their check-ins active indefinitely (auto-checkout handled by the
-- background location service on departure).
--
-- This migration updates:
-- 1. get_active_checkin() - returns null for expired checkins
-- 2. get_active_checkins_at_location() - excludes expired checkins
-- 3. get_active_checkin_count_at_location() - excludes expired checkins
-- ============================================================================

-- Helper: Check if a checkin is still active (not expired)
-- A checkin is active if:
--   - checked_out_at IS NULL, AND
--   - user has always_on_tracking_enabled = true, OR
--   - checked_in_at is within the last 3 hours
CREATE OR REPLACE FUNCTION is_checkin_active(
    p_checked_in_at TIMESTAMPTZ,
    p_checked_out_at TIMESTAMPTZ,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT p_checked_out_at IS NULL
        AND (
            p_checked_in_at > NOW() - INTERVAL '3 hours'
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE id = p_user_id
                AND always_on_tracking_enabled = true
            )
        );
$$;

COMMENT ON FUNCTION is_checkin_active(TIMESTAMPTZ, TIMESTAMPTZ, UUID) IS
    'Check if a checkin is still active. Expires after 3 hours for users without background tracking.';

-- ============================================================================
-- UPDATED: get_active_checkin
-- ============================================================================
CREATE OR REPLACE FUNCTION get_active_checkin()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_checkin RECORD;
    v_current_user_id UUID;
BEGIN
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
        AND is_checkin_active(uc.checked_in_at, uc.checked_out_at, uc.user_id)
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

-- ============================================================================
-- UPDATED: get_active_checkins_at_location
-- ============================================================================
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
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID;
    v_has_access BOOLEAN;
BEGIN
    v_current_user_id := auth.uid();

    IF v_current_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Check if current user has access (Regular OR active check-in at location)
    SELECT (
        is_user_regular_at_location(v_current_user_id, p_location_id)
        OR EXISTS (
            SELECT 1
            FROM user_checkins uc
            WHERE uc.user_id = v_current_user_id
                AND uc.location_id = p_location_id
                AND is_checkin_active(uc.checked_in_at, uc.checked_out_at, uc.user_id)
                AND uc.verified = TRUE
        )
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RETURN;
    END IF;

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
        AND is_checkin_active(uc.checked_in_at, uc.checked_out_at, uc.user_id)
        AND uc.user_id != v_current_user_id
    ORDER BY uc.checked_in_at DESC;
END;
$$;

-- ============================================================================
-- UPDATED: get_active_checkin_count_at_location
-- ============================================================================
CREATE OR REPLACE FUNCTION get_active_checkin_count_at_location(
    p_location_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM user_checkins uc
    WHERE uc.location_id = p_location_id
        AND is_checkin_active(uc.checked_in_at, uc.checked_out_at, uc.user_id);

    RETURN v_count;
END;
$$;

-- Grant execute on the new helper function
GRANT EXECUTE ON FUNCTION is_checkin_active(TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;
