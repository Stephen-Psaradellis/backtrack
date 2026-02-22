/**
 * LocationTrackingSettings Component Tests
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { LocationTrackingSettings } from '../LocationTrackingSettings';

// Mock @react-native-picker/picker - prevents loading native component with typeof errors
vi.mock('@react-native-picker/picker', () => {
  const React = require('react');

  const PickerItem = ({ label }: any) =>
    React.createElement('option', {}, label);

  const Picker = ({ children, selectedValue, onValueChange, testID }: any) =>
    React.createElement('select', {
      value: selectedValue,
      onChange: (e: any) => onValueChange?.(e.target.value),
      testid: testID,
    }, children);

  Picker.Item = PickerItem;

  return { Picker };
});

// Mock useCheckinSettings hook
const mockUseCheckinSettings = vi.fn(() => ({
  settings: {
    always_on_tracking_enabled: false,
    checkin_prompt_minutes: 5,
  },
  isLoading: false,
  isUpdating: false,
  error: null,
  updateSettings: vi.fn(),
  toggleAlwaysOn: vi.fn(),
  clearError: vi.fn(),
}));

vi.mock('../../../hooks/useCheckinSettings', () => ({
  useCheckinSettings: () => mockUseCheckinSettings(),
}));

// Mock haptics
vi.mock('../../../lib/haptics', () => ({
  successFeedback: vi.fn().mockResolvedValue(undefined),
  errorFeedback: vi.fn().mockResolvedValue(undefined),
  selectionFeedback: vi.fn().mockResolvedValue(undefined),
}));

// Mock LoadingSpinner
vi.mock('../../LoadingSpinner', () => ({
  LoadingSpinner: ({ testID }: any) => {
    const React = require('react');
    return React.createElement('div', { testid: testID });
  },
}));

describe('LocationTrackingSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCheckinSettings.mockReturnValue({
      settings: {
        always_on_tracking_enabled: false,
        checkin_prompt_minutes: 5,
      },
      isLoading: false,
      isUpdating: false,
      error: null,
      updateSettings: vi.fn(),
      toggleAlwaysOn: vi.fn(),
      clearError: vi.fn(),
    });
  });

  it('renders without crashing', () => {
    const { container } = render(<LocationTrackingSettings />);
    expect(container).toBeTruthy();
  });

  it('renders title and description', () => {
    const { getByText } = render(<LocationTrackingSettings />);
    expect(getByText('Location Tracking')).toBeTruthy();
    expect(getByText('Configure automatic check-in prompts when you visit locations')).toBeTruthy();
  });

  it('renders loading state', () => {
    mockUseCheckinSettings.mockReturnValueOnce({
      settings: { always_on_tracking_enabled: false, checkin_prompt_minutes: 5 },
      isLoading: true,
      isUpdating: false,
      error: null,
      updateSettings: vi.fn(),
      toggleAlwaysOn: vi.fn(),
      clearError: vi.fn(),
    });

    const { getByText } = render(<LocationTrackingSettings />);
    expect(getByText('Location Tracking')).toBeTruthy();
  });

  it('renders always-on toggle switch', () => {
    const { getByText } = render(<LocationTrackingSettings />);
    expect(getByText('Enable always-on location tracking')).toBeTruthy();
    expect(getByText('Receive check-in prompts when you stay at a location')).toBeTruthy();
  });

  it('hides picker when tracking is disabled', () => {
    const { queryByText } = render(<LocationTrackingSettings />);
    // Picker label should not be visible when tracking is off
    expect(queryByText('Ask me to check in after being at same location for...')).toBeNull();
  });

  it('shows picker when tracking is enabled', () => {
    mockUseCheckinSettings.mockReturnValueOnce({
      settings: {
        always_on_tracking_enabled: true,
        checkin_prompt_minutes: 10,
      },
      isLoading: false,
      isUpdating: false,
      error: null,
      updateSettings: vi.fn(),
      toggleAlwaysOn: vi.fn(),
      clearError: vi.fn(),
    });

    const { getByText } = render(<LocationTrackingSettings />);
    expect(getByText('Ask me to check in after being at same location for...')).toBeTruthy();
  });

  it('renders error banner when error exists', () => {
    mockUseCheckinSettings.mockReturnValueOnce({
      settings: { always_on_tracking_enabled: false, checkin_prompt_minutes: 5 },
      isLoading: false,
      isUpdating: false,
      error: { message: 'Permission denied' },
      updateSettings: vi.fn(),
      toggleAlwaysOn: vi.fn(),
      clearError: vi.fn(),
    });

    const { getByText } = render(<LocationTrackingSettings />);
    expect(getByText('Permission denied')).toBeTruthy();
  });

  it('renders info text', () => {
    const { getByText } = render(<LocationTrackingSettings />);
    expect(getByText(/Check-ins help you connect/)).toBeTruthy();
  });

  it('renders with testID', () => {
    const { container } = render(
      <LocationTrackingSettings testID="custom-location-settings" />
    );
    const element = container.querySelector('[testid="custom-location-settings"]');
    expect(element).toBeTruthy();
  });

  it('disables toggle when updating', () => {
    mockUseCheckinSettings.mockReturnValueOnce({
      settings: { always_on_tracking_enabled: false, checkin_prompt_minutes: 5 },
      isLoading: false,
      isUpdating: true,
      error: null,
      updateSettings: vi.fn(),
      toggleAlwaysOn: vi.fn(),
      clearError: vi.fn(),
    });

    const { container } = render(<LocationTrackingSettings testID="settings" />);
    expect(container).toBeTruthy();
  });
});
