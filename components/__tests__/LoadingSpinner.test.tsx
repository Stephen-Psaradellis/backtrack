/**
 * Tests for components/LoadingSpinner.tsx
 *
 * Tests the LoadingSpinner, FullScreenLoader, and InlineLoader components.
 * Uses @testing-library/react with mocked react-native components.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner, FullScreenLoader, InlineLoader } from '../LoadingSpinner'

// Mock react-native components to render as divs with data-testid
vi.mock('react-native', () => ({
  View: ({ children, testID, style, ...props }: React.PropsWithChildren<{ testID?: string; style?: unknown }>) => (
    <div data-testid={testID} data-style={JSON.stringify(style)} {...props}>{children}</div>
  ),
  Text: ({ children, testID, style, ...props }: React.PropsWithChildren<{ testID?: string; style?: unknown }>) => (
    <span data-testid={testID} data-style={JSON.stringify(style)} {...props}>{children}</span>
  ),
  ActivityIndicator: ({ testID, size, color, ...props }: { testID?: string; size?: string | number; color?: string }) => (
    <div data-testid={testID} data-size={size} data-color={color} {...props} />
  ),
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
}))

describe('LoadingSpinner', () => {
  describe('rendering', () => {
    it('should render with default props', () => {
      render(<LoadingSpinner />)

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.getByTestId('loading-spinner-indicator')).toBeInTheDocument()
    })

    it('should not render when visible is false', () => {
      render(<LoadingSpinner visible={false} />)

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    })

    it('should render when visible is true', () => {
      render(<LoadingSpinner visible={true} />)

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })
  })

  describe('message', () => {
    it('should not render message when not provided', () => {
      render(<LoadingSpinner />)

      expect(screen.queryByTestId('loading-spinner-message')).not.toBeInTheDocument()
    })

    it('should render message when provided', () => {
      render(<LoadingSpinner message="Loading..." />)

      expect(screen.getByTestId('loading-spinner-message')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should render custom message text', () => {
      render(<LoadingSpinner message="Please wait while we load your data" />)

      expect(screen.getByText('Please wait while we load your data')).toBeInTheDocument()
    })
  })

  describe('size', () => {
    it('should use large size by default', () => {
      render(<LoadingSpinner />)

      const indicator = screen.getByTestId('loading-spinner-indicator')
      expect(indicator).toHaveAttribute('data-size', 'large')
    })

    it('should accept small size', () => {
      render(<LoadingSpinner size="small" />)

      const indicator = screen.getByTestId('loading-spinner-indicator')
      expect(indicator).toHaveAttribute('data-size', 'small')
    })

    it('should accept numeric size', () => {
      render(<LoadingSpinner size={48} />)

      const indicator = screen.getByTestId('loading-spinner-indicator')
      expect(indicator).toHaveAttribute('data-size', '48')
    })
  })

  describe('color', () => {
    it('should use default color #FF6B47', () => {
      render(<LoadingSpinner />)

      const indicator = screen.getByTestId('loading-spinner-indicator')
      expect(indicator).toHaveAttribute('data-color', '#FF6B47')
    })

    it('should accept custom color', () => {
      render(<LoadingSpinner color="#FF3B30" />)

      const indicator = screen.getByTestId('loading-spinner-indicator')
      expect(indicator).toHaveAttribute('data-color', '#FF3B30')
    })
  })

  describe('fullScreen', () => {
    it('should not have fullScreen styles by default', () => {
      render(<LoadingSpinner />)
      const container = screen.getByTestId('loading-spinner')
      const style = JSON.parse(container.getAttribute('data-style') || '[]')

      // Check that it uses container styles (no flex: 1)
      const flatStyle = Array.isArray(style) ? style : [style]
      const hasFullScreenStyle = flatStyle.some(
        (s: Record<string, unknown>) => s && s.flex === 1
      )
      expect(hasFullScreenStyle).toBe(false)
    })

    it('should apply fullScreen styles when enabled', () => {
      render(<LoadingSpinner fullScreen />)
      const container = screen.getByTestId('loading-spinner')
      const style = JSON.parse(container.getAttribute('data-style') || '[]')

      // Check for flex: 1 which indicates fullScreen
      const flatStyle = Array.isArray(style) ? style : [style]
      const hasFullScreenStyle = flatStyle.some(
        (s: Record<string, unknown>) => s && s.flex === 1
      )
      expect(hasFullScreenStyle).toBe(true)
    })
  })

  describe('testID', () => {
    it('should use default testID', () => {
      render(<LoadingSpinner />)

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.getByTestId('loading-spinner-indicator')).toBeInTheDocument()
    })

    it('should use custom testID', () => {
      render(<LoadingSpinner testID="custom-loader" />)

      expect(screen.getByTestId('custom-loader')).toBeInTheDocument()
      expect(screen.getByTestId('custom-loader-indicator')).toBeInTheDocument()
    })

    it('should use custom testID for message', () => {
      render(<LoadingSpinner testID="custom-loader" message="Loading" />)

      expect(screen.getByTestId('custom-loader-message')).toBeInTheDocument()
    })
  })

  describe('style', () => {
    it('should merge custom style', () => {
      render(<LoadingSpinner style={{ marginTop: 20 }} />)
      const container = screen.getByTestId('loading-spinner')
      const style = JSON.parse(container.getAttribute('data-style') || '[]')

      // Custom style should be merged
      const flatStyle = Array.isArray(style) ? style : [style]
      const hasCustomStyle = flatStyle.some(
        (s: Record<string, unknown>) => s && s.marginTop === 20
      )
      expect(hasCustomStyle).toBe(true)
    })
  })
})

describe('FullScreenLoader', () => {
  it('should render with fullScreen enabled', () => {
    render(<FullScreenLoader />)
    const container = screen.getByTestId('loading-spinner')
    const style = JSON.parse(container.getAttribute('data-style') || '[]')

    const flatStyle = Array.isArray(style) ? style : [style]
    const hasFullScreenStyle = flatStyle.some(
      (s: Record<string, unknown>) => s && s.flex === 1
    )
    expect(hasFullScreenStyle).toBe(true)
  })

  it('should have default message "Loading..."', () => {
    render(<FullScreenLoader />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should accept custom message', () => {
    render(<FullScreenLoader message="Please wait..." />)

    expect(screen.getByText('Please wait...')).toBeInTheDocument()
  })

  it('should not render when visible is false', () => {
    render(<FullScreenLoader visible={false} />)

    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
  })

  it('should pass through other props', () => {
    render(<FullScreenLoader color="#00FF00" testID="fullscreen-loader" />)

    const indicator = screen.getByTestId('fullscreen-loader-indicator')
    expect(indicator).toHaveAttribute('data-color', '#00FF00')
  })
})

describe('InlineLoader', () => {
  it('should use small size by default', () => {
    render(<InlineLoader />)

    const indicator = screen.getByTestId('loading-spinner-indicator')
    expect(indicator).toHaveAttribute('data-size', 'small')
  })

  it('should use gray color #8E8E93 by default', () => {
    render(<InlineLoader />)

    const indicator = screen.getByTestId('loading-spinner-indicator')
    expect(indicator).toHaveAttribute('data-color', '#8E8E93')
  })

  it('should accept custom size', () => {
    render(<InlineLoader size="large" />)

    const indicator = screen.getByTestId('loading-spinner-indicator')
    expect(indicator).toHaveAttribute('data-size', 'large')
  })

  it('should accept custom color', () => {
    render(<InlineLoader color="#FF0000" />)

    const indicator = screen.getByTestId('loading-spinner-indicator')
    expect(indicator).toHaveAttribute('data-color', '#FF0000')
  })

  it('should apply inline styles', () => {
    render(<InlineLoader />)
    const container = screen.getByTestId('loading-spinner')
    const style = JSON.parse(container.getAttribute('data-style') || '[]')

    const flatStyle = Array.isArray(style) ? style : [style]
    const hasInlineStyle = flatStyle.some(
      (s: Record<string, unknown>) => s && s.padding === 0 && s.flexDirection === 'row'
    )
    expect(hasInlineStyle).toBe(true)
  })

  it('should not render when visible is false', () => {
    render(<InlineLoader visible={false} />)

    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
  })

  it('should render message when provided', () => {
    render(<InlineLoader message="Saving..." />)

    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })
})
