# Remaining Tasks — Implementation Order

> Generated: 2026-02-13 | ~101 incomplete tasks ordered by dependency chain and impact

Tasks are grouped into implementation phases. Within each phase, tasks are ordered so that foundations come first and dependents follow. Each task is tagged with its original priority.

---

## Phase 1: Foundations & Cleanup (do first — everything else builds on these)

| # | ID | Task | Priority | Why First |
|---|-----|------|----------|-----------|
| 1 | M-044 | Remove 7 dead CreatePost step files | P2 | Dead code removal, zero risk |
| 2 | QA-004 | Fix coverage config (~56% real vs 83-94% reported) | P0 | Need honest metrics before writing tests |
| 3 | QA-007 | Consolidate dual test framework (Jest + Vitest → Vitest only) | P1 | Single framework before writing new tests |
| 4 | QA-006 | Complete shared test factories & mock utilities | P1 | Test infrastructure needed by all QA tasks |
| 5 | M-007 | Fix "Chat with Producer/Consumer" jargon labels | P0 | Tiny string change, big UX win |
| 6 | M-043 | Fix CreatePost tooltip content | P2 | Quick copy fix |
| 7 | M-040 | Fix touch targets (44x44pt minimum) | P2 | Accessibility baseline |
| 8 | M-041 | Screen reader labels on ChatBubble/EmptyState | P2 | Accessibility baseline |
| 9 | — | Remove dead dependency (`@tanstack/react-virtual`) | P3 | Clean package.json |

## Phase 2: Core Architecture (unblock downstream features)

| # | ID | Task | Priority | Why Now |
|---|-----|------|----------|---------|
| 10 | P-006 | Reduce AuthContext worst-case startup (51s → 5s) | P0 | Users bouncing on cold start |
| 11 | M-008 | Unify color tokens into single source of truth | P1 | Foundation for all UI work |
| 12 | M-026 | Create ThemeProvider context | P2 | Depends on unified tokens |
| 13 | M-030 | Install react-native-reanimated | P2 | Required by all animation tasks |
| 14 | M-024 | Toast/Snackbar system | P1 | Many features need user feedback |
| 15 | P-007 | Defer module-level sync initialization | P1 | 200-400ms startup improvement |
| 16 | P-005 | Enable Sentry auto-performance tracing | P0 | Need perf data before optimizing further |
| 17 | P-009 | Verify/complete TanStack Query caching throughout | P1 | Caching layer for all data fetching |
| 18 | — | Split AuthContext into smaller contexts | P3 | Reduces unnecessary re-renders app-wide |

## Phase 3: Critical UX Fixes (biggest user-facing impact)

| # | ID | Task | Priority | Why Now |
|---|-----|------|----------|---------|
| 19 | M-004 | Enforce avatar creation after onboarding | P0 | Breaks matching without it |
| 20 | M-006 | City-wide discovery mode (tiered radius) | P0 | Empty feeds kill retention |
| 21 | M-005 | Replace empty feed dead-end with action cards | P0 | Pairs with tiered radius |
| 22 | M-010 | Apply PressableScale to all interactive cards | P1 | Native component already exists |
| 23 | M-023 | Add text labels to tab bar | P1 | Navigation clarity |
| 24 | M-042 | Conditional FAB visibility | P2 | Reduces visual clutter |
| 25 | M-025 | Split ProfileScreen into Profile + Settings | P2 | Screen is overloaded |

## Phase 4: Loading & Polish (perceived performance)

| # | ID | Task | Priority | Depends On |
|---|-----|------|----------|------------|
| 26 | M-011 | Create React Native skeleton shimmer loader | P1 | reanimated (Phase 2) |
| 27 | M-012 | Integrate skeletons into feed, chat, map | P1 | M-011 |
| 28 | M-018 | Chat message entrance animations | P1 | reanimated (Phase 2) |
| 29 | M-019 | Create native typing indicator (mobile) | P1 | reanimated (Phase 2) |
| 30 | M-031 | Tab bar icon crossfade + badge animation | P2 | reanimated (Phase 2) |
| 31 | M-032 | FAB entrance/press/scroll-hide animations | P2 | reanimated (Phase 2) |
| 32 | M-033 | Auth screen entrance animations | P2 | reanimated (Phase 2) |
| 33 | M-045 | StaggeredPostList easing upgrade | P2 | reanimated (Phase 2) |
| 34 | M-046 | LocationCard pulsing "hot" dot | P2 | reanimated (Phase 2) |
| 35 | M-027 | Create native TextInput with floating label | P2 | reanimated (Phase 2) |
| 36 | M-028 | Create native BottomSheet | P2 | reanimated (Phase 2) |

