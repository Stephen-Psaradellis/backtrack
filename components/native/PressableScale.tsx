/**
 * PressableScale Component
 *
 * A pressable wrapper that provides a subtle scale-down animation on press
 * with haptic feedback. Uses React Native's Animated API with spring physics
 * for smooth, natural-feeling interactions.
 *
 * Features:
 * - Scales to 0.97 on press with spring animation release
 * - Optional haptic feedback on press (Light impact)
 * - Fully accessible with proper role and state
 * - TypeScript with strict prop types
 * - Follows theme design tokens
 *
 * @example
 * ```tsx
 * import { PressableScale } from 'components/native'
 *
 * // Basic usage
 * <PressableScale onPress={handlePress}>
 *   <Text>Press me</Text>
 * </PressableScale>
 *
 * // Custom scale value
 * <PressableScale onPress={handlePress} scale={0.95}>
 *   <Card>Custom content</Card>
 * </PressableScale>
 *
 * // Disable haptics
 * <PressableScale onPress={handlePress} haptic={false}>
 *   <View>No haptic feedback</View>
 * </PressableScale>
 * ```
 */

import React, { useRef } from 'react';
import {
  Pressable,
  Animated,
  StyleProp,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

// ============================================================================
// TYPES
// ============================================================================

export interface PressableScaleProps {
  /**
   * Child elements to render inside the pressable wrapper
   */
  children: React.ReactNode;

  /**
   * Press handler callback
   */
  onPress?: () => void;

  /**
   * Whether the pressable is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Additional styles to apply to the container
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Scale value when pressed (0-1)
   * @default 0.97
   */
  scale?: number;

  /**
   * Whether to trigger haptic feedback on press
   * @default true
   */
  haptic?: boolean;

  /**
   * Test ID for testing purposes
   */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PressableScale - Animated pressable wrapper with scale effect
 *
 * Provides a polished press interaction with subtle scale animation
 * and optional haptic feedback. Follows accessibility best practices.
 */
export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  onPress,
  disabled = false,
  style,
  scale = 0.97,
  haptic = true,
  testID,
}) => {
  // ---------------------------------------------------------------------------
  // ANIMATION
  // ---------------------------------------------------------------------------

  const scaleAnim = useRef(new Animated.Value(1)).current;

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle press in - scale down with haptic feedback
   */
  const handlePressIn = () => {
    // Trigger haptic feedback if enabled
    if (haptic) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Silently fail if haptics not available
      }
    }

    // Scale down animation
    Animated.spring(scaleAnim, {
      toValue: scale,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  /**
   * Handle press out - spring back to original size
   */
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  /**
   * Handle press - execute callback
   */
  const handlePress = () => {
    if (disabled || !onPress) return;
    onPress();
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        testID={testID}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

export default PressableScale;
