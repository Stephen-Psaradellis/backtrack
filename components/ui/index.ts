/**
 * UI Components Index
 *
 * Central export point for UI components.
 * Note: Web-only components (Button, Card, Input, Badge, Icons) were removed.
 * Use the React Native equivalents in components/ instead.
 */

export { Modal } from './Modal';
export type { ModalProps } from './Modal';

export { Avatar, AvatarGroup } from './Avatar';
export type { AvatarProps, AvatarGroupProps, AvatarSize, AvatarStatus } from './Avatar';

// Loading states
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonPostCard,
  SkeletonChatItem,
  SkeletonList,
} from './Skeleton';
export type { SkeletonProps } from './Skeleton';

// Empty states
export { EmptyState } from './EmptyState';
export type { EmptyStateProps, EmptyStateVariant } from './EmptyState';

// Animation utilities
export { AnimatedList, AnimatedListItem } from './AnimatedList';
export type { AnimatedListProps, AnimatedListItemProps } from './AnimatedList';

// Cached Image (P-030)
export { CachedImage } from '../CachedImage';
export type { CachedImageProps } from '../CachedImage';
