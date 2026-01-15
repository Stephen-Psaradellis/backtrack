/**
 * FeedScreen - Browse nearby posts feed
 *
 * The Feed tab shows a scrollable list of posts within 50m radius of the user.
 * Features:
 * - FlatList with PostCard items
 * - Pull-to-refresh
 * - Empty state when no posts nearby
 * - Loading state with ActivityIndicator
 */
import React, { useCallback } from 'react'
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'

import { GlobalHeader } from '../components/navigation/GlobalHeader'
import { FloatingActionButtons } from '../components/navigation/FloatingActionButtons'
import { PostCard } from '../components/PostCard'
import { useNearbyPosts } from '../hooks/useNearbyPosts'
import { selectionFeedback } from '../lib/haptics'
import { colors } from '../constants/theme'
import type { MainTabNavigationProp } from '../navigation/types'
import type { Post } from '../types/database'

// ============================================================================
// CONSTANTS
// ============================================================================

/** Search radius in meters for nearby posts */
const NEARBY_RADIUS_METERS = 50

// ============================================================================
// COMPONENT
// ============================================================================

export function FeedScreen(): React.ReactNode {
  const navigation = useNavigation<MainTabNavigationProp>()
  const { posts, isLoading, error, refetch } = useNearbyPosts(NEARBY_RADIUS_METERS)
  const [refreshing, setRefreshing] = React.useState(false)

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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  // ---------------------------------------------------------------------------
  // Render Helpers
  // ---------------------------------------------------------------------------

  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <View style={styles.postItem}>
        <PostCard
          post={item}
          onPress={handlePostPress}
          showLocation={true}
          testID={`feed-post-${item.id}`}
        />
      </View>
    ),
    [handlePostPress]
  )

  const keyExtractor = useCallback((item: Post) => item.id, [])

  const renderEmptyState = useCallback(() => {
    if (isLoading) return null

    return (
      <View style={styles.emptyContainer} testID="feed-empty-state">
        <Ionicons name="location-outline" size={64} color={colors.neutral[300]} />
        <Text style={styles.emptyTitle}>No posts nearby</Text>
        <Text style={styles.emptySubtitle}>Be the first!</Text>
        <Text style={styles.emptyDescription}>
          Posts within 50 meters of you will appear here.
        </Text>
      </View>
    )
  }, [isLoading])

  const renderErrorState = useCallback(() => (
    <View style={styles.emptyContainer} testID="feed-error-state">
      <Ionicons name="warning-outline" size={64} color={colors.error.main} />
      <Text style={styles.emptyTitle}>Unable to load posts</Text>
      <Text style={styles.emptyDescription}>{error}</Text>
    </View>
  ), [error])

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (isLoading && !refreshing && posts.length === 0) {
    return (
      <View style={styles.container} testID="feed-screen">
        <GlobalHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Finding nearby posts...</Text>
        </View>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // Error State
  // ---------------------------------------------------------------------------

  if (error && posts.length === 0) {
    return (
      <View style={styles.container} testID="feed-screen">
        <GlobalHeader />
        {renderErrorState()}
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // Main Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container} testID="feed-screen">
      <GlobalHeader />
      <FloatingActionButtons testID="feed-floating-actions" />
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          posts.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
            testID="feed-refresh-control"
          />
        }
        testID="feed-post-list"
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  postItem: {
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary[500],
    marginTop: 4,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
})

export default FeedScreen
