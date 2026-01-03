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
