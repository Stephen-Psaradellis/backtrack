/**
 * ChatInput Component Tests
 *
 * Tests for the ChatInput component including:
 * - Rendering with various props
 * - User input handling
 * - Send button behavior
 * - Character count display
 * - Keyboard shortcuts (Enter to send)
 * - Typing callback
 * - Disabled state
 * - Accessibility requirements
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from '../ChatInput'

// Mock CSS module
jest.mock('../styles/ChatScreen.module.css', () => ({
  inputContainer: 'inputContainer',
  inputWrapper: 'inputWrapper',
  textInput: 'textInput',
  textInputDisabled: 'textInputDisabled',
  characterCount: 'characterCount',
  characterCountWarning: 'characterCountWarning',
  characterCountError: 'characterCountError',
  sendButton: 'sendButton',
  sendButtonDisabled: 'sendButtonDisabled',
}))

const defaultProps = {
  value: '',
  onChange: jest.fn(),
  onSend: jest.fn(),
}

describe('ChatInput', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render textarea with placeholder', () => {
      render(<ChatInput {...defaultProps} />)

      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
    })

    it('should render with custom placeholder', () => {
      render(<ChatInput {...defaultProps} placeholder="Custom placeholder" />)

      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
    })

    it('should render send button', () => {
      render(<ChatInput {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument()
    })

    it('should display current value', () => {
      render(<ChatInput {...defaultProps} value="Hello world" />)

      expect(screen.getByDisplayValue('Hello world')).toBeInTheDocument()
    })
  })

  describe('Input Handling', () => {
    it('should call onChange when typing', () => {
      const onChange = jest.fn()
      render(<ChatInput {...defaultProps} onChange={onChange} />)

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'Hello' } })

      expect(onChange).toHaveBeenCalledWith('Hello')
    })

    it('should call onTyping when typing with content', () => {
      const onTyping = jest.fn()
      render(<ChatInput {...defaultProps} onTyping={onTyping} value="" />)

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'H' } })

      expect(onTyping).toHaveBeenCalled()
    })

    it('should not call onTyping for empty input', () => {
      const onTyping = jest.fn()
      render(<ChatInput {...defaultProps} onTyping={onTyping} value="Hello" />)

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: '' } })

      expect(onTyping).not.toHaveBeenCalled()
    })
  })

  describe('Send Button Behavior', () => {
    it('should disable send button when value is empty', () => {
      render(<ChatInput {...defaultProps} value="" />)

      expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
    })

    it('should disable send button when value is only whitespace', () => {
      render(<ChatInput {...defaultProps} value="   " />)

      expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
    })

    it('should enable send button when value has content', () => {
      render(<ChatInput {...defaultProps} value="Hello" />)

      expect(screen.getByRole('button', { name: 'Send message' })).not.toBeDisabled()
    })

    it('should call onSend when clicking send button', () => {
      const onSend = jest.fn()
      render(<ChatInput {...defaultProps} value="Hello" onSend={onSend} />)

      fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

      expect(onSend).toHaveBeenCalled()
    })

    it('should not call onSend when button is disabled', () => {
      const onSend = jest.fn()
      render(<ChatInput {...defaultProps} value="" onSend={onSend} />)

      fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

      expect(onSend).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should send message on Enter key', () => {
      const onSend = jest.fn()
      render(<ChatInput {...defaultProps} value="Hello" onSend={onSend} />)

      const textarea = screen.getByRole('textbox')
      fireEvent.keyDown(textarea, { key: 'Enter' })

      expect(onSend).toHaveBeenCalled()
    })

    it('should not send message on Enter key with empty value', () => {
      const onSend = jest.fn()
      render(<ChatInput {...defaultProps} value="" onSend={onSend} />)

      const textarea = screen.getByRole('textbox')
      fireEvent.keyDown(textarea, { key: 'Enter' })

      expect(onSend).not.toHaveBeenCalled()
    })

    it('should not send message on Shift+Enter (allows newline)', () => {
      const onSend = jest.fn()
      render(<ChatInput {...defaultProps} value="Hello" onSend={onSend} />)

      const textarea = screen.getByRole('textbox')
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

      expect(onSend).not.toHaveBeenCalled()
    })

    it('should prevent default on Enter to avoid newline', () => {
      const onSend = jest.fn()
      render(<ChatInput {...defaultProps} value="Hello" onSend={onSend} />)

      const textarea = screen.getByRole('textbox')
      const event = fireEvent.keyDown(textarea, { key: 'Enter' })

      // Event should be prevented (fireEvent.keyDown returns false when preventDefault is called)
      expect(event).toBe(false)
    })
  })

  describe('Character Count', () => {
    it('should not show character count when under 90% of limit', () => {
      render(<ChatInput {...defaultProps} value="Hello" maxLength={2000} />)

      expect(screen.queryByText(/\/2000/)).not.toBeInTheDocument()
    })

    it('should show character count when at 90% of limit', () => {
      const longText = 'A'.repeat(1800) // 90% of 2000
      render(<ChatInput {...defaultProps} value={longText} maxLength={2000} />)

      expect(screen.getByText('1800/2000')).toBeInTheDocument()
    })

    it('should show character count when over limit', () => {
      const overLimitText = 'A'.repeat(2001)
      render(<ChatInput {...defaultProps} value={overLimitText} maxLength={2000} />)

      expect(screen.getByText('2001/2000')).toBeInTheDocument()
    })

    it('should apply warning class near limit', () => {
      const nearLimitText = 'A'.repeat(1910) // > 95%
      const { container } = render(
        <ChatInput {...defaultProps} value={nearLimitText} maxLength={2000} />
      )

      expect(container.querySelector('.characterCountWarning')).toBeInTheDocument()
    })

    it('should apply error class over limit', () => {
      const overLimitText = 'A'.repeat(2001)
      const { container } = render(
        <ChatInput {...defaultProps} value={overLimitText} maxLength={2000} />
      )

      expect(container.querySelector('.characterCountError')).toBeInTheDocument()
    })

    it('should disable send button when over character limit', () => {
      const overLimitText = 'A'.repeat(2001)
      render(<ChatInput {...defaultProps} value={overLimitText} maxLength={2000} />)

      expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
    })
  })

  describe('Disabled State', () => {
    it('should disable textarea when disabled prop is true', () => {
      render(<ChatInput {...defaultProps} disabled={true} />)

      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('should disable send button when disabled prop is true', () => {
      render(<ChatInput {...defaultProps} value="Hello" disabled={true} />)

      expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
    })

    it('should apply disabled class to textarea', () => {
      const { container } = render(<ChatInput {...defaultProps} disabled={true} />)

      expect(container.querySelector('.textInputDisabled')).toBeInTheDocument()
    })

    it('should not call onSend when disabled even with Enter', () => {
      const onSend = jest.fn()
      render(<ChatInput {...defaultProps} value="Hello" onSend={onSend} disabled={true} />)

      const textarea = screen.getByRole('textbox')
      fireEvent.keyDown(textarea, { key: 'Enter' })

      expect(onSend).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label on textarea', () => {
      render(<ChatInput {...defaultProps} />)

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Message input')
    })

    it('should have aria-label on send button', () => {
      render(<ChatInput {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Send message' })).toHaveAttribute(
        'aria-label',
        'Send message'
      )
    })

    it('should have aria-invalid when over character limit', () => {
      const overLimitText = 'A'.repeat(2001)
      render(<ChatInput {...defaultProps} value={overLimitText} maxLength={2000} />)

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    })

    it('should have aria-describedby when showing character count', () => {
      const nearLimitText = 'A'.repeat(1800)
      render(<ChatInput {...defaultProps} value={nearLimitText} maxLength={2000} />)

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'character-count')
    })

    it('should not have aria-describedby when character count hidden', () => {
      render(<ChatInput {...defaultProps} value="Hello" maxLength={2000} />)

      expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-describedby')
    })

    it('should have role="status" on character count', () => {
      const nearLimitText = 'A'.repeat(1800)
      render(<ChatInput {...defaultProps} value={nearLimitText} maxLength={2000} />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should have aria-live="polite" on character count', () => {
      const nearLimitText = 'A'.repeat(1800)
      render(<ChatInput {...defaultProps} value={nearLimitText} maxLength={2000} />)

      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Auto-resize', () => {
    it('should have rows="1" by default', () => {
      render(<ChatInput {...defaultProps} />)

      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '1')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longText = 'A'.repeat(5000)
      render(<ChatInput {...defaultProps} value={longText} maxLength={2000} />)

      expect(screen.getByDisplayValue(longText)).toBeInTheDocument()
    })

    it('should handle special characters', () => {
      const specialChars = '!@#$%^&*()_+{}[]|":;<>?,./~`'
      render(<ChatInput {...defaultProps} value={specialChars} />)

      expect(screen.getByDisplayValue(specialChars)).toBeInTheDocument()
    })

    it('should handle emojis', () => {
      const emojiText = '😀🎉🚀'
      render(<ChatInput {...defaultProps} value={emojiText} />)

      expect(screen.getByDisplayValue(emojiText)).toBeInTheDocument()
    })

    it('should handle multi-line text', () => {
      const multiLineText = 'Line 1\nLine 2\nLine 3'
      render(<ChatInput {...defaultProps} value={multiLineText} />)

      expect(screen.getByDisplayValue(multiLineText)).toBeInTheDocument()
    })

    it('should use default maxLength when not specified', () => {
      const { container } = render(<ChatInput {...defaultProps} value={'A'.repeat(1900)} />)

      // Should show character count at 95% of default (2000)
      expect(screen.getByText('1900/2000')).toBeInTheDocument()
    })
  })
})
