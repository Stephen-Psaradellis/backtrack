# Performance Ideation Report

**Date**: 2026-02-09
**Team**: 4-agent performance swarm (Frontend Perf Specialist, Backend & DB Analyst, System Architect, Performance Benchmarker)
**App**: Backtrack (love-ledger) -- React Native (Expo SDK 54) + Supabase
**Builds on**: [08-backend-performance-analysis.md](./08-backend-performance-analysis.md) (23 existing findings)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Performance Scorecard](#performance-scorecard)
3. [Consolidated Task List](#consolidated-task-list)
   - [P0 -- Critical](#p0--critical-fix-before-scaling)
   - [P1 -- High](#p1--high-fix-within-next-sprint)
   - [P2 -- Medium](#p2--medium-plan-for-next-release)
   - [P3 -- Low / Backlog](#p3--low--backlog)
4. [Performance Measurement Plan](#performance-measurement-plan)
5. [Performance Budgets](#performance-budgets)
6. [Execution Roadmap](#execution-roadmap)

---

## Executive Summary

Four specialized agents audited the Backtrack codebase across frontend rendering, backend queries, system architecture, and observability. This report identifies **53 new actionable findings** (beyond the 23 in report 08) spanning 8 categories. The most critical systemic issues are:

| # | Issue | Blast Radius | Reports |
|---|-------|-------------|---------|
| 1 | **RLS policies with unindexed OR-based block checks** -- Every post SELECT, message INSERT, and conversation SELECT evaluates expensive NOT EXISTS subqueries with OR conditions that defeat index usage | Every authenticated query on 3 core tables | Backend |
| 2 | **Zero query caching** -- No stale-while-revalidate, no request dedup. Tab switches re-fetch all data from scratch | Every screen navigation | Architecture |
| 3 | **ChatListScreen N+1 waterfall** -- 80-100 individual Supabase queries per load for 20 conversations | Highest-traffic list screen | Frontend |
| 4 | **No performance instrumentation** -- Sentry `enableAutoPerformanceTracing: false`, no custom spans, no bundle size CI gate | Invisible regressions | Benchmarks |
| 5 | **Dual-platform dependency bloat** -- Next.js, react-dom, web-only packages inflate the mobile bundle by 40-60% | App startup, download size | Architecture |

**Combined estimated impact if all P0/P1 findings are addressed:**
- 60-80% fewer database queries per user session
- 40-60% smaller JS bundle
- 200-400ms faster cold start
- 2-5x faster post/message/conversation queries at scale
- Near-zero perceived latency on tab navigation (cached data)

---

## Performance Scorecard

| Dimension | Current | Target | Key Blocker |
|-----------|---------|--------|-------------|
| Cold Start | ~3-4s (est.) | < 2s | Module-level sync init, eager screen imports, bundle size |
| Feed Load (TTI) | ~2-3s (est.) | < 1s | No caching, tiered post query scans all checkins |
| Chat List Load | ~3-5s (est.) | < 800ms | N+1 query waterfall (80-100 queries) |
| Message Send Latency | ~300-500ms | < 150ms | RLS triple-nested subquery on every INSERT |
| FlatList Scroll FPS | ~45-55 (est.) | > 55 | Missing virtualization tuning, O(n^2) findIndex |
| Background DB Calls/hr | ~240k (1k users) | ~48k | No stationary detection, no position-change gate |
| Bundle Size (JS) | ~5-7MB (est.) | < 3.5MB | Web deps, eager imports, no code splitting |
| Observability | 2/10 | 8/10 | Auto-perf tracing disabled, no custom spans |

---

## Consolidated Task List

All tasks from the 4 agent reports, deduplicated and organized by priority.

### P0 -- Critical (Fix Before Scaling)

| ID | Task | Category | Actual Behavior | Expected Behavior | Acceptance Criteria | Source |
|----|------|----------|-----------------|-------------------|---------------------|--------|
| P-001 | **Split RLS block-check OR into separate NOT EXISTS with indexes** | Backend/RLS | `posts_select_active_not_blocked` policy uses `OR` in NOT EXISTS against `blocks` table, defeating index usage. Evaluates on every post row. | Two separate NOT EXISTS with targeted index lookups on `idx_blocks_blocker_blocked` and `idx_blocks_blocked_blocker`. | `EXPLAIN ANALYZE` shows index scans; post listing latency reduced >40% with 500+ active posts and 100+ blocks. | Backend #1 |
| P-002 | **Replace messages INSERT RLS with SECURITY DEFINER function** | Backend/RLS | `messages_insert_participant` policy evaluates triple-nested subquery (conversations JOIN + blocks OR/IN) on every message INSERT. | Single `can_send_message()` SECURITY DEFINER function with split NOT EXISTS. | Message INSERT overhead reduced >100ms under load; `EXPLAIN ANALYZE` shows no seq scans on `blocks`. | Backend #2 |
| P-003 | **Time-bound checkins CTE in `get_posts_for_user()`** | Backend/Query | `user_checkins_expanded` CTE scans ALL historical checkins (potentially thousands). Duplicate subquery evaluates same EXISTS twice per post row. | CTE bounded to 9-day window; duplicate subquery replaced with LEFT JOIN LATERAL. | CTE produces <50 rows for typical users; `get_posts_for_user` execution time reduced >30%. | Backend #3 |
| P-004 | **Fix ChatListScreen N+1 query waterfall** | Frontend/Query | For 20 conversations, fires 80-100 individual Supabase queries (last message, unread count, profile, post, location per conversation). | Batch queries: 3-4 total Supabase calls using `.in()` filters or a combined RPC. | ChatListScreen loads in <1s for 20 conversations; max 5 Supabase calls per load. | Frontend #1 |
| P-005 | **Enable Sentry auto-performance tracing** | Observability | `enableAutoPerformanceTracing: false` in `lib/sentry.ts`. No navigation transactions, no HTTP span timing, no slow/frozen frame detection. | Set to `true`; wrap App with `Sentry.wrap()`; add routing instrumentation to NavigationContainer. | Cold start, screen transitions, HTTP spans, and frame data visible in Sentry dashboard. | Benchmarks |
| P-006 | **Reduce AuthContext worst-case startup timeout** | Architecture/Startup | 3 retries x 15s timeout = 45s + 6s backoff = **51 seconds** worst-case loading screen for offline users. | First attempt 5s, progressive increase; show "Taking longer..." after 3s; provide Retry/Skip UI. | Users see actionable UI within 5 seconds regardless of network state. | Architecture #13 |

### P1 -- High (Fix Within Next Sprint)

| ID | Task | Category | Actual Behavior | Expected Behavior | Acceptance Criteria | Source |
|----|------|----------|-----------------|-------------------|---------------------|--------|
| P-007 | **Defer module-level synchronous initialization** | Architecture/Startup | `initSentry()`, `initializeAnalytics()`, `initializeNotifications()`, and `AppState.addEventListener` run at module scope, blocking JS evaluation. | Move all initialization into `useEffect(() => {}, [])` in root component. | Time to first paint decreases by 200-400ms; no functional regression. | Architecture #1 |
| P-008 | **Separate web/mobile dependencies in monorepo** | Architecture/Bundle | `package.json` includes Next.js 15.5, react-dom, @vis.gl/react-google-maps, lucide-react, @tanstack/react-virtual (zero imports), graphql. | Mobile package has only Expo/RN deps; shared logic in `packages/shared`. | Mobile bundle decreases 40-60%; `@tanstack/react-virtual` removed; EAS build succeeds. | Architecture #2 |
| P-009 | **Add TanStack Query (react-query) caching layer** | Architecture/Caching | All Supabase queries fire fresh on every mount. Tab switches trigger full refetches. No stale-while-revalidate. | TanStack Query wraps all data hooks with configurable staleTime/cacheTime. | Tab navigation shows cached data instantly; Supabase query count decreases >30%. | Architecture #5 |
| P-010 | **Split AuthContext into auth + profile contexts** | Architecture/State | Monolithic AuthContext holds session, user, profile, and 7 functions. Any profile change re-renders all consumers (navigation, offline queue, notifications, screens). | Two contexts: `AuthStateContext` (userId, isAuthenticated) and `ProfileContext` (profile, updateProfile). | Profile update re-renders only profile-consuming components; verified via React DevTools Profiler. | Architecture #4 |
| P-011 | **Tune FlatList virtualization across all screens** | Frontend/Rendering | All FlatLists use defaults: `windowSize=21`, `maxToRenderPerBatch=10`. No `getItemLayout`. No `removeClippedSubviews`. | Tuned per list: `windowSize=5`, `maxToRenderPerBatch=5`, `getItemLayout` for fixed-height items. | Memory for 100+ item lists <150MB; FPS >55 during scroll. | Frontend #2 |
| P-012 | **Eliminate O(n^2) findIndex in ChatScreen renderMessage** | Frontend/Rendering | `renderMessage` calls `messages.findIndex(m => m.id === message.id)` per message -- O(n) per item, O(n^2) total. | Pre-compute `messageIndexMap = new Map()` via `useMemo`; O(1) lookups. | No `findIndex` in renderItem; 60fps scroll with 500+ messages. | Frontend #3 |
| P-013 | **Lazy-load infrequently visited screens** | Frontend/Bundle | All 11 screens eagerly imported in AppNavigator. AvatarCreator, CreatePost, Legal, PostDetail loaded at startup. | Use `React.lazy()` or `getComponent` for modal/detail screens. | App TTI decreases 15-25%; lazy screens show brief loader on first visit. | Frontend #9 |
| P-014 | **Batch profile photo signed URL generation** | Backend/Photos | `getProfilePhotos()` calls `createSignedUrl()` individually per photo (6 HTTP requests for max photos). | Use `createSignedUrls()` (plural) for single batch request. | Single HTTP request for all photo URLs; gallery load reduced >200ms. | Backend #4 |
| P-015 | **Filter `subscribeToPhotoChanges()` to current user** | Backend/Realtime | Realtime subscription on `profile_photos` has no filter -- fires on ANY user's photo change, triggering N signed URL requests. | Add `filter: user_id=eq.${userId}` to subscription. | Only own photo changes trigger callback; eliminates 99% of spurious events. | Backend #5 |
| P-016 | **Replace `supabase.auth.getUser()` with `getSession()` in profilePhotos.ts** | Backend/Photos | 9 functions each call `supabase.auth.getUser()` (HTTP request to Auth server, ~50-100ms). Photo gallery calls 3 of these. | Use `supabase.auth.getSession()` (local cache, no network) or pass userId from AuthContext. | Zero auth network calls in photo hot paths; saves 150-300ms per gallery render. | Backend #6 |
| P-017 | **Combine `useLocationRegulars` into single RPC** | Backend/Hooks | 3 sequential DB round-trips: count, is-regular check, regulars list. | Single `get_location_regulars_with_status` RPC returns all three. | 1 round-trip instead of 3; saves 40-100ms per location screen. | Backend #7 |
| P-018 | **Debounce `useLiveCheckins` realtime + combine queries** | Backend/Realtime | Every realtime change fires `fetchData()` with 3 sequential queries. 5 simultaneous checkins = 15 queries. | 500ms debounce + combined RPC. | Burst of 5 events produces 1-3 queries instead of 15. | Backend #8 |
| P-019 | **Optimize streak trigger to use UPSERT** | Backend/Triggers | `trigger_update_location_streak()` calls `update_single_streak()` 3 times (daily/weekly/monthly), each doing SELECT + INSERT/UPDATE = 6-9 queries per visit. | Single trigger with 3 `INSERT ON CONFLICT` upserts = 3 queries. | Visit INSERT latency reduced >30%; streak values identical. | Backend #9 |
| P-020 | **Add index for `refresh_location_regulars()` scan** | Backend/Index | Function does full GROUP BY on `location_visits` with no supporting index for `WHERE visited_at >= X GROUP BY user_id, location_id`. | Add composite index `(visited_at DESC, user_id, location_id)`. | `EXPLAIN ANALYZE` shows index scan; refresh time reduced >40% with 50k+ visits. | Backend #10 |
| P-021 | **Remove unused web dependencies from mobile bundle** | Frontend/Bundle | `next`, `react-dom`, `@tanstack/react-virtual` (zero imports), `@vis.gl/react-google-maps`, `lucide-react` are web-only deps in the shared package.json. | Remove from mobile resolution graph. | Bundle size decreases 3-8MB; all mobile features work. | Frontend #16 |
| P-022 | **Stabilize MapSearchScreen marker recreation** | Frontend/Rendering | `activityMarkers` useMemo depends on `selectedLocationId` -- tapping one marker recreates ALL markers. | Remove `selectedLocationId` from useMemo deps; handle selection state separately. | Tapping a marker does not re-render other markers. | Frontend #7 |
| P-023 | **Set up CI bundle size gate** | Observability | No automated check for bundle size regressions. | GitHub Actions workflow builds JS bundle and fails if >4.5MB. | PRs that increase bundle beyond budget are blocked. | Benchmarks |
| P-024 | **Add custom Sentry spans to key screens** | Observability | No TTI measurement for any screen. | `Sentry.startSpan()` wrapping loadData in Chat, Feed, Map, Profile screens. | TTI data visible per-screen in Sentry Performance dashboard. | Benchmarks |

### P2 -- Medium (Plan For Next Release)

| ID | Task | Category | Actual Behavior | Expected Behavior | Acceptance Criteria | Source |
|----|------|----------|-----------------|-------------------|---------------------|--------|
| P-025 | **Rewrite conversations_select RLS with CASE-based block check** | Backend/RLS | `conversations_select_participant` uses `IN (producer_id, consumer_id)` with OR across block directions (4 comparison paths per row). | CASE expression to identify the other participant, then 2 targeted NOT EXISTS. | `EXPLAIN` shows index scans; conversation list latency reduced for 50+ conversations. | Backend #15 |
| P-026 | **Wrap messages_select RLS in STABLE SECURITY DEFINER function** | Backend/RLS | Per-row EXISTS subquery joins to conversations table for every message row. 50 messages = 50 evaluations. | `is_message_conversation_participant()` function with caching hint. | Reduced subquery evaluations in EXPLAIN; message list load reduced 20-40ms. | Backend #16 |
| P-027 | **Fix location_regulars_select RLS self-join recursion** | Backend/RLS | SELECT policy does self-join on `location_regulars` (same table) for mutual-regular check, triggering RLS recursion. | SECURITY DEFINER function bypasses recursive RLS evaluation. | No RLS recursion in EXPLAIN; visibility rules unchanged. | Backend #11 |
| P-028 | **Prevent useTieredPosts from re-grouping all posts on pagination** | Backend/Hooks | `loadMore()` concatenates new posts and calls `groupPostsByTier()` on ALL posts (O(total) per page load). | Only group new page; merge into existing tier groups. | Pagination processing is O(page_size), not O(total_posts). | Backend #12 |
| P-029 | **Centralize Realtime subscription management** | Architecture/Network | 5-8 independent Supabase Realtime channels created across screens with no dedup or lifecycle management. | Singleton `RealtimeManager` with channel pooling, dedup, and auth-aware cleanup. | Max 3 concurrent WebSocket channels during normal usage; reconnection within 2s. | Architecture #6 |
| P-030 | **Add image caching with expo-image** | Architecture/Caching | `<Image source={{ uri: signedUrl }}>` uses basic RN Image with limited caching. Signed URLs may not cache effectively. | `expo-image` with `cachePolicy="memory-disk"`, BlurHash placeholders, transition animations. | Previously viewed images load from cache; placeholder shown during load. | Architecture #10 |
| P-031 | **Convert ProfileScreen from ScrollView to SectionList** | Frontend/Rendering | ProfileScreen renders all 12-15 sections in a ScrollView. Below-fold sections (streaks, settings, legal) render eagerly. | FlatList/SectionList with `windowSize=3` for virtualized section rendering. | Initial render time decreases 30%+; sections load when scrolled into view. | Frontend #11 |
| P-032 | **Stabilize ChatScreen inline lambda in onLongPress** | Frontend/Rendering | `renderMessage` creates new inline arrow function for `onLongPress` on every render of every ChatBubble, defeating `React.memo`. | Stable `handleBubbleLongPress` callback via `useCallback`. | ChatBubble `onLongPress` prop is referentially stable; memo boundary works. | Frontend #4 |
| P-033 | **Fix AnimatedTabBar inline Animated.Value** | Frontend/Animation | `new Animated.Value(12)` created inline in transform style on every render -- new Animated node each cycle. | `useRef(new Animated.Value(12)).current` for stable reference. | No new Animated.Value on re-render; smooth tab transitions. | Frontend #8 |
| P-034 | **Add staleness check to MapSearchScreen useFocusEffect** | Frontend/Network | Every tab switch to Map triggers `refetchFavorites()` + `refetchNearbyLocations()` regardless of data freshness. | Only refetch if data is older than 60 seconds. | No refetch within 60s of last fetch; pull-to-refresh always forces fetch. | Frontend #17 |
| P-035 | **Bound event cache size with LRU eviction** | Backend/Caching | `useEvents.ts` and `useEventPosts.ts` use unbounded `Map` caches. 50 searches = 5-12MB retained. | Max 10 entries with LRU eviction; proactive expired entry cleanup. | Cache never exceeds 10 entries; memory bounded to ~1-2MB. | Backend #13 |
| P-036 | **Make addFavorite atomic with single RPC** | Backend/Favorites | Count query + INSERT = 2 round-trips with TOCTOU race condition on max favorites limit. | Single `add_favorite_location()` RPC with atomic check. | 1 round-trip; limit enforced atomically; no race condition. | Backend #14 |
| P-037 | **Fix checkin_to_location to use stored geog column** | Backend/Schema | `checkin_to_location()` uses `SELECT *` and inline `ST_MakePoint` instead of stored `geog` column. | Use stored `geog`; select only needed columns. | Checkin uses stored geography; SELECT fetches 3 columns not all. | Backend #17 |
| P-038 | **Replace Dimensions.get at module scope with useWindowDimensions** | Frontend/Layout | `Dimensions.get('window')` captured at import time in ProfileScreen and AnimatedTabBar -- never updates on dimension change. | `useWindowDimensions()` hook inside component body. | Layout adapts to dimension changes (foldables, tablets, rotation). | Frontend #10 |
| P-039 | **Consolidate test frameworks (Jest + Vitest)** | Architecture/DX | Both jest (v29 + jest-expo + ts-jest) and vitest (v4) in devDependencies. Dual config maintenance. | Single runner (Vitest) for all tests. | All tests pass under Vitest; jest packages removed; CI uses single test command. | Architecture #3 |
| P-040 | **Fix ChatListScreen inline ItemSeparatorComponent** | Frontend/Rendering | `ItemSeparatorComponent={() => <View ... />}` creates new component ref each render, forcing separator unmount/remount. | Define separator as stable const outside render. | `ItemSeparatorComponent` prop is referentially stable. | Frontend #5 |
| P-041 | **Deduplicate useNetworkStatus subscriptions** | Architecture/State | Each component using `useNetworkStatus()` creates its own `NetInfo.addEventListener`. `lib/network.ts` has yet another subscription. | Singleton subscription with `useSyncExternalStore` or shared context. | Single NetInfo subscription regardless of consumer count. | Architecture #12 |
| P-042 | **Fix MySpotsScreen unstable array dependencies** | Frontend/Rendering | `fetchData` depends on `favorites`, `recentLocations`, `fellowRegulars` arrays that are recreated each fetch, causing 2-3x refetching. | Stable dependency keys derived from sorted IDs. | Data loads exactly once per screen focus; no duplicate Supabase queries. | Frontend #13 |

### P3 -- Low / Backlog

| ID | Task | Category | Actual Behavior | Expected Behavior | Acceptance Criteria | Source |
|----|------|----------|-----------------|-------------------|---------------------|--------|
| P-043 | **Combine useLocationStreaks RPCs** | Backend | 2 parallel RPCs (streaks + milestones) could be 1. | Single `get_user_streaks_with_milestones` RPC. | 1 round-trip saves 20-50ms per load. | Backend #18 |
| P-044 | **Optimize get_tier_1_posts to skip tier-2/3 computation** | Backend | `get_tier_1_posts()` computes all tiers then discards 2 and 3. | Dedicated tier-1-only query with direct JOIN. | 20-30% faster for tier-1-only requests. | Backend #19 |
| P-045 | **Deduplicate Haversine in useNearbyPosts** | Backend | Inline Haversine duplicates `calculateDistance()` from `lib/utils/geo.ts`. | Import shared function. | Single source for distance calculation. | Backend #20 |
| P-046 | **Replace dynamic import in OfflineQueueProcessor** | Architecture | `await import('./lib/supabase')` called per queue message. Module already in dependency graph. | Static import at file top. | No dynamic import overhead; saves ~1-2ms per message. | Architecture #11 |
| P-047 | **Plan New Architecture migration** | Architecture | Running on Legacy Architecture (frozen RN 0.80, removed RN 0.82). Expo SDK 54 is last to support it. | Enable `newArchEnabled: true`; audit native deps; test incrementally. | App runs on New Architecture without crashes; 20-30% interaction latency reduction. | Architecture #8 |
| P-048 | **Extract ChatScreen into smaller modules** | Architecture | ChatScreen is 1,379 lines with 3 inline hooks, 1 inline modal, 20+ state variables. | Extract to `hooks/useChatMessages.ts`, `components/chat/SharePhotoModal.tsx`, etc. | ChatScreen.tsx <400 lines; all chat features work identically. | Architecture #9 |
| P-049 | **Lazy-load react-native-maps** | Architecture | Maps module loaded at navigator init for all authenticated users, even if they never visit Map tab. | `React.lazy()` wrapping MapSearchScreen. | Maps not loaded until Map tab visited; 50-100ms startup reduction. | Architecture #14 |
| P-050 | **Add PostHog timing properties** | Observability | PostHog tracks behavioral events but no timing data. | Add `load_time_ms`, `message_count` properties to screen events. | PostHog funnels show load time distribution per screen. | Benchmarks |
| P-051 | **Add Maestro performance E2E flows** | Observability | No automated performance regression tests. | Maestro flows assert key screens load within budget (e.g., feed <3s). | Performance flows pass in CI; regressions caught automatically. | Benchmarks |
| P-052 | **Configure Sentry performance alerts** | Observability | No performance alerting configured. | Alerts for: p95 cold start >3.5s, p95 screen load >2s, frozen frames >5/session. | Sentry alerts fire on regression; team notified via Slack. | Benchmarks |
| P-053 | **Add background task timing instrumentation** | Observability | No timing data for background location task execution. | Log task duration to AsyncStorage; report to Sentry on next foreground. | Background task >5s logged and reported; visible in monitoring. | Benchmarks |

---

## Performance Measurement Plan

### Current State

| Tool | Status | Gap |
|------|--------|-----|
| Sentry | Initialized, errors tracked | `enableAutoPerformanceTracing: false`; no transactions, no spans, no frame data |
| PostHog | Behavioral events tracked | No timing properties; no performance funnels |
| Supabase Dashboard | Available | Not actively monitored; no alerts configured |
| CI Pipeline | Builds + tests | No bundle size gate; no perf regression checks |
| Dev Profiling | Flipper available | No documented profiling workflow |

### Phase 1: Quick Wins (Week 1, ~8 hours)

| Change | File | Impact |
|--------|------|--------|
| Set `enableAutoPerformanceTracing: true` | `lib/sentry.ts:258` | Unlocks 80% of metrics (startup, navigation, HTTP, frames) |
| Increase `tracesSampleRate` to 0.2 | `lib/sentry.ts:231` | More baseline data for first 30 days |
| Wrap App with `Sentry.wrap()` | `App.tsx:330` | Navigation transaction tracing |
| Add Sentry routing instrumentation | `navigation/AppNavigator.tsx` | Per-screen transition timing |
| Configure Sentry performance alerts | Sentry dashboard | Regression detection |

### Phase 2: Key Journeys (Week 2-3, ~16 hours)

Add custom `Sentry.startSpan()` to: ChatScreen.loadData, FeedScreen initial load, MapSearchScreen init, and ChatListScreen fetch. Add timing properties to PostHog events. Set up CI bundle size check.

### Phase 3: Background & Edge (Week 3-4, ~12 hours)

Add background task timing, edge function timing logs, Maestro performance flows, and Supabase fetch wrapper with per-endpoint latency tracking.

---

## Performance Budgets

| Category | Metric | Budget | Hard Limit | Gate |
|----------|--------|--------|------------|------|
| Startup | Cold start (iOS) | 2,000 ms | 3,500 ms | Sentry alert |
| Startup | Cold start (Android) | 2,500 ms | 4,000 ms | Sentry alert |
| Navigation | Screen push | 600 ms | 1,200 ms | Sentry alert |
| Navigation | Tab switch | 300 ms | 800 ms | Sentry alert |
| Rendering | FPS during scroll | 55 FPS | 45 FPS | Dev profiling |
| Rendering | Frozen frames/session | < 3 | > 10 | Sentry alert |
| API | p50 latency | 100 ms | 200 ms | Sentry alert |
| API | p95 latency | 300 ms | 600 ms | Sentry alert |
| Memory | Baseline RSS | 80 MB | 120 MB | Dev profiling |
| Memory | Peak RSS | 150 MB | 250 MB | Dev profiling |
| Bundle | JS bundle | 3.5 MB | 4.5 MB | **CI gate** |
| Bundle | iOS app total | 50 MB | 65 MB | CI gate |
| Background | Task execution | 5,000 ms | 10,000 ms | Sentry alert |
| Edge Fn | Total execution | 3,000 ms | 5,000 ms | Supabase logs |

### Key User Journeys

| Journey | Steps | Total Budget |
|---------|-------|-------------|
| Signup -> First Post | Auth (1.5s) + Nav (0.8s) + Feed TTI (1s) + Post tap (0.6s) | < 4,000 ms |
| App Open -> Feed | Cold start (2s) + Auth check (0.5s) + Feed TTI (1s) | < 3,500 ms |
| Chat List -> Send Message | Chat list TTI (0.8s) + Tap conv (1.2s) + Type + Send (<0.1s optimistic) | < 2,400 ms |
| Map View -> Location | Tab switch (0.3s) + Location resolve (2s) + Map ready (1.5s) | < 5,000 ms |
| Background Check-in | Task start + AsyncStorage (0.1s) + RPC (1s) + Notification (0.1s) | < 2,000 ms |
| Notification -> Chat | App launch (1s) + Deep link (0.2s) + Chat TTI (1.5s) | < 3,900 ms |

---

## Execution Roadmap

### Sprint 1: Foundations (Week 1-2)

**Goal:** Enable observability, fix the worst query patterns, unblock caching.

| Task IDs | Theme | Effort |
|----------|-------|--------|
| P-005, P-023, P-024 | Enable Sentry perf tracing + CI bundle gate + custom spans | 2 days |
| P-001, P-002 | Fix RLS block-check policies (posts + messages) | 1 day |
| P-004 | Fix ChatListScreen N+1 waterfall | 1 day |
| P-006, P-007 | Startup: reduce auth timeout + defer module init | 1 day |
| P-012, P-011 | Chat: fix findIndex O(n^2) + tune FlatList virtualization | 1 day |

**Outcome:** Observability live; 3 core tables have efficient RLS; chat list loads 5-10x faster; cold start 200-400ms faster.

### Sprint 2: Caching & Network (Week 3-4)

**Goal:** Eliminate redundant network requests; batch remaining N+1 patterns.

| Task IDs | Theme | Effort |
|----------|-------|--------|
| P-009 | Add TanStack Query caching layer | 3 days |
| P-010 | Split AuthContext (auth + profile) | 1 day |
| P-014, P-015, P-016 | Profile photos: batch URLs, filter realtime, fix auth calls | 1 day |
| P-017, P-018 | Combine regulars + live checkins queries | 1 day |
| P-019, P-020 | Optimize streak trigger + add regulars index | 1 day |
| P-003, P-025 | Fix tiered posts query + conversations RLS | 1 day |

**Outcome:** Tab navigation shows cached data instantly; 40-60% fewer network requests; photo gallery loads 250ms faster.

### Sprint 3: Bundle & Rendering (Week 5-6)

**Goal:** Reduce bundle size; polish rendering performance.

| Task IDs | Theme | Effort |
|----------|-------|--------|
| P-008, P-021 | Separate web/mobile deps, remove unused packages | 2 days |
| P-013, P-049 | Lazy-load screens + react-native-maps | 1 day |
| P-022, P-031, P-032, P-033 | Map markers, ProfileScreen sections, ChatBubble stability, AnimatedTabBar | 2 days |
| P-029, P-030 | Centralize Realtime manager + expo-image | 2 days |
| P-026, P-027 | Messages + regulars RLS optimization | 1 day |

**Outcome:** Bundle 40-60% smaller; TTI faster; rendering smooth at 60fps.

### Sprint 4: Polish & Observability (Week 7-8)

**Goal:** Close remaining gaps; harden monitoring.

| Task IDs | Theme | Effort |
|----------|-------|--------|
| P-028, P-034, P-035, P-036 | Tiered pagination, Map staleness, event cache, favorites atomic | 2 days |
| P-037, P-038, P-039, P-040, P-041, P-042 | Remaining P2 fixes (geog, dimensions, tests, separators, NetInfo, MySpotsScreen) | 3 days |
| P-050, P-051, P-052, P-053 | PostHog timing, Maestro perf flows, Sentry alerts, bg task timing | 2 days |

**Outcome:** All P0-P2 addressed; comprehensive monitoring; regression prevention in CI.

### Backlog (Future)

Tasks P-043 through P-049: streak RPCs, tier-1 optimization, Haversine dedup, dynamic import cleanup, New Architecture migration, ChatScreen extraction, maps lazy loading.

---

## Appendix: Finding Cross-Reference

| Source Agent | Findings | IDs in This Report |
|-------------|----------|-------------------|
| Frontend Perf Specialist | 19 findings | P-004, P-011, P-012, P-013, P-021, P-022, P-031, P-032, P-033, P-034, P-038, P-040, P-042 |
| Backend & DB Analyst | 20 new findings | P-001, P-002, P-003, P-014, P-015, P-016, P-017, P-018, P-019, P-020, P-025, P-026, P-027, P-028, P-035, P-036, P-037, P-043, P-044, P-045 |
| System Architect | 14 findings | P-006, P-007, P-008, P-009, P-010, P-029, P-030, P-039, P-041, P-046, P-047, P-048, P-049 |
| Performance Benchmarker | Measurement strategy | P-005, P-023, P-024, P-050, P-051, P-052, P-053 |

---

*Generated by a 4-agent performance ideation swarm. Each agent investigated independently, findings were deduplicated and prioritized by the coordinator.*
