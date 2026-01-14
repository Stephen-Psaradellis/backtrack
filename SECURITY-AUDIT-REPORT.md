# Security Audit Report

**Project:** Backtrack
**Date:** January 9, 2026
**Auditor:** Security Audit (Ralph Loop)
**Status:** PASS

---

## Executive Summary

This security audit was conducted on the Backtrack codebase to identify and address security vulnerabilities before production launch. The audit covered dependency vulnerabilities, API key exposure, input validation, authorization policies, data privacy, rate limiting, and content moderation.

**Overall Assessment:** The codebase demonstrates strong security practices with comprehensive RLS policies, proper input validation, and privacy-first design. One medium-severity issue was found and remediated during this audit.

---

## Findings Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 1 | 1 | 0 |
| Low | 2 | 0 | 2 |
| Informational | 3 | 0 | 3 |

---

## Issues Fixed During Audit

### M1: Hardcoded Supabase Project Reference in Migration
**Severity:** Medium
**File:** `supabase/migrations/20251231100000_configure_edge_functions.sql`
**Status:** FIXED

**Description:** The migration file contained the actual production Supabase project reference (`hyidfsfvqlsimefixfhc`) hardcoded in the Edge Function URLs. While this is not a secret key, exposing the project ID can aid targeted attacks and makes the codebase less portable.

**Remediation Applied:** Replaced hardcoded project reference with placeholder `YOUR_PROJECT_REF`. Added documentation comments explaining that values must be updated after deployment.

**Before:**
```sql
('edge_function_url', 'https://hyidfsfvqlsimefixfhc.supabase.co/functions/v1/send-notification'),
```

**After:**
```sql
('edge_function_url', 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-notification'),
```

---

## Low Severity Items (Acceptable Risk)

### L1: Validation Module Not Widely Integrated
**Files:** Various component files
**Status:** NOTED

The comprehensive `lib/validation.ts` module is implemented but only directly imported in 2 files. Input validation is happening at the database level via RLS policies and at the UI level via form validation.

**Risk Assessment:** Low - The RLS policies enforce data integrity at the database level, which is the most critical layer.

**Recommendation:** Consider integrating `lib/validation.ts` into forms for consistent UX validation.

---

### L2: In-Memory Rate Limiting (Single Instance)
**File:** `lib/rateLimit.ts`
**Status:** NOTED

Rate limiting is implemented in-memory using a Map. This works correctly for single-instance deployments but won't share state across multiple server instances.

**Risk Assessment:** Low - The file includes documentation noting this limitation.

**Recommendation:** Before scaling to multiple instances, implement Redis-based rate limiting.

---

## Informational Items

### I1: Example Credentials in Documentation
**File:** `CONTRIBUTING.md`
**Status:** ACCEPTABLE

The documentation contains example API keys and tokens (e.g., `YOUR_API_KEY_HERE`). These are clearly placeholder/example values, not real credentials.

### I2: Test Credentials in Test Files
**Files:** `e2e/helpers.ts`, various test files
**Status:** ACCEPTABLE

Test files contain test credentials (e.g., `Test1234!` passwords). These are for test accounts only and are documented in CLAUDE.md.

### I3: Mock Tokens in Development Mocks
**Files:** `lib/dev/mock-supabase.ts`, `lib/api/*.ts`
**Status:** ACCEPTABLE

Development mock files contain fake tokens and credentials. These are used for local development without real API connections.

---

## Security Controls Verified

### 1. Dependency Vulnerabilities

```
npm audit
found 0 vulnerabilities

npx audit-ci --high
Passed npm security audit.
```

**Status:** All dependencies are up to date with no known security vulnerabilities.

---

### 2. API Key & Secret Exposure

| Check | Status | Notes |
|-------|--------|-------|
| Hardcoded Google API keys | PASS | No `AIza*` patterns in source code |
| Hardcoded Stripe keys | PASS | No `pk_live*` or `sk-*` patterns found |
| JWT tokens | PASS | Only example tokens in documentation |
| Supabase credentials | PASS | All loaded from environment variables |
| .env files | PASS | `.env*` properly gitignored |
| Native directories | PASS | `android/` and `ios/` gitignored (CNG) |

