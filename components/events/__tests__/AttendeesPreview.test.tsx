import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

// Mock react-native-svg
vi.mock('react-native-svg', () => ({
  SvgXml: (props: any) => <div data-testid="svg-icon" />,
}))

// Mock useEventAttendance hook
vi.mock('../../../hooks/useEventAttendance', () => ({}))

import { AttendeesPreview, AttendeesCompact, type AttendeesPreviewProps } from '../AttendeesPreview'
import type { EventAttendee } from '../../../hooks/useEventAttendance'

// Helper to query RN testID attribute (renders as "testid" not "data-testid")
const queryTestId = (container: HTMLElement, id: string) =>
  container.querySelector(`[testid="${id}"]`)

describe('AttendeesPreview', () => {
  const mockAttendee: EventAttendee = {
    user_id: 'user-1',
    avatar_url: 'https://example.com/avatar.jpg',
    display_name: 'John Doe',
    is_verified: true,
  }

  const mockAttendeeNoAvatar: EventAttendee = {
    user_id: 'user-2',
    avatar_url: null,
    display_name: 'Jane Smith',
    is_verified: false,
  }

  it('returns null when totalCount is 0', () => {
    const { container } = render(
      <AttendeesPreview attendees={[]} totalCount={0} testID="attendees-empty" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders attendees with avatars', () => {
    const attendees: EventAttendee[] = [mockAttendee, mockAttendeeNoAvatar]
    const { container } = render(
      <AttendeesPreview attendees={attendees} totalCount={2} testID="attendees-list" />
    )
    expect(queryTestId(container, 'attendees-list')).toBeTruthy()
  })

  it('shows +N more indicator when remainingCount > 0', () => {
    const attendees: EventAttendee[] = [mockAttendee, mockAttendeeNoAvatar]
    const { queryByText } = render(
      <AttendeesPreview
        attendees={attendees}
        totalCount={5}
        maxAvatars={2}
        testID="attendees-more"
      />
    )
    expect(queryByText('+3')).toBeDefined()
  })

  it('shows label text with totalCount', () => {
    const { queryByText } = render(
      <AttendeesPreview
        attendees={[mockAttendee]}
        totalCount={1}
        label="going"
        testID="attendees-label"
      />
    )
    expect(queryByText('1 going')).toBeDefined()
  })

  it('renders with custom avatarSize', () => {
    const { container } = render(
      <AttendeesPreview
        attendees={[mockAttendee]}
        totalCount={1}
        avatarSize={48}
        testID="attendees-size"
      />
    )
    expect(queryTestId(container, 'attendees-size')).toBeTruthy()
  })

  it('respects maxAvatars prop', () => {
    const attendees: EventAttendee[] = [mockAttendee, mockAttendeeNoAvatar, mockAttendee]
    const { queryByText } = render(
      <AttendeesPreview
        attendees={attendees}
        totalCount={5}
        maxAvatars={2}
        testID="attendees-max"
      />
    )
    expect(queryByText('+3')).toBeDefined()
  })

  it('has correct accessibility label', () => {
    const { container } = render(
      <AttendeesPreview
        attendees={[mockAttendee]}
        totalCount={3}
        testID="attendees-a11y"
      />
    )
    const preview = queryTestId(container, 'attendees-a11y')
    expect(preview?.getAttribute('accessibilitylabel')).toBe('3 people going')
  })

  it('renders placeholder icon for attendees without avatars', () => {
    const { getAllByTestId } = render(
      <AttendeesPreview
        attendees={[mockAttendeeNoAvatar]}
        totalCount={1}
        testID="attendees-placeholder"
      />
    )
    const svgIcons = getAllByTestId('svg-icon')
    expect(svgIcons.length).toBeGreaterThan(0)
  })

  it('supports onPress callback', () => {
    const mockPress = vi.fn()
    const { container } = render(
      <AttendeesPreview
        attendees={[mockAttendee]}
        totalCount={1}
        onPress={mockPress}
        testID="attendees-pressable"
      />
    )
    expect(queryTestId(container, 'attendees-pressable')).toBeTruthy()
  })

  it('renders with custom label', () => {
    const { queryByText } = render(
      <AttendeesPreview
        attendees={[mockAttendee]}
        totalCount={2}
        label="interested"
        testID="attendees-custom-label"
      />
    )
    expect(queryByText('2 interested')).toBeDefined()
  })
})

describe('AttendeesCompact', () => {
  it('renders with goingCount', () => {
    const { queryByText } = render(
      <AttendeesCompact goingCount={5} interestedCount={0} testID="compact-going" />
    )
    expect(queryByText('5')).toBeDefined()
    expect(queryByText('going')).toBeDefined()
  })

  it('renders with interestedCount', () => {
    const { queryByText } = render(
      <AttendeesCompact goingCount={0} interestedCount={3} testID="compact-interested" />
    )
    expect(queryByText('3')).toBeDefined()
    expect(queryByText('interested')).toBeDefined()
  })

  it('renders both counts when both are > 0', () => {
    const { queryByText, getAllByTestId } = render(
      <AttendeesCompact goingCount={5} interestedCount={3} testID="compact-both" />
    )
    expect(queryByText('5')).toBeDefined()
    expect(queryByText('3')).toBeDefined()
    expect(queryByText('going')).toBeDefined()
    expect(queryByText('interested')).toBeDefined()
  })

  it('shows divider when both counts > 0', () => {
    const { container } = render(
      <AttendeesCompact goingCount={5} interestedCount={3} testID="compact-divider" />
    )
    expect(container).toBeDefined()
  })

  it('hides goingCount when it is 0', () => {
    const { queryByText } = render(
      <AttendeesCompact goingCount={0} interestedCount={3} testID="compact-no-going" />
    )
    expect(queryByText('going')).toBeNull()
  })

  it('hides interestedCount when it is 0', () => {
    const { queryByText } = render(
      <AttendeesCompact goingCount={5} interestedCount={0} testID="compact-no-interested" />
    )
    expect(queryByText('interested')).toBeNull()
  })

  it('supports onPress callback', () => {
    const mockPress = vi.fn()
    const { container } = render(
      <AttendeesCompact
        goingCount={5}
        interestedCount={3}
        onPress={mockPress}
        testID="compact-pressable"
      />
    )
    expect(queryTestId(container, 'compact-pressable')).toBeTruthy()
  })

  it('has custom testID', () => {
    const { container } = render(
      <AttendeesCompact
        goingCount={5}
        interestedCount={3}
        testID="custom-compact"
      />
    )
    expect(queryTestId(container, 'custom-compact')).toBeTruthy()
  })
})
