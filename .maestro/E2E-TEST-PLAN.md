# E2E Test Plan: Core User Flows

This document outlines a comprehensive E2E test plan for testing the core features of Backtrack using Android MCP tools.

## Overview

### Features to Test
1. **Check-in + Check-in Notifications** - GPS-verified location check-ins and push notifications
2. **Posting** - Creating "missed connection" posts with avatar, note, and photo verification
3. **Replying from Separate Account + Match Notification** - Consumer matching and notification flow
4. **Chatting** - Anonymous messaging between matched users

### Test Accounts

| Account | Email | Password | Purpose |
|---------|-------|----------|---------|
| User 1 (Producer) | `s.n.psaradellis@gmail.com` | `Test1234!` | Creates posts, receives match notifications |
| User 2 (Consumer) | `spsaradellis@gmail.com` | `Test1234!` | Replies to posts, receives check-in notifications |

### Prerequisites

```bash
# Start Android emulator
emulator -avd Pixel_9_Pro

# Start Expo with Doppler secrets
doppler run -- npx expo start --android

# Set up port forwarding
adb -s emulator-5554 reverse tcp:8081 tcp:8081
```

---

## Test Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MULTI-USER TEST FLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  USER 1 SESSION                    USER 2 SESSION                   │
│  ──────────────                    ──────────────                   │
│                                                                     │
│  1. Login as User 1                                                 │
│  2. Check-in at Location A         ┐                                │
│     → Verify check-in badge        │                                │
│                                    │                                │
│  3. Create Post at Location A      │                                │
│     → Select avatar               │                                │
│     → Write note                  │                                │
│     → Select photo                │  [User 2 should receive         │
│     → Submit                      │   check-in notification if      │
│                                   │   they were checked in]         │
│  4. Logout                         ┘                                │
│                                                                     │
│  ═══════════════════ SWITCH ACCOUNTS ═══════════════════            │
│                                                                     │
│                                    5. Login as User 2               │
│                                    6. Check-in at Location A        │
│                                       → Verify check-in             │
│                                                                     │
│                                    7. Navigate to Ledger            │
│                                       → Find User 1's post          │
│                                       → Tap to view details         │
│                                                                     │
│                                    8. Reply to Post                 │
│                                       → Tap "Start Chat"            │
│  [User 1 should receive           ←  → Verify conversation created │
│   match notification]                                               │
│                                                                     │
│                                    9. Send Chat Message             │
│                                       → Type message                │
│                                       → Verify delivery             │
│                                                                     │
│                                    10. Logout                       │
│                                                                     │
│  ═══════════════════ SWITCH BACK ═══════════════════                │
│                                                                     │
│  11. Login as User 1                                                │
│  12. Open Conversations            │                                │
│      → Find chat with User 2       │                                │
│      → Verify message received     │                                │
│                                    │                                │
│  13. Reply to Message              │                                │
│      → Type response              │                                │
│      → Verify delivery            │                                │
│                                                                     │
│  14. Cleanup (optional)                                             │
│      → Delete test post            │                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Check-in Testing

### 1.1 Test: Successful Check-in

**Goal**: Verify user can check in at a location with GPS verification

**Preconditions**:
- User is logged in
- Location permissions granted
- GPS enabled on device

**Steps**:

1. **Navigate to Home Screen**
   - Verify Home tab is active
   - Look for CheckInButton (floating button at bottom)

2. **Mock GPS Location** (Required for emulator)
   ```bash
   # Set mock location near a known venue
   adb -s emulator-5554 emu geo fix -122.4194 37.7749  # San Francisco coords
   ```

3. **Tap Check-in Button**
   - Use `mobile_list_elements_on_screen` to find "Check In" button
   - Tap the button coordinates

4. **Handle Location Permission** (if prompted)
   - Look for permission dialog
   - Tap "Allow" or "While using the app"

5. **Confirm Check-in**
   - Modal should appear with nearby location name
   - Tap "Confirm" or "Check In" button

6. **Verify Success**
   - CheckInButton should now show location name instead of "Check In"
   - Success toast/haptic feedback

**Expected Database State**:
```sql
-- New record in user_checkins
SELECT * FROM user_checkins
WHERE user_id = '<user1_id>'
AND checked_out_at IS NULL;
-- Should return 1 active check-in with verified=true
```

**MCP Commands**:
```
mobile_take_screenshot → Verify initial state
mobile_list_elements_on_screen → Find Check In button
mobile_click_on_screen_at_coordinates → Tap check-in
mobile_take_screenshot → Verify success state
```

---

### 1.2 Test: Check-in Notification Delivery

**Goal**: Verify users with check-ins receive notifications when posts are created

**Note**: This is challenging to test via MCP because:
- Push notifications require real device registration
- Emulator may not fully support Expo push notifications
- Timing dependencies with Edge Functions