**Environment Variable Pattern:**
- All secrets loaded via `process.env.EXPO_PUBLIC_*` or `process.env.NEXT_PUBLIC_*`
- Doppler CLI used for secrets management
- `.env.example` contains only placeholder values

---

### 3. Input Validation Review

**File:** `lib/validation.ts` (728 lines)

| Validation Type | Implementation | XSS Protection |
|-----------------|----------------|----------------|
| Email | RFC 5322 compliant regex | N/A |
| Password | Min 8 chars, strength scoring | N/A |
| Text/Content | Length limits, sanitization | YES |
| URLs | Protocol validation (http/https only) | YES |
| Coordinates | Range validation (-90/90, -180/180) | N/A |
| UUID | v4 format validation | N/A |

**XSS Prevention Patterns (`DANGEROUS_PATTERNS`):**
- `<script>` tags stripped
- `<iframe>` tags stripped
- `javascript:` URLs blocked
- Event handlers (`on*=`) blocked
- `<style>` tags stripped
- `data:text/html` URLs blocked

**SQL Injection Prevention:**
- `sanitizeForStorage()` removes SQL keywords
- Note: Parameterized queries via Supabase provide primary protection

**Content Limits:**
```typescript
CONTENT_LIMITS = {
  username: { min: 3, max: 30 },
  displayName: { min: 1, max: 50 },
  postMessage: { min: 1, max: 500 },
  chatMessage: { min: 1, max: 1000 },
  bio: { min: 0, max: 300 },
}
```

---

### 4. Authentication & Authorization (RLS)

**Files:** `supabase/migrations/015_rls_policies.sql`, `supabase/migrations/018_rls_policies.sql`

All tables have RLS enabled:
- `profiles` - Users can only modify their own profile
- `posts` - Block relationships respected, selfie_url protected
- `conversations` - Only participants can access
- `messages` - Only conversation participants can read/write
- `blocks` - Users can only manage their own blocks
- `reports` - Users can only see their own reports
- `photo_shares` - Owner CRUD, shared read

**Key Security Features:**
1. **Block Relationship Enforcement:** Both blocker and blocked cannot see each other's content
2. **Selfie Privacy:** `selfie_url` only visible to post owner via `get_posts_for_location()` function
3. **Conversation Access:** `can_access_conversation()` validates participant + active + no blocks
4. **Message Send Validation:** Verifies sender is conversation participant and no block exists

---

### 5. Data Privacy

**Account Deletion (GDPR/CCPA Compliant):**
**File:** `supabase/migrations/20251231200000_account_deletion.sql`

- `delete_user_account()` function removes all user data
- Cascading deletion: messages, conversations, posts, photos, favorites, blocks, reports, push tokens, preferences
- Schedule deletion with configurable grace period (1-30 days, default 7)
- Cancellation available via `cancel_account_deletion()`

**Storage Privacy:**
**File:** `supabase/migrations/019_storage_policies.sql`

- Selfies bucket is **private** (not public)
- Only file owner can access their files
- Path structure enforces ownership: `{user_id}/{post_id}.jpg`
- Automatic selfie deletion when post is deleted (trigger)

**Signed URLs:**
- Default expiry: 1 hour (3600 seconds)
- Generated via `createSignedUrl()` function

**Blocked User Content:**
- Hidden from both directions (bidirectional blocking)
- `get_hidden_user_ids()` returns blocked + blockers

---

### 6. Rate Limiting

**File:** `lib/rateLimit.ts`

**Preset Configurations:**
| Preset | Requests | Window | Use Case |
|--------|----------|--------|----------|
| `auth` | 5 | 1 min | Login/signup (brute force protection) |
| `api` | 60 | 1 min | Standard API calls |
| `search` | 30 | 1 min | Expensive search operations |
| `write` | 20 | 1 min | Create/update operations |
| `upload` | 10 | 1 min | File uploads |
| `read` | 120 | 1 min | High-frequency reads |

