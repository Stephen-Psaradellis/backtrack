# E2E Multi-User Test Plan for Backtrack

This document outlines comprehensive end-to-end testing for all Backtrack features involving interactions between multiple users.

## Overview

**Objective**: Verify all multi-user flows work correctly by testing with two authenticated users simultaneously.

**Test Accounts**:
| Role | Email | Password |
|------|-------|----------|
| User 1 (Primary) | `s.n.psaradellis@gmail.com` | `Test1234!` |
| User 2 (Secondary) | `spsaradellis@gmail.com` | `Test1234!` |

**Documentation Requirements**:
- **Issues Found**: Document in `E2E-MULTI-USER-ISSUES.md`
- **Improvements**: Document in `E2E-MULTI-USER-IMPROVEMENTS.md`

**Issue Documentation Format** (E2E-MULTI-USER-ISSUES.md):
```markdown
## [ISSUE-XXX] Brief Title
- **Severity**: Critical/High/Medium/Low
- **Feature**: Which feature is affected
- **Steps to Reproduce**: Numbered steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happened
- **Screenshots**: Path to screenshot files
- **Relevant Code**: File paths and line numbers if identified
```

**Improvement Documentation Format** (E2E-MULTI-USER-IMPROVEMENTS.md):
```markdown
## [IMP-XXX] Brief Title
- **Feature**: Which feature could be improved
- **Current Behavior**: How it works now
- **Suggested Improvement**: What could be better
- **Rationale**: Why this would help users
- **Priority**: High/Medium/Low
```

---

## Pre-Test Setup Tasks

### Task 0.1: Environment Verification
**Estimated Scope**: Single Claude instance

**Objective**: Ensure the testing environment is properly configured.

**Steps**:
1. Verify Android emulator is running (`adb devices`)
2. Start Expo dev server with Doppler: `doppler run -- npx expo start --android`
3. Set up port forwarding: `adb -s emulator-5554 reverse tcp:8081 tcp:8081`
4. Launch app via deep link
5. Take screenshot to verify app loads correctly
6. Document emulator device ID and screen resolution

**Success Criteria**:
- App launches without errors
- Login screen is visible
- Metro bundler is connected

**Output**: Screenshot saved to `e2e_screenshots/setup_verified.png`

---

### Task 0.2: User 1 Login and Profile Verification
**Estimated Scope**: Single Claude instance

**Objective**: Log in as User 1 and verify profile state.

**Steps**:
1. Log in using ADB tab navigation method (see CLAUDE.md)
2. Navigate to Profile screen
3. Capture screenshot of profile
4. Verify User 1 has:
   - Avatar configured (`own_avatar` set)
   - At least one profile photo (needed for photo sharing tests)
5. Document User 1's avatar configuration for matching tests
6. If no avatar exists, complete onboarding flow
7. If no profile photo exists, add one and wait for moderation approval

**Success Criteria**:
- User 1 logged in successfully
- Avatar config documented
- Profile photo approved (check status in profile)

**Output**:
- Screenshot: `e2e_screenshots/user1_profile.png`
- Document avatar config values in test notes

---

### Task 0.3: User 2 State Verification (Separate Session)
**Estimated Scope**: Single Claude instance

**Objective**: Verify User 2's profile and existing test data.

**Note**: This requires logging out User 1 first, or using a second emulator/device.

**Steps**:
1. Log out User 1 (Profile > Settings > Log Out)
2. Log in as User 2
3. Navigate to Profile screen
4. Verify User 2 has:
   - Avatar configured
   - At least one approved profile photo
5. Navigate to Explore/Ledger to check existing posts
6. Check Chats screen for existing conversations
7. Document:
   - User 2's avatar configuration
   - Any existing posts by User 2
   - Any existing conversations between User 1 and User 2

**Success Criteria**:
- User 2 logged in successfully
- State documented for test planning

**Output**:
- Screenshot: `e2e_screenshots/user2_profile.png`
- Screenshot: `e2e_screenshots/user2_existing_chats.png`

---

## Phase 1: Post Creation and Discovery

### Task 1.1: Create Post as User 1 (Producer Flow)
**Estimated Scope**: Single Claude instance

**Objective**: Create a new "missed connection" post as User 1 with an avatar matching User 2.

**Prerequisites**: User 1 logged in

