/**
 * Centralized Icon Components
 *
 * Professional-grade icons using Lucide React, themed for the Backtrack app.
 * All icons use consistent sizing and styling that matches the design system.
 *
 * Theme colors:
 * - Primary: #FF6B47 (warm coral)
 * - Accent: #8B5CF6 (deep violet)
 */

import {
  ArrowLeft,
  MoreVertical,
  BadgeCheck,
  Paperclip,
  Smile,
  X,
  Ban,
  Flag,
  BellOff,
  Bell,
  Trash2,
  Image,
  Send,
  CheckCheck,
  Check,
  MessageSquare,
  Camera,
  FileText,
  Video,
  Music,
  ImageIcon,
  File,
  FileEdit,
  Search,
  SearchX,
  AlertTriangle,
  WifiOff,
  Star,
  MapPin,
  Clock,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Heart,
  HeartOff,
  Share2,
  Copy,
  Eye,
  EyeOff,
  Settings,
  User,
  Users,
  LogOut,
  RefreshCw,
  Loader2,
  Info,
  HelpCircle,
  ExternalLink,
  Home,
  Menu,
  Filter,
  SlidersHorizontal,
  Bookmark,
  BookmarkCheck,
  Navigation,
  Target,
  Crosshair,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Mail,
  Phone,
  Globe,
  Link,
  Unlink,
  Edit,
  Edit2,
  Edit3,
  Pencil,
  Save,
  Download,
  Upload,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Coffee,
  Utensils,
  ShoppingBag,
  Building2,
  Dumbbell,
  Music2,
  PartyPopper,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

// Re-export common icons with consistent naming
export {
  // Navigation
  ArrowLeft as BackIcon,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Home as HomeIcon,
  Menu as MenuIcon,

  // Actions
  MoreVertical as MoreActionsIcon,
  Plus as PlusIcon,
  Minus as MinusIcon,
  X as CloseIcon,
  Search as SearchIcon,
  Filter as FilterIcon,
  SlidersHorizontal as SettingsFilterIcon,
  Edit as EditIcon,
  Edit2 as EditIcon2,
  Edit3 as EditIcon3,
  Pencil as PencilIcon,
  Save as SaveIcon,
  Trash2 as TrashIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Share2 as ShareIcon,
  Copy as CopyIcon,
  ExternalLink as ExternalLinkIcon,
  RefreshCw as RefreshIcon,
  Loader2 as LoadingIcon,

  // Communication
  MessageSquare as MessageIcon,
  Send as SendIcon,
  Mail as MailIcon,
  Phone as PhoneIcon,

  // Media
  Camera as CameraIcon,
  Image as ImageIcon,
  ImageIcon as PhotoIcon,
  Video as VideoIcon,
  Music as AudioIcon,
  Music2 as MusicIcon,

  // Files
  FileText as DocumentIcon,
  File as FileIcon,
  FileEdit as FileEditIcon,
  Paperclip as AttachmentIcon,

  // User
  User as UserIcon,
  Users as UsersIcon,
  LogOut as LogOutIcon,
  Settings as SettingsIcon,

  // Status
  Check as CheckIcon,
  CheckCheck as DoubleCheckIcon,
  BadgeCheck as VerifiedIcon,
  AlertTriangle as WarningIcon,
  Info as InfoIcon,
  HelpCircle as HelpIcon,
  Ban as BlockIcon,
  Flag as ReportIcon,

  // Notifications
  Bell as BellIcon,
  BellOff as BellOffIcon,

  // Favorites
  Heart as HeartIcon,
  HeartOff as HeartOffIcon,
  Star as StarIcon,
  Bookmark as BookmarkIcon,
  BookmarkCheck as BookmarkCheckIcon,

  // Location
  MapPin as MapPinIcon,
  Navigation as NavigationIcon,
  Target as TargetIcon,
  Crosshair as CrosshairIcon,
  Globe as GlobeIcon,

  // Time
  Clock as ClockIcon,
  Calendar as CalendarIcon,

  // Security
  Shield as ShieldIcon,
  ShieldCheck as ShieldCheckIcon,
  ShieldAlert as ShieldAlertIcon,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,

  // Links
  Link as LinkIcon,
  Unlink as UnlinkIcon,

  // View
  Maximize2 as MaximizeIcon,
  Minimize2 as MinimizeIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RotateCw as RotateRightIcon,
  RotateCcw as RotateLeftIcon,

  // Venue Types
  Coffee as CoffeeIcon,
  Utensils as RestaurantIcon,
  ShoppingBag as ShoppingIcon,
  Building2 as BuildingIcon,
  Dumbbell as GymIcon,
  PartyPopper as PartyIcon,

  // Emoji/Expression
  Smile as EmojiIcon,

  // Connectivity
  WifiOff as OfflineIcon,
};

// Type for icon components
export type IconComponent = LucideIcon;

// Common icon props interface
export interface IconProps extends LucideProps {
  /** Icon size - defaults to 20 */
  size?: number;
  /** Icon color - defaults to currentColor */
  color?: string;
  /** Stroke width - defaults to 2 */
  strokeWidth?: number;
}

// Default icon props for consistency
const defaultIconProps: Partial<IconProps> = {
  size: 20,
  strokeWidth: 2,
};

/**
 * Icon wrapper for consistent sizing and styling
 */
export const Icon = forwardRef<
  SVGSVGElement,
  ComponentPropsWithoutRef<'svg'> & { icon: LucideIcon } & IconProps
>(({ icon: IconComponent, size = 20, strokeWidth = 2, className = '', ...props }, ref) => {
  return (
    <IconComponent
      ref={ref}
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
      {...props}
    />
  );
});

Icon.displayName = 'Icon';

/**
 * Specialized icons for empty states with larger sizing
 */
export const EmptyStateIcons = {
  NoPosts: forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <FileEdit
      ref={ref}
      size={48}
      strokeWidth={1.5}
      className="text-primary-400"
      aria-hidden="true"
      {...props}
    />
  )),

  NoMessages: forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <MessageSquare
      ref={ref}
      size={48}
      strokeWidth={1.5}
      className="text-accent-400"
      aria-hidden="true"
      {...props}
    />
  )),

  NoMatches: forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <Search
      ref={ref}
      size={48}
      strokeWidth={1.5}
      className="text-neutral-400"
      aria-hidden="true"
      {...props}
    />
  )),

  NoResults: forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <SearchX
      ref={ref}
      size={48}
      strokeWidth={1.5}
      className="text-neutral-400"
      aria-hidden="true"
      {...props}
    />
  )),

  Error: forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <AlertTriangle
      ref={ref}
      size={48}
      strokeWidth={1.5}
      className="text-error"
      aria-hidden="true"
      {...props}
    />
  )),

  NoFavorites: forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <Star
      ref={ref}
      size={48}
      strokeWidth={1.5}
      className="text-warning"
      aria-hidden="true"
      {...props}
    />
  )),

  Offline: forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <WifiOff
      ref={ref}
      size={48}
      strokeWidth={1.5}
      className="text-neutral-400"
      aria-hidden="true"
      {...props}
    />
  )),
};

