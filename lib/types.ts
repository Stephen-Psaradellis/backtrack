/**
 * Application Types
 *
 * Central type definitions and re-exports for the Backtrack app.
 * Import from this file for convenience in application code.
 */

// ============================================================================
// RE-EXPORTS FROM TYPE MODULES
// ============================================================================

// Database entity types
export type {
  UUID,
  Timestamp,
  Profile,
  ProfileInsert,
  ProfileUpdate,
  Location,
  LocationInsert,
  LocationUpdate,
  LocationWithVisit,
  Post,
  PostInsert,
  PostUpdate,
  PostWithDetails,
  Conversation,
  ConversationInsert,
  ConversationUpdate,
  ConversationWithDetails,
  Message,
  MessageInsert,
  MessageUpdate,
  MessageWithSender,
  Block,
  BlockInsert,
  Report,
  ReportInsert,
  ReportUpdate,
  ReportedType,
  ReportStatus,
  Database,
} from '../types/database'

// Avatar types (2D component-based avatar system)
export type { Avatar2DConfig, StoredAvatar2D } from '../components/avatar2d/types'

// ============================================================================
// APPLICATION-SPECIFIC TYPES
// ============================================================================

/**
 * User role in the context of a post
 * - Producer: Created the post (looking for someone)
 * - Consumer: Browsing posts (might be the person being looked for)
 */
export type UserRole = 'producer' | 'consumer'

/**
 * Authentication state
 */
export interface AuthState {
  /** Whether the auth state is still being loaded */
  isLoading: boolean
  /** Whether the user is authenticated */
  isAuthenticated: boolean
  /** Current user's ID (if authenticated) */
  userId: string | null
  /** Current user's profile (if loaded) */
  profile: import('../types/database').Profile | null
}

/**
 * Location state from useLocation hook
 */
export interface LocationState {
  /** GPS latitude */
  latitude: number
  /** GPS longitude */
  longitude: number
  /** Whether location is currently loading */
  loading: boolean
  /** Error message if location failed */
  error: string | null
}

/**
 * Coordinates tuple for map operations
 */
export interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Region for map view
 */
export interface MapRegion extends Coordinates {
  latitudeDelta: number
  longitudeDelta: number
}


/**
 * API response wrapper for operations
 */
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  isLoading: boolean
}

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  page: number
  limit: number
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// ============================================================================
// FORM TYPES
// ============================================================================

/**
 * Auth form data
 */
export interface AuthFormData {
  email: string
  password: string
  confirmPassword?: string
}

/**
 * Create post form data
 */
export interface CreatePostFormData {
  locationId: string
  targetAvatar: import('../components/avatar2d/types').StoredAvatar2D | null
  note: string
  selfieUri: string | null
}

/**
 * Report form data
 */
export interface ReportFormData {
  reason: string
  additionalDetails?: string
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

/**
 * Root navigation params
 * Defines all screens and their expected parameters
 */
export type RootStackParamList = {
  Auth: undefined
  Home: undefined
  Profile: undefined
  CreatePost: { locationId?: string }
  Ledger: { locationId: string; locationName: string }
  PostDetail: { postId: string }
  Chat: { conversationId: string }
  ChatList: undefined
  AvatarCreator: undefined
}

/**
 * Tab navigation params
 */
export type TabParamList = {
  HomeTab: undefined
  ChatListTab: undefined
  ProfileTab: undefined
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Application error with code and message
 */
export interface AppError {
  code: string
  message: string
  details?: unknown
}

/**
 * Common error codes
 */
export const ERROR_CODES = {
  // Auth errors
  AUTH_INVALID_CREDENTIALS: 'auth/invalid-credentials',
  AUTH_EMAIL_IN_USE: 'auth/email-in-use',
  AUTH_WEAK_PASSWORD: 'auth/weak-password',
  AUTH_SESSION_EXPIRED: 'auth/session-expired',

  // Location errors
  LOCATION_PERMISSION_DENIED: 'location/permission-denied',
  LOCATION_UNAVAILABLE: 'location/unavailable',

  // Camera errors
  CAMERA_PERMISSION_DENIED: 'camera/permission-denied',
  CAMERA_UNAVAILABLE: 'camera/unavailable',

  // Network errors
  NETWORK_OFFLINE: 'network/offline',
  NETWORK_TIMEOUT: 'network/timeout',

  // Database errors
  DB_NOT_FOUND: 'db/not-found',
  DB_PERMISSION_DENIED: 'db/permission-denied',
  DB_VALIDATION_ERROR: 'db/validation-error',

  // Storage errors
  STORAGE_UPLOAD_FAILED: 'storage/upload-failed',
  STORAGE_FILE_TOO_LARGE: 'storage/file-too-large',

  // General errors
  UNKNOWN: 'unknown',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
