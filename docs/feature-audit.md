# Backtrack Feature Audit

**Date:** 2026-03-03

## Navigation Structure

```
Auth → Login (email/password, Google; Apple Sign In disabled)
Main → Avatar Creator (forced first login)
     → 5 Tabs: Feed | My Spots | Map | Chats | Profile
     → Modals: CreatePost, Ledger, Favorites, PostDetail, Chat, Settings, Legal
```

Deep links: `backtrack://conversation/:id`, `backtrack://match/:postId`, plus tab links (`/feed`, `/myspots`, `/map`, `/chats`, `/profile`).

---

## Feature Status Matrix

| Feature | Screen | Components | Hooks | Backend (RPC) | Tests | Status |
|---------|--------|------------|-------|---------------|-------|--------|
| Auth | AuthScreen | SocialLoginButton, TermsModal | useAuth, useSocialAuth | profiles table | Yes | Apple Sign In disabled (TODO) |
| Avatar Creator | AvatarCreatorScreen | FullBodyAvatar (bitmoji pkg) | useAvatarEditor | profiles.avatar_config | Yes | Complete |
| Feed / Discovery | FeedScreen | PostCard, SwipeableCardStack, TrendingVenues, HangoutsList | useNearbyPosts, useTrendingVenues, useHangouts | get_posts_within_radius, get_trending_venues | Yes | Complete |
| Map Exploration | HomeScreen + MapSearchScreen | MapView, ClusterMarker, LocationMarker, SearchBar | useLocation, useLocationSearch, useNearbyLocations | get_locations_with_active_posts, Google Places API | Yes | HomeScreen check-in TODO not wired |
| Post Creation | CreatePostScreen (3 steps) | SceneStep, MomentStep, SealStep, SelfieCamera | useCreatePostForm, useTutorialState | posts table, selfies storage | Yes | Complete |
| Location Ledger | LedgerScreen | PostFilters, CheckInButton, VenueStories | useCheckin | Direct supabase.from('posts') | Yes | Complete |
| Post Detail / Matching | PostDetailScreen | AvatarComparison, MatchCelebration | lib/conversations | startConversation | Yes | Complete |
| Chat / Messaging | ChatListScreen + ChatScreen | ChatBubble, ChatInputToolbar, IcebreakerChips, SafetyPrompt, TypingIndicator, SharePhotoModal | useChatListData, useChatMessages, usePhotoSharing | get_user_conversations_with_details + realtime | Yes | ChatScreen is 1,379-line monolith |
| Favorites | FavoritesScreen | FavoritesList, AddFavoriteModal, EditFavoriteModal | useFavoriteLocations | favorite_locations table | Yes | FavoritesTabScreen unused |
| Profile | ProfileScreen | ProfilePhotoGallery, VerifiedBadge, AchievementBadge, TrustProgress | useAchievements, useTrustLevel, useProfilePhotos | user_achievements, update_user_trust_level | Yes | Complete |
| Settings | SettingsScreen | StreakCard, RegularsModeToggle, NotificationSettings, LocationTrackingSettings | useLocationStreaks, useGhostMode, useRadar | Multiple RPCs | Yes | Complete |
| My Spots | MySpotsScreen | PostCard, CompactPostCard | useNotificationCounts, useFavoriteLocations, useLocationHistory, useRegulars | Multiple RPCs + realtime | Yes | Complete |
| Check-in System | LedgerScreen | CheckInButton, LiveCheckinView | useCheckin, useLiveCheckins, useCheckinSettings | checkin_to_location (200m GPS) | Yes | Complete |
| Regulars Mode | SettingsScreen | RegularsModeToggle, RegularsList | useRegulars, useFellowRegulars | toggle_regulars_mode, get_fellow_regulars | Yes | Complete |
| Hangouts (Group) | FeedScreen (inline) | HangoutsList, HangoutCard, CreateHangoutModal | useHangouts | hangouts + hangout_attendees + realtime | Partial | No dedicated screen or tests |
| Events (External) | No dedicated screen | EventCard, AttendanceButton, AttendeesPreview | useEvents, useEventAttendance, useEventPosts | Eventbrite/Meetup fetch + set_event_attendance | Yes | No events screen |
| Streaks | SettingsScreen | StreakCard, StreakBadge | useLocationStreaks | get_user_streaks, calculate_user_streak | Yes | Complete |
| Achievements | ProfileScreen (inline) | AchievementBadge | useAchievements | achievement_definitions, user_achievements | No dedicated test | No achievements list screen |
| Trust Level | ProfileScreen (inline) | TrustProgress | useTrustLevel | update_user_trust_level + realtime | Yes | Complete |
| Ghost Mode | SettingsScreen toggle | — | useGhostMode | Profile data | No dedicated test | No visual indicator when active |
| Radar / Proximity | HomeScreen (panel) | RadarEncounters | useRadar | proximity_encounters + realtime | No dedicated test | No encounter history screen |
| Push Notifications | SettingsScreen | NotificationSettings | useNotificationSettings, useNotificationCounts | get/upsert_notification_preferences | Yes | Complete |
| Background Location | SettingsScreen | LocationTrackingSettings | useCheckinSettings | get/update_tracking_settings | Test deleted | DB calls every 2 min when stationary |
| Photo Sharing | ChatScreen | SharePhotoModal, SharedPhotoDisplay | usePhotoSharing, useProfilePhotos | photo_shares, profile_photos | Yes | Complete |
| Blocking / Moderation | ChatScreen, PostDetail | BlockUserModal, ReportModal | lib/moderation | blocks, reports tables | Partial | No admin/moderation dashboard |
| Onboarding | AvatarCreator (forced) | WelcomeScreen, OnboardingStepper | useOnboardingState | — | Yes | Complete |
| Offline Support | Global | OfflineIndicator | useNetworkStatus | Favorites offline queue | Yes | Only favorites has offline queue |
| Venue Stories | LedgerScreen | VenueStories, VenueStory | — | — | No test | Backend implementation unclear |
| Legal | LegalScreen | — | — | terms_acceptance table | Yes | Complete |

