-- ============================================================================
-- Location Streaks Schema Migration
-- ============================================================================
-- This migration creates tables and functions for tracking location visit streaks.
-- Gamifies user engagement by tracking daily, weekly, and monthly visit patterns.
--
-- Key features:
-- - Tracks streaks per user/location with daily, weekly, monthly granularity
-- - Milestone achievements at 5, 10, 25, 50, 100 visits
-- - Automatic streak updates via trigger on location_visits
-- - View for user's top streaks across all locations
-- ============================================================================

-- ============================================================================
-- LOCATION_STREAKS TABLE
-- ============================================================================
-- Tracks visit streaks per user per location for gamification

CREATE TABLE IF NOT EXISTS location_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    streak_type VARCHAR(20) NOT NULL CHECK (streak_type IN ('daily', 'weekly', 'monthly')),
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_visit_period VARCHAR(20), -- Format: 'YYYY-MM-DD' for daily, 'YYYY-WXX' for weekly, 'YYYY-MM' for monthly
    total_visits INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, location_id, streak_type)
);

-- Comments
COMMENT ON TABLE location_streaks IS 'Tracks visit streaks per user per location for gamification';
COMMENT ON COLUMN location_streaks.streak_type IS 'Type of streak: daily, weekly, or monthly';
COMMENT ON COLUMN location_streaks.current_streak IS 'Current consecutive period count';
COMMENT ON COLUMN location_streaks.longest_streak IS 'All-time longest streak for this user/location';
COMMENT ON COLUMN location_streaks.last_visit_period IS 'Period string of last visit (format depends on streak_type)';
COMMENT ON COLUMN location_streaks.total_visits IS 'Total number of visits to this location';
COMMENT ON COLUMN location_streaks.started_at IS 'When the current streak began';

-- ============================================================================
-- STREAK_MILESTONES TABLE
-- ============================================================================
-- Records milestone achievements for streaks

CREATE TABLE IF NOT EXISTS streak_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    streak_type VARCHAR(20) NOT NULL CHECK (streak_type IN ('daily', 'weekly', 'monthly')),
    milestone INTEGER NOT NULL CHECK (milestone IN (5, 10, 25, 50, 100)),
    achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, location_id, streak_type, milestone)
);

COMMENT ON TABLE streak_milestones IS 'Records milestone achievements for location visit streaks';
COMMENT ON COLUMN streak_milestones.milestone IS 'Milestone value achieved: 5, 10, 25, 50, or 100';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for user's streaks
CREATE INDEX IF NOT EXISTS idx_location_streaks_user_id
    ON location_streaks(user_id);

-- Index for location's streaks
CREATE INDEX IF NOT EXISTS idx_location_streaks_location_id
    ON location_streaks(location_id);

-- Index for top streaks queries
CREATE INDEX IF NOT EXISTS idx_location_streaks_current
    ON location_streaks(current_streak DESC)
    WHERE current_streak > 0;

-- Composite index for user's active streaks
CREATE INDEX IF NOT EXISTS idx_location_streaks_user_active
    ON location_streaks(user_id, current_streak DESC)
    WHERE current_streak > 0;

-- Index for milestones by user
CREATE INDEX IF NOT EXISTS idx_streak_milestones_user_id
    ON streak_milestones(user_id);

