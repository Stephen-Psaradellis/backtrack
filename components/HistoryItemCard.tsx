/**
 * HistoryItemCard
 *
 * Compact card for rendering a single history feed item.
 * Color-coded by type with icon, title, subtitle, timestamp, and chevron.
 */
import React, { useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'

import { selectionFeedback } from '../lib/haptics'
import { darkTheme } from '../constants/glassStyles'
import type { HistoryItem, HistoryItemType } from '../hooks/useHistoryFeed'
import type { MainTabNavigationProp } from '../navigation/types'

// ============================================================================
// COLOR MAP
// ============================================================================

const TYPE_COLORS: Record<HistoryItemType, string> = {
  checkin: '#4CAF50',
  checkout: '#8BC34A',
  match: '#E91E63',
  post_at_favorite: '#FF9800',
  post_at_regular: '#2196F3',
  post_at_recent: '#9C27B0',
  own_post: '#00BCD4',
  post_interaction: '#FF6B47',
}

// ============================================================================
// COMPONENT
// ============================================================================

interface HistoryItemCardProps {
  item: HistoryItem
  testID?: string
}

export function HistoryItemCard({ item, testID }: HistoryItemCardProps) {
  const navigation = useNavigation<MainTabNavigationProp>()

  const handlePress = useCallback(async () => {
    await selectionFeedback()
    navigation.navigate(item.deepLinkTarget.screen as any, item.deepLinkTarget.params as any)
  }, [navigation, item.deepLinkTarget])

  const accentColor = TYPE_COLORS[item.type]
  const timeStr = formatRelativeTime(item.timestamp)

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
      testID={testID}
    >
      <View style={[styles.iconContainer, { backgroundColor: accentColor + '20' }]}>
        <Ionicons
          name={item.icon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={accentColor}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text>
      </View>
      <View style={styles.trailing}>
        <Text style={styles.time}>{timeStr}</Text>
        <Ionicons name="chevron-forward" size={16} color={darkTheme.textMuted} />
      </View>
    </TouchableOpacity>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: darkTheme.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: darkTheme.textSecondary,
    marginTop: 2,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 2,
  },
  time: {
    fontSize: 12,
    color: darkTheme.textMuted,
  },
})

export default HistoryItemCard
