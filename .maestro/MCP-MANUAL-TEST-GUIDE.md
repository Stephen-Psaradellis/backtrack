# MCP Manual Test Guide

This guide provides step-by-step instructions for Claude to E2E test the Backtrack app using MCP (Mobile Control Protocol) tools on an Android emulator.

## Prerequisites

### 1. Start Android Emulator

```bash
# Start Pixel 9 Pro emulator (or your configured AVD)
emulator -avd Pixel_9_Pro
```

### 2. Start Expo Dev Server

```bash
cd C:/Users/snpsa/love-ledger
doppler run -- npx expo start --android
```

### 3. Configure Port Forwarding

```bash
adb -s emulator-5554 reverse tcp:8081 tcp:8081
```

### 4. Set Mock GPS Location

For check-in testing, set a mock location near a known venue:

```bash
# San Francisco (example)
adb -s emulator-5554 emu geo fix -122.4194 37.7749
```

### 5. Reduce Screenshot Resolution (Optional)

If screenshots cause API errors due to size:

```bash
adb -s emulator-5554 shell wm size 1080x1920
```

---

## Test Accounts

| Account | Email | Password |
|---------|-------|----------|
| User 1 (Producer) | `s.n.psaradellis@gmail.com` | `Test1234!` |
| User 2 (Consumer) | `spsaradellis@gmail.com` | `Test1234!` |

---

## MCP Tool Reference

### Viewing the Screen

```
mobile_take_screenshot(device: "emulator-5554")
```
Use this to see the current app state. Returns a visual image.

### Finding Elements

```
mobile_list_elements_on_screen(device: "emulator-5554")
```
Returns a list of all tappable elements with their coordinates. Use this before clicking.

### Clicking

```
mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: 540, y: 800)
```
Tap at specific coordinates. Always use `mobile_list_elements_on_screen` first to get accurate coordinates.

### Typing

```
mobile_type_keys(device: "emulator-5554", text: "Hello", submit: false)
```
Types text into the focused input. Set `submit: true` to press Enter after typing.

### Swiping/Scrolling

```
mobile_swipe_on_screen(device: "emulator-5554", direction: "up")
```
Directions: `up`, `down`, `left`, `right`

### Pressing Buttons

```
mobile_press_button(device: "emulator-5554", button: "BACK")
```
Buttons: `BACK`, `HOME`, `VOLUME_UP`, `VOLUME_DOWN`, `ENTER`

---

## Test 1: Check-in Flow

### Goal
Verify a user can GPS check-in at a nearby location.

### Steps

1. **Take initial screenshot**
   ```
   mobile_take_screenshot(device: "emulator-5554")
   ```

2. **List elements to find Check In button**
   ```
   mobile_list_elements_on_screen(device: "emulator-5554")
   ```
   Look for element with text "Check In" or id containing "checkin"

3. **Tap Check In button**
   ```
   mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
   ```

4. **Handle location permission** (if shown)
   - List elements again
   - Tap "Allow" or "While using the app"

5. **Wait and screenshot** (check-in modal should appear)
   ```
   mobile_take_screenshot(device: "emulator-5554")
   ```
   Should see location name and "Check In" confirm button

6. **Confirm check-in**
   - List elements
   - Tap "Check In" confirm button (in modal)

7. **Verify success**
   ```
   mobile_take_screenshot(device: "emulator-5554")
   ```
   Button should now show location name instead of "Check In"

### Expected Outcome
- Check-in button changes from "Check In" to showing location name
- User is now checked in (verified in database)

---

## Test 2: Create Post Flow

### Goal
Complete the 3-moment post creation wizard.

### Prerequisites
- User logged in
- User has at least one approved profile photo
- User has checked in or visited a location

### Steps

#### Navigate to Create Post

1. **Take screenshot to see current state**
   ```
   mobile_take_screenshot(device: "emulator-5554")
   ```

2. **Scroll to favorites section**
   ```
   mobile_swipe_on_screen(device: "emulator-5554", direction: "up")
   ```

3. **List elements and find a favorite location**
   ```
   mobile_list_elements_on_screen(device: "emulator-5554")
   ```

4. **Tap on a favorite location card**
   ```
   mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
   ```

5. **Find and tap "Post Here" button**
   ```
   mobile_list_elements_on_screen(device: "emulator-5554")
   mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
   ```

#### Scene Step (Where & When)

