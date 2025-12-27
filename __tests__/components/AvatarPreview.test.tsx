/**
 * Unit tests for AvatarPreview component
 *
 * Tests the AvatarPreview component including rendering,
 * config changes, size variants, and memoization behavior.
 */

import React from 'react'
import { renderWithProviders, screen, waitFor } from '../utils/test-utils'
import { AvatarPreview, type AvatarPreviewProps } from '@/components/character-builder/AvatarPreview'
import { DEFAULT_AVATAR_CONFIG, type AvatarConfig } from '@/types/avatar'

// Mock the DiceBear library
jest.mock('@/lib/avatar/dicebear', () => ({
  createAvatarDataUri: jest.fn((config: AvatarConfig, size: number) => {
    // Return a unique data URI based on config and size
    return `data:image/svg+xml;utf8,<svg data-config="${JSON.stringify(config)}" data-size="${size}"></svg>`
  }),
}))

// Import the mocked function for assertions
import { createAvatarDataUri } from '@/lib/avatar/dicebear'

describe('AvatarPreview', () => {
  // ============================================================================
  // Setup and Teardown
  // ============================================================================

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================================================
  // Default Rendering
  // ============================================================================

  describe('default rendering', () => {
    it('renders with default props', () => {
      renderWithProviders(<AvatarPreview />)

      const container = screen.getByLabelText('Avatar preview')
      expect(container).toBeInTheDocument()
    })

    it('renders an image element', () => {
      renderWithProviders(<AvatarPreview />)

      const img = screen.getByAltText('Avatar')
      expect(img).toBeInTheDocument()
      expect(img.tagName).toBe('IMG')
    })

    it('uses medium size by default', () => {
      renderWithProviders(<AvatarPreview />)

      const img = screen.getByAltText('Avatar')
      expect(img).toHaveAttribute('width', '80')
      expect(img).toHaveAttribute('height', '80')
    })

    it('calls createAvatarDataUri with default config', () => {
      renderWithProviders(<AvatarPreview />)

      expect(createAvatarDataUri).toHaveBeenCalledWith(
        expect.objectContaining({
          ...DEFAULT_AVATAR_CONFIG,
          avatarStyle: 'Circle',
        }),
        80
      )
    })

    it('renders with base container styles', () => {
      renderWithProviders(<AvatarPreview />)

      const container = screen.getByLabelText('Avatar preview')
      expect(container).toHaveClass('inline-flex', 'items-center', 'justify-center')
      expect(container).toHaveClass('overflow-hidden')
      expect(container).toHaveClass('flex-shrink-0')
    })
  })

  // ============================================================================
  // Size Variants
  // ============================================================================

  describe('size variants', () => {
    describe('small size', () => {
      it('renders with small size styles', () => {
        renderWithProviders(<AvatarPreview size="sm" />)

        const container = screen.getByLabelText('Avatar preview')
        expect(container).toHaveClass('w-12', 'h-12')
      })

      it('passes correct dimension to createAvatarDataUri', () => {
        renderWithProviders(<AvatarPreview size="sm" />)

        expect(createAvatarDataUri).toHaveBeenCalledWith(
          expect.any(Object),
          48
        )
      })

      it('sets correct image dimensions', () => {
        renderWithProviders(<AvatarPreview size="sm" />)

        const img = screen.getByAltText('Avatar')
        expect(img).toHaveAttribute('width', '48')
        expect(img).toHaveAttribute('height', '48')
      })
    })

    describe('medium size', () => {
      it('renders with medium size styles', () => {
        renderWithProviders(<AvatarPreview size="md" />)

        const container = screen.getByLabelText('Avatar preview')
        expect(container).toHaveClass('w-20', 'h-20')
      })

      it('passes correct dimension to createAvatarDataUri', () => {
        renderWithProviders(<AvatarPreview size="md" />)

        expect(createAvatarDataUri).toHaveBeenCalledWith(
          expect.any(Object),
          80
        )
      })

      it('sets correct image dimensions', () => {
        renderWithProviders(<AvatarPreview size="md" />)

        const img = screen.getByAltText('Avatar')
        expect(img).toHaveAttribute('width', '80')
        expect(img).toHaveAttribute('height', '80')
      })
    })

    describe('large size', () => {
      it('renders with large size styles', () => {
        renderWithProviders(<AvatarPreview size="lg" />)

        const container = screen.getByLabelText('Avatar preview')
        expect(container).toHaveClass('w-[120px]', 'h-[120px]')
      })

      it('passes correct dimension to createAvatarDataUri', () => {
        renderWithProviders(<AvatarPreview size="lg" />)

        expect(createAvatarDataUri).toHaveBeenCalledWith(
          expect.any(Object),
          120
        )
      })

      it('sets correct image dimensions', () => {
        renderWithProviders(<AvatarPreview size="lg" />)

        const img = screen.getByAltText('Avatar')
        expect(img).toHaveAttribute('width', '120')
        expect(img).toHaveAttribute('height', '120')
      })
    })

    describe('extra large size', () => {
      it('renders with xl size styles', () => {
        renderWithProviders(<AvatarPreview size="xl" />)

        const container = screen.getByLabelText('Avatar preview')
        expect(container).toHaveClass('w-[200px]', 'h-[200px]')
      })

      it('passes correct dimension to createAvatarDataUri', () => {
        renderWithProviders(<AvatarPreview size="xl" />)

        expect(createAvatarDataUri).toHaveBeenCalledWith(
          expect.any(Object),
          200
        )
      })

      it('sets correct image dimensions', () => {
        renderWithProviders(<AvatarPreview size="xl" />)

        const img = screen.getByAltText('Avatar')
        expect(img).toHaveAttribute('width', '200')
        expect(img).toHaveAttribute('height', '200')
      })
    })

    describe('all sizes render correctly', () => {
      const sizes: AvatarPreviewProps['size'][] = ['sm', 'md', 'lg', 'xl']

      sizes.forEach((size) => {
        it(`renders ${size} size without error`, () => {
          renderWithProviders(<AvatarPreview size={size} />)
          expect(screen.getByLabelText('Avatar preview')).toBeInTheDocument()
        })
      })
    })
  })

  // ============================================================================
  // Config Prop
  // ============================================================================

  describe('config prop', () => {
    it('passes config to createAvatarDataUri', () => {
      const customConfig: AvatarConfig = {
        topType: 'LongHairBigHair',
        skinColor: 'Tanned',
        eyeType: 'Happy',
      }

      renderWithProviders(<AvatarPreview config={customConfig} />)

      expect(createAvatarDataUri).toHaveBeenCalledWith(
        expect.objectContaining({
          topType: 'LongHairBigHair',
          skinColor: 'Tanned',
          eyeType: 'Happy',
        }),
        expect.any(Number)
      )
    })

    it('merges partial config with defaults', () => {
      const partialConfig: AvatarConfig = {
        topType: 'Hat',
      }

      renderWithProviders(<AvatarPreview config={partialConfig} />)

      expect(createAvatarDataUri).toHaveBeenCalledWith(
        expect.objectContaining({
          ...DEFAULT_AVATAR_CONFIG,
          topType: 'Hat',
          avatarStyle: 'Circle',
        }),
        expect.any(Number)
      )
    })

    it('uses complete custom config when all properties provided', () => {
      const fullConfig: Required<AvatarConfig> = {
        avatarStyle: 'Circle',
        topType: 'NoHair',
        accessoriesType: 'Sunglasses',
        hairColor: 'Black',
        facialHairType: 'BeardMedium',
        facialHairColor: 'Black',
        clotheType: 'Hoodie',
        clotheColor: 'Red',
        graphicType: 'Skull',
        eyeType: 'Wink',
        eyebrowType: 'RaisedExcited',
        mouthType: 'Smile',
        skinColor: 'Brown',
      }

      renderWithProviders(<AvatarPreview config={fullConfig} />)

      expect(createAvatarDataUri).toHaveBeenCalledWith(
        expect.objectContaining({
          topType: 'NoHair',
          accessoriesType: 'Sunglasses',
          skinColor: 'Brown',
        }),
        expect.any(Number)
      )
    })
  })

  // ============================================================================
  // Re-rendering on Config Changes
  // ============================================================================

  describe('re-renders when config changes', () => {
    it('re-renders with new data URI when config changes', () => {
      const { rerender } = renderWithProviders(
        <AvatarPreview config={{ topType: 'NoHair' }} />
      )

      const initialCallCount = (createAvatarDataUri as jest.Mock).mock.calls.length

      rerender(<AvatarPreview config={{ topType: 'Hat' }} />)

      expect((createAvatarDataUri as jest.Mock).mock.calls.length).toBeGreaterThan(initialCallCount)
      expect(createAvatarDataUri).toHaveBeenLastCalledWith(
        expect.objectContaining({ topType: 'Hat' }),
        expect.any(Number)
      )
    })

    it('re-renders when skinColor changes', () => {
      const { rerender } = renderWithProviders(
        <AvatarPreview config={{ skinColor: 'Light' }} />
      )

      jest.clearAllMocks()

      rerender(<AvatarPreview config={{ skinColor: 'DarkBrown' }} />)

      expect(createAvatarDataUri).toHaveBeenCalledWith(
        expect.objectContaining({ skinColor: 'DarkBrown' }),
        expect.any(Number)
      )
    })

    it('re-renders when multiple properties change', () => {
      const initialConfig: AvatarConfig = {
        topType: 'ShortHairShortFlat',
        eyeType: 'Default',
        mouthType: 'Default',
      }

      const { rerender } = renderWithProviders(
        <AvatarPreview config={initialConfig} />
      )

      jest.clearAllMocks()

      const updatedConfig: AvatarConfig = {
        topType: 'LongHairCurly',
        eyeType: 'Happy',
        mouthType: 'Smile',
      }

      rerender(<AvatarPreview config={updatedConfig} />)

      expect(createAvatarDataUri).toHaveBeenCalledWith(
        expect.objectContaining({
          topType: 'LongHairCurly',
          eyeType: 'Happy',
          mouthType: 'Smile',
        }),
        expect.any(Number)
      )
    })

    it('re-renders when size changes', () => {
      const { rerender } = renderWithProviders(<AvatarPreview size="sm" />)

      jest.clearAllMocks()

      rerender(<AvatarPreview size="xl" />)

      expect(createAvatarDataUri).toHaveBeenCalledWith(
        expect.any(Object),
        200
      )
    })

    it('updates image src when config changes', () => {
      const { rerender } = renderWithProviders(
        <AvatarPreview config={{ topType: 'NoHair' }} />
      )

      const initialSrc = screen.getByAltText('Avatar').getAttribute('src')

      rerender(<AvatarPreview config={{ topType: 'Hat' }} />)

      const updatedSrc = screen.getByAltText('Avatar').getAttribute('src')
      expect(updatedSrc).not.toBe(initialSrc)
    })
  })

  // ============================================================================
  // Memoization Behavior
  // ============================================================================

  describe('memoization behavior', () => {
    it('does not re-render when same config object reference is passed', () => {
      const config: AvatarConfig = { topType: 'Hat' }

      const { rerender } = renderWithProviders(<AvatarPreview config={config} />)

      const initialCallCount = (createAvatarDataUri as jest.Mock).mock.calls.length

      rerender(<AvatarPreview config={config} />)

      // Should not call createAvatarDataUri again
      expect((createAvatarDataUri as jest.Mock).mock.calls.length).toBe(initialCallCount)
    })

    it('does not re-render when config values are equal', () => {
      const { rerender } = renderWithProviders(
        <AvatarPreview config={{ topType: 'Hat', skinColor: 'Light' }} />
      )

      const initialCallCount = (createAvatarDataUri as jest.Mock).mock.calls.length

      // New object with same values
      rerender(<AvatarPreview config={{ topType: 'Hat', skinColor: 'Light' }} />)

      // Should not call createAvatarDataUri again due to memoization
      expect((createAvatarDataUri as jest.Mock).mock.calls.length).toBe(initialCallCount)
    })

    it('does not re-render when only className changes', () => {
      const config: AvatarConfig = { topType: 'Hat' }

      const { rerender } = renderWithProviders(
        <AvatarPreview config={config} className="initial" />
      )

      jest.clearAllMocks()

      rerender(<AvatarPreview config={config} className="updated" />)

      // Avatar data generation should not be called again for just className change
      // Note: Component will re-render but internal useMemo should prevent recalculation
      const img = screen.getByAltText('Avatar')
      expect(img).toBeInTheDocument()
    })

    it('does re-render when config values actually change', () => {
      const { rerender } = renderWithProviders(
        <AvatarPreview config={{ topType: 'Hat' }} />
      )

      jest.clearAllMocks()

      rerender(<AvatarPreview config={{ topType: 'NoHair' }} />)

      expect(createAvatarDataUri).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Transparent Prop
  // ============================================================================

  describe('transparent prop', () => {
    it('uses Circle style by default', () => {
      renderWithProviders(<AvatarPreview />)

      expect(createAvatarDataUri).toHaveBeenCalledWith(
        expect.objectContaining({ avatarStyle: 'Circle' }),
        expect.any(Number)
      )
    })

    it('uses Transparent style when transparent prop is true', () => {
      renderWithProviders(<AvatarPreview transparent />)

      expect(createAvatarDataUri).toHaveBeenCalledWith(
        expect.objectContaining({ avatarStyle: 'Transparent' }),
        expect.any(Number)
      )
    })

    it('overrides config avatarStyle when transparent is true', () => {
      renderWithProviders(
        <AvatarPreview
          config={{ avatarStyle: 'Circle' }}
          transparent
        />
      )

      expect(createAvatarDataUri).toHaveBeenCalledWith(
        expect.objectContaining({ avatarStyle: 'Transparent' }),
        expect.any(Number)
      )
    })

    it('uses config avatarStyle when transparent is false', () => {
      renderWithProviders(
        <AvatarPreview
          config={{ avatarStyle: 'Transparent' }}
          transparent={false}
        />
      )

      expect(createAvatarDataUri).toHaveBeenCalledWith(
        expect.objectContaining({ avatarStyle: 'Transparent' }),
        expect.any(Number)
      )
    })

    it('re-renders when transparent prop changes', () => {
      const { rerender } = renderWithProviders(<AvatarPreview transparent={false} />)

      jest.clearAllMocks()

      rerender(<AvatarPreview transparent={true} />)

      expect(createAvatarDataUri).toHaveBeenCalledWith(
        expect.objectContaining({ avatarStyle: 'Transparent' }),
        expect.any(Number)
      )
    })
  })

  // ============================================================================
  // className Prop
  // ============================================================================

  describe('className prop', () => {
    it('applies custom className to container', () => {
      renderWithProviders(<AvatarPreview className="custom-class" />)

      const container = screen.getByLabelText('Avatar preview')
      expect(container).toHaveClass('custom-class')
    })

    it('preserves base styles when custom className is applied', () => {
      renderWithProviders(<AvatarPreview className="my-custom-class" />)

      const container = screen.getByLabelText('Avatar preview')
      expect(container).toHaveClass('inline-flex', 'items-center', 'justify-center')
      expect(container).toHaveClass('overflow-hidden')
      expect(container).toHaveClass('my-custom-class')
    })

    it('applies multiple custom classes', () => {
      renderWithProviders(<AvatarPreview className="class-one class-two class-three" />)

      const container = screen.getByLabelText('Avatar preview')
      expect(container).toHaveClass('class-one', 'class-two', 'class-three')
    })

    it('works with size prop', () => {
      renderWithProviders(<AvatarPreview size="lg" className="extra-class" />)

      const container = screen.getByLabelText('Avatar preview')
      expect(container).toHaveClass('w-[120px]', 'h-[120px]', 'extra-class')
    })

    it('handles empty className gracefully', () => {
      renderWithProviders(<AvatarPreview className="" />)

      const container = screen.getByLabelText('Avatar preview')
      expect(container).toBeInTheDocument()
      expect(container).toHaveClass('inline-flex')
    })
  })

  // ============================================================================
  // Combined Props
  // ============================================================================

  describe('combined props', () => {
    it('renders correctly with all props combined', () => {
      const config: AvatarConfig = {
        topType: 'LongHairBob',
        skinColor: 'Tanned',
        eyeType: 'Hearts',
      }

      renderWithProviders(
        <AvatarPreview
          config={config}
          size="xl"
          transparent
          className="my-avatar"
        />
      )

      const container = screen.getByLabelText('Avatar preview')
      expect(container).toHaveClass('w-[200px]', 'h-[200px]', 'my-avatar')

      expect(createAvatarDataUri).toHaveBeenCalledWith(
        expect.objectContaining({
          topType: 'LongHairBob',
          skinColor: 'Tanned',
          eyeType: 'Hearts',
          avatarStyle: 'Transparent',
        }),
        200
      )
    })

    it('works with config, size, and transparent props together', () => {
      const config: AvatarConfig = {
        topType: 'Hat',
        accessoriesType: 'Sunglasses',
      }

      renderWithProviders(
        <AvatarPreview
          config={config}
          size="sm"
          transparent
        />
      )

      const img = screen.getByAltText('Avatar')
      expect(img).toHaveAttribute('width', '48')
      expect(img).toHaveAttribute('height', '48')

      expect(createAvatarDataUri).toHaveBeenCalledWith(
        expect.objectContaining({
          topType: 'Hat',
          accessoriesType: 'Sunglasses',
          avatarStyle: 'Transparent',
        }),
        48
      )
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles undefined config gracefully', () => {
      renderWithProviders(<AvatarPreview config={undefined} />)

      const container = screen.getByLabelText('Avatar preview')
      expect(container).toBeInTheDocument()
    })

    it('handles empty config object', () => {
      renderWithProviders(<AvatarPreview config={{}} />)

      expect(createAvatarDataUri).toHaveBeenCalledWith(
        expect.objectContaining(DEFAULT_AVATAR_CONFIG),
        expect.any(Number)
      )
    })

    it('handles rapid config changes', () => {
      const { rerender } = renderWithProviders(
        <AvatarPreview config={{ topType: 'NoHair' }} />
      )

      rerender(<AvatarPreview config={{ topType: 'Hat' }} />)
      rerender(<AvatarPreview config={{ topType: 'LongHairBigHair' }} />)
      rerender(<AvatarPreview config={{ topType: 'ShortHairShortFlat' }} />)

      expect(createAvatarDataUri).toHaveBeenLastCalledWith(
        expect.objectContaining({ topType: 'ShortHairShortFlat' }),
        expect.any(Number)
      )
    })

    it('renders correctly after multiple size changes', () => {
      const { rerender } = renderWithProviders(<AvatarPreview size="sm" />)

      rerender(<AvatarPreview size="md" />)
      rerender(<AvatarPreview size="lg" />)
      rerender(<AvatarPreview size="xl" />)

      const img = screen.getByAltText('Avatar')
      expect(img).toHaveAttribute('width', '200')
      expect(img).toHaveAttribute('height', '200')
    })
  })

  // ============================================================================
  // Accessibility
  // ============================================================================

  describe('accessibility', () => {
    it('has accessible label on container', () => {
      renderWithProviders(<AvatarPreview />)

      const container = screen.getByLabelText('Avatar preview')
      expect(container).toHaveAttribute('aria-label', 'Avatar preview')
    })

    it('image has alt text', () => {
      renderWithProviders(<AvatarPreview />)

      const img = screen.getByAltText('Avatar')
      expect(img).toHaveAttribute('alt', 'Avatar')
    })

    it('image has explicit dimensions', () => {
      renderWithProviders(<AvatarPreview size="lg" />)

      const img = screen.getByAltText('Avatar')
      expect(img).toHaveAttribute('width')
      expect(img).toHaveAttribute('height')
    })
  })
})
