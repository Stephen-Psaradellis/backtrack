-- ============================================================================
-- FIX: Add auth.uid() validation to SECURITY DEFINER RPC functions
-- ============================================================================
-- Several RPC functions use SECURITY DEFINER (bypass RLS) but don't verify
-- that the caller matches the target user. This allows any authenticated user
-- to operate on other users' data.
--
-- VULNERABILITIES FIXED:
--   1. upsert_push_token  - could register tokens under other users' IDs
--   2. get_user_push_tokens - could read other users' push tokens
--   3. remove_invalid_push_token - could delete any user's push tokens
--   4. update_photo_moderation - could approve/reject any user's photos
--   5. get_locations_visited_in_last_month - could read other users' location history
-- ============================================================================

-- ============================================================================
-- 1. FIX: upsert_push_token - enforce auth.uid() = p_user_id
-- ============================================================================
-- Previously: Any authenticated user could register a push token under
-- another user's ID, potentially receiving their notifications.

CREATE OR REPLACE FUNCTION upsert_push_token(
    p_user_id UUID,
    p_token TEXT,
    p_device_info JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    token_id UUID;
BEGIN
    -- SECURITY: Verify caller owns the token being registered
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Can only register push tokens for your own account';
    END IF;

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

COMMENT ON FUNCTION upsert_push_token(UUID, TEXT, JSONB) IS
    'Register or update an Expo push token. SECURITY: Validates auth.uid() matches p_user_id.';

-- ============================================================================
-- 2. FIX: get_user_push_tokens - restrict to own tokens only
-- ============================================================================
-- Previously: Any authenticated user could query another user's push tokens,
-- leaking device information.
-- Note: Edge Functions use service_role key which bypasses RLS and this check.

CREATE OR REPLACE FUNCTION get_user_push_tokens(p_user_id UUID)
RETURNS TABLE (token TEXT, device_info JSONB) AS $$
BEGIN
    -- SECURITY: Only allow users to query their own tokens
    -- Edge Functions use service_role which bypasses this function entirely
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Can only access your own push tokens';
    END IF;

    RETURN QUERY
    SELECT ept.token, ept.device_info
    FROM expo_push_tokens ept
    WHERE ept.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_push_tokens(UUID) IS
    'Get push tokens for a user. SECURITY: Validates auth.uid() matches p_user_id.';

-- ============================================================================
-- 3. FIX: remove_invalid_push_token - restrict to own tokens
-- ============================================================================
-- Previously: Any authenticated user could delete any push token by value.
-- Now: Users can only remove their own tokens.
-- Edge Functions (service_role) bypass this for cleanup of expired tokens.

CREATE OR REPLACE FUNCTION remove_invalid_push_token(p_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    rows_deleted INTEGER;
BEGIN
    -- SECURITY: Only delete tokens owned by the calling user
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    DELETE FROM expo_push_tokens
    WHERE token = p_token
    AND user_id = auth.uid();

    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    RETURN rows_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION remove_invalid_push_token(TEXT) IS
    'Remove a push token. SECURITY: Only removes tokens owned by auth.uid().';

-- ============================================================================
-- 4. FIX: update_photo_moderation - restrict to service role only
-- ============================================================================
-- Previously: Any authenticated user could call this to approve/reject any
-- photo, completely bypassing content moderation.
-- Fix: Check that the caller is either the service role or matches specific
-- conditions. Since Edge Functions call this with service_role, we restrict
-- regular users from calling it at all.

CREATE OR REPLACE FUNCTION update_photo_moderation(
    p_photo_id UUID,
    p_status TEXT,
    p_result JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- SECURITY: This function should ONLY be called by Edge Functions
    -- using service_role key. Regular authenticated users must not be
    -- able to change moderation status.
    -- The service_role bypasses RLS and runs as the database owner.
    -- If auth.uid() is set, this is a regular user call - block it.
    IF auth.uid() IS NOT NULL THEN
        RAISE EXCEPTION 'Photo moderation can only be performed by the system';
    END IF;

    UPDATE profile_photos
    SET
        moderation_status = p_status,
        moderation_result = p_result
    WHERE id = p_photo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_photo_moderation(UUID, TEXT, JSONB) IS
    'Update photo moderation status. SECURITY: Restricted to service_role only (Edge Functions).';

-- ============================================================================
-- 5. FIX: get_locations_visited_in_last_month - enforce own data only
-- ============================================================================
-- Previously: Any authenticated user could query another user's location
-- visit history, leaking sensitive location data.

CREATE OR REPLACE FUNCTION get_locations_visited_in_last_month(p_user_id uuid)
RETURNS TABLE (
  location_id uuid,
  location_name text,
  address text,
  latitude double precision,
  longitude double precision,
  google_place_id text,
  last_visited_at timestamptz,
  visit_count bigint
) AS $$
BEGIN
  -- SECURITY: Only allow users to query their own location history
  IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() != p_user_id THEN
      RAISE EXCEPTION 'Can only access your own location history';
  END IF;

  RETURN QUERY
  SELECT
    l.id AS location_id,
    l.name AS location_name,
    l.address,
    l.latitude,
    l.longitude,
    l.google_place_id,
    MAX(h.visited_at) AS last_visited_at,
    COUNT(h.id) AS visit_count
  FROM location_visit_history h
  INNER JOIN locations l ON l.id = h.location_id
  WHERE h.user_id = p_user_id
    AND h.visited_at >= (now() - interval '30 days')
  GROUP BY l.id, l.name, l.address, l.latitude, l.longitude, l.google_place_id
  ORDER BY last_visited_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_locations_visited_in_last_month(uuid) IS
    'Get locations visited in the last 30 days. SECURITY: Validates auth.uid() matches p_user_id.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After applying this migration, verify with:
--
-- 1. As User A, try: SELECT upsert_push_token('user-b-uuid', 'token', null);
--    Expected: ERROR "Can only register push tokens for your own account"
--
-- 2. As User A, try: SELECT * FROM get_user_push_tokens('user-b-uuid');
--    Expected: ERROR "Can only access your own push tokens"
--
-- 3. As User A, try: SELECT update_photo_moderation('any-photo-id', 'approved');
--    Expected: ERROR "Photo moderation can only be performed by the system"
--
-- 4. As User A, try: SELECT * FROM get_locations_visited_in_last_month('user-b-uuid');
--    Expected: ERROR "Can only access your own location history"
-- ============================================================================
