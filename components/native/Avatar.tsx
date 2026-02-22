/**
 * Native Avatar Component
 *
 * Production-ready avatar with image loading, initials fallback, status indicator,
 * gradient ring decoration, group display, and full accessibility support.
 */

import React, { useState } from 'react';
import {
  View,
  Image,
  Text,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type StatusType = 'online' | 'offline' | 'away' | 'none';

export interface AvatarProps {
  source?: { uri: string } | number;
  name?: string;
  size?: AvatarSize;
  status?: StatusType;
  showRing?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
}

// ============================================================================
// AVATAR COMPONENT
// ============================================================================

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'md',
  status = 'none',
  showRing = false,
  onPress,
  style,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Size configuration
  const sizeConfig = SIZE_CONFIG[size];
  const containerSize = sizeConfig.size;
  const fontSize = sizeConfig.fontSize;
  const statusDotSize = sizeConfig.statusDot;

  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // Extract initials from name
  const getInitials = (name?: string): string => {
    if (!name) return '';

    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(name);
  const shouldShowImage = source && !imageError;
  const shouldShowInitials = !shouldShowImage && initials;
  const shouldShowPlaceholder = !shouldShowImage && !initials;

  // Status color
  const statusColor = STATUS_COLORS[status];

  // Accessibility
  const accessibilityLabel = name ? `${name}'s avatar` : 'Avatar';

  // Container with optional ring
  const containerStyle = [
    styles.container,
    {
      width: containerSize,
      height: containerSize,
    },
    showRing && {
      padding: 2,
      borderWidth: 2,
      borderColor: colors.primary[500],
    },
    style,
  ];

  // Avatar content container
  const avatarStyle = [
    styles.avatar,
    {
      width: showRing ? containerSize - 8 : containerSize,
      height: showRing ? containerSize - 8 : containerSize,
    },
  ];

  // Render content
  const renderContent = () => {
    if (shouldShowImage) {
      return (
        <>
          <Image
            source={source}
            style={[avatarStyle, styles.image]}
            onError={handleImageError}
            onLoad={handleImageLoad}
            accessibilityIgnoresInvertColors
          />
          {imageLoading && (
            <View style={[avatarStyle, styles.loadingPlaceholder]}>
              <View style={styles.pulse} />
            </View>
          )}
        </>
      );
    }

    if (shouldShowInitials) {
      return (
        <View style={[avatarStyle, styles.initialsContainer]}>
          <Text
            style={[styles.initialsText, { fontSize }]}
            numberOfLines={1}
          >
            {initials}
          </Text>
        </View>
      );
    }

    // Placeholder icon
    return (
      <View style={[avatarStyle, styles.placeholderContainer]}>
        <Ionicons
          name="person"
          size={fontSize * 1.2}
          color={colors.white}
        />
      </View>
    );
  };

  // Render status indicator
  const renderStatus = () => {
    if (status === 'none' || !statusColor) return null;

    return (
      <View
        style={[
          styles.statusContainer,
          {
            width: statusDotSize,
            height: statusDotSize,
            bottom: showRing ? 2 : 0,
            right: showRing ? 2 : 0,
          },
        ]}
      >
        <View
          style={[
            styles.statusDot,
            {
              width: statusDotSize,
              height: statusDotSize,
              backgroundColor: statusColor,
            },
          ]}
        />
      </View>
    );
  };

  // Wrap in pressable if onPress provided
  const content = (
    <View style={containerStyle}>
      {renderContent()}
      {renderStatus()}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          { opacity: pressed ? 0.7 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {content}
    </View>
  );
};

// ============================================================================
// AVATAR GROUP COMPONENT
// ============================================================================

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  children,
  max = 3,
  size = 'md',
  style,
}) => {
  const childrenArray = React.Children.toArray(children);
  const visibleAvatars = childrenArray.slice(0, max);
  const overflowCount = Math.max(0, childrenArray.length - max);

  const sizeConfig = SIZE_CONFIG[size];
  const avatarSize = sizeConfig.size;
  const overlapOffset = Math.floor(avatarSize * 0.25); // 25% overlap
  const fontSize = sizeConfig.fontSize;

  return (
    <View
      style={[styles.groupContainer, style]}
      accessibilityRole="group"
      accessibilityLabel={`Group of ${childrenArray.length} avatars`}
    >
      {visibleAvatars.map((child, index) => (
        <View
          key={index}
          style={{
            marginLeft: index > 0 ? -overlapOffset : 0,
            zIndex: visibleAvatars.length - index,
          }}
        >
          {React.isValidElement(child) && React.cloneElement(child, { size } as any)}
        </View>
      ))}

      {overflowCount > 0 && (
        <View
          style={[
            styles.overflowContainer,
            {
              width: avatarSize,
              height: avatarSize,
              marginLeft: -overlapOffset,
              zIndex: 0,
            },
          ]}
        >
          <Text
            style={[styles.overflowText, { fontSize }]}
            numberOfLines={1}
          >
            +{overflowCount}
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// CONSTANTS
// ============================================================================

const SIZE_CONFIG = {
  xs: {
    size: 24,
    fontSize: 10,
    statusDot: 8,
  },
  sm: {
    size: 32,
    fontSize: 12,
    statusDot: 10,
  },
  md: {
    size: 40,
    fontSize: 14,
    statusDot: 12,
  },
  lg: {
    size: 48,
    fontSize: 16,
    statusDot: 14,
  },
  xl: {
    size: 64,
    fontSize: 20,
    statusDot: 16,
  },
  '2xl': {
    size: 96,
    fontSize: 28,
    statusDot: 20,
  },
};

const STATUS_COLORS = {
  online: colors.success.main,
  offline: colors.neutral[500],
  away: colors.warning.main,
  none: undefined,
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: borderRadius.full,
  },

  avatar: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  loadingPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pulse: {
    width: '60%',
    height: '60%',
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface.cardElevated,
  },

  initialsContainer: {
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },

  initialsText: {
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  placeholderContainer: {
    backgroundColor: colors.neutral[500],
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusContainer: {
    position: 'absolute',
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.surface.background,
    backgroundColor: colors.surface.background,
  },

  statusDot: {
    borderRadius: borderRadius.full,
  },

  // Avatar Group styles
  groupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  overflowContainer: {
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface.background,
  },

  overflowText: {
    color: colors.text.muted,
    fontWeight: '600',
  },
});

export default Avatar;
