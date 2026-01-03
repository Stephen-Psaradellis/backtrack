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

// Map components
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
  RPMAvatarPreview,
  XSAvatarPreview,
  SmallAvatarPreview,
  MediumAvatarPreview,
  LargeAvatarPreview,
  XLAvatarPreview,
  FullBodyAvatarPreview,
  ReadyPlayerMeCreator,
  AVATAR_SIZES,
  type StoredAvatar,
  type RPMAvatarData,
  type RPMAvatarPreviewProps,
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
  formatRelativeTime,
  truncateText,
  getMatchColor,
  getMatchLabel,
  type PostCardProps,
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

// Onboarding Guard
export { OnboardingGuard } from './OnboardingGuard'

// Streak components
export {
  StreakBadge,
} from './streaks/StreakBadge'

export {
  StreakCard,
  LocationStreaksCard,
} from './streaks/StreakCard'

// Event attendance components
export {
  AttendanceButton,
} from './events/AttendanceButton'

export {
  AttendeesPreview,
  AttendeesCompact,
} from './events/AttendeesPreview'

// Regulars components
export {
  RegularCard,
  RegularAvatar,
} from './regulars/RegularCard'

export {
  FellowRegularsList,
  LocationRegularsList,
  RegularsPreview,
} from './regulars/RegularsList'

export {
  RegularsModeToggle,
  RegularsModeCompactToggle,
} from './regulars/RegularsModeToggle'

// Settings components
export { NotificationSettings } from './settings/NotificationSettings'

// Check-in button (tiered matching)
export {
  CheckinButton,
  type CheckinButtonProps,
} from './CheckinButton'

// Verification tier badge
export {
  VerificationTierBadge,
  useTierColor,
  useTierBgColor,
  type VerificationTierBadgeProps,
} from './VerificationTierBadge'

// Avatar component (with gradient rings and status indicators)
export {
  Avatar,
  AvatarGroup,
  type AvatarProps,
  type AvatarGroupProps,
  type AvatarSize,
  type AvatarStatus,
} from './Avatar'

// Badge components (modern badges and status dots)
export {
  Badge,
  NotificationBadge,
  StatusDot,
  type BadgeProps,
  type NotificationBadgeProps,
  type StatusDotProps,
  type BadgeVariant,
  type BadgeSize,
  type StatusDotVariant,
} from './Badge'

// Skeleton loading components (shimmer animation)
export {
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonButton,
  SkeletonList,
  type SkeletonProps,
  type SkeletonTextProps,
} from './Skeleton'

// Navigation components
export { AnimatedTabBar } from './navigation/AnimatedTabBar'
