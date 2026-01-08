/**
 * Avatar 3D Message Bridge Types
 *
 * Defines the communication protocol between React Native and the WebView-hosted
 * Three.js/React Three Fiber 3D avatar renderer.
 *
 * Uses a preset-based avatar system where complete GLB models are loaded by ID.
 */

import type { AvatarConfig } from '../avatar/types';

// =============================================================================
// SHARED TYPES
// =============================================================================

/**
 * Camera preset names for avatar viewing
 */
export type CameraPreset = 'portrait' | 'fullBody' | 'closeUp' | 'threeQuarter' | 'profile';

/**
 * Camera position as [x, y, z] tuple
 */
export type CameraPosition = [number, number, number];

/**
 * Available pose animations
 */
export type AvatarPose =
  | 'idle'
  | 'wave'
  | 'thinking'
  | 'happy'
  | 'neutral'
  | 'surprised';

/**
 * Snapshot output format
 */
export type SnapshotFormat = 'png' | 'jpeg';

/**
 * Error codes for categorizing errors
 */
export type BridgeErrorCode =
  | 'INIT_ERROR'
  | 'MESSAGE_PARSE_ERROR'
  | 'SNAPSHOT_ERROR'
  | 'AVATAR_LOAD_ERROR'
  | 'CONFIG_ERROR'
  | 'WEBVIEW_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

// =============================================================================
// RN → WEBVIEW MESSAGES
// =============================================================================

/**
 * Set avatar by preset ID.
 * This loads a complete pre-made avatar GLB model.
 */
export interface SetAvatarMessage {
  type: 'SET_AVATAR';
  /** Avatar preset ID (e.g., 'avatar_asian_m') */
  avatarId: string;
  /** Optional URL override for CDN avatars */
  url?: string;
  /** Optional message ID for acknowledgment */
  messageId?: string;
}

/**
 * Initialize with avatar config (preset system)
 */
export interface InitAvatarMessage {
  type: 'INIT_AVATAR';
  /** Avatar configuration with preset ID */
  config: AvatarConfig;
  /** Optional message ID for acknowledgment */
  messageId?: string;
}

/**
 * Set the avatar pose/animation
 */
export interface SetPoseMessage {
  type: 'SET_POSE';
  pose: AvatarPose;
  /** Optional message ID for acknowledgment */
  messageId?: string;
}

/**
 * Set camera position directly or use a preset
 */
export interface SetCameraMessage {
  type: 'SET_CAMERA';
  /** Camera position as [x, y, z] or a preset name */
  position?: CameraPosition;
  /** Camera look-at target as [x, y, z] */
  target?: CameraPosition;
  preset?: CameraPreset;
  /** Animation duration in seconds (default: 0.8) */
  duration?: number;
  /** Optional message ID for acknowledgment */
  messageId?: string;
}

/**
 * Set camera to a specific preset (simplified message)
 */
export interface SetCameraPresetMessage {
  type: 'SET_CAMERA_PRESET';
  preset: CameraPreset;
  /** Animation duration in seconds (default: 0.8) */
  duration?: number;
  /** Optional message ID for acknowledgment */
  messageId?: string;
}

/**
 * Request a snapshot capture of the current scene
 */
export interface TakeSnapshotMessage {
  type: 'TAKE_SNAPSHOT';
  format?: SnapshotFormat;
  /** JPEG quality (0-1), ignored for PNG */
  quality?: number;
  /** Output dimensions (optional, uses canvas size if not specified) */
  width?: number;
  height?: number;
  /** Use transparent background */
  transparent?: boolean;
  /** Optional message ID for acknowledgment */
  messageId?: string;
}

/**
 * Enable/disable interactive controls (OrbitControls)
 */
export interface SetInteractiveMessage {
  type: 'SET_INTERACTIVE';
  enabled: boolean;
  /** Optional message ID for acknowledgment */
  messageId?: string;
}

/**
 * Ping message for health check
 */
export interface PingMessage {
  type: 'PING';
  messageId: string;
}

/**
 * Union of all RN → WebView message types
 */
export type RNToWebViewMessage =
  | SetAvatarMessage
  | InitAvatarMessage
  | SetPoseMessage
  | SetCameraMessage
  | SetCameraPresetMessage
  | TakeSnapshotMessage
  | SetInteractiveMessage
  | PingMessage;

