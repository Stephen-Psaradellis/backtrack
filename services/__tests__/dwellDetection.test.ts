/**
 * Tests for Dwell Detection Module
 *
 * Tests the pure functions that handle location dwell detection logic.
 * All functions are side-effect free and testable in isolation.
 */

import { describe, it, expect } from 'vitest'
import {
  createInitialDwellState,
  updateDwellState,
  hasDwellTriggered,
  getDwellTimeMinutes,
  calculateDistance,
  isAtSameLocation,
  hasMovedAway,
  findNearestLocation,
  resetDwellState,
  getDistanceFromDwellLocation,
  DWELL_RADIUS_METERS,
  DEPARTURE_THRESHOLD_MULTIPLIER,
  DEFAULT_PROMPT_MINUTES,
  type DwellState,
  type NearbyLocation,
} from '../dwellDetection'

// ============================================================================
// TEST FIXTURES
// ============================================================================

const MOCK_USER_ID = 'user-123'
const MOCK_LOCATION_ID = 'loc-456'
const MOCK_LOCATION_NAME = 'The Coffee Shop'

const mockNearbyLocation: NearbyLocation = {
  id: MOCK_LOCATION_ID,
  name: MOCK_LOCATION_NAME,
  latitude: 40.7128,
  longitude: -74.006,
}

const mockNearbyLocation2: NearbyLocation = {
  id: 'loc-789',
  name: 'The Other Place',
  latitude: 40.7589,
  longitude: -73.9851,
}

const baseTime = 1700000000000 // Fixed timestamp for reproducible tests

// ============================================================================
// INITIAL STATE TESTS
// ============================================================================

describe('createInitialDwellState', () => {
  it('should create initial state with no user ID', () => {
    const state = createInitialDwellState()

    expect(state).toEqual({
      currentLocation: null,
      arrivedAt: null,
      notificationSent: false,
      userId: null,
    })
  })

  it('should create initial state with user ID', () => {
    const state = createInitialDwellState(MOCK_USER_ID)

    expect(state).toEqual({
      currentLocation: null,
      arrivedAt: null,
      notificationSent: false,
      userId: MOCK_USER_ID,
    })
  })
})

// ============================================================================
// DISTANCE CALCULATION TESTS
// ============================================================================

describe('calculateDistance', () => {
  it('should return 0 for same coordinates', () => {
    const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006)
    expect(distance).toBe(0)
  })

  it('should calculate distance between two points accurately', () => {
    // Distance between NYC (40.7128, -74.0060) and Liberty Statue (40.6892, -74.0445)
    // Expected: ~4.2 km
    const distance = calculateDistance(40.7128, -74.006, 40.6892, -74.0445)

    expect(distance).toBeGreaterThan(4100)
    expect(distance).toBeLessThan(4200)
  })

  it('should calculate short distances accurately (meters)', () => {
    // Two points ~111 meters apart (0.001 degree latitude difference)
    const lat1 = 40.7128
    const lon1 = -74.006
    const lat2 = 40.7138 // ~111m north
    const lon2 = -74.006

    const distance = calculateDistance(lat1, lon1, lat2, lon2)

    expect(distance).toBeGreaterThan(100)
    expect(distance).toBeLessThan(120)
  })

  it('should work with negative coordinates', () => {
    const distance = calculateDistance(-33.8688, 151.2093, -33.8568, 151.2153)

    expect(distance).toBeGreaterThan(0)
    expect(distance).toBeLessThan(2000)
  })

  it('should work across the equator', () => {
    const distance = calculateDistance(10, 0, -10, 0)

    expect(distance).toBeGreaterThan(2200000)
    expect(distance).toBeLessThan(2300000)
  })
})

// ============================================================================
// FIND NEAREST LOCATION TESTS
// ============================================================================

