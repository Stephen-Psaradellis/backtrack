# E2E Testing Notes - Android MCP

## Testing Session Summary
Date: 2024-12-30
Device: Pixel 9 Pro (emulator-5554)
Resolution: 1080x1920

## Completed Tasks

### 1. MCP Screenshot Resolution Fix
**Issue:** Claude API was failing due to 2K resolution screenshots exceeding image size limits.
**Fix:** Reduced emulator display resolution via ADB:
```bash
adb -s emulator-5554 shell wm size 1080x1920
```

### 2. TermsModal Scroll Bug Fix
**Issue:** The Terms & Conditions modal had scroll issues where:
- Only some checkboxes were visible
- Scroll inside modal wasn't working
- Footer buttons (Decline/Accept) were inaccessible

**Root Cause:**
- Footer was inside ScrollView, causing it to be scrolled off-screen
- Modal height constraints were too restrictive
- Verbose content (age warning box) took too much space

**Fixes Applied:**
1. Moved footer outside ScrollView (fixed at bottom)
2. Simplified content - removed age warning box, kept inline text
3. Updated modal styles:
   - `maxHeight: '60%'`
   - `minHeight: 420`
   - Footer has `paddingHorizontal: 16` and `backgroundColor`
4. Reduced `contentContainer.paddingBottom` to 8

**Files Modified:** `components/TermsModal.tsx`

### 3. Authentication Flow Testing
**Signup Flow (Tested Successfully):**
- Email input works
- Password input works (with visibility toggle)
- Create Account button triggers Terms modal
- Terms modal displays correctly with all 3 checkboxes
- Accept & Continue proceeds to email verification screen
- "Check Your Email" confirmation displays correctly

**Sign-in Flow:**
- Form inputs work
- Error handling shows "Invalid email or password" for unverified accounts
- Forgot Password link is accessible
- Sign Up toggle works

## Improvement Ideas

### 1. TermsModal UX Improvements
- Consider adding visual scroll indicator when content overflows
- The Privacy Policy and Terms links inside checkbox labels can be hard to tap (small touch target)
- Consider making links standalone buttons below checkboxes

### 2. Authentication Flow
- **Email Verification Bypass for Dev:** Add a dev mode flag to skip email verification for testing
- **Better Error Messages:** "Invalid email or password" is generic. Consider distinguishing:
  - "Email not verified - check your inbox"
  - "No account found with this email"
  - "Incorrect password"
  (Note: Security tradeoff - revealing email existence)

### 3. E2E Testing Infrastructure
- **Seeded Test Users:** Create pre-verified test accounts in Supabase seed data
- **Mock Mode Toggle:** Add UI toggle to enable mock Supabase for offline testing
- **Automated Maestro Tests:** Consider adding Maestro YAML flows for regression testing

### 4. General UI Observations
- Debug warning banner at bottom ("Open debugger to view warnings") could be hidden in non-dev builds
- Form validation messages could be more prominent

## Blocked Tests (Need Authentication)

The following features require authenticated user and couldn't be tested:
- Onboarding flow (avatar creation, location permissions)
- Post creation flow
- Location/discovery features
- Chat and photo sharing
- Profile management

## Recommendations for Next Session

1. **Set up test user seeding:**
   ```sql
   -- Add to supabase/seed/test_users.sql
   INSERT INTO auth.users (id, email, email_confirmed_at, ...)
   VALUES ('test-user-uuid', 'e2e-test@backtrack.social', now(), ...);
   ```

2. **Add E2E helper endpoint:**
   Create a Supabase Edge Function that auto-confirms test emails in dev environment.

3. **Consider Maestro integration:**
   The `.maestro/` folder exists - populate with flows for automated regression testing.

## Files Changed This Session
- `components/TermsModal.tsx` - Fixed scroll bug and simplified UI

---

# E2E Testing Session 2 - Continued Testing

## Session Summary
Date: 2024-12-30 (Continuation)
Device: Pixel 9 Pro (emulator-5554)
Resolution: 1080x1920
Test Account: s.n.psaradellis@gmail.com / Test1234!

## Features Tested Successfully

### 1. Sign-in Flow ✅
- Successfully signed in with verified test account
- Form inputs work correctly
- Session persisted properly

### 2. Location Permission Flow ✅
- Android permission dialog appeared correctly
- "While using the app" option worked
- Location services enabled after permission granted

### 3. Explore/Map Screen ✅
- Map loads correctly with Google Maps
- Location markers display
- Bottom sheet for location selection works
- FAB buttons (star/favorites, radar/recenter) visible

### 4. Create Post Flow ✅ (Partial)
- "Create Post" button works
- Location step displays correctly
- Selfie verification step requires photo (working as designed for safety)
- Photo picker dialog opens correctly
- Discard post confirmation dialog works
- Successfully cancelled/discarded post

