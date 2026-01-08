/**
 * Snapshot Utilities for 3D Avatar Renderer
 *
 * Task 15: Snapshot Generation
 *
 * Provides functionality to capture high-quality PNG/JPEG snapshots
 * of the 3D avatar scene with configurable resolution, camera presets,
 * and transparent background support.
 *
 * @example
 * ```typescript
 * import { takeSnapshot, SNAPSHOT_PRESETS } from './utils/snapshot';
 *
 * // Take a portrait snapshot at 512x512
 * const base64 = await takeSnapshot(gl, scene, camera, {
 *   width: 512,
 *   height: 512,
 *   preset: 'portrait',
 *   transparent: true,
 * });
 * ```
 */

import * as THREE from 'three';

// =============================================================================
// TYPES
// =============================================================================

export type SnapshotFormat = 'png' | 'jpeg';
export type SnapshotPreset = 'portrait' | 'fullBody' | 'closeUp' | 'threeQuarter' | 'profile';
export type SnapshotQuality = 'draft' | 'standard' | 'high' | 'final';

export interface SnapshotOptions {
  /** Output width in pixels (default: 512) */
  width?: number;
  /** Output height in pixels (default: 512) */
  height?: number;
  /** Output format: 'png' or 'jpeg' (default: 'png') */
  format?: SnapshotFormat;
  /** JPEG quality 0-1, ignored for PNG (default: 0.92) */
  quality?: number;
  /** Use transparent background (default: false) */
  transparent?: boolean;
  /** Camera preset for framing (default: current camera position) */
  preset?: SnapshotPreset;
  /** Quality preset affecting antialiasing and resolution (default: 'standard') */
  qualityPreset?: SnapshotQuality;
  /** Custom background color (hex), only used if transparent is false */
  backgroundColor?: string;
}

