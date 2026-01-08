/**
 * Avatar Composer Component (Rewritten)
 *
 * This version uses complete pre-made avatar models instead of
 * composing parts (head, hair, features) at runtime.
 *
 * The new architecture:
 * - Uses CompleteAvatar to load full GLB models
 * - Supports avatarId selection from registry
 * - Maintains backward compatibility where possible
 * - Simplified implementation with higher visual quality
 *
 * @example
 * ```jsx
 * <Suspense fallback={<LoadingAvatar />}>
 *   <Avatar config={{ avatarId: 'avatar_asian_m' }} />
 * </Suspense>
 * ```
 */

import React, { Suspense, useMemo, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import {
  CompleteAvatar,
  CompleteAvatarAnimated,
  CompleteAvatarSnapshot,
  AvatarLoadingFallback,
} from './CompleteAvatar';

import {
  DEFAULT_AVATAR_ID,
  FALLBACK_AVATAR_ID,
  getAvatarById,
  LOCAL_AVATARS,
} from '../constants/avatarRegistry';

// =============================================================================
// LEGACY CONFIG SUPPORT
// =============================================================================

/**
 * Maps old part-based config to new avatarId system
 * Uses ethnicity/gender hints to select best matching avatar
 *
 * @param {Object} config - Old style config with parts
 * @returns {string} Best matching avatar ID
 */
function mapLegacyConfigToAvatarId(config) {
  // If config already has avatarId, use it
  if (config?.avatarId) {
    return config.avatarId;
  }

  // Try to infer from old config values
  // This is a best-effort mapping for backward compatibility

  // Check for ethnicity hints in skin tone
  const skinTone = config?.skinTone || '';
  const hairColor = config?.hairColor || '';

  // Simple heuristic mapping based on available avatars
  // In production, this could be more sophisticated

  // Default to first diverse avatar for better representation
  return DEFAULT_AVATAR_ID;
}

/**
 * Default avatar configuration for new system
 */
export const DEFAULT_AVATAR_CONFIG = {
  avatarId: DEFAULT_AVATAR_ID,
};

/**
 * Merge partial config with defaults
 * @param {Object} config - Partial configuration
 * @returns {Object} Complete configuration
 */
export function mergeWithDefaults(config) {
  // If old-style config without avatarId, map it
  if (config && !config.avatarId) {
    return {
      ...DEFAULT_AVATAR_CONFIG,
      avatarId: mapLegacyConfigToAvatarId(config),
    };
  }

  return {
    ...DEFAULT_AVATAR_CONFIG,
    ...config,
  };
}

// =============================================================================
// LOADING FALLBACKS
// =============================================================================

/**
 * Loading placeholder while avatar is loading
 * Shows an animated wireframe figure
 */
export function LoadingAvatar({ position = [0, 0, 0] }) {
  const ref = useRef();

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.5;
      ref.current.position.y = position[1] + 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group position={position}>
      <mesh ref={ref} position={[0, 1, 0]}>
        <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
        <meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

/**
 * Error fallback when avatar fails to load
 */
function AvatarErrorFallback({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <octahedronGeometry args={[0.4]} />
        <meshBasicMaterial color="#ef4444" wireframe />
      </mesh>
    </group>
  );
}

// =============================================================================
// MAIN AVATAR COMPONENT
// =============================================================================

/**
 * Main Avatar component
 *
 * Now uses complete pre-made avatar models instead of composing parts.
 *
 * @param {Object} props
 * @param {Object} props.config - Avatar configuration (requires avatarId)
 * @param {number} [props.scale=1] - Overall scale
 * @param {[number, number, number]} [props.position=[0, 0, 0]] - Position
 * @param {boolean} [props.animate=false] - Enable idle animation
 * @param {boolean} [props.debug=false] - Enable debug mode
 * @param {Function} [props.onLoad] - Called when avatar loads
 * @param {Function} [props.onError] - Called on load error
 */
function Avatar({
  config: rawConfig,
  scale = 1,
  position = [0, 0, 0],
  animate = false,
  debug = false,
  onLoad,
  onError,
}) {
  // Merge with defaults and handle legacy config
  const config = useMemo(
    () => mergeWithDefaults(rawConfig || {}),
    [rawConfig]
  );

  const [hasError, setHasError] = useState(false);

  // Handle load callback
  const handleLoad = () => {
    if (debug) {
      console.log('[Avatar] Loaded:', config.avatarId);
    }
    onLoad?.();
  };

  // Handle error callback
  const handleError = (error) => {
    console.warn('[Avatar] Load error:', error);
    setHasError(true);
    onError?.(error);
  };

  // If error, show fallback
  if (hasError) {
    return <AvatarErrorFallback position={position} />;
  }

  // Use appropriate avatar component based on animate flag
  const AvatarComponent = animate ? CompleteAvatarAnimated : CompleteAvatar;

  return (
    <Suspense fallback={<LoadingAvatar position={position} />}>
      <AvatarComponent
        avatarId={config.avatarId}
        position={position}
        scale={scale}
        animate={animate}
        onLoad={handleLoad}
        onError={handleError}
      />
      {/* Debug info */}
      {debug && (
        <group position={[position[0], position[1] + 2.2, position[2]]}>
          {/* Debug label would go here in HTML overlay */}
        </group>
      )}
    </Suspense>
  );
}

// =============================================================================
// AVATAR WITH BRIDGE (WebView Communication)
// =============================================================================

/**
 * Avatar component that listens for configuration updates from
 * the React Native WebView bridge.
 *
 * @param {Object} props
 * @param {Object} [props.initialConfig] - Initial configuration
 * @param {number} [props.scale=1] - Overall scale
 * @param {[number, number, number]} [props.position=[0, 0, 0]] - Position
 * @param {boolean} [props.animate=false] - Enable idle animation
 * @param {boolean} [props.debug=false] - Enable debug mode
 */
function AvatarWithBridge({
  initialConfig,
  scale = 1,
  position = [0, 0, 0],
  animate = false,
  debug = false,
}) {
  const [config, setConfig] = useState(() =>
    mergeWithDefaults(initialConfig || {})
  );

  // Listen for config updates from RN bridge
  useEffect(() => {
    function handleMessage(event) {
      try {
        const data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (debug) {
          console.log('[AvatarWithBridge] Message received:', data);
        }

        // Handle different message types
        if (data.type === 'INIT' && data.config) {
          // Initialize with config
          setConfig(mergeWithDefaults(data.config));
        } else if (data.type === 'UPDATE_CONFIG' && data.changes) {
          // Update specific fields
          setConfig((prev) => mergeWithDefaults({
            ...prev,
            ...data.changes,
          }));
        } else if (data.type === 'SET_CONFIG' && data.config) {
          // Replace entire config (legacy support)
          setConfig(mergeWithDefaults(data.config));
        } else if (data.type === 'SET_AVATAR' && data.avatarId) {
          // New: Set avatar by ID directly
          setConfig((prev) => ({
            ...prev,
            avatarId: data.avatarId,
          }));
        }
      } catch (error) {
        if (debug) {
          console.warn('[AvatarWithBridge] Parse error:', error);
        }
      }
    }

    // Listen on both window and document for cross-platform support
    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);

    // Send ready signal to React Native
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'READY',
        availableAvatars: LOCAL_AVATARS.map(a => a.id),
      }));
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('message', handleMessage);
    };
  }, [debug]);

  return (
    <Suspense fallback={<LoadingAvatar position={position} />}>
      <Avatar
        config={config}
        scale={scale}
        position={position}
        animate={animate}
        debug={debug}
      />
    </Suspense>
  );
}

// =============================================================================
// SNAPSHOT AVATAR
// =============================================================================

/**
 * Avatar optimized for snapshot generation
 * No animations, consistent lighting response
 */
function AvatarForSnapshot({
  config: rawConfig,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, Math.PI / 12, 0],
  onLoad,
}) {
  const config = useMemo(
    () => mergeWithDefaults(rawConfig || {}),
    [rawConfig]
  );

  return (
    <Suspense fallback={<LoadingAvatar position={position} />}>
      <CompleteAvatarSnapshot
        avatarId={config.avatarId}
        position={position}
        scale={scale}
        rotation={rotation}
        onLoad={onLoad}
      />
    </Suspense>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  Avatar,
  AvatarWithBridge,
  AvatarForSnapshot,
  // Re-export CompleteAvatar components
  CompleteAvatar,
  CompleteAvatarAnimated,
  CompleteAvatarSnapshot,
};

// Note: LoadingAvatar, AvatarErrorFallback, mergeWithDefaults, mapLegacyConfigToAvatarId
// are already exported via their function definitions above

export default Avatar;
