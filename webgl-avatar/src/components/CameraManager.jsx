/**
 * CameraManager - Smooth camera control system for avatar viewing
 *
 * Task 11: Camera & Controls
 *
 * Provides:
 * - Camera presets (portrait, fullBody, closeUp)
 * - Smooth animated transitions between presets
 * - OrbitControls for interactive mode
 * - Disable controls for snapshot mode
 * - Zoom limits to prevent clipping
 *
 * @example
 * ```jsx
 * <CameraManager
 *   preset="portrait"
 *   interactive={true}
 *   onTransitionComplete={() => console.log('Camera transition done')}
 * />
 * ```
 */

import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// =============================================================================
// CAMERA PRESETS
// =============================================================================

/**
 * Camera presets for different viewing modes
 * Each preset defines position, target (look at), and FOV
 *
 * Updated for complete avatar models with full body view.
 * Avatars are approximately 1.7-1.8 units tall, standing at y=0.
 */
export const CAMERA_PRESETS = {
  // Portrait: Upper body focus, good for avatar selection UI
  portrait: {
    position: [0, 1.6, 2],
    target: [0, 1.5, 0],
    fov: 45,
    description: 'Upper body portrait view',
  },
  // Full Body: Shows entire avatar from head to toe
  fullBody: {
    position: [0, 1, 4],
    target: [0, 1, 0],
    fov: 50,
    description: 'Full body view',
  },
  // Close Up: Face detail view
  closeUp: {
    position: [0, 1.65, 1],
    target: [0, 1.6, 0],
    fov: 35,
    description: 'Face close-up view',
  },
  // Three Quarter: Angled view showing depth
  threeQuarter: {
    position: [1.5, 1.5, 2],
    target: [0, 1.2, 0],
    fov: 45,
    description: 'Three-quarter angle view',
  },
  // Profile: Side view
  profile: {
    position: [2.5, 1.4, 0],
    target: [0, 1.4, 0],
    fov: 45,
    description: 'Side profile view',
  },
  // Low Angle: Dynamic hero shot
  lowAngle: {
    position: [0, 0.5, 3],
    target: [0, 1.2, 0],
    fov: 50,
    description: 'Low angle hero view',
  },
  // Overview: For avatar browser/selection
  overview: {
    position: [0, 1.2, 3.5],
    target: [0, 0.9, 0],
    fov: 45,
    description: 'Overview for avatar selection',
  },
};

// =============================================================================
// ZOOM LIMITS
// =============================================================================

/**
 * Zoom limits to prevent camera clipping into geometry
 */
export const ZOOM_LIMITS = {
  minDistance: 1.2,    // Prevent clipping into head
  maxDistance: 8,      // Reasonable max zoom out
  minPolarAngle: Math.PI / 6,     // Prevent looking from below
  maxPolarAngle: Math.PI / 1.2,   // Prevent looking from directly above
  minAzimuthAngle: -Math.PI,      // Full horizontal rotation
  maxAzimuthAngle: Math.PI,       // Full horizontal rotation
};

// =============================================================================
// TRANSITION CONFIG
// =============================================================================

/**
 * Transition configuration
 */
export const TRANSITION_CONFIG = {
  defaultDuration: 0.8,  // seconds
  easing: 'easeOutCubic',
};

/**
 * Easing functions for smooth transitions
 */
const EASING = {
  linear: (t) => t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
};

// =============================================================================
// CAMERA ANIMATOR COMPONENT
// =============================================================================

/**
 * Internal component that handles camera animation
 * Uses useFrame for smooth interpolation
 */
