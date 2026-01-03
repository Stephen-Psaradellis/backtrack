-- ============================================================================
-- Backtrack Photo Shares Migration
-- ============================================================================
-- This migration creates the photo_shares table for tracking which profile
-- photos have been selectively shared with specific matches in conversations.
-- Photos remain private by default and can only be seen by recipients once shared.
-- ============================================================================

-- ============================================================================
-- PHOTO SHARES TABLE
-- ============================================================================
-- Junction table tracking per-match photo visibility. When a user shares a
-- photo with a match in a conversation, a record is created here.
-- Photos shared in one conversation remain private in other conversations.

CREATE TABLE IF NOT EXISTS photo_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID REFERENCES profile_photos(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    shared_with_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Ensure unique constraint: one share per photo-user-conversation combination
    CONSTRAINT photo_shares_unique UNIQUE (photo_id, shared_with_user_id, conversation_id),

    -- Ensure owner cannot share with themselves
    CONSTRAINT photo_shares_no_self_share CHECK (owner_id != shared_with_user_id)
);

-- Comment on photo_shares table and columns
COMMENT ON TABLE photo_shares IS 'Tracks which profile photos are shared with specific matches in conversations';
COMMENT ON COLUMN photo_shares.id IS 'Unique identifier for the share record';
COMMENT ON COLUMN photo_shares.photo_id IS 'Reference to the profile photo being shared';
COMMENT ON COLUMN photo_shares.owner_id IS 'User who owns the photo and initiated the share';
COMMENT ON COLUMN photo_shares.shared_with_user_id IS 'User who can now view the photo';
COMMENT ON COLUMN photo_shares.conversation_id IS 'Conversation context where the share occurred';
COMMENT ON COLUMN photo_shares.created_at IS 'Timestamp when the photo was shared';

-- ============================================================================
-- INDEXES FOR EFFICIENT QUERIES
-- ============================================================================

-- Index for looking up shares by photo
CREATE INDEX IF NOT EXISTS idx_photo_shares_photo_id ON photo_shares(photo_id);

-- Index for looking up shares by recipient
CREATE INDEX IF NOT EXISTS idx_photo_shares_shared_with ON photo_shares(shared_with_user_id);

-- Index for looking up shares by conversation
CREATE INDEX IF NOT EXISTS idx_photo_shares_conversation ON photo_shares(conversation_id);

-- Index for looking up shares by owner
CREATE INDEX IF NOT EXISTS idx_photo_shares_owner ON photo_shares(owner_id);

-- Composite index for fetching photos shared in a conversation by a specific user
CREATE INDEX IF NOT EXISTS idx_photo_shares_conversation_owner
    ON photo_shares(conversation_id, owner_id);

-- Composite index for checking if a photo is shared with a specific user
CREATE INDEX IF NOT EXISTS idx_photo_shares_photo_recipient
    ON photo_shares(photo_id, shared_with_user_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on photo_shares table
ALTER TABLE photo_shares ENABLE ROW LEVEL SECURITY;

-- Users can view shares they own (outgoing) or are recipients of (incoming)
DROP POLICY IF EXISTS "photo_shares_select_own_or_received" ON photo_shares;
CREATE POLICY "photo_shares_select_own_or_received" ON photo_shares
    FOR SELECT TO authenticated
    USING (owner_id = auth.uid() OR shared_with_user_id = auth.uid());

-- Users can only insert shares for their own photos
DROP POLICY IF EXISTS "photo_shares_insert_own" ON photo_shares;
CREATE POLICY "photo_shares_insert_own" ON photo_shares
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

-- Users can only delete shares they created (unshare their own photos)
DROP POLICY IF EXISTS "photo_shares_delete_own" ON photo_shares;
CREATE POLICY "photo_shares_delete_own" ON photo_shares
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid());

-- Note: No UPDATE policy - shares are immutable (create or delete only)

-- ============================================================================
-- FUNCTIONS FOR PHOTO SHARING
-- ============================================================================

