import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SharePhotoModal } from '../SharePhotoModal'

// Mock CSS module
vi.mock('../styles/ChatScreen.module.css', () => ({
  default: {
    actionsMenuOverlay: 'actionsMenuOverlay',
    actionsMenu: 'actionsMenu',
    actionsMenuHeader: 'actionsMenuHeader',
    actionsMenuTitle: 'actionsMenuTitle',
    closeButton: 'closeButton',
    dragHandle: 'dragHandle',
    dragIndicator: 'dragIndicator',
    actionsMenuFooter: 'actionsMenuFooter',
    cancelButton: 'cancelButton',
    spinner: 'spinner',
  },
}))

// Mock useProfilePhotos hook
const mockApprovedPhotos = [
  { id: 'photo-1', signedUrl: 'https://example.com/1.jpg' },
  { id: 'photo-2', signedUrl: 'https://example.com/2.jpg' },
  { id: 'photo-3', signedUrl: 'https://example.com/3.jpg' },
]

vi.mock('../../../hooks/useProfilePhotos', () => ({
  useProfilePhotos: () => ({
    approvedPhotos: mockApprovedPhotos,
    loading: false,
    error: null,
  }),
}))

describe('SharePhotoModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onShare: vi.fn().mockResolvedValue(undefined),
    isPhotoShared: (id: string) => id === 'photo-3', // photo-3 is already shared
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <SharePhotoModal {...defaultProps} isOpen={false} />
    )
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('renders dialog when isOpen is true', () => {
    render(<SharePhotoModal {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows title "Share a Photo"', () => {
    render(<SharePhotoModal {...defaultProps} />)
    expect(screen.getByText('Share a Photo')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<SharePhotoModal {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn()
    render(<SharePhotoModal {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows available and already shared sections', () => {
    render(<SharePhotoModal {...defaultProps} />)

    expect(screen.getByText('Available to Share')).toBeInTheDocument()
    expect(screen.getByText('Already Shared')).toBeInTheDocument()
  })

  it('shows instructions text', () => {
    render(<SharePhotoModal {...defaultProps} />)
    expect(screen.getByText('Tap a photo to share it privately with this match.')).toBeInTheDocument()
  })

  it('calls onShare when an available photo is clicked', async () => {
    const onShare = vi.fn().mockResolvedValue(undefined)
    render(<SharePhotoModal {...defaultProps} onShare={onShare} />)

    const selectButtons = screen.getAllByLabelText('Select photo to share')
    fireEvent.click(selectButtons[0])
    expect(onShare).toHaveBeenCalledWith('photo-1')
  })

  it('shows sharing overlay when sharing is true', () => {
    render(<SharePhotoModal {...defaultProps} sharing={true} />)
    expect(screen.getByText('Sharing photo...')).toBeInTheDocument()
  })

  it('closes on overlay click', () => {
    const onClose = vi.fn()
    render(<SharePhotoModal {...defaultProps} onClose={onClose} />)

    // Click the overlay (the outermost div with role="dialog")
    const overlay = screen.getAllByRole('dialog')[0]
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })
})
