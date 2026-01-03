/**
 * MapView Component
 *
 * Google Maps integration component for displaying locations and markers.
 * Provides a consistent map experience throughout the app with support for
 * current location display, custom markers, and region changes.
 *
 * Features:
 * - Google Maps provider (Android/iOS)
 * - Current location marker
 * - Custom markers with onPress handling
 * - Region change callbacks
 * - Loading and error states
 *
 * @example
 * ```tsx
 * // Basic usage with current location
 * <MapView showsUserLocation />
 *
 * @example
 * // With custom markers
 * <MapView
 *   markers={[
 *     { id: '1', latitude: 37.78, longitude: -122.41, title: 'Cafe' },
 *     { id: '2', latitude: 37.79, longitude: -122.42, title: 'Gym' },
 *   ]}
 *   onMarkerPress={(marker) => console.log('Selected:', marker.title)}
 * />
 *
 * @example
 * // Controlled region
 * <MapView
 *   region={{
 *     latitude: 37.78,
 *     longitude: -122.41,
 *     latitudeDelta: 0.01,
 *     longitudeDelta: 0.01,
 *   }}
 *   onRegionChangeComplete={(region) => setRegion(region)}
 * />
 * ```
 */

import React, { useCallback, useRef, useMemo } from 'react'
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Text,
  Platform,
} from 'react-native'

import { LoadingSpinner } from './LoadingSpinner'
import { ErrorState } from './EmptyState'
import { Button } from './Button'
import type { Coordinates, MapRegion } from '../lib/types'

// react-native-maps is excluded from iOS autolinking (see app.json)
// Only import on Android to prevent iOS crash
let RNMapView: any = null
let Marker: any = null
let PROVIDER_GOOGLE: any = null

if (Platform.OS === 'android') {
  const maps = require('react-native-maps')
  RNMapView = maps.default
  Marker = maps.Marker
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE
}

// Type imports for TypeScript (these don't affect runtime)
import type {
  Region,
  MapPressEvent,
  MarkerPressEvent,
  Camera,
} from 'react-native-maps'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Marker data for displaying on the map
 */
export interface MapMarker {
  /** Unique identifier for the marker */
  id: string
  /** Latitude coordinate */
  latitude: number
  /** Longitude coordinate */
  longitude: number
  /** Optional marker title (shown in callout) */
  title?: string
  /** Optional marker description (shown in callout) */
  description?: string
  /** Optional custom marker color */
  pinColor?: string
  /** Optional custom marker image (require or uri) */
  image?: number | { uri: string }
  /** Optional anchor point for custom image */
  anchor?: { x: number; y: number }
  /** Optional callback when marker is pressed */
  onPress?: () => void
}

/**
 * Props for the MapView component
 */
export interface MapViewProps {
  /** Whether to show the user's current location */
  showsUserLocation?: boolean
  /** Whether to follow the user's location (auto-center) */
  followsUserLocation?: boolean
  /** Initial region to display */
  initialRegion?: MapRegion
  /** Controlled region (use with onRegionChangeComplete) */
  region?: MapRegion
  /** Array of markers to display */
  markers?: MapMarker[]
  /** Whether the map is loading */
  loading?: boolean
  /** Loading message to display */
  loadingMessage?: string
  /** Error message to display */
  error?: string | null
  /** Callback to retry after error */
  onRetry?: () => void
  /** Callback when region changes (fires continuously during pan/zoom) */
  onRegionChange?: (region: MapRegion) => void
  /** Callback when region change completes */
  onRegionChangeComplete?: (region: MapRegion) => void
  /** Callback when map is pressed */
  onMapPress?: (coordinates: Coordinates) => void
  /** Callback when a marker is pressed */
  onMarkerPress?: (marker: MapMarker) => void
  /** Callback when map is ready */
  onMapReady?: () => void
  /** Whether to show the my location button */
  showsMyLocationButton?: boolean
  /** Whether to show the compass */
  showsCompass?: boolean
  /** Whether to show scale indicator */
  showsScale?: boolean
  /** Whether to show traffic */
  showsTraffic?: boolean
  /** Whether to show buildings in 3D */
  showsBuildings?: boolean
  /** Whether to show indoor maps */
  showsIndoors?: boolean
  /** Whether to show points of interest */
  showsPointsOfInterest?: boolean
  /** Map type (standard, satellite, hybrid, terrain) */
  mapType?: 'standard' | 'satellite' | 'hybrid' | 'terrain'
  /** Minimum zoom level */
  minZoomLevel?: number
  /** Maximum zoom level */
  maxZoomLevel?: number
  /** Whether map is scrollable */
  scrollEnabled?: boolean
  /** Whether map is zoomable */
  zoomEnabled?: boolean
  /** Whether map is rotatable */
  rotateEnabled?: boolean
  /** Whether map is tiltable (3D perspective) */
  pitchEnabled?: boolean
  /** Custom container style */
  style?: StyleProp<ViewStyle>
  /** Custom map style */
  mapStyle?: StyleProp<ViewStyle>
  /** Test ID for testing purposes */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default map region (centered on San Francisco)
 */
const DEFAULT_REGION: MapRegion = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
}