**Steps**:
1. Navigate to Create Post screen (+ button or navigation)
2. Take screenshot of initial create screen
3. **LocationStep**: Select a location
   - Use location search or current location
   - Screenshot after selection
4. **TimeStep**: Set an optional time (e.g., "Yesterday afternoon")
   - Screenshot after selection
5. **SelfieStep**: Take/select verification selfie
   - Screenshot after capture
6. **AvatarStep**: Build target avatar
   - **IMPORTANT**: Configure avatar to MATCH User 2's `own_avatar`
   - Set primary attributes to match User 2: skinColor, hairColor, topType
   - Screenshot of avatar builder
7. **NoteStep**: Write a note
   - Enter: "E2E Test - Looking for you! Multi-user test post."
   - Screenshot after entry
8. **ReviewStep**: Review and submit
   - Screenshot of review screen
   - Submit the post
   - Screenshot of success confirmation
9. Note the location used for later discovery

**Success Criteria**:
- Post created successfully
- All steps completed without errors
- Post visible in User 1's post history

**Output**:
- Screenshots for each step: `e2e_screenshots/create_post_step_*.png`
- Document: Location name and target avatar config

---

### Task 1.2: Discover Post as User 2 (Consumer Flow)
**Estimated Scope**: Single Claude instance

**Objective**: Log in as User 2 and discover User 1's post via matching.

**Prerequisites**: Post created in Task 1.1

**Steps**:
1. Log out User 1
2. Log in as User 2
3. Navigate to Explore/Ledger screen
4. Search for or navigate to the location from Task 1.1
5. Screenshot the posts list at that location
6. Verify User 1's post appears
7. Verify match percentage is displayed (should be high if avatar matches)
8. Tap on the post to view details
9. Screenshot the PostDetailScreen showing:
   - Target avatar visualization
   - Match score breakdown
   - "Start Chat" button (if matching)
10. Document the match score and breakdown

**Success Criteria**:
- Post discovered at correct location
- Match score calculated correctly
- Match breakdown shows correct attribute comparisons
- "Start Chat" button is visible (if score above threshold)

**Output**:
- Screenshot: `e2e_screenshots/discover_post_list.png`
- Screenshot: `e2e_screenshots/discover_post_detail.png`
- Document: Match score and breakdown

---

### Task 1.3: Verify Match Algorithm Accuracy
**Estimated Scope**: Single Claude instance

**Objective**: Test the avatar matching algorithm with known avatar configurations.

**Prerequisites**: Access to both users' avatar configs from Tasks 0.2/0.3

**Steps**:
1. Calculate expected match score manually using weights:
   - Primary (60%): skinColor, hairColor, topType, facialHairType, facialHairColor
   - Secondary (40%): eyeType, eyebrowType, mouthType, clotheType, clotheColor, accessoriesType, graphicType
2. Compare with observed match score from Task 1.2
3. Document any discrepancies
4. If mismatch found, document in E2E-MULTI-USER-ISSUES.md
5. Test edge cases if time permits:
   - What if post has minimal avatar attributes?
   - What if consumer has no avatar set?

**Success Criteria**:
- Calculated score matches displayed score (within 1% tolerance)
- Algorithm handles missing attributes gracefully

**Output**:
- Document: Comparison of expected vs actual scores
- Issues: Any algorithm bugs found

---

## Phase 2: Conversation Creation

### Task 2.1: Start Conversation from Post
**Estimated Scope**: Single Claude instance

**Objective**: As User 2, start a conversation with User 1 via their post.

**Prerequisites**:
- User 2 logged in
- User 1's post discovered (Task 1.2)

**Steps**:
1. On PostDetailScreen (from Task 1.2), tap "Start Chat" button
2. Screenshot any confirmation dialog
3. Wait for navigation to ChatScreen
4. Screenshot the ChatScreen showing:
   - Empty conversation state
   - Input field
   - Other user's info in header
5. Verify conversation header shows correct info:
   - Post location
   - Target avatar
   - User role indicator (if shown)
6. Attempt to start conversation again (tap back, re-enter post, tap Start Chat)
7. Verify same conversation is returned (deduplication works)

**Success Criteria**:
- Conversation created successfully
- ChatScreen displays correctly
- Duplicate conversation prevention works

**Output**:
- Screenshot: `e2e_screenshots/conversation_created.png`
- Screenshot: `e2e_screenshots/chat_empty_state.png`

