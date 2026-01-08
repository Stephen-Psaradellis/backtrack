/**
 * Avatar Loader System
 *
 * Task 4.1: Implement Avatar Preloading
 *
 * Provides avatar preloading and caching for the new complete avatar preset system.
 *
 * Features:
 * - Preload local avatars on app start
 * - Lazy-load CDN avatars on demand
 * - Track loading state per avatar
 * - Memory cache for avatar metadata
 * - Integration with WebView for actual 3D preloading
 *
 * Architecture:
 * - React Native side: Tracks loading states, manages preloading queue
 * - WebGL side: Actual 3D model loading via useGLTF.preload
 * - Communication: Via bridge messages (PRELOAD_AVATAR, AVATAR_LOADED, etc.)
 *
 * @example
 * ```tsx
 * // Initialize preloading on app start
 * await avatarLoader.preloadLocalAvatars();
 *
 * // Check if avatar is ready
 * const isReady = avatarLoader.isAvatarLoaded('avatar_asian_m');
 *
 * // Get loading state
 * const state = avatarLoader.getLoadingState('avatar_asian_m');
 *
 * // Use hook in components
 * const { isLoading, isLoaded, error, progress } = useAvatarLoadingState('avatar_asian_m');
 * ```
 */

import { useEffect, useState, useCallback } from 'react';
import {
  LOCAL_AVATAR_PRESETS,
  AVATAR_CDN,
  getAvatarPreset,
  getAvatarUrl,
} from './defaults';
import type {
  AvatarPreset,
  AvatarStyle,
  AvatarEthnicity,
  AvatarGender,
  AvatarOutfit,
} from '../../components/avatar/types';
import { ETHNICITY_TO_STYLE } from '../../components/avatar/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Loading state for an individual avatar
 */
export type AvatarLoadingStatus =
  | 'idle'      // Not started
  | 'pending'   // Queued for loading
  | 'loading'   // Currently loading
  | 'loaded'    // Successfully loaded
  | 'error';    // Failed to load

/**
 * Loading state entry for an avatar
 */
export interface AvatarLoadingState {
  /** Avatar ID */
  avatarId: string;
  /** Current loading status */
  status: AvatarLoadingStatus;
  /** Loading progress (0-100) */
  progress: number;
  /** Error message if status is 'error' */
  error?: string;
  /** Timestamp when loading started */
  startedAt?: number;
  /** Timestamp when loading completed */
  completedAt?: number;
  /** Whether this is a local or CDN avatar */
  isLocal: boolean;
  /** Avatar metadata if loaded */
  preset?: AvatarPreset;
}

/**
 * Preload options
 */
export interface PreloadOptions {
  /** Priority order (higher = load first) */
  priority?: number;
  /** Callback on progress */
  onProgress?: (avatarId: string, progress: number) => void;
  /** Callback on load complete */
  onLoad?: (avatarId: string) => void;
  /** Callback on error */
  onError?: (avatarId: string, error: string) => void;
}

/**
 * Batch preload result
 */
export interface BatchPreloadResult {
  /** Total avatars requested */
  total: number;
  /** Successfully loaded */
  loaded: number;
  /** Failed to load */
  failed: number;
  /** Avatar IDs that failed */
  failedIds: string[];
  /** Time taken in ms */
  duration: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total avatars tracked */
  total: number;
  /** Avatars loaded successfully */
  loaded: number;
  /** Avatars currently loading */
  loading: number;
  /** Avatars that failed to load */
  errored: number;
  /** Local avatars count */
  local: number;
  /** CDN avatars count */
  cdn: number;
}

// =============================================================================
// AVATAR LOADING STATE STORE
// =============================================================================

/**
 * In-memory store for avatar loading states.
 * Uses a Map for O(1) lookups.
 */
class AvatarLoadingStore {
  private states: Map<string, AvatarLoadingState> = new Map();
  private listeners: Set<() => void> = new Set();
  private preloadQueue: Array<{ avatarId: string; priority: number }> = [];
  private isProcessingQueue = false;

