-- Verify notification configuration is properly set up
-- This migration tests the configuration and logs results

DO $$
DECLARE
    test_result JSONB;
BEGIN
    -- Run the test function
    test_result := test_notification_webhooks();

    -- Log the results
    RAISE NOTICE 'Notification Webhook Configuration Test: %', test_result;

    -- Verify Edge Function URL is set
    IF test_result->>'edge_function_url_configured' = 'true' THEN
        RAISE NOTICE 'Edge Function URL is configured correctly';
    ELSE
        RAISE WARNING 'Edge Function URL may need to be updated';
    END IF;
END $$;

-- Ensure triggers are enabled (they are enabled by default in 027)
-- Just verify they exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_conversation_created_notify'
    ) THEN
        RAISE EXCEPTION 'Match notification trigger not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_message_created_notify'
    ) THEN
        RAISE EXCEPTION 'Message notification trigger not found';
    END IF;

    RAISE NOTICE 'All notification triggers are installed correctly';
END $$;
