# Backtrack Production Readiness Audit

**Date:** 2026-03-03
**Scope:** 8 categories across runtime safety, security, build config, error monitoring, performance, testing, data integrity, and UX polish

## Summary

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 12 |
| Medium | 16 |
| Low | 14 |
| **Total** | **45** |

## Findings

### Critical (3)

| ID | Category | File | Description | Recommendation |
|----|----------|------|-------------|----------------|
| CFG-01 | Build Config | `eas.json:61` | Production profile missing `channel` field — OTA updates via `eas update` will not reach production builds | Add `"channel": "production"` to the production build profile |
| CFG-02 | Build Config | `app.json` | No `expo.updates` config block — missing `url` and `runtimeVersion` policy. OTA updates are completely non-functional | Add `"updates": { "url": "https://u.expo.dev/<project-id>", "enabled": true }` and `"runtimeVersion": { "policy": "appVersion" }` |
| DAT-02 | Data Integrity | `services/realtimeManager.ts` | No auto-resubscribe after network reconnection. All Supabase Realtime channels die on network drop — users see stale chat/match data until app restart | Subscribe to NetInfo changes; on reconnect, call `cleanup()` then re-subscribe all channels |

### High (12)

| ID | Category | File | Description | Recommendation |
|----|----------|------|-------------|----------------|
| RUN-02 | Runtime Safety | `services/realtimeManager.ts:111` | No reconnection logic. `CHANNEL_ERROR`/`TIMED_OUT` statuses are never handled — channels stay dead | Add status handler that retries `.subscribe()` on error/timeout |
| RUN-06 | Runtime Safety | `services/realtimeManager.ts:80-93` | When max channels (5) reached and all have refCount > 0, a 6th channel is silently created. Server rejects it with unhandled error | Re-check channel count after eviction loop; throw if still at limit |
| DAT-01 | Data Integrity | `components/OfflineIndicator.tsx:152-283` | Purely visual — does NOT block writes. Users can trigger Supabase mutations that silently fail while offline | Gate mutations behind network check or show toast on offline mutation attempt |
| DAT-07 | Data Integrity | `services/backgroundLocation.ts:600-604` | Offline location data is completely lost — no local buffer or retry queue. 30 min at a venue offline = no check-in prompt | Buffer location updates locally when offline; process on reconnect |
| SEC-01 | Security | `services/locationService.ts:511` | Google Maps API key sent in plaintext via `X-Goog-Api-Key` header from client. No key restrictions documented | Restrict key in GCP Console to bundle IDs + Places API only; consider server proxy |
| SEC-02 | Security | `.gitignore` | `google-services-key.json` (Play service account key) is NOT in `.gitignore` | Add to `.gitignore` immediately; verify never committed via `git log` |
| CFG-04 | Build Config | `app.json:6` / `package.json:3` | Version mismatch: app.json `1.0.0` vs package.json `0.1.0` | Synchronize; use app.json as mobile source of truth |
| PRF-01 | Performance | `package.json` | `next`, `react-dom`, `react-native-web` are web-only deps in production — ~2MB+ unnecessary weight, Metro resolver conflicts | Move to separate web workspace or devDependencies |
| MON-02 | Sentry | `eas.json:44` | `SENTRY_ALLOW_FAILURE=true` in preview — source map upload failures go unnoticed, making crash reports unreadable | Remove or set to `"false"` in preview |
| MON-03 | Sentry | `services/realtimeManager.ts:111-115` | Realtime subscription failures only logged in `__DEV__`. Zero Sentry reporting for production channel errors | Add `Sentry.captureMessage` for error/timeout statuses |
| TST-01 | Testing | `vitest.config.ts:48-122` | Coverage includes only components/, lib/, types/, hooks/ — screens/, services/, contexts/, navigation/ entirely excluded | Add critical runtime directories to coverage.include |
| TST-04 | Testing | `.github/workflows/ios-e2e.yml:5-10` | iOS E2E workflow triggers are commented out — Maestro tests never run automatically | Uncomment push/PR triggers after configuring secrets |
| TST-05 | Testing | `.github/workflows/` | No Android CI build or test pipeline exists at all | Create Android E2E workflow with emulator + Maestro |
| TST-08 | Testing | `vitest.config.ts:86-99` | ErrorBoundary.tsx excluded from coverage — crash-recovery safety net is untested | Write unit tests for ErrorBoundary covering error, fallback, Sentry report, and recovery |

### Medium (16)

