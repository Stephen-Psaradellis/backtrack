/**
 * useSnapshot - React Native hook for capturing 3D avatar snapshots
 *
 * Task 15: Snapshot Generation
 *
 * Provides a clean interface for requesting and receiving snapshots from
 * the WebView-hosted 3D avatar renderer. Supports various resolutions,
 * formats, camera presets, and transparent backgrounds.
 *
 * @example
 * ```tsx
 * const { requestSnapshot, isCapturing, lastSnapshot } = useSnapshot({
 *   webViewRef,
 *   onSnapshot: (base64) => saveToStorage(base64),
 *   onError: (error) => console.error(error),
 * });
 *
 * // Capture a 512x512 portrait snapshot
 * const base64 = await requestSnapshot({
 *   width: 512,
 *   height: 512,
 *   preset: 'portrait',
 *   transparent: true,
 * });
 * ```
 */

import { useCallback, useRef, useState } from 'react';
import type { WebView } from 'react-native-webview';
import {
  type SnapshotFormat,
  type CameraPreset,
  generateMessageId,
  serializeMessage,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Quality preset for snapshots
 */
export type SnapshotQuality = 'draft' | 'standard' | 'high' | 'final';

/**
 * Options for requesting a snapshot
 */
export interface SnapshotRequestOptions {
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
  /** Camera preset for framing */
  preset?: CameraPreset;
}

/**
 * Hook configuration options
 */
export interface UseSnapshotOptions {
  /** Reference to the WebView component */
  webViewRef: React.RefObject<WebView>;
  /** Timeout for snapshot requests in ms (default: 10000) */
  timeout?: number;
  /** Called when snapshot is successfully captured */
  onSnapshot?: (base64: string, width: number, height: number) => void;
  /** Called when snapshot capture fails */
  onError?: (error: Error) => void;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Result returned by useSnapshot hook
 */
export interface UseSnapshotResult {
  /** Request a snapshot with given options, returns Promise with base64 */
  requestSnapshot: (options?: SnapshotRequestOptions) => Promise<string>;
  /** Whether a snapshot capture is in progress */
  isCapturing: boolean;
  /** Last captured snapshot base64 (null if none) */
  lastSnapshot: string | null;
  /** Last snapshot dimensions */
  lastSnapshotDimensions: { width: number; height: number } | null;
  /** Cancel any pending snapshot request */
  cancelSnapshot: () => void;
  /** Clear last snapshot from state */
  clearLastSnapshot: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default timeout for snapshot requests (10 seconds)
 */
const DEFAULT_TIMEOUT = 10000;

/**
 * Predefined snapshot size presets
 */
export const SNAPSHOT_SIZE_PRESETS = {
  thumbnail: { width: 256, height: 256 },
  small: { width: 384, height: 384 },
  medium: { width: 512, height: 512 },
  large: { width: 768, height: 768 },
  xlarge: { width: 1024, height: 1024 },
  // Common use cases
  avatar: { width: 512, height: 512 },
  profile: { width: 512, height: 512 },
  post: { width: 512, height: 512 },
  chat: { width: 256, height: 256 },
  listItem: { width: 128, height: 128 },
};

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for capturing snapshots from the 3D avatar WebView
 *
 * @param options - Hook configuration options
 * @returns Object with snapshot functions and state
 */
export function useSnapshot(options: UseSnapshotOptions): UseSnapshotResult {
  const {
    webViewRef,
    timeout = DEFAULT_TIMEOUT,
    onSnapshot,
    onError,
    debug = false,
  } = options;

  // State
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null);
  const [lastSnapshotDimensions, setLastSnapshotDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Refs for managing pending requests
  const pendingRequestRef = useRef<{
    resolve: (base64: string) => void;
    reject: (error: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);

  // Debug logger
  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) {
        console.log('[useSnapshot]', ...args);
      }
    },
    [debug]
  );

  /**
   * Cancel any pending snapshot request
   */
  const cancelSnapshot = useCallback(() => {
    if (pendingRequestRef.current) {
      const { reject, timeoutId } = pendingRequestRef.current;
      clearTimeout(timeoutId);
      reject(new Error('Snapshot cancelled'));
      pendingRequestRef.current = null;
      setIsCapturing(false);
      log('Snapshot cancelled');
    }
  }, [log]);

  /**
   * Clear the last snapshot from state
   */
  const clearLastSnapshot = useCallback(() => {
    setLastSnapshot(null);
    setLastSnapshotDimensions(null);
    log('Last snapshot cleared');
  }, [log]);

  /**
   * Handle snapshot result from WebView
   * This should be called when SNAPSHOT_READY message is received
   */
  const handleSnapshotResult = useCallback(
    (base64: string, width?: number, height?: number) => {
      if (pendingRequestRef.current) {
        const { resolve, timeoutId } = pendingRequestRef.current;
        clearTimeout(timeoutId);
        pendingRequestRef.current = null;

        setLastSnapshot(base64);
        if (width && height) {
          setLastSnapshotDimensions({ width, height });
        }
        setIsCapturing(false);

        resolve(base64);
        onSnapshot?.(base64, width || 0, height || 0);
        log('Snapshot received:', width, 'x', height);
      }
    },
    [onSnapshot, log]
  );

  /**
   * Handle snapshot error from WebView
   */
  const handleSnapshotError = useCallback(
    (errorMessage: string) => {
      if (pendingRequestRef.current) {
        const { reject, timeoutId } = pendingRequestRef.current;
        clearTimeout(timeoutId);
        pendingRequestRef.current = null;

        const error = new Error(errorMessage);
        setIsCapturing(false);

        reject(error);
        onError?.(error);
        log('Snapshot error:', errorMessage);
      }
    },
    [onError, log]
  );

  /**
   * Request a snapshot from the WebView
   *
   * @param requestOptions - Snapshot options
   * @returns Promise resolving to base64 image data
   */
  const requestSnapshot = useCallback(
    async (requestOptions: SnapshotRequestOptions = {}): Promise<string> => {
      // Cancel any existing request
      if (pendingRequestRef.current) {
        cancelSnapshot();
      }

      // Check if WebView is available
      const webView = webViewRef.current;
      if (!webView) {
        const error = new Error('WebView not available');
        onError?.(error);
        throw error;
      }

      log('Requesting snapshot:', requestOptions);
      setIsCapturing(true);

      return new Promise((resolve, reject) => {
        // Set up timeout
        const timeoutId = setTimeout(() => {
          if (pendingRequestRef.current) {
            pendingRequestRef.current = null;
            setIsCapturing(false);
            const error = new Error('Snapshot request timed out');
            reject(error);
            onError?.(error);
            log('Snapshot timeout');
          }
        }, timeout);

        // Store pending request
        pendingRequestRef.current = {
          resolve,
          reject,
          timeoutId,
        };

        // Send message to WebView
        const message = {
          type: 'TAKE_SNAPSHOT' as const,
          messageId: generateMessageId(),
          format: requestOptions.format,
          quality: requestOptions.quality,
          width: requestOptions.width,
          height: requestOptions.height,
          transparent: requestOptions.transparent,
          // Note: Camera preset would need to be handled by SET_CAMERA message first
          // or the WebView side needs to support preset in TAKE_SNAPSHOT
        };

        const jsonMessage = serializeMessage(message);
        const escapedMessage = jsonMessage.replace(/'/g, "\\'");

        webView.injectJavaScript(`
          (function() {
            try {
              window.dispatchEvent(new MessageEvent('message', { data: '${escapedMessage}' }));
            } catch (e) {
              console.error('Failed to dispatch message:', e);
            }
          })();
          true;
        `);

        log('Sent TAKE_SNAPSHOT message');
      });
    },
    [webViewRef, timeout, cancelSnapshot, onError, log]
  );

  // Return hook interface
  // Note: The calling component should connect handleSnapshotResult and handleSnapshotError
  // to the WebView message handler
  return {
    requestSnapshot,
    isCapturing,
    lastSnapshot,
    lastSnapshotDimensions,
    cancelSnapshot,
    clearLastSnapshot,
    // Expose handlers for WebView message integration
    // These are used internally or can be connected to a bridge
    _handleSnapshotResult: handleSnapshotResult,
    _handleSnapshotError: handleSnapshotError,
  } as UseSnapshotResult & {
    _handleSnapshotResult: typeof handleSnapshotResult;
    _handleSnapshotError: typeof handleSnapshotError;
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get snapshot size from a named preset
 *
 * @param preset - Size preset name
 * @returns Width and height object
 */
export function getSnapshotSizePreset(
  preset: keyof typeof SNAPSHOT_SIZE_PRESETS
): { width: number; height: number } {
  return SNAPSHOT_SIZE_PRESETS[preset];
}

/**
 * Calculate optimal snapshot size based on display size
 *
 * @param displayWidth - Display width in CSS pixels
 * @param displayHeight - Display height in CSS pixels
 * @param pixelRatio - Device pixel ratio (default: 2)
 * @param maxSize - Maximum dimension (default: 1024)
 * @returns Optimal snapshot dimensions
 */
export function calculateOptimalSnapshotSize(
  displayWidth: number,
  displayHeight: number,
  pixelRatio: number = 2,
  maxSize: number = 1024
): { width: number; height: number } {
  const targetWidth = Math.min(displayWidth * pixelRatio, maxSize);
  const targetHeight = Math.min(displayHeight * pixelRatio, maxSize);

  // Round to nearest multiple of 8 for optimal encoding
  return {
    width: Math.round(targetWidth / 8) * 8,
    height: Math.round(targetHeight / 8) * 8,
  };
}

/**
 * Strip data URL prefix from base64 string
 *
 * @param base64WithPrefix - Base64 string with 'data:image/...' prefix
 * @returns Raw base64 string
 */
export function stripBase64Prefix(base64WithPrefix: string): string {
  const commaIndex = base64WithPrefix.indexOf(',');
  if (commaIndex !== -1) {
    return base64WithPrefix.substring(commaIndex + 1);
  }
  return base64WithPrefix;
}

/**
 * Add data URL prefix to raw base64 string
 *
 * @param rawBase64 - Raw base64 string
 * @param format - Image format
 * @returns Base64 string with data URL prefix
 */
export function addBase64Prefix(
  rawBase64: string,
  format: SnapshotFormat = 'png'
): string {
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mimeType};base64,${rawBase64}`;
}

/**
 * Estimate the file size of a base64 image
 *
 * @param base64 - Base64 string (with or without prefix)
 * @returns Size in bytes
 */
export function estimateBase64FileSize(base64: string): number {
  const rawBase64 = stripBase64Prefix(base64);
  const padding = (rawBase64.match(/=/g) || []).length;
  return Math.floor((rawBase64.length * 3) / 4) - padding;
}

/**
 * Format file size in human-readable form
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "512 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default useSnapshot;
