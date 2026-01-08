import React, { Suspense, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import * as THREE from 'three';

import { Lighting, SimpleLighting, SnapshotLighting, LIGHTING_PRESETS } from './Lighting';

// =============================================================================
// EXPERIENCE CONFIGURATION
// =============================================================================

/**
 * Configuration for the 3D experience
 *
 * Updated for complete avatar models with full body view.
 * Avatars are approximately 1.7-1.8 units tall, standing at y=0.
 */
export const EXPERIENCE_CONFIG = {
  // Camera defaults (synced with CameraManager presets)
  camera: {
    portrait: { position: [0, 1.6, 2], fov: 45 },
    fullBody: { position: [0, 1, 4], fov: 50 },
    closeUp: { position: [0, 1.65, 1], fov: 35 },
    overview: { position: [0, 1.2, 3.5], fov: 45 },
  },
  // Post-processing settings
  postProcessing: {
    bloom: {
      intensity: 0.15,
      luminanceThreshold: 0.9,
      luminanceSmoothing: 0.4,
      kernelSize: KernelSize.MEDIUM,
    },
    vignette: {
      offset: 0.35,
      darkness: 0.35,
    },
  },
  // Background gradient colors
  background: {
    default: '#1a1a2e',
    light: '#2a2a4a',
    warm: '#2a2020',
    cool: '#1a2a2e',
  },
  // Ground plane settings
  ground: {
    size: 20,
    color: '#1a1a2e',
    opacity: 0.8,
  },
};

// =============================================================================
// BACKGROUND COMPONENT
// =============================================================================

/**
 * Soft gradient background for the scene
 */
function Background({ color = '#1a1a2e', gradientTop = null, gradientBottom = null }) {
  // If gradient colors provided, could create a gradient mesh
  // For now, using solid color (gradient would require a shader or plane mesh)
  return <color attach="background" args={[color]} />;
}

// =============================================================================
// GROUND PLANE COMPONENT
// =============================================================================

/**
 * Ground plane for full-body avatars
 * Provides visual grounding and receives shadows
 */
function GroundPlane({
  size = EXPERIENCE_CONFIG.ground.size,
  color = EXPERIENCE_CONFIG.ground.color,
  opacity = EXPERIENCE_CONFIG.ground.opacity,
  visible = true,
  receiveShadow = true,
}) {
  if (!visible) return null;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow={receiveShadow}
    >
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        roughness={0.9}
        metalness={0}
      />
    </mesh>
  );
}

/**
 * Invisible ground plane that only receives shadows
 * Creates floating shadow effect without visible floor
 */
function ShadowCatcher({ size = 10 }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.001, 0]}
      receiveShadow
    >
      <planeGeometry args={[size, size]} />
      <shadowMaterial transparent opacity={0.3} />
    </mesh>
  );
}

// =============================================================================
// POST-PROCESSING EFFECTS
// =============================================================================

/**
 * Post-processing effects for professional visual polish
 *
 * @param {Object} props
 * @param {boolean} props.enabled - Enable post-processing (default: true)
 * @param {boolean} props.enableBloom - Enable bloom effect (default: true)
 * @param {boolean} props.enableVignette - Enable vignette effect (default: true)
 * @param {boolean} props.enableSMAA - Enable anti-aliasing (default: true)
 * @param {Object} props.bloomSettings - Override bloom settings
 * @param {Object} props.vignetteSettings - Override vignette settings
 */
export function PostProcessing({
  enabled = true,
  enableBloom = true,
  enableVignette = true,
  enableSMAA = true,
  bloomSettings = {},
  vignetteSettings = {},
}) {
  // Merge with default settings
  const bloom = { ...EXPERIENCE_CONFIG.postProcessing.bloom, ...bloomSettings };
  const vignette = { ...EXPERIENCE_CONFIG.postProcessing.vignette, ...vignetteSettings };

  if (!enabled) return null;

  return (
    <EffectComposer multisampling={0}>
      {/* SMAA for anti-aliasing (lighter than MSAA) */}
      {enableSMAA && <SMAA />}

      {/* Subtle bloom for highlights - adds life to eyes and shiny surfaces */}
      {enableBloom && (
        <Bloom
          intensity={bloom.intensity}
          luminanceThreshold={bloom.luminanceThreshold}
          luminanceSmoothing={bloom.luminanceSmoothing}
          kernelSize={bloom.kernelSize}
          blendFunction={BlendFunction.ADD}
        />
      )}

      {/* Vignette for subtle edge darkening - draws focus to center */}
      {enableVignette && (
        <Vignette
          offset={vignette.offset}
          darkness={vignette.darkness}
          blendFunction={BlendFunction.NORMAL}
        />
      )}
    </EffectComposer>
  );
}

// =============================================================================
// CAMERA CONTROLLER
// =============================================================================

/**
 * Camera controller with orbit controls and presets
 */
export function CameraController({
  interactive = true,
  enableZoom = true,
  enablePan = false,
  minDistance = 1.5,
  maxDistance = 10,
  target = [0, 1.5, 0],
  minPolarAngle = Math.PI / 4,
  maxPolarAngle = Math.PI / 1.5,
}) {
  if (!interactive) return null;

  return (
    <OrbitControls
      enablePan={enablePan}
      enableZoom={enableZoom}
      minDistance={minDistance}
      maxDistance={maxDistance}
      target={target}
      minPolarAngle={minPolarAngle}
      maxPolarAngle={maxPolarAngle}
      dampingFactor={0.05}
      enableDamping={true}
    />
  );
}

// =============================================================================
// LOADING FALLBACK
// =============================================================================

/**
 * Loading indicator shown while assets load
 */
