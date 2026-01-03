# Backtrack Ideation Report

**Generated**: 2025-12-30
**Analysis Scope**: 249 TypeScript files across architecture, security, UI/UX, code quality, and features

---

## Executive Summary

After thoroughly analyzing the Backtrack codebase, I've identified **47 improvement opportunities** categorized by priority. The app has strong foundations but needs work on push notifications, tiered matching UI, and several security hardening items.

---

## 1. Critical Issues (Fix Immediately)

### Security

| Issue | Location | Impact |
|-------|----------|--------|
| **Auth tokens in AsyncStorage** | `lib/supabase.ts:67` | Tokens readable on rooted devices. Replace with `expo-secure-store` |
| **Photo moderation race condition** | `lib/photoSharing.ts` | Unapproved photos could be shared before moderation completes |
| **CORS allows all origins** | `supabase/functions/moderate-image` | Cross-origin attacks possible. Restrict to app domains |
| **Password min length = 6** | `screens/AuthScreen.tsx:58` | Weak passwords allowed. Increase to 8+ |
| **Email regex too permissive** | `screens/AuthScreen.tsx:57` | Invalid emails bypass validation |

### Features (Breaking Core Value)

| Issue | Location | Impact |
|-------|----------|--------|
| **Avatar matching not used in discovery** | `lib/matching.ts` exists but unused | 80% discoverability loss - consumers don't see curated posts |
| **Tiered check-in UI missing** | Infrastructure complete, no frontend | Safety/verification value prop undermined |
| **Push notifications not wired** | Edge functions exist but triggers missing | Users miss matches/messages entirely |

### Code Quality

| Issue | Location | Impact |
|-------|----------|--------|
| **useFavoriteLocations untested** | `hooks/useFavoriteLocations.ts` (1650+ lines) | Critical offline logic completely unverified |
| **ChatScreen memory leak** | `screens/ChatScreen.tsx:242-298` | Realtime subscriptions persist when conversation changes |
| **Silent error catches** | `hooks/useFavoriteLocations.ts` (6 locations) | Cache errors swallowed, debugging impossible |

---

## 2. High Priority Improvements

### New Features to Implement

1. **Smart Discovery Feed**
   - "Posts for You" based on avatar match + location proximity
   - Filter posts by match score threshold
   - Show match percentage on PostCard

2. **Match Score Display**
   - "You have a 45% match!" badge on posts
   - Color-coded match quality (green/blue/orange/gray)
   - Explain why you matched (which avatar features aligned)

3. **Regulars Mode UI**
   - Show fellow regulars at favorite locations
   - "5 regulars here" indicator
   - Mutual regulars discovery notifications

4. **Location Streaks**
   - Gamify repeat visits with streak tracking
   - Streak badges (5-day, 10-day, 30-day)
   - Leaderboard for favorite locations

### Security Hardening

1. **Replace AsyncStorage with expo-secure-store** for auth tokens
   ```typescript
   // lib/supabase.ts - Change from:
   storage: AsyncStorage
   // To:
   storage: {
     getItem: (key) => SecureStore.getItemAsync(key),
     setItem: (key, value) => SecureStore.setItemAsync(key, value),
     removeItem: (key) => SecureStore.deleteItemAsync(key),
   }
   ```

2. **Add rate limiting on auth attempts** - Server-side via Supabase

3. **Implement text content moderation** - Google Cloud Natural Language API for messages/posts

4. **Tighten moderation thresholds** - Change racy from VERY_LIKELY to LIKELY

5. **Verify RLS on blocks/reports tables** - May be missing policies

### UI/UX Enhancements

1. **Add toast/snackbar system** - Replace `Alert.alert()` with non-blocking toasts
2. **Implement skeleton loaders** - Replace spinners with content placeholders
3. **Add centralized theme system** - Design tokens for colors, spacing, typography
4. **Complete dark mode for React Native** - Currently web-only
5. **Add prefers-reduced-motion support** - Accessibility requirement

### Code Quality

1. **Centralize state management** - Add React Query or TanStack Query for caching
2. **Create shared error handling utilities** - `lib/errors.ts`
3. **Auto-generate database types** - `npx supabase gen types typescript --linked > types/database.ts`
4. **Consolidate to Vitest only** - Remove redundant Jest configuration
5. **Add tests for critical hooks** - useFavoriteLocations, usePhotoSharing, useNetworkStatus

---

## 3. Medium Priority Ideas

### Features

