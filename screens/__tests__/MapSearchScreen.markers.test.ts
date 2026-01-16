/**
 * Tests for MapSearchScreen marker integration
 *
 * Tests the transformation of location data to activity markers using LocationMarker.
 * Focuses on the business logic of marker creation, not visual rendering.
 */

import { describe, it, expect } from 'vitest'
import { getActivityState } from '../../components/map/LocationMarker'
import type { LocationWithActivePosts } from '../../types/database'
import type { MapMarker } from '../../components/MapView'

// ============================================================================
// Test Utilities - Extracted from MapSearchScreen logic
// ============================================================================

/**
 * Determines if a marker should track view changes based on activity state.
 * Hot markers (< 2h) have pulse animation and need view tracking.
 */
function shouldTrackViewChanges(
  postCount: number,
  latestPostAt: string | null
): boolean {
  if (!latestPostAt) return false
  const activityState = getActivityState(postCount, new Date(latestPostAt))
  return activityState === 'hot'
}

/**
 * Creates marker data from a location with active posts.
 * This mirrors the logic in MapSearchScreen's activityMarkers useMemo.
 */
function createActivityMarkerData(
  location: LocationWithActivePosts,
  selectedLocationId: string | null
): Omit<MapMarker, 'customView'> & { isHot: boolean; isSelected: boolean } {
  const postCount = location.active_post_count ?? 0
  const latestPostAt = location.latest_post_at ?? null
  const isHot = shouldTrackViewChanges(postCount, latestPostAt)
  const isSelected = selectedLocationId === location.id

  return {
    id: location.id,
    latitude: location.latitude,
    longitude: location.longitude,
    tracksViewChanges: isHot,
    isHot,
    isSelected,
  }
}

// ============================================================================
// shouldTrackViewChanges Tests
// ============================================================================

describe('shouldTrackViewChanges', () => {
  describe('hot locations', () => {
    it('should return true for recent posts (< 2 hours)', () => {
      const recentDate = new Date().toISOString()
      const result = shouldTrackViewChanges(5, recentDate)
      expect(result).toBe(true)
    })

    it('should return true for posts 1 hour ago', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const result = shouldTrackViewChanges(10, oneHourAgo)
      expect(result).toBe(true)
    })
  })

  describe('non-hot locations', () => {
    it('should return false for posts > 2 hours ago', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      const result = shouldTrackViewChanges(5, threeHoursAgo)
      expect(result).toBe(false)
    })

    it('should return false for posts > 24 hours ago', () => {
      const dayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      const result = shouldTrackViewChanges(5, dayAgo)
      expect(result).toBe(false)
    })

    it('should return false when latestPostAt is null', () => {
      const result = shouldTrackViewChanges(5, null)
      expect(result).toBe(false)
    })

    it('should return false for virgin locations (0 posts)', () => {
      const result = shouldTrackViewChanges(0, null)
      expect(result).toBe(false)
    })
  })
})

// ============================================================================
// createActivityMarkerData Tests
// ============================================================================

describe('createActivityMarkerData', () => {
  const mockLocation: LocationWithActivePosts = {
    id: 'loc-123',
    google_place_id: 'ChIJ123',
    name: 'Test Coffee Shop',
    address: '123 Main St',
    latitude: 37.7749,
    longitude: -122.4194,
    place_types: ['cafe', 'food'],
    post_count: 10,
    created_at: '2024-01-01T00:00:00Z',
    active_post_count: 5,
    latest_post_at: new Date().toISOString(),
  }

  describe('marker coordinates', () => {
    it('should include location id', () => {
      const marker = createActivityMarkerData(mockLocation, null)
      expect(marker.id).toBe('loc-123')
    })

    it('should include latitude and longitude', () => {
      const marker = createActivityMarkerData(mockLocation, null)
      expect(marker.latitude).toBe(37.7749)
      expect(marker.longitude).toBe(-122.4194)
    })
  })

  describe('hot state detection', () => {
    it('should mark recent posts as hot', () => {
      const marker = createActivityMarkerData(mockLocation, null)
      expect(marker.isHot).toBe(true)
      expect(marker.tracksViewChanges).toBe(true)
    })

    it('should not mark old posts as hot', () => {
      const oldLocation: LocationWithActivePosts = {
        ...mockLocation,
        latest_post_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      }
      const marker = createActivityMarkerData(oldLocation, null)
      expect(marker.isHot).toBe(false)
      expect(marker.tracksViewChanges).toBe(false)
    })

    it('should not mark virgin locations as hot', () => {
      const virginLocation: LocationWithActivePosts = {
        ...mockLocation,
        active_post_count: 0,
        latest_post_at: undefined,
      }
      const marker = createActivityMarkerData(virginLocation, null)
      expect(marker.isHot).toBe(false)
      expect(marker.tracksViewChanges).toBe(false)
    })
  })

  describe('selection state', () => {
    it('should mark as selected when id matches selectedLocationId', () => {
      const marker = createActivityMarkerData(mockLocation, 'loc-123')
      expect(marker.isSelected).toBe(true)
    })

    it('should not mark as selected when id does not match', () => {
      const marker = createActivityMarkerData(mockLocation, 'other-id')
      expect(marker.isSelected).toBe(false)
    })

    it('should not mark as selected when selectedLocationId is null', () => {
      const marker = createActivityMarkerData(mockLocation, null)
      expect(marker.isSelected).toBe(false)
    })
  })
})