function CameraAnimator({
  targetPosition,
  targetLookAt,
  targetFov,
  duration = TRANSITION_CONFIG.defaultDuration,
  easing = TRANSITION_CONFIG.easing,
  onComplete,
  controlsRef,
}) {
  const { camera } = useThree();
  const animationRef = useRef({
    isAnimating: false,
    startTime: 0,
    startPosition: new THREE.Vector3(),
    startLookAt: new THREE.Vector3(),
    startFov: 50,
    endPosition: new THREE.Vector3(),
    endLookAt: new THREE.Vector3(),
    endFov: 50,
  });

  // Current look-at target for smooth interpolation
  const currentLookAt = useRef(new THREE.Vector3(0, 1.5, 0));

  // Start animation when target changes
  useEffect(() => {
    if (!targetPosition || !targetLookAt) return;

    const anim = animationRef.current;

    // Store start state
    anim.startPosition.copy(camera.position);
    anim.startLookAt.copy(currentLookAt.current);
    anim.startFov = camera.fov;

    // Set end state
    anim.endPosition.set(...targetPosition);
    anim.endLookAt.set(...targetLookAt);
    anim.endFov = targetFov || camera.fov;

    // Start animation
    anim.startTime = performance.now() / 1000;
    anim.isAnimating = true;

    // Disable orbit controls during animation
    if (controlsRef?.current) {
      controlsRef.current.enabled = false;
    }
  }, [targetPosition?.[0], targetPosition?.[1], targetPosition?.[2],
      targetLookAt?.[0], targetLookAt?.[1], targetLookAt?.[2],
      targetFov, camera, controlsRef]);

  // Animation loop
  useFrame(() => {
    const anim = animationRef.current;
    if (!anim.isAnimating) return;

    const elapsed = (performance.now() / 1000) - anim.startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = EASING[easing]?.(progress) ?? EASING.easeOutCubic(progress);

    // Interpolate position
    camera.position.lerpVectors(anim.startPosition, anim.endPosition, easedProgress);

    // Interpolate look-at
    currentLookAt.current.lerpVectors(anim.startLookAt, anim.endLookAt, easedProgress);
    camera.lookAt(currentLookAt.current);

    // Interpolate FOV
    camera.fov = THREE.MathUtils.lerp(anim.startFov, anim.endFov, easedProgress);
    camera.updateProjectionMatrix();

    // Check if complete
    if (progress >= 1) {
      anim.isAnimating = false;

      // Re-enable orbit controls
      if (controlsRef?.current) {
        controlsRef.current.enabled = true;
        controlsRef.current.target.copy(currentLookAt.current);
        controlsRef.current.update();
      }

      // Fire completion callback
      onComplete?.();
    }
  });

  return null;
}

// =============================================================================
// MAIN CAMERA MANAGER COMPONENT
// =============================================================================

/**
 * CameraManager - Main camera control component
 *
 * @param {Object} props
 * @param {string} props.preset - Camera preset name (portrait, fullBody, closeUp, threeQuarter, profile)
 * @param {boolean} props.interactive - Enable orbit controls (default: true)
 * @param {number} props.transitionDuration - Duration of camera transitions in seconds (default: 0.8)
 * @param {string} props.easing - Easing function name (default: 'easeOutCubic')
 * @param {Function} props.onTransitionStart - Callback when transition starts
 * @param {Function} props.onTransitionComplete - Callback when transition completes
 * @param {boolean} props.enableZoom - Enable zoom with scroll (default: true)
 * @param {boolean} props.enablePan - Enable panning (default: false)
 * @param {boolean} props.enableRotate - Enable rotation (default: true)
 * @param {Array} props.customPosition - Custom camera position [x, y, z]
 * @param {Array} props.customTarget - Custom look-at target [x, y, z]
 * @param {number} props.customFov - Custom field of view
 * @param {Object} props.zoomLimits - Custom zoom limits
 */
