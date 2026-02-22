/**
 * Native TextInput Component with Floating Label
 *
 * Features:
 * - Floating label animation (Material Design inspired)
 * - Error states with shake animation
 * - Character counter
 * - Left/right icon support
 * - Multiline support
 * - Disabled state
 * - Full accessibility
 */

import React, { useRef, useEffect, forwardRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  Animated,
  Pressable,
  Text as RNText,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography } from '../../constants/theme';

export interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCharCount?: boolean;
  leftIcon?: string;    // Ionicons name
  rightIcon?: string;   // Ionicons name
  onRightIconPress?: () => void;
  multiline?: boolean;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  (
    {
      label,
      error,
      helperText,
      maxLength,
      showCharCount,
      leftIcon,
      rightIcon,
      onRightIconPress,
      multiline = false,
      disabled = false,
      containerStyle,
      value,
      onFocus,
      onBlur,
      ...rest
    },
    ref
  ) => {
    // Animation values
    const labelAnimation = useRef(new Animated.Value(value ? 1 : 0)).current;
    const shakeAnimation = useRef(new Animated.Value(0)).current;
    const [isFocused, setIsFocused] = React.useState(false);
    const prevError = useRef(error);

    // Handle focus
    const handleFocus = (e: any) => {
      setIsFocused(true);
      animateLabel(1);
      onFocus?.(e);
    };

    // Handle blur
    const handleBlur = (e: any) => {
      setIsFocused(false);
      if (!value) {
        animateLabel(0);
      }
      onBlur?.(e);
    };

    // Animate label position and size
    const animateLabel = (toValue: number) => {
      Animated.timing(labelAnimation, {
        toValue,
        duration: 200,
        useNativeDriver: false,
      }).start();
    };

    // Trigger shake animation when error appears
    useEffect(() => {
      if (error && !prevError.current) {
        // Error just appeared - shake the input
        Animated.sequence([
          Animated.timing(shakeAnimation, {
            toValue: -10,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnimation, {
            toValue: 10,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnimation, {
            toValue: -5,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnimation, {
            toValue: 5,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnimation, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }),
        ]).start();
      }
      prevError.current = error;
    }, [error]);

    // Update label position when value changes externally
    useEffect(() => {
      if (value && !isFocused) {
        animateLabel(1);
      } else if (!value && !isFocused) {
        animateLabel(0);
      }
    }, [value, isFocused]);

    // Calculate label styles
    const labelTop = labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [multiline ? 20 : 18, -8],
    });

    const labelFontSize = labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    });

    const labelColor = error
      ? colors.error.main
      : isFocused
      ? colors.primary[500]
      : labelAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [colors.text.muted, colors.text.secondary],
        });

    // Border color
    const borderColor = error
      ? colors.error.main
      : isFocused
      ? colors.primary[500]
      : colors.surface.border;

    // Character count
    const charCount = value?.length || 0;

    // Accessibility
    const accessibilityState = {
      disabled,
      ...(error && { error: true }),
    };

    const accessibilityHint = error || helperText;

    return (
      <View style={[styles.container, containerStyle]}>
        {/* Input container with shake animation */}
        <Animated.View
          style={[
            styles.inputContainer,
            {
              borderColor,
              opacity: disabled ? 0.5 : 1,
              minHeight: multiline ? 100 : 52,
              transform: [{ translateX: shakeAnimation }],
            },
            leftIcon && styles.withLeftIcon,
            rightIcon && styles.withRightIcon,
          ]}
        >
          {/* Left icon */}
          {leftIcon && (
            <View style={styles.leftIconContainer}>
              <Ionicons
                name={leftIcon as any}
                size={20}
                color={error ? colors.error.main : colors.text.muted}
              />
            </View>
          )}

          {/* Input wrapper for proper label positioning */}
          <View style={styles.inputWrapper}>
            {/* Floating label */}
            {label && (
              <Animated.Text
                style={[
                  styles.label,
                  {
                    top: labelTop,
                    fontSize: labelFontSize,
                    color: labelColor as any,
                  },
                ]}
              >
                {label}
              </Animated.Text>
            )}

            {/* Text input */}
            <RNTextInput
              ref={ref}
              style={[
                styles.input,
                multiline && styles.inputMultiline,
                { color: colors.text.primary },
              ]}
              value={value}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholderTextColor={colors.text.muted}
              editable={!disabled}
              multiline={multiline}
              maxLength={maxLength}
              accessibilityLabel={label}
              accessibilityState={accessibilityState}
              accessibilityHint={accessibilityHint}
              {...rest}
            />
          </View>

          {/* Right icon */}
          {rightIcon && (
            <Pressable
              style={styles.rightIconContainer}
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
            >
              <Ionicons
                name={rightIcon as any}
                size={20}
                color={error ? colors.error.main : colors.text.muted}
              />
            </Pressable>
          )}
        </Animated.View>

        {/* Bottom section: error/helper text and character count */}
        {(error || helperText || (showCharCount && maxLength)) && (
          <View style={styles.bottomSection}>
            <View style={styles.helperTextContainer}>
              {error ? (
                <RNText style={styles.errorText}>{error}</RNText>
              ) : helperText ? (
                <RNText style={styles.helperText}>{helperText}</RNText>
              ) : null}
            </View>

            {showCharCount && maxLength && (
              <RNText style={styles.charCount}>
                {charCount}/{maxLength}
              </RNText>
            )}
          </View>
        )}
      </View>
    );
  }
);

TextInput.displayName = 'TextInput';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderRadius: 12, // borderRadius.lg from theme (lg: 20 in theme, but we use 12 for inputs as per spec)
    paddingHorizontal: spacing[4], // 16
    paddingVertical: spacing[3], // 12
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  withLeftIcon: {
    paddingLeft: spacing[2], // 8, icon container adds more padding
  },
  withRightIcon: {
    paddingRight: spacing[2], // 8, icon container adds more padding
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    left: 0,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[1], // 4
    fontWeight: typography.fontWeight.medium as any,
  },
  input: {
    fontSize: typography.fontSize.base, // 16
    fontWeight: typography.fontWeight.normal as any,
    paddingTop: spacing[3], // 12 - space for floating label
    paddingBottom: 0,
    paddingHorizontal: 0,
    minHeight: 24,
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: spacing[4], // 16 - more space for multiline
  },
  leftIconContainer: {
    marginRight: spacing[2], // 8
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
  },
  rightIconContainer: {
    marginLeft: spacing[2], // 8
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing[1], // 4
    paddingHorizontal: spacing[1], // 4
  },
  helperTextContainer: {
    flex: 1,
  },
  errorText: {
    fontSize: typography.fontSize.xs, // 12
    color: colors.error.main,
    fontWeight: typography.fontWeight.normal as any,
  },
  helperText: {
    fontSize: typography.fontSize.xs, // 12
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.normal as any,
  },
  charCount: {
    fontSize: typography.fontSize.xs, // 12
    color: colors.text.muted,
    fontWeight: typography.fontWeight.normal as any,
    marginLeft: spacing[2], // 8
  },
});

export default TextInput;
