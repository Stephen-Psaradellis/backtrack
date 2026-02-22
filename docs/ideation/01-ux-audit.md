# UX Audit Report -- Backtrack

**Audit Date:** 2026-02-08
**Auditor:** UI/UX Research Agent
**App:** Backtrack -- Location-based anonymous matchmaking (React Native / Expo / Supabase)
**Files Reviewed:** 20+ core screens, components, and configuration files

---

## Executive Summary

Backtrack is a location-based "missed connections" app with a dark-themed, glassmorphism-forward design. After auditing all major screens, components, and the design system, the codebase reveals a **well-structured but inconsistent** UI layer. The app has strong foundational concepts (haptic feedback throughout, solid component composition, good accessibility attributes on interactive elements) but suffers from **three systemic problems**:

1. **Dual design system fragmentation** -- There are two completely separate UI component libraries: a web/Tailwind-based set (`components/ui/Button.tsx`, `components/ui/Card.tsx`, `components/ui/Input.tsx`) using HTML elements and CSS class strings, and a React Native set (`components/Button.tsx`, native `StyleSheet` objects). These two systems share no code, have different APIs (`children` vs `title`, `onClick` vs `onPress`, `size: 'sm'|'md'|'lg'` vs `size: 'small'|'medium'|'large'`), and create cognitive overhead for developers.

2. **Hardcoded color values scattered across every screen** -- Despite having a well-defined theme system (`constants/theme.ts`, `constants/glassStyles.ts`), most screen files define their own local `COLORS` objects with hardcoded hex values (e.g., `PostCard.tsx` defines a white-background light theme, `ChatBubble.tsx` uses `#E5E5EA` and `#000000`, `EmptyState.tsx` uses `#F2F2F7`). This creates a visual inconsistency where some components render in a light theme while the app shell is dark-themed.

3. **Information architecture overload on ProfileScreen** -- The profile screen is a monolithic 960+ line component that crams 11 distinct sections into a single scroll, from avatar editing to streak cards to notification settings to account deletion. This creates a wall of content with no clear hierarchy or grouping.

---

## Current State Assessment

### Design System Consistency

**Theme Files:**
- `C:\Users\snpsa\love-ledger\constants\theme.ts` -- Comprehensive design tokens including colors (primary coral `#FF6B47`, accent violet `#8B5CF6`), spacing scale (4px base), typography, border radii, shadows (both web and native), animation timing, gradients, and component-specific tokens for buttons, inputs, and cards.
- `C:\Users\snpsa\love-ledger\constants\glassStyles.ts` -- Dark theme overlay system with glassmorphism styles. Defines `darkTheme` object with background `#0F0F13`, card surfaces, text opacity levels, and pre-built `StyleSheet` objects for glass cards, dark buttons, dark typography, and layout helpers.

**The Good:**
- Color palette is well-defined with 10-shade scales for primary and accent colors.
- Semantic colors (success, warning, error, info) are consistently named.
- Native shadow definitions avoid platform-specific issues.
- The `darkTheme` object provides a single source of truth for the dark UI.

**The Bad:**
- The web UI components (`components/ui/Button.tsx`, `Card.tsx`, `Input.tsx`, `Badge.tsx`) are built with HTML elements and Tailwind CSS classes. They cannot render in React Native. They use `'use client'` directives and `forwardRef<HTMLButtonElement>`. These appear to be dead code or intended for a web companion that does not exist in the current mobile-only codebase.
- The onboarding `WelcomeScreen.tsx` also uses `<div>`, `<header>`, `<footer>`, `<ul>`, and Tailwind classes -- it cannot render in React Native.
- The actual mobile Button component (`components/Button.tsx`) uses a completely different API: `title` prop instead of `children`, `size: 'small'|'medium'|'large'` instead of `'sm'|'md'|'lg'`.
- At least 6 screen files define their own local `COLORS` constants that partially overlap with `darkTheme` but also introduce light-theme values that clash with the app-wide dark background.

### Navigation and Information Architecture

