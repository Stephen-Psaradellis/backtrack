# Maestro E2E Testing Setup

Maestro is a mobile UI testing framework that uses simple YAML flows to test iOS and Android apps.

## Installation

### macOS / Linux
```bash
curl -Ls https://get.maestro.mobile.dev | bash
```

### Windows (WSL2 required for iOS, native for Android)
```bash
# In WSL2 or Git Bash
curl -Ls https://get.maestro.mobile.dev | bash
```

After installation, verify with:
```bash
maestro --version
```

## Prerequisites

1. **Android**: ADB installed and emulator running
   ```bash
   # List devices
   adb devices

   # Start emulator (if using Android Studio AVD)
   emulator -avd Pixel_9_Pro
   ```

2. **iOS** (macOS only): Xcode and iOS Simulator
   ```bash
   # List simulators
   xcrun simctl list devices

   # Boot a simulator
   xcrun simctl boot "iPhone 15 Pro"
   ```

3. **App running on device**: Start the Expo dev server and ensure app is installed
   ```bash
   doppler run -- npx expo start --android
   # OR
   doppler run -- npx expo start --ios
   ```

## Test Accounts

| User | Email | Password |
|------|-------|----------|
| User 1 (Primary) | s.n.psaradellis@gmail.com | Test1234! |
| User 2 (Secondary) | spsaradellis@gmail.com | Test1234! |

User 2 has pre-seeded data for testing conversations and matching.

## Running Tests

### Run all tests
```bash
npm run e2e
# OR
maestro test .maestro/flows/
```

### Run specific test suite
```bash
npm run e2e:auth
# OR
maestro test .maestro/flows/auth/
```

### Run a single flow
```bash
maestro test .maestro/flows/auth/login.yaml
```

### Debug mode with Maestro Studio
```bash
maestro studio
```
This opens an interactive UI for building and debugging flows.

### Record a flow (auto-generate YAML)
```bash
npm run e2e:record
# OR
maestro record
```

## Test Structure

```
.maestro/
├── config.yaml          # Global configuration
└── flows/
    ├── auth/            # Authentication tests (4 flows)
    │   ├── login.yaml              # Login with valid credentials
    │   ├── login-invalid.yaml      # Login validation errors
    │   ├── logout.yaml             # Logout from profile
    │   └── signup.yaml             # Signup form validation
    ├── navigation/      # Tab and navigation tests (2 flows)
    │   ├── tabs.yaml               # Tab navigation
    │   └── back-navigation.yaml    # Back button behavior
    ├── home/            # Home screen tests (2 flows)
    │   ├── map-view.yaml           # Map loading and display
    │   └── location-list.yaml      # Favorites list functionality
    ├── posts/           # Post creation tests (1 flow)
    │   └── create-post-flow.yaml   # Post creation wizard
    ├── avatar/          # Avatar system tests (1 flow)
    │   └── avatar-selection.yaml   # Avatar creator screen
    ├── chat/            # Messaging tests (3 flows)
    │   ├── view-conversations.yaml # Conversation list
    │   ├── send-message.yaml       # Send message in chat
    │   └── photo-sharing.yaml      # Photo sharing modal
    └── profile/         # Profile tests (3 flows)
        ├── view-profile.yaml       # Profile screen display
        ├── favorites.yaml          # Favorites management
        └── edit-profile.yaml       # Edit display name
```

**Total: 16 test flows**

## Common Maestro Commands

```yaml
# Launch app
- launchApp:
    appId: "app.backtrack.social"
    clearState: true  # Optional: clear app data before launch

# Tap on element by text
- tapOn: "Sign In"

# Tap on element by accessibility ID
- tapOn:
    id: "email-input"

# Type text
- inputText: "test@example.com"

# Type with submit (Enter key)
- inputText:
    text: "password123"
    submit: true

# Assert element is visible
- assertVisible: "Home"
- assertVisible:
    id: "map-container"

# Assert element not visible
- assertNotVisible: "Error"

# Wait for element
- waitForElement:
    text: "Loading complete"
    timeout: 10000  # ms

# Scroll
- scroll

# Swipe
- swipe:
    direction: UP
    duration: 500

# Take screenshot
- takeScreenshot: "login-screen"

# Run another flow
- runFlow: "../auth/login.yaml"

# Conditional
- runFlow:
    when:
      visible: "Allow"
    file: "dismiss-permission.yaml"

# Wait
- waitForAnimationToEnd
- extendedWaitUntil:
    visible: "Dashboard"
    timeout: 30000
```

## Troubleshooting

### "Element not found"
1. Use `maestro studio` to inspect the screen
2. Try different selectors (text, id, index)
3. Add `waitForElement` before interaction
4. Check if element is scrollable or behind a modal

### Flaky tests
1. Add explicit waits: `waitForAnimationToEnd`
2. Increase timeouts for network operations
3. Use `extendedWaitUntil` for async operations
4. Clear app state at start: `clearState: true`

### Android-specific
```bash
# Reset ADB if tests hang
adb kill-server && adb start-server

# Check app package name
adb shell pm list packages | grep backtrack
```

### iOS-specific
```bash
# Reset simulator if tests fail
xcrun simctl shutdown all
xcrun simctl erase all
```

## CI/CD Integration

### GitHub Actions
```yaml
jobs:
  e2e:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Maestro
        run: curl -Ls https://get.maestro.mobile.dev | bash
      - name: Start iOS Simulator
        run: |
          xcrun simctl boot "iPhone 15 Pro"
          xcrun simctl install booted path/to/app.app
      - name: Run E2E Tests
        run: maestro test .maestro/flows/
```

## Adding testID Props

If an element needs a testID for reliable selection, add it in the React Native component:

```tsx
// Before
<TextInput placeholder="Email" />

// After
<TextInput
  placeholder="Email"
  testID="email-input"
  accessibilityLabel="Email input"
/>
```

Maestro can find elements by:
- `testID` → `id: "email-input"`
- `accessibilityLabel` → `id: "Email input"`
- Visible text → `text: "Sign In"`
