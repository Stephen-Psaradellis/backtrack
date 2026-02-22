import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Hook that checks if the user has enabled "Reduce Motion" in system accessibility settings.
 *
 * When reduced motion is enabled, animations should be simplified or disabled:
 * - Spring animations → instant transitions
 * - Slide/stagger animations → simple fade
 * - Skeleton shimmer → static pulse
 * - Tab indicator → instant jump
 *
 * @returns boolean - true if reduce motion is enabled
 *
 * @example
 * ```tsx
 * const reduceMotion = useReducedMotion();
 *
 * // In animation:
 * const duration = reduceMotion ? 0 : 300;
 * const animConfig = reduceMotion
 *   ? { duration: 0 }
 *   : { damping: 15, stiffness: 120 };
 * ```
 */
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Check initial value
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
    });

    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        setReduceMotion(enabled);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

/**
 * Helper to get animation duration based on reduced motion preference.
 * Returns 0 when reduced motion is on, otherwise the provided duration.
 */
export function getAnimationDuration(duration: number, reduceMotion: boolean): number {
  return reduceMotion ? 0 : duration;
}

/**
 * Helper to get a simplified spring config for reduced motion.
 * When reduced motion is on, returns a config with no bounce (instant).
 */
export function getSpringConfig(
  config: { damping?: number; stiffness?: number; mass?: number },
  reduceMotion: boolean
) {
  if (reduceMotion) {
    return { damping: 100, stiffness: 1000, mass: 1 }; // Nearly instant
  }
  return config;
}
