/**
 * UI Components Index
 *
 * Central export point for all UI components (web).
 * Import components like: import { Button, Card, Avatar } from './'
 */

// Core interactive components
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Modal } from './Modal';
export type { ModalProps } from './Modal';

// Display components
export { Card, InteractiveCard, CardHeader, CardBody, CardFooter } from './Card';
export type { CardProps, InteractiveCardProps, CardHeaderProps, CardBodyProps, CardFooterProps } from './Card';

export { Avatar, AvatarGroup } from './Avatar';
export type { AvatarProps, AvatarGroupProps, AvatarSize, AvatarStatus } from './Avatar';

export { Badge, BadgeGroup, NotificationBadge } from './Badge';
export type { BadgeProps, BadgeGroupProps, NotificationBadgeProps, BadgeVariant, BadgeSize } from './Badge';

// Loading states
export {
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonList,
  SkeletonTable,
} from './Skeleton';
export type { SkeletonProps, SkeletonTextProps } from './Skeleton';

// Empty states
export { EmptyState } from './EmptyState';
export type { EmptyStateProps, EmptyStateVariant } from './EmptyState';

// Animation utilities
export { AnimatedList, AnimatedListItem } from './AnimatedList';
export type { AnimatedListProps, AnimatedListItemProps } from './AnimatedList';
