import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { EditFavoriteModal } from '../EditFavoriteModal'
import type { FavoriteLocation } from '../../../types/database'

vi.mock('../../../lib/haptics', () => ({
  selectionFeedback: vi.fn(),
  lightFeedback: vi.fn(),
  errorFeedback: vi.fn(),
  warningFeedback: vi.fn(),
}))

const mockFavorite: FavoriteLocation = {
  id: 'fav-1',
  user_id: 'user-1',
  custom_name: 'My Coffee Shop',
  place_name: 'Starbucks Reserve',
  latitude: 40.7128,
  longitude: -74.006,
  address: '123 Main St, New York, NY 10001',
  place_id: 'ChIJ123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

function queryByTestID(container: HTMLElement, testId: string) {
  return container.querySelector(`[testid="${testId}"]`)
}

describe('EditFavoriteModal', () => {
  const defaultProps = {
    visible: true,
    favorite: mockFavorite,
    onSave: vi.fn(),
    onDelete: vi.fn(),
    onCancel: vi.fn(),
  }

  it('renders nothing when favorite is null', () => {
    const { container } = render(
      <EditFavoriteModal {...defaultProps} favorite={null} />
    )
    expect(container.children.length).toBe(0)
  })

  it('renders edit modal title', () => {
    const { getByText } = render(<EditFavoriteModal {...defaultProps} />)
    expect(getByText('Edit Favorite')).toBeInTheDocument()
  })

  it('shows location info', () => {
    const { getByText } = render(<EditFavoriteModal {...defaultProps} />)
    expect(getByText('Starbucks Reserve')).toBeInTheDocument()
  })

  it('shows character count', () => {
    const { container } = render(<EditFavoriteModal {...defaultProps} />)
    const charCount = queryByTestID(container, 'edit-favorite-modal-char-count')
    expect(charCount?.textContent).toContain('/50')
  })

  it('calls onCancel when cancel is pressed', () => {
    const onCancel = vi.fn()
    const { container } = render(
      <EditFavoriteModal {...defaultProps} onCancel={onCancel} />
    )
    const cancelBtn = queryByTestID(container, 'edit-favorite-modal-cancel')!
    fireEvent.click(cancelBtn)
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows delete button', () => {
    const { getByText } = render(<EditFavoriteModal {...defaultProps} />)
    expect(getByText('Remove from Favorites')).toBeInTheDocument()
  })

  it('switches to delete confirmation on delete press', () => {
    const { container, getByText } = render(<EditFavoriteModal {...defaultProps} />)
    const deleteBtn = queryByTestID(container, 'edit-favorite-modal-delete')!
    fireEvent.click(deleteBtn)

    expect(getByText('Remove Favorite')).toBeInTheDocument()
    expect(getByText(/Are you sure you want to remove/)).toBeInTheDocument()
  })

  it('calls onDelete when confirm delete is pressed', () => {
    const onDelete = vi.fn()
    const { container } = render(
      <EditFavoriteModal {...defaultProps} onDelete={onDelete} />
    )
    // First switch to delete mode
    fireEvent.click(queryByTestID(container, 'edit-favorite-modal-delete')!)
    // Then confirm
    fireEvent.click(queryByTestID(container, 'edit-favorite-modal-delete-confirm-button')!)
    expect(onDelete).toHaveBeenCalled()
  })

  it('shows loading text when isLoading', () => {
    const { getByText } = render(
      <EditFavoriteModal {...defaultProps} isLoading={true} />
    )
    expect(getByText('Saving...')).toBeInTheDocument()
  })

  it('shows error message', () => {
    const { getByText } = render(
      <EditFavoriteModal {...defaultProps} error="Update failed" />
    )
    expect(getByText('Update failed')).toBeInTheDocument()
  })

  it('shows section labels', () => {
    const { getByText } = render(<EditFavoriteModal {...defaultProps} />)
    expect(getByText('Location')).toBeInTheDocument()
    expect(getByText('Custom Name')).toBeInTheDocument()
  })
})
