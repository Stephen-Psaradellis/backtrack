-- ============================================================================
-- CHECKIN MAX EXPIRY: 8-HOUR CAP FOR TRACKING USERS
-- ============================================================================
-- Previously, users with always_on_tracking_enabled kept check-ins active
-- indefinitely. This adds an 8-hour upper bound: if background departure
-- detection fails for any reason, the check-in still expires server-side.
--
-- Non-tracking users: 3-hour expiry (unchanged)
-- Tracking users:     8-hour expiry (new cap)
-- ============================================================================

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
            -- Non-tracking users: 3-hour window
            p_checked_in_at > NOW() - INTERVAL '3 hours'
            OR (
                -- Tracking users: 8-hour window (was unlimited)
                p_checked_in_at > NOW() - INTERVAL '8 hours'
                AND EXISTS (
                    SELECT 1 FROM profiles
                    WHERE id = p_user_id
                    AND always_on_tracking_enabled = true
                )
            )
        );
$$;

COMMENT ON FUNCTION is_checkin_active(TIMESTAMPTZ, TIMESTAMPTZ, UUID) IS
    'Check if a checkin is still active. 3-hour expiry for non-tracking users, 8-hour cap for tracking users.';
