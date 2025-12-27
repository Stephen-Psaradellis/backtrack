-- ============================================================================
-- Push Notification Testing SQL Script
-- ============================================================================
-- This script provides queries to verify and test the push notification system.
-- Run these queries in Supabase SQL Editor or via psql.
--
-- IMPORTANT: Replace placeholder values with actual UUIDs from your database.
-- ============================================================================

-- ============================================================================
-- SECTION 1: VERIFICATION QUERIES
-- ============================================================================

-- 1.1 Check overall notification webhook configuration status
SELECT test_notification_webhooks();

-- 1.2 View current Edge Function configuration
SELECT key, value, description
FROM app_configuration
WHERE key IN ('edge_function_url', 'service_role_key')
ORDER BY key;

-- 1.3 Check if required extensions are installed
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('pg_net', 'uuid-ossp');

-- 1.4 Verify triggers are installed
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('on_conversation_created_notify', 'on_message_created_notify');

-- ============================================================================
-- SECTION 2: PUSH TOKEN QUERIES
-- ============================================================================

-- 2.1 View all registered push tokens (with truncated token for readability)
SELECT
    id,
    user_id,
    LEFT(token, 35) || '...' as token_preview,
    device_info->>'brand' as brand,
    device_info->>'modelName' as model,
    device_info->>'osName' as os,
    device_info->>'osVersion' as os_version,
    created_at,
    updated_at
FROM expo_push_tokens
ORDER BY created_at DESC
LIMIT 20;

-- 2.2 Count tokens per user (to identify users with multiple devices)
SELECT
    user_id,
    COUNT(*) as device_count,
    MAX(created_at) as latest_registration
FROM expo_push_tokens
GROUP BY user_id
ORDER BY device_count DESC, latest_registration DESC
LIMIT 10;

-- 2.3 Find tokens for a specific user
-- REPLACE 'YOUR_USER_ID' with actual UUID
-- SELECT * FROM expo_push_tokens WHERE user_id = 'YOUR_USER_ID'::uuid;

-- ============================================================================
-- SECTION 3: NOTIFICATION PREFERENCES QUERIES
-- ============================================================================

-- 3.1 View all notification preferences
SELECT
    user_id,
    match_notifications,
    message_notifications,
    created_at,
    updated_at
FROM notification_preferences
ORDER BY updated_at DESC
LIMIT 20;

-- 3.2 Find users who have disabled notifications
SELECT
    np.user_id,
    np.match_notifications,
    np.message_notifications,
    pt.token IS NOT NULL as has_push_token
FROM notification_preferences np
LEFT JOIN expo_push_tokens pt ON np.user_id = pt.user_id
WHERE np.match_notifications = false OR np.message_notifications = false
LIMIT 20;

-- ============================================================================
-- SECTION 4: TEST DATA CREATION
-- ============================================================================

-- 4.1 Create a test conversation (match) to trigger notification
-- REPLACE producer_id, consumer_id, and post_id with actual UUIDs
/*
INSERT INTO conversations (producer_id, consumer_id, post_id)
VALUES (
    'PRODUCER_USER_ID'::uuid,  -- User who will receive the match notification
    'CONSUMER_USER_ID'::uuid,  -- User who initiated the match
    'POST_ID'::uuid            -- Post being matched on
)
RETURNING id, producer_id, consumer_id, post_id, created_at;
*/

-- 4.2 Create a test message to trigger notification
-- REPLACE conversation_id and sender_id with actual UUIDs
/*
INSERT INTO messages (conversation_id, sender_id, content)
VALUES (
    'CONVERSATION_ID'::uuid,
    'SENDER_USER_ID'::uuid,
    'Test message for notification testing - ' || NOW()::text
)
RETURNING id, conversation_id, sender_id, LEFT(content, 50) as content_preview, created_at;
*/

-- ============================================================================
-- SECTION 5: DEBUG QUERIES
-- ============================================================================

-- 5.1 Check recent HTTP requests made by pg_net (notification calls)
-- Note: This may require admin access
/*
SELECT
    id,
    created,
    status_code,
    url,
    LEFT(body::text, 100) as request_body
FROM net._http_response
ORDER BY created DESC
LIMIT 10;
*/

-- 5.2 View recent conversations (to find test data)
SELECT
    id,
    producer_id,
    consumer_id,
    post_id,
    created_at
FROM conversations
ORDER BY created_at DESC
LIMIT 10;

-- 5.3 View recent messages (to verify message creation)
SELECT
    id,
    conversation_id,
    sender_id,
    LEFT(content, 50) as content_preview,
    created_at
FROM messages
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- SECTION 6: CONFIGURATION UPDATES
-- ============================================================================

-- 6.1 Update Edge Function URL for production
-- REPLACE 'your-project-ref' with your actual Supabase project reference
/*
SELECT set_app_config(
    'edge_function_url',
    'https://your-project-ref.supabase.co/functions/v1/send-notification'
);
*/

-- 6.2 Set service role key (from Supabase Dashboard > Settings > API)
-- REPLACE with actual service role key
/*
SELECT set_app_config(
    'service_role_key',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);
*/

-- 6.3 Verify configuration was updated
SELECT key, LEFT(value, 50) as value_preview
FROM app_configuration
WHERE key IN ('edge_function_url', 'service_role_key');

-- ============================================================================
-- SECTION 7: CLEANUP QUERIES (Use with caution!)
-- ============================================================================

-- 7.1 Remove specific push token
-- REPLACE with actual token
/*
DELETE FROM expo_push_tokens
WHERE token = 'ExponentPushToken[YOUR_TOKEN_HERE]';
*/

-- 7.2 Remove all tokens for a user (e.g., for testing fresh registration)
-- REPLACE with actual user_id
/*
DELETE FROM expo_push_tokens
WHERE user_id = 'YOUR_USER_ID'::uuid;
*/

-- 7.3 Reset notification preferences for a user
-- REPLACE with actual user_id
/*
DELETE FROM notification_preferences
WHERE user_id = 'YOUR_USER_ID'::uuid;
*/

-- ============================================================================
-- SECTION 8: HELPER FUNCTIONS USAGE
-- ============================================================================

-- 8.1 Get push tokens for a user (using RPC function)
-- SELECT get_user_push_tokens('YOUR_USER_ID'::uuid);

-- 8.2 Check if notification type is enabled for user
-- SELECT is_notification_enabled('YOUR_USER_ID'::uuid, 'match');
-- SELECT is_notification_enabled('YOUR_USER_ID'::uuid, 'message');

-- 8.3 Get notification preferences for user
-- SELECT get_notification_preferences('YOUR_USER_ID'::uuid);

-- ============================================================================
-- END OF TEST SCRIPT
-- ============================================================================
