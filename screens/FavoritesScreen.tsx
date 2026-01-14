/**
 * FavoritesScreen - Dedicated screen for managing favorite locations
 */
import React, { useState, useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useLocation } from '../hooks/useLocation'
import { useFavoriteLocations, type FavoriteLocationWithDistance } from '../hooks/useFavoriteLocations'
import { selectionFeedback } from '../lib/haptics'
import { FavoritesList } from '../components/favorites/FavoritesList'
import { AddFavoriteModal, type AddFavoriteLocationData } from '../components/favorites/AddFavoriteModal'
import type { MainStackNavigationProp } from '../navigation/types'

// ============================================================================
// FavoritesScreen Component
// ============================================================================

export function FavoritesScreen(): React.ReactNode {
  const navigation = useNavigation<MainStackNavigationProp>()
  const { latitude, longitude } = useLocation()

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

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSelectFavorite = useCallback((favorite: FavoriteLocationWithDistance) => {
    selectionFeedback()
    setSelectedFavorite(favorite)
  }, [])

  const handlePostHere = useCallback((favorite: FavoriteLocationWithDistance) => {
    selectionFeedback()
    navigation.navigate('CreatePost', { locationId: favorite.place_id ?? undefined })
  }, [navigation])

  const handleBrowse = useCallback((favorite: FavoriteLocationWithDistance) => {
    selectionFeedback()
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

  const handleAddFavorite = useCallback(() => {
    if (!userCoordinates) return

    setAddModalLocation({
      placeName: 'Current Location',
      address: null,
      latitude: userCoordinates.latitude,
      longitude: userCoordinates.longitude,
    })
    setShowAddModal(true)
  }, [userCoordinates])

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
  }, [])

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchFavorites()
    }, [refetchFavorites])
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']} testID="favorites-screen">
      <View style={styles.content}>
        <FavoritesList
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
          onAddFavorite={handleAddFavorite}
          emptyTitle="No Favorites Yet"
          emptyMessage="Add your favorite spots for quick access to posting and browsing missed connections."
          style={styles.favoritesList}
        />
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
  content: {
    flex: 1,
  },
  favoritesList: {
    flex: 1,
  },
})

export default FavoritesScreen
