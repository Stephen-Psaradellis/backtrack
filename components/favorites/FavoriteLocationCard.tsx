/**
 * FavoriteLocationCard Component
 *
 * Displays a user's favorite location with custom name, place name, address,
 * and distance. Provides quick action buttons for "Post Here" and "Browse"
 * operations.
 *
 * Features:
 * - Shows custom name (user-defined label) prominently
 * - Displays actual place name and address
 * - Distance badge when user coordinates are available
 * - "Post Here" button for quick post creation
 * - "Browse" button for viewing posts at the location
 * - Optional edit functionality on long press
 * - Compact mode for denser list displays
 * - Memoized for performance in FlatList
 *
 * @module components/favorites/FavoriteLocationCard
 *
 * @example
 * ```tsx
 * import { FavoriteLocationCard } from 'components/favorites/FavoriteLocationCard'
 *
 * // Basic usage
 * <FavoriteLocationCard
 *   favorite={favorite}
 *   onPress={(fav) => handleSelect(fav)}
 * />
 *
 * // With quick actions
 * <FavoriteLocationCard
 *   favorite={favorite}
 *   onPostHere={(fav) => navigateToCreatePost(fav)}
 *   onBrowse={(fav) => navigateToLedger(fav)}
 * />
 *
 * // With edit/delete actions (long-press to show menu)
 * <FavoriteLocationCard
 *   favorite={favorite}
 *   onPress={(fav) => handleSelect(fav)}
 *   onEdit={(fav) => openEditModal(fav)}
 *   onDelete={(fav) => handleDelete(fav)}
 * />
 *
 * // Selected state with custom long press handler
 * <FavoriteLocationCard
 *   favorite={favorite}
 *   selected={true}
 *   onPress={handlePress}
 *   onLongPress={(fav) => showCustomMenu(fav)}
 * />
 *
 * // Compact mode for dense lists
 * <FavoriteLocationCard
 *   favorite={favorite}
 *   compact={true}
 *   onPress={handlePress}
 * />
 * ```
 */

