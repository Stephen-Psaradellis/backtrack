/**
 * Tests for lib/supabase.ts
 *
 * Tests the Supabase client configuration, push token management,
 * and post sorting with 30-day deprioritization.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getPostSortPriority,
  sortPostsWithDeprioritization,
  isPostDeprioritized,
  savePushToken,
  removePushToken,
  removeAllUserPushTokens,
  type DeprioritizablePost,
} from '../supabase'

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  })),
}))

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}))

vi.mock('../dev', () => ({
  shouldUseMockExpoSupabase: vi.fn(() => true),
}))

// Mocks for shared mock client that we can control in tests - must use vi.hoisted
const { mockGetUser, mockDeleteEq, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(() => Promise.resolve({ data: { user: null as { id: string } | null }, error: null as { message: string } | null })),
  mockDeleteEq: vi.fn(() => Promise.resolve({ error: null as { message: string } | null })),
  mockRpc: vi.fn(() => Promise.resolve({ error: null as { message: string } | null })),
}))

vi.mock('../dev/shared-mock-client', () => ({
  getSharedMockClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: mockDeleteEq,
      })),
    })),
    rpc: mockRpc,
  })),
}))

// Constants matching the implementation
const MS_PER_DAY = 24 * 60 * 60 * 1000

describe('getPostSortPriority', () => {
  const referenceDate = new Date('2025-01-08T12:00:00.000Z')

  describe('posts without sighting_date', () => {
    it('should return created_at timestamp', () => {
      const post: DeprioritizablePost = {
        id: '1',
        created_at: '2025-01-05T10:00:00.000Z',
        sighting_date: null,
      }

      const priority = getPostSortPriority(post, referenceDate)
      expect(priority).toBe(new Date('2025-01-05T10:00:00.000Z').getTime())
    })

    it('should handle undefined sighting_date', () => {
      const post: DeprioritizablePost = {
        id: '1',
        created_at: '2025-01-05T10:00:00.000Z',
      }

      const priority = getPostSortPriority(post, referenceDate)
      expect(priority).toBe(new Date('2025-01-05T10:00:00.000Z').getTime())
    })
  })

  describe('posts with recent sighting_date (within 30 days)', () => {
    it('should return sighting_date timestamp for sighting from yesterday', () => {
      const post: DeprioritizablePost = {
        id: '1',
        created_at: '2025-01-01T10:00:00.000Z',
        sighting_date: '2025-01-07T14:00:00.000Z', // 1 day before reference
      }

      const priority = getPostSortPriority(post, referenceDate)
      expect(priority).toBe(new Date('2025-01-07T14:00:00.000Z').getTime())
    })

    it('should return sighting_date timestamp for sighting from 29 days ago', () => {
      const sightingDate = new Date(referenceDate.getTime() - 29 * MS_PER_DAY)
      const post: DeprioritizablePost = {
        id: '1',
        created_at: '2024-12-01T10:00:00.000Z',
        sighting_date: sightingDate.toISOString(),
      }

      const priority = getPostSortPriority(post, referenceDate)
      expect(priority).toBe(sightingDate.getTime())
    })

    it('should return sighting_date for sighting exactly at 30 day boundary', () => {
      const sightingDate = new Date(referenceDate.getTime() - 30 * MS_PER_DAY)
      const post: DeprioritizablePost = {
        id: '1',
        created_at: '2024-12-01T10:00:00.000Z',
        sighting_date: sightingDate.toISOString(),
      }

      const priority = getPostSortPriority(post, referenceDate)
      expect(priority).toBe(sightingDate.getTime())
    })
  })

  describe('posts with old sighting_date (older than 30 days)', () => {
    it('should return deprioritized timestamp for sighting 31 days ago', () => {
      const sightingDate = new Date(referenceDate.getTime() - 31 * MS_PER_DAY)
      const createdAt = new Date('2024-12-01T10:00:00.000Z')
      const post: DeprioritizablePost = {
        id: '1',
        created_at: createdAt.toISOString(),
        sighting_date: sightingDate.toISOString(),
      }

      const priority = getPostSortPriority(post, referenceDate)
      const expectedPriority = createdAt.getTime() - 60 * MS_PER_DAY

      expect(priority).toBe(expectedPriority)
    })

    it('should return deprioritized timestamp for very old sighting', () => {
      const createdAt = new Date('2024-06-01T10:00:00.000Z')
      const post: DeprioritizablePost = {
        id: '1',
        created_at: createdAt.toISOString(),
        sighting_date: '2024-05-01T10:00:00.000Z', // Very old
      }

      const priority = getPostSortPriority(post, referenceDate)
      const expectedPriority = createdAt.getTime() - 60 * MS_PER_DAY

      expect(priority).toBe(expectedPriority)
    })
  })

  it('should use current date as reference if not provided', () => {
    const post: DeprioritizablePost = {
      id: '1',
      created_at: new Date().toISOString(),
      sighting_date: null,
    }

    // Should not throw when reference date is not provided
    const priority = getPostSortPriority(post)
    expect(typeof priority).toBe('number')
  })
})

describe('sortPostsWithDeprioritization', () => {
  const referenceDate = new Date('2025-01-08T12:00:00.000Z')

  it('should sort posts by priority in descending order by default', () => {
    const posts: DeprioritizablePost[] = [
      { id: '1', created_at: '2025-01-01T10:00:00.000Z', sighting_date: null },
      { id: '2', created_at: '2025-01-05T10:00:00.000Z', sighting_date: null },
      { id: '3', created_at: '2025-01-03T10:00:00.000Z', sighting_date: null },
    ]

    const sorted = sortPostsWithDeprioritization(posts, false, referenceDate)

    expect(sorted[0].id).toBe('2') // Most recent
    expect(sorted[1].id).toBe('3')
    expect(sorted[2].id).toBe('1') // Oldest
  })

  it('should sort posts by priority in ascending order when specified', () => {
    const posts: DeprioritizablePost[] = [
      { id: '1', created_at: '2025-01-05T10:00:00.000Z', sighting_date: null },
      { id: '2', created_at: '2025-01-01T10:00:00.000Z', sighting_date: null },
      { id: '3', created_at: '2025-01-03T10:00:00.000Z', sighting_date: null },
    ]

    const sorted = sortPostsWithDeprioritization(posts, true, referenceDate)

    expect(sorted[0].id).toBe('2') // Oldest
    expect(sorted[1].id).toBe('3')
    expect(sorted[2].id).toBe('1') // Most recent
  })

  it('should prioritize recent sightings over older posts', () => {
    const posts: DeprioritizablePost[] = [
      { id: 'old-post', created_at: '2025-01-01T10:00:00.000Z', sighting_date: null },
      {
        id: 'recent-sighting',
        created_at: '2024-12-15T10:00:00.000Z',
        sighting_date: '2025-01-07T10:00:00.000Z', // Yesterday
      },
    ]

    const sorted = sortPostsWithDeprioritization(posts, false, referenceDate)

    expect(sorted[0].id).toBe('recent-sighting') // Sighting date takes priority
    expect(sorted[1].id).toBe('old-post')
  })

  it('should deprioritize old sightings (>30 days)', () => {
    const posts: DeprioritizablePost[] = [
      { id: 'normal-post', created_at: '2025-01-01T10:00:00.000Z', sighting_date: null },
      {
        id: 'old-sighting',
        created_at: '2025-01-02T10:00:00.000Z',
        sighting_date: '2024-11-01T10:00:00.000Z', // Old sighting
      },
    ]

    const sorted = sortPostsWithDeprioritization(posts, false, referenceDate)

    expect(sorted[0].id).toBe('normal-post') // Normal post first
    expect(sorted[1].id).toBe('old-sighting') // Old sighting deprioritized
  })

  it('should not mutate the original array', () => {
    const posts: DeprioritizablePost[] = [
      { id: '1', created_at: '2025-01-05T10:00:00.000Z', sighting_date: null },
      { id: '2', created_at: '2025-01-01T10:00:00.000Z', sighting_date: null },
    ]

    const originalOrder = posts.map((p) => p.id)
    sortPostsWithDeprioritization(posts, false, referenceDate)

    expect(posts.map((p) => p.id)).toEqual(originalOrder)
  })

  it('should handle empty array', () => {
    const posts: DeprioritizablePost[] = []
    const sorted = sortPostsWithDeprioritization(posts, false, referenceDate)
    expect(sorted).toEqual([])
  })

  it('should handle single post', () => {
    const posts: DeprioritizablePost[] = [
      { id: '1', created_at: '2025-01-01T10:00:00.000Z', sighting_date: null },
    ]

    const sorted = sortPostsWithDeprioritization(posts, false, referenceDate)
    expect(sorted).toHaveLength(1)
    expect(sorted[0].id).toBe('1')
  })
})

describe('isPostDeprioritized', () => {
  const referenceDate = new Date('2025-01-08T12:00:00.000Z')

  it('should return false for posts without sighting_date', () => {
    const post: DeprioritizablePost = {
      id: '1',
      created_at: '2024-06-01T10:00:00.000Z', // Very old
      sighting_date: null,
    }

    expect(isPostDeprioritized(post, referenceDate)).toBe(false)
  })

  it('should return false for posts with undefined sighting_date', () => {
    const post: DeprioritizablePost = {
      id: '1',
      created_at: '2024-06-01T10:00:00.000Z',
    }

    expect(isPostDeprioritized(post, referenceDate)).toBe(false)
  })

  it('should return false for sighting within 30 days', () => {
    const post: DeprioritizablePost = {
      id: '1',
      created_at: '2025-01-01T10:00:00.000Z',
      sighting_date: '2025-01-05T10:00:00.000Z', // 3 days ago
    }

    expect(isPostDeprioritized(post, referenceDate)).toBe(false)
  })

  it('should return false for sighting exactly at 30 day boundary', () => {
    const sightingDate = new Date(referenceDate.getTime() - 30 * MS_PER_DAY)
    const post: DeprioritizablePost = {
      id: '1',
      created_at: '2024-12-01T10:00:00.000Z',
      sighting_date: sightingDate.toISOString(),
    }

    expect(isPostDeprioritized(post, referenceDate)).toBe(false)
  })

  it('should return true for sighting older than 30 days', () => {
    const sightingDate = new Date(referenceDate.getTime() - 31 * MS_PER_DAY)
    const post: DeprioritizablePost = {
      id: '1',
      created_at: '2024-12-01T10:00:00.000Z',
      sighting_date: sightingDate.toISOString(),
    }

    expect(isPostDeprioritized(post, referenceDate)).toBe(true)
  })

  it('should return true for very old sighting', () => {
    const post: DeprioritizablePost = {
      id: '1',
      created_at: '2024-06-01T10:00:00.000Z',
      sighting_date: '2024-05-01T10:00:00.000Z', // Months old
    }

    expect(isPostDeprioritized(post, referenceDate)).toBe(true)
  })

  it('should use current date as reference if not provided', () => {
    const post: DeprioritizablePost = {
      id: '1',
      created_at: new Date().toISOString(),
      sighting_date: null,
    }

    // Should not throw when reference date is not provided
    const result = isPostDeprioritized(post)
    expect(typeof result).toBe('boolean')
  })
})

describe('savePushToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default: no user authenticated
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockRpc.mockResolvedValue({ error: null })
  })

  it('should return error when user is not authenticated for empty token', async () => {
    // Authentication is checked before token validation
    const result = await savePushToken('')

    expect(result.success).toBe(false)
    expect(result.error).toBe('User must be authenticated to register push token.')
  })

  it('should return error when user is not authenticated for whitespace-only token', async () => {
    // Authentication is checked before token validation
    const result = await savePushToken('   ')

    expect(result.success).toBe(false)
    expect(result.error).toBe('User must be authenticated to register push token.')
  })

  it('should return error when user is not authenticated', async () => {
    // Mock client is set up to return null user
    const result = await savePushToken('ExponentPushToken[xxxx]')

    expect(result.success).toBe(false)
    expect(result.error).toBe('User must be authenticated to register push token.')
  })

  it('should return error when auth.getUser returns an error', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Auth session expired' },
    })

    const result = await savePushToken('ExponentPushToken[xxxx]')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Authentication error: Auth session expired')
  })

  it('should return error for invalid token when authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    const result = await savePushToken('')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid push token provided.')
  })

  it('should return error when RPC fails', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    mockRpc.mockResolvedValueOnce({
      error: { message: 'RPC error' },
    })

    const result = await savePushToken('ExponentPushToken[xxxx]')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to save push token: RPC error')
  })

  it('should succeed when authenticated and RPC succeeds', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    mockRpc.mockResolvedValueOnce({ error: null })

    const result = await savePushToken('ExponentPushToken[xxxx]', {
      brand: 'Apple',
      modelName: 'iPhone',
    })

    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
  })

  it('should handle exception during save', async () => {
    mockGetUser.mockRejectedValueOnce(new Error('Network error'))

    const result = await savePushToken('ExponentPushToken[xxxx]')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to save push token: Network error')
  })

  it('should handle non-Error exception during save', async () => {
    mockGetUser.mockRejectedValueOnce('String error')

    const result = await savePushToken('ExponentPushToken[xxxx]')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to save push token: An unexpected error occurred')
  })
})

describe('removePushToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteEq.mockResolvedValue({ error: null })
  })

  it('should return error for empty token', async () => {
    const result = await removePushToken('')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid push token provided.')
  })

  it('should return error for whitespace-only token', async () => {
    const result = await removePushToken('   ')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid push token provided.')
  })

  it('should succeed for valid token', async () => {
    const result = await removePushToken('ExponentPushToken[xxxx]')

    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
  })

  it('should return error when delete fails', async () => {
    mockDeleteEq.mockResolvedValueOnce({
      error: { message: 'Delete failed' },
    })

    const result = await removePushToken('ExponentPushToken[xxxx]')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to remove push token: Delete failed')
  })

  it('should handle exception during remove', async () => {
    mockDeleteEq.mockRejectedValueOnce(new Error('Network error'))

    const result = await removePushToken('ExponentPushToken[xxxx]')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to remove push token: Network error')
  })

  it('should handle non-Error exception during remove', async () => {
    mockDeleteEq.mockRejectedValueOnce('String error')

    const result = await removePushToken('ExponentPushToken[xxxx]')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to remove push token: An unexpected error occurred')
  })
})

describe('removeAllUserPushTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockDeleteEq.mockResolvedValue({ error: null })
  })

  it('should return error when user is not authenticated', async () => {
    // Mock client is set up to return null user
    const result = await removeAllUserPushTokens()

    expect(result.success).toBe(false)
    expect(result.error).toBe('User must be authenticated to remove push tokens.')
  })

  it('should return error when auth.getUser returns an error', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Auth session expired' },
    })

    const result = await removeAllUserPushTokens()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Authentication error: Auth session expired')
  })

  it('should return error when delete fails', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    mockDeleteEq.mockResolvedValueOnce({
      error: { message: 'Delete failed' },
    })

    const result = await removeAllUserPushTokens()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to remove push tokens: Delete failed')
  })

  it('should succeed when authenticated and delete succeeds', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    mockDeleteEq.mockResolvedValueOnce({ error: null })

    const result = await removeAllUserPushTokens()

    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
  })

  it('should handle exception during remove all', async () => {
    mockGetUser.mockRejectedValueOnce(new Error('Network error'))

    const result = await removeAllUserPushTokens()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to remove push tokens: Network error')
  })

  it('should handle non-Error exception during remove all', async () => {
    mockGetUser.mockRejectedValueOnce('String error')

    const result = await removeAllUserPushTokens()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to remove push tokens: An unexpected error occurred')
  })
})
