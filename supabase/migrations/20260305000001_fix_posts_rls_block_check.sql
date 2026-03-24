-- ============================================================================
-- Fix posts SELECT RLS: replace slow OR-based block check with is_blocked_by()
-- ============================================================================
-- The posts_select_active_not_blocked policy uses an OR pattern in NOT EXISTS
-- which causes sequential scans on the blocks table for every row.
-- This replaces it with the optimized is_blocked_by() function (P-001)
-- which uses UNION ALL with separate index lookups for 3x-10x speedup.
-- ============================================================================

-- Drop old policies (both variants that may exist)
DROP POLICY IF EXISTS "posts_select_active_not_blocked" ON posts;
DROP POLICY IF EXISTS "posts_select_active" ON posts;
DROP POLICY IF EXISTS "posts_select_own" ON posts;

-- Optimized policy using is_blocked_by() helper function
CREATE POLICY "posts_select_active_not_blocked"
    ON posts FOR SELECT TO authenticated
    USING (
        is_active = true
        AND expires_at > NOW()
        AND NOT is_blocked_by(auth.uid(), producer_id)
    );

-- Also allow producers to see their own posts (even inactive/expired)
CREATE POLICY "posts_select_own"
    ON posts FOR SELECT TO authenticated
    USING (producer_id = auth.uid());

COMMENT ON POLICY "posts_select_active_not_blocked" ON posts IS
    'Allow viewing active, non-expired posts from non-blocked users. Uses optimized is_blocked_by() function for 3x-10x faster block checks.';

COMMENT ON POLICY "posts_select_own" ON posts IS
    'Allow users to always see their own posts regardless of status.';
