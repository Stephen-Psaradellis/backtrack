/**
 * useAvatarSnapshot Hook
 *
 * React hook for managing avatar snapshot URLs with automatic caching.
 * Retrieves cached snapshots or triggers generation when needed.
 *
 * Task 16 of AVATAR_3D_PLAN.md - Snapshot Storage Service
 *
 * @example
 * ```tsx
 * function AvatarImage({ config }: { config: AvatarConfig }) {
 *   const { url, isLoading, error } = useAvatarSnapshot(config);
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <FallbackAvatar config={config} />;
 *
 *   return <Image source={{ uri: url }} />;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AvatarConfig } from '../components/avatar/types';
import {
  hashConfigWithOptions,
  getCachedSnapshotUrlWithMemory,
  getOrCreateSnapshot,
  uploadPreGeneratedSnapshot,
  getMemoryCachedUrl,
  setMemoryCachedUrl,
  type SnapshotOptions,
  type SnapshotGenerator,
  type SnapshotResult,
} from '../lib/avatar/snapshotService';

// =============================================================================
// TYPES
// =============================================================================

export interface UseAvatarSnapshotOptions extends SnapshotOptions {
  /**
   * Skip fetching and return null.
   * Useful for conditional rendering.
   */
  skip?: boolean;

  /**
   * Custom snapshot generator function.
   * If not provided, the hook will only check for cached snapshots.
   * When provided, will generate new snapshots for uncached configs.
   */
  generator?: SnapshotGenerator;

  /**
   * Whether to automatically generate snapshots if not cached.
   * Only works if generator is provided.
   * @default true
   */
  autoGenerate?: boolean;

  /**
   * Callback when snapshot URL is successfully retrieved or generated.
   */
  onSuccess?: (result: SnapshotResult) => void;

  /**
   * Callback when an error occurs.
   */
  onError?: (error: Error) => void;
}

export interface UseAvatarSnapshotResult {
  /** The snapshot URL, or null if not available */
  url: string | null;

  /** Whether the snapshot is being fetched or generated */
  isLoading: boolean;

  /** Whether the snapshot is being generated (not just cache lookup) */
  isGenerating: boolean;

  /** Error message if something went wrong */
  error: string | null;

  /** The config hash (for debugging/caching) */
  hash: string | null;

  /** Whether the URL was served from cache */
  fromCache: boolean;

  /** Manually trigger snapshot generation */
  generate: () => Promise<SnapshotResult | null>;

  /** Clear the current error state */
  clearError: () => void;

