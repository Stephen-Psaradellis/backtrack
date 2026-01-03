# Push Notification End-to-End Testing Guide

This document provides comprehensive instructions for verifying the push notification system on physical devices.

> **CRITICAL**: Push notifications do NOT work on iOS Simulator or Android Emulator. Physical devices are required.

## Prerequisites

### 1. Development Build

Push notifications require a development build (not Expo Go):

```bash
# Build for iOS
npx eas build --profile development --platform ios

# Build for Android
npx eas build --profile development --platform android
```

### 2. Supabase Configuration

Before testing, ensure the database is configured:

```sql
-- Verify notification webhook setup
SELECT test_notification_webhooks();

-- Set your Supabase project URL (replace with actual values)
SELECT set_app_config(
  'edge_function_url',
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-notification'
);

-- Set service role key (from Supabase Dashboard > Settings > API)
SELECT set_app_config(
  'service_role_key',
  'YOUR_SERVICE_ROLE_KEY'
);
```

### 3. Deploy Edge Function

```bash
# Deploy to Supabase
npx supabase functions deploy send-notification

# Or test locally
npx supabase functions serve send-notification --env-file .env.local
```

---

## Test Checklist

### Phase 1: Permission & Token Registration

#### Test 1.1: Fresh Install Permission Flow
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Fresh install app on physical device | App installs successfully |
| 2 | Sign in with test account | Sign in succeeds |
| 3 | System permission prompt appears | iOS: Alert with "Allow Notifications" / Android: Runtime permission dialog |
| 4 | Tap "Allow" | Permission granted |
| 5 | Check database | Token appears in `expo_push_tokens` table |

**Database Verification:**
```sql
-- Check if push token was registered
SELECT
  id,
  user_id,
  token,
  device_info->>'brand' as brand,
  device_info->>'modelName' as model,
  created_at
FROM expo_push_tokens
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
```

#### Test 1.2: Permission Denial Handling
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Fresh install on new device | App installs |
| 2 | Sign in | Sign in succeeds |
| 3 | Deny notification permission | Permission denied |
| 4 | Verify app still works | App functions normally without crash |
| 5 | Check database | No token stored for this user/device |

---

### Phase 2: Match Notifications

#### Test 2.1: Receive Match Notification (App Backgrounded)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User A: Create a post in the app | Post created successfully |
| 2 | Background User A's app (press home) | App in background |
| 3 | User B: Match with User A's post | Conversation created |
| 4 | User A's device | Push notification appears: "New Match! Someone is interested..." |
| 5 | Check notification center | Notification visible with correct title and body |

**Trigger Match via SQL (for testing):**
```sql
-- Create a test conversation (match)
INSERT INTO conversations (producer_id, consumer_id, post_id)
SELECT
  'PRODUCER_USER_ID'::uuid,  -- User who will receive notification
  'CONSUMER_USER_ID'::uuid,  -- User who initiated match
  id
FROM posts
WHERE user_id = 'PRODUCER_USER_ID'
LIMIT 1;
```

#### Test 2.2: Match Notification Deep-Link
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Receive match notification (app closed) | Notification visible |
| 2 | Tap the notification | App opens |
| 3 | App navigates to conversation | Chat screen opens with correct conversation |
| 4 | Verify conversation context | Shows match with correct user |

#### Test 2.3: Match Notifications Disabled
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to Profile screen | Navigate to Profile tab |
| 2 | Find "Notification Preferences" section | Section visible |
| 3 | Toggle OFF "Match Notifications" | Switch turns off |
| 4 | Create another match (via SQL or app) | No notification received |
| 5 | Toggle ON "Match Notifications" | Switch turns on |
| 6 | Create another match | Notification IS received |

---

### Phase 3: Message Notifications

#### Test 3.1: Receive Message Notification
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User A and User B have existing conversation | Verified in database |
| 2 | User B: Open conversation with User A | Chat screen opens |
| 3 | User A: Background or close app | App not in foreground |
| 4 | User B: Send message "Hello!" | Message sent |
| 5 | User A's device | Push notification: "New Message Your match: Hello!" |

**Trigger Message via SQL (for testing):**
```sql
-- Send a test message
INSERT INTO messages (conversation_id, sender_id, content)
VALUES (
  'CONVERSATION_ID'::uuid,
  'SENDER_USER_ID'::uuid,
  'Test message from SQL for notification testing!'
);
```

#### Test 3.2: Message Notification Deep-Link
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Receive message notification (app closed) | Notification visible |
| 2 | Tap the notification | App opens |
| 3 | App navigates to conversation | Chat screen opens |
| 4 | Verify correct conversation | Shows conversation with sender |
| 5 | Message visible in chat | "Test message..." appears |

#### Test 3.3: Message Preview Truncation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send message > 100 characters | Long message sent |
| 2 | Receive notification | Preview shows first 100 chars + "..." |

#### Test 3.4: Message Notifications Disabled
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Toggle OFF "Message Notifications" in Profile | Switch turns off |
| 2 | Receive new message | No notification |
| 3 | Toggle ON "Message Notifications" | Switch turns on |
| 4 | Receive new message | Notification IS received |

---

### Phase 4: Edge Cases

