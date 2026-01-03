-- ============================================================================
-- Regulars Mode Schema Migration
-- ============================================================================
-- This migration adds "Regulars Mode" - connecting people who frequent the
-- same spots weekly. Users can discover and optionally connect with other
-- regulars at their favorite locations.
--
-- Key features:
-- - Opt-out (enabled by default per user decision)
-- - Visibility controls: public, mutual, hidden
-- - Track "regular" status at locations (2+ visits in 4 weeks)
-- - Find fellow regulars at shared locations
-- ============================================================================

-- ============================================================================
-- PROFILE COLUMNS
-- ============================================================================
-- Add regulars mode settings to profiles

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS regulars_mode_enabled BOOLEAN DEFAULT true;

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS regulars_visibility VARCHAR(20) DEFAULT 'mutual'
    CHECK (regulars_visibility IN ('public', 'mutual', 'hidden'));

COMMENT ON COLUMN profiles.regulars_mode_enabled IS
    'Whether user participates in regulars mode (opt-out, enabled by default)';
COMMENT ON COLUMN profiles.regulars_visibility IS
    'Visibility setting: public (visible to all), mutual (visible to other regulars), hidden';

-- ============================================================================
-- LOCATION_REGULARS TABLE
-- ============================================================================
-- Tracks regular visitors at each location

CREATE TABLE IF NOT EXISTS location_regulars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    weekly_visit_count INTEGER NOT NULL DEFAULT 0,
    first_visit_at TIMESTAMPTZ,
    last_visit_at TIMESTAMPTZ,
    is_regular BOOLEAN NOT NULL DEFAULT false,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, location_id)
);

-- Comments
COMMENT ON TABLE location_regulars IS
    'Tracks regular visitors at locations based on weekly visit patterns';
COMMENT ON COLUMN location_regulars.weekly_visit_count IS
    'Number of distinct weeks with visits in past 4 weeks';
COMMENT ON COLUMN location_regulars.is_regular IS
    'True if user visited 2+ distinct weeks in past 4 weeks';

-- ============================================================================
-- REGULARS_CONNECTIONS TABLE
-- ============================================================================
-- Tracks mutual regular connections at locations

CREATE TABLE IF NOT EXISTS regulars_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_a_viewed BOOLEAN DEFAULT false,
    user_b_viewed BOOLEAN DEFAULT false,
    UNIQUE(user_a_id, user_b_id, location_id),
    CHECK (user_a_id < user_b_id) -- Ensure consistent ordering
);

COMMENT ON TABLE regulars_connections IS
    'Tracks mutual regular connections at shared locations';
COMMENT ON COLUMN regulars_connections.user_a_viewed IS
    'Whether user_a has seen this connection';
COMMENT ON COLUMN regulars_connections.user_b_viewed IS
    'Whether user_b has seen this connection';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Location regulars indexes
CREATE INDEX IF NOT EXISTS idx_location_regulars_user_id
    ON location_regulars(user_id);

CREATE INDEX IF NOT EXISTS idx_location_regulars_location_id
    ON location_regulars(location_id);

CREATE INDEX IF NOT EXISTS idx_location_regulars_is_regular
    ON location_regulars(location_id)
    WHERE is_regular = true;

-- Regulars connections indexes
CREATE INDEX IF NOT EXISTS idx_regulars_connections_user_a
    ON regulars_connections(user_a_id);

CREATE INDEX IF NOT EXISTS idx_regulars_connections_user_b
    ON regulars_connections(user_b_id);

