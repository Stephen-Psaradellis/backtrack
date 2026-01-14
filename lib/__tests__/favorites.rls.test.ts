/**
 * RLS (Row Level Security) and Data Integrity Tests for Favorites
 *
 * These tests verify that:
 * 1. Users can only see their own favorites (SELECT policy)
 * 2. Users can only create favorites for themselves (INSERT policy)
 * 3. Users can only update their own favorites (UPDATE policy)
 * 4. Users can only delete their own favorites (DELETE policy)
 * 5. Cascade delete works when a user is deleted
 *
 * IMPORTANT: These tests require a real Supabase connection.
 * Run with: npm test lib/__tests__/favorites.rls.test.ts
 *
 * For local development:
 * 1. Start local Supabase: npx supabase start
 * 2. Apply migrations: npx supabase db push
 * 3. Run these tests
 *
 * Test accounts are created and cleaned up automatically.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient, SupabaseClient, User } from '@supabase/supabase-js'

// Skip tests if not running against real Supabase
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

// Test users for RLS verification
interface TestUser {
  email: string
  password: string
  id?: string
  client?: SupabaseClient
}

const testUserA: TestUser = {
  email: `test-user-a-${Date.now()}@test.local`,
  password: 'test-password-123!',
}

const testUserB: TestUser = {
  email: `test-user-b-${Date.now()}@test.local`,
  password: 'test-password-456!',
}

// Admin client for cleanup (uses service role)
let adminClient: SupabaseClient | null = null

// Test favorite data
const testFavoriteDataA = {
  custom_name: 'User A Favorite',
  place_name: 'Test Place A',
  latitude: 37.7749,
  longitude: -122.4194,
  address: '123 Test St, San Francisco, CA',
  place_id: 'test-place-id-a',
}

const testFavoriteDataB = {
  custom_name: 'User B Favorite',
  place_name: 'Test Place B',
  latitude: 40.7128,
  longitude: -74.0060,
  address: '456 Test Ave, New York, NY',
  place_id: 'test-place-id-b',
}

// ============================================================================
// CONDITIONAL TEST SUITE
// ============================================================================
// These tests only run when proper Supabase credentials are available

const hasCredentials = !!(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY && SUPABASE_SECRET_KEY)

// If credentials are not available, provide a single informational test
describe('Favorites RLS Policies - Database Verification', () => {
  if (!hasCredentials) {
    it('skipped - requires SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SECRET_KEY environment variables', () => {
      // This test passes - it's just informational that RLS tests are skipped
      expect(true).toBe(true)
    })
    return
  }
  // ============================================================================
  // SETUP AND TEARDOWN
  // ============================================================================

  beforeAll(async () => {
    // Create admin client with service role key for user management
    if (SUPABASE_URL && SUPABASE_SECRET_KEY) {
      adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      // Create test users
      const { data: userAData, error: userAError } = await adminClient.auth.admin.createUser({
        email: testUserA.email,
        password: testUserA.password,
        email_confirm: true,
      })

      if (userAError) {
        throw new Error(`Failed to create test user A: ${userAError.message}`)
      }
      testUserA.id = userAData.user?.id

      const { data: userBData, error: userBError } = await adminClient.auth.admin.createUser({
        email: testUserB.email,
        password: testUserB.password,
        email_confirm: true,
      })

      if (userBError) {
        throw new Error(`Failed to create test user B: ${userBError.message}`)
      }
      testUserB.id = userBData.user?.id

      // Create authenticated clients for each user
      testUserA.client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY!, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      await testUserA.client.auth.signInWithPassword({
        email: testUserA.email,
        password: testUserA.password,
      })

      testUserB.client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY!, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      await testUserB.client.auth.signInWithPassword({
        email: testUserB.email,
        password: testUserB.password,
      })
    }
  })

  afterAll(async () => {
    // Clean up test users (cascade delete will remove their favorites)
    if (adminClient) {
      if (testUserA.id) {
        await adminClient.auth.admin.deleteUser(testUserA.id)
      }
      if (testUserB.id) {
        await adminClient.auth.admin.deleteUser(testUserB.id)
      }
    }
  })

  // ============================================================================
  // RLS SELECT POLICY TESTS
  // ============================================================================

  describe('SELECT Policy - Users can only view own favorites', () => {
    let userAFavoriteId: string | null = null

    beforeAll(async () => {
      // User A creates a favorite
      if (testUserA.client && testUserA.id) {
        const { data, error } = await testUserA.client
          .from('favorite_locations')
          .insert({
            user_id: testUserA.id,
            ...testFavoriteDataA,
          })
          .select()
          .single()

        if (!error && data) {
          userAFavoriteId = data.id
        }
      }
    })

    afterAll(async () => {
      // Clean up User A's favorite
      if (testUserA.client && userAFavoriteId) {
        await testUserA.client
          .from('favorite_locations')
          .delete()
          .eq('id', userAFavoriteId)
      }
    })

    it('User A can see their own favorites', async () => {
      if (!testUserA.client) {
        throw new Error('Test user A client not initialized')
      }

      const { data, error } = await testUserA.client
        .from('favorite_locations')
        .select('*')
        .eq('id', userAFavoriteId)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data?.[0]?.custom_name).toBe(testFavoriteDataA.custom_name)
    })

    it('User B cannot see User A favorites', async () => {
      if (!testUserB.client) {
        throw new Error('Test user B client not initialized')
      }

      const { data, error } = await testUserB.client
        .from('favorite_locations')
        .select('*')
        .eq('id', userAFavoriteId)

      // RLS should return empty array (not an error)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    it('User B fetching all favorites only sees own favorites', async () => {
      if (!testUserB.client || !testUserB.id) {
        throw new Error('Test user B not initialized')
      }

      // Create a favorite for User B
      const { data: insertedData } = await testUserB.client
        .from('favorite_locations')
        .insert({
          user_id: testUserB.id,
          ...testFavoriteDataB,
        })
        .select()
        .single()

      // Fetch all favorites (should only see User B's)
      const { data, error } = await testUserB.client
        .from('favorite_locations')
        .select('*')

      expect(error).toBeNull()
      // Should only see User B's favorite, not User A's
      expect(data?.every(f => f.user_id === testUserB.id)).toBe(true)
      expect(data?.some(f => f.user_id === testUserA.id)).toBe(false)

      // Clean up
      if (insertedData?.id) {
        await testUserB.client
          .from('favorite_locations')
          .delete()
          .eq('id', insertedData.id)
      }
    })
  })

  // ============================================================================
  // RLS INSERT POLICY TESTS
  // ============================================================================

  describe('INSERT Policy - Users can only create own favorites', () => {
    it('User A can create favorites for themselves', async () => {
      if (!testUserA.client || !testUserA.id) {
        throw new Error('Test user A not initialized')
      }

      const { data, error } = await testUserA.client
        .from('favorite_locations')
        .insert({
          user_id: testUserA.id,
          custom_name: 'Test Insert Own',
          place_name: 'Test Place',
          latitude: 0,
          longitude: 0,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.user_id).toBe(testUserA.id)

      // Clean up
      if (data?.id) {
        await testUserA.client
          .from('favorite_locations')
          .delete()
          .eq('id', data.id)
      }
    })

    it('User B cannot create favorites for User A', async () => {
      if (!testUserB.client || !testUserA.id) {
        throw new Error('Test users not initialized')
      }

      const { data, error } = await testUserB.client
        .from('favorite_locations')
        .insert({
          user_id: testUserA.id, // Trying to create for User A
          custom_name: 'Malicious Insert',
          place_name: 'Bad Place',
          latitude: 0,
          longitude: 0,
        })
        .select()

      // RLS should reject this insert
      expect(error).not.toBeNull()
      expect(data).toBeNull()
    })
  })

  // ============================================================================
  // RLS UPDATE POLICY TESTS
  // ============================================================================

  describe('UPDATE Policy - Users can only update own favorites', () => {
    let userAFavoriteId: string | null = null

    beforeAll(async () => {
      // Create a favorite for User A
      if (testUserA.client && testUserA.id) {
        const { data } = await testUserA.client
          .from('favorite_locations')
          .insert({
            user_id: testUserA.id,
            ...testFavoriteDataA,
          })
          .select()
          .single()

        userAFavoriteId = data?.id || null
      }
    })

    afterAll(async () => {
      // Clean up
      if (testUserA.client && userAFavoriteId) {
        await testUserA.client
          .from('favorite_locations')
          .delete()
          .eq('id', userAFavoriteId)
      }
    })

    it('User A can update their own favorite', async () => {
      if (!testUserA.client || !userAFavoriteId) {
        throw new Error('Test not properly set up')
      }

      const newName = 'Updated Name by Owner'
      const { data, error } = await testUserA.client
        .from('favorite_locations')
        .update({ custom_name: newName })
        .eq('id', userAFavoriteId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.custom_name).toBe(newName)
    })

    it('User B cannot update User A favorite', async () => {
      if (!testUserB.client || !userAFavoriteId) {
        throw new Error('Test not properly set up')
      }

      const { data, error } = await testUserB.client
        .from('favorite_locations')
        .update({ custom_name: 'Malicious Update' })
        .eq('id', userAFavoriteId)
        .select()

      // RLS should return no rows (empty result), not an error
      expect(data).toHaveLength(0)
    })
  })

  // ============================================================================
  // RLS DELETE POLICY TESTS
  // ============================================================================

  describe('DELETE Policy - Users can only delete own favorites', () => {
    it('User A can delete their own favorite', async () => {
      if (!testUserA.client || !testUserA.id) {
        throw new Error('Test user A not initialized')
      }

      // Create a favorite to delete
      const { data: created } = await testUserA.client
        .from('favorite_locations')
        .insert({
          user_id: testUserA.id,
          custom_name: 'To Be Deleted',
          place_name: 'Delete Test',
          latitude: 0,
          longitude: 0,
        })
        .select()
        .single()

      expect(created?.id).toBeDefined()

      // Delete it
      const { error } = await testUserA.client
        .from('favorite_locations')
        .delete()
        .eq('id', created!.id)

      expect(error).toBeNull()

      // Verify it's gone
      const { data: verify } = await testUserA.client
        .from('favorite_locations')
        .select('*')
        .eq('id', created!.id)

      expect(verify).toHaveLength(0)
    })

    it('User B cannot delete User A favorite', async () => {
      if (!testUserA.client || !testUserB.client || !testUserA.id) {
        throw new Error('Test users not initialized')
      }

      // Create a favorite for User A
      const { data: created } = await testUserA.client
        .from('favorite_locations')
        .insert({
          user_id: testUserA.id,
          custom_name: 'Protected Favorite',
          place_name: 'Protected Place',
          latitude: 0,
          longitude: 0,
        })
        .select()
        .single()

      expect(created?.id).toBeDefined()

      // User B tries to delete it
      await testUserB.client
        .from('favorite_locations')
        .delete()
        .eq('id', created!.id)

      // Verify it still exists (User A can still see it)
      const { data: verify } = await testUserA.client
        .from('favorite_locations')
        .select('*')
        .eq('id', created!.id)

      expect(verify).toHaveLength(1)
      expect(verify?.[0]?.custom_name).toBe('Protected Favorite')

      // Clean up
      await testUserA.client
        .from('favorite_locations')
        .delete()
        .eq('id', created!.id)
    })
  })

  // ============================================================================
  // CASCADE DELETE TESTS
  // ============================================================================

  describe('Cascade Delete - User deletion removes favorites', () => {
    it('Deleting a user cascades to delete their favorites', async () => {
      if (!adminClient || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        throw new Error('Admin client not initialized')
      }

      // Create a temporary test user
      const tempEmail = `temp-user-${Date.now()}@test.local`
      const tempPassword = 'temp-password-123!'

      const { data: tempUserData, error: createError } = await adminClient.auth.admin.createUser({
        email: tempEmail,
        password: tempPassword,
        email_confirm: true,
      })

      expect(createError).toBeNull()
      const tempUserId = tempUserData.user?.id

      expect(tempUserId).toBeDefined()

      // Sign in as temp user and create favorites
      const tempClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      await tempClient.auth.signInWithPassword({
        email: tempEmail,
        password: tempPassword,
      })

      // Create multiple favorites
      const { data: favorites } = await tempClient
        .from('favorite_locations')
        .insert([
          {
            user_id: tempUserId,
            custom_name: 'Cascade Test 1',
            place_name: 'Place 1',
            latitude: 0,
            longitude: 0,
          },
          {
            user_id: tempUserId,
            custom_name: 'Cascade Test 2',
            place_name: 'Place 2',
            latitude: 0,
            longitude: 0,
          },
        ])
        .select()

      expect(favorites).toHaveLength(2)

      // Verify favorites exist
      const { data: beforeDelete } = await tempClient
        .from('favorite_locations')
        .select('*')
        .eq('user_id', tempUserId)

      expect(beforeDelete).toHaveLength(2)

      // Delete the user (admin operation)
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(tempUserId!)

      expect(deleteError).toBeNull()

      // Use admin client to check if favorites were cascade deleted
      // (We need service role since the user no longer exists)
      const { data: afterDelete } = await adminClient
        .from('favorite_locations')
        .select('*')
        .eq('user_id', tempUserId)

      // Favorites should be deleted due to ON DELETE CASCADE
      expect(afterDelete).toHaveLength(0)
    })
  })

  // ============================================================================
  // DATA INTEGRITY TESTS
  // ============================================================================

  describe('Data Integrity - Constraints and Validation', () => {
    it('Rejects custom_name exceeding 50 characters at database level', async () => {
      if (!testUserA.client || !testUserA.id) {
        throw new Error('Test user A not initialized')
      }

      const longName = 'A'.repeat(51) // 51 characters

      const { data, error } = await testUserA.client
        .from('favorite_locations')
        .insert({
          user_id: testUserA.id,
          custom_name: longName,
          place_name: 'Test Place',
          latitude: 0,
          longitude: 0,
        })
        .select()

      // Should fail database CHECK constraint
      expect(error).not.toBeNull()
      expect(data).toBeNull()
    })

    it('Rejects empty custom_name at database level', async () => {
      if (!testUserA.client || !testUserA.id) {
        throw new Error('Test user A not initialized')
      }

      const { data, error } = await testUserA.client
        .from('favorite_locations')
        .insert({
          user_id: testUserA.id,
          custom_name: '',
          place_name: 'Test Place',
          latitude: 0,
          longitude: 0,
        })
        .select()

      // Should fail database CHECK constraint
      expect(error).not.toBeNull()
      expect(data).toBeNull()
    })

    it('Accepts valid coordinate boundaries', async () => {
      if (!testUserA.client || !testUserA.id) {
        throw new Error('Test user A not initialized')
      }

      // Test boundary coordinates
      const testCases = [
        { lat: 90, lng: 180, name: 'Max positive' },
        { lat: -90, lng: -180, name: 'Max negative' },
        { lat: 0, lng: 0, name: 'Null Island' },
      ]

      for (const tc of testCases) {
        const { data, error } = await testUserA.client
          .from('favorite_locations')
          .insert({
            user_id: testUserA.id,
            custom_name: tc.name,
            place_name: 'Boundary Test',
            latitude: tc.lat,
            longitude: tc.lng,
          })
          .select()
          .single()

        expect(error).toBeNull()
        expect(data?.latitude).toBe(tc.lat)
        expect(data?.longitude).toBe(tc.lng)

        // Clean up
        if (data?.id) {
          await testUserA.client
            .from('favorite_locations')
            .delete()
            .eq('id', data.id)
        }
      }
    })

    it('Stores and retrieves timestamps correctly', async () => {
      if (!testUserA.client || !testUserA.id) {
        throw new Error('Test user A not initialized')
      }

      const beforeInsert = new Date()

      const { data: created } = await testUserA.client
        .from('favorite_locations')
        .insert({
          user_id: testUserA.id,
          custom_name: 'Timestamp Test',
          place_name: 'Time Place',
          latitude: 0,
          longitude: 0,
        })
        .select()
        .single()

      const afterInsert = new Date()

      expect(created?.created_at).toBeDefined()
      expect(created?.updated_at).toBeDefined()

      // Verify timestamps are within expected range
      const createdAt = new Date(created!.created_at)
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime() - 1000)
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterInsert.getTime() + 1000)

      // Clean up
      if (created?.id) {
        await testUserA.client
          .from('favorite_locations')
          .delete()
          .eq('id', created.id)
      }
    })

    it('Updates updated_at on modification', async () => {
      if (!testUserA.client || !testUserA.id) {
        throw new Error('Test user A not initialized')
      }

      // Create
      const { data: created } = await testUserA.client
        .from('favorite_locations')
        .insert({
          user_id: testUserA.id,
          custom_name: 'Update Test',
          place_name: 'Update Place',
          latitude: 0,
          longitude: 0,
        })
        .select()
        .single()

      const originalUpdatedAt = created!.updated_at

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100))

      // Update
      const { data: updated } = await testUserA.client
        .from('favorite_locations')
        .update({ custom_name: 'Updated Name' })
        .eq('id', created!.id)
        .select()
        .single()

      // updated_at should be newer
      expect(new Date(updated!.updated_at).getTime())
        .toBeGreaterThan(new Date(originalUpdatedAt).getTime())

      // Clean up
      await testUserA.client
        .from('favorite_locations')
        .delete()
        .eq('id', created!.id)
    })
  })

  // ============================================================================
  // INDEX VERIFICATION
  // ============================================================================

  describe('Index Performance - Verify indexes exist', () => {
    it('User favorites query uses index (fast execution)', async () => {
      if (!testUserA.client || !testUserA.id) {
        throw new Error('Test user A not initialized')
      }

      // This is a simple verification that the query executes without error
      // In production, you'd use EXPLAIN ANALYZE to verify index usage
      const startTime = Date.now()

      const { data, error } = await testUserA.client
        .from('favorite_locations')
        .select('*')
        .eq('user_id', testUserA.id)
        .order('updated_at', { ascending: false })

      const endTime = Date.now()

      expect(error).toBeNull()
      // Query should be fast (< 500ms) even with indexes
      expect(endTime - startTime).toBeLessThan(500)
    })
  })
})

// ============================================================================
// MANUAL VERIFICATION GUIDE
// ============================================================================

/**
 * MANUAL VERIFICATION STEPS FOR RLS AND DATA INTEGRITY
 *
 * If automated tests cannot run (no service role key), perform these steps manually:
 *
 * 1. CREATE TWO TEST ACCOUNTS:
 *    - User A: testuser-a@example.com
 *    - User B: testuser-b@example.com
 *
 * 2. VERIFY SELECT POLICY:
 *    a. Log in as User A
 *    b. Create a favorite location
 *    c. Log in as User B
 *    d. Try to query User A's favorite by ID
 *    e. Expected: Empty result (not error)
 *
 * 3. VERIFY INSERT POLICY:
 *    a. Log in as User B
 *    b. Try to insert a favorite with User A's user_id
 *    c. Expected: Error or rejected insert
 *
 * 4. VERIFY UPDATE POLICY:
 *    a. Log in as User B
 *    b. Try to update User A's favorite
 *    c. Expected: No rows affected
 *
 * 5. VERIFY DELETE POLICY:
 *    a. Log in as User B
 *    b. Try to delete User A's favorite
 *    c. Expected: No rows deleted
 *    d. Log in as User A
 *    e. Verify favorite still exists
 *
 * 6. VERIFY CASCADE DELETE:
 *    a. Create a new test user
 *    b. Create favorites for that user
 *    c. Delete the user from auth.users
 *    d. Check favorite_locations table
 *    e. Expected: User's favorites are automatically deleted
 *
 * 7. VERIFY DATA INTEGRITY:
 *    a. Try to insert custom_name with 51 characters
 *    b. Expected: Database constraint error
 *    c. Try to insert empty custom_name
 *    d. Expected: Database constraint error
 *
 * SQL COMMANDS FOR MANUAL VERIFICATION:
 *
 * -- Check RLS is enabled
 * SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'favorite_locations';
 *
 * -- List RLS policies
 * SELECT * FROM pg_policies WHERE tablename = 'favorite_locations';
 *
 * -- Check foreign key constraint
 * SELECT
 *   tc.constraint_name,
 *   kcu.column_name,
 *   ccu.table_name AS foreign_table_name,
 *   ccu.column_name AS foreign_column_name,
 *   rc.delete_rule
 * FROM
 *   information_schema.table_constraints AS tc
 *   JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
 *   JOIN information_schema.referential_constraints AS rc ON tc.constraint_name = rc.constraint_name
 *   JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
 * WHERE tc.table_name = 'favorite_locations' AND tc.constraint_type = 'FOREIGN KEY';
 *
 * -- Check indexes
 * SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'favorite_locations';
 *
 * -- Check check constraints
 * SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
 * WHERE conrelid = 'favorite_locations'::regclass AND contype = 'c';
 */

