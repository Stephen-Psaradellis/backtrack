/**
 * Comprehensive unit tests for the favorites library.
 *
 * Tests cover:
 * - Constants (MAX_CUSTOM_NAME_LENGTH, MAX_FAVORITES_PER_USER, FAVORITES_ERRORS)
 * - Validation functions (validateCustomName, validateCoordinates, validateAddFavoriteRequest, validateUpdateFavoriteRequest)
 * - CRUD operations (addFavorite, removeFavorite, updateFavorite, getUserFavorites, getFavoriteById, getFavoritesCount)
 * - Error handling and edge cases
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
const mockFrom = vi.fn((_table: string) => mockQueryBuilder)

vi.mock('../supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}))

// Import after mocking
import {
  // Validation functions
  validateCustomName,
  validateCoordinates,
  validateAddFavoriteRequest,
  validateUpdateFavoriteRequest,
  // CRUD functions
  addFavorite,
  removeFavorite,
  updateFavorite,
  getUserFavorites,
  getFavoriteById,
  getFavoritesCount,
  // Constants
  MAX_CUSTOM_NAME_LENGTH,
  MAX_FAVORITES_PER_USER,
  FAVORITES_ERRORS,
  // Types
  type AddFavoriteData,
  type AddFavoriteResult,
  type RemoveFavoriteResult,
  type UpdateFavoriteResult,
  type GetFavoritesResult,
  type GetFavoriteResult,
} from '../favorites'

// ============================================================================
// Test Helper Functions and Fixtures
// ============================================================================

/**
 * Creates a test favorite location with defaults
 */
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

/**
 * Creates valid add favorite data
 */
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
const testFavoriteId = 'fav-456'

// ============================================================================
// Test Setup and Teardown
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks()
  // Reset mock implementations to default chaining behavior
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
// Constants Tests
// ============================================================================

describe('Constants', () => {
  describe('MAX_CUSTOM_NAME_LENGTH', () => {
    it('is set to 50', () => {
      expect(MAX_CUSTOM_NAME_LENGTH).toBe(50)
    })
  })

  describe('MAX_FAVORITES_PER_USER', () => {
    it('is set to 50', () => {
      expect(MAX_FAVORITES_PER_USER).toBe(50)
    })
  })

  describe('FAVORITES_ERRORS', () => {
    it('has MISSING_USER_ID error message', () => {
      expect(FAVORITES_ERRORS.MISSING_USER_ID).toBe('User ID is required.')
    })

    it('has MISSING_FAVORITE_ID error message', () => {
      expect(FAVORITES_ERRORS.MISSING_FAVORITE_ID).toBe('Favorite ID is required.')
    })

    it('has MISSING_CUSTOM_NAME error message', () => {
      expect(FAVORITES_ERRORS.MISSING_CUSTOM_NAME).toBe('Custom name is required.')
    })

    it('has CUSTOM_NAME_TOO_LONG error message with limit', () => {
      expect(FAVORITES_ERRORS.CUSTOM_NAME_TOO_LONG).toBe(
        `Custom name must be ${MAX_CUSTOM_NAME_LENGTH} characters or less.`
      )
    })

    it('has MISSING_PLACE_NAME error message', () => {
      expect(FAVORITES_ERRORS.MISSING_PLACE_NAME).toBe('Place name is required.')
    })

    it('has MISSING_COORDINATES error message', () => {
      expect(FAVORITES_ERRORS.MISSING_COORDINATES).toBe('Location coordinates are required.')
    })

    it('has INVALID_COORDINATES error message', () => {
      expect(FAVORITES_ERRORS.INVALID_COORDINATES).toBe('Invalid location coordinates.')
    })

    it('has ADD_FAILED error message', () => {
      expect(FAVORITES_ERRORS.ADD_FAILED).toBe(
        'Failed to add favorite location. Please try again.'
      )
    })

    it('has REMOVE_FAILED error message', () => {
      expect(FAVORITES_ERRORS.REMOVE_FAILED).toBe(
        'Failed to remove favorite location. Please try again.'
      )
    })

    it('has UPDATE_FAILED error message', () => {
      expect(FAVORITES_ERRORS.UPDATE_FAILED).toBe(
        'Failed to update favorite location. Please try again.'
      )
    })

    it('has FETCH_FAILED error message', () => {
      expect(FAVORITES_ERRORS.FETCH_FAILED).toBe(
        'Failed to fetch favorite locations. Please try again.'
      )
    })

    it('has NOT_FOUND error message', () => {
      expect(FAVORITES_ERRORS.NOT_FOUND).toBe('Favorite location not found.')
    })

    it('has MAX_FAVORITES_REACHED error message with limit', () => {
      expect(FAVORITES_ERRORS.MAX_FAVORITES_REACHED).toBe(
        `Maximum of ${MAX_FAVORITES_PER_USER} favorites allowed.`
      )
    })
  })
})

// ============================================================================
// validateCustomName Tests
// ============================================================================

