/**
 * Animation Configuration Hook
 *
 * Maps theme animation tokens to react-native-reanimated configs.
 * Provides consistent spring and timing configurations across the app.
 */

import { WithSpringConfig, WithTimingConfig, Easing } from 'react-native-reanimated';
import { animation } from '../constants/theme';

/**
 * Spring animation presets
 */
export const springConfigs = {
  /** Gentle, smooth spring (default for most animations) */
  gentle: { damping: 15, stiffness: 120, mass: 1 } as WithSpringConfig,
  /** Quick, snappy spring (for interactive elements) */
  snappy: { damping: 10, stiffness: 300, mass: 0.8 } as WithSpringConfig,
  /** Bouncy spring (for playful animations) */
  bouncy: { damping: 8, stiffness: 180, mass: 1 } as WithSpringConfig,
} as const;

/**
 * Timing animation presets
 */
export const timingConfigs = {
  /** Fast timing (150ms) */
  fast: { duration: animation.duration.fast, easing: Easing.bezier(0.4, 0, 0.2, 1) } as WithTimingConfig,
  /** Normal timing (200ms) */
  normal: { duration: animation.duration.normal, easing: Easing.bezier(0.4, 0, 0.2, 1) } as WithTimingConfig,
  /** Slow timing (300ms) */
  slow: { duration: animation.duration.slow, easing: Easing.bezier(0.4, 0, 0.2, 1) } as WithTimingConfig,
} as const;

/**
 * Hook to access animation configurations
 *
 * @returns Object containing spring and timing configs
 *
 * @example
 * const { springConfigs, timingConfigs } = useAnimationConfig();
 * const animatedValue = useSharedValue(0);
 * animatedValue.value = withSpring(1, springConfigs.snappy);
 */
export function useAnimationConfig() {
  return { springConfigs, timingConfigs };
}
