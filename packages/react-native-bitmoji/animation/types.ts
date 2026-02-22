/**
 * Animation System Types
 *
 * Type definitions for the avatar animation system.
 * Supports idle animations, expression transitions, and animated stickers.
 */

// =============================================================================
// ANIMATION ENUMS
// =============================================================================

/**
 * Types of animations supported
 */
export enum AnimationType {
  /** Subtle animations like blinking, breathing */
  IDLE = 'idle',
  /** Smooth transitions between expressions */
  TRANSITION = 'transition',
  /** Full animated expression/emote */
  EMOTE = 'emote',
  /** Looping animations */
  LOOP = 'loop',
  /** One-shot animations that play once */
  ONCE = 'once',
}

/**
 * Easing functions for animations
 */
export enum EasingType {
  LINEAR = 'linear',
  EASE_IN = 'easeIn',
  EASE_OUT = 'easeOut',
  EASE_IN_OUT = 'easeInOut',
  BOUNCE = 'bounce',
  ELASTIC = 'elastic',
  SPRING = 'spring',
}

/**
 * Idle animation types
 */
export enum IdleAnimation {
  BLINK = 'blink',
  BREATHE = 'breathe',
  HAIR_SWAY = 'hairSway',
  ACCESSORY_SHIMMER = 'accessoryShimmer',
  SUBTLE_MOVEMENT = 'subtleMovement',
}

/**
 * Emote/expression animations
 */
export enum EmoteAnimation {
  WAVE = 'wave',
  NOD_YES = 'nodYes',
  NOD_NO = 'nodNo',
  LAUGH = 'laugh',
  CRY = 'cry',
  DANCE = 'dance',
  JUMP = 'jump',
  CLAP = 'clap',
  HEART_PULSE = 'heartPulse',
  SPARKLE = 'sparkle',
  CELEBRATE = 'celebrate',
}

// =============================================================================
// ANIMATION INTERFACES
// =============================================================================

/**
 * A single keyframe in an animation
 */
export interface AnimationKeyframe {
  /** Time in milliseconds from animation start */
  time: number;
  /** Properties to animate */
  properties: AnimatedProperties;
  /** Optional easing for this keyframe */
  easing?: EasingType;
}

/**
 * Properties that can be animated
 */
export interface AnimatedProperties {
  // Transform properties
  translateX?: number;
  translateY?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;

  // Appearance properties
  opacity?: number;

  // Avatar-specific properties
  eyeOpenness?: number; // 0 = closed, 1 = open
  mouthOpenness?: number; // 0 = closed, 1 = open
  eyebrowRaise?: number; // -1 = frown, 0 = neutral, 1 = raised

  // Custom properties
  [key: string]: number | undefined;
}

/**
 * Full animation definition
 */
export interface AnimationDefinition {
  id: string;
  name: string;
  type: AnimationType;
  /** Duration in milliseconds */
  duration: number;
  /** Whether to loop the animation */
  loop?: boolean;
  /** Delay before looping (ms) */
  loopDelay?: number;
  /** Keyframes defining the animation */
  keyframes: AnimationKeyframe[];
  /** Parts of avatar to animate (e.g., 'eyes', 'mouth', 'head') */
  targets: string[];
}

/**
 * Animation state for tracking playback
 */
export interface AnimationState {
  /** Currently playing animation ID */
  currentAnimation: string | null;
  /** Whether animation is playing */
  isPlaying: boolean;
  /** Current time in animation (ms) */
  currentTime: number;
  /** Current interpolated properties */
  currentProperties: AnimatedProperties;
  /** Queue of animations to play */
  queue: string[];
}

/**
 * Animation controller configuration
 */
export interface AnimationControllerConfig {
  /** Enable idle animations */
  enableIdle: boolean;
  /** Idle animations to enable */
  idleAnimations: IdleAnimation[];
  /** Blink interval range [min, max] in ms */
  blinkInterval: [number, number];
  /** Breathing cycle duration in ms */
  breatheCycleDuration: number;
  /** Enable hair sway animation */
  enableHairSway: boolean;
  /** Hair sway cycle duration in ms */
  hairSwayCycleDuration: number;
}

/**
 * Default animation controller configuration
 */
