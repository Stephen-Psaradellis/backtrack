# Design System Improvement Plan

> **Generated**: 2026-02-08
> **App**: Backtrack - Location-based anonymous matchmaking (React Native / Expo SDK 54)
> **Current State**: 12 UI components, 1 theme file, 1 glass styles file, 3 navigation components

---

## Current Design System Audit

### Color Palette Analysis

**What exists today:**

The color palette is defined in `C:\Users\snpsa\love-ledger\constants\theme.ts` with a well-structured token hierarchy:

- **Primary (Warm Coral)**: 11-step scale from `#FFF5F2` (50) to `#4A1409` (950), anchor at `#FF6B47` (500)
- **Accent (Deep Violet)**: 11-step scale from `#F5F3FF` (50) to `#2E1065` (950), anchor at `#8B5CF6` (500)
- **Neutral (Warm Grays)**: 11-step scale from `#FAFAF9` (50) to `#0C0A09` (950) -- uses stone-toned grays
- **Semantic**: success (`#10B981`), warning (`#F59E0B`), error (`#EF4444`), info (`#3B82F6`) -- each with light/main/dark variants

**Issues identified:**

1. **Dual color system divergence.** The `glassStyles.ts` file (line 15-52) defines a separate `darkTheme` object with hardcoded hex values (`#0F0F13`, `#16161D`, `#1C1C24`, `#242430`) that do not reference the `colors` token from `theme.ts`. This creates two sources of truth -- the dark backgrounds in `glassStyles.ts` are cold blue-tinted blacks, while `theme.ts` neutrals are warm stone-tinted. The visual mismatch is especially noticeable in transitions between screens that use different token sets.

2. **Hardcoded color literals throughout components.** The `ChatBubble.tsx` (line 112-129) defines its own `COLORS` constant with `#FF6B47`, `#E5E5EA`, `#8E8E93`, `#34C759` rather than importing from the theme. The `CheckInButton.tsx` uses raw `#FF6B47` (line 443, 449, 474), `#4CAF50` (line 402, 487), and `#FFFFFF` (line 443, 449, 509, 586, 665) directly. The `App.tsx` root container uses `#FAFAF9` (line 358) as a hardcoded string rather than `colors.neutral[50]`.

3. **Missing dark mode semantic tokens.** The `darkModeColors` object in `theme.ts` (line 409-422) provides a flat set of role-based tokens (background, foreground, card, etc.) but these are not used by any native component. Native components instead import `darkTheme` from `glassStyles.ts`. The web UI components (Button, Card, Input, etc.) use Tailwind `dark:` prefix classes that map to different values entirely.

4. **No color contrast validation.** The `darkTheme.textMuted` is `rgba(255, 255, 255, 0.5)` on `#0F0F13` which calculates to approximately 5.8:1 contrast ratio (passes AA for normal text but borderline). The `darkTheme.textDisabled` at `rgba(255, 255, 255, 0.3)` on `#0F0F13` is approximately 3.1:1, failing WCAG AA for normal text. The `ChatBubble` received message uses `#000000` text on `#E5E5EA` (not dark-mode aware at all).

5. **Notification color mismatch.** The `app.json` (line 80) sets the notification color to `#FF6B6B` which is close to but not exactly `#FF6B47` (the primary-500). This creates brand inconsistency in Android notification icons.

### Typography Scale

**What exists today:**

Defined in `theme.ts` (line 129-161):
- Font family: system-ui stack (no custom fonts loaded)
- Font sizes: xs(12), sm(14), base(16), lg(18), xl(20), 2xl(24), 3xl(30), 4xl(36), 5xl(48)
- Font weights: normal(400), medium(500), semibold(600), bold(700)
- Line heights: tight(1.25), normal(1.5), relaxed(1.75)
- Letter spacing: tight(-0.5), normal(0), wide(0.5)

The `glassStyles.ts` (line 264-323) defines a separate `darkTypography` StyleSheet with named text styles (hero, title, subtitle, body, label, caption, accent, value) using hardcoded pixel values that partially overlap with the theme tokens.

**Issues identified:**

1. **No type scale used in practice.** Native components define font sizes inline. For example, `ChatBubble.tsx` uses `fontSize: 16` (line 703), `fontSize: 11` (line 726, 732), `fontSize: 12` (line 754) without referencing `typography.fontSize`. The `CheckInButton.tsx` uses `fontSize: 14` (line 579), `fontSize: 20` (line 616), `fontSize: 18` (line 621), `fontSize: 13` (line 758), `fontSize: 12` (line 760) -- all hardcoded.

2. **No custom font integration.** The app uses system fonts exclusively. For a dating/social app competing for attention, a custom font pairing (such as a geometric sans-serif for headings and the system font for body) would strengthen brand identity significantly.

3. **Missing font weight for extra-bold (800).** The `BacktrackLogo.tsx` (line 148) uses `fontWeight: '800'` for the logo text, which is not part of the `typography.fontWeight` scale. This weight is used ad-hoc.

4. **Line height inconsistency.** The theme defines line heights as multipliers (1.25, 1.5, 1.75), but actual components use pixel values: `ChatBubble` uses `lineHeight: 22` (line 704), `darkTypography` uses `lineHeight: 22` (line 293), `lineHeight: 18` (line 309). There is no mapping function between the multiplier scale and pixel values.

