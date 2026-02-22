/**
 * FeedScreen - Browse nearby posts feed
 *
 * The Feed tab shows a scrollable list of posts within a configurable radius.
 * Features:
 * - FlatList with PostCard items
 * - Pull-to-refresh
 * - Empty state when no posts nearby
 * - Loading state with ActivityIndicator
 * - Modern dark theme with glassmorphism
 * - Configurable search radius (50m, 100m, 500m, 1km) - UX-016
 * - Sort options (Newest, Closest, Best Match) - UX-017
 */
import React, { useCallback, useMemo, useRef } from 'react'
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'

import { GlobalHeader } from '../components/navigation/GlobalHeader'
import { FloatingActionButtons } from '../components/navigation/FloatingActionButtons'
import { PostCard } from '../components/PostCard'
import { SwipeableCardStack } from '../components/SwipeableCardStack'
import { EmptyFeed } from '../components/EmptyState'
import { TimeFilterChips, isInTimeRange, type TimeFilter } from '../components/TimeFilterChips'
import { TrendingVenues } from '../components/TrendingVenues'
import { HangoutsList } from '../components/HangoutsList'
import { CreateHangoutModal } from '../components/CreateHangoutModal'
import { useNearbyPosts, RADIUS_TIERS } from '../hooks/useNearbyPosts'
import { useTrendingVenues } from '../hooks/useTrendingVenues'
import { useHangouts } from '../hooks/useHangouts'
import { useLocation } from '../hooks/useLocation'
import { useCheckin } from '../hooks/useCheckin'
import { selectionFeedback } from '../lib/haptics'
import { colors, spacing } from '../constants/theme'
import { darkTheme } from '../constants/glassStyles'
import { SkeletonPostCard } from '../components/Skeleton'
import type { MainTabNavigationProp } from '../navigation/types'
import type { Post } from '../types/database'

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default search radius in meters - UX-016: increased to 2km for better discovery */
const DEFAULT_RADIUS_METERS = 2000

/** Available radius options for the selector - tiered for city-wide discovery */
const RADIUS_OPTIONS = [
  { label: 'Here', value: 50, description: '50m' },
  { label: 'Nearby', value: 500, description: '500m' },
  { label: 'Area', value: 2000, description: '2km' },
  { label: 'City', value: 25000, description: '25km' },
] as const

/** Sort options for feed filtering - UX-017 */
type SortOption = 'newest' | 'closest' | 'best_match'

const SORT_OPTIONS: { label: string; value: SortOption; icon: string }[] = [
  { label: 'Newest', value: 'newest', icon: 'time-outline' },
  { label: 'Closest', value: 'closest', icon: 'navigate-outline' },
  { label: 'Best Match', value: 'best_match', icon: 'star-outline' },
]

/** View mode options */
type ViewMode = 'list' | 'cards' | 'hangouts'

// ============================================================================
// ANIMATED POST ITEM COMPONENT
// ============================================================================

/**
 * AnimatedPostItem - Individual post with staggered fade-in and scale animation
 * M-045: StaggeredPostList easing upgrade
 */
interface AnimatedPostItemProps {
  index: number
  children: React.ReactNode
}

const MAX_STAGGER_INDEX = 8 // Cap stagger at 8 items
const STAGGER_DELAY = 80 // Delay per item in ms
const ANIMATION_DURATION = 300 // Animation duration in ms

