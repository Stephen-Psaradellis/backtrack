/**
 * Ready Player Me Avatar Types
 *
 * Type definitions for Ready Player Me avatar integration.
 */

// ============================================================================
// Avatar Data Types
// ============================================================================

/**
 * Gender/body frame options
 */
export type RPMGender = 'male' | 'female' | 'neutral'

/**
 * Body type options
 */
export type RPMBodyType = 'fullbody' | 'halfbody'

/**
 * Metadata returned when avatar is exported
 */
export interface RPMAvatarMetadata {
  /** User's selected body type */
  bodyType: RPMBodyType
  /** User's selected gender/frame */
  gender: RPMGender
  /** Assets used in the avatar */
  assets?: Record<string, string>
}

/**
 * Complete avatar data returned from Ready Player Me
 */
export interface RPMAvatarData {
  /** Unique avatar ID */
  avatarId: string
  /** URL to the GLB 3D model */
  url: string
  /** User ID (if logged in) */
  userId?: string
  /** Avatar metadata */
  metadata?: RPMAvatarMetadata
}

/**
 * Avatar stored in database - simplified for our use case
 */
export interface StoredAvatar {
  /** Ready Player Me avatar ID */
  avatarId: string
  /** URL to the GLB model */
  modelUrl: string
  /** URL to the 2D rendered image */
  imageUrl: string
  /** Gender/body frame */
  gender: RPMGender
  /** Body type */
  bodyType: RPMBodyType
  /** When the avatar was created */
  createdAt: string
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Events emitted by Ready Player Me iframe
 */
export type RPMEventName =
  | 'v1.frame.ready'
  | 'v1.avatar.exported'
  | 'v2.avatar.exported'
  | 'v1.user.set'
  | 'v1.user.logout'

/**
 * Base event structure
 */
export interface RPMEvent {
  eventName: RPMEventName
  source: 'readyplayerme'
}

/**
 * Avatar exported event (v2)
 */
export interface RPMAvatarExportedEvent extends RPMEvent {
  eventName: 'v2.avatar.exported'
  data: RPMAvatarData
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Configuration options for the avatar creator
 */
export interface RPMCreatorConfig {
  /** Your Ready Player Me subdomain (without .readyplayer.me) */
  subdomain?: string
  /** Default body type */
  bodyType?: RPMBodyType
  /** Allow user to select body type */
  selectBodyType?: boolean
  /** Clear cache on load */
  clearCache?: boolean
  /** Language code (e.g., 'en', 'es', 'fr') */
  language?: string
  /** Quick start - skip intro screens */
  quickStart?: boolean
}

/**
 * Props for ReadyPlayerMeCreator component
 */
export interface ReadyPlayerMeCreatorProps {
  /** Called when avatar creation is complete */
  onAvatarCreated: (avatar: RPMAvatarData) => void
  /** Called when user cancels/closes */
  onClose?: () => void
  /** Configuration options */
  config?: RPMCreatorConfig
  /** Custom title for the header */
  title?: string
  /** Subtitle/description shown below the title */
  subtitle?: string
  /** Test ID for testing */
  testID?: string
}

/**
 * Props for RPMAvatarPreview component
 */
export interface RPMAvatarPreviewProps {
  /** Avatar ID or full model URL */
  avatarId: string
  /** Size in pixels */
  size?: number
  /** Additional style */
  style?: object
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// Render API Types
// ============================================================================

/**
 * Camera options for 2D render
 */
export type RPMCameraType = 'portrait' | 'fullbody'

/**
 * Expression/pose options
 */
export type RPMExpression = 'happy' | 'sad' | 'surprised' | 'angry' | 'neutral'

/**
 * Options for generating 2D render URL
 */
export interface RPMRenderOptions {
  /** Camera type */
  camera?: RPMCameraType
  /** Image size (pixels, max 1024) */
  size?: number
  /** Expression/emotion */
  expression?: RPMExpression
  /** Background color (hex without #) */
  background?: string
  /** Quality (0-100) */
  quality?: number
}
