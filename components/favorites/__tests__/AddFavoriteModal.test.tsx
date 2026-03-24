import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { AddFavoriteModal } from '../AddFavoriteModal'
import type { AddFavoriteLocationData } from '../AddFavoriteModal'

vi.mock('../../../lib/haptics', () => ({
  selectionFeedback: vi.fn(),
  lightFeedback: vi.fn(),
  errorFeedback: vi.fn(),
}))

const mockLocation: AddFavoriteLocationData = {
  placeName: 'Starbucks',
  address: '123 Main St, New York, NY 10001',
  latitude: 40.7128,
  longitude: -74.006,
  placeId: 'ChIJ123',
}

function queryByTestID(container: HTMLElement, testId: string) {
  return container.querySelector(`[testid="${testId}"]`)
}

describe('AddFavoriteModal', () => {
  const defaultProps = {
    visible: true,
    location: mockLocation,
    onSave: vi.fn(),
    onCancel: vi.fn(),
  }

  it('renders nothing when location is null', () => {
    const { container } = render(
      <AddFavoriteModal {...defaultProps} location={null} />
    )
    expect(container.children.length).toBe(0)
  })

  it('renders modal title', () => {
    const { getByText } = render(<AddFavoriteModal {...defaultProps} />)
    expect(getByText('Add to Favorites')).toBeInTheDocument()
  })

  it('displays location place name', () => {
    const { getByText } = render(<AddFavoriteModal {...defaultProps} />)
    expect(getByText('Starbucks')).toBeInTheDocument()
  })

  it('displays location address', () => {
    const { getByText } = render(<AddFavoriteModal {...defaultProps} />)
    expect(getByText('123 Main St, New York, NY 10001')).toBeInTheDocument()
  })

  it('shows character count', () => {
    const { container } = render(<AddFavoriteModal {...defaultProps} />)
    const charCount = queryByTestID(container, 'add-favorite-modal-char-count')
    expect(charCount?.textContent).toContain('/50')
  })

  it('calls onSave when save is pressed', () => {
    const onSave = vi.fn()
    const { container } = render(
      <AddFavoriteModal {...defaultProps} onSave={onSave} />
    )
    const saveBtn = queryByTestID(container, 'add-favorite-modal-save')!
    fireEvent.click(saveBtn)
    expect(onSave).toHaveBeenCalledWith('Starbucks')
  })

  it('calls onCancel when cancel button is pressed', () => {
    const onCancel = vi.fn()
    const { container } = render(
      <AddFavoriteModal {...defaultProps} onCancel={onCancel} />
    )
    const cancelBtn = queryByTestID(container, 'add-favorite-modal-cancel')!
    fireEvent.click(cancelBtn)
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows loading text when isLoading', () => {
    const { getByText } = render(
      <AddFavoriteModal {...defaultProps} isLoading={true} />
    )
    expect(getByText('Saving...')).toBeInTheDocument()
  })

  it('shows error message when error prop is set', () => {
    const { getByText } = render(
      <AddFavoriteModal {...defaultProps} error="Failed to save" />
    )
    expect(getByText('Failed to save')).toBeInTheDocument()
  })

  it('shows section labels', () => {
    const { getByText } = render(<AddFavoriteModal {...defaultProps} />)
    expect(getByText('Location')).toBeInTheDocument()
    expect(getByText('Custom Name')).toBeInTheDocument()
  })

  it('shows input description', () => {
    const { getByText } = render(<AddFavoriteModal {...defaultProps} />)
    expect(getByText('Give this location a memorable name')).toBeInTheDocument()
  })
})