5. **No responsive typography.** Font sizes are static. On larger phones (iPhone Pro Max) and tablets (`supportsTablet: true` in app.json), the type remains the same size, wasting screen real estate and reducing readability at arm's length.

### Spacing & Layout Grid

**What exists today:**

The spacing scale in `theme.ts` (line 99-123) is a comprehensive 4px-based system from 0 to 128px (0 through 32 in the scale). The `darkLayout` StyleSheet in `glassStyles.ts` (line 329-373) provides reusable layout helpers (container, section, row, rowBetween, center, gap utilities from 4-24px).

**Issues identified:**

1. **Spacing tokens rarely referenced.** Components use raw numeric spacing. The `AnimatedTabBar.tsx` uses `paddingTop: 12`, `paddingVertical: 8` (lines 172, 186). The `GlobalHeader.tsx` uses `paddingHorizontal: 16`, `paddingVertical: 12` (lines 185-186). The `FloatingActionButtons.tsx` uses `paddingHorizontal: 16`, `paddingVertical: 10` (lines 166-167). None import `spacing` from theme.

2. **No explicit grid system.** There is no column grid or layout grid definition for content areas. Screens use ad-hoc horizontal padding (mostly 16-20px but inconsistent: `darkLayout.section` uses 20px, `ChatBubble` uses 12px, `CheckInButton` modal uses 24px, header uses 16px).

3. **Safe area handling is duplicated.** Every component that needs safe area insets imports `useSafeAreaInsets` and manually calculates padding. There is no wrapper component or hook that standardizes layout with safe areas.

### Component Library Coverage

**What exists today (12 components in `components/ui/`):**

| Component | Platform | Variants | Dark Mode | A11y |
|-----------|----------|----------|-----------|------|
| Button | Web (HTML) | 5 variants, 3 sizes | Tailwind dark: | aria-busy |
| Card | Web (HTML) | 4 variants, 3 paddings | Tailwind dark: | role=button when interactive |
| Input | Web (HTML) | 3 sizes | Tailwind dark: | aria-invalid, aria-describedby |
| Modal | Web (HTML) | 5 sizes | Tailwind dark: | aria-modal, focus trap |
| Badge | Web (HTML) | 7 variants, 3 sizes | Tailwind dark: | -- |
| Skeleton | Web (HTML) | 4 variants, 3 animations | dark: bg | -- |
| EmptyState | Web (HTML) | 7 variants | dark: classes | -- |
| AnimatedList | Web (HTML) | 3 animations | -- | -- |
| Avatar | Web (HTML) | 6 sizes, 4 statuses | dark: ring offset | -- |
| BacktrackLogo | React Native | 3 sizes | Uses darkTheme | accessibilityRole="text" |
| Icons | Web (lucide-react) | 90+ re-exports | -- | aria-hidden on all |
| (index.ts) | -- | barrel exports | -- | -- |

**Critical issue: The UI library is web-only, but the app is React Native.** The Button, Card, Input, Modal, Badge, Skeleton, EmptyState, AnimatedList, Avatar, and Icons components all use HTML elements (`<button>`, `<div>`, `<input>`, `<span>`, `<img>`, `<svg>`) and Tailwind CSS classes. They cannot render in React Native. Only `BacktrackLogo.tsx` is a real React Native component.

The actual native app uses:
- React Native's built-in `TouchableOpacity`, `Pressable`, `View`, `Text`, `TextInput`, `Modal`, `FlatList`
- `@expo/vector-icons` (Ionicons) for icons
- `darkTheme` / `glassStyles` / `darkButtonStyles` from `glassStyles.ts` for styling
- Inline StyleSheet definitions per component

This means the web UI library is entirely unused in the native app, or is being maintained for a potential web version that does not exist yet. The native app has no shared component library -- every screen builds its own UI from raw primitives.

### Animation & Motion Design

**What exists today:**

The `theme.ts` (line 238-254) defines animation tokens:
- Durations: fast(150ms), normal(200ms), slow(300ms), slower(500ms)
- Easings: ease, easeIn, easeOut, easeInOut, spring (`cubic-bezier(0.34, 1.56, 0.64, 1)`), smooth (`cubic-bezier(0.4, 0, 0.2, 1)`)

The `AnimatedTabBar.tsx` uses React Native's `Animated` API with spring physics (`tension: 68, friction: 10` for indicator, `tension: 300, friction: 10` for tab press scale). The web `AnimatedList.tsx` uses CSS animations (fade-in, fade-in-up, fade-in-scale) with stagger delays.

**Issues identified:**

1. **No shared animation library.** The native app uses raw `Animated` API, not `react-native-reanimated`. This means animations run on the JS thread and can drop frames during heavy computation (such as message list rendering in ChatScreen).

2. **Animation tokens not consumed by native code.** The `animation.duration` and `animation.easing` tokens in `theme.ts` are not imported anywhere in the native codebase. The `AnimatedTabBar` uses `duration: 100` (line 63) which does not match any token.

3. **No page transition customization.** React Navigation's default slide transition is used. There are no custom screen transitions defined. Apps in the dating/social category typically use more expressive transitions (shared element transitions for avatars, modal-style rises for chat screens).