**Tab Structure (from `AnimatedTabBar.tsx`):**
5 tabs: Feed (home icon) | MySpots (notifications icon) | Map | Chats | Profile

**Issues Identified:**
- The "MySpotsTab" uses a **notifications bell icon** (`notifications-outline`), which is misleading. Users will expect notification center behavior, not a spots/favorites list. The icon should be `location-outline` or `heart-outline`.
- The tab bar is icon-only with no text labels. While this is a modern pattern, it increases cognitive load for first-time users who must guess what each icon means. The tab bar's `accessibilityLabel` falls back to route names like "FeedTab", "MySpotsTab" which are developer-facing strings, not user-facing labels.
- `GlobalHeader` occupies vertical space on every tab screen with a top row `[+ Post] | [Logo] | [Avatar]`. This is redundant with the Profile tab (avatar button navigates to ProfileTab, which is already a tab). The `+` button duplicates the CreatePost entry point that could live in the tab bar or as a FAB.
- `FloatingActionButtons` are overlaid on every tab screen (Home, Feed, Profile, Chats) with Check In and Live View buttons positioned absolutely above the tab bar. These overlap scrollable content and can obscure post cards or chat list items near the bottom.
- There is no visible back navigation pattern for stack screens (Chat, PostDetail, CreatePost, AvatarCreator, Legal). The `ChatScreen` relies on the system back gesture with no explicit back button in its header.

### Screen-by-Screen Analysis

---

#### AuthScreen (`C:\Users\snpsa\love-ledger\screens\AuthScreen.tsx`)

**What Works:**
- Clean login/signup toggle with form validation.
- Error messages are specific and user-friendly (maps Supabase errors to plain English).
- Haptic feedback on success and error states.
- Email verification flow with clear instructions after signup.
- Terms acceptance modal before account creation.
- `KeyboardAvoidingView` and `keyboardShouldPersistTaps="handled"` for good keyboard interaction.

**What Does Not Work:**
- Input fields use a fixed `height: 48` which clips multiline text and looks rigid. The `borderRadius: 8` is inconsistent with the app-wide `borderRadius: 12` default from `theme.ts`.
- No password visibility toggle -- users cannot see what they are typing.
- No social login options (Google, Apple) -- high friction for onboarding.
- The "Forgot Password?" link is a plain `TouchableOpacity` with no visual affordance (no underline, no button styling). Its touch target is only the text width, which can be difficult to tap.
- No app logo or branding on the auth screen. The header says "Welcome Back" / "Create Account" but there is no visual identity.
- The age verification (18+) mentioned in the JSDoc is not implemented in the rendered UI.

**Friction Points:**
- Switching between login and signup clears all form fields, including email. If a user starts typing their email, switches to signup, they lose their input.

---

#### HomeScreen (`C:\Users\snpsa\love-ledger\screens\HomeScreen.tsx`)

**What Works:**
- Full-screen map is immersive and appropriately dominant for a location-based app.
- Favorite location markers provide useful reference points.
- Haptic feedback on map ready and marker interactions.
- Good loading state with descriptive "Getting your location..." message.

**What Does Not Work:**
- The screen is essentially just a map with no context, guidance, or onboarding. A new user sees a map with no explanation of what to do.
- No search bar or location search capability on this screen. Users must manually navigate the map.
- POI click navigates to "Ledger" with a `locationId` and `locationName`, but there is no visual indication on the map that POIs are tappable or what tapping them will do.
- The `GlobalHeader` and `FloatingActionButtons` overlay the map, reducing the usable map area. The FloatingActionButtons (Check In + Live View) sit in the bottom-right and can overlap map controls (zoom buttons, Google logo).
- No empty state if the user denies location permission. The screen just shows the loading spinner indefinitely if `locationLoading` never resolves to false.

**Friction Points:**
- First-time users have zero guidance on the home screen. There is no tooltip, coach mark, or instructional overlay.

---

#### FeedScreen (`C:\Users\snpsa\love-ledger\screens\FeedScreen.tsx`)