// =============================================================================
// WEBVIEW → RN MESSAGES
// =============================================================================

/**
 * WebView renderer initialization has started
 */
export interface InitStartedMessage {
  type: 'INIT_STARTED';
}

/**
 * WebView renderer is initialized and ready
 */
export interface ReadyMessage {
  type: 'READY';
  /** WebView-side version for compatibility checks */
  version?: string;
}

/**
 * Acknowledgment of a received message
 */
export interface AckMessage {
  type: 'ACK';
  /** The messageId of the acknowledged message */
  messageId: string;
  /** Whether the operation succeeded */
  success: boolean;
}

/**
 * Loading progress update (0-100)
 */
export interface LoadingProgressMessage {
  type: 'LOADING_PROGRESS';
  percent: number;
  /** Current loading stage description */
  stage?: string;
}

/**
 * Avatar preset is being loaded (progress update)
 */
export interface AvatarLoadingProgressMessage {
  type: 'AVATAR_LOADING_PROGRESS';
  /** Avatar preset ID being loaded */
  avatarId: string;
  /** Loading progress (0-100) */
  percent: number;
  /** Current stage description */
  stage?: string;
}

/**
 * Avatar preset was successfully loaded
 */
export interface AvatarLoadedMessage {
  type: 'AVATAR_LOADED';
  /** Avatar preset ID that was loaded */
  avatarId: string;
  /** Timestamp when loaded */
  timestamp: number;
}

/**
 * Avatar preset was applied to the scene
 */
export interface AvatarAppliedMessage {
  type: 'AVATAR_APPLIED';
  /** Avatar preset ID that was applied */
  avatarId: string;
  /** Timestamp when applied */
  timestamp: number;
}

/**
 * Avatar loading failed
 */
export interface AvatarLoadErrorMessage {
  type: 'AVATAR_LOAD_ERROR';
  /** Avatar preset ID that failed to load */
  avatarId: string;
  /** Error message */
  message: string;
  /** Timestamp when error occurred */
  timestamp: number;
}

/**
 * Snapshot capture completed
 */
export interface SnapshotReadyMessage {
  type: 'SNAPSHOT_READY';
  base64: string;
  /** Width of the captured image */
  width?: number;
  /** Height of the captured image */
  height?: number;
}

/**
 * Error occurred in WebView
 */
export interface ErrorMessage {
  type: 'ERROR';
  message: string;
  code: BridgeErrorCode;
  /** Original error stack for debugging */
  stack?: string;
  /** Related messageId if error was triggered by a specific message */
  messageId?: string;
}

/**
 * FPS update for performance monitoring
 */
export interface FPSUpdateMessage {
  type: 'FPS_UPDATE';
  fps: number;
}

/**
 * Performance metrics report
 */
export interface PerfReportMessage {
  type: 'PERF_REPORT';
  fps: number;
  /** Memory usage in MB (if available) */
  memory?: number;
  /** Time since initialization in ms */
  uptime: number;
}

/**
 * Pong response to ping
 */
export interface PongMessage {
  type: 'PONG';
  messageId: string;
}

/**
 * Camera settings were applied
 */
export interface CameraAppliedMessage {
  type: 'CAMERA_APPLIED';
  /** Camera preset if used */
  preset: CameraPreset | null;
  /** Camera position if custom */
  position: CameraPosition | null;
  /** Camera target if custom */
  target: CameraPosition | null;
  /** Transition duration */
  duration: number;
  /** Timestamp when applied */
  timestamp: number;
}

/**
 * Camera preset was applied
 */
export interface CameraPresetAppliedMessage {
  type: 'CAMERA_PRESET_APPLIED';
  preset: CameraPreset;
  /** Timestamp when applied */
  timestamp: number;
}

/**
 * Interactive mode was changed
 */
export interface InteractiveModeAppliedMessage {
  type: 'INTERACTIVE_MODE_APPLIED';
  enabled: boolean;
  /** Timestamp when applied */
  timestamp: number;
}

/**
 * Camera transition started
 */
export interface CameraTransitionStartMessage {
  type: 'CAMERA_TRANSITION_START';
  /** Timestamp when started */
  timestamp: number;
}

