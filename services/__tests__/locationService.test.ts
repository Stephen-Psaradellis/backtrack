/**
 * Tests for services/locationService.ts
 *
 * Tests establishment filtering functionality to ensure residential
 * addresses are excluded from search results.
 */

import { describe, it, expect } from 'vitest'
import {
  isValidEstablishment,
  transformGooglePlaces,
  EXCLUDED_PLACE_TYPES,
  ESTABLISHMENT_PLACE_TYPES,
} from '../locationService'
import type { GooglePlace } from '../../types/location'

// ============================================================================
// Test Data
// ============================================================================

/**
 * Creates a mock GooglePlace for testing
 */
function createMockPlace(
  overrides: Partial<GooglePlace> = {}
): GooglePlace {
  return {
    id: 'test-place-id',
    displayName: { text: 'Test Place' },
    formattedAddress: '123 Test Street',
    location: { latitude: 40.7128, longitude: -74.006 },
    types: ['establishment'],
    ...overrides,
  }
}

// ============================================================================
// Constants Tests
// ============================================================================

describe('EXCLUDED_PLACE_TYPES', () => {
  it('should include street_address', () => {
    expect(EXCLUDED_PLACE_TYPES).toContain('street_address')
  })

  it('should include residential address types', () => {
    expect(EXCLUDED_PLACE_TYPES).toContain('premise')
    expect(EXCLUDED_PLACE_TYPES).toContain('subpremise')
    expect(EXCLUDED_PLACE_TYPES).toContain('street_number')
  })

  it('should include geographic types', () => {
    expect(EXCLUDED_PLACE_TYPES).toContain('route')
    expect(EXCLUDED_PLACE_TYPES).toContain('locality')
    expect(EXCLUDED_PLACE_TYPES).toContain('neighborhood')
    expect(EXCLUDED_PLACE_TYPES).toContain('postal_code')
  })

  it('should include administrative types', () => {
    expect(EXCLUDED_PLACE_TYPES).toContain('political')
    expect(EXCLUDED_PLACE_TYPES).toContain('country')
    expect(EXCLUDED_PLACE_TYPES).toContain('administrative_area_level_1')
    expect(EXCLUDED_PLACE_TYPES).toContain('administrative_area_level_2')
  })

  it('should not include establishment types', () => {
    expect(EXCLUDED_PLACE_TYPES).not.toContain('restaurant')
    expect(EXCLUDED_PLACE_TYPES).not.toContain('cafe')
    expect(EXCLUDED_PLACE_TYPES).not.toContain('gym')
  })
})

describe('ESTABLISHMENT_PLACE_TYPES', () => {
  it('should include food and drink venues', () => {
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('restaurant')
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('cafe')
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('bar')
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('coffee_shop')
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('bakery')
  })

  it('should include fitness venues', () => {
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('gym')
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('fitness_center')
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('spa')
  })

  it('should include retail venues', () => {
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('store')
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('shopping_mall')
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('book_store')
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('clothing_store')
  })

  it('should include entertainment venues', () => {
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('museum')
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('movie_theater')
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('park')
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('amusement_park')
  })

  it('should include transit venues', () => {
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('airport')
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('train_station')
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('bus_station')
  })

  it('should include general establishment types', () => {
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('establishment')
    expect(ESTABLISHMENT_PLACE_TYPES).toContain('point_of_interest')
  })

  it('should not include residential types', () => {
    expect(ESTABLISHMENT_PLACE_TYPES).not.toContain('street_address')
    expect(ESTABLISHMENT_PLACE_TYPES).not.toContain('premise')
    expect(ESTABLISHMENT_PLACE_TYPES).not.toContain('route')
  })
})

// ============================================================================
// isValidEstablishment Tests
// ============================================================================

