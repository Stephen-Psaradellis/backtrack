/**
 * HistoryScreen - Unified chronological activity feed
 *
 * Replaces MySpotsScreen with a single timeline of all user activity:
 * check-ins, matches, posts, and interactions with filter chips.
 */
import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'

import { GlobalHeader } from '../components/navigation/GlobalHeader'
import { FloatingActionButtons } from '../components/navigation/FloatingActionButtons'
import { HistoryItemCard } from '../components/HistoryItemCard'
import { useNotificationCounts } from '../hooks/useNotificationCounts'
import { useHistoryFeed, type HistoryFilter, type HistoryItem } from '../hooks/useHistoryFeed'
import { darkTheme } from '../constants/glassStyles'

// ============================================================================
// FILTER CHIPS
// ============================================================================

const FILTERS: { key: HistoryFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'checkins', label: 'Check-ins', icon: 'log-in' },
  { key: 'matches', label: 'Matches', icon: 'heart' },
  { key: 'posts', label: 'Posts', icon: 'document-text' },
  { key: 'interactions', label: 'Interactions', icon: 'chatbubble-ellipses' },
]

// ============================================================================
// COMPONENT
// ============================================================================

export function HistoryScreen(): React.ReactNode {
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>('all')

  const { counts, markAsSeen } = useNotificationCounts()
  const { items, isLoading, refreshing, handleRefresh } = useHistoryFeed(activeFilter)

  // Mark notifications as seen when screen is viewed
  useFocusEffect(
    useCallback(() => {
      markAsSeen()
    }, [markAsSeen])
  )

  // ---------------------------------------------------------------------------
  // Render Helpers
  // ---------------------------------------------------------------------------

  const renderItem = useCallback(({ item }: { item: HistoryItem }) => (
    <HistoryItemCard item={item} testID={`history-item-${item.id}`} />
  ), [])

  const keyExtractor = useCallback((item: HistoryItem) => item.id, [])

  const renderEmpty = useCallback(() => {
    if (isLoading) return null
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="time-outline" size={48} color={darkTheme.textMuted} />
        <Text style={styles.emptyText}>No activity yet</Text>
        <Text style={styles.emptySubtext}>
          Check in at places, create posts, and match with others to build your history.
        </Text>
      </View>
    )
  }, [isLoading])

  const renderHeader = useCallback(() => (
    <View>
      {/* Notification Badge Summary */}
      {counts.total > 0 && (
        <View style={styles.badgeSummary}>
          <Ionicons name="notifications" size={16} color={darkTheme.textPrimary} />
          <Text style={styles.badgeText}>
            {counts.total} new {counts.total === 1 ? 'update' : 'updates'}
          </Text>
        </View>
      )}

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
        style={styles.filterScroll}
      >
        {FILTERS.map(f => {
          const isActive = f.key === activeFilter
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.key)}
              testID={`history-filter-${f.key}`}
            >
              <Ionicons
                name={f.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={isActive ? darkTheme.textPrimary : darkTheme.textMuted}
              />
              <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  ), [counts.total, activeFilter])

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container} testID="history-screen">
        <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />
        <GlobalHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={darkTheme.accent} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // Main Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container} testID="history-screen">
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />
      <GlobalHeader />
      <FloatingActionButtons testID="history-floating-actions" />

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={darkTheme.accent}
            colors={[darkTheme.accent]}
            progressBackgroundColor={darkTheme.cardBackground}
            testID="history-refresh-control"
          />
        }
        testID="history-flat-list"
      />
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: darkTheme.textSecondary,
  },
  badgeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkTheme.accent,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 140,
    gap: 6,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: darkTheme.cardBackground,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: darkTheme.accent,
    borderColor: darkTheme.accent,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: darkTheme.textMuted,
  },
  filterLabelActive: {
    color: darkTheme.textPrimary,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: darkTheme.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
})

export default HistoryScreen
