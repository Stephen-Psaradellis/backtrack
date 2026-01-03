-- ============================================================================
-- Spark Notifications Schema Migration
-- ============================================================================
-- This migration adds "Spark" notifications - alerts when someone posts at
-- a location the user frequently visits.
--
-- Key features:
-- - Track frequently visited locations per user
-- - Add spark_notifications preference
-- - Track sent spark notifications (prevent duplicates)
-- - Trigger on new posts to send spark notifications
-- ============================================================================

-- ============================================================================
-- FREQUENT_LOCATIONS TABLE
-- ============================================================================
-- Tracks locations users frequently visit (for spark notification targeting)

CREATE TABLE IF NOT EXISTS frequent_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    visit_count INTEGER NOT NULL DEFAULT 0,
    first_visit_at TIMESTAMPTZ,
    last_visit_at TIMESTAMPTZ,
    last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, location_id)
);

-- Comments
COMMENT ON TABLE frequent_locations IS 'Tracks frequently visited locations for spark notifications';
COMMENT ON COLUMN frequent_locations.visit_count IS 'Number of visits in calculation window (30 days)';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for querying a user's frequent locations
CREATE INDEX IF NOT EXISTS idx_frequent_locations_user_id
    ON frequent_locations(user_id);

-- Index for querying frequent visitors of a location
CREATE INDEX IF NOT EXISTS idx_frequent_locations_location_id
    ON frequent_locations(location_id);

-- Index for high-visit-count locations (spark notification targets)
CREATE INDEX IF NOT EXISTS idx_frequent_locations_visit_count
    ON frequent_locations(visit_count DESC)
    WHERE visit_count >= 3;

-- ============================================================================
-- NOTIFICATION PREFERENCE
-- ============================================================================
-- Add spark notifications preference column

ALTER TABLE notification_preferences
    ADD COLUMN IF NOT EXISTS spark_notifications BOOLEAN DEFAULT true;

COMMENT ON COLUMN notification_preferences.spark_notifications IS
    'Whether user wants spark notifications when someone posts at their frequent locations';

-- ============================================================================
-- SPARK_NOTIFICATIONS_SENT TABLE
-- ============================================================================
-- Track sent spark notifications to prevent duplicates

CREATE TABLE IF NOT EXISTS spark_notifications_sent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

COMMENT ON TABLE spark_notifications_sent IS 'Tracks sent spark notifications to prevent duplicates';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_spark_notifications_sent_user
    ON spark_notifications_sent(user_id);