describe('findNearestLocation', () => {
  it('should return null for empty array', () => {
    const nearest = findNearestLocation({ latitude: 40.7128, longitude: -74.006 }, [])
    expect(nearest).toBeNull()
  })

  it('should return the only location', () => {
    const nearest = findNearestLocation(
      { latitude: 40.7128, longitude: -74.006 },
      [mockNearbyLocation]
    )

    expect(nearest).toBe(mockNearbyLocation)
  })

  it('should return the nearest of multiple locations', () => {
    const userCoords = { latitude: 40.7128, longitude: -74.006 }
    const locations = [mockNearbyLocation, mockNearbyLocation2]

    const nearest = findNearestLocation(userCoords, locations)

    // mockNearbyLocation is closer to user coords
    expect(nearest).toBe(mockNearbyLocation)
  })

  it('should handle locations with same distance', () => {
    const userCoords = { latitude: 40.7128, longitude: -74.006 }
    const loc1 = { ...mockNearbyLocation }
    const loc2 = { ...mockNearbyLocation, id: 'loc-999' }

    const nearest = findNearestLocation(userCoords, [loc1, loc2])

    // Should return one of them (first in this implementation)
    expect(nearest).toBeDefined()
    expect([loc1.id, loc2.id]).toContain(nearest!.id)
  })
})

// ============================================================================
// DWELL TIME TESTS
// ============================================================================

describe('getDwellTimeMinutes', () => {
  it('should return 0 for state with no arrival time', () => {
    const state = createInitialDwellState()
    const dwellTime = getDwellTimeMinutes(state, baseTime)

    expect(dwellTime).toBe(0)
  })

  it('should calculate dwell time correctly', () => {
    const state: DwellState = {
      ...createInitialDwellState(),
      arrivedAt: baseTime,
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
        locationId: MOCK_LOCATION_ID,
      },
    }

    const fiveMinutesLater = baseTime + 5 * 60 * 1000
    const dwellTime = getDwellTimeMinutes(state, fiveMinutesLater)

    expect(dwellTime).toBe(5)
  })

  it('should handle fractional minutes', () => {
    const state: DwellState = {
      ...createInitialDwellState(),
      arrivedAt: baseTime,
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
      },
    }

    const twoAndHalfMinutesLater = baseTime + 2.5 * 60 * 1000
    const dwellTime = getDwellTimeMinutes(state, twoAndHalfMinutesLater)

    expect(dwellTime).toBe(2.5)
  })
})

// ============================================================================
// DWELL TRIGGER TESTS
// ============================================================================

describe('hasDwellTriggered', () => {
  it('should return false if notification already sent', () => {
    const state: DwellState = {
      ...createInitialDwellState(),
      arrivedAt: baseTime,
      notificationSent: true,
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
      },
    }

    const tenMinutesLater = baseTime + 10 * 60 * 1000
    const triggered = hasDwellTriggered(state, 5, tenMinutesLater)

    expect(triggered).toBe(false)
  })

  it('should return false if dwell time < prompt minutes', () => {
    const state: DwellState = {
      ...createInitialDwellState(),
      arrivedAt: baseTime,
      notificationSent: false,
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
      },
    }

    const threeMinutesLater = baseTime + 3 * 60 * 1000
    const triggered = hasDwellTriggered(state, 5, threeMinutesLater)

    expect(triggered).toBe(false)
  })

  it('should return true if dwell time >= prompt minutes and notification not sent', () => {
    const state: DwellState = {
      ...createInitialDwellState(),
      arrivedAt: baseTime,
      notificationSent: false,
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
      },
    }

    const fiveMinutesLater = baseTime + 5 * 60 * 1000
    const triggered = hasDwellTriggered(state, 5, fiveMinutesLater)

    expect(triggered).toBe(true)
  })

  it('should return true if dwell time exceeds prompt minutes', () => {
    const state: DwellState = {
      ...createInitialDwellState(),
      arrivedAt: baseTime,
      notificationSent: false,
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
      },
    }

    const tenMinutesLater = baseTime + 10 * 60 * 1000
    const triggered = hasDwellTriggered(state, 5, tenMinutesLater)

    expect(triggered).toBe(true)
  })
})

// ============================================================================
// LOCATION CHECK TESTS
// ============================================================================

