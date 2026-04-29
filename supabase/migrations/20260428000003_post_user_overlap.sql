-- ============================================================================
-- Shared overlap primitive (Features 2.1, 4.3)
-- ============================================================================
-- Computes the intersection of a post's sighting window and a user's
-- check-in window(s) at the same location. Single source of truth for both:
--   - 2.1 "I was there" timeline overlay (per-post for the viewer)
--   - 4.3 Co-presence trust badge (between two users in a conversation)
--
-- Window math (matches the convention already used in 040_match_notifications
-- and 038_tiered_discovery):
--   post window:   [sighting_date,  sighting_end_date]
--                  if sighting_end_date is NULL, treated as a point in time
--                  with ±15 minutes padding (tighter than the ±2h fallback
--                  used for notification eligibility — for display we want
--                  conservative numbers).
--   checkin window: [checked_in_at, checked_out_at]
--                   if checked_out_at is NULL, treated as 4h after check-in
--                   (matches 038/040 convention).
--
-- both_verified is TRUE only when the relevant check-in row is verified=true.
-- ============================================================================

-- ============================================================================
-- Internal helpers — kept private (no GRANT) since they're called by the
-- SECURITY DEFINER RPCs below.
-- ============================================================================

-- Returns the post's effective window as a tstzrange.
CREATE OR REPLACE FUNCTION _post_window(p posts)
RETURNS tstzrange
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN p.sighting_date IS NULL THEN
            tstzrange(NULL, NULL, '[]')  -- empty / unknown
        WHEN p.sighting_end_date IS NULL THEN
            tstzrange(
                p.sighting_date - INTERVAL '15 minutes',
                p.sighting_date + INTERVAL '15 minutes',
                '[]'
            )
        ELSE
            tstzrange(p.sighting_date, p.sighting_end_date, '[]')
    END
$$;

-- Returns a check-in's effective window as a tstzrange.
CREATE OR REPLACE FUNCTION _checkin_window(c user_checkins)
RETURNS tstzrange
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT tstzrange(
        c.checked_in_at,
        COALESCE(c.checked_out_at, c.checked_in_at + INTERVAL '4 hours'),
        '[]'
    )
$$;

-- ============================================================================
-- get_post_user_overlap (single post × single user)
-- ============================================================================
-- Returns the best (longest) overlap between a user's check-ins at a post's
-- location and the post's sighting window.
--
-- SECURITY: SECURITY DEFINER, but only returns data for posts the caller
-- is allowed to see (active + not resolved + not expired) and for the
-- caller's own user_id OR the post producer (other users not exposed).
--
-- Returns 0-row table when no overlap exists. Caller treats no row as
-- "no co-presence detected".

CREATE OR REPLACE FUNCTION get_post_user_overlap(
    p_post_id UUID,
    p_user_id UUID DEFAULT NULL  -- defaults to auth.uid()
)
RETURNS TABLE (
    post_id UUID,
    user_id UUID,
    location_id UUID,
    overlap_start TIMESTAMPTZ,
    overlap_end TIMESTAMPTZ,
    overlap_minutes INTEGER,
    checkin_id UUID,
    checkin_verified BOOLEAN,
    post_window_start TIMESTAMPTZ,
    post_window_end TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID := auth.uid();
    v_target UUID := COALESCE(p_user_id, v_caller);
    v_post posts%ROWTYPE;
    v_post_window tstzrange;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_post FROM posts WHERE id = p_post_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Authorization: caller may query their own overlap, or the producer
    -- may query a responder's overlap (used by 4.3 for the conversation
    -- header). Block all other combinations.
    IF v_target <> v_caller AND v_post.producer_id <> v_caller THEN
        RETURN;
    END IF;

    v_post_window := _post_window(v_post);
    IF isempty(v_post_window) OR lower(v_post_window) IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH candidate AS (
        SELECT
            uc.id          AS checkin_id,
            uc.verified    AS checkin_verified,
            _checkin_window(uc) * v_post_window AS overlap_range
        FROM user_checkins uc
        WHERE uc.user_id = v_target
          AND uc.location_id = v_post.location_id
    ),
    valid AS (
        SELECT
            checkin_id,
            checkin_verified,
            lower(overlap_range) AS overlap_start,
            upper(overlap_range) AS overlap_end,
            EXTRACT(EPOCH FROM (upper(overlap_range) - lower(overlap_range)))::INTEGER / 60 AS overlap_minutes
        FROM candidate
        WHERE NOT isempty(overlap_range)
          AND lower(overlap_range) IS NOT NULL
          AND upper(overlap_range) IS NOT NULL
    )
    SELECT
        v_post.id           AS post_id,
        v_target            AS user_id,
        v_post.location_id  AS location_id,
        v.overlap_start,
        v.overlap_end,
        v.overlap_minutes,
        v.checkin_id,
        v.checkin_verified,
        lower(v_post_window) AS post_window_start,
        upper(v_post_window) AS post_window_end
    FROM valid v
    ORDER BY v.overlap_minutes DESC
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_post_user_overlap(UUID, UUID) IS
    'Best overlap between a user''s check-ins and a post''s sighting window at the post''s location. Caller must be the user or the post producer.';

GRANT EXECUTE ON FUNCTION get_post_user_overlap(UUID, UUID) TO authenticated;

-- ============================================================================
-- get_my_overlaps_for_posts (batch for the calling user)
-- ============================================================================
-- Used by the feed (Feature 2.1) to fetch overlaps for the visible posts in
-- one round-trip. Implicitly scoped to auth.uid().