---

## Screens Detail

| Screen | File | Lines | Purpose |
|--------|------|-------|---------|
| AuthScreen | `screens/AuthScreen.tsx` | — | Email/password login + signup; age verification (18+); terms acceptance; forgot password |
| HomeScreen | `screens/HomeScreen.tsx` | — | Full-screen map; favorite markers; cluster markers; radar panel; first-time coach mark |
| FeedScreen | `screens/FeedScreen.tsx` | — | Nearby posts feed; radius selector (50m/500m/2km/25km); sort/time filters; swipeable card stack; trending venues; hangouts |
| MySpotsScreen | `screens/MySpotsScreen.tsx` | — | Personal hub: regulars posts, favorites posts, new matches, recent places |
| MapSearchScreen | `screens/MapSearchScreen.tsx` | — | Full-screen map + Google Places autocomplete search; activity markers |
| LedgerScreen | `screens/LedgerScreen.tsx` | — | Posts at a specific location; sort/time filters; check-in button; venue stories |
| PostDetailScreen | `screens/PostDetailScreen.tsx` | — | Full post details; avatar comparison score; "Start Chat"; "Block User"; match celebration |
| ChatListScreen | `screens/ChatListScreen.tsx` | — | All conversations; last message preview; unread badge; real-time updates |
| ChatScreen | `screens/ChatScreen.tsx` | ~1,379 | Anonymous chat; message grouping; realtime; icebreakers; safety prompt; typing indicator; photo sharing; blocking; reporting |
| ProfileScreen | `screens/ProfileScreen.tsx` | — | Display name edit; avatar; verification status; achievements; trust progress; photo gallery |
| SettingsScreen | `screens/SettingsScreen.tsx` | — | Streaks; Regulars Mode; notifications; location tracking; ghost mode; radar; tutorial replay; legal; sign out; account deletion |
| AvatarCreatorScreen | `screens/AvatarCreatorScreen.tsx` | — | Full SVG avatar editor; forced on first login; category tabs, option grid, color picker |
| CreatePostScreen | `screens/CreatePost/` | — | 3-step wizard: Scene (location + time), Moment (avatar + note), Seal (selfie + review + submit) |
| FavoritesScreen | `screens/FavoritesScreen.tsx` | — | Favorites CRUD; navigate to location's posts |
| LegalScreen | `screens/LegalScreen.tsx` | — | Privacy Policy + Terms of Service (full text embedded) |