  /** Force refresh the snapshot (re-fetch from storage) */
  refresh: () => Promise<void>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useAvatarSnapshot(
  config: AvatarConfig | null | undefined,
  options: UseAvatarSnapshotOptions = {}
): UseAvatarSnapshotResult {
  const {
    skip = false,
    generator,
    autoGenerate = true,
    onSuccess,
    onError,
    ...snapshotOptions
  } = options;

  // State
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  // Track if the component is mounted
  const mountedRef = useRef(true);

  // Track the current config hash to avoid stale updates
  const currentHashRef = useRef<string | null>(null);

  // Compute hash when config changes
  useEffect(() => {
    if (config && !skip) {
      const newHash = hashConfigWithOptions(config, snapshotOptions);
      setHash(newHash);
      currentHashRef.current = newHash;
    } else {
      setHash(null);
      currentHashRef.current = null;
    }
  }, [config, skip, snapshotOptions.width, snapshotOptions.height, snapshotOptions.format, snapshotOptions.preset]);

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Manual generation function
  const generate = useCallback(async (): Promise<SnapshotResult | null> => {
    if (!config || !generator) {
      return null;
    }

    const genHash = hashConfigWithOptions(config, snapshotOptions);
    setIsGenerating(true);
    setError(null);

    try {
      const result = await getOrCreateSnapshot(config, generator, snapshotOptions);

      if (mountedRef.current && currentHashRef.current === genHash) {
        setUrl(result.url);
        setFromCache(result.cached);
        onSuccess?.(result);
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate snapshot';

      if (mountedRef.current && currentHashRef.current === genHash) {
        setError(message);
        onError?.(err instanceof Error ? err : new Error(message));
      }

      return null;
    } finally {
      if (mountedRef.current) {
        setIsGenerating(false);
      }
    }
  }, [config, generator, snapshotOptions, onSuccess, onError]);

  // Refresh function
  const refresh = useCallback(async () => {
    if (!config || skip) return;

    const refreshHash = hashConfigWithOptions(config, snapshotOptions);
    setIsLoading(true);
    setError(null);

    try {
      // Try to get cached URL first
      const cachedUrl = await getCachedSnapshotUrlWithMemory(config, snapshotOptions);

      if (mountedRef.current && currentHashRef.current === refreshHash) {
        if (cachedUrl) {
          setUrl(cachedUrl);
          setFromCache(true);
          onSuccess?.({
            url: cachedUrl,
            hash: refreshHash,
            cached: true,
          });
        } else if (generator && autoGenerate) {
          // No cached URL, generate if we have a generator
          await generate();
        } else {
          // No cache, no generator - set URL to null
          setUrl(null);
          setFromCache(false);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch snapshot';

      if (mountedRef.current && currentHashRef.current === refreshHash) {
        setError(message);
        onError?.(err instanceof Error ? err : new Error(message));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [config, skip, snapshotOptions, generator, autoGenerate, generate, onSuccess, onError]);

  // Main effect: fetch/generate snapshot when config changes
  useEffect(() => {
    if (skip || !config) {
      setUrl(null);
      setIsLoading(false);
      setIsGenerating(false);
      setError(null);
      setFromCache(false);
      return;
    }

    const effectHash = hashConfigWithOptions(config, snapshotOptions);

    // Check memory cache first (synchronous)
    const memoryCached = getMemoryCachedUrl(effectHash);
    if (memoryCached) {
      setUrl(memoryCached);
      setFromCache(true);
      setIsLoading(false);
      return;
    }

    // Start async fetch
    let isCancelled = false;

    const fetchSnapshot = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Try to get cached URL from storage
        const cachedUrl = await getCachedSnapshotUrlWithMemory(config, snapshotOptions);

        if (isCancelled) return;

        if (cachedUrl) {
          setUrl(cachedUrl);
          setFromCache(true);
          onSuccess?.({
            url: cachedUrl,
            hash: effectHash,
            cached: true,
          });
        } else if (generator && autoGenerate) {
          // No cached URL, generate if we have a generator
          setIsGenerating(true);
          const result = await getOrCreateSnapshot(config, generator, snapshotOptions);

          if (!isCancelled) {
            setUrl(result.url);
            setFromCache(result.cached);
            onSuccess?.(result);
          }
        } else {
          // No cache, no generator - remain at null
          setUrl(null);
          setFromCache(false);
        }
      } catch (err) {
        if (isCancelled) return;

        const message = err instanceof Error ? err.message : 'Failed to load snapshot';
        setError(message);
        onError?.(err instanceof Error ? err : new Error(message));
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsGenerating(false);
        }
      }
    };

    fetchSnapshot();

    return () => {
      isCancelled = true;
    };
  }, [config, skip, snapshotOptions.width, snapshotOptions.height, snapshotOptions.format, snapshotOptions.preset, generator, autoGenerate]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    url,
    isLoading,
    isGenerating,
    error,
    hash,
    fromCache,
    generate,
    clearError,
    refresh,
  };
}

// =============================================================================
// ADDITIONAL HOOKS
// =============================================================================

/**
 * Hook to prefetch a snapshot URL into memory cache.
 * Useful for preloading avatars that will be displayed soon.
 *
 * @example
 * ```tsx
 * function PostList({ posts }: { posts: Post[] }) {
 *   // Prefetch all avatar snapshots
 *   usePrefetchSnapshots(posts.map(p => p.targetAvatar));
 *
 *   return posts.map(post => <PostCard key={post.id} post={post} />);
 * }
 * ```
 */
export function usePrefetchSnapshots(
  configs: (AvatarConfig | null | undefined)[],
  options: SnapshotOptions = {}
): void {
  useEffect(() => {
    const validConfigs = configs.filter((c): c is AvatarConfig => c != null);

    if (validConfigs.length === 0) return;

    // Prefetch all in parallel
    const prefetchAll = async () => {
      await Promise.allSettled(
        validConfigs.map(async (config) => {
          const hash = hashConfigWithOptions(config, options);

          // Skip if already in memory cache
          if (getMemoryCachedUrl(hash)) return;

          // Try to get from storage and add to memory cache
          const url = await getCachedSnapshotUrlWithMemory(config, options);
          if (url) {
            setMemoryCachedUrl(hash, url);
          }
        })
      );
    };

    prefetchAll();
  }, [configs.length]); // Only re-run when array length changes
}

/**
 * Hook for uploading a pre-generated snapshot.
 * Useful when snapshot generation happens externally (e.g., in a WebView).
 *
 * @example
 * ```tsx
 * function AvatarCreator() {
 *   const { upload, isUploading, error } = useUploadSnapshot();
 *
 *   const handleSnapshot = async (base64: string) => {
 *     const result = await upload(currentConfig, base64);
 *     if (result) {
 *       console.log('Snapshot URL:', result.url);
 *     }
 *   };
 * }
 * ```
 */
export function useUploadSnapshot() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (
      config: AvatarConfig,
      base64Data: string,
      options: SnapshotOptions = {}
    ): Promise<SnapshotResult | null> => {
      setIsUploading(true);
      setError(null);

      try {
        const result = await uploadPreGeneratedSnapshot(config, base64Data, options);

        // Update memory cache with new URL
        setMemoryCachedUrl(result.hash, result.url);

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload snapshot';
        setError(message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    upload,
    isUploading,
    error,
    clearError,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useAvatarSnapshot;
