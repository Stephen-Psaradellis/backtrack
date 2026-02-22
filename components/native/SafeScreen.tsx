/**
 * SafeScreen Wrapper Component
 *
 * Standardized wrapper for screen-level components that handles:
 * - Safe area insets (top/bottom)
 * - Background color
 * - Status bar styling
 * - Optional horizontal padding
 * - Optional scroll behavior
 * - Optional keyboard avoiding behavior
 */

import React from 'react';
import {
  View,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../constants/theme';

export interface SafeScreenProps {
  children: React.ReactNode;
  /** Background color override (defaults to dark theme background) */
  backgroundColor?: string;
  /** Whether to apply top safe area padding (default true) */
  safeTop?: boolean;
  /** Whether to apply bottom safe area padding (default true) */
  safeBottom?: boolean;
  /** Status bar style (default 'light') */
  statusBarStyle?: 'light' | 'dark' | 'auto';
  /** Additional style */
  style?: StyleProp<ViewStyle>;
  /** Whether to add horizontal padding (default false) */
  padded?: boolean;
  /** Scroll content (wraps children in ScrollView) */
  scroll?: boolean;
  /** Keyboard avoiding behavior */
  keyboardAvoiding?: boolean;
}

export default function SafeScreen({
  children,
  backgroundColor = colors.surface.background,
  safeTop = true,
  safeBottom = true,
  statusBarStyle = 'light',
  style,
  padded = false,
  scroll = false,
  keyboardAvoiding = false,
}: SafeScreenProps) {
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    paddingTop: safeTop ? insets.top : 0,
    paddingBottom: safeBottom ? insets.bottom : 0,
    paddingHorizontal: padded ? spacing[4] : 0, // 16px
  };

  // Map statusBarStyle to React Native StatusBar values
  const barStyle =
    statusBarStyle === 'light'
      ? 'light-content'
      : statusBarStyle === 'dark'
        ? 'dark-content'
        : 'default';

  let content = (
    <View style={[containerStyle, style]}>
      <StatusBar barStyle={barStyle} />
      {children}
    </View>
  );

  if (scroll) {
    content = (
      <View style={[styles.flex, { backgroundColor }]}>
        <StatusBar barStyle={barStyle} />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{
            paddingTop: safeTop ? insets.top : 0,
            paddingBottom: safeBottom ? insets.bottom : 0,
            paddingHorizontal: padded ? spacing[4] : 0,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  if (keyboardAvoiding) {
    content = (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
