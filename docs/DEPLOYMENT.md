# Deployment Guide for Backtrack

This document covers the deployment process for Backtrack to the Apple App Store and Google Play Store.

## Prerequisites

### Developer Accounts
- **Apple Developer Account** ($99/year) - https://developer.apple.com
- **Google Play Console Account** ($25 one-time) - https://play.google.com/console

### Tools Required
- Node.js 18+ and npm
- EAS CLI: `npm install -g eas-cli`
- Doppler CLI (for secrets): https://docs.doppler.com/docs/install-cli

### Environment Variables Required

Set these in Doppler or your EAS secrets:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-side only

# Google Maps
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key

# Ready Player Me (Avatar)
EXPO_PUBLIC_RPM_SUBDOMAIN=backtrack

# Sentry (Error Tracking)
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn

# EAS
EXPO_TOKEN=your-expo-token
```

## Build Configuration

### EAS Configuration (eas.json)

The project includes three build profiles:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

## Building for Production

### 1. Login to EAS

```bash
eas login
```

### 2. Configure Project

```bash
eas build:configure
```

### 3. Build for Both Platforms

```bash
# Build for all platforms
eas build --platform all --profile production

# Or build individually
eas build --platform ios --profile production
eas build --platform android --profile production
```

### 4. Monitor Build Status

```bash
eas build:list
```

## iOS Deployment

### App Store Connect Setup

1. Create app in App Store Connect
2. Fill in app information:
   - App Name: Backtrack
   - Bundle ID: com.backtrack.app
   - Primary Language: English
   - SKU: backtrack-app

### Required Assets
- App Icon: 1024x1024 PNG (no alpha)
- Screenshots for each device size
- App Preview videos (optional)

### App Information
- Category: Social Networking
- Age Rating: 17+ (dating-adjacent content)
- Privacy Policy URL: https://backtrack.social/privacy
- Terms of Service URL: https://backtrack.social/terms

### Submit for Review

```bash
eas submit --platform ios
```

### Review Guidelines Checklist
- [ ] Privacy policy accessible
- [ ] Login/authentication working
- [ ] No placeholder content
- [ ] Location permissions explained
- [ ] Camera permissions explained
- [ ] All features functional

## Android Deployment

### Google Play Console Setup

1. Create app in Google Play Console
2. Complete store listing:
   - App name: Backtrack
   - Short description (80 chars)
   - Full description (4000 chars)

### Required Assets
- High-res icon: 512x512 PNG
- Feature graphic: 1024x500 PNG
- Screenshots (min 2 per device type)

### Content Rating
Complete the content rating questionnaire for:
- Violence
- Sexual content
- Drugs
- Language

### Submit for Review

```bash
eas submit --platform android
```

### Release Tracks
1. **Internal testing** - For development team
2. **Closed testing** - For beta testers
3. **Open testing** - Public beta
4. **Production** - Full release

## Version Management

### Semantic Versioning
Format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Version Update Process

1. Update version in `app.json`:
```json
{
  "expo": {
    "version": "1.1.0"
  }
}
```

2. Build with auto-increment:
```bash
eas build --auto-submit --platform all
```

## Continuous Deployment

### GitHub Actions Workflow

The project includes `.github/workflows/ci.yml` for automated testing.

For automated deployment, add a workflow:

```yaml
name: Deploy to App Stores

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform all --profile production --non-interactive
      - run: eas submit --platform all --non-interactive
```

## Post-Deployment

### Monitoring
1. Check crash reports in App Store Connect / Play Console
2. Monitor Sentry for errors
3. Review user feedback and ratings

### Hotfix Process
1. Create hotfix branch
2. Fix issue
3. Increment patch version
4. Build and submit for expedited review (if critical)

## Rollback Procedure

### iOS
- Previous versions remain available in App Store Connect
- Can halt release and revert to previous version

### Android
- Use Play Console to halt rollout
- Stage previous APK/AAB for release

## Environment-Specific Configurations

### Development
- Mock services enabled
- Debug logging
- Development API endpoints

### Staging
- Real services with test data
- Verbose logging
- Staging API endpoints

### Production
- Real services
- Minimal logging
- Production API endpoints
- Error tracking enabled

## Troubleshooting

### Build Failures

```bash
# Clear EAS cache
eas build --clear-cache

# Check credentials
eas credentials
```

### Submission Failures

```bash
# Check submission status
eas submit:status
```

### Common Issues

1. **Missing credentials**: Run `eas credentials` to configure
2. **Version conflict**: Ensure version is higher than current store version
3. **Asset issues**: Verify all required assets meet specifications
4. **API key issues**: Verify environment variables are set correctly

## Checklist Before Submission

### Code Quality
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] No console.log statements in production

### App Store Requirements
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] App icons uploaded
- [ ] Screenshots uploaded
- [ ] App description complete
- [ ] Age rating configured

### Technical
- [ ] Production environment variables set
- [ ] Analytics enabled
- [ ] Error tracking enabled
- [ ] Push notifications configured
- [ ] Deep linking configured

### Legal
- [ ] GDPR compliance verified
- [ ] CCPA compliance verified
- [ ] Export compliance verified
