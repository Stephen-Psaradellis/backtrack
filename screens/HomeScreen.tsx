/**
 * HomeScreen - Main home screen with full-screen map
 *
 * The Explore tab shows only the map view for discovering locations.
 * Users tap on POIs (Points of Interest) to view posts at that location.
 * Favorites are managed in the dedicated Favorites tab.
 */
import React, { useCallback } from 'react'
import { View, StyleSheet, StatusBar } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'

import { darkTheme } from '../constants/glassStyles'
import { useLocation } from '../hooks/useLocation'
import { useFavoriteLocations, type FavoriteLocationWithDistance } from '../hooks/useFavoriteLocations'
import { MapView, createRegion, createMarker, type MapMarker, type PoiData } from '../components/MapView'
import { selectionFeedback, lightFeedback } from '../lib/haptics'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { GlobalHeader } from '../components/navigation/GlobalHeader'
import { FloatingActionButtons } from '../components/navigation/FloatingActionButtons'
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
      <View style={styles.container} testID="home-screen">
        <StatusBar barStyle="light-content" />
        <GlobalHeader />
        <View style={styles.centered}>
          <LoadingSpinner message="Getting your location..." />
        </View>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container} testID="home-screen">
      <StatusBar barStyle="light-content" />
      {/* Global Header */}
      <GlobalHeader />
      <FloatingActionButtons testID="home-floating-actions" />

      {/* Full-screen Map */}
      <View style={styles.mapContainer} testID="home-map-container">
        <MapView
          showsUserLocation
          initialRegion={initialRegion}
          markers={favoriteMarkers}
          mapPadding={{ bottom: 120 }}
          onMapReady={() => lightFeedback()}
          onMarkerPress={handleMarkerPress}
          onPoiClick={handlePoiClick}
        />
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
  mapContainer: {
    flex: 1,
  },
})

export default HomeScreen
