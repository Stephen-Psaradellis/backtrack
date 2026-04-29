-- ============================================================================
-- Verified Social Accounts (Feature 5.6)
-- ============================================================================
-- OAuth-verified social handles + opt-in per-conversation sharing.
--
-- Privacy model:
--   - A user may connect 0–N OAuth-verified social accounts (Instagram,
--     Twitter, TikTok). Verification means: we performed an OAuth code
--     exchange and read the handle/user_id from the provider's profile API,
--     so the handle provably belongs to the user.
--   - Connected accounts are private by default. Only the owner can read
--     their own row.
--   - To share with a conversation partner, the owner explicitly opts in
--     per platform via conversation_social_shares. Sharing is only allowed
--     when conversations.status = 'active' (post-acceptance).
--   - The other party reads shared handles via get_match_socials RPC,
--     which checks both conversation membership and a current share row.
--   - Tokens stored encrypted at rest using pgp_sym_encrypt; the symmetric
--     key lives in app_configuration (keyed 'social_token_encryption_key').
--     Never returned to the client.
--
-- Snapchat is intentionally not supported — it has no public identity API
-- equivalent to Instagram Basic Display / Twitter OAuth 2.0 / TikTok Login
-- Kit at the time of this migration. The platform CHECK constraint will
-- need extension if a future provider is added.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- VERIFIED_SOCIAL_ACCOUNTS
-- ============================================================================
-- One row per (user_id, platform). Re-connecting overwrites.

CREATE TABLE IF NOT EXISTS verified_social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'twitter', 'tiktok')),
    platform_user_id TEXT NOT NULL,
    handle TEXT NOT NULL,
    -- pgp_sym_encrypt'ed bytea. NULL when provider does not return refresh tokens.
    access_token_encrypted BYTEA,
    refresh_token_encrypted BYTEA,
    token_expires_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_refreshed_at TIMESTAMPTZ,
    CONSTRAINT verified_social_accounts_unique UNIQUE (user_id, platform)
);

COMMENT ON TABLE verified_social_accounts IS
    'OAuth-verified social media accounts. Tokens encrypted at rest. Private to the owning user.';

CREATE INDEX IF NOT EXISTS idx_verified_social_accounts_user
    ON verified_social_accounts(user_id);

ALTER TABLE verified_social_accounts ENABLE ROW LEVEL SECURITY;

-- Owner can SELECT their own row, but the encrypted token columns are NEVER
-- exposed via row-level select — clients must call get_my_verified_socials
-- which strips them. We still allow direct SELECT for the convenience of
-- the owner reading non-token columns; the encrypted columns are bytea so
-- they round-trip as opaque hex strings (still useless without the key).
DROP POLICY IF EXISTS "verified_social_accounts_select_own" ON verified_social_accounts;
CREATE POLICY "verified_social_accounts_select_own"
    ON verified_social_accounts FOR SELECT
    USING (auth.uid() = user_id);

-- Inserts/updates only via SECURITY DEFINER RPCs (record_verified_social_account).
-- Block direct INSERT/UPDATE/DELETE from authenticated.
DROP POLICY IF EXISTS "verified_social_accounts_no_direct_writes" ON verified_social_accounts;
CREATE POLICY "verified_social_accounts_no_direct_writes"
    ON verified_social_accounts FOR ALL
    TO authenticated
    USING (FALSE)
    WITH CHECK (FALSE);

-- Service role bypasses RLS automatically.

-- ============================================================================
-- CONVERSATION_SOCIAL_SHARES
-- ============================================================================
-- One row per (conversation_id, user_id, platform). Presence of a row =
-- "user has shared this platform with the other party in this conversation".

CREATE TABLE IF NOT EXISTS conversation_social_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'twitter', 'tiktok')),
    shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT conversation_social_shares_unique UNIQUE (conversation_id, user_id, platform)
);

COMMENT ON TABLE conversation_social_shares IS
    'Per-conversation opt-in to reveal a verified social account to the other party.';

CREATE INDEX IF NOT EXISTS idx_conversation_social_shares_conversation
    ON conversation_social_shares(conversation_id);

ALTER TABLE conversation_social_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversation_social_shares_select_participants" ON conversation_social_shares;
CREATE POLICY "conversation_social_shares_select_participants"
    ON conversation_social_shares FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = conversation_id
              AND (auth.uid() = c.producer_id OR auth.uid() = c.consumer_id)
        )
    );

