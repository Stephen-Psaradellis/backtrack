/**
 * HangoutsList Component
 *
 * Vertical scrollable list of nearby hangouts with section headers and empty state.
 * Supports pull-to-refresh and displays create button.
 *
 * Features:
 * - Section headers: "Happening Soon", "Later Today", "This Week"
 * - Empty state with create CTA
 * - Pull-to-refresh
 * - Create FAB or header button
 * - Dark theme styling
 *
 * @example
 * ```tsx
 * <HangoutsList
 *   hangouts={nearbyHangouts}
 *   onCreatePress={() => setShowCreateModal(true)}
 *   onRefresh={refetchHangouts}
 *   isRefreshing={isLoading}
 * />
 * ```
 */

import React, { useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  isToday,
  isTomorrow,
  isThisWeek,
  addHours,
  differenceInHours,
} from 'date-fns'

import { HangoutCard } from './HangoutCard'
import { darkTheme } from '../constants/glassStyles'
import { spacing } from '../constants/theme'
import { selectionFeedback } from '../lib/haptics'
import { useHangouts } from '../hooks/useHangouts'
import { useAuth } from '../contexts/AuthContext'
import type { HangoutWithDetails } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

export interface HangoutsListProps {
  /** List of hangouts to display */
  hangouts: HangoutWithDetails[]
  /** Callback when create button is pressed */
  onCreatePress: () => void
  /** Callback for pull-to-refresh */
  onRefresh?: () => void | Promise<void>
  /** Whether list is refreshing */
  isRefreshing?: boolean
  /** Test ID for testing */
  testID?: string
}

type SectionKey = 'soon' | 'today' | 'week'

interface HangoutSection {
  title: string
  data: HangoutWithDetails[]
}

// ============================================================================
// COMPONENT
// ============================================================================

export function HangoutsList({
  hangouts,
  onCreatePress,
  onRefresh,
  isRefreshing = false,
  testID = 'hangouts-list',
}: HangoutsListProps): React.ReactNode {
  const { user } = useAuth()
  const { joinHangout, leaveHangout } = useHangouts()

  // ---------------------------------------------------------------------------
  // Section Grouping
  // ---------------------------------------------------------------------------

  const sections = useMemo(() => {
    const now = new Date()
    const twoHoursFromNow = addHours(now, 2)

    const grouped: Record<SectionKey, HangoutWithDetails[]> = {
      soon: [],
      today: [],
      week: [],
    }

    hangouts.forEach((hangout) => {
      const scheduledDate = new Date(hangout.scheduled_for)
      const hoursUntil = differenceInHours(scheduledDate, now)

      if (hoursUntil <= 2 && hoursUntil >= 0) {
        grouped.soon.push(hangout)
      } else if (isToday(scheduledDate)) {
        grouped.today.push(hangout)
      } else if (isThisWeek(scheduledDate)) {
        grouped.week.push(hangout)
      }
    })

    const result: HangoutSection[] = []

    if (grouped.soon.length > 0) {
      result.push({ title: 'Happening Soon', data: grouped.soon })
    }
    if (grouped.today.length > 0) {
      result.push({ title: 'Later Today', data: grouped.today })
    }
    if (grouped.week.length > 0) {
      result.push({ title: 'This Week', data: grouped.week })
    }

    return result
  }, [hangouts])

  // Flatten sections for FlatList
  const flatData = useMemo(() => {
    const items: Array<{ type: 'section' | 'hangout'; data: HangoutSection | HangoutWithDetails }> = []

    sections.forEach((section) => {
      items.push({ type: 'section', data: section })
      section.data.forEach((hangout) => {
        items.push({ type: 'hangout', data: hangout })
      })
    })

    return items
  }, [sections])

  // ---------------------------------------------------------------------------
  // Check if user is attending a hangout
  // ---------------------------------------------------------------------------

  const isAttending = useCallback(
    (hangoutId: string): boolean => {
      // This would need to be enhanced with actual attendee data
      // For now, we check if user is in myHangouts
      return false
    },
    [user?.id]
  )

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleCreatePress = useCallback(async () => {
    await selectionFeedback()
    onCreatePress()
  }, [onCreatePress])

  const handleJoin = useCallback(
    async (hangoutId: string) => {
      await joinHangout(hangoutId, 'going')
    },
    [joinHangout]
  )

  const handleLeave = useCallback(
    async (hangoutId: string) => {
      await leaveHangout(hangoutId)
    },
    [leaveHangout]
  )

  // ---------------------------------------------------------------------------
  // Render Helpers
  // ---------------------------------------------------------------------------

  const renderItem = useCallback(
    ({ item }: { item: (typeof flatData)[number] }) => {
      if (item.type === 'section') {
        const section = item.data as HangoutSection
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionLine} />
          </View>
        )
      }

      const hangout = item.data as HangoutWithDetails
      return (
        <View style={styles.hangoutItem}>
          <HangoutCard
            hangout={hangout}
            isAttending={isAttending(hangout.id)}
            onJoin={() => handleJoin(hangout.id)}
            onLeave={() => handleLeave(hangout.id)}
            testID={`${testID}-hangout-${hangout.id}`}
          />
        </View>
      )
    },
    [isAttending, handleJoin, handleLeave, testID]
  )

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer} testID={`${testID}-empty`}>
        <View style={styles.emptyIcon}>
          <Ionicons name="calendar-outline" size={64} color={darkTheme.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No hangouts nearby</Text>
        <Text style={styles.emptyDescription}>
          Be the first to create one and bring people together!
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={handleCreatePress}
          activeOpacity={0.8}
          testID={`${testID}-empty-create`}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>Create Hangout</Text>
        </TouchableOpacity>
      </View>
    ),
    [handleCreatePress, testID]
  )

  const renderHeader = useCallback(
    () => (
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="people" size={24} color={darkTheme.accent} />
          <Text style={styles.headerTitle}>Group Hangouts</Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreatePress}
          activeOpacity={0.8}
          testID={`${testID}-create-button`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={20} color={darkTheme.primary} />
        </TouchableOpacity>
      </View>
    ),
    [handleCreatePress, testID]
  )

  const keyExtractor = useCallback(
    (item: (typeof flatData)[number], index: number) =>
      item.type === 'section'
        ? `section-${(item.data as HangoutSection).title}`
        : `hangout-${(item.data as HangoutWithDetails).id}`,
    []
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <FlatList
      data={flatData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={[
        styles.listContent,
        flatData.length === 0 && styles.listContentEmpty,
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={darkTheme.accent}
            colors={[darkTheme.accent]}
            progressBackgroundColor={darkTheme.cardBackground}
            testID={`${testID}-refresh-control`}
          />
        ) : undefined
      }
      testID={testID}
    />
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing[4],
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing[4],
    marginBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.cardBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: darkTheme.surface,
    borderWidth: 1,
    borderColor: darkTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[4],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: darkTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: darkTheme.cardBorder,
  },
  hangoutItem: {
    marginBottom: spacing[3],
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[12],
  },
  emptyIcon: {
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: darkTheme.textPrimary,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: darkTheme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[6],
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: darkTheme.primary,
    borderRadius: 14,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    ...Platform.select({
      ios: {
        shadowColor: darkTheme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
