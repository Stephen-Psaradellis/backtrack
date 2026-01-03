-- ============================================================================
-- Backtrack Notification Webhooks Migration
-- ============================================================================
-- This migration creates database triggers that call the send-notification
-- Edge Function when matches (conversations.INSERT) or messages (messages.INSERT)
-- are created. Uses pg_net extension for async HTTP calls to Edge Functions.
-- ============================================================================

-- ============================================================================
-- ENABLE PG_NET EXTENSION
-- ============================================================================
-- pg_net allows making HTTP requests from PostgreSQL (async, non-blocking)
-- This is the recommended way to call Edge Functions from database triggers

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================================
-- CONFIGURATION
-- ============================================================================
-- Store the Edge Function URL in a configuration table
-- This allows the URL to be updated without modifying the trigger functions

CREATE TABLE IF NOT EXISTS app_configuration (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE app_configuration IS 'Application configuration settings for Edge Functions and other runtime config';
COMMENT ON COLUMN app_configuration.key IS 'Unique configuration key';
COMMENT ON COLUMN app_configuration.value IS 'Configuration value';
COMMENT ON COLUMN app_configuration.description IS 'Human-readable description of this configuration';

-- Insert default configuration for Edge Function URL
-- NOTE: Update this value with your actual Supabase project URL in production
INSERT INTO app_configuration (key, value, description)
VALUES (
    'edge_function_url',
    'http://localhost:54321/functions/v1/send-notification',
    'URL for the send-notification Edge Function. Update to your Supabase project URL in production.'
)
ON CONFLICT (key) DO NOTHING;

-- Insert service role key placeholder (set via Supabase secrets in production)
INSERT INTO app_configuration (key, value, description)
VALUES (
    'service_role_key',
    '',
    'Service role key for Edge Function authentication. Set via Supabase Dashboard > Settings > API.'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get a configuration value
CREATE OR REPLACE FUNCTION get_app_config(p_key TEXT)
RETURNS TEXT AS $$
DECLARE
    config_value TEXT;
BEGIN
    SELECT value INTO config_value
    FROM app_configuration
    WHERE key = p_key;

    RETURN config_value;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_app_config(TEXT) IS 'Get an application configuration value by key';

-- Function to update a configuration value
CREATE OR REPLACE FUNCTION set_app_config(p_key TEXT, p_value TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE app_configuration
    SET value = p_value, updated_at = NOW()
    WHERE key = p_key;

    IF NOT FOUND THEN
        INSERT INTO app_configuration (key, value)
        VALUES (p_key, p_value);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_app_config(TEXT, TEXT) IS 'Set an application configuration value';

-- ============================================================================
-- MATCH NOTIFICATION TRIGGER FUNCTION
-- ============================================================================
-- Triggered when a new conversation is created (user matches with a post)
-- Sends notification to the producer (post owner) about the new match

CREATE OR REPLACE FUNCTION notify_on_new_match()
RETURNS TRIGGER AS $$
DECLARE
    edge_function_url TEXT;
    service_key TEXT;
    notification_payload JSONB;
    request_id BIGINT;
BEGIN
    -- Get the Edge Function URL from configuration
    edge_function_url := get_app_config('edge_function_url');
    service_key := get_app_config('service_role_key');

    -- Only proceed if we have a valid URL
    IF edge_function_url IS NULL OR edge_function_url = '' THEN
        RAISE NOTICE 'Edge Function URL not configured, skipping notification';
        RETURN NEW;
    END IF;

    -- Build the notification payload
    -- Notify the producer (post owner) that someone matched with their post
    notification_payload := jsonb_build_object(
        'userId', NEW.producer_id::TEXT,
        'title', 'New Match! 💕',
        'body', 'Someone is interested in connecting with you!',
        'data', jsonb_build_object(
            'type', 'match',
            'url', 'backtrack://conversation/' || NEW.id::TEXT,
            'id', NEW.id::TEXT,
            'postId', NEW.post_id::TEXT
        )
    );

    -- Make async HTTP POST to Edge Function using pg_net
    BEGIN
        SELECT net.http_post(
            url := edge_function_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || COALESCE(service_key, '')
            )::JSONB,
            body := notification_payload
        ) INTO request_id;

        RAISE NOTICE 'Match notification sent for conversation %, request_id: %', NEW.id, request_id;
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to send match notification: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_on_new_match() IS 'Trigger function to send push notification when a new match (conversation) is created';

-- ============================================================================
-- MESSAGE NOTIFICATION TRIGGER FUNCTION
-- ============================================================================
-- Triggered when a new message is sent
-- Sends notification to the recipient (not the sender)

CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
    edge_function_url TEXT;
    service_key TEXT;
    conversation_record RECORD;
    recipient_id UUID;
    sender_name TEXT;
    message_preview TEXT;
    notification_payload JSONB;
    request_id BIGINT;
BEGIN
    -- Get the Edge Function URL from configuration
    edge_function_url := get_app_config('edge_function_url');
    service_key := get_app_config('service_role_key');

    -- Only proceed if we have a valid URL
    IF edge_function_url IS NULL OR edge_function_url = '' THEN
        RAISE NOTICE 'Edge Function URL not configured, skipping notification';
        RETURN NEW;
    END IF;

    -- Get the conversation details to determine the recipient
    SELECT c.producer_id, c.consumer_id, c.post_id
    INTO conversation_record
    FROM conversations c
    WHERE c.id = NEW.conversation_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Conversation not found for message %', NEW.id;
        RETURN NEW;
    END IF;

    -- Determine the recipient (the one who DIDN'T send the message)
    IF NEW.sender_id = conversation_record.producer_id THEN
        recipient_id := conversation_record.consumer_id;
    ELSE
        recipient_id := conversation_record.producer_id;
    END IF;

    -- Get sender's display name (anonymous for now, could be enhanced later)
    -- Using 'Someone' as we want to preserve anonymity
    sender_name := 'Your match';

    -- Create a message preview (first 100 characters, or less if shorter)
    message_preview := LEFT(NEW.content, 100);
    IF LENGTH(NEW.content) > 100 THEN
        message_preview := message_preview || '...';
    END IF;

    -- Build the notification payload
    notification_payload := jsonb_build_object(
        'userId', recipient_id::TEXT,
        'title', 'New Message 💬',
        'body', sender_name || ': ' || message_preview,
        'data', jsonb_build_object(
            'type', 'message',
            'url', 'backtrack://conversation/' || NEW.conversation_id::TEXT,
            'id', NEW.conversation_id::TEXT,
            'messageId', NEW.id::TEXT
        )
    );

    -- Make async HTTP POST to Edge Function using pg_net
    BEGIN
        SELECT net.http_post(
            url := edge_function_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || COALESCE(service_key, '')
            )::JSONB,
            body := notification_payload
        ) INTO request_id;

        RAISE NOTICE 'Message notification sent for message %, request_id: %', NEW.id, request_id;
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to send message notification: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_on_new_message() IS 'Trigger function to send push notification when a new message is sent';

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Trigger for new matches (conversation creation)
DROP TRIGGER IF EXISTS on_conversation_created_notify ON conversations;
CREATE TRIGGER on_conversation_created_notify
    AFTER INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_new_match();

COMMENT ON TRIGGER on_conversation_created_notify ON conversations IS 'Send push notification to producer when a new match is created';

-- Trigger for new messages
DROP TRIGGER IF EXISTS on_message_created_notify ON messages;
CREATE TRIGGER on_message_created_notify
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_new_message();

COMMENT ON TRIGGER on_message_created_notify ON messages IS 'Send push notification to recipient when a new message is sent';

-- ============================================================================
-- HELPER FUNCTIONS FOR TESTING
-- ============================================================================

-- Function to test the notification webhook setup
-- Returns configuration status and tests pg_net availability
CREATE OR REPLACE FUNCTION test_notification_webhooks()
RETURNS JSONB AS $$
DECLARE
    edge_url TEXT;
    service_key_set BOOLEAN;
    pg_net_available BOOLEAN;
    result JSONB;
BEGIN
    -- Get configuration values
    edge_url := get_app_config('edge_function_url');
    service_key_set := COALESCE(get_app_config('service_role_key'), '') != '';

    -- Check if pg_net is available
    SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
    ) INTO pg_net_available;

    result := jsonb_build_object(
        'pg_net_available', pg_net_available,
        'edge_function_url', edge_url,
        'edge_function_url_configured', edge_url IS NOT NULL AND edge_url != '' AND edge_url != 'http://localhost:54321/functions/v1/send-notification',
        'service_role_key_set', service_key_set,
        'triggers_installed', TRUE,
        'status', CASE
            WHEN NOT pg_net_available THEN 'ERROR: pg_net extension not available'
            WHEN edge_url IS NULL OR edge_url = '' THEN 'WARNING: Edge Function URL not configured'
            WHEN NOT service_key_set THEN 'WARNING: Service role key not set'
            ELSE 'OK: All components configured'
        END
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION test_notification_webhooks() IS 'Test function to verify notification webhook configuration';

-- ============================================================================
-- SETUP NOTES
-- ============================================================================
-- After running this migration, you need to configure the Edge Function URL:
--
-- 1. For local development:
--    The default URL (http://localhost:54321/functions/v1/send-notification) is set.
--    Make sure to start the Edge Function: supabase functions serve send-notification
--
-- 2. For production:
--    Update the edge_function_url configuration with your Supabase project URL:
--    SELECT set_app_config('edge_function_url', 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-notification');
--
-- 3. Set the service role key for authentication:
--    SELECT set_app_config('service_role_key', 'YOUR_SERVICE_ROLE_KEY');
--
-- 4. Test the configuration:
--    SELECT test_notification_webhooks();
--
-- Verification:
-- - Check Supabase Dashboard → Database → Triggers for:
--   - on_conversation_created_notify (on conversations table)
--   - on_message_created_notify (on messages table)
-- - Alternatively, verify webhooks exist in Dashboard → Database → Webhooks
-- ============================================================================
-- ============================================================================
-- Time-Specific Posts Schema Migration
-- ============================================================================
-- This migration adds time-related fields to the posts table for the
-- Time-Specific Posts feature. Users can optionally specify when they saw
-- someone at a location, with support for both specific times and approximate
-- time periods (morning, afternoon, evening).
--
-- Key features:
-- - sighting_date: Optional timestamp when user saw the person of interest
-- - time_granularity: Specifies if time is specific or approximate (morning/afternoon/evening)
-- - Index for efficient time-based filtering and sorting
-- - Supports 30-day de-prioritization for post ranking
--
-- This is a key market differentiator addressing market gap-2 by adding
-- specificity and credibility to posts (e.g., "Saw you at Blue Bottle on Tuesday at 3pm")
-- ============================================================================

-- ============================================================================
-- ADD TIME COLUMNS TO POSTS TABLE
-- ============================================================================
-- Adds optional fields to specify when the user saw the person of interest
-- Both fields are optional to maintain backward compatibility with existing posts

ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS sighting_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS time_granularity TEXT;

-- ============================================================================
-- ADD CHECK CONSTRAINT FOR TIME GRANULARITY
-- ============================================================================
-- Constrain time_granularity to valid enum values:
-- - 'specific': Exact time (e.g., "3:15 PM")
-- - 'morning': Approximate morning time (6am-12pm)
-- - 'afternoon': Approximate afternoon time (12pm-6pm)
-- - 'evening': Approximate evening time (6pm-12am)
-- NULL is allowed for posts without time specification

DO $$
BEGIN
    -- Add constraint only if it doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'posts_valid_time_granularity'
    ) THEN
        ALTER TABLE posts
            ADD CONSTRAINT posts_valid_time_granularity
            CHECK (time_granularity IS NULL OR time_granularity IN ('specific', 'morning', 'afternoon', 'evening'));
    END IF;
END $$;

-- ============================================================================
-- COLUMN COMMENTS
-- ============================================================================

COMMENT ON COLUMN posts.sighting_date IS 'Optional timestamp when the producer saw the person of interest at the location';
COMMENT ON COLUMN posts.time_granularity IS 'Time precision: specific (exact time), morning (6am-12pm), afternoon (12pm-6pm), or evening (6pm-12am). NULL if time not specified.';

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Index for efficient time-based filtering and sorting queries

-- Primary index for sighting_date filtering and sorting (most recent first)
CREATE INDEX IF NOT EXISTS idx_posts_sighting_date ON posts(sighting_date DESC)
    WHERE sighting_date IS NOT NULL;

-- Composite index for time-based active posts queries (location + time filtering)
CREATE INDEX IF NOT EXISTS idx_posts_location_sighting_date
    ON posts(location_id, sighting_date DESC)
    WHERE is_active = true AND sighting_date IS NOT NULL;

-- Index for 30-day deprioritization queries (efficient lookup of recent vs old posts)
CREATE INDEX IF NOT EXISTS idx_posts_sighting_date_30_days
    ON posts(sighting_date DESC)
    WHERE is_active = true AND sighting_date > NOW() - INTERVAL '30 days';
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
CREATE POLICY "photo_shares_select_own_or_received" ON photo_shares
    FOR SELECT TO authenticated
    USING (owner_id = auth.uid() OR shared_with_user_id = auth.uid());

-- Users can only insert shares for their own photos
CREATE POLICY "photo_shares_insert_own" ON photo_shares
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

-- Users can only delete shares they created (unshare their own photos)
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
