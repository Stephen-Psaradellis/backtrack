/**
 * Badge Component
 *
 * Modern badges for status, counts, and labels.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, borderRadius } from '../constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  label: string;
  dot?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
  default: { bg: colors.neutral[100], text: colors.neutral[700] },
  primary: { bg: colors.primary[100], text: colors.primary[700] },
  secondary: { bg: colors.accent[100], text: colors.accent[700] },
  success: { bg: colors.success.light, text: colors.success.dark },
  warning: { bg: colors.warning.light, text: colors.warning.dark },
  error: { bg: colors.error.light, text: colors.error.dark },
  outline: { bg: 'transparent', text: colors.neutral[600], border: colors.neutral[300] },
};

const SIZE_STYLES: Record<BadgeSize, { paddingH: number; paddingV: number; fontSize: number; dotSize: number }> = {
  sm: { paddingH: 8, paddingV: 2, fontSize: 10, dotSize: 6 },
  md: { paddingH: 10, paddingV: 4, fontSize: 12, dotSize: 8 },
  lg: { paddingH: 12, paddingV: 6, fontSize: 14, dotSize: 10 },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function Badge({
  variant = 'default',
  size = 'md',
  label,
  dot = false,
  style,
  textStyle,
}: BadgeProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: variantStyle.bg,
          paddingHorizontal: sizeStyle.paddingH,
          paddingVertical: sizeStyle.paddingV,
          borderWidth: variantStyle.border ? 1 : 0,
          borderColor: variantStyle.border,
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            {
              width: sizeStyle.dotSize,
              height: sizeStyle.dotSize,
              backgroundColor: variantStyle.text,
            },
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color: variantStyle.text,
            fontSize: sizeStyle.fontSize,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ============================================================================
// NOTIFICATION BADGE
// ============================================================================

export interface NotificationBadgeProps {
  count?: number;
  max?: number;
  showZero?: boolean;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  children: React.ReactNode;
}

export function NotificationBadge({
  count = 0,
  max = 99,
  showZero = false,
  size = 'md',
  style,
  children,
}: NotificationBadgeProps) {
  const showBadge = showZero || count > 0;
  const displayCount = count > max ? `${max}+` : String(count);

  const badgeSize = size === 'sm' ? 16 : 20;
  const fontSize = size === 'sm' ? 9 : 11;

  return (
    <View style={[styles.notificationContainer, style]}>
      {children}
      {showBadge && (
        <View
          style={[
            styles.notificationBadge,
            {
              minWidth: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
            },
          ]}
        >
          <Text style={[styles.notificationText, { fontSize }]}>
            {displayCount}
          </Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STATUS DOT
// ============================================================================

export type StatusDotVariant = 'online' | 'offline' | 'away' | 'busy';

export interface StatusDotProps {
  status: StatusDotVariant;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  style?: ViewStyle;
}

const STATUS_COLORS: Record<StatusDotVariant, string> = {
  online: colors.success.main,
  offline: colors.neutral[400],
  away: colors.warning.main,
  busy: colors.error.main,
};

export function StatusDot({
  status,
  size = 'md',
  pulse = false,
  style,
}: StatusDotProps) {
  const sizes = { sm: 8, md: 10, lg: 14 };
  const dotSize = sizes[size];

  return (
    <View
      style={[
        styles.statusDot,
        {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: STATUS_COLORS[status],
        },
        pulse && status === 'online' && styles.statusDotPulse,
        style,
      ]}
    />
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
  },
  dot: {
    borderRadius: 9999,
    marginRight: 6,
    opacity: 0.7,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  notificationContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error.main,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationText: {
    color: colors.white,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusDot: {
    borderWidth: 2,
    borderColor: colors.white,
  },
  statusDotPulse: {
    // Note: React Native doesn't support CSS animations natively
    // This would need to be implemented with Animated API for actual pulse effect
  },
});

export default Badge;
