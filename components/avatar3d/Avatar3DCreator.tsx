/**
 * Avatar3DCreator - 3D WebView wrapper for Avatar Creator
 *
 * Integrates the WebGL3DView component into the avatar creation flow,
 * providing real-time 3D preview as users select avatar presets.
 *
 * Features:
 * - Wraps WebGL3DView with loading/error states
 * - Loads complete avatar presets by ID
 * - Supports view toggle (portrait/fullBody via camera presets)
 * - Graceful fallback handling
 * - WebView reload recovery
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import WebGL3DView, { WebGL3DViewRef } from './WebGL3DView';
import type { AvatarView } from '../avatar/types';
import type { CameraPreset } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Timeout in milliseconds before showing loading failure message */
const LOADING_TIMEOUT_MS = 8000; // 8 seconds - reduced from 15s for better UX

/** Warning threshold - show "loading slowly" message after this time */
const LOADING_SLOW_THRESHOLD_MS = 3000; // 3 seconds

/** User-friendly error messages mapped from technical error codes */
const USER_FRIENDLY_ERRORS: Record<string, string> = {
  INIT_ERROR: 'The 3D preview failed to start. This might be due to limited device resources.',
  WEBVIEW_ERROR: 'The preview could not load. Please try again.',
  TIMEOUT: 'The 3D preview is taking too long to load. This may be due to a slow connection or device limitations.',
  MESSAGE_PARSE_ERROR: 'Communication error with the 3D preview.',
  SNAPSHOT_ERROR: 'Failed to capture the avatar image.',
  DEFAULT: 'Something went wrong with the 3D preview.',
};

/**
 * Get a user-friendly error message from a technical error code
 */
function getUserFriendlyError(code: string, fallbackMessage?: string): string {
  return USER_FRIENDLY_ERRORS[code] || fallbackMessage || USER_FRIENDLY_ERRORS.DEFAULT;
}

export interface Avatar3DCreatorProps {
  /** Avatar preset ID to render */
  avatarId: string;
  /** Current view mode (maps to camera preset) */
  view?: AvatarView;
  /** Height of the preview panel */
  height?: number;
  /** Called when the 3D renderer becomes ready */
  onReady?: () => void;
  /** Called when an error occurs */
  onError?: (error: { message: string; code: string }) => void;
  /** Enable debug logging */
  debug?: boolean;
  /** Show fallback button when 3D fails */
  showFallbackButton?: boolean;
  /** Called when user wants to switch to fallback */
  onRequestFallback?: () => void;
  /** Test ID for testing */
  testID?: string;
  /** Called when avatar preset is being loaded */
  onAvatarLoading?: (avatarId: string) => void;
  /** Called when avatar preset is loaded */
  onAvatarLoaded?: (avatarId: string) => void;
}

// =============================================================================
// VIEW TO CAMERA PRESET MAPPING
// =============================================================================

const VIEW_TO_CAMERA_PRESET: Record<AvatarView, CameraPreset> = {
  portrait: 'portrait',
  fullBody: 'fullBody',
};

// =============================================================================
// COMPONENT
// =============================================================================

