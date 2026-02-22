-- ============================================================================
-- ChatList Optimized RPC - Fix N+1 Query Waterfall
-- ============================================================================
-- Problem: ChatListScreen fires 80-100 individual queries for 20 conversations
-- (last message, unread count, profile, post, location = 4-5 queries per conversation)
--
-- Solution: Single RPC that joins all data and returns complete conversation list
-- with all needed information in one query.
-- ============================================================================

/**
 * Get all conversations for a user with complete details in one query
 *
 * Returns conversation list with:
 * - Conversation metadata
 * - Other user's profile info (verification status)
 * - Last message content and sender
 * - Unread message count
 * - Post target avatar
 * - Location name
 *
 * Respects blocking: excludes conversations where either party has blocked the other
 *
 * @param p_user_id - The user requesting their conversations
 * @returns Table of conversation data with all required fields
 */
CREATE OR REPLACE FUNCTION get_user_conversations_with_details(p_user_id UUID)
RETURNS TABLE(
  -- Conversation fields
  conversation_id UUID,
  producer_id UUID,
  consumer_id UUID,
  post_id UUID,
  status TEXT,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,

  -- Other user fields
  other_user_id UUID,
  other_user_is_verified BOOLEAN,

  -- Last message fields
  last_message_content TEXT,
  last_message_sender_id UUID,
  last_message_created_at TIMESTAMPTZ,

  -- Unread count
  unread_count BIGINT,

  -- Post fields
  post_target_avatar_v2 JSONB,

  -- Location fields
  location_name TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- SECURITY: Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- SECURITY: Verify caller is requesting their own conversations
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Can only access your own conversations';
  END IF;

  RETURN QUERY
  WITH user_conversations AS (
    -- Get all active conversations for the user
    SELECT
      c.id,
      c.producer_id,
      c.consumer_id,
      c.post_id,
      c.updated_at,
      c.created_at,
      -- Determine the "other user" in the conversation
      CASE
        WHEN c.producer_id = p_user_id THEN c.consumer_id
        ELSE c.producer_id
      END AS other_user_id
    FROM conversations c
    WHERE (c.producer_id = p_user_id OR c.consumer_id = p_user_id)
      AND c.is_active = true
      -- Exclude conversations where either party has blocked the other
      AND NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (
          -- User blocked other party
          (b.blocker_id = p_user_id AND b.blocked_id = CASE
            WHEN c.producer_id = p_user_id THEN c.consumer_id
            ELSE c.producer_id
          END)
          OR
          -- Other party blocked user
          (b.blocker_id = CASE
            WHEN c.producer_id = p_user_id THEN c.consumer_id
            ELSE c.producer_id
          END AND b.blocked_id = p_user_id)
        )
      )
  ),
  last_messages AS (
    -- Get the most recent message for each conversation
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content,
      m.sender_id,
      m.created_at
    FROM messages m
    WHERE m.conversation_id IN (SELECT id FROM user_conversations)
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread_counts AS (
    -- Count unread messages per conversation (messages from other user that haven't been read)
    SELECT
      m.conversation_id,
      COUNT(*) AS unread_count
    FROM messages m
    WHERE m.conversation_id IN (SELECT id FROM user_conversations)
      AND m.is_read = false
      AND m.sender_id != p_user_id
    GROUP BY m.conversation_id
  )
  SELECT
    uc.id AS conversation_id,
    uc.producer_id,
    uc.consumer_id,
    uc.post_id,
    'active'::TEXT AS status,
    uc.updated_at,
    uc.created_at,

    -- Other user info
    uc.other_user_id,
    COALESCE(prof.is_verified, false) AS other_user_is_verified,

    -- Last message info
    lm.content AS last_message_content,
    lm.sender_id AS last_message_sender_id,
    lm.created_at AS last_message_created_at,

    -- Unread count
    COALESCE(uc_count.unread_count, 0) AS unread_count,

    -- Post info
    p.target_avatar_v2 AS post_target_avatar_v2,

    -- Location info
    l.name AS location_name
  FROM user_conversations uc
  LEFT JOIN last_messages lm ON lm.conversation_id = uc.id
  LEFT JOIN unread_counts uc_count ON uc_count.conversation_id = uc.id
  LEFT JOIN profiles prof ON prof.id = uc.other_user_id
  LEFT JOIN posts p ON p.id = uc.post_id
  LEFT JOIN locations l ON l.id = p.location_id
  ORDER BY COALESCE(lm.created_at, uc.updated_at) DESC;
END;
$$;

COMMENT ON FUNCTION get_user_conversations_with_details(UUID) IS
  'Get all conversations for a user with complete details in one query. ' ||
  'Includes last message, unread count, other user profile, post avatar, and location. ' ||
  'Respects blocking - excludes conversations with blocked users. ' ||
  'SECURITY: Validates auth.uid() matches p_user_id.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_conversations_with_details(UUID) TO authenticated;
