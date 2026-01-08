/**
 * useAssetLoader - GLTF Asset Loading System with Caching
 *
 * Task 8: Asset Loader System
 *
 * Provides a comprehensive asset loading system for the 3D avatar renderer:
 * - useGLTF wrapper with progress tracking
 * - In-memory cache for loaded models
 * - Preload function for critical assets
 * - Error handling with retry logic
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { scene, isLoading, error } = useAssetLoader('/models/heads/oval.glb');
 *
 * // With progress callback
 * const { scene } = useAssetLoader('/models/hair/long.glb', {
 *   onProgress: (percent) => console.log(`Loading: ${percent}%`),
 * });
 *
 * // Preload critical assets
 * preloadAssets(['/models/heads/oval.glb', '/models/hair/short.glb']);
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { GLTF } from 'three-stdlib';
import * as THREE from 'three';
import { modelCache, estimateSceneSize, getModelCacheStats } from '../utils/cache';

// =============================================================================
// TYPES
// =============================================================================

export interface AssetLoadResult {
  /** The loaded GLTF data */
  gltf: GLTF | null;
  /** The 3D scene from the GLTF */
  scene: THREE.Group | null;
  /** Whether the asset is currently loading */
  isLoading: boolean;
  /** Any error that occurred during loading */
  error: Error | null;
  /** Loading progress (0-100) */
  progress: number;
  /** Whether the asset was loaded from cache */
  fromCache: boolean;
  /** Retry loading the asset */
  retry: () => void;
}