---

## Hooks Inventory

### Data Fetching Hooks

| Hook | Data Source | Purpose |
|------|------------|---------|
| useAchievements | achievement_definitions, user_achievements | Earned achievements, progress, checkAndAward() |
| useCanMatch | RPC can_match_post | Permission check for responding to posts |
| useCanPost | RPC can_post_to_location | Permission check for posting |
| useChatListData | RPC get_user_conversations_with_details + realtime | Single-RPC chat list (N+1 fix) |
| useCheckin | RPC get_active_checkin, checkin_to_location, checkout_from_location | GPS-verified check-in/out (200m radius) |
| useCheckinSettings | RPC get/update_tracking_settings | Background location tracking settings |
| useEventAttendance | RPC set/remove_event_attendance, get_user_events | Event attendance management |
| useEventPosts | /api/events/:id/posts | Posts for a specific event |
| useEvents | /api/events/search | Eventbrite/Meetup event search |
| useFavoriteLocations | favorite_locations table (via lib/favorites.ts) | CRUD favorites; offline cache; queue |
| useGhostMode | Profile data | Temporary privacy mode (1h/2h/4h/session) |
| useHangouts | hangouts + hangout_attendees + realtime | Group hangouts: create/join/leave |
| useLiveCheckins | RPC get_active_checkins_at_location + realtime | Real-time check-in list (gated access) |
| useLocation | expo-location | Foreground GPS; permissions |
| useLocationHistory | RPC get_locations_visited_in_last_month | Recent location history |
| useLocationSearch | services/locationService.ts (Google Places) | Venue search with autocomplete |
| useLocationStreaks | RPC get_user_streaks, calculate_user_streak | Location visit streaks |
| useNearbyLocations | RPC get_locations_with_active_posts | Map activity markers |
| useNearbyPosts | RPC get_posts_within_radius | Tiered radius expansion for posts |
| useNotificationCounts | RPC get_notification_counts + realtime | Unread counts; markAsSeen() |
| useNotificationSettings | RPC get/upsert_notification_preferences | Push notification prefs |
| usePhotoSharing | photo_shares table (via lib/photoSharing.ts) | Share profile photos in chat |
| useProfilePhotos | profile_photos table (via lib/profilePhotos.ts) | Upload/manage profile photos |
| useRadar | proximity_encounters + realtime | Radar detection; encounters |
| useRegulars / useFellowRegulars | RPC toggle_regulars_mode, get_fellow_regulars | Regulars Mode opt-in/visibility |
| useSocialAuth | supabase.auth | OAuth sign-in (Google only, Apple disabled) |
| useTrendingVenues | RPC get_trending_venues | Top 5 trending venues (5-min refresh) |
| useTrustLevel | RPC update_user_trust_level + realtime | Trust tier tracking |
| useChatMessages | messages + conversations + realtime | Chat message fetch/send/realtime |

### UI/Utility Hooks

| Hook | Purpose |
|------|---------|
| useAnimationConfig | Spring/timing animation presets |
| useHapticPress | Haptic + scale animation for pressables |
| useInViewport | Viewport detection |
| useNetworkStatus | Network status, connection type |
| useOnboardingState | Onboarding step navigation + persistence |
| useQueryConfig | Shared TanStack Query defaults (30s stale, 5min GC) |
| useReducedMotion | Accessibility reduced-motion preference |
| useTutorialState | First-use detection via AsyncStorage |

---

## Services

| Service | File | Purpose |
|---------|------|---------|
| Background Location | services/backgroundLocation.ts | Background GPS tracking; dwell detection; auto check-in prompts; expo-task-manager |
| Dwell Detection | services/dwellDetection.ts | Pure functions for location dwell time |
| Location Service | services/locationService.ts | Google Places REST API + Supabase cache; PostGIS queries |
| Notifications | services/notifications.ts | Push notification permissions + Expo push token registration |
| Realtime Manager | services/realtimeManager.ts | Centralized Supabase Realtime channel manager; max 5 channels; ref-counting |

---

## Supabase Tables (inferred from code)

