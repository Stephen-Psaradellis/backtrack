/**
 * Tests for MapView custom marker support
 *
 * Tests the extended MapMarker interface with customView and tracksViewChanges props.
 * These tests verify the data flow and configuration, not visual rendering
 * (react-native-maps is mocked in test environment).
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { View, Text } from 'react-native'
import { MapView, createMarker, type MapMarker } from '../MapView'

// ============================================================================
// Custom Marker Interface Tests
// ============================================================================

describe('MapMarker Interface', () => {
  describe('customView property', () => {
    it('should support markers with customView React element', () => {
      const markers: MapMarker[] = [
        {
          id: 'custom-1',
          latitude: 37.7749,
          longitude: -122.4194,
          customView: <View testID="custom-marker"><Text>Custom</Text></View>,
        },
      ]

      // Verify the marker structure is valid
      expect(markers[0].customView).toBeTruthy()
      expect(markers[0].id).toBe('custom-1')
      expect(markers[0].latitude).toBe(37.7749)
      expect(markers[0].longitude).toBe(-122.4194)
    })

    it('should support markers without customView (default pins)', () => {
      const markers: MapMarker[] = [
        {
          id: 'default-1',
          latitude: 37.7749,
          longitude: -122.4194,
          title: 'Default Pin',
          pinColor: '#FF0000',
        },
      ]

      // Verify the marker structure is valid
      expect(markers[0].customView).toBeUndefined()
      expect(markers[0].title).toBe('Default Pin')
      expect(markers[0].pinColor).toBe('#FF0000')
    })

    it('should support mixed markers (some custom, some default)', () => {
      const markers: MapMarker[] = [
        {
          id: 'custom-1',
          latitude: 37.7749,
          longitude: -122.4194,
          customView: <View><Text>Custom</Text></View>,
        },
        {
          id: 'default-1',
          latitude: 37.7850,
          longitude: -122.4294,
          title: 'Default',
          pinColor: '#00FF00',
        },
      ]

      expect(markers[0].customView).toBeTruthy()
      expect(markers[0].title).toBeUndefined()

      expect(markers[1].customView).toBeUndefined()
      expect(markers[1].title).toBe('Default')
    })
  })

  describe('tracksViewChanges property', () => {
    it('should support tracksViewChanges=true for animated markers', () => {
      const markers: MapMarker[] = [
        {
          id: 'animated-1',
          latitude: 37.7749,
          longitude: -122.4194,
          customView: <View><Text>Animated</Text></View>,
          tracksViewChanges: true,
        },
      ]

      expect(markers[0].tracksViewChanges).toBe(true)
    })

    it('should support tracksViewChanges=false for static markers', () => {
      const markers: MapMarker[] = [
        {
          id: 'static-1',
          latitude: 37.7749,
          longitude: -122.4194,
          customView: <View><Text>Static</Text></View>,
          tracksViewChanges: false,
        },
      ]

      expect(markers[0].tracksViewChanges).toBe(false)
    })

    it('should default tracksViewChanges to undefined when not specified', () => {
      const markers: MapMarker[] = [
        {
          id: 'default-1',
          latitude: 37.7749,
          longitude: -122.4194,
          customView: <View><Text>Default</Text></View>,
        },
      ]

      expect(markers[0].tracksViewChanges).toBeUndefined()
    })
  })

  describe('anchor property with customView', () => {
    it('should support custom anchor points for custom markers', () => {
      const markers: MapMarker[] = [
        {
          id: 'anchored-1',
          latitude: 37.7749,
          longitude: -122.4194,
          customView: <View><Text>Centered</Text></View>,
          anchor: { x: 0.5, y: 0.5 },
        },
      ]

      expect(markers[0].anchor).toEqual({ x: 0.5, y: 0.5 })
    })

    it('should support bottom-center anchor for pin-style markers', () => {
      const markers: MapMarker[] = [
        {
          id: 'pin-1',
          latitude: 37.7749,
          longitude: -122.4194,
          customView: <View><Text>Pin</Text></View>,
          anchor: { x: 0.5, y: 1.0 },
        },
      ]

      expect(markers[0].anchor).toEqual({ x: 0.5, y: 1.0 })
    })
  })
})

// ============================================================================
// createMarker Helper Tests
// ============================================================================

describe('createMarker helper', () => {
  it('should create a basic marker with id and coordinates', () => {
    const marker = createMarker('marker-1', {
      latitude: 37.7749,
      longitude: -122.4194,
    })

    expect(marker.id).toBe('marker-1')
    expect(marker.latitude).toBe(37.7749)
    expect(marker.longitude).toBe(-122.4194)
  })

  it('should create a marker with title and pinColor', () => {
    const marker = createMarker(
      'marker-2',
      { latitude: 37.7749, longitude: -122.4194 },
      { title: 'Test Location', pinColor: '#FF0000' }
    )

    expect(marker.title).toBe('Test Location')
    expect(marker.pinColor).toBe('#FF0000')
  })

  it('should not include customView when using createMarker', () => {
    // createMarker is designed for simple markers, customView should be added directly
    const marker = createMarker(
      'marker-3',
      { latitude: 37.7749, longitude: -122.4194 },
      { title: 'Simple' }
    )

    expect(marker.customView).toBeUndefined()
  })
})

// ============================================================================
// MapView Component Tests (with mocked react-native-maps)
// ============================================================================

describe('MapView Component', () => {
  it('should render without crashing', () => {
    const { container } = render(<MapView />)
    expect(container.firstChild).toBeTruthy()
  })

  it('should accept markers prop', () => {
    const markers: MapMarker[] = [
      {
        id: 'test-1',
        latitude: 37.7749,
        longitude: -122.4194,
        title: 'Test',
      },
    ]

    const { container } = render(<MapView markers={markers} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('should accept markers with customView', () => {
    const markers: MapMarker[] = [
      {
        id: 'custom-1',
        latitude: 37.7749,
        longitude: -122.4194,
        customView: <View><Text>Custom</Text></View>,
        tracksViewChanges: true,
      },
    ]

    const { container } = render(<MapView markers={markers} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('should accept onMarkerPress callback', () => {
    const handleMarkerPress = vi.fn()
    const markers: MapMarker[] = [
      {
        id: 'clickable-1',
        latitude: 37.7749,
        longitude: -122.4194,
        customView: <View><Text>Clickable</Text></View>,
      },
    ]

    const { container } = render(
      <MapView markers={markers} onMarkerPress={handleMarkerPress} />
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('should handle empty markers array', () => {
    const { container } = render(<MapView markers={[]} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('should handle large number of markers', () => {
    const markers: MapMarker[] = Array.from({ length: 100 }, (_, i) => ({
      id: `marker-${i}`,
      latitude: 37.7749 + (i * 0.001),
      longitude: -122.4194 + (i * 0.001),
      customView: <View><Text>{i}</Text></View>,
      tracksViewChanges: i < 5, // Only first 5 are animated
    }))

    const { container } = render(<MapView markers={markers} />)
    expect(container.firstChild).toBeTruthy()
  })
})

// ============================================================================
// Custom Marker Data Transformation Tests
// ============================================================================

describe('Custom Marker Data Transformation', () => {
  it('should transform location data to custom markers', () => {
    // Simulate the transformation done in MapSearchScreen
    const locations = [
      {
        id: 'loc-1',
        latitude: 37.7749,
        longitude: -122.4194,
        name: 'Coffee Shop',
        active_post_count: 5,
        latest_post_at: new Date().toISOString(),
      },
    ]

    const markers: MapMarker[] = locations.map((location) => {
      const postCount = location.active_post_count ?? 0
      const isHot = postCount > 0 // Simplified for test

      return {
        id: location.id,
        latitude: location.latitude,
        longitude: location.longitude,
        tracksViewChanges: isHot,
        customView: (
          <View testID={`marker-${location.id}`}>
            <Text>{postCount}</Text>
          </View>
        ),
      }
    })

    expect(markers).toHaveLength(1)
    expect(markers[0].id).toBe('loc-1')
    expect(markers[0].tracksViewChanges).toBe(true)
    expect(markers[0].customView).toBeTruthy()
  })

  it('should set tracksViewChanges based on activity state', () => {
    const hotLocation = {
      id: 'hot-1',
      active_post_count: 10,
      latest_post_at: new Date().toISOString(), // Recent
    }

    const coldLocation = {
      id: 'cold-1',
      active_post_count: 5,
      latest_post_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // Old
    }

    const TWO_HOURS_MS = 2 * 60 * 60 * 1000

    const isHot = (location: typeof hotLocation) => {
      if (!location.latest_post_at) return false
      const timeSince = Date.now() - new Date(location.latest_post_at).getTime()
      return timeSince < TWO_HOURS_MS
    }

    expect(isHot(hotLocation)).toBe(true)
    expect(isHot(coldLocation)).toBe(false)
  })

  it('should merge custom markers with default markers', () => {
    const customMarkers: MapMarker[] = [
      {
        id: 'custom-1',
        latitude: 37.7749,
        longitude: -122.4194,
        customView: <View><Text>Custom</Text></View>,
        tracksViewChanges: true,
      },
    ]

    const defaultMarkers: MapMarker[] = [
      {
        id: 'default-1',
        latitude: 37.7850,
        longitude: -122.4294,
        title: 'Selected Venue',
        pinColor: '#0000FF',
      },
    ]

    const allMarkers = [...customMarkers, ...defaultMarkers]

    expect(allMarkers).toHaveLength(2)
    expect(allMarkers[0].customView).toBeTruthy()
    expect(allMarkers[1].customView).toBeUndefined()
  })
})
