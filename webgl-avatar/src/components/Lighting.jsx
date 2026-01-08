import React from 'react';
import { Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// =============================================================================
// LIGHTING CONFIGURATION
// =============================================================================

/**
 * Lighting configuration for different moods/contexts
 */
export const LIGHTING_PRESETS = {
  default: {
    key: { position: [5, 5, 5], intensity: 0.8, color: '#ffffff' },
    fill: { position: [-3, 3, -3], intensity: 0.3, color: '#b9d5ff' },
    rim: { position: [0, 5, -5], intensity: 0.5, color: '#ffd9b4' },
    ambient: { intensity: 0.4 },
    environment: 'sunset',
  },
  studio: {
    key: { position: [4, 6, 4], intensity: 1.0, color: '#ffffff' },
    fill: { position: [-4, 4, -2], intensity: 0.4, color: '#e8f4ff' },
    rim: { position: [0, 4, -6], intensity: 0.6, color: '#fff5e6' },
    ambient: { intensity: 0.35 },
    environment: 'city',
  },
  warm: {
    key: { position: [5, 5, 5], intensity: 0.9, color: '#ffe4c4' },
    fill: { position: [-3, 3, -3], intensity: 0.35, color: '#ffd9b4' },
    rim: { position: [0, 5, -5], intensity: 0.4, color: '#ffb86c' },
    ambient: { intensity: 0.45 },
    environment: 'sunset',
  },
  cool: {
    key: { position: [5, 5, 5], intensity: 0.85, color: '#f0f8ff' },
    fill: { position: [-3, 3, -3], intensity: 0.35, color: '#b9d5ff' },
    rim: { position: [0, 5, -5], intensity: 0.45, color: '#e6f2ff' },
    ambient: { intensity: 0.4 },
    environment: 'dawn',
  },
  portrait: {
    key: { position: [3, 4, 4], intensity: 0.9, color: '#fff8f0' },
    fill: { position: [-4, 2, 0], intensity: 0.5, color: '#e8f0ff' },
    rim: { position: [2, 3, -5], intensity: 0.55, color: '#ffeedd' },
    ambient: { intensity: 0.3 },
    environment: 'apartment',
  },
};

// =============================================================================
// DIRECTIONAL LIGHT WITH SHADOWS
// =============================================================================

/**
 * Directional light with optimized shadow settings for mobile
 */
function KeyLight({ position, intensity, color, enableShadows = true }) {
  return (
    <directionalLight
      position={position}
      intensity={intensity}
      color={color}
      castShadow={enableShadows}
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-camera-far={50}
      shadow-camera-left={-10}
      shadow-camera-right={10}
      shadow-camera-top={10}
      shadow-camera-bottom={-10}
      shadow-bias={-0.0001}
      shadow-normalBias={0.02}
    />
  );
}

/**
 * Fill light - softer light from opposite side to reduce harsh shadows
 */
function FillLight({ position, intensity, color }) {
  return (
    <directionalLight
      position={position}
      intensity={intensity}
      color={color}
      castShadow={false}
    />
  );
}

/**
 * Rim/back light - creates separation from background and adds depth
 */
function RimLight({ position, intensity, color }) {
  return (
    <directionalLight
      position={position}
      intensity={intensity}
      color={color}
      castShadow={false}
    />
  );
}

// =============================================================================
// MAIN LIGHTING COMPONENT
// =============================================================================

/**
 * Professional three-point lighting setup for avatar rendering
 *
 * @param {Object} props
 * @param {string} props.preset - Lighting preset name (default, studio, warm, cool, portrait)
 * @param {boolean} props.enableShadows - Enable shadow casting (default: true)
 * @param {boolean} props.enableEnvironment - Enable environment map for reflections (default: true)
 * @param {boolean} props.enableContactShadows - Enable ground contact shadows (default: true)
 * @param {Object} props.override - Override individual light settings
 */
export function Lighting({
  preset = 'default',
  enableShadows = true,
  enableEnvironment = true,
  enableContactShadows = true,
  override = {},
}) {
  const config = { ...LIGHTING_PRESETS[preset], ...override };

  return (
    <>
      {/* Key light - main illumination, the dominant light source */}
      <KeyLight
        position={config.key.position}
        intensity={config.key.intensity}
        color={config.key.color}
        enableShadows={enableShadows}
      />

      {/* Fill light - softens shadows created by key light */}
      <FillLight
        position={config.fill.position}
        intensity={config.fill.intensity}
        color={config.fill.color}
      />

      {/* Rim light - creates separation from background, adds depth */}
      <RimLight
        position={config.rim.position}
        intensity={config.rim.intensity}
        color={config.rim.color}
      />

      {/* Ambient light - base illumination to prevent pure black shadows */}
      <ambientLight intensity={config.ambient.intensity} />

      {/* Environment map for subtle reflections on skin and eyes */}
      {enableEnvironment && (
        <Environment
          preset={config.environment}
          background={false}
          blur={0.8}
        />
      )}

      {/* Contact shadows for grounding the avatar */}
      {enableContactShadows && (
        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.35}
          scale={10}
          blur={2}
          far={4}
          resolution={256}
          color="#000000"
        />
      )}
    </>
  );
}

// =============================================================================
// SIMPLIFIED LIGHTING (for lower-end devices)
// =============================================================================

/**
 * Simplified lighting for better performance on low-end devices
 */
export function SimpleLighting({ intensity = 1.0 }) {
  return (
    <>
      <ambientLight intensity={0.5 * intensity} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.8 * intensity}
        color="#ffffff"
      />
      <directionalLight
        position={[-3, 3, -3]}
        intensity={0.3 * intensity}
        color="#b9d5ff"
      />
    </>
  );
}

// =============================================================================
// LIGHTING FOR SNAPSHOTS
// =============================================================================

/**
 * Optimized lighting specifically for static snapshot generation
 * More contrast and clarity for small thumbnail sizes
 */
export function SnapshotLighting() {
  return (
    <>
      {/* Stronger key light for clearer definition */}
      <directionalLight
        position={[4, 5, 5]}
        intensity={1.0}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />

      {/* Moderate fill for visibility */}
      <directionalLight
        position={[-4, 3, -2]}
        intensity={0.45}
        color="#e0f0ff"
      />

      {/* Strong rim light for edge definition in small sizes */}
      <directionalLight
        position={[0, 4, -6]}
        intensity={0.6}
        color="#fff0e0"
      />

      {/* Slightly higher ambient to avoid dark patches */}
      <ambientLight intensity={0.5} />

      {/* Environment for subtle reflections */}
      <Environment preset="studio" background={false} blur={0.6} />
    </>
  );
}

export default Lighting;