// Add display names
EmptyStateIcons.NoPosts.displayName = 'EmptyStateIcons.NoPosts';
EmptyStateIcons.NoMessages.displayName = 'EmptyStateIcons.NoMessages';
EmptyStateIcons.NoMatches.displayName = 'EmptyStateIcons.NoMatches';
EmptyStateIcons.NoResults.displayName = 'EmptyStateIcons.NoResults';
EmptyStateIcons.Error.displayName = 'EmptyStateIcons.Error';
EmptyStateIcons.NoFavorites.displayName = 'EmptyStateIcons.NoFavorites';
EmptyStateIcons.Offline.displayName = 'EmptyStateIcons.Offline';

/**
 * Verified badge icon with blue background
 * Matches the chat header design
 */
export const VerifiedBadgeIcon = forwardRef<SVGSVGElement, IconProps & { badgeSize?: 'sm' | 'md' | 'lg' }>(
  ({ badgeSize = 'md', ...props }, ref) => {
    const sizes = {
      sm: 16,
      md: 20,
      lg: 24,
    };

    return (
      <span
        role="img"
        aria-label="Verified user"
        title="Verified user"
        className="inline-flex"
      >
        <svg
          ref={ref}
          width={sizes[badgeSize]}
          height={sizes[badgeSize]}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          {...props}
        >
          <circle cx="12" cy="12" r="12" fill="#3B82F6" />
          <path
            d="M7.5 12.5L10.5 15.5L16.5 9.5"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
);

VerifiedBadgeIcon.displayName = 'VerifiedBadgeIcon';

/**
 * Mute notification icon with slash
 */
export const MuteIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <BellOff ref={ref} size={20} strokeWidth={2} aria-hidden="true" {...props} />
));

