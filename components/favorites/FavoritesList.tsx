/**
 * FavoritesList Component
 *
 * Renders a scrollable list of user's favorite locations with:
 * - Custom names and place names displayed
 * - Distance badges when user coordinates are available
 * - Loading and error states
 * - Empty state when no favorites exist
 * - Selection callback for quick actions
 * - Pull-to-refresh functionality
 * - Built-in edit/delete modal for managing favorites
 *
 * The component uses FlatList for efficient rendering with large lists
 * and memoization to prevent unnecessary re-renders.
 *
 * Long-press on a favorite item will trigger the edit/delete actions
 * when onUpdateFavorite and onRemoveFavorite are provided.
 *
 * @module components/favorites/FavoritesList
 *
 * @example
 * ```tsx
 * // Basic usage
 * <FavoritesList
 *   favorites={favorites}
 *   onSelect={(favorite) => handleSelectFavorite(favorite)}
 * />
 *
 * @example
 * // With loading and error states
 * <FavoritesList
 *   favorites={favorites}
 *   isLoading={isLoading}
 *   error={error}
 *   onRetry={refetch}
 *   onSelect={handleSelectFavorite}
 * />
 *
 * @example
 * // With quick action callbacks
 * <FavoritesList
 *   favorites={favorites}
 *   onSelect={handleSelect}
 *   onPostHere={handlePostHere}
 *   onBrowse={handleBrowse}
 * />
 *
 * @example
 * // With built-in edit/delete functionality (uses EditFavoriteModal)
 * <FavoritesList
 *   favorites={favorites}
 *   onSelect={handleSelect}
 *   onPostHere={handlePostHere}
 *   onBrowse={handleBrowse}
 *   onUpdateFavorite={async (id, name) => {
 *     const result = await updateFavorite(id, { custom_name: name })
 *     return result
 *   }}
 *   onRemoveFavorite={async (id) => {
 *     const result = await removeFavorite(id)
 *     return result
 *   }}
 * />
 *
 * @example
 * // With external edit/delete handlers (e.g., for custom modals)
 * <FavoritesList
 *   favorites={favorites}
 *   onEdit={(favorite) => openCustomEditModal(favorite)}
 *   onDelete={(favorite) => showDeleteConfirmation(favorite)}
 * />
 * ```
 */

import React, { memo, useCallback, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  RefreshControl,
} from 'react-native'

import { LoadingSpinner } from '../LoadingSpinner'
import { EmptyState, ErrorState } from '../EmptyState'
import { EditFavoriteModal } from './EditFavoriteModal'
import { selectionFeedback } from '../../lib/haptics'
import type { FavoriteLocationWithDistance } from '../../hooks/useFavoriteLocations'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the FavoritesList component
 */
export interface FavoritesListProps {
  /** Array of favorite locations to display */
  favorites: FavoriteLocationWithDistance[]
  /** Whether favorites are loading */
  isLoading?: boolean
  /** Whether a refresh is in progress */
  isRefreshing?: boolean
  /** Error message to display */
  error?: string | null
  /** Currently selected favorite ID */
  selectedFavoriteId?: string | null
  /** Callback when a favorite is selected */
  onSelect?: (favorite: FavoriteLocationWithDistance) => void
  /** Callback for "Post Here" action on a favorite */
  onPostHere?: (favorite: FavoriteLocationWithDistance) => void
  /** Callback for "Browse" action on a favorite */
  onBrowse?: (favorite: FavoriteLocationWithDistance) => void
  /** Callback for "Edit" action on a favorite */
  onEdit?: (favorite: FavoriteLocationWithDistance) => void
  /** Callback for "Delete" action on a favorite */
  onDelete?: (favorite: FavoriteLocationWithDistance) => void
  /**
   * Callback to update a favorite's custom name
   * If not provided, the built-in EditFavoriteModal will be shown on edit action
   */
  onUpdateFavorite?: (
    favoriteId: string,
    customName: string
  ) => Promise<{ success: boolean; error?: string }>
  /**
   * Callback to remove a favorite
   * Used by the built-in EditFavoriteModal for delete confirmation
   */
  onRemoveFavorite?: (
    favoriteId: string
  ) => Promise<{ success: boolean; error?: string }>
  /** Callback to retry after error */
  onRetry?: () => void
  /** Callback for pull-to-refresh */
  onRefresh?: () => void
  /** Callback when user wants to add first favorite */
  onAddFavorite?: () => void
  /** Empty state title */
  emptyTitle?: string
  /** Empty state message */
  emptyMessage?: string
  /** Custom container style */
  style?: StyleProp<ViewStyle>
  /** Custom list style */
  listStyle?: StyleProp<ViewStyle>
  /** Test ID for testing purposes */
  testID?: string
}