**Features:**
- Sliding window algorithm
- Memory cleanup every 5 minutes
- IP extraction from `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP`
- Standard rate limit headers (`X-RateLimit-*`)

---

### 7. Content Moderation

**Blocking System (`lib/moderation.ts`):**
- `blockUser()` - Creates block and deactivates conversations
- `unblockUser()` - Removes block (conversations stay deactivated)
- `hasBlockRelationship()` - Checks bidirectional block
- `getHiddenUserIds()` - Gets all users to filter from content

**Reporting System:**
- `submitReport()` - Report posts, messages, or users
- Duplicate report prevention via `hasUserReported()`
- Report reasons: Spam, Harassment, Inappropriate, Impersonation, Violence, Hate Speech, Other

**Image Moderation (`supabase/functions/moderate-image/index.ts`):**
- Google Cloud Vision SafeSearch API integration
- Rejection thresholds: adult (LIKELY+), violence (LIKELY+), racy (LIKELY+)
- Rejected images automatically deleted from storage
- Photos marked pending until moderation completes
- Only approved photos can be shared
- CORS restricted to allowed origins

---

### 8. Storage Security

**Selfies Bucket Configuration:**
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'selfies',
    'selfies',
    false,  -- CRITICAL: Private bucket
    5242880,  -- 5MB max
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);
```

**Storage Policies:**
- SELECT: Only owner (`(storage.foldername(name))[1] = auth.uid()::text`)
- INSERT: Only to own folder
- UPDATE: Only own files
- DELETE: Only own files

---

### 9. Security Hooks & Safeguards

**Git Pre-commit Hook (`.git/hooks/pre-commit`):**
- Scans for API key patterns before commit
- Blocks commits containing secrets

**Claude Code Hook (`.claude/settings.json`):**
- Additional secret detection layer
- Blocks commits if secrets detected

**CNG (Continuous Native Generation):**
- `android/` and `ios/` directories not committed
- Secrets embedded at build time from environment
- Prevents accidental secret commits in native code

---

## Verification Checklist

- [x] `npm audit` shows no high/critical vulnerabilities
- [x] No hardcoded secrets found in production code
- [x] Input validation module exists with comprehensive coverage
- [x] RLS policies reviewed and correctly implemented
- [x] Account deletion removes all user data
- [x] Blocking system hides content bidirectionally
- [x] Signed URLs have appropriate expiration (1 hour)
- [x] Rate limiting configured for all endpoint types
- [x] Image moderation with SafeSearch API
- [x] Security report generated

---

## Recommendations

### Pre-Production (Required)
1. **Update Migration Placeholders:** Replace `YOUR_PROJECT_REF` in `20251231100000_configure_edge_functions.sql` with actual production values before deployment
2. **Verify Doppler Integration:** Ensure all environment variables are properly configured in production environment

### Post-Launch (Recommended)
1. **Monitor Rate Limit Metrics:** Track `getRateLimitStoreSize()` to identify potential abuse patterns
2. **Redis Rate Limiting:** Implement Redis-based rate limiting before horizontal scaling
3. **Security Audit Schedule:** Conduct quarterly security audits and annual penetration testing
4. **Integrate Validation Module:** Use `lib/validation.ts` consistently in form components

---

## Conclusion

The Backtrack codebase passes this security audit with no critical or high-severity issues remaining. The one medium-severity issue (hardcoded project reference) was remediated during this audit. The application implements defense-in-depth security with multiple layers of protection including input validation, database-level RLS, rate limiting, and proper secret management.

**Audit Status: PASS**

The application is **approved for production launch** from a security perspective, pending:
1. Manual update of Edge Function URLs with actual project reference
2. Verification that Doppler secrets are configured correctly in production

---

*This report was generated as part of a comprehensive security audit.*