---

### Task 2.2: Verify Conversation in Chat List
**Estimated Scope**: Single Claude instance

**Objective**: Verify the new conversation appears in both users' chat lists.

**Prerequisites**: Conversation created in Task 2.1

**Steps**:
1. As User 2, navigate to Chats list
2. Screenshot chat list showing new conversation
3. Verify conversation displays:
   - Location name
   - Target avatar thumbnail
   - Empty message preview (new conversation)
   - Timestamp
4. Log out User 2
5. Log in as User 1
6. Navigate to Chats list
7. Screenshot chat list
8. Verify same conversation appears for User 1
9. Verify User 1's role indicator (if shown) indicates "Producer"

**Success Criteria**:
- Conversation visible in both users' chat lists
- Correct metadata displayed for both users
- Role distinction clear (producer vs consumer)

**Output**:
- Screenshot: `e2e_screenshots/chatlist_user2.png`
- Screenshot: `e2e_screenshots/chatlist_user1.png`

---

## Phase 3: Real-time Messaging

### Task 3.1: Send Message as Producer (User 1)
**Estimated Scope**: Single Claude instance

**Objective**: Send the first message as the post producer (User 1).

**Prerequisites**:
- User 1 logged in
- Conversation exists from Phase 2

**Steps**:
1. Navigate to Chats list
2. Tap on the conversation with User 2
3. Screenshot the ChatScreen (before sending)
4. Type a message: "Hello from User 1! This is an E2E test message."
5. Send the message (tap send button or press Enter)
6. Screenshot immediately after sending
7. Verify:
   - Message appears in chat
   - Message positioned correctly (sent messages on right/left per design)
   - Timestamp visible
   - Send succeeded (no error state)
8. Send a second message: "Testing multiple messages in sequence."
9. Screenshot showing both messages

**Success Criteria**:
- Messages sent successfully
- UI updates immediately (optimistic update)
- Messages display correct sender styling

**Output**:
- Screenshot: `e2e_screenshots/user1_sent_message.png`
- Screenshot: `e2e_screenshots/user1_sent_multiple.png`

---

### Task 3.2: Receive Message as Consumer (User 2)
**Estimated Scope**: Single Claude instance

**Objective**: Verify User 2 receives User 1's messages in real-time.

**Prerequisites**: Messages sent in Task 3.1

**Steps**:
1. Log out User 1
2. Log in as User 2
3. Navigate to Chats list
4. Verify conversation shows:
   - Updated preview with last message
   - Unread indicator/badge
5. Screenshot chat list showing unread state
6. Tap conversation to open ChatScreen
7. Screenshot showing received messages
8. Verify:
   - Both messages from User 1 visible
   - Messages positioned correctly (received on opposite side)
   - Timestamps accurate
   - Haptic feedback triggered (if detectable)
9. Verify read receipt update (messages marked as read)

**Success Criteria**:
- Messages received and displayed correctly
- Unread count shown in chat list
- Messages marked as read upon viewing

**Output**:
- Screenshot: `e2e_screenshots/user2_unread_chatlist.png`
- Screenshot: `e2e_screenshots/user2_received_messages.png`

---

### Task 3.3: Bidirectional Messaging Flow
**Estimated Scope**: Single Claude instance

**Objective**: Complete a back-and-forth conversation between both users.

**Prerequisites**: Tasks 3.1 and 3.2 completed

**Steps**:
1. As User 2 (from Task 3.2), send a reply:
   - "Hello User 1! Received your messages. Replying now."
2. Screenshot after sending
3. Send another message: "This tests the bidirectional flow."
4. Log out User 2
5. Log in as User 1
6. Navigate to the conversation
7. Verify:
   - User 2's replies visible
   - Messages interleaved correctly
   - Timestamps in order
8. Screenshot the full conversation
9. Send a response: "Great, the conversation flow works!"
10. Screenshot final state

**Success Criteria**:
- Messages from both users appear correctly
- Chronological order preserved
- No message loss or duplication

**Output**:
- Screenshot: `e2e_screenshots/conversation_bidirectional.png`

---

### Task 3.4: Real-time Message Delivery Test
**Estimated Scope**: Single Claude instance (may need 2 emulators for true real-time)

**Objective**: Test that messages appear in real-time without refresh.

