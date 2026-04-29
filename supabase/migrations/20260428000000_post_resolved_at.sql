-- ============================================================================
-- Post Resolution Tracking (Feature 3.7)
-- ============================================================================
-- Adds resolved_at + resolved_response_id to posts so that once a post receives
-- an accepted response (a successful match), it is auto-removed from the
-- public discovery feed but remains visible to its author and conversation
-- participants.
--
-- Why a separate column instead of reusing is_active:
--   is_active represents the producer's manual deactivation. resolved_at
--   represents acceptance-driven resolution. Keeping these distinct lets us
--   show "Resolved" vs "Hidden" states differently in the producer's own UI,
--   and avoids ambiguity when a post is unhidden later.
-- ============================================================================

-- ============================================================================
-- SCHEMA: posts.resolved_at + resolved_response_id
-- ============================================================================

ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolved_response_id UUID REFERENCES post_responses(id) ON DELETE SET NULL;

COMMENT ON COLUMN posts.resolved_at IS
    'Set when a post_responses row for this post transitions to status=accepted. Filtered out of discovery feeds.';
COMMENT ON COLUMN posts.resolved_response_id IS
    'The accepted response that resolved this post.';

-- Partial index on unresolved active posts (the hot path for feed queries)
CREATE INDEX IF NOT EXISTS idx_posts_active_unresolved
    ON posts(created_at DESC)
    WHERE is_active = TRUE AND resolved_at IS NULL;

-- ============================================================================
-- TRIGGER: mark_post_resolved_on_accept
-- ============================================================================
-- When a post_responses row's status flips to 'accepted', set the parent
-- post's resolved_at and resolved_response_id. First accept wins; subsequent
-- accepts on the same post are ignored (the post is already resolved).
-- Idempotent: re-firing on the same row is a no-op.

CREATE OR REPLACE FUNCTION mark_post_resolved_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'accepted'
       AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'accepted')
    THEN
        UPDATE posts
        SET resolved_at = COALESCE(resolved_at, NOW()),
            resolved_response_id = COALESCE(resolved_response_id, NEW.id)
        WHERE id = NEW.post_id
          AND resolved_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION mark_post_resolved_on_accept() IS
    'Sets posts.resolved_at when a post_responses row transitions to accepted. First accept wins.';

DROP TRIGGER IF EXISTS on_post_response_accepted ON post_responses;
CREATE TRIGGER on_post_response_accepted
    AFTER INSERT OR UPDATE OF status ON post_responses
    FOR EACH ROW
    WHEN (NEW.status = 'accepted')
    EXECUTE FUNCTION mark_post_resolved_on_accept();

-- ============================================================================
-- BACKFILL: existing accepted responses
-- ============================================================================
-- For any post that already has an accepted response but no resolved_at, set
-- resolved_at from the earliest accepted response's responded_at (or
-- created_at if responded_at is null).

UPDATE posts p
SET resolved_at = sub.resolved_at,
    resolved_response_id = sub.response_id
FROM (
    SELECT DISTINCT ON (pr.post_id)
        pr.post_id,
        pr.id AS response_id,
        COALESCE(pr.responded_at, pr.created_at) AS resolved_at
    FROM post_responses pr
    WHERE pr.status = 'accepted'
    ORDER BY pr.post_id, COALESCE(pr.responded_at, pr.created_at) ASC
) sub
WHERE p.id = sub.post_id
  AND p.resolved_at IS NULL;
