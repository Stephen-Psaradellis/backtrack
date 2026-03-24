-- ============================================================================
-- Fix infinite recursion in posts INSERT RLS policy
-- ============================================================================
-- The posts_insert_own policy queries user_checkins directly, but
-- user_checkins has a self-referencing SELECT policy (user_checkins_select_accessible)
-- that causes "infinite recursion detected in policy for relation user_checkins".
--
-- Fix: Use the existing SECURITY DEFINER function can_create_post() which
-- bypasses RLS on user_checkins, eliminating the recursion.
-- ============================================================================

DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own"
    ON posts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = producer_id
        AND can_create_post(posts.location_id)
    );

COMMENT ON POLICY "posts_insert_own" ON posts IS
    'Users can only create posts at locations where they are a regular or checked in within 12 hours. Uses SECURITY DEFINER function to avoid RLS recursion on user_checkins.';