CREATE INDEX IF NOT EXISTS idx_regulars_connections_location
    ON regulars_connections(location_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE location_regulars ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulars_connections ENABLE ROW LEVEL SECURITY;

-- Users can view regulars at locations they're also regular at
DROP POLICY IF EXISTS "location_regulars_select" ON location_regulars;
CREATE POLICY "location_regulars_select"
    ON location_regulars
    FOR SELECT
    USING (
        -- Own records
        auth.uid() = user_id
        OR
        -- Other regulars at locations where current user is also a regular
        (
            is_regular = true
            AND EXISTS (
                SELECT 1 FROM location_regulars lr2
                WHERE lr2.location_id = location_regulars.location_id
                  AND lr2.user_id = auth.uid()
                  AND lr2.is_regular = true
            )
            AND EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.id = location_regulars.user_id
                  AND p.regulars_mode_enabled = true
                  AND p.regulars_visibility != 'hidden'
            )
        )
    );

-- System can insert/update
DROP POLICY IF EXISTS "location_regulars_insert_system" ON location_regulars;
CREATE POLICY "location_regulars_insert_system"
    ON location_regulars
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "location_regulars_update_system" ON location_regulars;
CREATE POLICY "location_regulars_update_system"
    ON location_regulars
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can view their own connections
DROP POLICY IF EXISTS "regulars_connections_select" ON regulars_connections;
CREATE POLICY "regulars_connections_select"
    ON regulars_connections
    FOR SELECT
    USING (
        auth.uid() = user_a_id OR auth.uid() = user_b_id
    );

-- Users can update their own viewed status
DROP POLICY IF EXISTS "regulars_connections_update" ON regulars_connections;
CREATE POLICY "regulars_connections_update"
    ON regulars_connections
    FOR UPDATE
    USING (
        auth.uid() = user_a_id OR auth.uid() = user_b_id
    );

-- ============================================================================
-- VIEW: Fellow Regulars
-- ============================================================================
-- Shows other regulars at locations where current user is also a regular

CREATE OR REPLACE VIEW fellow_regulars AS
SELECT
    lr1.user_id AS current_user_id,
    lr2.user_id AS fellow_regular_id,
    lr1.location_id,
    l.name AS location_name,
    l.address AS location_address,
    lr2.weekly_visit_count,
    p.display_name,
    p.own_avatar,
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
  AND p.regulars_visibility != 'hidden';

COMMENT ON VIEW fellow_regulars IS
    'View of fellow regulars at shared locations';

-- ============================================================================
-- FUNCTION: Refresh Location Regulars
-- ============================================================================
-- Refreshes the location_regulars table based on visit data

CREATE OR REPLACE FUNCTION refresh_location_regulars()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rows_affected INTEGER;
    v_window INTERVAL := INTERVAL '4 weeks';
    v_min_weeks INTEGER := 2;
BEGIN
    -- Update location_regulars based on weekly visit patterns
    INSERT INTO location_regulars (
        user_id, location_id, weekly_visit_count,
        first_visit_at, last_visit_at, is_regular, calculated_at
    )
    SELECT
        user_id,
        location_id,
        COUNT(DISTINCT date_trunc('week', visited_at)) as weekly_visit_count,
        MIN(visited_at) as first_visit_at,
        MAX(visited_at) as last_visit_at,
        COUNT(DISTINCT date_trunc('week', visited_at)) >= v_min_weeks as is_regular,
        NOW()
    FROM location_visits
    WHERE visited_at >= NOW() - v_window
    GROUP BY user_id, location_id
    ON CONFLICT (user_id, location_id)
    DO UPDATE SET
        weekly_visit_count = EXCLUDED.weekly_visit_count,
        first_visit_at = EXCLUDED.first_visit_at,
        last_visit_at = EXCLUDED.last_visit_at,
        is_regular = EXCLUDED.is_regular,
        calculated_at = NOW();

    -- Create connections for mutual regulars
    INSERT INTO regulars_connections (user_a_id, user_b_id, location_id)
    SELECT DISTINCT
        LEAST(lr1.user_id, lr2.user_id) as user_a_id,
        GREATEST(lr1.user_id, lr2.user_id) as user_b_id,
        lr1.location_id
    FROM location_regulars lr1
    JOIN location_regulars lr2
        ON lr1.location_id = lr2.location_id
        AND lr1.user_id < lr2.user_id
    JOIN profiles p1 ON p1.id = lr1.user_id AND p1.regulars_mode_enabled = true
    JOIN profiles p2 ON p2.id = lr2.user_id AND p2.regulars_mode_enabled = true
    WHERE lr1.is_regular = true
      AND lr2.is_regular = true
    ON CONFLICT (user_a_id, user_b_id, location_id) DO NOTHING;

    -- Clean up old entries where user is no longer a regular
    DELETE FROM location_regulars
    WHERE calculated_at < NOW() - v_window
      AND is_regular = false;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$$;

