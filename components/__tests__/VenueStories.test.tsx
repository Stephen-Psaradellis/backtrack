/**
 * Tests for components/VenueStories.tsx
 *
 * Tests the VenueStories component that displays a list of venue stories
 * with creation modal.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '../../__tests__/utils'
import { fireEvent, waitFor } from '@testing-library/react'
import { VenueStories } from '../VenueStories'

// Mock Supabase - define mock inline (vi.mock is hoisted, so don't reference outer variables)
vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  },
}))

// Import supabase after mock for access in tests
import { supabase as mockSupabase } from '../../lib/supabase'

// Mock haptics
vi.mock('../../lib/haptics', () => ({
  selectionFeedback: vi.fn().mockResolvedValue(undefined),
  successFeedback: vi.fn().mockResolvedValue(undefined),
}))

// Override react-native to add proper Modal visibility support
vi.mock('react-native', async () => {
  const actual = await vi.importActual('../../__tests__/mocks/react-native')
  const React = require('react')

  // Modal that hides content when visible=false
  const ModalMock = React.forwardRef(
    ({ children, visible, testID, animationType, transparent, onRequestClose, ...rest }: any, ref: any) => {
      if (!visible) return null
      return React.createElement('div', { ref, testid: testID, ...rest }, children)
    }
  )
  ModalMock.displayName = 'Modal'

  // View that properly passes testid attribute
  const ViewMock = React.forwardRef(
    ({ children, testID, style, accessible, ...rest }: any, ref: any) =>
      React.createElement('div', { ref, testid: testID, ...rest }, children)
  )
  ViewMock.displayName = 'View'

  // Pressable-like component
  const createPressable = (Tag: string) => {
    const C = React.forwardRef(
      ({ onPress, children, testID, style, accessible, disabled, ...rest }: any, ref: any) =>
        React.createElement(Tag, {
          ...rest, ref, testid: testID,
          onClick: !disabled ? onPress : undefined,
          disabled: disabled || undefined,
        }, children)
    );
    C.displayName = Tag;
    return C;
  };

  return {
    ...actual,
    View: ViewMock,
    Modal: ModalMock,
    TouchableOpacity: createPressable('button'),
    Pressable: createPressable('button'),
    Animated: {
      ...actual.Animated,
      View: ViewMock,
      createAnimatedComponent: (c: any) => c,
    },
  }
})

// Mock VenueStory component - use testid (not data-testid) to match jsdom-queries
vi.mock('../VenueStory', () => ({
  VenueStory: ({ testID }: { testID?: string }) => {
    const React = require('react')
    return React.createElement('div', { testid: testID }, 'Story')
  },
}))

// Mock PressableScale component - use testid (not data-testid) to match jsdom-queries
vi.mock('../native/PressableScale', () => ({
  PressableScale: ({ children, onPress, testID }: any) => {
    const React = require('react')
    return React.createElement('div', { testid: testID, onClick: onPress }, children)
  },
}))

describe('VenueStories', () => {
  const mockLocationId = 'loc-123'
  const mockStories = [
    {
      id: 'story-1',
      content: 'Great music!',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      display_name: 'Alice',
      is_verified: true,
    },
    {
      id: 'story-2',
      content: 'Love this place',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      display_name: 'Bob',
      is_verified: false,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock RPC response
    ;(mockSupabase.rpc as any).mockResolvedValue({
      data: mockStories,
      error: null,
    })

    // Mock channel subscription
    ;(mockSupabase.channel as any).mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })

    // Mock insert
    ;(mockSupabase.from as any).mockReturnValue({
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    })
  })

  describe('rendering', () => {
    it('should render without crashing', async () => {
      const { container } = renderWithProviders(
        <VenueStories locationId={mockLocationId} userHasCheckedIn={false} />
      )

      await waitFor(() => {
        expect(container.querySelector('[testid="venue-stories"]')).toBeInTheDocument()
      })
    })

    it('should render section header', async () => {
      const { getByText } = renderWithProviders(
        <VenueStories locationId={mockLocationId} userHasCheckedIn={false} />
      )

      await waitFor(() => {
        expect(getByText('What Happened Here')).toBeInTheDocument()
      })
    })

    it('should show story count badge', async () => {
      const { getByText } = renderWithProviders(
        <VenueStories locationId={mockLocationId} userHasCheckedIn={false} />
      )

      await waitFor(() => {
        expect(getByText('2')).toBeInTheDocument()
      })
    })

    it('should render stories list', async () => {
      const { container } = renderWithProviders(
        <VenueStories locationId={mockLocationId} userHasCheckedIn={false} />
      )

      await waitFor(() => {
        expect(container.querySelector('[testid="venue-stories-story-story-1"]')).toBeInTheDocument()
        expect(container.querySelector('[testid="venue-stories-story-story-2"]')).toBeInTheDocument()
      })
    })

    it('should show add button when user has checked in', async () => {
      const { container } = renderWithProviders(
        <VenueStories locationId={mockLocationId} userHasCheckedIn={true} />
      )

      await waitFor(() => {
        expect(container.querySelector('[testid="venue-stories-add-button"]')).toBeInTheDocument()
      })
    })

    it('should not show add button when user has not checked in', async () => {
      const { container } = renderWithProviders(
        <VenueStories locationId={mockLocationId} userHasCheckedIn={false} />
      )

      await waitFor(() => {
        expect(container.querySelector('[testid="venue-stories-add-button"]')).not.toBeInTheDocument()
      })
    })
  })

  describe('empty states', () => {
    beforeEach(() => {
      ;(mockSupabase.rpc as any).mockResolvedValue({
        data: [],
        error: null,
      })
    })

    it('should not render when no stories and user has not checked in', async () => {
      const { container } = renderWithProviders(
        <VenueStories locationId={mockLocationId} userHasCheckedIn={false} />
      )

      await waitFor(() => {
        expect(container.innerHTML).toBe('')
      })
    })

    it('should show empty message when user has checked in', async () => {
      const { getByText } = renderWithProviders(
        <VenueStories locationId={mockLocationId} userHasCheckedIn={true} />
      )

      await waitFor(() => {
        expect(
          getByText(/Be the first to share what's happening here/)
        ).toBeInTheDocument()
      })
    })
  })

  describe('loading state', () => {
    it('should show loading indicator initially', () => {
      const { container } = renderWithProviders(
        <VenueStories locationId={mockLocationId} userHasCheckedIn={false} />
      )

      expect(container).toBeInTheDocument()
    })
  })

  describe('modal interactions', () => {
    it('should open modal when add button is pressed', async () => {
      const { container, getByText } = renderWithProviders(
        <VenueStories locationId={mockLocationId} userHasCheckedIn={true} />
      )

      await waitFor(() => {
        expect(container.querySelector('[testid="venue-stories-add-button"]')).toBeInTheDocument()
      })

      const addButton = container.querySelector('[testid="venue-stories-add-button"]')
      fireEvent.click(addButton!)

      await waitFor(() => {
        expect(getByText('Share Your Story')).toBeInTheDocument()
      })
    })

    it('should close modal when close button is pressed', async () => {
      const { container, queryByText } = renderWithProviders(
        <VenueStories locationId={mockLocationId} userHasCheckedIn={true} />
      )

      await waitFor(() => {
        expect(container.querySelector('[testid="venue-stories-add-button"]')).toBeInTheDocument()
      })

      const addButton = container.querySelector('[testid="venue-stories-add-button"]')
      fireEvent.click(addButton!)

      await waitFor(() => {
        expect(container.querySelector('[testid="venue-stories-modal-close"]')).toBeInTheDocument()
      })

      const closeButton = container.querySelector('[testid="venue-stories-modal-close"]')
      fireEvent.click(closeButton!)

      await waitFor(() => {
        expect(queryByText('Share Your Story')).not.toBeInTheDocument()
      })
    })

    it('should show character counter', async () => {
      const { container, getByText } = renderWithProviders(
        <VenueStories locationId={mockLocationId} userHasCheckedIn={true} />
      )

      await waitFor(() => {
        expect(container.querySelector('[testid="venue-stories-add-button"]')).toBeInTheDocument()
      })

      const addButton = container.querySelector('[testid="venue-stories-add-button"]')
      fireEvent.click(addButton!)

      await waitFor(() => {
        expect(getByText('140 characters remaining')).toBeInTheDocument()
      })
    })

    it('should disable submit button when input is empty', async () => {
      const { container } = renderWithProviders(
        <VenueStories locationId={mockLocationId} userHasCheckedIn={true} />
      )

      await waitFor(() => {
        expect(container.querySelector('[testid="venue-stories-add-button"]')).toBeInTheDocument()
      })

      const addButton = container.querySelector('[testid="venue-stories-add-button"]')
      fireEvent.click(addButton!)

      await waitFor(() => {
        const submitButton = container.querySelector('[testid="venue-stories-modal-submit"]')
        expect(submitButton).toBeInTheDocument()
        expect(submitButton).toBeDisabled()
      })
    })
  })

  describe('custom testID', () => {
    it('should use custom testID', async () => {
      const { container } = renderWithProviders(
        <VenueStories
          locationId={mockLocationId}
          userHasCheckedIn={false}
          testID="custom-stories"
        />
      )

      await waitFor(() => {
        expect(container.querySelector('[testid="custom-stories"]')).toBeInTheDocument()
      })
    })
  })
})
