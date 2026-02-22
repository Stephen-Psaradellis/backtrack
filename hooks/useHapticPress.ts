import { useRef, useCallback, useMemo } from 'react';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

interface UseHapticPressOptions {
  haptic?: 'selection' | 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy';
  scale?: number;        // Scale-down value on press (default 0.96)
  duration?: number;     // Animation duration in ms (default 100)
  disabled?: boolean;    // Skip haptic+animation when true
}

interface UseHapticPressReturn {
  scaleValue: Animated.Value;         // For Animated.View style
  animatedStyle: { transform: { scale: Animated.Value }[] };  // Ready-to-use style
  pressHandlers: {
    onPressIn: () => void;
    onPressOut: () => void;
  };
}

/**
 * Hook that combines haptic feedback with synchronized visual press animation.
 * Coordinates haptics and scale animation to fire together, preventing independent timing issues.
 *
 * @param options - Configuration options for haptic and animation behavior
 * @param options.haptic - Type of haptic feedback (default: 'selection')
 * @param options.scale - Scale-down value on press (default: 0.96)
 * @param options.duration - Animation duration in ms (default: 100)
 * @param options.disabled - Skip haptic and animation when true (default: false)
 *
 * @returns Object containing scaleValue, animatedStyle, and pressHandlers
 *
 * @example
 * ```tsx
 * // In a component:
 * const { animatedStyle, pressHandlers } = useHapticPress({
 *   haptic: 'selection',
 *   scale: 0.97
 * });
 *
 * <Pressable {...pressHandlers} onPress={handlePress}>
 *   <Animated.View style={[styles.button, animatedStyle]}>
 *     <Text>Press Me</Text>
 *   </Animated.View>
 * </Pressable>
 * ```
 */
export function useHapticPress(options: UseHapticPressOptions = {}): UseHapticPressReturn {
  const {
    haptic = 'selection',
    scale = 0.96,
    duration = 100,
    disabled = false,
  } = options;

  const scaleValue = useRef(new Animated.Value(1)).current;

  const triggerHaptic = useCallback(() => {
    if (disabled) return;
    try {
      switch (haptic) {
        case 'selection':
          Haptics.selectionAsync();
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    } catch {
      // Haptics may not be available on all devices - silently ignore
    }
  }, [haptic, disabled]);

  const onPressIn = useCallback(() => {
    if (disabled) return;
    triggerHaptic();
    Animated.spring(scaleValue, {
      toValue: scale,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [scaleValue, scale, disabled, triggerHaptic]);

  const onPressOut = useCallback(() => {
    Animated.spring(scaleValue, {
      toValue: 1,
      tension: 200,
      friction: 15,
      useNativeDriver: true,
    }).start();
  }, [scaleValue]);

  const animatedStyle = useMemo(() => ({
    transform: [{ scale: scaleValue }],
  }), [scaleValue]);

  const pressHandlers = useMemo(() => ({
    onPressIn,
    onPressOut,
  }), [onPressIn, onPressOut]);

  return { scaleValue, animatedStyle, pressHandlers };
}