profiles, posts, messages, conversations, locations, favorite_locations, hangouts, hangout_attendees, location_regulars, user_achievements, achievement_definitions, notification_preferences, profile_photos, photo_shares, proximity_encounters, expo_push_tokens, blocks, reports, checkins, selfies, terms_acceptance, spark_notifications_sent, match_notifications, frequent_locations, location_visit_history, user_event_tokens

### Key RPC Functions

get_posts_within_radius, get_posts_for_user, get_user_conversations_with_details, get_trending_venues, get_locations_with_active_posts, get_locations_near_point_optimized, get_active_checkin, get_active_checkin_count_at_location, get_active_checkins_at_location, checkin_to_location, checkout_from_location, can_post_to_location, can_match_post, get_user_streaks, calculate_user_streak, get_user_milestones, get_locations_visited_in_last_month, get_notification_counts, get/upsert_notification_preferences, toggle_regulars_mode, set_regulars_visibility, get_fellow_regulars, get_nearby_hangouts, join_hangout, leave_hangout, set_event_attendance, remove_event_attendance, get_user_events, update_user_trust_level, get/update_tracking_settings, record_proximity_encounter, upsert_push_token

### Realtime Channels

| Channel | Table | Used In |
|---------|-------|---------|
| chatlist-{userId} | conversations | useChatListData |
| live-checkins-{locationId} | checkins | useLiveCheckins |
| hangouts-changes | hangouts | useHangouts |
| hangout-attendees-changes | hangout_attendees | useHangouts |
| proximity_encounters:{userId} | proximity_encounters | useRadar |
| trust-level-{userId} | profiles | useTrustLevel |
| messages | messages | useChatMessages |

---

## Gaps & Issues

### Missing / Incomplete Features

| # | Issue | Severity | Area |
|---|-------|----------|------|
| 1 | Apple Sign In disabled (needs Apple Developer Portal config) | Medium | Auth |
| 2 | HomeScreen check-in button has TODO, not wired up | Low | Map |
| 3 | No dedicated Events screen (only embedded cards in feed) | Medium | Events |
| 4 | No Achievements list/gallery screen | Low | Achievements |
| 5 | No Radar encounter history screen | Low | Radar |
| 6 | No visual indicator when Ghost Mode is active | Medium | Ghost Mode |
| 7 | No admin/moderation dashboard for reports & blocks | High | Moderation |
| 8 | FavoritesTabScreen appears unused in navigation | Low | Cleanup |
| 9 | Venue Stories backend implementation unclear | Medium | Venue Stories |

### Testing Gaps

| # | Area | Issue |
|---|------|-------|
| 1 | Ghost Mode | No dedicated test |
| 2 | Radar / Proximity | No dedicated test |
| 3 | Achievements | No dedicated test |
| 4 | Venue Stories | No test |
| 5 | Hangouts | No dedicated test (only partial via feed) |
| 6 | Background Location | Test deleted during migration |
| 7 | Moderation | Partial (ReportModal tested, not BlockUserModal flow) |

### Architecture / Performance Issues

| # | Issue | Impact |
|---|-------|--------|
| 1 | ChatScreen.tsx is 1,379 lines (monolith with inline hooks) | Maintainability |
| 2 | AuthContext monolithic (re-renders on profile change) — partially fixed with 2-context split | Performance |
| 3 | Background location makes DB calls every 2 min even when stationary | Battery/backend load |
| 4 | No global state management beyond AuthContext | Scalability |
| 5 | `@tanstack/react-virtual` is a dead dependency (zero imports) | Bundle size |
| 6 | Dual-platform (Next.js web + Expo mobile) in single package.json | Build complexity |

### UI Consistency Issues

| # | Issue | Files |
|---|-------|-------|
| 1 | Multiple Avatar components | components/Avatar.tsx, components/native/Avatar.tsx, components/ui/Avatar.tsx |
| 2 | Multiple EmptyState components | components/EmptyState.tsx, components/ui/EmptyState.tsx |
| 3 | Multiple Skeleton components | components/Skeleton.tsx, components/ui/Skeleton.tsx |
| 4 | Multiple Button components | components/Button.tsx, components/native/Button.tsx |
| 5 | Duplicate Modal | components/ui/Modal.tsx vs components/modals/ |
