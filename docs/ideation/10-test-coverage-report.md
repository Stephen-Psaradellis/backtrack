# 10 - Test Coverage Status Report & Plan

**Date:** 2026-02-16
**Test Runner:** Vitest
**Last Run:** 117 passed / 54 failed (171 test files), 4,634 passing / 1,219 failing tests (5,853 total)

---

## 1. Current Coverage Summary

### Test Results Overview

| Metric | Value |
|--------|-------|
| Test files | 171 total (117 pass, 54 fail) |
| Individual tests | 5,853 total (4,634 pass, 1,219 fail) |
| Pass rate | 79.2% |
| Run time | 221.82s |

### Bulk Failures

The **1,219 failing tests** are almost entirely from one source:
- `packages/react-native-bitmoji/avatar/qa/__tests__/visual-regression.test.tsx` — broken `react-native-svg` mock (`No "default" export`). This single file accounts for ~1,100+ failures. Fixing the mock would bring the pass rate to ~97%+.

---

## 2. Coverage by Module

### Screens (16 files)

| Screen | Test File | Status |
|--------|-----------|--------|
| AuthScreen | `screens/__tests__/AuthScreen.test.tsx` | HAS TEST |
| AvatarCreatorScreen | `screens/__tests__/AvatarCreatorScreen.test.tsx` | HAS TEST |
| ChatListScreen | `screens/__tests__/ChatListScreen.test.tsx` | HAS TEST |
| ChatScreen | `screens/__tests__/ChatScreen.test.tsx` | HAS TEST |
| CreatePostScreen | `screens/__tests__/CreatePostScreen.test.tsx` | HAS TEST |
| FeedScreen | `__tests__/screens/FeedScreen.test.tsx` | HAS TEST |
| HomeScreen | `screens/__tests__/HomeScreen.test.tsx` | HAS TEST |
| LedgerScreen | `screens/__tests__/LedgerScreen.test.tsx` | HAS TEST |
| MapSearchScreen | `screens/__tests__/MapSearchScreen.test.tsx` + markers test | HAS TEST |
| MySpotsScreen | `__tests__/screens/MySpotsScreen.test.tsx` | HAS TEST |
| PostDetailScreen | `screens/__tests__/PostDetailScreen.test.tsx` | HAS TEST |
| ProfileScreen | `screens/__tests__/ProfileScreen.test.tsx` | HAS TEST |
| SettingsScreen | `screens/__tests__/SettingsScreen.test.tsx` | HAS TEST |
| **FavoritesScreen** | — | **NO TEST** |
| **FavoritesTabScreen** | — | **NO TEST** |
| **LegalScreen** | — | **NO TEST** |

### Hooks (40 files)

| Hook | Tested? |
|------|---------|
| useAchievements | YES |
| useAnimationConfig | **NO** |
| useCanMatch | YES |
| useCanPost | YES |
| useChatListData | YES |
| useCheckin | YES |
| useCheckinSettings | YES |
| useEventAttendance | YES |
| useEventPosts | YES |
| useEvents | YES (`__tests__/hooks/`) |
| useFavoriteLocations | YES |
| useGhostMode | YES |
| useHangouts | YES |
| useHapticPress | **NO** |
| useInViewport | YES |
| useLiveCheckins | YES |
| useLocation | YES |
| useLocationHistory | YES (`__tests__/hooks/`) |
| useLocationSearch | YES |
| useLocationStreaks | YES |
| useNearbyLocations | YES |
| useNearbyPosts | YES (`__tests__/hooks/`) |
| useNetworkStatus | YES |
| useNotificationCounts | YES (`__tests__/hooks/`) |
| useNotificationSettings | YES |
| useOnboardingState | YES |
| usePhotoSharing | YES |
| useProfilePhotos | YES |
| useQueryConfig | **NO** |
| useRadar | YES |
| useReducedMotion | **NO** |
| useRegulars | YES |
| useSocialAuth | YES |
| useSparkNotificationSettings | YES |
| useTieredPosts | YES |
| useTrendingVenues | YES |
| useTrustLevel | YES |
| useTutorialState | YES |
| useUserLocation | YES |
| hooks/chat/useChatMessages | YES (`components/chat/hooks/__tests__/`) |

### Libraries (17 files)

| Library | Tested? |
|---------|---------|
| accountDeletion | YES (unit + integration) |
| analytics | YES |
| conversations | YES (unit + RLS) |
| dataExport | YES |
| favorites | YES (unit + edge cases + RLS) |
| haptics | YES |
| moderation | YES |
| network | YES |
| offlineMessageQueue | YES |
| photoSharing | YES |
| profilePhotos | YES |
| rateLimit | YES |
| sentry | YES |
| storage | YES |
| supabase | YES (unit + DI) |
| validation | YES (2 locations) |
| types | N/A (type-only) |

### Lib Utils (8 files)

| Utility | Tested? |
|---------|---------|
| contentScreening | YES |
| geo | YES |
| geoPrivacy | YES |
| gpsConfig | YES |
| mapClustering | YES |
| safetyDetection | YES |
| sanitize | YES |
| tiers | YES |

### Lib Network (1 file)

