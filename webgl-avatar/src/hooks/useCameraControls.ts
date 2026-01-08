/**
 * useCameraControls - Hook for managing camera state and controls
 *
 * Task 11: Camera & Controls
 *
 * Provides a centralized way to manage camera presets, transitions,
 * and interactive mode for the avatar 3D viewer.
 *
 * @example
 * ```tsx
 * const {
 *   preset,
 *   setPreset,
 *   isInteractive,
 *   setInteractive,
 *   isTransitioning,
 *   cameraState,
 * } = useCameraControls({
 *   initialPreset: 'portrait',
 *   onPresetChange: (preset) => console.log('Preset changed:', preset),
 * });
 * ```
 */

import { useState, useCallback, useMemo, useRef } from 'react';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type CameraPreset = 'portrait' | 'fullBody' | 'closeUp' | 'threeQuarter' | 'profile';

export type CameraPosition = [number, number, number];

export interface CameraPresetConfig {
  position: CameraPosition;
  target: CameraPosition;
  fov: number;
  description: string;
}

export interface CustomCameraState {
  position?: CameraPosition;
  target?: CameraPosition;
  fov?: number;
}

export interface CameraState {
  preset: CameraPreset;
  isInteractive: boolean;
  isTransitioning: boolean;
  transitionDuration: number;
  customState: CustomCameraState | null;
  zoomLevel: number;
}

export interface UseCameraControlsOptions {
  /** Initial camera preset (default: 'portrait') */
  initialPreset?: CameraPreset;
  /** Initial interactive mode (default: true) */
  initialInteractive?: boolean;
  /** Default transition duration in seconds (default: 0.8) */
  defaultTransitionDuration?: number;
  /** Callback when preset changes */
  onPresetChange?: (preset: CameraPreset) => void;
  /** Callback when interactive mode changes */
  onInteractiveChange?: (interactive: boolean) => void;
  /** Callback when camera transition starts */
  onTransitionStart?: () => void;
  /** Callback when camera transition completes */
  onTransitionComplete?: () => void;
  /** Callback when custom camera state is set */
  onCustomStateChange?: (state: CustomCameraState) => void;
}

export interface UseCameraControlsReturn {
  // Current state
  preset: CameraPreset;
  isInteractive: boolean;
  isTransitioning: boolean;
  transitionDuration: number;
  customState: CustomCameraState | null;
  cameraState: CameraState;

  // Actions
  setPreset: (preset: CameraPreset, duration?: number) => void;
  setInteractive: (interactive: boolean) => void;
  setTransitionDuration: (duration: number) => void;
  setCustomCamera: (state: CustomCameraState, duration?: number) => void;
  clearCustomCamera: () => void;
  onTransitionStart: () => void;
  onTransitionComplete: () => void;

  // Preset helpers
  nextPreset: () => void;
  previousPreset: () => void;

  // Snapshot mode
  enterSnapshotMode: (preset?: CameraPreset) => Promise<void>;
  exitSnapshotMode: () => void;
}

// =============================================================================
// PRESET ORDER (for cycling through presets)
// =============================================================================