**What Works:**
- Pull-to-refresh with themed refresh control.
- Good empty state with icon, title, subtitle, and description explaining the 50-meter radius.
- Error state with warning icon and error message.
- Loading state with spinner and descriptive text.

**What Does Not Work:**
- The 50-meter radius is extremely restrictive. Users must be physically present at a location to see posts. There is no way to browse posts outside this radius, which means the feed is empty for most users most of the time.
- No filtering, sorting, or search capabilities on the feed.
- The `PostCard` component (detailed below) uses a **light theme** (white background, black text) while the rest of the app is dark-themed. This creates a jarring visual contrast where white cards appear on a `#0F0F13` background.
- `FlatList` padding bottom is `34` on iOS and `16` on Android -- these magic numbers do not account for the tab bar height or safe area properly. The FloatingActionButtons can overlap the bottom of the list.

**Friction Points:**
- The feed feels like a dead-end. "No posts nearby" -> "Be the first!" but the CTA to create a post is only available via the `+` button in the GlobalHeader, which is not prominently positioned or labeled.

---

#### PostCard (`C:\Users\snpsa\love-ledger\components\PostCard.tsx`)

**What Works:**
- Well-structured component with memoization for FlatList performance.
- Comprehensive match scoring with color-coded indicators.
- Built-in report functionality on long press.
- Good accessibility labels with dynamic content.
- Sighting time display with emoji icon.

**What Does Not Work:**
- **Light theme in a dark app**: `COLORS.background: '#FFFFFF'`, `COLORS.textPrimary: '#000000'`, `COLORS.border: '#E5E5EA'`. This component renders white cards with black text, completely breaking the dark theme.
- `sightingTimeContainer` uses `backgroundColor: '#F8F8F8'` -- another light color.
- Uses emoji icons (`📍`, `🕐`) for location and time, while the rest of the app uses `Ionicons`. Inconsistent iconography.
- The `matchBadge` has a `borderColor: COLORS.background` (white) to create a "cutout" effect, but this only works on a white background, not on the dark app background.
- No visual separation between cards except a 1px bottom border. Cards blend together.

**Friction Points:**
- Long-press for reporting is an undiscoverable interaction. No visual hint that long-press is available.

---

#### ChatListScreen (`C:\Users\snpsa\love-ledger\screens\ChatListScreen.tsx`)

**What Works:**
- Real-time message updates via Supabase Realtime subscription.
- Unread count badge with "99+" overflow.
- Message preview with "You: " prefix for own messages.
- Conversation filtering to exclude blocked users.
- Empty state (`EmptyChats`) and error state with retry.

**What Does Not Work:**
- Conversation titles are generic: "Chat with Consumer" or "Chat with Producer". These labels are developer jargon and meaningless to users. Users do not think of themselves as "producers" or "consumers".
- N+1 query problem: For each conversation, the component makes 4 separate Supabase queries (last message, unread count, profile, post + location). This creates performance issues with many conversations.
- The `EmptyChats` component uses a light background (`#F2F2F7`) which again clashes with the dark theme.
- No conversation search or filtering.
- No way to delete or archive conversations.
- No typing indicator or online status in the list view.

**Friction Points:**
- The "Chat with Producer/Consumer" labels give no context about who you are chatting with or what the conversation is about. The location name is shown as a subtitle, which helps, but the primary label should be more descriptive.

---

#### ChatScreen (`C:\Users\snpsa\love-ledger\screens\ChatScreen.tsx`)

**What Works:**
- Comprehensive feature set: optimistic message sending, retry on failure, real-time subscription, read receipts, offline banner, photo sharing, report/block functionality.
- Tutorial tooltip for first-time messaging users.
- Network reconnection logic that refetches missed messages.
- Haptic debouncing for incoming messages.
- Keyboard-aware layout with proper `KeyboardAvoidingView`.

