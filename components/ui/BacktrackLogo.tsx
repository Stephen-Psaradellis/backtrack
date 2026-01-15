/**
 * BacktrackLogo
 *
 * Simple text-based logo component for the Backtrack app.
 * Displays styled "BACKTRACK" text with consistent sizing options.
 */

import React from 'react';
import { Text, StyleSheet, type TextStyle } from 'react-native';
import { colors } from '../../constants/theme';

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
  testID = 'backtrack-logo',
}: BacktrackLogoProps): React.ReactNode {
  const sizeConfig = LOGO_SIZES[size];

  return (
    <Text
      style={[
        styles.logo,
        {
          fontSize: sizeConfig.fontSize,
          letterSpacing: sizeConfig.letterSpacing,
          color: color || colors.neutral[900],
        },
        style,
      ]}
      testID={testID}
      accessibilityRole="text"
    >
      BACKTRACK
    </Text>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  logo: {
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});

export default BacktrackLogo;