describe('validateCustomName', () => {
  describe('valid custom names', () => {
    it('returns null for valid custom name', () => {
      expect(validateCustomName('My Coffee Spot')).toBeNull()
    })

    it('returns null for single character name', () => {
      expect(validateCustomName('A')).toBeNull()
    })

    it('returns null for name at max length', () => {
      const maxLengthName = 'A'.repeat(MAX_CUSTOM_NAME_LENGTH)
      expect(validateCustomName(maxLengthName)).toBeNull()
    })

    it('returns null for name with special characters', () => {
      expect(validateCustomName("Mom's Bakery #1")).toBeNull()
    })

    it('returns null for name with unicode characters', () => {
      expect(validateCustomName('カフェ')).toBeNull()
    })
  })

  describe('invalid custom names', () => {
    it('returns error for null', () => {
      expect(validateCustomName(null)).toBe(FAVORITES_ERRORS.MISSING_CUSTOM_NAME)
    })

    it('returns error for undefined', () => {
      expect(validateCustomName(undefined)).toBe(FAVORITES_ERRORS.MISSING_CUSTOM_NAME)
    })

    it('returns error for empty string', () => {
      expect(validateCustomName('')).toBe(FAVORITES_ERRORS.MISSING_CUSTOM_NAME)
    })

    it('returns error for whitespace-only string', () => {
      expect(validateCustomName('   ')).toBe(FAVORITES_ERRORS.MISSING_CUSTOM_NAME)
    })

    it('returns error for name exceeding max length', () => {
      const tooLongName = 'A'.repeat(MAX_CUSTOM_NAME_LENGTH + 1)
      expect(validateCustomName(tooLongName)).toBe(FAVORITES_ERRORS.CUSTOM_NAME_TOO_LONG)
    })

    it('returns error for name with whitespace padding exceeding max length', () => {
      const nameWithPadding = '  ' + 'A'.repeat(MAX_CUSTOM_NAME_LENGTH + 1) + '  '
      expect(validateCustomName(nameWithPadding)).toBe(FAVORITES_ERRORS.CUSTOM_NAME_TOO_LONG)
    })
  })
})

// ============================================================================
// validateCoordinates Tests
// ============================================================================

describe('validateCoordinates', () => {
  describe('valid coordinates', () => {
    it('returns null for valid coordinates', () => {
      expect(validateCoordinates(37.7749, -122.4194)).toBeNull()
    })

    it('returns null for latitude at minimum (-90)', () => {
      expect(validateCoordinates(-90, 0)).toBeNull()
    })

    it('returns null for latitude at maximum (90)', () => {
      expect(validateCoordinates(90, 0)).toBeNull()
    })

    it('returns null for longitude at minimum (-180)', () => {
      expect(validateCoordinates(0, -180)).toBeNull()
    })

    it('returns null for longitude at maximum (180)', () => {
      expect(validateCoordinates(0, 180)).toBeNull()
    })

    it('returns null for zero coordinates (null island)', () => {
      expect(validateCoordinates(0, 0)).toBeNull()
    })

    it('returns null for decimal coordinates', () => {
      expect(validateCoordinates(40.712776, -74.005974)).toBeNull()
    })
  })

  describe('missing coordinates', () => {
    it('returns error for null latitude', () => {
      expect(validateCoordinates(null, -122.4194)).toBe(FAVORITES_ERRORS.MISSING_COORDINATES)
    })

    it('returns error for undefined latitude', () => {
      expect(validateCoordinates(undefined, -122.4194)).toBe(FAVORITES_ERRORS.MISSING_COORDINATES)
    })

    it('returns error for null longitude', () => {
      expect(validateCoordinates(37.7749, null)).toBe(FAVORITES_ERRORS.MISSING_COORDINATES)
    })

    it('returns error for undefined longitude', () => {
      expect(validateCoordinates(37.7749, undefined)).toBe(FAVORITES_ERRORS.MISSING_COORDINATES)
    })

    it('returns error for both null', () => {
      expect(validateCoordinates(null, null)).toBe(FAVORITES_ERRORS.MISSING_COORDINATES)
    })
  })

  describe('invalid latitude range', () => {
    it('returns error for latitude below -90', () => {
      expect(validateCoordinates(-90.1, 0)).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })

    it('returns error for latitude above 90', () => {
      expect(validateCoordinates(90.1, 0)).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })

    it('returns error for extremely negative latitude', () => {
      expect(validateCoordinates(-180, 0)).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })

    it('returns error for extremely positive latitude', () => {
      expect(validateCoordinates(180, 0)).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })
  })

  describe('invalid longitude range', () => {
    it('returns error for longitude below -180', () => {
      expect(validateCoordinates(0, -180.1)).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })

    it('returns error for longitude above 180', () => {
      expect(validateCoordinates(0, 180.1)).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })

    it('returns error for extremely negative longitude', () => {
      expect(validateCoordinates(0, -360)).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })

    it('returns error for extremely positive longitude', () => {
      expect(validateCoordinates(0, 360)).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })
  })
})

