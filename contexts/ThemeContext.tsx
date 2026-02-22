import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  gradients,
  buttonTokens,
  inputTokens,
  cardTokens,
  darkModeColors,
} from '../constants/theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: typeof colors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  animation: typeof animation;
  gradients: typeof gradients;
  buttonTokens: typeof buttonTokens;
  inputTokens: typeof inputTokens;
  cardTokens: typeof cardTokens;
  darkModeColors: typeof darkModeColors;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const mode: ThemeMode = systemColorScheme === 'light' ? 'light' : 'dark';

  const value = useMemo(
    () => ({
      mode,
      colors,
      typography,
      spacing,
      borderRadius,
      shadows,
      animation,
      gradients,
      buttonTokens,
      inputTokens,
      cardTokens,
      darkModeColors,
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Convenience hook for just colors
 * Most commonly used hook for component styling
 */
export function useThemeColors() {
  const { colors } = useTheme();
  return colors;
}

export { ThemeContext };
