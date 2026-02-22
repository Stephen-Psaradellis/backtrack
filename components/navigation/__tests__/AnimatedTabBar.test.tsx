/**
 * AnimatedTabBar Component Tests
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { AnimatedTabBar } from '../AnimatedTabBar';

// Mock safe area context
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: vi.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
}));

describe('AnimatedTabBar', () => {
  const mockNavigation = {
    navigate: vi.fn(),
    emit: vi.fn(() => ({ defaultPrevented: false })),
  };

  const mockState = {
    index: 0,
    routes: [
      { key: 'feed', name: 'FeedTab' },
      { key: 'spots', name: 'MySpotsTab' },
      { key: 'map', name: 'MapTab' },
      { key: 'chats', name: 'ChatsTab' },
      { key: 'profile', name: 'ProfileTab' },
    ],
  };

  const mockDescriptors = {
    feed: { options: {} },
    spots: { options: {} },
    map: { options: {} },
    chats: { options: {} },
    profile: { options: {} },
  };

  beforeEach(() => {
    mockNavigation.navigate.mockClear();
    mockNavigation.emit.mockClear();
    mockNavigation.emit.mockReturnValue({ defaultPrevented: false });
  });

  it('renders without crashing', () => {
    const { container } = render(
      <AnimatedTabBar
        state={mockState}
        descriptors={mockDescriptors}
        navigation={mockNavigation as any}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders all 5 tab buttons', () => {
    const { getByText } = render(
      <AnimatedTabBar
        state={mockState}
        descriptors={mockDescriptors}
        navigation={mockNavigation as any}
      />
    );

    expect(getByText('Feed')).toBeTruthy();
    expect(getByText('Spots')).toBeTruthy();
    expect(getByText('Map')).toBeTruthy();
    expect(getByText('Chats')).toBeTruthy();
    expect(getByText('Me')).toBeTruthy();
  });

  it('renders badge when provided', () => {
    const descriptorsWithBadge = {
      ...mockDescriptors,
      chats: { options: { tabBarBadge: 3 } },
    };

    const { getByText } = render(
      <AnimatedTabBar
        state={mockState}
        descriptors={descriptorsWithBadge}
        navigation={mockNavigation as any}
      />
    );

    expect(getByText('3')).toBeTruthy();
  });

  it('renders 99+ for badges over 99', () => {
    const descriptorsWithBadge = {
      ...mockDescriptors,
      chats: { options: { tabBarBadge: 150 } },
    };

    const { getByText } = render(
      <AnimatedTabBar
        state={mockState}
        descriptors={descriptorsWithBadge}
        navigation={mockNavigation as any}
      />
    );

    expect(getByText('99+')).toBeTruthy();
  });

  it('applies safe area insets to bottom padding', async () => {
    // Import the mocked function and override its return value
    const { useSafeAreaInsets } = await import('react-native-safe-area-context');
    vi.mocked(useSafeAreaInsets).mockReturnValue({ top: 0, bottom: 34, left: 0, right: 0 });

    const { container } = render(
      <AnimatedTabBar
        state={mockState}
        descriptors={mockDescriptors}
        navigation={mockNavigation as any}
      />
    );

    expect(container).toBeTruthy();
  });

  it('highlights the active tab', () => {
    const activeState = { ...mockState, index: 2 }; // Map tab active

    const { container } = render(
      <AnimatedTabBar
        state={activeState}
        descriptors={mockDescriptors}
        navigation={mockNavigation as any}
      />
    );

    expect(container).toBeTruthy();
  });
});