/**
 * Default delta values for zoom levels
 */
const ZOOM_DELTAS = {
  close: { latitudeDelta: 0.005, longitudeDelta: 0.005 },
  medium: { latitudeDelta: 0.02, longitudeDelta: 0.02 },
  far: { latitudeDelta: 0.1, longitudeDelta: 0.1 },
} as const

/**
 * iOS Maps colors for markers
 */
const MARKER_COLORS = {
  default: '#FF3B30', // iOS red
  selected: '#007AFF', // iOS blue
  user: '#007AFF', // iOS blue for user location
} as const

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * MapView - Google Maps component for location display
 *
 * @example
 * // Simple map with user location
 * <MapView showsUserLocation />
 *
 * @example
 * // Map with markers
 * <MapView
 *   markers={venues}
 *   onMarkerPress={handleVenueSelect}
 * />
 */
export function MapView({
  showsUserLocation = false,
  followsUserLocation = false,
  initialRegion = DEFAULT_REGION,
  region,
  markers = [],
  loading = false,
  loadingMessage = 'Loading map...',
  error = null,
  onRetry,
  onRegionChange,
  onRegionChangeComplete,
  onMapPress,
  onMarkerPress,
  onMapReady,
  showsMyLocationButton = true,
  showsCompass = true,
  showsScale = false,
  showsTraffic = false,
  showsBuildings = true,
  showsIndoors = true,
  showsPointsOfInterest = true,
  mapType = 'standard',
  minZoomLevel,
  maxZoomLevel,
  scrollEnabled = true,
  zoomEnabled = true,
  rotateEnabled = true,
  pitchEnabled = true,
  style,
  mapStyle,
  testID = 'map-view',
}: MapViewProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // REFS
  // ---------------------------------------------------------------------------

  const mapRef = useRef<any>(null)

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle region change (continuous during pan/zoom)
   */
  const handleRegionChange = useCallback(
    (newRegion: Region) => {
      onRegionChange?.({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
        latitudeDelta: newRegion.latitudeDelta,
        longitudeDelta: newRegion.longitudeDelta,
      })
    },
    [onRegionChange]
  )

  /**
   * Handle region change complete
   */
  const handleRegionChangeComplete = useCallback(
    (newRegion: Region) => {
      onRegionChangeComplete?.({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
        latitudeDelta: newRegion.latitudeDelta,
        longitudeDelta: newRegion.longitudeDelta,
      })
    },
    [onRegionChangeComplete]
  )

  /**
   * Handle map press
   */
  const handleMapPress = useCallback(
    (event: MapPressEvent) => {
      const { coordinate } = event.nativeEvent
      onMapPress?.({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      })
    },
    [onMapPress]
  )

  /**
   * Handle marker press
   */
  const handleMarkerPress = useCallback(
    (marker: MapMarker) => {
      marker.onPress?.()
      onMarkerPress?.(marker)
    },
    [onMarkerPress]
  )

  /**
   * Handle map ready
   */
  const handleMapReady = useCallback(() => {
    onMapReady?.()
  }, [onMapReady])

  // ---------------------------------------------------------------------------
  // PUBLIC METHODS (via ref)
  // ---------------------------------------------------------------------------

  /**
   * Animate to a specific region
   */
  const animateToRegion = useCallback(
    (targetRegion: MapRegion, duration = 1000) => {
      mapRef.current?.animateToRegion(
        {
          latitude: targetRegion.latitude,
          longitude: targetRegion.longitude,
          latitudeDelta: targetRegion.latitudeDelta,
          longitudeDelta: targetRegion.longitudeDelta,
        },
        duration
      )
    },
    []
  )

  /**
   * Animate to specific coordinates
   */
  const animateToCoordinates = useCallback(
    (coordinates: Coordinates, zoom: keyof typeof ZOOM_DELTAS = 'medium', duration = 1000) => {
      const deltas = ZOOM_DELTAS[zoom]
      mapRef.current?.animateToRegion(
        {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          ...deltas,
        },
        duration
      )
    },
    []
  )

  /**
   * Fit map to show all markers
   */
  const fitToMarkers = useCallback(
    (edgePadding = { top: 50, right: 50, bottom: 50, left: 50 }, animated = true) => {
      if (markers.length === 0) return

      const markerIds = markers.map((m) => m.id)
      mapRef.current?.fitToSuppliedMarkers(markerIds, {
        edgePadding,
        animated,
      })
    },
    [markers]
  )

  // ---------------------------------------------------------------------------
  // RENDER: LOADING STATE
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, style]} testID={`${testID}-loading`}>
        <LoadingSpinner message={loadingMessage} />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: ERROR STATE
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <View style={[styles.container, styles.centered, style]} testID={`${testID}-error`}>
        <ErrorState
          error={error}
          onRetry={onRetry}
        />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: iOS FALLBACK (react-native-maps not linked on iOS)
  // ---------------------------------------------------------------------------

  if (Platform.OS === 'ios' || !RNMapView) {
    return (
      <View style={[styles.container, styles.centered, style]} testID={testID}>
        <Text style={styles.fallbackText}>Map not available on this platform</Text>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: MAP (Android only)
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.container, style]} testID={testID}>
      <RNMapView
        ref={mapRef}
        style={[styles.map, mapStyle]}
        provider={PROVIDER_GOOGLE}
        initialRegion={region || initialRegion}
        region={region}
        showsUserLocation={showsUserLocation}
        followsUserLocation={followsUserLocation}
        showsMyLocationButton={showsMyLocationButton}
        showsCompass={showsCompass}
        showsScale={showsScale}
        showsTraffic={showsTraffic}
        showsBuildings={showsBuildings}
        showsIndoors={showsIndoors}
        showsPointsOfInterest={showsPointsOfInterest}
        mapType={mapType}
        minZoomLevel={minZoomLevel}
        maxZoomLevel={maxZoomLevel}
        scrollEnabled={scrollEnabled}
        zoomEnabled={zoomEnabled}
        rotateEnabled={rotateEnabled}
        pitchEnabled={pitchEnabled}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={handleMapPress}
        onMapReady={handleMapReady}
        testID={`${testID}-native`}
      >
        {/* Render markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            identifier={marker.id}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={marker.title}
            description={marker.description}
            pinColor={marker.pinColor || MARKER_COLORS.default}
            image={marker.image}
            anchor={marker.anchor}
            onPress={() => handleMarkerPress(marker)}
            testID={`${testID}-marker-${marker.id}`}
          />
        ))}
      </RNMapView>
    </View>
  )
}

// ============================================================================
// PRESET VARIANTS
// ============================================================================

/**
 * MapView with user location enabled by default
 */
export function UserLocationMap(
  props: Omit<MapViewProps, 'showsUserLocation'>
): JSX.Element {
  return <MapView {...props} showsUserLocation />
}

/**
 * MapView in satellite view
 */
export function SatelliteMap(
  props: Omit<MapViewProps, 'mapType'>
): JSX.Element {
  return <MapView {...props} mapType="satellite" />
}

/**
 * MapView with minimal controls (no buttons/compass)
 */
export function MinimalMap(
  props: Omit<MapViewProps, 'showsMyLocationButton' | 'showsCompass'>
): JSX.Element {
  return <MapView {...props} showsMyLocationButton={false} showsCompass={false} />
}

/**
 * MapView in read-only mode (no interactions)
 */
export function StaticMap(
  props: Omit<MapViewProps, 'scrollEnabled' | 'zoomEnabled' | 'rotateEnabled' | 'pitchEnabled'>
): JSX.Element {
  return (
    <MapView
      {...props}
      scrollEnabled={false}
      zoomEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
    />
  )
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a MapRegion from coordinates with default zoom
 */
export function createRegion(
  coordinates: Coordinates,
  zoom: keyof typeof ZOOM_DELTAS = 'medium'
): MapRegion {
  return {
    ...coordinates,
    ...ZOOM_DELTAS[zoom],
  }
}

/**
 * Create a MapMarker from location data
 */
export function createMarker(
  id: string,
  coordinates: Coordinates,
  options?: Partial<Omit<MapMarker, 'id' | 'latitude' | 'longitude'>>
): MapMarker {
  return {
    id,
    ...coordinates,
    ...options,
  }
}

/**
 * Get the center point of multiple coordinates
 */
export function getCenterCoordinates(coordinates: Coordinates[]): Coordinates | null {
  if (coordinates.length === 0) return null

  const sum = coordinates.reduce(
    (acc, coord) => ({
      latitude: acc.latitude + coord.latitude,
      longitude: acc.longitude + coord.longitude,
    }),
    { latitude: 0, longitude: 0 }
  )

  return {
    latitude: sum.latitude / coordinates.length,
    longitude: sum.longitude / coordinates.length,
  }
}

/**
 * Calculate a region that fits all coordinates
 */
export function getRegionForCoordinates(
  coordinates: Coordinates[],
  padding = 1.5
): MapRegion | null {
  if (coordinates.length === 0) return null

  // Find bounds
  let minLat = coordinates[0].latitude
  let maxLat = coordinates[0].latitude
  let minLng = coordinates[0].longitude
  let maxLng = coordinates[0].longitude

  coordinates.forEach((coord) => {
    minLat = Math.min(minLat, coord.latitude)
    maxLat = Math.max(maxLat, coord.latitude)
    minLng = Math.min(minLng, coord.longitude)
    maxLng = Math.max(maxLng, coord.longitude)
  })

  // Calculate center
  const latitude = (minLat + maxLat) / 2
  const longitude = (minLng + maxLng) / 2

  // Calculate deltas with padding
  const latitudeDelta = Math.max((maxLat - minLat) * padding, ZOOM_DELTAS.close.latitudeDelta)
  const longitudeDelta = Math.max((maxLng - minLng) * padding, ZOOM_DELTAS.close.longitudeDelta)

  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default MapView
export { DEFAULT_REGION, ZOOM_DELTAS, MARKER_COLORS }
