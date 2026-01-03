/**
 * Avatar Component
 *
 * Enhanced avatar with status indicators, gradient rings, and animations.
 */

import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius } from '../constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy' | 'none';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  showRing?: boolean;
  ringVariant?: 'primary' | 'accent' | 'gradient';
  fallback?: string;
  style?: ViewStyle;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SIZES: Record<AvatarSize, { container: number; status: number; ring: number; fontSize: number }> = {
  xs: { container: 24, status: 8, ring: 2, fontSize: 10 },
  sm: { container: 32, status: 10, ring: 2, fontSize: 12 },
  md: { container: 40, status: 12, ring: 2, fontSize: 14 },
  lg: { container: 48, status: 14, ring: 3, fontSize: 16 },
  xl: { container: 64, status: 16, ring: 3, fontSize: 20 },
  '2xl': { container: 96, status: 20, ring: 4, fontSize: 28 },
};

const STATUS_COLORS: Record<AvatarStatus, string> = {
  online: colors.success.main,
  offline: colors.neutral[400],
  away: colors.warning.main,
  busy: colors.error.main,
  none: 'transparent',
};

// ============================================================================
// COMPONENT
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({
  src,
  alt = 'Avatar',
  size = 'md',
  status = 'none',
  showRing = false,
  ringVariant = 'primary',
  fallback,
  style,
}: AvatarProps) {
  const config = SIZES[size];
  const hasImage = Boolean(src);
  const initials = fallback ? getInitials(fallback) : alt ? getInitials(alt) : '?';

  const containerSize = config.container + (showRing ? config.ring * 2 + 4 : 0);

  const renderAvatar = () => (
    <View
      style={[
        styles.avatarContainer,
        {
          width: config.container,
          height: config.container,
          borderRadius: config.container / 2,
        },
      ]}
    >
      {hasImage ? (
        <Image
          source={{ uri: src }}
          style={[
            styles.image,
            {
              width: config.container,
              height: config.container,
              borderRadius: config.container / 2,
            },
          ]}
        />
      ) : (
        <LinearGradient
          colors={[colors.primary[400], colors.accent[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.fallback,
            {
              width: config.container,
              height: config.container,
              borderRadius: config.container / 2,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: config.fontSize }]}>
            {initials}
          </Text>
        </LinearGradient>
      )}

      {status !== 'none' && (
        <View
          style={[
            styles.statusIndicator,
            {
              width: config.status,
              height: config.status,
              borderRadius: config.status / 2,
              backgroundColor: STATUS_COLORS[status],
              borderWidth: config.status > 12 ? 2 : 1.5,
            },
          ]}
        />
      )}
    </View>
  );

  if (showRing) {
    if (ringVariant === 'gradient') {
      return (
        <View style={[{ width: containerSize, height: containerSize }, style]}>
          <LinearGradient
            colors={[colors.primary[400], colors.accent[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.gradientRing,
              {
                width: containerSize,
                height: containerSize,
                borderRadius: containerSize / 2,
                padding: config.ring,
              },
            ]}
          >
            <View style={styles.ringInner}>
              {renderAvatar()}
            </View>
          </LinearGradient>
        </View>
      );
    }

    const ringColor = ringVariant === 'primary' ? colors.primary[500] : colors.accent[500];

    return (
      <View
        style={[
          styles.ring,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            borderWidth: config.ring,
            borderColor: ringColor,
            padding: 2,
          },
          style,
        ]}
      >
        {renderAvatar()}
      </View>
    );
  }

  return <View style={style}>{renderAvatar()}</View>;
}

// ============================================================================
// AVATAR GROUP
// ============================================================================

export interface AvatarGroupProps {
  avatars: Array<{ src?: string; alt?: string }>;
  max?: number;
  size?: AvatarSize;
  style?: ViewStyle;
}

export function AvatarGroup({
  avatars,
  max = 4,
  size = 'md',
  style,
}: AvatarGroupProps) {
  const config = SIZES[size];
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;
  const overlap = config.container * 0.3;

  return (
    <View style={[styles.group, style]}>
      {visibleAvatars.map((avatar, index) => (
        <View
          key={index}
          style={[
            styles.groupItem,
            {
              marginLeft: index > 0 ? -overlap : 0,
              zIndex: visibleAvatars.length - index,
            },
          ]}
        >
          <Avatar
            src={avatar.src}
            alt={avatar.alt}
            size={size}
            style={styles.groupAvatar}
          />
        </View>
      ))}

      {remainingCount > 0 && (
        <View
          style={[
            styles.groupItem,
            styles.groupCount,
            {
              marginLeft: -overlap,
              width: config.container,
              height: config.container,
              borderRadius: config.container / 2,
            },
          ]}
        >
          <Text style={[styles.groupCountText, { fontSize: config.fontSize * 0.8 }]}>
            +{remainingCount}
          </Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  avatarContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: colors.white,
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderColor: colors.white,
  },
  ring: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringInner: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupItem: {
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 9999,
  },
  groupAvatar: {},
  groupCount: {
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupCountText: {
    color: colors.neutral[600],
    fontWeight: '600',
  },
});

export default Avatar;