| ID | Category | File | Description | Recommendation |
|----|----------|------|-------------|----------------|
| RUN-03 | Runtime Safety | `navigation/AppNavigator.tsx:226` | Infinite spinner if profile fetch fails — no timeout or error state | Add 10s timeout with error/retry UI |
| RUN-04 | Runtime Safety | `screens/FeedScreen.tsx:289-293` | `handleCheckIn` is a no-op stub — visible button does nothing in production | Hide button or show "coming soon" toast |
| DAT-03 | Data Integrity | `services/backgroundLocation.ts:220,362` | Mixed storage: `TRACKING_SETTINGS_KEY` (contains userId) in plain AsyncStorage vs SecureStore for other keys | Move to SecureStore via existing `secureSet`/`secureGet` helpers |
| DAT-04 | Data Integrity | `services/backgroundLocation.ts:594-598` | Failed `findNearbyLocation` DB call silently skipped — no retry, dwell state not updated | Queue failed lookups for retry; save `lastPosition` on failure |
| DAT-06 | Data Integrity | `hooks/useFavoriteLocations.ts:926-958` | Offline queue uses client-generated IDs that won't match server records — duplicates on sync | Reconcile temp IDs with server-returned IDs; deduplicate by (userId, locationId) |
| SEC-03 | Security | `services/backgroundLocation.ts:62,67` | `TRACKING_SETTINGS_KEY` and `PROXIMITY_RATE_LIMIT_KEY` use plain AsyncStorage — readable on rooted devices | Migrate to `expo-secure-store` |
| SEC-06 | Security | `contexts/AuthContext.tsx:25-26` | AsyncStorage imported alongside SecureStore — misleading comment says "Session persistence via AsyncStorage" | Audit all AsyncStorage usage; confirm no auth tokens leak; fix comment |
| CFG-03 | Build Config | `app.json:47-48` | `READ/WRITE_EXTERNAL_STORAGE` deprecated on API 33+ — Play Store warnings | Replace with `READ_MEDIA_IMAGES` |
| PRF-02 | Performance | `package.json:76-77` | `graphql` + `graphql-request` only used in `lib/api/meetup.ts` — ~200KB if unused | Remove if deferred, or lazy-load |
| PRF-05 | Performance | `contexts/AuthContext.tsx:599-605` | `useAuth()` combines both contexts negating the split-context optimization. Most consumers still use `useAuth()` | Migrate consumers to `useAuthState()` / `useProfile()` |
| PRF-07 | Performance | `package.json:78-79` | Both `lucide-react` and `lucide-react-native` installed — dual icon libs add ~150KB+ | Replace all `lucide-react` imports with `lucide-react-native`; remove `lucide-react` |
| TST-02 | Testing | `vitest.config.ts:54-122` | 68 explicit exclusions hide production code from coverage (ErrorBoundary, chat, favorites, onboarding, etc.) | Prioritize tests for ErrorBoundary, supabase client, onboarding; remove exclusions as tests added |
| TST-03 | Testing | `.github/workflows/ci.yml:100` | CI echoes "40% global" but actual thresholds are 70/80/80/80 — misleading | Update CI echo to match actual thresholds |
| TST-06 | Testing | `tsconfig.json:46-52` | Test files excluded from tsconfig — type errors in tests won't surface in CI `tsc --noEmit` | Remove exclusions or create tsconfig.test.json |
| UXP-04 | UX Polish | `screens/PostDetailScreen.tsx:524` | Hardcoded `paddingTop: 16` — content renders under status bar/notch | Add `useSafeAreaInsets`; use `insets.top + 16` |
| UXP-05 | UX Polish | `screens/LedgerScreen.tsx:582` | Hardcoded `paddingTop: 24` — clips under notch | Add `useSafeAreaInsets`; use `insets.top + 24` |
| UXP-06 | UX Polish | `screens/MySpotsScreen.tsx:443` | Hardcoded `paddingTop: 20` — clips under notch | Add `useSafeAreaInsets`; use `insets.top + 20` |
| UXP-10 | UX Polish | `app.json:31-34` | Android adaptive icon backgroundColor `#ffffff` while app theme is dark `#0F0F13` — jarring white square | Change to `"#0F0F13"` |
| MON-01 | Sentry | `lib/sentry.ts:222` | `sendDefaultPii` not explicitly set — relies on SDK default (`false`) | Add `sendDefaultPii: false` explicitly |
| MON-04 | Sentry | Codebase-wide | `Sentry.captureException` used in only ~15 files. Multiple catch blocks silently swallow errors | Audit all catch blocks; add `captureException` for user-impacting errors |
| MON-07 | Sentry | `eas.json:18-25` | Dev build profile missing `SENTRY_AUTH_TOKEN` — no source maps for dev client crash debugging | Add token or document intentional omission |

