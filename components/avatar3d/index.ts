/**
 * Avatar 3D Module
 *
 * WebView-based Three.js 3D avatar rendering system.
 * This module provides components for rendering interactive 3D avatars
 * that can be used in avatar creators and for generating static snapshots.
 *
 * Uses a preset-based avatar system where complete GLB models are loaded by ID.
 */

// Components
export { default as WebGL3DView } from './WebGL3DView';
export type { WebGL3DViewProps, WebGL3DViewRef, RenderMode } from './WebGL3DView';

// Avatar3DCreator component
export { Avatar3DCreator, default as Avatar3DCreatorDefault } from './Avatar3DCreator';
export type { Avatar3DCreatorProps } from './Avatar3DCreator';

// R3F Bundle
export { R3F_BUNDLE_HTML } from './r3fBundle';

// Bridge Types
export type {
  // Message types
  RNToWebViewMessage,
  WebViewToRNMessage,
  SetAvatarMessage,
  InitAvatarMessage,
  SetPoseMessage,
  SetCameraMessage,
  SetCameraPresetMessage,
  TakeSnapshotMessage,
  SetInteractiveMessage,
  PingMessage,
  InitStartedMessage,
  ReadyMessage,
  AckMessage,
  LoadingProgressMessage,
  AvatarLoadingProgressMessage,
  AvatarLoadedMessage,
  AvatarAppliedMessage,
  AvatarLoadErrorMessage,
  SnapshotReadyMessage,
  ErrorMessage,
  FPSUpdateMessage,
  PerfReportMessage,
  PongMessage,
  CameraAppliedMessage,
  CameraPresetAppliedMessage,
  InteractiveModeAppliedMessage,
  CameraTransitionStartMessage,
  CameraTransitionCompleteMessage,
  // Shared types
  CameraPreset,
  CameraPosition,
  AvatarPose,
  SnapshotFormat,
  BridgeErrorCode,
  BridgeStatus,
  BridgeOptions,
  BridgeState,
  BridgeActions,
  PendingMessage,
} from './types';

export {
  // Type guards
  isRNToWebViewMessage,
  isWebViewToRNMessage,
  isErrorMessage,
  isSnapshotReadyMessage,
  isAvatarLoadingProgressMessage,
  isAvatarLoadedMessage,
  isAvatarAppliedMessage,
  isAvatarLoadErrorMessage,
  isAvatarMessage,
  // Utilities
  generateMessageId,
  parseMessage,
  serializeMessage,
  // Constants
  DEFAULT_BRIDGE_OPTIONS,
  CAMERA_PRESETS,
  BRIDGE_PROTOCOL_VERSION,
} from './types';

// Bridge Hook
export { useBridge } from './useBridge';
export type { UseBridgeOptions } from './useBridge';


// Snapshot Hook
export {
  useSnapshot,
  default as useSnapshotDefault,
  SNAPSHOT_SIZE_PRESETS,
  getSnapshotSizePreset,
  calculateOptimalSnapshotSize,
  stripBase64Prefix,
  addBase64Prefix,
  estimateBase64FileSize,
  formatFileSize,
} from './useSnapshot';
export type {
  SnapshotQuality,
  SnapshotRequestOptions,
  UseSnapshotOptions,
  UseSnapshotResult,
} from './useSnapshot';

// Snapshot Display Component
export {
  AvatarSnapshot,
  default as AvatarSnapshotDefault,
  // Size preset components
  XSAvatarSnapshot,
  SmAvatarSnapshot,
  MdAvatarSnapshot,
  LgAvatarSnapshot,
  XLAvatarSnapshot,
} from './AvatarSnapshot';
export type { AvatarSnapshotProps } from './AvatarSnapshot';