**Alternative Verification**:
1. Check database for notification records after post creation
2. Monitor Supabase Edge Function logs
3. Verify notification preferences are correctly set

---

## Phase 2: Posting Testing

### 2.1 Test: Create Complete Post

**Goal**: Navigate through the 3-step post creation wizard

**Preconditions**:
- User 1 is logged in
- User has at least one approved profile photo
- User is checked in at a location (or has recent check-in)

**Steps**:

#### Step 1: Scene (Location + Time)

1. **Navigate to Create Post**
   - Tap floating "+" button on Home screen OR
   - Navigate via bottom tab

2. **Select Location**
   - Recent locations should appear (from check-in)
   - Tap the location card
   - Verify selection indicator appears

3. **Select Time (Optional)**
   - Tap a day option (Today, Yesterday, etc.)
   - Tap time period (Morning, Afternoon, Evening)
   - Can skip this step

4. **Tap "Next" or Continue**
   - Verify navigation to Step 2

**MCP Commands for Step 1**:
```
mobile_list_elements_on_screen → Find create post button
mobile_click_on_screen_at_coordinates → Tap create
mobile_take_screenshot → Verify Scene step loaded
mobile_list_elements_on_screen → Find location cards
mobile_click_on_screen_at_coordinates → Select location
mobile_list_elements_on_screen → Find Next button
mobile_click_on_screen_at_coordinates → Continue
```

#### Step 2: Moment (Avatar + Note)

1. **Tap Avatar Preview**
   - Look for 160x160 avatar placeholder or existing avatar
   - Tap to open AvatarCreator modal

2. **Select Avatar**
   - AvatarBrowser shows grid of preset avatars
   - Scroll to find desired avatar
   - Tap to select
   - Tap "Done" or confirmation button

3. **Write Note**
   - Tap note input field
   - Type message (minimum 10 characters)
   - Verify character counter updates

4. **Continue to Step 3**
   - Tap "Next" or continue button

**MCP Commands for Step 2**:
```
mobile_take_screenshot → Verify Moment step
mobile_list_elements_on_screen → Find avatar preview
mobile_click_on_screen_at_coordinates → Open avatar selector
mobile_swipe_on_screen → Scroll avatar options if needed
mobile_click_on_screen_at_coordinates → Select avatar
mobile_list_elements_on_screen → Find Done button
mobile_click_on_screen_at_coordinates → Confirm avatar
mobile_list_elements_on_screen → Find note input
mobile_click_on_screen_at_coordinates → Focus input
mobile_type_keys → Type "Looking for the person..." (min 10 chars)
mobile_press_button BACK → Dismiss keyboard
mobile_list_elements_on_screen → Find Next button
mobile_click_on_screen_at_coordinates → Continue
```

#### Step 3: Seal (Photo + Review + Submit)

1. **Review Summary**
   - Verify location, avatar, and note are displayed correctly
   - Each section should be tappable to edit

2. **Select Verification Photo**
   - Grid of approved photos should display
   - Tap to select a photo
   - Photo should show selection indicator

3. **Submit Post**
   - Tap "Post" or "Submit" button
   - Wait for submission to complete

4. **Verify Success**
   - Should navigate to Ledger screen for that location
   - Success toast/message should appear
   - New post should be visible in the list

**MCP Commands for Step 3**:
```
mobile_take_screenshot → Verify Seal step with review
mobile_list_elements_on_screen → Find photo grid
mobile_click_on_screen_at_coordinates → Select photo
mobile_list_elements_on_screen → Find Submit button
mobile_click_on_screen_at_coordinates → Submit post
mobile_take_screenshot → Verify navigation to Ledger
mobile_list_elements_on_screen → Verify post appears
```

**Expected Database State**:
```sql
-- New post should exist
SELECT id, producer_id, location_id, message, created_at
FROM posts
WHERE producer_id = '<user1_id>'
ORDER BY created_at DESC
LIMIT 1;
```

---

### 2.2 Test: Post Validation Errors

**Goal**: Verify form validation prevents incomplete submissions

**Test Cases**:
1. Try to submit without selecting location → Should show error
2. Try to submit without avatar → Should show error or be disabled
3. Try to submit with note < 10 chars → Should show validation message
4. Try to submit without photo → Should be disabled or show error

---

## Phase 3: Reply/Match Testing

### 3.1 Test: Consumer Replies to Post

**Goal**: User 2 finds and replies to User 1's post, creating a conversation

**Preconditions**:
- User 1 has created a post (from Phase 2)
- User 2 is logged in
- User 2 has checked in at the same location (or is a Regular)

**Steps**:

1. **Navigate to Ledger/Explore**
   - Tap Ledger tab or navigate to location
   - Find the location where User 1's post was created