### Low (14)

| ID | Category | File | Description | Recommendation |
|----|----------|------|-------------|----------------|
| RUN-01 | Runtime Safety | `components/ErrorBoundary.tsx:243` | ErrorBoundary exists globally but no per-screen boundaries — one screen crash shows global fallback | Wrap high-risk screens with `withErrorBoundary` |
| RUN-05 | Runtime Safety | `screens/MapSearchScreen.tsx:305-311` | `console.log` calls are `__DEV__`-guarded — no issue | None needed |
| DAT-05 | Data Integrity | `hooks/useEventAttendance.ts:270-300` | Optimistic update with proper rollback — no issue | None needed |
| SEC-04 | Security | `services/locationService.ts:1065` | `%` and `_` wildcards in `.ilike()` input not escaped — wildcard abuse possible | Escape wildcards before passing to `.ilike()` |
| SEC-05 | Security | `eas.json:19,37,70` | `EAS_PROJECT_ID` hardcoded as literal instead of env var | Move to `${EAS_PROJECT_ID}` for consistency |
| CFG-05 | Build Config | `app.json` | No `expo.ios.privacyManifests` or privacy policy URL configured — Apple requires these | Add privacy manifest before App Store submission |
| CFG-06 | Build Config | `app.json:92-94` | `experiments.typedRoutes` enabled but app uses React Navigation, not Expo Router — no-op | Remove the flag |
| PRF-03 | Performance | `package.json:50` | `@tanstack/react-virtual` — zero imports, dead dependency | Remove |
| PRF-04 | Performance | `package.json:51` | `@vis.gl/react-google-maps` — zero imports, dead dependency | Remove |
| PRF-06 | Performance | `services/backgroundLocation.ts:586-598` | `lastPosition` not persisted on stationary early-return — causes one extra network call on restart | Save `lastPosition` on early-return path |
| MON-05 | Sentry | `lib/sentry.ts:229-230` | `profilesSampleRate: 0.2` may add overhead on low-end devices | Reduce to 0.05–0.1 for production |
| MON-06 | Sentry | `navigation/AppNavigator.tsx:58-60` | `reactNavigationIntegration` created regardless of DSN presence | Accept negligible cost or gate behind DSN check |
| TST-07 | Testing | Project-wide | Good test-to-source ratio (~100 test files) undermined by excessive vitest exclusions | Reduce exclusion list to realize coverage benefit |
| UXP-01 | UX Polish | `app.json:13` | Splash screen uses deprecated top-level `"splash"` key | Migrate to `expo-splash-screen` plugin config |
| UXP-07 | UX Polish | `screens/FeedScreen.tsx:291` | TODO comment for unimplemented check-in flow | Implement or remove dead code path |
| UXP-08 | UX Polish | `services/backgroundLocation.ts:783` | Location denial shows technical error — no guided permission flow | Add modal with instructions + `Linking.openSettings()` link |

## Recommended Fix Order

### Phase 1 — Ship Blockers (fix before any production release)
1. **CFG-01 + CFG-02**: Add OTA update config (channel + updates URL + runtimeVersion)
2. **DAT-02 + RUN-02**: Realtime reconnection logic (biggest UX impact — stale data)
3. **SEC-02**: Add `google-services-key.json` to `.gitignore`
4. **SEC-01**: Restrict Google Maps API key in GCP Console
5. **CFG-04**: Reconcile version mismatch

### Phase 2 — High Priority (fix within first week)
6. **DAT-01**: Gate mutations behind network check
7. **DAT-07**: Buffer offline location data
8. **RUN-06**: Fix channel limit overflow
9. **MON-03**: Report realtime failures to Sentry
10. **PRF-01**: Move web-only deps out of mobile bundle
11. **TST-04 + TST-05**: Enable E2E CI pipelines
12. **TST-01 + TST-08**: Expand coverage to critical code

### Phase 3 — Medium Priority (fix within first month)
13. All remaining Medium findings (safe area insets, storage consistency, auth context optimization, CI config, etc.)

### Phase 4 — Cleanup
14. Remove dead dependencies, fix low-severity items

---

*Generated by 4-agent parallel audit. Cross-referenced against `docs/ideation/` reports — DAT-02/RUN-02 overlap with ideation report 09 findings on realtime; PRF-05 overlaps with ideation report 09 on AuthContext. All other findings are net-new.*
