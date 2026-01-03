# Google Play Data Safety Information

This document provides information for Google Play's Data Safety form.

---

## Data Collection Summary

### Data Collected

| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Email address | Yes | No | Account authentication |
| Profile photo | Yes | No | User verification and sharing with matches |
| Location (precise) | Yes | No | Core app functionality - location-based matching |
| Messages | Yes | No | In-app messaging between matched users |
| Device identifiers | Yes | No | Push notifications |
| App activity | Yes | No | Analytics and crash reporting |

### Data NOT Collected

- Financial information
- Health information
- Contacts
- Calendar
- Files and documents
- Audio recordings
- Video recordings
- Call logs
- SMS/MMS messages

---

## Data Handling Practices

### Security

- All data is encrypted in transit using TLS/SSL
- Data at rest is encrypted in Supabase cloud infrastructure
- Row-Level Security (RLS) policies restrict data access
- Photos are moderated using automated content safety systems

### Data Sharing

We do NOT sell user data. Data may be shared with:

- **Service Providers:** Cloud hosting (Supabase), Push notifications (Expo), Analytics
- **Legal Requirements:** When required by law or to protect user safety

### Data Retention

- Active account data is retained while account is active
- Posts automatically expire after 7 days
- Deleted account data is permanently removed

### User Controls

Users can:

- Delete their account and all data (Profile > Delete Account)
- Control notification preferences
- Block other users
- Report inappropriate content

---

## Account Deletion

### Location in App

**Path:** Profile Tab > Scroll to bottom > "Delete Account"

### Process

1. User taps "Delete Account" button
2. First confirmation dialog appears
3. User must type "DELETE" to confirm
4. All user data is permanently deleted
5. User is signed out

### What Gets Deleted

- Profile and personal information
- All posts and messages
- Photos and media
- Location history
- Notification settings
- All associated metadata

---

## Data Safety Form Responses

### Does your app collect or share any of the required user data types?

**Yes** - Email, Location, Photos, Messages, Device IDs

### Is all of the user data collected by your app encrypted in transit?

**Yes**

### Do you provide a way for users to request that their data is deleted?

**Yes** - In-app account deletion (Profile > Delete Account)

### Data collection is required or optional?

| Data Type | Required/Optional |
|-----------|-------------------|
| Email | Required (for authentication) |
| Location | Required (for core functionality) |
| Photos | Optional (for profile/verification) |
| Messages | Optional (user-initiated) |

---

## Privacy Policy URL

https://backtrack.social/privacy

---

*Last Updated: December 31, 2024*