## Phase 5: Engagement Features (retention & delight)

| # | ID | Task | Priority | Depends On |
|---|-----|------|----------|------------|
| 37 | M-020 | "It's a Match" celebration modal | P1 | reanimated, Toast |
| 38 | M-021 | Proximity alerts (push within 500m) | P1 | Backend exists |
| 39 | M-034 | Streak-at-risk push notification | P2 | Notification infra |
| 40 | M-035 | "Someone posted near you" notification | P2 | Notification infra |
| 41 | T-021 | Conversation safety features | P2 | SafetyPrompt component exists |
| 42 | T-018 | AI post content screening | P2 | contentScreening.ts exists |
| 43 | T-020 | Avatar comparison view | P2 | AvatarComparison.tsx exists |
| 44 | M-038 | Streak leaderboard | P2 | Achievements migration exists |
| 45 | M-039 | Weekly recap digest | P2 | Needs backend edge function |

## Phase 6: Test Coverage (validate everything above)

| # | ID | Task | Priority | Depends On |
|---|-----|------|----------|------------|
| 46 | QA-001 | Implement real RLS policy tests | P0 | Test infra (Phase 1) |
| 47 | QA-014 | Test AuthScreen | P2 | AuthContext fix (Phase 2) |
| 48 | QA-011 | Test ChatScreen (decompose first) | P2 | Chat animations (Phase 4) |
| 49 | QA-012 | Test ChatListScreen with N+1 fix | P2 | Query caching (Phase 2) |
| 50 | QA-013 | Test ProfileScreen | P2 | Profile split (Phase 3) |
| 51 | QA-015 | Test CreatePost module | P2 | Dead files removed (Phase 1) |

## Phase 7: Performance & Bundle (measure after features stabilize)

| # | ID | Task | Priority | Why Last |
|---|-----|------|----------|----------|
| 52 | P-008 | Separate web/mobile dependencies in monorepo | P1 | Major structural change |
| 53 | P-025–P-042 | Frontend rendering optimizations | P2 | Measure with Sentry first |
| 54 | — | Extract background location logic | P3 | Refactor after features stable |
| 55 | — | Supabase DI pattern | P3 | Architectural improvement |
| 56 | — | Performance regression tests | P3 | After perf baseline established |

## Phase 8: Backlog (nice-to-have, no dependencies)

| # | Task | Priority |
|---|------|----------|
| 57 | Custom font integration | P3 |
| 58 | Swipeable card stack interactions | P3 |
| 59 | Onboarding carousel | P3 |
| 60 | Map clustering visualization | P3 |
| 61 | Shared element transitions | P3 |
| 62 | Social login UI | P3 |
| 63 | Security scanning pipeline | P3 |
| 64 | Accessibility testing automation | P3 |
| 65 | Maestro E2E in CI | P3 |

---

## Dependency Graph (key chains)

```
Phase 1: cleanup/infra ──┐
                          ├→ Phase 2: architecture ──┬→ Phase 3: critical UX
                          │                          ├→ Phase 4: animations (needs reanimated)
                          │                          └→ Phase 5: features (needs Toast, notifications)
                          └→ Phase 6: tests (needs test infra + stable code)
                                                     └→ Phase 7: performance (needs Sentry + stable features)
                                                          └→ Phase 8: backlog
```

## Summary

| Phase | Tasks | Effort | Impact |
|-------|-------|--------|--------|
| 1. Foundations | 9 | Low | Unblocks everything |
| 2. Architecture | 9 | Medium | Core stability |
| 3. Critical UX | 7 | Medium | Retention |
| 4. Loading & Polish | 11 | Medium | Perceived perf |
| 5. Engagement | 9 | High | Retention & delight |
| 6. Test Coverage | 6 | Medium | Confidence |
| 7. Performance | 5 | High | Bundle & speed |
| 8. Backlog | 9 | Varied | Nice-to-have |