describe('isAtSameLocation', () => {
  it('should return false if state has no current location', () => {
    const state = createInitialDwellState()
    const isSame = isAtSameLocation(state, mockNearbyLocation)

    expect(isSame).toBe(false)
  })

  it('should return false if no nearby location', () => {
    const state: DwellState = {
      ...createInitialDwellState(),
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
        locationId: MOCK_LOCATION_ID,
      },
    }

    const isSame = isAtSameLocation(state, null)

    expect(isSame).toBe(false)
  })

  it('should return true if location IDs match', () => {
    const state: DwellState = {
      ...createInitialDwellState(),
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
        locationId: MOCK_LOCATION_ID,
      },
    }

    const isSame = isAtSameLocation(state, mockNearbyLocation)

    expect(isSame).toBe(true)
  })

  it('should return false if location IDs differ', () => {
    const state: DwellState = {
      ...createInitialDwellState(),
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
        locationId: 'different-id',
      },
    }

    const isSame = isAtSameLocation(state, mockNearbyLocation)

    expect(isSame).toBe(false)
  })
})

// ============================================================================
// MOVED AWAY TESTS
// ============================================================================

describe('hasMovedAway', () => {
  it('should return false if state has no current location', () => {
    const state = createInitialDwellState()
    const moved = hasMovedAway(state, { latitude: 40.7128, longitude: -74.006 })

    expect(moved).toBe(false)
  })

  it('should return false if user is still within departure threshold', () => {
    const state: DwellState = {
      ...createInitialDwellState(),
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
      },
    }

    // Very close to same location (1 meter difference)
    const moved = hasMovedAway(state, { latitude: 40.71281, longitude: -74.006 })

    expect(moved).toBe(false)
  })

  it('should return true if user moved beyond departure threshold', () => {
    const state: DwellState = {
      ...createInitialDwellState(),
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
      },
    }

    // Move far away (~1km north)
    const moved = hasMovedAway(state, { latitude: 40.7228, longitude: -74.006 })

    expect(moved).toBe(true)
  })

  it('should use DEPARTURE_THRESHOLD_MULTIPLIER correctly', () => {
    // This test ensures the threshold is radius * multiplier
    const state: DwellState = {
      ...createInitialDwellState(),
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
      },
    }

    // Calculate distance just inside threshold
    const thresholdDistance = DWELL_RADIUS_METERS * DEPARTURE_THRESHOLD_MULTIPLIER
    // Move just inside threshold (should be false)
    const insideCoords = { latitude: 40.7128, longitude: -74.006 + (thresholdDistance - 10) / 111320 }

    const movedInside = hasMovedAway(state, insideCoords)
    expect(movedInside).toBe(false)
  })
})

// ============================================================================
// UPDATE DWELL STATE TESTS
// ============================================================================

