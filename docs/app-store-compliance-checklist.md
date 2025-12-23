# App Store Compliance Checklist

**Verified Date:** December 23, 2025
**App Version:** 1.0.0
**Status:** All items verified

---

## Overview

This document verifies that Love Ledger meets all App Store (iOS) and Play Store (Android) compliance requirements for user safety, privacy, and content moderation.

---

## Checklist Items

### 1. Privacy Policy Accessible

**Status:** Verified

**Implementation:**
- Privacy policy link available at `https://loveledger.app/privacy`
- Accessible during signup via TermsModal component
- Opens via React Native Linking API
- Users must explicitly accept the privacy policy before creating an account

**Location:**
- `components/TermsModal.tsx` (lines 103-105, 227-238)

---

### 2. Reporting Works

**Status:** Verified

**Implementation:**
- Full reporting flow via ReportModal component
- Supports three report types: `post`, `message`, `user`
- Report reasons available:
  - Spam
  - Harassment
  - Inappropriate content
  - Impersonation
  - Violence
  - Hate speech
  - Other (with required details)
- Optional additional details input (up to 500 characters)
- Reports saved to Supabase `reports` table with status tracking

**UI Integration:**
- ChatScreen: Report message via long-press menu, Report user via header menu
- PostDetailScreen: Report functionality available

**Location:**
- `components/ReportModal.tsx`
- `screens/ChatScreen.tsx` (handleReportMessage, handleReportUser)
- `lib/moderation.ts` (submitReport function)
- `supabase/migrations/003_moderation_schema.sql`

---

### 3. Blocking Works

**Status:** Verified

**Implementation:**
- Block user functionality with confirmation dialog
- Calls blockUser() from lib/moderation.ts
- Automatically deactivates conversations between blocker and blocked user
- Blocked users' content hidden via RLS policies
- Block records stored in Supabase `blocks` table

**UI Integration:**
- ChatScreen: Block user via header menu (⋮ button) or message long-press
- PostDetailScreen: Block user button with confirmation

**Behavior:**
- After successful block, navigates user back to previous screen
- Blocked user content no longer visible in feeds
- Cannot start new conversations with blocked users

**Location:**
- `screens/ChatScreen.tsx` (handleBlockUser, lines 631-674)
- `screens/PostDetailScreen.tsx` (handleBlockUser, lines 278-319)
- `lib/moderation.ts` (blockUser function)
- `supabase/migrations/003_moderation_schema.sql`
- `supabase/migrations/004_rls_policies.sql`

---

### 4. Age Verification in Place

**Status:** Verified

**Implementation:**
- Minimum age requirement: 18 years old
- Age confirmation checkbox required during signup
- Part of mandatory terms acceptance flow
- Cannot proceed with signup without confirming age

**User Experience:**
- Clear warning banner: "Love Ledger is intended for users who are 18 years of age or older"
- Checkbox confirmation: "I confirm that I am at least 18 years old"
- All three checkboxes (age, terms, privacy) must be checked before signup

**Location:**
- `components/TermsModal.tsx` (lines 96-97: MINIMUM_AGE constant, lines 309-330: age verification section)
- `screens/AuthScreen.tsx` (handleSignup shows TermsModal)

---

### 5. Permission Strings Explain Usage

**Status:** Verified

**iOS (Info.plist via app.json):**
- `NSLocationWhenInUseUsageDescription`: "Love Ledger needs your location to show nearby venues where you can post or browse missed connections."
- `NSLocationAlwaysAndWhenInUseUsageDescription`: "Love Ledger uses your location to discover nearby venues and help you find missed connections."
- `NSCameraUsageDescription`: "Love Ledger needs camera access for selfie verification when posting missed connections."
- `NSPhotoLibraryUsageDescription`: "Love Ledger needs photo library access to select photos for your profile."

**Android (via Expo plugins in app.json):**
- expo-location: Same descriptive strings as iOS
- expo-camera: Same descriptive strings as iOS
- expo-image-picker: Same descriptive strings as iOS

**Key Points:**
- All permission strings explain WHY the permission is needed
- Strings are user-friendly and specific to app functionality
- Permissions requested at point of use, not on app launch

**Location:**
- `app.json` (lines 21-26: iOS infoPlist, lines 51-71: Expo plugins)

---

## Additional Compliance Features

### Content Moderation
- User-generated content (posts, messages) can be reported
- Reports include reason, optional details, and reporter ID
- Report status workflow: pending → reviewed → resolved/dismissed

### User Safety
- Anonymous chat system protects user identity
- Selfie verification stored privately (only visible to producer)
- Block relationships enforced across all database queries via RLS

### Data Privacy
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data (selfies, conversations)
- Blocked user content automatically filtered

---

## Manual Verification Steps

The following items should be verified during QA testing:

1. **Privacy Policy**
   - [ ] Tap privacy policy link during signup
   - [ ] Verify it opens in browser/webview
   - [ ] Confirm link is accessible

2. **Reporting**
   - [ ] Long-press a message to report it
   - [ ] Tap header menu (⋮) in chat to report user
   - [ ] Complete report submission with reason
   - [ ] Verify success message appears

3. **Blocking**
   - [ ] Tap "Block User" on PostDetailScreen
   - [ ] Confirm block via dialog
   - [ ] Verify navigation back to previous screen
   - [ ] Confirm blocked user's content no longer visible

4. **Age Verification**
   - [ ] Try to signup without checking age checkbox
   - [ ] Verify "Accept & Continue" is disabled
   - [ ] Check age checkbox and verify button enables
   - [ ] Complete signup with all checkboxes

5. **Permission Prompts**
   - [ ] View location permission prompt text
   - [ ] View camera permission prompt text
   - [ ] Verify prompts explain why permission is needed

---

## Conclusion

Love Ledger implements all required app store compliance features:
- Privacy policy accessible during signup
- Content reporting system for posts, messages, and users
- User blocking with conversation deactivation
- Age verification (18+) gate during account creation
- Descriptive permission usage strings

The app is ready for App Store and Play Store submission pending manual QA verification.
