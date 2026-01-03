# Push Notification Setup Guide

This document provides instructions for configuring push notifications for production deployment.

## Overview

Backtrack uses Expo Push Notifications with Supabase Edge Functions for delivering notifications. The system supports:

- **Match Notifications**: When users match on posts
- **Message Notifications**: When users receive new messages
- **Spark Notifications**: When users are near frequently visited locations (optional)

## Prerequisites

1. **Expo Push Service**: Automatic with Expo managed workflow
2. **Supabase Edge Functions**: Deployed and configured
3. **Database Migrations**: All notification-related migrations applied

## Required Database Migrations

Ensure these migrations are applied to your production database:

```bash
# Check migration status
npx supabase migration list

# Required migrations:
# - 024_push_tokens.sql      (Push token storage)
# - 026_notification_preferences.sql (User preferences)
# - 027_notification_webhooks.sql (Triggers for notifications)
# - 032_spark_notifications.sql (Optional: Spark notifications)
# - 040_match_notifications.sql (Match tracking)
```

## Step 1: Deploy Edge Functions

Deploy all notification-related Edge Functions to your Supabase project:

```bash
# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy Edge Functions
npx supabase functions deploy send-notification
npx supabase functions deploy send-match-notification
npx supabase functions deploy send-spark-notification
```

## Step 2: Configure Edge Function URLs

After deploying, configure the Edge Function URLs in your database:

```sql
-- Create or update app_configuration table
CREATE TABLE IF NOT EXISTS app_configuration (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set the Edge Function URLs (replace YOUR_PROJECT with your actual project reference)
INSERT INTO app_configuration (key, value) VALUES
  ('edge_function_url', 'https://YOUR_PROJECT.supabase.co/functions/v1/send-notification'),
  ('spark_notification_url', 'https://YOUR_PROJECT.supabase.co/functions/v1/send-spark-notification'),
  ('match_notification_url', 'https://YOUR_PROJECT.supabase.co/functions/v1/send-match-notification')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
```

## Step 3: Configure Service Role Key

The Edge Functions need authentication to access the database:

```sql
-- Store the service role key securely
INSERT INTO app_configuration (key, value) VALUES
  ('service_role_key', 'YOUR_SERVICE_ROLE_KEY')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
```

**Important**: Keep your service role key secret. Never expose it in client-side code.

## Step 4: Enable Database Triggers

The notification triggers are created but may be disabled. Enable them:

```sql
-- Enable match notification trigger
ALTER TABLE conversations ENABLE TRIGGER notify_on_new_match;

-- Enable message notification trigger
ALTER TABLE messages ENABLE TRIGGER notify_on_new_message;

-- (Optional) Enable spark notification trigger
ALTER TABLE posts ENABLE TRIGGER on_post_created_spark;
```

## Step 5: Enable pg_net Extension

The triggers use pg_net for HTTP requests to Edge Functions:

```sql
-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net;
```

## Environment Variables

Ensure these environment variables are set in your Expo/EAS configuration:

```bash
# For push notification token acquisition
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id

# Optional: For development testing
EXPO_PUBLIC_NOTIFICATION_DEBUG=true
```

## Testing Notifications

### 1. Manual Test Script

Create a test notification:

```bash
# Run from project root
./scripts/send-test-notification.sh
```

### 2. Database Test

```sql
-- Insert a test push token
INSERT INTO expo_push_tokens (user_id, token, device_info)
VALUES (
  'YOUR_USER_ID',
  'ExponentPushToken[XXXXXXXXXXXXX]',
  '{"platform": "ios", "test": true}'
);

-- Verify the token was stored
SELECT * FROM expo_push_tokens WHERE user_id = 'YOUR_USER_ID';
```

### 3. Edge Function Test

```bash
# Test the send-notification function directly
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/send-notification' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "notification": {
      "to": "ExponentPushToken[XXXXXXXXXXXXX]",
      "title": "Test Notification",
      "body": "This is a test message"
    }
  }'
```

## Troubleshooting

### Notifications Not Sending

1. **Check Edge Function logs**:
   ```bash
   npx supabase functions logs send-notification
   ```

2. **Verify database triggers are enabled**:
   ```sql
   SELECT tgname, tgenabled FROM pg_trigger
   WHERE tgname LIKE '%notify%';
   ```

3. **Check pg_net extension**:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

### Invalid Push Tokens

The system automatically removes invalid tokens when Expo returns `DeviceNotRegistered`. Check for patterns:

```sql
-- Find recently removed tokens
SELECT * FROM expo_push_tokens
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC
LIMIT 10;
```

### Rate Limiting

Expo Push Service has rate limits. Monitor your usage:

- **Burst limit**: 600 notifications per second
- **Daily limit**: Based on your Expo plan

## Production Checklist

Before going live, verify:

- [ ] All Edge Functions deployed
- [ ] Edge Function URLs configured in database
- [ ] Service role key stored securely
- [ ] Database triggers enabled
- [ ] pg_net extension enabled
- [ ] Test notification sent successfully
- [ ] Push tokens being registered from mobile app
- [ ] Notification preferences working
- [ ] Error logging/monitoring configured

## Deep Linking (Optional)

To handle notification taps and navigate to specific screens:

1. Configure linking in `navigation/AppNavigator.tsx`:

```typescript
const linking = {
  prefixes: ['backtrack://', 'https://backtrack.social'],
  config: {
    screens: {
      Chat: 'conversation/:id',
      PostDetail: 'post/:id',
      Profile: 'profile',
    },
  },
}
```

2. Notification payloads should include a `url` field:

```json
{
  "to": "ExponentPushToken[...]",
  "title": "New message",
  "body": "You have a new message",
  "data": {
    "url": "backtrack://conversation/123"
  }
}
```

## Monitoring

### Edge Function Metrics

Monitor via Supabase Dashboard:
- Functions > Logs
- Functions > Metrics

### Database Metrics

```sql
-- Count notifications sent today
SELECT COUNT(*) FROM match_notifications
WHERE created_at > NOW() - INTERVAL '1 day';

-- Count active push tokens
SELECT COUNT(*) FROM expo_push_tokens
WHERE deleted_at IS NULL;
```

## Security Considerations

1. **Token Privacy**: Push tokens are user-specific credentials. Never expose them publicly.

2. **RLS Policies**: Ensure Row Level Security is properly configured:
   - Users can only manage their own tokens
   - Service role has read access for sending

3. **Rate Limiting**: The notification service includes built-in rate limiting to prevent abuse.

4. **Audit Trail**: All sent notifications are logged for compliance and debugging.
