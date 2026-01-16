/**
 * MySpotsScreen - User's posts, matches, and favorite locations
 *
 * The My Spots tab shows 4 sections:
 * 1. At Your Regulars - posts at locations where user is a regular
 * 2. At Your Favorites - posts at user's favorite locations
 * 3. New Matches - recent conversations where user is consumer
 * 4. Recent Places - posts at locations from recent history
 *
 * Features:
 * - SectionList with collapsible sections
 * - Notification badge via useNotificationCounts
 * - Marks notifications as seen when screen is viewed
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'

import { GlobalHeader } from '../components/navigation/GlobalHeader'
import { FloatingActionButtons } from '../components/navigation/FloatingActionButtons'
import { PostCard, CompactPostCard } from '../components/PostCard'
import { useNotificationCounts } from '../hooks/useNotificationCounts'
import { useFavoriteLocations } from '../hooks/useFavoriteLocations'
import { useLocationHistory } from '../hooks/useLocationHistory'
import { useFellowRegulars } from '../hooks/useRegulars'
import { useLocation } from '../hooks/useLocation'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { selectionFeedback } from '../lib/haptics'
import { colors, shadows } from '../constants/theme'
import type { MainTabNavigationProp } from '../navigation/types'
import type { Post, Conversation } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

interface SectionData {
  title: string
  icon: string
  data: Array<Post | Conversation | { type: 'empty'; message: string }>
  emptyMessage: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MySpotsScreen(): React.ReactNode {
  const navigation = useNavigation<MainTabNavigationProp>()
  const { userId, isAuthenticated } = useAuth()
  const { latitude, longitude } = useLocation()
  const userCoordinates = latitude && longitude ? { latitude, longitude } : null

  // ---------------------------------------------------------------------------
  // Hooks
  // ---------------------------------------------------------------------------

  const { counts, isLoading: countsLoading, markAsSeen } = useNotificationCounts()
  const { favorites, isLoading: favoritesLoading } = useFavoriteLocations({ userCoordinates })
  const { locations: recentLocations, isLoading: historyLoading } = useLocationHistory(30)
  const { regulars: fellowRegulars, isLoading: regularsLoading } = useFellowRegulars()

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [postsAtFavorites, setPostsAtFavorites] = useState<Post[]>([])
  const [postsAtRecent, setPostsAtRecent] = useState<Post[]>([])
  const [postsAtRegulars, setPostsAtRegulars] = useState<Post[]>([])
  const [newMatches, setNewMatches] = useState<Conversation[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setIsLoadingData(false)
      return
    }

    try {
      // Fetch posts at favorite locations
      if (favorites.length > 0) {
        const favoriteLocationIds = favorites
          .map(f => f.place_id)
          .filter((id): id is string => id !== null)

        if (favoriteLocationIds.length > 0) {
          const { data: favPosts } = await supabase
            .from('posts')
            .select('*')
            .in('location_id', favoriteLocationIds)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(10)

          setPostsAtFavorites(favPosts || [])
        }
      }

      // Fetch posts at recent locations
      if (recentLocations.length > 0) {
        const recentLocationIds = recentLocations.map(l => l.id)

        const { data: recentPosts } = await supabase
          .from('posts')
          .select('*')
          .in('location_id', recentLocationIds)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10)

        setPostsAtRecent(recentPosts || [])
      }

      // Fetch posts at regular locations
      if (fellowRegulars.length > 0) {
        const regularLocationIds = [...new Set(fellowRegulars.map(r => r.location_id))]

        const { data: regularPosts } = await supabase
          .from('posts')
          .select('*')
          .in('location_id', regularLocationIds)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10)

        setPostsAtRegulars(regularPosts || [])
      }

      // Fetch new matches (conversations where user is consumer)
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('consumer_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)

      setNewMatches(conversations || [])
    } catch (error) {
      console.error('Error fetching my spots data:', error)
    } finally {
      setIsLoadingData(false)
    }
  }, [isAuthenticated, userId, favorites, recentLocations, fellowRegulars])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Mark notifications as seen when screen is viewed
  useFocusEffect(
    useCallback(() => {
      markAsSeen()
    }, [markAsSeen])
  )

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePostPress = useCallback(
    async (post: Post) => {
      await selectionFeedback()
      navigation.navigate('PostDetail', { postId: post.id })
    },
    [navigation]
  )

  const handleConversationPress = useCallback(
    async (conversation: Conversation) => {
      await selectionFeedback()
      navigation.navigate('Chat', { conversationId: conversation.id })
    },
    [navigation]
  )

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  // ---------------------------------------------------------------------------
  // Section Data
  // ---------------------------------------------------------------------------

  const sections: SectionData[] = useMemo(() => [
    {
      title: 'At Your Regulars',
      icon: 'people',
      data: postsAtRegulars.length > 0
        ? postsAtRegulars
        : [{ type: 'empty' as const, message: 'No posts at your regular spots' }],
      emptyMessage: 'No posts at your regular spots',
    },
    {
      title: 'At Your Favorites',
      icon: 'star',
      data: postsAtFavorites.length > 0
        ? postsAtFavorites
        : [{ type: 'empty' as const, message: 'No posts at your favorite locations' }],
      emptyMessage: 'No posts at your favorite locations',
    },
    {
      title: 'New Matches',
      icon: 'heart',
      data: newMatches.length > 0
        ? newMatches
        : [{ type: 'empty' as const, message: 'No new matches yet' }],
      emptyMessage: 'No new matches yet',
    },
    {
      title: 'Recent Places',
      icon: 'time',
      data: postsAtRecent.length > 0
        ? postsAtRecent
        : [{ type: 'empty' as const, message: 'No posts at your recent locations' }],
      emptyMessage: 'No posts at your recent locations',
    },
  ], [postsAtRegulars, postsAtFavorites, newMatches, postsAtRecent])

  // ---------------------------------------------------------------------------
  // Render Helpers
  // ---------------------------------------------------------------------------

  const renderSectionHeader = useCallback(({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <Ionicons
        name={section.icon as keyof typeof Ionicons.glyphMap}
        size={20}
        color={colors.primary[500]}
      />
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  ), [])

  const renderItem = useCallback(({ item, section }: {
    item: Post | Conversation | { type: 'empty'; message: string }
    section: SectionData
  }) => {
    // Empty state
    if ('type' in item && item.type === 'empty') {
      return (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>{item.message}</Text>
        </View>
      )
    }

    // Conversation item
    if (section.title === 'New Matches' && 'consumer_id' in item) {
      return (
        <TouchableOpacity
          style={styles.conversationItem}
          onPress={() => handleConversationPress(item as Conversation)}
          testID={`myspots-conversation-${item.id}`}
        >
          <View style={styles.conversationContent}>
            <Ionicons name="chatbubble" size={24} color={colors.primary[500]} />
            <View style={styles.conversationText}>
              <Text style={styles.conversationTitle}>New Match</Text>
              <Text style={styles.conversationSubtitle}>
                Tap to start chatting
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
        </TouchableOpacity>
      )
    }

    // Post item
    return (
      <View style={styles.postItem}>
        <CompactPostCard
          post={item as Post}
          onPress={handlePostPress}
          showLocation={true}
          testID={`myspots-post-${(item as Post).id}`}
        />
      </View>
    )
  }, [handlePostPress, handleConversationPress])

  const keyExtractor = useCallback((
    item: Post | Conversation | { type: 'empty'; message: string },
    index: number
  ) => {
    if ('type' in item && item.type === 'empty') {
      return `empty-${index}`
    }
    // At this point, item is either Post or Conversation, both have 'id'
    return (item as Post | Conversation).id
  }, [])

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  const isLoading = countsLoading || favoritesLoading || historyLoading || regularsLoading || isLoadingData

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container} testID="my-spots-screen">
        <GlobalHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading your spots...</Text>
        </View>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // Main Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container} testID="my-spots-screen">
      <GlobalHeader />
      <FloatingActionButtons testID="myspots-floating-actions" />

      {/* Notification Badge Summary */}
      {counts.total > 0 && (
        <View style={styles.badgeSummary}>
          <Ionicons name="notifications" size={16} color={colors.white} />
          <Text style={styles.badgeText}>
            {counts.total} new {counts.total === 1 ? 'update' : 'updates'}
          </Text>
        </View>
      )}

      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
            testID="myspots-refresh-control"
          />
        }
        testID="myspots-section-list"
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
    backgroundColor: colors.neutral[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.neutral[500],
  },
  badgeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[500],
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 140, // Extra padding to avoid overlap with FloatingActionButtons
    gap: 6,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: colors.neutral[50],
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  postItem: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  emptySection: {
    marginHorizontal: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.native.sm,
  },
  emptySectionText: {
    fontSize: 14,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    ...shadows.native.sm,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  conversationText: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  conversationSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 2,
  },
})

export default MySpotsScreen
