-- ============================================================================
-- Walk-by Radar Proximity Notifications Migration
-- ============================================================================
-- This migration adds "Walk-by Radar" - a proximity notification feature that
-- alerts users when they pass near others who had recent location visits.
--
-- Key features:
-- - Detect nearby users within configurable radius (default 200m)
-- - Record proximity encounters with location and distance
-- - Respect privacy: excludes ghost mode and radar-disabled users
-- - Rate limiting: max 1 encounter notification per pair per day
-- - Encounter types: walkby, same_venue, repeated
-- ============================================================================

-- ============================================================================
-- PROXIMITY_ENCOUNTERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS proximity_encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    encountered_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    latitude FLOAT8 NOT NULL,
    longitude FLOAT8 NOT NULL,
    distance_meters FLOAT8 NOT NULL,
    encounter_type TEXT NOT NULL CHECK (encounter_type IN ('walkby', 'same_venue', 'repeated')),
    notified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: max 1 encounter per pair per day
    CONSTRAINT unique_daily_encounter UNIQUE (user_id, encountered_user_id, DATE(created_at))
);

COMMENT ON TABLE proximity_encounters IS
    'Records proximity encounters between users for walk-by radar notifications';

COMMENT ON COLUMN proximity_encounters.user_id IS
    'The user who is being notified about the encounter';

COMMENT ON COLUMN proximity_encounters.encountered_user_id IS
    'The user who was encountered nearby';

COMMENT ON COLUMN proximity_encounters.location_id IS
    'The location where encounter happened (nullable)';

COMMENT ON COLUMN proximity_encounters.encounter_type IS
    'Type: walkby (passed nearby), same_venue (at same location), repeated (multiple encounters)';

COMMENT ON COLUMN proximity_encounters.notified IS
    'Whether a notification was sent for this encounter';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_proximity_encounters_user_id_created_at
    ON proximity_encounters(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proximity_encounters_encountered_user_id_created_at
    ON proximity_encounters(encountered_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proximity_encounters_created_at
    ON proximity_encounters(created_at DESC);

-- ============================================================================
-- PROFILE COLUMNS FOR RADAR SETTINGS
-- ============================================================================

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS radar_enabled BOOLEAN DEFAULT true;

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS radar_radius_meters INT DEFAULT 200;

COMMENT ON COLUMN profiles.radar_enabled IS
    'Whether walk-by radar is enabled for this user';

COMMENT ON COLUMN profiles.radar_radius_meters IS
    'Radar detection radius in meters (default 200m)';

CREATE INDEX IF NOT EXISTS idx_profiles_radar_enabled
    ON profiles(radar_enabled)
    WHERE radar_enabled = true;

-- ============================================================================
-- FUNCTION: Check Nearby Users
-- ============================================================================
-- Finds users who had recent location visits within radius

CREATE OR REPLACE FUNCTION check_nearby_users(
    p_user_id UUID,
    p_lat FLOAT8,
    p_lng FLOAT8,
    p_radius INT DEFAULT 200
)
RETURNS TABLE(
    user_id UUID,
    distance FLOAT8,
    location_id UUID,
    location_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        vh.user_id,
        (
            6371000 * acos(
                LEAST(1.0, GREATEST(-1.0,
                    cos(radians(p_lat)) * cos(radians(l.latitude)) *
                    cos(radians(l.longitude) - radians(p_lng)) +
                    sin(radians(p_lat)) * sin(radians(l.latitude))
                ))
            )
        ) AS distance,
        vh.location_id,
        l.name AS location_name
    FROM location_visit_history vh
    JOIN locations l ON l.id = vh.location_id
    JOIN profiles p ON p.id = vh.user_id
    LEFT JOIN blocks b1 ON b1.blocker_id = p_user_id AND b1.blocked_id = vh.user_id
    LEFT JOIN blocks b2 ON b2.blocker_id = vh.user_id AND b2.blocked_id = p_user_id
    WHERE
        -- Recent visits (within last 30 minutes)
        vh.visited_at >= NOW() - INTERVAL '30 minutes'
        -- Not self
        AND vh.user_id != p_user_id
        -- Within radius
        AND (
            6371000 * acos(
                LEAST(1.0, GREATEST(-1.0,
                    cos(radians(p_lat)) * cos(radians(l.latitude)) *
                    cos(radians(l.longitude) - radians(p_lng)) +
                    sin(radians(p_lat)) * sin(radians(l.latitude))
                ))
            )
        ) <= p_radius
        -- Not blocked
        AND b1.id IS NULL
        AND b2.id IS NULL
        -- Radar enabled
        AND p.radar_enabled = true
        -- Not in ghost mode
        AND (p.ghost_mode_until IS NULL OR p.ghost_mode_until <= NOW())
    ORDER BY distance
    LIMIT 10;
END;
$$;

COMMENT ON FUNCTION check_nearby_users(UUID, FLOAT8, FLOAT8, INT) IS
    'Finds users with recent location visits within radius, excluding blocked and ghost mode users';

-- ============================================================================
-- FUNCTION: Record Proximity Encounter
-- ============================================================================

CREATE OR REPLACE FUNCTION record_proximity_encounter(
    p_user_id UUID,
    p_encountered_user_id UUID,
    p_lat FLOAT8,
    p_lng FLOAT8,
    p_distance FLOAT8,
    p_location_id UUID DEFAULT NULL,
    p_encounter_type TEXT DEFAULT 'walkby'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_encounter_id UUID;
    v_existing_count INT;
BEGIN
    -- Validate encounter type
    IF p_encounter_type NOT IN ('walkby', 'same_venue', 'repeated') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid encounter type'
        );
    END IF;

    -- Check if encounter already recorded today
    SELECT COUNT(*) INTO v_existing_count
    FROM proximity_encounters
    WHERE user_id = p_user_id
      AND encountered_user_id = p_encountered_user_id
      AND DATE(created_at) = CURRENT_DATE;

    IF v_existing_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Encounter already recorded today',
            'already_recorded', true
        );
    END IF;

    -- Insert encounter record
    INSERT INTO proximity_encounters (
        user_id,
        encountered_user_id,
        location_id,
        latitude,
        longitude,
        distance_meters,
        encounter_type,
        notified
    )
    VALUES (
        p_user_id,
        p_encountered_user_id,
        p_location_id,
        p_lat,
        p_lng,
        p_distance,
        p_encounter_type,
        false
    )
    RETURNING id INTO v_encounter_id;

    RETURN jsonb_build_object(
        'success', true,
        'encounter_id', v_encounter_id
    );
END;
$$;

COMMENT ON FUNCTION record_proximity_encounter IS
    'Records a proximity encounter between two users (max 1 per pair per day)';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE proximity_encounters ENABLE ROW LEVEL SECURITY;

-- Users can only read their own encounters
CREATE POLICY select_own_encounters ON proximity_encounters
    FOR SELECT
    USING (auth.uid() = user_id);

-- System can insert encounters (via RPC functions)
CREATE POLICY insert_encounters_via_rpc ON proximity_encounters
    FOR INSERT
    WITH CHECK (true);

-- Users can update notification status on their own encounters
CREATE POLICY update_own_encounters ON proximity_encounters
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION check_nearby_users(UUID, FLOAT8, FLOAT8, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_proximity_encounter(UUID, UUID, FLOAT8, FLOAT8, FLOAT8, UUID, TEXT) TO authenticated;
GRANT SELECT, INSERT, UPDATE ON proximity_encounters TO authenticated;