### 5. Profile Screen ✅
Complete exploration of all sections:
- Profile header (avatar initial, email)
- Verification prompt card ("Verify Your Profile")
- Display Name (editable field)
- Member Since date
- My Avatar (Ready Player Me integration) - "Create Avatar" button
- Verification Photos - Empty state with "Add Your First Photo"
- My Location Streaks - "No streaks yet. Visit locations regularly!"
- Regulars Mode - Toggle enabled, "Mutual Only" visibility setting
- Fellow Regulars - Empty state
- Notifications section:
  - Match Notifications (enabled)
  - Message Notifications (enabled)
  - Spark Notifications (enabled)
- Replay Tutorial buttons:
  - Post Creation
  - Ledger Browsing
  - Selfie Verification
  - Messaging
- Account section with Sign Out button
- App version: Backtrack v1.0.0

## Bugs Found 🐛

### BUG 1: Conversations/Chats Screen Error (HIGH PRIORITY)
**Severity:** High - Feature completely broken
**Screen:** Chats tab → Conversations screen
**Error Message:** "Something went wrong - An unexpected error occurred. Please try again."
**Behavior:**
- Error appears immediately when navigating to Chats tab
- "Try Again" button does not resolve the error
- Error persists across multiple attempts

**Suspected Cause:**
Looking at `screens/ChatListScreen.tsx`:
- Error caught at line 313-314 in generic catch block
- Could be RLS policy blocking access to `conversations` table
- Could be issue with `getHiddenUserIds()` function (line 211)
- Could be missing database relationships for the query

**Investigation Needed:**
1. Check Supabase RLS policies for `conversations` table
2. Verify `messages` table permissions
3. Check if `posts` foreign key relationship is properly configured
4. Debug `getHiddenUserIds` function for new users

**File:** `screens/ChatListScreen.tsx:313`

### BUG 2: Back Button Logs Out User (MEDIUM PRIORITY)
**Severity:** Medium - Unexpected behavior
**Screen:** Explore/Map screen with location bottom sheet open
**Behavior:**
- When on main map screen with location selection bottom sheet visible
- Pressing Android hardware back button
- User gets logged out completely instead of:
  - Closing the bottom sheet, OR
  - Navigating to previous screen

**Expected Behavior:**
- Back button should dismiss the bottom sheet first
- Only exit app/log out if on root screen with nothing to dismiss

**Investigation Needed:**
1. Check navigation handling in `AppNavigator.tsx`
2. Review back handler implementation for bottom sheets
3. May need custom `BackHandler` implementation

### UI Issue: Bottom Sheet FAB Overlap (LOW PRIORITY)
**Severity:** Low - Visual/UX issue
**Screen:** Explore screen with location selected
**Behavior:**
- When a location is selected and bottom sheet appears
- The star (favorites) and radar (recenter) FAB buttons overlap with the bottom sheet content
- "Selected Location" text and "Cancel" button partially obscured

**Suggested Fix:**
- Adjust bottom sheet margin/padding when FABs are visible
- Or hide/relocate FABs when bottom sheet is expanded

## Working Features Confirmed

| Feature | Status | Notes |
|---------|--------|-------|
| Sign-in | ✅ Working | With verified account |
| Sign-up | ✅ Working | Needs email verification |
| Terms Modal | ✅ Working | Fixed in previous session |
| Location Permission | ✅ Working | Android prompt works |
| Map Display | ✅ Working | Google Maps loads |
| Location Selection | ✅ Working | Bottom sheet shows |
| Create Post Start | ✅ Working | Flow initiates |
| Photo Picker | ✅ Working | Opens image picker |
| Post Discard | ✅ Working | Confirmation works |
| Profile View | ✅ Working | All sections visible |
| Notifications Toggle | ✅ Working | All 3 toggle options |
| Regulars Mode | ✅ Working | Toggle and visibility |
| Sign Out Button | ✅ Visible | Not tested to preserve session |
| Chats Screen | ❌ BROKEN | Error on load |

## Recommendations

### Immediate Fixes Needed
1. **Fix Conversations screen error** - This blocks all chat functionality
2. **Fix back button behavior** - Unexpected logout is frustrating UX

### Future Improvements
1. Add error logging/reporting to identify the specific Conversations error
2. Implement proper back handler for bottom sheets
3. Add visual feedback when FABs are pressed
4. Consider adding empty state for Conversations (before error handling)

## Test Account Information
```
Email: s.n.psaradellis@gmail.com
Password: Test1234!
Status: Verified
Profile: No avatar, no verification photos
```

## Commands Used This Session
```bash
# Set display resolution for MCP compatibility
adb -s emulator-5554 shell wm size 1080x1920

# Clear text fields when corrupted
for i in {1..50}; do adb -s emulator-5554 shell input keyevent KEYCODE_DEL; done

# Type text via ADB (when MCP typing fails)
adb -s emulator-5554 shell input text "your_text_here"
```