| File | Tested? |
|------|---------|
| singleton | **NO** |

### Components — Top-Level (42 files)

| Component | Tested? |
|-----------|---------|
| AchievementBadge | **NO** |
| Avatar | YES (`components/ui/__tests__/Avatar.test.tsx`) |
| AvatarComparison | **NO** |
| Badge | YES (`components/ui/__tests__/Badge.test.tsx`) |
| Button | YES (`components/ui/__tests__/Button.test.tsx`) |
| CachedImage | **NO** |
| ChatBubble | **NO** |
| CheckinButton | **NO** |
| ClusterMarker | **NO** |
| CreateHangoutModal | **NO** |
| DevModeBanner | **NO** |
| EmptyLocationState | **NO** |
| EmptyState | YES (`components/ui/__tests__/EmptyState.test.tsx`) |
| ErrorBoundary | **NO** |
| HangoutCard | **NO** |
| HangoutsList | **NO** |
| LoadingSpinner | YES |
| LocationCard | **NO** |
| LocationPicker | **NO** |
| MapView | YES (custom markers test) |
| MatchCelebration | **NO** |
| OfflineIndicator | **NO** |
| OnboardingGuard | **NO** |
| PostCard | **NO** |
| PostFilters | **NO** |
| PostReactions | **NO** |
| ProfilePhotoGallery | **NO** |
| RadarEncounters | **NO** |
| ReportModal | **NO** |
| SelfieCamera | **NO** |
| Skeleton | YES |
| SocialLoginButton | **NO** |
| SwipeableCardStack | **NO** |
| TermsModal | **NO** |
| TimeFilterChips | **NO** |
| TrendingVenues | **NO** |
| TrustProgress | **NO** |
| VenueStories | **NO** |
| VenueStory | **NO** |
| VerificationPrompt | **NO** |
| VerificationTierBadge | **NO** |
| VerifiedBadge | **NO** |

### Components — Subdirectories

| Component | Tested? |
|-----------|---------|
| chat/MessageList | YES |
| chat/MessageBubble | YES |
| chat/TypingIndicator | YES |
| chat/ChatInput | YES |
| chat/ChatHeader | YES |
| chat/ChatActionsMenu | YES |
| chat/BlockUserModal | YES |
| chat/ReportUserModal | YES |
| chat/SafetyPrompt | YES |
| chat/IcebreakerChips | **NO** |
| chat/hooks/useSendMessage | YES |
| chat/hooks/useBlockUser | YES |
| chat/hooks/useReportUser | YES |
| chat/hooks/useTypingIndicator | YES |
| chat/hooks/useChatMessages | YES |
| chat/hooks/rateLimiting (stress) | YES |
| chat/utils/formatters | YES |
| checkin/CheckInButton | **NO** |
| checkin/LiveCheckinView | **NO** |
| events/EventCard | YES |
| favorites/ | YES |
| map/LocationMarker | YES |
| modals/FavoritesModal | YES |
| modals/LiveViewModal | YES |
| modals/MatchingPermissionModal | **NO** |
| modals/PostingPermissionModal | **NO** |
| navigation/GlobalHeader | YES |
| navigation/AnimatedTabBar | **NO** |
| navigation/FloatingActionButtons | **NO** |
| native/ | YES |
| onboarding/ | YES |
| regulars/ | YES |
| settings/NotificationSettings | **NO** |
| settings/LocationTrackingSettings | **NO** |
| streaks/ | YES |
| ui/AnimatedList | YES |
| ui/Card | YES |
| ui/Input | YES |

### Services (5 files)

| Service | Tested? |
|---------|---------|
| backgroundLocation | YES |
| dwellDetection | YES |
| locationService | YES |
| notifications | YES (`__tests__/services/`) |
| realtimeManager | YES |

### Contexts (3 files)

| Context | Tested? |
|---------|---------|
| AuthContext | YES |
| ThemeContext | **NO** |
| ToastContext | **NO** |

### Navigation

| File | Tested? |
|------|---------|
| AppNavigator | YES |

### Supabase Edge Functions (5 files)

| Function | Tested? |
|----------|---------|
| moderate-image | YES |
| send-notification | YES |
| send-match-notification | **NO** |
| send-spark-notification | **NO** |
| execute-account-deletion | **NO** |

### Other Test Categories

| Category | Files | Status |
|----------|-------|--------|
| E2E tests | 5 files (consumer, producer, favorites, quick-post, MapSearch) | EXIST |
| Performance benchmarks | 4 files (data, memory, render, hook) | EXIST |
| Test utilities | factories, auth-mock, supabase-mock, render-with-providers | EXIST |

---

## 3. Untested Inventory Summary

| Category | Untested Count | Total | Coverage % |
|----------|---------------|-------|------------|
| Screens | 3 | 16 | 81% |
| Hooks | 4 | 40 | 90% |
| Libraries | 0 | 16 | 100% |
| Lib Utils | 0 | 8 | 100% |
| Lib Network | 1 | 1 | 0% |
| Components (top-level) | 30 | 42 | 29% |
| Components (subdirs) | 8 | 34 | 76% |
| Services | 0 | 5 | 100% |
| Contexts | 2 | 3 | 33% |
| Supabase Functions | 3 | 5 | 40% |
| **TOTAL** | **51** | **170** | **70%** |

