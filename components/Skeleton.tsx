/**
 * Skeleton Loading Components
 *
 * Modern shimmer loading states for React Native.
 * Use these instead of spinners for a more polished loading experience.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// TYPES
// ============================================================================

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'shimmer' | 'pulse' | 'none';
  style?: ViewStyle;
}

// ============================================================================
// SHIMMER ANIMATION COMPONENT
// ============================================================================

function ShimmerOverlay() {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { transform: [{ translateX }] },
      ]}
    >
      <LinearGradient
        colors={[
          'transparent',
          'rgba(255, 255, 255, 0.3)',
          'transparent',
        ]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

// ============================================================================
// BASE SKELETON COMPONENT
// ============================================================================

export function Skeleton({
  width = '100%',
  height = 16,
  variant = 'text',
  animation = 'shimmer',
  style,
}: SkeletonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animation === 'pulse') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [animation, pulseAnim]);

  const variantStyles: Record<string, ViewStyle> = {
    text: { borderRadius: 6 },
    circular: { borderRadius: 9999 },
    rectangular: { borderRadius: 0 },
    rounded: { borderRadius: borderRadius.lg },
  };

  const containerStyle: ViewStyle = {
    width: width as number,
    height: height as number,
    backgroundColor: colors.neutral[200],
    overflow: 'hidden',
    ...variantStyles[variant],
  };

  if (animation === 'pulse') {
    return (
      <Animated.View style={[containerStyle, style, { opacity: pulseAnim }]} />
    );
  }

  return (
    <View style={[containerStyle, style]}>
      {animation === 'shimmer' && <ShimmerOverlay />}
    </View>
  );
}

// ============================================================================
// PRESET SKELETON COMPONENTS
// ============================================================================

export function SkeletonAvatar({
  size = 48,
  style,
}: {
  size?: number;
  style?: ViewStyle;
}) {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      style={style}
    />
  );
}

export function SkeletonText({
  lines = 3,
  style,
}: {
  lines?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.textContainer, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '60%' : '100%'}
          height={14}
          style={i > 0 ? styles.textLine : undefined}
        />
      ))}
    </View>
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <SkeletonAvatar size={44} />
        <View style={styles.cardHeaderText}>
          <Skeleton variant="text" width="50%" height={16} />
          <Skeleton variant="text" width="30%" height={12} style={styles.mt1} />
        </View>
      </View>
      <View style={styles.mt3}>
        <SkeletonText lines={2} />
      </View>
      <View style={styles.cardActions}>
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton variant="rounded" width={80} height={32} />
      </View>
    </View>
  );
}

export function SkeletonPostCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.postCard, style]}>
      <Skeleton variant="rectangular" width="100%" height={140} />
      <View style={styles.postCardContent}>
        <View style={styles.cardHeader}>
          <SkeletonAvatar size={40} />
          <View style={styles.cardHeaderText}>
            <Skeleton variant="text" width="50%" height={14} />
            <Skeleton variant="text" width="30%" height={11} style={styles.mt1} />
          </View>
        </View>
        <View style={styles.mt2}>
          <SkeletonText lines={2} />
        </View>
        <View style={styles.postCardFooter}>
          <Skeleton variant="rounded" width={90} height={26} />
          <Skeleton variant="circular" width={32} height={32} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonChatItem({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.chatItem, style]}>
      <SkeletonAvatar size={52} />
      <View style={styles.chatItemContent}>
        <View style={styles.chatItemHeader}>
          <Skeleton variant="text" width="45%" height={16} />
          <Skeleton variant="text" width={45} height={11} />
        </View>
        <Skeleton variant="text" width="75%" height={14} style={styles.mt1} />
      </View>
    </View>
  );
}

export function SkeletonList({
  count = 5,
  renderItem,
  style,
}: {
  count?: number;
  renderItem?: (index: number) => React.ReactNode;
  style?: ViewStyle;
}) {
  const defaultRenderItem = (index: number) => (
    <SkeletonCard key={index} style={index > 0 ? styles.mt3 : undefined} />
  );

  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, i) =>
        renderItem ? renderItem(i) : defaultRenderItem(i)
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  textContainer: {
    gap: 8,
  },
  textLine: {
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: 16,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  postCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  postCardContent: {
    padding: 16,
  },
  postCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chatItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  chatItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mt1: {
    marginTop: 4,
  },
  mt2: {
    marginTop: 8,
  },
  mt3: {
    marginTop: 12,
  },
});

export default Skeleton;
