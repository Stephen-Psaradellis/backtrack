-- ============================================================================
-- Conversation Verification Migration
-- ============================================================================
-- This migration adds verification_tier tracking to the conversations table.
-- This allows producers to see how trustworthy each conversation partner is
-- based on their verification status when they responded.
--
-- Changes:
-- - Adds verification_tier column (nullable for existing conversations)
-- - Adds response_id to link to the post_response that created the conversation
-- - Backfills existing conversations as 'unverified_claim'
-- - Adds index for tier-based queries
-- ============================================================================

-- ============================================================================
-- ADD VERIFICATION_TIER COLUMN
-- ============================================================================

-- Add verification_tier column to conversations
ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS verification_tier verification_tier;

-- Add response_id to track which response created this conversation
ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS response_id UUID REFERENCES post_responses(id);

-- Comments
COMMENT ON COLUMN conversations.verification_tier IS 'Verification tier of the consumer when they responded to the post';
COMMENT ON COLUMN conversations.response_id IS 'Reference to the post_response that initiated this conversation';

-- ============================================================================
-- BACKFILL EXISTING CONVERSATIONS
-- ============================================================================
-- Existing conversations without a tier are treated as unverified claims
-- since they pre-date the verification system

UPDATE conversations
SET verification_tier = 'unverified_claim'
WHERE verification_tier IS NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for tier-based conversation filtering (e.g., show verified first)
CREATE INDEX IF NOT EXISTS idx_conversations_tier
    ON conversations(verification_tier)
    WHERE verification_tier IS NOT NULL;

-- Composite index for producer's conversations sorted by tier
CREATE INDEX IF NOT EXISTS idx_conversations_producer_tier
    ON conversations(producer_id, verification_tier);

-- ============================================================================
-- GET_USER_CONVERSATIONS_WITH_TIER FUNCTION
-- ============================================================================
-- Enhanced version of get_user_conversations that includes verification tier.
-- Returns conversations sorted by tier (verified first) then by last activity.
--
-- Parameters:
--   p_limit: Maximum number of conversations to return (default 50)
--   p_offset: Offset for pagination (default 0)
--
-- Returns: TABLE with conversation details including verification tier

CREATE OR REPLACE FUNCTION get_user_conversations_with_tier(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    conversation_id UUID,
    post_id UUID,
    producer_id UUID,
    consumer_id UUID,
    status TEXT,
    producer_accepted BOOLEAN,
    verification_tier verification_tier,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    other_user_id UUID,
    is_producer BOOLEAN,
    last_message_content TEXT,
    last_message_at TIMESTAMPTZ,
    unread_count BIGINT,
    location_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT
        c.id as conversation_id,
        c.post_id,
        c.producer_id,
        c.consumer_id,
        c.status,
        c.producer_accepted,
        c.verification_tier,
        c.created_at,
        c.updated_at,
        CASE
            WHEN c.producer_id = v_current_user_id THEN c.consumer_id
            ELSE c.producer_id
        END as other_user_id,
        c.producer_id = v_current_user_id as is_producer,
        -- Last message
        (
            SELECT m.content
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
        ) as last_message_content,
        (
            SELECT m.created_at
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
        ) as last_message_at,
        -- Unread count
        (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.conversation_id = c.id
                AND m.sender_id != v_current_user_id
                AND m.is_read = FALSE
        ) as unread_count,
        -- Location name from post
        (
            SELECT l.name
            FROM posts p
            JOIN locations l ON l.id = p.location_id
            WHERE p.id = c.post_id
        ) as location_name
    FROM conversations c
    WHERE c.producer_id = v_current_user_id OR c.consumer_id = v_current_user_id
    ORDER BY
        -- Verified conversations first for producers
        CASE
            WHEN c.producer_id = v_current_user_id THEN
                CASE c.verification_tier
                    WHEN 'verified_checkin' THEN 1
                    WHEN 'regular_spot' THEN 2
                    ELSE 3
                END
            ELSE 4  -- For consumers, don't prioritize by tier
        END,
        -- Then by last activity
        c.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_user_conversations_with_tier(INTEGER, INTEGER) IS
    'Gets user conversations with verification tier. For producers, verified conversations appear first.';
