/**
 * LedgerScreen
 *
 * Displays posts ("missed connections") for a specific location.
 * Posts are sorted by recency (most recent first).
 *
 * Features:
 * - FlatList of posts filtered by location
 * - Pull-to-refresh functionality
 * - Empty state when no posts exist
 * - Navigation to post detail screen
 * - Loading and error states
 * - Match highlighting for posts that match the user's avatar
 * - Match count display in header when user has configured avatar
 *
 * @example
 * ```tsx
 * // Navigation from HomeScreen
 * navigation.navigate('Ledger', {
 *   locationId: '123e4567-e89b-12d3-a456-426614174000',
 *   locationName: 'Coffee Shop on Main St',
 * })
 * ```
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'

import { PostCard, createPostCardRenderer } from '../components/PostCard'
import { selectionFeedback } from '../lib/haptics'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { EmptyLedger, ErrorState } from '../components/EmptyState'
import { Button } from '../components/Button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getHiddenUserIds } from '../lib/moderation'
import {
  calculateBatchMatches,
  isValidForMatching,
  DEFAULT_MATCH_THRESHOLD,
} from '../lib/matching'
import type { LedgerRouteProp, MainStackNavigationProp } from '../navigation/types'
import type { Post, PostWithDetails } from '../types/database'
import type { AvatarConfig } from '../types/avatar'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Sort options for posts
 */
type SortOption = 'newest' | 'oldest'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Number of posts to fetch per page
 */
const PAGE_SIZE = 20

/**
 * Colors used in the LedgerScreen
 */
const COLORS = {
  primary: '#007AFF',
  background: '#F2F2F7',
  cardBackground: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  border: '#E5E5EA',
} as const

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LedgerScreen - View posts for a specific location
 *
 * Fetches and displays posts filtered by the given location,
 * sorted by creation date (most recent first).
 */
