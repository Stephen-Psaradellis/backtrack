/**
 * MapSearchScreen - Map view with search and favorites
 *
 * The Map tab shows a full-screen map for discovering locations.
 * Features:
 * - Full-screen map with POI click → Ledger navigation
 * - Search bar with Google Places autocomplete
 * - Search results animate map to location and open posts
 * - Star icon to open Favorites modal
 * - My location FAB (bottom right)
 * - Favorite location markers on map
 * - Modern dark theme with glassmorphism
 */
import React, { useCallback, useState, useRef, useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, StatusBar } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useLocation } from '../hooks/useLocation'
import { useFavoriteLocations, type FavoriteLocationWithDistance } from '../hooks/useFavoriteLocations'
import { useLocationSearch } from '../hooks/useLocationSearch'
import { useNearbyLocations } from '../hooks/useNearbyLocations'
import { MapView, createRegion, createMarker, type MapMarker, type PoiData, type MapViewProps } from '../components/MapView'
import { LocationMarker, getActivityState } from '../components/map/LocationMarker'
import { SearchBar } from '../components/LocationSearch'
import { GlobalHeader } from '../components/navigation/GlobalHeader'
import { selectionFeedback, lightFeedback } from '../lib/haptics'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { colors, shadows } from '../constants/theme'
import { darkTheme } from '../constants/glassStyles'
import type { MainTabNavigationProp } from '../navigation/types'
import type { VenuePreview, Venue } from '../types/location'
import type { MapRegion } from '../lib/types'

// ============================================================================
// MapSearchScreen Component
// ============================================================================

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a Venue to VenuePreview for SearchBar suggestions
 */
function venueToPreview(venue: Venue): VenuePreview {
  return {
    id: venue.id || venue.google_place_id, // Use google_place_id as fallback if not cached
    google_place_id: venue.google_place_id,
    name: venue.name,
    address: venue.address,
    primary_type: venue.place_types?.[0] ?? null,
    post_count: venue.post_count ?? 0,
    distance_meters: venue.distance_meters,
  }
}

// ============================================================================
// Component
// ============================================================================

