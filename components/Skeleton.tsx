/**
 * Skeleton - Shimmer loading component
 *
 * Smooth shimmer animation using react-native-reanimated.
 * Provides placeholder UI while content loads.
 *
 * Features:
 * - Smooth shimmer gradient animation
 * - Configurable size and shape (width, height, borderRadius)
 * - Variants: text, circle, card
 * - Preset composites: SkeletonPostCard, SkeletonChatItem, SkeletonAvatar
 * - Dark theme optimized
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { darkTheme } from '../constants/glassStyles';
import { spacing, borderRadius as themeBorderRadius } from '../constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  variant?: 'text' | 'circle' | 'card' | 'circular' | 'rectangular' | 'rounded';
  style?: ViewStyle;
}

interface SkeletonGroupProps {
  style?: ViewStyle;
}

// ============================================================================
// SKELETON BASE COMPONENT
// ============================================================================

/**
 * Skeleton - Base shimmer component
 *
 * @param width - Width in pixels or percentage (default: '100%')
 * @param height - Height in pixels (default: 20)
 * @param borderRadius - Border radius (default: based on variant)
 * @param variant - Shape variant ('text' | 'circle' | 'card' | 'circular' | 'rectangular' | 'rounded')
 * @param style - Additional styles
 *
 * @example
 * ```tsx
 * <Skeleton width={200} height={40} variant="text" />
 * <Skeleton width={60} height={60} variant="circle" />
 * <Skeleton width="100%" height={300} variant="card" />
 * ```
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius,
  variant = 'text',
  style,
}: SkeletonProps): JSX.Element {
  // Determine default border radius based on variant
  const defaultBorderRadius = (() => {
    switch (variant) {
      case 'circle':
      case 'circular':
        return 9999;
      case 'card':
      case 'rounded':
        return themeBorderRadius.lg;
      case 'rectangular':
        return 0;
      case 'text':
      default:
        return themeBorderRadius.sm;
    }
  })();

  const finalBorderRadius = borderRadius ?? defaultBorderRadius;

  // Shimmer animation
  const shimmerTranslate = useSharedValue(-1);

  React.useEffect(() => {
    shimmerTranslate.value = withRepeat(
      withTiming(1, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false
    );
  }, [shimmerTranslate]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shimmerTranslate.value * 300 }],
    };
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: finalBorderRadius,
        },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmer, animatedStyle]} />
    </View>
  );
}

// ============================================================================
// SKELETON AVATAR
// ============================================================================

/**
 * SkeletonAvatar - Circular avatar placeholder
 *
 * @param size - Avatar diameter (default: 48)
 *
 * @example
 * ```tsx
 * <SkeletonAvatar size={60} />
 * ```
 */
export function SkeletonAvatar({ size = 48 }: { size?: number }): JSX.Element {
  return <Skeleton width={size} height={size} variant="circle" />;
}

// ============================================================================
// SKELETON POST CARD
// ============================================================================

/**
 * SkeletonPostCard - Loading placeholder for PostCard
 *
 * Mimics the structure of a post card with avatar, text lines, and image.
 *
 * @example
 * ```tsx
 * <SkeletonPostCard />
 * ```
 */
export function SkeletonPostCard({ style }: SkeletonGroupProps): JSX.Element {
  return (
    <View style={[styles.postCard, style]}>
      {/* Header: Avatar + Name + Time */}
      <View style={styles.postHeader}>
        <SkeletonAvatar size={48} />
        <View style={styles.postHeaderText}>
          <Skeleton width={120} height={16} variant="text" />
          <Skeleton width={80} height={12} variant="text" style={styles.spacingTop4} />
        </View>
      </View>

      {/* Image placeholder */}
      <Skeleton
        width="100%"
        height={280}
        variant="card"
        style={styles.spacingTop12}
      />

      {/* Caption lines */}
      <View style={styles.spacingTop12}>
        <Skeleton width="90%" height={14} variant="text" />
        <Skeleton width="70%" height={14} variant="text" style={styles.spacingTop4} />
      </View>

      {/* Location and time info */}
      <View style={styles.postFooter}>
        <Skeleton width={100} height={12} variant="text" />
        <Skeleton width={60} height={12} variant="text" />
      </View>
    </View>
  );
}

// ============================================================================
// SKELETON CHAT ITEM
// ============================================================================

/**
 * SkeletonChatItem - Loading placeholder for chat conversation item
 *
 * Mimics the structure of a chat list item with avatar, name, message preview, and timestamp.
 *
 * @example
 * ```tsx
 * <SkeletonChatItem />
 * ```
 */
export function SkeletonChatItem({ style }: SkeletonGroupProps): JSX.Element {
  return (
    <View style={[styles.chatItem, style]}>
      <SkeletonAvatar size={56} />
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Skeleton width={140} height={16} variant="text" />
          <Skeleton width={50} height={12} variant="text" />
        </View>
        <Skeleton
          width="85%"
          height={14}
          variant="text"
          style={styles.spacingTop6}
        />
      </View>
    </View>
  );
}

// ============================================================================
// SKELETON TEXT BLOCK
// ============================================================================

/**
 * SkeletonTextBlock - Multiple text line placeholders
 *
 * @param lines - Number of text lines (default: 3)
 *
 * @example
 * ```tsx
 * <SkeletonTextBlock lines={4} />
 * ```
 */
export function SkeletonTextBlock({ lines = 3 }: { lines?: number }): JSX.Element {
  return (
    <View>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '70%' : '100%'}
          height={14}
          variant="text"
          style={index > 0 ? styles.spacingTop6 : undefined}
        />
      ))}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: darkTheme.surface,
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    // Gradient-like shimmer effect using opacity layers
    opacity: 0.5,
  },

  // Post card styles
  postCard: {
    backgroundColor: darkTheme.cardBackground,
    borderRadius: themeBorderRadius.lg,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postHeaderText: {
    flex: 1,
    marginLeft: spacing[3],
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[3],
  },

  // Chat item styles
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: darkTheme.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.cardBorder,
  },
  chatContent: {
    flex: 1,
    marginLeft: spacing[3],
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Spacing utilities
  spacingTop4: {
    marginTop: spacing[1],
  },
  spacingTop6: {
    marginTop: spacing[1.5],
  },
  spacingTop12: {
    marginTop: spacing[3],
  },
});

export default Skeleton;