**Note**: This is challenging with a single emulator. Options:
- Use two emulators simultaneously
- Test that pull-to-refresh fetches new messages
- Test that re-opening conversation shows new messages

**Steps**:
1. If two emulators available:
   - Have User 1 send a message while User 2's chat is open
   - Verify message appears without refresh
2. If single emulator:
   - Log in as User 1, send a message, note the time
   - Quickly switch to User 2 (within 30 seconds)
   - Open conversation WITHOUT pull-to-refresh
   - Verify message appears (realtime subscription)
3. Document whether true real-time was testable
4. Test edge case: Message sent while recipient has app backgrounded

**Success Criteria**:
- Real-time subscription working OR documented as untestable
- Messages eventually sync correctly

**Output**:
- Screenshot: `e2e_screenshots/realtime_test.png`
- Document: Whether true real-time was verified

---

## Phase 4: Message Read Receipts

### Task 4.1: Verify Read Receipt Updates
**Estimated Scope**: Single Claude instance

**Objective**: Confirm read receipts update when messages are viewed.

**Prerequisites**: Ongoing conversation from Phase 3

**Steps**:
1. Log in as User 1
2. Send a new message: "Testing read receipts - please read this."
3. Note whether UI shows "unread" state for sent message
4. Screenshot showing sent message state
5. Log out User 1
6. Log in as User 2
7. Open the conversation (this should trigger read receipt)
8. Screenshot showing message is read
9. Log out User 2
10. Log in as User 1
11. Open conversation
12. Verify the message now shows "read" status (if UI supports this)
13. Screenshot showing read receipt indicator (if visible)

**Success Criteria**:
- Read receipt triggers on conversation open
- Sender can see read status (if UI supports)
- No false positives (unread messages showing as read)

**Output**:
- Screenshot: `e2e_screenshots/read_receipt_unread.png`
- Screenshot: `e2e_screenshots/read_receipt_read.png`

---

### Task 4.2: Unread Count in Chat List
**Estimated Scope**: Single Claude instance

**Objective**: Verify unread message counts are accurate.

**Prerequisites**: Ability to send multiple messages

**Steps**:
1. Log in as User 1
2. Send 3 new messages to User 2 in quick succession
3. Log out User 1
4. Log in as User 2
5. Navigate to Chats list (do NOT open the conversation)
6. Screenshot showing unread count badge
7. Verify badge shows "3" (or appropriate count)
8. Open the conversation
9. Go back to Chats list
10. Verify badge is cleared (count = 0)

**Success Criteria**:
- Unread count accurate
- Count clears after reading
- No race conditions with real-time updates

**Output**:
- Screenshot: `e2e_screenshots/unread_badge_3.png`
- Screenshot: `e2e_screenshots/unread_badge_cleared.png`

---

## Phase 5: Photo Sharing

### Task 5.1: Verify Profile Photo Prerequisites
**Estimated Scope**: Single Claude instance

**Objective**: Ensure both users have approved profile photos for sharing tests.

**Steps**:
1. Log in as User 1
2. Navigate to Profile > Photos section
3. Screenshot current photo state
4. Verify at least one photo with "approved" moderation status
5. If no approved photos:
   - Add a new photo
   - Wait for moderation (may take time)
   - Screenshot pending state
6. Log out and repeat for User 2
7. Document photo IDs if accessible

**Success Criteria**:
- Both users have at least one approved profile photo
- Photos ready for sharing tests

**Output**:
- Screenshot: `e2e_screenshots/user1_photos.png`
- Screenshot: `e2e_screenshots/user2_photos.png`

---

### Task 5.2: Share Photo in Conversation
**Estimated Scope**: Single Claude instance

**Objective**: Test photo sharing workflow as User 1.

**Prerequisites**:
- User 1 has approved photo
- Conversation exists with User 2

**Steps**:
1. Log in as User 1
2. Open conversation with User 2
3. Find and tap the photo sharing button/icon
4. Screenshot the SharePhotoModal
5. Verify modal shows:
   - Available photos (approved only)
   - Already shared photos (if any)
   - Share/unshare affordances
6. Select a photo to share
7. Confirm the share action
8. Screenshot showing share confirmation
9. Verify:
   - Photo now shows as "shared" in modal
   - System message appears in chat (if applicable)
10. Close modal