| Feature | Description | Effort |
|---------|-------------|--------|
| Verification badges | Email verified, photo verified, trust score | Medium |
| Voice messages | Audio recording in chat | High |
| Message editing/deletion | Edit/delete sent messages | Medium |
| Offline post creation queue | Save posts locally, sync when online | High |
| Event integration UI | Events data exists but no frontend screens | Medium |
| "Posts at your spots" feed | Show posts from favorite locations | Low |
| Notification badges | Unread counts in navigation | Low |
| Safety check-in | Share location before meeting | Medium |

### Design/UI Improvements

| Improvement | Location | Effort |
|-------------|----------|--------|
| Success/confirmation animations | After post creation, match, etc. | Medium |
| Real-time form validation | Show errors as user types | Low |
| Responsive web navigation | Mobile menu for small screens | Medium |
| Focus ring consistency | All interactive elements | Low |
| Undo for destructive actions | Delete post, block user | Medium |

### Security Additions

| Item | Description | Effort |
|------|-------------|--------|
| File magic number verification | Verify actual file type, not just MIME | Low |
| CSRF protection | Add tokens to forms | Medium |
| Security headers | CSP, X-Frame-Options, X-Content-Type-Options | Low |
| Location visit encryption | Encrypt sensitive location history | High |
| API key rotation | Support key rotation without app deploy | Medium |

### Code Improvements

| Item | Location | Effort |
|------|----------|--------|
| Extract AsyncStorage patterns | Create `lib/cache.ts` utility | Medium |
| Add error logging | Replace silent catches with logged warnings | Low |
| Optimize ChatScreen memoization | Memoize individual messages vs. entire list | Medium |
| Add npm audit to CI/CD | Security scanning in pipeline | Low |
| Remove dead exports | Audit barrel files for unused exports | Low |

---

## 4. Feature Completeness Summary

| Area | Complete | Status | Priority |
|------|----------|--------|----------|
| Core Matching (Producer) | 100% | Complete | - |
| Core Matching (Consumer) | 90% | Minor gaps | Low |
| Avatar Matching Discovery | 0% | **Not integrated** | **Critical** |
| Chat/Messaging | 85% | Good | Low |
| Photo Sharing | 90% | Good | Low |
| Moderation/Safety | 85% | Good | Low |
| Location Features | 80% | Good | Medium |
| Push Notifications | 50% | **Needs work** | **High** |
| Tiered Check-in System | 40% | **Needs work** | **High** |
| Regulars Mode | 40% | **Needs work** | Medium |
| Location Streaks | 30% | Infrastructure only | Medium |
| Event Integration | 60% | Partial | Medium |
| Offline Support | 35% | Limited | Medium |
| Analytics/Metrics | 0% | **Missing** | Medium |
| Web Frontend | 5% | Minimal | Low |

---

## 5. Quick Wins (Low Effort, High Impact)

| Task | Effort | Impact | Files |
|------|--------|--------|-------|
| Increase password min length to 8 | 10 min | Medium | `screens/AuthScreen.tsx` |
| Fix CORS origin restriction | 30 min | High | `supabase/functions/moderate-image` |
| Tighten racy content threshold | 30 min | High | `supabase/functions/moderate-image` |
| Add error logging to silent catches | 1 hour | Medium | `hooks/useFavoriteLocations.ts` |
| Add skeleton loaders | 2 hours | Medium | Create `components/SkeletonLoader.tsx` |
| Wire push notification triggers | 4 hours | **Critical** | Edge functions + lib code |

---

## 6. Technical Debt

| Debt Item | Description | Resolution |
|-----------|-------------|------------|
| CLAUDE.md claims Zustand | Not in package.json | Update docs or add Zustand |
| Both Jest and Vitest configured | Redundant test runners | Remove Jest, keep Vitest |
| Manual database types | Can drift from schema | Auto-generate with Supabase CLI |
| 39 migrations | Need consolidation | Create combined migration for new deploys |
| Dual button implementations | RN + web versions | Unify or document intentional split |
| React 19 + RN 0.81 mismatch | Version compatibility risk | Document compatibility strategy |

---

## 7. Architecture Recommendations

### Current State (Strengths)
- Solid hybrid Expo + Next.js architecture
- Good hook-based state management
- Strong RLS policies on all tables
- Well-documented components with JSDoc
- Comprehensive error result types
- Good separation of concerns

### Suggested Improvements

1. **Add React Query/TanStack Query**
   - Centralized data fetching and caching
   - Automatic cache invalidation
   - Optimistic updates with rollback
   - Replace manual AsyncStorage caching patterns

2. **Implement Feature Flags**
   - Gradual feature rollouts
   - A/B testing capability
   - Kill switch for problematic features

