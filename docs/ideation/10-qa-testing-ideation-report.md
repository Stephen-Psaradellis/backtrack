# Backtrack QA & Testing Ideation Report

**Date:** 2026-02-09
**Team:** 4-agent QA ideation swarm (Coverage Researcher, Test Quality Analyst, Strategy Reviewer, Code Testability Auditor)
**App:** Backtrack - Location-based anonymous matchmaking (React Native / Expo SDK 54 / Supabase)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Testing Maturity Assessment](#testing-maturity-assessment)
3. [Coverage Gap Analysis](#coverage-gap-analysis)
4. [Test Quality Review](#test-quality-review)
5. [Code Testability Audit](#code-testability-audit)
6. [Test Strategy Assessment](#test-strategy-assessment)
7. [Consolidated Task List](#consolidated-task-list)
8. [Execution Roadmap](#execution-roadmap)

---

## Executive Summary

Four specialized agents conducted a comprehensive audit of Backtrack's QA and testing posture across ~170 production source files, ~120 test files (~9,500 lines of test code), 39 SQL migrations, and 31 Maestro E2E flows. The project has **strong hook-level unit test coverage (96%)** but severe systemic gaps that create a false sense of quality.

### Top 3 Systemic Issues

| # | Issue | Impact | Source |
|---|-------|--------|--------|
| 1 | **Artificially inflated coverage** -- ~60+ production files and 5 entire directories (`screens/`, `services/`, `contexts/`, `navigation/`, `supabase/functions/`) are excluded from coverage metrics. Real coverage is ~56% of production code, not the reported 83-94%. | Critical -- Quality gates are decorative | Coverage Researcher |
| 2 | **Zero database-level testing** -- 39 SQL migrations define RLS policies, RPC functions, and triggers. None are validated against a real database. The `conversations.rls.test.ts` file contains 7 tests that are ALL `expect(true).toBe(true)` placeholders. | Critical -- Security policies are unverified | Test Quality Analyst, Strategy Reviewer |
| 3 | **Monolithic untestable architecture** -- ChatScreen (1,379 lines), ChatListScreen (742 lines, N+1 query), and AuthContext (458 lines) contain inline hooks, hardcoded Supabase imports, and module-scope side effects that prevent isolation testing. | Critical -- Core flows cannot be meaningfully tested | Code Testability Auditor |

### Quality Scorecard

| Dimension | Score | Key Gap |
|-----------|-------|---------|
| Overall Testing Maturity | 2.5/5 | Reactive, no test-first culture |
| Coverage Accuracy | 3/10 | Metrics exclude ~45% of production code |
| Test Quality (existing tests) | 6.5/10 | Good patterns in some files; placeholders and anti-patterns in others |
| Code Testability | 6.2/10 | Pure utility modules excellent; screens/services untestable |
| Test Infrastructure | 3/10 | No factories, no shared mocks, dual framework, broken E2E config |
| Security Testing | 1/10 | Placeholder RLS tests, no security scanning in CI |
| E2E Automation | 2/10 | 31 Maestro flows exist but are not in CI |
| CI/CD Quality Gates | 3/10 | Coverage upload informational only, no enforcement |

---

## Testing Maturity Assessment

**Overall Maturity Level: 2.5 / 5** (Reactive)

| Level | Description | Status |
|-------|-------------|--------|
| Level 1: Ad-hoc | Tests exist but are inconsistent | Passed |
| Level 2: Managed | Unit tests cover most modules | Passed |
| **Level 2.5: Current** | Good unit tests but gaps in integration/E2E | **Here** |
| Level 3: Defined | Full pyramid with CI enforcement | Not yet |
| Level 4: Measured | Coverage-driven, regression-aware | Not yet |
| Level 5: Optimizing | Continuous quality improvement | Not yet |

---

## Coverage Gap Analysis

### Module Coverage Matrix

| Module Area | Source Files | Tested | % Tested | Coverage Tracked | Critical Gap |
|-------------|-------------|--------|----------|-----------------|--------------|
| Screens | 15 + CreatePost (24) | 3 | 13% | NO | 12 screens untested including ChatScreen (42KB), ProfileScreen (46KB) |
| Hooks | 28 | 27 | 96% | Partial (6 excl.) | Only useLiveCheckins untested |
| Services | 3 | 3 | 100% | NO | Invisible to metrics |
| Lib (core) | 17 | 16 | 94% | Partial (5 excl.) | gpsConfig untested |
| Lib (sub-dirs) | 12 | 11 | 92% | Partial | mock-profile-photos untested |
| Components (root) | 27 | 2 | 7% | Mostly excluded (20/27) | 25 components untested |
| Components (chat) | 18 | 14 | 78% | Partial (8 excl.) | SharePhotoModal (31KB) untested |
| Components (ui) | 12 | 9 | 75% | NO | BacktrackLogo, Icons untested |
| Components (other) | 31 | 5 | 16% | Nearly all excluded | onboarding (7 files), settings (2), favorites (4) untested |
| Contexts | 1 | 1 | 100% | NO | AuthContext tested but untracked |
| Navigation | 1 | 1 | 100% | NO | Tested but untracked |
| Edge Functions | 4 | 2 | 50% | NO | send-match-notification, send-spark-notification untested |
| SQL Migrations | 39 | 0 | 0% | NO | Zero database-level tests |
| App Root | 1 | 0 | 0% | NO | App.tsx untested |
| **TOTAL** | **~170** | **~95** | **~56%** | **~45% of code measured** | |

### Critical Untested Files (by risk)

| Priority | File | Size | Risk Level | Why It Matters |
|----------|------|------|------------|----------------|
| P0 | `screens/ChatScreen.tsx` | 42KB / 1,379 lines | Critical | Primary messaging surface, inline hooks, Realtime subscriptions |
| P0 | `screens/ProfileScreen.tsx` | 46KB | Critical | Largest file in codebase, user profile management |
| P0 | `screens/AuthScreen.tsx` | 22KB | Critical | Authentication entry point for all users |
| P0 | `lib/utils/gpsConfig.ts` | 7KB | Critical | Controls GPS accuracy/intervals -- affects battery + data quality |
| P0 | `supabase/functions/send-match-notification/` | 10KB | Critical | Match notification delivery -- silent failures = missed matches |
| P0 | `supabase/functions/send-spark-notification/` | 10KB | Critical | Spark notification delivery |
| P1 | `screens/ChatListScreen.tsx` | 23KB | High | N+1 query problem (80-100 DB queries), zero tests |
| P1 | `components/chat/SharePhotoModal.tsx` | 31KB | High | Largest untested chat component, photo uploads |
| P1 | `components/ReportModal.tsx` | 20KB | High | User-facing content moderation UI |
| P1 | `components/ErrorBoundary.tsx` | 14KB | High | Production crash recovery |
| P1 | `screens/CreatePost/useCreatePostForm.ts` | 21KB | High | Core post creation logic, zero tests |
| P2 | `components/onboarding/` | 7 files | Medium | New user experience, zero component tests |
| P2 | `components/settings/LocationTrackingSettings.tsx` | - | Medium | Location toggle UI |
| P2 | `hooks/useLiveCheckins.ts` | 7KB | Medium | Only hook with zero tests |

### Duplicate Test Files (11 modules)

These modules have test files in BOTH co-located `__tests__/` and root `__tests__/` directories:

| Module | File 1 | File 2 |
|--------|--------|--------|
| useNotificationSettings | `hooks/__tests__/` | `__tests__/hooks/` |
| useOnboardingState | `hooks/__tests__/` | `__tests__/hooks/` |
| usePhotoSharing | `hooks/__tests__/` | `__tests__/hooks/` |
| useTutorialState | `hooks/__tests__/` | `__tests__/hooks/` |
| photoSharing | `lib/__tests__/` | `__tests__/lib/` |
| profilePhotos | `lib/__tests__/` | `__tests__/lib/` |
| validation | `lib/__tests__/` | `__tests__/lib/` |
| geo utils | `lib/utils/__tests__/` | `__tests__/lib/utils/` |
| backgroundLocation | `services/__tests__/` | `__tests__/services/` |
| Button | `components/ui/__tests__/` | `__tests__/components/ui/` |
| Input | `components/ui/__tests__/` | `__tests__/components/ui/` |

---

## Test Quality Review

### Suite Quality Score: 6.5/10

**23 test files analyzed (~9,500 lines of test code)**

### Top-Tier Tests (8-10/10)

| File | Score | Strengths |
|------|-------|-----------|
| `__tests__/lib/validation.test.ts` | 10/10 | Pure unit tests, comprehensive boundary testing, security edge cases (SQL injection, XSS payloads) |
| `lib/utils/__tests__/sanitize.test.ts` | 9/10 | Unicode attack vectors, RTL override, zero-width characters, homoglyph detection |
| `components/chat/__tests__/ChatInput.test.tsx` | 9/10 | Accessibility testing with aria attributes, proper async handling |
| `components/chat/hooks/__tests__/useBlockUser.test.ts` | 9/10 | Controlled promise resolution, 5 distinct error scenarios, proper cleanup |
| `lib/__tests__/offlineMessageQueue.test.ts` | 8/10 | Queue size limits, message expiration, proper error reporting |

### Critical Quality Issues

#### Issue 1: Placeholder RLS Tests (Score 1/10)
**File:** `lib/__tests__/conversations.rls.test.ts`
- ALL 7 tests are `expect(true).toBe(true)` placeholders
- Test descriptions say "critical for privacy and security" but assertions are empty
- This file creates a false sense that RLS policies are tested

#### Issue 2: Mixed Jest/Vitest API
- 5+ test files use `jest.mock()` under Vitest, relying on a fragile compatibility shim at `vitest.setup.ts` line 20 (`globalThis.jest = vi`)
- Creates confusion about which API is canonical

#### Issue 3: Coverage Inflation
- ~60+ files excluded from coverage in `vitest.config.ts` lines 54-167
- The 83/93/94% thresholds measure only ~30-40% of the actual codebase
- Comments in config suggest files were excluded because they are "hard to test"

#### Issue 4: Integration Tests Masquerading as Unit Tests
- `lib/__tests__/gdprCompliance.test.ts` appears to create real Supabase users
- `components/chat/hooks/__tests__/rateLimiting.stress.test.ts` has 61-second sleeps hitting a real database
- These will cause CI failures in environments without network access

### Common Anti-Patterns Found

| Pattern | Occurrences | Impact | Example |
|---------|-------------|--------|---------|
| `expect(true).toBe(true)` placeholders | 7+ tests | False confidence | `conversations.rls.test.ts` |
| Silent error swallowing in source code | 12+ `catch {}` blocks | Untestable error paths | `ChatScreen.tsx:249`, `useSendMessage.ts:201` |
| `eslint-disable react-hooks/exhaustive-deps` | 12 instances | Potential stale closure bugs | `ChatScreen.tsx:879`, `ChatListScreen.tsx:377` |
| Unguarded `as` type assertions | 6+ instances | Runtime shape mismatch risk | `ChatScreen.tsx:204`, `AuthContext.tsx:146` |
| Module-level side effects | 3+ files | Import-time execution blocks testing | `App.tsx:82,96,112`, `backgroundLocation.ts:335` |

### Best Practices Already in Use (to replicate)

| Practice | Example File | Description |
|----------|-------------|-------------|
| Comprehensive boundary testing | `validation.test.ts` | Tests min/max, empty, null, unicode, SQL injection |
| Controlled promise resolution | `useBlockUser.test.ts` | Uses deferred promises for async flow control |
| `testID` attributes | `ChatBubble.tsx`, `ChatScreen.tsx`, `HomeScreen.tsx` | Enables E2E test targeting |
| Runtime type guards | `backgroundLocation.ts:319` | `isValidNearbyLocation()` validates before casting |
| Pure utility extraction | `sanitize.ts`, `gpsConfig.ts` | Injectable params, no side effects, 9/10 testability |
| Exported test helpers | `sentry.ts` | `redactSensitiveData` exported specifically for testing |

---

## Code Testability Audit

### File-by-File Testability Scores

| File | Lines | Score | Key Issues |
|------|-------|-------|------------|
| `lib/utils/sanitize.ts` | 242 | **9/10** | Pure functions, no side effects, highly testable |
| `lib/utils/gpsConfig.ts` | 227 | **9/10** | Pure functions, injectable config, no side effects |
| `components/ChatBubble.tsx` | 757 | **8/10** | Memo'd, pure utilities, testIDs |
| `screens/AvatarCreatorScreen.tsx` | 380 | **7/10** | Clean, delegates to hooks |
| `screens/HomeScreen.tsx` | 150 | **7/10** | Small, focused, testIDs |
| `lib/offlineMessageQueue.ts` | 393 | **7/10** | Good validation, clean types |
| `lib/sentry.ts` | 506 | **7/10** | Exported test helpers, `__DEV__` branching |
| `lib/accountDeletion.ts` | 341 | **6/10** | Clean API but hardcoded supabase |
| `lib/dataExport.ts` | 188 | **6/10** | Clean but hardcoded supabase, loose types |
| `components/chat/hooks/useSendMessage.ts` | 649 | **6/10** | Good structure, but supabase in dep array |
| `hooks/useCheckin.ts` | 363 | **5/10** | Mixed pure/impure, duplicated utility |
| `hooks/useCheckinSettings.ts` | 250 | **5/10** | Tight coupling to backgroundLocation |
| `services/backgroundLocation.ts` | 796 | **5/10** | Good structure, hardcoded deps |
| `contexts/AuthContext.tsx` | 458 | **4/10** | Monolithic, 12 deps in useMemo, re-renders all |
| `screens/ChatScreen.tsx` | 1,379 | **3/10** | 3 inline hooks, hardcoded supabase, untestable |
| `screens/ChatListScreen.tsx` | 742 | **3/10** | N+1 queries embedded in component |
| `App.tsx` | - | **1/10** | Module-scope side effects |

### Complexity Hotspots

| Rank | File | Function | Complexity | Lines | Issue |
|------|------|----------|------------|-------|-------|
| 1 | `ChatListScreen.tsx` | `fetchConversations` | 12 | 152 lines | N+1 with 5 sequential DB queries per item |
| 2 | `ChatScreen.tsx` | `useChatMessages` (inline) | 8 | 177 lines | Realtime + cursor pagination + refs |
| 3 | `ChatScreen.tsx` | `useSendMessage` (inline) | 7 | 124 lines | Duplicates extracted version |
| 4 | `backgroundLocation.ts` | Task callback | 10 | 115 lines | Dwell state machine |
| 5 | `AuthContext.tsx` | `initializeAuth` | 6 | 39 lines | Retry loop with timeout race |
| 6 | `useSendMessage.ts` (extracted) | `sendMessage` | 7 | 99 lines | Rate limit + optimistic + retry + offline |

### Key Architectural Smells

1. **Duplicate `useSendMessage`** -- inline in `ChatScreen.tsx:351-475` (simpler) AND extracted at `components/chat/hooks/useSendMessage.ts:142-646` (feature-rich). Two competing implementations.

2. **Duplicate `reduceCoordinatePrecision`** -- identical function in `backgroundLocation.ts:222-224` AND `useCheckin.ts:195-197`. DRY violation.

3. **Hardcoded Supabase in 9+ files** -- `supabase` imported as module singleton in ChatScreen, ChatListScreen, AuthContext, backgroundLocation, useCheckin, useCheckinSettings, useSendMessage, accountDeletion, dataExport. No dependency injection.

4. **Empty switch statement** -- `AuthContext.tsx:338-355` has 5 cases with only comments, no logic. Dead code.

5. **Inline component definitions** -- `ChatListScreen.tsx:627` creates `ItemSeparatorComponent` as arrow function on every render.

---

## Test Strategy Assessment

### Test Pyramid (Current vs Ideal)

| Layer | Current | Ideal | Gap |
|-------|---------|-------|-----|
| Unit Tests | ~85% of tests | 70% | Over-indexed (but with holes) |
| Component Tests | ~15% of tests | 20% | Under-indexed |
| Integration Tests | ~2% of tests | 8% | **Severe gap** -- RLS tests are placeholders |
| E2E Tests | N/A (not in CI) | 5% | **31 flows exist, none automated** |
| Performance Tests | <1% (1 file) | 2% | Near-zero |
| Security Tests | 0% | 2% | **Zero** |
| Accessibility Tests | 0% | 1% | **Zero** |

### CI/CD Quality Gates

| Gate | Status | Gap |
|------|--------|-----|
| ESLint | Running | No custom rules for test quality |
| TypeScript check | Running | Does not catch runtime issues |
| Unit tests (vitest) | Running | No coverage enforcement |
| Coverage upload (Codecov) | Running | Informational only, `fail_ci_if_error: false` |
| E2E tests (Maestro) | NOT in CI | 31 flows never automated |
| E2E tests (Vitest) | NOT in CI | `vitest.e2e.config.js` referenced but doesn't exist |
| Security scanning | MISSING | No `npm audit`, no SAST |
| Dependency checks | MISSING | No dependabot/renovate |
| Database migration tests | MISSING | 39 migration files unvalidated |
| Edge function tests | MISSING | Not run in CI |

### Risk Assessment

| Risk | Severity | Likelihood | Impact |
|------|----------|------------|--------|
| RLS policy bypass exposes user data | Critical | Medium | All user data accessible |
| Account deletion incomplete (GDPR violation) | Critical | Medium | Legal liability |
| Background location data stored unencrypted | High | Medium | Privacy violation |
| Realtime subscription silently fails | High | Medium | Users miss live messages |
| Rate limit mismatch (client vs DB) | High | Low | Spam or false blocking |
| AuthContext re-render storm | Medium | High | UI jank, battery drain |
| ChatListScreen N+1 in production | Medium | High | Slow chat loading |

---

## Consolidated Task List

### P0 -- Critical Security & Safety (Do First)

#### QA-001: Implement Real RLS Policy Tests
| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Effort** | 16 hours |
| **Actual** | `lib/__tests__/conversations.rls.test.ts` contains 7 tests that all assert `expect(true).toBe(true)`. Zero RLS policies are actually validated. 39 SQL migrations define security policies with no database-level testing. |
| **Expected** | Every RLS policy has a test that creates two users, verifies user A can access their own data, and verifies user A CANNOT access user B's data. Tests run against a local Supabase instance. |
| **Acceptance Criteria** | 1. `supabase start` integrated into test setup. 2. pgTAP or Supabase test client validates all RLS policies on `messages`, `conversations`, `profiles`, `posts`, `locations`, `checkins`, `favorites`. 3. Tests verify both positive (own data accessible) and negative (other user's data blocked) cases. 4. CI job runs database tests on PR. |
| **Files** | `lib/__tests__/conversations.rls.test.ts`, `lib/__tests__/favorites.rls.test.ts`, `supabase/migrations/*.sql` |

#### QA-002: Test GPS Configuration Module
| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Effort** | 2 hours |
| **Actual** | `lib/utils/gpsConfig.ts` (7KB, 227 lines) has zero tests. This module controls GPS accuracy intervals, battery profiles, and tracking behavior. Incorrect config causes excessive battery drain or inaccurate location data. Testability score 9/10 (pure functions). |
| **Expected** | Unit tests covering all exported functions: `calculateEffectiveRadius()`, `isAccuracyAcceptable()`, GPS profile configurations, boundary values. |
| **Acceptance Criteria** | 1. Test file at `lib/utils/__tests__/gpsConfig.test.ts`. 2. Tests for each battery profile (low, balanced, high accuracy). 3. Boundary tests for radius calculations. 4. Tests for accuracy rejection thresholds. 5. 100% function coverage. |
| **Files** | `lib/utils/gpsConfig.ts` |

#### QA-003: Test Untested Notification Edge Functions
| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Effort** | 4 hours |
| **Actual** | `supabase/functions/send-match-notification/index.ts` and `supabase/functions/send-spark-notification/index.ts` have zero tests. Silent failures mean users miss matches with no indication. `_shared/env-validation.ts` (all functions depend on this) is also untested. |
| **Expected** | Test files for both edge functions and the shared env validation module. Tests verify notification payload construction, error handling, and env validation. |
| **Acceptance Criteria** | 1. Test files at `__tests__/supabase/functions/send-match-notification.test.ts` and `send-spark-notification.test.ts`. 2. Tests for valid payload construction. 3. Tests for missing/invalid env vars. 4. Tests for notification delivery failure handling. 5. Tests for `_shared/env-validation.ts`. |
| **Files** | `supabase/functions/send-match-notification/index.ts`, `supabase/functions/send-spark-notification/index.ts`, `supabase/functions/_shared/env-validation.ts` |

#### QA-004: Fix Coverage Configuration to Include All Production Code
| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Effort** | 2 hours |
| **Actual** | `vitest.config.ts` `coverage.include` only tracks `components/`, `lib/`, `types/`, `hooks/`. Five directories are invisible: `screens/`, `services/`, `contexts/`, `navigation/`, `supabase/functions/`. Additionally, ~60+ individual files are explicitly excluded. Real coverage is ~56% vs reported 83-94%. |
| **Expected** | Coverage tracks ALL production code. Thresholds may be lowered initially to reflect reality, then raised incrementally. |
| **Acceptance Criteria** | 1. `coverage.include` adds `screens/**`, `services/**`, `contexts/**`, `navigation/**`. 2. Review each of the ~60 explicit exclusions -- remove exclusions for files that ship to production. 3. Set honest initial thresholds (e.g., 40% lines). 4. Document a plan to raise thresholds by 5% per sprint. |
| **Files** | `vitest.config.ts` |

#### QA-005: Account Deletion Integration Test
| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Effort** | 6 hours |
| **Actual** | `lib/accountDeletion.ts` calls `delete_user_account` RPC and deletes storage photos. Current tests mock the Supabase response but never verify data is actually deleted from all tables. Incomplete deletion = GDPR legal liability. `catch {}` at line 320 silently swallows errors during cleanup. |
| **Expected** | Integration test that creates a user, populates all related tables (messages, conversations, posts, checkins, photos, favorites, locations), triggers deletion, and verifies every table is clean. |
| **Acceptance Criteria** | 1. Integration test file at `lib/__tests__/accountDeletion.integration.test.ts`. 2. User data inserted into all 8+ related tables. 3. After deletion, query each table and assert zero rows for that user. 4. Verify storage bucket photos are deleted. 5. Verify the silent `catch` at line 320 logs to Sentry. |
| **Files** | `lib/accountDeletion.ts`, `supabase/migrations/20260207000000_add_checkins_to_account_deletion.sql` |

### P1 -- Core Test Infrastructure (Unblocks Everything)

#### QA-006: Create Shared Test Factories and Mock Utilities
| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Effort** | 8 hours |
| **Actual** | No `createMockUser()`, `createMockProfile()`, `createMockConversation()`, etc. exist anywhere. Each of ~120 test files constructs mock data with hand-written object literals. No shared Supabase mock client exists -- every test re-invents the `.from().select().eq()` mock chain independently. |
| **Expected** | Centralized test utilities providing type-safe factories, a reusable Supabase mock client, and an AuthContext test wrapper. |
| **Acceptance Criteria** | 1. `__tests__/utils/factories.ts` with `createMockUser()`, `createMockProfile()`, `createMockConversation()`, `createMockMessage()`, `createMockLocation()`, `createMockPost()` -- all typed against `types/database.ts`. 2. `__tests__/utils/supabase-mock.ts` with `createMockSupabaseClient()` providing chainable query builder. 3. `__tests__/utils/auth-mock.ts` with `createMockAuthContext()`. 4. `__tests__/utils/render-with-providers.tsx` custom render wrapping all providers. 5. At least 3 existing test files refactored to use the new utilities. |
| **Files** | New files in `__tests__/utils/` |

#### QA-007: Consolidate Dual Test Framework (Jest -> Vitest)
| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Effort** | 4 hours |
| **Actual** | Both `vitest@4.x` and `jest@29.x` (+ `jest-expo`, `jest-environment-jsdom`, `ts-jest`) in devDependencies. `test` script runs Vitest, `test:components` script runs Jest. `vitest.setup.ts` line 20 has `globalThis.jest = vi` compatibility shim. 5+ test files use `jest.mock()` under Vitest. Worktree `024-testing-framework-consolidation` exists but not merged. |
| **Expected** | Single test framework (Vitest). All `jest.mock()` calls migrated to `vi.mock()`. Jest dependencies removed. |
| **Acceptance Criteria** | 1. `jest`, `jest-expo`, `jest-environment-jsdom`, `ts-jest` removed from devDependencies. 2. `test:components` script uses Vitest. 3. All `jest.mock()` calls replaced with `vi.mock()`. 4. `globalThis.jest = vi` shim removed from setup. 5. All tests pass under Vitest. |
| **Files** | `package.json`, `vitest.setup.ts`, 5+ test files using `jest.mock()` |

#### QA-008: Deduplicate Test Files
| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Effort** | 3 hours |
| **Actual** | 11 modules have duplicate test files in both co-located `__tests__/` and root `__tests__/` directories (see Coverage Gap Analysis). Duplicates waste CI time and create maintenance confusion. |
| **Expected** | Each module has exactly one test file. Co-located pattern (`module/__tests__/`) chosen as canonical. |
| **Acceptance Criteria** | 1. For each of the 11 duplicate pairs, compare content and merge unique tests into the co-located file. 2. Delete the root `__tests__/` copy. 3. All tests pass. 4. Document the convention in a `TESTING.md` (only if it already exists). |
| **Files** | 22 test files across 11 modules |

#### QA-009: Create Missing `vitest.e2e.config.js`
| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Effort** | 1 hour |
| **Actual** | `package.json` script `test:e2e` references `vitest --config vitest.e2e.config.js` but this file does not exist. The 5 Vitest-based E2E test files in `__tests__/e2e/` cannot be run. |
| **Expected** | `vitest.e2e.config.js` exists, correctly includes the E2E test files, and `npm run test:e2e` works. |
| **Acceptance Criteria** | 1. `vitest.e2e.config.js` created with correct test include pattern. 2. `npm run test:e2e` runs the 5 E2E test files. 3. E2E tests are excluded from main `npm test` run (already done). |
| **Files** | `vitest.e2e.config.js` (new), `__tests__/e2e/*.test.tsx` |

#### QA-010: Enforce Coverage in CI
| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Effort** | 2 hours |
| **Actual** | CI runs `npm run test:run` which does not include `--coverage`. Coverage uploads to Codecov with `fail_ci_if_error: false`. No PR is ever blocked by coverage regression. |
| **Expected** | CI enforces coverage thresholds. PRs that reduce coverage below threshold are blocked. |
| **Acceptance Criteria** | 1. CI script changed to `npm run test:coverage` or equivalent. 2. Vitest coverage thresholds enforced in CI (fail the build on regression). 3. Codecov `fail_ci_if_error` set to `true`. 4. Add coverage comment to PRs via Codecov GitHub integration. |
| **Files** | `.github/workflows/ci.yml`, `vitest.config.ts` |

### P2 -- Core User Flow Testing

#### QA-011: Test ChatScreen (Decompose First)
| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **Effort** | 12 hours (4 decompose + 8 test) |
| **Actual** | `screens/ChatScreen.tsx` is 1,379 lines with 3 inline hooks (`useChatMessages` 177 lines, `useSendMessage` 124 lines duplicating extracted version, `useBlockUser` 24 lines). Testability score 3/10. Cannot test hooks in isolation. |
| **Expected** | Inline hooks extracted to separate files. Each hook has independent unit tests. ChatScreen reduced to <200 lines orchestration. Delete inline `useSendMessage` -- use extracted version from `components/chat/hooks/`. |
| **Acceptance Criteria** | 1. `useChatMessages` moved to `hooks/chat/useChatMessages.ts` with tests. 2. Inline `useSendMessage` deleted; ChatScreen imports from `components/chat/hooks/useSendMessage.ts`. 3. `useBlockUser` moved to `hooks/chat/useBlockUser.ts` (or reuse existing). 4. ChatScreen.tsx under 300 lines. 5. Screen-level smoke test renders without crashing. 6. Each extracted hook has >80% coverage. |
| **Files** | `screens/ChatScreen.tsx`, new files in `hooks/chat/` |

#### QA-012: Test ChatListScreen with N+1 Fix
| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **Effort** | 10 hours (6 refactor + 4 test) |
| **Actual** | `screens/ChatListScreen.tsx` (742 lines) fires 4-5 sequential Supabase queries per conversation inside `Promise.all(filteredConversations.map(...))` at lines 261-336. With 20 conversations = 80-100 DB queries. Data-fetching logic embedded in component -- untestable without rendering. |
| **Expected** | Data fetching extracted to a `useChatList` hook or Supabase RPC. Query count reduced from N*5 to 1-2. Hook tested independently. |
| **Acceptance Criteria** | 1. `fetchConversations` logic extracted to `hooks/useChatList.ts`. 2. Hook accepts injectable Supabase client parameter. 3. Unit tests verify correct query construction. 4. Integration test or RPC replaces N+1 pattern. 5. Screen smoke test renders conversation list. |
| **Files** | `screens/ChatListScreen.tsx`, new `hooks/useChatList.ts` |

#### QA-013: Test ProfileScreen
| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **Effort** | 6 hours |
| **Actual** | `screens/ProfileScreen.tsx` is 46KB -- the largest file in the codebase -- with zero tests. Handles profile viewing, editing, photo management, settings navigation. |
| **Expected** | Smoke tests for rendering, key user interactions tested (edit profile, change photo, navigate to settings). |
| **Acceptance Criteria** | 1. Test file at `__tests__/screens/ProfileScreen.test.tsx`. 2. Renders without crashing with mock AuthContext. 3. Tests for edit mode toggle. 4. Tests for photo management interactions. 5. Tests for navigation to sub-screens. |
| **Files** | `screens/ProfileScreen.tsx` |

#### QA-014: Test AuthScreen
| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **Effort** | 4 hours |
| **Actual** | `screens/AuthScreen.tsx` (22KB) is the entry point for all users with zero unit tests. Only covered by Maestro E2E flows. |
| **Expected** | Unit tests for login form validation, signup flow, error handling, loading states. |
| **Acceptance Criteria** | 1. Test file at `__tests__/screens/AuthScreen.test.tsx`. 2. Tests for form validation (empty fields, invalid email, short password). 3. Tests for successful login/signup flow. 4. Tests for error state display. 5. Tests for loading state during auth. |
| **Files** | `screens/AuthScreen.tsx` |

#### QA-015: Test CreatePost Module
| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **Effort** | 8 hours |
| **Actual** | `screens/CreatePost/useCreatePostForm.ts` (21KB) + 10 step components + 4 support components -- all with zero tests. This is the core post creation flow. |
| **Expected** | Unit tests for `useCreatePostForm` hook covering form state management, validation, and submission. Smoke tests for step components. |
| **Acceptance Criteria** | 1. Test file at `screens/CreatePost/__tests__/useCreatePostForm.test.ts`. 2. Tests for each form step validation. 3. Tests for form state transitions. 4. Tests for submission with valid/invalid data. 5. At least smoke tests for 3 key step components. |
| **Files** | `screens/CreatePost/useCreatePostForm.ts`, `screens/CreatePost/steps/*.tsx` |

### P3 -- Architecture Improvements for Testability

#### QA-016: Introduce Supabase Client Dependency Injection
| Field | Value |
|-------|-------|
| **Priority** | P3 |
| **Effort** | 6 hours |
| **Actual** | 9+ files import `supabase` directly as module singleton. Every test must independently mock `vi.mock('../../lib/supabase')` with custom chain. No shared mock factory exists. Pattern: hardcoded import prevents clean injection. |
| **Expected** | Service functions and hooks accept an optional `client` parameter defaulting to the singleton. Tests pass a mock directly instead of module-level mocking. |
| **Acceptance Criteria** | 1. `useCheckin`, `useCheckinSettings`, `accountDeletion`, `dataExport` accept optional `SupabaseClient` parameter. 2. Default to existing singleton when no param provided (no breaking change). 3. At least 3 test files refactored to use injected mock instead of `vi.mock`. 4. Document the pattern for future hooks/services. |
| **Files** | `hooks/useCheckin.ts`, `hooks/useCheckinSettings.ts`, `lib/accountDeletion.ts`, `lib/dataExport.ts` |

#### QA-017: Split AuthContext into Auth + Profile
| Field | Value |
|-------|-------|
| **Priority** | P3 |
| **Effort** | 4 hours |
| **Actual** | `contexts/AuthContext.tsx` bundles 14 properties (7 functions) in one context. `useMemo` at line 368 has 12 dependencies. Profile changes cause re-renders in components that only need `userId`. Mock surface for tests is the entire 14-property interface. |
| **Expected** | Two contexts: `AuthSessionContext` (session, user, isAuthenticated, signIn, signOut) and `UserProfileContext` (profile, updateProfile, refreshProfile). |
| **Acceptance Criteria** | 1. `contexts/AuthSessionContext.tsx` with stable auth state. 2. `contexts/UserProfileContext.tsx` with profile state. 3. `useAuth()` hook still works (can combine both for backward compatibility). 4. `useAuthSession()` and `useProfile()` available for targeted consumption. 5. Existing tests pass. 6. New tests verify re-render isolation. |
| **Files** | `contexts/AuthContext.tsx` |

#### QA-018: Extract Background Location Business Logic
| Field | Value |
|-------|-------|
| **Priority** | P3 |
| **Effort** | 4 hours |
| **Actual** | `services/backgroundLocation.ts` line 335 defines task callback at module scope (import-time execution). The ~115-line callback contains dwell detection state machine, notification decisions, and async Supabase calls -- all locked inside a native runtime callback that cannot be tested. |
| **Expected** | Pure function `computeNextDwellState(currentState, location, nearbyLocation, config, now)` extracted and independently testable. Task callback becomes a thin wrapper. |
| **Acceptance Criteria** | 1. `lib/utils/dwellDetection.ts` with pure state transition function. 2. Unit tests covering all state transitions: new dwell, continued dwell, dwell threshold reached (notify), location change (reset), no nearby location. 3. `backgroundLocation.ts` task callback delegates to the pure function. 4. 100% branch coverage on dwell detection. |
| **Files** | `services/backgroundLocation.ts`, new `lib/utils/dwellDetection.ts` |

#### QA-019: Extract Shared Utility `reduceCoordinatePrecision`
| Field | Value |
|-------|-------|
| **Priority** | P3 |
| **Effort** | 30 minutes |
| **Actual** | Identical `reduceCoordinatePrecision()` function defined in both `services/backgroundLocation.ts:222-224` and `hooks/useCheckin.ts:195-197`. DRY violation, maintenance risk for GDPR-critical logic. |
| **Expected** | Single shared utility with tests. |
| **Acceptance Criteria** | 1. `lib/utils/geoPrivacy.ts` with `reduceCoordinatePrecision()`. 2. Both files import from shared utility. 3. Unit test verifying precision reduction behavior. |
| **Files** | `services/backgroundLocation.ts`, `hooks/useCheckin.ts`, new `lib/utils/geoPrivacy.ts` |

#### QA-020: Delete Duplicate Inline `useSendMessage`
| Field | Value |
|-------|-------|
| **Priority** | P3 |
| **Effort** | 30 minutes |
| **Actual** | `screens/ChatScreen.tsx:351-475` defines an inline `useSendMessage` (124 lines, basic retry). `components/chat/hooks/useSendMessage.ts:142-646` has the extracted version (feature-rich with rate limiting, offline queue, retry with timeout). Two competing implementations. |
| **Expected** | Inline version deleted. ChatScreen imports the extracted version. |
| **Acceptance Criteria** | 1. Inline `useSendMessage` removed from ChatScreen.tsx. 2. ChatScreen imports from `components/chat/hooks/useSendMessage.ts`. 3. All existing tests pass. 4. Manual smoke test of message sending. |
| **Files** | `screens/ChatScreen.tsx`, `components/chat/hooks/useSendMessage.ts` |

### P4 -- Missing Test Categories

#### QA-021: Add Security Scanning to CI
| Field | Value |
|-------|-------|
| **Priority** | P4 |
| **Effort** | 2 hours |
| **Actual** | Zero security scanning in CI. No `npm audit`, no SAST, no dependency vulnerability checks, no Dependabot/Renovate. App handles auth, location data, photos, and messaging. |
| **Expected** | CI runs `npm audit` and a SAST scanner on every PR. Dependabot/Renovate configured for dependency updates. |
| **Acceptance Criteria** | 1. `npm audit --audit-level=high` step in CI (fails on high+ severity). 2. Dependabot or Renovate configured for weekly dependency PRs. 3. GitHub security advisories enabled on repo. |
| **Files** | `.github/workflows/ci.yml`, `.github/dependabot.yml` (new) |

#### QA-022: Add Accessibility Testing
| Field | Value |
|-------|-------|
| **Priority** | P4 |
| **Effort** | 6 hours |
| **Actual** | Zero accessibility tests. No screen reader label verification, no contrast ratio testing, no touch target validation. App store compliance risk. |
| **Expected** | Accessibility matchers integrated into component tests. Key screens tested for a11y. |
| **Acceptance Criteria** | 1. `@testing-library/jest-native` (or Vitest equivalent) accessibility matchers available. 2. At least 5 key components tested for accessibility labels, roles, and states. 3. Touch target size validation for interactive elements. |
| **Files** | `vitest.setup.ts`, component test files |

#### QA-023: Add Maestro E2E to CI
| Field | Value |
|-------|-------|
| **Priority** | P4 |
| **Effort** | 8 hours |
| **Actual** | 31 Maestro flow YAML files exist across 14 feature areas. None run in CI. An `ios-e2e.yml` workflow exists but is not triggered on PRs. |
| **Expected** | At least critical path E2E tests run in CI on every PR (auth, chat, post creation). |
| **Acceptance Criteria** | 1. CI workflow runs top 5-10 Maestro flows on PR. 2. Uses iOS Simulator or Android emulator in CI. 3. Test results reported as PR check. 4. Failure blocks merge. |
| **Files** | `.github/workflows/ci.yml` or new `.github/workflows/e2e.yml`, `.maestro/flows/` |

#### QA-024: Add Silent Error Logging
| Field | Value |
|-------|-------|
| **Priority** | P4 |
| **Effort** | 2 hours |
| **Actual** | 12+ instances of `catch {}` or `catch { // comment }` that swallow errors entirely across ChatScreen, useSendMessage, useCheckinSettings, accountDeletion, and others. Production debugging impossible for these paths. |
| **Expected** | Every `catch` block at minimum logs to Sentry with `level: 'warning'`. |
| **Acceptance Criteria** | 1. All 12+ silent catch blocks replaced with `Sentry.captureException(error, { level: 'warning' })`. 2. Each catch includes a descriptive breadcrumb (e.g., "Non-critical: failed to prefetch typing status"). 3. No `catch {}` blocks remain in codebase (lint rule added). |
| **Files** | `screens/ChatScreen.tsx:249`, `hooks/useCheckinSettings.ts:67`, `components/chat/hooks/useSendMessage.ts:201,508`, `lib/accountDeletion.ts:320`, and 7+ others |

#### QA-025: Performance Regression Tests
| Field | Value |
|-------|-------|
| **Priority** | P4 |
| **Effort** | 6 hours |
| **Actual** | Only 1 performance test exists (`rateLimiting.stress.test.ts`). No tests for ChatListScreen query count, AuthContext render cascades, background location battery impact, or large message list performance. |
| **Expected** | Performance benchmarks for critical paths with regression detection. |
| **Acceptance Criteria** | 1. Test that ChatListScreen makes <= 5 queries for 20 conversations. 2. Test that AuthContext profile update does not re-render components using only `userId`. 3. Test that background location task completes within 2 seconds. 4. Benchmarks tracked over time in CI. |
| **Files** | New test files in `__tests__/performance/` |

#### QA-026: Remove Dead Dependency `@tanstack/react-virtual`
| Field | Value |
|-------|-------|
| **Priority** | P4 |
| **Effort** | 1 minute |
| **Actual** | `@tanstack/react-virtual@^3.11.2` in `package.json` dependencies has zero imports anywhere in the codebase. Adds unnecessary weight to dependency tree. |
| **Expected** | Dependency removed. |
| **Acceptance Criteria** | 1. `npm uninstall @tanstack/react-virtual`. 2. Build still succeeds. 3. All tests pass. |
| **Files** | `package.json` |

---

## Execution Roadmap

### Phase 1: Foundation (Week 1-2)
**Goal:** Honest metrics, shared infrastructure, quality gates

| Task | ID | Effort | Deliverable |
|------|----|--------|-------------|
| Fix coverage config | QA-004 | 2h | Honest coverage numbers |
| Create test factories & mocks | QA-006 | 8h | `__tests__/utils/` package |
| Create vitest.e2e.config.js | QA-009 | 1h | Working `npm run test:e2e` |
| Enforce coverage in CI | QA-010 | 2h | PR blocking on regression |
| Consolidate Jest -> Vitest | QA-007 | 4h | Single framework |
| Deduplicate test files | QA-008 | 3h | Clean test tree |
| Remove dead dependency | QA-026 | 0h | Clean deps |

**Phase 1 Total: ~20 hours**

### Phase 2: Critical Safety (Week 3-4)
**Goal:** Security policies validated, critical modules tested

| Task | ID | Effort | Deliverable |
|------|----|--------|-------------|
| RLS policy tests | QA-001 | 16h | Database-level security validation |
| GPS config tests | QA-002 | 2h | Location config verified |
| Notification edge function tests | QA-003 | 4h | Push delivery verified |
| Account deletion integration | QA-005 | 6h | GDPR compliance verified |
| Security scanning in CI | QA-021 | 2h | Automated vuln detection |

**Phase 2 Total: ~30 hours**

### Phase 3: Core Flow Testing (Week 5-7)
**Goal:** Primary user flows tested, monoliths decomposed

| Task | ID | Effort | Deliverable |
|------|----|--------|-------------|
| ChatScreen decompose + test | QA-011 | 12h | Testable chat architecture |
| ChatListScreen refactor + test | QA-012 | 10h | N+1 fix + tests |
| ProfileScreen tests | QA-013 | 6h | Profile flow covered |
| AuthScreen tests | QA-014 | 4h | Auth flow covered |
| CreatePost tests | QA-015 | 8h | Post creation covered |
| Delete duplicate useSendMessage | QA-020 | 0.5h | Single implementation |
| Extract reduceCoordinatePrecision | QA-019 | 0.5h | DRY + tested |
| Add silent error logging | QA-024 | 2h | Production debugging |

**Phase 3 Total: ~43 hours**

### Phase 4: Architecture & Maturity (Week 8-10)
**Goal:** Testable architecture, full test category coverage

| Task | ID | Effort | Deliverable |
|------|----|--------|-------------|
| Supabase DI pattern | QA-016 | 6h | Injectable dependencies |
| Split AuthContext | QA-017 | 4h | Reduced re-renders + test surface |
| Extract dwell detection | QA-018 | 4h | Pure testable state machine |
| Accessibility testing | QA-022 | 6h | A11y validation |
| Maestro E2E in CI | QA-023 | 8h | Automated E2E on PR |
| Performance regression tests | QA-025 | 6h | Benchmark tracking |

**Phase 4 Total: ~34 hours**

### Overall Summary

| Metric | Value |
|--------|-------|
| Total tasks | 26 |
| Total estimated effort | ~127 hours |
| P0 tasks (Critical) | 5 tasks, ~30 hours |
| P1 tasks (Infrastructure) | 5 tasks, ~18 hours |
| P2 tasks (Core flows) | 5 tasks, ~40 hours |
| P3 tasks (Architecture) | 5 tasks, ~15 hours |
| P4 tasks (Categories) | 6 tasks, ~24 hours |

---

## Report Index

| # | Report | Agent | Focus |
|---|--------|-------|-------|
| 10a | Coverage Gap Analysis | Researcher | File-by-file coverage inventory, untested areas |
| 10b | Test Quality Review | Test Quality Analyst | Test patterns, anti-patterns, quality scores |
| 10c | Test Strategy Review | Strategy Reviewer | Architecture, infrastructure, risk assessment |
| 10d | Code Testability Audit | Code Analyzer | Complexity hotspots, refactoring recommendations |
| **10** | **This Report** | **Consolidated** | **Synthesized findings + actionable task list** |
