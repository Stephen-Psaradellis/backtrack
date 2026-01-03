-- Fix conversations RLS policy
-- The existing policy has a complex subquery that may cause issues
-- This creates a simpler policy that just checks participant access

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "conversations_select_participant" ON conversations;

-- Create a simpler SELECT policy that doesn't require blocks table check
-- Blocking logic will be handled at the application level
CREATE POLICY "conversations_select_participant"
    ON conversations
    FOR SELECT
    TO authenticated
    USING (
        producer_id = auth.uid() OR consumer_id = auth.uid()
    );

-- Ensure RLS is enabled
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON conversations TO authenticated;

-- Add comment
COMMENT ON POLICY "conversations_select_participant" ON conversations
    IS 'Allow participants (producer or consumer) to view their conversations';
