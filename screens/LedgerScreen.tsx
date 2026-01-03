/**
 * LedgerScreen
 *
 * Displays posts ("missed connections") for a specific location.
 * Posts are sorted by recency with 30-day deprioritization.
 *
 * Features:
 * - FlatList of posts filtered by location
 * - Pull-to-refresh functionality
 * - Empty state when no posts exist
 * - Navigation to post detail screen
 * - Loading and error states
 * - Match highlighting for posts that match the user's avatar
 * - Match count display in header when user has configured avatar
 * - Time-based filtering (Last 24h, Last Week, Last Month, Any Time)
 * - 30-day deprioritization: posts with sighting_date older than 30 days are pushed lower
 * - Tutorial tooltip for ledger browsing onboarding
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
  TouchableOpacity,
  StatusBar,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import Tooltip from 'react-native-walkthrough-tooltip'

import { PostCard } from '../components/PostCard'
import { PostFilters } from '../components/PostFilters'
import { CheckinButton } from '../components/CheckinButton'
import { useTutorialState } from '../hooks/useTutorialState'
import { useCheckin } from '../hooks/useCheckin'
import { selectionFeedback } from '../lib/haptics'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { EmptyLedger, ErrorState } from '../components/EmptyState'
import { Button } from '../components/Button'
import { supabase, sortPostsWithDeprioritization } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getHiddenUserIds } from '../lib/moderation'
import { TimeFilterOption, getFilterCutoffDate } from '../utils/dateTime'
import type { LedgerRouteProp, MainStackNavigationProp } from '../navigation/types'
import type { Post, PostWithDetails } from '../types/database'

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
  primary: '#FF6B47',
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
export function LedgerScreen(): React.ReactNode {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const route = useRoute<LedgerRouteProp>()
  const navigation = useNavigation<MainStackNavigationProp>()
  const { userId } = useAuth()

  // Tutorial tooltip state for ledger browsing onboarding
  const tutorial = useTutorialState('ledger_browsing')

  // Check-in state for tiered matching
  const { activeCheckin, isCheckedInAt } = useCheckin()

  const { locationId, locationName } = route.params

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortOrder] = useState<SortOption>('newest')
  const [timeFilter, setTimeFilter] = useState<TimeFilterOption>('any_time')

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------

  /**
   * Fetch posts for the current location
   * Sorted by recency (newest first) by default
   * Filters out posts from blocked users
   * Applies time-based filtering when selected
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

      // Apply time-based filtering if a filter is selected (not 'any_time')
      const cutoffDate = getFilterCutoffDate(timeFilter)
      if (cutoffDate) {
        // Filter by sighting_date if present, otherwise fall back to created_at
        // This uses an OR condition: posts with sighting_date >= cutoff OR
        // posts without sighting_date but created_at >= cutoff
        query = query.or(
          `sighting_date.gte.${cutoffDate.toISOString()},and(sighting_date.is.null,created_at.gte.${cutoffDate.toISOString()})`
        )
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        setError('Failed to load posts. Please try again.')
        return
      }

      // Apply 30-day deprioritization sorting
      // Posts with sighting_date within 30 days are prioritized
      // Posts with sighting_date older than 30 days are pushed lower
      // Posts without sighting_date use created_at for ordering
      const sortedPosts = data
        ? sortPostsWithDeprioritization(data, sortOrder === 'oldest')
        : []

      setPosts(sortedPosts)
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [locationId, sortOrder, userId, timeFilter])

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
   * Handle time filter change
   */
  const handleTimeFilterChange = useCallback((filter: TimeFilterOption) => {
    setTimeFilter(filter)
  }, [])

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
   * Render tutorial tooltip content for ledger browsing onboarding
   */
  const renderTutorialContent = (): React.ReactElement => (
    <View style={tooltipStyles.container}>
      <Text style={tooltipStyles.title}>Browse the Ledger</Text>
      <Text style={tooltipStyles.description}>
        View posts from other users at this location. Tap on any post to see more details
        and start a conversation if you think it might be about you!
      </Text>
      <TouchableOpacity
        style={tooltipStyles.button}
        onPress={tutorial.markComplete}
        testID="tutorial-dismiss-button"
      >
        <Text style={tooltipStyles.buttonText}>Got it</Text>
      </TouchableOpacity>
    </View>
  )

  /**
   * Render individual post item
   */
  const renderPost = useCallback(
    ({ item }: { item: Post }) => {
      return (
        <View style={styles.postItem}>
          <PostCard
            post={item}
            onPress={handlePostPress}
            showLocation={false}
            testID={`ledger-post-${item.id}`}
          />
        </View>
      )
    },
    [handlePostPress]
  )

  /**
   * Render list header with location info, check-in button, and time filter
   */
  const renderHeader = useCallback(() => {
    // Build subtitle text
    let subtitleText: string
    if (posts.length === 0) {
      subtitleText = 'No posts yet'
    } else if (posts.length === 1) {
      subtitleText = '1 post'
    } else {
      subtitleText = `${posts.length} posts`
    }

    // Show check-in status in subtitle if checked in here
    const isCheckedInHere = isCheckedInAt(locationId)
    if (isCheckedInHere && activeCheckin?.verified) {
      subtitleText += ' • You\'re checked in'
    }

    return (
      <View testID="ledger-header">
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{locationName}</Text>
              <Text style={styles.headerSubtitle}>{subtitleText}</Text>
            </View>
            <CheckinButton
              locationId={locationId}
              locationName={locationName}
              size="small"
              testID="ledger-checkin-button"
            />
          </View>
        </View>
        <PostFilters
          selectedTimeFilter={timeFilter}
          onTimeFilterChange={handleTimeFilterChange}
          disabled={loading}
          testID="ledger-time-filter"
        />
      </View>
    )
  }, [locationId, locationName, posts.length, timeFilter, handleTimeFilterChange, loading, isCheckedInAt, activeCheckin])

  /**
   * Render empty state when no posts exist
   */
  const renderEmptyState = useCallback(() => {
    if (loading) return null

    return (
      <View style={styles.emptyContainer}>
        <EmptyLedger
          onCreatePost={handleCreatePost}
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
          error={error || 'Failed to load posts'}
          onRetry={handleRetry}
        />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: POST LIST
  // ---------------------------------------------------------------------------

  return (
    <Tooltip
      isVisible={tutorial.isVisible}
      content={renderTutorialContent()}
      placement="bottom"
      onClose={tutorial.markComplete}
      closeOnChildInteraction={false}
      allowChildInteraction={true}
      topAdjustment={Platform.OS === 'android' ? -(StatusBar.currentHeight ?? 0) : 0}
    >
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
    </Tooltip>
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
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTitleContainer: {
    flex: 1,
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

/**
 * Styles for tutorial tooltip content
 */
const tooltipStyles = StyleSheet.create({
  container: {
    padding: 16,
    maxWidth: 280,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#FF6B47',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default LedgerScreen