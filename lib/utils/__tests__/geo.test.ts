/**
 * Tests for lib/utils/geo.ts
 *
 * Tests geospatial utility functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  isValidLatitude,
  isValidLongitude,
  isValidCoordinates,
  isValidRadius,
  GeoError,
  DEFAULT_RADIUS_METERS,
  DEFAULT_MAX_RESULTS,
  DEFAULT_MIN_POST_COUNT,
  LATITUDE_RANGE,
  LONGITUDE_RANGE,
  PROXIMITY_RADIUS_METERS,
  EARTH_RADIUS_METERS,
} from '../geo'

describe('geo constants', () => {
  it('should have DEFAULT_RADIUS_METERS set to 5000', () => {
    expect(DEFAULT_RADIUS_METERS).toBe(5000)
  })

  it('should have DEFAULT_MAX_RESULTS set to 50', () => {
    expect(DEFAULT_MAX_RESULTS).toBe(50)
  })

  it('should have DEFAULT_MIN_POST_COUNT set to 1', () => {
    expect(DEFAULT_MIN_POST_COUNT).toBe(1)
  })

  it('should have correct LATITUDE_RANGE', () => {
    expect(LATITUDE_RANGE.min).toBe(-90)
    expect(LATITUDE_RANGE.max).toBe(90)
  })

  it('should have correct LONGITUDE_RANGE', () => {
    expect(LONGITUDE_RANGE.min).toBe(-180)
    expect(LONGITUDE_RANGE.max).toBe(180)
  })

  it('should have PROXIMITY_RADIUS_METERS set to 50', () => {
    expect(PROXIMITY_RADIUS_METERS).toBe(50)
  })

  it('should have EARTH_RADIUS_METERS set correctly', () => {
    expect(EARTH_RADIUS_METERS).toBe(6_371_000)
  })
})

describe('isValidLatitude', () => {
  it('should return true for valid latitudes', () => {
    expect(isValidLatitude(0)).toBe(true)
    expect(isValidLatitude(45)).toBe(true)
    expect(isValidLatitude(-45)).toBe(true)
    expect(isValidLatitude(90)).toBe(true)
    expect(isValidLatitude(-90)).toBe(true)
    expect(isValidLatitude(37.7749)).toBe(true)
    expect(isValidLatitude(-33.8688)).toBe(true)
  })

  it('should return false for invalid latitudes', () => {
    expect(isValidLatitude(91)).toBe(false)
    expect(isValidLatitude(-91)).toBe(false)
    expect(isValidLatitude(180)).toBe(false)
    expect(isValidLatitude(-180)).toBe(false)
    expect(isValidLatitude(NaN)).toBe(false)
    expect(isValidLatitude(Infinity)).toBe(false)
    expect(isValidLatitude(-Infinity)).toBe(false)
  })

  it('should return false for non-numbers', () => {
    expect(isValidLatitude('45' as unknown as number)).toBe(false)
    expect(isValidLatitude(null as unknown as number)).toBe(false)
    expect(isValidLatitude(undefined as unknown as number)).toBe(false)
  })
})

describe('isValidLongitude', () => {
  it('should return true for valid longitudes', () => {
    expect(isValidLongitude(0)).toBe(true)
    expect(isValidLongitude(90)).toBe(true)
    expect(isValidLongitude(-90)).toBe(true)
    expect(isValidLongitude(180)).toBe(true)
    expect(isValidLongitude(-180)).toBe(true)
    expect(isValidLongitude(-122.4194)).toBe(true)
    expect(isValidLongitude(151.2093)).toBe(true)
  })

  it('should return false for invalid longitudes', () => {
    expect(isValidLongitude(181)).toBe(false)
    expect(isValidLongitude(-181)).toBe(false)
    expect(isValidLongitude(360)).toBe(false)
    expect(isValidLongitude(NaN)).toBe(false)
    expect(isValidLongitude(Infinity)).toBe(false)
    expect(isValidLongitude(-Infinity)).toBe(false)
  })

  it('should return false for non-numbers', () => {
    expect(isValidLongitude('-122' as unknown as number)).toBe(false)
    expect(isValidLongitude(null as unknown as number)).toBe(false)
    expect(isValidLongitude(undefined as unknown as number)).toBe(false)
  })
})

describe('isValidCoordinates', () => {
  it('should return true for valid coordinates', () => {
    expect(isValidCoordinates({ latitude: 37.7749, longitude: -122.4194 })).toBe(true)
    expect(isValidCoordinates({ latitude: 0, longitude: 0 })).toBe(true)
    expect(isValidCoordinates({ latitude: 90, longitude: 180 })).toBe(true)
    expect(isValidCoordinates({ latitude: -90, longitude: -180 })).toBe(true)
    expect(isValidCoordinates({ latitude: 51.5074, longitude: -0.1278 })).toBe(true)
  })

  it('should return false for invalid latitude', () => {
    expect(isValidCoordinates({ latitude: 91, longitude: -122.4194 })).toBe(false)
    expect(isValidCoordinates({ latitude: -91, longitude: -122.4194 })).toBe(false)
    expect(isValidCoordinates({ latitude: NaN, longitude: -122.4194 })).toBe(false)
  })

  it('should return false for invalid longitude', () => {
    expect(isValidCoordinates({ latitude: 37.7749, longitude: 181 })).toBe(false)
    expect(isValidCoordinates({ latitude: 37.7749, longitude: -181 })).toBe(false)
    expect(isValidCoordinates({ latitude: 37.7749, longitude: NaN })).toBe(false)
  })

  it('should return false when both are invalid', () => {
    expect(isValidCoordinates({ latitude: 91, longitude: 181 })).toBe(false)
    expect(isValidCoordinates({ latitude: NaN, longitude: NaN })).toBe(false)
  })
})

describe('isValidRadius', () => {
  it('should return true for valid radii', () => {
    expect(isValidRadius(1)).toBe(true)
    expect(isValidRadius(100)).toBe(true)
    expect(isValidRadius(5000)).toBe(true)
    expect(isValidRadius(10000000)).toBe(true)
    expect(isValidRadius(0.5)).toBe(true)
  })

  it('should return false for zero', () => {
    expect(isValidRadius(0)).toBe(false)
  })

  it('should return false for negative values', () => {
    expect(isValidRadius(-1)).toBe(false)
    expect(isValidRadius(-100)).toBe(false)
    expect(isValidRadius(-5000)).toBe(false)
  })

  it('should return false for NaN', () => {
    expect(isValidRadius(NaN)).toBe(false)
  })

  it('should return false for Infinity', () => {
    expect(isValidRadius(Infinity)).toBe(false)
    expect(isValidRadius(-Infinity)).toBe(false)
  })

  it('should return false for non-numbers', () => {
    expect(isValidRadius('5000' as unknown as number)).toBe(false)
    expect(isValidRadius(null as unknown as number)).toBe(false)
    expect(isValidRadius(undefined as unknown as number)).toBe(false)
  })
})

describe('GeoError', () => {
  it('should create error with code and message', () => {
    const error = new GeoError('INVALID_COORDINATES', 'Latitude out of range')

    expect(error.code).toBe('INVALID_COORDINATES')
    expect(error.message).toBe('Latitude out of range')
    expect(error.name).toBe('GeoError')
  })

  it('should create error with details', () => {
    const details = { latitude: 95 }
    const error = new GeoError('INVALID_COORDINATES', 'Bad latitude', details)

    expect(error.details).toEqual(details)
  })

  it('should be instanceof Error', () => {
    const error = new GeoError('DATABASE_ERROR', 'Query failed')

    expect(error instanceof Error).toBe(true)
    expect(error instanceof GeoError).toBe(true)
  })

  it('should work with all error codes', () => {
    const codes: Array<'INVALID_COORDINATES' | 'INVALID_RADIUS' | 'DATABASE_ERROR' | 'NETWORK_ERROR'> = [
      'INVALID_COORDINATES',
      'INVALID_RADIUS',
      'DATABASE_ERROR',
      'NETWORK_ERROR',
    ]

    codes.forEach((code) => {
      const error = new GeoError(code, `Error: ${code}`)
      expect(error.code).toBe(code)
    })
  })

  it('should have correct prototype chain', () => {
    const error = new GeoError('NETWORK_ERROR', 'Connection failed')

    expect(Object.getPrototypeOf(error)).toBe(GeoError.prototype)
  })
})

// Import additional functions to test
import {
  kmToMeters,
  metersToKm,
  formatDistance,
  calculateDistance,
  isWithinRadius,
  formatVisitedAgo,
  fetchNearbyLocations,
  fetchLocationsWithActivePosts,
  recordLocationVisit,
  fetchRecentlyVisitedLocations,
} from '../geo'

describe('kmToMeters', () => {
  it('should convert kilometers to meters', () => {
    expect(kmToMeters(1)).toBe(1000)
    expect(kmToMeters(5)).toBe(5000)
    expect(kmToMeters(10)).toBe(10000)
    expect(kmToMeters(0.5)).toBe(500)
    expect(kmToMeters(0)).toBe(0)
  })

  it('should handle fractional values', () => {
    expect(kmToMeters(2.5)).toBe(2500)
    expect(kmToMeters(0.1)).toBe(100)
    expect(kmToMeters(0.001)).toBe(1)
  })
})

describe('metersToKm', () => {
  it('should convert meters to kilometers', () => {
    expect(metersToKm(1000)).toBe(1)
    expect(metersToKm(5000)).toBe(5)
    expect(metersToKm(500)).toBe(0.5)
    expect(metersToKm(0)).toBe(0)
  })

  it('should handle fractional values', () => {
    expect(metersToKm(2500)).toBe(2.5)
    expect(metersToKm(100)).toBe(0.1)
    expect(metersToKm(1)).toBe(0.001)
  })
})

describe('formatDistance', () => {
  it('should format distances under 1000m with meters', () => {
    expect(formatDistance(0)).toBe('0m')
    expect(formatDistance(100)).toBe('100m')
    expect(formatDistance(500)).toBe('500m')
    expect(formatDistance(999)).toBe('999m')
  })

  it('should round meters to whole numbers', () => {
    expect(formatDistance(150.4)).toBe('150m')
    expect(formatDistance(150.6)).toBe('151m')
    expect(formatDistance(99.5)).toBe('100m')
  })

  it('should format distances >= 1000m with km', () => {
    expect(formatDistance(1000)).toBe('1.0km')
    expect(formatDistance(2500)).toBe('2.5km')
    expect(formatDistance(10000)).toBe('10.0km')
  })

  it('should show one decimal place for km', () => {
    expect(formatDistance(1234)).toBe('1.2km')
    expect(formatDistance(10750)).toBe('10.8km')
    expect(formatDistance(15678)).toBe('15.7km')
  })
})

describe('calculateDistance', () => {
  it('should calculate distance between two points', () => {
    const sf = { latitude: 37.7749, longitude: -122.4194 }
    const la = { latitude: 34.0522, longitude: -118.2437 }

    // SF to LA is approximately 559km
    const distance = calculateDistance(sf, la)
    expect(distance).toBeGreaterThan(550000)
    expect(distance).toBeLessThan(570000)
  })

  it('should return 0 for same coordinates', () => {
    const point = { latitude: 37.7749, longitude: -122.4194 }
    expect(calculateDistance(point, point)).toBe(0)
  })

  it('should calculate short distances accurately', () => {
    const point1 = { latitude: 37.7749, longitude: -122.4194 }
    // Approximately 111 meters per degree of latitude at this location
    const point2 = { latitude: 37.7759, longitude: -122.4194 }

    const distance = calculateDistance(point1, point2)
    expect(distance).toBeGreaterThan(100)
    expect(distance).toBeLessThan(150)
  })

  it('should throw for invalid first coordinates', () => {
    const valid = { latitude: 37.7749, longitude: -122.4194 }
    const invalid = { latitude: 91, longitude: -122.4194 }

    expect(() => calculateDistance(invalid, valid)).toThrow(GeoError)
    expect(() => calculateDistance(invalid, valid)).toThrow(/Invalid latitude/)
  })

  it('should throw for invalid second coordinates', () => {
    const valid = { latitude: 37.7749, longitude: -122.4194 }
    const invalid = { latitude: 37.7749, longitude: 181 }

    expect(() => calculateDistance(valid, invalid)).toThrow(GeoError)
    expect(() => calculateDistance(valid, invalid)).toThrow(/Invalid longitude/)
  })

  it('should handle antipodal points', () => {
    // North pole to south pole should be approximately half Earth circumference
    const northPole = { latitude: 90, longitude: 0 }
    const southPole = { latitude: -90, longitude: 0 }

    const distance = calculateDistance(northPole, southPole)
    // Should be approximately 20,000 km (half circumference)
    expect(distance).toBeGreaterThan(19_000_000)
    expect(distance).toBeLessThan(21_000_000)
  })

  it('should handle equatorial points', () => {
    const point1 = { latitude: 0, longitude: 0 }
    const point2 = { latitude: 0, longitude: 1 }

    // 1 degree at equator is approximately 111km
    const distance = calculateDistance(point1, point2)
    expect(distance).toBeGreaterThan(110_000)
    expect(distance).toBeLessThan(112_000)
  })
})

describe('isWithinRadius', () => {
  const userLocation = { latitude: 37.7749, longitude: -122.4194 }

  it('should return true when within default radius (50m)', () => {
    // Point approximately 10m away
    const nearbyPoint = { latitude: 37.77495, longitude: -122.4194 }
    expect(isWithinRadius(userLocation, nearbyPoint)).toBe(true)
  })

  it('should return false when outside default radius', () => {
    // Point approximately 100m away
    const farPoint = { latitude: 37.7759, longitude: -122.4194 }
    expect(isWithinRadius(userLocation, farPoint)).toBe(false)
  })

  it('should respect custom radius', () => {
    // Point approximately 100m away
    const point = { latitude: 37.7759, longitude: -122.4194 }

    expect(isWithinRadius(userLocation, point, 50)).toBe(false)
    expect(isWithinRadius(userLocation, point, 200)).toBe(true)
  })

  it('should return true for same location', () => {
    expect(isWithinRadius(userLocation, userLocation)).toBe(true)
  })

  it('should throw for invalid coordinates', () => {
    const invalidPoint = { latitude: 91, longitude: -122.4194 }
    expect(() => isWithinRadius(userLocation, invalidPoint)).toThrow(GeoError)
  })

  it('should throw for invalid radius', () => {
    const validPoint = { latitude: 37.7750, longitude: -122.4194 }
    expect(() => isWithinRadius(userLocation, validPoint, 0)).toThrow(GeoError)
    expect(() => isWithinRadius(userLocation, validPoint, -50)).toThrow(GeoError)
  })
})

describe('formatVisitedAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-08T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return "Visited just now" for less than 1 minute', () => {
    const now = new Date()
    expect(formatVisitedAgo(now)).toBe('Visited just now')

    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000)
    expect(formatVisitedAgo(thirtySecondsAgo)).toBe('Visited just now')
  })

  it('should return minutes for 1-59 minutes', () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
    expect(formatVisitedAgo(oneMinuteAgo)).toBe('Visited 1 min ago')

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    expect(formatVisitedAgo(thirtyMinutesAgo)).toBe('Visited 30 min ago')

    const fiftyNineMinutesAgo = new Date(Date.now() - 59 * 60 * 1000)
    expect(formatVisitedAgo(fiftyNineMinutesAgo)).toBe('Visited 59 min ago')
  })

  it('should return hours for 60+ minutes', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    expect(formatVisitedAgo(oneHourAgo)).toBe('Visited 1 hr ago')

    const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000)
    expect(formatVisitedAgo(twoHoursAgo)).toBe('Visited 2 hr ago')

    const threeHoursAgo = new Date(Date.now() - 180 * 60 * 1000)
    expect(formatVisitedAgo(threeHoursAgo)).toBe('Visited 3 hr ago')
  })

  it('should round hours correctly', () => {
    // 89 minutes = 1.48 hr = rounds to 1 hr
    const eightyNineMinutesAgo = new Date(Date.now() - 89 * 60 * 1000)
    expect(formatVisitedAgo(eightyNineMinutesAgo)).toBe('Visited 1 hr ago')

    // 90 minutes = 1.5 hr = rounds to 2 hr
    const ninetyMinutesAgo = new Date(Date.now() - 90 * 60 * 1000)
    expect(formatVisitedAgo(ninetyMinutesAgo)).toBe('Visited 2 hr ago')
  })

  it('should accept ISO string timestamps', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    expect(formatVisitedAgo(oneHourAgo.toISOString())).toBe('Visited 1 hr ago')
  })
})

// Mock Supabase client for RPC functions
const mockRpc = vi.fn()
const mockSupabase = {
  rpc: mockRpc,
} as unknown as Parameters<typeof fetchNearbyLocations>[0]

describe('fetchNearbyLocations', () => {
  beforeEach(() => {
    mockRpc.mockReset()
  })

  it('should call RPC with correct parameters', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    await fetchNearbyLocations(mockSupabase, {
      user_lat: 37.7749,
      user_lon: -122.4194,
      radius_meters: 5000,
      max_results: 50,
    })

    expect(mockRpc).toHaveBeenCalledWith('get_nearby_locations', {
      user_lat: 37.7749,
      user_lon: -122.4194,
      radius_meters: 5000,
      max_results: 50,
    })
  })

  it('should use default values when not provided', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    await fetchNearbyLocations(mockSupabase, {
      user_lat: 37.7749,
      user_lon: -122.4194,
    })

    expect(mockRpc).toHaveBeenCalledWith('get_nearby_locations', {
      user_lat: 37.7749,
      user_lon: -122.4194,
      radius_meters: DEFAULT_RADIUS_METERS,
      max_results: DEFAULT_MAX_RESULTS,
    })
  })

  it('should return location data', async () => {
    const mockLocations = [
      { id: '1', name: 'Location 1', distance_meters: 100 },
      { id: '2', name: 'Location 2', distance_meters: 500 },
    ]
    mockRpc.mockResolvedValue({ data: mockLocations, error: null })

    const result = await fetchNearbyLocations(mockSupabase, {
      user_lat: 37.7749,
      user_lon: -122.4194,
    })

    expect(result).toEqual(mockLocations)
  })

  it('should return empty array when no data', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    const result = await fetchNearbyLocations(mockSupabase, {
      user_lat: 37.7749,
      user_lon: -122.4194,
    })

    expect(result).toEqual([])
  })

  it('should throw GeoError for invalid latitude', async () => {
    await expect(
      fetchNearbyLocations(mockSupabase, {
        user_lat: 91,
        user_lon: -122.4194,
      })
    ).rejects.toThrow(GeoError)
  })

  it('should throw GeoError for invalid longitude', async () => {
    await expect(
      fetchNearbyLocations(mockSupabase, {
        user_lat: 37.7749,
        user_lon: 181,
      })
    ).rejects.toThrow(GeoError)
  })

  it('should throw GeoError for invalid radius', async () => {
    await expect(
      fetchNearbyLocations(mockSupabase, {
        user_lat: 37.7749,
        user_lon: -122.4194,
        radius_meters: -100,
      })
    ).rejects.toThrow(GeoError)
  })

  it('should throw GeoError for database errors', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    })

    try {
      await fetchNearbyLocations(mockSupabase, {
        user_lat: 37.7749,
        user_lon: -122.4194,
      })
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect((error as GeoError).code).toBe('DATABASE_ERROR')
      expect((error as GeoError).message).toContain('Database connection failed')
    }
  })
})

describe('fetchLocationsWithActivePosts', () => {
  beforeEach(() => {
    mockRpc.mockReset()
  })

  it('should call RPC with correct parameters', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    await fetchLocationsWithActivePosts(mockSupabase, {
      user_lat: 37.7749,
      user_lon: -122.4194,
      radius_meters: 5000,
      min_post_count: 1,
      max_results: 50,
    })

    expect(mockRpc).toHaveBeenCalledWith('get_locations_with_active_posts', {
      user_lat: 37.7749,
      user_lon: -122.4194,
      radius_meters: 5000,
      min_post_count: 1,
      max_results: 50,
    })
  })

  it('should use default values when not provided', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    await fetchLocationsWithActivePosts(mockSupabase, {
      user_lat: 37.7749,
      user_lon: -122.4194,
    })

    expect(mockRpc).toHaveBeenCalledWith('get_locations_with_active_posts', {
      user_lat: 37.7749,
      user_lon: -122.4194,
      radius_meters: DEFAULT_RADIUS_METERS,
      min_post_count: DEFAULT_MIN_POST_COUNT,
      max_results: DEFAULT_MAX_RESULTS,
    })
  })

  it('should return location data with post counts', async () => {
    const mockLocations = [
      { id: '1', name: 'Location 1', distance_meters: 100, active_post_count: 5 },
      { id: '2', name: 'Location 2', distance_meters: 500, active_post_count: 2 },
    ]
    mockRpc.mockResolvedValue({ data: mockLocations, error: null })

    const result = await fetchLocationsWithActivePosts(mockSupabase, {
      user_lat: 37.7749,
      user_lon: -122.4194,
    })

    expect(result).toEqual(mockLocations)
  })

  it('should return empty array when no data', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    const result = await fetchLocationsWithActivePosts(mockSupabase, {
      user_lat: 37.7749,
      user_lon: -122.4194,
    })

    expect(result).toEqual([])
  })

  it('should throw GeoError for invalid coordinates', async () => {
    await expect(
      fetchLocationsWithActivePosts(mockSupabase, {
        user_lat: 91,
        user_lon: -122.4194,
      })
    ).rejects.toThrow(GeoError)
  })

  it('should throw GeoError for database errors', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'RPC failed' },
    })

    try {
      await fetchLocationsWithActivePosts(mockSupabase, {
        user_lat: 37.7749,
        user_lon: -122.4194,
      })
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect((error as GeoError).code).toBe('DATABASE_ERROR')
    }
  })
})

describe('recordLocationVisit', () => {
  beforeEach(() => {
    mockRpc.mockReset()
  })

  it('should call RPC with correct parameters', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    await recordLocationVisit(mockSupabase, {
      location_id: 'location-123',
      user_lat: 37.7749,
      user_lon: -122.4194,
      accuracy: 10,
    })

    expect(mockRpc).toHaveBeenCalledWith('record_location_visit', {
      p_location_id: 'location-123',
      p_user_lat: 37.7749,
      p_user_lon: -122.4194,
      p_accuracy: 10,
    })
  })

  it('should handle missing accuracy', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    await recordLocationVisit(mockSupabase, {
      location_id: 'location-123',
      user_lat: 37.7749,
      user_lon: -122.4194,
    })

    expect(mockRpc).toHaveBeenCalledWith('record_location_visit', {
      p_location_id: 'location-123',
      p_user_lat: 37.7749,
      p_user_lon: -122.4194,
      p_accuracy: null,
    })
  })

  it('should return visit data when successful', async () => {
    const mockVisit = {
      id: 'visit-123',
      location_id: 'location-123',
      user_id: 'user-123',
      visited_at: '2025-01-08T12:00:00.000Z',
    }
    mockRpc.mockResolvedValue({ data: mockVisit, error: null })

    const result = await recordLocationVisit(mockSupabase, {
      location_id: 'location-123',
      user_lat: 37.7749,
      user_lon: -122.4194,
    })

    expect(result).toEqual(mockVisit)
  })

  it('should return null when user is not within proximity', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    const result = await recordLocationVisit(mockSupabase, {
      location_id: 'location-123',
      user_lat: 37.7749,
      user_lon: -122.4194,
    })

    expect(result).toBeNull()
  })

  it('should throw GeoError for invalid coordinates', async () => {
    await expect(
      recordLocationVisit(mockSupabase, {
        location_id: 'location-123',
        user_lat: 91,
        user_lon: -122.4194,
      })
    ).rejects.toThrow(GeoError)
  })

  it('should throw GeoError for database errors', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Visit recording failed' },
    })

    try {
      await recordLocationVisit(mockSupabase, {
        location_id: 'location-123',
        user_lat: 37.7749,
        user_lon: -122.4194,
      })
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect((error as GeoError).code).toBe('DATABASE_ERROR')
      expect((error as GeoError).message).toContain('Visit recording failed')
    }
  })
})

describe('fetchRecentlyVisitedLocations', () => {
  beforeEach(() => {
    mockRpc.mockReset()
  })

  it('should call RPC with default parameters', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    await fetchRecentlyVisitedLocations(mockSupabase)

    expect(mockRpc).toHaveBeenCalledWith('get_recently_visited_locations', {
      max_results: null,
    })
  })

  it('should call RPC with custom max_results', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    await fetchRecentlyVisitedLocations(mockSupabase, { max_results: 10 })

    expect(mockRpc).toHaveBeenCalledWith('get_recently_visited_locations', {
      max_results: 10,
    })
  })

  it('should return locations with visit timestamps', async () => {
    const mockLocations = [
      { id: '1', name: 'Location 1', visited_at: '2025-01-08T11:00:00.000Z' },
      { id: '2', name: 'Location 2', visited_at: '2025-01-08T10:00:00.000Z' },
    ]
    mockRpc.mockResolvedValue({ data: mockLocations, error: null })

    const result = await fetchRecentlyVisitedLocations(mockSupabase)

    expect(result).toEqual(mockLocations)
  })

  it('should return empty array when no data', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    const result = await fetchRecentlyVisitedLocations(mockSupabase)

    expect(result).toEqual([])
  })

  it('should throw GeoError for database errors', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch' },
    })

    try {
      await fetchRecentlyVisitedLocations(mockSupabase)
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect((error as GeoError).code).toBe('DATABASE_ERROR')
    }
  })
})
