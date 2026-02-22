-- ============================================================================
-- Add Blocking to Conversations RLS Policy
-- ============================================================================
-- This migration adds blocking logic to the conversations SELECT policy.
-- Previously, blocked users could still see conversations - this is a privacy leak.
-- Now conversations are hidden if either party has blocked the other.
-- ============================================================================

-- Drop the existing policy that lacks blocking logic
DROP POLICY IF EXISTS "conversations_select_participant" ON conversations;

/**
 * Create new SELECT policy with blocking logic.
 * Users can see conversations where they are a participant,
 * UNLESS they have blocked the other party or been blocked by them.
 */
CREATE POLICY "conversations_select_participant_not_blocked"
    ON conversations
    FOR SELECT
    TO authenticated
    USING (
        -- Must be a participant (producer or consumer)
        (producer_id = auth.uid() OR consumer_id = auth.uid())
        AND
        -- Must NOT have any blocking relationship with the other party
        NOT EXISTS (
            SELECT 1 FROM blocks
            WHERE (
                -- User blocked other party
                (blocker_id = auth.uid() AND blocked_id = CASE
                    WHEN producer_id = auth.uid() THEN consumer_id
                    ELSE producer_id
                END)
                OR
                -- Other party blocked user
                (blocker_id = CASE
                    WHEN producer_id = auth.uid() THEN consumer_id
                    ELSE producer_id
                END AND blocked_id = auth.uid())
            )
        )
    );

COMMENT ON POLICY "conversations_select_participant_not_blocked" ON conversations IS
'Allow participants to view conversations, but hide them if either party has blocked the other';

-- Ensure RLS is enabled
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions (should already exist, but ensure)
GRANT SELECT ON conversations TO authenticated;