export function CameraManager({
  preset = 'portrait',
  interactive = true,
  transitionDuration = TRANSITION_CONFIG.defaultDuration,
  easing = TRANSITION_CONFIG.easing,
  onTransitionStart,
  onTransitionComplete,
  enableZoom = true,
  enablePan = false,
  enableRotate = true,
  customPosition,
  customTarget,
  customFov,
  zoomLimits = ZOOM_LIMITS,
}) {
  const controlsRef = useRef();
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Determine target position and look-at
  const { targetPosition, targetLookAt, targetFov } = useMemo(() => {
    // Custom values take precedence
    if (customPosition || customTarget) {
      return {
        targetPosition: customPosition || CAMERA_PRESETS.portrait.position,
        targetLookAt: customTarget || CAMERA_PRESETS.portrait.target,
        targetFov: customFov || CAMERA_PRESETS.portrait.fov,
      };
    }

    // Use preset
    const presetConfig = CAMERA_PRESETS[preset] || CAMERA_PRESETS.portrait;
    return {
      targetPosition: presetConfig.position,
      targetLookAt: presetConfig.target,
      targetFov: presetConfig.fov,
    };
  }, [preset, customPosition, customTarget, customFov]);

  // Handle transition start
  const handleTransitionStart = useCallback(() => {
    setIsTransitioning(true);
    onTransitionStart?.();
  }, [onTransitionStart]);

  // Handle transition complete
  const handleTransitionComplete = useCallback(() => {
    setIsTransitioning(false);
    onTransitionComplete?.();
  }, [onTransitionComplete]);

  // Trigger transition on preset change
  useEffect(() => {
    handleTransitionStart();
  }, [preset, customPosition, customTarget, handleTransitionStart]);

  return (
    <>
      {/* Camera animator for smooth transitions */}
      <CameraAnimator
        targetPosition={targetPosition}
        targetLookAt={targetLookAt}
        targetFov={targetFov}
        duration={transitionDuration}
        easing={easing}
        onComplete={handleTransitionComplete}
        controlsRef={controlsRef}
      />

      {/* Orbit controls for user interaction */}
      {interactive && (
        <OrbitControls
          ref={controlsRef}
          enablePan={enablePan}
          enableZoom={enableZoom}
          enableRotate={enableRotate}
          minDistance={zoomLimits.minDistance}
          maxDistance={zoomLimits.maxDistance}
          minPolarAngle={zoomLimits.minPolarAngle}
          maxPolarAngle={zoomLimits.maxPolarAngle}
          minAzimuthAngle={zoomLimits.minAzimuthAngle}
          maxAzimuthAngle={zoomLimits.maxAzimuthAngle}
          target={targetLookAt}
          dampingFactor={0.05}
          enableDamping={true}
          // Don't auto-rotate
          autoRotate={false}
        />
      )}
    </>
  );
}

// =============================================================================
// SNAPSHOT CAMERA MANAGER
// =============================================================================

/**
 * Camera manager optimized for snapshot generation
 * Disables all controls and ensures consistent framing
 */
export function SnapshotCameraManager({
  preset = 'portrait',
  transitionDuration = 0.5,
  onReady,
}) {
  return (
    <CameraManager
      preset={preset}
      interactive={false}
      transitionDuration={transitionDuration}
      enableZoom={false}
      enablePan={false}
      enableRotate={false}
      onTransitionComplete={onReady}
    />
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Simple camera that just sets position without animation
 * Useful for initial setup or testing
 */
export function StaticCamera({ preset = 'portrait' }) {
  const { camera } = useThree();
  const presetConfig = CAMERA_PRESETS[preset] || CAMERA_PRESETS.portrait;

  useEffect(() => {
    camera.position.set(...presetConfig.position);
    camera.lookAt(...presetConfig.target);
    camera.fov = presetConfig.fov;
    camera.updateProjectionMatrix();
  }, [camera, preset, presetConfig]);

  return null;
}

/**
 * Debug component to show camera info
 */
export function CameraDebug() {
  const { camera } = useThree();
  const infoRef = useRef({ position: '', target: '', fov: 0 });

  useFrame(() => {
    infoRef.current.position = `[${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}]`;
    infoRef.current.fov = camera.fov.toFixed(1);
  });

  // This component doesn't render anything visible in 3D
  // Debug info would be shown via HTML overlay
  return null;
}

export default CameraManager;