// ============================================================================
// validateAddFavoriteRequest Tests
// ============================================================================

describe('validateAddFavoriteRequest', () => {
  describe('valid requests', () => {
    it('returns null for valid request with all fields', () => {
      const data = createValidAddData()
      expect(validateAddFavoriteRequest(testUserId, data)).toBeNull()
    })

    it('returns null for valid request with optional fields omitted', () => {
      const data: AddFavoriteData = {
        custom_name: 'My Place',
        place_name: 'The Place',
        latitude: 40.7128,
        longitude: -74.006,
      }
      expect(validateAddFavoriteRequest(testUserId, data)).toBeNull()
    })
  })

  describe('missing user ID', () => {
    it('returns error for null user ID', () => {
      const data = createValidAddData()
      expect(validateAddFavoriteRequest(null, data)).toBe(FAVORITES_ERRORS.MISSING_USER_ID)
    })

    it('returns error for undefined user ID', () => {
      const data = createValidAddData()
      expect(validateAddFavoriteRequest(undefined, data)).toBe(FAVORITES_ERRORS.MISSING_USER_ID)
    })

    it('returns error for empty string user ID', () => {
      const data = createValidAddData()
      expect(validateAddFavoriteRequest('', data)).toBe(FAVORITES_ERRORS.MISSING_USER_ID)
    })
  })

  describe('missing data', () => {
    it('returns error for null data', () => {
      expect(validateAddFavoriteRequest(testUserId, null)).toBe(FAVORITES_ERRORS.MISSING_CUSTOM_NAME)
    })

    it('returns error for undefined data', () => {
      expect(validateAddFavoriteRequest(testUserId, undefined)).toBe(
        FAVORITES_ERRORS.MISSING_CUSTOM_NAME
      )
    })
  })

  describe('invalid custom name', () => {
    it('returns error for empty custom name', () => {
      const data = createValidAddData({ custom_name: '' })
      expect(validateAddFavoriteRequest(testUserId, data)).toBe(FAVORITES_ERRORS.MISSING_CUSTOM_NAME)
    })

    it('returns error for custom name too long', () => {
      const data = createValidAddData({ custom_name: 'A'.repeat(51) })
      expect(validateAddFavoriteRequest(testUserId, data)).toBe(
        FAVORITES_ERRORS.CUSTOM_NAME_TOO_LONG
      )
    })
  })

  describe('invalid place name', () => {
    it('returns error for empty place name', () => {
      const data = createValidAddData({ place_name: '' })
      expect(validateAddFavoriteRequest(testUserId, data)).toBe(FAVORITES_ERRORS.MISSING_PLACE_NAME)
    })

    it('returns error for whitespace-only place name', () => {
      const data = createValidAddData({ place_name: '   ' })
      expect(validateAddFavoriteRequest(testUserId, data)).toBe(FAVORITES_ERRORS.MISSING_PLACE_NAME)
    })
  })

  describe('invalid coordinates', () => {
    it('returns error for invalid latitude', () => {
      const data = createValidAddData({ latitude: 100 })
      expect(validateAddFavoriteRequest(testUserId, data)).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })

    it('returns error for invalid longitude', () => {
      const data = createValidAddData({ longitude: 200 })
      expect(validateAddFavoriteRequest(testUserId, data)).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })
  })
})

// ============================================================================
// validateUpdateFavoriteRequest Tests
// ============================================================================