/**
 * Camera transition completed
 */
export interface CameraTransitionCompleteMessage {
  type: 'CAMERA_TRANSITION_COMPLETE';
  /** Timestamp when completed */
  timestamp: number;
}

/**
 * Union of all WebView → RN message types
 */
export type WebViewToRNMessage =
  | InitStartedMessage
  | ReadyMessage
  | AckMessage
  | LoadingProgressMessage
  | AvatarLoadingProgressMessage
  | AvatarLoadedMessage
  | AvatarAppliedMessage
  | AvatarLoadErrorMessage
  | SnapshotReadyMessage
  | ErrorMessage
  | FPSUpdateMessage
  | PerfReportMessage
  | PongMessage
  | CameraAppliedMessage
  | CameraPresetAppliedMessage
  | InteractiveModeAppliedMessage
  | CameraTransitionStartMessage
  | CameraTransitionCompleteMessage;

// =============================================================================
// BRIDGE STATE & HOOKS
// =============================================================================

/**
 * Bridge connection state
 */
export type BridgeStatus = 'disconnected' | 'connecting' | 'ready' | 'error';

/**
 * Pending message waiting for acknowledgment
 */
export interface PendingMessage {
  message: RNToWebViewMessage;
  timestamp: number;
  retryCount: number;
  resolve: (success: boolean) => void;
  reject: (error: Error) => void;
}

/**
 * Bridge configuration options
 */
