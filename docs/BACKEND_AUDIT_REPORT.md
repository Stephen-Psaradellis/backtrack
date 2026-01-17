# Backend Audit Report - Love Ledger

**Date:** 2026-01-17
**Auditor:** Claude Code
**Scope:** Supabase backend, database schema, RPC functions, hooks, services

---

## Executive Summary

The Love Ledger backend is built on **Supabase with PostgreSQL + PostGIS**, using a React Native/Expo mobile client. The architecture is generally well-designed with comprehensive RLS policies, proper indexing, and secure token storage. However, several **critical and moderate performance bottlenecks** were identified that should be addressed.

### Risk Summary

| Severity | Count | Category |
|----------|-------|----------|
| **CRITICAL** | 2 | Performance bottlenecks |
| **HIGH** | 3 | Query inefficiencies |
| **MEDIUM** | 4 | Optimization opportunities |
| **LOW** | 3 | Minor improvements |

---

## Critical Issues

### 1. N+1 Query Pattern in `get_user_conversations` RPC Function

**Severity:** CRITICAL
**Location:** `supabase/migrations/018_rls_policies.sql:403-449`

**Problem:** The `get_user_conversations` function uses **three correlated subqueries** per row to fetch last message content, timestamp, and unread count. This creates an O(n) query pattern where n = number of conversations.

```sql
-- PROBLEMATIC PATTERN (line 416-436)
SELECT
    c.id,
    -- ... other fields ...
    (
        SELECT m.content  -- Subquery 1: N+1
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
    ) AS last_message_content,
    (
        SELECT m.created_at  -- Subquery 2: N+1
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
    ) AS last_message_at,
    (
        SELECT COUNT(*)  -- Subquery 3: N+1
        FROM messages m
        WHERE m.conversation_id = c.id
        AND m.sender_id != current_user_id
        AND m.is_read = false
    )::BIGINT AS unread_count
FROM conversations c
```

**Impact:**
- 50 conversations = 150+ database queries
- Linear performance degradation with conversation count
- High latency for users with many conversations

**Recommendation:** Rewrite using `LATERAL JOIN` or `LEFT JOIN` with window functions:

```sql
-- RECOMMENDED FIX
SELECT
    c.*,
    lm.content AS last_message_content,
    lm.created_at AS last_message_at,
    COALESCE(uc.unread_count, 0) AS unread_count
FROM conversations c
LEFT JOIN LATERAL (
    SELECT content, created_at
    FROM messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
) lm ON true
LEFT JOIN (
    SELECT conversation_id, COUNT(*) AS unread_count
    FROM messages
    WHERE sender_id != current_user_id AND is_read = false
    GROUP BY conversation_id
) uc ON uc.conversation_id = c.id
WHERE (c.producer_id = current_user_id OR c.consumer_id = current_user_id)
```

---

### 2. Missing Composite Index on Posts RLS Policy

**Severity:** CRITICAL
**Location:** `supabase/migrations/018_rls_policies.sql:101-113`

**Problem:** The posts RLS policy performs a correlated subquery check against the `blocks` table for EVERY post query:

```sql
-- RLS Policy (line 101-113)
CREATE POLICY "posts_select_active_not_blocked"
    ON posts FOR SELECT TO authenticated
    USING (
        is_active = true
        AND expires_at > NOW()
        AND NOT EXISTS (
            SELECT 1 FROM blocks
            WHERE (blocker_id = auth.uid() AND blocked_id = posts.producer_id)
               OR (blocker_id = posts.producer_id AND blocked_id = auth.uid())
        )
    );
```

**Impact:**
- This subquery runs for EVERY row in the result set
- No composite index exists for efficient block lookups
- Users with many posts experience significant latency

**Existing Indexes (verified in migration):**
```sql
-- From 20251231220000_performance_indexes.sql:98-104
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_blocked
    ON blocks(blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_blocker
    ON blocks(blocked_id, blocker_id);
```

**Status:** The necessary indexes DO exist. However, the RLS policy evaluation still forces a subquery per row. Consider:
1. Caching block relationships in user JWT claims (via custom hook)
2. Pre-computing a "hidden_posts" materialized view for heavy users

---

## High Severity Issues

### 3. Repeated PostGIS Point Construction in Spatial Queries

**Severity:** HIGH
**Location:** `supabase/migrations/016_geospatial_functions.sql:61-68`

**Problem:** Every call to spatial functions reconstructs geography points multiple times:

```sql
-- Each query constructs points twice (line 61-68)
ST_Distance(
  user_point,
  ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography
) AS distance_meters
FROM locations l
WHERE ST_DWithin(
  user_point,
  ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography,  -- Duplicate!
  radius_meters
)
```

**Impact:** Point construction is repeated for both `ST_Distance` and `ST_DWithin` for every row.