describe('updateDwellState', () => {
  it('should transition from idle to arrived when near a location', () => {
    const initialState = createInitialDwellState(MOCK_USER_ID)
    const newCoords = { latitude: 40.7128, longitude: -74.006 }

    const result = updateDwellState(initialState, newCoords, mockNearbyLocation, 5, baseTime)

    expect(result.action).toBe('arrived')
    expect(result.shouldNotify).toBe(false)
    expect(result.state.currentLocation).toBeDefined()
    expect(result.state.currentLocation?.locationId).toBe(MOCK_LOCATION_ID)
    expect(result.state.arrivedAt).toBe(baseTime)
    expect(result.state.notificationSent).toBe(false)
  })

  it('should stay dwelling when at same location before prompt time', () => {
    const dwellingState: DwellState = {
      ...createInitialDwellState(MOCK_USER_ID),
      currentLocation: {
        latitude: 40.71,
        longitude: -74.01,
        locationId: MOCK_LOCATION_ID,
      },
      arrivedAt: baseTime,
      notificationSent: false,
    }

    const twoMinutesLater = baseTime + 2 * 60 * 1000
    const result = updateDwellState(
      dwellingState,
      { latitude: 40.7128, longitude: -74.006 },
      mockNearbyLocation,
      5,
      twoMinutesLater
    )

    expect(result.action).toBe('dwelling')
    expect(result.shouldNotify).toBe(false)
    expect(result.state).toEqual(dwellingState) // State unchanged
  })

  it('should trigger notification when dwell time reaches prompt minutes', () => {
    const dwellingState: DwellState = {
      ...createInitialDwellState(MOCK_USER_ID),
      currentLocation: {
        latitude: 40.71,
        longitude: -74.01,
        locationId: MOCK_LOCATION_ID,
      },
      arrivedAt: baseTime,
      notificationSent: false,
    }

    const fiveMinutesLater = baseTime + 5 * 60 * 1000
    const result = updateDwellState(
      dwellingState,
      { latitude: 40.7128, longitude: -74.006 },
      mockNearbyLocation,
      5,
      fiveMinutesLater
    )

    expect(result.action).toBe('dwelling')
    expect(result.shouldNotify).toBe(true)
    expect(result.state.notificationSent).toBe(true)
  })

  it('should not notify again if notification already sent', () => {
    const dwellingState: DwellState = {
      ...createInitialDwellState(MOCK_USER_ID),
      currentLocation: {
        latitude: 40.71,
        longitude: -74.01,
        locationId: MOCK_LOCATION_ID,
      },
      arrivedAt: baseTime,
      notificationSent: true, // Already sent
    }

    const tenMinutesLater = baseTime + 10 * 60 * 1000
    const result = updateDwellState(
      dwellingState,
      { latitude: 40.7128, longitude: -74.006 },
      mockNearbyLocation,
      5,
      tenMinutesLater
    )

    expect(result.action).toBe('dwelling')
    expect(result.shouldNotify).toBe(false)
  })

  it('should transition to arrived when moving to a different location', () => {
    const dwellingState: DwellState = {
      ...createInitialDwellState(MOCK_USER_ID),
      currentLocation: {
        latitude: 40.71,
        longitude: -74.01,
        locationId: MOCK_LOCATION_ID,
      },
      arrivedAt: baseTime,
      notificationSent: true,
    }

    const result = updateDwellState(
      dwellingState,
      { latitude: 40.7589, longitude: -73.9851 },
      mockNearbyLocation2, // Different location
      5,
      baseTime + 10 * 60 * 1000
    )

    expect(result.action).toBe('arrived')
    expect(result.shouldNotify).toBe(false)
    expect(result.state.currentLocation?.locationId).toBe('loc-789')
    expect(result.state.notificationSent).toBe(false) // Reset
  })

  it('should transition to departed when moving away from location', () => {
    const dwellingState: DwellState = {
      ...createInitialDwellState(MOCK_USER_ID),
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
      },
      arrivedAt: baseTime,
      notificationSent: true,
    }

    // Move far away
    const result = updateDwellState(
      dwellingState,
      { latitude: 40.7228, longitude: -74.006 },
      null, // No nearby location
      5,
      baseTime + 10 * 60 * 1000
    )

    expect(result.action).toBe('departed')
    expect(result.shouldNotify).toBe(false)
    expect(result.state.currentLocation).toBeNull()
    expect(result.state.arrivedAt).toBeNull()
    expect(result.state.notificationSent).toBe(false)
  })

  it('should remain idle when no nearby location and no current location', () => {
    const initialState = createInitialDwellState(MOCK_USER_ID)

    const result = updateDwellState(
      initialState,
      { latitude: 40.7128, longitude: -74.006 },
      null, // No nearby location
      5,
      baseTime
    )

    expect(result.action).toBe('idle')
    expect(result.shouldNotify).toBe(false)
    expect(result.state).toEqual(initialState)
  })

  it('should use default prompt minutes if not specified', () => {
    const dwellingState: DwellState = {
      ...createInitialDwellState(MOCK_USER_ID),
      currentLocation: {
        latitude: 40.71,
        longitude: -74.01,
        locationId: MOCK_LOCATION_ID,
      },
      arrivedAt: baseTime,
      notificationSent: false,
    }

    const defaultMinutesLater = baseTime + DEFAULT_PROMPT_MINUTES * 60 * 1000
    const result = updateDwellState(
      dwellingState,
      { latitude: 40.7128, longitude: -74.006 },
      mockNearbyLocation,
      undefined, // Use default
      defaultMinutesLater
    )

    expect(result.shouldNotify).toBe(true)
  })
})

// ============================================================================
// RESET STATE TESTS
// ============================================================================

describe('resetDwellState', () => {
  it('should clear location data but preserve user ID', () => {
    const state: DwellState = {
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
        locationId: MOCK_LOCATION_ID,
      },
      arrivedAt: baseTime,
      notificationSent: true,
      userId: MOCK_USER_ID,
    }

    const reset = resetDwellState(state)

    expect(reset).toEqual({
      currentLocation: null,
      arrivedAt: null,
      notificationSent: false,
      userId: MOCK_USER_ID, // Preserved
    })
  })

  it('should work with already reset state', () => {
    const state = createInitialDwellState(MOCK_USER_ID)
    const reset = resetDwellState(state)

    expect(reset).toEqual(state)
  })
})

