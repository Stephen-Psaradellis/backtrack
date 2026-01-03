/**
 * @vitest-environment jsdom
 */

/**
 * Edge Case Tests for Favorites Feature
 *
 * This file contains comprehensive edge case tests covering:
 * 1. Empty favorites list behavior
 * 2. Max favorites limit enforcement
 * 3. Custom name validation (empty, too long, special chars)
 * 4. Offline mode behavior
 * 5. Location permissions denied scenarios
 * 6. Duplicate favorites with different names
 *
 * @module lib/__tests__/favorites.edge-cases.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FavoriteLocation, FavoriteLocationUpdate } from '../../types/database'

// Mock Supabase before importing the module under test
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()

// Create a chainable mock query builder
const createMockQueryBuilder = () => {
  const queryBuilder = {
    select: mockSelect.mockReturnThis(),
    insert: mockInsert.mockReturnThis(),
    update: mockUpdate.mockReturnThis(),
    delete: mockDelete.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    order: mockOrder.mockReturnThis(),
    single: mockSingle,
  }
  return queryBuilder
}

const mockQueryBuilder = createMockQueryBuilder()
const mockFrom = vi.fn(() => mockQueryBuilder)

vi.mock('../supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}))

// Import after mocking
import {
  validateCustomName,
  validateCoordinates,
  validateAddFavoriteRequest,
  addFavorite,
  getUserFavorites,
  MAX_CUSTOM_NAME_LENGTH,
  MAX_FAVORITES_PER_USER,
  FAVORITES_ERRORS,
  type AddFavoriteData,
} from '../favorites'

// ============================================================================
// Test Helper Functions
// ============================================================================

function createTestFavorite(partial: Partial<FavoriteLocation> = {}): FavoriteLocation {
  return {
    id: 'fav-123',
    user_id: 'user-123',
    custom_name: 'My Coffee Spot',
    place_name: 'Starbucks',
    latitude: 37.7749,
    longitude: -122.4194,
    address: '123 Main St, San Francisco, CA',
    place_id: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...partial,
  }
}

function createValidAddData(partial: Partial<AddFavoriteData> = {}): AddFavoriteData {
  return {
    custom_name: 'My Gym',
    place_name: 'Planet Fitness',
    latitude: 40.7128,
    longitude: -74.006,
    address: '456 Broadway, New York, NY',
    place_id: 'ChIJraPI1gJawokRuOEH5lNd_c0',
    ...partial,
  }
}

const testUserId = 'user-123'

// ============================================================================
// Test Setup
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks()
  mockSelect.mockReturnValue(mockQueryBuilder)
  mockInsert.mockReturnValue(mockQueryBuilder)
  mockUpdate.mockReturnValue(mockQueryBuilder)
  mockDelete.mockReturnValue(mockQueryBuilder)
  mockEq.mockReturnValue(mockQueryBuilder)
  mockOrder.mockReturnValue(mockQueryBuilder)
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ============================================================================
// Edge Case 1: Empty Favorites
// ============================================================================

describe('Edge Case: Empty Favorites', () => {
  describe('getUserFavorites with no favorites', () => {
    it('returns empty array when user has no favorites', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      const result = await getUserFavorites(testUserId)

      expect(result.success).toBe(true)
      expect(result.favorites).toEqual([])
      expect(result.favorites).toHaveLength(0)
    })

    it('returns success status even with empty result', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      const result = await getUserFavorites(testUserId)

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })

    it('returns favorites array (not undefined or null) when empty', async () => {
      mockOrder.mockResolvedValue({ data: null, error: null })

      const result = await getUserFavorites(testUserId)

      expect(result.favorites).toBeDefined()
      expect(Array.isArray(result.favorites)).toBe(true)
    })
  })

  describe('first favorite after empty list', () => {
    it('successfully adds first favorite to empty list', async () => {
      const favorite = createTestFavorite()

      // Mock count check returning 0
      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      })

      // Mock insert success
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      const result = await addFavorite(testUserId, createValidAddData())

      expect(result.success).toBe(true)
      expect(result.favorite).toEqual(favorite)
    })
  })
})

// ============================================================================
// Edge Case 2: Max Favorites Limit
// ============================================================================

describe('Edge Case: Max Favorites Limit', () => {
  it('enforces maximum favorites limit of 50', async () => {
    // Mock count check returning exactly 50 (at limit)
    mockSelect.mockReturnValue({
      ...mockQueryBuilder,
      eq: vi.fn().mockResolvedValue({ count: MAX_FAVORITES_PER_USER, error: null }),
    })

    const result = await addFavorite(testUserId, createValidAddData())

    expect(result.success).toBe(false)
    expect(result.error).toBe(FAVORITES_ERRORS.MAX_FAVORITES_REACHED)
  })

  it('allows adding when at 49 favorites (one below limit)', async () => {
    const favorite = createTestFavorite()

    // Mock count check returning 49
    mockSelect.mockReturnValueOnce({
      ...mockQueryBuilder,
      eq: vi.fn().mockResolvedValue({ count: MAX_FAVORITES_PER_USER - 1, error: null }),
    })

    // Mock insert success
    mockSelect.mockReturnValue({
      ...mockQueryBuilder,
      single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
    })

    const result = await addFavorite(testUserId, createValidAddData())

    expect(result.success).toBe(true)
  })

  it('blocks adding when over limit (safety check)', async () => {
    // Mock count check returning 51 (over limit - should never happen but test anyway)
    mockSelect.mockReturnValue({
      ...mockQueryBuilder,
      eq: vi.fn().mockResolvedValue({ count: MAX_FAVORITES_PER_USER + 1, error: null }),
    })

    const result = await addFavorite(testUserId, createValidAddData())

    expect(result.success).toBe(false)
    expect(result.error).toBe(FAVORITES_ERRORS.MAX_FAVORITES_REACHED)
  })

  it('MAX_FAVORITES_PER_USER constant is 50', () => {
    expect(MAX_FAVORITES_PER_USER).toBe(50)
  })
})

// ============================================================================
// Edge Case 3: Custom Name Validation
// ============================================================================

describe('Edge Case: Custom Name Validation', () => {
  describe('empty custom names', () => {
    it('rejects null custom name', () => {
      const error = validateCustomName(null)
      expect(error).toBe(FAVORITES_ERRORS.MISSING_CUSTOM_NAME)
    })

    it('rejects undefined custom name', () => {
      const error = validateCustomName(undefined)
      expect(error).toBe(FAVORITES_ERRORS.MISSING_CUSTOM_NAME)
    })

    it('rejects empty string', () => {
      const error = validateCustomName('')
      expect(error).toBe(FAVORITES_ERRORS.MISSING_CUSTOM_NAME)
    })

    it('rejects string with only spaces', () => {
      const error = validateCustomName('     ')
      expect(error).toBe(FAVORITES_ERRORS.MISSING_CUSTOM_NAME)
    })

    it('rejects string with only tabs', () => {
      const error = validateCustomName('\t\t\t')
      expect(error).toBe(FAVORITES_ERRORS.MISSING_CUSTOM_NAME)
    })

    it('rejects string with mixed whitespace only', () => {
      const error = validateCustomName('  \t  \n  ')
      expect(error).toBe(FAVORITES_ERRORS.MISSING_CUSTOM_NAME)
    })
  })

  describe('too long custom names', () => {
    it('rejects name with 51 characters', () => {
      const tooLong = 'A'.repeat(51)
      const error = validateCustomName(tooLong)
      expect(error).toBe(FAVORITES_ERRORS.CUSTOM_NAME_TOO_LONG)
    })

    it('rejects name with 100 characters', () => {
      const veryLong = 'A'.repeat(100)
      const error = validateCustomName(veryLong)
      expect(error).toBe(FAVORITES_ERRORS.CUSTOM_NAME_TOO_LONG)
    })

    it('accepts name with exactly 50 characters', () => {
      const exactLength = 'A'.repeat(50)
      const error = validateCustomName(exactLength)
      expect(error).toBeNull()
    })

    it('accepts name with 49 characters', () => {
      const underLimit = 'A'.repeat(49)
      const error = validateCustomName(underLimit)
      expect(error).toBeNull()
    })

    it('MAX_CUSTOM_NAME_LENGTH constant is 50', () => {
      expect(MAX_CUSTOM_NAME_LENGTH).toBe(50)
    })

    it('rejects when trimmed length exceeds limit (padded with spaces)', () => {
      // 51 chars + spaces = too long after trim
      const paddedTooLong = '  ' + 'A'.repeat(51) + '  '
      const error = validateCustomName(paddedTooLong)
      expect(error).toBe(FAVORITES_ERRORS.CUSTOM_NAME_TOO_LONG)
    })
  })

  describe('special characters in custom names', () => {
    it('accepts apostrophes', () => {
      const error = validateCustomName("Mom's Kitchen")
      expect(error).toBeNull()
    })

    it('accepts ampersands', () => {
      const error = validateCustomName('Coffee & Tea')
      expect(error).toBeNull()
    })

    it('accepts numbers', () => {
      const error = validateCustomName('Coffee Shop #1')
      expect(error).toBeNull()
    })

    it('accepts parentheses', () => {
      const error = validateCustomName('Gym (Downtown)')
      expect(error).toBeNull()
    })

    it('accepts slashes', () => {
      const error = validateCustomName('Cafe/Restaurant')
      expect(error).toBeNull()
    })

    it('accepts dashes', () => {
      const error = validateCustomName('Twenty-First Street Coffee')
      expect(error).toBeNull()
    })

    it('accepts emojis', () => {
      const error = validateCustomName('☕ Coffee Shop')
      expect(error).toBeNull()
    })

    it('accepts multiple emojis', () => {
      const error = validateCustomName('🏋️ Gym 💪')
      expect(error).toBeNull()
    })

    it('accepts Unicode characters (Japanese)', () => {
      const error = validateCustomName('カフェ')
      expect(error).toBeNull()
    })

    it('accepts Unicode characters (Chinese)', () => {
      const error = validateCustomName('咖啡店')
      expect(error).toBeNull()
    })

    it('accepts Unicode characters (Korean)', () => {
      const error = validateCustomName('커피숍')
      expect(error).toBeNull()
    })

    it('accepts Unicode characters (Arabic)', () => {
      const error = validateCustomName('مقهى')
      expect(error).toBeNull()
    })

    it('accepts Unicode characters (Cyrillic)', () => {
      const error = validateCustomName('Кафе')
      expect(error).toBeNull()
    })

    it('accepts mixed alphanumeric and special chars', () => {
      const error = validateCustomName("Joe's Cafe #2 (Downtown) - Open 24/7")
      expect(error).toBeNull()
    })
  })

  describe('edge case lengths', () => {
    it('accepts single character', () => {
      const error = validateCustomName('A')
      expect(error).toBeNull()
    })

    it('accepts two characters', () => {
      const error = validateCustomName('AB')
      expect(error).toBeNull()
    })

    it('accepts single emoji (may count as multiple chars)', () => {
      const error = validateCustomName('☕')
      expect(error).toBeNull()
    })
  })
})

// ============================================================================
// Edge Case 4: Offline Mode Simulation
// ============================================================================

describe('Edge Case: Offline Mode', () => {
  describe('network errors during operations', () => {
    it('handles network timeout during add', async () => {
      // Simulate network timeout - mock the final .eq() to reject
      // so the chain completes but the await throws
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockRejectedValue(new Error('Network request failed')),
      })

      const result = await addFavorite(testUserId, createValidAddData())

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network request failed')
    })

    it('handles network timeout during fetch', async () => {
      mockOrder.mockRejectedValue(new Error('Network request failed'))

      const result = await getUserFavorites(testUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network request failed')
    })

    it('handles connection reset error', async () => {
      mockOrder.mockRejectedValue(new Error('Connection reset by peer'))

      const result = await getUserFavorites(testUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection reset by peer')
    })

    it('handles DNS resolution failure', async () => {
      mockOrder.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'))

      const result = await getUserFavorites(testUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('getaddrinfo ENOTFOUND')
    })

    it('returns graceful error for non-Error exceptions', async () => {
      mockOrder.mockImplementation(() => {
        throw 'Unknown network error'
      })

      const result = await getUserFavorites(testUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.FETCH_FAILED)
    })
  })

  describe('partial connectivity scenarios', () => {
    it('handles slow response (count succeeds, insert fails)', async () => {
      // Count check succeeds
      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      })

      // Insert fails with network error
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Connection timed out during insert' }
        }),
      })

      const result = await addFavorite(testUserId, createValidAddData())

      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection timed out')
    })
  })
})

// ============================================================================
// Edge Case 5: Location Permissions (Coordinates Validation)
// ============================================================================

describe('Edge Case: Location Permissions Denied', () => {
  describe('missing coordinates', () => {
    it('rejects null latitude', () => {
      const error = validateCoordinates(null, -122.4194)
      expect(error).toBe(FAVORITES_ERRORS.MISSING_COORDINATES)
    })

    it('rejects null longitude', () => {
      const error = validateCoordinates(37.7749, null)
      expect(error).toBe(FAVORITES_ERRORS.MISSING_COORDINATES)
    })

    it('rejects both coordinates null', () => {
      const error = validateCoordinates(null, null)
      expect(error).toBe(FAVORITES_ERRORS.MISSING_COORDINATES)
    })

    it('rejects undefined latitude', () => {
      const error = validateCoordinates(undefined, -122.4194)
      expect(error).toBe(FAVORITES_ERRORS.MISSING_COORDINATES)
    })

    it('rejects undefined longitude', () => {
      const error = validateCoordinates(37.7749, undefined)
      expect(error).toBe(FAVORITES_ERRORS.MISSING_COORDINATES)
    })
  })

  describe('invalid coordinate values (permission mock scenarios)', () => {
    it('rejects latitude beyond valid range (mock permission error scenario)', () => {
      // When location permission is denied, some apps default to invalid coords
      const error = validateCoordinates(1000, 0) // Invalid lat
      expect(error).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })

    it('rejects negative out-of-range latitude', () => {
      const error = validateCoordinates(-91, 0)
      expect(error).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })

    it('rejects positive out-of-range latitude', () => {
      const error = validateCoordinates(91, 0)
      expect(error).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })

    it('rejects out-of-range longitude', () => {
      const error = validateCoordinates(0, 181)
      expect(error).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })

    it('rejects negative out-of-range longitude', () => {
      const error = validateCoordinates(0, -181)
      expect(error).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })
  })

  describe('valid boundary coordinates', () => {
    it('accepts coordinates at (0, 0) - null island', () => {
      const error = validateCoordinates(0, 0)
      expect(error).toBeNull()
    })

    it('accepts north pole (90, 0)', () => {
      const error = validateCoordinates(90, 0)
      expect(error).toBeNull()
    })

    it('accepts south pole (-90, 0)', () => {
      const error = validateCoordinates(-90, 0)
      expect(error).toBeNull()
    })

    it('accepts dateline (0, 180)', () => {
      const error = validateCoordinates(0, 180)
      expect(error).toBeNull()
    })

    it('accepts negative dateline (0, -180)', () => {
      const error = validateCoordinates(0, -180)
      expect(error).toBeNull()
    })
  })

  describe('add favorite with missing location', () => {
    it('rejects add request with missing coordinates', async () => {
      const dataWithoutCoords = {
        custom_name: 'Test',
        place_name: 'Test Place',
        // latitude and longitude missing
      } as unknown as AddFavoriteData

      const result = await addFavorite(testUserId, dataWithoutCoords)

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_COORDINATES)
    })
  })
})

// ============================================================================
// Edge Case 6: Duplicate Favorites with Different Names
// ============================================================================

describe('Edge Case: Duplicate Favorites with Different Names', () => {
  describe('allows same location with different custom names', () => {
    it('can add two favorites at same coordinates with different names', async () => {
      const favorite1 = createTestFavorite({
        id: 'fav-1',
        custom_name: 'Morning Coffee',
        latitude: 37.7749,
        longitude: -122.4194,
      })

      // First add
      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      })
      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite1, error: null }),
      })

      const result1 = await addFavorite(testUserId, {
        custom_name: 'Morning Coffee',
        place_name: 'Starbucks',
        latitude: 37.7749,
        longitude: -122.4194,
      })

      expect(result1.success).toBe(true)

      // Second add with same location but different name
      const favorite2 = createTestFavorite({
        id: 'fav-2',
        custom_name: 'Evening Coffee',
        latitude: 37.7749,
        longitude: -122.4194,
      })

      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
      })
      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite2, error: null }),
      })

      const result2 = await addFavorite(testUserId, {
        custom_name: 'Evening Coffee',
        place_name: 'Starbucks',
        latitude: 37.7749,
        longitude: -122.4194,
      })

      expect(result2.success).toBe(true)
    })

    it('can add same place_id with different custom names', async () => {
      const placeId = 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA'

      const favorite1 = createTestFavorite({
        id: 'fav-1',
        custom_name: 'Work Meeting Spot',
        place_id: placeId,
      })

      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      })
      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite1, error: null }),
      })

      const result1 = await addFavorite(testUserId, {
        custom_name: 'Work Meeting Spot',
        place_name: 'Starbucks',
        latitude: 37.7749,
        longitude: -122.4194,
        place_id: placeId,
      })

      expect(result1.success).toBe(true)

      const favorite2 = createTestFavorite({
        id: 'fav-2',
        custom_name: 'Friend Hangout',
        place_id: placeId,
      })

      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
      })
      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite2, error: null }),
      })

      const result2 = await addFavorite(testUserId, {
        custom_name: 'Friend Hangout',
        place_name: 'Starbucks',
        latitude: 37.7749,
        longitude: -122.4194,
        place_id: placeId,
      })

      expect(result2.success).toBe(true)
    })
  })

  describe('retrieves multiple favorites at same location', () => {
    it('returns all favorites even if at same coordinates', async () => {
      const favorites = [
        createTestFavorite({
          id: 'fav-1',
          custom_name: 'Morning Coffee',
          latitude: 37.7749,
          longitude: -122.4194,
        }),
        createTestFavorite({
          id: 'fav-2',
          custom_name: 'Afternoon Coffee',
          latitude: 37.7749,
          longitude: -122.4194,
        }),
        createTestFavorite({
          id: 'fav-3',
          custom_name: 'Evening Coffee',
          latitude: 37.7749,
          longitude: -122.4194,
        }),
      ]

      mockOrder.mockResolvedValue({ data: favorites, error: null })

      const result = await getUserFavorites(testUserId)

      expect(result.success).toBe(true)
      expect(result.favorites).toHaveLength(3)
      expect(result.favorites.map(f => f.custom_name)).toEqual([
        'Morning Coffee',
        'Afternoon Coffee',
        'Evening Coffee',
      ])
    })
  })
})

// ============================================================================
// Additional Edge Cases
// ============================================================================

describe('Additional Edge Cases', () => {
  describe('concurrent operations', () => {
    it('handles rapid consecutive add requests', async () => {
      const favorite = createTestFavorite()

      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      // Simulate rapid requests (though they execute sequentially in tests)
      const results = await Promise.all([
        addFavorite(testUserId, createValidAddData({ custom_name: 'Fav 1' })),
        addFavorite(testUserId, createValidAddData({ custom_name: 'Fav 2' })),
        addFavorite(testUserId, createValidAddData({ custom_name: 'Fav 3' })),
      ])

      // All should complete (success depends on mocking)
      expect(results).toHaveLength(3)
    })
  })

  describe('data integrity', () => {
    it('trims whitespace from custom names', async () => {
      const favorite = createTestFavorite()

      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      })
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      await addFavorite(testUserId, createValidAddData({ custom_name: '  Padded Name  ' }))

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          custom_name: 'Padded Name',
        })
      )
    })

    it('trims whitespace from place names', async () => {
      const favorite = createTestFavorite()

      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      })
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      await addFavorite(testUserId, createValidAddData({ place_name: '  Starbucks  ' }))

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          place_name: 'Starbucks',
        })
      )
    })

    it('trims whitespace from addresses', async () => {
      const favorite = createTestFavorite()

      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      })
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      await addFavorite(testUserId, createValidAddData({ address: '  123 Main St  ' }))

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          address: '123 Main St',
        })
      )
    })

    it('handles null address gracefully', async () => {
      const favorite = createTestFavorite({ address: null })

      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      })
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      const result = await addFavorite(testUserId, createValidAddData({ address: null }))

      expect(result.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          address: null,
        })
      )
    })

    it('handles undefined address gracefully', async () => {
      const favorite = createTestFavorite({ address: null })

      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      })
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      const { address, ...dataWithoutAddress } = createValidAddData()
      const result = await addFavorite(testUserId, dataWithoutAddress as AddFavoriteData)

      expect(result.success).toBe(true)
    })
  })

  describe('database error handling', () => {
    it('handles unique constraint violations gracefully', async () => {
      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      })
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint'
          }
        }),
      })

      const result = await addFavorite(testUserId, createValidAddData())

      expect(result.success).toBe(false)
      expect(result.error).toContain('duplicate key')
    })

    it('handles RLS policy violations', async () => {
      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      })
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'new row violates row-level security policy' }
        }),
      })

      const result = await addFavorite(testUserId, createValidAddData())

      expect(result.success).toBe(false)
      expect(result.error).toContain('row-level security')
    })
  })
})
