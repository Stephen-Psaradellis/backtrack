# P-001, P-002, P-003: RLS and Query Optimization Implementation

**Migration File:** `supabase/migrations/20260212100000_rls_optimization.sql`

## Summary

This migration implements three critical database performance optimizations identified in the performance audit report (`docs/ideation/09-performance-ideation-report.md`).

## Implemented Optimizations

### P-001: Split RLS Block-Check OR into Separate NOT EXISTS

**Problem:**
- RLS policies on `conversations` and `get_posts_for_user()` used OR-based block checks
- Pattern: `WHERE (blocker_id = A AND blocked_id = B) OR (blocker_id = B AND blocked_id = A)`
- PostgreSQL struggled to optimize this, often resulting in sequential scans or inefficient bitmap heap scans

**Solution:**
1. **Created helper function `is_blocked_by(user_a UUID, user_b UUID)`:**
   - Uses UNION ALL pattern with two separate index lookups
   - Each subquery uses a different index: `idx_blocks_blocker_blocked` and `idx_blocks_blocked_blocker`
   - SECURITY DEFINER with `SET search_path = public` for security and consistent execution

2. **Updated RLS policies to use the helper:**
   - `conversations_select_participant_not_blocked` policy
   - `get_posts_for_user()` function block check

**Expected Performance Gain:** 3x-10x faster block checks

**Technical Details:**
```sql
-- Old pattern (slow)
NOT EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = A AND blocked_id = B)
       OR (blocker_id = B AND blocked_id = A)
)

-- New pattern (fast)
NOT is_blocked_by(A, B)

-- Helper function uses UNION ALL
SELECT 1 FROM blocks WHERE blocker_id = A AND blocked_id = B
UNION ALL
SELECT 1 FROM blocks WHERE blocker_id = B AND blocked_id = A
```

### P-002: Replace Messages INSERT RLS with SECURITY DEFINER Function

**Problem:**
- `messages_insert_participant` RLS policy had complex inline logic
- Checked conversation participation, active status, and blocking in one policy
- PostgreSQL couldn't cache the execution plan effectively
- Repeated complex logic on every insert

**Solution:**
1. **Created helper function `can_send_message(p_conversation_id UUID)`:**
   - Encapsulates all validation logic
   - Single query to fetch conversation details
   - Uses `is_blocked_by()` helper for optimized blocking check
   - SECURITY DEFINER with `SET search_path = public`

2. **Simplified RLS policy:**
   ```sql
   CREATE POLICY "messages_insert_participant"
   WITH CHECK (
       sender_id = auth.uid()
       AND can_send_message(conversation_id)
   );
   ```

**Expected Performance Gain:**
- Better plan caching and reuse
- Reduced planning overhead on inserts
- Improved maintainability

**Validation Checks in can_send_message():**
1. User is authenticated
2. Conversation exists and is active
3. User is a participant (producer or consumer)
4. Neither party has blocked the other

### P-003: Time-Bound Checkins CTE in get_posts_for_user()

**Problem:**
- `user_checkins_expanded` CTE scanned ALL historical checkins
- No time filter, causing full table scan
- Duplicate subquery for `checkin_id` selection executed twice

**Solution:**
1. **Added time filter to CTE:**
   ```sql
   WHERE uc.user_id = v_current_user_id
       AND uc.checked_in_at >= NOW() - INTERVAL '9 days'
   ```
   - Posts expire in 7 days
   - ±2 hour sighting window
   - 9 days covers all possible matches with buffer

2. **Replaced duplicate subquery with LEFT JOIN LATERAL:**
   ```sql
   LEFT JOIN LATERAL (
       SELECT uce.checkin_id
       FROM user_checkins_expanded uce
       WHERE uce.location_id = p.location_id
           AND uce.verified = true
           AND [time overlap conditions]
       LIMIT 1
   ) uce_match ON true
   ```
   - Executes once per post instead of twice
   - More efficient query plan
   - Clearer intent

**Expected Performance Gain:** 5x-50x faster depending on checkins table size

**Why 9 Days:**
- Active posts: 7 days
- Sighting time window: ±2 hours
- Buffer for edge cases: ~1 day
- Total: 9 days ensures all relevant checkins are included

## Database Functions Created