describe('isValidEstablishment', () => {
  describe('valid establishments', () => {
    it('should return true for restaurants', () => {
      expect(isValidEstablishment(['restaurant', 'food', 'point_of_interest'])).toBe(true)
    })

    it('should return true for cafes', () => {
      expect(isValidEstablishment(['cafe', 'food', 'establishment'])).toBe(true)
    })

    it('should return true for gyms', () => {
      expect(isValidEstablishment(['gym', 'health', 'establishment'])).toBe(true)
    })

    it('should return true for bars', () => {
      expect(isValidEstablishment(['bar', 'night_club', 'establishment'])).toBe(true)
    })

    it('should return true for stores', () => {
      expect(isValidEstablishment(['store', 'clothing_store', 'establishment'])).toBe(true)
    })

    it('should return true for museums', () => {
      expect(isValidEstablishment(['museum', 'tourist_attraction', 'point_of_interest'])).toBe(true)
    })

    it('should return true for parks', () => {
      expect(isValidEstablishment(['park', 'point_of_interest'])).toBe(true)
    })

    it('should return true for general establishments', () => {
      expect(isValidEstablishment(['establishment', 'point_of_interest'])).toBe(true)
    })
  })

  describe('invalid establishments (residential/geographic)', () => {
    it('should return false for street addresses', () => {
      expect(isValidEstablishment(['street_address'])).toBe(false)
    })

    it('should return false for routes', () => {
      expect(isValidEstablishment(['route'])).toBe(false)
    })

    it('should return false for neighborhoods', () => {
      expect(isValidEstablishment(['neighborhood'])).toBe(false)
    })

    it('should return false for localities', () => {
      expect(isValidEstablishment(['locality', 'political'])).toBe(false)
    })

    it('should return false for postal codes', () => {
      expect(isValidEstablishment(['postal_code'])).toBe(false)
    })

    it('should return false for premises', () => {
      expect(isValidEstablishment(['premise'])).toBe(false)
    })

    it('should return false for subpremises', () => {
      expect(isValidEstablishment(['subpremise'])).toBe(false)
    })

    it('should return false for geocodes', () => {
      expect(isValidEstablishment(['geocode'])).toBe(false)
    })

    it('should return false for administrative areas', () => {
      expect(isValidEstablishment(['administrative_area_level_1', 'political'])).toBe(false)
    })
  })

  describe('primary type filtering', () => {
    it('should return false when primaryType is street_address', () => {
      expect(isValidEstablishment(['establishment', 'point_of_interest'], 'street_address')).toBe(false)
    })

    it('should return false when primaryType is premise', () => {
      expect(isValidEstablishment(['establishment'], 'premise')).toBe(false)
    })

    it('should return false when primaryType is route', () => {
      expect(isValidEstablishment(['point_of_interest'], 'route')).toBe(false)
    })

    it('should return true when primaryType is restaurant', () => {
      expect(isValidEstablishment(['restaurant', 'food'], 'restaurant')).toBe(true)
    })

    it('should return true when primaryType is cafe', () => {
      expect(isValidEstablishment(['cafe', 'food'], 'cafe')).toBe(true)
    })
  })

  describe('mixed types (establishment at an address)', () => {
    it('should return true for cafe with address types (establishment takes priority)', () => {
      // A cafe located at a street address - should be valid
      expect(isValidEstablishment(['cafe', 'food', 'establishment', 'point_of_interest'], 'cafe')).toBe(true)
    })

    it('should return true for restaurant with location context', () => {
      expect(isValidEstablishment(['restaurant', 'food', 'establishment'], 'restaurant')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should return false for empty types array', () => {
      expect(isValidEstablishment([])).toBe(false)
    })

    it('should return false for null/undefined types', () => {
      // @ts-expect-error Testing invalid input
      expect(isValidEstablishment(null)).toBe(false)
      // @ts-expect-error Testing invalid input
      expect(isValidEstablishment(undefined)).toBe(false)
    })

    it('should return true for unknown types (not in either list)', () => {
      // Unknown types that aren't in excluded list should be allowed
      expect(isValidEstablishment(['some_unknown_type'])).toBe(true)
    })

    it('should handle case sensitivity', () => {
      // Google Places API uses lowercase
      expect(isValidEstablishment(['RESTAURANT'])).toBe(true) // Unknown, but not excluded
      expect(isValidEstablishment(['restaurant'])).toBe(true)
    })
  })
})

// ============================================================================
// transformGooglePlaces Tests
// ============================================================================

describe('transformGooglePlaces', () => {
  describe('with establishment filtering (default)', () => {
    it('should include restaurants', () => {
      const places = [
        createMockPlace({
          id: 'restaurant-1',
          displayName: { text: 'Good Restaurant' },
          types: ['restaurant', 'food', 'establishment'],
        }),
      ]

      const result = transformGooglePlaces(places)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Good Restaurant')
    })

    it('should include cafes', () => {
      const places = [
        createMockPlace({
          id: 'cafe-1',
          displayName: { text: 'Nice Cafe' },
          types: ['cafe', 'food', 'establishment'],
        }),
      ]

      const result = transformGooglePlaces(places)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Nice Cafe')
    })

    it('should include gyms', () => {
      const places = [
        createMockPlace({
          id: 'gym-1',
          displayName: { text: 'Fitness Gym' },
          types: ['gym', 'health', 'establishment'],
        }),
      ]

      const result = transformGooglePlaces(places)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Fitness Gym')
    })

    it('should exclude street addresses', () => {
      const places = [
        createMockPlace({
          id: 'address-1',
          displayName: { text: '123 Main Street' },
          types: ['street_address'],
        }),
      ]

      const result = transformGooglePlaces(places)

      expect(result).toHaveLength(0)
    })

    it('should exclude residential premises', () => {
      const places = [
        createMockPlace({
          id: 'premise-1',
          displayName: { text: 'Residential Building' },
          types: ['premise'],
        }),
      ]

      const result = transformGooglePlaces(places)

      expect(result).toHaveLength(0)
    })

    it('should exclude routes', () => {
      const places = [
        createMockPlace({
          id: 'route-1',
          displayName: { text: 'Main Street' },
          types: ['route'],
        }),
      ]

      const result = transformGooglePlaces(places)

      expect(result).toHaveLength(0)
    })

    it('should exclude neighborhoods', () => {
      const places = [
        createMockPlace({
          id: 'neighborhood-1',
          displayName: { text: 'Downtown' },
          types: ['neighborhood', 'political'],
        }),
      ]

      const result = transformGooglePlaces(places)

      expect(result).toHaveLength(0)
    })

    it('should exclude places with excluded primaryType', () => {
      const places = [
        createMockPlace({
          id: 'mixed-1',
          displayName: { text: 'Some Place' },
          types: ['establishment', 'point_of_interest'],
          primaryType: 'street_address',
        }),
      ]

      const result = transformGooglePlaces(places)

      expect(result).toHaveLength(0)
    })

    it('should filter mixed results correctly', () => {
      const places = [
        createMockPlace({
          id: 'cafe-1',
          displayName: { text: 'Coffee Shop' },
          types: ['cafe', 'food', 'establishment'],
        }),
        createMockPlace({
          id: 'address-1',
          displayName: { text: '123 Residential St' },
          types: ['street_address'],
        }),
        createMockPlace({
          id: 'gym-1',
          displayName: { text: 'Local Gym' },
          types: ['gym', 'health', 'establishment'],
        }),
        createMockPlace({
          id: 'premise-1',
          displayName: { text: 'Apartment Building' },
          types: ['premise'],
        }),
        createMockPlace({
          id: 'bar-1',
          displayName: { text: 'Cool Bar' },
          types: ['bar', 'night_club', 'establishment'],
        }),
      ]

      const result = transformGooglePlaces(places)

      expect(result).toHaveLength(3)
      expect(result.map(p => p.name)).toEqual(['Coffee Shop', 'Local Gym', 'Cool Bar'])
    })
  })

  describe('without establishment filtering', () => {
    it('should include all places when filtering disabled', () => {
      const places = [
        createMockPlace({
          id: 'cafe-1',
          displayName: { text: 'Coffee Shop' },
          types: ['cafe', 'food'],
        }),
        createMockPlace({
          id: 'address-1',
          displayName: { text: '123 Main St' },
          types: ['street_address'],
        }),
      ]

      const result = transformGooglePlaces(places, false)

      expect(result).toHaveLength(2)
    })

    it('should still skip invalid places (missing required fields)', () => {
      const places = [
        createMockPlace({
          id: 'valid-1',
          displayName: { text: 'Valid Place' },
          types: ['establishment'],
        }),
        {
          // Missing id - should be skipped
          displayName: { text: 'Missing ID' },
          types: ['establishment'],
        } as GooglePlace,
        {
          // Missing displayName - should be skipped
          id: 'missing-name',
          types: ['establishment'],
        } as GooglePlace,
      ]

      const result = transformGooglePlaces(places, false)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Valid Place')
    })
  })

  describe('transformation correctness', () => {
    it('should correctly transform place data', () => {
      const places = [
        createMockPlace({
          id: 'place-123',
          displayName: { text: 'Test Restaurant' },
          formattedAddress: '456 Oak Avenue, City, State 12345',
          location: { latitude: 40.7128, longitude: -74.006 },
          types: ['restaurant', 'food', 'establishment'],
        }),
      ]

      const result = transformGooglePlaces(places)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        google_place_id: 'place-123',
        name: 'Test Restaurant',
        address: '456 Oak Avenue, City, State 12345',
        latitude: 40.7128,
        longitude: -74.006,
        place_types: ['restaurant', 'food', 'establishment'],
      })
    })

    it('should handle missing optional fields', () => {
      const places = [
        {
          id: 'minimal-place',
          displayName: { text: 'Minimal Place' },
          types: ['establishment'],
          // No formattedAddress, no location
        } as GooglePlace,
      ]

      const result = transformGooglePlaces(places)

      expect(result).toHaveLength(1)
      expect(result[0].address).toBeNull()
      expect(result[0].latitude).toBe(0)
      expect(result[0].longitude).toBe(0)
    })

    it('should handle empty types array', () => {
      const places = [
        createMockPlace({
          id: 'no-types',
          displayName: { text: 'No Types Place' },
          types: [],
        }),
      ]

      // Empty types means it fails the establishment check
      const result = transformGooglePlaces(places)

      expect(result).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('should handle empty input array', () => {
      const result = transformGooglePlaces([])

      expect(result).toEqual([])
    })

    it('should handle places with undefined types', () => {
      const places = [
        {
          id: 'undefined-types',
          displayName: { text: 'Undefined Types' },
          // types is undefined
        } as GooglePlace,
      ]

      const result = transformGooglePlaces(places)

      // Undefined types should be filtered out
      expect(result).toHaveLength(0)
    })

    it('should preserve order of valid places', () => {
      const places = [
        createMockPlace({
          id: '1',
          displayName: { text: 'First' },
          types: ['restaurant'],
        }),
        createMockPlace({
          id: '2',
          displayName: { text: 'Second' },
          types: ['cafe'],
        }),
        createMockPlace({
          id: '3',
          displayName: { text: 'Third' },
          types: ['bar'],
        }),
      ]

      const result = transformGooglePlaces(places)

      expect(result.map(p => p.name)).toEqual(['First', 'Second', 'Third'])
    })
  })
})