**What Does Not Work:**
- The `ChatBubble` component uses a **light theme** for received messages: `otherBubble: '#E5E5EA'`, `otherText: '#000000'`. Own messages use the primary coral (`#FF6B47`). This creates a visual clash where light gray bubbles appear on the dark background.
- The `DateSeparator` line color uses `COLORS.otherBubble` (`#E5E5EA`), creating light lines on a dark background.
- The send button says "Send" in text -- an icon (send/arrow) would be more conventional and save horizontal space.
- The photo sharing button uses a raw emoji (`📷`) instead of an `Ionicons` camera icon.
- The message input area has `gap: 8` between input, send button, and photo button, creating a cramped layout with three elements competing for space.
- No header in the ChatScreen itself -- there is no indication of who you are chatting with, no back button, no actions menu visible. The block and report actions are triggered via the message long-press or a header that is not visible in this component (likely handled by navigation options).
- The `FlatList` is not inverted. For chat, an inverted list is the standard pattern (newest messages at bottom, older messages load when scrolling up). The current implementation reverses the `messageListItems` array, which is functionally similar but less performant and can cause scroll position issues.

**Friction Points:**
- The Share Photo modal uses nested `TouchableOpacity` for backdrop dismissal, which can cause accidental dismissals.
- No message delivery timestamps visible by default (`showTimestamp` defaults to `false`).
- Failed messages show no visual indicator in the message list -- the failed state tracking exists in `optimisticMessages` but no UI consumes it.

---

#### ProfileScreen (`C:\Users\snpsa\love-ledger\screens\ProfileScreen.tsx`)

**What Works:**
- Attractive gradient hero header with avatar, name, email, and "member since" badge.
- Verification prompt for unverified users with clear CTA.
- Well-organized section headers with icons.
- Glassmorphism card styling throughout.
- Comprehensive account management: edit name, avatar, photos, sign out, delete account.
- Account deletion has double confirmation for safety.
- Pull-to-refresh.
- Scheduled deletion warning with cancel option.
- Tutorial replay section.

**What Does Not Work:**
- **Massive component**: 960+ lines, 11 distinct sections in a single scroll. This is overwhelming and buries important settings. The screen should be split into a profile overview + settings subpage.
- Sections visible in the scroll (in order): Hero Header, Verification Prompt, Profile Information, My Avatar, Verification Photos, My Location Streaks, Regulars Mode, Fellow Regulars, Notifications, Location Tracking, Replay Tutorial, Legal, Account, App Info Footer. That is **13 visual sections** in one scroll.
- The hero header has `paddingTop: 60` hardcoded, which does not account for the safe area inset. On devices with dynamic islands or notches, this will overlap the status bar.
- No `GlobalHeader` component used (unlike other screens), creating an inconsistent top-of-screen experience.
- The verification flow is confusing: "Get Verified" shows an alert saying verification happens during post creation. Users expecting an in-place verification flow will be confused.
- The "Replay Tutorial" section takes significant visual space for a rarely used feature.
- The "Delete Account" dialog mentions "Type 'DELETE' to confirm" but the actual implementation does not require typing -- it just shows another alert with "Yes, Delete Everything" button.

**Friction Points:**
- Scrolling through 13 sections to find "Sign Out" at the very bottom is poor UX. Sign out and account settings should be more accessible.
- The `FloatingActionButtons` (Check In + Live View) appear on the Profile screen, which is contextually irrelevant. Users managing their profile do not need check-in or live view buttons.

---

#### CreatePostScreen (`C:\Users\snpsa\love-ledger\screens\CreatePostScreen.tsx`)

**What Works:**
- Streamlined 3-step wizard: Scene (Where & When), Moment (Who & What), Seal (Verify & Send).
- Progress bar with animation.
- Step header with descriptive content.
- Discard confirmation on back from first step.
- Haptic feedback on every interaction (next, back, avatar change, location select, photo select, submit).
- Loading state during submission.

**What Does Not Work:**
- The JSDoc header still references the old 10-step flow (Location, Selfie, Scene, Time, Photo, Avatar, Moment, Note, Review, Seal) while the actual implementation uses 3 steps. This is misleading.
- Tooltip-based tutorial has been disabled on Android due to a "blank screen issue" (comment in code). Android users get no onboarding guidance.
- The tooltip content mentions "Start by selecting a photo, then describe who you saw, write a note, and choose a location" -- but the actual step order is Scene (location) -> Moment (avatar + note) -> Seal (photo + review). The tooltip instructions are wrong.
- The `tooltipStyles` use light-theme colors (`title: '#1F2937'`, `description: '#4B5563'`) which would look odd if the tooltip renders against the dark background.

