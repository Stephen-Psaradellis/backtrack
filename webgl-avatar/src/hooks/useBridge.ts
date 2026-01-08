/**
 * useBridge - WebView side bridge hook for React Native communication
 *
 * Handles incoming messages from React Native and provides a way to send
 * messages back. Includes message validation and error handling.
 *
 * Task 3: Message Bridge Protocol
 *
 * @example
 * ```tsx
 * const { sendToRN, config, pose, isReady } = useBridge({
 *   onConfigChange: (config) => console.log('Config changed:', config),
 *   onSnapshotRequest: (options) => takeSnapshot(options),
 * });
 *
 * // Send ready signal
 * useEffect(() => {
 *   sendToRN({ type: 'READY', version: '1.0.0' });
 * }, []);
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// =============================================================================
// TYPE DEFINITIONS (mirrored from RN side for WebView bundle)
// =============================================================================

export type CameraPreset = 'portrait' | 'fullBody' | 'closeUp';
export type CameraPosition = [number, number, number];
export type AvatarPose = 'idle' | 'wave' | 'thinking' | 'happy' | 'neutral' | 'surprised';
export type AssetCategory =
  | 'head'
  | 'hair'
  | 'eyes'
  | 'nose'
  | 'mouth'
  | 'eyebrows'
  | 'facialHair'
  | 'body'
  | 'top'
  | 'bottom'
  | 'accessories';
export type SnapshotFormat = 'png' | 'jpeg';
export type BridgeErrorCode =
  | 'INIT_ERROR'
  | 'MESSAGE_PARSE_ERROR'
  | 'SNAPSHOT_ERROR'
  | 'ASSET_LOAD_ERROR'
  | 'CONFIG_ERROR'
  | 'WEBVIEW_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

// RN → WebView messages
export type RNToWebViewMessage =
  | { type: 'INIT'; config: AvatarConfig; messageId?: string }
  | { type: 'UPDATE_CONFIG'; changes: Partial<AvatarConfig>; messageId?: string }
  | { type: 'SET_POSE'; pose: AvatarPose; messageId?: string }
  | {
      type: 'SET_CAMERA';
      position?: CameraPosition;
      preset?: CameraPreset;
      duration?: number;
      messageId?: string;
    }
  | {
      type: 'TAKE_SNAPSHOT';
      format?: SnapshotFormat;
      quality?: number;
      width?: number;
      height?: number;
      transparent?: boolean;
      messageId?: string;
    }
  | { type: 'LOAD_ASSET'; category: AssetCategory; url: string; messageId?: string }
  | { type: 'SET_ROTATION'; enabled: boolean; messageId?: string }
  | { type: 'SET_INTERACTIVE'; enabled: boolean; messageId?: string }
  | { type: 'PING'; messageId: string };

// WebView → RN messages
export type WebViewToRNMessage =
  | { type: 'READY'; version?: string }
  | { type: 'ACK'; messageId: string; success: boolean }
  | { type: 'LOADING_PROGRESS'; percent: number; stage?: string }
  | { type: 'ASSET_LOADED'; category: AssetCategory; url: string }
  | { type: 'SNAPSHOT_READY'; base64: string; width?: number; height?: number }
  | { type: 'ERROR'; message: string; code: BridgeErrorCode; stack?: string; messageId?: string }
  | { type: 'FPS_UPDATE'; fps: number }
  | { type: 'PERF_REPORT'; fps: number; memory?: number; uptime: number }
  | { type: 'PONG'; messageId: string }
  | { type: 'CONFIG_APPLIED'; config: Partial<AvatarConfig>; timestamp: number };

// Simplified AvatarConfig for WebView (full type is on RN side)
export interface AvatarConfig {
  skinTone?: string;
  hairColor?: string;
  hairStyle?: string;
  facialHair?: string;
  facialHairColor?: string;
  faceShape?: string;
  eyeShape?: string;
  eyeColor?: string;
  eyebrowStyle?: string;
  noseShape?: string;
  mouthExpression?: string;
  bodyShape?: string;
  heightCategory?: string;
  topType?: string;
  topColor?: string;
  bottomType?: string;
  bottomColor?: string;
  glasses?: string;
  headwear?: string;
  // Legacy POC properties
  primaryColor?: string;
  scale?: number;
  [key: string]: unknown;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const BRIDGE_PROTOCOL_VERSION = '1.0.0';

export const CAMERA_PRESETS: Record<
  CameraPreset,
  { position: CameraPosition; target: CameraPosition }
> = {
  portrait: { position: [0, 1.5, 2], target: [0, 1.5, 0] },
  fullBody: { position: [0, 1, 4], target: [0, 1, 0] },
  closeUp: { position: [0, 1.6, 1], target: [0, 1.6, 0] },
};

// =============================================================================
// HOOK OPTIONS
// =============================================================================

export interface UseBridgeOptions {
  /** Called when INIT message is received */
  onInit?: (config: AvatarConfig) => void;
  /** Called when UPDATE_CONFIG message is received */
  onConfigChange?: (changes: Partial<AvatarConfig>) => void;
  /** Called when SET_POSE message is received */
  onPoseChange?: (pose: AvatarPose) => void;
  /** Called when SET_CAMERA message is received */
  onCameraChange?: (options: {
    position?: CameraPosition;
    preset?: CameraPreset;
    duration?: number;
  }) => void;
  /** Called when TAKE_SNAPSHOT message is received */
  onSnapshotRequest?: (options: {
    format?: SnapshotFormat;
    quality?: number;
    width?: number;
    height?: number;
    transparent?: boolean;
  }) => void;
  /** Called when LOAD_ASSET message is received */
  onLoadAsset?: (category: AssetCategory, url: string) => void;
  /** Called when SET_ROTATION message is received */
  onRotationChange?: (enabled: boolean) => void;
  /** Called when SET_INTERACTIVE message is received */
  onInteractiveChange?: (enabled: boolean) => void;
  /** Enable debug logging */
  debug?: boolean;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useBridge(options: UseBridgeOptions = {}) {
  const {
    onInit,
    onConfigChange,
    onPoseChange,
    onCameraChange,
    onSnapshotRequest,
    onLoadAsset,
    onRotationChange,
    onInteractiveChange,
    debug = false,
  } = options;

  // State
  const [config, setConfig] = useState<AvatarConfig>({});
  const [pose, setPose] = useState<AvatarPose>('idle');
  const [isRotating, setIsRotating] = useState(true);
  const [isInteractive, setIsInteractive] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Track initialization time for perf reports
  const initTimeRef = useRef(Date.now());

  // Debug logger
  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) {
        console.log('[useBridge:WebView]', ...args);
      }
    },
    [debug]
  );

  // ==========================================================================
  // SEND TO RN
  // ==========================================================================

  /**
   * Send a message to React Native
   */
  const sendToRN = useCallback(
    (message: WebViewToRNMessage) => {
      if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify(message));
        log('Sent to RN:', message.type);
      } else {
        log('Would send to RN (no WebView):', message);
      }
    },
    [log]
  );

  /**
   * Send acknowledgment for a message
   */
  const sendAck = useCallback(
    (messageId: string | undefined, success: boolean) => {
      if (messageId) {
        sendToRN({ type: 'ACK', messageId, success });
      }
    },
    [sendToRN]
  );

  /**
   * Send error to RN
   */
  const sendError = useCallback(
    (
      message: string,
      code: BridgeErrorCode = 'UNKNOWN_ERROR',
      messageId?: string
    ) => {
      sendToRN({
        type: 'ERROR',
        message,
        code,
        messageId,
        stack: new Error().stack,
      });
    },
    [sendToRN]
  );

  /**
   * Send loading progress
   */
  const sendProgress = useCallback(
    (percent: number, stage?: string) => {
      sendToRN({ type: 'LOADING_PROGRESS', percent, stage });
    },
    [sendToRN]
  );

  /**
   * Send snapshot result
   */
  const sendSnapshot = useCallback(
    (base64: string, width?: number, height?: number) => {
      sendToRN({ type: 'SNAPSHOT_READY', base64, width, height });
    },
    [sendToRN]
  );

  /**
   * Send asset loaded notification
   */
  const sendAssetLoaded = useCallback(
    (category: AssetCategory, url: string) => {
      sendToRN({ type: 'ASSET_LOADED', category, url });
    },
    [sendToRN]
  );

  /**
   * Send FPS update
   */
  const sendFPS = useCallback(
    (fps: number) => {
      sendToRN({ type: 'FPS_UPDATE', fps });
    },
    [sendToRN]
  );

  /**
   * Send performance report
   */
  const sendPerfReport = useCallback(
    (fps: number, memory?: number) => {
      sendToRN({
        type: 'PERF_REPORT',
        fps,
        memory,
        uptime: Date.now() - initTimeRef.current,
      });
    },
    [sendToRN]
  );

  /**
   * Send ready signal
   */
  const sendReady = useCallback(() => {
    sendToRN({ type: 'READY', version: BRIDGE_PROTOCOL_VERSION });
    setIsReady(true);
  }, [sendToRN]);

  /**
   * Send config applied notification
   */
  const sendConfigApplied = useCallback(
    (appliedConfig: Partial<AvatarConfig>) => {
      sendToRN({
        type: 'CONFIG_APPLIED',
        config: appliedConfig,
        timestamp: Date.now(),
      });
    },
    [sendToRN]
  );

  // ==========================================================================
  // MESSAGE HANDLER
  // ==========================================================================

  /**
   * Handle incoming message from RN
   */
  const handleMessage = useCallback(
    (message: RNToWebViewMessage) => {
      log('Received from RN:', message.type);

      try {
        switch (message.type) {
          case 'INIT':
            setConfig(message.config);
            onInit?.(message.config);
            sendAck(message.messageId, true);
            sendConfigApplied(message.config);
            break;

          case 'UPDATE_CONFIG':
            setConfig((prev) => {
              const newConfig = { ...prev, ...message.changes };
              onConfigChange?.(message.changes);
              sendConfigApplied(message.changes);
              return newConfig;
            });
            sendAck(message.messageId, true);
            break;

          case 'SET_POSE':
            setPose(message.pose);
            onPoseChange?.(message.pose);
            sendAck(message.messageId, true);
            break;

          case 'SET_CAMERA':
            onCameraChange?.({
              position: message.position,
              preset: message.preset,
              duration: message.duration,
            });
            sendAck(message.messageId, true);
            break;

          case 'TAKE_SNAPSHOT':
            onSnapshotRequest?.({
              format: message.format,
              quality: message.quality,
              width: message.width,
              height: message.height,
              transparent: message.transparent,
            });
            // Note: ACK is sent when snapshot is ready, not immediately
            break;

          case 'LOAD_ASSET':
            onLoadAsset?.(message.category, message.url);
            sendAck(message.messageId, true);
            break;

          case 'SET_ROTATION':
            setIsRotating(message.enabled);
            onRotationChange?.(message.enabled);
            sendAck(message.messageId, true);
            break;

          case 'SET_INTERACTIVE':
            setIsInteractive(message.enabled);
            onInteractiveChange?.(message.enabled);
            sendAck(message.messageId, true);
            break;

          case 'PING':
            sendToRN({ type: 'PONG', messageId: message.messageId });
            break;

          default:
            log('Unknown message type:', (message as any).type);
        }
      } catch (error) {
        const err = error as Error;
        sendError(
          err.message || 'Failed to handle message',
          'MESSAGE_PARSE_ERROR',
          (message as any).messageId
        );
      }
    },
    [
      log,
      onInit,
      onConfigChange,
      onPoseChange,
      onCameraChange,
      onSnapshotRequest,
      onLoadAsset,
      onRotationChange,
      onInteractiveChange,
      sendAck,
      sendConfigApplied,
      sendError,
      sendToRN,
    ]
  );

  /**
   * Parse and handle raw message event
   */
  const handleRawMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        // Validate message has a type
        if (!data || typeof data.type !== 'string') {
          log('Invalid message format:', data);
          return;
        }

        handleMessage(data as RNToWebViewMessage);
      } catch (error) {
        log('Failed to parse message:', error);
        sendError('Failed to parse message', 'MESSAGE_PARSE_ERROR');
      }
    },
    [handleMessage, log, sendError]
  );

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================

  useEffect(() => {
    // Listen for messages from RN
    window.addEventListener('message', handleRawMessage);
    document.addEventListener('message', handleRawMessage as EventListener);

    log('Bridge initialized, listeners attached');

    return () => {
      window.removeEventListener('message', handleRawMessage);
      document.removeEventListener('message', handleRawMessage as EventListener);
      log('Bridge cleanup, listeners removed');
    };
  }, [handleRawMessage, log]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    config,
    pose,
    isRotating,
    isInteractive,
    isReady,

    // Send functions
    sendToRN,
    sendReady,
    sendError,
    sendProgress,
    sendSnapshot,
    sendAssetLoaded,
    sendFPS,
    sendPerfReport,
    sendConfigApplied,

    // Raw handler (for manual use if needed)
    handleRawMessage,
  };
}

export default useBridge;