**Success Criteria**:
- Share modal displays correctly
- Only approved photos available
- Share action succeeds
- UI updates to show shared state

**Output**:
- Screenshot: `e2e_screenshots/photo_share_modal.png`
- Screenshot: `e2e_screenshots/photo_shared_confirmation.png`

---

### Task 5.3: Receive Shared Photo
**Estimated Scope**: Single Claude instance

**Objective**: Verify User 2 can see photos shared by User 1.

**Prerequisites**: Photo shared in Task 5.2

**Steps**:
1. Log out User 1
2. Log in as User 2
3. Open conversation with User 1
4. Look for shared photo display area/section
5. Screenshot showing shared photo received
6. Verify:
   - Photo is visible
   - Photo is from User 1 (correct direction)
   - Photo is viewable (tap to enlarge if supported)
7. If SharedPhotoDisplay component is used, verify correct rendering
8. Check if notification was received (if notification system active)

**Success Criteria**:
- Shared photo visible to recipient
- Photo displays correctly
- Real-time update works (or refresh works)

**Output**:
- Screenshot: `e2e_screenshots/photo_received.png`

---

### Task 5.4: Unshare Photo
**Estimated Scope**: Single Claude instance

**Objective**: Test photo unsharing workflow.

**Prerequisites**: Photo shared in Task 5.2

**Steps**:
1. Log in as User 1
2. Open conversation with User 2
3. Open photo sharing modal
4. Find the shared photo
5. Tap to unshare
6. Confirm unshare action
7. Screenshot showing unshared state
8. Close modal
9. Log out User 1
10. Log in as User 2
11. Open conversation
12. Verify photo is no longer visible
13. Screenshot showing photo removed

**Success Criteria**:
- Unshare action succeeds
- Photo removed from recipient's view
- Real-time update or refresh removes photo

**Output**:
- Screenshot: `e2e_screenshots/photo_unshared.png`
- Screenshot: `e2e_screenshots/photo_removed_recipient.png`

---

### Task 5.5: Photo Sharing Edge Cases
**Estimated Scope**: Single Claude instance

**Objective**: Test edge cases in photo sharing.

**Steps**:
1. Test sharing same photo twice (should be idempotent)
2. Test sharing while other user has chat open (real-time)
3. Test photo sharing with pending moderation photo (should be blocked)
4. Test maximum photos that can be shared (if limit exists)
5. Document any issues found

**Success Criteria**:
- Idempotency works
- Moderation enforcement works
- No crashes on edge cases

**Output**:
- Document: Edge case results in test notes

---

## Phase 6: User Blocking

### Task 6.1: Block User from Chat
**Estimated Scope**: Single Claude instance

**Objective**: Test blocking a user from within a conversation.

**Prerequisites**:
- Active conversation between User 1 and User 2
- May need to create a NEW test post/conversation to avoid affecting other tests

**Steps**:
1. **IMPORTANT**: Create a new post and conversation specifically for block testing
   - This avoids disrupting other test scenarios
2. Log in as User 1
3. Create a new post with avatar matching User 2
4. Log out, log in as User 2
5. Start conversation on the new post
6. Send a message: "This conversation will test blocking."
7. Find the block user option (long-press message or menu)
8. Screenshot the block confirmation dialog
9. Confirm block action
10. Screenshot the result (should exit conversation or show blocked state)

**Success Criteria**:
- Block option accessible
- Block confirmation prevents accidental blocks
- Post-block state handled correctly

**Output**:
- Screenshot: `e2e_screenshots/block_confirmation.png`
- Screenshot: `e2e_screenshots/block_result.png`

---

### Task 6.2: Verify Block Effects
**Estimated Scope**: Single Claude instance

**Objective**: Confirm blocking prevents all interactions.

**Prerequisites**: Block action from Task 6.1

**Steps**:
1. As User 2 (who blocked User 1 in this conversation):
   - Navigate to Chat list
   - Verify blocked conversation is hidden or marked
   - Screenshot chat list
