-- ============================================================================
-- ADD scheduled_checkout_at TO user_checkins
-- ============================================================================
-- Allows manual check-in users to set a duration-based expiry.
-- The is_checkin_active() function is updated to respect this field:
-- if scheduled_checkout_at is set and in the past, the check-in is expired.

ALTER TABLE user_checkins
  ADD COLUMN IF NOT EXISTS scheduled_checkout_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN user_checkins.scheduled_checkout_at IS
  'Client-chosen expiry time for manual check-ins. NULL means use default server expiry.';

-- ============================================================================
-- UPDATED: is_checkin_active - respects scheduled_checkout_at
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
                -- Tracking users: 8-hour window
                p_checked_in_at > NOW() - INTERVAL '8 hours'
                AND EXISTS (
                    SELECT 1 FROM profiles
                    WHERE id = p_user_id
                    AND always_on_tracking_enabled = true
                )
            )
        )
        -- Also check scheduled_checkout_at if set
        AND NOT EXISTS (
            SELECT 1 FROM user_checkins uc
            WHERE uc.user_id = p_user_id
              AND uc.checked_in_at = p_checked_in_at
              AND uc.scheduled_checkout_at IS NOT NULL
              AND uc.scheduled_checkout_at <= NOW()
        );
$$;

COMMENT ON FUNCTION is_checkin_active(TIMESTAMPTZ, TIMESTAMPTZ, UUID) IS
  'Check if a checkin is still active. Respects scheduled_checkout_at, 3-hour default for non-tracking users, 8-hour cap for tracking users.';