export interface SnapshotResult {
  /** Base64-encoded image data (includes data URL prefix) */
  base64: string;
  /** Width of the captured image */
  width: number;
  /** Height of the captured image */
  height: number;
  /** Format of the captured image */
  format: SnapshotFormat;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Camera presets for snapshot framing
 * Matches CAMERA_PRESETS from CameraManager.jsx
 */
export const SNAPSHOT_CAMERA_PRESETS: Record<
  SnapshotPreset,
  { position: [number, number, number]; target: [number, number, number]; fov: number }
> = {
  portrait: {
    position: [0, 1.5, 2.5],
    target: [0, 1.5, 0],
    fov: 45,
  },
  fullBody: {
    position: [0, 1, 4.5],
    target: [0, 1, 0],
    fov: 50,
  },
  closeUp: {
    position: [0, 1.65, 1.5],
    target: [0, 1.65, 0],
    fov: 35,
  },
  threeQuarter: {
    position: [1.5, 1.6, 2],
    target: [0, 1.5, 0],
    fov: 45,
  },
  profile: {
    position: [2.5, 1.5, 0],
    target: [0, 1.5, 0],
    fov: 45,
  },
};

/**
 * Quality presets for different use cases
 */
export const SNAPSHOT_QUALITY_PRESETS: Record<
  SnapshotQuality,
  { multiplier: number; antialiasingSamples: number }
> = {
  draft: { multiplier: 1, antialiasingSamples: 0 },
  standard: { multiplier: 1, antialiasingSamples: 2 },
  high: { multiplier: 1.5, antialiasingSamples: 4 },
  final: { multiplier: 2, antialiasingSamples: 8 },
};

/**
 * Common snapshot size presets
 */
export const SNAPSHOT_SIZES = {
  thumbnail: { width: 256, height: 256 },
  small: { width: 512, height: 512 },
  medium: { width: 768, height: 768 },
  large: { width: 1024, height: 1024 },
  profile: { width: 512, height: 512 },
  post: { width: 512, height: 512 },
  chat: { width: 256, height: 256 },
};

/**
 * Default snapshot options
 */
export const DEFAULT_SNAPSHOT_OPTIONS: Required<Omit<SnapshotOptions, 'preset' | 'backgroundColor'>> & {
  preset?: SnapshotPreset;
  backgroundColor?: string;
} = {
  width: 512,
  height: 512,
  format: 'png',
  quality: 0.92,
  transparent: false,
  qualityPreset: 'standard',
  preset: undefined,
  backgroundColor: undefined,
};

// =============================================================================
// MAIN SNAPSHOT FUNCTION
// =============================================================================

/**
 * Take a snapshot of the 3D scene
 *
 * @param renderer - Three.js WebGLRenderer instance
 * @param scene - Three.js Scene to render
 * @param camera - Three.js Camera (will be cloned if preset is specified)
 * @param options - Snapshot configuration options
 * @returns Promise resolving to SnapshotResult with base64 image
 *
 * @example
 * ```typescript
 * // Take a 512x512 portrait snapshot with transparent background
 * const result = await takeSnapshot(renderer, scene, camera, {
 *   width: 512,
 *   height: 512,
 *   preset: 'portrait',
 *   transparent: true,
 * });
 * console.log(result.base64); // data:image/png;base64,...
 * ```
 */
export async function takeSnapshot(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  options: SnapshotOptions = {}
): Promise<SnapshotResult> {
  // Merge with defaults
  const opts = { ...DEFAULT_SNAPSHOT_OPTIONS, ...options };
  const {
    width,
    height,
    format,
    quality,
    transparent,
    preset,
    qualityPreset,
    backgroundColor,
  } = opts;

  // Get quality settings
  const qualitySettings = SNAPSHOT_QUALITY_PRESETS[qualityPreset || 'standard'];

  // Calculate actual render size (may be higher for quality)
  const renderWidth = Math.round(width * qualitySettings.multiplier);
  const renderHeight = Math.round(height * qualitySettings.multiplier);

  // Store original renderer state
  const originalSize = new THREE.Vector2();
  renderer.getSize(originalSize);
  const originalPixelRatio = renderer.getPixelRatio();
  const originalClearColor = renderer.getClearColor(new THREE.Color());
  const originalClearAlpha = renderer.getClearAlpha();
  const originalAutoClear = renderer.autoClear;

  // Store original scene background
  const originalBackground = scene.background;

  // Create or clone camera for snapshot
  let snapshotCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;

  if (preset && camera instanceof THREE.PerspectiveCamera) {
    // Use preset camera position
    const presetConfig = SNAPSHOT_CAMERA_PRESETS[preset];
    snapshotCamera = camera.clone() as THREE.PerspectiveCamera;
    snapshotCamera.position.set(...presetConfig.position);
    snapshotCamera.lookAt(new THREE.Vector3(...presetConfig.target));
    snapshotCamera.fov = presetConfig.fov;
    snapshotCamera.aspect = renderWidth / renderHeight;
    snapshotCamera.updateProjectionMatrix();
  } else {
    // Use current camera (clone to avoid modifying original)
    snapshotCamera = camera.clone();
    if (snapshotCamera instanceof THREE.PerspectiveCamera) {
      snapshotCamera.aspect = renderWidth / renderHeight;
      snapshotCamera.updateProjectionMatrix();
    }
  }

  try {
    // Configure renderer for snapshot
    renderer.setSize(renderWidth, renderHeight);
    renderer.setPixelRatio(1); // Use 1:1 pixel ratio for consistent output

    // Set background
    if (transparent) {
      renderer.setClearColor(0x000000, 0);
      scene.background = null;
    } else if (backgroundColor) {
      const bgColor = new THREE.Color(backgroundColor);
      renderer.setClearColor(bgColor, 1);
      scene.background = bgColor;
    }

    // Clear and render
    renderer.autoClear = true;
    renderer.clear();
    renderer.render(scene, snapshotCamera);

    // Capture to canvas
    const canvas = renderer.domElement;

    // If render size is different from output size, resize using a temporary canvas
    let outputCanvas: HTMLCanvasElement = canvas;

    if (renderWidth !== width || renderHeight !== height) {
      outputCanvas = document.createElement('canvas');
      outputCanvas.width = width;
      outputCanvas.height = height;
      const ctx = outputCanvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, renderWidth, renderHeight, 0, 0, width, height);
      }
    }

    // Convert to base64
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const base64 = outputCanvas.toDataURL(mimeType, format === 'jpeg' ? quality : undefined);

    // Clean up temporary canvas
    if (outputCanvas !== canvas) {
      outputCanvas.remove();
    }