2. **Find User 1's Post**
   - Scroll through posts at the location
   - Look for the post matching User 1's avatar and note

3. **Tap Post to View Details**
   - Navigate to PostDetailScreen
   - Verify post details display correctly

4. **Verify Match Status**
   - If User 2's avatar matches the target avatar, "Start Chat" should be visible
   - Match score may be displayed

5. **Tap "Start Chat"**
   - Button should initiate conversation creation
   - May show brief loading state

6. **Verify Conversation Created**
   - Should navigate to ChatScreen
   - Empty chat interface should display
   - Ready for messaging

**MCP Commands**:
```
mobile_list_elements_on_screen → Find Ledger/Explore tab
mobile_click_on_screen_at_coordinates → Navigate to tab
mobile_take_screenshot → Verify location list
mobile_list_elements_on_screen → Find target location
mobile_click_on_screen_at_coordinates → Open location
mobile_swipe_on_screen direction:up → Scroll to find post
mobile_list_elements_on_screen → Find User 1's post
mobile_click_on_screen_at_coordinates → Open post detail
mobile_take_screenshot → Verify post details
mobile_list_elements_on_screen → Find "Start Chat" button
mobile_click_on_screen_at_coordinates → Start chat
mobile_take_screenshot → Verify chat screen opened
```

**Expected Database State**:
```sql
-- New conversation should exist
SELECT c.id, c.producer_id, c.consumer_id, c.post_id, c.created_at
FROM conversations c
WHERE c.producer_id = '<user1_id>'
AND c.consumer_id = '<user2_id>'
ORDER BY c.created_at DESC;
```

---

### 3.2 Test: Match Notification Delivery

**Goal**: Verify User 1 receives notification when User 2 starts chat

**Challenges**:
- Push notifications difficult to verify in emulator
- Edge Function execution timing

**Alternative Verification**:
- Check Supabase Edge Function logs
- Verify notification_preferences settings
- Check `match_notifications` table for records

---

## Phase 4: Chat Testing

### 4.1 Test: Send Message

**Goal**: User 2 sends a message in the conversation

**Preconditions**:
- Conversation exists between User 1 and User 2
- User 2 is on ChatScreen

**Steps**:

1. **Focus Message Input**
   - Tap the text input field at bottom of screen

2. **Type Message**
   - Use `mobile_type_keys` to enter message text
   - Message should appear in input field

3. **Send Message**
   - Tap send button (arrow icon)
   - Message should appear in chat as sent bubble

4. **Verify Delivery**
   - Message bubble should show sent status (not "sending" or "failed")
   - Haptic feedback should trigger

**MCP Commands**:
```
mobile_list_elements_on_screen → Find message input
mobile_click_on_screen_at_coordinates → Focus input
mobile_type_keys text:"Hello! I think I saw you at the coffee shop!" submit:false
mobile_list_elements_on_screen → Find send button
mobile_click_on_screen_at_coordinates → Send message
mobile_take_screenshot → Verify message appears
```

**Expected Database State**:
```sql
-- New message should exist
SELECT id, conversation_id, sender_id, content, created_at
FROM messages
WHERE conversation_id = '<conversation_id>'
ORDER BY created_at DESC
LIMIT 1;
```

---

### 4.2 Test: Receive Message (User 1 Perspective)

**Goal**: Switch to User 1 and verify message received

**Steps**:

1. **Logout User 2**
   - Navigate to Settings/Profile
   - Tap Logout

2. **Login as User 1**
   - Follow ADB login procedure from CLAUDE.md

3. **Navigate to Conversations**
   - Open inbox/messages tab
   - Find conversation with User 2

4. **Open Conversation**
   - Tap conversation to open
   - Verify User 2's message is visible

5. **Reply to Message**
   - Type and send a response
   - Verify message appears in chat

**MCP Commands**:
```
# Logout User 2
mobile_list_elements_on_screen → Find profile/settings
mobile_click_on_screen_at_coordinates → Open settings
mobile_swipe_on_screen direction:up → Scroll to logout
mobile_list_elements_on_screen → Find logout button
mobile_click_on_screen_at_coordinates → Logout

# Login User 1 (use ADB for reliability)
adb shell input tap <email_field_x> <email_field_y>
adb shell input text "s.n.psaradellis@gmail.com"
adb shell input keyevent 61  # Tab
adb shell input text "Test1234!"
adb shell input keyevent 66  # Enter

# Navigate to chat
mobile_list_elements_on_screen → Find inbox/messages tab
mobile_click_on_screen_at_coordinates → Open inbox
mobile_list_elements_on_screen → Find conversation
mobile_click_on_screen_at_coordinates → Open conversation
mobile_take_screenshot → Verify message received
```

---

### 4.3 Test: Real-time Message Updates

**Goal**: Verify messages appear in real-time without refresh