3. **Add Analytics Integration**
   - Segment or Mixpanel for event tracking
   - User journey analysis
   - Conversion funnel metrics
   - Feature usage tracking

4. **Add Crash Reporting**
   - Sentry for error monitoring
   - Performance monitoring
   - Release health tracking

5. **Create Admin Dashboard**
   - Moderation queue management
   - User reports review
   - Content approval workflow
   - Analytics dashboard

---

## 8. Recommended Implementation Order

### Phase 1: Critical Fixes (Week 1-2)
- [ ] Secure token storage (expo-secure-store)
- [ ] Wire push notification triggers
- [ ] Fix moderation race condition
- [ ] Add avatar-based discovery filtering
- [ ] Fix ChatScreen memory leak
- [ ] Add error logging to silent catches

### Phase 2: Core Features (Week 3-4)
- [ ] Complete tiered matching UI
- [ ] Implement regulars mode screens
- [ ] Add toast notification system
- [ ] Add analytics tracking (Segment/Mixpanel)
- [ ] Add tests for useFavoriteLocations

### Phase 3: Polish (Week 5-6)
- [ ] Location streaks UI
- [ ] Dark mode completion for RN
- [ ] Skeleton loaders
- [ ] Test coverage for critical hooks
- [ ] Consolidate to Vitest only

### Phase 4: Enhancement (Week 7+)
- [ ] Voice messages
- [ ] Offline post creation queue
- [ ] Event integration UI
- [ ] Verification badges
- [ ] Message editing/deletion

---

## 9. Security Audit Checklist

### Implemented (Good)
- [x] Row Level Security on all tables
- [x] Email verification required
- [x] Selfies in private storage bucket
- [x] Photo moderation with SafeSearch
- [x] User blocking system
- [x] Content reporting system
- [x] MIME type restrictions on uploads
- [x] File size limits (5MB)
- [x] Signed URLs with expiration

### Needs Implementation
- [ ] SecureStore for auth tokens
- [ ] Rate limiting on auth
- [ ] Text content moderation
- [ ] CSRF protection
- [ ] Security headers (CSP, X-Frame-Options)
- [ ] File magic number verification
- [ ] Stricter moderation thresholds
- [ ] CORS origin restrictions
- [ ] GDPR data deletion UI
- [ ] Phone verification option

---

## 10. UI/UX Audit Summary

### Strengths (7.5/10 Rating)
- Excellent component documentation (JSDoc)
- Strong accessibility attributes (222 occurrences)
- Comprehensive haptic feedback system
- Good error boundary implementation
- Well-organized component hierarchy
- Multiple empty state variants

### Weaknesses
- No toast/snackbar system (uses Alert.alert)
- Incomplete dark mode (web only)
- No skeleton loaders
- Missing success feedback animations
- No centralized theme tokens
- Focus ring inconsistency

---

## 11. Test Coverage Gaps

### Critical (Untested)
- `hooks/useFavoriteLocations.ts` - 1650+ lines, complex offline logic
- `lib/supabase.ts` - Post sorting/deprioritization logic
- `services/notifications.ts` - Push token registration
- `lib/conversations.ts` - Conversation creation

### Important (Partial)
- `screens/ChatScreen.tsx` - Realtime subscription handling
- `contexts/AuthContext.tsx` - Error scenarios
- `hooks/useNetworkStatus.ts` - Edge cases

### Test Files: 27 total
- Components: 4 tests
- Hooks: 7 tests
- Libraries: 7 tests
- E2E: 5 tests
- Utilities: 4 tests

---

## Appendix: File Locations for Key Issues

### Security Fixes
- `lib/supabase.ts:67` - AsyncStorage → SecureStore
- `screens/AuthScreen.tsx:57-58` - Email regex, password length
- `supabase/functions/moderate-image/index.ts:54-77` - Moderation thresholds
- `supabase/functions/moderate-image/index.ts:134-137` - CORS headers

### Memory Leaks
- `screens/ChatScreen.tsx:242-298` - Realtime subscription cleanup
- `hooks/useNetworkStatus.ts:337-342` - Interval cleanup

### Silent Errors
- `hooks/useFavoriteLocations.ts:342-344, 362-364, 387-389, 405-407, 421-423, 435-437`

### Missing Features
- Avatar matching: `lib/matching.ts` (exists but unused in discovery)
- Tiered matching: Database ready, no UI in `screens/`
- Push triggers: Edge functions exist in `supabase/functions/`, not wired

---

*This report should be reviewed and updated as issues are resolved.*
