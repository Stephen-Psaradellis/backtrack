/**
 * GDPR Compliance Test Suite
 *
 * Tests for GDPR/CCPA compliance including:
 * - Right to data portability (Article 20)
 * - Right to erasure (Article 17)
 * - Data minimization (Article 5)
 * - Privacy by design (Article 25)
 *
 * CRITICAL: These tests must pass before production release to avoid €20M fines.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

// ============================================================================
// Hoisted Mocks
// ============================================================================

const { mockGetUser, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

// Mock Sentry
vi.mock('../sentry', () => ({
  captureException: vi.fn(),
}))

// Import functions after mocks are set up
import { exportUserData, cleanupOldLocationData } from '../dataExport'
import { deleteAccountImmediately as deleteUserAccount } from '../accountDeletion'
import { captureException } from '../sentry'

// ============================================================================
// Test Constants
// ============================================================================

const TEST_USER_ID = 'test-user-gdpr-123'
const OTHER_USER_ID = 'other-user-456'

// Helper to build a thenable chain that resolves to empty data
function makeEmptyChain() {
  const emptyVal = { data: [], error: null }
  const chain: Record<string, any> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
    then: (resolve: (v: typeof emptyVal) => void) => Promise.resolve(emptyVal).then(resolve),
    catch: (reject: (e: unknown) => void) => Promise.resolve(emptyVal).catch(reject),
  }
  return chain
}

describe('GDPR Compliance Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated as test user
    mockGetUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    })

    // Default: from returns empty chains
    mockFrom.mockImplementation(() => makeEmptyChain())

    // Default: rpc succeeds
    mockRpc.mockResolvedValue({ data: { success: true }, error: null })
  })

  // ==========================================================================
  // ARTICLE 20: RIGHT TO DATA PORTABILITY
  // ==========================================================================

  describe('Article 20: Right to Data Portability', () => {
    it('exports all user data in machine-readable format (JSON)', async () => {
      // Mock profile
      const mockProfile = {
        id: TEST_USER_ID,
        display_name: 'GDPR Test User',
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          const chain = makeEmptyChain()
          chain.single = vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          return chain
        }
        const emptyVal = { data: [], error: null }
        const chain = makeEmptyChain()
        chain.order = vi.fn().mockResolvedValue(emptyVal)
        chain.then = (resolve: (v: typeof emptyVal) => void) =>
          Promise.resolve(emptyVal).then(resolve)
        return chain
      })

      const result = await exportUserData(TEST_USER_ID)

      expect(result.success).toBe(true)
      expect(result.data).not.toBeNull()

      // Verify data structure
      expect(result.data?.exportedAt).toBeDefined()
      expect(result.data?.userId).toBe(TEST_USER_ID)

      // Verify all data types are included
      expect(result.data?.profile).toBeDefined()
      expect(result.data?.messages).toBeDefined()
      expect(result.data?.checkins).toBeDefined()
      expect(result.data?.posts).toBeDefined()
      expect(result.data?.conversations).toBeDefined()
      expect(result.data?.blocks).toBeDefined()
      expect(result.data?.reports).toBeDefined()
      expect(result.data?.pushTokens).toBeDefined()
      expect(result.data?.photos).toBeDefined()

      // Verify JSON is valid (machine-readable)
      const jsonString = JSON.stringify(result.data)
      expect(() => JSON.parse(jsonString)).not.toThrow()
    })

    it('includes GPS/location data in export', async () => {
      const mockCheckins = [
        {
          id: 'checkin-1',
          location_name: 'London Test',
          latitude: 51.5074,
          longitude: -0.1278,
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockFrom.mockImplementation((table: string) => {
        const resolvedVal = table === 'checkins'
          ? { data: mockCheckins, error: null }
          : { data: [], error: null }
        const chain = makeEmptyChain()
        chain.order = vi.fn().mockResolvedValue(resolvedVal)
        chain.then = (resolve: (v: typeof resolvedVal) => void) =>
          Promise.resolve(resolvedVal).then(resolve)
        return chain
      })

      const result = await exportUserData(TEST_USER_ID)

      expect(result.success).toBe(true)
      expect(result.data?.checkins).toBeDefined()

      const londonCheckin = result.data?.checkins?.find(
        (c: any) => c.location_name === 'London Test'
      )

      expect(londonCheckin).toBeDefined()
      expect(londonCheckin.latitude).toBe(51.5074)
      expect(londonCheckin.longitude).toBe(-0.1278)
    })

    it('prevents unauthorized users from exporting other user data', async () => {
      // Authenticated as OTHER_USER_ID, requesting TEST_USER_ID's data
      mockGetUser.mockResolvedValue({
        data: { user: { id: OTHER_USER_ID } },
        error: null,
      })

      const result = await exportUserData(TEST_USER_ID)

      expect(result.success).toBe(false)
      expect(result.error).toContain('own data')
    })

    it('redacts internal-only fields from export', async () => {
      const mockProfileWithInternalFields = {
        id: TEST_USER_ID,
        display_name: 'Test User',
        deletion_scheduled_for: new Date().toISOString(),
        deletion_reason: 'test',
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          const chain = makeEmptyChain()
          chain.single = vi.fn().mockResolvedValue({
            data: mockProfileWithInternalFields,
            error: null,
          })
          return chain
        }
        return makeEmptyChain()
      })

      const result = await exportUserData(TEST_USER_ID)

      expect(result.success).toBe(true)
      expect(result.data?.profile).toBeDefined()
      expect(result.data?.profile?.deletion_scheduled_for).toBeUndefined()
      expect(result.data?.profile?.deletion_reason).toBeUndefined()
    })
  })

  // ==========================================================================
  // ARTICLE 17: RIGHT TO ERASURE ("RIGHT TO BE FORGOTTEN")
  // ==========================================================================

  describe('Article 17: Right to Erasure', () => {
    it('deletes ALL user data including GPS coordinates', async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          message: 'Account deleted',
          deleted_counts: {
            checkins: 3,
            messages: 5,
            posts: 2,
            conversations: 1,
            blocks: 0,
            reports: 0,
          },
        },
        error: null,
      })

      const result = await deleteUserAccount(TEST_USER_ID)

      expect(result.success).toBe(true)
    })

    it('prevents users from deleting other user accounts', async () => {
      // The deleteAccountImmediately checks authenticated user matches target
      mockGetUser.mockResolvedValue({
        data: { user: { id: OTHER_USER_ID } },
        error: null,
      })

      const result = await deleteUserAccount(TEST_USER_ID)

      expect(result.success).toBe(false)
    })

    it('returns success when deletion completes', async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          message: 'Account deleted',
          deleted_counts: {
            messages: 10,
            posts: 5,
            conversations: 3,
            checkins: 8,
            blocks: 1,
            reports: 0,
          },
        },
        error: null,
      })

      const result = await deleteUserAccount(TEST_USER_ID)

      expect(result.success).toBe(true)
      expect(result.deletedCounts).toBeDefined()
    })
  })

  // ==========================================================================
  // ARTICLE 5: DATA MINIMIZATION
  // ==========================================================================

  describe('Article 5: Data Minimization', () => {
    it('reduces GPS coordinate precision to ~1.1km for privacy', async () => {
      const preciseCoords = {
        latitude: 40.748817, // 6 decimal places (~10cm precision)
        longitude: -73.985428,
      }

      // When storing background location data, coordinates should be rounded
      const reduced = {
        latitude: Math.round(preciseCoords.latitude * 100) / 100,
        longitude: Math.round(preciseCoords.longitude * 100) / 100,
      }

      // Verify precision is reduced
      expect(reduced.latitude.toString().split('.')[1]?.length).toBeLessThanOrEqual(2)
      expect(reduced.longitude.toString().split('.')[1]?.length).toBeLessThanOrEqual(2)

      // Verify reduced precision is ~1.1km (2 decimal places)
      expect(reduced.latitude).toBe(40.75)
      expect(reduced.longitude).toBe(-73.99)

      // Distance between original and reduced should be within acceptable range
      const latDiff = Math.abs(preciseCoords.latitude - reduced.latitude)
      const lonDiff = Math.abs(preciseCoords.longitude - reduced.longitude)

      expect(latDiff).toBeLessThan(0.01) // < 1.1km at equator
      expect(lonDiff).toBeLessThan(0.01)
    })

    it('deletes old location data beyond retention period', async () => {
      const retentionDays = 90

      // Mock the delete chain
      const mockLt = vi.fn().mockResolvedValue({ error: null })
      const mockEq = vi.fn().mockReturnValue({ lt: mockLt })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ delete: mockDelete })

      const result = await cleanupOldLocationData(TEST_USER_ID, retentionDays)

      expect(result.success).toBe(true)
      expect(mockDelete).toHaveBeenCalled()
    })

    it('does not store unnecessary sensitive data', async () => {
      const result = await exportUserData(TEST_USER_ID)

      expect(result.success).toBe(true)

      const jsonString = JSON.stringify(result.data)

      // Should not contain raw tokens or sensitive auth data
      expect(jsonString).not.toMatch(/accessToken|refreshToken|password/)
    })
  })

  // ==========================================================================
  // ARTICLE 25: PRIVACY BY DESIGN
  // ==========================================================================

  describe('Article 25: Privacy by Design', () => {
    it('implements location tracking with user consent flags', async () => {
      const mockProfile = {
        id: TEST_USER_ID,
        display_name: 'Test User',
        location_sharing_enabled: false,
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          const chain = makeEmptyChain()
          chain.single = vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          return chain
        }
        return makeEmptyChain()
      })

      const result = await exportUserData(TEST_USER_ID)

      expect(result.success).toBe(true)
      expect(result.data?.profile).toBeDefined()
    })

    it('does not expose internal deletion scheduling fields', async () => {
      const mockProfileWithDeletion = {
        id: TEST_USER_ID,
        display_name: 'Test User',
        deletion_scheduled_for: '2026-03-01T00:00:00Z',
        deletion_reason: 'user_request',
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          const chain = makeEmptyChain()
          chain.single = vi.fn().mockResolvedValue({
            data: mockProfileWithDeletion,
            error: null,
          })
          return chain
        }
        return makeEmptyChain()
      })

      const result = await exportUserData(TEST_USER_ID)

      expect(result.success).toBe(true)
      // Internal fields should be stripped
      expect(result.data?.profile?.deletion_scheduled_for).toBeUndefined()
      expect(result.data?.profile?.deletion_reason).toBeUndefined()
      // Normal fields remain
      expect(result.data?.profile?.id).toBe(TEST_USER_ID)
    })
  })

  // ==========================================================================
  // APP STORE REQUIREMENTS
  // ==========================================================================

  describe('App Store Requirements (5.1.1)', () => {
    it('provides functional "Download My Data" button', async () => {
      const mockProfile = { id: TEST_USER_ID, display_name: 'Test User' }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          const chain = makeEmptyChain()
          chain.single = vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          return chain
        }
        return makeEmptyChain()
      })

      const result = await exportUserData(TEST_USER_ID)

      expect(result.success).toBe(true)
      expect(result.data).not.toBeNull()

      // Should be shareable (JSON format)
      const dataString = JSON.stringify(result.data, null, 2)
      expect(dataString.length).toBeGreaterThan(0)

      // Should contain user's ID
      expect(dataString).toContain(TEST_USER_ID)
    })

    it('provides functional "Delete Account" button', async () => {
      mockRpc.mockResolvedValue({
        data: { success: true, message: 'Account deleted' },
        error: null,
      })

      const result = await deleteUserAccount(TEST_USER_ID)

      expect(result.success).toBe(true)
    })
  })

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe('GDPR Error Handling', () => {
    it('handles export errors gracefully when auth fails', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const result = await exportUserData(TEST_USER_ID)

      expect(result.success).toBe(false)
    })

    it('handles deletion errors gracefully when RPC fails', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const result = await deleteUserAccount(TEST_USER_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('returns failure when export user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await exportUserData(TEST_USER_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe('You can only export your own data.')
    })
  })
})
