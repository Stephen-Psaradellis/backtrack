/**
 * Tests for GDPR Data Export - Critical Compliance Paths
 *
 * These tests ensure data export functionality is GDPR compliant:
 * - All user data is included in exports
 * - Users can only export their own data
 * - Sensitive fields are properly filtered
 * - Location data cleanup works correctly
 */

import { exportUserData, cleanupOldLocationData } from '../dataExport'
import { supabase } from '../supabase'
import { vi } from 'vitest'

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}))

// Mock Sentry
vi.mock('../sentry', () => ({
  captureException: vi.fn(),
}))

const mockSupabase = supabase as any

describe('Data Export - GDPR Compliance', () => {
  const testUserId = 'user-123'
  const otherUserId = 'user-456'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exportUserData', () => {
    it('should export ALL user data from all tables', async () => {
      // Mock successful authentication
      ;(mockSupabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: testUserId } },
        error: null,
      })

      // Mock data from all tables
      const mockProfile = { id: testUserId, name: 'Test User', bio: 'Test bio' }
      const mockPosts = [{ id: 'post-1', message: 'Test post' }]
      const mockConversations = [{ id: 'conv-1', created_at: '2024-01-01' }]
      const mockMessages = [{ id: 'msg-1', content: 'Test message' }]
      const mockCheckins = [
        {
          id: 'checkin-1',
          location_name: 'Test Location',
          latitude: 40.71,
          longitude: -74.01,
        },
      ]
      const mockBlocks = [{ id: 'block-1', blocked_id: 'user-789' }]
      const mockReports = [{ id: 'report-1', reason: 'Test report' }]
      const mockPushTokens = [{ id: 'token-1', created_at: '2024-01-01' }]
      const mockPhotos = [{ id: 'photo-1', storage_path: '/path/to/photo' }]

      // Mock database queries
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          single: vi.fn(),
        }

        switch (table) {
          case 'profiles':
            mockChain.single.mockResolvedValue({ data: mockProfile, error: null })
            break
          case 'posts':
            mockChain.order.mockResolvedValue({ data: mockPosts, error: null })
            break
          case 'conversations':
            mockChain.order.mockResolvedValue({ data: mockConversations, error: null })
            break
          case 'messages':
            mockChain.order.mockResolvedValue({ data: mockMessages, error: null })
            break
          case 'checkins':
            mockChain.order.mockResolvedValue({ data: mockCheckins, error: null })
            break
          case 'blocks':
            mockChain.eq.mockResolvedValue({ data: mockBlocks, error: null })
            break
          case 'reports':
            mockChain.eq.mockResolvedValue({ data: mockReports, error: null })
            break
          case 'expo_push_tokens':
            mockChain.eq.mockResolvedValue({ data: mockPushTokens, error: null })
            break
          case 'profile_photos':
            mockChain.eq.mockResolvedValue({ data: mockPhotos, error: null })
            break
        }

        return mockChain
      })

      mockSupabase.from = mockFrom as never

      const result = await exportUserData(testUserId)

      // Verify export succeeded
      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
      expect(result.data).not.toBeNull()

      // Verify all required fields are present (CRITICAL for GDPR)
      expect(result.data).toHaveProperty('exportedAt')
      expect(result.data).toHaveProperty('userId')
      expect(result.data).toHaveProperty('profile')
      expect(result.data).toHaveProperty('posts')
      expect(result.data).toHaveProperty('conversations')
      expect(result.data).toHaveProperty('messages')
      expect(result.data).toHaveProperty('checkins')
      expect(result.data).toHaveProperty('blocks')
      expect(result.data).toHaveProperty('reports')
      expect(result.data).toHaveProperty('pushTokens')
      expect(result.data).toHaveProperty('photos')

      // Verify data content
      expect(result.data?.profile).toEqual(mockProfile)
      expect(result.data?.posts).toEqual(mockPosts)
      expect(result.data?.conversations).toEqual(mockConversations)
      expect(result.data?.messages).toEqual(mockMessages)
      expect(result.data?.checkins).toEqual(mockCheckins)
      expect(result.data?.blocks).toEqual(mockBlocks)
      expect(result.data?.reports).toEqual(mockReports)
      expect(result.data?.pushTokens).toEqual(mockPushTokens)
      expect(result.data?.photos).toEqual(mockPhotos)
    })

    it('should prevent users from exporting other users data', async () => {
      // Mock authentication as different user
      ;(mockSupabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: otherUserId } },
        error: null,
      })

      // Try to export another user's data
      const result = await exportUserData(testUserId)

      expect(result.success).toBe(false)
      expect(result.data).toBeNull()
      expect(result.error).toBe('You can only export your own data.')
    })

    it('should handle authentication errors', async () => {
      // Mock authentication failure
      ;(mockSupabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const result = await exportUserData(testUserId)

      expect(result.success).toBe(false)
      expect(result.data).toBeNull()
      expect(result.error).toBe('You can only export your own data.')
    })

    it('should handle empty data sets gracefully', async () => {
      // Mock successful authentication
      ;(mockSupabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: testUserId } },
        error: null,
      })

      // Mock empty data from all tables using a thenable chain that resolves to empty data
      const mockFrom = vi.fn().mockImplementation(() => {
        const resolvedValue = { data: [], error: null }
        const mockChain: Record<string, any> = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          // Make the chain thenable so it can be awaited directly
          then: (resolve: (v: typeof resolvedValue) => void) => Promise.resolve(resolvedValue).then(resolve),
          catch: (reject: (e: unknown) => void) => Promise.resolve(resolvedValue).catch(reject),
        }
        return mockChain
      })

      mockSupabase.from = mockFrom as never

      const result = await exportUserData(testUserId)

      expect(result.success).toBe(true)
      expect(result.data?.profile).toBeNull()
      expect(result.data?.posts).toEqual([])
      expect(result.data?.messages).toEqual([])
      expect(result.data?.checkins).toEqual([])
    })

    it('should strip sensitive internal fields from profile', async () => {
      // Mock successful authentication
      ;(mockSupabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: testUserId } },
        error: null,
      })

      // Mock profile with sensitive fields
      const mockProfileWithSensitiveData = {
        id: testUserId,
        name: 'Test User',
        deletion_scheduled_for: '2024-12-31', // Should be removed
        deletion_reason: 'User requested', // Should be removed
      }

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        const emptyResolvedValue = { data: [], error: null }
        if (table === 'profiles') {
          const mockChain: Record<string, any> = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfileWithSensitiveData, error: null }),
            then: (resolve: (v: any) => void) => Promise.resolve({ data: mockProfileWithSensitiveData, error: null }).then(resolve),
            catch: (reject: (e: unknown) => void) => Promise.resolve({ data: mockProfileWithSensitiveData, error: null }).catch(reject),
          }
          return mockChain
        }
        const mockChain: Record<string, any> = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          then: (resolve: (v: typeof emptyResolvedValue) => void) => Promise.resolve(emptyResolvedValue).then(resolve),
          catch: (reject: (e: unknown) => void) => Promise.resolve(emptyResolvedValue).catch(reject),
        }
        return mockChain
      })

      mockSupabase.from = mockFrom as never

      const result = await exportUserData(testUserId)

      expect(result.success).toBe(true)
      expect(result.data?.profile).not.toHaveProperty('deletion_scheduled_for')
      expect(result.data?.profile).not.toHaveProperty('deletion_reason')
      expect(result.data?.profile).toHaveProperty('id')
      expect(result.data?.profile).toHaveProperty('name')
    })

    it('should include GPS coordinates in checkins export', async () => {
      // Mock successful authentication
      ;(mockSupabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: testUserId } },
        error: null,
      })

      const mockCheckins = [
        {
          id: 'checkin-1',
          location_name: 'Test Location',
          latitude: 40.7128,
          longitude: -74.006,
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        const tableData = table === 'checkins' ? mockCheckins : []
        const resolvedValue = { data: tableData, error: null }
        const mockChain: Record<string, any> = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          then: (resolve: (v: typeof resolvedValue) => void) => Promise.resolve(resolvedValue).then(resolve),
          catch: (reject: (e: unknown) => void) => Promise.resolve(resolvedValue).catch(reject),
        }
        return mockChain
      })

      mockSupabase.from = mockFrom as never

      const result = await exportUserData(testUserId)

      expect(result.success).toBe(true)
      expect(result.data?.checkins).toHaveLength(1)
      expect(result.data?.checkins[0]).toHaveProperty('latitude')
      expect(result.data?.checkins[0]).toHaveProperty('longitude')
      expect(result.data?.checkins[0].latitude).toBe(40.7128)
      expect(result.data?.checkins[0].longitude).toBe(-74.006)
    })
  })

  describe('cleanupOldLocationData', () => {
    it('should delete checkins older than retention period', async () => {
      // Mock successful authentication
      ;(mockSupabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: testUserId } },
        error: null,
      })

      const mockDelete = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockLt = vi.fn().mockResolvedValue({ error: null })

      const mockFrom = vi.fn().mockReturnValue({
        delete: mockDelete,
      })

      mockDelete.mockReturnValue({
        eq: mockEq,
      })

      mockEq.mockReturnValue({
        lt: mockLt,
      })

      mockSupabase.from = mockFrom as never

      const result = await cleanupOldLocationData(testUserId, 90)

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
      expect(mockFrom).toHaveBeenCalledWith('checkins')
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('user_id', testUserId)
    })

    it('should prevent users from deleting other users location data', async () => {
      // Mock authentication as different user
      ;(mockSupabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: otherUserId } },
        error: null,
      })

      const result = await cleanupOldLocationData(testUserId, 90)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication mismatch.')
    })

    it('should handle database errors gracefully', async () => {
      // Mock successful authentication
      ;(mockSupabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: testUserId } },
        error: null,
      })

      const mockDelete = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockLt = jest
        .fn()
        .mockResolvedValue({ error: new Error('Database error') })

      const mockFrom = vi.fn().mockReturnValue({
        delete: mockDelete,
      })

      mockDelete.mockReturnValue({
        eq: mockEq,
      })

      mockEq.mockReturnValue({
        lt: mockLt,
      })

      mockSupabase.from = mockFrom as never

      const result = await cleanupOldLocationData(testUserId, 90)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })

    it('should use correct retention period', async () => {
      // Mock successful authentication
      ;(mockSupabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: testUserId } },
        error: null,
      })

      const mockDelete = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockLt = vi.fn().mockResolvedValue({ error: null })

      const mockFrom = vi.fn().mockReturnValue({
        delete: mockDelete,
      })

      mockDelete.mockReturnValue({
        eq: mockEq,
      })

      mockEq.mockReturnValue({
        lt: mockLt,
      })

      mockSupabase.from = mockFrom as never

      // Test with custom retention period
      await cleanupOldLocationData(testUserId, 30)

      // Verify the cutoff date is approximately 30 days ago
      expect(mockLt).toHaveBeenCalled()
      const cutoffArg = mockLt.mock.calls[0][1]
      const cutoffDate = new Date(cutoffArg)
      const expectedCutoff = new Date()
      expectedCutoff.setDate(expectedCutoff.getDate() - 30)

      // Allow 1-minute tolerance for test execution time
      const timeDiff = Math.abs(cutoffDate.getTime() - expectedCutoff.getTime())
      expect(timeDiff).toBeLessThan(60000) // Less than 1 minute difference
    })
  })
})
