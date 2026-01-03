# App Store Review Notes

This document provides information for App Store reviewers about app features and compliance.

---

## Account Deletion (Apple Requirement)

Per Apple's App Store Review Guidelines 5.1.1(v), this app provides users with the ability to delete their account and associated data.

### Location of Account Deletion Feature

**Path:** Profile Tab > Scroll to bottom > "Delete Account" button

**Steps to access:**
1. Open the app and sign in
2. Tap the **Profile** tab in the bottom navigation bar
3. Scroll down to the bottom of the Profile screen
4. Tap the red **"Delete Account"** button
5. Confirm deletion in the first alert dialog
6. Type "DELETE" to confirm in the second alert dialog
7. Account and all associated data will be permanently deleted

### What Gets Deleted

When a user deletes their account, the following data is permanently removed:

- User profile and avatar configuration
- All posts created by the user
- All conversations and messages
- Photo shares and profile photos
- Favorite locations and location history
- Push notification tokens and preferences
- Block lists and reports submitted
- Check-in history and location streaks
- Event tokens and attendance records

### Data Retention

- Account deletion is immediate and irreversible
- No user data is retained after deletion
- Storage files (photos) are also deleted from cloud storage

### Technical Implementation

- Database function: `delete_user_account(user_id UUID)`
- Client service: `lib/accountDeletion.ts`
- UI component: `screens/ProfileScreen.tsx`

---

## Privacy Policy & Terms of Service

### Location of Legal Documents

**Path:** Profile Tab > Scroll to "Legal" section

**Available documents:**
- **Privacy Policy** - Profile > Legal > Privacy Policy
- **Terms of Service** - Profile > Legal > Terms of Service

Both documents are accessible at any time through the app's Profile screen.

### External Links

- Privacy Policy: Available in-app and at [backtrack.social/privacy](https://backtrack.social/privacy)
- Terms of Service: Available in-app and at [backtrack.social/terms](https://backtrack.social/terms)

---

## Age Requirement

This app is intended for users 18 years of age and older. Age verification is confirmed during the onboarding process when users accept the Terms of Service.

---

## Content Moderation

All user-uploaded photos are automatically moderated using Google Cloud Vision SafeSearch API before being displayed to other users. Content that violates our guidelines is automatically rejected.

---

## Test Account

If you need a test account for review purposes:

- **Email:** [Contact developer for test credentials]
- **Password:** [Contact developer for test credentials]

Or you can create a new account using any valid email address.

---

## Contact Information

For questions during the review process:

- **Developer:** [Your Name]
- **Email:** [your-email@example.com]
- **Support URL:** https://backtrack.social/support

---

*Last Updated: December 31, 2024*