MuteIcon.displayName = 'MuteIcon';

/**
 * Unmute notification icon
 */
export const UnmuteIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <Bell ref={ref} size={20} strokeWidth={2} aria-hidden="true" {...props} />
));

UnmuteIcon.displayName = 'UnmuteIcon';

/**
 * Clear/Delete icon for conversation clearing
 */
export const ClearIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <Trash2 ref={ref} size={20} strokeWidth={2} aria-hidden="true" {...props} />
));

ClearIcon.displayName = 'ClearIcon';

/**
 * Share photo icon
 */
export const SharePhotoIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <Image ref={ref} size={20} strokeWidth={2} aria-hidden="true" {...props} />
));

SharePhotoIcon.displayName = 'SharePhotoIcon';

/**
 * File type icon component
 * Returns appropriate icon based on file type
 */
export function FileTypeIcon({
  type,
  size = 20,
  ...props
}: { type: 'document' | 'video' | 'audio' | 'image' | 'other' } & IconProps) {
  const iconProps = { size, strokeWidth: 2, 'aria-hidden': true as const, ...props };

  switch (type) {
    case 'document':
      return <FileText {...iconProps} />;
    case 'video':
      return <Video {...iconProps} />;
    case 'audio':
      return <Music {...iconProps} />;
    case 'image':
      return <ImageIcon {...iconProps} />;
    default:
      return <File {...iconProps} />;
  }
}

/**
 * Single check icon for sent messages
 */
export const SingleCheckIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <Check ref={ref} size={16} strokeWidth={2} aria-hidden="true" {...props} />
));

SingleCheckIcon.displayName = 'SingleCheckIcon';

/**
 * Double check icon for read messages
 */
export const DoubleCheckIconComponent = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <CheckCheck ref={ref} size={16} strokeWidth={2} aria-hidden="true" {...props} />
));

DoubleCheckIconComponent.displayName = 'DoubleCheckIconComponent';

/**
 * Get venue type icon based on venue category
 */
export function getVenueTypeIcon(type: string, size = 20): React.ReactNode {
  const iconProps = { size, strokeWidth: 2, 'aria-hidden': true as const };

  switch (type.toLowerCase()) {
    case 'cafe':
    case 'coffee':
      return <Coffee {...iconProps} className="text-amber-600" />;
    case 'restaurant':
    case 'food':
      return <Utensils {...iconProps} className="text-orange-600" />;
    case 'bar':
    case 'nightclub':
      return <PartyPopper {...iconProps} className="text-purple-600" />;
    case 'gym':
    case 'fitness':
      return <Dumbbell {...iconProps} className="text-green-600" />;
    case 'store':
    case 'shopping':
      return <ShoppingBag {...iconProps} className="text-pink-600" />;
    default:
      return <Building2 {...iconProps} className="text-neutral-600" />;
  }
}

export default {
  Icon,
  EmptyStateIcons,
  VerifiedBadgeIcon,
  MuteIcon,
  UnmuteIcon,
  ClearIcon,
  SharePhotoIcon,
  FileTypeIcon,
  SingleCheckIcon,
  DoubleCheckIcon: DoubleCheckIconComponent,
  getVenueTypeIcon,
};
