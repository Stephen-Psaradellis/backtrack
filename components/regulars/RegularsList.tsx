/**
 * RegularsList Component
 *
 * Displays a list of fellow regulars at shared locations.
 *
 * @example
 * ```tsx
 * <RegularsList
 *   locationId={locationId}
 *   onRegularPress={(regular) => navigateToProfile(regular.fellow_user_id)}
 * />
 * ```
 */

import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { RegularCard, RegularAvatar } from './RegularCard'
import {
  useFellowRegulars,
  useLocationRegulars,
  FellowRegular,
  LocationRegular,
} from '../../hooks/useRegulars'
import { darkTheme } from '../../constants/glassStyles'
import { colors } from '../../constants/theme'

// ============================================================================
// Types
// ============================================================================

interface FellowRegularsListProps {
  /** Filter by location (optional) */
  locationId?: string
  /** Called when a regular is pressed */
  onRegularPress?: (regular: FellowRegular) => void
  /** Show location names */
  showLocations?: boolean
  /** Maximum items to show (0 = unlimited) */
  limit?: number
  /** Show as compact avatar list */
  compact?: boolean
}

interface LocationRegularsListProps {
  /** Location ID (required) */
  locationId: string
  /** Called when a regular is pressed */
  onRegularPress?: (regular: LocationRegular) => void
  /** Maximum items to show */
  limit?: number
  /** Show as compact avatar list */
  compact?: boolean
}

// ============================================================================
// Fellow Regulars List
// ============================================================================

export function FellowRegularsList({
  locationId,
  onRegularPress,
  showLocations = true,
  limit = 0,
  compact = false,
}: FellowRegularsListProps) {
  const { regulars, isLoading, error, refetch } = useFellowRegulars({
    locationId,
  })

  // Apply limit if specified
  const displayedRegulars = limit > 0 ? regulars.slice(0, limit) : regulars

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color="#6366F1" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
        <Text style={styles.errorText}>Failed to load regulars</Text>
      </View>
    )
  }

  if (regulars.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={32} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>No fellow regulars yet</Text>
        <Text style={styles.emptySubtitle}>
          Keep visiting your favorite spots to discover others who do too!
        </Text>
      </View>
    )
  }

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {displayedRegulars.map((regular) => (
          <RegularAvatar
            key={regular.fellow_user_id + regular.location_id}
            regular={regular}
            size={36}
            onPress={() => onRegularPress?.(regular)}
          />
        ))}
        {limit > 0 && regulars.length > limit && (
          <View style={styles.moreCount}>
            <Text style={styles.moreCountText}>+{regulars.length - limit}</Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <FlatList
      data={displayedRegulars}
      keyExtractor={(item) => item.fellow_user_id + item.location_id}
      renderItem={({ item }) => (
        <RegularCard
          regular={item}
          showLocation={showLocations}
          onPress={() => onRegularPress?.(item)}
        />
      )}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
      showsVerticalScrollIndicator={false}
    />
  )
}

// ============================================================================
// Location Regulars List
// ============================================================================

export function LocationRegularsList({
  locationId,
  onRegularPress,
  limit = 20,
  compact = false,
}: LocationRegularsListProps) {
  const { regulars, totalCount, isUserRegular, isLoading, error, refetch } =
    useLocationRegulars(locationId, { limit })

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color="#6366F1" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
        <Text style={styles.errorText}>Failed to load regulars</Text>
      </View>
    )
  }

  // Show count-only view if user is not a regular
  if (!isUserRegular && totalCount > 0) {
    return (
      <View style={styles.countOnlyContainer}>
        <Ionicons name="people" size={20} color="#6366F1" />
        <Text style={styles.countOnlyText}>
          {totalCount} {totalCount === 1 ? 'regular' : 'regulars'} at this spot
        </Text>
        <Text style={styles.countOnlyHint}>
          Become a regular to see who else visits often
        </Text>
      </View>
    )
  }

  if (regulars.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={32} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>No other regulars yet</Text>
        <Text style={styles.emptySubtitle}>
          You&apos;re one of the first regulars here!
        </Text>
      </View>
    )
  }

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {regulars.slice(0, limit).map((regular) => (
          <RegularAvatar
            key={regular.user_id}
            regular={regular}
            size={36}
            onPress={() => onRegularPress?.(regular)}
          />
        ))}
        {regulars.length > limit && (
          <View style={styles.moreCount}>
            <Text style={styles.moreCountText}>+{regulars.length - limit}</Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <FlatList
      data={regulars}
      keyExtractor={(item) => item.user_id}
      renderItem={({ item }) => (
        <RegularCard
          regular={item}
          showLocation={false}
          onPress={() => onRegularPress?.(item)}
        />
      )}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        totalCount > regulars.length ? (
          <Text style={styles.totalCountText}>
            Showing {regulars.length} of {totalCount} regulars
          </Text>
        ) : null
      }
    />
  )
}

// ============================================================================
// Regulars Preview (for location cards)
// ============================================================================

interface RegularsPreviewProps {
  locationId: string
  maxAvatars?: number
  onPress?: () => void
}

export function RegularsPreview({
  locationId,
  maxAvatars = 3,
  onPress,
}: RegularsPreviewProps) {
  const { regulars, totalCount, isUserRegular, isLoading } = useLocationRegulars(
    locationId,
    { limit: maxAvatars }
  )

  if (isLoading || totalCount === 0) {
    return null
  }

  return (
    <View style={styles.previewContainer}>
      {isUserRegular && regulars.length > 0 ? (
        <View style={styles.previewAvatars}>
          {regulars.slice(0, maxAvatars).map((regular, index) => (
            <View
              key={regular.user_id}
              style={[
                styles.previewAvatarWrapper,
                { marginLeft: index === 0 ? 0 : -8 },
              ]}
            >
              <RegularAvatar regular={regular} size={24} />
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.previewText}>
        {totalCount} {totalCount === 1 ? 'regular' : 'regulars'}
      </Text>
    </View>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#EF4444',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.textSecondary,
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: darkTheme.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  moreCount: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.textMuted,
  },
  countOnlyContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  countOnlyText: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#6366F1',
  },
  countOnlyHint: {
    marginTop: 4,
    fontSize: 13,
    color: darkTheme.textMuted,
    textAlign: 'center',
  },
  totalCountText: {
    fontSize: 12,
    color: darkTheme.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewAvatarWrapper: {
    borderWidth: 2,
    borderColor: darkTheme.background,
    borderRadius: 14,
  },
  previewText: {
    fontSize: 12,
    color: darkTheme.textMuted,
    fontWeight: '500',
  },
})

export default FellowRegularsList