4. **No haptic-animation coordination.** The app uses haptic feedback via `lib/haptics.ts` (selectionFeedback, successFeedback, errorFeedback, warningFeedback, notificationFeedback) but these are not synchronized with visual animations. A tap on the Check In button fires haptics but the visual response is only `activeOpacity={0.8}`, not a spring scale.

5. **Missing loading/transition animations.** The `ChatBubble` has no entrance animation. New messages appear instantly. The `CheckInButton` uses `ActivityIndicator` for loading state rather than a custom animated transition.

### Dark Mode Implementation

**What exists today:**

- `app.json` sets `userInterfaceStyle: "automatic"` (line 9) -- the app follows system theme preference.
- The native app is exclusively dark-themed via `darkTheme` constants from `glassStyles.ts`. The `App.tsx` root container background is `#FAFAF9` (a light color), but this is immediately covered by the navigation stack which uses dark backgrounds.
- The web UI components have full Tailwind `dark:` support with neutral-800, neutral-700, primary-900 etc. dark variants.
- `StatusBar` in `App.tsx` uses `style="auto"` (line 348).

**Issues identified:**

1. **The app is dark-only in practice.** Despite `userInterfaceStyle: "automatic"`, every native screen uses `darkTheme.background` (`#0F0F13`) and dark surface colors. There is no light mode implementation for native components. If a user has their system set to light mode, they will still see a dark app but with a light status bar, creating visual conflict.

2. **Light mode App.tsx root conflicts.** The root `styles.container` in `App.tsx` (line 358) uses `backgroundColor: '#FAFAF9'` (a light color). During app startup before navigation renders, users on dark mode would see a brief light flash.

3. **ChatBubble is light-mode only for received messages.** The `COLORS.otherBubble` is `#E5E5EA` and `COLORS.otherText` is `#000000` (line 118-119 in ChatBubble.tsx). This is iOS-light-mode messaging style, but the rest of the app is dark. This creates a jarring visual inconsistency where received messages appear as bright light gray bubbles against the dark chat background.

4. **No theme context provider.** There is no React context or hook for accessing the current theme. Components hardcode dark theme imports. Implementing a proper light mode in the future would require touching every single screen and component.

---

## Proposed Improvements

### 1. Visual Identity Refresh

#### 1A. Unified Color Token Architecture

**Problem:** Two competing color systems (`theme.ts` tokens vs `glassStyles.ts` dark theme) with hardcoded hex values scattered across components.

**Proposal:** Create a single `ThemeProvider` context that exposes resolved color tokens based on the current mode (dark/light). All components consume colors from the context, never from direct imports.

**Specific changes:**
- Extend `darkTheme` backgrounds into the `colors` token hierarchy as `neutral.dark` sub-tokens (e.g., `colors.neutral.dark.background: '#0F0F13'`, `colors.neutral.dark.surface: '#1C1C24'`)
- Define equivalent `colors.neutral.light.*` tokens for eventual light mode support
- Create a `useThemeColors()` hook that returns the resolved color set
- Add glass-effect tokens (glass opacity, glassBorder opacity) as part of the main token set rather than a separate file
- Fix the notification color in `app.json` from `#FF6B6B` to `#FF6B47` (primary-500)

**Acceptance criteria:**
- Zero hardcoded hex color strings in any component file
- A single `theme.ts` or `tokens.ts` file is the only source of truth for all color values
- The `glassStyles.ts` darkTheme object derives its values from the shared token set

#### 1B. Typography Upgrade

**Problem:** System fonts only, no brand differentiation, inconsistent usage.

**Proposal:** Introduce a single custom font family for headings/display text while keeping the system font for body text. Candidate fonts for a modern dating/social app:

- **Headings**: Plus Jakarta Sans (geometric, friendly, available on Google Fonts, supports expo-font loading)
- **Body**: System default (already performant, familiar to users)
- **Monospace**: Keep existing system mono stack

**Specific changes:**
- Load Plus Jakarta Sans (or equivalent) via `expo-font` in the App component
- Add font tokens: `typography.fontFamily.display: 'PlusJakartaSans-Bold'`, `typography.fontFamily.displayMedium: 'PlusJakartaSans-SemiBold'`
- Create a `Text` component wrapper that applies the correct font family based on a `variant` prop (heading, subheading, body, caption, label, overline)
- Update the `BacktrackLogo` to use the display font instead of system fontWeight 800

**Acceptance criteria:**
- Custom font renders on both iOS and Android without fallback flash
- All text in the app goes through the `Text` wrapper component
- Font sizes and line heights are derived from theme tokens, never hardcoded

#### 1C. Iconography Consolidation

**Problem:** The web UI library uses lucide-react (90+ icon re-exports), but the native app uses `@expo/vector-icons` (Ionicons). Two different icon systems create visual inconsistency if/when web and native coexist.

**Proposal:** Standardize on a single icon approach for native:

- Continue using Ionicons from `@expo/vector-icons` as the primary icon set (already bundled with Expo, no additional bundle size)
- Create a native `Icon` component that wraps Ionicons with standard sizing, color tokens, and accessibility props
- Define an icon name mapping in a single file so icon references are semantic (e.g., `icon="check-in"` maps to `"location-outline"`) rather than spreading Ionicons-specific names across the codebase

