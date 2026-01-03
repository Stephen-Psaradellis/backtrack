-- ============================================================================
-- Performance Indexes Migration Part 2
-- ============================================================================
-- Continuation after partial application
-- ============================================================================

-- ============================================================================
-- 8. LOCATION_VISITS TABLE
-- ============================================================================

-- Index on created_at for efficient time-based queries and cleanup
CREATE INDEX IF NOT EXISTS idx_location_visits_created
    ON location_visits(created_at DESC);

-- ============================================================================
-- 9. LOCATION_STREAKS TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location_streaks') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_location_streaks_user_type
            ON location_streaks(user_id, streak_type)';

        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_location_streaks_location_current
            ON location_streaks(location_id, current_streak DESC)';
    END IF;
END $$;

-- ============================================================================
-- 10. EXPO_PUSH_TOKENS TABLE
-- ============================================================================

-- Find tokens by user for notification sending
CREATE INDEX IF NOT EXISTS idx_expo_push_tokens_user
    ON expo_push_tokens(user_id);

-- ============================================================================
-- 11. MATCH_NOTIFICATIONS TABLE
-- ============================================================================

-- Find pending notifications for user
CREATE INDEX IF NOT EXISTS idx_match_notifications_user_sent
    ON match_notifications(user_id, sent_at)
    WHERE sent_at IS NULL;

-- ============================================================================
-- 12. PHOTO_SHARES TABLE
-- ============================================================================

-- Find shares by conversation
CREATE INDEX IF NOT EXISTS idx_photo_shares_conversation
    ON photo_shares(conversation_id, created_at DESC);

-- Find shares by owner
CREATE INDEX IF NOT EXISTS idx_photo_shares_owner
    ON photo_shares(owner_id, created_at DESC);

-- ============================================================================
-- 13. FAVORITE_LOCATIONS TABLE
-- ============================================================================

-- Find user's favorites
CREATE INDEX IF NOT EXISTS idx_favorite_locations_user
    ON favorite_locations(user_id, created_at DESC);

-- ============================================================================
-- 14. EVENTS TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        -- Find events by date (used for upcoming events queries)
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_events_date
            ON events(date_time DESC)';

        -- Find events by platform
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_events_platform_date
            ON events(platform, date_time DESC)';
    END IF;
END $$;

-- ============================================================================
-- 15. REGULARS MODE INDEXES (if tables exist)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location_regulars') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_location_regulars_user_location
            ON location_regulars(user_id, location_id)';

        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_location_regulars_location_regular
            ON location_regulars(location_id)
            WHERE is_regular = true';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'regulars_connections') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_regulars_connections_user_a
            ON regulars_connections(user_a_id, discovered_at DESC)';

        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_regulars_connections_user_b
            ON regulars_connections(user_b_id, discovered_at DESC)';
    END IF;
END $$;