  /**
   * Get loading state for an avatar
   */
  getState(avatarId: string): AvatarLoadingState | undefined {
    return this.states.get(avatarId);
  }

  /**
   * Get all loading states
   */
  getAllStates(): Map<string, AvatarLoadingState> {
    return new Map(this.states);
  }

  /**
   * Set loading state for an avatar
   */
  setState(avatarId: string, state: Partial<AvatarLoadingState>): void {
    const current = this.states.get(avatarId);
    const preset = getAvatarPreset(avatarId);

    const newState: AvatarLoadingState = {
      avatarId,
      status: 'idle',
      progress: 0,
      isLocal: preset?.isLocal ?? false,
      preset,
      ...current,
      ...state,
    };

    this.states.set(avatarId, newState);
    this.notifyListeners();
  }

  /**
   * Mark avatar as loading
   */
  setLoading(avatarId: string, progress = 0): void {
    this.setState(avatarId, {
      status: 'loading',
      progress,
      startedAt: Date.now(),
      error: undefined,
    });
  }

  /**
   * Mark avatar as loaded
   */
  setLoaded(avatarId: string): void {
    this.setState(avatarId, {
      status: 'loaded',
      progress: 100,
      completedAt: Date.now(),
      error: undefined,
    });
  }

  /**
   * Mark avatar as errored
   */
  setError(avatarId: string, error: string): void {
    this.setState(avatarId, {
      status: 'error',
      error,
      completedAt: Date.now(),
    });
  }

  /**
   * Update loading progress
   */
  setProgress(avatarId: string, progress: number): void {
    const current = this.states.get(avatarId);
    if (current && current.status === 'loading') {
      this.setState(avatarId, { progress });
    }
  }

  /**
   * Check if avatar is loaded
   */
  isLoaded(avatarId: string): boolean {
    const state = this.states.get(avatarId);
    return state?.status === 'loaded';
  }

  /**
   * Check if avatar is loading
   */
  isLoading(avatarId: string): boolean {
    const state = this.states.get(avatarId);
    return state?.status === 'loading' || state?.status === 'pending';
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let loaded = 0;
    let loading = 0;
    let errored = 0;
    let local = 0;
    let cdn = 0;

    this.states.forEach((state) => {
      if (state.status === 'loaded') loaded++;
      if (state.status === 'loading' || state.status === 'pending') loading++;
      if (state.status === 'error') errored++;
      if (state.isLocal) local++;
      else cdn++;
    });

    return {
      total: this.states.size,
      loaded,
      loading,
      errored,
      local,
      cdn,
    };
  }

  /**
   * Clear all states
   */
  clear(): void {
    this.states.clear();
    this.preloadQueue = [];
    this.notifyListeners();
  }

  /**
   * Clear errored states (for retry)
   */
  clearErrors(): void {
    this.states.forEach((state, avatarId) => {
      if (state.status === 'error') {
        this.setState(avatarId, { status: 'idle', error: undefined });
      }
    });
  }

  /**
   * Add to preload queue
   */
  addToQueue(avatarId: string, priority = 0): void {
    // Don't add if already loaded or loading
    const state = this.states.get(avatarId);
    if (state?.status === 'loaded' || state?.status === 'loading') {
      return;
    }

    // Check if already in queue
    const existingIndex = this.preloadQueue.findIndex((item) => item.avatarId === avatarId);
    if (existingIndex >= 0) {
      // Update priority if higher
      if (priority > this.preloadQueue[existingIndex].priority) {
        this.preloadQueue[existingIndex].priority = priority;
        this.sortQueue();
      }
      return;
    }

    // Add to queue
    this.preloadQueue.push({ avatarId, priority });
    this.setState(avatarId, { status: 'pending' });
    this.sortQueue();
  }

