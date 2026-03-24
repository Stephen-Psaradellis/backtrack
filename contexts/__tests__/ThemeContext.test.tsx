/**
 * ThemeContext Tests
 *
 * Tests the theme context provider and hooks.
 * Validates theme token structure, hook return values, memoization, and rendering.
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'

// ============================================================================
// MOCKS
// ============================================================================

// Override the global react-native alias so we can control useColorScheme.
// vitest.config.ts aliases 'react-native' to __tests__/mocks/react-native.ts
// which already exports useColorScheme as () => 'light'. We re-mock here for
// explicit test-level clarity and to document the expected return value.
vi.mock('react-native', () => ({
  useColorScheme: vi.fn(() => 'light'),
}))

// Mock theme constants with realistic-shape stubs.
// The real constants/theme file is large; mocking keeps tests fast and
// independent of future design-token changes.
vi.mock('../../constants/theme', () => ({
  colors: {
    primary: { 500: '#FF6B47' },
    accent: { 500: '#8B5CF6' },
    neutral: { 900: '#1C1917' },
  },
  darkModeColors: {
    primary: { 500: '#FF8C6B' },
    background: '#0C0A09',
  },
  typography: {
    fontSizes: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20 },
    fontWeights: { regular: '400', bold: '700' },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  borderRadius: { sm: 4, md: 8, lg: 16, full: 9999 },
  shadows: { sm: { shadowOpacity: 0.1 }, md: { shadowOpacity: 0.2 } },
  animation: { duration: { fast: 200, normal: 300, slow: 500 } },
  gradients: { primary: ['#FF6B47', '#FF8C6B'] },
  buttonTokens: { primary: { backgroundColor: '#FF6B47' } },
  inputTokens: { default: { borderColor: '#D6D3D1' } },
  cardTokens: { default: { backgroundColor: '#FFFFFF' } },
}))

// ============================================================================
// IMPORTS (after mocks are registered)
// ============================================================================

import { ThemeProvider, useTheme, useThemeColors } from '../ThemeContext'

// ============================================================================
// HELPERS
// ============================================================================

/** Wraps a renderHook call inside ThemeProvider. */
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
)

// ============================================================================
// TESTS
// ============================================================================

describe('ThemeContext', () => {
  // --------------------------------------------------------------------------
  // 1. useTheme() returns a theme object with all expected keys
  // --------------------------------------------------------------------------

  it('useTheme() returns theme object with all expected top-level keys', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    const theme = result.current

    expect(theme).toHaveProperty('mode')
    expect(theme).toHaveProperty('colors')
    expect(theme).toHaveProperty('typography')
    expect(theme).toHaveProperty('spacing')
    expect(theme).toHaveProperty('borderRadius')
    expect(theme).toHaveProperty('shadows')
    expect(theme).toHaveProperty('animation')
    expect(theme).toHaveProperty('gradients')
    expect(theme).toHaveProperty('buttonTokens')
    expect(theme).toHaveProperty('inputTokens')
    expect(theme).toHaveProperty('cardTokens')
    expect(theme).toHaveProperty('darkModeColors')
  })

  // --------------------------------------------------------------------------
  // 2. Theme has colors, typography, spacing, borderRadius as non-null objects
  // --------------------------------------------------------------------------

  it('theme exposes colors, typography, spacing, and borderRadius as objects', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    const { colors, typography, spacing, borderRadius } = result.current

    // Each token group must be a plain object (not null, not a primitive)
    for (const [name, value] of [
      ['colors', colors],
      ['typography', typography],
      ['spacing', spacing],
      ['borderRadius', borderRadius],
    ] as const) {
      expect(value, `${name} should be an object`).not.toBeNull()
      expect(typeof value, `${name} should be typeof object`).toBe('object')
    }

    // Spot-check a few concrete values from the stub
    expect((colors as Record<string, unknown>).primary).toBeDefined()
    expect((typography as Record<string, unknown>).fontSizes).toBeDefined()
    expect((spacing as Record<string, unknown>).md).toBe(16)
    expect((borderRadius as Record<string, unknown>).full).toBe(9999)
  })

  // --------------------------------------------------------------------------
  // 3. useThemeColors() returns just the colors object
  // --------------------------------------------------------------------------

  it('useThemeColors() returns the identical colors reference as useTheme().colors', () => {
    const { result: themeResult } = renderHook(() => useTheme(), { wrapper })
    const { result: colorsResult } = renderHook(() => useThemeColors(), { wrapper })

    // Must be the exact same singleton – not a copy
    expect(colorsResult.current).toBe(themeResult.current.colors)

    // Sanity-check it is not the full theme object
    expect(colorsResult.current).not.toHaveProperty('mode')
    expect(colorsResult.current).not.toHaveProperty('typography')
  })

  // --------------------------------------------------------------------------
  // 4. Memoization: same context reference on re-render when mode is unchanged
  // --------------------------------------------------------------------------

  it('useTheme() returns the same memoized object reference on re-render', () => {
    const { result, rerender } = renderHook(() => useTheme(), { wrapper })

    const firstRef = result.current

    // Trigger a re-render of the host component without changing any inputs
    rerender()

    // useMemo([mode]) must preserve the reference when mode has not changed
    expect(result.current).toBe(firstRef)
  })

  // --------------------------------------------------------------------------
  // 5. ThemeProvider renders children (and provides context to them)
  // --------------------------------------------------------------------------

  it('ThemeProvider renders children and makes context available', () => {
    // renderHook mounts the hook inside the wrapper. If ThemeProvider did not
    // render its children, useTheme() would throw "must be used within a
    // ThemeProvider" and the test would fail automatically.
    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current).toBeDefined()
    // mode should be 'light' because useColorScheme mock returns 'light'
    expect(result.current.mode).toBe('light')
  })

  // --------------------------------------------------------------------------
  // Bonus: useTheme() throws when called outside provider
  // --------------------------------------------------------------------------

  it('useTheme() throws with a descriptive message when called outside ThemeProvider', () => {
    // Suppress React's own error boundary noise for this expected throw
    const originalConsoleError = console.error
    console.error = () => {}

    try {
      expect(() => renderHook(() => useTheme())).toThrow(
        'useTheme must be used within a ThemeProvider'
      )
    } finally {
      console.error = originalConsoleError
    }
  })
})
