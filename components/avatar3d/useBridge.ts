/**
 * useBridge - React Native side bridge hook for WebView communication
 *
 * Provides reliable message delivery with acknowledgment, retry logic,
 * and timeout handling for RN ↔ WebView 3D avatar communication.
 *
 * Uses a preset-based avatar system where complete GLB models are loaded by ID.
 *
 * @example
 * ```tsx
 * const { status, isReady, sendMessage, setAvatar, takeSnapshot } = useBridge({
 *   webViewRef,
 *   onReady: () => console.log('Bridge ready'),
 *   onError: (error) => console.error('Bridge error:', error),
 * });
 *
 * // Set avatar by preset ID
 * await setAvatar('avatar_asian_m');
 *
 * // Take snapshot
 * const base64 = await takeSnapshot({ format: 'png' });
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WebView } from 'react-native-webview';
import type { AvatarConfig } from '../avatar/types';
import { avatarLoader } from '../../lib/avatar';
import {
  type RNToWebViewMessage,
  type WebViewToRNMessage,
  type BridgeStatus,
  type BridgeState,
  type BridgeActions,
  type BridgeOptions,
  type PendingMessage,
  type CameraPreset,
  type CameraPosition,
  type AvatarPose,
  type SnapshotFormat,
  type ErrorMessage,
  generateMessageId,
  serializeMessage,
  DEFAULT_BRIDGE_OPTIONS,
} from './types';

// =============================================================================
// HOOK OPTIONS
// =============================================================================

export interface UseBridgeOptions extends BridgeOptions {
  /** Reference to the WebView component */
  webViewRef: React.RefObject<WebView>;
  /** Called when bridge becomes ready */
  onReady?: () => void;
  /** Called when snapshot is received */
  onSnapshot?: (base64: string) => void;
  /** Called on any error */
  onError?: (error: ErrorMessage) => void;
  /** Called on FPS update */
  onFPSUpdate?: (fps: number) => void;
  /** Called on loading progress update */
  onLoadingProgress?: (percent: number, stage?: string) => void;
  /** Called when avatar is applied */
  onAvatarApplied?: (avatarId: string) => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useBridge(options: UseBridgeOptions): BridgeState & BridgeActions {
  const {
    webViewRef,
    onReady,
    onSnapshot,
    onError,
    onFPSUpdate,
    onLoadingProgress,
    onAvatarApplied,
    useAcknowledgment = DEFAULT_BRIDGE_OPTIONS.useAcknowledgment,
    timeout = DEFAULT_BRIDGE_OPTIONS.timeout,
    maxRetries = DEFAULT_BRIDGE_OPTIONS.maxRetries,
    retryDelay = DEFAULT_BRIDGE_OPTIONS.retryDelay,
    debug = DEFAULT_BRIDGE_OPTIONS.debug,
  } = options;

  // State
  const [status, setStatus] = useState<BridgeStatus>('disconnected');
  const [error, setError] = useState<ErrorMessage | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Refs for pending messages and snapshot callbacks
  const pendingMessagesRef = useRef<Map<string, PendingMessage>>(new Map());
  const snapshotCallbackRef = useRef<{
    resolve: (base64: string) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const pingCallbackRef = useRef<{
    resolve: (latency: number) => void;
    reject: (error: Error) => void;
    timestamp: number;
  } | null>(null);

  // Message queue for messages sent before ready
  const messageQueueRef = useRef<RNToWebViewMessage[]>([]);

  // Debug logger
  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) {
        console.log('[useBridge]', ...args);
      }
    },
    [debug]
  );

  // ==========================================================================
  // SEND MESSAGE
  // ==========================================================================

  /**
   * Inject JavaScript into WebView to dispatch a message event
   */
  const injectMessage = useCallback(
    (message: RNToWebViewMessage) => {
      const webView = webViewRef.current;
      if (!webView) {
        log('WebView ref not available');
        return false;
      }

      const jsonMessage = serializeMessage(message);
      // Escape single quotes for JavaScript injection
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

      log('Injected message:', message.type);
      return true;
    },
    [webViewRef, log]
  );

  /**
   * Send a message with optional acknowledgment and retry
   */
  const sendMessage = useCallback(
    async (message: RNToWebViewMessage): Promise<boolean> => {
      // If not ready, queue the message
      if (status !== 'ready') {
        log('Queueing message (not ready):', message.type);
        messageQueueRef.current.push(message);
        return false;
      }

      // Add messageId if using acknowledgment
      if (useAcknowledgment && !('messageId' in message && message.messageId)) {
        (message as RNToWebViewMessage & { messageId?: string }).messageId =
          generateMessageId();
      }

      const messageId = (message as { messageId?: string }).messageId;

      // If not using acknowledgment, just inject and return
      if (!useAcknowledgment || !messageId) {
        return injectMessage(message);
      }

      // Create pending message entry
      return new Promise<boolean>((resolve, reject) => {
        const pending: PendingMessage = {
          message,
          timestamp: Date.now(),
          retryCount: 0,
          resolve,
          reject,
        };

        pendingMessagesRef.current.set(messageId, pending);

        // Send the message
        injectMessage(message);

        // Set timeout
        const timeoutId = setTimeout(() => {
          const pendingMessage = pendingMessagesRef.current.get(messageId);
          if (!pendingMessage) return;

          // Retry logic
          if (pendingMessage.retryCount < maxRetries) {
            pendingMessage.retryCount++;
            log(`Retrying message ${messageId} (attempt ${pendingMessage.retryCount})`);

            setTimeout(() => {
              injectMessage(message);
            }, retryDelay);
          } else {
            // Max retries exceeded
            pendingMessagesRef.current.delete(messageId);
            const error = new Error(`Message timeout after ${maxRetries} retries`);
            reject(error);
          }
        }, timeout);

        // Store timeout ID for cleanup
        (pending as PendingMessage & { timeoutId?: ReturnType<typeof setTimeout> }).timeoutId = timeoutId;
      });
    },
    [status, useAcknowledgment, timeout, maxRetries, retryDelay, injectMessage, log]
  );

  // ==========================================================================
  // MESSAGE HANDLERS
  // ==========================================================================

  /**
   * Handle incoming messages from WebView
   */
  const handleMessage = useCallback(
    (message: WebViewToRNMessage) => {
      log('Received message:', message.type);

      switch (message.type) {
        case 'READY':
          setStatus('ready');
          setError(null);
          setLoadingProgress(100);
          log('Bridge ready, version:', message.version || 'unknown');
          onReady?.();
          break;

        case 'ACK':
          // Handle acknowledgment
          const pending = pendingMessagesRef.current.get(message.messageId);
          if (pending) {
            const pendingWithTimeout = pending as PendingMessage & { timeoutId?: ReturnType<typeof setTimeout> };
            if (pendingWithTimeout.timeoutId) {
              clearTimeout(pendingWithTimeout.timeoutId);
            }
            pendingMessagesRef.current.delete(message.messageId);
            pending.resolve(message.success);
          }
          break;

        case 'LOADING_PROGRESS':
          setLoadingProgress(message.percent);
          onLoadingProgress?.(message.percent, message.stage);
          break;

        case 'AVATAR_LOADING_PROGRESS':
          // Update avatar loader with progress
          avatarLoader.updateAvatarProgress(message.avatarId, message.percent);
          log('Avatar loading progress:', message.avatarId, message.percent);
          break;

        case 'AVATAR_LOADED':
          // Mark avatar as loaded in the loader
          avatarLoader.markAvatarLoaded(message.avatarId);
          log('Avatar loaded:', message.avatarId);
          break;

        case 'AVATAR_APPLIED':
          log('Avatar applied:', message.avatarId);
          onAvatarApplied?.(message.avatarId);
          break;

        case 'AVATAR_LOAD_ERROR':
          // Mark avatar as errored in the loader
          avatarLoader.markAvatarError(message.avatarId, message.message);
          log('Avatar load error:', message.avatarId, message.message);
          break;

        case 'SNAPSHOT_READY':
          if (snapshotCallbackRef.current) {
            snapshotCallbackRef.current.resolve(message.base64);
            snapshotCallbackRef.current = null;
          }
          onSnapshot?.(message.base64);
          break;

        case 'ERROR':
          setError(message);
          onError?.(message);

          // Reject related pending message if applicable
          if (message.messageId) {
            const pendingMsg = pendingMessagesRef.current.get(message.messageId);
            if (pendingMsg) {
              pendingMessagesRef.current.delete(message.messageId);
              pendingMsg.reject(new Error(message.message));
            }
          }
          break;

        case 'FPS_UPDATE':
          setFps(message.fps);
          onFPSUpdate?.(message.fps);
          break;

        case 'PERF_REPORT':
          setFps(message.fps);
          log('Perf report:', message);
          break;

        case 'PONG':
          if (pingCallbackRef.current) {
            const latency = Date.now() - pingCallbackRef.current.timestamp;
            pingCallbackRef.current.resolve(latency);
            pingCallbackRef.current = null;
          }
          break;

        default:
          log('Unknown message type:', (message as { type: string }).type);
      }
    },
    [log, onReady, onSnapshot, onError, onFPSUpdate, onLoadingProgress, onAvatarApplied]
  );

  /**
   * Parse and handle raw message data from WebView
   */
  const handleRawMessage = useCallback(
    (data: string) => {
      try {
        const message = JSON.parse(data) as WebViewToRNMessage;
        handleMessage(message);
      } catch (e) {
        log('Failed to parse message:', e);
        setError({
          type: 'ERROR',
          message: 'Failed to parse message from WebView',
          code: 'MESSAGE_PARSE_ERROR',
        });
      }
    },
    [handleMessage, log]
  );

  // ==========================================================================
  // CONVENIENCE ACTIONS
  // ==========================================================================

  /**
   * Set avatar by preset ID
   */
  const setAvatar = useCallback(
    async (avatarId: string, url?: string): Promise<boolean> => {
      // Update loader state to indicate loading
      avatarLoader.markAvatarLoading(avatarId);
      return sendMessage({ type: 'SET_AVATAR', avatarId, url });
    },
    [sendMessage]
  );

  /**
   * Initialize with avatar config
   */
  const initAvatar = useCallback(
    async (config: AvatarConfig): Promise<boolean> => {
      // Update loader state to indicate loading
      avatarLoader.markAvatarLoading(config.avatarId);
      return sendMessage({ type: 'INIT_AVATAR', config });
    },
    [sendMessage]
  );

  /**
   * Take a snapshot
   */
  const takeSnapshot = useCallback(
    async (
      snapshotOptions: {
        format?: SnapshotFormat;
        quality?: number;
        width?: number;
        height?: number;
        transparent?: boolean;
      } = {}
    ): Promise<string> => {
      return new Promise((resolve, reject) => {
        // Set up callback
        snapshotCallbackRef.current = { resolve, reject };

        // Set timeout
        const timeoutId = setTimeout(() => {
          if (snapshotCallbackRef.current) {
            snapshotCallbackRef.current.reject(new Error('Snapshot timeout'));
            snapshotCallbackRef.current = null;
          }
        }, timeout);

        // Send message
        sendMessage({
          type: 'TAKE_SNAPSHOT',
          ...snapshotOptions,
        }).catch((err) => {
          clearTimeout(timeoutId);
          snapshotCallbackRef.current = null;
          reject(err);
        });
      });
    },
    [sendMessage, timeout]
  );

  /**
   * Set camera preset or position
   */
  const setCamera = useCallback(
    async (
      presetOrPosition: CameraPreset | CameraPosition,
      duration?: number
    ): Promise<boolean> => {
      if (typeof presetOrPosition === 'string') {
        return sendMessage({
          type: 'SET_CAMERA',
          preset: presetOrPosition,
          duration,
        });
      } else {
        return sendMessage({
          type: 'SET_CAMERA',
          position: presetOrPosition,
          duration,
        });
      }
    },
    [sendMessage]
  );

  /**
   * Set avatar pose
   */
  const setPose = useCallback(
    async (pose: AvatarPose): Promise<boolean> => {
      return sendMessage({ type: 'SET_POSE', pose });
    },
    [sendMessage]
  );

  /**
   * Ping WebView and measure latency
   */
  const ping = useCallback(async (): Promise<number> => {
    return new Promise((resolve, reject) => {
      const messageId = generateMessageId();
      const timestamp = Date.now();

      pingCallbackRef.current = { resolve, reject, timestamp };

      // Set timeout
      const timeoutId = setTimeout(() => {
        if (pingCallbackRef.current) {
          pingCallbackRef.current.reject(new Error('Ping timeout'));
          pingCallbackRef.current = null;
        }
      }, timeout);

      sendMessage({ type: 'PING', messageId }).catch((err) => {
        clearTimeout(timeoutId);
        pingCallbackRef.current = null;
        reject(err);
      });
    });
  }, [sendMessage, timeout]);

  /**
   * Reset bridge state
   */
  const reset = useCallback(() => {
    setStatus('disconnected');
    setError(null);
    setFps(null);
    setLoadingProgress(0);
    pendingMessagesRef.current.clear();
    messageQueueRef.current = [];
    snapshotCallbackRef.current = null;
    pingCallbackRef.current = null;
  }, []);

  // ==========================================================================
  // QUEUE FLUSH ON READY
  // ==========================================================================

  useEffect(() => {
    if (status === 'ready' && messageQueueRef.current.length > 0) {
      log('Flushing', messageQueueRef.current.length, 'queued messages');
      const queue = [...messageQueueRef.current];
      messageQueueRef.current = [];

      // Send queued messages with slight delay between each
      queue.forEach((msg, index) => {
        setTimeout(() => {
          injectMessage(msg);
        }, index * 50);
      });
    }
  }, [status, injectMessage, log]);

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  useEffect(() => {
    return () => {
      // Clear all pending message timeouts
      pendingMessagesRef.current.forEach((pending) => {
        const pendingWithTimeout = pending as PendingMessage & { timeoutId?: ReturnType<typeof setTimeout> };
        if (pendingWithTimeout.timeoutId) {
          clearTimeout(pendingWithTimeout.timeoutId);
        }
      });
      pendingMessagesRef.current.clear();
    };
  }, []);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    status,
    isReady: status === 'ready',
    error,
    fps,
    loadingProgress,

    // Actions
    sendMessage,
    setAvatar,
    initAvatar,
    takeSnapshot,
    setCamera,
    setPose,
    ping,
    reset,

    // Internal handler for WebGL3DView to call
    handleRawMessage,
  } as BridgeState & BridgeActions & { handleRawMessage: (data: string) => void };
}