describe('validateUpdateFavoriteRequest', () => {
  describe('valid requests', () => {
    it('returns null for valid update with custom_name', () => {
      const updates: FavoriteLocationUpdate = { custom_name: 'New Name' }
      expect(validateUpdateFavoriteRequest(testUserId, testFavoriteId, updates)).toBeNull()
    })

    it('returns null for valid update with latitude', () => {
      const updates: FavoriteLocationUpdate = { latitude: 40.0 }
      expect(validateUpdateFavoriteRequest(testUserId, testFavoriteId, updates)).toBeNull()
    })

    it('returns null for valid update with longitude', () => {
      const updates: FavoriteLocationUpdate = { longitude: -74.0 }
      expect(validateUpdateFavoriteRequest(testUserId, testFavoriteId, updates)).toBeNull()
    })

    it('returns null for null updates (no-op)', () => {
      expect(validateUpdateFavoriteRequest(testUserId, testFavoriteId, null)).toBeNull()
    })

    it('returns null for undefined updates (no-op)', () => {
      expect(validateUpdateFavoriteRequest(testUserId, testFavoriteId, undefined)).toBeNull()
    })

    it('returns null for empty updates object', () => {
      expect(validateUpdateFavoriteRequest(testUserId, testFavoriteId, {})).toBeNull()
    })
  })

  describe('missing user ID', () => {
    it('returns error for null user ID', () => {
      const updates: FavoriteLocationUpdate = { custom_name: 'New Name' }
      expect(validateUpdateFavoriteRequest(null, testFavoriteId, updates)).toBe(
        FAVORITES_ERRORS.MISSING_USER_ID
      )
    })

    it('returns error for undefined user ID', () => {
      const updates: FavoriteLocationUpdate = { custom_name: 'New Name' }
      expect(validateUpdateFavoriteRequest(undefined, testFavoriteId, updates)).toBe(
        FAVORITES_ERRORS.MISSING_USER_ID
      )
    })
  })

  describe('missing favorite ID', () => {
    it('returns error for null favorite ID', () => {
      const updates: FavoriteLocationUpdate = { custom_name: 'New Name' }
      expect(validateUpdateFavoriteRequest(testUserId, null, updates)).toBe(
        FAVORITES_ERRORS.MISSING_FAVORITE_ID
      )
    })

    it('returns error for undefined favorite ID', () => {
      const updates: FavoriteLocationUpdate = { custom_name: 'New Name' }
      expect(validateUpdateFavoriteRequest(testUserId, undefined, updates)).toBe(
        FAVORITES_ERRORS.MISSING_FAVORITE_ID
      )
    })
  })

  describe('invalid custom name update', () => {
    it('returns error for empty custom name', () => {
      const updates: FavoriteLocationUpdate = { custom_name: '' }
      expect(validateUpdateFavoriteRequest(testUserId, testFavoriteId, updates)).toBe(
        FAVORITES_ERRORS.MISSING_CUSTOM_NAME
      )
    })

    it('returns error for custom name too long', () => {
      const updates: FavoriteLocationUpdate = { custom_name: 'A'.repeat(51) }
      expect(validateUpdateFavoriteRequest(testUserId, testFavoriteId, updates)).toBe(
        FAVORITES_ERRORS.CUSTOM_NAME_TOO_LONG
      )
    })
  })

  describe('invalid coordinate updates', () => {
    it('returns error for invalid latitude update', () => {
      const updates: FavoriteLocationUpdate = { latitude: 100 }
      expect(validateUpdateFavoriteRequest(testUserId, testFavoriteId, updates)).toBe(
        FAVORITES_ERRORS.INVALID_COORDINATES
      )
    })

    it('returns error for invalid longitude update', () => {
      const updates: FavoriteLocationUpdate = { longitude: 200 }
      expect(validateUpdateFavoriteRequest(testUserId, testFavoriteId, updates)).toBe(
        FAVORITES_ERRORS.INVALID_COORDINATES
      )
    })

    it('returns error for latitude below -90', () => {
      const updates: FavoriteLocationUpdate = { latitude: -91 }
      expect(validateUpdateFavoriteRequest(testUserId, testFavoriteId, updates)).toBe(
        FAVORITES_ERRORS.INVALID_COORDINATES
      )
    })

    it('returns error for longitude below -180', () => {
      const updates: FavoriteLocationUpdate = { longitude: -181 }
      expect(validateUpdateFavoriteRequest(testUserId, testFavoriteId, updates)).toBe(
        FAVORITES_ERRORS.INVALID_COORDINATES
      )
    })
  })
})

// ============================================================================
// addFavorite Tests
// ============================================================================

describe('addFavorite', () => {
  describe('successful operations', () => {
    it('adds a favorite successfully', async () => {
      const favorite = createTestFavorite()
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      const result = await addFavorite(testUserId, createValidAddData())

      expect(result.success).toBe(true)
      expect(result.favorite).toEqual(favorite)
      expect(result.error).toBeNull()
    })

    it('trims custom name before saving', async () => {
      const favorite = createTestFavorite()
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      await addFavorite(testUserId, createValidAddData({ custom_name: '  My Gym  ' }))

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          custom_name: 'My Gym',
        })
      )
    })

    it('trims place name before saving', async () => {
      const favorite = createTestFavorite()
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      await addFavorite(testUserId, createValidAddData({ place_name: '  Planet Fitness  ' }))

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          place_name: 'Planet Fitness',
        })
      )
    })

    it('includes user_id in the insert data', async () => {
      const favorite = createTestFavorite()
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      await addFavorite(testUserId, createValidAddData())

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: testUserId,
        })
      )
    })
  })

  describe('validation errors', () => {
    it('returns error for missing user ID', async () => {
      const result = await addFavorite(null, createValidAddData())

      expect(result.success).toBe(false)
      expect(result.favorite).toBeNull()
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_USER_ID)
    })

    it('returns error for missing data', async () => {
      const result = await addFavorite(testUserId, null)

      expect(result.success).toBe(false)
      expect(result.favorite).toBeNull()
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_CUSTOM_NAME)
    })

    it('returns error for invalid coordinates', async () => {
      const result = await addFavorite(testUserId, createValidAddData({ latitude: 200 }))

      expect(result.success).toBe(false)
      expect(result.favorite).toBeNull()
      expect(result.error).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })
  })

  describe('max favorites limit', () => {
    it('returns error when max favorites reached', async () => {
      // Mock count check returning max favorites
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: MAX_FAVORITES_PER_USER, error: null }),
      })

      const result = await addFavorite(testUserId, createValidAddData())

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.MAX_FAVORITES_REACHED)
    })

    it('returns error when count check fails', async () => {
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'Count failed' } }),
      })

      const result = await addFavorite(testUserId, createValidAddData())

      expect(result.success).toBe(false)
      expect(result.error).toBe('Count failed')
    })
  })

  describe('database errors', () => {
    it('returns error when insert fails', async () => {
      // Mock count check passing
      mockSelect.mockReturnValueOnce({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      })
      // Mock insert failing
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
      })

      const result = await addFavorite(testUserId, createValidAddData())

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insert failed')
    })

    it('handles thrown exceptions', async () => {
      mockSelect.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await addFavorite(testUserId, createValidAddData())

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unexpected error')
    })

    it('handles non-Error thrown values', async () => {
      mockSelect.mockImplementation(() => {
        throw 'String error'
      })

      const result = await addFavorite(testUserId, createValidAddData())

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.ADD_FAILED)
    })
  })
})