export function LedgerScreen(): JSX.Element {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const route = useRoute<LedgerRouteProp>()
  const navigation = useNavigation<MainStackNavigationProp>()
  const { profile, userId } = useAuth()

  const { locationId, locationName } = route.params

  // Get user's avatar for matching
  const userAvatar = profile?.own_avatar as AvatarConfig | null
  const hasValidAvatar = isValidForMatching(userAvatar)

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortOrder] = useState<SortOption>('newest')

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------

  /**
   * Fetch posts for the current location
   * Sorted by recency (newest first) by default
   * Filters out posts from blocked users
   */
  const fetchPosts = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true)
    }
    setError(null)

    try {
      // Get list of hidden user IDs (blocked users + users who blocked us)
      let hiddenUserIds: string[] = []
      if (userId) {
        const hiddenResult = await getHiddenUserIds(userId)
        if (hiddenResult.success) {
          hiddenUserIds = hiddenResult.hiddenUserIds
        }
      }

      // Build query for posts at this location
      let query = supabase
        .from('posts')
        .select('*')
        .eq('location_id', locationId)
        .eq('is_active', true)
        .order('created_at', { ascending: sortOrder === 'oldest' })
        .limit(PAGE_SIZE)

      // Filter out posts from hidden users if there are any
      if (hiddenUserIds.length > 0) {
        // Use 'not in' filter to exclude posts from blocked users
        query = query.not('producer_id', 'in', `(${hiddenUserIds.join(',')})`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        setError('Failed to load posts. Please try again.')
        return
      }

      setPosts(data || [])
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [locationId, sortOrder, userId])

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  /**
   * Fetch posts when screen mounts or location changes
   */
  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // ---------------------------------------------------------------------------
  // MATCHING
  // ---------------------------------------------------------------------------

  /**
   * Calculate match scores for all posts based on user's avatar
   * Returns a Map of postId -> match score for efficient lookup
   */
  const matchScores = useMemo<Map<string, number>>(() => {
    // Only calculate if user has a valid avatar
    if (!hasValidAvatar || !userAvatar || posts.length === 0) {
      return new Map()
    }

    // Calculate batch matches for all posts
    const matches = calculateBatchMatches(
      userAvatar,
      posts.map((post) => ({
        id: post.id,
        target_avatar: post.target_avatar as AvatarConfig,
      })),
      DEFAULT_MATCH_THRESHOLD
    )

    // Convert to Map for O(1) lookup
    const scoreMap = new Map<string, number>()
    for (const match of matches) {
      scoreMap.set(match.postId, match.score)
    }
    return scoreMap
  }, [posts, userAvatar, hasValidAvatar])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    fetchPosts(true)
  }, [fetchPosts])

  /**
   * Handle post card press - navigate to post detail
   */
  const handlePostPress = useCallback(
    async (post: Post | PostWithDetails) => {
      await selectionFeedback()
      navigation.navigate('PostDetail', { postId: post.id })
    },
    [navigation]
  )

  /**
   * Handle create post navigation
   */
  const handleCreatePost = useCallback(() => {
    navigation.navigate('CreatePost', { locationId })
  }, [navigation, locationId])

  /**
   * Handle retry on error
   */
  const handleRetry = useCallback(() => {
    fetchPosts()
  }, [fetchPosts])

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Render individual post item with match indicator
   */
  const renderPost = useCallback(
    ({ item, index }: { item: Post; index: number }) => {
      // Get match score for this post (if user has valid avatar)
      const matchScore = matchScores.get(item.id)
      const isMatch = matchScore !== undefined && matchScore >= DEFAULT_MATCH_THRESHOLD

      return (
        <View style={styles.postItem}>
          <PostCard
            post={item}
            onPress={handlePostPress}
            showLocation={false}
            matchScore={matchScore}
            isMatch={isMatch}
            testID={`ledger-post-${item.id}`}
          />
        </View>
      )
    },
    [handlePostPress, matchScores]
  )

  /**
   * Render list header with location info and match count
   */
  const renderHeader = useCallback(() => {
    // Count posts that match the user's avatar
    const matchCount = hasValidAvatar
      ? Array.from(matchScores.values()).filter(
          (score) => score >= DEFAULT_MATCH_THRESHOLD
        ).length
      : 0

    // Build subtitle text
    let subtitleText: string
    if (posts.length === 0) {
      subtitleText = 'No posts yet'
    } else if (posts.length === 1) {
      subtitleText = '1 post'
    } else {
      subtitleText = `${posts.length} posts`
    }

    // Add match count if user has valid avatar
    if (hasValidAvatar && matchCount > 0) {
      subtitleText += ` • ${matchCount} ${matchCount === 1 ? 'match' : 'matches'}`
    }

    return (
      <View style={styles.header} testID="ledger-header">
        <Text style={styles.headerTitle}>{locationName}</Text>
        <Text style={styles.headerSubtitle}>{subtitleText}</Text>
      </View>
    )
  }, [locationName, posts.length, hasValidAvatar, matchScores])

  /**
   * Render empty state when no posts exist
   */
  const renderEmptyState = useCallback(() => {
    if (loading) return null

    return (
      <View style={styles.emptyContainer}>
        <EmptyLedger
          onAction={handleCreatePost}
          testID="ledger-empty"
        />
      </View>
    )
  }, [loading, handleCreatePost])

  /**
   * Render list footer with create post CTA
   */
  const renderFooter = useCallback(() => {
    if (posts.length === 0) return null

    return (
      <View style={styles.footer} testID="ledger-footer">
        <Text style={styles.footerText}>
          Didn&apos;t find who you&apos;re looking for?
        </Text>
        <Button
          title="Create a Post"
          onPress={handleCreatePost}
          variant="outline"
          size="small"
          testID="ledger-create-post-button"
        />
      </View>
    )
  }, [posts.length, handleCreatePost])

  /**
   * Key extractor for FlatList
   */
  const keyExtractor = useCallback((item: Post) => item.id, [])

  // ---------------------------------------------------------------------------
  // RENDER: LOADING STATE
  // ---------------------------------------------------------------------------

  if (loading && !refreshing) {
    return (
      <View style={styles.centeredContainer} testID="ledger-loading">
        <LoadingSpinner message="Loading posts..." />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: ERROR STATE
  // ---------------------------------------------------------------------------

  if (error && posts.length === 0) {
    return (
      <View style={styles.centeredContainer} testID="ledger-error">
        <ErrorState
          title="Failed to Load Posts"
          message={error}
          onAction={handleRetry}
          actionLabel="Try Again"
        />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: POST LIST
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container} testID="ledger-screen">
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        contentContainerStyle={[
          styles.listContent,
          posts.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
            testID="ledger-refresh-control"
          />
        }
        testID="ledger-post-list"
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
    backgroundColor: COLORS.background,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 24,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Header styles
  header: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },

  // Post item styles
  postItem: {
    marginBottom: 12,
  },

  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },

  // Footer styles
  footer: {
    marginTop: 16,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default LedgerScreen