export const DEFAULT_ANIMATION_CONFIG: AnimationControllerConfig = {
  enableIdle: true,
  idleAnimations: [IdleAnimation.BLINK, IdleAnimation.BREATHE],
  blinkInterval: [2000, 5000],
  breatheCycleDuration: 4000,
  enableHairSway: true,
  hairSwayCycleDuration: 3000,
};

// =============================================================================
// ANIMATION PRESETS
// =============================================================================

/**
 * Blink animation preset
 */
export const BLINK_ANIMATION: AnimationDefinition = {
  id: 'blink',
  name: 'Blink',
  type: AnimationType.IDLE,
  duration: 150,
  loop: false,
  keyframes: [
    { time: 0, properties: { eyeOpenness: 1 } },
    { time: 75, properties: { eyeOpenness: 0 }, easing: EasingType.EASE_IN },
    { time: 150, properties: { eyeOpenness: 1 }, easing: EasingType.EASE_OUT },
  ],
  targets: ['eyes'],
};

/**
 * Breathe animation preset
 */
export const BREATHE_ANIMATION: AnimationDefinition = {
  id: 'breathe',
  name: 'Breathe',
  type: AnimationType.IDLE,
  duration: 4000,
  loop: true,
  keyframes: [
    { time: 0, properties: { scaleY: 1, translateY: 0 } },
    { time: 2000, properties: { scaleY: 1.02, translateY: -2 }, easing: EasingType.EASE_IN_OUT },
    { time: 4000, properties: { scaleY: 1, translateY: 0 }, easing: EasingType.EASE_IN_OUT },
  ],
  targets: ['body'],
};

/**
 * Hair sway animation preset
 */
export const HAIR_SWAY_ANIMATION: AnimationDefinition = {
  id: 'hairSway',
  name: 'Hair Sway',
  type: AnimationType.IDLE,
  duration: 3000,
  loop: true,
  keyframes: [
    { time: 0, properties: { rotation: 0 } },
    { time: 750, properties: { rotation: 2 }, easing: EasingType.EASE_IN_OUT },
    { time: 1500, properties: { rotation: 0 }, easing: EasingType.EASE_IN_OUT },
    { time: 2250, properties: { rotation: -2 }, easing: EasingType.EASE_IN_OUT },
    { time: 3000, properties: { rotation: 0 }, easing: EasingType.EASE_IN_OUT },
  ],
  targets: ['hair'],
};

/**
 * Wave animation preset
 */
export const WAVE_ANIMATION: AnimationDefinition = {
  id: 'wave',
  name: 'Wave',
  type: AnimationType.EMOTE,
  duration: 1000,
  loop: false,
  keyframes: [
    { time: 0, properties: { rotation: 0 } },
    { time: 200, properties: { rotation: 20 }, easing: EasingType.EASE_OUT },
    { time: 400, properties: { rotation: -10 }, easing: EasingType.EASE_IN_OUT },
    { time: 600, properties: { rotation: 15 }, easing: EasingType.EASE_IN_OUT },
    { time: 800, properties: { rotation: -5 }, easing: EasingType.EASE_IN_OUT },
    { time: 1000, properties: { rotation: 0 }, easing: EasingType.EASE_IN },
  ],
  targets: ['rightArm'],
};

/**
 * Nod yes animation preset
 */
export const NOD_YES_ANIMATION: AnimationDefinition = {
  id: 'nodYes',
  name: 'Nod Yes',
  type: AnimationType.EMOTE,
  duration: 600,
  loop: false,
  keyframes: [
    { time: 0, properties: { rotation: 0 } },
    { time: 150, properties: { rotation: 10 }, easing: EasingType.EASE_OUT },
    { time: 300, properties: { rotation: -5 }, easing: EasingType.EASE_IN_OUT },
    { time: 450, properties: { rotation: 8 }, easing: EasingType.EASE_IN_OUT },
    { time: 600, properties: { rotation: 0 }, easing: EasingType.EASE_IN },
  ],
  targets: ['head'],
};

/**
 * Nod no animation preset
 */