export interface UseAssetLoaderOptions {
  /** Called when loading progress updates */
  onProgress?: (percent: number) => void;
  /** Called when loading completes successfully */
  onLoad?: (gltf: GLTF) => void;
  /** Called when loading fails */
  onError?: (error: Error) => void;
  /** Number of retry attempts on failure (default: 2) */
  retryCount?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Skip caching for this asset */
  skipCache?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

export interface AssetManifest {
  category: string;
  version: string;
  description: string;
  assets: AssetManifestEntry[];
}

export interface AssetManifestEntry {
  id: string;
  name: string;
  file: string;
  sizeKB?: number;
  triangles?: number;
  vertices?: number;
  colorTintable?: boolean;
  type?: string;
  status?: string;
  tags?: string[];
}

// =============================================================================
// LOADING STATE TRACKING
// =============================================================================

/** Map of URL -> loading state for deduplication */
const loadingStates = new Map<
  string,
  {
    promise: Promise<GLTF>;
    progress: number;
    listeners: Set<(progress: number) => void>;
  }
>();

/** Track failed loads for retry logic */
const failedLoads = new Map<string, { count: number; lastAttempt: number }>();

// =============================================================================
// CORE LOADING FUNCTION
// =============================================================================

/**
 * Load a GLTF asset with progress tracking and caching
 */
async function loadAsset(
  url: string,
  options: UseAssetLoaderOptions = {}
): Promise<GLTF> {
  const { onProgress, onLoad, onError, retryCount = 2, retryDelay = 1000, skipCache = false, debug = false } = options;

  const log = (...args: unknown[]) => {
    if (debug) console.log('[useAssetLoader]', ...args);
  };

  // Check cache first
  if (!skipCache) {
    const cached = modelCache.get(url) as GLTF | undefined;
    if (cached) {
      log('Cache hit:', url);
      onProgress?.(100);
      onLoad?.(cached);
      return cached;
    }
    log('Cache miss:', url);
  }

  // Check if already loading (deduplication)
  const existingLoad = loadingStates.get(url);
  if (existingLoad) {
    log('Deduplicating load:', url);
    if (onProgress) {
      existingLoad.listeners.add(onProgress);
    }
    return existingLoad.promise;
  }

  // Create new loading promise with retry logic
  const loadWithRetry = async (attempt: number = 0): Promise<GLTF> => {
    try {
      log(`Loading attempt ${attempt + 1}:`, url);

      // Use GLTFLoader directly for progress tracking
      const gltf = await new Promise<GLTF>((resolve, reject) => {
        const loader = new (THREE as any).GLTFLoader();

        // Add DRACOLoader if available
        try {
          const dracoLoader = new (THREE as any).DRACOLoader();
          dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
          loader.setDRACOLoader(dracoLoader);
        } catch {
          // DRACO not available, continue without it
        }

        loader.load(
          url,
          (gltf: GLTF) => resolve(gltf),
          (event: ProgressEvent) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              const state = loadingStates.get(url);
              if (state) {
                state.progress = percent;
                state.listeners.forEach((listener) => listener(percent));
              }
              onProgress?.(percent);
            }
          },
          (error: Error) => reject(error)
        );
      });

      // Cache the result
      if (!skipCache) {
        const sizeBytes = estimateSceneSize(gltf.scene);
        modelCache.set(url, gltf, sizeBytes);
        log('Cached:', url, 'Size:', Math.round(sizeBytes / 1024), 'KB');
      }

      // Clear failed load tracking
      failedLoads.delete(url);

      onProgress?.(100);
      onLoad?.(gltf);
      return gltf;
    } catch (error) {
      const err = error as Error;
      log(`Load failed (attempt ${attempt + 1}):`, url, err.message);

      // Track failed load
      const failed = failedLoads.get(url) || { count: 0, lastAttempt: 0 };
      failed.count++;
      failed.lastAttempt = Date.now();
      failedLoads.set(url, failed);

      // Retry if attempts remain
      if (attempt < retryCount) {
        log(`Retrying in ${retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return loadWithRetry(attempt + 1);
      }

      onError?.(err);
      throw err;
    }
  };

  // Track loading state
  const loadingState = {
    promise: loadWithRetry(),
    progress: 0,
    listeners: new Set<(progress: number) => void>(),
  };

  if (onProgress) {
    loadingState.listeners.add(onProgress);
  }

  loadingStates.set(url, loadingState);

  try {
    const result = await loadingState.promise;
    return result;
  } finally {
    loadingStates.delete(url);
  }
}

// =============================================================================
// REACT HOOKS
// =============================================================================

/**
 * React hook for loading GLTF assets with caching and error handling
 *
 * Uses React Three Fiber's useGLTF under the hood but adds:
 * - Progress tracking
 * - In-memory caching
 * - Retry logic
 * - Error handling
 */
export function useAssetLoader(
  url: string | null,
  options: UseAssetLoaderOptions = {}
): AssetLoadResult {
  const [state, setState] = useState<{
    gltf: GLTF | null;
    isLoading: boolean;
    error: Error | null;
    progress: number;
    fromCache: boolean;
  }>({
    gltf: null,
    isLoading: !!url,
    error: null,
    progress: 0,
    fromCache: false,
  });

  const loadAttemptRef = useRef(0);
  const mountedRef = useRef(true);

  // Load the asset
  const load = useCallback(async () => {
    if (!url) {
      setState({
        gltf: null,
        isLoading: false,
        error: null,
        progress: 0,
        fromCache: false,
      });
      return;
    }

    loadAttemptRef.current++;
    const currentAttempt = loadAttemptRef.current;

    // Check cache synchronously first
    const cached = modelCache.get(url) as GLTF | undefined;
    if (cached && !options.skipCache) {
      if (mountedRef.current && currentAttempt === loadAttemptRef.current) {
        setState({
          gltf: cached,
          isLoading: false,
          error: null,
          progress: 100,
          fromCache: true,
        });
        options.onLoad?.(cached);
      }
      return;
    }

    // Start loading
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 0,
      fromCache: false,
    }));

    try {
      const gltf = await loadAsset(url, {
        ...options,
        onProgress: (percent) => {
          if (mountedRef.current && currentAttempt === loadAttemptRef.current) {
            setState((prev) => ({ ...prev, progress: percent }));
          }
          options.onProgress?.(percent);
        },
      });

      if (mountedRef.current && currentAttempt === loadAttemptRef.current) {
        setState({
          gltf,
          isLoading: false,
          error: null,
          progress: 100,
          fromCache: false,
        });
      }
    } catch (error) {
      if (mountedRef.current && currentAttempt === loadAttemptRef.current) {
        setState({
          gltf: null,
          isLoading: false,
          error: error as Error,
          progress: 0,
          fromCache: false,
        });
      }
    }
  }, [url, options.skipCache]);

  // Load on mount and URL change
  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Retry function
  const retry = useCallback(() => {
    if (url) {
      // Clear from failed loads to allow retry
      failedLoads.delete(url);
      load();
    }
  }, [url, load]);

  return {
    gltf: state.gltf,
    scene: state.gltf?.scene || null,
    isLoading: state.isLoading,
    error: state.error,
    progress: state.progress,
    fromCache: state.fromCache,
    retry,
  };
}

/**
 * Hook version that uses drei's useGLTF with Suspense
 * Simpler API but requires Suspense boundary
 */
export function useAssetLoaderSuspense(url: string): {
  gltf: GLTF;
  scene: THREE.Group;
  nodes: Record<string, THREE.Object3D>;
  materials: Record<string, THREE.Material>;
} {
  const gltf = useGLTF(url) as GLTF & {
    nodes: Record<string, THREE.Object3D>;
    materials: Record<string, THREE.Material>;
  };

  // Cache the loaded model
  if (!modelCache.has(url)) {
    const sizeBytes = estimateSceneSize(gltf.scene);
    modelCache.set(url, gltf, sizeBytes);
  }

  return {
    gltf,
    scene: gltf.scene,
    nodes: gltf.nodes || {},
    materials: gltf.materials || {},
  };
}

// =============================================================================
// PRELOAD FUNCTIONS
// =============================================================================

/**
 * Preload a single asset URL
 */
export function preloadAsset(url: string): void {
  // Use drei's preload
  useGLTF.preload(url);
}

/**
 * Preload multiple asset URLs
 * Good for preloading all critical assets on app init
 */
export function preloadAssets(urls: string[]): void {
  urls.forEach((url) => useGLTF.preload(url));
}

/**
 * Preload assets from a manifest file
 */
export async function preloadFromManifest(
  manifestUrl: string,
  options: { basePath?: string; onProgress?: (loaded: number, total: number) => void } = {}
): Promise<void> {
  const { basePath = '', onProgress } = options;

  try {
    const response = await fetch(manifestUrl);
    const manifest: AssetManifest = await response.json();

    const urls = manifest.assets.map(
      (asset) => `${basePath}/${asset.file}`
    );

    let loaded = 0;
    for (const url of urls) {
      preloadAsset(url);
      loaded++;
      onProgress?.(loaded, urls.length);
    }
  } catch (error) {
    console.error('[useAssetLoader] Failed to preload from manifest:', error);
    throw error;
  }
}

/**
 * Preload all common avatar assets
 * Call this on app init for best UX
 */
export function preloadCommonAssets(): void {
  const commonAssets = [
    // Common head shapes
    '/models/heads/oval.glb',
    '/models/heads/round.glb',
    // Common hair styles
    '/models/hair/short.glb',
    '/models/hair/medium.glb',
    '/models/hair/long.glb',
  ];

  preloadAssets(commonAssets);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Clear asset from cache (and drei's internal cache)
 */
export function clearAsset(url: string): void {
  modelCache.delete(url);
  useGLTF.clear(url);
}

/**
 * Clear all cached assets
 */
export function clearAllAssets(): void {
  const urls = modelCache.keys();
  urls.forEach((url) => {
    useGLTF.clear(url);
  });
  modelCache.clear();
}

/**
 * Get current cache statistics
 */
export function getCacheStats() {
  return getModelCacheStats();
}

/**
 * Check if an asset is cached
 */
export function isAssetCached(url: string): boolean {
  return modelCache.has(url);
}

/**
 * Get loading state for a URL
 */
export function getLoadingState(url: string) {
  const state = loadingStates.get(url);
  if (state) {
    return {
      isLoading: true,
      progress: state.progress,
    };
  }

  const failed = failedLoads.get(url);
  if (failed) {
    return {
      isLoading: false,
      failed: true,
      retryCount: failed.count,
      lastAttempt: failed.lastAttempt,
    };
  }

  return {
    isLoading: false,
    failed: false,
  };
}

export default useAssetLoader;
