/**
 * Native Button Component
 *
 * A production-ready button component with 6 variants, 3 sizes,
 * press animations, haptic feedback, loading states, and full accessibility.
 */

import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  Animated,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '../../constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  children: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  style?: StyleProp<ViewStyle>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
}) => {
  // Animation
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Handlers
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (loading || disabled || !onPress) return;

    // Haptic feedback
    try {
      Haptics.selectionAsync();
    } catch (error) {
      // Silently fail if haptics not available
    }

    onPress();
  };

  // Style computations
  const isDisabled = disabled || loading;
  const variantStyles = styles[variant];
  const sizeStyles = styles[size];
  const iconSize = ICON_SIZES[size];
  const textSize = TEXT_SIZES[size];

  // Accessibility state
  const accessibilityState = {
    disabled: isDisabled,
    busy: loading,
  };

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={accessibilityState}
        accessibilityLabel={children}
        style={({ pressed }) => [
          styles.base,
          sizeStyles,
          variantStyles.base,
          isDisabled && styles.disabled,
          fullWidth && styles.fullWidth,
          // Platform-specific shadows for elevated variants
          (variant === 'primary' || variant === 'secondary' || variant === 'danger' || variant === 'success') &&
            !isDisabled &&
            styles.shadow,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variantStyles.textColor}
          />
        ) : (
          <View style={styles.content}>
            {leftIcon && (
              <Ionicons
                name={leftIcon as any}
                size={iconSize}
                color={variantStyles.textColor}
                style={styles.leftIcon}
              />
            )}
            <Text
              style={[
                styles.text,
                { fontSize: textSize, color: variantStyles.textColor },
              ]}
              numberOfLines={1}
            >
              {children}
            </Text>
            {rightIcon && (
              <Ionicons
                name={rightIcon as any}
                size={iconSize}
                color={variantStyles.textColor}
                style={styles.rightIcon}
              />
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

// ============================================================================
// CONSTANTS
// ============================================================================

const ICON_SIZES = {
  sm: 16,
  md: 20,
  lg: 22,
};

const TEXT_SIZES = {
  sm: 14,
  md: 16,
  lg: 18,
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Base styles
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  text: {
    fontWeight: '600',
  },

  leftIcon: {
    marginRight: spacing[2],
  },

  rightIcon: {
    marginLeft: spacing[2],
  },

  disabled: {
    opacity: 0.5,
  },

  fullWidth: {
    width: '100%',
  },

  // Size variants
  sm: {
    height: 36,
    paddingHorizontal: spacing[3],
  },

  md: {
    height: 44,
    paddingHorizontal: spacing[4],
  },

  lg: {
    height: 52,
    paddingHorizontal: spacing[5],
  },

  // Platform shadows
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  // Variant styles - primary
  primary: {
    base: {
      backgroundColor: colors.primary[500],
    },
    textColor: colors.white,
  },

  // Variant styles - secondary
  secondary: {
    base: {
      backgroundColor: colors.surface.card,
      borderWidth: 1,
      borderColor: colors.surface.border,
    },
    textColor: colors.text.primary,
  },

  // Variant styles - outline
  outline: {
    base: {
      backgroundColor: colors.transparent,
      borderWidth: 1,
      borderColor: colors.primary[500],
    },
    textColor: colors.primary[500],
  },

  // Variant styles - ghost
  ghost: {
    base: {
      backgroundColor: colors.transparent,
    },
    textColor: colors.text.primary,
  },

  // Variant styles - danger
  danger: {
    base: {
      backgroundColor: colors.error.main,
    },
    textColor: colors.white,
  },

  // Variant styles - success
  success: {
    base: {
      backgroundColor: colors.success.main,
    },
    textColor: colors.white,
  },
});

export default Button;