const PRESET_ORDER: CameraPreset[] = ['portrait', 'closeUp', 'threeQuarter', 'profile', 'fullBody'];

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useCameraControls(
  options: UseCameraControlsOptions = {}
): UseCameraControlsReturn {
  const {
    initialPreset = 'portrait',
    initialInteractive = true,
    defaultTransitionDuration = 0.8,
    onPresetChange,
    onInteractiveChange,
    onTransitionStart,
    onTransitionComplete,
    onCustomStateChange,
  } = options;

  // State
  const [preset, setPresetState] = useState<CameraPreset>(initialPreset);
  const [isInteractive, setInteractiveState] = useState(initialInteractive);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDuration, setTransitionDurationState] = useState(defaultTransitionDuration);
  const [customState, setCustomState] = useState<CustomCameraState | null>(null);

  // Track previous interactive state for snapshot mode
  const previousInteractiveRef = useRef(initialInteractive);

  // Promise resolver for snapshot mode
  const snapshotResolverRef = useRef<(() => void) | null>(null);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  /**
   * Set camera preset with optional custom duration
   */
  const setPreset = useCallback(
    (newPreset: CameraPreset, duration?: number) => {
      if (newPreset === preset) return;

      // Clear any custom state when switching to a preset
      setCustomState(null);

      // Update transition duration if specified
      if (duration !== undefined) {
        setTransitionDurationState(duration);
      }

      setPresetState(newPreset);
      onPresetChange?.(newPreset);
    },
    [preset, onPresetChange]
  );

  /**
   * Set interactive mode (enable/disable orbit controls)
   */
  const setInteractive = useCallback(
    (interactive: boolean) => {
      if (interactive === isInteractive) return;
      setInteractiveState(interactive);
      onInteractiveChange?.(interactive);
    },
    [isInteractive, onInteractiveChange]
  );

  /**
   * Set default transition duration
   */
  const setTransitionDuration = useCallback((duration: number) => {
    setTransitionDurationState(Math.max(0.1, Math.min(duration, 5))); // Clamp between 0.1 and 5 seconds
  }, []);

  /**
   * Set custom camera position/target/fov
   */
  const setCustomCamera = useCallback(
    (state: CustomCameraState, duration?: number) => {
      if (duration !== undefined) {
        setTransitionDurationState(duration);
      }
      setCustomState(state);
      onCustomStateChange?.(state);
    },
    [onCustomStateChange]
  );

  /**
   * Clear custom camera state and return to preset
   */
  const clearCustomCamera = useCallback(() => {
    setCustomState(null);
  }, []);

  /**
   * Handle transition start
   */
  const handleTransitionStart = useCallback(() => {
    setIsTransitioning(true);
    onTransitionStart?.();
  }, [onTransitionStart]);

  /**
   * Handle transition complete
   */
  const handleTransitionComplete = useCallback(() => {
    setIsTransitioning(false);
    onTransitionComplete?.();

    // Resolve snapshot promise if waiting
    if (snapshotResolverRef.current) {
      snapshotResolverRef.current();
      snapshotResolverRef.current = null;
    }
  }, [onTransitionComplete]);

  // ==========================================================================
  // PRESET CYCLING
  // ==========================================================================

  /**
   * Cycle to next preset
   */
  const nextPreset = useCallback(() => {
    const currentIndex = PRESET_ORDER.indexOf(preset);
    const nextIndex = (currentIndex + 1) % PRESET_ORDER.length;
    setPreset(PRESET_ORDER[nextIndex]);
  }, [preset, setPreset]);

  /**
   * Cycle to previous preset
   */
  const previousPreset = useCallback(() => {
    const currentIndex = PRESET_ORDER.indexOf(preset);
    const prevIndex = (currentIndex - 1 + PRESET_ORDER.length) % PRESET_ORDER.length;
    setPreset(PRESET_ORDER[prevIndex]);
  }, [preset, setPreset]);

  // ==========================================================================
  // SNAPSHOT MODE
  // ==========================================================================

  /**
   * Enter snapshot mode - disables controls and sets preset
   * Returns a promise that resolves when camera is in position
   */
  const enterSnapshotMode = useCallback(
    (snapshotPreset: CameraPreset = 'portrait'): Promise<void> => {
      return new Promise((resolve) => {
        // Store current interactive state
        previousInteractiveRef.current = isInteractive;

        // Disable interactive mode
        setInteractiveState(false);

        // Set fast transition duration for snapshot
        setTransitionDurationState(0.5);

        // Set the preset
        if (snapshotPreset !== preset) {
          setPresetState(snapshotPreset);
          onPresetChange?.(snapshotPreset);

          // Wait for transition to complete
          snapshotResolverRef.current = resolve;
        } else {
          // Already at the right preset, resolve immediately
          resolve();
        }
      });
    },
    [isInteractive, preset, onPresetChange]
  );

  /**
   * Exit snapshot mode - restores previous interactive state
   */
  const exitSnapshotMode = useCallback(() => {
    // Restore previous interactive state
    setInteractiveState(previousInteractiveRef.current);

    // Restore default transition duration
    setTransitionDurationState(defaultTransitionDuration);
  }, [defaultTransitionDuration]);

  // ==========================================================================
  // COMPUTED STATE
  // ==========================================================================

  /**
   * Combined camera state object
   */
  const cameraState = useMemo<CameraState>(
    () => ({
      preset,
      isInteractive,
      isTransitioning,
      transitionDuration,
      customState,
      zoomLevel: 1, // Could be tracked via OrbitControls if needed
    }),
    [preset, isInteractive, isTransitioning, transitionDuration, customState]
  );

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Current state
    preset,
    isInteractive,
    isTransitioning,
    transitionDuration,
    customState,
    cameraState,

    // Actions
    setPreset,
    setInteractive,
    setTransitionDuration,
    setCustomCamera,
    clearCustomCamera,
    onTransitionStart: handleTransitionStart,
    onTransitionComplete: handleTransitionComplete,

    // Preset helpers
    nextPreset,
    previousPreset,

    // Snapshot mode
    enterSnapshotMode,
    exitSnapshotMode,
  };
}

export default useCameraControls;