export const NOD_NO_ANIMATION: AnimationDefinition = {
  id: 'nodNo',
  name: 'Nod No',
  type: AnimationType.EMOTE,
  duration: 600,
  loop: false,
  keyframes: [
    { time: 0, properties: { rotation: 0 } },
    { time: 150, properties: { rotation: -15 }, easing: EasingType.EASE_OUT },
    { time: 300, properties: { rotation: 15 }, easing: EasingType.EASE_IN_OUT },
    { time: 450, properties: { rotation: -10 }, easing: EasingType.EASE_IN_OUT },
    { time: 600, properties: { rotation: 0 }, easing: EasingType.EASE_IN },
  ],
  targets: ['head'],
};

/**
 * Laugh animation preset
 */
export const LAUGH_ANIMATION: AnimationDefinition = {
  id: 'laugh',
  name: 'Laugh',
  type: AnimationType.EMOTE,
  duration: 1200,
  loop: false,
  keyframes: [
    { time: 0, properties: { translateY: 0, scaleY: 1, mouthOpenness: 0.5 } },
    { time: 150, properties: { translateY: -5, scaleY: 0.98, mouthOpenness: 1 }, easing: EasingType.EASE_OUT },
    { time: 300, properties: { translateY: 0, scaleY: 1.02, mouthOpenness: 0.8 }, easing: EasingType.EASE_IN_OUT },
    { time: 450, properties: { translateY: -5, scaleY: 0.98, mouthOpenness: 1 }, easing: EasingType.EASE_IN_OUT },
    { time: 600, properties: { translateY: 0, scaleY: 1.02, mouthOpenness: 0.8 }, easing: EasingType.EASE_IN_OUT },
    { time: 750, properties: { translateY: -3, scaleY: 0.99, mouthOpenness: 0.9 }, easing: EasingType.EASE_IN_OUT },
    { time: 900, properties: { translateY: 0, scaleY: 1, mouthOpenness: 0.6 }, easing: EasingType.EASE_IN_OUT },
    { time: 1200, properties: { translateY: 0, scaleY: 1, mouthOpenness: 0 }, easing: EasingType.EASE_IN },
  ],
  targets: ['body', 'head', 'mouth'],
};

/**
 * Heart pulse animation preset
 */
export const HEART_PULSE_ANIMATION: AnimationDefinition = {
  id: 'heartPulse',
  name: 'Heart Pulse',
  type: AnimationType.EMOTE,
  duration: 800,
  loop: true,
  keyframes: [
    { time: 0, properties: { scale: 1 } },
    { time: 200, properties: { scale: 1.2 }, easing: EasingType.EASE_OUT },
    { time: 400, properties: { scale: 1 }, easing: EasingType.EASE_IN },
    { time: 600, properties: { scale: 1.15 }, easing: EasingType.EASE_OUT },
    { time: 800, properties: { scale: 1 }, easing: EasingType.EASE_IN },
  ],
  targets: ['heartProp'],
};

/**
 * Jump/celebrate animation preset
 */
export const JUMP_ANIMATION: AnimationDefinition = {
  id: 'jump',
  name: 'Jump',
  type: AnimationType.EMOTE,
  duration: 500,
  loop: false,
  keyframes: [
    { time: 0, properties: { translateY: 0, scaleY: 1 } },
    { time: 100, properties: { translateY: 5, scaleY: 0.9 }, easing: EasingType.EASE_IN },
    { time: 250, properties: { translateY: -30, scaleY: 1.1 }, easing: EasingType.EASE_OUT },
    { time: 400, properties: { translateY: 0, scaleY: 0.95 }, easing: EasingType.EASE_IN },
    { time: 500, properties: { translateY: 0, scaleY: 1 }, easing: EasingType.EASE_OUT },
  ],
  targets: ['body'],
};

/**
 * All animation presets
 */
export const ANIMATION_PRESETS: Record<string, AnimationDefinition> = {
  blink: BLINK_ANIMATION,
  breathe: BREATHE_ANIMATION,
  hairSway: HAIR_SWAY_ANIMATION,
  wave: WAVE_ANIMATION,
  nodYes: NOD_YES_ANIMATION,
  nodNo: NOD_NO_ANIMATION,
  laugh: LAUGH_ANIMATION,
  heartPulse: HEART_PULSE_ANIMATION,
  jump: JUMP_ANIMATION,
};
