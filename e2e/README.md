# Maestro E2E Tests for Backtrack

This directory contains end-to-end tests for the Backtrack app using [Maestro](https://maestro.mobile.dev/).

## Prerequisites

1. **Install Maestro**:
   ```bash
   # macOS/Linux
   curl -Ls "https://get.maestro.mobile.dev" | bash

   # Windows (using WSL)
   # Install WSL first, then run the command above in WSL
   ```

2. **Set up your device/emulator**:
   - For iOS: Xcode with iOS Simulator
   - For Android: Android Studio with an AVD

## Running Tests

### Run all tests
```bash
maestro test e2e/config.yaml
```

### Run a specific flow
```bash
# Login flow
maestro test e2e/flows/auth-login.yaml

# Signup flow
maestro test e2e/flows/auth-signup.yaml

# Create post flow
maestro test e2e/flows/create-post.yaml

# Chat message flow
maestro test e2e/flows/chat-send-message.yaml

# Profile edit flow
maestro test e2e/flows/profile-edit.yaml
```

### Run tests by tag
```bash
# Run only auth tests
maestro test e2e/config.yaml --tag auth

# Run only core functionality tests
maestro test e2e/config.yaml --tag core
```

## Test Flows

### 1. Auth Login (`auth-login.yaml`)
Tests the login flow for existing users:
- Launch app
- Enter email and password
- Submit login
- Verify successful navigation to feed

### 2. Auth Signup (`auth-signup.yaml`)
Tests the signup flow for new users:
- Launch app
- Switch to signup mode
- Enter email, password, and confirm password
- Check age verification
- Submit signup
- Verify email confirmation message

### 3. Create Post (`create-post.yaml`)
Tests creating a new missed connection post:
- Navigate to create post screen
- Fill in post details (note, location, time)
- Submit post
- Verify post creation

### 4. Chat Send Message (`chat-send-message.yaml`)
Tests sending a message in a conversation:
- Navigate to chats tab
- Select a conversation
- Type and send a message
- Verify message appears in chat

### 5. Profile Edit (`profile-edit.yaml`)
Tests editing user profile:
- Navigate to profile tab
- Edit display name
- Save changes
- Verify changes persist
- Test cancel functionality

## Debugging Tests

### Record a flow
```bash
maestro record e2e/flows/my-flow.yaml
```

### Run with verbose output
```bash
maestro test e2e/flows/auth-login.yaml --verbose
```

### Take screenshots during test
Screenshots are automatically captured on failures. To manually capture:
```yaml
- screenshot: "my-screenshot.png"
```

## Best Practices

1. **Use accessibility labels**: Tests rely on accessibility labels, so ensure all interactive elements have proper `accessibilityLabel` and `accessibilityRole` props.

2. **Use testID for unique elements**: For elements that need reliable selection, use `testID` prop.

3. **Add waits**: Always add `waitForAnimationToEnd` after navigation or async actions.

4. **Make tests resilient**: Use `optional: true` for steps that might not always be present.

5. **Keep flows focused**: Each flow should test one specific user journey.

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Maestro Tests
  run: |
    maestro test e2e/config.yaml --format junit --output test-results/
```

### Report Generation
Maestro can generate JUnit XML reports for CI integration:
```bash
maestro test e2e/config.yaml --format junit --output test-results/
```

## Troubleshooting

### Tests fail to find elements
- Verify accessibility labels are set correctly
- Check that elements are visible on screen
- Add appropriate waits for animations

### App doesn't launch
- Verify `appId` matches your app's bundle identifier
- Ensure the app is installed on the device/emulator
- Check that Maestro can access ADB (Android) or instruments (iOS)

### Flaky tests
- Add more `waitForAnimationToEnd` calls
- Increase timeout values if needed
- Use `assertVisible` with `timeout` parameter

## Resources

- [Maestro Documentation](https://maestro.mobile.dev/docs)
- [Maestro Examples](https://maestro.mobile.dev/examples)
- [Maestro Best Practices](https://maestro.mobile.dev/best-practices)