**Note**: This is difficult to test with a single emulator. Options:
1. Use two emulators running simultaneously
2. Use ADB to send message via API while viewing chat
3. Insert message directly into database and verify UI updates

---

## Phase 5: Cleanup

### 5.1 Clean Up Test Data

**Goal**: Remove test posts and conversations to reset state

**Steps**:

1. **Delete Test Post** (if delete feature exists)
   - Navigate to post
   - Access menu/options
   - Select delete

2. **End Conversation** (optional)
   - Block or archive conversation

**Direct Database Cleanup** (if needed):
```sql
-- Delete test post (cascades to conversation)
DELETE FROM posts
WHERE producer_id = '<user1_id>'
AND created_at > NOW() - INTERVAL '1 hour';

-- Or manually clean up
DELETE FROM conversations WHERE post_id IN (...);
DELETE FROM messages WHERE conversation_id IN (...);
```

---

## Known Limitations & Workarounds

### GPS/Location Issues

**Problem**: Emulator needs mock GPS for check-ins

**Workaround**:
```bash
# Set mock location before check-in tests
adb -s emulator-5554 emu geo fix <longitude> <latitude>

# Example locations:
# San Francisco: -122.4194 37.7749
# New York: -73.9857 40.7484
```

### Push Notification Testing

**Problem**: Push notifications don't work reliably in emulator

**Workarounds**:
1. Skip notification delivery verification
2. Verify notification records in database
3. Check Edge Function logs in Supabase dashboard
4. Test on physical device for notification verification

### Two-Account Testing

**Problem**: Need to switch accounts multiple times

**Workaround**: Use ADB Tab navigation for reliable login:
```bash
# Clear app data between sessions if needed
adb shell pm clear com.backtrack.app

# Use Tab key navigation instead of tapping coordinates
adb shell input text "email"
adb shell input keyevent 61  # Tab to password
adb shell input text "password"
adb shell input keyevent 66  # Enter to submit
```

### Element Detection Issues

**Problem**: `mobile_list_elements_on_screen` may not find all elements

**Workarounds**:
1. Use `mobile_take_screenshot` and visual analysis
2. Use known coordinates from previous successful runs
3. Add testID props to key elements in code
4. Use swipe to ensure elements are in viewport

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Android emulator running (Pixel_9_Pro or similar)
- [ ] Expo dev server running with Doppler secrets
- [ ] Port forwarding configured
- [ ] Mock GPS location set (if testing check-ins)
- [ ] Both test accounts exist and have approved photos

### Test Execution Order
1. [ ] Login as User 1
2. [ ] Check-in at test location
3. [ ] Create post at test location
4. [ ] Logout User 1
5. [ ] Login as User 2
6. [ ] Check-in at same location
7. [ ] Find and reply to User 1's post
8. [ ] Send chat message
9. [ ] Logout User 2
10. [ ] Login as User 1
11. [ ] Verify message received
12. [ ] Reply in chat
13. [ ] Cleanup test data

### Post-Test Verification
- [ ] Verify `user_checkins` table has expected records
- [ ] Verify `posts` table has new post
- [ ] Verify `conversations` table has new conversation
- [ ] Verify `messages` table has chat messages
- [ ] Check for any error logs in Supabase

---

## Appendix: Key Element Locations

These are approximate coordinates. Use `mobile_list_elements_on_screen` for accurate values.

| Element | Approximate Location | Notes |
|---------|---------------------|-------|
| Check-in Button | Bottom center, ~540, 1800 | Floating above tab bar |
| Create Post (+) | Bottom right, ~900, 1800 | FAB button |
| Tab Bar - Home | ~108, 2000 | First tab |
| Tab Bar - Ledger | ~324, 2000 | Second tab |
| Tab Bar - Messages | ~540, 2000 | Third/center tab |
| Tab Bar - Profile | ~756, 2000 | Fourth tab |
| Login Email Field | Center, ~540, 565 | First input on auth screen |
| Login Password Field | Center, ~540, 700 | Second input |
| Login Button | Center, ~540, 850 | Below password |

---

## Appendix: Useful ADB Commands

```bash
# Check device connection
adb devices

# Set mock GPS
adb -s emulator-5554 emu geo fix <lon> <lat>

# Clear app data (full reset)
adb shell pm clear <package_name>

# Input text (faster than MCP type_keys)
adb shell input text "text_here"

# Key events
adb shell input keyevent 61   # Tab
adb shell input keyevent 66   # Enter
adb shell input keyevent 67   # Backspace
adb shell input keyevent 4    # Back button

# Take screenshot
adb shell screencap /sdcard/screen.png
adb pull /sdcard/screen.png ./

# Scroll screen
adb shell input swipe 500 1500 500 500  # Scroll up
adb shell input swipe 500 500 500 1500  # Scroll down
```

---

*Last Updated: 2026-01-12*
