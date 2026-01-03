-- ============================================================================
-- Performance Indexes Migration
-- ============================================================================
-- Critical database indexes for production performance
-- Based on analysis of common query patterns
-- ============================================================================

-- ============================================================================
-- 1. CONVERSATIONS TABLE - Status-Based Indexes
-- ============================================================================

-- Composite index for frequently filtered status queries with producer context
CREATE INDEX IF NOT EXISTS idx_conversations_producer_status
    ON conversations(producer_id, status)
    WHERE status IN ('pending', 'active');

CREATE INDEX IF NOT EXISTS idx_conversations_consumer_status
    ON conversations(consumer_id, status)
    WHERE status IN ('pending', 'active');

-- For listing active conversations by timestamp
CREATE INDEX IF NOT EXISTS idx_conversations_producer_status_updated
    ON conversations(producer_id, status, updated_at DESC)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_conversations_consumer_status_updated
    ON conversations(consumer_id, status, updated_at DESC)
    WHERE status = 'active';

-- ============================================================================
-- 2. MESSAGES TABLE - Unread Message Indexes
-- ============================================================================

-- Count unread messages by conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_unread
    ON messages(conversation_id, is_read)
    WHERE is_read = FALSE;

-- Get unread messages with timestamp for ordering
CREATE INDEX IF NOT EXISTS idx_messages_conversation_unread_created
    ON messages(conversation_id, created_at DESC)
    WHERE is_read = FALSE;

-- ============================================================================
-- 3. POSTS TABLE - Active Post Indexes
-- ============================================================================

-- Producer viewing their own posts (active/inactive)
CREATE INDEX IF NOT EXISTS idx_posts_producer_is_active
    ON posts(producer_id, is_active, created_at DESC);

-- Filtering active posts by location (common for map display)
CREATE INDEX IF NOT EXISTS idx_posts_location_is_active_created
    ON posts(location_id, is_active, created_at DESC)
    WHERE is_active = true;

-- Expired post deactivation queries (for cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_posts_expires_active
    ON posts(expires_at)
    WHERE is_active = true;

-- Pagination on posts by creation date
CREATE INDEX IF NOT EXISTS idx_posts_created_pagination
    ON posts(created_at DESC, id DESC)
    WHERE is_active = true;

-- ============================================================================
-- 4. NOTIFICATIONS TABLE
-- ============================================================================

-- Get unread notifications for a user
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, is_read)
    WHERE is_read = FALSE;

-- Get notifications by type for user
CREATE INDEX IF NOT EXISTS idx_notifications_user_type
    ON notifications(user_id, type, created_at DESC);

-- ============================================================================
-- 5. PROFILE_PHOTOS TABLE
-- ============================================================================

-- Find approved photos by user
CREATE INDEX IF NOT EXISTS idx_profile_photos_user_approved
    ON profile_photos(user_id, is_primary)
    WHERE moderation_status = 'approved';

-- Find pending moderation photos
CREATE INDEX IF NOT EXISTS idx_profile_photos_pending_moderation
    ON profile_photos(created_at)
    WHERE moderation_status = 'pending';

-- ============================================================================
-- 6. BLOCKS TABLE
-- ============================================================================

-- Check mutual blocks efficiently
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_blocked
    ON blocks(blocker_id, blocked_id);

-- Reverse lookup for blocking
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_blocker
    ON blocks(blocked_id, blocker_id);

-- ============================================================================
-- 7. REPORTS TABLE (for moderation dashboard)
-- ============================================================================

-- Pending reports for moderation
CREATE INDEX IF NOT EXISTS idx_reports_status_created
    ON reports(status, created_at DESC)
    WHERE status = 'pending';

-- ============================================================================
-- 8. LOCATION_VISITS TABLE
-- ============================================================================

-- User's recent visits
CREATE INDEX IF NOT EXISTS idx_location_visits_user_created
    ON location_visits(user_id, created_at DESC);

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

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON INDEX idx_conversations_producer_status IS
'Optimizes queries filtering conversations by producer and status';

COMMENT ON INDEX idx_messages_conversation_unread IS
'Optimizes unread message count queries per conversation';

COMMENT ON INDEX idx_posts_location_is_active_created IS
'Optimizes map display queries showing active posts at locations';

COMMENT ON INDEX idx_blocks_blocker_blocked IS
'Optimizes block checking in RLS policies';