-- Index for recent milestones
CREATE INDEX IF NOT EXISTS idx_streak_milestones_achieved_at
    ON streak_milestones(achieved_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE location_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_milestones ENABLE ROW LEVEL SECURITY;

-- Users can view their own streaks
DROP POLICY IF EXISTS "location_streaks_select_own" ON location_streaks;
CREATE POLICY "location_streaks_select_own"
    ON location_streaks
    FOR SELECT
    USING (auth.uid() = user_id);

-- System can insert/update streaks (via trigger)
DROP POLICY IF EXISTS "location_streaks_insert_system" ON location_streaks;
CREATE POLICY "location_streaks_insert_system"
    ON location_streaks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "location_streaks_update_system" ON location_streaks;
CREATE POLICY "location_streaks_update_system"
    ON location_streaks
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can view their own milestones
DROP POLICY IF EXISTS "streak_milestones_select_own" ON streak_milestones;
CREATE POLICY "streak_milestones_select_own"
    ON streak_milestones
    FOR SELECT
    USING (auth.uid() = user_id);

-- System can insert milestones (via trigger)
DROP POLICY IF EXISTS "streak_milestones_insert_system" ON streak_milestones;
CREATE POLICY "streak_milestones_insert_system"
    ON streak_milestones
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTION: Get Previous Period
-- ============================================================================
-- Calculates the previous period string based on streak type

CREATE OR REPLACE FUNCTION get_previous_period(
    p_current_period VARCHAR(20),
    p_streak_type VARCHAR(20)
)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_date DATE;
    v_year INTEGER;
    v_week INTEGER;
BEGIN
    IF p_streak_type = 'daily' THEN
        -- Daily: subtract 1 day
        RETURN to_char((p_current_period::DATE - INTERVAL '1 day')::DATE, 'YYYY-MM-DD');

    ELSIF p_streak_type = 'weekly' THEN
        -- Weekly format: 'YYYY-WXX'
        v_year := SUBSTRING(p_current_period FROM 1 FOR 4)::INTEGER;
        v_week := SUBSTRING(p_current_period FROM 7 FOR 2)::INTEGER;

        IF v_week = 1 THEN
            -- Go to last week of previous year
            v_year := v_year - 1;
            v_week := 52; -- Approximate, some years have 53 weeks
        ELSE
            v_week := v_week - 1;
        END IF;

        RETURN v_year::TEXT || '-W' || LPAD(v_week::TEXT, 2, '0');

    ELSIF p_streak_type = 'monthly' THEN
        -- Monthly: subtract 1 month
        RETURN to_char((p_current_period || '-01')::DATE - INTERVAL '1 month', 'YYYY-MM');
    END IF;

    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION get_previous_period(VARCHAR, VARCHAR) IS
    'Calculates the previous period string based on streak type (daily, weekly, monthly)';

-- ============================================================================
-- FUNCTION: Check Streak Milestone
-- ============================================================================
-- Checks if a streak has reached a milestone and records it

CREATE OR REPLACE FUNCTION check_streak_milestone(
    p_user_id UUID,
    p_location_id UUID,
    p_streak_type VARCHAR(20),
    p_streak_count INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_milestones INTEGER[] := ARRAY[5, 10, 25, 50, 100];
    v_milestone INTEGER;
BEGIN
    FOREACH v_milestone IN ARRAY v_milestones LOOP
        IF p_streak_count = v_milestone THEN
            INSERT INTO streak_milestones (user_id, location_id, streak_type, milestone)
            VALUES (p_user_id, p_location_id, p_streak_type, v_milestone)
            ON CONFLICT (user_id, location_id, streak_type, milestone) DO NOTHING;
            EXIT;
        END IF;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION check_streak_milestone(UUID, UUID, VARCHAR, INTEGER) IS
    'Records milestone achievement when streak reaches 5, 10, 25, 50, or 100';

-- ============================================================================
-- FUNCTION: Update Single Streak
-- ============================================================================
-- Updates a single streak record for a user/location/type combination

CREATE OR REPLACE FUNCTION update_single_streak(
    p_user_id UUID,
    p_location_id UUID,
    p_streak_type VARCHAR(20),
    p_current_period VARCHAR(20)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record location_streaks%ROWTYPE;
    v_prev_period VARCHAR(20);
BEGIN
    -- Get existing streak record
    SELECT * INTO v_record
    FROM location_streaks
    WHERE user_id = p_user_id
      AND location_id = p_location_id
      AND streak_type = p_streak_type;

    -- Calculate previous period
    v_prev_period := get_previous_period(p_current_period, p_streak_type);

    IF v_record IS NULL THEN
        -- First visit - start new streak
        INSERT INTO location_streaks (
            user_id, location_id, streak_type,
            current_streak, longest_streak,
            last_visit_period, total_visits, started_at
        )
        VALUES (
            p_user_id, p_location_id, p_streak_type,
            1, 1,
            p_current_period, 1, NOW()
        );

    ELSIF v_record.last_visit_period = p_current_period THEN
        -- Same period - just increment total visits
        UPDATE location_streaks
        SET total_visits = total_visits + 1,
            updated_at = NOW()
        WHERE id = v_record.id;

    ELSIF v_record.last_visit_period = v_prev_period THEN
        -- Consecutive period - extend streak!
        UPDATE location_streaks
        SET current_streak = current_streak + 1,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            last_visit_period = p_current_period,
            total_visits = total_visits + 1,
            updated_at = NOW()
        WHERE id = v_record.id;

        -- Check for milestone achievement
        PERFORM check_streak_milestone(
            p_user_id,
            p_location_id,
            p_streak_type,
            v_record.current_streak + 1
        );

    ELSE
        -- Streak broken - reset to 1
        UPDATE location_streaks
        SET current_streak = 1,
            last_visit_period = p_current_period,
            total_visits = total_visits + 1,
            started_at = NOW(),
            updated_at = NOW()
        WHERE id = v_record.id;
    END IF;
END;
$$;

COMMENT ON FUNCTION update_single_streak(UUID, UUID, VARCHAR, VARCHAR) IS
    'Updates a streak record for a user/location/type. Extends streak if consecutive, resets if broken.';

-- ============================================================================
-- TRIGGER FUNCTION: Update Location Streak
-- ============================================================================
-- Called after each location_visit insert to update all streak types

CREATE OR REPLACE FUNCTION trigger_update_location_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_daily_period VARCHAR(20);
    v_weekly_period VARCHAR(20);
    v_monthly_period VARCHAR(20);
BEGIN
    -- Calculate current periods from visit timestamp
    v_daily_period := to_char(NEW.visited_at, 'YYYY-MM-DD');
    v_weekly_period := to_char(NEW.visited_at, 'IYYY') || '-W' || to_char(NEW.visited_at, 'IW');
    v_monthly_period := to_char(NEW.visited_at, 'YYYY-MM');

    -- Update daily streak
    PERFORM update_single_streak(NEW.user_id, NEW.location_id, 'daily', v_daily_period);

    -- Update weekly streak
    PERFORM update_single_streak(NEW.user_id, NEW.location_id, 'weekly', v_weekly_period);

    -- Update monthly streak
    PERFORM update_single_streak(NEW.user_id, NEW.location_id, 'monthly', v_monthly_period);

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_update_location_streak() IS
    'Trigger function that updates daily, weekly, and monthly streaks after a location visit';

-- ============================================================================
-- TRIGGER: On Location Visit
-- ============================================================================

CREATE TRIGGER on_location_visit_update_streak
    AFTER INSERT ON location_visits
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_location_streak();

-- ============================================================================
-- VIEW: User Top Streaks
-- ============================================================================
-- Provides easy access to user's active streaks with location details

CREATE OR REPLACE VIEW user_top_streaks AS
SELECT
    ls.id,
    ls.user_id,
    ls.location_id,
    ls.streak_type,
    ls.current_streak,
    ls.longest_streak,
    ls.total_visits,
    ls.last_visit_period,
    ls.started_at,
    ls.updated_at,
    l.name AS location_name,
    l.address AS location_address,
    l.latitude,
    l.longitude
FROM location_streaks ls
JOIN locations l ON l.id = ls.location_id
WHERE ls.current_streak > 0
ORDER BY ls.current_streak DESC;

COMMENT ON VIEW user_top_streaks IS
    'View of user''s active streaks with location details, ordered by current streak';

-- ============================================================================
-- RPC FUNCTION: Get User Streaks
-- ============================================================================
-- Returns all streaks for a user, optionally filtered by location

CREATE OR REPLACE FUNCTION get_user_streaks(
    p_user_id UUID DEFAULT NULL,
    p_location_id UUID DEFAULT NULL,
    p_streak_type VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    location_id UUID,
    streak_type VARCHAR(20),
    current_streak INTEGER,
    longest_streak INTEGER,
    total_visits INTEGER,
    last_visit_period VARCHAR(20),
    started_at TIMESTAMPTZ,
    location_name TEXT,
    location_address TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ls.id,
        ls.user_id,
        ls.location_id,
        ls.streak_type,
        ls.current_streak,
        ls.longest_streak,
        ls.total_visits,
        ls.last_visit_period,
        ls.started_at,
        l.name AS location_name,
        l.address AS location_address
    FROM location_streaks ls
    JOIN locations l ON l.id = ls.location_id
    WHERE ls.user_id = COALESCE(p_user_id, auth.uid())
      AND (p_location_id IS NULL OR ls.location_id = p_location_id)
      AND (p_streak_type IS NULL OR ls.streak_type = p_streak_type)
    ORDER BY ls.current_streak DESC, ls.total_visits DESC;
END;
$$;

COMMENT ON FUNCTION get_user_streaks(UUID, UUID, VARCHAR) IS
    'Returns streaks for a user, optionally filtered by location and/or streak type';

-- ============================================================================
-- RPC FUNCTION: Get User Milestones
-- ============================================================================
-- Returns milestone achievements for a user

CREATE OR REPLACE FUNCTION get_user_milestones(
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    location_id UUID,
    streak_type VARCHAR(20),
    milestone INTEGER,
    achieved_at TIMESTAMPTZ,
    location_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sm.id,
        sm.location_id,
        sm.streak_type,
        sm.milestone,
        sm.achieved_at,
        l.name AS location_name
    FROM streak_milestones sm
    JOIN locations l ON l.id = sm.location_id
    WHERE sm.user_id = COALESCE(p_user_id, auth.uid())
    ORDER BY sm.achieved_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_user_milestones(UUID, INTEGER) IS
    'Returns recent milestone achievements for a user';

-- ============================================================================
-- RPC FUNCTION: Get Location Streak Summary
-- ============================================================================
-- Returns a summary of a user's streak at a specific location

CREATE OR REPLACE FUNCTION get_location_streak_summary(
    p_location_id UUID
)
RETURNS TABLE (
    streak_type VARCHAR(20),
    current_streak INTEGER,
    longest_streak INTEGER,
    total_visits INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ls.streak_type,
        ls.current_streak,
        ls.longest_streak,
        ls.total_visits
    FROM location_streaks ls
    WHERE ls.user_id = auth.uid()
      AND ls.location_id = p_location_id
    ORDER BY
        CASE ls.streak_type
            WHEN 'daily' THEN 1
            WHEN 'weekly' THEN 2
            WHEN 'monthly' THEN 3
        END;
END;
$$;

COMMENT ON FUNCTION get_location_streak_summary(UUID) IS
    'Returns streak summary (daily, weekly, monthly) for a user at a specific location';