  /**
   * Sort queue by priority (descending)
   */
  private sortQueue(): void {
    this.preloadQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get next item from queue
   */
  getNextFromQueue(): string | undefined {
    return this.preloadQueue.shift()?.avatarId;
  }

  /**
   * Check if queue is empty
   */
  isQueueEmpty(): boolean {
    return this.preloadQueue.length === 0;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.preloadQueue.length;
  }

  /**
   * Set queue processing state
   */
  setProcessingQueue(processing: boolean): void {
    this.isProcessingQueue = processing;
  }

  /**
   * Check if queue is being processed
   */
  isQueueProcessing(): boolean {
    return this.isProcessingQueue;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

// Singleton instance
const store = new AvatarLoadingStore();

// =============================================================================
// AVATAR LOADER API
// =============================================================================

/**
 * Initialize loading state for all local avatar presets.
 * Call this on app start.
 */
function initializeLocalAvatars(): void {
  LOCAL_AVATAR_PRESETS.forEach((preset) => {
    store.setState(preset.id, {
      status: 'idle',
      progress: 0,
      isLocal: true,
      preset,
    });
  });
}

/**
 * Preload a single avatar.
 * This queues the avatar for loading in the WebGL bundle.
 */
async function preloadAvatar(
  avatarId: string,
  options: PreloadOptions = {}
): Promise<boolean> {
  const { priority = 0, onProgress, onLoad, onError } = options;

  // Check if already loaded
  if (store.isLoaded(avatarId)) {
    onLoad?.(avatarId);
    return true;
  }

  // Check if already loading
  if (store.isLoading(avatarId)) {
    // Wait for existing load to complete
    return new Promise((resolve) => {
      const unsubscribe = store.subscribe(() => {
        const state = store.getState(avatarId);
        if (state?.status === 'loaded') {
          unsubscribe();
          onLoad?.(avatarId);
          resolve(true);
        } else if (state?.status === 'error') {
          unsubscribe();
          onError?.(avatarId, state.error || 'Unknown error');
          resolve(false);
        }
      });
    });
  }

  // Add to queue
  store.addToQueue(avatarId, priority);

  // Return promise that resolves when loaded
  return new Promise((resolve) => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState(avatarId);
      if (state?.status === 'loaded') {
        unsubscribe();
        onLoad?.(avatarId);
        resolve(true);
      } else if (state?.status === 'error') {
        unsubscribe();
        onError?.(avatarId, state.error || 'Unknown error');
        resolve(false);
      } else if (state?.status === 'loading') {
        onProgress?.(avatarId, state.progress);
      }
    });
  });
}

/**
 * Preload multiple avatars in batch.
 */
async function preloadAvatars(
  avatarIds: string[],
  options: PreloadOptions = {}
): Promise<BatchPreloadResult> {
  const startTime = Date.now();
  const results = await Promise.allSettled(
    avatarIds.map((id) => preloadAvatar(id, options))
  );

  const loaded = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
  const failed = avatarIds.length - loaded;
  const failedIds = avatarIds.filter((id) => {
    const state = store.getState(id);
    return state?.status === 'error';
  });

  return {
    total: avatarIds.length,
    loaded,
    failed,
    failedIds,
    duration: Date.now() - startTime,
  };
}

/**
 * Preload all local avatars.
 * Call this on app initialization for optimal UX.
 */
async function preloadLocalAvatars(options: PreloadOptions = {}): Promise<BatchPreloadResult> {
  const localIds = LOCAL_AVATAR_PRESETS.map((p) => p.id);
  return preloadAvatars(localIds, { ...options, priority: 10 }); // High priority for local
}

/**
 * Fetch and preload CDN avatar manifest.
 * Call this to load additional avatars from CDN.
 */