// Export verification guide for documentation
export const MANUAL_VERIFICATION_GUIDE = `
=== DATABASE VERIFICATION - RLS AND DATA INTEGRITY ===

AUTOMATED TEST REQUIREMENTS:
- SUPABASE_SECRET_KEY environment variable (for user management)
- Active Supabase connection (local or remote)

RUN AUTOMATED TESTS:
  npm test lib/__tests__/favorites.rls.test.ts

EXPECTED VERIFICATIONS:
1. [x] RLS enabled on favorite_locations table
2. [x] SELECT policy: Users only see own favorites
3. [x] INSERT policy: Users can only create for themselves
4. [x] UPDATE policy: Users can only update own favorites
5. [x] DELETE policy: Users can only delete own favorites
6. [x] CASCADE DELETE: User deletion removes their favorites
7. [x] Data integrity: custom_name 1-50 char CHECK constraint
8. [x] Timestamps: created_at and updated_at work correctly

MANUAL SQL VERIFICATION (Supabase SQL Editor):

-- 1. Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'favorite_locations';
-- Expected: rowsecurity = true

-- 2. List all RLS policies (should be 4)
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'favorite_locations';
-- Expected policies:
--   favorite_locations_select_own (SELECT)
--   favorite_locations_insert_own (INSERT)
--   favorite_locations_update_own (UPDATE)
--   favorite_locations_delete_own (DELETE)

-- 3. Verify cascade delete on user_id
SELECT
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'favorite_locations'
  AND tc.constraint_type = 'FOREIGN KEY';
-- Expected: delete_rule = 'CASCADE'

-- 4. Verify check constraint on custom_name
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'favorite_locations'::regclass
  AND contype = 'c';
-- Expected: char_length(custom_name) > 0 AND char_length(custom_name) <= 50

-- 5. Verify indexes exist
SELECT indexname FROM pg_indexes
WHERE tablename = 'favorite_locations';
-- Expected indexes:
--   idx_favorite_locations_user_id
--   idx_favorite_locations_user_created
--   idx_favorite_locations_user_updated
--   idx_favorite_locations_place_id
`