-- Writes only through RPCs.
DROP POLICY IF EXISTS "conversation_social_shares_no_direct_writes" ON conversation_social_shares;
CREATE POLICY "conversation_social_shares_no_direct_writes"
    ON conversation_social_shares FOR ALL
    TO authenticated
    USING (FALSE)
    WITH CHECK (FALSE);

-- ============================================================================
-- Encryption helpers
-- ============================================================================
-- The symmetric key lives in app_configuration. If missing, the helpers
-- raise — never silently store cleartext.

CREATE OR REPLACE FUNCTION _social_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key TEXT;
BEGIN
    SELECT value INTO v_key FROM app_configuration WHERE key = 'social_token_encryption_key';
    IF v_key IS NULL OR v_key = '' THEN
        RAISE EXCEPTION 'social_token_encryption_key is not configured';
    END IF;
    RETURN v_key;
END;
$$;

CREATE OR REPLACE FUNCTION _encrypt_social_token(p_plaintext TEXT)
RETURNS BYTEA
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE
        WHEN p_plaintext IS NULL THEN NULL
        ELSE pgp_sym_encrypt(p_plaintext, _social_encryption_key())
    END
$$;

-- Seed an empty key row so prod admins can populate without DDL access.
INSERT INTO app_configuration (key, value)
VALUES ('social_token_encryption_key', '')
ON CONFLICT (key) DO NOTHING;

-- Provider credential rows (placeholders, populated by ops per environment).
INSERT INTO app_configuration (key, value) VALUES
    ('social_oauth_instagram_client_id', ''),
    ('social_oauth_instagram_client_secret', ''),
    ('social_oauth_twitter_client_id', ''),
    ('social_oauth_twitter_client_secret', ''),
    ('social_oauth_tiktok_client_id', ''),
    ('social_oauth_tiktok_client_secret', ''),
    ('social_oauth_redirect_uri', '')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- RPC: record_verified_social_account
-- ============================================================================
-- Called by the OAuth callback edge function (service role) after a
-- successful code exchange. Encrypts tokens and upserts.