6. **Screenshot to verify Scene step**
   ```
   mobile_take_screenshot(device: "emulator-5554")
   ```
   Should see "Where & When" header

7. **Location should be pre-selected. Add time (optional)**
   - List elements
   - Tap "Add when you saw them" if visible
   - Select day (Today, Yesterday, etc.)
   - Select time period (Morning, Afternoon, Evening)

8. **Tap Next**
   ```
   mobile_list_elements_on_screen(device: "emulator-5554")
   # Find button with id "create-post-scene-next" or text "Next"
   mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
   ```

#### Moment Step (Who & What)

9. **Screenshot to verify Moment step**
   ```
   mobile_take_screenshot(device: "emulator-5554")
   ```
   Should see "Who & What" header

10. **Tap avatar preview to open selector**
    ```
    mobile_list_elements_on_screen(device: "emulator-5554")
    # Find element with id "create-post-avatar-preview"
    mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
    ```

11. **Select an avatar and save**
    ```
    mobile_take_screenshot(device: "emulator-5554")
    # Verify avatar creator modal opened
    mobile_list_elements_on_screen(device: "emulator-5554")
    # Find "Save avatar" button
    mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
    ```

12. **Tap note input and type message**
    ```
    mobile_list_elements_on_screen(device: "emulator-5554")
    # Find note input with id "create-post-note-input"
    mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
    mobile_type_keys(device: "emulator-5554", text: "I saw you at the coffee shop today. Would love to connect!", submit: false)
    mobile_press_button(device: "emulator-5554", button: "BACK")  # Dismiss keyboard
    ```

13. **Tap Next**
    ```
    mobile_list_elements_on_screen(device: "emulator-5554")
    # Find button with id "create-post-moment-next"
    mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
    ```

#### Seal Step (Verify & Send)

14. **Screenshot to verify Seal step**
    ```
    mobile_take_screenshot(device: "emulator-5554")
    ```
    Should see "Seal & Send" header with review card

15. **Select a verification photo** (if not auto-selected)
    ```
    mobile_list_elements_on_screen(device: "emulator-5554")
    # Find photo in grid
    mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
    ```

16. **Tap Submit button**
    ```
    mobile_list_elements_on_screen(device: "emulator-5554")
    # Find button with id "create-post-submit" or text "Post Missed Connection"
    mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
    ```

17. **Verify success**
    ```
    mobile_take_screenshot(device: "emulator-5554")
    ```
    Should navigate back to home screen or ledger

### Expected Outcome
- Post created successfully
- Navigated to home screen or ledger
- Post visible in location's post list

---

## Test 3: Reply/Match Flow (User 2)

### Goal
User 2 finds User 1's post and starts a conversation (creates a match).

### Prerequisites
- User 2 logged in
- User 1 has created a post
- User 2 has checked in at the same location (or is a Regular)

### Steps

#### Switch to User 2 (if needed)

1. **Logout current user**
   - Navigate to Profile tab
   - Scroll down to find "Sign Out"
   - Confirm logout

2. **Login as User 2**
   Use ADB for reliable login:
   ```bash
   adb -s emulator-5554 shell input tap <email_x> <email_y>
   adb -s emulator-5554 shell input text "spsaradellis@gmail.com"
   adb -s emulator-5554 shell input keyevent 61  # Tab
   adb -s emulator-5554 shell input text "Test1234!"
   adb -s emulator-5554 shell input keyevent 66  # Enter
   ```

#### Find and Reply to Post

3. **Navigate to the location with User 1's post**
   ```
   mobile_swipe_on_screen(device: "emulator-5554", direction: "up")
   mobile_list_elements_on_screen(device: "emulator-5554")
   # Tap on favorite location
   mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
   ```

4. **Find User 1's post in the ledger**
   ```
   mobile_take_screenshot(device: "emulator-5554")
   # Look for post with User 1's note
   mobile_list_elements_on_screen(device: "emulator-5554")
   # Tap on the post
   mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
   ```

5. **Verify post detail screen**
   ```
   mobile_take_screenshot(device: "emulator-5554")
   ```
   Should see avatar, note, and "Start Chat" button

6. **Tap "Start Chat"**
   ```
   mobile_list_elements_on_screen(device: "emulator-5554")
   # Find "Start Chat" button
   mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
   ```

7. **Verify chat screen opened**
   ```
   mobile_take_screenshot(device: "emulator-5554")
   ```
   Should see empty chat with message input

