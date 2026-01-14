-- ============================================================================
-- Grant Execute Permissions for Check-in Functions
-- ============================================================================
-- These grants were missing from the original 035_user_checkins.sql migration.
-- Adding them here to ensure authenticated users can call the check-in RPCs.

GRANT EXECUTE ON FUNCTION checkin_to_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION checkout_from_location(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_checkin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_checked_in_at_location(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
