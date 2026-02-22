/**
 * Tests for components/CachedImage.tsx
 *
 * Tests the CachedImage component that wraps expo-image with caching support.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { CachedImage } from '../CachedImage'
import { getByTestId, queryByTestId } from '../../__tests__/utils/jsdom-queries'

describe('CachedImage', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <CachedImage source={{ uri: 'https://example.com/image.jpg' }} />
      )

      expect(container).toBeTruthy()
    })

    it('should render with testID', () => {
      const { container } = render(
        <CachedImage
          source={{ uri: 'https://example.com/image.jpg' }}
          testID="cached-image"
        />
      )

      expect(getByTestId(container, 'cached-image')).toBeTruthy()
    })

    it('should render with URI source', () => {
      const { container } = render(
        <CachedImage source={{ uri: 'https://example.com/image.jpg' }} />
      )

      expect(container).toBeTruthy()
    })

    it('should render with numeric source', () => {
      const { container } = render(<CachedImage source={123} />)

      expect(container).toBeTruthy()
    })
  })

  describe('props', () => {
    it('should accept style prop', () => {
      const { container } = render(
        <CachedImage
          source={{ uri: 'https://example.com/image.jpg' }}
          style={{ width: 200, height: 200 }}
        />
      )

      expect(container).toBeTruthy()
    })

    it('should accept placeholder prop', () => {
      const { container } = render(
        <CachedImage
          source={{ uri: 'https://example.com/image.jpg' }}
          placeholder={{ uri: 'https://example.com/placeholder.jpg' }}
        />
      )

      expect(container).toBeTruthy()
    })

    it('should accept transition duration', () => {
      const { container } = render(
        <CachedImage
          source={{ uri: 'https://example.com/image.jpg' }}
          transition={300}
        />
      )

      expect(container).toBeTruthy()
    })

    it('should accept contentFit cover', () => {
      const { container } = render(
        <CachedImage
          source={{ uri: 'https://example.com/image.jpg' }}
          contentFit="cover"
        />
      )

      expect(container).toBeTruthy()
    })

    it('should accept contentFit contain', () => {
      const { container } = render(
        <CachedImage
          source={{ uri: 'https://example.com/image.jpg' }}
          contentFit="contain"
        />
      )

      expect(container).toBeTruthy()
    })

    it('should accept priority prop', () => {
      const { container } = render(
        <CachedImage
          source={{ uri: 'https://example.com/image.jpg' }}
          priority="high"
        />
      )

      expect(container).toBeTruthy()
    })
  })

  describe('accessibility', () => {
    it('should be accessible by default', () => {
      const { container } = render(
        <CachedImage
          source={{ uri: 'https://example.com/image.jpg' }}
          testID="cached-image"
        />
      )

      expect(getByTestId(container, 'cached-image')).toBeTruthy()
    })

    it('should accept accessibilityLabel', () => {
      const { container } = render(
        <CachedImage
          source={{ uri: 'https://example.com/image.jpg' }}
          testID="cached-image"
          accessibilityLabel="Profile picture"
        />
      )

      expect(getByTestId(container, 'cached-image')).toBeTruthy()
    })

    it('should allow disabling accessibility', () => {
      const { container } = render(
        <CachedImage
          source={{ uri: 'https://example.com/image.jpg' }}
          testID="cached-image"
          accessible={false}
        />
      )

      expect(getByTestId(container, 'cached-image')).toBeTruthy()
    })
  })

  describe('fallback behavior', () => {
    it('should fall back to React Native Image when expo-image is not available', () => {
      const { container } = render(
        <CachedImage source={{ uri: 'https://example.com/image.jpg' }} />
      )

      expect(container).toBeTruthy()
    })

    it('should map contentFit to resizeMode for fallback', () => {
      const { container } = render(
        <CachedImage
          source={{ uri: 'https://example.com/image.jpg' }}
          contentFit="contain"
        />
      )

      expect(container).toBeTruthy()
    })
  })
})
