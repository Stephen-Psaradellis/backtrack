-- Performance indexes for query optimization
-- Addresses N+1 queries and inefficient lookups identified in performance audit

-- Index for sender's recent messages (ChatListScreen optimization)
CREATE INDEX IF NOT EXISTS idx_messages_sender_recent
  ON messages(sender_id, created_at DESC);

-- Index for active conversations by participants (ChatListScreen optimization)
CREATE INDEX IF NOT EXISTS idx_conversations_participants
  ON conversations(producer_id, consumer_id, updated_at DESC)
  WHERE is_active = true;

-- Index for unread messages by conversation (ChatScreen unread count)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_unread
  ON messages(conversation_id, is_read, created_at DESC)
  WHERE is_read = false;

-- Index for user's profile photos (ProfileScreen optimization)
CREATE INDEX IF NOT EXISTS idx_profile_photos_user
  ON profile_photos(user_id, created_at DESC);

-- Index for block checks (forward direction)
CREATE INDEX IF NOT EXISTS idx_blocks_composite
  ON blocks(blocker_id, blocked_id);

-- Index for block checks (reverse direction)
CREATE INDEX IF NOT EXISTS idx_blocks_reverse
  ON blocks(blocked_id, blocker_id);

-- Helper function: Check if user is blocked using UNION ALL (faster than OR)
-- Replaces inefficient OR patterns in RLS policies
CREATE OR REPLACE FUNCTION is_user_blocked(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocks WHERE blocker_id = auth.uid() AND blocked_id = target_user_id
    UNION ALL
    SELECT 1 FROM blocks WHERE blocker_id = target_user_id AND blocked_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION is_user_blocked(UUID) IS
  'Efficiently checks if target user is blocked by or has blocked the current user. Uses UNION ALL instead of OR for better query planning.';