/**
 * Props for individual favorite list item
 */
interface FavoriteListItemProps {
  favorite: FavoriteLocationWithDistance
  selected: boolean
  onPress: () => void
  onPostHere?: () => void
  onBrowse?: () => void
  onEdit?: () => void
  onDelete?: () => void
  showActions: boolean
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * iOS-style colors (matching LocationPicker)
 */
const COLORS = {
  primary: '#007AFF',
  secondary: '#8E8E93',
  background: '#F2F2F7',
  cardBackground: '#FFFFFF',
  border: '#E5E5EA',
  text: '#000000',
  textSecondary: '#8E8E93',
  selectedBackground: '#E3F2FF',
  danger: '#FF3B30',
  heart: '#FF2D55',
} as const

/**
 * Default props
 */
const DEFAULT_PROPS = {
  emptyTitle: 'No Favorites Yet',
  emptyMessage: 'Save your favorite locations for quick access to posting and browsing.',
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format distance for display
 *
 * @param meters - Distance in meters (or null if unavailable)
 * @returns Formatted distance string
 */
function formatDistance(meters: number | null): string | null {
  if (meters === null) return null

  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  const km = meters / 1000
  if (km < 10) {
    return `${km.toFixed(1)} km`
  }
  return `${Math.round(km)} km`
}

/**
 * Format address for display
 *
 * @param address - Full address string (or null)
 * @returns Truncated address or placeholder
 */
function formatAddress(address: string | null | undefined): string {
  if (!address) return 'Address unavailable'
  // Truncate long addresses
  if (address.length > 50) {
    return `${address.substring(0, 47)}...`
  }
  return address
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Individual favorite list item
 */
function FavoriteListItemComponent({
  favorite,
  selected,
  onPress,
  onPostHere,
  onBrowse,
  onEdit,
  onDelete,
  showActions,
  testID,
}: FavoriteListItemProps): JSX.Element {
  const distanceText = formatDistance(favorite.distance_meters)
  const hasEditDeleteActions = Boolean(onEdit || onDelete)

  const handlePress = useCallback(() => {
    selectionFeedback()
    onPress()
  }, [onPress])

  const handleLongPress = useCallback(() => {
    if (onEdit) {
      selectionFeedback()
      onEdit()
    }
  }, [onEdit])

  const handlePostHere = useCallback(() => {
    selectionFeedback()
    onPostHere?.()
  }, [onPostHere])

  const handleBrowse = useCallback(() => {
    selectionFeedback()
    onBrowse?.()
  }, [onBrowse])

  return (
    <TouchableOpacity
      style={[
        styles.favoriteItem,
        selected && styles.favoriteItemSelected,
      ]}
      onPress={handlePress}
      onLongPress={hasEditDeleteActions ? handleLongPress : undefined}
      delayLongPress={500}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${favorite.custom_name}, ${favorite.place_name}${distanceText ? `, ${distanceText} away` : ''}${hasEditDeleteActions ? '. Long press to edit or delete.' : ''}`}
      accessibilityState={{ selected }}
      testID={testID}
    >
      {/* Favorite icon */}
      <View style={styles.favoriteIcon}>
        <Text style={styles.favoriteIconText}>
          {selected ? '❤️' : '📍'}
        </Text>
      </View>

      {/* Favorite details */}
      <View style={styles.favoriteDetails}>
        {/* Custom name (user-defined label) */}
        <View style={styles.nameRow}>
          <Text
            style={[
              styles.customName,
              selected && styles.customNameSelected,
            ]}
            numberOfLines={1}
          >
            {favorite.custom_name}
          </Text>
          {/* Distance badge */}
          {distanceText != null && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceBadgeText}>{distanceText}</Text>
            </View>
          )}
        </View>

        {/* Place name (actual venue name) */}
        <Text style={styles.placeName} numberOfLines={1}>
          {favorite.place_name}
        </Text>

        {/* Address */}
        <Text style={styles.address} numberOfLines={1}>
          {formatAddress(favorite.address)}
        </Text>

        {/* Quick action buttons (shown when selected or always if showActions) */}
        {(selected || showActions) && (onPostHere || onBrowse) && (
          <View style={styles.actionButtons}>
            {onPostHere && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handlePostHere}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Post at ${favorite.custom_name}`}
                testID={`${testID}-post-here`}
              >
                <Text style={styles.actionButtonIcon}>✏️</Text>
                <Text style={styles.actionButtonText}>Post Here</Text>
              </TouchableOpacity>
            )}
            {onBrowse && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleBrowse}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Browse posts at ${favorite.custom_name}`}
                testID={`${testID}-browse`}
              >
                <Text style={styles.actionButtonIcon}>🔍</Text>
                <Text style={styles.actionButtonText}>Browse</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Selection indicator */}
      {selected && (
        <View style={styles.selectedIndicator}>
          <Text style={styles.selectedIndicatorText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

/**
 * Memoized FavoriteListItem for performance
 */
const FavoriteListItem = memo(FavoriteListItemComponent)

/**
 * Empty state for favorites list
 */
function EmptyFavorites({
  title,
  message,
  onAddFavorite,
  testID,
}: {
  title: string
  message: string
  onAddFavorite?: () => void
  testID?: string
}): JSX.Element {
  return (
    <EmptyState
      icon="⭐"
      title={title}
      message={message}
      action={
        onAddFavorite
          ? {
              label: 'Add Favorite',
              onPress: onAddFavorite,
            }
          : undefined
      }
      testID={testID}
    />
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * FavoritesList renders a scrollable list of user's favorite locations
 *
 * @param favorites - Array of favorites to display
 * @param isLoading - Whether favorites are loading
 * @param isRefreshing - Whether a refresh is in progress
 * @param error - Error message to display
 * @param selectedFavoriteId - Currently selected favorite ID
 * @param onSelect - Callback when a favorite is selected
 * @param onPostHere - Callback for "Post Here" action
 * @param onBrowse - Callback for "Browse" action
 * @param onEdit - Callback for "Edit" action
 * @param onRetry - Callback to retry after error
 * @param onRefresh - Callback for pull-to-refresh
 * @param onAddFavorite - Callback when user wants to add first favorite
 * @param emptyTitle - Empty state title
 * @param emptyMessage - Empty state message
 * @param style - Custom container style
 * @param listStyle - Custom list style
 * @param testID - Test ID for testing purposes
 */
function FavoritesListComponent({
  favorites,
  isLoading = false,
  isRefreshing = false,
  error = null,
  selectedFavoriteId = null,
  onSelect,
  onPostHere,
  onBrowse,
  onEdit,
  onDelete,
  onUpdateFavorite,
  onRemoveFavorite,
  onRetry,
  onRefresh,
  onAddFavorite,
  emptyTitle = DEFAULT_PROPS.emptyTitle,
  emptyMessage = DEFAULT_PROPS.emptyMessage,
  style,
  listStyle,
  testID = 'favorites-list',
}: FavoritesListProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /**
   * Currently selected favorite for editing
   */
  const [editingFavorite, setEditingFavorite] =
    useState<FavoriteLocationWithDistance | null>(null)

  /**
   * Whether the edit modal is visible
   */
  const [isEditModalVisible, setIsEditModalVisible] = useState(false)

  /**
   * Error from edit/delete operations
   */
  const [editError, setEditError] = useState<string | null>(null)

  /**
   * Whether an edit/delete operation is in progress
   */
  const [isEditLoading, setIsEditLoading] = useState(false)

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle favorite selection
   */
  const handleSelect = useCallback(
    (favorite: FavoriteLocationWithDistance) => {
      onSelect?.(favorite)
    },
    [onSelect]
  )

  /**
   * Handle "Post Here" action
   */
  const handlePostHere = useCallback(
    (favorite: FavoriteLocationWithDistance) => {
      onPostHere?.(favorite)
    },
    [onPostHere]
  )

  /**
   * Handle "Browse" action
   */
  const handleBrowse = useCallback(
    (favorite: FavoriteLocationWithDistance) => {
      onBrowse?.(favorite)
    },
    [onBrowse]
  )

  /**
   * Handle "Edit" action - opens the edit modal
   */
  const handleEdit = useCallback(
    (favorite: FavoriteLocationWithDistance) => {
      // If external onEdit handler is provided, use that instead
      if (onEdit) {
        onEdit(favorite)
        return
      }

      // Otherwise, use the built-in edit modal
      setEditingFavorite(favorite)
      setEditError(null)
      setIsEditModalVisible(true)
    },
    [onEdit]
  )

  /**
   * Handle "Delete" action - opens edit modal in delete mode
   */
  const handleDelete = useCallback(
    (favorite: FavoriteLocationWithDistance) => {
      // If external onDelete handler is provided, use that instead
      if (onDelete) {
        onDelete(favorite)
        return
      }

      // Otherwise, use the built-in edit modal (which has delete confirmation)
      setEditingFavorite(favorite)
      setEditError(null)
      setIsEditModalVisible(true)
    },
    [onDelete]
  )

  /**
   * Handle saving changes from the edit modal (rename)
   */
  const handleEditSave = useCallback(
    async (customName: string) => {
      if (!editingFavorite || !onUpdateFavorite) {
        setEditError('Unable to save changes')
        return
      }

      setIsEditLoading(true)
      setEditError(null)

      try {
        const result = await onUpdateFavorite(editingFavorite.id, customName)

        if (result.success) {
          setIsEditModalVisible(false)
          setEditingFavorite(null)
        } else {
          setEditError(result.error || 'Failed to update favorite')
        }
      } catch (err) {
        setEditError('An unexpected error occurred')
      } finally {
        setIsEditLoading(false)
      }
    },
    [editingFavorite, onUpdateFavorite]
  )

  /**
   * Handle delete confirmation from the edit modal
   */
  const handleEditDelete = useCallback(async () => {
    if (!editingFavorite || !onRemoveFavorite) {
      setEditError('Unable to delete favorite')
      return
    }

    setIsEditLoading(true)
    setEditError(null)

    try {
      const result = await onRemoveFavorite(editingFavorite.id)

      if (result.success) {
        setIsEditModalVisible(false)
        setEditingFavorite(null)
      } else {
        setEditError(result.error || 'Failed to remove favorite')
      }
    } catch (err) {
      setEditError('An unexpected error occurred')
    } finally {
      setIsEditLoading(false)
    }
  }, [editingFavorite, onRemoveFavorite])

  /**
   * Handle cancel from the edit modal
   */
  const handleEditCancel = useCallback(() => {
    setIsEditModalVisible(false)
    setEditingFavorite(null)
    setEditError(null)
  }, [])

  // ---------------------------------------------------------------------------
  // COMPUTED DATA
  // ---------------------------------------------------------------------------

  /**
   * Whether to show quick action buttons on all items
   * Show actions on all items if no selection callback is provided
   */
  const showActionsOnAll = !onSelect && (!!onPostHere || !!onBrowse)

  /**
   * Whether edit/delete actions are available
   * Either through external handlers or built-in modal
   */
  const hasEditDeleteCapability =
    !!onEdit || !!onDelete || (!!onUpdateFavorite && !!onRemoveFavorite)

  // ---------------------------------------------------------------------------
  // RENDER: LOADING STATE
  // ---------------------------------------------------------------------------

  if (isLoading && favorites.length === 0) {
    return (
      <View
        style={[styles.container, styles.centered, style]}
        testID={`${testID}-loading`}
      >
        <LoadingSpinner message="Loading favorites..." />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: ERROR STATE
  // ---------------------------------------------------------------------------

  if (error && favorites.length === 0) {
    return (
      <View style={[styles.container, style]} testID={`${testID}-error`}>
        <ErrorState
          error={error}
          onRetry={onRetry}
          testID={`${testID}-error-state`}
        />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: EMPTY STATE
  // ---------------------------------------------------------------------------

  if (!isLoading && favorites.length === 0) {
    return (
      <View style={[styles.container, style]} testID={`${testID}-empty`}>
        <EmptyFavorites
          title={emptyTitle}
          message={emptyMessage}
          onAddFavorite={onAddFavorite}
          testID={`${testID}-empty-state`}
        />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: FAVORITES LIST
  // ---------------------------------------------------------------------------

  /**
   * Render individual favorite item
   */
  const renderItem = ({ item }: { item: FavoriteLocationWithDistance }) => (
    <FavoriteListItem
      favorite={item}
      selected={item.id === selectedFavoriteId}
      onPress={() => handleSelect(item)}
      onPostHere={onPostHere ? () => handlePostHere(item) : undefined}
      onBrowse={onBrowse ? () => handleBrowse(item) : undefined}
      onEdit={hasEditDeleteCapability ? () => handleEdit(item) : undefined}
      onDelete={hasEditDeleteCapability ? () => handleDelete(item) : undefined}
      showActions={showActionsOnAll}
      testID={`${testID}-item-${item.id}`}
    />
  )

  /**
   * Key extractor for FlatList
   */
  const keyExtractor = (item: FavoriteLocationWithDistance) => item.id

  /**
   * Item separator
   */
  const ItemSeparator = () => <View style={styles.separator} />

  /**
   * List header (optional - shows count)
   */
  const ListHeader = favorites.length > 0 ? (
    <View style={styles.listHeader}>
      <Text style={styles.listHeaderText}>
        {favorites.length} {favorites.length === 1 ? 'Favorite' : 'Favorites'}
      </Text>
    </View>
  ) : null

  /**
   * Refresh control for pull-to-refresh
   */
  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      tintColor={COLORS.primary}
      colors={[COLORS.primary]}
    />
  ) : undefined

  // ---------------------------------------------------------------------------
  // RENDER: MAIN
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.container, style]} testID={testID}>
      <FlatList
        style={listStyle}
        data={favorites}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={ItemSeparator}
        ListHeaderComponent={ListHeader}
        refreshControl={refreshControl}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        testID={`${testID}-flatlist`}
      />

      {/* Edit Favorite Modal */}
      {onUpdateFavorite && onRemoveFavorite && (
        <EditFavoriteModal
          visible={isEditModalVisible}
          favorite={editingFavorite}
          onSave={handleEditSave}
          onDelete={handleEditDelete}
          onCancel={handleEditCancel}
          isLoading={isEditLoading}
          error={editError}
          testID={`${testID}-edit-modal`}
        />
      )}
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  listContent: {
    paddingBottom: 16,
  },

  // List header
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },

  listHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Favorite item
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.cardBackground,
  },

  favoriteItemSelected: {
    backgroundColor: COLORS.selectedBackground,
  },

  favoriteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
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

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },

  customName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },

  customNameSelected: {
    color: COLORS.primary,
  },

  placeName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },

  address: {
    fontSize: 12,
    color: COLORS.secondary,
  },

  // Distance badge
  distanceBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    flexShrink: 0,
  },

  distanceBadgeText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
  },

  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 12,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },

  actionButtonIcon: {
    fontSize: 12,
  },

  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },

  // Selection indicator
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  selectedIndicatorText: {
    fontSize: 14,
    color: COLORS.cardBackground,
    fontWeight: 'bold',
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 68, // Align with content after icon
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Memoized FavoritesList for performance optimization
 * Only re-renders when props change
 */
export const FavoritesList = memo(FavoritesListComponent)

export default FavoritesList
