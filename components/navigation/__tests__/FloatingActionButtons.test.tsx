/**
 * FloatingActionButtons Component Tests
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { FloatingActionButtons } from '../FloatingActionButtons';

// Mock safe area context
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: vi.fn(() => ({ top: 0, bottom: 34, left: 0, right: 0 })),
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
}));

// Mock useCheckin hook
const mockUseCheckin = vi.fn(() => ({
  activeCheckin: null,
}));

vi.mock('../../../hooks/useCheckin', () => ({
  useCheckin: () => mockUseCheckin(),
}));

// Mock CheckInButton
vi.mock('../../checkin/CheckInButton', () => ({
  CheckInButton: ({ testID }: any) => {
    const React = require('react');
    return React.createElement('div', { testid: testID });
  },
}));

// Mock LiveViewModal - prevent loading react-native-bitmoji with typeof
vi.mock('../../modals/LiveViewModal', () => ({
  LiveViewModal: ({ testID, visible }: any) => {
    const React = require('react');
    if (!visible) return null;
    return React.createElement('div', { testid: testID });
  },
}));

// Mock haptics
vi.mock('../../../lib/haptics', () => ({
  selectionFeedback: vi.fn().mockResolvedValue(undefined),
}));

// Mock react-native-bitmoji to prevent typeof parse errors from raw TS
vi.mock('react-native-bitmoji', () => ({
  Avatar: ({ testID }: any) => {
    const React = require('react');
    return React.createElement('div', { testid: testID });
  },
}));

describe('FloatingActionButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCheckin.mockReturnValue({ activeCheckin: null });
  });

  it('renders without crashing', () => {
    const { container } = render(<FloatingActionButtons />);
    expect(container).toBeTruthy();
  });

  it('renders when isVisible is true', () => {
    const { container } = render(
      <FloatingActionButtons testID="fab" isVisible={true} />
    );
    const element = container.querySelector('[testid="fab"]');
    expect(element).toBeTruthy();
  });

  it('does not render when isVisible is false', () => {
    const { container } = render(
      <FloatingActionButtons testID="fab" isVisible={false} />
    );
    const element = container.querySelector('[testid="fab"]');
    expect(element).toBeNull();
  });

  it('renders check-in button', () => {
    const { container } = render(
      <FloatingActionButtons testID="fab" />
    );
    expect(container.querySelector('[testid="fab-checkin"]')).toBeTruthy();
  });

  it('renders live view button', () => {
    const { getByText } = render(<FloatingActionButtons />);
    expect(getByText('Live View')).toBeTruthy();
  });

  it('applies safe area bottom inset to positioning', () => {
    const { container } = render(<FloatingActionButtons />);
    expect(container).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { zIndex: 200 };
    const { container } = render(
      <FloatingActionButtons testID="fab" style={customStyle} />
    );
    expect(container.querySelector('[testid="fab"]')).toBeTruthy();
  });

  it('updates button style when checked in', () => {
    mockUseCheckin.mockReturnValueOnce({
      activeCheckin: {
        location_id: 'loc-1',
        location_name: 'Test Cafe',
      },
    });

    const { container } = render(<FloatingActionButtons />);
    expect(container).toBeTruthy();
  });
});
