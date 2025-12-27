/**
 * Component Exports
 *
 * Central export point for all reusable UI components.
 * Import from this file for convenient access to all components.
 */

// Loading indicators
export {
  LoadingSpinner,
  FullScreenLoader,
  InlineLoader,
  type LoadingSpinnerProps,
} from './LoadingSpinner'

// Empty states
export {
  EmptyState,
  EmptyLedger,
  EmptyChats,
  NoMatches,
  NoSearchResults,
  ErrorState,
  type EmptyStateProps,
} from './EmptyState'

// Buttons
export {
  Button,
  PrimaryButton,
  SecondaryButton,
  OutlineButton,
  GhostButton,
  DangerButton,
  IconButton,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from './Button'

// Map
export {
  MapView,
  UserLocationMap,
  SatelliteMap,
  MinimalMap,
  StaticMap,
  createRegion,
  createMarker,
  getCenterCoordinates,
  getRegionForCoordinates,
  DEFAULT_REGION,
  ZOOM_DELTAS,
  MARKER_COLORS,
  type MapMarker,
  type MapViewProps,
} from './MapView'

// Location Picker
export {
  LocationPicker,
  type LocationPickerProps,
  type LocationItem,
} from './LocationPicker'

// Ready Player Me Avatar
export {
  SmallAvatarPreview,
  MediumAvatarPreview,
  LargeAvatarPreview,
  ReadyPlayerMeCreator,
  type StoredAvatar,
  type RPMAvatarData,
} from './ReadyPlayerMe'

// Selfie Camera
export {
  SelfieCamera,
  FullScreenSelfieCamera,
  CompactSelfieCamera,
  RequiredSelfieCamera,
  formatPhotoUri,
  getRecommendedQuality,
  DEFAULT_QUALITY,
  CAMERA_BUTTON_SIZES,
  type SelfieCameraProps,
  type PhotoResult,
} from './SelfieCamera'

// Post Card
export {
  PostCard,
  CompactPostCard,
  PostCardNoLocation,
  MatchablePostCard,
  PostCardListItem,
  createPostCardRenderer,
  formatRelativeTime,
  truncateText,
  getMatchColor,
  getMatchLabel,
  type PostCardProps,
  type PostCardListItemProps,
} from './PostCard'

// Chat Bubble
export {
  ChatBubble,
  ChatBubbleWithTimestamp,
  OwnChatBubble,
  ReceivedChatBubble,
  DateSeparator,
  ChatBubbleListItem,
  createChatBubbleRenderer,
  formatMessageTime,
  formatMessageDate,
  getBubblePosition,
  shouldShowDateSeparator,
  type ChatBubbleProps,
  type BubblePosition,
  type DateSeparatorProps,
  type ChatBubbleListItemProps,
} from './ChatBubble'

// Report Modal
export {
  ReportModal,
  ReportPostModal,
  ReportMessageModal,
  ReportUserModal,
  type ReportModalProps,
} from './ReportModal'

// Terms Modal
export {
  TermsModal,
  hasAcceptedTerms,
  getTermsAcceptanceTimestamp,
  type TermsModalProps,
} from './TermsModal'

// Offline Indicator
export {
  OfflineIndicator,
  ControlledOfflineIndicator,
  TopOfflineIndicator,
  BottomOfflineIndicator,
  SlowConnectionIndicator,
  MinimalOfflineIndicator,
  type OfflineIndicatorPosition,
  type OfflineIndicatorVariant,
  type OfflineIndicatorProps,
  type ControlledOfflineIndicatorProps,
} from './OfflineIndicator'

// Verified Badge
export {
  VerifiedBadge,
  type VerifiedBadgeProps,
} from './VerifiedBadge'

// Verification Prompt
export {
  VerificationPrompt,
  CompactVerificationPrompt,
  type VerificationPromptProps,
  type VerificationPromptVariant,
} from './VerificationPrompt'