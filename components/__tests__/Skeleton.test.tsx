/**
 * Skeleton Component Tests
 *
 * Tests for skeleton loading components using react-native-reanimated.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

// Mock react-native-reanimated with Easing included
vi.mock('react-native-reanimated', () => ({
  default: {
    View: 'Animated.View',
    Text: 'Animated.Text',
    createAnimatedComponent: (component: unknown) => component,
  },
  useSharedValue: (initial: unknown) => ({ value: initial }),
  useAnimatedStyle: (fn: () => unknown) => fn(),
  withRepeat: (animation: unknown) => animation,
  withTiming: (value: unknown) => value,
  Easing: {
    linear: (t: number) => t,
    ease: (t: number) => t,
    inOut: (fn: (t: number) => number) => fn,
    bezier: () => (t: number) => t,
  },
}))

import {
  Skeleton,
  SkeletonAvatar,
  SkeletonPostCard,
  SkeletonChatItem,
  SkeletonTextBlock,
} from '../Skeleton'

describe('Skeleton Components', () => {
  describe('Skeleton (base component)', () => {
    it('renders with default props', () => {
      const { container } = render(<Skeleton />)
      expect(container).toBeTruthy()
    })

    it('renders with custom width and height', () => {
      const { container } = render(<Skeleton width={200} height={50} />)
      expect(container).toBeTruthy()
    })

    it('renders with text variant', () => {
      const { container } = render(<Skeleton variant="text" />)
      expect(container).toBeTruthy()
    })

    it('renders with circle variant', () => {
      const { container } = render(<Skeleton variant="circle" />)
      expect(container).toBeTruthy()
    })

    it('renders with card variant', () => {
      const { container } = render(<Skeleton variant="card" />)
      expect(container).toBeTruthy()
    })

    it('renders with percentage width', () => {
      const { container } = render(<Skeleton width="50%" />)
      expect(container).toBeTruthy()
    })

    it('renders with custom border radius', () => {
      const { container } = render(<Skeleton borderRadius={8} />)
      expect(container).toBeTruthy()
    })
  })

  describe('SkeletonAvatar', () => {
    it('renders with default size', () => {
      const { container } = render(<SkeletonAvatar />)
      expect(container).toBeTruthy()
    })

    it('renders with custom size', () => {
      const { container } = render(<SkeletonAvatar size={64} />)
      expect(container).toBeTruthy()
    })
  })

  describe('SkeletonPostCard', () => {
    it('renders post card skeleton', () => {
      const { container } = render(<SkeletonPostCard />)
      expect(container).toBeTruthy()
    })

    it('renders with custom style', () => {
      const { container } = render(<SkeletonPostCard style={{ marginTop: 16 }} />)
      expect(container).toBeTruthy()
    })
  })

  describe('SkeletonChatItem', () => {
    it('renders chat item skeleton', () => {
      const { container } = render(<SkeletonChatItem />)
      expect(container).toBeTruthy()
    })

    it('renders with custom style', () => {
      const { container } = render(<SkeletonChatItem style={{ marginBottom: 8 }} />)
      expect(container).toBeTruthy()
    })
  })

  describe('SkeletonTextBlock', () => {
    it('renders with default lines (3)', () => {
      const { container } = render(<SkeletonTextBlock />)
      expect(container).toBeTruthy()
    })

    it('renders with custom number of lines', () => {
      const { container } = render(<SkeletonTextBlock lines={5} />)
      expect(container).toBeTruthy()
    })

    it('renders single line', () => {
      const { container } = render(<SkeletonTextBlock lines={1} />)
      expect(container).toBeTruthy()
    })
  })

  describe('Integration', () => {
    it('renders multiple skeleton post cards', () => {
      const { container } = render(
        <>
          <SkeletonPostCard />
          <SkeletonPostCard />
          <SkeletonPostCard />
        </>
      )
      expect(container).toBeTruthy()
    })

    it('renders multiple skeleton chat items', () => {
      const { container } = render(
        <>
          <SkeletonChatItem />
          <SkeletonChatItem />
          <SkeletonChatItem />
          <SkeletonChatItem />
          <SkeletonChatItem />
        </>
      )
      expect(container).toBeTruthy()
    })
  })
})