export function LoadingFallback() {
  const meshRef = React.useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 1.5;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.3;
    }
  });

  return (
    <group position={[0, 1.5, 0]}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshBasicMaterial color="#6366f1" wireframe />
      </mesh>
      <mesh position={[0, -0.8, 0]}>
        <ringGeometry args={[0.5, 0.6, 32]} />
        <meshBasicMaterial color="#4f46e5" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// =============================================================================
// MAIN EXPERIENCE COMPONENT
// =============================================================================

/**
 * Complete 3D experience wrapper with lighting, post-processing, and controls
 *
 * This component wraps the avatar scene with professional lighting,
 * post-processing effects, and camera controls.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Scene content (Avatar, etc.)
 * @param {string} props.lightingPreset - Lighting preset (default, studio, warm, cool, portrait)
 * @param {boolean} props.enablePostProcessing - Enable post-processing effects
 * @param {boolean} props.enableShadows - Enable shadow casting
 * @param {boolean} props.enableEnvironment - Enable environment reflections
 * @param {boolean} props.interactive - Enable orbit controls
 * @param {string} props.background - Background color
 * @param {Array} props.cameraTarget - Camera orbit target [x, y, z]
 * @param {string} props.mode - Experience mode: 'interactive' | 'snapshot' | 'simple'
 * @param {boolean} props.showGround - Show ground plane (default: false)
 * @param {boolean} props.showShadowCatcher - Show shadow catcher (default: true in interactive mode)
 */
export function Experience({
  children,
  lightingPreset = 'default',
  enablePostProcessing = true,
  enableShadows = true,
  enableEnvironment = true,
  enableContactShadows = true,
  interactive = true,
  background = EXPERIENCE_CONFIG.background.default,
  cameraTarget = [0, 1, 0],  // Updated for full-body avatars
  mode = 'interactive',
  showGround = false,
  showShadowCatcher = true,
}) {
  // Determine settings based on mode
  const settings = useMemo(() => {
    switch (mode) {
      case 'snapshot':
        return {
          postProcessing: false, // Disable for cleaner snapshots
          shadows: true,
          environment: true,
          contactShadows: false,
          interactive: false,
          ground: false,
          shadowCatcher: true,
          lightingComponent: <SnapshotLighting />,
        };
      case 'simple':
        return {
          postProcessing: false,
          shadows: false,
          environment: false,
          contactShadows: false,
          interactive: true,
          ground: showGround,
          shadowCatcher: false,
          lightingComponent: <SimpleLighting />,
        };
      case 'interactive':
      default:
        return {
          postProcessing: enablePostProcessing,
          shadows: enableShadows,
          environment: enableEnvironment,
          contactShadows: enableContactShadows,
          interactive: interactive,
          ground: showGround,
          shadowCatcher: showShadowCatcher && enableShadows,
          lightingComponent: (
            <Lighting
              preset={lightingPreset}
              enableShadows={enableShadows}
              enableEnvironment={enableEnvironment}
              enableContactShadows={enableContactShadows}
            />
          ),
        };
    }
  }, [mode, lightingPreset, enablePostProcessing, enableShadows, enableEnvironment, enableContactShadows, interactive, showGround, showShadowCatcher]);

  return (
    <>
      {/* Background */}
      <Background color={background} />

      {/* Ground plane (optional, for full-body avatars) */}
      {settings.ground && <GroundPlane />}

      {/* Shadow catcher (invisible ground that receives shadows) */}
      {settings.shadowCatcher && <ShadowCatcher />}

      {/* Lighting setup */}
      {settings.lightingComponent}

      {/* Scene content wrapped in Suspense */}
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>

      {/* Camera controls */}
      <CameraController
        interactive={settings.interactive}
        target={cameraTarget}
      />

      {/* Post-processing effects */}
      {settings.postProcessing && (
        <PostProcessing
          enabled={true}
          enableBloom={true}
          enableVignette={true}
          enableSMAA={true}
        />
      )}
    </>
  );
}

// =============================================================================
// PRESET EXPERIENCES
// =============================================================================

/**
 * Experience optimized for avatar creation/editing
 * Updated for full-body complete avatars
 */
export function CreatorExperience({ children, showGround = false }) {
  return (
    <Experience
      lightingPreset="portrait"
      enablePostProcessing={true}
      enableShadows={true}
      enableEnvironment={true}
      enableContactShadows={true}
      interactive={true}
      mode="interactive"
      cameraTarget={[0, 1, 0]}
      showGround={showGround}
      showShadowCatcher={true}
    >
      {children}
    </Experience>
  );
}

/**
 * Experience optimized for full-body avatar viewing
 */
export function FullBodyExperience({ children, showGround = true }) {
  return (
    <Experience
      lightingPreset="studio"
      enablePostProcessing={true}
      enableShadows={true}
      enableEnvironment={true}
      enableContactShadows={true}
      interactive={true}
      mode="interactive"
      cameraTarget={[0, 1, 0]}
      showGround={showGround}
      showShadowCatcher={true}
    >
      {children}
    </Experience>
  );
}

/**
 * Experience optimized for static snapshot generation
 */
export function SnapshotExperience({ children }) {
  return (
    <Experience
      mode="snapshot"
      interactive={false}
      cameraTarget={[0, 1, 0]}
      showShadowCatcher={true}
    >
      {children}
    </Experience>
  );
}

/**
 * Experience for low-end devices / performance mode
 */
export function SimpleExperience({ children }) {
  return (
    <Experience
      mode="simple"
      interactive={true}
      cameraTarget={[0, 1, 0]}
    >
      {children}
    </Experience>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export new components that don't have inline export
export {
  GroundPlane,
  ShadowCatcher,
};

// Note: Background, PostProcessing, CameraController, LoadingFallback, EXPERIENCE_CONFIG
// are already exported via their inline export statements above

export default Experience;
