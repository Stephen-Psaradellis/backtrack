-- ============================================================================
-- Love Ledger Notification Preferences Schema Migration
-- ============================================================================
-- This migration creates the notification_preferences table for storing user
-- notification settings. Users can enable/disable different notification types
-- (matches, messages) through the app settings UI.
-- ============================================================================

-- ============================================================================
-- NOTIFICATION_PREFERENCES TABLE
-- ============================================================================
-- Stores user notification preferences for push notifications
-- Each user has one preferences record (created automatically or on first update)
-- Preferences persist across app restarts

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    match_notifications BOOLEAN DEFAULT true NOT NULL,
    message_notifications BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment on notification_preferences table and columns
COMMENT ON TABLE notification_preferences IS 'User preferences for push notification delivery';
COMMENT ON COLUMN notification_preferences.id IS 'Unique identifier for the preferences record';
COMMENT ON COLUMN notification_preferences.user_id IS 'User who owns these preferences (one record per user)';
COMMENT ON COLUMN notification_preferences.match_notifications IS 'Whether to send push notifications for new matches';
COMMENT ON COLUMN notification_preferences.message_notifications IS 'Whether to send push notifications for new messages';
COMMENT ON COLUMN notification_preferences.created_at IS 'Timestamp when the preferences were first created';
COMMENT ON COLUMN notification_preferences.updated_at IS 'Timestamp when the preferences were last updated';

-- Create indexes for notification preferences queries
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_created_at ON notification_preferences(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Apply updated_at trigger to notification_preferences table
-- (reuses update_updated_at_column() from 001_initial_schema.sql)
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NOTIFICATION_PREFERENCES POLICIES
-- ============================================================================
-- Users can only see and modify their own notification preferences
-- Service role can read all preferences (for Edge Functions to check before sending)

-- Allow users to view their own preferences
CREATE POLICY "notification_preferences_select_own"
  ON notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own preferences
CREATE POLICY "notification_preferences_insert_own"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own preferences
CREATE POLICY "notification_preferences_update_own"
  ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own preferences
CREATE POLICY "notification_preferences_delete_own"
  ON notification_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS ON POLICIES
-- ============================================================================

COMMENT ON POLICY "notification_preferences_select_own" ON notification_preferences IS 'Users can only view their own notification preferences';
COMMENT ON POLICY "notification_preferences_insert_own" ON notification_preferences IS 'Users can only create notification preferences for themselves';
COMMENT ON POLICY "notification_preferences_update_own" ON notification_preferences IS 'Users can only update their own notification preferences';
COMMENT ON POLICY "notification_preferences_delete_own" ON notification_preferences IS 'Users can only delete their own notification preferences';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to upsert notification preferences (create or update)
-- This handles the common case where preferences may or may not exist yet
CREATE OR REPLACE FUNCTION upsert_notification_preferences(
    p_user_id UUID,
    p_match_notifications BOOLEAN DEFAULT true,
    p_message_notifications BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
    prefs_id UUID;
BEGIN
    INSERT INTO notification_preferences (user_id, match_notifications, message_notifications)
    VALUES (p_user_id, p_match_notifications, p_message_notifications)
    ON CONFLICT (user_id) DO UPDATE
    SET
        match_notifications = EXCLUDED.match_notifications,
        message_notifications = EXCLUDED.message_notifications,
        updated_at = NOW()
    RETURNING id INTO prefs_id;

    RETURN prefs_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION upsert_notification_preferences(UUID, BOOLEAN, BOOLEAN) IS 'Create or update notification preferences for a user';

-- Function to get notification preferences for a user
-- Returns default values (true, true) if no preferences record exists
CREATE OR REPLACE FUNCTION get_notification_preferences(p_user_id UUID)
RETURNS TABLE (
    match_notifications BOOLEAN,
    message_notifications BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(np.match_notifications, true) AS match_notifications,
        COALESCE(np.message_notifications, true) AS message_notifications
    FROM notification_preferences np
    WHERE np.user_id = p_user_id;

    -- If no row found, return defaults
    IF NOT FOUND THEN
        RETURN QUERY SELECT true AS match_notifications, true AS message_notifications;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_notification_preferences(UUID) IS 'Get notification preferences for a user (returns defaults if not set)';

-- Function to check if a specific notification type is enabled for a user
-- Used by Edge Functions before sending notifications
CREATE OR REPLACE FUNCTION is_notification_enabled(
    p_user_id UUID,
    p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    is_enabled BOOLEAN;
BEGIN
    SELECT
        CASE p_notification_type
            WHEN 'match' THEN COALESCE(np.match_notifications, true)
            WHEN 'message' THEN COALESCE(np.message_notifications, true)
            ELSE true
        END
    INTO is_enabled
    FROM notification_preferences np
    WHERE np.user_id = p_user_id;

    -- If no preferences found, default to enabled
    IF NOT FOUND THEN
        RETURN true;
    END IF;

    RETURN is_enabled;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_notification_enabled(UUID, TEXT) IS 'Check if a specific notification type is enabled for a user';

-- ============================================================================
-- SETUP NOTES
-- ============================================================================
-- After running this migration:
-- 1. Frontend can use upsert_notification_preferences() to save settings
-- 2. Frontend can use get_notification_preferences() to retrieve settings
-- 3. Edge Functions use is_notification_enabled() before sending notifications
-- 4. Default behavior is to enable all notifications if no preferences exist
-- ============================================================================
