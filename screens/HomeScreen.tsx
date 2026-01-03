/**
 * HomeScreen - Main home screen with map and favorites
 */
import React, { useState, useCallback, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useLocation } from '../hooks/useLocation'
import { useFavoriteLocations, type FavoriteLocationWithDistance } from '../hooks/useFavoriteLocations'
import { MapView, createRegion, createMarker, type MapMarker, type PoiData } from '../components/MapView'
import { selectionFeedback, lightFeedback } from '../lib/haptics'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Button, OutlineButton } from '../components/Button'
import { FavoritesList } from '../components/favorites/FavoritesList'
import { AddFavoriteModal, type AddFavoriteLocationData } from '../components/favorites/AddFavoriteModal'
import type { MainTabNavigationProp } from '../navigation/types'

// ============================================================================
// Constants
// ============================================================================

const FAVORITES_COLLAPSED_KEY = '@homescreen:favorites_collapsed'

// ============================================================================
// HomeScreen Component
// ============================================================================

export function HomeScreen(): React.ReactNode {
  const navigation = useNavigation<MainTabNavigationProp>()
  const { latitude, longitude, loading: locationLoading, error: locationError, refresh: refreshLocation } = useLocation()

  const userCoordinates = latitude && longitude ? { latitude, longitude } : null

  const {
    favorites,
    isLoading: favoritesLoading,
    error: favoritesError,
    addFavorite,
    removeFavorite,
    updateFavorite,
    refetch: refetchFavorites,
  } = useFavoriteLocations({ userCoordinates })

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [selectedFavorite, setSelectedFavorite] = useState<FavoriteLocationWithDistance | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalLocation, setAddModalLocation] = useState<AddFavoriteLocationData | null>(null)
  const [isAddingFavorite, setIsAddingFavorite] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [isFavoritesExpanded, setIsFavoritesExpanded] = useState(true)

  // Load persisted collapsed state on mount
  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_COLLAPSED_KEY).then((value) => {
      if (value !== null) {
        setIsFavoritesExpanded(value !== 'true')
      }
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Map Configuration
  // ---------------------------------------------------------------------------

  const initialRegion = userCoordinates
    ? createRegion(userCoordinates, 'medium')
    : undefined

  // Create markers for favorites
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

  const handleSelectFavorite = useCallback((favorite: FavoriteLocationWithDistance) => {
    selectionFeedback()
    setSelectedFavorite(favorite)
  }, [navigation])

  const handlePostHere = useCallback((favorite: FavoriteLocationWithDistance) => {
    selectionFeedback()
    // Navigate to create post with this location
    navigation.navigate('CreatePost', { locationId: favorite.place_id ?? undefined })
  }, [navigation])

  const handleBrowse = useCallback((favorite: FavoriteLocationWithDistance) => {
    selectionFeedback()
    // Navigate to ledger filtered by this location
    navigation.navigate('Ledger', { locationId: favorite.place_id ?? '', locationName: favorite.place_name })
  }, [navigation])

  const handleUpdateFavorite = useCallback(async (favoriteId: string, customName: string) => {
    const result = await updateFavorite(favoriteId, { custom_name: customName })
    return {
      success: result.success,
      error: result.error ?? undefined,
    }
  }, [updateFavorite])

  const handleRemoveFavorite = useCallback(async (favoriteId: string) => {
    const result = await removeFavorite(favoriteId)
    return {
      success: result.success,
      error: result.error ?? undefined,
    }
  }, [removeFavorite])

  const handleAddFavoriteFromMap = useCallback(() => {
    if (!userCoordinates) return

    // For now, use current location as the location to add
    setAddModalLocation({
      placeName: 'Current Location',
      address: null,
      latitude: userCoordinates.latitude,
      longitude: userCoordinates.longitude,
    })
    setShowAddModal(true)
  }, [userCoordinates])

  const handlePoiClick = useCallback((poi: PoiData) => {
    selectionFeedback()
    // Navigate to posts for this POI location
    navigation.navigate('Ledger', {
      locationId: poi.placeId ?? '',
      locationName: poi.name,
    })
  }, [navigation])

  const toggleFavoritesExpanded = useCallback(() => {
    selectionFeedback()
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsFavoritesExpanded(prev => {
      const newValue = !prev
      // Persist the collapsed state
      AsyncStorage.setItem(FAVORITES_COLLAPSED_KEY, (!newValue).toString())
      return newValue
    })
  }, [])

  const handleSaveNewFavorite = useCallback(async (customName: string) => {
    if (!addModalLocation) return

    setIsAddingFavorite(true)
    setAddError(null)

    const result = await addFavorite({
      custom_name: customName,
      place_name: addModalLocation.placeName,
      latitude: addModalLocation.latitude,
      longitude: addModalLocation.longitude,
      address: addModalLocation.address,
      place_id: addModalLocation.placeId,
    })

    setIsAddingFavorite(false)

    if (result.success) {
      setShowAddModal(false)
      setAddModalLocation(null)
    } else {
      setAddError(result.error ?? 'Failed to add favorite')
    }
  }, [addModalLocation, addFavorite])

  const handleCancelAddFavorite = useCallback(() => {
    setShowAddModal(false)
    setAddModalLocation(null)
    setAddError(null)
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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Map Section */}
      <View style={styles.mapContainer}>
        <MapView
          showsUserLocation
          initialRegion={initialRegion}
          markers={favoriteMarkers}
          onMapReady={() => lightFeedback()}
          onMarkerPress={(marker) => {
            const fav = favorites.find(f => f.id === marker.id)
            if (fav) handleSelectFavorite(fav)
          }}
          onPoiClick={handlePoiClick}
        />

        {/* Map Overlay with Add Button */}
        <View style={styles.mapOverlay}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddFavoriteFromMap}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>+ Add Favorite</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Favorites Section */}
      <View style={[styles.favoritesContainer, !isFavoritesExpanded && styles.favoritesCollapsed]}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={toggleFavoritesExpanded}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Your Favorites, ${favorites.length} items, ${isFavoritesExpanded ? 'expanded' : 'collapsed'}`}
          accessibilityHint="Double tap to toggle favorites list"
        >
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>Your Favorites</Text>
            {favorites.length > 0 && (
              <View style={styles.sectionCountBadge}>
                <Text style={styles.sectionCount}>{favorites.length}</Text>
              </View>
            )}
          </View>
          <View style={styles.expandIconContainer}>
            <Ionicons
              name={isFavoritesExpanded ? 'chevron-down' : 'chevron-up'}
              size={20}
              color="#8E8E93"
            />
          </View>
        </TouchableOpacity>

        {isFavoritesExpanded && <FavoritesList
          favorites={favorites}
          isLoading={favoritesLoading}
          error={favoritesError?.message}
          selectedFavoriteId={selectedFavorite?.id}
          onSelect={handleSelectFavorite}
          onPostHere={handlePostHere}
          onBrowse={handleBrowse}
          onUpdateFavorite={handleUpdateFavorite}
          onRemoveFavorite={handleRemoveFavorite}
          onRefresh={refetchFavorites}
          onAddFavorite={handleAddFavoriteFromMap}
          emptyTitle="No Favorites Yet"
          emptyMessage="Add your favorite spots for quick access to posting and browsing missed connections."
          style={styles.favoritesList}
        />}
      </View>

      {/* Add Favorite Modal */}
      <AddFavoriteModal
        visible={showAddModal}
        location={addModalLocation}
        onSave={handleSaveNewFavorite}
        onCancel={handleCancelAddFavorite}
        isLoading={isAddingFavorite}
        error={addError}
      />
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
    height: 325,
    position: 'relative',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  addButton: {
    backgroundColor: '#FF6B47',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  favoritesContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  favoritesCollapsed: {
    flex: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    // Add subtle shadow for visual separation from map
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expandIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1917',
  },
  sectionCountBadge: {
    backgroundColor: '#FF6B47',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  favoritesList: {
    flex: 1,
  },
})

export default HomeScreen
