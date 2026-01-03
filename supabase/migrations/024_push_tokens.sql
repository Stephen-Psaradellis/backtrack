-- ============================================================================
-- Backtrack Push Tokens Schema Migration
-- ============================================================================
-- This migration creates the expo_push_tokens table for storing Expo push
-- notification tokens for users. Tokens are used by Edge Functions to send
-- push notifications when matches or messages occur.
-- ============================================================================

-- ============================================================================
-- EXPO_PUSH_TOKENS TABLE
-- ============================================================================
-- Stores Expo push notification tokens for authenticated users
-- Each user can have multiple tokens (multiple devices)
-- Tokens are registered when users grant notification permissions

CREATE TABLE IF NOT EXISTS expo_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL UNIQUE,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment on expo_push_tokens table and columns
COMMENT ON TABLE expo_push_tokens IS 'Expo push notification tokens for sending notifications to user devices';
COMMENT ON COLUMN expo_push_tokens.id IS 'Unique identifier for the token record';
COMMENT ON COLUMN expo_push_tokens.user_id IS 'User who owns this push token';
COMMENT ON COLUMN expo_push_tokens.token IS 'Expo push token string (e.g., ExponentPushToken[xxx])';
COMMENT ON COLUMN expo_push_tokens.device_info IS 'Optional JSONB containing device information (platform, model, etc.)';
COMMENT ON COLUMN expo_push_tokens.created_at IS 'Timestamp when the token was first registered';
COMMENT ON COLUMN expo_push_tokens.updated_at IS 'Timestamp when the token was last updated';

-- Create indexes for push token queries
CREATE INDEX IF NOT EXISTS idx_expo_push_tokens_user_id ON expo_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_expo_push_tokens_token ON expo_push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_expo_push_tokens_created_at ON expo_push_tokens(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Apply updated_at trigger to expo_push_tokens table
-- (reuses update_updated_at_column() from 001_initial_schema.sql)
DROP TRIGGER IF EXISTS update_expo_push_tokens_updated_at ON expo_push_tokens;
CREATE TRIGGER update_expo_push_tokens_updated_at
    BEFORE UPDATE ON expo_push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE expo_push_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- EXPO_PUSH_TOKENS POLICIES
-- ============================================================================
-- Users can only see and modify their own push tokens
-- Service role can read all tokens (for sending notifications via Edge Functions)
-- Service role can delete invalid tokens (when Expo API returns 400/404)

-- Allow users to view their own tokens
DROP POLICY IF EXISTS "expo_push_tokens_select_own" ON expo_push_tokens;
CREATE POLICY "expo_push_tokens_select_own"
  ON expo_push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own tokens
DROP POLICY IF EXISTS "expo_push_tokens_insert_own" ON expo_push_tokens;
CREATE POLICY "expo_push_tokens_insert_own"
  ON expo_push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own tokens
DROP POLICY IF EXISTS "expo_push_tokens_update_own" ON expo_push_tokens;
CREATE POLICY "expo_push_tokens_update_own"
  ON expo_push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own tokens
DROP POLICY IF EXISTS "expo_push_tokens_delete_own" ON expo_push_tokens;
CREATE POLICY "expo_push_tokens_delete_own"
  ON expo_push_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS ON POLICIES
-- ============================================================================

COMMENT ON POLICY "expo_push_tokens_select_own" ON expo_push_tokens IS 'Users can only view their own push tokens';
COMMENT ON POLICY "expo_push_tokens_insert_own" ON expo_push_tokens IS 'Users can only register push tokens for themselves';
COMMENT ON POLICY "expo_push_tokens_update_own" ON expo_push_tokens IS 'Users can only update their own push tokens';
COMMENT ON POLICY "expo_push_tokens_delete_own" ON expo_push_tokens IS 'Users can only delete their own push tokens';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to upsert a push token (register or update existing)
-- This handles the common case where a user re-registers their token
CREATE OR REPLACE FUNCTION upsert_push_token(
    p_user_id UUID,
    p_token TEXT,
    p_device_info JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    token_id UUID;
BEGIN
    INSERT INTO expo_push_tokens (user_id, token, device_info)
    VALUES (p_user_id, p_token, p_device_info)
    ON CONFLICT (token) DO UPDATE
    SET
        user_id = p_user_id,
        device_info = COALESCE(EXCLUDED.device_info, expo_push_tokens.device_info),
        updated_at = NOW()
    RETURNING id INTO token_id;

    RETURN token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION upsert_push_token(UUID, TEXT, JSONB) IS 'Register or update an Expo push token for a user';

-- Function to get all push tokens for a user (used by Edge Functions)
CREATE OR REPLACE FUNCTION get_user_push_tokens(p_user_id UUID)
RETURNS TABLE (token TEXT, device_info JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT ept.token, ept.device_info
    FROM expo_push_tokens ept
    WHERE ept.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_push_tokens(UUID) IS 'Get all push tokens for a user (for sending notifications)';

-- Function to remove invalid push tokens (called when Expo API returns 400/404)
CREATE OR REPLACE FUNCTION remove_invalid_push_token(p_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    rows_deleted INTEGER;
BEGIN
    DELETE FROM expo_push_tokens
    WHERE token = p_token;

    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    RETURN rows_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION remove_invalid_push_token(TEXT) IS 'Remove an invalid push token from the database';

-- ============================================================================
-- SETUP NOTES
-- ============================================================================
-- After running this migration:
-- 1. Edge Functions can use service_role key to read all tokens
-- 2. Frontend uses authenticated user context to manage own tokens
-- 3. Call upsert_push_token() to register tokens (handles duplicates)
-- 4. Call remove_invalid_push_token() when Expo API returns 400/404
-- ============================================================================
