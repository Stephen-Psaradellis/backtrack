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
  Alert,
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
import { isInTimeRange, type TimeFilter } from '../components/TimeFilterChips'
import { TrendingVenues } from '../components/TrendingVenues'
import { HangoutsList } from '../components/HangoutsList'
import { CreateHangoutModal } from '../components/CreateHangoutModal'
import { useNearbyPosts, RADIUS_TIERS } from '../hooks/useNearbyPosts'
import { useTrendingVenues } from '../hooks/useTrendingVenues'
import { useHangouts } from '../hooks/useHangouts'
import { useLocation } from '../hooks/useLocation'
import { useCheckin } from '../hooks/useCheckin'
import * as Location from 'expo-location'
import { selectionFeedback, successFeedback, errorFeedback } from '../lib/haptics'
import { supabase } from '../lib/supabase'
import {
  searchNearbyPlaces,
  transformGooglePlaces,
  cacheVenueToSupabase,
  type GooglePlaceTransformed,
} from '../services/locationService'
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

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Newest', value: 'newest' },
  { label: 'Closest', value: 'closest' },
  { label: 'Best Match', value: 'best_match' },
]

/** Time filter options for cycling */
const TIME_FILTERS: { label: string; value: TimeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Now', value: 'now' },
  { label: 'Today', value: 'today' },
  { label: 'Last Night', value: 'last_night' },
  { label: 'Weekend', value: 'weekend' },
  { label: 'Week', value: 'this_week' },
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
  const { activeCheckin, checkIn, checkOut, isCheckingIn } = useCheckin()
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

  const handleCycleRadius = useCallback(async () => {
    await selectionFeedback()
    const currentIndex = RADIUS_OPTIONS.findIndex(o => o.value === selectedRadius)
    const nextIndex = (currentIndex + 1) % RADIUS_OPTIONS.length
    setSelectedRadius(RADIUS_OPTIONS[nextIndex].value)
    setEnableTieredExpansion(false)
  }, [selectedRadius])

  const handleCycleSort = useCallback(async () => {
    await selectionFeedback()
    const currentIndex = SORT_OPTIONS.findIndex(o => o.value === sortBy)
    const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length
    setSortBy(SORT_OPTIONS[nextIndex].value)
  }, [sortBy])

  const handleCycleTimeFilter = useCallback(async () => {
    await selectionFeedback()
    const currentIndex = TIME_FILTERS.findIndex(o => o.value === timeFilter)
    const nextIndex = (currentIndex + 1) % TIME_FILTERS.length
    setTimeFilter(TIME_FILTERS[nextIndex].value)
  }, [timeFilter])

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

    // If already checked in, offer checkout
    if (activeCheckin) {
      Alert.alert(
        'Check Out',
        `Are you sure you want to check out from ${activeCheckin.location_name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Check Out',
            style: 'destructive',
            onPress: async () => {
              const result = await checkOut(activeCheckin.location_id)
              if (result.success) {
                await successFeedback()
              } else {
                await errorFeedback()
                Alert.alert('Error', result.error || 'Failed to check out')
              }
            },
          },
        ]
      )
      return
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        await errorFeedback()
        Alert.alert(
          'Location Required',
          'Location permission is required to check in. Please enable it in your device settings.'
        )
        return
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      const lat = location.coords.latitude
      const lon = location.coords.longitude

      // Search for nearby locations in our database
      const { data: dbLocations } = await supabase.rpc('get_locations_near_point', {
        p_lat: lat,
        p_lon: lon,
        p_radius_meters: 200,
        p_limit: 10,
      })

      type NearbyLoc = {
        id: string
        name: string
        distance: number
        fromGooglePlaces: boolean
        placeData?: GooglePlaceTransformed
      }

      let locations: NearbyLoc[] = []

      if (dbLocations && dbLocations.length > 0) {
        locations = dbLocations.map((loc: { id: string; name: string; distance_meters: number }) => ({
          id: loc.id,
          name: loc.name,
          distance: loc.distance_meters,
          fromGooglePlaces: false,
        }))
      } else {
        // Fallback to Google Places
        const result = await searchNearbyPlaces({
          latitude: lat,
          longitude: lon,
          radius_meters: 200,
          max_results: 10,
        })

        if (result.success && result.places.length > 0) {
          const transformed = transformGooglePlaces(result.places, false)
          locations = transformed.map(place => ({
            id: '',
            name: place.name,
            distance: 0,
            fromGooglePlaces: true,
            placeData: place,
          }))
        }
      }

      if (locations.length === 0) {
        await errorFeedback()
        Alert.alert(
          'No Venues Found',
          'No venues found nearby. Please try again when you\'re at a bar, restaurant, or other venue.'
        )
        return
      }

      // Show location picker via Alert
      const buttons = locations.slice(0, 5).map(loc => ({
        text: loc.fromGooglePlaces ? `${loc.name} (new)` : loc.name,
        onPress: async () => {
          let locationId = loc.id
          if (loc.fromGooglePlaces && loc.placeData) {
            const cacheResult = await cacheVenueToSupabase(supabase, loc.placeData)
            if (!cacheResult.success || !cacheResult.location) {
              await errorFeedback()
              Alert.alert('Error', 'Could not save this venue. Please try again.')
              return
            }
            locationId = cacheResult.location.id
          }

          const result = await checkIn(locationId)
          if (result.success) {
            await successFeedback()
            if (result.alreadyCheckedIn) {
              Alert.alert('Already Checked In', `You're already checked in at ${loc.name}`)
            }
          } else {
            await errorFeedback()
            Alert.alert('Check-In Failed', result.error || 'Failed to check in')
          }
        },
      }))

      buttons.push({ text: 'Cancel', onPress: async () => {} })

      Alert.alert(
        'Select a Venue',
        'Choose a venue to check in:',
        buttons
      )
    } catch (err) {
      await errorFeedback()
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to get your location'
      )
    }
  }, [activeCheckin, checkIn, checkOut])

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
            distance={distance}
            testID={`feed-post-${item.id}`}
          />
        </AnimatedPostItem>
      )
    },
    [handlePostPress, effectiveRadius]
  )

  const keyExtractor = useCallback((item: Post) => item.id, [])

  /** Compact filter pills - single row replacing 3 filter sections */
  const renderCompactFilters = useCallback(() => {
    const radiusLabel = RADIUS_OPTIONS.find(o => o.value === selectedRadius)?.label ?? 'Area'
    const timeLabel = TIME_FILTERS.find(o => o.value === timeFilter)?.label ?? 'All'
    const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Newest'
    const viewIcon = viewMode === 'list' ? 'list-outline' : viewMode === 'cards' ? 'layers-outline' : 'people-outline'

    return (
      <View style={styles.compactFiltersRow} testID="feed-compact-filters">
        <TouchableOpacity
          style={styles.filterPill}
          onPress={handleCycleRadius}
          activeOpacity={0.7}
          testID="feed-filter-radius"
          accessibilityRole="button"
          accessibilityLabel={`Radius: ${radiusLabel}. Tap to change.`}
        >
          <Ionicons name="location-outline" size={14} color={darkTheme.accent} />
          <Text style={styles.filterPillText}>{radiusLabel}</Text>
          <Ionicons name="chevron-down" size={12} color={darkTheme.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterPill}
          onPress={handleCycleTimeFilter}
          activeOpacity={0.7}
          testID="feed-filter-time"
          accessibilityRole="button"
          accessibilityLabel={`Time: ${timeLabel}. Tap to change.`}
        >
          <Ionicons name="time-outline" size={14} color={darkTheme.accent} />
          <Text style={styles.filterPillText}>{timeLabel}</Text>
          <Ionicons name="chevron-down" size={12} color={darkTheme.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterPill}
          onPress={handleCycleSort}
          activeOpacity={0.7}
          testID="feed-filter-sort"
          accessibilityRole="button"
          accessibilityLabel={`Sort: ${sortLabel}. Tap to change.`}
        >
          <Ionicons name="swap-vertical-outline" size={14} color={darkTheme.accent} />
          <Text style={styles.filterPillText}>{sortLabel}</Text>
          <Ionicons name="chevron-down" size={12} color={darkTheme.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterPillIcon}
          onPress={handleToggleViewMode}
          activeOpacity={0.7}
          testID="feed-view-mode-toggle"
          accessibilityRole="button"
          accessibilityLabel={`View mode: ${viewMode}`}
        >
          <Ionicons name={viewIcon} size={18} color={darkTheme.textSecondary} />
        </TouchableOpacity>
      </View>
    )
  }, [selectedRadius, timeFilter, sortBy, viewMode, handleCycleRadius, handleCycleTimeFilter, handleCycleSort, handleToggleViewMode])

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
      {renderCompactFilters()}
    </View>
  ), [renderTrendingSection, renderCompactFilters])

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
          <ScrollView
            style={styles.cardsHeader}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {renderListHeader()}
          </ScrollView>
          <View style={styles.cardsStackArea}>
            <SwipeableCardStack
              posts={sortedPosts}
              onSwipeRight={handleSwipeRight}
              onSwipeLeft={handleSwipeLeft}
              renderCard={renderSwipeableCard}
              testID="feed-card-stack"
            />
          </View>
        </View>
      ) : (
        <View style={styles.hangoutsContainer}>
          <View style={styles.hangoutsHeader}>
            {renderListHeader()}
          </View>
          <HangoutsList
            hangouts={nearbyHangouts}
            onCreatePress={handleCreateHangout}
            onRefresh={refetchNearby}
            isRefreshing={hangoutsLoading}
            testID="feed-hangouts-list"
          />
        </View>
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

  // Compact filter pills row
  compactFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[0.5],
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: 16,
    backgroundColor: darkTheme.surface,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: darkTheme.textSecondary,
  },
  filterPillIcon: {
    marginLeft: 'auto',
    padding: spacing[1.5],
    backgroundColor: darkTheme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
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
  cardsHeader: {
    flexGrow: 0,
    paddingHorizontal: spacing[4],
  },
  cardsStackArea: {
    flex: 1,
  },
  hangoutsContainer: {
    flex: 1,
  },
  hangoutsHeader: {
    paddingHorizontal: spacing[4],
  },
})

export default FeedScreen
