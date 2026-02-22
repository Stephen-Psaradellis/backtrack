/**
 * Native Icon Component
 *
 * Wraps @expo/vector-icons Ionicons with semantic naming and theme integration.
 * Provides intent-based icon names (e.g., 'home', 'send', 'like') that map to
 * specific Ionicons, making the codebase more maintainable and consistent.
 *
 * Features:
 * - Semantic icon name mapping
 * - Theme-integrated colors
 * - Standard size variants (sm, md, lg)
 * - Accessibility support
 * - Direct Ionicons name passthrough
 */

import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

// ============================================================================
// SEMANTIC ICON MAPPING
// ============================================================================

/**
 * Maps semantic/intent-based names to Ionicons icon names.
 * Use these semantic names in the app to make intent clear and enable
 * easy icon changes across the app.
 */
export const ICON_MAP = {
  // Navigation
  'home': 'home-outline',
  'home-active': 'home',
  'chat': 'chatbubble-outline',
  'chat-active': 'chatbubble',
  'profile': 'person-outline',
  'profile-active': 'person',
  'settings': 'settings-outline',
  'settings-active': 'settings',
  'map': 'map-outline',
  'map-active': 'map',

  // Actions
  'check-in': 'location-outline',
  'check-in-active': 'location',
  'send': 'send-outline',
  'send-active': 'send',
  'like': 'heart-outline',
  'like-active': 'heart',
  'close': 'close-outline',
  'back': 'chevron-back',
  'forward': 'chevron-forward',
  'more': 'ellipsis-horizontal',
  'add': 'add-outline',
  'edit': 'create-outline',
  'delete': 'trash-outline',
  'search': 'search-outline',
  'filter': 'filter-outline',
  'camera': 'camera-outline',
  'image': 'image-outline',
  'refresh': 'refresh-outline',

  // Status
  'checkmark': 'checkmark',
  'checkmark-done': 'checkmark-done',
  'time': 'time-outline',
  'alert': 'alert-circle-outline',
  'info': 'information-circle-outline',
  'success': 'checkmark-circle',
  'error': 'close-circle',
  'warning': 'warning-outline',

  // Social
  'notification': 'notifications-outline',
  'notification-active': 'notifications',
  'share': 'share-outline',
  'block': 'ban-outline',
  'report': 'flag-outline',

  // Misc
  'location': 'navigate-outline',
  'calendar': 'calendar-outline',
  'lock': 'lock-closed-outline',
  'eye': 'eye-outline',
  'eye-off': 'eye-off-outline',
} as const;

// ============================================================================
// TYPES
// ============================================================================

export type SemanticIconName = keyof typeof ICON_MAP;
export type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Size variants with corresponding pixel values
 */
const ICON_SIZES = {
  sm: 18,
  md: 22,
  lg: 28,
} as const;

export interface IconProps {
  /**
   * Icon name - can be a semantic name (from ICON_MAP) or direct Ionicons name
   */
  name: SemanticIconName | IoniconsName;

  /**
   * Icon size - can be a size variant (sm/md/lg) or custom pixel value
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | number;

  /**
   * Icon color - defaults to theme's primary text color
   * @default colors.text.primary
   */
  color?: string;

  /**
   * Additional styles for the icon container
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Accessibility label - if provided, makes the icon accessible
   * By default, icons are decorative (accessible={false})
   */
  accessibilityLabel?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Icon component with semantic naming and theme integration
 *
 * @example
 * // Using semantic names
 * <Icon name="home" />
 * <Icon name="send-active" size="lg" color={colors.primary[500]} />
 *
 * @example
 * // Using direct Ionicons names
 * <Icon name="heart-outline" size={24} />
 *
 * @example
 * // With accessibility
 * <Icon name="close" accessibilityLabel="Close modal" />
 */
export function Icon({
  name,
  size = 'md',
  color = colors.text.primary,
  style,
  accessibilityLabel,
}: IconProps) {
  // Resolve size to pixel value
  const iconSize = typeof size === 'number' ? size : ICON_SIZES[size];

  // Resolve semantic name to Ionicons name, or use as-is if not in map
  const iconName = (name as SemanticIconName) in ICON_MAP
    ? ICON_MAP[name as SemanticIconName]
    : name;

  return (
    <Ionicons
      name={iconName as IoniconsName}
      size={iconSize}
      color={color}
      style={style}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default Icon;