**Friction Points:**
- There are 10 step component files in `screens/CreatePost/steps/` (LocationStep, SelfieStep, SceneStep, TimeStep, PhotoStep, AvatarStep, MomentStep, NoteStep, ReviewStep, SealStep) but only 3 are used (SceneStep, MomentStep, SealStep). The other 7 are dead code from the old flow.

---

#### WelcomeScreen / Onboarding (`C:\Users\snpsa\love-ledger\components\onboarding\WelcomeScreen.tsx`)

**What Works:**
- Warm, introvert-friendly messaging: "A gentle way to find the people you noticed but never got to meet."
- Feature highlights with icon, title, and description.
- Clear CTA hierarchy: primary "Get Started" button and secondary "Skip for now" link.
- Accessible with proper ARIA roles and labels.

**What Does Not Work:**
- **This component is built with HTML elements** (`<div>`, `<header>`, `<footer>`, `<ul>`, `<li>`, `<button>`, `<svg>`) and Tailwind CSS classes. It **cannot render in React Native**. It uses `className`, `onClick`, and browser-specific APIs. This is either dead code or requires a web rendering layer that is not configured.
- The `Button` imported is from `../ui/Button` which is also a web component (uses `<button>` HTML element with `type="button"`).
- If this component is meant to be shown during onboarding, it would need a complete React Native rewrite.

**Friction Points:**
- The onboarding flow cannot work as-is in a React Native mobile app.

---

#### AnimatedTabBar (`C:\Users\snpsa\love-ledger\components\navigation\AnimatedTabBar.tsx`)

**What Works:**
- Smooth spring animation for the active tab indicator.
- Scale animation on tab press for tactile feedback.
- Badge support for notification counts.
- Safe area handling for bottom padding.

**What Does Not Work:**
- `SCREEN_WIDTH` is captured once at module level via `Dimensions.get('window')`. This does not update on device rotation or split-screen mode.
- The indicator width calculation `tabWidth - 24` uses a hardcoded 24px inset. On smaller screens this could look disproportionate.
- Badge uses `darkTheme.accent` as background color, which is `#8B5CF6` (violet). The tab bar indicator also uses `darkTheme.accent`. This means the badge and active indicator are the same color, reducing visual distinction.
- The `new Animated.Value(12)` in the indicator `translateX` creates a new `Animated.Value` on every render. This should be cached as a ref.

---

## Identified Issues

