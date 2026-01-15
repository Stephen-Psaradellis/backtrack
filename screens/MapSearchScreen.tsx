/**
 * MapSearchScreen - Map view with search and favorites
 *
 * The Map tab shows a full-screen map for discovering locations.
 * Features:
 * - Full-screen map with POI click → Ledger navigation
 * - Search bar at top for venue search
 * - Star icon to open Favorites modal
 * - My location FAB (bottom right)
 * - Favorite location markers on map
 */
import React, { useCallback, useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useLocation } from '../hooks/useLocation'
import { useFavoriteLocations, type FavoriteLocationWithDistance } from '../hooks/useFavoriteLocations'
import { MapView, createRegion, createMarker, type MapMarker, type PoiData } from '../components/MapView'
import { SearchBar } from '../components/LocationSearch'
import { GlobalHeader } from '../components/navigation/GlobalHeader'
import { selectionFeedback, lightFeedback } from '../lib/haptics'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { colors, shadows } from '../constants/theme'
import type { MainTabNavigationProp } from '../navigation/types'

// ============================================================================
// MapSearchScreen Component
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
  // State
  // ---------------------------------------------------------------------------

  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // ---------------------------------------------------------------------------
  // Map Configuration
  // ---------------------------------------------------------------------------

  const initialRegion = userCoordinates
    ? createRegion(userCoordinates, 'medium')
    : undefined

  // Create markers for favorites (shown on the map as reference)
  const favoriteMarkers: MapMarker[] = favorites.map((fav) =>
    createMarker(
      fav.id,
      { latitude: fav.latitude, longitude: fav.longitude },
      { title: fav.custom_name }
    )
  )

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePoiClick = useCallback((poi: PoiData) => {
    selectionFeedback()
    // Navigate to posts for this POI location
    navigation.navigate('Ledger', {
      locationId: poi.placeId ?? '',
      locationName: poi.name,
    })
  }, [navigation])

  const handleMarkerPress = useCallback((marker: MapMarker) => {
    const fav = favorites.find(f => f.id === marker.id)
    if (fav) {
      selectionFeedback()
      // Navigate to posts for this favorite location
      navigation.navigate('Ledger', {
        locationId: fav.place_id ?? '',
        locationName: fav.place_name,
      })
    }
  }, [favorites, navigation])

  const handleStarPress = useCallback(() => {
    selectionFeedback()
    // Navigate to Favorites screen
    navigation.navigate('Favorites')
  }, [navigation])

  const handleMyLocationPress = useCallback(() => {
    lightFeedback()
    // The map will center on user location when re-rendered
    // In a full implementation, this would animate to user location
  }, [])

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text)
    // In a full implementation, this would trigger venue search
    if (text.length > 0) {
      setIsSearching(true)
      // Simulate search delay
      setTimeout(() => setIsSearching(false), 500)
    }
  }, [])

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchFavorites()
    }, [refetchFavorites])
  )

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (locationLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <LoadingSpinner message="Getting your location..." />
      </SafeAreaView>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container} testID="map-search-screen">
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
          <Ionicons name="star" size={24} color={colors.primary[500]} />
        </TouchableOpacity>

        <View style={styles.searchBarContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearchChange}
            loading={isSearching}
            placeholder="Search for a venue..."
            testID="map-search-bar"
          />
        </View>
      </View>

      {/* Full-screen Map */}
      <View style={styles.mapContainer} testID="map-container">
        <MapView
          showsUserLocation
          initialRegion={initialRegion}
          markers={favoriteMarkers}
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
          <Ionicons name="locate" size={24} color={colors.primary[500]} />
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
    backgroundColor: colors.neutral[50],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    gap: 12,
  },
  starButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.native.sm,
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
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.native.md,
  },
})

export default MapSearchScreen