-- Function to share a photo with a match in a conversation
-- Validates ownership and photo approval status before creating share
CREATE OR REPLACE FUNCTION share_photo_with_match(
    p_photo_id UUID,
    p_conversation_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_photo_owner UUID;
    v_photo_status TEXT;
    v_recipient_id UUID;
    v_producer_id UUID;
    v_consumer_id UUID;
    v_share_id UUID;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Validate photo ownership and approval status
    SELECT user_id, moderation_status INTO v_photo_owner, v_photo_status
    FROM profile_photos
    WHERE id = p_photo_id;

    IF v_photo_owner IS NULL THEN
        RAISE EXCEPTION 'Photo not found';
    END IF;

    IF v_photo_owner != v_user_id THEN
        RAISE EXCEPTION 'You can only share your own photos';
    END IF;

    IF v_photo_status != 'approved' THEN
        RAISE EXCEPTION 'Only approved photos can be shared';
    END IF;

    -- Get conversation participants to determine recipient
    SELECT producer_id, consumer_id INTO v_producer_id, v_consumer_id
    FROM conversations
    WHERE id = p_conversation_id;

    IF v_producer_id IS NULL THEN
        RAISE EXCEPTION 'Conversation not found';
    END IF;

    -- Ensure user is a participant in the conversation
    IF v_user_id != v_producer_id AND v_user_id != v_consumer_id THEN
        RAISE EXCEPTION 'You are not a participant in this conversation';
    END IF;

    -- Determine the recipient (the other participant)
    v_recipient_id := CASE
        WHEN v_user_id = v_producer_id THEN v_consumer_id
        ELSE v_producer_id
    END;

    -- Create the share record (upsert to handle re-sharing idempotently)
    INSERT INTO photo_shares (photo_id, owner_id, shared_with_user_id, conversation_id)
    VALUES (p_photo_id, v_user_id, v_recipient_id, p_conversation_id)
    ON CONFLICT (photo_id, shared_with_user_id, conversation_id)
    DO UPDATE SET created_at = NOW()
    RETURNING id INTO v_share_id;

    RETURN v_share_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unshare a photo from a specific match in a conversation
CREATE OR REPLACE FUNCTION unshare_photo_from_match(
    p_photo_id UUID,
    p_conversation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_deleted_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    DELETE FROM photo_shares
    WHERE photo_id = p_photo_id
    AND conversation_id = p_conversation_id
    AND owner_id = v_user_id;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all photos shared with the authenticated user in a conversation
CREATE OR REPLACE FUNCTION get_shared_photos_for_conversation(p_conversation_id UUID)
RETURNS TABLE (
    share_id UUID,
    photo_id UUID,
    owner_id UUID,
    storage_path TEXT,
    is_primary BOOLEAN,
    shared_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    RETURN QUERY
    SELECT
        ps.id AS share_id,
        ps.photo_id,
        ps.owner_id,
        pp.storage_path,
        pp.is_primary,
        ps.created_at AS shared_at
    FROM photo_shares ps
    JOIN profile_photos pp ON pp.id = ps.photo_id
    WHERE ps.conversation_id = p_conversation_id
    AND ps.shared_with_user_id = v_user_id
    AND pp.moderation_status = 'approved'
    ORDER BY ps.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get photos the authenticated user has shared in a conversation
CREATE OR REPLACE FUNCTION get_my_shared_photos_for_conversation(p_conversation_id UUID)
RETURNS TABLE (
    share_id UUID,
    photo_id UUID,
    shared_with_user_id UUID,
    storage_path TEXT,
    is_primary BOOLEAN,
    shared_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    RETURN QUERY
    SELECT
        ps.id AS share_id,
        ps.photo_id,
        ps.shared_with_user_id,
        pp.storage_path,
        pp.is_primary,
        ps.created_at AS shared_at
    FROM photo_shares ps
    JOIN profile_photos pp ON pp.id = ps.photo_id
    WHERE ps.conversation_id = p_conversation_id
    AND ps.owner_id = v_user_id
    ORDER BY ps.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get share status for a specific photo
-- Returns which conversations/matches the photo is shared with
CREATE OR REPLACE FUNCTION get_photo_share_status(p_photo_id UUID)
RETURNS TABLE (
    share_id UUID,
    conversation_id UUID,
    shared_with_user_id UUID,
    shared_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    RETURN QUERY
    SELECT
        ps.id AS share_id,
        ps.conversation_id,
        ps.shared_with_user_id,
        ps.created_at AS shared_at
    FROM photo_shares ps
    WHERE ps.photo_id = p_photo_id
    AND ps.owner_id = v_user_id
    ORDER BY ps.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if a specific photo is shared with a specific user
CREATE OR REPLACE FUNCTION is_photo_shared_with_user(
    p_photo_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM photo_shares ps
        JOIN profile_photos pp ON pp.id = ps.photo_id
        WHERE ps.photo_id = p_photo_id
        AND ps.shared_with_user_id = p_user_id
        AND pp.moderation_status = 'approved'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get count of shares for a photo
CREATE OR REPLACE FUNCTION get_photo_share_count(p_photo_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT COUNT(DISTINCT shared_with_user_id) INTO v_count
    FROM photo_shares
    WHERE photo_id = p_photo_id
    AND owner_id = v_user_id;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- ADDITIONAL RLS POLICY FOR PROFILE PHOTOS
-- ============================================================================
-- Allow recipients to view shared photos (extends existing profile_photos policies)

DROP POLICY IF EXISTS "profile_photos_select_shared" ON profile_photos;
CREATE POLICY "profile_photos_select_shared" ON profile_photos
    FOR SELECT TO authenticated
    USING (
        -- User owns the photo (already covered by existing policy, but included for completeness)
        user_id = auth.uid()
        OR
        -- Photo has been shared with this user and is approved
        (
            moderation_status = 'approved'
            AND EXISTS (
                SELECT 1 FROM photo_shares
                WHERE photo_shares.photo_id = profile_photos.id
                AND photo_shares.shared_with_user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- SETUP NOTES
-- ============================================================================
-- After running this migration:
-- 1. The photo_shares table enables per-match photo visibility control
-- 2. Photos remain private by default until explicitly shared
-- 3. Sharing is per-conversation - a photo shared in one chat stays private in others
-- 4. The share_photo_with_match function handles all validation and creation
-- 5. Real-time subscriptions should watch the photo_shares table for updates
-- 6. The get_shared_photos_for_conversation function returns photos shared with you
-- ============================================================================