function AnimatedPostItem({ index, children }: AnimatedPostItemProps): JSX.Element {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current

  React.useEffect(() => {
    // Only animate first 8 items
    if (index >= MAX_STAGGER_INDEX) {
      fadeAnim.setValue(1)
      scaleAnim.setValue(1)
      return
    }

    // Staggered animation with cubic easing
    const delay = index * STAGGER_DELAY
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [index, fadeAnim, scaleAnim])

  // Skip animation wrapper for items beyond index 8
  if (index >= MAX_STAGGER_INDEX) {
    return <View style={styles.postItem}>{children}</View>
  }

  return (
    <Animated.View
      style={[
        styles.postItem,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FeedScreen(): React.ReactNode {
  const navigation = useNavigation<MainTabNavigationProp>()
  const [selectedRadius, setSelectedRadius] = React.useState(DEFAULT_RADIUS_METERS)
  const [enableTieredExpansion, setEnableTieredExpansion] = React.useState(true)
  const [sortBy, setSortBy] = React.useState<SortOption>('newest')
  const [timeFilter, setTimeFilter] = React.useState<TimeFilter>('all')
  const [showTrending, setShowTrending] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<ViewMode>('list')
  const [showCreateHangout, setShowCreateHangout] = React.useState(false)
  const { posts, isLoading, error, refetch, activeTier, effectiveRadius, usingTieredExpansion } = useNearbyPosts(
    selectedRadius,
    enableTieredExpansion
  )
  const { latitude, longitude } = useLocation()
  const { venues: trendingVenues, isLoading: trendingLoading } = useTrendingVenues(
    latitude,
    longitude,
    25000,
    5
  )
  const { nearbyHangouts, isLoadingNearby: hangoutsLoading, refetchNearby } = useHangouts(selectedRadius)
  const { activeCheckin } = useCheckin()
  const [refreshing, setRefreshing] = React.useState(false)

  // ---------------------------------------------------------------------------
  // Filter and sort posts client-side - UX-017
  // ---------------------------------------------------------------------------

  const sortedPosts = useMemo(() => {
    if (!posts || posts.length === 0) return posts

    // First, filter by time range
    let filtered = posts
    if (timeFilter !== 'all') {
      filtered = posts.filter(post => {
        if (!post.created_at) return false
        return isInTimeRange(post.created_at, timeFilter)
      })
    }

    // Then sort
    const sorted = [...filtered]

    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
          return dateB - dateA
        })
        break
      case 'closest':
        // Sort by distance if available (from RPC), otherwise by location data
        sorted.sort((a, b) => {
          const distA = (a as any).distance ?? (a as any).dist_meters ?? Number.MAX_SAFE_INTEGER
          const distB = (b as any).distance ?? (b as any).dist_meters ?? Number.MAX_SAFE_INTEGER
          return distA - distB
        })
        break
      case 'best_match':
        // Sort by match_score if available, fall back to newest
        sorted.sort((a, b) => {
          const scoreA = (a as any).match_score ?? 0
          const scoreB = (b as any).match_score ?? 0
          if (scoreA !== scoreB) return scoreB - scoreA
          // Tie-break by newest
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
          return dateB - dateA
        })
        break
    }

    return sorted
  }, [posts, sortBy, timeFilter])

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

  const handleRadiusChange = useCallback(async (radius: number) => {
    await selectionFeedback()
    setSelectedRadius(radius)
    // Disable tiered expansion when user manually selects a radius
    setEnableTieredExpansion(false)
  }, [])

  const handleEnableTieredExpansion = useCallback(async () => {
    await selectionFeedback()
    setEnableTieredExpansion(true)
    // Reset to default radius when enabling tiered expansion
    setSelectedRadius(DEFAULT_RADIUS_METERS)
  }, [])

  const handleSortChange = useCallback(async (sort: SortOption) => {
    await selectionFeedback()
    setSortBy(sort)
  }, [])

  const handleTimeFilterChange = useCallback(async (filter: TimeFilter) => {
    await selectionFeedback()
    setTimeFilter(filter)
  }, [])

  const handleToggleTrending = useCallback(async () => {
    await selectionFeedback()
    setShowTrending(prev => !prev)
  }, [])

  const handleBrowseMap = useCallback(async () => {
    await selectionFeedback()
    navigation.navigate('MapTab')
  }, [navigation])

  const handleCheckIn = useCallback(async () => {
    await selectionFeedback()
    // TODO: Implement check-in flow when check-in feature is added
    console.log('Check-in flow not yet implemented')
  }, [])

  const handleCreatePost = useCallback(async () => {
    await selectionFeedback()
    navigation.navigate('CreatePost')
  }, [navigation])

  const handleToggleViewMode = useCallback(async () => {
    await selectionFeedback()
    setViewMode(prev => {
      if (prev === 'list') return 'cards'
      if (prev === 'cards') return 'hangouts'
      return 'list'
    })
  }, [])

  const handleCreateHangout = useCallback(async () => {
    await selectionFeedback()
    setShowCreateHangout(true)
  }, [])

  const handleCloseCreateHangout = useCallback(() => {
    setShowCreateHangout(false)
  }, [])

  const handleSwipeRight = useCallback(async (post: Post) => {
    await selectionFeedback()
    // Navigate to post detail when interested
    navigation.navigate('PostDetail', { postId: post.id })
  }, [navigation])

  const handleSwipeLeft = useCallback(async (post: Post) => {
    await selectionFeedback()
    // Just skip to next card
  }, [])

  // ---------------------------------------------------------------------------
  // Render Helpers
  // ---------------------------------------------------------------------------

  const renderPost = useCallback(
    ({ item, index }: { item: Post; index: number }) => {
      // Calculate detail level based on effective radius and actual distance
      const distance = (item as any).distance ?? (item as any).dist_meters ?? 0
      let detailLevel: 'full' | 'reduced' | 'minimal' = 'full'

      // Use effective radius tier to determine detail level
      // This provides consistent privacy based on the search radius
      if (effectiveRadius >= 10000) {
        detailLevel = 'minimal' // City-wide or extended: minimal detail for privacy
      } else if (effectiveRadius >= 2000) {
        detailLevel = 'reduced' // Neighborhood: reduced detail
      } else if (distance > 500) {
        detailLevel = 'reduced' // Far within nearby tier: reduced detail
      }
      // Otherwise 'full' for close posts (0-500m in nearby tier)

      return (
        <AnimatedPostItem index={index} key={item.id}>
          <PostCard
            post={item}
            onPress={handlePostPress}
            showLocation={true}
            detailLevel={detailLevel}
            testID={`feed-post-${item.id}`}
          />
        </AnimatedPostItem>
      )
    },
    [handlePostPress, effectiveRadius]
  )

  const keyExtractor = useCallback((item: Post) => item.id, [])

  /** View mode toggle button */
  const renderViewModeToggle = useCallback(() => {
    const icon = viewMode === 'list' ? 'layers-outline' : viewMode === 'cards' ? 'people-outline' : 'list-outline'
    return (
      <TouchableOpacity
        style={styles.viewModeToggle}
        onPress={handleToggleViewMode}
        activeOpacity={0.7}
        testID="feed-view-mode-toggle"
        accessibilityRole="button"
        accessibilityLabel={`Switch view mode, currently ${viewMode === 'list' ? 'list view' : viewMode === 'cards' ? 'card view' : 'hangouts view'}`}
        accessibilityHint="Double tap to change how posts are displayed"
      >
        <Ionicons
          name={icon}
          size={20}
          color={darkTheme.textSecondary}
        />
      </TouchableOpacity>
    )
  }, [viewMode, handleToggleViewMode])

  /** Active tier indicator - shows which radius is actually being used */
  const renderActiveTierIndicator = useCallback(() => {
    if (!usingTieredExpansion) return null

    const isExpanded = effectiveRadius > selectedRadius

    return (
      <View style={styles.tierIndicator}>
        <View style={styles.tierIndicatorContent}>
          <Ionicons
            name={isExpanded ? "expand-outline" : "locate-outline"}
            size={14}
            color={isExpanded ? darkTheme.warning : darkTheme.success}
          />
          <Text style={styles.tierIndicatorText}>
            {isExpanded
              ? `Expanded to ${activeTier.description} • ${posts.length} post${posts.length !== 1 ? 's' : ''} found`
              : `Showing posts within ${activeTier.description}`
            }
          </Text>
        </View>
        {isExpanded && (
          <TouchableOpacity
            onPress={handleEnableTieredExpansion}
            style={styles.tierIndicatorReset}
            activeOpacity={0.7}
            testID="feed-tier-reset"
            accessibilityRole="button"
            accessibilityLabel="Reset to automatic radius"
          >
            <Ionicons name="refresh-outline" size={14} color={darkTheme.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    )
  }, [usingTieredExpansion, effectiveRadius, selectedRadius, activeTier, posts.length, handleEnableTieredExpansion])

  /** Radius selector chips - UX-016 with tiered expansion */
  const renderRadiusSelector = useCallback(() => (
    <View style={styles.filterSection}>
      <View style={styles.filterRow}>
        <Ionicons name="radio-outline" size={16} color={darkTheme.textMuted} />
        <Text style={styles.filterLabel}>Radius</Text>
        <TouchableOpacity
          style={[styles.tierToggle, usingTieredExpansion && styles.tierToggleActive]}
          onPress={handleEnableTieredExpansion}
          activeOpacity={0.7}
          testID="feed-tier-toggle"
          accessibilityRole="button"
          accessibilityLabel={`Auto-expand ${usingTieredExpansion ? 'enabled' : 'disabled'}`}
          accessibilityHint="Toggle automatic radius expansion"
        >
          <Ionicons
            name="expand-outline"
            size={12}
            color={usingTieredExpansion ? darkTheme.primary : darkTheme.textMuted}
          />
          <Text style={[styles.tierToggleText, usingTieredExpansion && styles.tierToggleTextActive]}>
            Auto
          </Text>
        </TouchableOpacity>
        {renderViewModeToggle()}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {RADIUS_OPTIONS.map((option) => {
          const isSelected = selectedRadius === option.value && !usingTieredExpansion
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => handleRadiusChange(option.value)}
              activeOpacity={0.7}
              testID={`feed-radius-${option.value}`}
              accessibilityRole="button"
              accessibilityLabel={`Search radius ${option.label}, ${option.description}`}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.chipContent}>
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {option.label}
                </Text>
                <Text style={[styles.chipSubtext, isSelected && styles.chipSubtextSelected]}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
      {renderActiveTierIndicator()}
    </View>
  ), [selectedRadius, handleRadiusChange, renderViewModeToggle, viewMode, usingTieredExpansion, handleEnableTieredExpansion, renderActiveTierIndicator])

  /** Sort option chips - UX-017 */
  const renderSortSelector = useCallback(() => (
    <View style={styles.filterSection}>
      <View style={styles.filterRow}>
        <Ionicons name="funnel-outline" size={16} color={darkTheme.textMuted} />
        <Text style={styles.filterLabel}>Sort</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {SORT_OPTIONS.map((option) => {
          const isSelected = sortBy === option.value
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => handleSortChange(option.value)}
              activeOpacity={0.7}
              testID={`feed-sort-${option.value}`}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${option.label}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Ionicons
                name={option.icon as any}
                size={14}
                color={isSelected ? '#FFFFFF' : darkTheme.textSecondary}
              />
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  ), [sortBy, handleSortChange])

  /** Trending section rendered above filters */
  const renderTrendingSection = useCallback(() => {
    if (trendingLoading || trendingVenues.length === 0) {
      return null
    }

    return (
      <View style={styles.trendingSection}>
        <TouchableOpacity
          style={styles.trendingHeader}
          onPress={handleToggleTrending}
          activeOpacity={0.7}
          testID="feed-trending-header"
          accessibilityRole="button"
          accessibilityLabel={`Trending venues section, ${showTrending ? 'expanded' : 'collapsed'}`}
          accessibilityHint="Double tap to toggle trending venues"
        >
          <View style={styles.trendingHeaderLeft}>
            <Text style={styles.trendingHeaderEmoji}>🔥</Text>
            <Text style={styles.trendingHeaderText}>Trending Now</Text>
          </View>
          <Ionicons
            name={showTrending ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={darkTheme.textSecondary}
          />
        </TouchableOpacity>
        {showTrending && (
          <TrendingVenues venues={trendingVenues} testID="feed-trending-venues" />
        )}
      </View>
    )
  }, [trendingLoading, trendingVenues, showTrending, handleToggleTrending])

  /** Combined filter bar rendered as FlatList header */
  const renderListHeader = useCallback(() => (
    <View testID="feed-list-header">
      {renderTrendingSection()}
      <View style={styles.filtersBar} testID="feed-filters-bar">
        {renderRadiusSelector()}
        <TimeFilterChips
          selectedFilter={timeFilter}
          onFilterChange={handleTimeFilterChange}
          testID="feed-time-filter"
        />
        {renderSortSelector()}
      </View>
    </View>
  ), [renderTrendingSection, renderRadiusSelector, renderSortSelector, timeFilter, handleTimeFilterChange])

  const renderEmptyState = useCallback(() => {
    if (isLoading) return null

    return (
      <EmptyFeed
        onBrowseMap={handleBrowseMap}
        onCheckIn={handleCheckIn}
        onCreatePost={handleCreatePost}
        testID="feed-empty-state"
      />
    )
  }, [isLoading, handleBrowseMap, handleCheckIn, handleCreatePost])

  const renderErrorState = useCallback(() => (
    <View style={styles.emptyContainer} testID="feed-error-state">
      <Ionicons name="warning-outline" size={64} color={darkTheme.error} />
      <Text style={styles.emptyTitle}>Unable to load posts</Text>
      <Text style={styles.emptyDescription}>{error}</Text>
    </View>
  ), [error])

  /** Render card for swipeable stack */
  const renderSwipeableCard = useCallback((post: Post) => (
    <PostCard
      post={post}
      onPress={handlePostPress}
      showLocation={true}
      testID={`feed-swipe-card-${post.id}`}
    />
  ), [handlePostPress])

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (isLoading && !refreshing && posts.length === 0) {
    return (
      <View style={styles.container} testID="feed-screen">
        <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />
        <GlobalHeader />
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonPostCard key={index} style={index > 0 ? styles.skeletonItem : undefined} />
          ))}
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
        <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />
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
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />
      <GlobalHeader />
      <FloatingActionButtons testID="feed-floating-actions" />

      {viewMode === 'list' ? (
        <FlatList
          data={sortedPosts}
          renderItem={renderPost}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={[
            styles.listContent,
            sortedPosts.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={darkTheme.accent}
              colors={[darkTheme.accent]}
              progressBackgroundColor={darkTheme.cardBackground}
              testID="feed-refresh-control"
            />
          }
          windowSize={5}
          maxToRenderPerBatch={5}
          removeClippedSubviews={true}
          testID="feed-post-list"
        />
      ) : viewMode === 'cards' ? (
        <View style={styles.cardsContainer}>
          {renderListHeader()}
          <SwipeableCardStack
            posts={sortedPosts}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
            renderCard={renderSwipeableCard}
            testID="feed-card-stack"
          />
        </View>
      ) : (
        <HangoutsList
          hangouts={nearbyHangouts}
          onCreatePress={handleCreateHangout}
          onRefresh={refetchNearby}
          isRefreshing={hangoutsLoading}
          testID="feed-hangouts-list"
        />
      )}

      {/* Create Hangout Modal */}
      {activeCheckin && (
        <CreateHangoutModal
          visible={showCreateHangout}
          onClose={handleCloseCreateHangout}
          locationId={activeCheckin.location_id}
          locationName={activeCheckin.location_name}
          testID="feed-create-hangout-modal"
        />
      )}
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
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  skeletonItem: {
    marginTop: spacing[3],
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: 0,
    paddingBottom: Platform.OS === 'ios' ? 134 : 100, // Extra bottom padding for FABs (~100px)
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  postItem: {
    marginBottom: spacing[3],
  },

  // Trending section
  trendingSection: {
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.cardBorder,
    marginBottom: spacing[2],
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[0.5],
    paddingVertical: spacing[2],
  },
  trendingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  trendingHeaderEmoji: {
    fontSize: 20,
  },
  trendingHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },

  // Filters bar
  filtersBar: {
    paddingTop: spacing[1],
    paddingBottom: spacing[1],
    gap: spacing[1.5],
  },
  filterSection: {
    gap: spacing[1.5],
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[0.5],
    flex: 1,
  },
  tierToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1.5],
    backgroundColor: darkTheme.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },
  tierToggleActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: darkTheme.primary,
  },
  tierToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: darkTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierToggleTextActive: {
    color: darkTheme.primary,
  },
  viewModeToggle: {
    marginLeft: 'auto',
    padding: spacing[2],
    backgroundColor: darkTheme.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },
  tierIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    backgroundColor: darkTheme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },
  tierIndicatorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  tierIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
    color: darkTheme.textSecondary,
    flex: 1,
  },
  tierIndicatorReset: {
    padding: spacing[1.5],
    marginLeft: spacing[2],
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    borderRadius: 20,
    backgroundColor: darkTheme.surface,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },
  chipSelected: {
    backgroundColor: darkTheme.primary,
    borderColor: darkTheme.primary,
  },
  chipContent: {
    alignItems: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: darkTheme.textSecondary,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipSubtext: {
    fontSize: 10,
    fontWeight: '500',
    color: darkTheme.textMuted,
    marginTop: 2,
  },
  chipSubtextSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Error state (empty state now uses EmptyFeed component)
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: darkTheme.textPrimary,
    marginTop: spacing[4],
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: darkTheme.textSecondary,
    marginTop: spacing[2],
    textAlign: 'center',
    lineHeight: 20,
  },

  // Cards view container
  cardsContainer: {
    flex: 1,
  },
})

export default FeedScreen
