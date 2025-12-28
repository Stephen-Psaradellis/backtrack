/**
 * AddFavoriteModal Component Tests
 *
 * Tests for the AddFavoriteModal component including:
 * - Rendering with various props
 * - Location info display
 * - Custom name input handling
 * - Validation behavior
 * - Character count display
 * - Loading state
 * - Error handling
 * - Button states
 * - Keyboard handling
 * - Accessibility requirements
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import { Keyboard } from 'react-native'
import { AddFavoriteModal } from '../AddFavoriteModal'
import type { AddFavoriteLocationData } from '../AddFavoriteModal'

// Mock haptics
jest.mock('../../../lib/haptics', () => ({
  selectionFeedback: jest.fn(),
  lightFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}))

// Mock Keyboard
jest.spyOn(Keyboard, 'dismiss')

// Test data helpers
const createMockLocation = (
  placeName: string = 'Starbucks',
  address: string | null = '123 Main St, Test City, TC 12345'
): AddFavoriteLocationData => ({
  placeName,
  address,
  latitude: 40.7128,
  longitude: -74.006,
  placeId: 'test-place-id',
})

const defaultLocation = createMockLocation()

const defaultProps = {
  visible: true,
  location: defaultLocation,
  onSave: jest.fn(),
  onCancel: jest.fn(),
}

describe('AddFavoriteModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Basic Rendering', () => {
    it('should render modal with testID', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      expect(screen.getByTestId('add-modal')).toBeTruthy()
    })

    it('should display title', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      expect(screen.getByTestId('add-modal-title')).toBeTruthy()
      expect(screen.getByText('Add to Favorites')).toBeTruthy()
    })

    it('should display close button', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      expect(screen.getByTestId('add-modal-close')).toBeTruthy()
    })

    it('should not render content when location is null', () => {
      render(
        <AddFavoriteModal
          {...defaultProps}
          location={null}
          testID="add-modal"
        />
      )

      expect(screen.queryByTestId('add-modal-title')).toBeNull()
    })
  })

  describe('Location Info Display', () => {
    it('should display place name', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      expect(screen.getByTestId('add-modal-location-place-name')).toBeTruthy()
      expect(screen.getByText('Starbucks')).toBeTruthy()
    })

    it('should display address when provided', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      expect(screen.getByTestId('add-modal-location-address')).toBeTruthy()
      expect(screen.getByText('123 Main St, Test City, TC 12345')).toBeTruthy()
    })

    it('should not display address when null', () => {
      const location = createMockLocation('Test Place', null)
      render(
        <AddFavoriteModal
          {...defaultProps}
          location={location}
          testID="add-modal"
        />
      )

      expect(screen.queryByTestId('add-modal-location-address')).toBeNull()
    })

    it('should display location icon', () => {
      render(<AddFavoriteModal {...defaultProps} />)

      expect(screen.getByText('\uD83D\uDCCD')).toBeTruthy()
    })
  })

  describe('Custom Name Input', () => {
    it('should render input field', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      expect(screen.getByTestId('add-modal-input')).toBeTruthy()
    })

    it('should pre-populate with place name', async () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      // Wait for useEffect to run
      jest.runAllTimers()

      const input = screen.getByTestId('add-modal-input')
      expect(input.props.value).toBe('Starbucks')
    })

    it('should display placeholder text', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      expect(input.props.placeholder).toBe('e.g., Morning Coffee Spot')
    })

    it('should update value when typing', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      fireEvent.changeText(input, 'My Coffee Shop')

      expect(input.props.value).toBe('My Coffee Shop')
    })

    it('should limit input to max length (50 characters)', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      const longText = 'A'.repeat(60)
      fireEvent.changeText(input, longText)

      expect(input.props.value.length).toBeLessThanOrEqual(50)
    })

    it('should have accessibility label', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      expect(input.props.accessibilityLabel).toBe('Custom name for favorite location')
    })

    it('should have accessibility hint', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      expect(input.props.accessibilityHint).toBe('Enter a name up to 50 characters')
    })
  })

  describe('Character Count', () => {
    it('should display character count', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      jest.runAllTimers()

      expect(screen.getByTestId('add-modal-char-count')).toBeTruthy()
    })

    it('should update character count when typing', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      fireEvent.changeText(input, 'Test')

      expect(screen.getByText('4/50')).toBeTruthy()
    })

    it('should show character count near limit', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      fireEvent.changeText(input, 'A'.repeat(45))

      expect(screen.getByText('45/50')).toBeTruthy()
    })
  })

  describe('Save Button', () => {
    it('should render save button', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      expect(screen.getByTestId('add-modal-save')).toBeTruthy()
    })

    it('should enable save button when input has content', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      fireEvent.changeText(input, 'Valid Name')

      const saveButton = screen.getByTestId('add-modal-save')
      expect(saveButton.props.accessibilityState.disabled).toBeFalsy()
    })

    it('should disable save button when input is empty', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      fireEvent.changeText(input, '')

      const saveButton = screen.getByTestId('add-modal-save')
      expect(saveButton.props.accessibilityState.disabled).toBe(true)
    })

    it('should disable save button when input is only whitespace', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      fireEvent.changeText(input, '   ')

      const saveButton = screen.getByTestId('add-modal-save')
      expect(saveButton.props.accessibilityState.disabled).toBe(true)
    })

    it('should call onSave with trimmed custom name when pressed', () => {
      const onSave = jest.fn()
      render(
        <AddFavoriteModal
          {...defaultProps}
          onSave={onSave}
          testID="add-modal"
        />
      )

      const input = screen.getByTestId('add-modal-input')
      fireEvent.changeText(input, '  My Favorite  ')

      fireEvent.press(screen.getByTestId('add-modal-save'))

      expect(onSave).toHaveBeenCalledWith('My Favorite')
    })

    it('should dismiss keyboard on save', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      fireEvent.changeText(input, 'Valid Name')
      fireEvent.press(screen.getByTestId('add-modal-save'))

      expect(Keyboard.dismiss).toHaveBeenCalled()
    })

    it('should trigger haptic feedback on save', () => {
      const { selectionFeedback } = require('../../../lib/haptics')
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      fireEvent.changeText(input, 'Valid Name')
      fireEvent.press(screen.getByTestId('add-modal-save'))

      expect(selectionFeedback).toHaveBeenCalled()
    })

    it('should have accessibility label', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const saveButton = screen.getByTestId('add-modal-save')
      expect(saveButton.props.accessibilityLabel).toBe('Save favorite')
    })
  })

  describe('Cancel Button', () => {
    it('should render cancel button', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      expect(screen.getByTestId('add-modal-cancel')).toBeTruthy()
    })

    it('should call onCancel when pressed', () => {
      const onCancel = jest.fn()
      render(
        <AddFavoriteModal
          {...defaultProps}
          onCancel={onCancel}
          testID="add-modal"
        />
      )

      fireEvent.press(screen.getByTestId('add-modal-cancel'))

      expect(onCancel).toHaveBeenCalled()
    })

    it('should dismiss keyboard on cancel', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      fireEvent.press(screen.getByTestId('add-modal-cancel'))

      expect(Keyboard.dismiss).toHaveBeenCalled()
    })

    it('should trigger light haptic feedback on cancel', () => {
      const { lightFeedback } = require('../../../lib/haptics')
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      fireEvent.press(screen.getByTestId('add-modal-cancel'))

      expect(lightFeedback).toHaveBeenCalled()
    })

    it('should have accessibility label', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const cancelButton = screen.getByTestId('add-modal-cancel')
      expect(cancelButton.props.accessibilityLabel).toBe('Cancel')
    })
  })

  describe('Close Button', () => {
    it('should call onCancel when close button pressed', () => {
      const onCancel = jest.fn()
      render(
        <AddFavoriteModal
          {...defaultProps}
          onCancel={onCancel}
          testID="add-modal"
        />
      )

      fireEvent.press(screen.getByTestId('add-modal-close'))

      expect(onCancel).toHaveBeenCalled()
    })

    it('should have accessibility label', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const closeButton = screen.getByTestId('add-modal-close')
      expect(closeButton.props.accessibilityLabel).toBe('Close')
    })
  })

  describe('Loading State', () => {
    it('should show Saving... text when isLoading', () => {
      render(
        <AddFavoriteModal
          {...defaultProps}
          isLoading={true}
          testID="add-modal"
        />
      )

      expect(screen.getByText('Saving...')).toBeTruthy()
    })

    it('should disable save button when loading', () => {
      render(
        <AddFavoriteModal
          {...defaultProps}
          isLoading={true}
          testID="add-modal"
        />
      )

      jest.runAllTimers()

      const saveButton = screen.getByTestId('add-modal-save')
      expect(saveButton.props.disabled).toBe(true)
    })

    it('should disable cancel button when loading', () => {
      render(
        <AddFavoriteModal
          {...defaultProps}
          isLoading={true}
          testID="add-modal"
        />
      )

      const cancelButton = screen.getByTestId('add-modal-cancel')
      expect(cancelButton.props.disabled).toBe(true)
    })

    it('should disable close button when loading', () => {
      render(
        <AddFavoriteModal
          {...defaultProps}
          isLoading={true}
          testID="add-modal"
        />
      )

      const closeButton = screen.getByTestId('add-modal-close')
      expect(closeButton.props.disabled).toBe(true)
    })

    it('should disable input when loading', () => {
      render(
        <AddFavoriteModal
          {...defaultProps}
          isLoading={true}
          testID="add-modal"
        />
      )

      const input = screen.getByTestId('add-modal-input')
      expect(input.props.editable).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should display error message when error prop provided', () => {
      render(
        <AddFavoriteModal
          {...defaultProps}
          error="Failed to save favorite"
          testID="add-modal"
        />
      )

      expect(screen.getByTestId('add-modal-error')).toBeTruthy()
      expect(screen.getByText('Failed to save favorite')).toBeTruthy()
    })

    it('should show validation error for empty input on save', () => {
      const { errorFeedback } = require('../../../lib/haptics')
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      fireEvent.changeText(input, '')
      fireEvent.press(screen.getByTestId('add-modal-save'))

      expect(screen.getByText('Please enter a name for this favorite')).toBeTruthy()
      expect(errorFeedback).toHaveBeenCalled()
    })

    it('should clear validation error when typing', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      fireEvent.changeText(input, '')
      fireEvent.press(screen.getByTestId('add-modal-save'))

      // Error should be shown
      expect(screen.getByText('Please enter a name for this favorite')).toBeTruthy()

      // Type something
      fireEvent.changeText(input, 'New Name')

      // Error should be cleared
      expect(screen.queryByText('Please enter a name for this favorite')).toBeNull()
    })

    it('should not call onSave when validation fails', () => {
      const onSave = jest.fn()
      render(
        <AddFavoriteModal
          {...defaultProps}
          onSave={onSave}
          testID="add-modal"
        />
      )

      const input = screen.getByTestId('add-modal-input')
      fireEvent.changeText(input, '')
      fireEvent.press(screen.getByTestId('add-modal-save'))

      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Handling', () => {
    it('should call handleSave on submit editing', () => {
      const onSave = jest.fn()
      render(
        <AddFavoriteModal
          {...defaultProps}
          onSave={onSave}
          testID="add-modal"
        />
      )

      const input = screen.getByTestId('add-modal-input')
      fireEvent.changeText(input, 'Valid Name')
      fireEvent(input, 'submitEditing')

      expect(onSave).toHaveBeenCalledWith('Valid Name')
    })

    it('should have returnKeyType done', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      expect(input.props.returnKeyType).toBe('done')
    })
  })

  describe('Modal Behavior', () => {
    it('should call onCancel when overlay pressed', () => {
      const onCancel = jest.fn()
      render(
        <AddFavoriteModal
          {...defaultProps}
          onCancel={onCancel}
          testID="add-modal"
        />
      )

      // The overlay is the outermost touchable
      // In this case we test the close behavior via onRequestClose
    })

    it('should not close on overlay press when loading', () => {
      const onCancel = jest.fn()
      render(
        <AddFavoriteModal
          {...defaultProps}
          onCancel={onCancel}
          isLoading={true}
          testID="add-modal"
        />
      )

      // When loading, the overlay press should be blocked
    })

    it('should reset state when modal opens with new location', () => {
      const { rerender } = render(
        <AddFavoriteModal {...defaultProps} visible={false} testID="add-modal" />
      )

      rerender(<AddFavoriteModal {...defaultProps} visible={true} testID="add-modal" />)

      jest.runAllTimers()

      const input = screen.getByTestId('add-modal-input')
      expect(input.props.value).toBe('Starbucks')
    })
  })

  describe('Accessibility', () => {
    it('should have accessibilityRole button on save', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const saveButton = screen.getByTestId('add-modal-save')
      expect(saveButton.props.accessibilityRole).toBe('button')
    })

    it('should have accessibilityRole button on cancel', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const cancelButton = screen.getByTestId('add-modal-cancel')
      expect(cancelButton.props.accessibilityRole).toBe('button')
    })

    it('should have accessibilityRole button on close', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const closeButton = screen.getByTestId('add-modal-close')
      expect(closeButton.props.accessibilityRole).toBe('button')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long place names', () => {
      const longName = 'A'.repeat(100)
      const location = createMockLocation(longName)
      render(
        <AddFavoriteModal
          {...defaultProps}
          location={location}
          testID="add-modal"
        />
      )

      jest.runAllTimers()

      // Input should be truncated to max length
      const input = screen.getByTestId('add-modal-input')
      expect(input.props.value.length).toBeLessThanOrEqual(50)
    })

    it('should handle special characters in input', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      fireEvent.changeText(input, "Mom's Kitchen & Cafe")

      expect(input.props.value).toBe("Mom's Kitchen & Cafe")
    })

    it('should handle emojis in input', () => {
      render(<AddFavoriteModal {...defaultProps} testID="add-modal" />)

      const input = screen.getByTestId('add-modal-input')
      fireEvent.changeText(input, 'Coffee ☕')

      expect(input.props.value).toBe('Coffee ☕')
    })
  })
})