export interface BridgeOptions {
  /** Enable acknowledgment-based delivery (default: true) */
  useAcknowledgment?: boolean;
  /** Message timeout in ms (default: 5000) */
  timeout?: number;
  /** Max retry attempts (default: 3) */
  maxRetries?: number;
  /** Retry delay in ms (default: 1000) */
  retryDelay?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Bridge state returned by useBridge hook
 */
export interface BridgeState {
  /** Current connection status */
  status: BridgeStatus;
  /** Whether the bridge is ready for communication */
  isReady: boolean;
  /** Last error if status is 'error' */
  error: ErrorMessage | null;
  /** Current FPS from WebView */
  fps: number | null;
  /** Loading progress (0-100) */
  loadingProgress: number;
}

/**
 * Bridge actions returned by useBridge hook
 */
export interface BridgeActions {
  /** Send a message to WebView (returns Promise with delivery confirmation) */
  sendMessage: (message: RNToWebViewMessage) => Promise<boolean>;
  /** Set avatar by preset ID */
  setAvatar: (avatarId: string, url?: string) => Promise<boolean>;
  /** Initialize with avatar config */
  initAvatar: (config: AvatarConfig) => Promise<boolean>;
  /** Take a snapshot */
  takeSnapshot: (options?: {
    format?: SnapshotFormat;
    quality?: number;
    width?: number;
    height?: number;
    transparent?: boolean;
  }) => Promise<string>;
  /** Set camera preset or position */
  setCamera: (
    presetOrPosition: CameraPreset | CameraPosition,
    duration?: number
  ) => Promise<boolean>;
  /** Set avatar pose */
  setPose: (pose: AvatarPose) => Promise<boolean>;
  /** Ping WebView and await pong */
  ping: () => Promise<number>;
  /** Reset bridge state */
  reset: () => void;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if a message is an RN → WebView message
 */
export function isRNToWebViewMessage(msg: unknown): msg is RNToWebViewMessage {
  if (!msg || typeof msg !== 'object') return false;
  const type = (msg as { type?: string }).type;
  return [
    'SET_AVATAR',
    'INIT_AVATAR',
    'SET_POSE',
    'SET_CAMERA',
    'SET_CAMERA_PRESET',
    'TAKE_SNAPSHOT',
    'SET_INTERACTIVE',
    'PING',
  ].includes(type || '');
}

/**
 * Check if a message is a WebView → RN message
 */
export function isWebViewToRNMessage(msg: unknown): msg is WebViewToRNMessage {
  if (!msg || typeof msg !== 'object') return false;
  const type = (msg as { type?: string }).type;
  return [
    'INIT_STARTED',
    'READY',
    'ACK',
    'LOADING_PROGRESS',
    'AVATAR_LOADING_PROGRESS',
    'AVATAR_LOADED',
    'AVATAR_APPLIED',
    'AVATAR_LOAD_ERROR',
    'SNAPSHOT_READY',
    'ERROR',
    'FPS_UPDATE',
    'PERF_REPORT',
    'PONG',
    'CAMERA_APPLIED',
    'CAMERA_PRESET_APPLIED',
    'INTERACTIVE_MODE_APPLIED',
    'CAMERA_TRANSITION_START',
    'CAMERA_TRANSITION_COMPLETE',
  ].includes(type || '');
}

/**
 * Check if a message is an error message
 */
export function isErrorMessage(msg: WebViewToRNMessage): msg is ErrorMessage {
  return msg.type === 'ERROR';
}

/**
 * Check if a message is a snapshot ready message
 */
export function isSnapshotReadyMessage(
  msg: WebViewToRNMessage
): msg is SnapshotReadyMessage {
  return msg.type === 'SNAPSHOT_READY';
}

/**
 * Check if a message is an avatar loading progress message
 */
export function isAvatarLoadingProgressMessage(
  msg: WebViewToRNMessage
): msg is AvatarLoadingProgressMessage {
  return msg.type === 'AVATAR_LOADING_PROGRESS';
}

/**
 * Check if a message is an avatar loaded message
 */
export function isAvatarLoadedMessage(
  msg: WebViewToRNMessage
): msg is AvatarLoadedMessage {
  return msg.type === 'AVATAR_LOADED';
}

/**
 * Check if a message is an avatar applied message
 */
export function isAvatarAppliedMessage(
  msg: WebViewToRNMessage
): msg is AvatarAppliedMessage {
  return msg.type === 'AVATAR_APPLIED';
}

/**
 * Check if a message is an avatar load error message
 */
export function isAvatarLoadErrorMessage(
  msg: WebViewToRNMessage
): msg is AvatarLoadErrorMessage {
  return msg.type === 'AVATAR_LOAD_ERROR';
}

/**
 * Check if a message is any avatar-related message
 */
export function isAvatarMessage(
  msg: WebViewToRNMessage
): msg is AvatarLoadingProgressMessage | AvatarLoadedMessage | AvatarAppliedMessage | AvatarLoadErrorMessage {
  return (
    msg.type === 'AVATAR_LOADING_PROGRESS' ||
    msg.type === 'AVATAR_LOADED' ||
    msg.type === 'AVATAR_APPLIED' ||
    msg.type === 'AVATAR_LOAD_ERROR'
  );
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a unique message ID for tracking
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse a message from string (with error handling)
 */
export function parseMessage<T extends RNToWebViewMessage | WebViewToRNMessage>(
  data: string
): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Serialize a message to string
 */
export function serializeMessage(
  message: RNToWebViewMessage | WebViewToRNMessage
): string {
  return JSON.stringify(message);
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default bridge options
 */
export const DEFAULT_BRIDGE_OPTIONS: Required<BridgeOptions> = {
  useAcknowledgment: true,
  timeout: 5000,
  maxRetries: 3,
  retryDelay: 1000,
  debug: false,
};

/**
 * Camera preset positions
 */
export const CAMERA_PRESETS: Record<
  CameraPreset,
  { position: CameraPosition; target: CameraPosition; fov: number; description: string }
> = {
  portrait: {
    position: [0, 1.5, 2.5],
    target: [0, 1.5, 0],
    fov: 45,
    description: 'Face focus - upper body view',
  },
  fullBody: {
    position: [0, 1, 4.5],
    target: [0, 1, 0],
    fov: 50,
    description: 'Full body view',
  },
  closeUp: {
    position: [0, 1.65, 1.5],
    target: [0, 1.65, 0],
    fov: 35,
    description: 'Face close-up view',
  },
  threeQuarter: {
    position: [1.5, 1.6, 2],
    target: [0, 1.5, 0],
    fov: 45,
    description: 'Three-quarter angle view',
  },
  profile: {
    position: [2.5, 1.5, 0],
    target: [0, 1.5, 0],
    fov: 45,
    description: 'Side profile view',
  },
};

/**
 * Protocol version for compatibility checks
 */
export const BRIDGE_PROTOCOL_VERSION = '1.0.0';