**Acceptance criteria:**
- All native icon usage goes through the wrapper component
- Icon sizes are standardized to 3 sizes: sm(18), md(22), lg(28)
- Icon colors come from theme tokens, not inline strings

### 2. Component Enhancements

Since the web UI library (`components/ui/`) is not used by the native app, the priority is creating a proper **native** component library. The web components can remain as-is for future web development. The improvements below target native React Native components.

#### 2A. Native Button Component

**Current state:** Every screen creates its own `TouchableOpacity` + `StyleSheet` button. `CheckInButton.tsx` has 5 different button style variations inline. `GlobalHeader.tsx` defines `postButton` and `liveViewButton` styles independently.

**Improvements:**
- Create `components/native/Button.tsx` with variants: primary, secondary, outline, ghost, danger, success
- Support sizes: sm, md, lg (mapped to `buttonTokens` from theme.ts)
- Include loading state with animated spinner (not `ActivityIndicator`)
- Include press animation using spring scale (like the tab bar's `scales[index]` pattern)
- Support left/right icon slots with automatic spacing
- Support `fullWidth` prop
- Integrate haptic feedback on press (selectionFeedback by default)

**Acceptance criteria:**
- Renders correctly on iOS and Android with platform-appropriate shadow/elevation
- All 5 variants match the visual design of `darkButtonStyles` from `glassStyles.ts`
- Loading state prevents double-tap
- VoiceOver/TalkBack announces button state (disabled, loading)

#### 2B. Native Card Component

**Current state:** Cards are built ad-hoc using `View` + `glassStyles.card` or `glassStyles.cardElevated`. There is no shared card abstraction.

**Improvements:**
- Create `components/native/Card.tsx` with variants: default, glass, elevated, subtle (matching `glassStyles` patterns)
- Include `CardHeader`, `CardContent`, `CardFooter` sub-components
- Interactive variant with press-in scale animation
- Support `borderAccent` prop to show a gradient left border (primary-to-accent) for highlighted cards

**Acceptance criteria:**
- Glass variant renders with the blur effect on iOS (using `expo-blur` or `react-native-blur`)
- Android glass variant degrades gracefully to semi-transparent surface color
- Interactive card has haptic feedback and scale animation on press

#### 2C. Native Input Component

**Current state:** `TextInput` is used directly in `ChatScreen` and `CheckInButton` with inline styles. No consistent focus state, error handling, or label.

**Improvements:**
- Create `components/native/TextInput.tsx` wrapping React Native's `TextInput`
- Include animated label (floating label pattern that rises on focus)
- Include error state with animated shake and error message
- Include character counter for bounded inputs
- Support left/right icon/action slots
- Apply `glassStyles.input` and `glassStyles.inputFocused` styling automatically
- Support multiline variant (for post content)

**Acceptance criteria:**
- Focus state shows animated border color transition to primary-500
- Error state shows red border with below-field error message
- Placeholder animates up when input receives focus or has content
- Works correctly with `KeyboardAvoidingView`

#### 2D. Native Modal/BottomSheet Component

**Current state:** The `CheckInButton.tsx` builds two different modals from scratch (confirmation modal at line 465-514 and location picker at line 517-546) using React Native's `Modal` with manual overlay styling. Every modal in the app duplicates the overlay, backdrop, and content container pattern.

**Improvements:**
- Create `components/native/BottomSheet.tsx` using `@gorhom/bottom-sheet` for proper gesture-driven sheets
- Create `components/native/Dialog.tsx` for centered confirmation dialogs
- Both components share the glass/dark surface styling from theme
- BottomSheet supports snap points, drag-to-dismiss, and backdrop blur
- Dialog supports title, description, primary/secondary action buttons

**Acceptance criteria:**
- BottomSheet renders with smooth gesture handling on both platforms
- Backdrop properly dims and blurs background content
- Focus is trapped inside the dialog/sheet
- Android back button dismisses the sheet/dialog
- Keyboard avoidance works correctly when sheet contains input fields

#### 2E. Native Avatar Component

**Current state:** `Avatar.tsx` in `components/ui/` is a web HTML component. The native app uses DiceBear avatars rendered via a separate system (`react-native-bitmoji` import in `GlobalHeader.tsx` line 27, `AvatarCreatorScreen.tsx`). The `GlobalHeader` has an inline `avatarPlaceholder` style (line 206-214) for users without avatars.

**Improvements:**
- Create `components/native/Avatar.tsx` that wraps DiceBear avatar rendering
- Support sizes: xs(24), sm(32), md(40), lg(48), xl(64), 2xl(96)
- Include status indicator (online, offline, away) -- matching the web Avatar's status feature
- Include ring decoration (plain or gradient border) for verified/premium users
- Include fallback initials rendering using the primary-to-accent gradient background
- Include `AvatarGroup` variant for showing overlapping avatars (e.g., "3 people checked in")

**Acceptance criteria:**
- DiceBear SVG avatar renders sharply at all sizes
- Status indicator positions correctly at all sizes
- Gradient ring renders using `expo-linear-gradient`
- Initials fallback uses the same gradient as the web Avatar component

#### 2F. ChatBubble Dark Mode Fix

**Current state:** `ChatBubble.tsx` uses `#E5E5EA` (iOS light gray) for received messages and `#000000` for received text. This is light-mode iOS messaging style in an otherwise fully dark-themed app.

**Improvements:**
- Update received bubble color to `darkTheme.surfaceElevated` (`#242430`) with a subtle border
- Update received text color to `darkTheme.textPrimary` (`#FFFFFF`)
- Keep own bubble color as `colors.primary[500]` (`#FF6B47`) with white text
- Add sent/delivered/read status using proper Ionicons checkmark icons instead of text Unicode characters (`'checkmark'`, `'checkmark-done'` instead of `'\u2713'` and `'\u2713\u2713'`)
- Import all color values from theme tokens

**Acceptance criteria:**
- Received messages use dark surface color consistent with the rest of the dark UI
- All color references come from imported theme tokens, not inline strings
- Read receipts use Ionicons with tinted color (`colors.success.main` for read)

### 3. Missing Components

These components are standard in modern dating/social apps but absent from Backtrack:

#### 3A. Toast/Snackbar

**Justification:** The app currently uses `Alert.alert()` for all user notifications (check-in success, offline queue processing, errors). `Alert.alert` blocks interaction and is jarring. A non-blocking toast/snackbar is the modern mobile pattern for transient notifications.

**Specification:**
- Slide-in from top (iOS) or bottom (Android) -- platform-native positioning
- Variants: info, success, warning, error
- Auto-dismiss after configurable duration (default 3s)
- Swipe-to-dismiss gesture
- Optional action button (e.g., "Undo")
- Queue system: multiple toasts stack, not overlap
- Glass-style background consistent with dark theme

**Files to create:** `components/native/Toast.tsx`, `contexts/ToastContext.tsx`

#### 3B. Swipeable Card / Match Card

**Justification:** Backtrack's feed shows posts as a list. The UX Ideation Report (section on "Matching Ceremony") identifies the lack of a "match moment" as a critical gap. A swipeable card pattern for browsing potential matches/posts would add the expected dating-app interaction pattern.

**Specification:**
- Swipe right to respond/like, swipe left to pass
- Spring physics for card snap-back
- Rotation proportional to swipe distance
- Stamp overlay (heart for like, X for pass) that fades in during swipe
- Stack-of-cards visual with peeking next card behind current

**Files to create:** `components/native/SwipeableCard.tsx`, `components/native/CardStack.tsx`

#### 3C. Pull-to-Refresh with Custom Animation

**Justification:** Standard `RefreshControl` is generic. A branded pull-to-refresh animation reinforces brand identity.

**Specification:**
- Custom pull indicator using the Backtrack logo or a location pin animation
- Primary-to-accent gradient spinner
- Haptic feedback at the pull threshold

**Files to create:** `components/native/BrandedRefreshControl.tsx`

#### 3D. Typing Indicator

**Justification:** The chat screen has no typing indicator. Users in an anonymous conversation have no signal that the other person is engaged. This is a standard chat feature.

**Specification:**
- Three-dot bouncing animation in a small bubble
- Appears aligned to the left (other user's side)
- Smooth fade-in/fade-out transitions
- Driven by Supabase Realtime presence

**Files to create:** `components/chat/TypingIndicator.tsx`

#### 3E. Segmented Control

**Justification:** The app has multiple places where tab-like filtering is needed (Feed filter, Map filter, Profile sections) but no shared segmented control component. Each screen builds its own.

**Specification:**
- Animated sliding background indicator (like iOS UISegmentedControl)
- Support 2-5 segments
- Haptic feedback on segment change
- Primary accent color for active segment

**Files to create:** `components/native/SegmentedControl.tsx`

#### 3F. Map Marker Cluster

**Justification:** The MapSearchScreen renders individual markers. When zoomed out with many venues, markers overlap and become unusable. Clustering is a standard map UX pattern.

**Specification:**
- Cluster markers that show count
- Animate cluster expansion on zoom
- Cluster color intensity reflects post density
- Custom marker design matching brand colors (coral dots with count badge)

**Files to create:** `components/map/MarkerCluster.tsx`

#### 3G. Onboarding Carousel / Walkthrough

**Justification:** The UX Ideation Report identifies "no pre-auth onboarding" (F-01) as a critical friction point. Users need a 3-4 screen introduction before signup.

**Specification:**
- Full-screen pages with illustration + title + description
- Pagination dots with animated transitions
- Swipe between pages with spring physics
- Skip button and Get Started CTA on final page
- Parallax scroll effect on illustrations

**Files to create:** `components/native/OnboardingCarousel.tsx`, `screens/OnboardingScreen.tsx`

### 4. Animation & Micro-interactions

#### 4A. Migrate to react-native-reanimated

**Current state:** The app uses React Native's `Animated` API which runs on the JS thread.

**Proposal:** Migrate to `react-native-reanimated` v3 for UI-thread animations. This is the single highest-impact performance improvement for the design system.

**Specific animations to implement/improve:**

| Animation | Current | Proposed | Implementation |
|-----------|---------|----------|----------------|
| Tab bar indicator slide | Animated.spring (JS thread) | useSharedValue + withSpring (UI thread) | Reanimated shared value with spring config |
| Tab press scale | Animated.sequence (JS thread) | useAnimatedStyle + withSequence (UI thread) | Reanimated worklet |
| Chat bubble entrance | None (instant appear) | Fade in + slide up | useAnimatedStyle with entering layout animation |
| Message send | None | Bubble expands from input area | Layout animation with shared element |
| Check-in button state | ActivityIndicator swap | Morphing shape animation | Reanimated interpolation between states |
| Pull-to-refresh | Default RefreshControl | Custom branded animation | Reanimated scroll handler |
| Card press | opacity change only | Scale spring + shadow elevation | useAnimatedStyle with withSpring |
| Screen transitions | React Navigation default | Custom shared element transitions | react-navigation-shared-element |
| Match reveal | None exists | Confetti/particle explosion + heart animation | Reanimated + Skia |
| Skeleton shimmer | CSS animation (web) | LinearGradient + translateX | Reanimated infinite loop |

**Acceptance criteria:**
- All animations run at 60fps on mid-range Android devices
- Animation tokens (duration, easing) from `theme.ts` are consumed by reanimated configs
- No JS thread animation remains in production code

#### 4B. Haptic-Visual Coordination System

**Current state:** Haptics and visuals fire independently. A button tap might trigger `selectionFeedback()` but the visual press state is just `activeOpacity={0.8}`.

**Proposal:** Create a `useHapticPress` hook that combines haptic feedback with a synchronized visual animation:

```
const { animatedStyle, pressProps } = useHapticPress({
  haptic: 'selection',
  scale: 0.96,
  duration: 100,
});
```

This hook returns an animated style (for Reanimated) and press handler props that trigger both haptic and visual feedback in the same frame.

**Acceptance criteria:**
- Haptic fires in the same frame as the visual scale-down
- Works with both `Pressable` and `TouchableOpacity`
- Configurable haptic type (selection, success, error, warning)

#### 4C. Layout Animations for Lists

**Current state:** `AnimatedList.tsx` is a web-only component using CSS animations. The native `FlatList` usage throughout the app has no item animations.

**Proposal:** Use `react-native-reanimated`'s `Layout` animations for list items:
- New items fade-in-up when added to feed
- Deleted items fade-out-left when removed
- Reordering items slide smoothly to new positions

**Acceptance criteria:**
- Feed list items have staggered entrance animation on first load
- New real-time posts animate in without scroll position jump
- Chat messages have subtle entrance animation

### 5. Accessibility Improvements

#### 5A. Color Contrast Fixes

| Element | Current | Issue | Fix |
|---------|---------|-------|-----|
| `darkTheme.textDisabled` | `rgba(255,255,255,0.3)` on `#0F0F13` | ~3.1:1 (fails AA) | Increase to `rgba(255,255,255,0.45)` for ~4.6:1 |
| `darkTheme.textMuted` | `rgba(255,255,255,0.5)` on `#0F0F13` | ~5.8:1 (passes AA, fails AAA) | Keep for AA, document as known AAA gap |
| ChatBubble timestamp | `#8E8E93` on any background | Undefined contrast (no dark background specified) | Use `darkTheme.textMuted` on `darkTheme.background` |
| Badge outline variant | `border-neutral-300 text-neutral-600` (web) | Dark mode: `dark:border-neutral-600 dark:text-neutral-400` on `dark:bg-transparent` -- insufficient contrast for small text | Increase to `dark:text-neutral-300` |

**Acceptance criteria:**
- All text-background combinations meet WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text)
- Automated contrast check runs as part of the test suite

#### 5B. Touch Target Sizes

**Current state:** Several interactive elements are below the recommended 44x44pt minimum:
- `GlobalHeader` avatar button: 40x40 (line 200-201) -- fails by 4pt
- `GlobalHeader` avatar placeholder: 36x36 (line 206-207) -- fails by 8pt
- `AnimatedTabBar` badge: 18x18 (line 198-199) -- not interactive but visually small
- Chat input send button: Inline, likely below 44pt (varies by screen)

**Improvements:**
- Ensure all touchable elements have minimum 44x44pt hit area, even if the visual element is smaller (use `hitSlop` prop)
- Add `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` to all small-target `TouchableOpacity` components

**Acceptance criteria:**
- All interactive elements have at least 44x44pt touch target
- Use `hitSlop` when visual size must remain small for design reasons

#### 5C. Screen Reader Improvements

**Current state:** Accessibility support is inconsistent:
- `AnimatedTabBar.tsx` properly sets `accessibilityRole="button"` and `accessibilityState` (line 129)
- `CheckInButton.tsx` has good `accessibilityLabel` strings (line 436-440)
- `ChatBubble.tsx` has no accessibility annotations on the bubble content or metadata
- The `BacktrackLogo.tsx` sets `accessibilityRole="text"` (line 111) which is correct
- Empty state illustrations have no `accessibilityLabel`

**Improvements:**
- Add `accessibilityLabel` to all `ChatBubble` instances: "[You/Anonymous]: [message content], [time], [read/unread]"
- Add `accessibilityRole="header"` to screen titles
- Add `accessibilityLiveRegion="polite"` to toast/notification components
- Add `accessibilityLabel` to EmptyState illustrations (even though they are decorative, the component should explicitly mark them as `accessible={false}` to prevent confusion)
- Ensure all status indicators (online/offline, check-in status) have text alternatives

**Acceptance criteria:**
- Full VoiceOver (iOS) and TalkBack (Android) walkthrough of all screens without dead-end or unlabeled elements
- Dynamic content updates (new messages, toasts) announced by screen readers

#### 5D. Reduced Motion Support

**Current state:** No support for `prefers-reduced-motion`. All animations play regardless of user preference.

**Improvements:**
- Create a `useReducedMotion()` hook that checks `AccessibilityInfo.isReduceMotionEnabled()` (React Native API)
- All animation components check this flag and skip/simplify animations when enabled
- The `AnimatedTabBar` indicator should instantly jump instead of springing
- List item stagger should be removed
- Skeleton shimmer should use a static pulse instead of moving gradient

**Acceptance criteria:**
- When "Reduce Motion" is enabled in iOS Settings or Android Accessibility, all spring/slide/stagger animations are disabled
- Essential feedback (loading spinners, progress indicators) still shows but uses simple opacity transitions

### 6. Platform-Specific Optimizations

#### 6A. iOS-Specific

| Area | Current | Improvement |
|------|---------|-------------|
| Status bar | `style="auto"` | Use `style="light"` to match dark theme, or dynamically set based on screen |
| Haptics | 5 haptic types used | Add `impactAsync` with `ImpactFeedbackStyle.Medium` for button presses (more satisfying than `selectionAsync`) |
| Safe area | Manual `useSafeAreaInsets` everywhere | Create `SafeScreen` wrapper that handles all safe area padding |
| Keyboard | `KeyboardAvoidingView` with `behavior="padding"` | Use `react-native-keyboard-controller` for smoother keyboard animation sync |
| Blur effects | Not used in native | Use `expo-blur` `BlurView` for glass card backgrounds on iOS |
| Large title navigation | Not used | Consider native large title collapse for main screens (Feed, Chats) to feel more iOS-native |

#### 6B. Android-Specific

| Area | Current | Improvement |
|------|---------|-------------|
| Navigation bar | Default system bar | Set navigation bar color to `darkTheme.background` via `expo-navigation-bar` |
| Material ripple | Not used (TouchableOpacity) | Use `Pressable` with `android_ripple` for Material Design feel on Android |
| Elevation shadows | Elevation used but inconsistent | Standardize elevation values: cards=4, modals=16, FABs=8 |
| Splash screen | White background | Use `expo-splash-screen` with dark background matching `#0F0F13` to prevent flash |
| Edge-to-edge | Not implemented | Configure edge-to-edge display for Android 15+ |
| Predictive back | Not supported | Add gesture-based back navigation preview using React Navigation 7+ |

#### 6C. Cross-Platform Parity

| Pattern | iOS Behavior | Android Behavior | Resolution |
|---------|-------------|------------------|------------|
| Scroll bounce | Native bounce | No bounce (overscroll glow) | Keep platform-native behavior |
| Modal presentation | Bottom sheet slide up | Full screen overlay | Use `@gorhom/bottom-sheet` for consistent sheet behavior |
| Date/time formatting | Foundation formatting | ICU formatting | Already using `toLocaleTimeString()`, keep as-is |
| Tab bar | Thin line indicator at top | Could use Material bottom navigation | Keep current custom design on both platforms |
| Alert dialogs | iOS-style alert | Android-style dialog | Migrate from `Alert.alert()` to custom `Dialog` component for visual consistency |

---

## Actionable Tasks

| ID | Task | Priority | Effort | Acceptance Criteria | Files to Modify/Create |
|----|------|----------|--------|---------------------|----------------------|
| DS-001 | Unify color tokens: merge `darkTheme` into `theme.ts` and eliminate hardcoded hex values | Critical | Large | Zero hardcoded color strings in any component; single source of truth in `constants/theme.ts` | `constants/theme.ts`, `constants/glassStyles.ts`, `components/ChatBubble.tsx`, `components/checkin/CheckInButton.tsx`, `App.tsx`, `app.json` |
| DS-002 | Create ThemeProvider context with `useThemeColors()` hook | Critical | Medium | All native components consume colors from context; light mode hook returns light tokens even if not yet fully styled | `contexts/ThemeContext.tsx` (new), `App.tsx` |
| DS-003 | Fix ChatBubble dark mode: update received bubble colors, replace text checkmarks with icons | Critical | Small | Received bubbles use dark surface color; read receipts use Ionicons; all colors from theme | `components/ChatBubble.tsx` |
| DS-004 | Fix startup light flash: change App.tsx root background to dark, configure expo-splash-screen dark | High | Small | No white flash on app startup on either platform | `App.tsx`, `app.json` |
| DS-005 | Create native Button component with all variants | High | Medium | 6 variants, 3 sizes, loading state, haptic press, passes VoiceOver audit | `components/native/Button.tsx` (new) |
| DS-006 | Create native TextInput component with floating label and error state | High | Medium | Animated label, error shake, character counter, glass styling | `components/native/TextInput.tsx` (new) |
| DS-007 | Create native Card component with glass variant | High | Medium | 4 variants, CardHeader/Content/Footer, interactive press animation, blur on iOS | `components/native/Card.tsx` (new) |
| DS-008 | Create native Avatar component wrapping DiceBear | High | Medium | 6 sizes, status indicator, gradient ring, initials fallback, AvatarGroup | `components/native/Avatar.tsx` (new) |
| DS-009 | Create Toast/Snackbar system | High | Medium | 4 variants, auto-dismiss, swipe-to-dismiss, queue system, glass styling | `components/native/Toast.tsx` (new), `contexts/ToastContext.tsx` (new) |
| DS-010 | Migrate to react-native-reanimated for all animations | High | Large | Tab bar, chat bubbles, card press, skeleton shimmer all run on UI thread at 60fps | `components/navigation/AnimatedTabBar.tsx`, all new native components, `package.json` |
| DS-011 | Create native BottomSheet component using @gorhom/bottom-sheet | High | Medium | Gesture-driven, snap points, backdrop blur, keyboard avoidance | `components/native/BottomSheet.tsx` (new), `components/checkin/CheckInButton.tsx` |
| DS-012 | Create native Icon wrapper with semantic naming | Medium | Small | Semantic names map to Ionicons; 3 standard sizes; colors from theme | `components/native/Icon.tsx` (new) |
| DS-013 | Add custom font (Plus Jakarta Sans) for headings | Medium | Medium | Font loads without flash; heading variant uses custom font; body uses system font | `App.tsx`, `constants/theme.ts`, `components/native/Text.tsx` (new) |
| DS-014 | Create TypingIndicator component for chat | Medium | Small | Three-dot bounce animation; positioned on left side; fade in/out | `components/chat/TypingIndicator.tsx` (new) |
| DS-015 | Create SegmentedControl component | Medium | Small | 2-5 segments; animated sliding indicator; haptic on change | `components/native/SegmentedControl.tsx` (new) |
| DS-016 | Create native Text component with variant system | Medium | Small | Variants: heading, subheading, body, caption, label, overline; applies correct font and size from tokens | `components/native/Text.tsx` (new) |
| DS-017 | Add touch target size fixes (hitSlop) to all small interactive elements | Medium | Small | All interactive elements have 44x44pt minimum touch target | `components/navigation/GlobalHeader.tsx`, `components/navigation/AnimatedTabBar.tsx` |
| DS-018 | Add screen reader labels to ChatBubble and EmptyState | Medium | Small | Full VoiceOver/TalkBack walkthrough passes without unlabeled interactive elements | `components/ChatBubble.tsx`, `components/ui/EmptyState.tsx` |
| DS-019 | Add `useReducedMotion()` hook and respect throughout animation system | Medium | Small | Animations disabled/simplified when system setting is on | `hooks/useReducedMotion.ts` (new), all animated components |
| DS-020 | Enforce spacing tokens: replace all hardcoded spacing values with token references | Medium | Large | All padding/margin/gap values reference `spacing` tokens from `theme.ts` | All screen and component files |
| DS-021 | Create `SafeScreen` wrapper for consistent safe area handling | Medium | Small | Single component handles safe area + background color + status bar style | `components/native/SafeScreen.tsx` (new) |
| DS-022 | Create SwipeableCard component for match/post browsing | Low | Large | Swipe gestures, spring physics, stamp overlay, card stack peek | `components/native/SwipeableCard.tsx` (new), `components/native/CardStack.tsx` (new) |
| DS-023 | Create OnboardingCarousel component | Low | Medium | Full-screen pages, pagination dots, parallax, skip/CTA buttons | `components/native/OnboardingCarousel.tsx` (new), `screens/OnboardingScreen.tsx` (new) |
| DS-024 | Create MapMarkerCluster component | Low | Medium | Cluster count badges, zoom-based expansion, brand-colored markers | `components/map/MarkerCluster.tsx` (new) |
| DS-025 | Create BrandedRefreshControl | Low | Small | Logo animation pull-to-refresh, gradient spinner, haptic at threshold | `components/native/BrandedRefreshControl.tsx` (new) |
| DS-026 | Set Android navigation bar color and configure edge-to-edge | Low | Small | Android nav bar matches dark theme; no white bar at bottom | `App.tsx`, `package.json` (expo-navigation-bar) |
| DS-027 | Add custom screen transitions with shared element for avatars | Low | Large | Avatar shared element between list and detail; modal rise for chat | Navigation config, `react-navigation-shared-element` |
| DS-028 | Create haptic-visual coordination hook (`useHapticPress`) | Low | Small | Combines haptic + reanimated scale in single hook | `hooks/useHapticPress.ts` (new) |

### Priority Sequencing

**Phase 1 (Foundation) -- Do First:**
DS-001, DS-002, DS-003, DS-004 -- Fix the color system, create the theme context, fix glaring visual bugs.

**Phase 2 (Core Components) -- Week 1-2:**
DS-005, DS-006, DS-007, DS-008, DS-009, DS-011, DS-012, DS-016 -- Build the native component library foundation.

**Phase 3 (Animation & Polish) -- Week 2-3:**
DS-010, DS-013, DS-014, DS-015, DS-028 -- Upgrade animation system, add custom font, build remaining components.

**Phase 4 (Accessibility & Platform) -- Week 3-4:**
DS-017, DS-018, DS-019, DS-020, DS-021, DS-026 -- Fix a11y issues, enforce token usage, platform polish.

**Phase 5 (Premium Features) -- Week 4+:**
DS-022, DS-023, DS-024, DS-025, DS-027 -- Swipeable cards, onboarding, map clusters, branded refresh, transitions.
