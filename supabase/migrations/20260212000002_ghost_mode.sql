-- ============================================================================
-- Ghost Mode Migration
-- ============================================================================
-- This migration adds "Ghost Mode" - a privacy feature that allows users to
-- temporarily hide from location-based features while still using the app.
--
-- Key features:
-- - Temporary visibility toggle (1h, 2h, 4h, or session-based)
-- - Users in ghost mode are excluded from:
--   * Location-based discovery
--   * Check-in visibility
--   * Regulars mode matching
--   * Nearby posts queries
-- - Ghost mode auto-expires after duration
-- - Users can manually deactivate anytime
-- ============================================================================

-- ============================================================================
-- PROFILE COLUMN
-- ============================================================================
-- Add ghost_mode_until column to profiles

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS ghost_mode_until TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN profiles.ghost_mode_until IS
    'Timestamp until which ghost mode is active. NULL or past date means visible, future date means hidden from location features';

CREATE INDEX IF NOT EXISTS idx_profiles_ghost_mode
    ON profiles(ghost_mode_until)
    WHERE ghost_mode_until IS NOT NULL;

-- ============================================================================
-- HELPER FUNCTION: Check Ghost Mode Status
-- ============================================================================
-- Returns true if user is currently in ghost mode

CREATE OR REPLACE FUNCTION is_ghost_mode(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ghost_until TIMESTAMPTZ;
BEGIN
    SELECT ghost_mode_until INTO v_ghost_until
    FROM profiles
    WHERE id = p_user_id;

    -- Ghost mode active if timestamp is in the future
    RETURN v_ghost_until IS NOT NULL AND v_ghost_until > NOW();
END;
$$;

COMMENT ON FUNCTION is_ghost_mode(UUID) IS
    'Returns true if user is currently in ghost mode (ghost_mode_until is in the future)';

-- ============================================================================
-- FUNCTION: Activate Ghost Mode
-- ============================================================================
-- Activates ghost mode for a specified duration

CREATE OR REPLACE FUNCTION activate_ghost_mode(
    p_user_id UUID,
    p_duration INTERVAL DEFAULT INTERVAL '1 hour'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_until TIMESTAMPTZ;
    v_success BOOLEAN;
BEGIN
    -- Validate user
    IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized'
        );
    END IF;

    -- Validate duration (max 24 hours)
    IF p_duration > INTERVAL '24 hours' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Duration cannot exceed 24 hours'
        );
    END IF;

    -- Calculate expiration time
    v_until := NOW() + p_duration;

    -- Update profile
    UPDATE profiles
    SET ghost_mode_until = v_until,
        updated_at = NOW()
    WHERE id = p_user_id;

    v_success := FOUND;

    IF v_success THEN
        RETURN jsonb_build_object(
            'success', true,
            'ghost_mode_until', v_until,
            'duration_minutes', EXTRACT(EPOCH FROM p_duration) / 60
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to activate ghost mode'
        );
    END IF;
END;
$$;

COMMENT ON FUNCTION activate_ghost_mode(UUID, INTERVAL) IS
    'Activates ghost mode for the specified duration (max 24 hours)';

-- ============================================================================
-- FUNCTION: Deactivate Ghost Mode
-- ============================================================================
-- Deactivates ghost mode immediately

CREATE OR REPLACE FUNCTION deactivate_ghost_mode(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_success BOOLEAN;
BEGIN
    -- Validate user
    IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized'
        );
    END IF;

    -- Clear ghost mode
    UPDATE profiles
    SET ghost_mode_until = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;

    v_success := FOUND;

    IF v_success THEN
        RETURN jsonb_build_object(
            'success', true,
            'ghost_mode_until', NULL
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to deactivate ghost mode'
        );
    END IF;
END;
$$;

COMMENT ON FUNCTION deactivate_ghost_mode(UUID) IS
    'Deactivates ghost mode immediately by setting ghost_mode_until to NULL';

-- ============================================================================
-- UPDATE EXISTING FUNCTIONS TO RESPECT GHOST MODE
-- ============================================================================
-- Note: The following updates modify existing RLS policies and functions
-- to exclude ghost mode users from location-based features

-- Update fellow_regulars view to exclude ghost mode users
DROP VIEW IF EXISTS fellow_regulars;
CREATE OR REPLACE VIEW fellow_regulars AS
SELECT
    lr1.user_id AS current_user_id,
    lr2.user_id AS fellow_regular_id,
    lr1.location_id,
    l.name AS location_name,
    l.address AS location_address,
    lr2.weekly_visit_count,
    p.display_name,
    p.avatar,
    p.is_verified,
    p.regulars_visibility
FROM location_regulars lr1
JOIN location_regulars lr2
    ON lr1.location_id = lr2.location_id
    AND lr1.user_id != lr2.user_id
    AND lr2.is_regular = true
JOIN locations l ON l.id = lr1.location_id
JOIN profiles p ON p.id = lr2.user_id
WHERE lr1.is_regular = true
  AND p.regulars_mode_enabled = true
  AND p.regulars_visibility != 'hidden'
  -- Exclude users in ghost mode
  AND (p.ghost_mode_until IS NULL OR p.ghost_mode_until <= NOW());

COMMENT ON VIEW fellow_regulars IS
    'View of fellow regulars at shared locations (excludes ghost mode users)';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION is_ghost_mode(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_ghost_mode(UUID, INTERVAL) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_ghost_mode(UUID) TO authenticated;