// ============================================================================
// removeFavorite Tests
// ============================================================================

describe('removeFavorite', () => {
  describe('successful operations', () => {
    it('removes a favorite successfully', async () => {
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await removeFavorite(testUserId, testFavoriteId)

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })

    it('calls delete on favorite_locations table', async () => {
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      await removeFavorite(testUserId, testFavoriteId)

      expect(mockFrom).toHaveBeenCalledWith('favorite_locations')
      expect(mockDelete).toHaveBeenCalled()
    })

    it('filters by both favorite ID and user ID', async () => {
      const mockSecondEq = vi.fn().mockResolvedValue({ error: null })
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: mockSecondEq,
      })

      await removeFavorite(testUserId, testFavoriteId)

      expect(mockEq).toHaveBeenCalledWith('id', testFavoriteId)
      expect(mockSecondEq).toHaveBeenCalledWith('user_id', testUserId)
    })
  })

  describe('validation errors', () => {
    it('returns error for missing user ID', async () => {
      const result = await removeFavorite(null, testFavoriteId)

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_USER_ID)
    })

    it('returns error for undefined user ID', async () => {
      const result = await removeFavorite(undefined, testFavoriteId)

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_USER_ID)
    })

    it('returns error for empty user ID', async () => {
      const result = await removeFavorite('', testFavoriteId)

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_USER_ID)
    })

    it('returns error for missing favorite ID', async () => {
      const result = await removeFavorite(testUserId, null)

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_FAVORITE_ID)
    })

    it('returns error for undefined favorite ID', async () => {
      const result = await removeFavorite(testUserId, undefined)

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_FAVORITE_ID)
    })

    it('returns error for empty favorite ID', async () => {
      const result = await removeFavorite(testUserId, '')

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_FAVORITE_ID)
    })
  })

  describe('database errors', () => {
    it('returns error when delete fails', async () => {
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
      })

      const result = await removeFavorite(testUserId, testFavoriteId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Delete failed')
    })

    it('handles thrown exceptions', async () => {
      mockDelete.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await removeFavorite(testUserId, testFavoriteId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unexpected error')
    })

    it('handles non-Error thrown values', async () => {
      mockDelete.mockImplementation(() => {
        throw 'String error'
      })

      const result = await removeFavorite(testUserId, testFavoriteId)

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.REMOVE_FAILED)
    })
  })
})

// ============================================================================
// updateFavorite Tests
// ============================================================================