import React, { memo, useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Modal,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import {
  selectionFeedback,
  mediumFeedback,
  lightFeedback,
  warningFeedback,
} from '../../lib/haptics'
import type { FavoriteLocationWithDistance } from '../../hooks/useFavoriteLocations'
import type { MainStackNavigationProp } from '../../navigation/types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the FavoriteLocationCard component
 */
export interface FavoriteLocationCardProps {
  /**
   * Favorite location data to display
   */
  favorite: FavoriteLocationWithDistance

  /**
   * Whether this card is currently selected
   * @default false
   */
  selected?: boolean

  /**
   * Callback when the card is pressed
   */
  onPress?: (favorite: FavoriteLocationWithDistance) => void

  /**
   * Optional callback when the "Post Here" button is pressed.
   * If not provided, navigates directly to CreatePost screen with location pre-filled.
   * When provided, allows parent component to handle navigation (e.g., to close a modal first).
   */
  onPostHere?: (favorite: FavoriteLocationWithDistance) => void

  /**
   * Optional callback when the "Browse" button is pressed.
   * If not provided, navigates directly to Ledger screen filtered by this location.
   * When provided, allows parent component to handle navigation (e.g., to close a modal first).
   */
  onBrowse?: (favorite: FavoriteLocationWithDistance) => void

  /**
   * Callback when the card is long-pressed
   * Used to trigger edit/delete options.
   * If not provided and onEdit/onDelete are set, shows built-in actions menu.
   */
  onLongPress?: (favorite: FavoriteLocationWithDistance) => void

  /**
   * Callback when user taps Edit action
   * Opens EditFavoriteModal in parent component
   */
  onEdit?: (favorite: FavoriteLocationWithDistance) => void

  /**
   * Callback when user taps Delete action
   * Triggers delete confirmation/operation in parent component
   */
  onDelete?: (favorite: FavoriteLocationWithDistance) => void

  /**
   * Whether the card is in a compact mode for lists
   * @default false
   */
  compact?: boolean

  /**
   * Whether to always show action buttons (vs only when selected)
   * @default false
   */
  showActions?: boolean

  /**
   * Whether to show the address
   * @default true
   */
  showAddress?: boolean

  /**
   * Additional container style
   */
  style?: ViewStyle

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Colors used in the FavoriteLocationCard component
 * Follows iOS design guidelines (matching LocationPicker and FavoritesList)
 */
const COLORS = {
  primary: '#FF6B47',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  background: '#FFFFFF',
  backgroundSecondary: '#F2F2F7',
  border: '#E5E5EA',
  selectedBackground: '#FFE8E3',
  heart: '#FF2D55',
  success: '#34C759',
  distanceBadge: '#E8F5E9',
  distanceText: '#2E7D32',
} as const

/**
 * Maximum number of characters for address display
 */
const ADDRESS_MAX_LENGTH = 50

/**
 * Maximum number of characters for address in compact mode
 */
const ADDRESS_MAX_LENGTH_COMPACT = 35

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format distance for display
 *
 * @param meters - Distance in meters (or null if unavailable)
 * @returns Formatted distance string or null
 */
export function formatDistance(meters: number | null): string | null {
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
 * Truncate address to maximum length
 *
 * @param address - Full address string
 * @param maxLength - Maximum characters before truncation
 * @returns Truncated address with ellipsis if needed
 */
export function truncateAddress(
  address: string | null | undefined,
  maxLength: number
): string {
  if (!address) return 'Address unavailable'
  if (address.length <= maxLength) return address

  // Find the last space before maxLength to avoid cutting words
  const truncated = address.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...'
  }
  return truncated + '...'
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Distance badge component
 */
interface DistanceBadgeProps {
  meters: number | null
  testID?: string
}

function DistanceBadge({ meters, testID }: DistanceBadgeProps): JSX.Element | null {
  const distanceText = formatDistance(meters)
  if (!distanceText) return null

  return (
    <View style={styles.distanceBadge} testID={testID}>
      <Text style={styles.distanceBadgeText}>{distanceText}</Text>
    </View>
  )
}

/**
 * Quick action button component
 */
interface ActionButtonProps {
  icon: string
  label: string
  onPress: () => void
  testID?: string
}

function ActionButton({
  icon,
  label,
  onPress,
  testID,
}: ActionButtonProps): JSX.Element {
  const handlePress = useCallback(() => {
    selectionFeedback()
    onPress()
  }, [onPress])

  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <Text style={styles.actionButtonIcon}>{icon}</Text>
      <Text style={styles.actionButtonText}>{label}</Text>
    </TouchableOpacity>
  )
}

// ============================================================================
// ACTIONS MENU COMPONENT
// ============================================================================

/**
 * Props for the FavoriteActionsMenu component
 */
interface FavoriteActionsMenuProps {
  /**
   * Whether the menu is visible
   */
  visible: boolean

  /**
   * The favorite location being acted upon
   */
  favorite: FavoriteLocationWithDistance

  /**
   * Callback when the menu is closed
   */
  onClose: () => void

  /**
   * Callback when Edit action is selected
   */
  onEdit: () => void

  /**
   * Callback when Delete action is selected
   */
  onDelete: () => void

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

/**
 * Menu action item definition
 */
interface MenuActionItem {
  id: string
  label: string
  icon: string
  onPress: () => void
  variant: 'default' | 'danger'
}

/**
 * FavoriteActionsMenu - Bottom sheet menu for edit/delete actions
 *
 * Shows edit and delete options for a favorite location.
 * Follows the pattern from ChatActionsMenu.
 */
const FavoriteActionsMenu = memo(function FavoriteActionsMenu({
  visible,
  favorite,
  onClose,
  onEdit,
  onDelete,
  testID = 'favorite-actions-menu',
}: FavoriteActionsMenuProps): JSX.Element | null {
  // Build menu actions
  const actions: MenuActionItem[] = [
    {
      id: 'edit',
      label: 'Edit Favorite',
      icon: '\u270F\uFE0F', // ✏️
      onPress: () => {
        selectionFeedback()
        onClose()
        onEdit()
      },
      variant: 'default',
    },
    {
      id: 'delete',
      label: 'Remove from Favorites',
      icon: '\uD83D\uDDD1\uFE0F', // 🗑️
      onPress: () => {
        warningFeedback()
        onClose()
        onDelete()
      },
      variant: 'danger',
    },
  ]

  /**
   * Handle overlay press (close when tapping outside)
   */
  const handleOverlayPress = useCallback(() => {
    lightFeedback()
    onClose()
  }, [onClose])

  /**
   * Handle cancel button press
   */
  const handleCancel = useCallback(() => {
    lightFeedback()
    onClose()
  }, [onClose])

  if (!visible) {
    return null
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.menuOverlay}>
        <TouchableOpacity
          style={styles.menuOverlayTouchable}
          activeOpacity={1}
          onPress={handleOverlayPress}
        >
          <TouchableOpacity
            style={styles.menuContainer}
            activeOpacity={1}
            onPress={() => {}} // Prevent closing when tapping inside
          >
            {/* Header with drag handle */}
            <View style={styles.menuHeader}>
              <View style={styles.menuDragHandle} />
            </View>

            {/* Favorite name */}
            <View style={styles.menuTitleContainer}>
              <Text style={styles.menuTitle} numberOfLines={1} testID={`${testID}-title`}>
                {favorite.custom_name}
              </Text>
              <Text style={styles.menuSubtitle} numberOfLines={1}>
                {favorite.place_name}
              </Text>
            </View>

            {/* Menu Items */}
            <View style={styles.menuItems}>
              {actions.map((action, index) => (
                <React.Fragment key={action.id}>
                  {/* Add separator before danger items */}
                  {index > 0 && action.variant === 'danger' && (
                    <View style={styles.menuSeparator} />
                  )}
                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      action.variant === 'danger' && styles.menuItemDanger,
                    ]}
                    onPress={action.onPress}
                    accessibilityRole="menuitem"
                    accessibilityLabel={action.label}
                    testID={`${testID}-${action.id}`}
                  >
                    <Text style={styles.menuItemIcon}>{action.icon}</Text>
                    <Text
                      style={[
                        styles.menuItemLabel,
                        action.variant === 'danger' && styles.menuItemLabelDanger,
                      ]}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>

            {/* Cancel Button */}
            <View style={styles.menuFooter}>
              <TouchableOpacity
                style={styles.menuCancelButton}
                onPress={handleCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                testID={`${testID}-cancel`}
              >
                <Text style={styles.menuCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Modal>
  )
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * FavoriteLocationCard displays a user's favorite location with details
 * and quick action buttons.
 *
 * Features:
 * - Custom name displayed prominently
 * - Place name and address shown below
 * - Distance badge when available
 * - "Post Here" and "Browse" quick action buttons
 * - Long press for edit/delete options
 * - Compact mode for denser displays
 * - Memoized for performance in FlatList
 */
function FavoriteLocationCardComponent({
  favorite,
  selected = false,
  onPress,
  onPostHere,
  onBrowse,
  onLongPress,
  onEdit,
  onDelete,
  compact = false,
  showActions = false,
  showAddress = true,
  style,
  testID = 'favorite-location-card',
}: FavoriteLocationCardProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const navigation = useNavigation<MainStackNavigationProp>()

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [isActionsMenuVisible, setIsActionsMenuVisible] = useState(false)

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  // Determine if we should show action buttons
  // Both Post Here and Browse have default navigation behavior
  const shouldShowActions = showActions || selected
  const hasActions = true // Both buttons always have default navigation behavior

  // Format address with appropriate length
  const maxAddressLength = compact ? ADDRESS_MAX_LENGTH_COMPACT : ADDRESS_MAX_LENGTH
  const formattedAddress = truncateAddress(favorite.address, maxAddressLength)

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle card press
   */
  const handlePress = useCallback(() => {
    selectionFeedback()
    onPress?.(favorite)
  }, [onPress, favorite])

  /**
   * Handle card long press
   * If onEdit or onDelete are provided, shows the built-in actions menu.
   * Otherwise, calls the onLongPress callback.
   */
  const handleLongPress = useCallback(() => {
    mediumFeedback()

    // If edit/delete handlers are provided, show the actions menu
    if (onEdit || onDelete) {
      setIsActionsMenuVisible(true)
    } else {
      onLongPress?.(favorite)
    }
  }, [onEdit, onDelete, onLongPress, favorite])

  /**
   * Handle closing the actions menu
   */
  const handleActionsMenuClose = useCallback(() => {
    setIsActionsMenuVisible(false)
  }, [])

  /**
   * Handle Edit action from the menu
   */
  const handleEditAction = useCallback(() => {
    onEdit?.(favorite)
  }, [onEdit, favorite])

  /**
   * Handle Delete action from the menu
   */
  const handleDeleteAction = useCallback(() => {
    onDelete?.(favorite)
  }, [onDelete, favorite])

  /**
   * Handle "Post Here" action
   * If onPostHere callback is provided, use it; otherwise navigate directly
   */
  const handlePostHere = useCallback(() => {
    if (onPostHere) {
      onPostHere(favorite)
    } else {
      // Default navigation to CreatePost with location pre-filled
      navigation.navigate('CreatePost', {
        locationId: favorite.place_id ?? undefined,
      })
    }
  }, [onPostHere, favorite, navigation])

  /**
   * Handle "Browse" action
   * If onBrowse callback is provided, use it; otherwise navigate directly
   */
  const handleBrowse = useCallback(() => {
    if (onBrowse) {
      onBrowse(favorite)
    } else if (favorite.place_id) {
      // Default navigation to Ledger filtered by this location
      navigation.navigate('Ledger', {
        locationId: favorite.place_id,
        locationName: favorite.place_name,
      })
    }
  }, [onBrowse, favorite, navigation])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <TouchableOpacity
      style={[
        styles.container,
        compact && styles.containerCompact,
        selected && styles.containerSelected,
        style,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      disabled={!onPress && !onLongPress && !onEdit && !onDelete}
      accessibilityRole="button"
      accessibilityLabel={`${favorite.custom_name}, ${favorite.place_name}${
        favorite.distance_meters !== null
          ? `, ${formatDistance(favorite.distance_meters)} away`
          : ''
      }`}
      accessibilityState={{ selected }}
      testID={testID}
    >
      {/* Favorite Icon */}
      <View
        style={[styles.iconContainer, compact && styles.iconContainerCompact]}
        testID={`${testID}-icon`}
      >
        <Text style={styles.iconText}>{selected ? '\u2764\uFE0F' : '\uD83D\uDCCD'}</Text>
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        {/* Header Row: Custom Name + Distance Badge */}
        <View style={styles.headerRow}>
          <Text
            style={[
              styles.customName,
              compact && styles.customNameCompact,
              selected && styles.customNameSelected,
            ]}
            numberOfLines={1}
            testID={`${testID}-custom-name`}
          >
            {favorite.custom_name}
          </Text>
          <DistanceBadge
            meters={favorite.distance_meters}
            testID={`${testID}-distance`}
          />
        </View>

        {/* Place Name */}
        <Text
          style={[styles.placeName, compact && styles.placeNameCompact]}
          numberOfLines={1}
          testID={`${testID}-place-name`}
        >
          {favorite.place_name}
        </Text>

        {/* Address (if shown) */}
        {showAddress && (
          <Text
            style={[styles.address, compact && styles.addressCompact]}
            numberOfLines={1}
            testID={`${testID}-address`}
          >
            {formattedAddress}
          </Text>
        )}

        {/* Quick Action Buttons */}
        {shouldShowActions && hasActions && (
          <View
            style={[styles.actionsContainer, compact && styles.actionsContainerCompact]}
            testID={`${testID}-actions`}
          >
            {/* Both buttons always shown - have default navigation behavior */}
            <ActionButton
              icon={'\u270F\uFE0F'}
              label="Post Here"
              onPress={handlePostHere}
              testID={`${testID}-post-here`}
            />
            <ActionButton
              icon={'\uD83D\uDD0D'}
              label="Browse"
              onPress={handleBrowse}
              testID={`${testID}-browse`}
            />
          </View>
        )}
      </View>

      {/* Selection Indicator */}
      {selected && (
        <View style={styles.selectionIndicator} testID={`${testID}-selected`}>
          <Text style={styles.selectionIndicatorText}>{'\u2713'}</Text>
        </View>
      )}

      {/* Actions Menu (shown on long press when onEdit or onDelete are provided) */}
      {(onEdit || onDelete) && (
        <FavoriteActionsMenu
          visible={isActionsMenuVisible}
          favorite={favorite}
          onClose={handleActionsMenuClose}
          onEdit={handleEditAction}
          onDelete={handleDeleteAction}
          testID={`${testID}-actions-menu`}
        />
      )}
    </TouchableOpacity>
  )
}

// ============================================================================
// MEMOIZED EXPORT
// ============================================================================

/**
 * Memoized FavoriteLocationCard for performance optimization
 * Only re-renders when props change
 */
export const FavoriteLocationCard = memo(FavoriteLocationCardComponent)

// ============================================================================
// PRESET VARIANTS
// ============================================================================

/**
 * Compact FavoriteLocationCard for dense list displays
 */
export const CompactFavoriteLocationCard = memo(function CompactFavoriteLocationCard(
  props: Omit<FavoriteLocationCardProps, 'compact'>
) {
  return (
    <FavoriteLocationCard
      {...props}
      compact={true}
      testID={props.testID ?? 'favorite-location-card-compact'}
    />
  )
})

/**
 * FavoriteLocationCard without address display
 */
export const FavoriteLocationCardNoAddress = memo(function FavoriteLocationCardNoAddress(
  props: Omit<FavoriteLocationCardProps, 'showAddress'>
) {
  return (
    <FavoriteLocationCard
      {...props}
      showAddress={false}
      testID={props.testID ?? 'favorite-location-card-no-address'}
    />
  )
})

/**
 * FavoriteLocationCard with actions always visible
 */
export const FavoriteLocationCardWithActions = memo(function FavoriteLocationCardWithActions(
  props: Omit<FavoriteLocationCardProps, 'showActions'>
) {
  return (
    <FavoriteLocationCard
      {...props}
      showActions={true}
      testID={props.testID ?? 'favorite-location-card-with-actions'}
    />
  )
})

// ============================================================================
// LIST ITEM COMPONENT
// ============================================================================

/**
 * Props for FavoriteLocationCardListItem
 */
export interface FavoriteLocationCardListItemProps extends FavoriteLocationCardProps {
  /**
   * Index in the list (for alternating backgrounds or separators)
   */
  index?: number

  /**
   * Whether to show a separator below the item
   * @default true
   */
  showSeparator?: boolean
}

/**
 * FavoriteLocationCard wrapped for use in FlatList with separator
 */
export const FavoriteLocationCardListItem = memo(function FavoriteLocationCardListItem({
  index,
  showSeparator = true,
  ...props
}: FavoriteLocationCardListItemProps) {
  return (
    <View testID={`${props.testID ?? 'favorite-location-card-list-item'}-${index ?? 0}`}>
      <FavoriteLocationCard {...props} />
      {showSeparator && <View style={styles.separator} />}
    </View>
  )
})

// ============================================================================
// RENDER ITEM HELPER
// ============================================================================

/**
 * Create a renderItem function for FlatList
 *
 * @param options - Configuration options for the rendered items
 * @returns A function suitable for FlatList's renderItem prop
 *
 * @example
 * ```tsx
 * const renderItem = createFavoriteCardRenderer({
 *   onPress: (fav) => handleSelect(fav),
 *   onPostHere: (fav) => navigateToCreatePost(fav),
 *   onBrowse: (fav) => navigateToLedger(fav),
 *   selectedId: selectedFavoriteId,
 * })
 *
 * <FlatList
 *   data={favorites}
 *   renderItem={renderItem}
 *   keyExtractor={(item) => item.id}
 * />
 * ```
 */
export function createFavoriteCardRenderer(options: {
  onPress?: (favorite: FavoriteLocationWithDistance) => void
  onPostHere?: (favorite: FavoriteLocationWithDistance) => void
  onBrowse?: (favorite: FavoriteLocationWithDistance) => void
  onLongPress?: (favorite: FavoriteLocationWithDistance) => void
  onEdit?: (favorite: FavoriteLocationWithDistance) => void
  onDelete?: (favorite: FavoriteLocationWithDistance) => void
  selectedId?: string | null
  compact?: boolean
  showActions?: boolean
}) {
  return ({
    item,
    index,
  }: {
    item: FavoriteLocationWithDistance
    index: number
  }) => {
    return (
      <FavoriteLocationCardListItem
        favorite={item}
        onPress={options.onPress}
        onPostHere={options.onPostHere}
        onBrowse={options.onBrowse}
        onLongPress={options.onLongPress}
        onEdit={options.onEdit}
        onDelete={options.onDelete}
        selected={options.selectedId === item.id}
        compact={options.compact}
        showActions={options.showActions}
        index={index}
        testID={`favorite-card-${item.id}`}
      />
    )
  }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Container styles
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: COLORS.background,
  },
  containerCompact: {
    padding: 12,
  },
  containerSelected: {
    backgroundColor: COLORS.selectedBackground,
  },

  // Icon styles
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  iconText: {
    fontSize: 20,
  },

  // Content styles
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  customName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  customNameCompact: {
    fontSize: 15,
  },
  customNameSelected: {
    color: COLORS.primary,
  },
  placeName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  placeNameCompact: {
    fontSize: 13,
  },
  address: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  addressCompact: {
    fontSize: 11,
  },

  // Distance badge styles
  distanceBadge: {
    backgroundColor: COLORS.distanceBadge,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    flexShrink: 0,
  },
  distanceBadgeText: {
    fontSize: 11,
    color: COLORS.distanceText,
    fontWeight: '600',
  },

  // Action button styles
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 12,
  },
  actionsContainerCompact: {
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
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

  // Selection indicator styles
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    alignSelf: 'center',
  },
  selectionIndicatorText: {
    fontSize: 14,
    color: COLORS.background,
    fontWeight: 'bold',
  },

  // Separator style
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 72, // Align with content after icon
  },

  // =========================================================================
  // ACTIONS MENU STYLES
  // =========================================================================

  // Menu overlay styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuOverlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  // Menu container styles
  menuContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },

  // Menu header styles
  menuHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  menuDragHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.textTertiary,
  },

  // Menu title styles
  menuTitleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // Menu items styles
  menuItems: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuItemDanger: {
    // No additional styling needed, text color handles it
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  menuItemLabel: {
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  menuItemLabelDanger: {
    color: '#FF3B30', // iOS danger red
  },
  menuSeparator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
    marginHorizontal: 20,
  },

  // Menu footer styles
  menuFooter: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  menuCancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
})

// ============================================================================
// ADDITIONAL EXPORTS
// ============================================================================

/**
 * Export FavoriteActionsMenu for use in other components that need
 * to show edit/delete actions for favorites
 */
export { FavoriteActionsMenu }
export type { FavoriteActionsMenuProps }

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default FavoriteLocationCard
