/**
 * StaggeredPostList Component
 *
 * A FlatList wrapper that animates list items with staggered fade-in effects.
 * Each item fades in (opacity 0->1) with translateY (20->0) on mount.
 *
 * @example
 * ```tsx
 * <StaggeredPostList
 *   data={posts}
 *   renderItem={({ item }) => <PostCard post={item} />}
 *   keyExtractor={(item) => item.id}
 *   ListEmptyComponent={<EmptyLocationState />}
 * />
 * ```
 */

import React, { memo, useCallback, useRef, useEffect } from 'react'
import {
  View,
  FlatList,
  Animated,
  StyleSheet,
  RefreshControl,
  type FlatListProps,
  type ListRenderItem,
  type ViewStyle,
} from 'react-native'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the StaggeredPostList component
 * Extends FlatListProps but overrides renderItem to include animation
 */
export interface StaggeredPostListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  /**
   * The data array to render
   */
  data: T[]

  /**
   * Render function for each item
   */
  renderItem: ListRenderItem<T>

  /**
   * Extract unique key from item
   */
  keyExtractor: (item: T, index: number) => string

  /**
   * Stagger delay between items in milliseconds
   * @default 120
   */
  staggerDelay?: number

  /**
   * Animation duration for each item in milliseconds
   * @default 400
   */
  animationDuration?: number

  /**
   * Whether to animate on initial render
   * @default true
   */
  animateOnMount?: boolean

  /**
   * Whether refreshing state
   */
  refreshing?: boolean

  /**
   * Callback when pull-to-refresh is triggered
   */
  onRefresh?: () => void

  /**
   * Style for the content container
   */
  contentContainerStyle?: ViewStyle

  /**
   * Component to render when list is empty
   */
  ListEmptyComponent?: React.ReactElement | React.ComponentType | null

  /**
   * Component to render at the top of the list
   */
  ListHeaderComponent?: React.ReactElement | React.ComponentType | null

  /**
   * Component to render at the bottom of the list
   */
  ListFooterComponent?: React.ReactElement | React.ComponentType | null

  /**
   * Test ID prefix
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  primary: '#FF6B47',
  background: '#FAFAF9',
}

// ============================================================================
// ANIMATED ITEM COMPONENT
// ============================================================================

interface AnimatedItemProps {
  index: number
  staggerDelay: number
  animationDuration: number
  children: React.ReactNode
  animateOnMount: boolean
}

const AnimatedItem = memo(function AnimatedItem({
  index,
  staggerDelay,
  animationDuration,
  children,
  animateOnMount,
}: AnimatedItemProps) {
  const opacity = useRef(new Animated.Value(animateOnMount ? 0 : 1)).current
  const translateY = useRef(new Animated.Value(animateOnMount ? 20 : 0)).current

  useEffect(() => {
    if (!animateOnMount) return

    const delay = index * staggerDelay

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: animationDuration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: animationDuration,
        delay,
        useNativeDriver: true,
      }),
    ])

    animation.start()

    return () => {
      animation.stop()
    }
  }, [index, staggerDelay, animationDuration, animateOnMount, opacity, translateY])

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
    >
      {children}
    </Animated.View>
  )
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * StaggeredPostList - Animated FlatList with staggered item entrance
 *
 * Each item animates in with:
 * - Opacity: 0 -> 1
 * - TranslateY: 20px -> 0
 * - Stagger delay based on index
 */
function StaggeredPostListInner<T>(
  {
    data,
    renderItem,
    keyExtractor,
    staggerDelay = 120,
    animationDuration = 400,
    animateOnMount = true,
    refreshing = false,
    onRefresh,
    contentContainerStyle,
    ListEmptyComponent,
    ListHeaderComponent,
    ListFooterComponent,
    testID = 'staggered-post-list',
    ...rest
  }: StaggeredPostListProps<T>,
  ref: React.Ref<FlatList<T>>
): JSX.Element {
  // Track animation state - reset when data changes
  const animationKey = useRef(0)

  useEffect(() => {
    animationKey.current += 1
  }, [data.length])

  // Wrap renderItem with animation
  const animatedRenderItem: ListRenderItem<T> = useCallback(
    (info) => {
      const content = renderItem(info)
      return (
        <AnimatedItem
          key={`${animationKey.current}-${info.index}`}
          index={info.index}
          staggerDelay={staggerDelay}
          animationDuration={animationDuration}
          animateOnMount={animateOnMount}
        >
          {content}
        </AnimatedItem>
      )
    },
    [renderItem, staggerDelay, animationDuration, animateOnMount]
  )

  // Refresh control
  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={COLORS.primary}
      colors={[COLORS.primary]}
    />
  ) : undefined

  return (
    <FlatList<T>
      ref={ref}
      data={data}
      renderItem={animatedRenderItem}
      keyExtractor={keyExtractor}
      refreshControl={refreshControl}
      contentContainerStyle={[
        styles.contentContainer,
        data.length === 0 && styles.emptyContainer,
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      testID={testID}
      {...rest}
    />
  )
}

// Forward ref for external access
export const StaggeredPostList = React.forwardRef(StaggeredPostListInner) as <T>(
  props: StaggeredPostListProps<T> & { ref?: React.Ref<FlatList<T>> }
) => JSX.Element

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  contentContainer: {
    paddingVertical: 8,
  },

  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default StaggeredPostList
