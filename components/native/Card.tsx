/**
 * Native Card Component
 *
 * A flexible card component with multiple variants including glass effect.
 * Supports interactive press states, accent borders, and various padding options.
 */

import React, { useRef } from 'react';
import {
  View,
  Pressable,
  Animated,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface CardProps {
  /**
   * Visual variant of the card
   * @default 'default'
   */
  variant?: 'default' | 'glass' | 'elevated' | 'subtle';

  /**
   * Card content
   */
  children: React.ReactNode;

  /**
   * Press handler - when provided, makes card interactive
   */
  onPress?: () => void;

  /**
   * Show gradient accent border on left side
   * @default false
   */
  borderAccent?: boolean;

  /**
   * Padding size
   * @default 'md'
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';

  /**
   * Additional styles
   */
  style?: StyleProp<ViewStyle>;
}

export interface CardSectionProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// ============================================================================
// STYLES
// ============================================================================

/**
 * Padding mapping
 */
const PADDING_MAP = {
  none: 0,
  sm: 12,
  md: 16,
  lg: 24,
} as const;

/**
 * Get variant-specific styles
 */
const getVariantStyles = (variant: CardProps['variant']): ViewStyle => {
  switch (variant) {
    case 'glass':
      // Note: For real blur effect on iOS, wrap this component with expo-blur BlurView
      // For now, using semi-transparent background to simulate glass effect
      return {
        backgroundColor: colors.glass.background,
        borderWidth: 1,
        borderColor: colors.glass.border,
      };

    case 'elevated':
      return {
        backgroundColor: colors.surface.cardElevated,
        borderWidth: 1,
        borderColor: colors.surface.border,
        ...Platform.select({
          ios: {
            shadowColor: colors.neutral[900],
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.10,
            shadowRadius: 8,
          },
          android: {
            elevation: 4,
          },
        }),
      };

    case 'subtle':
      return {
        backgroundColor: colors.transparent,
        borderWidth: 1,
        borderColor: colors.surface.border,
      };

    case 'default':
    default:
      return {
        backgroundColor: colors.surface.card,
        borderWidth: 1,
        borderColor: colors.surface.border,
      };
  }
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  accentBorder: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[500],
  },
  // Section styles
  section: {
    paddingVertical: spacing[3],
  },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Card Component
 *
 * @example
 * ```tsx
 * <Card variant="glass" onPress={() => console.log('pressed')} borderAccent>
 *   <CardHeader>
 *     <Text>Header</Text>
 *   </CardHeader>
 *   <CardContent>
 *     <Text>Content</Text>
 *   </CardContent>
 * </Card>
 * ```
 */
export const Card: React.FC<CardProps> = ({
  variant = 'default',
  children,
  onPress,
  borderAccent = false,
  padding = 'md',
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const variantStyles = getVariantStyles(variant);
  const paddingValue = PADDING_MAP[padding];

  const cardStyles = [
    styles.card,
    variantStyles,
    paddingValue > 0 && { padding: paddingValue },
    borderAccent && styles.accentBorder,
    style,
  ];

  /**
   * Handle press in - scale down animation
   */
  const handlePressIn = () => {
    if (!onPress) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Scale down animation
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  /**
   * Handle press out - scale back up
   */
  const handlePressOut = () => {
    if (!onPress) return;

    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  // If interactive, wrap in Pressable with animation
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ width: '100%' }}
      >
        <Animated.View
          style={[
            cardStyles,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  // Static card
  return <View style={cardStyles}>{children}</View>;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Card Header
 *
 * Typically used for titles, icons, or actions at the top of a card.
 */
export const CardHeader: React.FC<CardSectionProps> = ({ children, style }) => {
  return <View style={[styles.section, style]}>{children}</View>;
};

/**
 * Card Content
 *
 * Main content area of the card.
 */
export const CardContent: React.FC<CardSectionProps> = ({ children, style }) => {
  return <View style={[styles.section, style]}>{children}</View>;
};

/**
 * Card Footer
 *
 * Typically used for actions or metadata at the bottom of a card.
 */
export const CardFooter: React.FC<CardSectionProps> = ({ children, style }) => {
  return <View style={[styles.section, style]}>{children}</View>;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default Card;
