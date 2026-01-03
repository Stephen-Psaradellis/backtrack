-- Fix posts RLS to allow reading posts via conversations
-- The issue: When joining conversations to posts, expired posts block the query

-- Add a policy that allows conversation participants to read their conversation's post
-- even if it's expired
DROP POLICY IF EXISTS "posts_select_conversation_participant" ON posts;
CREATE POLICY "posts_select_conversation_participant"
    ON posts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.post_id = posts.id
            AND (c.producer_id = auth.uid() OR c.consumer_id = auth.uid())
        )
    );

-- Also simplify the main posts select policy to remove blocks check
-- (blocking is handled at app level now)
DROP POLICY IF EXISTS "posts_select_active_not_blocked" ON posts;
DROP POLICY IF EXISTS "posts_select_active" ON posts;
CREATE POLICY "posts_select_active"
    ON posts
    FOR SELECT
    TO authenticated
    USING (
        is_active = true
        AND expires_at > NOW()
    );

-- Also ensure locations can be read (needed for the nested join)
DROP POLICY IF EXISTS "locations_select_all" ON locations;
CREATE POLICY "locations_select_all"
    ON locations
    FOR SELECT
    TO authenticated
    USING (true);

-- Comments
COMMENT ON POLICY "posts_select_conversation_participant" ON posts
    IS 'Allow conversation participants to read their conversation post even if expired';
COMMENT ON POLICY "posts_select_active" ON posts
    IS 'Allow authenticated users to read active, non-expired posts';
COMMENT ON POLICY "locations_select_all" ON locations
    IS 'Allow authenticated users to read all locations';
