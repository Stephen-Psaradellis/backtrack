/**
 * useAvatarAnimation Hook
 *
 * Manages avatar animations including idle states (blinking, breathing)
 * and triggered animations (wave, laugh, etc.).
 *
 * This is a simplified animation system that works without react-native-reanimated
 * by using standard React state and intervals. For production, consider upgrading
 * to react-native-reanimated for better performance.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  AnimationType,
  AnimationState,
  AnimationControllerConfig,
  AnimatedProperties,
  AnimationDefinition,
  IdleAnimation,
  EmoteAnimation,
  ANIMATION_PRESETS,
  DEFAULT_ANIMATION_CONFIG,
  BLINK_ANIMATION,
  BREATHE_ANIMATION,
  HAIR_SWAY_ANIMATION,
  EasingType,
} from './types';

// =============================================================================
// EASING FUNCTIONS
// =============================================================================

const easingFunctions: Record<EasingType, (t: number) => number> = {
  [EasingType.LINEAR]: (t) => t,
  [EasingType.EASE_IN]: (t) => t * t,
  [EasingType.EASE_OUT]: (t) => t * (2 - t),
  [EasingType.EASE_IN_OUT]: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  [EasingType.BOUNCE]: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  [EasingType.ELASTIC]: (t) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
  },
  [EasingType.SPRING]: (t) => {
    return 1 - Math.cos(t * Math.PI * 4) * Math.exp(-t * 6);
  },
};

// =============================================================================
// INTERPOLATION
// =============================================================================

/**
 * Interpolate between two values
 */
function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

/**
 * Interpolate animated properties between keyframes
 */
function interpolateProperties(
  animation: AnimationDefinition,
  currentTime: number
): AnimatedProperties {
  const { keyframes, duration } = animation;
  const clampedTime = Math.min(currentTime, duration);

  // Find surrounding keyframes
  let prevKeyframe = keyframes[0];
  let nextKeyframe = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (keyframes[i].time <= clampedTime && keyframes[i + 1].time >= clampedTime) {
      prevKeyframe = keyframes[i];
      nextKeyframe = keyframes[i + 1];
      break;
    }
  }

  // Calculate progress between keyframes
  const keyframeDuration = nextKeyframe.time - prevKeyframe.time;
  const rawProgress = keyframeDuration > 0
    ? (clampedTime - prevKeyframe.time) / keyframeDuration
    : 1;

  // Apply easing
  const easing = nextKeyframe.easing || EasingType.LINEAR;
  const progress = easingFunctions[easing](rawProgress);

  // Interpolate all properties
  const result: AnimatedProperties = {};
  const allKeys = new Set([
    ...Object.keys(prevKeyframe.properties),
    ...Object.keys(nextKeyframe.properties),
  ]);

  for (const key of allKeys) {
    const prevValue = prevKeyframe.properties[key] ?? 0;
    const nextValue = nextKeyframe.properties[key] ?? prevValue;
    result[key] = lerp(prevValue, nextValue, progress);
  }

  return result;
}

// =============================================================================
// HOOK
// =============================================================================

export interface UseAvatarAnimationOptions {
  /** Animation configuration */
  config?: Partial<AnimationControllerConfig>;
  /** Whether to auto-start idle animations */
  autoStart?: boolean;
}

export interface UseAvatarAnimationReturn {
  /** Current animated properties to apply to avatar */
  animatedProps: AnimatedProperties;
  /** Current blink state (0 = closed, 1 = open) */
  blinkState: number;
  /** Current breathe state (scale factor) */
  breatheState: { scaleY: number; translateY: number };
  /** Current hair sway rotation */
  hairSwayRotation: number;
  /** Whether animations are enabled */
  isAnimating: boolean;
  /** Start/resume animations */
  startAnimations: () => void;
  /** Pause all animations */
  pauseAnimations: () => void;
  /** Play a specific emote animation */
  playEmote: (emote: EmoteAnimation | string) => void;
  /** Check if an emote is currently playing */
  isEmotePlaying: boolean;
  /** Stop current emote */
  stopEmote: () => void;
  /** Update animation config */
  updateConfig: (config: Partial<AnimationControllerConfig>) => void;
}

