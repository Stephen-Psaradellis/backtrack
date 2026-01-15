/**
 * FavoritesModal Component
 *
 * A modal dialog displaying the user's favorite locations for quick selection.
 * Supports selection, edit/delete via long-press, and empty state handling.
 *
 * Features:
 * - Display list of favorite locations
 * - Tap to select and close
 * - Long-press for edit/delete actions
 * - Empty state when no favorites exist
 * - Loading and error states
 * - Accessible with proper labels
 *
 * @module components/modals/FavoritesModal
 *
 * @example
 * ```tsx
 * import { FavoritesModal } from 'components/modals/FavoritesModal'
 *
 * <FavoritesModal
 *   visible={showFavorites}
 *   onClose={() => setShowFavorites(false)}
 *   onSelectLocation={(location) => handleSelectLocation(location)}
 * />
 * ```
 */

import React, { memo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native'

import { useFavoriteLocations } from '../../hooks/useFavoriteLocations'
import { LoadingSpinner } from '../LoadingSpinner'
import { selectionFeedback, lightFeedback } from '../../lib/haptics'
import type { Location } from '../../types/database'
import type { FavoriteLocationWithDistance } from '../../hooks/useFavoriteLocations'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the FavoritesModal component
 */
export interface FavoritesModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean

  /**
   * Callback when modal is closed
   */
  onClose: () => void

  /**
   * Callback when a location is selected
   */
  onSelectLocation: (location: Location) => void

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Colors used in the FavoritesModal component
 */
const COLORS = {
  primary: '#FF6B47',
  background: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  border: '#E5E5EA',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  danger: '#FF3B30',
  cardBackground: '#F9F9F9',
  locationBackground: '#F2F2F7',
} as const

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Individual favorite list item
 */
interface FavoriteItemProps {
  favorite: FavoriteLocationWithDistance
  onPress: () => void
  onLongPress: () => void
  testID?: string
}

const FavoriteItem = memo(function FavoriteItem({
  favorite,
  onPress,
  onLongPress,
  testID,
}: FavoriteItemProps): JSX.Element {
  const handlePress = useCallback(async () => {
    await selectionFeedback()
    onPress()
  }, [onPress])

  const handleLongPress = useCallback(async () => {
    await selectionFeedback()
    onLongPress()
  }, [onLongPress])

  return (
    <TouchableOpacity
      style={styles.favoriteItem}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${favorite.custom_name}, ${favorite.place_name}. Long press to edit or delete.`}
      testID={testID}
    >
      <View style={styles.favoriteIcon}>
        <Text style={styles.favoriteIconText}>{'📍'}</Text>
      </View>
      <View style={styles.favoriteDetails}>
        <Text style={styles.customName} numberOfLines={1}>
          {favorite.custom_name}
        </Text>
        <Text style={styles.placeName} numberOfLines={1}>
          {favorite.place_name}
        </Text>
        {favorite.address && (
          <Text style={styles.address} numberOfLines={1}>
            {favorite.address}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )
})

/**
 * Empty state for favorites
 */
function EmptyFavorites({ testID }: { testID?: string }): JSX.Element {
  return (
    <View style={styles.emptyContainer} testID={testID}>
      <Text style={styles.emptyIcon}>{'⭐'}</Text>
      <Text style={styles.emptyTitle}>No favorites yet</Text>
      <Text style={styles.emptyMessage}>
        Save your frequently visited spots for quick access
      </Text>
    </View>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * FavoritesModal - A modal for viewing and selecting favorite locations
 */
export const FavoritesModal = memo(function FavoritesModal({
  visible,
  onClose,
  onSelectLocation,
  testID = 'favorites-modal',
}: FavoritesModalProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const {
    favorites,
    isLoading,
    error,
    removeFavorite,
    updateFavorite,
    refetch,
  } = useFavoriteLocations()

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle close button press
   */
  const handleClose = useCallback(async () => {
    await lightFeedback()
    onClose()
  }, [onClose])

  /**
   * Handle favorite selection - convert to Location type
   */
  const handleSelectFavorite = useCallback(
    (favorite: FavoriteLocationWithDistance) => {
      // Convert FavoriteLocation to Location type for the callback
      const location: Location = {
        id: favorite.id,
        google_place_id: favorite.place_id || '',
        name: favorite.place_name,
        address: favorite.address,
        latitude: favorite.latitude,
        longitude: favorite.longitude,
        place_types: [],
        post_count: 0,
        created_at: favorite.created_at,
      }
      onSelectLocation(location)
      onClose()
    },
    [onSelectLocation, onClose]
  )

  /**
   * Handle long press on a favorite - show edit/delete options
   */
  const handleLongPressFavorite = useCallback(
    (favorite: FavoriteLocationWithDistance) => {
      Alert.alert(
        favorite.custom_name,
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Rename',
            onPress: () => {
              Alert.prompt(
                'Rename Favorite',
                'Enter a new name for this favorite:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Save',
                    onPress: async (newName?: string) => {
                      if (newName && newName.trim()) {
                        const result = await updateFavorite(favorite.id, {
                          custom_name: newName.trim(),
                        })
                        if (!result.success) {
                          Alert.alert('Error', result.error || 'Failed to rename favorite')
                        }
                      }
                    },
                  },
                ],
                'plain-text',
                favorite.custom_name
              )
            },
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Delete Favorite',
                `Are you sure you want to remove "${favorite.custom_name}" from your favorites?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      const result = await removeFavorite(favorite.id)
                      if (!result.success) {
                        Alert.alert('Error', result.error || 'Failed to remove favorite')
                      }
                    },
                  },
                ]
              )
            },
          },
        ]
      )
    },
    [updateFavorite, removeFavorite]
  )

  /**
   * Handle overlay press (close modal)
   */
  const handleOverlayPress = useCallback(() => {
    handleClose()
  }, [handleClose])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  /**
   * Render individual favorite item
   */
  const renderItem = useCallback(
    ({ item }: { item: FavoriteLocationWithDistance }) => (
      <FavoriteItem
        favorite={item}
        onPress={() => handleSelectFavorite(item)}
        onLongPress={() => handleLongPressFavorite(item)}
        testID={`${testID}-item-${item.id}`}
      />
    ),
    [handleSelectFavorite, handleLongPressFavorite, testID]
  )

  /**
   * Key extractor for FlatList
   */
  const keyExtractor = useCallback(
    (item: FavoriteLocationWithDistance) => item.id,
    []
  )

  /**
   * Item separator
   */
  const ItemSeparator = useCallback(
    () => <View style={styles.separator} />,
    []
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      testID={testID}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleOverlayPress}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => {}} // Prevent closing when tapping inside
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title} testID={`${testID}-title`}>
                Favorites
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                testID={`${testID}-close`}
                accessibilityLabel="Close favorites"
                accessibilityRole="button"
              >
                <Text style={styles.closeButtonText}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {isLoading ? (
                <View style={styles.loadingContainer} testID={`${testID}-loading`}>
                  <LoadingSpinner message="Loading favorites..." />
                </View>
              ) : error ? (
                <View style={styles.errorContainer} testID={`${testID}-error`}>
                  <Text style={styles.errorText}>{error.message}</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={refetch}
                    testID={`${testID}-retry`}
                  >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : favorites.length === 0 ? (
                <EmptyFavorites testID={`${testID}-empty`} />
              ) : (
                <FlatList
                  data={favorites}
                  renderItem={renderItem}
                  keyExtractor={keyExtractor}
                  ItemSeparatorComponent={ItemSeparator}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={true}
                  testID={`${testID}-list`}
                />
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Modal>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Overlay styles
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  // Modal container styles
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    maxHeight: '80%',
    minHeight: 300,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
    borderRadius: 6,
  },
  closeButtonText: {
    fontSize: 24,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },

  // Content styles
  content: {
    flex: 1,
    minHeight: 200,
  },
  listContent: {
    paddingVertical: 8,
  },

  // Favorite item styles
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  favoriteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.locationBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  favoriteIconText: {
    fontSize: 20,
  },
  favoriteDetails: {
    flex: 1,
  },
  customName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  placeName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  address: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 68,
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
})

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default FavoritesModal