| ID | Area | Issue | Severity | Current State | Expected State |
|----|------|-------|----------|---------------|----------------|
| UX-001 | Design System | Two separate component libraries (web HTML + RN native) with different APIs | Critical | `components/ui/Button.tsx` uses `<button>`, `components/Button.tsx` uses `TouchableOpacity`. Different prop names (`children` vs `title`, `sm` vs `small`). | Single unified component library for React Native. Remove or isolate web components. |
| UX-002 | Theming | PostCard, ChatBubble, EmptyState use light-theme colors in a dark-themed app | High | PostCard: white background, black text. ChatBubble received: `#E5E5EA` on `#0F0F13`. EmptyState: `#F2F2F7` background. | All components consume `darkTheme` values. Received message bubbles use `darkTheme.surface` or similar dark tint. |
| UX-003 | Theming | Hardcoded color values in 6+ screen files instead of theme tokens | High | Each screen defines local `COLORS` const with hex values, e.g., ChatListScreen, ChatScreen, PostCard, ChatBubble. | All screens import from `constants/glassStyles.ts` or `constants/theme.ts`. No inline hex codes. |
| UX-004 | Navigation | MySpotsTab uses notification bell icon instead of location/spots icon | Medium | `MySpotsTab: { active: 'notifications', inactive: 'notifications-outline' }` | Use `location-outline` / `location` or `bookmark-outline` / `bookmark`. |
| UX-005 | Navigation | Tab bar has no text labels, only icons | Medium | Icon-only tabs with developer-facing accessibility labels like "FeedTab", "MySpotsTab". | Add short text labels below icons ("Feed", "Spots", "Map", "Chats", "Me") and user-facing accessibility labels. |
| UX-006 | Navigation | FloatingActionButtons overlap content on every tab screen including Profile | Medium | Check In and Live View buttons appear on Profile, Feed, Home screens regardless of context. | Only show FABs on contextually relevant screens (Home/Map, Feed). Hide on Profile and possibly Chats. |
| UX-007 | Profile | ProfileScreen is 960+ lines with 13 sections in a single scroll | High | All settings, streaks, regulars, photos, legal, account actions in one screen. | Split into Profile overview (hero + basic info) and a "Settings" sub-screen for notifications, location tracking, legal, account management. |
| UX-008 | Profile | Hero header uses hardcoded `paddingTop: 60` instead of safe area inset | Medium | On notch/dynamic island devices, content overlaps the status bar area. | Use `useSafeAreaInsets().top` for hero padding, or include `GlobalHeader` for consistency. |
| UX-009 | Chat | Conversation titles say "Chat with Producer/Consumer" | High | Developer jargon visible to end users. | Use descriptive labels like location name, post excerpt, or "Missed Connection at [Location]". |
| UX-010 | Chat | ChatBubble received messages use light gray (#E5E5EA) on dark background | High | Low contrast, visually clashing. The light gray reads as a UI element from a different app. | Use `darkTheme.surface` or `darkTheme.surfaceElevated` for received bubble background with `darkTheme.textPrimary` text. |
| UX-011 | Chat | No visible header or back button in ChatScreen | Medium | Users rely on system back gesture. No indication of conversation context (who, where). | Add a chat header with other user's avatar, location context, back button, and menu (block/report/share). |
| UX-012 | Chat | Send button is text ("Send") instead of icon | Low | Takes horizontal space, not standard for chat UIs. | Use Ionicons `send` icon in a circular button. |
| UX-013 | Chat | Photo sharing button uses emoji (camera emoji) instead of Ionicons | Low | `<Text style={styles.photoButtonText}>camera emoji</Text>` | Use `<Ionicons name="image-outline" />` or `<Ionicons name="camera-outline" />`. |
| UX-014 | Chat | FlatList is not inverted for chat | Medium | Messages array is manually reversed. Can cause scroll position bugs when new messages arrive. | Use `inverted={true}` on FlatList for standard chat behavior. |
| UX-015 | Chat | Failed message state exists but has no visual representation | Medium | `optimisticMessages` map tracks 'sending'/'sent'/'failed' but ChatBubble does not receive this state. | Show red exclamation mark and "Tap to retry" on failed messages. |
| UX-016 | Feed | 50-meter radius is extremely restrictive; feed is empty for most users | High | Users see "No posts nearby" unless standing at a location with posts. | Increase radius or add a distance filter. Show "X posts within 500m" with expanding radius option. |
| UX-017 | Feed | No feed filtering, sorting, or search | Medium | FlatList shows all nearby posts in fetch order. | Add filters: time range, match score, location type. Add sort: newest, closest, highest match. |
| UX-018 | Onboarding | WelcomeScreen uses HTML/Tailwind -- cannot render in React Native | Critical | Component uses `<div>`, `<button>`, `className`, `onClick`. Will crash or not render. | Rewrite with React Native components (`View`, `TouchableOpacity`, `StyleSheet`). |
| UX-019 | Onboarding | No first-time user guidance on HomeScreen (map) | High | New users see a blank map with no explanation. | Add a brief coach mark or overlay: "Tap locations on the map to see posts from people who visited." |
| UX-020 | Auth | No password visibility toggle | Medium | Users cannot verify what they typed. | Add eye icon toggle on password fields. |
| UX-021 | Auth | No social login (Google, Apple) | Medium | Only email/password auth. High friction. | Add Apple Sign In (required for iOS App Store) and Google Sign In. |
| UX-022 | Auth | Input borderRadius (8) inconsistent with theme default (12) | Low | Auth inputs use `borderRadius: 8` while theme.ts `borderRadius.DEFAULT` is 12. | Use `borderRadius.DEFAULT` from theme. |
| UX-023 | Auth | Age verification mentioned in docs but not implemented in UI | Medium | JSDoc says "Age verification (18+) for signup" but no UI element exists. | Add age confirmation checkbox or date-of-birth field for legal compliance. |
| UX-024 | CreatePost | Tooltip instructions describe wrong step order | Medium | Tooltip says "Start by selecting a photo" but first step is Scene (location). | Update tooltip to match 3-step flow: "First, set the scene (where and when), then describe who you saw." |
| UX-025 | CreatePost | 7 dead step component files from old flow | Low | `LocationStep.tsx`, `SelfieStep.tsx`, `TimeStep.tsx`, `PhotoStep.tsx`, `AvatarStep.tsx`, `NoteStep.tsx`, `ReviewStep.tsx` exist but are unused. | Remove dead step files to reduce confusion. |
| UX-026 | CreatePost | Tutorial tooltip disabled on Android due to blank screen bug | Medium | Android users get no post creation onboarding. | Fix tooltip rendering or use an alternative onboarding method (bottom sheet, inline banner). |
| UX-027 | Tab Bar | `Dimensions.get('window')` captured once at module level | Low | Does not update on rotation or split-screen. | Use `useWindowDimensions()` hook inside the component. |
| UX-028 | Tab Bar | Badge and active indicator use same accent color | Low | Both are `darkTheme.accent` (`#8B5CF6`). Badge on active tab is invisible. | Use `darkTheme.error` or `#FF3B30` for notification badges to distinguish from active state. |
| UX-029 | EmptyState | EmptyLedger uses light theme (`#FFF5F3`, `#1A1A1A`) | Medium | Splash empty state component renders a light-colored card. | Adapt to dark theme with `darkTheme.surface` background and `darkTheme.textPrimary` text. |
| UX-030 | ChatList | N+1 query: 4 Supabase queries per conversation | Medium | Performance degrades linearly with conversation count. | Batch queries or use a Supabase view/RPC that returns enriched conversation data in one call. |
| UX-031 | Profile | Account deletion dialog says "Type DELETE" but has no text input | Low | Alert says "Type 'DELETE' to confirm" but shows two buttons instead of a text input. | Either add a text input confirmation or remove the misleading instruction. |
| UX-032 | Global | No skeleton loading states | Medium | All screens use a centered spinner. Content layout shift when data loads. | Use skeleton placeholders that match the final layout shape for smoother perceived loading. |
| UX-033 | Global | Inconsistent icon usage: mix of Ionicons, lucide-react-native, and emoji | Low | `EmptyState.tsx` uses lucide-react-native, `PostCard.tsx` uses emoji, most screens use Ionicons. | Standardize on one icon library (Ionicons, since it is already the primary). |
| UX-034 | Global | No dark mode toggle -- app is dark-only | Low | All screens hardcode dark theme. No light mode option. | Consider adding a system/light/dark theme preference in settings. |

---

## Recommendations Priority Matrix

### High Impact, Low Effort

| Recommendation | Issue IDs | Effort | Impact |
|----------------|-----------|--------|--------|
| **Fix PostCard and ChatBubble colors to use darkTheme** | UX-002, UX-010 | Low (theme value replacements) | High -- eliminates the most visible inconsistency |
| **Rename MySpotsTab icon** to location or bookmark | UX-004 | Low (change 2 strings) | Medium -- reduces user confusion |
| **Fix conversation title labels** from "Producer/Consumer" to meaningful names | UX-009 | Low (string template change) | High -- removes developer jargon from user-facing UI |
| **Fix CreatePost tooltip instructions** to match 3-step flow | UX-024 | Low (text update) | Medium -- prevents first-time user confusion |
| **Fix delete account dialog** to remove "Type DELETE" instruction | UX-031 | Low (string edit) | Low -- removes misleading instruction |

### High Impact, Medium Effort

| Recommendation | Issue IDs | Effort | Impact |
|----------------|-----------|--------|--------|
| **Consolidate color definitions**: Replace all local COLORS constants with darkTheme imports | UX-003 | Medium (touch 6+ files) | High -- ensures visual consistency app-wide |
| **Split ProfileScreen** into Profile + Settings sub-screen | UX-007 | Medium (extract sections, add navigation) | High -- drastically improves profile usability |
| **Add chat header** with back button, avatar, location context, and action menu | UX-011 | Medium (new component) | High -- standard chat UX pattern |
| **Add first-time user guidance on HomeScreen** | UX-019 | Medium (coach mark component) | High -- critical for new user retention |
| **Expand feed radius** or add distance filter options | UX-016 | Medium (parameter change + UI) | High -- addresses empty feed problem |
| **Add visual indicators for failed messages** in chat | UX-015 | Medium (connect existing state to UI) | Medium -- improves trust in message delivery |

### High Impact, High Effort

| Recommendation | Issue IDs | Effort | Impact |
|----------------|-----------|--------|--------|
| **Remove or rewrite web components** (ui/Button, ui/Card, ui/Input, ui/Badge, WelcomeScreen) for React Native | UX-001, UX-018 | High (full rewrite or deletion) | Critical -- dead code causes confusion; WelcomeScreen cannot render |
| **Add social login** (Apple Sign In, Google Sign In) | UX-021 | High (auth provider integration) | High -- significantly reduces onboarding friction |
| **Implement skeleton loading states** across all screens | UX-032 | High (new components for each screen) | Medium -- improves perceived performance |

### Medium Impact, Low Effort

| Recommendation | Issue IDs | Effort | Impact |
|----------------|-----------|--------|--------|
| **Add text labels to tab bar** | UX-005 | Low (add label rendering) | Medium -- improves discoverability |
| **Replace emoji icons** (camera, pin, clock) with Ionicons in PostCard and ChatScreen | UX-013, UX-033 | Low (icon swaps) | Low -- visual consistency |
| **Replace "Send" text with send icon** in ChatScreen | UX-012 | Low (component swap) | Low -- space efficiency |
| **Use `useWindowDimensions`** in AnimatedTabBar | UX-027 | Low (hook swap) | Low -- rotation support |
| **Use theme borderRadius** in AuthScreen inputs | UX-022 | Low (value replacement) | Low -- consistency |

### Low Impact, Low Effort

| Recommendation | Issue IDs | Effort | Impact |
|----------------|-----------|--------|--------|
| **Remove 7 dead CreatePost step files** | UX-025 | Low (file deletion) | Low -- codebase cleanliness |
| **Change badge color** from accent to error/red | UX-028 | Low (one color change) | Low -- badge visibility on active tab |
| **Conditionally hide FABs** on Profile and Chats screens | UX-006 | Low (conditional render) | Medium -- reduces visual clutter |

---

## Summary of Critical Actions

The three items requiring immediate attention are:

1. **UX-001 / UX-018 -- Web component dead code**: The `components/ui/` directory and `WelcomeScreen.tsx` contain HTML/Tailwind components that cannot render in React Native. These should be either removed or rewritten. If the WelcomeScreen is part of the active onboarding flow, it is currently broken.

2. **UX-002 / UX-003 / UX-010 -- Theme inconsistency**: PostCard, ChatBubble, EmptyState, and EmptyLedger render light-themed UI inside a dark-themed app. This is the most user-visible quality issue and can be fixed by replacing hardcoded colors with `darkTheme` values.

3. **UX-007 -- ProfileScreen overload**: At 13 sections and 960+ lines, the profile screen needs to be decomposed. The recommended split is: Profile overview (hero, avatar, basic info, verification) at the top level, and a "Settings" row that navigates to a dedicated settings screen (notifications, location tracking, legal, tutorials, account management).

---

*End of UX Audit Report*
