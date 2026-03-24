import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserPresenceIndicator } from '../UserPresenceIndicator'

// Mock CSS module
vi.mock('../styles/ChatScreen.module.css', () => ({
  default: {
    presenceContainer: 'presenceContainer',
    presenceDot: 'presenceDot',
    presenceDotOnline: 'presenceDotOnline',
    presenceDotOffline: 'presenceDotOffline',
    presenceText: 'presenceText',
    presenceTextOnline: 'presenceTextOnline',
    presenceTextOffline: 'presenceTextOffline',
  },
}))

// Mock formatLastSeen
vi.mock('../utils/formatters', () => ({
  formatLastSeen: (timestamp: string | null) => {
    if (!timestamp) return 'Offline'
    return '5m ago'
  },
}))

describe('UserPresenceIndicator', () => {
  it('renders online status', () => {
    render(<UserPresenceIndicator isOnline={true} lastSeen={null} />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('renders offline status with last seen', () => {
    render(
      <UserPresenceIndicator isOnline={false} lastSeen="2024-01-15T10:30:00Z" />
    )

    expect(screen.getByText('5m ago')).toBeInTheDocument()
  })

  it('renders "Offline" when offline with no lastSeen', () => {
    render(<UserPresenceIndicator isOnline={false} lastSeen={null} />)

    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('has correct aria-label for online user', () => {
    render(<UserPresenceIndicator isOnline={true} lastSeen={null} />)

    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'User is Online')
  })

  it('has correct aria-label for offline user', () => {
    render(<UserPresenceIndicator isOnline={false} lastSeen={null} />)

    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'User is Offline')
  })

  it('has aria-live="polite" for status updates', () => {
    render(<UserPresenceIndicator isOnline={true} lastSeen={null} />)

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('renders status dot as aria-hidden', () => {
    const { container } = render(<UserPresenceIndicator isOnline={true} lastSeen={null} />)

    const dot = container.querySelector('[aria-hidden="true"]')
    expect(dot).toBeInTheDocument()
  })
})