async function fetchAndPreloadCDNAvatars(options: PreloadOptions = {}): Promise<AvatarPreset[]> {
  try {
    const response = await fetch(AVATAR_CDN.manifestUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch CDN manifest: ${response.status}`);
    }

    const manifest = await response.json();
    const avatars: AvatarPreset[] = [];

    if (Array.isArray(manifest.avatars)) {
      manifest.avatars.forEach((item: Record<string, unknown>) => {
        const ethnicity = (item.ethnicity as AvatarEthnicity) || 'White';
        const style = ETHNICITY_TO_STYLE[ethnicity] || 'Style G';
        const preset: AvatarPreset = {
          id: (item.id as string) || (item.file as string)?.replace('.glb', '') || '',
          name: (item.name as string) || (item.id as string) || '',
          file: (item.file as string) || `${item.id}.glb`,
          style,
          ethnicity,
          gender: (item.gender as AvatarGender) || 'M',
          outfit: (item.outfit as AvatarOutfit) || 'Casual',
          isLocal: false,
          sizeKB: (item.sizeKB as number) || 2000,
          license: 'CC0',
          source: 'VALID Project CDN',
          tags: (item.tags as string[]) || [],
        };

        avatars.push(preset);

        // Initialize loading state for each CDN avatar
        store.setState(preset.id, {
          status: 'idle',
          progress: 0,
          isLocal: false,
          preset,
        });
      });
    }

    return avatars;
  } catch (error) {
    console.warn('[AvatarLoader] Failed to fetch CDN manifest:', error);
    return [];
  }
}

/**
 * Process the preload queue.
 * This should be called when the WebGL view is ready.
 */
async function processPreloadQueue(
  loadFn: (avatarId: string) => Promise<boolean>
): Promise<void> {
  if (store.isQueueProcessing()) {
    return;
  }

  store.setProcessingQueue(true);

  while (!store.isQueueEmpty()) {
    const avatarId = store.getNextFromQueue();
    if (!avatarId) break;

    // Skip if already loaded
    if (store.isLoaded(avatarId)) {
      continue;
    }

    store.setLoading(avatarId, 0);

    try {
      const success = await loadFn(avatarId);
      if (success) {
        store.setLoaded(avatarId);
      } else {
        store.setError(avatarId, 'Load function returned false');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      store.setError(avatarId, message);
    }
  }

  store.setProcessingQueue(false);
}

/**
 * Mark avatar as loading (for when starting to load).
 * Call this when sending SET_AVATAR or INIT_AVATAR message to WebView.
 */
function markAvatarLoading(avatarId: string): void {
  store.setLoading(avatarId, 0);
}

/**
 * Simulate loading completion (for when WebGL reports load complete).
 * Call this when receiving AVATAR_LOADED message from WebView.
 */
function markAvatarLoaded(avatarId: string): void {
  store.setLoaded(avatarId);
}

/**
 * Update avatar loading progress.
 * Call this when receiving AVATAR_LOADING_PROGRESS message from WebView.
 */
function updateAvatarProgress(avatarId: string, progress: number): void {
  store.setProgress(avatarId, progress);
}

/**
 * Mark avatar as errored.
 * Call this when receiving AVATAR_LOAD_ERROR message from WebView.
 */
function markAvatarError(avatarId: string, error: string): void {
  store.setError(avatarId, error);
}

/**
 * Get loading state for an avatar
 */
function getLoadingState(avatarId: string): AvatarLoadingState | undefined {
  return store.getState(avatarId);
}

/**
 * Check if avatar is loaded
 */
function isAvatarLoaded(avatarId: string): boolean {
  return store.isLoaded(avatarId);
}

/**
 * Check if avatar is loading
 */
function isAvatarLoading(avatarId: string): boolean {
  return store.isLoading(avatarId);
}

/**
 * Get cache statistics
 */
function getCacheStats(): CacheStats {
  return store.getStats();
}

/**
 * Clear all cached states
 */
function clearCache(): void {
  store.clear();
}

/**
 * Clear errored states to allow retry
 */
function clearErrors(): void {
  store.clearErrors();
}

/**
 * Subscribe to store changes
 */
function subscribe(listener: () => void): () => void {
  return store.subscribe(listener);
}

// =============================================================================
// REACT HOOKS
// =============================================================================

/**
 * Hook to get loading state for a specific avatar.
 * Automatically re-renders when state changes.
 *
 * @example
 * ```tsx
 * const { isLoading, isLoaded, progress, error } = useAvatarLoadingState('avatar_asian_m');
 *
 * if (isLoading) {
 *   return <LoadingSpinner progress={progress} />;
 * }
 * ```
 */
export function useAvatarLoadingState(avatarId: string): {
  state: AvatarLoadingState | undefined;
  isLoading: boolean;
  isLoaded: boolean;
  isPending: boolean;
  progress: number;
  error: string | undefined;
} {
  const [state, setState] = useState<AvatarLoadingState | undefined>(
    store.getState(avatarId)
  );

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = store.subscribe(() => {
      const newState = store.getState(avatarId);
      setState(newState);
    });

    // Get initial state
    setState(store.getState(avatarId));

    return unsubscribe;
  }, [avatarId]);

  return {
    state,
    isLoading: state?.status === 'loading',
    isLoaded: state?.status === 'loaded',
    isPending: state?.status === 'pending',
    progress: state?.progress ?? 0,
    error: state?.error,
  };
}

/**
 * Hook to get overall preloading stats.
 * Useful for showing a global loading indicator.
 *
 * @example
 * ```tsx
 * const { isPreloading, progress, stats } = usePreloadingStatus();
 *
 * if (isPreloading) {
 *   return <GlobalLoader progress={progress} />;
 * }
 * ```
 */
export function usePreloadingStatus(): {
  isPreloading: boolean;
  progress: number;
  stats: CacheStats;
} {
  const [stats, setStats] = useState<CacheStats>(store.getStats());

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setStats(store.getStats());
    });

    setStats(store.getStats());
    return unsubscribe;
  }, []);

  const isPreloading = stats.loading > 0;
  const progress = stats.total > 0 ? (stats.loaded / stats.total) * 100 : 0;

  return {
    isPreloading,
    progress,
    stats,
  };
}

/**
 * Hook to preload an avatar on mount.
 * Triggers preloading if avatar isn't already loaded.
 *
 * @example
 * ```tsx
 * const { isLoading, isLoaded, preload } = usePreloadAvatar('avatar_asian_m');
 *
 * // Preloading happens automatically on mount
 * // Or trigger manually:
 * <button onClick={preload}>Retry</button>
 * ```
 */
export function usePreloadAvatar(
  avatarId: string,
  options: PreloadOptions = {}
): {
  isLoading: boolean;
  isLoaded: boolean;
  error: string | undefined;
  progress: number;
  preload: () => void;
} {
  const { isLoading, isLoaded, error, progress } = useAvatarLoadingState(avatarId);

  const preload = useCallback(() => {
    preloadAvatar(avatarId, options);
  }, [avatarId, options]);

  // Preload on mount if not already loaded
  useEffect(() => {
    if (!isLoaded && !isLoading) {
      preload();
    }
  }, [avatarId]); // Only run on avatarId change, not on state changes

  return {
    isLoading,
    isLoaded,
    error,
    progress,
    preload,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Avatar loader singleton with all loading functionality.
 * Use this to interact with the avatar loading system.
 */
export const avatarLoader = {
  // Initialization
  initializeLocalAvatars,

  // Preloading
  preloadAvatar,
  preloadAvatars,
  preloadLocalAvatars,
  fetchAndPreloadCDNAvatars,

  // Queue processing
  processPreloadQueue,

  // State updates (for WebView messages)
  markAvatarLoading,
  markAvatarLoaded,
  updateAvatarProgress,
  markAvatarError,

  // State queries
  getLoadingState,
  isAvatarLoaded,
  isAvatarLoading,
  getCacheStats,

  // Cache management
  clearCache,
  clearErrors,

  // Subscriptions
  subscribe,
} as const;

export default avatarLoader;
