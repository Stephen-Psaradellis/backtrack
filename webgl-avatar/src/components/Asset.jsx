/**
 * Asset Component - GLTF Model Loader with Skeleton Sharing
 *
 * Task 8: Asset Loader System
 *
 * Loads GLTF models from URL and provides:
 * - Shared skeleton support for character parts
 * - Material color override for customization
 * - Suspense-compatible loading
 * - Automatic scene cloning to avoid conflicts
 *
 * Pattern inspired by r3f-ultimate-character-configurator
 *
 * @example
 * ```jsx
 * // Basic usage
 * <Asset url="/models/heads/oval.glb" />
 *
 * // With color override
 * <Asset
 *   url="/models/heads/oval.glb"
 *   color="#D1A684"
 * />
 *
 * // With shared skeleton (for rigged parts)
 * <Asset
 *   url="/models/hair/long.glb"
 *   skeleton={baseArmature.skeleton}
 *   color="#6A4E42"
 * />
 * ```
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// =============================================================================
// ASSET COMPONENT
// =============================================================================

/**
 * Asset component for loading and displaying GLTF models
 *
 * @param {Object} props
 * @param {string} props.url - URL of the GLTF model to load
 * @param {THREE.Skeleton} [props.skeleton] - Shared skeleton for rigged parts
 * @param {string} [props.color] - Color to apply to all materials
 * @param {number} [props.scale] - Uniform scale factor
 * @param {[number, number, number]} [props.position] - Position in 3D space
 * @param {[number, number, number]} [props.rotation] - Rotation in radians
 * @param {boolean} [props.castShadow] - Whether to cast shadows
 * @param {boolean} [props.receiveShadow] - Whether to receive shadows
 * @param {Function} [props.onLoad] - Callback when asset is loaded
 * @param {Object} [props.materialOverrides] - Custom material property overrides
 */
export function Asset({
  url,
  skeleton,
  color,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  castShadow = false,
  receiveShadow = false,
  onLoad,
  materialOverrides = {},
  ...props
}) {
  const groupRef = useRef();
  const { scene } = useGLTF(url);

  // Clone the scene to avoid conflicts with other instances
  // Use SkeletonUtils.clone for proper skinned mesh handling
  const clonedScene = useMemo(() => {
    try {
      return SkeletonUtils.clone(scene);
    } catch {
      // Fallback to regular clone if SkeletonUtils fails
      return scene.clone();
    }
  }, [scene]);

  // Apply shared skeleton to skinned meshes
  useEffect(() => {
    if (!skeleton) return;

    clonedScene.traverse((child) => {
      if (child.isSkinnedMesh) {
        child.skeleton = skeleton;
        child.bind(skeleton);
      }
    });
  }, [clonedScene, skeleton]);

  // Apply color and material overrides
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh && child.material) {
        // Clone material to avoid affecting other instances
        const materials = Array.isArray(child.material)
          ? child.material.map((m) => m.clone())
          : [child.material.clone()];

        materials.forEach((material) => {
          // Apply color override
          if (color) {
            material.color = new THREE.Color(color);
          }

          // Apply custom material overrides
          Object.entries(materialOverrides).forEach(([key, value]) => {
            if (key in material) {
              material[key] = value;
            }
          });
        });

        child.material = Array.isArray(child.material) ? materials : materials[0];

        // Apply shadow settings
        child.castShadow = castShadow;
        child.receiveShadow = receiveShadow;
      }
    });
  }, [clonedScene, color, materialOverrides, castShadow, receiveShadow]);

  // Call onLoad when ready
  useEffect(() => {
    if (onLoad) {
      onLoad(clonedScene);
    }
  }, [clonedScene, onLoad]);

  // Calculate scale (support both number and array)
  const scaleValue = typeof scale === 'number' ? [scale, scale, scale] : scale;

  return (
    <primitive
      ref={groupRef}
      object={clonedScene}
      scale={scaleValue}
      position={position}
      rotation={rotation}
      {...props}
    />
  );
}

// =============================================================================
// SPECIALIZED ASSET COMPONENTS
// =============================================================================

/**
 * Head asset with default skin tone support
 */
export function HeadAsset({
  url,
  skinTone = '#D1A684',
  ...props
}) {
  return (
    <Asset
      url={url}
      color={skinTone}
      {...props}
    />
  );
}

/**
 * Hair asset with default hair color support
 */
export function HairAsset({
  url,
  hairColor = '#6A4E42',
  ...props
}) {
  return (
    <Asset
      url={url}
      color={hairColor}
      {...props}
    />
  );
}

/**
 * Eye asset with iris color support
 */
export function EyeAsset({
  url,
  irisColor = '#634e34',
  ...props
}) {
  return (
    <Asset
      url={url}
      color={irisColor}
      {...props}
    />
  );
}

/**
 * Facial hair asset
 */
export function FacialHairAsset({
  url,
  color = '#3B3024',
  ...props
}) {
  return (
    <Asset
      url={url}
      color={color}
      {...props}
    />
  );
}

// =============================================================================
// LOADING FALLBACK COMPONENTS
// =============================================================================

/**
 * Loading placeholder while asset is loading
 * Use this as Suspense fallback
 */
export function AssetLoadingFallback({
  type = 'sphere',
  color = '#6366f1',
  scale = 1,
  position = [0, 0, 0],
}) {
  const ref = useRef();

  // Simple rotation animation
  React.useEffect(() => {
    if (!ref.current) return;

    let animationId;
    let rotation = 0;

    const animate = () => {
      rotation += 0.02;
      if (ref.current) {
        ref.current.rotation.y = rotation;
      }
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const geometry = useMemo(() => {
    switch (type) {
      case 'sphere':
        return <sphereGeometry args={[0.5 * scale, 16, 16]} />;
      case 'box':
        return <boxGeometry args={[scale, scale, scale]} />;
      case 'torus':
        return <torusGeometry args={[0.3 * scale, 0.1 * scale, 8, 16]} />;
      default:
        return <sphereGeometry args={[0.5 * scale, 16, 16]} />;
    }
  }, [type, scale]);

  return (
    <mesh ref={ref} position={position}>
      {geometry}
      <meshBasicMaterial color={color} wireframe />
    </mesh>
  );
}

/**
 * Error placeholder when asset fails to load
 */
export function AssetErrorFallback({
  message = 'Failed to load',
  scale = 1,
  position = [0, 0, 0],
}) {
  return (
    <group position={position}>
      <mesh scale={scale}>
        <octahedronGeometry args={[0.5]} />
        <meshBasicMaterial color="#ef4444" wireframe />
      </mesh>
    </group>
  );
}

// =============================================================================
// ASSET GROUP (for composing multiple parts)
// =============================================================================

/**
 * Group multiple assets together with shared properties
 */
export function AssetGroup({
  children,
  skeleton,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  ...props
}) {
  // Pass skeleton to all Asset children
  const childrenWithSkeleton = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === Asset) {
      return React.cloneElement(child, { skeleton, ...child.props });
    }
    return child;
  });

  return (
    <group
      position={position}
      rotation={rotation}
      scale={typeof scale === 'number' ? [scale, scale, scale] : scale}
      {...props}
    >
      {childrenWithSkeleton}
    </group>
  );
}

// =============================================================================
// PRELOAD HELPER
// =============================================================================

/**
 * Preload an asset URL using drei's preload
 * Call this to warm the cache before rendering
 */
Asset.preload = (url) => {
  useGLTF.preload(url);
};

/**
 * Clear a specific asset from drei's cache
 */
Asset.clear = (url) => {
  useGLTF.clear(url);
};

export default Asset;