    return {
      base64,
      width,
      height,
      format,
    };
  } finally {
    // Restore original renderer state
    renderer.setSize(originalSize.x, originalSize.y);
    renderer.setPixelRatio(originalPixelRatio);
    renderer.setClearColor(originalClearColor, originalClearAlpha);
    renderer.autoClear = originalAutoClear;

    // Restore original scene background
    scene.background = originalBackground;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Take a snapshot using named size preset
 *
 * @param renderer - Three.js WebGLRenderer
 * @param scene - Three.js Scene
 * @param camera - Three.js Camera
 * @param sizePreset - Size preset name ('thumbnail', 'small', 'medium', 'large')
 * @param options - Additional snapshot options
 */
export async function takeSnapshotWithSizePreset(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  sizePreset: keyof typeof SNAPSHOT_SIZES,
  options: Omit<SnapshotOptions, 'width' | 'height'> = {}
): Promise<SnapshotResult> {
  const size = SNAPSHOT_SIZES[sizePreset];
  return takeSnapshot(renderer, scene, camera, { ...size, ...options });
}

/**
 * Strip the data URL prefix from base64 image data
 * Useful when uploading to storage services that expect raw base64
 *
 * @param base64WithPrefix - Base64 string with 'data:image/...' prefix
 * @returns Raw base64 string without prefix
 */
export function stripBase64Prefix(base64WithPrefix: string): string {
  const commaIndex = base64WithPrefix.indexOf(',');
  if (commaIndex !== -1) {
    return base64WithPrefix.substring(commaIndex + 1);
  }
  return base64WithPrefix;
}

/**
 * Add data URL prefix to raw base64 data
 *
 * @param rawBase64 - Raw base64 string without prefix
 * @param format - Image format ('png' or 'jpeg')
 * @returns Base64 string with data URL prefix
 */
export function addBase64Prefix(rawBase64: string, format: SnapshotFormat = 'png'): string {
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mimeType};base64,${rawBase64}`;
}

/**
 * Get the MIME type for a snapshot format
 *
 * @param format - Snapshot format
 * @returns MIME type string
 */
export function getSnapshotMimeType(format: SnapshotFormat): string {
  return format === 'jpeg' ? 'image/jpeg' : 'image/png';
}

/**
 * Estimate the file size of a base64 image in bytes
 *
 * @param base64 - Base64 encoded image (with or without data URL prefix)
 * @returns Estimated size in bytes
 */
export function estimateBase64Size(base64: string): number {
  const rawBase64 = stripBase64Prefix(base64);
  // Base64 encodes 3 bytes as 4 characters, minus padding
  const padding = (rawBase64.match(/=/g) || []).length;
  return Math.floor((rawBase64.length * 3) / 4) - padding;
}

// =============================================================================
// SNAPSHOT HANDLER FOR MESSAGE BRIDGE
// =============================================================================

/**
 * Create a snapshot handler for integration with the message bridge
 *
 * This function creates a handler that can be used with the useBridge hook
 * to respond to TAKE_SNAPSHOT messages from React Native.
 *
 * @param renderer - Three.js WebGLRenderer
 * @param scene - Three.js Scene
 * @param camera - Three.js Camera
 * @param sendResult - Callback to send result back to RN
 * @param sendError - Callback to send error back to RN
 *
 * @example
 * ```typescript
 * const handleSnapshot = createSnapshotHandler(
 *   renderer, scene, camera,
 *   (base64, width, height) => sendToRN({ type: 'SNAPSHOT_READY', base64, width, height }),
 *   (message) => sendToRN({ type: 'ERROR', message, code: 'SNAPSHOT_ERROR' })
 * );
 *
 * // In message handler:
 * case 'TAKE_SNAPSHOT':
 *   handleSnapshot(message);
 *   break;
 * ```
 */
export function createSnapshotHandler(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  sendResult: (base64: string, width: number, height: number) => void,
  sendError: (message: string) => void
) {
  return async (options: SnapshotOptions = {}) => {
    try {
      const result = await takeSnapshot(renderer, scene, camera, options);
      sendResult(result.base64, result.width, result.height);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Snapshot failed';
      sendError(errorMessage);
    }
  };
}

export default takeSnapshot;
