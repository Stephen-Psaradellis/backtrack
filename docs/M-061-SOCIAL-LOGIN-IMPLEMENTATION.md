# M-061: Apple and Google Social Login Implementation

## Overview

This implementation adds Apple Sign In and Google Sign In to the Backtrack React Native app, providing users with convenient one-tap authentication options.

## Implementation Summary

### Files Created

1. **`hooks/useSocialAuth.ts`** (348 lines)
   - Core social authentication logic
   - Apple Sign In via `expo-apple-authentication`
   - Google Sign In via `expo-auth-session`
   - Automatic profile creation for first-time users
   - Error handling with user-friendly messages
   - Loading states per provider
   - Platform detection (Apple iOS-only)

2. **`components/SocialLoginButton.tsx`** (181 lines)
   - Reusable social login button component
   - Platform-specific branding:
     - Apple: Black background, Apple logo
     - Google: White background, Google logo
   - Animated press effects using Animated API
   - Loading states with ActivityIndicator
   - Accessibility support
   - testID props for testing

3. **`hooks/__tests__/useSocialAuth.test.ts`** (305 lines)
   - Comprehensive test suite
   - Platform availability tests
   - Apple Sign In flow tests
   - Google Sign In flow tests
   - Error handling tests
   - Loading state tests
   - Cancellation tests

### Files Modified

1. **`screens/AuthScreen.tsx`**
   - Added social login section above email form
   - Added "or" divider between social and email auth
   - Integrated `useSocialAuth` hook
   - Added Apple and Google button handlers
   - Added entrance animations for social section
   - Apple button shows only on iOS
   - Analytics tracking for social sign-ins

2. **`.env.example`**
   - Added Google OAuth configuration section
   - Added Apple Sign In configuration notes
   - Documented Supabase provider setup steps
   - Added redirect URI examples

### Dependencies Added

- `expo-apple-authentication` - Native Apple Sign In SDK
- `expo-auth-session` - OAuth flow management

Both packages are part of Expo SDK 54 and require no native code changes.

## Features

### Apple Sign In

- **Platform**: iOS 13+ only
- **Flow**:
  1. User taps "Continue with Apple"
  2. Native Apple Sign In modal appears
  3. User authenticates with Face ID/Touch ID/Password
  4. App receives identity token and nonce
  5. Token exchanged with Supabase for session
  6. Profile created if first-time user
- **Data Collected**: Email, full name (if shared)
- **Privacy**: User can hide email (Apple provides relay email)

### Google Sign In

- **Platform**: iOS and Android
- **Flow**:
  1. User taps "Continue with Google"
  2. Google OAuth web view opens
  3. User selects Google account and authorizes
  4. App receives ID token
  5. Token exchanged with Supabase for session
  6. Profile created if first-time user
- **Data Collected**: Email, name, profile picture
- **Scopes**: `openid`, `profile`, `email`

### First-Time User Flow

When a user signs in with Apple or Google for the first time:

1. Hook checks if profile exists in `profiles` table
2. If not found, creates new profile with:
   - `id`: User ID from auth
   - `display_name`: Full name from provider
   - `username`: null (set during onboarding)
3. User proceeds to onboarding or home screen

### Account Linking

- **Automatic**: Supabase links accounts by email automatically
- **Manual**: `supabase.auth.linkIdentity()` can be used for explicit linking (future feature)
- **Email Conflict**: If email exists, Supabase returns error indicating account already exists

## Configuration

### Supabase Dashboard Setup

#### Apple Sign In

1. Go to Authentication → Providers → Apple
2. Enable Apple provider
3. Configure:
   - **Service ID**: From Apple Developer portal
   - **Team ID**: From Apple Developer account
   - **Key ID**: From Apple Developer portal
   - **Private Key**: Download from Apple Developer portal
4. Add redirect URL: `https://[project].supabase.co/auth/v1/callback`

**Prerequisites**:
- Apple Developer account ($99/year)
- App ID with Sign in with Apple capability
- Service ID configured in Apple Developer portal

**Documentation**: https://supabase.com/docs/guides/auth/social-login/auth-apple

#### Google Sign In