describe('updateFavorite', () => {
  describe('successful operations', () => {
    it('updates a favorite successfully', async () => {
      const updatedFavorite = createTestFavorite({ custom_name: 'New Name' })
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockReturnValue({
          ...mockQueryBuilder,
          select: vi.fn().mockReturnValue({
            ...mockQueryBuilder,
            single: vi.fn().mockResolvedValue({ data: updatedFavorite, error: null }),
          }),
        }),
      })

      const result = await updateFavorite(testUserId, testFavoriteId, { custom_name: 'New Name' })

      expect(result.success).toBe(true)
      expect(result.favorite?.custom_name).toBe('New Name')
      expect(result.error).toBeNull()
    })

    it('trims custom name in updates', async () => {
      const updatedFavorite = createTestFavorite({ custom_name: 'New Name' })
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockReturnValue({
          ...mockQueryBuilder,
          select: vi.fn().mockReturnValue({
            ...mockQueryBuilder,
            single: vi.fn().mockResolvedValue({ data: updatedFavorite, error: null }),
          }),
        }),
      })

      await updateFavorite(testUserId, testFavoriteId, { custom_name: '  New Name  ' })

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          custom_name: 'New Name',
        })
      )
    })

    it('includes updated_at timestamp', async () => {
      const updatedFavorite = createTestFavorite()
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockReturnValue({
          ...mockQueryBuilder,
          select: vi.fn().mockReturnValue({
            ...mockQueryBuilder,
            single: vi.fn().mockResolvedValue({ data: updatedFavorite, error: null }),
          }),
        }),
      })

      await updateFavorite(testUserId, testFavoriteId, { custom_name: 'New Name' })

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String),
        })
      )
    })
  })

  describe('no-op updates', () => {
    it('returns current favorite for null updates', async () => {
      const favorite = createTestFavorite()
      // Mock getFavoriteById response
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockReturnValue({
          ...mockQueryBuilder,
          single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
        }),
      })

      const result = await updateFavorite(testUserId, testFavoriteId, null)

      expect(result.success).toBe(true)
      expect(result.favorite).toEqual(favorite)
    })

    it('returns current favorite for empty updates object', async () => {
      const favorite = createTestFavorite()
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockReturnValue({
          ...mockQueryBuilder,
          single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
        }),
      })

      const result = await updateFavorite(testUserId, testFavoriteId, {})

      expect(result.success).toBe(true)
    })
  })

  describe('validation errors', () => {
    it('returns error for missing user ID', async () => {
      const result = await updateFavorite(null, testFavoriteId, { custom_name: 'New Name' })

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_USER_ID)
    })

    it('returns error for missing favorite ID', async () => {
      const result = await updateFavorite(testUserId, null, { custom_name: 'New Name' })

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_FAVORITE_ID)
    })

    it('returns error for invalid custom name update', async () => {
      const result = await updateFavorite(testUserId, testFavoriteId, { custom_name: '' })

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_CUSTOM_NAME)
    })

    it('returns error for invalid latitude update', async () => {
      const result = await updateFavorite(testUserId, testFavoriteId, { latitude: 200 })

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.INVALID_COORDINATES)
    })
  })

  describe('not found errors', () => {
    it('returns NOT_FOUND error for PGRST116 code', async () => {
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockReturnValue({
          ...mockQueryBuilder,
          select: vi.fn().mockReturnValue({
            ...mockQueryBuilder,
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows' },
            }),
          }),
        }),
      })

      const result = await updateFavorite(testUserId, testFavoriteId, { custom_name: 'New Name' })

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.NOT_FOUND)
    })
  })

  describe('database errors', () => {
    it('returns error when update fails', async () => {
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockReturnValue({
          ...mockQueryBuilder,
          select: vi.fn().mockReturnValue({
            ...mockQueryBuilder,
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Update failed' },
            }),
          }),
        }),
      })

      const result = await updateFavorite(testUserId, testFavoriteId, { custom_name: 'New Name' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
    })

    it('handles thrown exceptions', async () => {
      mockUpdate.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await updateFavorite(testUserId, testFavoriteId, { custom_name: 'New Name' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unexpected error')
    })
  })
})

// ============================================================================
// getUserFavorites Tests
// ============================================================================

describe('getUserFavorites', () => {
  describe('successful operations', () => {
    it('returns favorites for user', async () => {
      const favorites = [
        createTestFavorite({ id: 'fav-1' }),
        createTestFavorite({ id: 'fav-2' }),
      ]
      mockOrder.mockResolvedValue({ data: favorites, error: null })

      const result = await getUserFavorites(testUserId)

      expect(result.success).toBe(true)
      expect(result.favorites).toEqual(favorites)
      expect(result.error).toBeNull()
    })

    it('returns empty array when user has no favorites', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      const result = await getUserFavorites(testUserId)

      expect(result.success).toBe(true)
      expect(result.favorites).toEqual([])
    })

    it('orders by updated_at descending', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      await getUserFavorites(testUserId)

      expect(mockOrder).toHaveBeenCalledWith('updated_at', { ascending: false })
    })
  })

  describe('validation errors', () => {
    it('returns error for missing user ID', async () => {
      const result = await getUserFavorites(null)

      expect(result.success).toBe(false)
      expect(result.favorites).toEqual([])
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_USER_ID)
    })

    it('returns error for undefined user ID', async () => {
      const result = await getUserFavorites(undefined)

      expect(result.success).toBe(false)
      expect(result.favorites).toEqual([])
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_USER_ID)
    })

    it('returns error for empty user ID', async () => {
      const result = await getUserFavorites('')

      expect(result.success).toBe(false)
      expect(result.favorites).toEqual([])
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_USER_ID)
    })
  })

  describe('database errors', () => {
    it('returns error when fetch fails', async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: 'Fetch failed' } })

      const result = await getUserFavorites(testUserId)

      expect(result.success).toBe(false)
      expect(result.favorites).toEqual([])
      expect(result.error).toBe('Fetch failed')
    })

    it('handles thrown exceptions', async () => {
      mockOrder.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await getUserFavorites(testUserId)

      expect(result.success).toBe(false)
      expect(result.favorites).toEqual([])
      expect(result.error).toBe('Unexpected error')
    })

    it('handles non-Error thrown values', async () => {
      mockOrder.mockImplementation(() => {
        throw 'String error'
      })

      const result = await getUserFavorites(testUserId)

      expect(result.success).toBe(false)
      expect(result.favorites).toEqual([])
      expect(result.error).toBe(FAVORITES_ERRORS.FETCH_FAILED)
    })
  })
})