export function Avatar3DCreator({
  avatarId,
  view = 'portrait',
  height = 280,
  onReady,
  onError,
  debug = false,
  showFallbackButton = true,
  onRequestFallback,
  testID,
  onAvatarLoading,
  onAvatarLoaded,
}: Avatar3DCreatorProps): React.JSX.Element {
  const webglRef = useRef<WebGL3DViewRef>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSlow, setIsLoadingSlow] = useState(false);
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [loadAttempts, setLoadAttempts] = useState(0);

  // Timeout refs for tracking loading states
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Clear all loading timeouts
   */
  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    if (slowLoadingTimeoutRef.current) {
      clearTimeout(slowLoadingTimeoutRef.current);
      slowLoadingTimeoutRef.current = null;
    }
    setIsLoadingSlow(false);
    if (debug) {
      console.log('[Avatar3DCreator] Cleared loading timeouts');
    }
  }, [debug]);

  /**
   * Start the loading timeout
   * If the 3D preview doesn't load within LOADING_TIMEOUT_MS, show an error
   * Also starts slow loading detection for progressive feedback
   */
  const startLoadingTimeout = useCallback(() => {
    // Clear any existing timeout first
    clearLoadingTimeout();

    // Track when loading started
    setLoadStartTime(Date.now());

    // Start slow loading detection
    slowLoadingTimeoutRef.current = setTimeout(() => {
      setIsLoadingSlow(true);
      if (debug) {
        console.log('[Avatar3DCreator] Loading is slow (>', LOADING_SLOW_THRESHOLD_MS, 'ms)');
      }
    }, LOADING_SLOW_THRESHOLD_MS);

    // Start main timeout
    loadingTimeoutRef.current = setTimeout(() => {
      console.error('[Avatar3DCreator] Loading timeout after', LOADING_TIMEOUT_MS, 'ms');
      setError(getUserFriendlyError('TIMEOUT'));
      setErrorCode('TIMEOUT');
      setIsLoading(false);
      setIsLoadingSlow(false);
      onError?.({ message: 'Loading timeout', code: 'TIMEOUT' });
    }, LOADING_TIMEOUT_MS);

    if (debug) {
      console.log('[Avatar3DCreator] Started loading timeout:', LOADING_TIMEOUT_MS, 'ms');
    }
  }, [clearLoadingTimeout, onError, debug]);

  /**
   * Start timeout on initial mount
   */
  useEffect(() => {
    startLoadingTimeout();

    // Cleanup timeout on unmount
    return () => {
      clearLoadingTimeout();
    };
  }, [startLoadingTimeout, clearLoadingTimeout]);

  /**
   * Handle WebView ready event
   */
  const handleReady = useCallback(() => {
    // Clear the loading timeout since we successfully loaded
    clearLoadingTimeout();

    setIsReady(true);
    setIsLoading(false);
    setError(null);
    setErrorCode(null);

    if (debug) {
      console.log('[Avatar3DCreator] 3D preview ready');
    }

    onReady?.();

    // Initialize avatar in WebView
    if (webglRef.current && avatarId) {
      webglRef.current.setAvatar(avatarId);
      if (debug) {
        console.log('[Avatar3DCreator] Initial avatar set:', avatarId);
      }
    }
  }, [avatarId, onReady, debug, clearLoadingTimeout]);

  /**
   * Handle WebView error
   */
  const handleError = useCallback(
    (err: { message: string; code: string }) => {
      // Clear the loading timeout since we got an error response
      clearLoadingTimeout();

      // Use user-friendly error message
      const friendlyMessage = getUserFriendlyError(err.code, err.message);
      setError(friendlyMessage);
      setErrorCode(err.code);
      setIsLoading(false);

      console.error('[Avatar3DCreator] Error:', err.code, '-', err.message);

      onError?.(err);
    },
    [onError, clearLoadingTimeout]
  );

  /**
   * Retry loading the 3D view
   */
  const handleRetry = useCallback(() => {
    console.log('[Avatar3DCreator] Retrying 3D preview load...');

    setLoadAttempts((prev) => prev + 1);
    setError(null);
    setErrorCode(null);
    setIsLoading(true);
    setIsReady(false);

    // Start a new loading timeout
    startLoadingTimeout();
  }, [startLoadingTimeout]);

  /**
   * Sync avatarId changes to WebView
   */
  const lastAvatarIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!isReady || !webglRef.current || !avatarId) return;

    // Skip if avatar hasn't changed
    if (lastAvatarIdRef.current === avatarId) return;

    lastAvatarIdRef.current = avatarId;
    webglRef.current.setAvatar(avatarId);

    // Notify loading started
    onAvatarLoading?.(avatarId);

    if (debug) {
      console.log('[Avatar3DCreator] Avatar changed to:', avatarId);
    }
  }, [avatarId, isReady, debug, onAvatarLoading]);

  /**
   * Handle view changes by updating camera preset
   */
  useEffect(() => {
    if (!isReady || !webglRef.current) return;

    // Map view to camera preset and send to WebView
    const preset = VIEW_TO_CAMERA_PRESET[view];
    webglRef.current.setCamera(preset);

    if (debug) {
      console.log('[Avatar3DCreator] View changed to:', view, '-> Camera preset:', preset);
    }
  }, [view, isReady, debug]);

  // ==========================================================================
  // RENDER: Always mount WebGL3DView, overlay loading/error states
  // ==========================================================================

  // Use flex when no height specified, otherwise fixed height
  const containerStyle = height
    ? [styles.container, { height }]
    : [styles.container, styles.containerFlex];

  return (
    <View style={containerStyle} testID={testID}>
      {/* Always render WebGL3DView so it can initialize and send READY */}
      <WebGL3DView
        key={`webgl-${loadAttempts}`}
        ref={webglRef}
        style={styles.webglView}
        mode="r3f"
        onReady={handleReady}
        onError={handleError}
        onAvatarLoaded={(avatarId) => {
          console.log('[Avatar3DCreator] Avatar loaded:', avatarId);
          onAvatarLoaded?.(avatarId);
        }}
        showLoading={false}
        debug={debug}
      />

      {/* Loading overlay - shown on top of WebView while loading */}
      {isLoading && !error && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading 3D Preview...</Text>
          {isLoadingSlow && (
            <Text style={styles.loadingSubtextSlow}>
              This is taking a bit longer than usual...
            </Text>
          )}
          {loadAttempts > 0 && (
            <Text style={styles.loadingSubtext}>Attempt {loadAttempts + 1}</Text>
          )}
        </View>
      )}

      {/* Error overlay - shown on top when there's an error */}
      {error && (
        <View style={styles.errorOverlay}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>3D Preview Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>

          <View style={styles.errorActions}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>

            {showFallbackButton && onRequestFallback && (
              <TouchableOpacity
                style={styles.fallbackButton}
                onPress={onRequestFallback}
                activeOpacity={0.7}
              >
                <Text style={styles.fallbackButtonText}>Close Preview</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Overlay badge showing 3D mode */}
      {!isLoading && !error && (
        <View style={styles.badge3D}>
          <MaterialCommunityIcons name="cube-outline" size={14} color="#FFFFFF" />
          <Text style={styles.badge3DText}>3D</Text>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  containerFlex: {
    flex: 1,
  },
  webglView: {
    flex: 1,
    borderRadius: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#E5E7EB',
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#9CA3AF',
  },
  loadingSubtextSlow: {
    marginTop: 8,
    fontSize: 13,
    color: '#F59E0B',
    textAlign: 'center',
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    maxWidth: 280,
  },
  errorActions: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fallbackButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4B5563',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  fallbackButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  badge3D: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  badge3DText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default Avatar3DCreator;