1. Go to Authentication → Providers → Google
2. Enable Google provider
3. Configure:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
4. Add redirect URL: `https://[project].supabase.co/auth/v1/callback`

**Prerequisites**:
- Google Cloud project
- OAuth 2.0 credentials created
- Authorized redirect URIs configured

**Documentation**: https://supabase.com/docs/guides/auth/social-login/auth-google

### Environment Variables

Add to `.env.local`:

```bash
# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

**Note**: Apple Sign In requires no client-side env vars (configured in Supabase only).

### Google Cloud Console Setup

1. Go to https://console.cloud.google.com
2. Create OAuth 2.0 credentials:
   - **Type**: OAuth 2.0 Client ID
   - **Application type**:
     - iOS (for iOS client ID)
     - Android (for Android client ID)
3. Configure authorized redirect URIs:
   - `com.backtrack.app:/oauthredirect` (mobile)
   - `https://[project].supabase.co/auth/v1/callback` (Supabase)
4. Copy Client IDs to `.env.local`

## UI/UX Design

### Layout

```
┌─────────────────────────────────┐
│  Welcome Back                   │
│  Sign in to continue            │
│                                 │
│  ┌──────────────────────────┐  │
│  │   Continue with Apple    │  │  ← iOS only
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │   Continue with Google   │  │
│  └──────────────────────────┘  │
│                                 │
│  ────────────  or  ────────────│
│                                 │
│  Email                          │
│  [email input]                  │
│                                 │
│  Password                       │
│  [password input]               │
│                                 │
│  [Sign In Button]               │
└─────────────────────────────────┘
```

### Styling

- **Apple Button**:
  - Background: #000000 (Black)
  - Text: #FFFFFF (White)
  - Icon: Apple logo (Ionicons)
  - Height: 48px
  - Border radius: 16px

- **Google Button**:
  - Background: #FFFFFF (White)
  - Text: #1F1F1F (Dark gray)
  - Border: 1px solid dark theme border
  - Icon: Google logo (Ionicons)
  - Height: 48px
  - Border radius: 16px

- **Divider**:
  - Horizontal lines with "or" text
  - Muted text color
  - Margin: 20px vertical

### Animations

All social buttons use the same entrance animation sequence as email form:

1. Title/subtitle fade in (600ms)
2. Social buttons stagger in (400ms each)
3. Divider fades in (400ms)
4. Email form fields stagger in (400ms each)

Press animations:
- Scale to 0.97 on press
- Spring animation (tension: 300, friction: 10)
- Haptic feedback on press

## Error Handling

### User-Friendly Error Messages

| Error Type | Message |
|------------|---------|
| User cancelled | "Sign in was cancelled. Please try again." |
| Network error | "Network error. Please check your connection and try again." |
| Invalid token | "Authentication failed. Please try again." |
| Configuration error | "Social login is not properly configured. Please contact support." |
| Platform unavailable | "Apple Sign In is only available on iOS devices." |
| Missing ID token | "Failed to get authentication token from Google." |
| Generic error | "An error occurred during sign in. Please try again." |

### Error Display

- Errors shown in red error banner at top of form
- Shake animation on error (same as email auth)
- Error cleared when user taps another button
- Haptic error feedback on failure
- Haptic success feedback on success

## Analytics

Social sign-ins are tracked with analytics events:

```typescript
trackEvent(AnalyticsEvent.LOGIN, { method: 'apple' })
trackEvent(AnalyticsEvent.LOGIN, { method: 'google' })
```

This allows tracking conversion rates and preferred sign-in methods.

## Testing

### Unit Tests

Run tests:
```bash
npm test -- hooks/__tests__/useSocialAuth.test.ts
```

Test coverage:
- Platform availability (iOS vs Android)
- Successful Apple sign in
- Successful Google sign in
- User cancellation handling
- Missing token handling
- Network error handling
- Loading states
- Profile creation for first-time users

### Manual Testing

#### Apple Sign In (iOS Simulator)

1. Configure valid Apple credentials in Supabase
2. Run app on iOS simulator (iOS 13+)
3. Tap "Continue with Apple"
4. Sign in with Apple ID in modal
5. Verify session created and profile exists