// ============================================================================
// getFavoriteById Tests
// ============================================================================

describe('getFavoriteById', () => {
  describe('successful operations', () => {
    it('returns favorite by ID', async () => {
      const favorite = createTestFavorite()
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockReturnValue({
          ...mockQueryBuilder,
          single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
        }),
      })

      const result = await getFavoriteById(testUserId, testFavoriteId)

      expect(result.success).toBe(true)
      expect(result.favorite).toEqual(favorite)
      expect(result.error).toBeNull()
    })

    it('filters by both favorite ID and user ID', async () => {
      const favorite = createTestFavorite()
      const mockSecondEq = vi.fn().mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: mockSecondEq,
      })

      await getFavoriteById(testUserId, testFavoriteId)

      expect(mockEq).toHaveBeenCalledWith('id', testFavoriteId)
      expect(mockSecondEq).toHaveBeenCalledWith('user_id', testUserId)
    })
  })

  describe('validation errors', () => {
    it('returns error for missing user ID', async () => {
      const result = await getFavoriteById(null, testFavoriteId)

      expect(result.success).toBe(false)
      expect(result.favorite).toBeNull()
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_USER_ID)
    })

    it('returns error for missing favorite ID', async () => {
      const result = await getFavoriteById(testUserId, null)

      expect(result.success).toBe(false)
      expect(result.favorite).toBeNull()
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_FAVORITE_ID)
    })
  })

  describe('not found errors', () => {
    it('returns NOT_FOUND error for PGRST116 code', async () => {
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockReturnValue({
          ...mockQueryBuilder,
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows' },
          }),
        }),
      })

      const result = await getFavoriteById(testUserId, testFavoriteId)

      expect(result.success).toBe(false)
      expect(result.favorite).toBeNull()
      expect(result.error).toBe(FAVORITES_ERRORS.NOT_FOUND)
    })
  })

  describe('database errors', () => {
    it('returns error when fetch fails', async () => {
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockReturnValue({
          ...mockQueryBuilder,
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Fetch failed' },
          }),
        }),
      })

      const result = await getFavoriteById(testUserId, testFavoriteId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Fetch failed')
    })

    it('handles thrown exceptions', async () => {
      mockSelect.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await getFavoriteById(testUserId, testFavoriteId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unexpected error')
    })
  })
})

// ============================================================================
// getFavoritesCount Tests
// ============================================================================

describe('getFavoritesCount', () => {
  describe('successful operations', () => {
    it('returns count for user', async () => {
      mockEq.mockResolvedValue({ count: 5, error: null })

      const result = await getFavoritesCount(testUserId)

      expect(result.success).toBe(true)
      expect(result.count).toBe(5)
      expect(result.error).toBeNull()
    })

    it('returns 0 when user has no favorites', async () => {
      mockEq.mockResolvedValue({ count: 0, error: null })

      const result = await getFavoritesCount(testUserId)

      expect(result.success).toBe(true)
      expect(result.count).toBe(0)
    })

    it('returns 0 when count is null', async () => {
      mockEq.mockResolvedValue({ count: null, error: null })

      const result = await getFavoritesCount(testUserId)

      expect(result.success).toBe(true)
      expect(result.count).toBe(0)
    })
  })

  describe('validation errors', () => {
    it('returns error for missing user ID', async () => {
      const result = await getFavoritesCount(null)

      expect(result.success).toBe(false)
      expect(result.count).toBe(0)
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_USER_ID)
    })

    it('returns error for undefined user ID', async () => {
      const result = await getFavoritesCount(undefined)

      expect(result.success).toBe(false)
      expect(result.count).toBe(0)
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_USER_ID)
    })

    it('returns error for empty user ID', async () => {
      const result = await getFavoritesCount('')

      expect(result.success).toBe(false)
      expect(result.count).toBe(0)
      expect(result.error).toBe(FAVORITES_ERRORS.MISSING_USER_ID)
    })
  })

  describe('database errors', () => {
    it('returns error when count fails', async () => {
      mockEq.mockResolvedValue({ count: null, error: { message: 'Count failed' } })

      const result = await getFavoritesCount(testUserId)

      expect(result.success).toBe(false)
      expect(result.count).toBe(0)
      expect(result.error).toBe('Count failed')
    })

    it('handles thrown exceptions', async () => {
      mockSelect.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await getFavoritesCount(testUserId)

      expect(result.success).toBe(false)
      expect(result.count).toBe(0)
      expect(result.error).toBe('Unexpected error')
    })

    it('handles non-Error thrown values', async () => {
      mockSelect.mockImplementation(() => {
        throw 'String error'
      })

      const result = await getFavoritesCount(testUserId)

      expect(result.success).toBe(false)
      expect(result.count).toBe(0)
      expect(result.error).toBe(FAVORITES_ERRORS.FETCH_FAILED)
    })
  })
})

