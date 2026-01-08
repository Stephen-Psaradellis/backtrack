/**
 * CompleteAvatar - Loads and displays complete avatar GLB models
 *
 * This component replaces the part-by-part avatar system with
 * pre-made complete avatar models for higher quality and simpler implementation.
 *
 * Features:
 * - Loads complete avatar GLB by ID
 * - Supports local files and CDN URLs
 * - Handles loading states gracefully
 * - Applies idle animation if available
 * - Clones scene for multiple instances
 *
 * @example
 * ```jsx
 * <CompleteAvatar
 *   avatarId="avatar_asian_m"
 *   position={[0, 0, 0]}
 *   scale={1}
 * />
 * ```
 */

import React, { Suspense, useMemo, useRef, useEffect, useState } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame, useGraph } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

import {
  getAvatarUrl,
  getAvatarById,
  DEFAULT_AVATAR_ID,
  FALLBACK_AVATAR_ID,
} from '../constants/avatarRegistry';

// =============================================================================
// LOADING FALLBACK
// =============================================================================

/**
 * Loading placeholder while avatar model is loading
 */
export function AvatarLoadingFallback({ position = [0, 0, 0] }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle rotation and bob while loading
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      meshRef.current.position.y = position[1] + 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} position={[0, 1, 0]}>
        <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
        <meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.7} />
      </mesh>
      {/* Ground indicator */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.5, 32]} />
        <meshBasicMaterial color="#4f46e5" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * Error fallback when avatar fails to load
 */
export function AvatarErrorFallback({ position = [0, 0, 0], error }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <octahedronGeometry args={[0.5]} />
        <meshBasicMaterial color="#ef4444" wireframe />
      </mesh>
    </group>
  );
}

// =============================================================================
// AVATAR MODEL COMPONENT
// =============================================================================

/**
 * Internal component that loads and displays the avatar model
 * Separated to handle Suspense properly
 */
function AvatarModel({
  url,
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, 0, 0],
  animate = true,
  animationName,
  onLoad,
  onError,
}) {
  const groupRef = useRef();
  const [loadError, setLoadError] = useState(null);

  // Load the GLTF model
  let gltf;
  try {
    gltf = useGLTF(url);
  } catch (error) {
    // Handle loading errors
    console.warn('[CompleteAvatar] GLB loading error:', error?.message || error);
    useEffect(() => {
      setLoadError(error);
      onError?.(error);
    }, [error, onError]);
    return <AvatarErrorFallback position={position} error={error} />;
  }

  const { scene, animations } = gltf;

  // Clone the scene to allow multiple instances
  const clonedScene = useMemo(() => {
    // Use SkeletonUtils for proper skeleton cloning
    return SkeletonUtils.clone(scene);
  }, [scene]);

  // Set up animations if available
  const { actions, names } = useAnimations(animations, groupRef);

  // Play animation
  useEffect(() => {
    if (!animate || !actions || !names || names.length === 0) return;

    // Try to play requested animation, or first available
    const actionName = animationName || names[0];
    const action = actions[actionName];

    if (action) {
      action.reset().fadeIn(0.3).play();
      return () => {
        action.fadeOut(0.3);
      };
    }
  }, [actions, names, animate, animationName]);

  // Notify when loaded
  useEffect(() => {
    onLoad?.();
  }, [onLoad]);

  // Configure materials for better appearance
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        // Enable shadows
        child.castShadow = true;
        child.receiveShadow = true;

        // Improve material quality
        if (child.material) {
          child.material.needsUpdate = true;
        }
      }
    });
  }, [clonedScene]);

  // Handle uniform scale
  const scaleArray = typeof scale === 'number' ? [scale, scale, scale] : scale;

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scaleArray}>
      <primitive object={clonedScene} />
    </group>
  );
}

// =============================================================================
// MAIN COMPLETE AVATAR COMPONENT
// =============================================================================

/**
 * CompleteAvatar - Main component for rendering complete avatar models
 *
 * @param {Object} props
 * @param {string} props.avatarId - ID of the avatar preset to load
 * @param {[number, number, number]} props.position - Position in 3D space
 * @param {number|[number, number, number]} props.scale - Uniform or per-axis scale
 * @param {[number, number, number]} props.rotation - Euler rotation
 * @param {boolean} props.animate - Enable animations (default: true)
 * @param {string} props.animationName - Specific animation to play
 * @param {Function} props.onLoad - Callback when avatar loads
 * @param {Function} props.onError - Callback on load error
 */
export function CompleteAvatar({
  avatarId = DEFAULT_AVATAR_ID,
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, 0, 0],
  animate = true,
  animationName,
  onLoad,
  onError,
}) {
  // Get avatar URL from registry
  const url = useMemo(() => {
    return getAvatarUrl(avatarId);
  }, [avatarId]);

  // Get avatar metadata for debugging
  const avatarInfo = useMemo(() => {
    return getAvatarById(avatarId);
  }, [avatarId]);

  return (
    <Suspense fallback={<AvatarLoadingFallback position={position} />}>
      <AvatarModel
        url={url}
        position={position}
        scale={scale}
        rotation={rotation}
        animate={animate}
        animationName={animationName}
        onLoad={onLoad}
        onError={onError}
      />
    </Suspense>
  );
}

// =============================================================================
// AVATAR WITH IDLE ANIMATION
// =============================================================================

/**
 * CompleteAvatar with subtle idle animation (breathing/swaying)
 * Used for interactive previews
 */
export function CompleteAvatarAnimated({
  avatarId = DEFAULT_AVATAR_ID,
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, 0, 0],
  idleIntensity = 1,
  onLoad,
  onError,
}) {
  const groupRef = useRef();

  // Subtle idle animation
  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.elapsedTime;

    // Subtle breathing - slight vertical movement
    groupRef.current.position.y = position[1] + Math.sin(t * 0.8) * 0.01 * idleIntensity;

    // Subtle swaying
    groupRef.current.rotation.y = rotation[1] + Math.sin(t * 0.4) * 0.02 * idleIntensity;
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <CompleteAvatar
        avatarId={avatarId}
        position={[0, 0, 0]}
        scale={scale}
        rotation={[0, 0, 0]}
        animate={true}
        onLoad={onLoad}
        onError={onError}
      />
    </group>
  );
}

// =============================================================================
// AVATAR FOR SNAPSHOTS
// =============================================================================

/**
 * CompleteAvatar optimized for snapshot generation
 * No animations, optimized lighting response
 */
export function CompleteAvatarSnapshot({
  avatarId = DEFAULT_AVATAR_ID,
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, Math.PI / 12, 0], // Slight angle for better snapshot
  onLoad,
}) {
  return (
    <CompleteAvatar
      avatarId={avatarId}
      position={position}
      scale={scale}
      rotation={rotation}
      animate={false}
      onLoad={onLoad}
    />
  );
}

// =============================================================================
// PRELOADING
// =============================================================================

/**
 * Preload avatar models for faster display
 * Call this early in app lifecycle for commonly used avatars
 */
export function preloadAvatar(avatarId) {
  const url = getAvatarUrl(avatarId);
  useGLTF.preload(url);
}

/**
 * Preload multiple avatars
 */
export function preloadAvatars(avatarIds) {
  avatarIds.forEach((id) => {
    try {
      preloadAvatar(id);
    } catch (e) {
      console.warn(`[CompleteAvatar] Failed to preload ${id}:`, e);
    }
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export default CompleteAvatar;