#### Test 4.1: Invalid Token Handling
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Manually insert invalid token in database | Token stored |
| 2 | Trigger notification to that user | Edge Function processes |
| 3 | Check database | Invalid token removed |
| 4 | Valid tokens still work | Notification delivered to valid device |

```sql
-- Insert invalid token for testing
INSERT INTO expo_push_tokens (user_id, token, device_info)
VALUES (
  'TEST_USER_ID'::uuid,
  'ExponentPushToken[INVALID_TOKEN_12345]',
  '{"brand": "Test", "modelName": "Invalid"}'::jsonb
);

-- Check if removed after notification attempt
SELECT * FROM expo_push_tokens WHERE token LIKE '%INVALID%';
```

#### Test 4.2: Multiple Devices
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Sign in on Device 1 | Token 1 registered |
| 2 | Sign in on Device 2 (same user) | Token 2 registered |
| 3 | Trigger notification | Both devices receive notification |

```sql
-- Check multiple tokens for user
SELECT token, device_info->>'modelName' as device
FROM expo_push_tokens
WHERE user_id = 'TEST_USER_ID';
```

#### Test 4.3: Foreground Notification
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | App is in foreground, active | User using app |
| 2 | Trigger notification | In-app notification appears (not system notification) |
| 3 | Verify notification handler | `shouldShowAlert: true` shows in-app alert |

---

### Phase 5: Settings Persistence

#### Test 5.1: Settings Persist Across App Restarts
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Toggle OFF match notifications | Switch off |
| 2 | Force close app completely | App terminated |
| 3 | Reopen app | App opens |
| 4 | Navigate to Profile | Settings visible |
| 5 | Verify match notifications toggle | Still OFF |

```sql
-- Verify settings in database
SELECT * FROM notification_preferences
WHERE user_id = 'TEST_USER_ID';
```

#### Test 5.2: Settings Sync Across Devices
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Device 1: Toggle OFF message notifications | Switch off |
| 2 | Device 2: Open Profile | Navigate to settings |
| 3 | Verify message notifications toggle | Should be OFF (synced) |

---

## Database Verification Queries

### Check All Components Status
```sql
SELECT test_notification_webhooks();
```

### View Recent Push Tokens
```sql
SELECT
  id,
  user_id,
  LEFT(token, 30) || '...' as token_preview,
  device_info->>'modelName' as device,
  created_at
FROM expo_push_tokens
ORDER BY created_at DESC
LIMIT 10;
```

### View Notification Preferences
```sql
SELECT
  user_id,
  match_notifications,
  message_notifications,
  updated_at
FROM notification_preferences
ORDER BY updated_at DESC;
```

### View Recent Triggers Activity
```sql
-- Check if triggers are firing (look at pg_net requests)
SELECT * FROM net._http_response
ORDER BY created DESC
LIMIT 10;
```

---

## Manual Notification Test via API

You can manually test the Edge Function using curl:

```bash
# Test single notification
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-notification' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "USER_UUID_HERE",
    "title": "Test Notification",
    "body": "This is a test notification from the API",
    "data": {
      "type": "match",
      "url": "backtrack://conversation/test-id"
    }
  }'
```

---

## Deep-Link Testing

Test deep-links using uri-scheme:

```bash
# iOS
npx uri-scheme open backtrack://conversation/CONVERSATION_ID --ios

# Android
npx uri-scheme open backtrack://conversation/CONVERSATION_ID --android
```

---

## Troubleshooting

### No Notification Received

1. **Check push token exists:**
   ```sql
   SELECT * FROM expo_push_tokens WHERE user_id = 'YOUR_USER_ID';
   ```

2. **Check notification preferences:**
   ```sql
   SELECT * FROM notification_preferences WHERE user_id = 'YOUR_USER_ID';
   ```

3. **Check Edge Function URL configured:**
   ```sql
   SELECT * FROM app_configuration WHERE key = 'edge_function_url';
   ```

4. **Check Edge Function logs:**
   ```bash
   npx supabase functions logs send-notification
   ```

### Token Not Registering

1. Verify physical device (not simulator)
2. Check Expo project ID is configured in app.json
3. Verify network connectivity
4. Check Supabase RPC function exists: `upsert_push_token`

### Deep-Link Not Working

1. Verify app.json has scheme: "backtrack"
2. Check linking config in AppNavigator.tsx
3. Verify navigation param types match expected format

---

## Sign-Off Checklist

- [ ] Permission request flow works correctly
- [ ] Push tokens are stored in database
- [ ] Match notifications received when app is backgrounded
- [ ] Match notifications received when app is closed
- [ ] Message notifications received with message preview
- [ ] Tapping match notification navigates to conversation
- [ ] Tapping message notification navigates to correct chat
- [ ] Disabling match notifications prevents match notifications
- [ ] Disabling message notifications prevents message notifications
- [ ] Re-enabling notifications restores functionality
- [ ] Settings persist across app restarts
- [ ] Invalid tokens are removed from database
- [ ] Multiple devices receive notifications
- [ ] No console errors or crashes

**Tester Name:** _________________________

**Date:** _________________________

**Device(s) Tested:**
- iOS: _________________________
- Android: _________________________

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