2. Navigate to Explore/Ledger
3. Search for location where User 1 has posts
4. Verify User 1's posts are hidden from User 2
5. Screenshot post list (User 1's posts should not appear)
6. Log out User 2
7. Log in as User 1
8. Navigate to Chat list
9. Verify the conversation with User 2 (blocker) is hidden
10. Screenshot chat list from blocked user's perspective

**Success Criteria**:
- Blocked conversations hidden from both users
- Blocked user's posts hidden from blocker
- Blocker's posts hidden from blocked user (bidirectional)

**Output**:
- Screenshot: `e2e_screenshots/block_chatlist_blocker.png`
- Screenshot: `e2e_screenshots/block_posts_hidden.png`
- Screenshot: `e2e_screenshots/block_chatlist_blocked.png`

---

### Task 6.3: Block from Post Detail
**Estimated Scope**: Single Claude instance

**Objective**: Test blocking directly from a post without starting conversation.

**Steps**:
1. Create a fresh post as User 1 (different location if possible)
2. Log in as User 2
3. Navigate to the post location
4. Tap on User 1's post to view details
5. Find "Block User" option on PostDetailScreen
6. Screenshot showing block option
7. Block User 1 from this view
8. Verify:
   - Post disappears or shows blocked state
   - User 1 is added to block list
9. This creates a second block entry (if allowed) or confirms existing block

**Note**: If blocks are unique per user pair, this may fail - document the behavior.

**Success Criteria**:
- Block option available on post detail
- Block action functions correctly
- Consistent with conversation-based blocking

**Output**:
- Screenshot: `e2e_screenshots/block_from_post.png`

---

## Phase 7: Chat List Behavior

### Task 7.1: Chat List Sorting
**Estimated Scope**: Single Claude instance

**Objective**: Verify chat list sorts by most recent message.

**Prerequisites**:
- Multiple conversations for User 1 (may need to create more)
- Unblock if necessary to restore previous conversations

**Steps**:
1. Log in as User 1
2. Ensure User 1 has at least 2 active conversations
3. Screenshot chat list showing current order
4. Open the OLDER conversation (second in list)
5. Send a message: "Bumping this conversation to top."
6. Navigate back to chat list
7. Screenshot showing updated order
8. Verify the recently messaged conversation is now first

**Success Criteria**:
- Chat list sorts by `last_message_at`
- New messages bump conversation to top
- Order updates in real-time or on refresh

**Output**:
- Screenshot: `e2e_screenshots/chatlist_before_sort.png`
- Screenshot: `e2e_screenshots/chatlist_after_sort.png`

---

### Task 7.2: Chat List Real-time Updates
**Estimated Scope**: Single Claude instance

**Objective**: Test that chat list updates when messages arrive.

**Steps**:
1. Log in as User 1
2. Navigate to Chat list
3. Note current state
4. Log out (keep mental note of state)
5. Log in as User 2
6. Send a message to User 1 in any conversation
7. Log out User 2
8. Log in as User 1
9. Navigate to Chat list
10. Verify:
    - New message reflected in preview
    - Unread badge shows
    - Conversation moved to top (if not already)
11. Screenshot updated chat list

**Success Criteria**:
- Chat list reflects new messages
- Preview text updates
- Badges accurate

**Output**:
- Screenshot: `e2e_screenshots/chatlist_updated.png`

---

### Task 7.3: Empty and Error States
**Estimated Scope**: Single Claude instance

**Objective**: Test chat list edge cases.

**Steps**:
1. Create a new test account (if possible) or test with fresh state
2. Navigate to Chat list with no conversations
3. Screenshot empty state
4. Verify appropriate empty state message
5. Test error handling:
   - If possible, simulate network error
   - Verify error state displays correctly
6. Test pull-to-refresh functionality
7. Screenshot any error or loading states

**Success Criteria**:
- Empty state shows helpful message
- Error states handled gracefully
- Pull-to-refresh works

**Output**:
- Screenshot: `e2e_screenshots/chatlist_empty.png`

---

## Phase 8: Reporting System

### Task 8.1: Report a Message
**Estimated Scope**: Single Claude instance

**Objective**: Test reporting inappropriate messages.

**Prerequisites**: Active conversation with messages

**Steps**:
1. Log in as User 2
2. Open conversation with User 1
3. Long-press on a message from User 1
4. Screenshot context menu showing report option
5. Tap "Report" option
6. Screenshot ReportMessageModal
7. Select a report reason
8. Add optional details
9. Submit report
10. Screenshot confirmation
11. Verify:
    - Report submitted successfully
    - User can continue using app
    - No immediate effect on message (pending review)

**Success Criteria**:
- Report flow completes
- Multiple report types available
- Confirmation shown

**Output**:
- Screenshot: `e2e_screenshots/report_menu.png`
- Screenshot: `e2e_screenshots/report_modal.png`
- Screenshot: `e2e_screenshots/report_success.png`

---

### Task 8.2: Report a User
**Estimated Scope**: Single Claude instance

**Objective**: Test reporting a user profile.

**Steps**:
1. Find option to report user (may be in chat screen header or settings)
2. Screenshot the report user option
3. Open ReportUserModal
4. Select report type
5. Add details
6. Submit
7. Screenshot confirmation
8. Verify report submitted

**Success Criteria**:
- User report flow works
- Separate from message reporting

**Output**:
- Screenshot: `e2e_screenshots/report_user.png`

---

## Phase 9: Notification System

### Task 9.1: New Message Notification
**Estimated Scope**: Single Claude instance

**Objective**: Test push notification delivery for new messages.

**Note**: May require push notification setup and device permissions.

**Steps**:
1. Verify push notifications enabled for the app
2. Log in as User 1
3. Background the app (press Home)
4. Log in as User 2 on another device/emulator (if available)
5. Send a message to User 1
6. Check if notification appears for User 1
7. Screenshot notification if visible
8. Tap notification to verify deep link to conversation

**Alternative (single device)**:
1. Document that true push testing requires second device
2. Verify notification preferences screen exists
3. Screenshot notification settings

**Success Criteria**:
- Notifications delivered (or limitation documented)
- Deep linking works
- User can control notification preferences

**Output**:
- Screenshot: `e2e_screenshots/notification_test.png` (or documentation)

---

## Phase 10: Edge Cases and Error Handling

### Task 10.1: Conversation with Deleted Post
**Estimated Scope**: Single Claude instance

**Objective**: Test behavior when source post is deleted/expired.

**Steps**:
1. Create a conversation via a test post
2. Delete the post (if deletion is supported) or wait for expiry
3. Attempt to access the conversation
4. Verify:
   - Conversation still accessible
   - Post reference shows appropriate state
   - Messaging still works
5. Screenshot the conversation state

**Success Criteria**:
- Conversations survive post deletion
- Graceful handling of missing post data

**Output**:
- Screenshot: `e2e_screenshots/conversation_deleted_post.png`

---

### Task 10.2: Message Length Limits
**Estimated Scope**: Single Claude instance

**Objective**: Test message character limits.

**Steps**:
1. Open a conversation
2. Attempt to type a very long message (>10,000 characters)
3. Verify:
   - Character limit enforced
   - User feedback shown (counter, warning)
4. Attempt to send message at exactly 10,000 characters
5. Verify it sends successfully
6. Attempt 10,001 characters
7. Verify it's prevented

**Success Criteria**:
- 10,000 character limit enforced
- Clear feedback to user

**Output**:
- Screenshot: `e2e_screenshots/message_limit.png`

---

### Task 10.3: Rapid Message Sending
**Estimated Scope**: Single Claude instance

**Objective**: Test rate limiting and message ordering under rapid input.

**Steps**:
1. Open a conversation
2. Send 5 messages rapidly in succession
3. Verify:
   - All messages sent in order
   - No duplicates
   - No messages lost
4. Verify other user receives all 5 messages in order

**Success Criteria**:
- Message ordering preserved
- No rate limiting issues (or appropriate handling if limited)
- Optimistic updates work correctly

**Output**:
- Screenshot: `e2e_screenshots/rapid_messages.png`

---

### Task 10.4: Network Error Recovery
**Estimated Scope**: Single Claude instance

**Objective**: Test behavior when network is interrupted.

**Steps**:
1. Open a conversation
2. Enable airplane mode on emulator
3. Attempt to send a message
4. Verify error state shown
5. Disable airplane mode
6. Verify:
   - App recovers
   - Message either sends or shows clear failure
7. Test pull-to-refresh after recovery
8. Screenshot error and recovery states

**Success Criteria**:
- Clear error indication
- Graceful recovery
- No data loss or corruption

**Output**:
- Screenshot: `e2e_screenshots/network_error.png`
- Screenshot: `e2e_screenshots/network_recovery.png`

---

## Phase 11: Cross-Feature Integration

### Task 11.1: Full User Journey - Producer
**Estimated Scope**: Single Claude instance

**Objective**: Complete end-to-end flow as a post producer.

**Steps**:
1. Fresh login as User 1
2. Create a new post at a memorable location
3. Wait for a match/conversation (simulate with User 2)
4. Receive and reply to messages
5. Share a photo
6. View shared photos from other user
7. Complete the conversation
8. Document the full flow

**Success Criteria**:
- Entire producer journey works smoothly
- No friction points

**Output**:
- Document: Complete producer journey notes

---

### Task 11.2: Full User Journey - Consumer
**Estimated Scope**: Single Claude instance

**Objective**: Complete end-to-end flow as a post consumer.

**Steps**:
1. Fresh login as User 2
2. Browse Explore/Ledger
3. Find a matching post
4. View match details
5. Start conversation
6. Exchange messages
7. Share and receive photos
8. Complete the conversation

**Success Criteria**:
- Entire consumer journey works smoothly
- Matching and discovery intuitive

**Output**:
- Document: Complete consumer journey notes

---

## Phase 12: Cleanup and Final Report

### Task 12.1: Test Cleanup
**Estimated Scope**: Single Claude instance

**Objective**: Clean up test data created during E2E testing.

**Steps**:
1. Document all test posts created
2. Delete test posts if deletion is supported
3. Unblock test blocks if desired
4. Document final state of both test accounts
5. Clear any test photos shared

**Success Criteria**:
- Test accounts in known state
- Documented for future test runs

**Output**:
- Document: Final test account states

---

### Task 12.2: Compile Final Report
**Estimated Scope**: Single Claude instance

**Objective**: Compile all findings into final documentation.

**Steps**:
1. Review all screenshots captured
2. Consolidate issues found into E2E-MULTI-USER-ISSUES.md
3. Consolidate improvements into E2E-MULTI-USER-IMPROVEMENTS.md
4. Create summary of test coverage
5. Note any features not testable and why
6. Recommend priority fixes if critical issues found

**Success Criteria**:
- Comprehensive documentation
- Actionable issue reports
- Clear improvement suggestions

**Output**:
- E2E-MULTI-USER-ISSUES.md (populated)
- E2E-MULTI-USER-IMPROVEMENTS.md (populated)
- Summary report

---

## Appendix A: ADB Commands Reference

```bash
# Device management
adb devices
adb -s emulator-5554 shell wm size  # Check resolution

# App launch via deep link
adb -s emulator-5554 shell am start -a android.intent.action.VIEW \
  -d "exp+backtrack://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"

# Port forwarding
adb -s emulator-5554 reverse tcp:8081 tcp:8081

# Input commands
adb -s emulator-5554 shell input tap X Y
adb -s emulator-5554 shell input text "text"
adb -s emulator-5554 shell input keyevent 61  # Tab
adb -s emulator-5554 shell input keyevent 66  # Enter
adb -s emulator-5554 shell input keyevent 4   # Back

# Screenshots
adb -s emulator-5554 exec-out screencap -p > screenshot.png
```

## Appendix B: MCP Tool Usage

```
# List elements on screen (get coordinates)
mobile_list_elements_on_screen(device: "emulator-5554")

# Take screenshot
mobile_take_screenshot(device: "emulator-5554")

# Click at coordinates
mobile_click_on_screen_at_coordinates(device: "emulator-5554", x: 540, y: 960)

# Type text
mobile_type_keys(device: "emulator-5554", text: "Hello", submit: false)

# Swipe/scroll
mobile_swipe_on_screen(device: "emulator-5554", direction: "up")

# Press button
mobile_press_button(device: "emulator-5554", button: "BACK")
```

## Appendix C: Screenshot Naming Convention

All screenshots should be saved to `e2e_screenshots/` with descriptive names:

```
e2e_screenshots/
├── setup_verified.png
├── user1_profile.png
├── user2_profile.png
├── create_post_step_*.png
├── discover_post_*.png
├── conversation_*.png
├── chatlist_*.png
├── photo_*.png
├── block_*.png
├── report_*.png
├── notification_*.png
└── edge_case_*.png
```

## Appendix D: Issue Severity Guide

- **Critical**: App crashes, data loss, security vulnerability
- **High**: Feature completely broken, blocking user flow
- **Medium**: Feature partially works, workaround exists
- **Low**: Minor UI issue, edge case, polish item
