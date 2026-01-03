# Maestro E2E Tests

This directory contains end-to-end tests using [Maestro](https://maestro.mobile.dev/).

## Running Locally

### Prerequisites

1. Install Maestro:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. For iOS testing (Mac only):
   - Xcode with iOS Simulator
   - Build the app: `npx expo run:ios`

3. For Android testing:
   - Android Emulator running
   - Build the app: `npx expo run:android`

### Running Tests

```bash
# Run all tests
maestro test .maestro/

# Run a specific test
maestro test .maestro/auth-login.yaml

# Run with environment variables
TEST_USER_EMAIL=test@example.com TEST_USER_PASSWORD=password123 maestro test .maestro/

# Run smoke tests only
maestro test .maestro/ --include-tags smoke

# Interactive mode (great for debugging)
maestro studio
```

## Test Files

| File | Description |
|------|-------------|
| `config.yaml` | Maestro configuration |
| `auth-login.yaml` | User login flow |
| `producer-flow.yaml` | Creating a missed connection post |
| `consumer-flow.yaml` | Browsing posts and matching |

## CI/CD

Tests run automatically on:
- Push to `main` branch
- Pull requests to `main`
- Manual trigger via GitHub Actions

### Required Secrets

Add these to your GitHub repository secrets:

| Secret | Description |
|--------|-------------|
| `EXPO_TOKEN` | Expo access token for EAS builds |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `TEST_USER_EMAIL` | Test account email |
| `TEST_USER_PASSWORD` | Test account password |

### Creating a Test Account

Create a dedicated test account in your Supabase project for CI:

1. Go to Supabase Dashboard > Authentication > Users
2. Create a new user with email/password
3. Add the credentials as GitHub secrets

## Writing New Tests

See [Maestro documentation](https://maestro.mobile.dev/getting-started/writing-your-first-flow) for syntax.

### Tips

- Use `testId` props in React Native components for reliable selectors
- Use `takeScreenshot` for debugging and documentation
- Use `runFlow` with `when` for conditional steps
- Use `extendedWaitUntil` for async operations

### Example: Adding testID to a component

```tsx
<Button testID="submit-button" onPress={handleSubmit}>
  Submit
</Button>
```

Then in Maestro:

```yaml
- tapOn:
    id: "submit-button"
```