### 1. `is_blocked_by(user_a UUID, user_b UUID) RETURNS BOOLEAN`
- **Purpose:** Fast bidirectional block check
- **Security:** SECURITY DEFINER with SET search_path = public
- **Performance:** Uses UNION ALL with separate index lookups
- **Returns:** TRUE if either user has blocked the other

### 2. `can_send_message(p_conversation_id UUID) RETURNS BOOLEAN`
- **Purpose:** Validates message sending permissions
- **Security:** SECURITY DEFINER with SET search_path = public
- **Checks:**
  - User authentication
  - Conversation existence and active status
  - User participation
  - No blocking relationship
- **Returns:** TRUE if user can send message to conversation

### 3. `get_posts_for_user(...)` (Updated)
- **Changes:**
  - Time-bounded `user_checkins_expanded` CTE
  - LEFT JOIN LATERAL for checkin_id
  - Uses `is_blocked_by()` for block checks
- **Maintains:** All existing functionality and return structure

## RLS Policies Updated

1. **`conversations_select_participant_not_blocked`**
   - Uses `is_blocked_by()` helper
   - Cleaner, more maintainable
   - Same security guarantees

2. **`messages_insert_participant`**
   - Uses `can_send_message()` helper
   - Simplified policy logic
   - Better plan caching

## Testing & Validation

### Manual Tests Included in Migration

The migration includes commented test queries:

1. **Test `is_blocked_by()` function:**
   ```sql
   SELECT is_blocked_by('user-a-uuid'::UUID, 'user-b-uuid'::UUID);
   ```

2. **Test `can_send_message()` function:**
   ```sql
   SELECT can_send_message('conversation-uuid'::UUID);
   ```

3. **Verify `get_posts_for_user()` performance:**
   ```sql
   EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
   SELECT * FROM get_posts_for_user(NULL, 50, 0);
   ```

4. **Verify conversations RLS performance:**
   ```sql
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT * FROM conversations
   WHERE producer_id = auth.uid() OR consumer_id = auth.uid();
   ```

### Expected EXPLAIN Output

**Before (P-003):**
- Seq Scan on user_checkins (potentially millions of rows)
- Multiple executions of duplicate subquery

**After (P-003):**
- Index Scan on user_checkins with time filter
- Single execution via LEFT JOIN LATERAL
- Significant reduction in buffers used

**Before (P-001):**
- Bitmap Heap Scan on blocks with OR filter
- Or worse: Seq Scan on blocks

**After (P-001):**
- Two separate Index Scans via UNION ALL
- Minimal buffers, fast execution

## Deployment Notes

1. **Apply migration:**
   ```bash
   npx supabase db push
   ```

2. **Verify functions exist:**
   ```sql
   \df is_blocked_by
   \df can_send_message
   \df get_posts_for_user
   ```

3. **Check RLS policies:**
   ```sql
   SELECT tablename, policyname, cmd
   FROM pg_policies
   WHERE tablename IN ('conversations', 'messages');
   ```

4. **Monitor performance:**
   - Watch query execution times in Supabase dashboard
   - Compare before/after using EXPLAIN ANALYZE
   - Check for reduced database load

## Performance Impact Summary

| Optimization | Before | After | Expected Gain | Affected Queries |
|--------------|--------|-------|---------------|------------------|
| **P-001** | OR pattern, seq scans | UNION ALL, index scans | 3x-10x | All block checks |
| **P-002** | Complex inline policy | SECURITY DEFINER function | Better plan caching | Message inserts |
| **P-003** | Full checkins scan | Time-bounded (9 days) | 5x-50x | All feed queries |

## Security Considerations

All SECURITY DEFINER functions include `SET search_path = public` to prevent search_path attacks (as per ADR-008 and migration 20260212000000_fix_security_definer_search_path.sql).

## Related Issues

- Addresses P-001, P-002, P-003 from `docs/ideation/09-performance-ideation-report.md`
- Builds on indexes from `20260213000000_performance_indexes.sql`
- Follows security patterns from `20260212000000_fix_security_definer_search_path.sql`

## Next Steps

After deploying this migration, consider:

1. **P-004:** Add query result caching layer (Redis/Supabase Realtime cache)
2. **P-005:** Implement prepared statements in client code
3. **P-006:** Add database connection pooling optimization
4. **P-010:** Review and optimize ChatListScreen N+1 queries

---

**Author:** Claude Code (Implementation Agent)
**Date:** 2026-02-12
**Category:** Database Performance Optimization
**Priority:** High (P1-P3 from performance report)