**Verification:** An expression index exists (`idx_locations_geography` in migration `20260114000003_nearby_posts.sql:91-94`):
```sql
CREATE INDEX IF NOT EXISTS idx_locations_geography
  ON locations USING gist (
    geography(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326))
  );
```

**Status:** Index exists but is an expression index. The query planner may still need to evaluate the expression. Consider adding a generated column:

```sql
ALTER TABLE locations ADD COLUMN geog geography(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED;

CREATE INDEX idx_locations_geog ON locations USING GIST(geog);
```

---

### 4. In-Memory Rate Limiting Not Suitable for Production

**Severity:** HIGH
**Location:** `lib/rateLimit.ts:65`

**Problem:** Rate limiting uses an in-memory `Map`:

```typescript
// Line 65
const rateLimitStore = new Map<string, RateLimitEntry>()
```

**Impact:**
- Rate limits reset on server restart
- Not distributed - each instance has separate limits
- Memory grows unbounded with unique clients

**Recommendation:** The code already notes this (line 63-64):
```typescript
/**
 * In-memory store for rate limit data
 * In production, consider using Redis for distributed rate limiting
 */
```

Implement Redis-based rate limiting using Upstash or similar.

---

### 5. Redundant Queries in `startConversation` Flow

**Severity:** HIGH
**Location:** `lib/conversations.ts:440-484`

**Problem:** The `startConversation` function makes TWO queries when creating a new conversation:

```typescript
// Line 461 - First query: check if exists
const existingResult = await checkExistingConversation(userId, validPost.id)

// Line 483 - If not exists, create new (which may also check for uniqueness)
return await createConversation(userId, validPost)
```

Then `createConversation` handles unique constraint violation (line 371-383):
```typescript
if (error.code === '23505') {
  // Unique constraint violation - conversation already exists
  const existingResult = await checkExistingConversation(consumerId, post.id)
  // ...
}
```

**Impact:** Race conditions can cause up to 3 queries instead of 1.

**Recommendation:** Use `INSERT ... ON CONFLICT DO NOTHING RETURNING` or a single `INSERT ... ON CONFLICT DO UPDATE SET id = excluded.id RETURNING *` pattern.

---

## Medium Severity Issues

### 6. Background Location Service Missing RPC Function

**Severity:** MEDIUM
**Location:** `services/backgroundLocation.ts:212-227`

**Problem:** The service calls `get_locations_near_point` RPC which doesn't exist in migrations:

```typescript
// Line 212-218
const { data, error } = await supabase.rpc('get_locations_near_point', {
  p_lat: lat,
  p_lon: lon,
  p_radius_meters: 200,
  p_limit: 1,
})
```

**Verification:** Searched all migrations - this function is NOT defined. Only these location RPCs exist:
- `get_nearby_locations`
- `get_locations_with_active_posts`
- `get_posts_within_radius`

**Impact:** Background location feature will silently fail.

**Recommendation:** Either:
1. Create the missing RPC function
2. Use existing `get_nearby_locations` function

---

### 7. Unbounded Query in `getUserConversations`

**Severity:** MEDIUM
**Location:** `lib/conversations.ts:525-536`

**Problem:** No pagination or limit enforced by default:

```typescript
// Line 525-536
let query = supabase
  .from('conversations')
  .select('*')
  .or(`producer_id.eq.${userId},consumer_id.eq.${userId}`)
  .order('updated_at', { ascending: false })

if (activeOnly) {
  query = query.eq('is_active', true)
}

const { data, error } = await query  // No LIMIT!
```

**Impact:** Users with 1000+ conversations will fetch ALL of them.

**Recommendation:** Add default pagination:
```typescript
const { data, error } = await query.range(0, 49)  // Fetch first 50
```

---

### 8. JWT Token Size Optimization Partial

**Severity:** MEDIUM
**Location:** `supabase/migrations/20260103222712_custom_jwt_hook.sql`

**Problem:** Custom JWT hook removes metadata correctly but comment indicates manual dashboard step required:

```sql
-- IMPORTANT: After running this migration, you must enable the hook in
-- Supabase Dashboard -> Authentication -> Hooks -> Custom Access Token
-- Set it to: public.custom_access_token_hook
```

**Verification:** The hook is properly defined with correct permissions (GRANT to `supabase_auth_admin`, REVOKE from public).

**Status:** Ensure hook is enabled in dashboard to prevent SecureStore 2KB limit issues.

---

### 9. Duplicate Distance Calculation in `useFavoriteLocations`

**Severity:** MEDIUM
**Location:** `hooks/useFavoriteLocations.ts:259-276`

**Problem:** Haversine distance calculated client-side when server could do it:

```typescript
// Line 259-276 - Client-side distance calculation
function calculateDistanceMeters(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3 // Earth's radius in meters
  // ... Haversine formula
  return R * c
}
```