export function MapSearchScreen(): React.ReactNode {
  const navigation = useNavigation<MainTabNavigationProp>()
  const { latitude, longitude, loading: locationLoading } = useLocation()

  const userCoordinates = latitude && longitude ? { latitude, longitude } : null

  const {
    favorites,
    refetch: refetchFavorites,
  } = useFavoriteLocations({ userCoordinates })

  // ---------------------------------------------------------------------------
  // Nearby Locations with Active Posts Hook (for activity markers)
  // ---------------------------------------------------------------------------

  const {
    locations: nearbyLocations,
    refetch: refetchNearbyLocations,
  } = useNearbyLocations(userCoordinates, {
    withActivePosts: true,
    radiusMeters: 5000,
    minPostCount: 1,
  })

  // ---------------------------------------------------------------------------
  // Location Search Hook
  // ---------------------------------------------------------------------------

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    isLoading: isSearching,
    error: searchError,
    clearSearch,
  } = useLocationSearch({
    userLocation: userCoordinates,
    enableGpsOnMount: false, // Already using useLocation hook
    debounceMs: 300,
    maxResults: 10,
  })

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  // Map region state for controlling map position
  const [mapRegion, setMapRegion] = useState<MapRegion | undefined>(undefined)

  // Track if we should show selected venue marker
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)

  // ---------------------------------------------------------------------------
  // Memoized Values
  // ---------------------------------------------------------------------------

  // Convert search results to VenuePreview for suggestions
  const suggestions: VenuePreview[] = useMemo(() => {
    return searchResults.map(venueToPreview)
  }, [searchResults])

  // Initial map region based on user location
  const initialRegion = useMemo(() => {
    if (userCoordinates) {
      return createRegion(userCoordinates, 'medium')
    }
    return undefined
  }, [userCoordinates])

  // Track selected location for marker highlighting
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

  // Create activity markers for nearby locations with posts using custom LocationMarker
  const activityMarkers: MapMarker[] = useMemo(() => {
    return nearbyLocations.map((location) => {
      const postCount = location.active_post_count ?? 0
      const latestPostAt = location.latest_post_at
        ? new Date(location.latest_post_at)
        : null
      const activityState = getActivityState(postCount, latestPostAt)
      const isHot = activityState === 'hot'
      const isSelected = selectedLocationId === location.id

      return {
        id: location.id,
        latitude: location.latitude,
        longitude: location.longitude,
        // Only track view changes for animated hot markers (performance optimization)
        tracksViewChanges: isHot,
        customView: (
          <LocationMarker
            postCount={postCount}
            latestPostAt={latestPostAt}
            size="medium"
            selected={isSelected}
          />
        ),
      }
    })
  }, [nearbyLocations, selectedLocationId])

  // Add selected venue as a marker if it exists (uses default pin style)
  const allMarkers: MapMarker[] = useMemo(() => {
    const markers = [...activityMarkers]
    if (selectedVenue && selectedVenue.latitude && selectedVenue.longitude) {
      markers.push(
        createMarker(
          `selected-${selectedVenue.google_place_id}`,
          { latitude: selectedVenue.latitude, longitude: selectedVenue.longitude },
          { title: selectedVenue.name, pinColor: colors.primary[500] }
        )
      )
    }
    return markers
  }, [activityMarkers, selectedVenue])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePoiClick = useCallback((poi: PoiData) => {
    selectionFeedback()
    // Clear search when tapping a POI
    clearSearch()
    setSelectedVenue(null)
    // Navigate to posts for this POI location
    navigation.navigate('Ledger', {
      locationId: poi.placeId ?? '',
      locationName: poi.name,
    })
  }, [navigation, clearSearch])

  const handleMarkerPress = useCallback((marker: MapMarker) => {
    // Check if it's the selected venue marker
    if (marker.id.startsWith('selected-') && selectedVenue) {
      selectionFeedback()
      navigation.navigate('Ledger', {
        locationId: selectedVenue.id || selectedVenue.google_place_id,
        locationName: selectedVenue.name,
      })
      return
    }

    // Check if it's an activity marker (from nearby locations with posts)
    const location = nearbyLocations.find(loc => loc.id === marker.id)
    if (location) {
      selectionFeedback()
      setSelectedLocationId(marker.id)
      // Navigate to posts for this location
      navigation.navigate('Ledger', {
        locationId: location.google_place_id ?? location.id,
        locationName: location.name,
      })
    }
  }, [nearbyLocations, navigation, selectedVenue])

  const handleStarPress = useCallback(() => {
    selectionFeedback()
    // Navigate to Favorites screen
    navigation.navigate('Favorites')
  }, [navigation])

  const handleMyLocationPress = useCallback(() => {
    lightFeedback()
    // Animate to user location
    if (userCoordinates) {
      setMapRegion(createRegion(userCoordinates, 'medium'))
      setSelectedVenue(null)
    }
  }, [userCoordinates])

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text)
    // Clear selected venue when search changes
    if (text.length === 0) {
      setSelectedVenue(null)
    }
  }, [setSearchQuery])

  /**
   * Handle venue selection from search results
   * - Animates map to the selected venue location
   * - Navigates to the Ledger screen for that location
   */
  const handleVenueSelect = useCallback((venuePreview: VenuePreview) => {
    selectionFeedback()

    // Find the full venue data from search results
    const venue = searchResults.find(v =>
      v.google_place_id === venuePreview.google_place_id
    )

    if (venue && venue.latitude && venue.longitude) {
      // Set the selected venue for marker display
      setSelectedVenue(venue)

      // Animate map to the venue location
      const newRegion = createRegion(
        { latitude: venue.latitude, longitude: venue.longitude },
        'close' // Zoom in close to show the venue
      )
      setMapRegion(newRegion)

      // Clear the search query to hide suggestions
      clearSearch()

      // Navigate to the Ledger for this location after a brief delay
      // This allows the user to see the map animate to the location
      setTimeout(() => {
        navigation.navigate('Ledger', {
          locationId: venue.id || venue.google_place_id,
          locationName: venue.name,
        })
      }, 500)
    }
  }, [searchResults, clearSearch, navigation])

  // Handle search submission (Enter key)
  const handleSearchSubmit = useCallback(() => {
    // If there's at least one result, select it
    if (searchResults.length > 0) {
      handleVenueSelect(venueToPreview(searchResults[0]))
    }
  }, [searchResults, handleVenueSelect])

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchFavorites()
      refetchNearbyLocations()
    }, [refetchFavorites, refetchNearbyLocations])
  )

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (locationLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />
        <LoadingSpinner message="Getting your location..." />
      </SafeAreaView>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container} testID="map-search-screen">
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />
      {/* Global Header */}
      <GlobalHeader />

      {/* Search Row: [Star Icon] [Search Bar] */}
      <View style={styles.searchRow}>
        <TouchableOpacity
          style={styles.starButton}
          onPress={handleStarPress}
          activeOpacity={0.7}
          testID="map-star-button"
          accessibilityRole="button"
          accessibilityLabel="Open favorites"
        >
          <Ionicons name="star" size={24} color={darkTheme.accent} />
        </TouchableOpacity>

        <View style={styles.searchBarContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearchChange}
            loading={isSearching}
            placeholder="Search for a venue..."
            suggestions={suggestions}
            onSuggestionPress={handleVenueSelect}
            onSubmit={handleSearchSubmit}
            error={searchError}
            maxSuggestions={6}
            testID="map-search-bar"
          />
        </View>
      </View>

      {/* Full-screen Map */}
      <View style={styles.mapContainer} testID="map-container">
        <MapView
          showsUserLocation
          initialRegion={initialRegion}
          region={mapRegion}
          markers={allMarkers}
          onMapReady={() => lightFeedback()}
          onMarkerPress={handleMarkerPress}
          onPoiClick={handlePoiClick}
        />
      </View>

      {/* My Location FAB (bottom right) */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.myLocationFab}
          onPress={handleMyLocationPress}
          activeOpacity={0.8}
          testID="map-my-location-button"
          accessibilityRole="button"
          accessibilityLabel="Center on my location"
        >
          <Ionicons name="locate" size={24} color={darkTheme.accent} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkTheme.background,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: darkTheme.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.cardBorder,
    gap: 12,
  },
  starButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: darkTheme.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },
  searchBarContainer: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 100, // Above bottom tab bar
    right: 16,
    zIndex: 999,
    elevation: 999,
  },
  myLocationFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: darkTheme.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },
})

export default MapSearchScreen
