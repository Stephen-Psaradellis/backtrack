-- Notification Counts Migration
-- Creates an RPC function to get aggregated notification counts for a user

-- ============================================================================
-- Create RPC function to get notification counts
-- ============================================================================
CREATE OR REPLACE FUNCTION get_notification_counts(p_user_id uuid)
RETURNS TABLE (
  unread_messages_count bigint,
  new_matches_count bigint,
  new_posts_at_regulars_count bigint,
  new_posts_at_favorites_count bigint,
  total_count bigint
) AS $$
DECLARE
  v_unread_messages bigint;
  v_new_matches bigint;
  v_new_posts_regulars bigint;
  v_new_posts_favorites bigint;
BEGIN
  -- Count unread messages where user is the recipient (not the sender)
  -- Recipient is the other participant in the conversation
  SELECT COUNT(*)
  INTO v_unread_messages
  FROM messages m
  INNER JOIN conversations c ON c.id = m.conversation_id
  WHERE m.is_read = false
    AND m.sender_id != p_user_id
    AND (c.producer_id = p_user_id OR c.consumer_id = p_user_id);

  -- Count new matches (conversations created in last 24h where user is consumer)
  SELECT COUNT(*)
  INTO v_new_matches
  FROM conversations c
  WHERE c.consumer_id = p_user_id
    AND c.created_at >= (now() - interval '24 hours');

  -- Count new posts at regular locations in last 24h
  -- Regular locations = locations visited at least 3 times in the last 30 days
  SELECT COUNT(DISTINCT p.id)
  INTO v_new_posts_regulars
  FROM posts p
  INNER JOIN locations l ON l.id = p.location_id
  WHERE p.is_active = true
    AND p.created_at >= (now() - interval '24 hours')
    AND p.producer_id != p_user_id
    AND l.id IN (
      SELECT h.location_id
      FROM location_visit_history h
      WHERE h.user_id = p_user_id
        AND h.visited_at >= (now() - interval '30 days')
      GROUP BY h.location_id
      HAVING COUNT(*) >= 3
    );

  -- Count new posts at favorite locations in last 24h
  SELECT COUNT(DISTINCT p.id)
  INTO v_new_posts_favorites
  FROM posts p
  INNER JOIN locations l ON l.id = p.location_id
  INNER JOIN favorite_locations fl ON fl.place_id = l.google_place_id
  WHERE p.is_active = true
    AND p.created_at >= (now() - interval '24 hours')
    AND p.producer_id != p_user_id
    AND fl.user_id = p_user_id;

  RETURN QUERY SELECT
    v_unread_messages AS unread_messages_count,
    v_new_matches AS new_matches_count,
    v_new_posts_regulars AS new_posts_at_regulars_count,
    v_new_posts_favorites AS new_posts_at_favorites_count,
    (v_unread_messages + v_new_matches + v_new_posts_regulars + v_new_posts_favorites) AS total_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_notification_counts(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_notification_counts(uuid) IS 'Returns aggregated notification counts for a user including unread messages, new matches, and new posts at regular/favorite locations';