#### Google Sign In (iOS/Android)

1. Configure valid Google credentials in Supabase
2. Add client IDs to `.env.local`
3. Run app on iOS/Android device or simulator
4. Tap "Continue with Google"
5. Select Google account and authorize
6. Verify session created and profile exists

#### First-Time User

1. Use fresh Google/Apple account
2. Sign in via social button
3. Verify profile created in database
4. Check `display_name` populated from provider
5. Verify `username` is null (for onboarding)

#### Error Cases

1. Cancel during Apple/Google flow → Error message shown
2. Network offline → Network error shown
3. Invalid Supabase config → Configuration error shown
4. Android user taps Apple button → Not visible (platform check)

## Security Considerations

### Token Handling

- Identity tokens never stored client-side
- Tokens immediately exchanged for Supabase session
- Session stored in SecureStore (encrypted)
- Tokens validated by Supabase backend

### Provider Security

- Apple: Nonce used to prevent replay attacks
- Google: State parameter prevents CSRF attacks
- Both: HTTPS-only redirect URIs
- Both: Token expiration enforced

### Profile Creation

- Profile creation requires valid auth session
- Row Level Security (RLS) enforced on profiles table
- Only authenticated user can create their own profile
- No privilege escalation possible

## Accessibility

### ARIA/Accessibility Labels

- Apple button: "Sign in with Apple"
- Google button: "Sign in with Google"
- Loading state: `accessibilityState={{ busy: true }}`
- Disabled state: `accessibilityState={{ disabled: true }}`

### Screen Reader Support

- Buttons announce provider name
- Loading states announced
- Error messages announced
- Proper focus management

## Future Enhancements

1. **Account Linking UI**:
   - Allow users to link existing email account to social account
   - Show linked accounts in settings
   - Allow unlinking accounts

2. **Additional Providers**:
   - Facebook Login
   - Twitter/X Login
   - Microsoft Login

3. **Profile Picture Import**:
   - Import profile photo from Google
   - Set as default avatar during onboarding

4. **Email Verification Skip**:
   - Skip email verification for social sign-ins
   - Mark email as verified automatically

5. **Multi-Account Support**:
   - Support multiple Google accounts
   - Allow switching between accounts

## Troubleshooting

### Common Issues

#### Apple Sign In Not Appearing (iOS)

- Check iOS version (must be 13+)
- Verify Supabase Apple provider enabled
- Check Service ID configuration
- Ensure redirect URI correct

#### Google Sign In Fails

- Verify client IDs in `.env.local`
- Check Google Cloud Console redirect URIs
- Ensure Supabase Google provider enabled
- Verify client secret in Supabase

#### Profile Not Created

- Check database logs for errors
- Verify RLS policies allow INSERT
- Check `profiles` table schema
- Ensure user ID matches auth.users

#### "Configuration Error" Message

- Provider not enabled in Supabase
- Missing credentials in Supabase
- Invalid redirect URI
- Client ID/Secret mismatch

### Debug Mode

Enable verbose logging:

```typescript
// In useSocialAuth.ts
console.log('Apple credential:', credential)
console.log('Supabase auth response:', data)
console.log('Profile creation result:', profileResult)
```

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Google Sign In Documentation](https://developers.google.com/identity)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Expo Auth Session](https://docs.expo.dev/versions/latest/sdk/auth-session/)

## Completion Checklist

- [x] Create `useSocialAuth` hook with Apple and Google sign-in
- [x] Create `SocialLoginButton` component with platform branding
- [x] Update `AuthScreen` with social login section
- [x] Add entrance animations for social buttons
- [x] Add "or" divider between social and email auth
- [x] Implement first-time user profile creation
- [x] Add error handling with user-friendly messages
- [x] Add loading states per provider
- [x] Platform check (Apple iOS-only)
- [x] Install required dependencies
- [x] Update `.env.example` with configuration docs
- [x] Create comprehensive tests
- [x] Add analytics tracking
- [x] Document Supabase setup steps
- [x] Document Google Cloud Console setup
- [x] Add accessibility labels
- [x] Add testID props for testing
