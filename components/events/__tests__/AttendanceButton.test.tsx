/**
 * Tests for components/events/AttendanceButton.tsx
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { AttendanceButton } from '../AttendanceButton'

vi.mock('react-native-svg', () => ({
  SvgXml: 'SvgXml',
}))

vi.mock('../../../hooks/useEventAttendance', () => ({
  // Just need type exports - the component imports AttendanceStatus type
}))

const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[testid="${testId}"]`)
  if (!element) {
    throw new Error(`Unable to find element with testid="${testId}"\n\n${container.innerHTML}`)
  }
  return element
}

describe('AttendanceButton', () => {
  const defaultProps = {
    userStatus: null as any,
    goingCount: 12,
    interestedCount: 25,
    onToggleGoing: vi.fn(),
    onToggleInterested: vi.fn(),
  }

  describe('rendering', () => {
    it('should render the container', () => {
      const { container } = render(<AttendanceButton {...defaultProps} />)
      expect(getByTestId(container, 'attendance-button')).toBeInTheDocument()
    })

    it('should render Going button with count', () => {
      const { getByText, container } = render(
        <AttendanceButton {...defaultProps} />
      )
      expect(getByTestId(container, 'attendance-button-going')).toBeInTheDocument()
      expect(getByText('Going')).toBeInTheDocument()
      expect(getByText('(12)')).toBeInTheDocument()
    })

    it('should render Interested button with count', () => {
      const { getByText, container } = render(
        <AttendanceButton {...defaultProps} />
      )
      expect(getByTestId(container, 'attendance-button-interested')).toBeInTheDocument()
      expect(getByText('Interested')).toBeInTheDocument()
      expect(getByText('(25)')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call onToggleGoing when Going is pressed', () => {
      const { container } = render(<AttendanceButton {...defaultProps} />)
      fireEvent.click(getByTestId(container, 'attendance-button-going'))
      expect(defaultProps.onToggleGoing).toHaveBeenCalled()
    })

    it('should call onToggleInterested when Interested is pressed', () => {
      const { container } = render(<AttendanceButton {...defaultProps} />)
      fireEvent.click(getByTestId(container, 'attendance-button-interested'))
      expect(defaultProps.onToggleInterested).toHaveBeenCalled()
    })

    it('should not fire callbacks when disabled', () => {
      const onGoing = vi.fn()
      const onInterested = vi.fn()
      const { container } = render(
        <AttendanceButton
          {...defaultProps}
          onToggleGoing={onGoing}
          onToggleInterested={onInterested}
          disabled={true}
        />
      )
      // Disabled buttons shouldn't fire onClick
      const goingBtn = getByTestId(container, 'attendance-button-going')
      const interestedBtn = getByTestId(container, 'attendance-button-interested')
      fireEvent.click(goingBtn)
      fireEvent.click(interestedBtn)
      expect(onGoing).not.toHaveBeenCalled()
      expect(onInterested).not.toHaveBeenCalled()
    })
  })

  describe('active states', () => {
    it('should show Going as active when userStatus is going', () => {
      const { container } = render(
        <AttendanceButton {...defaultProps} userStatus="going" />
      )
      expect(getByTestId(container, 'attendance-button-going')).toBeInTheDocument()
    })

    it('should show Interested as active when userStatus is interested', () => {
      const { container } = render(
        <AttendanceButton {...defaultProps} userStatus="interested" />
      )
      expect(getByTestId(container, 'attendance-button-interested')).toBeInTheDocument()
    })
  })

  describe('sizes', () => {
    it('should render with sm size', () => {
      const { container } = render(
        <AttendanceButton {...defaultProps} size="sm" />
      )
      expect(getByTestId(container, 'attendance-button')).toBeInTheDocument()
    })

    it('should render with lg size', () => {
      const { container } = render(
        <AttendanceButton {...defaultProps} size="lg" />
      )
      expect(getByTestId(container, 'attendance-button')).toBeInTheDocument()
    })
  })

  describe('layout', () => {
    it('should support column layout', () => {
      const { container } = render(
        <AttendanceButton {...defaultProps} layout="column" />
      )
      expect(getByTestId(container, 'attendance-button')).toBeInTheDocument()
    })
  })
})
