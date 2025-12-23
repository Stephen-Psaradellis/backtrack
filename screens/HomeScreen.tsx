/**
 * HomeScreen
 *
 * Main home screen for the Love Ledger app featuring a map view for
 * location-based venue discovery. Users can explore nearby locations,
 * tap on the map to select venues, and view/create posts at those locations.
 *
 * Features:
 * - Full-screen map with user location
 * - Location permission handling
 * - Tap-to-select location functionality
 * - FAB button to create new posts
 * - Selected location indicator
 * - Navigate to Ledger for selected locations
 *
 * @example
 * ```tsx
 * // Used in tab navigation
 * <Tab.Screen name="HomeTab" component={HomeScreen} />
 * ```
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { MapView, createRegion, createMarker, type MapMarker } from '../components/MapView'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Button, OutlineButton } from '../components/Button'
import { useLocation } from '../hooks/useLocation'
import { supabase } from '../lib/supabase'
import type { MainTabNavigationProp } from '../navigation/types'
import type { Coordinates, MapRegion, Location as LocationEntity } from '../lib/types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Selected location state
 */
interface SelectedLocation {
  coordinates: Coordinates
  name: string
  address?: string
  locationId?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default zoom level for map
 */
const DEFAULT_ZOOM = 'medium' as const

/**
 * Zoom level when viewing selected location
 */
const SELECTED_ZOOM = 'close' as const

/**
 * Placeholder location name when tapping on map
 */
const DEFAULT_LOCATION_NAME = 'Selected Location'

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * HomeScreen - Main map-based exploration screen
 *
 * @example
 * // Used in tab navigation
 * <Tab.Screen name="HomeTab" component={HomeScreen} />
 */
export function HomeScreen(): JSX.Element {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const navigation = useNavigation<MainTabNavigationProp>()
  const {
    latitude,
    longitude,
    loading: locationLoading,
    error: locationError,
    permissionStatus,
    refresh: refreshLocation,
    requestPermission,
  } = useLocation()

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [nearbyLocations, setNearbyLocations] = useState<LocationEntity[]>([])
  const [loadingNearby, setLoadingNearby] = useState(false)

  // Animation for bottom sheet
  const bottomSheetAnimation = useRef(new Animated.Value(0)).current

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  /**
   * Animate bottom sheet when location is selected/deselected
   */
  useEffect(() => {
    Animated.spring(bottomSheetAnimation, {
      toValue: selectedLocation ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start()
  }, [selectedLocation, bottomSheetAnimation])

  /**
   * Fetch nearby locations when user location changes
   */
  useEffect(() => {
    if (latitude && longitude && mapReady) {
      fetchNearbyLocations()
    }
    // Only fetch when map is ready and we have coordinates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady])

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------

  /**
   * Fetch locations near the user's current position
   */
  const fetchNearbyLocations = useCallback(async () => {
    if (!latitude || !longitude) return

    setLoadingNearby(true)
    try {
      // Fetch locations within a reasonable radius (using basic bounding box)
      // A more sophisticated implementation would use PostGIS or similar
      const latDelta = 0.05 // Approximately 5km
      const lngDelta = 0.05

      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .gte('latitude', latitude - latDelta)
        .lte('latitude', latitude + latDelta)
        .gte('longitude', longitude - lngDelta)
        .lte('longitude', longitude + lngDelta)
        .limit(50)

      if (error) {
        // Silently fail for nearby locations - not critical
        return
      }

      setNearbyLocations(data || [])
    } finally {
      setLoadingNearby(false)
    }
  }, [latitude, longitude])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle map press to select a location
   */
  const handleMapPress = useCallback((coordinates: Coordinates) => {
    setSelectedLocation({
      coordinates,
      name: DEFAULT_LOCATION_NAME,
      address: `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`,
    })
  }, [])

  /**
   * Handle marker press (existing location)
   */
  const handleMarkerPress = useCallback((marker: MapMarker) => {
    const location = nearbyLocations.find((loc) => loc.id === marker.id)
    if (location) {
      setSelectedLocation({
        coordinates: {
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
        },
        name: location.name,
        address: location.address || undefined,
        locationId: location.id,
      })
    }
  }, [nearbyLocations])

  /**
   * Clear selected location
   */
  const handleClearSelection = useCallback(() => {
    setSelectedLocation(null)
  }, [])

  /**
   * Navigate to ledger for selected location
   */
  const handleViewLedger = useCallback(async () => {
    if (!selectedLocation) return

    // If we have an existing location ID, use it
    if (selectedLocation.locationId) {
      navigation.navigate('Ledger', {
        locationId: selectedLocation.locationId,
        locationName: selectedLocation.name,
      })
      return
    }

    // Otherwise, create a new location entry
    try {
      const { data, error } = await supabase
        .from('locations')
        .insert({
          name: selectedLocation.name,
          address: selectedLocation.address,
          latitude: selectedLocation.coordinates.latitude,
          longitude: selectedLocation.coordinates.longitude,
        })
        .select()
        .single()

      if (error) {
        Alert.alert('Error', 'Failed to save location. Please try again.')
        return
      }

      // Update local state with new location
      setNearbyLocations((prev) => [...prev, data])

      navigation.navigate('Ledger', {
        locationId: data.id,
        locationName: data.name,
      })
    } catch {
      Alert.alert('Error', 'An unexpected error occurred.')
    }
  }, [selectedLocation, navigation])

  /**
   * Navigate to create post screen
   */
  const handleCreatePost = useCallback(() => {
    navigation.navigate('CreatePost', {
      locationId: selectedLocation?.locationId,
    })
  }, [navigation, selectedLocation?.locationId])

  /**
   * Handle map ready
   */
  const handleMapReady = useCallback(() => {
    setMapReady(true)
  }, [])

  /**
   * Handle region change complete (could be used for dynamic loading)
   */
  const handleRegionChangeComplete = useCallback((_region: MapRegion) => {
    // Could implement dynamic location loading here based on new region
  }, [])

  /**
   * Request location permission
   */
  const handleRequestPermission = useCallback(async () => {
    const granted = await requestPermission()
    if (granted) {
      await refreshLocation()
    }
  }, [requestPermission, refreshLocation])

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  /**
   * Convert nearby locations to map markers
   */
  const markers: MapMarker[] = nearbyLocations.map((location) =>
    createMarker(location.id, {
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
    }, {
      title: location.name,
      description: location.address || undefined,
      pinColor: selectedLocation?.locationId === location.id ? '#007AFF' : '#FF3B30',
    })
  )

  /**
   * Initial map region based on user location
   */
  const initialRegion: MapRegion | undefined =
    latitude && longitude
      ? createRegion({ latitude, longitude }, DEFAULT_ZOOM)
      : undefined

  // ---------------------------------------------------------------------------
  // RENDER: PERMISSION DENIED
  // ---------------------------------------------------------------------------

  if (permissionStatus === 'denied' || permissionStatus === 'restricted') {
    return (
      <View style={styles.centeredContainer} testID="home-permission-denied">
        <View style={styles.permissionContent}>
          <Text style={styles.permissionIcon}>📍</Text>
          <Text style={styles.permissionTitle}>Location Access Required</Text>
          <Text style={styles.permissionMessage}>
            Love Ledger needs access to your location to show you nearby venues
            and help you discover missed connections.
          </Text>
          {permissionStatus === 'denied' && (
            <Button
              title="Enable Location"
              onPress={handleRequestPermission}
              testID="home-enable-location-button"
            />
          )}
          {permissionStatus === 'restricted' && (
            <Text style={styles.permissionHint}>
              Please enable location services in your device settings.
            </Text>
          )}
        </View>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: LOADING
  // ---------------------------------------------------------------------------

  if (locationLoading && !latitude && !longitude) {
    return (
      <View style={styles.centeredContainer} testID="home-loading">
        <LoadingSpinner message="Getting your location..." />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: ERROR
  // ---------------------------------------------------------------------------

  if (locationError && !latitude && !longitude) {
    return (
      <View style={styles.centeredContainer} testID="home-error">
        <View style={styles.errorContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Location Error</Text>
          <Text style={styles.errorMessage}>{locationError}</Text>
          <Button
            title="Try Again"
            onPress={refreshLocation}
            testID="home-retry-button"
          />
        </View>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: MAP
  // ---------------------------------------------------------------------------

  // Bottom sheet transform
  const bottomSheetTranslateY = bottomSheetAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [200, 0],
  })

  return (
    <View style={styles.container} testID="home-screen">
      {/* Map View */}
      <MapView
        showsUserLocation
        followsUserLocation={false}
        initialRegion={initialRegion}
        markers={markers}
        onMapPress={handleMapPress}
        onMarkerPress={handleMarkerPress}
        onMapReady={handleMapReady}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsMyLocationButton
        showsCompass
        testID="home-map"
      />

      {/* Loading indicator for nearby locations */}
      {loadingNearby && (
        <View style={styles.loadingBadge} testID="home-loading-nearby">
          <Text style={styles.loadingBadgeText}>Loading venues...</Text>
        </View>
      )}

      {/* FAB Button - Create Post */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreatePost}
        activeOpacity={0.8}
        testID="home-create-post-fab"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Selected Location Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            transform: [{ translateY: bottomSheetTranslateY }],
            opacity: bottomSheetAnimation,
          },
        ]}
        testID="home-bottom-sheet"
        pointerEvents={selectedLocation ? 'auto' : 'none'}
      >
        {selectedLocation && (
          <>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.bottomSheetContent}>
              {/* Location Info */}
              <View style={styles.locationInfo}>
                <Text style={styles.locationName} numberOfLines={1}>
                  {selectedLocation.name}
                </Text>
                {selectedLocation.address && (
                  <Text style={styles.locationAddress} numberOfLines={1}>
                    {selectedLocation.address}
                  </Text>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <OutlineButton
                  title="Cancel"
                  onPress={handleClearSelection}
                  size="small"
                  testID="home-cancel-selection-button"
                />
                <Button
                  title="View Posts"
                  onPress={handleViewLedger}
                  size="small"
                  testID="home-view-ledger-button"
                />
              </View>
            </View>
          </>
        )}
      </Animated.View>

      {/* Recenter Button */}
      <TouchableOpacity
        style={styles.recenterButton}
        onPress={refreshLocation}
        activeOpacity={0.8}
        testID="home-recenter-button"
      >
        <Text style={styles.recenterIcon}>◎</Text>
      </TouchableOpacity>
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 24,
  },

  // Permission styles
  permissionContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionHint: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Error styles
  errorContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },

  // Loading badge
  loadingBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingBadgeText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },

  // FAB button
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
    marginTop: -2,
  },

  // Recenter button
  recenterButton: {
    position: 'absolute',
    right: 20,
    bottom: 170,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  recenterIcon: {
    fontSize: 24,
    color: '#007AFF',
  },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
  },
  locationInfo: {
    marginBottom: 16,
  },
  locationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#8E8E93',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default HomeScreen