// ============================================================================
// Edge Case Tests
// ============================================================================

describe('Edge Cases', () => {
  describe('special characters in custom names', () => {
    it('handles special characters in custom name', async () => {
      const favorite = createTestFavorite({ custom_name: "Mom's Bakery & Café #1" })
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      const result = await addFavorite(
        testUserId,
        createValidAddData({ custom_name: "Mom's Bakery & Café #1" })
      )

      expect(result.success).toBe(true)
    })

    it('handles emoji in custom name', async () => {
      const favorite = createTestFavorite({ custom_name: '☕ Coffee Shop' })
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      const result = await addFavorite(
        testUserId,
        createValidAddData({ custom_name: '☕ Coffee Shop' })
      )

      expect(result.success).toBe(true)
    })
  })

  describe('boundary coordinates', () => {
    it('accepts coordinates at exact boundaries', async () => {
      const favorite = createTestFavorite({ latitude: 90, longitude: 180 })
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      const result = await addFavorite(
        testUserId,
        createValidAddData({ latitude: 90, longitude: 180 })
      )

      expect(result.success).toBe(true)
    })

    it('accepts negative boundary coordinates', async () => {
      const favorite = createTestFavorite({ latitude: -90, longitude: -180 })
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      const result = await addFavorite(
        testUserId,
        createValidAddData({ latitude: -90, longitude: -180 })
      )

      expect(result.success).toBe(true)
    })
  })

  describe('optional fields', () => {
    it('handles null address', async () => {
      const favorite = createTestFavorite({ address: null })
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      const result = await addFavorite(
        testUserId,
        createValidAddData({ address: null })
      )

      expect(result.success).toBe(true)
    })

    it('handles null place_id', async () => {
      const favorite = createTestFavorite({ place_id: null })
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      const result = await addFavorite(
        testUserId,
        createValidAddData({ place_id: null })
      )

      expect(result.success).toBe(true)
    })

    it('trims address when present', async () => {
      const favorite = createTestFavorite()
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
  })

  describe('name length at boundary', () => {
    it('accepts custom name at exactly 50 characters', async () => {
      const exactLengthName = 'A'.repeat(50)
      const favorite = createTestFavorite({ custom_name: exactLengthName })
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      const result = await addFavorite(
        testUserId,
        createValidAddData({ custom_name: exactLengthName })
      )

      expect(result.success).toBe(true)
    })

    it('rejects custom name at exactly 51 characters', async () => {
      const tooLongName = 'A'.repeat(51)

      const result = await addFavorite(
        testUserId,
        createValidAddData({ custom_name: tooLongName })
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe(FAVORITES_ERRORS.CUSTOM_NAME_TOO_LONG)
    })
  })
})

// ============================================================================
// Return Type Structure Tests
// ============================================================================

describe('Return Type Structures', () => {
  describe('AddFavoriteResult', () => {
    it('has correct structure on success', async () => {
      const favorite = createTestFavorite()
      mockSelect.mockReturnValue({
        ...mockQueryBuilder,
        single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
      })

      const result = await addFavorite(testUserId, createValidAddData())

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('favorite')
      expect(result).toHaveProperty('error')
      expect(typeof result.success).toBe('boolean')
    })
  })

  describe('RemoveFavoriteResult', () => {
    it('has correct structure on success', async () => {
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await removeFavorite(testUserId, testFavoriteId)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('error')
      expect(typeof result.success).toBe('boolean')
    })
  })

  describe('UpdateFavoriteResult', () => {
    it('has correct structure on success', async () => {
      const favorite = createTestFavorite()
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockReturnValue({
          ...mockQueryBuilder,
          select: vi.fn().mockReturnValue({
            ...mockQueryBuilder,
            single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
          }),
        }),
      })

      const result = await updateFavorite(testUserId, testFavoriteId, { custom_name: 'New' })

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('favorite')
      expect(result).toHaveProperty('error')
    })
  })

  describe('GetFavoritesResult', () => {
    it('has correct structure on success', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      const result = await getUserFavorites(testUserId)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('favorites')
      expect(result).toHaveProperty('error')
      expect(Array.isArray(result.favorites)).toBe(true)
    })
  })

  describe('GetFavoriteResult', () => {
    it('has correct structure on success', async () => {
      const favorite = createTestFavorite()
      mockEq.mockReturnValue({
        ...mockQueryBuilder,
        eq: vi.fn().mockReturnValue({
          ...mockQueryBuilder,
          single: vi.fn().mockResolvedValue({ data: favorite, error: null }),
        }),
      })

      const result = await getFavoriteById(testUserId, testFavoriteId)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('favorite')
      expect(result).toHaveProperty('error')
    })
  })

  describe('getFavoritesCount result', () => {
    it('has correct structure on success', async () => {
      mockEq.mockResolvedValue({ count: 5, error: null })

      const result = await getFavoritesCount(testUserId)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('count')
      expect(result).toHaveProperty('error')
      expect(typeof result.count).toBe('number')
    })
  })
})
