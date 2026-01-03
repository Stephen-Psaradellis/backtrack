# Testing Strategy: Chat, Notifications, and New UI Features

**Date:** 2026-01-03
**Status:** Proposed

---

## Overview

This document outlines testing strategies for three key areas:
1. Chat functionality
2. Notification system
3. New UI features (larger map, collapsible favorites, POI navigation)

---

## 1. Chat Testing Strategy

### Prerequisites
To test chat functionality, we need:
- Two user accounts (to have a conversation)
- A matched post (consumer matches producer's post)
- Active conversation between users

### Test Setup Options

**Option A: Create Second Test Account**
```bash
# In Supabase dashboard or via API:
# - Create new user: test2@example.com / Test1234!
# - Create profile for this user
# - Use this account to match with existing posts
```

**Option B: Use Supabase Seed Data**
```sql
-- Create a test conversation directly in database
INSERT INTO conversations (producer_id, consumer_id, post_id, status)
VALUES (
  (SELECT id FROM profiles WHERE email = 's.n.psaradellis@gmail.com'),
  'second-user-uuid',
  (SELECT id FROM posts LIMIT 1),
  'active'
);
```

### Chat Test Cases

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| CHAT-001 | View conversation list | Navigate to Chats tab | Shows list of conversations |
| CHAT-002 | Open conversation | Tap on conversation | Opens chat screen |
| CHAT-003 | Send text message | Type message, tap send | Message appears in chat |
| CHAT-004 | Receive message | Other user sends message | Message appears with notification |
| CHAT-005 | Message read receipts | Open unread conversation | Messages marked as read |
| CHAT-006 | Share photo | Tap photo button, select photo | Photo shared in chat |
| CHAT-007 | View shared photo | Tap on shared photo | Photo opens in full view |
| CHAT-008 | Block user | Tap menu > Block | User blocked, conversation hidden |
| CHAT-009 | Report message | Long press message > Report | Report submitted |
| CHAT-010 | Delete conversation | Swipe > Delete | Conversation removed |

### Unit Tests for Chat Hooks
Located in `components/chat/hooks/__tests__/`:
- `useChatMessages.test.ts` - Message fetching and real-time updates
- `useSendMessage.test.ts` - Message sending logic
- `usePhotoSharing.test.ts` - Photo sharing functionality

```bash
# Run chat-specific tests
npm test -- --grep "chat"
```

---

## 2. Notifications Testing Strategy

### Prerequisites
- Push notification permissions granted
- Valid push token registered
- Backend notification service configured

### Test Setup

**Enable Push Notifications:**
1. Grant notification permissions when prompted
2. Verify token stored in `push_tokens` table
3. Configure notification preferences in Profile settings

### Notification Test Cases

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| NOTIF-001 | Permission request | Fresh install, first launch | Permission dialog shown |
| NOTIF-002 | Permission granted | Grant notification permission | Token saved to database |
| NOTIF-003 | New message notification | Receive message when app backgrounded | Push notification appears |
| NOTIF-004 | Notification tap | Tap notification | Opens relevant conversation |
| NOTIF-005 | In-app notification | Receive message when app open | In-app toast shown |
| NOTIF-006 | Disable notifications | Toggle off in settings | No notifications received |
| NOTIF-007 | Notification preferences | Toggle specific types | Only enabled types sent |
| NOTIF-008 | Match notification | Someone matches your post | Push notification for match |
| NOTIF-009 | Badge count | Unread messages exist | App badge shows count |
| NOTIF-010 | Clear badge | Read all messages | Badge cleared |

### Testing Notifications Manually

**Android (ADB):**
```bash
# Send test notification via Firebase console or:
adb shell am broadcast \
  -a com.google.android.c2dm.intent.RECEIVE \
  -c your.package.name \
  --es "title" "Test Notification" \
  --es "body" "Test message body"
```

**iOS (Simulator - Limited):**
```bash
# Use Xcode's notification tester or
# Create .apns file and drag to simulator
```

### Notification Service Testing
Test the notification hooks and services:
```bash
# Test notification hooks
npm test -- --grep "notification"

# Test push token registration
npm test -- --grep "pushToken"
```

---

## 3. New UI Features Testing Strategy

### 3.1 Larger Map (30% Increase)

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| MAP-001 | Map renders at new size | Open HomeScreen | Map height is 325px (was 250px) |
| MAP-002 | Map interaction | Pan, zoom, rotate | Map responds normally |
| MAP-003 | User location | Grant location permission | Blue dot shows current location |
| MAP-004 | Favorite markers | Have favorites saved | Markers appear on map |
| MAP-005 | Marker tap | Tap favorite marker | Favorite item selected in list |

### 3.2 Collapsible Favorites List

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| FAV-001 | Initial state | Open HomeScreen | Favorites expanded by default |
| FAV-002 | Collapse favorites | Tap "Your Favorites" header | List collapses with animation |
| FAV-003 | Expand favorites | Tap collapsed header | List expands with animation |
| FAV-004 | Icon changes | Toggle collapse | ▼ when expanded, ▲ when collapsed |
| FAV-005 | Count badge | Have favorites | Shows count next to title |
| FAV-006 | Map expands | Collapse favorites | Map takes remaining space |
| FAV-007 | Persist selection | Collapse/expand | Selected favorite maintained |

### 3.3 POI Click Navigation

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| POI-001 | POI tap response | Tap POI on map | Haptic feedback triggers |
| POI-002 | Navigate to Ledger | Tap POI | Ledger screen opens |
| POI-003 | Correct location | Tap POI, check Ledger | Shows posts for tapped location |
| POI-004 | POI name passed | Tap named POI | Location name shows in Ledger |
| POI-005 | Empty state | Tap POI with no posts | Shows "No posts" message |
| POI-006 | Back navigation | Press back from Ledger | Returns to HomeScreen |

---

## Test Execution Plan

### Phase 1: Unit Tests (Automated)
```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Phase 2: Component Tests
```bash
# Test specific components
npm test -- components/chat
npm test -- components/favorites
npm test -- screens/HomeScreen
```

### Phase 3: E2E Tests (Manual + MCP)

**Day 1: UI Features**
1. Launch app on emulator
2. Verify map size increase
3. Test collapsible favorites
4. Test POI navigation to posts

**Day 2: Chat**
1. Set up second test account
2. Create match scenario
3. Test conversation flow
4. Test photo sharing

**Day 3: Notifications**
1. Verify push token registration
2. Test notification preferences
3. Test push notifications (requires device or configured backend)
4. Test in-app notifications

### Phase 4: Integration Tests
- Chat real-time sync between devices
- Notification delivery timing
- Cross-feature flows (POI → Posts → Chat)

---

## Test Data Requirements

### For Chat Testing
```sql
-- Ensure test user has a conversation
-- In Supabase SQL Editor:

-- 1. Check existing conversations
SELECT * FROM conversations
WHERE producer_id = (SELECT id FROM profiles WHERE display_name LIKE '%test%')
   OR consumer_id = (SELECT id FROM profiles WHERE display_name LIKE '%test%');

-- 2. If none exist, may need to create match scenario:
--    a. Create second user
--    b. Have second user browse posts
--    c. Create match
```

### For Notification Testing
```sql
-- Verify push token is registered
SELECT * FROM push_tokens WHERE user_id = 'user-uuid';

-- Check notification preferences
SELECT * FROM notification_preferences WHERE user_id = 'user-uuid';
```

---

## Known Issues to Watch

1. **BUG-006**: Ledger posts query may fail for some locations
   - Monitor when testing POI navigation
   - Check `place_id` is properly passed

2. **BUG-004**: Login form focus management
   - May affect test setup when logging in with different accounts

3. **Pre-existing TypeScript errors**
   - Not related to new features, but may need fixing for CI/CD

---

## Success Criteria

- [ ] All MAP-* tests pass
- [ ] All FAV-* tests pass
- [ ] All POI-* tests pass
- [ ] CHAT-001 through CHAT-005 pass (core chat flow)
- [ ] NOTIF-001, NOTIF-002 pass (permission + token)
- [ ] No new bugs introduced
- [ ] No regressions in existing functionality

---

## Next Steps

1. **Immediate**: Run E2E tests for new UI features
2. **Short-term**: Set up chat test scenario (second account or seeded data)
3. **Medium-term**: Configure push notification testing environment
4. **Ongoing**: Add automated tests for critical paths

---

**Document Version:** 1.0
**Last Updated:** 2026-01-03