CREATE OR REPLACE FUNCTION get_my_overlaps_for_posts(
    p_post_ids UUID[]
)
RETURNS TABLE (
    post_id UUID,
    location_id UUID,
    overlap_start TIMESTAMPTZ,
    overlap_end TIMESTAMPTZ,
    overlap_minutes INTEGER,
    checkin_id UUID,
    checkin_verified BOOLEAN,
    post_window_start TIMESTAMPTZ,
    post_window_end TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID := auth.uid();
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_post_ids IS NULL OR array_length(p_post_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH posts_in_scope AS (
        SELECT
            p.id,
            p.location_id,
            _post_window(p.*) AS pw
        FROM posts p
        WHERE p.id = ANY(p_post_ids)
          AND NOT isempty(_post_window(p.*))
          AND lower(_post_window(p.*)) IS NOT NULL
    ),
    candidate AS (
        SELECT
            ps.id           AS post_id,
            ps.location_id  AS location_id,
            ps.pw           AS post_window,
            uc.id           AS checkin_id,
            uc.verified     AS checkin_verified,
            _checkin_window(uc) * ps.pw AS overlap_range
        FROM posts_in_scope ps
        JOIN user_checkins uc
          ON uc.user_id = v_caller
         AND uc.location_id = ps.location_id
    ),
    valid AS (
        SELECT
            post_id,
            location_id,
            post_window,
            checkin_id,
            checkin_verified,
            lower(overlap_range) AS overlap_start,
            upper(overlap_range) AS overlap_end,
            EXTRACT(EPOCH FROM (upper(overlap_range) - lower(overlap_range)))::INTEGER / 60 AS overlap_minutes,
            ROW_NUMBER() OVER (
                PARTITION BY post_id
                ORDER BY EXTRACT(EPOCH FROM (upper(overlap_range) - lower(overlap_range))) DESC
            ) AS rn
        FROM candidate
        WHERE NOT isempty(overlap_range)
          AND lower(overlap_range) IS NOT NULL
          AND upper(overlap_range) IS NOT NULL
    )
    SELECT
        v.post_id,
        v.location_id,
        v.overlap_start,
        v.overlap_end,
        v.overlap_minutes,
        v.checkin_id,
        v.checkin_verified,
        lower(v.post_window) AS post_window_start,
        upper(v.post_window) AS post_window_end
    FROM valid v
    WHERE v.rn = 1;
END;
$$;

COMMENT ON FUNCTION get_my_overlaps_for_posts(UUID[]) IS
    'Batch: returns the calling user''s best overlap (per post) for a set of post IDs. Used by Feature 2.1 timeline overlay.';

GRANT EXECUTE ON FUNCTION get_my_overlaps_for_posts(UUID[]) TO authenticated;

-- ============================================================================
-- get_conversation_copresence (Feature 4.3 — between two matched users)
-- ============================================================================
-- Returns the best overlap between BOTH parties in a conversation: post
-- author and consumer must have overlapping verified check-ins at the
-- post's location.
--
-- Auth: caller must be one of the two parties in the conversation.

CREATE OR REPLACE FUNCTION get_conversation_copresence(
    p_conversation_id UUID
)
RETURNS TABLE (
    conversation_id UUID,
    location_id UUID,
    location_name TEXT,
    overlap_start TIMESTAMPTZ,
    overlap_end TIMESTAMPTZ,
    overlap_minutes INTEGER,
    both_verified BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID := auth.uid();
    v_conv conversations%ROWTYPE;
    v_post posts%ROWTYPE;
    v_post_window tstzrange;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_conv FROM conversations WHERE id = p_conversation_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF v_caller <> v_conv.producer_id AND v_caller <> v_conv.consumer_id THEN
        RETURN;
    END IF;

    SELECT * INTO v_post FROM posts WHERE id = v_conv.post_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    v_post_window := _post_window(v_post);
    IF isempty(v_post_window) OR lower(v_post_window) IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH producer_windows AS (
        SELECT
            _checkin_window(uc) * v_post_window AS w,
            uc.verified
        FROM user_checkins uc
        WHERE uc.user_id = v_conv.producer_id
          AND uc.location_id = v_post.location_id
    ),
    consumer_windows AS (
        SELECT
            _checkin_window(uc) * v_post_window AS w,
            uc.verified
        FROM user_checkins uc
        WHERE uc.user_id = v_conv.consumer_id
          AND uc.location_id = v_post.location_id
    ),
    pairs AS (
        SELECT
            (pw.w * cw.w) AS overlap_range,
            (pw.verified AND cw.verified) AS both_verified
        FROM producer_windows pw
        CROSS JOIN consumer_windows cw
        WHERE NOT isempty(pw.w) AND NOT isempty(cw.w)
    ),
    best AS (
        SELECT
            overlap_range,
            both_verified,
            EXTRACT(EPOCH FROM (upper(overlap_range) - lower(overlap_range)))::INTEGER / 60 AS overlap_minutes
        FROM pairs
        WHERE NOT isempty(overlap_range)
          AND lower(overlap_range) IS NOT NULL
          AND upper(overlap_range) IS NOT NULL
        ORDER BY (upper(overlap_range) - lower(overlap_range)) DESC
        LIMIT 1
    )
    SELECT
        p_conversation_id            AS conversation_id,
        v_post.location_id           AS location_id,
        l.name                       AS location_name,
        lower(b.overlap_range)       AS overlap_start,
        upper(b.overlap_range)       AS overlap_end,
        b.overlap_minutes,
        b.both_verified
    FROM best b
    JOIN locations l ON l.id = v_post.location_id;
END;
$$;

COMMENT ON FUNCTION get_conversation_copresence(UUID) IS
    'Best mutual overlap between both parties in a conversation. Used by Feature 4.3 trust badge.';

GRANT EXECUTE ON FUNCTION get_conversation_copresence(UUID) TO authenticated;
