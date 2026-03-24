-- ============================================================================
-- Post & Story Creation Gating
-- ============================================================================
-- Posts: require user to be a regular OR checked in within 12 hours
-- Stories: tighten from 24h window to active check-in only
-- ============================================================================

-- ============================================================================
-- 1. POST INSERT RLS: Regular OR recent check-in
-- ============================================================================

DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own"
    ON posts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = producer_id
        AND (
            -- User is a regular at this location
            EXISTS (
                SELECT 1 FROM location_regulars lr
                WHERE lr.user_id = auth.uid()
                    AND lr.location_id = posts.location_id
                    AND lr.is_regular = true
            )
            OR
            -- User checked in within last 12 hours
            EXISTS (
                SELECT 1 FROM user_checkins uc
                WHERE uc.user_id = auth.uid()
                    AND uc.location_id = posts.location_id
                    AND uc.checked_in_at >= NOW() - INTERVAL '12 hours'
            )
        )
    );

COMMENT ON POLICY "posts_insert_own" ON posts IS
    'Users can only create posts at locations where they are a regular or checked in within 12 hours';

-- ============================================================================
-- 2. can_create_post RPC for client-side pre-checks
-- ============================================================================

CREATE OR REPLACE FUNCTION can_create_post(p_location_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM location_regulars lr
        WHERE lr.user_id = auth.uid()
            AND lr.location_id = p_location_id
            AND lr.is_regular = true
    )
    OR EXISTS (
        SELECT 1 FROM user_checkins uc
        WHERE uc.user_id = auth.uid()
            AND uc.location_id = p_location_id
            AND uc.checked_in_at >= NOW() - INTERVAL '12 hours'
    );
END;
$$;

COMMENT ON FUNCTION can_create_post(UUID) IS
    'Returns true if the current user can create a post at the given location (must be a regular or checked in within 12h).';

GRANT EXECUTE ON FUNCTION can_create_post(UUID) TO authenticated;

-- ============================================================================
-- 3. STORY INSERT RLS: Active check-in only (was 24h window)
-- ============================================================================

DROP POLICY IF EXISTS "Users can create stories at checked-in venues" ON venue_stories;
CREATE POLICY "Users can create stories at checked-in venues"
    ON venue_stories
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM user_checkins uc
            WHERE uc.user_id = auth.uid()
                AND uc.location_id = venue_stories.location_id
                AND is_checkin_active(uc.checked_in_at, uc.checked_out_at, uc.user_id)
        )
    );

COMMENT ON POLICY "Users can create stories at checked-in venues" ON venue_stories IS
    'Users can only create stories at locations where they have an active check-in';

-- ============================================================================
-- 4. Update can_post_venue_story to use active check-in logic
-- ============================================================================

CREATE OR REPLACE FUNCTION can_post_venue_story(p_location_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_checkins uc
        WHERE uc.user_id = auth.uid()
            AND uc.location_id = p_location_id
            AND is_checkin_active(uc.checked_in_at, uc.checked_out_at, uc.user_id)
    );
END;
$$;

COMMENT ON FUNCTION can_post_venue_story(UUID) IS
    'Returns true if the current user can post a story at the given location (must have an active check-in).';
