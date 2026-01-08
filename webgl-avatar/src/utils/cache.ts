/**
 * LRU Cache for 3D model data
 *
 * Task 8: Asset Loader System
 *
 * Provides an in-memory cache for loaded GLTF models to avoid
 * redundant network requests and improve performance.
 *
 * Features:
 * - LRU (Least Recently Used) eviction policy
 * - Configurable max size
 * - Type-safe entries
 * - Memory usage tracking
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CacheEntry<T> {
  /** The cached data */
  data: T;
  /** When the entry was last accessed */
  lastAccessed: number;
  /** When the entry was created */
  createdAt: number;
  /** Approximate size in bytes (for memory tracking) */
  sizeBytes?: number;
}

export interface CacheStats {
  /** Number of entries in the cache */
  size: number;
  /** Maximum allowed entries */
  maxSize: number;
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Hit rate (0-1) */
  hitRate: number;
  /** Approximate total memory usage in bytes */
  memoryBytes: number;
}

// =============================================================================
// LRU CACHE IMPLEMENTATION
// =============================================================================

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  /**
   * Create a new LRU cache
   * @param maxSize Maximum number of entries (default: 50)
   */
  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  /**
   * Get an item from the cache
   * Returns undefined if not found
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (entry) {
      // Update last accessed time (LRU tracking)
      entry.lastAccessed = Date.now();
      this.hits++;
      return entry.data;
    }

    this.misses++;
    return undefined;
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Set an item in the cache
   * Will evict least recently used items if at capacity
   */
  set(key: string, data: T, sizeBytes?: number): void {
    // If already exists, update it
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.data = data;
      entry.lastAccessed = Date.now();
      entry.sizeBytes = sizeBytes;
      return;
    }

    // Evict if at capacity
    while (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Add new entry
    this.cache.set(key, {
      data,
      lastAccessed: Date.now(),
      createdAt: Date.now(),
      sizeBytes,
    });
  }

  /**
   * Delete an item from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    let memoryBytes = 0;

    for (const entry of this.cache.values()) {
      if (entry.sizeBytes) {
        memoryBytes += entry.sizeBytes;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      memoryBytes,
    };
  }

  /**
   * Evict the least recently used item
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

// =============================================================================
// GLOBAL MODEL CACHE INSTANCE
// =============================================================================

/**
 * Global cache instance for GLTF models
 * Configured with max 50 models as per Task 8 requirements
 */
export const modelCache = new LRUCache<unknown>(50);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Estimate the size of a GLTF scene in bytes
 * This is a rough estimate based on geometry and textures
 */
export function estimateSceneSize(scene: THREE.Object3D): number {
  let sizeBytes = 0;

  scene.traverse((child: any) => {
    // Estimate geometry size
    if (child.geometry) {
      const geometry = child.geometry;
      if (geometry.attributes) {
        for (const attr of Object.values(geometry.attributes) as any[]) {
          if (attr.array) {
            sizeBytes += attr.array.byteLength || 0;
          }
        }
      }
      if (geometry.index?.array) {
        sizeBytes += geometry.index.array.byteLength || 0;
      }
    }

    // Estimate texture size
    if (child.material) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      for (const mat of materials) {
        if (mat.map?.image) {
          const img = mat.map.image;
          // Rough estimate: width * height * 4 bytes per pixel
          sizeBytes += (img.width || 0) * (img.height || 0) * 4;
        }
      }
    }
  });

  return sizeBytes;
}

// Import Three.js types
import * as THREE from 'three';

/**
 * Clear the global model cache
 */
export function clearModelCache(): void {
  modelCache.clear();
}

/**
 * Get stats for the global model cache
 */
export function getModelCacheStats(): CacheStats {
  return modelCache.getStats();
}

export default modelCache;