CREATE OR REPLACE FUNCTION record_verified_social_account(
    p_user_id UUID,
    p_platform TEXT,
    p_platform_user_id TEXT,
    p_handle TEXT,
    p_access_token TEXT,
    p_refresh_token TEXT DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF p_platform NOT IN ('instagram', 'twitter', 'tiktok') THEN
        RAISE EXCEPTION 'unsupported platform: %', p_platform;
    END IF;

    INSERT INTO verified_social_accounts (
        user_id, platform, platform_user_id, handle,
        access_token_encrypted, refresh_token_encrypted, token_expires_at, verified_at
    ) VALUES (
        p_user_id, p_platform, p_platform_user_id, p_handle,
        _encrypt_social_token(p_access_token),
        _encrypt_social_token(p_refresh_token),
        p_expires_at, NOW()
    )
    ON CONFLICT (user_id, platform) DO UPDATE
    SET platform_user_id        = EXCLUDED.platform_user_id,
        handle                  = EXCLUDED.handle,
        access_token_encrypted  = EXCLUDED.access_token_encrypted,
        refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
        token_expires_at        = EXCLUDED.token_expires_at,
        verified_at             = NOW()
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

COMMENT ON FUNCTION record_verified_social_account(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) IS
    'Service-role-only. Called by OAuth callback edge function after code exchange.';

REVOKE EXECUTE ON FUNCTION record_verified_social_account(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION record_verified_social_account(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM authenticated;

-- ============================================================================
-- RPC: get_my_verified_socials
-- ============================================================================
-- Returns the calling user's connected accounts, WITHOUT tokens.

CREATE OR REPLACE FUNCTION get_my_verified_socials()
RETURNS TABLE (
    platform TEXT,
    handle TEXT,
    verified_at TIMESTAMPTZ
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

    RETURN QUERY
    SELECT vsa.platform, vsa.handle, vsa.verified_at
    FROM verified_social_accounts vsa
    WHERE vsa.user_id = v_caller
    ORDER BY vsa.verified_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_verified_socials() TO authenticated;

-- ============================================================================
-- RPC: disconnect_social_account
-- ============================================================================
-- Removes a verified account and any conversation_social_shares for that
-- platform owned by the caller (sharing a non-existent account would be
-- meaningless and risk stale handles).

CREATE OR REPLACE FUNCTION disconnect_social_account(
    p_platform TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID := auth.uid();
    v_deleted INTEGER;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    DELETE FROM conversation_social_shares
    WHERE user_id = v_caller AND platform = p_platform;

    DELETE FROM verified_social_accounts
    WHERE user_id = v_caller AND platform = p_platform;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION disconnect_social_account(TEXT) TO authenticated;

-- ============================================================================
-- RPC: share_socials_with_conversation
-- ============================================================================
-- Opt-in for the caller to share specific platforms with their counterparty
-- in a given conversation. Validates: caller is a participant, conversation
-- is 'active' (post-acceptance), and caller actually has each platform
-- connected. Inserts skip duplicates (per UNIQUE constraint).

CREATE OR REPLACE FUNCTION share_socials_with_conversation(
    p_conversation_id UUID,
    p_platforms TEXT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID := auth.uid();
    v_conv conversations%ROWTYPE;
    v_inserted INTEGER := 0;
    v_platform TEXT;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_conv FROM conversations WHERE id = p_conversation_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conversation not found';
    END IF;

    IF v_caller NOT IN (v_conv.producer_id, v_conv.consumer_id) THEN
        RAISE EXCEPTION 'Not a participant in this conversation';
    END IF;

    IF v_conv.status <> 'active' THEN
        RAISE EXCEPTION 'Sharing only allowed in active (post-acceptance) conversations';
    END IF;

    FOREACH v_platform IN ARRAY p_platforms LOOP
        IF v_platform NOT IN ('instagram', 'twitter', 'tiktok') THEN
            RAISE EXCEPTION 'unsupported platform: %', v_platform;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM verified_social_accounts vsa
            WHERE vsa.user_id = v_caller AND vsa.platform = v_platform
        ) THEN
            CONTINUE;  -- silently skip platforms the user has not connected
        END IF;

        INSERT INTO conversation_social_shares (conversation_id, user_id, platform)
        VALUES (p_conversation_id, v_caller, v_platform)
        ON CONFLICT (conversation_id, user_id, platform) DO NOTHING;

        IF FOUND THEN
            v_inserted := v_inserted + 1;
        END IF;
    END LOOP;

    RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION share_socials_with_conversation(UUID, TEXT[]) TO authenticated;

-- ============================================================================
-- RPC: revoke_social_share
-- ============================================================================
-- Caller un-shares a specific platform in a conversation.

CREATE OR REPLACE FUNCTION revoke_social_share(
    p_conversation_id UUID,
    p_platform TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID := auth.uid();
    v_deleted INTEGER;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    DELETE FROM conversation_social_shares
    WHERE conversation_id = p_conversation_id
      AND user_id = v_caller
      AND platform = p_platform;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION revoke_social_share(UUID, TEXT) TO authenticated;

-- ============================================================================
-- RPC: get_match_socials
-- ============================================================================
-- Returns the OTHER party's verified handles in a conversation, but only
-- for platforms they have explicitly shared. Does NOT return tokens.
-- Also returns the caller's own shared platforms so the UI can show
-- "Shared with you" / "You shared" state without a second query.

CREATE OR REPLACE FUNCTION get_match_socials(
    p_conversation_id UUID
)
RETURNS TABLE (
    side TEXT,            -- 'them' or 'me'
    platform TEXT,
    handle TEXT,
    shared_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID := auth.uid();
    v_conv conversations%ROWTYPE;
    v_other UUID;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_conv FROM conversations WHERE id = p_conversation_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF v_caller NOT IN (v_conv.producer_id, v_conv.consumer_id) THEN
        RETURN;
    END IF;

    v_other := CASE WHEN v_caller = v_conv.producer_id
                    THEN v_conv.consumer_id
                    ELSE v_conv.producer_id END;

    RETURN QUERY
    SELECT
        'them'::TEXT AS side,
        css.platform,
        vsa.handle,
        css.shared_at
    FROM conversation_social_shares css
    JOIN verified_social_accounts vsa
      ON vsa.user_id = css.user_id AND vsa.platform = css.platform
    WHERE css.conversation_id = p_conversation_id
      AND css.user_id = v_other

    UNION ALL

    SELECT
        'me'::TEXT AS side,
        css.platform,
        vsa.handle,
        css.shared_at
    FROM conversation_social_shares css
    JOIN verified_social_accounts vsa
      ON vsa.user_id = css.user_id AND vsa.platform = css.platform
    WHERE css.conversation_id = p_conversation_id
      AND css.user_id = v_caller;
END;
$$;

GRANT EXECUTE ON FUNCTION get_match_socials(UUID) TO authenticated;

-- ============================================================================
-- Account deletion cascades already handled by ON DELETE CASCADE on
-- profiles(id). When a user account is deleted, both verified_social_accounts
-- and conversation_social_shares rows for that user are removed automatically.
-- ============================================================================
