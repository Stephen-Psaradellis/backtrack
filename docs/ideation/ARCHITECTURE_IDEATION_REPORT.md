# Architecture Ideation Report - Backtrack

> **Generated**: 2026-02-09
> **App**: Backtrack (Location-Based Anonymous Matchmaking)
> **Stack**: React Native 0.81.5, Expo SDK 54, Supabase, TypeScript
> **Companion**: See [UX_IDEATION_REPORT.md](./UX_IDEATION_REPORT.md) for UX-focused findings

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Section 1: System Architecture & Data Layer](#section-1-system-architecture--data-layer)
- [Section 2: Codebase Patterns & Technical Debt](#section-2-codebase-patterns--technical-debt)
- [Section 3: Code Quality & Consistency](#section-3-code-quality--consistency)
- [Section 4: Performance Architecture](#section-4-performance-architecture)
- [Section 5: Security & Compliance](#section-5-security--compliance)
- [Cross-Cutting Priority Roadmap](#cross-cutting-priority-roadmap)

---

## Executive Summary

This report consolidates findings from five specialized architecture review agents analyzing the Backtrack codebase. The review identified **170+ actionable items** across five domains, revealing a codebase that functions but has accumulated significant structural debt as it grew from MVP to production.

### Critical Findings

| # | Finding | Risk | Section |
|---|---------|------|---------|
| 1 | **SSH credentials committed to CLAUDE.md** | Active credential exposure in git history | 5.3 |
| 2 | **Location data stored unencrypted** in AsyncStorage (dwell state, offline messages) | GDPR violation; data extractable on rooted devices | 5.1 |
| 3 | **No server state caching** -- every mount fires fresh Supabase queries | 45-75 redundant API calls per 10-min session | 1.2, 4.1 |
| 4 | **Legacy Architecture** (frozen RN 0.80, removed RN 0.82) -- Expo SDK 54 is the last to support it | Blocks upgrade path to Expo 55+, RN 0.82+, all future features | 1.5 |
| 5 | **8 reactive RLS fix migrations** indicate gaps in database authorization | Unknown authorization holes in production | 5.6 |
| 6 | **No MFA** for app handling sensitive location + social data | Single-factor auth insufficient for data sensitivity | 5.2 |
| 7 | **Coordinate precision mismatch** -- 2 decimal (~1.1km) precision with 200m search radius | Functional bug: nearby locations missed | 4.6 |

### Effort Summary

| Section | Tasks | Est. Effort |
|---------|-------|-------------|
| 1. System Architecture | 43 tasks | 30-40 dev-days |
| 2. Codebase Patterns | 41 tasks | 15-20 dev-days |
| 3. Code Quality | 25 tasks | 7 dev-days |
| 4. Performance | 34 tasks | 18-25 dev-days |
| 5. Security | 39 tasks | 25-35 dev-days |
| **Total** | **182 tasks** | **~100-130 dev-days** |

---

## Section 1: System Architecture & Data Layer

### 1.1 Repository Pattern & Data Access Layer

**Actual**: 40+ files make direct `supabase.from()` / `supabase.rpc()` calls with no abstraction layer. Each hook independently constructs queries, handles errors differently, and manages its own loading state. The `lib/supabase.ts` file (546 lines) mixes client config, push token CRUD, and post sorting logic.

**Expected**: A repository layer that centralizes data access, normalizes error responses, enables test mocking, and provides a single place to add caching, logging, or retry logic.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| A-01 | Extract PostRepository from direct supabase calls in 6+ files | 6+ files construct post queries independently with inconsistent error handling | Single `PostRepository` class with `getForUser()`, `getNearby()`, `getByLocation()` methods | High | Medium (3-5d) |
| A-02 | Extract ConversationRepository from lib/conversations.ts and screens | `lib/conversations.ts` acts as partial repository but screens also make direct queries | `ConversationRepository` wrapping all conversation + message queries | Medium | Small (2-3d) |
| A-03 | Extract CheckinRepository from useCheckin.ts and backgroundLocation.ts | Both files independently call `supabase.rpc` for checkin operations; duplicate `reduceCoordinatePrecision` | `CheckinRepository` with `checkIn()`, `checkOut()`, `getActive()` methods; shared geo utility | High | Small (2-3d) |
| A-04 | Extract FavoritesRepository from lib/favorites.ts | `lib/favorites.ts` has clean functions but directly imports supabase singleton | `FavoritesRepository` accepting supabase client via constructor injection | Low | Small (1-2d) |
| A-05 | Decompose lib/supabase.ts into focused modules | 546 lines mixing client config, SecureStore adapter, push token CRUD, and post sorting logic | `lib/supabase/client.ts` (config), `lib/supabase/pushTokens.ts` (token CRUD), `lib/utils/postSorting.ts` (deprioritization) | Medium | Small (1-2d) |
| A-06 | Consolidate duplicated Haversine distance implementations | 4-5 independent implementations across backgroundLocation, useFavoriteLocations, useNearbyPosts, lib/utils/geo.ts | Single canonical `haversineDistance()` in `lib/utils/geo.ts`; all consumers import from there | Medium | Trivial (1d) |
| A-07 | Consolidate duplicated `reduceCoordinatePrecision` | Identical function in backgroundLocation.ts and useCheckin.ts | Single export from `lib/utils/geo.ts` | Low | Trivial (<1d) |
| A-08 | Create data access layer barrel export | No unified import point for data operations | `lib/repositories/index.ts` exporting all repository instances | Medium | Small (1d) |

**Acceptance Criteria for A-01 (PostRepository)**:
- [ ] `lib/repositories/PostRepository.ts` exists with typed methods for all post query patterns
- [ ] `useTieredPosts`, `useNearbyPosts`, and all screen-level post queries import from PostRepository
- [ ] PostRepository accepts a Supabase client instance via constructor parameter
- [ ] Error responses normalized to `{ success, data, error }` shape
- [ ] PostRepository has its own unit test file with mocked Supabase client

**Acceptance Criteria for A-05 (Decompose lib/supabase.ts)**:
- [ ] `lib/supabase/client.ts` contains only client initialization + SecureStore adapter (under 100 lines)
- [ ] `lib/supabase/pushTokens.ts` contains push token CRUD functions
- [ ] `lib/utils/postSorting.ts` contains post sorting/deprioritization logic
- [ ] All 40 existing importers continue to function without modification

---

### 1.2 State Management Strategy

**Actual**: Single React Context (`AuthContext.tsx`) for auth state. All server data managed via `useState` + `useCallback` + `useEffect` in 28 custom hooks. Each hook independently manages loading, error, caching, and refetch. `useFavoriteLocations` alone is 1652 lines because it reimplements caching, offline queue, optimistic updates, and conflict resolution. No shared cache -- duplicate components trigger duplicate queries. No cache invalidation -- creating a post doesn't refresh the feed.

**Expected**: Server state via TanStack Query for automatic caching, deduplication, background refetching, optimistic updates, and cache invalidation. Client-only state via Zustand for lightweight stores. Auth state remains in AuthContext.

| Criterion | Current (hooks+useState) | TanStack Query |
|-----------|-------------------------|----------------|
| Server cache deduplication | None -- duplicate fetches | Automatic query key dedup |
| Background refetch | Not implemented | Built-in (`staleTime`, `refetchInterval`) |
| Optimistic updates | Reimplemented per-hook (1652 lines) | Declarative via `onMutate`/`onError`/`onSettled` |
| Cache invalidation | Not implemented | `invalidateQueries()` by key |
| Offline support | Custom per-feature (only chat + favorites) | Built-in `networkMode: 'offlineFirst'` |
| Bundle size impact | 0 KB (already in bundle) | ~13 KB gzipped |

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| B-01 | Install and configure TanStack Query | No query caching or deduplication | QueryClient with `staleTime: 5min`, `gcTime: 30min`, `networkMode: 'offlineFirst'` | Critical | Small (1d) |
| B-02 | Migrate useTieredPosts to TanStack Query | 276-line hook with manual state | `useQuery({ queryKey: ['posts', 'tiered', locationId], queryFn })` | High | Medium (2-3d) |
| B-03 | Migrate useCheckin to TanStack Query | 362-line hook with manual state | `useQuery` for active checkin + `useMutation` for checkIn/checkOut | High | Medium (2-3d) |
| B-04 | Migrate useFavoriteLocations to TanStack Query | 1652-line hook reimplementing caching, offline queue, optimistic updates | `useQuery` + `useMutation` with `onMutate` optimistic updates, `networkMode: 'offlineFirst'` | Critical | Large (5-7d) |
| B-05 | Migrate useRegulars (3 hooks) to TanStack Query | 511 lines of manual fetch + state across 3 hooks | 3 `useQuery` hooks with proper query keys and shared invalidation | Medium | Small (2d) |
| B-06 | Migrate useNearbyPosts to TanStack Query | 248-line hook with manual state | `useQuery` with location-dependent keys and enabled flag | Medium | Small (1-2d) |
| B-07 | Install Zustand for client-only UI state | UI state scattered across component-local useState | Zustand stores for: feed filters, map viewport, form drafts | Low | Small (2d) |
| B-08 | Add QueryClientProvider to App.tsx | No query provider | QueryClientProvider inside AuthProvider | Critical | Trivial (<1d) |
| B-09 | Centralize Supabase Realtime subscriptions via TanStack Query | ChatScreen sets up its own realtime subscription | `useQuery` with custom `queryFn` that sets up subscription and updates cache | Medium | Medium (3-4d) |

**Acceptance Criteria for B-01 (TanStack Query Setup)**:
- [ ] `@tanstack/react-query` added to dependencies
- [ ] `lib/queryClient.ts` exports configured `QueryClient` instance
- [ ] `QueryClientProvider` added to `App.tsx` inside `AuthProvider`
- [ ] Default options: `staleTime: 5 * 60 * 1000`, `gcTime: 30 * 60 * 1000`, `retry: 2`
- [ ] No existing functionality broken (purely additive change)

**Acceptance Criteria for B-04 (useFavoriteLocations Migration)**:
- [ ] Hook reduced from 1652 lines to under 200 lines
- [ ] Offline behavior preserved via `networkMode: 'offlineFirst'` and `useMutation` with `onMutate`
- [ ] Cache automatically invalidated after add/update/remove mutations
- [ ] All existing consumers continue working without API changes

---

### 1.3 Module Boundary Design

**Actual**: Flat, layer-based structure -- all hooks in `/hooks/`, all lib in `/lib/`, all screens in `/screens/`. Leads to: no clear domain boundaries, 5 duplicate component pairs (Button, Badge, Skeleton, Avatar, EmptyState), mixed concerns, and 90+ component files in a flat directory.

**Expected**: Feature-based module structure with clear boundaries and barrel exports.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| C-01 | Resolve duplicate Button component | `components/Button.tsx` and `components/ui/Button.tsx` both exist | Single canonical `components/ui/Button.tsx` | High | Small (1d) |
| C-02 | Resolve duplicate Badge component | Both root and ui/ versions exist | Single canonical in `components/ui/` | Medium | Small (1d) |
| C-03 | Resolve duplicate Skeleton component | Both root and ui/ versions exist | Single canonical in `components/ui/` | Medium | Small (1d) |
| C-04 | Resolve duplicate Avatar component | Both root and ui/ versions exist | Single canonical in `components/ui/` | Medium | Small (1d) |
| C-05 | Resolve duplicate EmptyState component | Both root and ui/ versions exist | Single canonical in `components/ui/` | Medium | Small (1d) |
| C-06 | Create feature module: `features/checkin/` | Logic split across hooks/, components/, components/checkin/ | Unified module with hooks/, components/, repository/ | High | Medium (3-4d) |
| C-07 | Create feature module: `features/favorites/` | Logic split across hooks/, lib/, components/favorites/, components/modals/ | Unified module | Medium | Medium (3-4d) |
| C-08 | Create feature module: `features/chat/` | 12+ chat files across components/chat/, lib/, screens/ | Unified module with clear internal structure | High | Large (5-7d) |
| C-09 | Create feature module: `features/location/` | Logic across services/, hooks/ (7 hooks), components/ (5+ files) | Unified module | Medium | Large (5-7d) |
| C-10 | Add barrel exports for all feature modules | No barrel exports; every import requires full file path | Each module has `index.ts` re-exporting public API | Low | Small (2d) |
| C-11 | Establish module dependency rules | No rules; any file imports from any file | Documented rule: features import from lib/ and shared/, never from other features | Medium | Small (1d) |

**Acceptance Criteria for C-01 through C-05**:
- [ ] For each pair, one file is deleted and all importers updated to canonical version
- [ ] Grep for root-level imports returns zero results
- [ ] All component tests pass after migration

---

### 1.4 Offline-First Architecture

**Actual**: Offline support exists only for chat messages (offlineMessageQueue.ts, 393 lines) and favorites (useFavoriteLocations, ~500 lines of queue logic). Both use completely different implementations. Posts, checkins, profile, location search, and regulars have zero offline support -- blank screens when offline.

**Expected**: Generic offline queue, TanStack Query persistence, and offline-aware UI states across all features.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| D-01 | Implement generic offline operation queue | Two independent queue implementations (393 + ~500 lines) | Single `OperationQueue<T>` with configurable TTL, max retries, conflict strategy | High | Medium (3-5d) |
| D-02 | Add read-through cache for posts feed | No caching; feed blank when offline | TanStack Query with `gcTime: Infinity` + AsyncStorage persister | High | Medium (3-4d) |
| D-03 | Add read-through cache for user profile | Profile fetched fresh on every auth event | Profile cached with `staleTime: 10min`; available offline | Medium | Small (1-2d) |
| D-04 | Queue checkin operations for offline execution | Checkins fail silently when offline | Queue checkin intent with GPS snapshot; execute when online | Medium | Medium (3-4d) |
| D-05 | Add offline indicator to all major screens | OfflineIndicator exists but not rendered in main screens | Persistent banner on Feed, Map, Chats, MySpots when offline | Low | Small (1-2d) |
| D-06 | Persist TanStack Query cache to AsyncStorage | No query persistence across app restarts | `@tanstack/query-async-storage-persister` for critical queries | High | Small (2d) |
| D-07 | Add offline-aware UI states to all data hooks | Hooks show generic error when offline | Each hook returns `isOffline` flag; components show cached vs empty states | Medium | Medium (3-4d) |

**Acceptance Criteria for D-01 (Generic Offline Queue)**:
- [ ] `lib/offline/OperationQueue.ts` with `enqueue()`, `process()`, `getCount()`, `clear()`
- [ ] Configurable: `maxQueueSize`, `maxRetries`, `ttlMs`, `conflictStrategy`
- [ ] `offlineMessageQueue.ts` refactored to use it (reduced from 393 to under 100 lines)
- [ ] Unit tests cover: enqueue, TTL expiry, max overflow, retry, persistence across restarts

---

### 1.5 New Architecture Migration (React Native)

**Actual**: App runs on Legacy Architecture (RN 0.81.5 + Expo SDK 54). `App.tsx` line 31 suppresses the Legacy Architecture warning. Legacy Architecture is frozen in RN 0.80 and removed in RN 0.82. Expo SDK 54 is the last to support it.

**Expected**: New Architecture (Fabric + TurboModules) enabled for upgrade path to Expo 55+ and future RN versions.

**Dependency Compatibility Assessment**:
All major dependencies (react-native-maps, gesture-handler, screens, safe-area-context, svg, webview, Sentry, AsyncStorage, NetInfo) are New Architecture compatible. The only unknown is the local `react-native-bitmoji` package.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| E-01 | Audit react-native-bitmoji for New Architecture compatibility | Custom local package; compatibility unknown | Audit report confirming legacy bridge API usage (if any) | Critical | Small (1-2d) |
| E-02 | Enable New Architecture in Expo build config | `newArchEnabled: false` (implicit) | Set `"newArchEnabled": true` in expo-build-properties; rebuild dev client | Critical | Small (1-2d) |
| E-03 | Port react-native-bitmoji to Fabric if needed | If package uses `requireNativeComponent`, it crashes on New Architecture | Fabric-compatible or confirmed JS-only | Critical (if blocking) | Medium-Large (3-10d) |
| E-04 | Remove Legacy Architecture LogBox suppression | Suppressed at App.tsx line 31 | Remove the `LogBox.ignoreLogs` call | Low | Trivial |
| E-05 | Regression test all screens on New Architecture | No testing performed | Full regression on iOS + Android with New Architecture | High | Medium (3-5d) |
| E-06 | Upgrade Expo SDK 54 to 55 | SDK 54 is last to support Legacy Architecture | Upgrade via `npx expo install --fix` | High | Medium (3-5d) |
| E-07 | Verify react-native-maps on Fabric renderer | Known performance differences on Fabric | Benchmark map rendering, markers, gestures; document regressions | Medium | Small (2d) |
| E-08 | Consolidate 63 SQL migrations to baseline | 63 files with incremental patches | Consolidated baseline for new environments | Low | Medium (3-4d) |

**Acceptance Criteria for E-02 (Enable New Architecture)**:
- [ ] `app.json` contains `expo-build-properties` with `newArchEnabled: true` for both platforms
- [ ] `npx expo prebuild --clean` succeeds
- [ ] Dev client builds on iOS and Android
- [ ] App launches and navigates to Feed without crash

---

## Section 2: Codebase Patterns & Technical Debt

### 2.1 Component Duplication

Five components exist in both root `components/` and `components/ui/` with different implementations. Root-level versions are HTML/web components (orphaned from Next.js), while `components/ui/` versions are the active React Native components.

| Component | Root File | UI File | Active Version |
|-----------|-----------|---------|---------------|
| Button | `components/Button.tsx` | `components/ui/Button.tsx` | ui/ (RN) |
| Badge | `components/Badge.tsx` | `components/ui/Badge.tsx` | ui/ (RN) |
| Skeleton | `components/Skeleton.tsx` | `components/ui/Skeleton.tsx` | ui/ (RN) |
| Avatar | `components/Avatar.tsx` | `components/ui/Avatar.tsx` | ui/ (RN) |
| EmptyState | `components/EmptyState.tsx` | `components/ui/EmptyState.tsx` | ui/ (RN) |

See C-01 through C-05 in Section 1.3 for resolution tasks.

### 2.2 Hook Architecture Anti-Patterns

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| H-1 | Create data access layer for hooks | 11+ hooks make direct `supabase` calls with no abstraction | Hooks use `repositories/` layer; Supabase calls centralized | High | High (20h) |
| H-2 | Standardize error handling in hooks | Some use string errors, some use `instanceof Error`, some silently fail. Zero hooks use `AppError`/`ERROR_CODES` from `lib/types.ts` | All hooks use consistent `useAsyncOperation` pattern or shared error handler mapping to `AppError` | High | High (16h) |
| H-3 | Decompose useFavoriteLocations (1652 lines) | 10+ catch blocks, CRUD, subscription, optimistic updates in one hook | Split into `useFavoritesList`, `useFavoritesCRUD`, `useFavoritesSubscription` | Medium | Medium (8h) |
| H-4 | Decompose useCheckin | Combines GPS, Supabase RPC, active state, auto-checkout, accuracy in one hook | Split GPS from DB operations; extract `useGPSPosition` | Medium | Medium (6h) |
| H-5 | Standardize hook return types | Inconsistent: `{ isLoading, error, data }` vs `{ loading, error }` vs different naming | Standard `{ data, isLoading, error, refetch? }` across all hooks | Medium | Medium (8h) |
| H-6 | Audit subscription cleanup in hooks | Only `useLiveCheckins` and `useLocation` show explicit cleanup | Every hook with subscriptions/timers has cleanup in useEffect return | High | Medium (6h) |
| H-7 | Consolidate useLocation vs useUserLocation | Two hooks for user location with overlapping functionality | Merge or clearly document distinct use cases | Low | Medium (4h) |

**Acceptance Criteria for H-1**:
- [ ] `repositories/` directory exists with typed functions for each entity
- [ ] No hook file imports `supabase` directly (except subscription-specific hooks)
- [ ] Unit tests can mock the data layer without mocking Supabase internals

### 2.3 Type System Consolidation

Types spread across 7+ files with duplications and conflicts:

| Duplicate | Location 1 | Location 2 | Issue |
|-----------|-----------|-----------|-------|
| `Coordinates` | `types/database.ts` | `lib/types.ts` | Identical shape, two definitions |
| `RootStackParamList` | `lib/types.ts` (simplified) | `navigation/types.ts` (proper nested) | **Incompatible structures** |
| `TabParamList` | `lib/types.ts` (3 tabs) | `navigation/types.ts` (5 tabs) | **Completely different tab list** |
| `CreatePostFormData` | `lib/types.ts` | `screens/CreatePost/types.ts` | Different fields |
| `MessageWithSender` | `types/database.ts` (optional sender) | `types/chat.ts` (required sender) | Different nullability |

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| T-1 | Remove duplicate Coordinates from lib/types.ts | Defined in both types/database.ts and lib/types.ts | Single source in types/database.ts; re-export only | Low | Low (1h) |
| T-2 | Remove stale navigation types from lib/types.ts | Conflicting RootStackParamList and TabParamList | Delete from lib/types.ts; canonical source is navigation/types.ts | High | Medium (4h) |
| T-3 | Reconcile CreatePostFormData | Two incompatible definitions | Single definition in screens/CreatePost/types.ts | Medium | Low (2h) |
| T-4 | Reconcile MessageWithSender | Optional vs required `sender` | Single definition with required `sender` in types/chat.ts | Medium | Medium (3h) |
| T-5 | Extract runtime constants from type files | CHAT_CONSTANTS, REPORT_REASONS, etc. mixed with types | Move to `constants/chat.ts`, `constants/location.ts`, etc. | Medium | Medium (4h) |
| T-6 | Delete or inline types/avatar.ts | 10-line re-export file | Inline at usage sites | Low | Low (0.5h) |
| T-7 | Reduce lib/types.ts to pure re-exports | Contains re-exports, app types, form types, nav types, error types | Reduce to re-exports only; move types to domain-appropriate files | Medium | Medium (4h) |

**Acceptance Criteria for T-2**:
- [ ] `lib/types.ts` does NOT export `RootStackParamList` or `TabParamList`
- [ ] All navigation type imports reference `navigation/types.ts`
- [ ] `npx tsc --noEmit` passes with zero errors

### 2.4 Error Handling Strategy

The codebase uses **four distinct error handling patterns** with no consistency:

1. **Result Object** `{ success, error, data? }` -- lib/favorites.ts, lib/supabase.ts
2. **Supabase-style** `{ data, error }` -- lib/conversations.ts
3. **captureException + return error** -- lib/accountDeletion.ts, lib/conversations.ts
4. **throw new Error** -- lib/storage.ts, lib/api/
5. **Silent failure / empty catch** -- SecureStoreAdapter, some hooks

`AppError` and `ERROR_CODES` are defined in `lib/types.ts` (14 error codes) but have **zero usages** anywhere in the codebase.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| E-1 | Create unified AppError class | AppError is an unused interface; 4+ ad-hoc patterns | AppError class with static factories: `.network()`, `.auth()`, `.validation()` | High | Medium (8h) |
| E-2 | Create toAppError utility | `err instanceof Error ? err.message : 'Unknown'` repeated 30+ times | Single `toAppError(err: unknown, context?: string): AppError` | High | Low (2h) |
| E-3 | Standardize lib function return types | 3+ return shapes across lib files | All return `Result<T> = { data: T; error: null } | { data: null; error: AppError }` | High | High (16h) |
| E-4 | Remove silent failures in SecureStoreAdapter | 3 empty catch blocks in auth token storage | Log with Sentry breadcrumbs; surface security issues | Medium | Low (2h) |
| E-5 | Connect ERROR_CODES to actual error handling | 14 codes defined, zero used | Hooks map Supabase errors to ERROR_CODES; UI switches on code | High | High (12h) |
| E-6 | Standardize Sentry integration | Only 4 files use captureException; most hooks do not | All unexpected errors call captureException consistently | Medium | Medium (6h) |

**Acceptance Criteria for E-1 through E-3**:
- [ ] `AppError` class at `lib/errors.ts` with `code`, `message`, `cause`
- [ ] `Result<T>` type alias exists
- [ ] All lib functions return `Promise<Result<T>>` (no throws)
- [ ] All hooks expose `error: AppError | null`
- [ ] `captureException` called for `'unknown'` or `'network/*'` codes

### 2.5 Migration & Schema Debt

**63 migration files** with two naming conventions and significant fix/patch debt:

- **35 files** using `NNN_description.sql` (legacy sequential)
- **28 files** using `YYYYMMDDHHMMSS_description.sql` (timestamped)
- **8 RLS fix migrations** with cascading patches
- **Test data in production migration** (`20260112110000_insert_test_location.sql`)

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| M-1 | Squash migrations for fresh deploys | 63 migrations, 11+ are fix/patches | Single baseline + post-squash migrations for new environments | Medium | High (16h) |
| M-2 | Standardize migration naming | Two conventions mixed | All new migrations use `YYYYMMDDHHMMSS_name.sql` | Low | Low (1h) |
| M-3 | Consolidate RLS policies | 8 files touch RLS with cascading fixes | Single consolidated reference in squashed baseline | Medium | Medium (8h) |
| M-4 | Audit for idempotency issues | Fix migrations may fail on already-fixed schemas | All use `IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS` | Medium | Medium (6h) |
| M-5 | Remove test data from migrations | Test fixture in production migration | Move to `supabase/seed.sql` | High | Low (1h) |

### 2.6 Test Infrastructure

Dual test runners: Vitest (`npm test`) and Jest (`npm run test:components`, dead script -- no jest.config.js exists). Coverage exclusion list is 113 lines long, excluding 60+ files. Tests cover orphaned web components while production RN components have zero coverage.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| TS-1 | Remove dead `test:components` Jest script | Script references Jest with no config | Remove dead script | Low | Low (0.5h) |
| TS-2 | Standardize test file locations | Tests in both co-located and root `__tests__/`; some duplicated | All tests co-located with source | Medium | Medium (4h) |
| TS-3 | Deduplicate vitest coverage exclusions | Duplicate entries in exclusion list | Remove duplicates; organize alphabetically | Low | Low (1h) |
| TS-4 | Reduce coverage exclusion surface | 60+ files excluded; real coverage unknown | Categorize exclusions; target 50% reduction in 3 months | High | High (ongoing) |
| TS-5 | Fix web-component test mismatch | Tests cover orphaned web components, not production RN components | Write tests for actual RN components in use | High | Medium (8h) |
| TS-6 | Resolve dual backgroundLocation test files | Two test files for same service in different locations | Keep one canonical file | Low | Low (1h) |

---

## Section 3: Code Quality & Consistency

### 3.1 File Size & Responsibility Analysis

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| CQ-101 | Split `backgroundLocation.ts` (796 lines) | 7 helpers, TaskManager, 8 exports, dwell state machine, Haversine, notifications, permissions, recovery | Separate: `dwellStateMachine.ts`, `locationPermissions.ts`, `locationNotifications.ts`, `locationHealthRecovery.ts`, `backgroundLocationTask.ts`, `backgroundLocationApi.ts` | Major | Large (8h) |
| CQ-102 | Split `lib/supabase.ts` (546 lines) | Client init + push tokens + post sorting | 3 files: `client.ts` (~130 lines), `pushTokens.ts` (~200 lines), `postSorting.ts` (~160 lines) | Major | Medium (4h) |
| CQ-103 | Split `AuthContext.tsx` (458 lines) | Auth state + profile + 5 auth ops + 3 profile ops + retry listener | Separate auth from profile: `AuthContext.tsx` (~200 lines), `hooks/useProfile.ts` (~150 lines) | Medium | Medium (5h) |
| CQ-104 | Extract components from `App.tsx` (359 lines) | OfflineQueueProcessor (85 lines), NotificationRegistration (68 lines), lazy loading, init logic | `App.tsx` (~80 lines), extracted components/hooks | Medium | Small (3h) |
| CQ-105 | Deduplicate Haversine (5 copies) | 5 separate implementations across codebase | Single implementation in `lib/utils/geo.ts` | Major | Medium (4h) |

### 3.2 Provider Architecture

Provider nesting is 6 levels deep. Levels 5-6 (`OfflineQueueProcessor`, `NotificationRegistration`) are not real providers -- they render `{children}` and only execute side effects. They should be hooks.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| CQ-201 | Convert OfflineQueueProcessor to hook | 85-line wrapper with dynamic supabase import, Alert calls | `useOfflineQueueProcessor()` hook | Medium | Small (2h) |
| CQ-202 | Convert NotificationRegistration to hook | 68-line wrapper polling notification availability | `useNotificationRegistration()` hook | Medium | Small (2h) |
| CQ-203 | Fix notification init race condition | 100ms setTimeout polling for async notification module | Promise-based pattern; consumers await rather than poll | Major | Small (2h) |
| CQ-204 | Remove dynamic `await import('./lib/supabase')` | Dynamic import in OfflineQueueProcessor; supabase already statically imported elsewhere | Static import at module top | Minor | Trivial (30m) |

**Post-cleanup provider tree**: GestureHandler > SafeArea > ErrorBoundary > AuthProvider > AppShell (hooks) > AppNavigator

### 3.3 Design System & Theming

Three competing style systems:
1. **`constants/theme.ts`** (442 lines) -- comprehensive tokens, imported by 39 files
2. **`constants/glassStyles.ts`** (383 lines) -- dark theme with hardcoded hex duplicating theme.ts values, imported by 35 files
3. **Inline hardcoded hex** -- `#FF6B47` appears 87 times across 44 files

Key conflict: `darkTheme.background` in glassStyles.ts is `#0F0F13`, but `darkModeColors.background` in theme.ts resolves to `#0C0A09` -- different colors for the same purpose.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| CQ-301 | Unify dark theme colors | Two competing dark color definitions with different values | Single `darkTheme` in theme.ts; glassStyles.ts imports from it | Major | Medium (5h) |
| CQ-302 | Replace hardcoded `#FF6B47` | 87 occurrences across 44 files | Zero hardcoded occurrences outside theme.ts; lint rule prevents regression | Medium | Medium (4h) |
| CQ-303 | Replace hardcoded dark background colors | `#0F0F13`, `#1C1C24` in non-constants files | All reference darkTheme tokens | Minor | Small (2h) |
| CQ-304 | Eliminate per-component COLORS objects | TermsModal, others define own color palettes | All import from centralized theme | Minor | Small (3h) |
| CQ-305 | Add lint rule for hardcoded color literals | No enforcement | ESLint rule warning on hex literals in .tsx outside constants/ | Medium | Small (2h) |

### 3.4 Code Organization

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| CQ-401 | Standardize hook colocation policy | Chat hooks in components/chat/hooks/, others in global hooks/, CreatePost in screens/ | Documented rule: single-feature hooks co-locate; multi-feature hooks in global hooks/ | Minor | Small (2h) |
| CQ-402 | Remove CSS module from RN project | `ChatScreen.module.css` in React Native project | Delete or move to /web directory | Minor | Trivial (30m) |
| CQ-403 | Standardize screen organization | CreatePost uses feature-folder; all others flat | Document convention; complex screens use folders, simple stay flat | Minor | Small (1h) |
| CQ-404 | Fix component directory naming | `LocationSearch/` uses PascalCase; 12 others use lowercase | Rename to match existing lowercase convention | Minor | Trivial (30m) |
| CQ-405 | Standardize barrel exports | Inconsistent across directories | Pick one convention and apply | Minor | Small (2h) |

### 3.5 Import & Dependency Hygiene

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| CQ-501 | Remove dynamic import of supabase in OfflineQueueProcessor | `await import('./lib/supabase')` in useEffect; supabase already statically available | Static import | Medium | Trivial (15m) |
| CQ-502 | Replace module-level mutable state for notifications | `let Notifications = null; let notificationsAvailable = false` at module scope | Promise-based lazy initializer singleton | Major | Small (2h) |
| CQ-503 | Remove require() in MapView | `require('react-native-maps')` in TypeScript/ESM codebase | Convert to import statement | Minor | Small (1h) |
| CQ-504 | Eliminate module-level side effects in App.tsx | initSentry(), initializeAnalytics(), initializeNotifications(), AppState.addEventListener all at module scope | Move into useEffect hooks or useAppInitialization() | Medium | Medium (3h) |
| CQ-505 | Add AppState listener cleanup | addEventListener at module level, never removed | Move to useEffect with cleanup return | Minor | Trivial (15m) |
| CQ-506 | Add tracking issue for LogBox suppression | Suppression with no linked issue | Add TODO with issue number for New Architecture migration | Minor | Trivial (15m) |

---

## Section 4: Performance Architecture

### 4.1 Data Fetching & Caching

**Impact**: 15+ data-fetching hooks fire on mount. A 10-minute session generates 45-75 redundant Supabase API calls. `useLocationRegulars` fires 3 sequential Supabase calls per invocation.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| P-4.1.1 | Introduce TanStack Query as server-state caching layer | No caching; every mount = fresh network call | All data via `useQuery`/`useMutation` with staleTime, gcTime, deduplication | **Critical** | Large (3-5d) |
| P-4.1.2 | Migrate useTieredPosts | Direct `supabase.rpc` on every mount | `useQuery(['tieredPosts', locationId])` with 30s staleTime | **High** | Medium (0.5d) |
| P-4.1.3 | Migrate useRegulars (3 hooks) | 3 hooks making independent calls | Shared query keys per location/user | **High** | Medium (0.5d) |
| P-4.1.4 | Migrate useNearbyPosts | Fresh RPC per mount with client-side fallback | Cached per `[lat, lon, radius]` key | **High** | Small (0.5d) |
| P-4.1.5 | Migrate useProfilePhotos | Manual refetch on subscription events | `useQuery` with invalidation on realtime events | **Medium** | Small (0.5d) |
| P-4.1.6 | Extract manual cache from useFavoriteLocations | 400+ lines of hand-rolled cache/queue logic | TanStack Query `persistQueryClient` + `useMutation` | **Medium** | Medium (1d) |
| P-4.1.7 | Deduplicate Haversine (4 copies) | 4 independent implementations | Single shared `geo.ts` utility | **Low** | Small (0.5d) |

### 4.2 Realtime Subscription Management

7+ independent Supabase Realtime channels with no centralized management. `useTypingIndicator` creates duplicate channels on the same name.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| P-4.2.1 | Create centralized RealtimeManager | 7+ independent `supabase.channel()` calls | Single manager that tracks, reuses, reference-counts channels | **High** | Medium (2d) |
| P-4.2.2 | Fix duplicate typing channel | Two channel instances on same `typing:${conversationId}` name | Single channel for subscribe and broadcast | **High** | Small (0.5d) |
| P-4.2.3 | Merge chat channels per conversation | 3 separate channels per conversation | Single `chat:${conversationId}` with postgres_changes + broadcast + presence | **Medium** | Medium (1d) |
| P-4.2.4 | Add subscription cleanup on sign-out | No centralized cleanup after signOut() | `RealtimeManager.disconnectAll()` in signOut callback | **Medium** | Small (0.5d) |
| P-4.2.5 | Add connection health monitoring | Silent failures if WebSocket disconnects | Health check with reconnection; status exposed to UI | **Low** | Medium (1d) |

### 4.3 Rendering Performance

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| P-4.3.1 | Enable lazy tab loading | All 5 tabs mount eagerly | `lazy: true` in tab screenOptions | **High** | Trivial (10m) |
| P-4.3.2 | Split AuthContext into State + Actions | Single context with 13 values; any change re-renders all consumers | `AuthStateContext` + `AuthActionsContext` (actions never change reference) | **High** | Medium (1d) |
| P-4.3.3 | Add getItemLayout to FeedScreen FlatList | No getItemLayout; degraded scroll perf | Fixed or estimated item height for O(1) scroll offset | **Medium** | Small (0.5d) |
| P-4.3.4 | Debounce location-triggered data fetches | useNearbyPosts refetches on every GPS update | Minimum 20m distance threshold before triggering | **Medium** | Small (0.5d) |
| P-4.3.5 | Remove unused @tanstack/react-virtual | Listed in package.json, never imported | `npm uninstall @tanstack/react-virtual` | **Low** | Trivial (5m) |
| P-4.3.6 | Add React.memo to list item components | No memoization on PostCard or MessageBubble | `React.memo` with custom comparator on `id` + `updated_at` | **Medium** | Small (0.5d) |

### 4.4 Image & Asset Performance

No image caching library installed. Profile photos rendered via RN's `<Image>` with Supabase signed URLs -- re-downloaded on every mount. 20 conversations = 1-4MB redundant traffic per tab switch.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| P-4.4.1 | Replace `<Image>` with expo-image | No disk/memory cache; re-downloads every mount | `expo-image` with 100MB disk cache, blur-up placeholders | **High** | Medium (1-2d) |
| P-4.4.2 | Cache signed URLs | Generated per request, expire frequently | Cache URLs with TTL slightly less than expiry | **Medium** | Small (0.5d) |
| P-4.4.3 | Add image compression before upload | Raw images uploaded without optimization | Max 1024px, JPEG quality 0.7 before upload | **Medium** | Small (0.5d) |
| P-4.4.4 | Prefetch avatars for chat list | Each ChatCard independently loads its avatar | Batch-prefetch visible avatar URLs on data arrival | **Low** | Small (0.5d) |

### 4.5 Bundle Size & Dependency Audit

The app is a genuine hybrid: Next.js 15.5.9 web app (10 pages in `app/`) coexists with Expo mobile app.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| P-4.5.1 | Audit Next.js / Expo boundary | 10 Next.js pages coexist with Expo; unclear shared vs platform-specific | Document boundary; consider monorepo workspace split | **High** | Medium (1-2d) |
| P-4.5.2 | Evaluate GraphQL dependency weight | `graphql` + `graphql-request` (~180KB) used only by meetup.ts | Replace with plain fetch or move to edge function | **Medium** | Small (0.5d) |
| P-4.5.3 | Remove unused @tanstack/react-virtual | Never imported | Uninstall | **Low** | Trivial |
| P-4.5.4 | Verify react-native-webview usage | Heavy native module (~2MB on iOS) | Audit; if only legal pages, replace with expo-web-browser | **Medium** | Small (0.5d) |
| P-4.5.5 | Run expo-doctor and depcheck | No automated dependency audit | Add to CI pipeline | **Low** | Small (0.5d) |
| P-4.5.6 | Consolidate to single test runner | Both vitest and jest configured | Standardize on vitest or jest-expo | **Low** | Medium (1-2d) |

### 4.6 Background Service Optimization

Per-update flow involves 3-4 AsyncStorage I/O + 1 Supabase network call every 2 minutes. Coordinate precision (2 decimal = ~1.1km) mismatches the 200m search radius.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| P-4.6.1 | Reduce AsyncStorage I/O per update | 3-4 read/write ops per cycle | Cache settings in module-level variable; re-read only on change | **High** | Small (0.5d) |
| P-4.6.2 | Fix coordinate precision vs search radius mismatch | 2 decimal places (~1.1km) but 200m search radius | 4 decimal places (~11m) for search; 2 decimal for storage only | **High** | Small (0.5d) |
| P-4.6.3 | Batch location updates | Each update triggers full cycle | Process only latest per batch; skip if user hasn't moved beyond threshold | **Medium** | Medium (1d) |
| P-4.6.4 | Replace verifySettingsUnchanged double-read | Settings read twice per cycle | Module-level version counter; compare instead of re-read | **Medium** | Small (0.5d) |
| P-4.6.5 | Add battery impact telemetry | No measurement | Track via Sentry performance monitoring | **Low** | Small (0.5d) |
| P-4.6.6 | Fix AppState listener leak | addEventListener at module scope, never cleaned up | Move to useEffect with cleanup | **Low** | Trivial (15m) |

---

## Section 5: Security & Compliance

### 5.1 Data Protection (GDPR/Privacy)

**Critical**: Location-containing data (dwell state, offline messages) stored as plaintext JSON in AsyncStorage -- extractable on rooted/jailbroken devices. Auth tokens are properly encrypted in SecureStore, but other sensitive data is not.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| DP-01 | Migrate dwell state from AsyncStorage to SecureStore | Lat/lon, userId, locationId plaintext in AsyncStorage | All location data encrypted at rest via SecureStore | **Critical** | Medium (2-3d) |
| DP-02 | Encrypt offline message queue | Chat content, sender IDs plaintext in AsyncStorage | Messages encrypted before persistence; decrypted on processing | **Critical** | Medium (2-3d) |
| DP-03 | Apply precision reduction to data export | `exportUserData` returns raw lat/lon | Exported coordinates reduced to 2 decimal places | **High** | Low (1d) |
| DP-04 | Implement automated location data retention | No scheduled purge; cleanup is user-triggered only | pg_cron auto-purges beyond retention period | **High** | Medium (2-3d) |
| DP-05 | Encrypt tracking settings | userId + preferences plaintext in AsyncStorage | Migrate to SecureStore | **Medium** | Low (1d) |
| DP-06 | Add data processing consent tracking | No consent timestamp/version tracking | Record consent per GDPR Article 7; re-consent on policy changes | **Medium** | Medium (3-4d) |
| DP-07 | Purge server-side location on tracking disable | stopBackgroundLocationTracking clears local state only | Also invoke server-side cleanup | **Medium** | Low (1-2d) |

**Acceptance Criteria for DP-01**:
- [ ] Dwell state stored via SecureStore, encrypted at rest
- [ ] Migration clears old AsyncStorage dwell data on app update
- [ ] AsyncStorage.setItem never called with DWELL_STATE_KEY
- [ ] SecureStore 2KB limit respected (dwell state is ~200 bytes)

### 5.2 Authentication Hardening

**Working well**: SecureStore for sessions, `detectSessionInUrl: false`, autoRefreshToken, custom JWT hook, password validation (min 8, max 128).

**Gaps**: No MFA, no brute-force protection, no OAuth/social login, weak passwords accepted (`strength === 'weak'` passes validation), no session invalidation on password change, no biometric auth.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| AU-01 | Implement Supabase MFA (TOTP) | Email/password only | TOTP via Supabase Auth MFA API; enrolled via Settings | **Critical** | High (5-7d) |
| AU-02 | Add client-side auth rate limiting | No throttling on login/signup | Exponential backoff after 5 failures; 15-min lockout after 10 | **High** | Low (1-2d) |
| AU-03 | Reject weak passwords | `isValid: true` for `strength === 'weak'` | Require minimum `fair` strength | **High** | Low (0.5d) |
| AU-04 | Add biometric app lock | No biometric auth for re-entry | Optional via `expo-local-authentication` | **Medium** | Medium (3-4d) |
| AU-05 | Invalidate sessions on password change | No session revocation | `signOut({ scope: 'others' })` after password change | **Medium** | Low (1d) |
| AU-06 | Add OAuth social login | No providers configured | Apple Sign-In (required for iOS) + Google Sign-In | **Medium** | High (5-7d) |
| AU-07 | Implement account lockout detection | No brute-force detection | Server-side tracking; temporary lockout after threshold | **Medium** | Medium (3-4d) |

### 5.3 API & Network Security

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| NS-01 | Implement SSL certificate pinning | Standard HTTPS without pinning | Pin Supabase TLS certificates; fail-closed on mismatch | **High** | Medium (3-4d) |
| NS-02 | Remove dev scheme CORS in production | `exp://` and `backtrack://` allowed regardless of environment | Only allow dev origins when `isProduction === false` | **High** | Low (0.5d) |
| NS-03 | Remove SSH credentials from version control | MAC SSH password plaintext in CLAUDE.md in git | Rotate immediately; move to .env; add to .gitignore; add pre-commit hook | **Critical** | Low (1d) |
| NS-04 | Add Supabase client request timeouts | No fetch timeout or AbortController | 15s default, 30s for uploads via client options | **Medium** | Low (1d) |
| NS-05 | Extend rate limiting to all edge functions | Only moderate-image has rate limiting | Apply `check_rate_limit` to all user-facing RPCs | **Medium** | Medium (3-4d) |
| NS-06 | Implement request replay protection | No nonce/timestamp validation | Timestamp + nonce for critical operations; reject replays > 5min | **Low** | Medium (3-4d) |

**Acceptance Criteria for NS-03**:
- [ ] No secrets in CLAUDE.md
- [ ] Mac SSH password rotated
- [ ] Credentials in .env (listed in .gitignore)
- [ ] Pre-commit hook prevents future credential commits

### 5.4 Content Safety

**Working well**: Image moderation via Google Vision SafeSearch, block/report system, text sanitization, input validation, message tampering prevention via DB trigger.

**Gaps**: No real-time text moderation for chat, image rate limit uses `photo_id` not `user_id`, client-side SQL injection regex is fragile and unnecessary (Supabase uses parameterized queries), no automated report escalation, no CSAM detection.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| CS-01 | Add server-side text content moderation | Chat messages stored without text moderation | Edge function or trigger checking toxicity API | **High** | High (5-7d) |
| CS-02 | Fix rate limit key in moderate-image | Uses `photo_id` instead of user ID | Use authenticated user's UUID as rate limit key | **High** | Low (0.5d) |
| CS-03 | Remove client-side SQL injection regex | Strips common words like "select", "table" | Remove; rely on Supabase parameterized queries | **Medium** | Low (0.5d) |
| CS-04 | Implement automated report escalation | Reports stored with no alerting | Webhook/email on threshold (3+ reports = review) | **Medium** | Medium (2-3d) |
| CS-05 | Add CSAM detection for photo sharing | Google Vision only; no hash matching | PhotoDNA or equivalent for app store compliance | **Medium** | High (5-7d) |
| CS-06 | Add URL/link detection in chat | No link scanning | Detect and optionally block URLs to prevent phishing | **Low** | Medium (2-3d) |

### 5.5 Dependency & Supply Chain Security

No `npm audit` or Snyk in CI. No Dependabot/Renovate. No lockfile integrity enforcement. Local `react-native-bitmoji` bypasses npm integrity checks.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| SC-01 | Add automated dependency vulnerability scanning | No scanning in CI | `npm audit --production` in CI + Dependabot | **High** | Low (1d) |
| SC-02 | Audit react-native-webview usage | Heavy module; potential XSS if loading untrusted URLs | Audit all usage; ensure safe defaults | **High** | Medium (2-3d) |
| SC-03 | Remove unused graphql dependencies | Installed but possibly unused | Remove to reduce attack surface | **Medium** | Low (0.5d) |
| SC-04 | Audit local react-native-bitmoji package | Local `file:` dependency bypasses npm integrity | Review; consider private registry | **Medium** | Medium (2-3d) |
| SC-05 | Configure automated dependency updates | No Dependabot/Renovate | Add `.github/dependabot.yml` | **Medium** | Low (0.5d) |
| SC-06 | Enforce lockfile integrity in CI | No `npm ci` enforcement | Use `npm ci` in CI builds | **Low** | Low (0.5d) |

### 5.6 RLS Policy Audit

8 separate RLS fix migrations indicate policies were not comprehensively designed. Security audit migration (`20251231210000`) found critical gaps: rejected photos exposed, message tampering possible, missing RLS on multiple tables.

| ID | Task | Actual | Expected | Severity | Effort |
|----|------|--------|----------|----------|--------|
| RL-01 | Full RLS coverage audit | 8 reactive fixes; unclear if all tables covered | Script enumerating all tables + verifying RLS enabled + policies exist | **Critical** | Medium (3-4d) |
| RL-02 | Add RLS integration tests to CI | conversations.rls.test.ts exists but no CI enforcement | Automated tests against Supabase local dev covering all tables | **High** | High (5-7d) |
| RL-03 | Optimize message rate limit RLS | COUNT(*) subquery on every INSERT | Indexed materialized counter or existing `check_rate_limit` pattern | **Medium** | Medium (2-3d) |
| RL-04 | Make check_rate_limit generic | Hardcodes `'moderate-image'` endpoint | Accept endpoint parameter; reusable for all rate-limited operations | **Medium** | Low (1d) |
| RL-05 | Add bidirectional block check to posts RLS | Profiles have blocker check; unclear if posts/checkins filter | Verify and add block checks to all user-visible content | **High** | Medium (3-4d) |
| RL-06 | Create RLS policy documentation | Policies across 8+ files; no consolidated view | Maintained policy matrix (table x operation x conditions) | **Medium** | Medium (2-3d) |
| RL-07 | Audit DELETE policies | DELETE policies not consistently present | Every user-data table has explicit DELETE policies | **High** | Medium (2-3d) |

---

## Cross-Cutting Priority Roadmap

### Phase 0 -- Immediate (Week 1): Security Critical
| Task | Section | Effort |
|------|---------|--------|
| NS-03: Remove SSH credentials from git | 5.3 | 1d |
| DP-01: Encrypt dwell state | 5.1 | 2-3d |
| DP-02: Encrypt offline messages | 5.1 | 2-3d |
| CS-02: Fix rate limit key | 5.4 | 0.5d |
| AU-03: Reject weak passwords | 5.2 | 0.5d |
| NS-02: Fix production CORS | 5.3 | 0.5d |
| P-4.3.1: Enable lazy tab loading | 4.3 | 10min |
| P-4.6.2: Fix coordinate precision mismatch | 4.6 | 0.5d |

### Phase 1 -- Foundation (Weeks 2-3): Cleanup & Deduplication
| Task | Section | Effort |
|------|---------|--------|
| A-05, A-06, A-07: Decompose supabase.ts, consolidate Haversine | 1.1 | 3d |
| C-01 through C-05: Resolve 5 duplicate components | 1.3 | 3d |
| T-2: Remove stale navigation types | 2.3 | 0.5d |
| M-5: Remove test data from migrations | 2.5 | 0.5d |
| TS-1: Remove dead Jest script | 2.6 | 0.5h |
| SC-01: Add dependency scanning to CI | 5.5 | 1d |
| RL-01: Full RLS coverage audit | 5.6 | 3-4d |

### Phase 2 -- Data Layer (Weeks 4-6): TanStack Query + Repositories
| Task | Section | Effort |
|------|---------|--------|
| B-01, B-08: Install TanStack Query + Provider | 1.2 | 1d |
| A-01, A-02, A-03: Extract repositories | 1.1 | 7-10d |
| E-1, E-2: AppError class + toAppError utility | 2.4 | 10h |
| P-4.2.2: Fix duplicate typing channel | 4.2 | 0.5d |
| P-4.4.1: Replace Image with expo-image | 4.4 | 1-2d |

### Phase 3 -- State Management Migration (Weeks 7-10)
| Task | Section | Effort |
|------|---------|--------|
| B-02 through B-07: Migrate hooks to TanStack Query | 1.2 | 10-15d |
| B-09: Centralize Realtime subscriptions | 1.2 | 3-4d |
| D-06: Persist query cache to AsyncStorage | 1.4 | 2d |
| P-4.3.2: Split AuthContext | 4.3 | 1d |
| CQ-201, CQ-202: Convert wrappers to hooks | 3.2 | 4h |

### Phase 4 -- Offline Architecture (Weeks 10-12)
| Task | Section | Effort |
|------|---------|--------|
| D-01: Generic offline operation queue | 1.4 | 3-5d |
| D-02, D-03: Read-through caches | 1.4 | 4-5d |
| D-04, D-05, D-07: Offline checkins, indicators, UI states | 1.4 | 6-8d |

### Phase 5 -- Module Restructuring (Weeks 12-15)
| Task | Section | Effort |
|------|---------|--------|
| C-06 through C-11: Feature modules + dependency rules | 1.3 | 15-20d |
| CQ-301, CQ-302: Unify theme + replace hardcoded colors | 3.3 | 9h |

### Phase 6 -- New Architecture (Weeks 15-18)
| Task | Section | Effort |
|------|---------|--------|
| E-01: Audit react-native-bitmoji | 1.5 | 1-2d |
| E-02: Enable New Architecture | 1.5 | 1-2d |
| E-03: Port bitmoji to Fabric (if needed) | 1.5 | 3-10d |
| E-05: Full regression testing | 1.5 | 3-5d |
| E-06: Upgrade Expo SDK 54 to 55 | 1.5 | 3-5d |

### Phase 7 -- Security Hardening (Ongoing, parallel with Phases 3-6)
| Task | Section | Effort |
|------|---------|--------|
| AU-01: MFA implementation | 5.2 | 5-7d |
| AU-06: OAuth social login | 5.2 | 5-7d |
| RL-02: RLS integration tests in CI | 5.6 | 5-7d |
| CS-01: Server-side text moderation | 5.4 | 5-7d |
| NS-01: Certificate pinning | 5.3 | 3-4d |
| P-4.2.1: RealtimeManager service | 4.2 | 2d |

---

*Report generated by 5 specialized architecture review agents analyzing the Backtrack codebase.*