CREATE INDEX IF NOT EXISTS idx_spark_notifications_sent_post
    ON spark_notifications_sent(post_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE frequent_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE spark_notifications_sent ENABLE ROW LEVEL SECURITY;

-- Users can view their own frequent locations
DROP POLICY IF EXISTS "frequent_locations_select_own" ON frequent_locations;
CREATE POLICY "frequent_locations_select_own"
    ON frequent_locations
    FOR SELECT
    USING (auth.uid() = user_id);

-- System can insert/update frequent locations
DROP POLICY IF EXISTS "frequent_locations_insert_system" ON frequent_locations;
CREATE POLICY "frequent_locations_insert_system"
    ON frequent_locations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "frequent_locations_update_system" ON frequent_locations;
CREATE POLICY "frequent_locations_update_system"
    ON frequent_locations
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can view their own sent notifications
DROP POLICY IF EXISTS "spark_notifications_sent_select_own" ON spark_notifications_sent;
CREATE POLICY "spark_notifications_sent_select_own"
    ON spark_notifications_sent
    FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTION: Refresh Frequent Locations
-- ============================================================================
-- Refreshes the frequent_locations table based on visit data

CREATE OR REPLACE FUNCTION refresh_frequent_locations(
    p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rows_affected INTEGER;
    v_window INTERVAL := INTERVAL '30 days';
    v_min_visits INTEGER := 3;
BEGIN
    -- If user_id provided, only refresh for that user
    IF p_user_id IS NOT NULL THEN
        -- Upsert frequent locations for the user
        INSERT INTO frequent_locations (user_id, location_id, visit_count, first_visit_at, last_visit_at, last_calculated_at)
        SELECT
            p_user_id,
            location_id,
            COUNT(*) as visit_count,
            MIN(visited_at) as first_visit_at,
            MAX(visited_at) as last_visit_at,
            NOW()
        FROM location_visits
        WHERE user_id = p_user_id
          AND visited_at >= NOW() - v_window
        GROUP BY location_id
        HAVING COUNT(*) >= v_min_visits
        ON CONFLICT (user_id, location_id)
        DO UPDATE SET
            visit_count = EXCLUDED.visit_count,
            first_visit_at = EXCLUDED.first_visit_at,
            last_visit_at = EXCLUDED.last_visit_at,
            last_calculated_at = NOW();

        -- Clean up locations that no longer meet the threshold
        DELETE FROM frequent_locations
        WHERE user_id = p_user_id
          AND location_id NOT IN (
              SELECT location_id
              FROM location_visits
              WHERE user_id = p_user_id
                AND visited_at >= NOW() - v_window
              GROUP BY location_id
              HAVING COUNT(*) >= v_min_visits
          );
    ELSE
        -- Refresh all users (for scheduled job)
        INSERT INTO frequent_locations (user_id, location_id, visit_count, first_visit_at, last_visit_at, last_calculated_at)
        SELECT
            user_id,
            location_id,
            COUNT(*) as visit_count,
            MIN(visited_at) as first_visit_at,
            MAX(visited_at) as last_visit_at,
            NOW()
        FROM location_visits
        WHERE visited_at >= NOW() - v_window
        GROUP BY user_id, location_id
        HAVING COUNT(*) >= v_min_visits
        ON CONFLICT (user_id, location_id)
        DO UPDATE SET
            visit_count = EXCLUDED.visit_count,
            first_visit_at = EXCLUDED.first_visit_at,
            last_visit_at = EXCLUDED.last_visit_at,
            last_calculated_at = NOW();

        -- Clean up old entries
        DELETE FROM frequent_locations
        WHERE last_calculated_at < NOW() - v_window;
    END IF;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$$;

COMMENT ON FUNCTION refresh_frequent_locations(UUID) IS
    'Refreshes frequent_locations based on 30-day visit data. Pass user_id for single user, NULL for all.';

-- ============================================================================
-- FUNCTION: Get Spark Notification Recipients
-- ============================================================================
-- Returns users who should receive spark notifications for a new post

CREATE OR REPLACE FUNCTION get_spark_notification_recipients(
    p_post_id UUID,
    p_location_id UUID,
    p_producer_id UUID
)
RETURNS TABLE (
    user_id UUID,
    location_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        fl.user_id,
        l.name as location_name
    FROM frequent_locations fl
    INNER JOIN locations l ON l.id = fl.location_id
    INNER JOIN notification_preferences np ON np.user_id = fl.user_id
    WHERE fl.location_id = p_location_id
      AND fl.user_id != p_producer_id  -- Don't notify post creator
      AND fl.visit_count >= 3
      AND fl.last_calculated_at >= NOW() - INTERVAL '7 days'  -- Recent calculation
      AND (np.spark_notifications IS NULL OR np.spark_notifications = true)
      AND NOT EXISTS (
          -- Don't notify if already sent for this post
          SELECT 1 FROM spark_notifications_sent sns
          WHERE sns.user_id = fl.user_id AND sns.post_id = p_post_id
      )
      AND NOT EXISTS (
          -- Don't notify if user blocked post creator
          SELECT 1 FROM blocks b
          WHERE b.blocker_id = fl.user_id AND b.blocked_id = p_producer_id
      );
END;
$$;

COMMENT ON FUNCTION get_spark_notification_recipients(UUID, UUID, UUID) IS
    'Returns users who should receive spark notifications for a new post at a location';

-- ============================================================================
-- FUNCTION: Record Spark Notification Sent
-- ============================================================================
-- Records that a spark notification was sent to prevent duplicates

CREATE OR REPLACE FUNCTION record_spark_notification_sent(
    p_user_ids UUID[],
    p_post_id UUID,
    p_location_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_count INTEGER := 0;
BEGIN
    FOREACH v_user_id IN ARRAY p_user_ids LOOP
        INSERT INTO spark_notifications_sent (user_id, post_id, location_id)
        VALUES (v_user_id, p_post_id, p_location_id)
        ON CONFLICT (user_id, post_id) DO NOTHING;
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION record_spark_notification_sent(UUID[], UUID, UUID) IS
    'Records spark notifications as sent for a list of users';

-- ============================================================================
-- FUNCTION: Check Spark Notification Preference
-- ============================================================================
-- Helper to check if user has spark notifications enabled

CREATE OR REPLACE FUNCTION is_spark_notification_enabled(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    SELECT COALESCE(spark_notifications, true)
    INTO v_enabled
    FROM notification_preferences
    WHERE user_id = p_user_id;

    -- Default to true if no preference record exists
    RETURN COALESCE(v_enabled, true);
END;
$$;

COMMENT ON FUNCTION is_spark_notification_enabled(UUID) IS
    'Returns whether user has spark notifications enabled (defaults to true)';

-- ============================================================================
-- TRIGGER: Update Frequent Locations on Visit
-- ============================================================================
-- Incrementally updates frequent_locations when a visit is recorded

CREATE OR REPLACE FUNCTION trigger_update_frequent_locations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Upsert the frequent location record
    INSERT INTO frequent_locations (user_id, location_id, visit_count, first_visit_at, last_visit_at, last_calculated_at)
    VALUES (NEW.user_id, NEW.location_id, 1, NEW.visited_at, NEW.visited_at, NOW())
    ON CONFLICT (user_id, location_id)
    DO UPDATE SET
        visit_count = frequent_locations.visit_count + 1,
        last_visit_at = NEW.visited_at,
        last_calculated_at = NOW();

    RETURN NEW;
END;
$$;

-- Create trigger on location_visits
DROP TRIGGER IF EXISTS on_location_visit_update_frequent ON location_visits;
CREATE TRIGGER on_location_visit_update_frequent
    AFTER INSERT ON location_visits
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_frequent_locations();

COMMENT ON FUNCTION trigger_update_frequent_locations() IS
    'Updates frequent_locations incrementally when a visit is recorded';

-- ============================================================================
-- TRIGGER: Send Spark Notification on Post
-- ============================================================================
-- Triggers spark notification edge function when a new post is created

CREATE OR REPLACE FUNCTION trigger_spark_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_edge_function_url TEXT;
    v_service_role_key TEXT;
    v_request_id BIGINT;
BEGIN
    -- Only fire for new posts with a location
    IF NEW.location_id IS NOT NULL THEN
        -- Get configuration
        SELECT value INTO v_edge_function_url
        FROM app_configuration
        WHERE key = 'spark_notification_url';

        SELECT value INTO v_service_role_key
        FROM app_configuration
        WHERE key = 'service_role_key';

        -- Call edge function via pg_net if configured
        IF v_edge_function_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
            SELECT net.http_post(
                url := v_edge_function_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || v_service_role_key
                ),
                body := jsonb_build_object(
                    'post_id', NEW.id,
                    'location_id', NEW.location_id,
                    'producer_id', NEW.producer_id
                )
            ) INTO v_request_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger (disabled by default - enable when edge function is deployed)
DROP TRIGGER IF EXISTS on_post_created_spark ON posts;
-- CREATE TRIGGER on_post_created_spark
--     AFTER INSERT ON posts
--     FOR EACH ROW
--     EXECUTE FUNCTION trigger_spark_notification();

COMMENT ON FUNCTION trigger_spark_notification() IS
    'Triggers spark notification edge function when a new post is created. Enable trigger when edge function is deployed.';

-- ============================================================================
-- APP CONFIGURATION
-- ============================================================================
-- Add spark notification URL configuration

INSERT INTO app_configuration (key, value, description)
VALUES ('spark_notification_url', '', 'URL for spark notification edge function')
ON CONFLICT (key) DO NOTHING;