**Impact:** CPU usage on client; distance could differ from server-calculated distances.

**Recommendation:** Return distance from server in `getUserFavorites` if user coordinates are known.

---

## Low Severity Issues

### 10. Cleanup Interval Could Be Configurable

**Severity:** LOW
**Location:** `lib/rateLimit.ts:70`

```typescript
const CLEANUP_INTERVAL = 5 * 60 * 1000  // Hardcoded 5 minutes
```

**Recommendation:** Make configurable based on traffic patterns.

---

### 11. AsyncStorage Error Handling Swallows Errors

**Severity:** LOW
**Location:** `hooks/useFavoriteLocations.ts:340-344`

```typescript
} catch (error) {
  // Log cache read errors for debugging
  console.warn('[useFavoriteLocations] Failed to load from cache:', error)
  return null  // Silently fails
}
```

**Recommendation:** Consider tracking cache failures for monitoring.

---

### 12. Debounce Timer Type Safety

**Severity:** LOW
**Location:** `hooks/useNearbyLocations.ts:137`

```typescript
const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

**Status:** Correctly typed. No issue, just noted for completeness.

---

## Security Audit

### Verified Security Measures

| Area | Status | Evidence |
|------|--------|----------|
| RLS Enabled | Secure | All tables have RLS enabled (`018_rls_policies.sql:24-30`) |
| Selfie Privacy | Secure | `selfie_url` masked in `get_posts_for_location` (line 365-368) |
| Block Enforcement | Secure | Block checks in all relevant policies |
| Token Storage | Secure | Uses `expo-secure-store` for encrypted storage |
| GPS Spoofing Detection | Secure | Flags accuracy <1m as suspicious (`20260117000000_dynamic_radius_verification.sql:75-79`) |
| SECURITY DEFINER | Secure | All RPC functions properly use SECURITY DEFINER |

### Potential Security Concerns

#### 1. Rate Limiting Not Applied to RPC Calls

**Location:** Client-side calls to RPC functions have no server-side rate limiting visible.

**Recommendation:** Implement pg_rate_limit extension or Edge Function middleware.

#### 2. Conversation Participant Check Before Message Send

**Status:** VERIFIED SECURE - RLS policy checks participant status (line 228-245):
```sql
AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (c.producer_id = auth.uid() OR c.consumer_id = auth.uid())
    AND c.is_active = true
```

---

## Performance Index Analysis

### Existing Indexes (Verified)

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| conversations | `idx_conversations_producer_status` | (producer_id, status) | Filtered by pending/active |
| conversations | `idx_conversations_consumer_status` | (consumer_id, status) | Filtered by pending/active |
| messages | `idx_messages_conversation_unread` | (conversation_id, is_read) | Unread count |
| messages | `idx_messages_conversation_unread_created` | (conversation_id, created_at DESC) | Last message |
| posts | `idx_posts_location_is_active_created` | (location_id, is_active, created_at DESC) | Map display |
| posts | `idx_posts_expires_active` | (expires_at) WHERE is_active | Cleanup jobs |
| locations | `idx_locations_geography` | GIST expression | Spatial queries |
| blocks | `idx_blocks_blocker_blocked` | (blocker_id, blocked_id) | Block checks |
| blocks | `idx_blocks_blocked_blocker` | (blocked_id, blocker_id) | Reverse lookup |
| notifications | `idx_notifications_user_unread` | (user_id, is_read) | Unread notifications |
| location_visits | `idx_location_visits_user_created` | (user_id, created_at DESC) | Visit history |

### Missing Indexes (Recommendations)

| Table | Recommended Index | Reason |
|-------|------------------|--------|
| `user_checkins` | `(user_id, location_id) WHERE checked_out_at IS NULL` | Active checkin lookup |
| `posts` | `(producer_id, created_at DESC)` | User's own posts |
| `locations` | `(google_place_id)` | Place ID lookups |

---

## Recommendations Priority Matrix

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | Fix N+1 in get_user_conversations | Medium | High |
| P0 | Create missing get_locations_near_point RPC | Low | Medium |
| P1 | Add pagination to getUserConversations | Low | Medium |
| P1 | Implement Redis rate limiting | Medium | High |
| P2 | Add stored geography column | Medium | Medium |
| P2 | Use UPSERT for conversation creation | Low | Low |
| P3 | Monitor cache failures | Low | Low |

---

## Conclusion

The Love Ledger backend demonstrates **solid architectural decisions** with comprehensive security through RLS, proper indexing strategy, and secure token management. The two **critical issues** (N+1 queries in conversations and missing RPC function) should be prioritized for immediate fix. The **high severity** rate limiting issue becomes critical only at scale.

**Overall Backend Health Score: 7/10**

- **Strengths:** Security, PostGIS implementation, offline support
- **Weaknesses:** Some N+1 patterns, in-memory rate limiting, missing RPC