export function useAvatarAnimation(
  options: UseAvatarAnimationOptions = {}
): UseAvatarAnimationReturn {
  const { config: initialConfig, autoStart = true } = options;

  // Configuration
  const [config, setConfig] = useState<AnimationControllerConfig>({
    ...DEFAULT_ANIMATION_CONFIG,
    ...initialConfig,
  });

  // Animation states
  const [isAnimating, setIsAnimating] = useState(autoStart);
  const [blinkState, setBlinkState] = useState(1); // 1 = eyes open
  const [breatheState, setBreatheState] = useState({ scaleY: 1, translateY: 0 });
  const [hairSwayRotation, setHairSwayRotation] = useState(0);

  // Emote animation state
  const [currentEmote, setCurrentEmote] = useState<AnimationDefinition | null>(null);
  const [emoteStartTime, setEmoteStartTime] = useState(0);
  const [emoteProps, setEmoteProps] = useState<AnimatedProperties>({});

  // Refs for intervals
  const blinkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const breatheIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hairSwayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const emoteAnimationRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================================================
  // BLINK ANIMATION
  // ==========================================================================

  const triggerBlink = useCallback(() => {
    if (!isAnimating || !config.idleAnimations.includes(IdleAnimation.BLINK)) return;

    // Close eyes
    setBlinkState(0);

    // Open eyes after blink duration
    setTimeout(() => {
      setBlinkState(1);
    }, BLINK_ANIMATION.duration / 2);

    // Schedule next blink
    const [min, max] = config.blinkInterval;
    const nextBlink = Math.random() * (max - min) + min;

    blinkIntervalRef.current = setTimeout(triggerBlink, nextBlink);
  }, [isAnimating, config.blinkInterval, config.idleAnimations]);

  // ==========================================================================
  // BREATHE ANIMATION
  // ==========================================================================

  const updateBreathe = useCallback(() => {
    if (!isAnimating || !config.idleAnimations.includes(IdleAnimation.BREATHE)) {
      setBreatheState({ scaleY: 1, translateY: 0 });
      return;
    }

    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) % config.breatheCycleDuration;
      const progress = elapsed / config.breatheCycleDuration;

      // Sine wave for smooth breathing
      const breatheFactor = Math.sin(progress * Math.PI * 2);
      const scaleY = 1 + breatheFactor * 0.02;
      const translateY = breatheFactor * -2;

      setBreatheState({ scaleY, translateY });
    };

    // Update at 30fps
    breatheIntervalRef.current = setInterval(animate, 33);
  }, [isAnimating, config.breatheCycleDuration, config.idleAnimations]);

  // ==========================================================================
  // HAIR SWAY ANIMATION
  // ==========================================================================

  const updateHairSway = useCallback(() => {
    if (!isAnimating || !config.enableHairSway) {
      setHairSwayRotation(0);
      return;
    }

    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) % config.hairSwayCycleDuration;
      const progress = elapsed / config.hairSwayCycleDuration;

      // Sine wave for smooth sway
      const rotation = Math.sin(progress * Math.PI * 2) * 2;
      setHairSwayRotation(rotation);
    };

    // Update at 30fps
    hairSwayIntervalRef.current = setInterval(animate, 33);
  }, [isAnimating, config.enableHairSway, config.hairSwayCycleDuration]);

  // ==========================================================================
  // EMOTE ANIMATION
  // ==========================================================================

  const playEmote = useCallback((emote: EmoteAnimation | string) => {
    const animation = ANIMATION_PRESETS[emote];
    if (!animation) {
      console.warn(`Animation "${emote}" not found`);
      return;
    }

    setCurrentEmote(animation);
    setEmoteStartTime(Date.now());

    // Clear any existing emote animation
    if (emoteAnimationRef.current) {
      clearInterval(emoteAnimationRef.current);
    }

    // Animate the emote
    const animate = () => {
      const elapsed = Date.now() - emoteStartTime;

      if (elapsed >= animation.duration && !animation.loop) {
        // Animation finished
        setCurrentEmote(null);
        setEmoteProps({});
        if (emoteAnimationRef.current) {
          clearInterval(emoteAnimationRef.current);
          emoteAnimationRef.current = null;
        }
        return;
      }

      const time = animation.loop
        ? elapsed % animation.duration
        : Math.min(elapsed, animation.duration);

      const props = interpolateProperties(animation, time);
      setEmoteProps(props);
    };

    // Update at 60fps for smooth animation
    emoteAnimationRef.current = setInterval(animate, 16);
  }, [emoteStartTime]);

  const stopEmote = useCallback(() => {
    if (emoteAnimationRef.current) {
      clearInterval(emoteAnimationRef.current);
      emoteAnimationRef.current = null;
    }
    setCurrentEmote(null);
    setEmoteProps({});
  }, []);

  // ==========================================================================
  // ANIMATION CONTROL
  // ==========================================================================

  const startAnimations = useCallback(() => {
    setIsAnimating(true);
  }, []);

  const pauseAnimations = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const updateConfig = useCallback((newConfig: Partial<AnimationControllerConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  // Start/stop blink animation
  useEffect(() => {
    if (isAnimating && config.idleAnimations.includes(IdleAnimation.BLINK)) {
      // Initial blink delay
      const initialDelay = Math.random() * 2000 + 1000;
      blinkIntervalRef.current = setTimeout(triggerBlink, initialDelay);
    }

    return () => {
      if (blinkIntervalRef.current) {
        clearTimeout(blinkIntervalRef.current);
        blinkIntervalRef.current = null;
      }
    };
  }, [isAnimating, triggerBlink, config.idleAnimations]);

  // Start/stop breathe animation
  useEffect(() => {
    if (isAnimating && config.idleAnimations.includes(IdleAnimation.BREATHE)) {
      updateBreathe();
    }

    return () => {
      if (breatheIntervalRef.current) {
        clearInterval(breatheIntervalRef.current);
        breatheIntervalRef.current = null;
      }
      setBreatheState({ scaleY: 1, translateY: 0 });
    };
  }, [isAnimating, updateBreathe, config.idleAnimations]);

  // Start/stop hair sway animation
  useEffect(() => {
    if (isAnimating && config.enableHairSway) {
      updateHairSway();
    }

    return () => {
      if (hairSwayIntervalRef.current) {
        clearInterval(hairSwayIntervalRef.current);
        hairSwayIntervalRef.current = null;
      }
      setHairSwayRotation(0);
    };
  }, [isAnimating, updateHairSway, config.enableHairSway]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blinkIntervalRef.current) clearTimeout(blinkIntervalRef.current);
      if (breatheIntervalRef.current) clearInterval(breatheIntervalRef.current);
      if (hairSwayIntervalRef.current) clearInterval(hairSwayIntervalRef.current);
      if (emoteAnimationRef.current) clearInterval(emoteAnimationRef.current);
    };
  }, []);

  // ==========================================================================
  // COMBINED ANIMATED PROPS
  // ==========================================================================

  const animatedProps = useMemo<AnimatedProperties>(() => {
    return {
      eyeOpenness: blinkState,
      ...breatheState,
      hairRotation: hairSwayRotation,
      ...emoteProps,
    };
  }, [blinkState, breatheState, hairSwayRotation, emoteProps]);

  return {
    animatedProps,
    blinkState,
    breatheState,
    hairSwayRotation,
    isAnimating,
    startAnimations,
    pauseAnimations,
    playEmote,
    isEmotePlaying: currentEmote !== null,
    stopEmote,
    updateConfig,
  };
}

export default useAvatarAnimation;
