-- ============================================================================
-- RLS Security Fixes Migration Part 2
-- ============================================================================
-- Continuation of RLS fixes after partial application
-- ============================================================================

-- ============================================================================
-- 4. ADD RLS TO terms_acceptance TABLE (if it exists)
-- Note: terms_acceptance may be created in a separate migration
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'terms_acceptance') THEN
        ALTER TABLE terms_acceptance ENABLE ROW LEVEL SECURITY;

        EXECUTE 'DROP POLICY IF EXISTS "terms_acceptance_select_own" ON terms_acceptance';
        EXECUTE 'CREATE POLICY "terms_acceptance_select_own" ON terms_acceptance
            FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id)';

        EXECUTE 'DROP POLICY IF EXISTS "terms_acceptance_insert_own" ON terms_acceptance';
        EXECUTE 'CREATE POLICY "terms_acceptance_insert_own" ON terms_acceptance
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id)';

        EXECUTE 'DROP POLICY IF EXISTS "terms_acceptance_update_own" ON terms_acceptance';
        EXECUTE 'CREATE POLICY "terms_acceptance_update_own" ON terms_acceptance
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id)';
    END IF;
END $$;

-- ============================================================================
-- 5. ADD BLOCKING CHECK TO PROFILES SELECT
-- Prevent blocked users from viewing profile of user who blocked them
-- ============================================================================

-- First, drop existing select policy
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;

-- Create new policy with blocking check
CREATE POLICY "profiles_select_authenticated" ON profiles
    FOR SELECT
    TO authenticated
    USING (
        -- User can always see their own profile
        auth.uid() = id
        OR
        -- Otherwise, ensure user is not blocked by profile owner
        NOT EXISTS (
            SELECT 1 FROM blocks b
            WHERE b.blocker_id = profiles.id
            AND b.blocked_id = auth.uid()
        )
    );

-- ============================================================================
-- 6. FIX EVENT_POSTS VISIBILITY (if table exists)
-- Only show event-post associations for active, non-expired posts
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_posts') THEN
        EXECUTE 'DROP POLICY IF EXISTS "event_posts_select_authenticated" ON event_posts';
        EXECUTE 'CREATE POLICY "event_posts_select_authenticated" ON event_posts
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM posts p
                    WHERE p.id = event_posts.post_id
                    AND p.is_active = true
                    AND p.expires_at > NOW()
                )
            )';
    END IF;
END $$;

-- ============================================================================
-- 7. ADD MESSAGE UPDATE PROTECTION TRIGGER
-- Prevent modification of message content after creation
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_message_tampering()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow is_read to be updated
    IF NEW.content IS DISTINCT FROM OLD.content THEN
        RAISE EXCEPTION 'Message content cannot be modified';
    END IF;
    IF NEW.sender_id IS DISTINCT FROM OLD.sender_id THEN
        RAISE EXCEPTION 'Message sender cannot be modified';
    END IF;
    IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
        RAISE EXCEPTION 'Message conversation cannot be modified';
    END IF;
    IF NEW.message_type IS DISTINCT FROM OLD.message_type THEN
        RAISE EXCEPTION 'Message type cannot be modified';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Message timestamp cannot be modified';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_message_tampering ON messages;
CREATE TRIGGER tr_prevent_message_tampering
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION prevent_message_tampering();

-- ============================================================================
-- 8. FIX REGULARS_CONNECTIONS UPDATE POLICY (if table exists)
-- Add explicit WITH CHECK to prevent user reassignment
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'regulars_connections') THEN
        EXECUTE 'DROP POLICY IF EXISTS "regulars_connections_update" ON regulars_connections';
        EXECUTE 'CREATE POLICY "regulars_connections_update" ON regulars_connections
            FOR UPDATE
            TO authenticated
            USING (
                auth.uid() = user_a_id OR auth.uid() = user_b_id
            )
            WITH CHECK (
                auth.uid() = user_a_id OR auth.uid() = user_b_id
            )';
    END IF;
END $$;

-- ============================================================================
-- 9. ADD LOCATION_REGULARS VISIBILITY FIX (if table exists)
-- Ensure viewers also have regulars mode enabled
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location_regulars') THEN
        EXECUTE 'DROP POLICY IF EXISTS "location_regulars_select_visible" ON location_regulars';
        EXECUTE 'CREATE POLICY "location_regulars_select_visible" ON location_regulars
            FOR SELECT
            TO authenticated
            USING (
                -- User can always see their own regular status
                auth.uid() = user_id
                OR
                (
                    -- Check visibility setting of the regular being viewed
                    EXISTS (
                        SELECT 1 FROM profiles viewer
                        WHERE viewer.id = auth.uid()
                        AND viewer.regulars_mode_enabled = true
                    )
                    AND EXISTS (
                        SELECT 1 FROM profiles target
                        WHERE target.id = location_regulars.user_id
                        AND target.regulars_mode_enabled = true
                        AND target.regulars_visibility IN (''public'', ''regulars_only'')
                    )
                )
            )';
    END IF;
END $$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "profiles_select_authenticated" ON profiles IS
'Users can view profiles except those who have blocked them';

COMMENT ON FUNCTION prevent_message_tampering() IS
'Prevents modification of message content, sender, conversation, or timestamp after creation';