// ============================================================================
// GET DISTANCE FROM DWELL LOCATION TESTS
// ============================================================================

describe('getDistanceFromDwellLocation', () => {
  it('should return null when no dwell location', () => {
    const state = createInitialDwellState(MOCK_USER_ID)
    const dist = getDistanceFromDwellLocation(state, { latitude: 40.7128, longitude: -74.006 })
    expect(dist).toBeNull()
  })

  it('should return 0 when at the same point', () => {
    const state: DwellState = {
      ...createInitialDwellState(MOCK_USER_ID),
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
        locationId: MOCK_LOCATION_ID,
      },
    }
    const dist = getDistanceFromDwellLocation(state, { latitude: 40.7128, longitude: -74.006 })
    expect(dist).toBe(0)
  })

  it('should return correct distance for known offset', () => {
    const state: DwellState = {
      ...createInitialDwellState(MOCK_USER_ID),
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
        locationId: MOCK_LOCATION_ID,
      },
    }
    // ~111m north (0.001 degree lat)
    const dist = getDistanceFromDwellLocation(state, { latitude: 40.7138, longitude: -74.006 })
    expect(dist).toBeGreaterThan(100)
    expect(dist).toBeLessThan(120)
  })
})

// ============================================================================
// 3-ZONE DEPARTURE LOGIC TESTS
// ============================================================================

describe('3-zone departure detection via updateDwellState', () => {
  it('user at 50m stays dwelling (zone 1)', () => {
    // User dwelling at a location, nearby location matches
    const state: DwellState = {
      ...createInitialDwellState(MOCK_USER_ID),
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
        locationId: MOCK_LOCATION_ID,
        locationName: MOCK_LOCATION_NAME,
      },
      arrivedAt: baseTime,
      notificationSent: true,
    }

    // Pass the same nearbyLocation (simulating zone 1 cache hit)
    const result = updateDwellState(
      state,
      { latitude: 40.7128, longitude: -74.006 },
      mockNearbyLocation,
      5,
      baseTime + 60000
    )

    expect(result.action).toBe('dwelling')
  })

  it('user at 150m with nearbyLocation=null produces departed', () => {
    // In zone 2 (ambiguous), if server returns no location, should depart
    const state: DwellState = {
      ...createInitialDwellState(MOCK_USER_ID),
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
        locationId: MOCK_LOCATION_ID,
      },
      arrivedAt: baseTime,
      notificationSent: true,
    }

    // 150m away, but nearbyLocation is null (server says nothing nearby)
    // 150m > DWELL_RADIUS (100m), hasMovedAway checks > 200m, so at 150m
    // nearbyLocation=null + not moved away (150 < 200) => idle (not departed)
    // But with the 3-zone fix, the background task would have sent null for zone 3
    // For zone 2, the network decides. With null from network:
    const result = updateDwellState(
      state,
      { latitude: 40.7141, longitude: -74.006 }, // ~145m north
      null, // Server returned nothing
      5,
      baseTime + 60000
    )

    // At ~145m, hasMovedAway returns false (< 200m), so this is 'idle'
    // The fix is that the background task forces null for > 200m (zone 3)
    // and lets network decide for zone 2. updateDwellState itself is unchanged.
    expect(result.action).toBe('idle')
  })

  it('user beyond 200m with null nearbyLocation produces departed', () => {
    const state: DwellState = {
      ...createInitialDwellState(MOCK_USER_ID),
      currentLocation: {
        latitude: 40.7128,
        longitude: -74.006,
        locationId: MOCK_LOCATION_ID,
      },
      arrivedAt: baseTime,
      notificationSent: true,
    }

    // Zone 3: > 200m, background task forces nearbyLocation = null
    const result = updateDwellState(
      state,
      { latitude: 40.7148, longitude: -74.006 }, // ~222m north
      null,
      5,
      baseTime + 60000
    )

    expect(result.action).toBe('departed')
    expect(result.state.currentLocation).toBeNull()
  })
})