COMMENT ON FUNCTION refresh_location_regulars() IS
    'Refreshes location_regulars and creates connections for mutual regulars';

-- ============================================================================
-- FUNCTION: Get Fellow Regulars
-- ============================================================================
-- Returns fellow regulars for a user with privacy filtering

CREATE OR REPLACE FUNCTION get_fellow_regulars(
    p_user_id UUID,
    p_location_id UUID DEFAULT NULL
)
RETURNS TABLE (
    fellow_user_id UUID,
    display_name TEXT,
    own_avatar JSONB,
    is_verified BOOLEAN,
    location_id UUID,
    location_name TEXT,
    shared_weeks INTEGER,
    visibility VARCHAR(20)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_user_regulars_enabled BOOLEAN;
BEGIN
    -- Check if requesting user has regulars mode enabled
    SELECT regulars_mode_enabled INTO v_user_regulars_enabled
    FROM profiles
    WHERE id = p_user_id;

    IF NOT COALESCE(v_user_regulars_enabled, true) THEN
        RETURN; -- Return empty if user has disabled regulars mode
    END IF;

    RETURN QUERY
    SELECT
        fr.fellow_regular_id,
        fr.display_name,
        fr.own_avatar,
        fr.is_verified,
        fr.location_id,
        fr.location_name,
        fr.weekly_visit_count as shared_weeks,
        fr.regulars_visibility as visibility
    FROM fellow_regulars fr
    WHERE fr.current_user_id = p_user_id
      AND (p_location_id IS NULL OR fr.location_id = p_location_id)
      AND (
          -- Public visibility: visible to all regulars
          fr.regulars_visibility = 'public'
          OR
          -- Mutual visibility: visible only if there's a connection
          (fr.regulars_visibility = 'mutual' AND EXISTS (
              SELECT 1 FROM regulars_connections rc
              WHERE rc.location_id = fr.location_id
                AND (
                    (rc.user_a_id = p_user_id AND rc.user_b_id = fr.fellow_regular_id)
                    OR (rc.user_b_id = p_user_id AND rc.user_a_id = fr.fellow_regular_id)
                )
          ))
      )
    ORDER BY fr.weekly_visit_count DESC, fr.location_name;
END;
$$;

COMMENT ON FUNCTION get_fellow_regulars(UUID, UUID) IS
    'Returns fellow regulars for a user with privacy filtering';

-- ============================================================================
-- FUNCTION: Get Location Regulars
-- ============================================================================
-- Returns regulars at a specific location

CREATE OR REPLACE FUNCTION get_location_regulars(
    p_location_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    own_avatar JSONB,
    is_verified BOOLEAN,
    weekly_visit_count INTEGER,
    visibility VARCHAR(20)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_is_regular BOOLEAN;
BEGIN
    -- Check if current user is a regular at this location
    SELECT is_regular INTO v_current_user_is_regular
    FROM location_regulars
    WHERE location_id = p_location_id AND user_id = auth.uid();

    -- If current user is not a regular, only show count
    IF NOT COALESCE(v_current_user_is_regular, false) THEN
        RETURN; -- Return empty - caller should use count function instead
    END IF;

    RETURN QUERY
    SELECT
        lr.user_id,
        p.display_name,
        p.own_avatar,
        p.is_verified,
        lr.weekly_visit_count,
        p.regulars_visibility as visibility
    FROM location_regulars lr
    JOIN profiles p ON p.id = lr.user_id
    WHERE lr.location_id = p_location_id
      AND lr.is_regular = true
      AND lr.user_id != auth.uid()
      AND p.regulars_mode_enabled = true
      AND p.regulars_visibility != 'hidden'
    ORDER BY lr.weekly_visit_count DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_location_regulars(UUID, INTEGER) IS
    'Returns regulars at a location (only if current user is also a regular)';

-- ============================================================================
-- FUNCTION: Get Location Regulars Count
-- ============================================================================
-- Returns count of regulars at a location (for display when user is not a regular)

CREATE OR REPLACE FUNCTION get_location_regulars_count(
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
    FROM location_regulars lr
    JOIN profiles p ON p.id = lr.user_id
    WHERE lr.location_id = p_location_id
      AND lr.is_regular = true
      AND p.regulars_mode_enabled = true
      AND p.regulars_visibility != 'hidden';

    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION get_location_regulars_count(UUID) IS
    'Returns count of regulars at a location';

-- ============================================================================
-- FUNCTION: Toggle Regulars Mode
-- ============================================================================
-- Toggles regulars mode for a user

CREATE OR REPLACE FUNCTION toggle_regulars_mode(
    p_user_id UUID,
    p_enabled BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_state BOOLEAN;
BEGIN
    IF p_enabled IS NULL THEN
        -- Toggle current state
        UPDATE profiles
        SET regulars_mode_enabled = NOT regulars_mode_enabled
        WHERE id = p_user_id
        RETURNING regulars_mode_enabled INTO v_new_state;
    ELSE
        -- Set to specific value
        UPDATE profiles
        SET regulars_mode_enabled = p_enabled
        WHERE id = p_user_id
        RETURNING regulars_mode_enabled INTO v_new_state;
    END IF;

    RETURN v_new_state;
END;
$$;

COMMENT ON FUNCTION toggle_regulars_mode(UUID, BOOLEAN) IS
    'Toggles or sets regulars mode for a user';

-- ============================================================================
-- FUNCTION: Set Regulars Visibility
-- ============================================================================
-- Sets visibility preference for regulars mode

CREATE OR REPLACE FUNCTION set_regulars_visibility(
    p_user_id UUID,
    p_visibility VARCHAR(20)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_visibility NOT IN ('public', 'mutual', 'hidden') THEN
        RAISE EXCEPTION 'Invalid visibility: %', p_visibility;
    END IF;

    UPDATE profiles
    SET regulars_visibility = p_visibility
    WHERE id = p_user_id;

    RETURN true;
END;
$$;

COMMENT ON FUNCTION set_regulars_visibility(UUID, VARCHAR) IS
    'Sets regulars visibility preference (public, mutual, hidden)';

-- ============================================================================
-- FUNCTION: Mark Connection Viewed
-- ============================================================================
-- Marks a regulars connection as viewed by the current user

CREATE OR REPLACE FUNCTION mark_regulars_connection_viewed(
    p_connection_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE regulars_connections
    SET user_a_viewed = CASE WHEN user_a_id = auth.uid() THEN true ELSE user_a_viewed END,
        user_b_viewed = CASE WHEN user_b_id = auth.uid() THEN true ELSE user_b_viewed END
    WHERE id = p_connection_id
      AND (user_a_id = auth.uid() OR user_b_id = auth.uid());

    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION mark_regulars_connection_viewed(UUID) IS
    'Marks a regulars connection as viewed by the current user';

-- ============================================================================
-- SCHEDULED JOB PLACEHOLDER
-- ============================================================================
-- Note: Enable pg_cron extension and schedule this for daily execution

-- SELECT cron.schedule(
--     'refresh-regulars-daily',
--     '0 6 * * *',  -- Run at 6 AM daily
--     'SELECT refresh_location_regulars()'
-- );
