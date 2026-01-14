/**
 * HomeScreen - Main home screen with full-screen map
 *
 * The Explore tab shows only the map view for discovering locations.
 * Users tap on POIs (Points of Interest) to view posts at that location.
 * Favorites are managed in the dedicated Favorites tab.
 */
import React, { useCallback } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useLocation } from '../hooks/useLocation'
import { useFavoriteLocations, type FavoriteLocationWithDistance } from '../hooks/useFavoriteLocations'
import { MapView, createRegion, createMarker, type MapMarker, type PoiData } from '../components/MapView'
import { selectionFeedback, lightFeedback } from '../lib/haptics'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { CheckInButton } from '../components/checkin'
import type { MainTabNavigationProp } from '../navigation/types'

// ============================================================================
// HomeScreen Component
// ============================================================================

export function HomeScreen(): React.ReactNode {
  const navigation = useNavigation<MainTabNavigationProp>()
  const { latitude, longitude, loading: locationLoading } = useLocation()

  const userCoordinates = latitude && longitude ? { latitude, longitude } : null

  const {
    favorites,
    refetch: refetchFavorites,
  } = useFavoriteLocations({ userCoordinates })

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

  const handleCreatePost = useCallback(() => {
    selectionFeedback()
    navigation.navigate('CreatePost', {})
  }, [navigation])

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
      <SafeAreaView style={styles.centered}>
        <LoadingSpinner message="Getting your location..." />
      </SafeAreaView>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} testID="home-screen">
      {/* Full-screen Map */}
      <View style={styles.mapContainer} testID="home-map-container">
        <MapView
          showsUserLocation
          initialRegion={initialRegion}
          markers={favoriteMarkers}
          onMapReady={() => lightFeedback()}
          onMarkerPress={handleMarkerPress}
          onPoiClick={handlePoiClick}
        />
      </View>

      {/* Check-In Button (top right) */}
      <View style={styles.checkinContainer}>
        <CheckInButton testID="home-checkin-button" />
      </View>

      {/* Create Post FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.createPostFab}
          onPress={handleCreatePost}
          activeOpacity={0.8}
          testID="home-create-post-button"
          accessibilityRole="button"
          accessibilityLabel="Create a new post"
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF9',
  },
  mapContainer: {
    flex: 1,
  },
  checkinContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 999,
    elevation: 999,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 100, // Above bottom tab bar
    right: 16,
    zIndex: 999,
    elevation: 999,
  },
  createPostFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B47',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
})

export default HomeScreen
