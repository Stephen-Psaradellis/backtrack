/**
 * BacktrackLogo
 *
 * Simple text-based logo component for the Backtrack app.
 * Displays styled "BACKTRACK" text with consistent sizing options.
 */

import React from 'react';
import { Text, View, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { darkTheme } from '../../constants/glassStyles';

// ============================================================================
// TYPES
// ============================================================================

export type LogoSize = 'small' | 'medium' | 'large';

export interface BacktrackLogoProps {
  /** Size variant of the logo */
  size?: LogoSize;
  /** Custom color override */
  color?: string;
  /** Custom text style override */
  style?: TextStyle;
  /** Custom container style override */
  containerStyle?: ViewStyle;
  /** Show background container (default: true) */
  showBackground?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// SIZE CONFIGURATIONS
// ============================================================================

const LOGO_SIZES: Record<LogoSize, { fontSize: number; letterSpacing: number }> = {
  small: {
    fontSize: 16,
    letterSpacing: 2,
  },
  medium: {
    fontSize: 22,
    letterSpacing: 3,
  },
  large: {
    fontSize: 32,
    letterSpacing: 4,
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function BacktrackLogo({
  size = 'medium',
  color,
  style,
  containerStyle,
  showBackground = true,
  testID = 'backtrack-logo',
}: BacktrackLogoProps): React.ReactNode {
  const sizeConfig = LOGO_SIZES[size];

  const baseTextStyle = [
    styles.logo,
    {
      fontSize: sizeConfig.fontSize,
      letterSpacing: sizeConfig.letterSpacing,
    },
    style,
  ];

  // White outline offsets for stroke effect
  const outlineOffsets = [
    { top: -1, left: 0 },
    { top: 1, left: 0 },
    { top: 0, left: -1 },
    { top: 0, left: 1 },
    { top: -1, left: -1 },
    { top: -1, left: 1 },
    { top: 1, left: -1 },
    { top: 1, left: 1 },
  ];

  const logoContent = (
    <View style={styles.textContainer}>
      {/* White outline layers */}
      {outlineOffsets.map((offset, index) => (
        <Text
          key={index}
          style={[
            ...baseTextStyle,
            styles.outlineText,
            { top: offset.top, left: offset.left },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          BACKTRACK
        </Text>
      ))}
      {/* Main text on top */}
      <Text
        style={[
          ...baseTextStyle,
          { color: color || darkTheme.textPrimary },
        ]}
        testID={testID}
        accessibilityRole="text"
      >
        BACKTRACK
      </Text>
    </View>
  );

  if (showBackground) {
    return (
      <View style={[styles.container, containerStyle]}>
        {logoContent}
      </View>
    );
  }

  return logoContent;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textContainer: {
    position: 'relative',
  },
  logo: {
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  outlineText: {
    position: 'absolute',
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default BacktrackLogo;
