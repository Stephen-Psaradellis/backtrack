import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { FavoritesList } from '../FavoritesList'
import type { FavoriteLocationWithDistance } from '../../../hooks/useFavoriteLocations'

vi.mock('../../../lib/haptics', () => ({
  selectionFeedback: vi.fn(),
  mediumFeedback: vi.fn(),
  lightFeedback: vi.fn(),
  warningFeedback: vi.fn(),
}))

vi.mock('../../LoadingSpinner', () => ({
  LoadingSpinner: ({ message }: { message: string }) => <div data-testid="loading-spinner">{message}</div>,
}))

vi.mock('../../EmptyState', () => ({
  EmptyState: ({ title, message }: { title: string; message: string }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      <span>{message}</span>
    </div>
  ),
  ErrorState: ({ error }: { error: string }) => <div data-testid="error-state">{error}</div>,
}))

vi.mock('../EditFavoriteModal', () => ({
  EditFavoriteModal: () => null,
}))

function createFavorite(id: string, name: string): FavoriteLocationWithDistance {
  return {
    id,
    user_id: 'user-1',
    custom_name: name,
    place_name: `Place ${id}`,
    latitude: 40.7128,
    longitude: -74.006,
    address: '123 Main St',
    place_id: `place-${id}`,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    distance_meters: 100,
  }
}

function queryByTestID(container: HTMLElement, testId: string) {
  return container.querySelector(`[testid="${testId}"]`)
}

const favorites = [
  createFavorite('1', 'Coffee Shop'),
  createFavorite('2', 'Gym'),
  createFavorite('3', 'Office'),
]

describe('FavoritesList', () => {
  it('renders loading state when isLoading and no favorites', () => {
    const { container } = render(
      <FavoritesList favorites={[]} isLoading={true} />
    )
    expect(queryByTestID(container, 'favorites-list-loading')).not.toBeNull()
  })

  it('renders error state when error and no favorites', () => {
    const { container } = render(
      <FavoritesList favorites={[]} error="Something went wrong" />
    )
    expect(queryByTestID(container, 'favorites-list-error')).not.toBeNull()
  })

  it('renders empty state when no favorites and not loading', () => {
    const { container } = render(
      <FavoritesList favorites={[]} />
    )
    expect(queryByTestID(container, 'favorites-list-empty')).not.toBeNull()
  })

  it('renders list of favorites', () => {
    const { container } = render(
      <FavoritesList favorites={favorites} />
    )
    expect(queryByTestID(container, 'favorites-list')).not.toBeNull()
  })

  it('shows header with count', () => {
    const { getByText } = render(
      <FavoritesList favorites={favorites} />
    )
    expect(getByText('3 Favorites')).toBeInTheDocument()
  })

  it('shows singular header for 1 favorite', () => {
    const { getByText } = render(
      <FavoritesList favorites={[favorites[0]]} />
    )
    expect(getByText('1 Favorite')).toBeInTheDocument()
  })

  it('displays favorite custom names', () => {
    const { getByText } = render(
      <FavoritesList favorites={favorites} />
    )
    expect(getByText('Coffee Shop')).toBeInTheDocument()
    expect(getByText('Gym')).toBeInTheDocument()
    expect(getByText('Office')).toBeInTheDocument()
  })

  it('calls onSelect when a favorite is pressed', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <FavoritesList favorites={favorites} onSelect={onSelect} />
    )

    const item = queryByTestID(container, 'favorites-list-item-1')!
    fireEvent.click(item)
    expect(onSelect).toHaveBeenCalledWith(favorites[0])
  })

  it('renders custom empty title and message', () => {
    const { getByText } = render(
      <FavoritesList
        favorites={[]}
        emptyTitle="Nothing here"
        emptyMessage="Add some favorites"
      />
    )
    expect(getByText('Nothing here')).toBeInTheDocument()
    expect(getByText('Add some favorites')).toBeInTheDocument()
  })
})
