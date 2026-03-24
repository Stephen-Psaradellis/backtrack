import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SharedPhotoDisplay } from '../SharedPhotoDisplay'
import type { SharedPhotoWithUrl } from '../../../lib/photoSharing'

function createPhoto(id: string, url: string | null = 'https://example.com/photo.jpg'): SharedPhotoWithUrl {
  return {
    share_id: id,
    photo_id: `photo-${id}`,
    conversation_id: 'conv-1',
    shared_by: 'user-1',
    shared_at: '2024-01-01T00:00:00Z',
    signedUrl: url,
  } as SharedPhotoWithUrl
}

describe('SharedPhotoDisplay', () => {
  it('returns null when no photos and not loading', () => {
    const { container } = render(
      <SharedPhotoDisplay photos={[]} />
    )
    // The component returns null, so nothing renders except the style tag wrapper
    expect(container.querySelector('[data-testid="shared-photo-display"]')).toBeNull()
  })

  it('renders when loading even with no photos', () => {
    render(<SharedPhotoDisplay photos={[]} loading={true} />)
    expect(screen.getByTestId('shared-photo-display')).toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders header with photo count', () => {
    const photos = [createPhoto('1'), createPhoto('2')]
    render(<SharedPhotoDisplay photos={photos} />)

    expect(screen.getByText('2 photos')).toBeInTheDocument()
  })

  it('renders singular text for 1 photo', () => {
    render(<SharedPhotoDisplay photos={[createPhoto('1')]} />)
    expect(screen.getByText('1 photo')).toBeInTheDocument()
  })

  it('renders match name in header', () => {
    render(<SharedPhotoDisplay photos={[createPhoto('1')]} matchName="Sarah" />)
    expect(screen.getByText("Sarah's Shared Photos")).toBeInTheDocument()
  })

  it('defaults to "Shared Photos" when no match name', () => {
    render(<SharedPhotoDisplay photos={[createPhoto('1')]} />)
    expect(screen.getByText('Shared Photos')).toBeInTheDocument()
  })

  it('renders photo tiles', () => {
    const photos = [createPhoto('1'), createPhoto('2')]
    render(<SharedPhotoDisplay photos={photos} />)

    expect(screen.getByLabelText('Shared photo 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Shared photo 2')).toBeInTheDocument()
  })

  it('calls onPhotoPress when a photo is clicked', () => {
    const onPhotoPress = vi.fn()
    const photos = [createPhoto('1')]
    render(<SharedPhotoDisplay photos={photos} onPhotoPress={onPhotoPress} />)

    fireEvent.click(screen.getByLabelText('Shared photo 1'))
    expect(onPhotoPress).toHaveBeenCalledWith(photos[0], 0)
  })

  it('toggles expanded state on header click', () => {
    const photos = [createPhoto('1')]
    render(<SharedPhotoDisplay photos={photos} defaultExpanded={true} />)

    // Initially expanded - gallery visible
    expect(screen.getByRole('region')).toBeInTheDocument()

    // Click header to collapse
    fireEvent.click(screen.getByRole('button', { expanded: true }))

    // Gallery should be hidden
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('starts collapsed when defaultExpanded is false', () => {
    const photos = [createPhoto('1')]
    render(<SharedPhotoDisplay photos={photos} defaultExpanded={false} />)

    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })
})