### Expected Outcome
- Conversation created between User 1 and User 2
- Chat screen displayed
- Ready to send messages

---

## Test 4: Chat Flow

### Goal
Send and receive messages between matched users.

### Prerequisites
- Conversation exists between User 1 and User 2
- User on chat screen

### Steps

#### Send Message (User 2)

1. **Tap message input**
   ```
   mobile_list_elements_on_screen(device: "emulator-5554")
   # Find input with id "chat-message-input"
   mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
   ```

2. **Type and send message**
   ```
   mobile_type_keys(device: "emulator-5554", text: "Hi! I saw you at the coffee shop. Is this you?", submit: false)
   mobile_list_elements_on_screen(device: "emulator-5554")
   # Find Send button
   mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
   ```

3. **Verify message sent**
   ```
   mobile_take_screenshot(device: "emulator-5554")
   ```
   Message should appear in chat bubble

#### Verify Receipt (User 1)

4. **Switch to User 1** (see logout/login steps above)

5. **Navigate to Chats tab**
   ```
   mobile_list_elements_on_screen(device: "emulator-5554")
   # Find "Chats" tab
   mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
   ```

6. **Open conversation**
   ```
   mobile_list_elements_on_screen(device: "emulator-5554")
   # Find conversation (likely "Chat with Consumer")
   mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <x>, y: <y>)
   ```

7. **Verify message received**
   ```
   mobile_take_screenshot(device: "emulator-5554")
   ```
   Should see User 2's message

8. **Reply**
   ```
   mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <input_x>, y: <input_y>)
   mobile_type_keys(device: "emulator-5554", text: "Yes! Nice to meet you!", submit: false)
   # Tap Send
   mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: <send_x>, y: <send_y>)
   ```

### Expected Outcome
- Messages sent and received successfully
- Chat shows both users' messages
- Read receipts update (if applicable)

---

## Common Issues & Solutions

### Issue: Element not found
**Solution:** Use `mobile_take_screenshot` to visually confirm the screen state, then `mobile_swipe_on_screen` to scroll if needed.

### Issue: Tap hits wrong element
**Solution:** Always call `mobile_list_elements_on_screen` immediately before clicking to get current coordinates.

### Issue: Keyboard blocking elements
**Solution:** Press BACK to dismiss keyboard:
```
mobile_press_button(device: "emulator-5554", button: "BACK")
```

### Issue: Login text goes into wrong field
**Solution:** Use ADB Tab navigation instead of tapping:
```bash
adb shell input text "email"
adb shell input keyevent 61  # Tab to password
adb shell input text "password"
adb shell input keyevent 66  # Enter
```

### Issue: Check-in fails (no location found)
**Solution:** Set mock GPS to a location that exists in the database:
```bash
adb emu geo fix <longitude> <latitude>
```

### Issue: Screenshot too large
**Solution:** Reduce emulator resolution:
```bash
adb shell wm size 1080x1920
```

---

## Verification Queries

After testing, verify results in the database:

### Check user_checkins
```sql
SELECT uc.*, l.name as location_name
FROM user_checkins uc
JOIN locations l ON uc.location_id = l.id
WHERE uc.user_id IN ('<user1_id>', '<user2_id>')
ORDER BY uc.checked_in_at DESC
LIMIT 5;
```

### Check posts
```sql
SELECT id, producer_id, message, created_at
FROM posts
ORDER BY created_at DESC
LIMIT 5;
```

### Check conversations
```sql
SELECT c.id, c.producer_id, c.consumer_id, c.created_at
FROM conversations c
ORDER BY c.created_at DESC
LIMIT 5;
```

### Check messages
```sql
SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at
FROM messages m
ORDER BY m.created_at DESC
LIMIT 10;
```

---

## Full Test Sequence

For a complete E2E test run:

1. **Setup**
   - Start emulator
   - Start Expo server
   - Set mock GPS

2. **User 1 Session**
   - Login as User 1
   - Check-in at location
   - Create post
   - Logout

3. **User 2 Session**
   - Login as User 2
   - Check-in at same location
   - Find User 1's post
   - Start chat (match)
   - Send message
   - Logout

4. **User 1 Verification**
   - Login as User 1
   - Open Chats
   - Find conversation
   - Verify message received
   - Reply
   - Verify reply sent

5. **Cleanup** (optional)
   - Delete test post if needed
   - Check out from locations

---

*Last Updated: 2026-01-12*