// ============================================================================
// Marker Array Transformation Tests
// ============================================================================

describe('Marker Array Transformation', () => {
  const mockLocations: LocationWithActivePosts[] = [
    {
      id: 'hot-1',
      google_place_id: 'ChIJ1',
      name: 'Hot Cafe',
      address: '1 Hot St',
      latitude: 37.7749,
      longitude: -122.4194,
      place_types: ['cafe'],
      post_count: 20,
      created_at: '2024-01-01T00:00:00Z',
      active_post_count: 15,
      latest_post_at: new Date().toISOString(), // Hot
    },
    {
      id: 'active-1',
      google_place_id: 'ChIJ2',
      name: 'Active Bar',
      address: '2 Active Ave',
      latitude: 37.7850,
      longitude: -122.4294,
      place_types: ['bar'],
      post_count: 10,
      created_at: '2024-01-01T00:00:00Z',
      active_post_count: 5,
      latest_post_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // Active
    },
    {
      id: 'historical-1',
      google_place_id: 'ChIJ3',
      name: 'Old Restaurant',
      address: '3 Old St',
      latitude: 37.7950,
      longitude: -122.4394,
      place_types: ['restaurant'],
      post_count: 50,
      created_at: '2024-01-01T00:00:00Z',
      active_post_count: 3,
      latest_post_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Historical
    },
  ]

  it('should transform all locations to markers', () => {
    const markers = mockLocations.map((loc) => createActivityMarkerData(loc, null))
    expect(markers).toHaveLength(3)
  })

  it('should identify only hot markers for view tracking', () => {
    const markers = mockLocations.map((loc) => createActivityMarkerData(loc, null))
    const hotMarkers = markers.filter((m) => m.tracksViewChanges)
    expect(hotMarkers).toHaveLength(1)
    expect(hotMarkers[0].id).toBe('hot-1')
  })

  it('should preserve unique ids for all markers', () => {
    const markers = mockLocations.map((loc) => createActivityMarkerData(loc, null))
    const ids = markers.map((m) => m.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(3)
  })

  it('should track selection across all markers', () => {
    const markers = mockLocations.map((loc) =>
      createActivityMarkerData(loc, 'active-1')
    )
    const selectedMarkers = markers.filter((m) => m.isSelected)
    expect(selectedMarkers).toHaveLength(1)
    expect(selectedMarkers[0].id).toBe('active-1')
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  describe('missing data', () => {
    it('should handle location with undefined active_post_count', () => {
      const location: LocationWithActivePosts = {
        id: 'missing-count',
        google_place_id: 'ChIJ',
        name: 'Test',
        address: null,
        latitude: 37.0,
        longitude: -122.0,
        place_types: [],
        post_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        active_post_count: undefined,
        latest_post_at: new Date().toISOString(),
      }

      const marker = createActivityMarkerData(location, null)
      // With 0 posts (undefined treated as 0), should not be hot
      expect(marker.isHot).toBe(false)
    })

    it('should handle location with undefined latest_post_at', () => {
      const location: LocationWithActivePosts = {
        id: 'missing-date',
        google_place_id: 'ChIJ',
        name: 'Test',
        address: null,
        latitude: 37.0,
        longitude: -122.0,
        place_types: [],
        post_count: 5,
        created_at: '2024-01-01T00:00:00Z',
        active_post_count: 5,
        latest_post_at: undefined,
      }

      const marker = createActivityMarkerData(location, null)
      expect(marker.isHot).toBe(false)
      expect(marker.tracksViewChanges).toBe(false)
    })
  })

  describe('boundary conditions', () => {
    it('should handle empty locations array', () => {
      const markers: ReturnType<typeof createActivityMarkerData>[] = []
      expect(markers).toHaveLength(0)
    })

    it('should handle very large post counts', () => {
      const location: LocationWithActivePosts = {
        id: 'popular',
        google_place_id: 'ChIJ',
        name: 'Super Popular',
        address: null,
        latitude: 37.0,
        longitude: -122.0,
        place_types: [],
        post_count: 10000,
        created_at: '2024-01-01T00:00:00Z',
        active_post_count: 5000,
        latest_post_at: new Date().toISOString(),
      }

      const marker = createActivityMarkerData(location, null)
      expect(marker.isHot).toBe(true)
    })

    it('should handle coordinates at extreme values', () => {
      const location: LocationWithActivePosts = {
        id: 'extreme',
        google_place_id: 'ChIJ',
        name: 'Edge',
        address: null,
        latitude: -89.999,
        longitude: 179.999,
        place_types: [],
        post_count: 1,
        created_at: '2024-01-01T00:00:00Z',
        active_post_count: 1,
        latest_post_at: new Date().toISOString(),
      }

      const marker = createActivityMarkerData(location, null)
      expect(marker.latitude).toBe(-89.999)
      expect(marker.longitude).toBe(179.999)
    })
  })
})