---

## 4. Test Plan

### Phase 0: Fix Bulk Failure (1 task)

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 0.1 | Fix `react-native-svg` mock in `packages/react-native-bitmoji` visual-regression tests | CRITICAL | S |

This single fix eliminates ~1,100 test failures and brings pass rate from 79% to ~97%.

### Phase 1: High-Impact Screens (3 tasks)

| # | File | Why | Effort |
|---|------|-----|--------|
| 1.1 | FavoritesScreen | User-facing feature, favorites flow | M |
| 1.2 | FavoritesTabScreen | Tab container for favorites | S |
| 1.3 | LegalScreen | Compliance/legal content display | S |

### Phase 2: Critical Components (12 tasks)

High-traffic or safety-critical components first:

| # | Component | Why | Effort |
|---|-----------|-----|--------|
| 2.1 | ErrorBoundary | Crash recovery — must work correctly | M |
| 2.2 | PostCard | Core feed item, renders everywhere | M |
| 2.3 | LocationCard | Key UI for location display | S |
| 2.4 | PostReactions | User interaction feature | S |
| 2.5 | ReportModal | Safety/moderation critical | M |
| 2.6 | CreateHangoutModal | Group feature creation | M |
| 2.7 | HangoutCard + HangoutsList | Group hangout display | M |
| 2.8 | MatchCelebration | Match UX flow | S |
| 2.9 | SwipeableCardStack | Core interaction pattern | M |
| 2.10 | OnboardingGuard | Auth gate, blocks unauthorized access | S |
| 2.11 | TermsModal | Legal compliance | S |
| 2.12 | ChatBubble | Chat UI element | S |

### Phase 3: Feature Components (11 tasks)

| # | Component | Effort |
|---|-----------|--------|
| 3.1 | AchievementBadge | S |
| 3.2 | AvatarComparison | S |
| 3.3 | CachedImage | S |
| 3.4 | ClusterMarker | S |
| 3.5 | TrendingVenues | M |
| 3.6 | VenueStory + VenueStories | M |
| 3.7 | TrustProgress | S |
| 3.8 | RadarEncounters | M |
| 3.9 | TimeFilterChips | S |
| 3.10 | PostFilters | S |
| 3.11 | SocialLoginButton | S |

### Phase 4: Minor Components (7 tasks)

| # | Component | Effort |
|---|-----------|--------|
| 4.1 | CheckinButton (top-level) | S |
| 4.2 | DevModeBanner | S |
| 4.3 | EmptyLocationState | S |
| 4.4 | LocationPicker | M |
| 4.5 | OfflineIndicator | S |
| 4.6 | ProfilePhotoGallery | M |
| 4.7 | SelfieCamera | M |
| 4.8 | VerifiedBadge + VerificationTierBadge + VerificationPrompt | S |

### Phase 5: Subdirectory Components (8 tasks)

| # | Component | Effort |
|---|-----------|--------|
| 5.1 | chat/IcebreakerChips | S |
| 5.2 | checkin/CheckInButton | S |
| 5.3 | checkin/LiveCheckinView | M |
| 5.4 | modals/MatchingPermissionModal | S |
| 5.5 | modals/PostingPermissionModal | S |
| 5.6 | navigation/AnimatedTabBar | M |
| 5.7 | navigation/FloatingActionButtons | M |
| 5.8 | settings/NotificationSettings + LocationTrackingSettings | M |

### Phase 6: Contexts, Hooks & Infrastructure (9 tasks)

| # | Target | Effort |
|---|--------|--------|
| 6.1 | ThemeContext | S |
| 6.2 | ToastContext | S |
| 6.3 | useAnimationConfig | S |
| 6.4 | useHapticPress | S |
| 6.5 | useQueryConfig | S |
| 6.6 | useReducedMotion | S |
| 6.7 | lib/network/singleton | S |
| 6.8 | supabase/functions/send-match-notification | M |
| 6.9 | supabase/functions/send-spark-notification | M |
| 6.10 | supabase/functions/execute-account-deletion | M |

---

## 5. Effort Estimates

| Size | Meaning | Count |
|------|---------|-------|
| S | < 30 min, simple render/prop tests | 33 |
| M | 30-90 min, interaction/mock-heavy | 18 |

**Total estimated new test files: 51**

### Priority Order

1. **Phase 0** — Fix svg mock (unblocks 1,100 tests)
2. **Phase 2.1** — ErrorBoundary (crash safety)
3. **Phase 2.5** — ReportModal (user safety)
4. **Phase 2.10** — OnboardingGuard (auth gate)
5. **Phase 1** — Untested screens
6. **Phase 2** remainder — Core components
7. **Phase 6.8-6.10** — Edge functions (backend safety)
8. **Phase 3-5** — Feature and minor components
9. **Phase 6.1-6.7** — Contexts, hooks, infra

### Target Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Module coverage (files with tests) | 70% | 95%+ |
| Test pass rate | 79% | 98%+ |
| Failing test files | 54 | < 5 |
