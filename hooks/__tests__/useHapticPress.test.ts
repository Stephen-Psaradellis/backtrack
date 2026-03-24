import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const {
  mockSelectionAsync,
  mockNotificationAsync,
  mockImpactAsync,
  mockSpringStart,
  mockSpring,
} = vi.hoisted(() => ({
  mockSelectionAsync: vi.fn(),
  mockNotificationAsync: vi.fn(),
  mockImpactAsync: vi.fn(),
  mockSpringStart: vi.fn((cb?: () => void) => cb?.()),
  mockSpring: vi.fn(() => ({ start: vi.fn((cb?: () => void) => cb?.()) })),
}));

vi.mock('expo-haptics', () => ({
  selectionAsync: (...args: unknown[]) => mockSelectionAsync(...args),
  notificationAsync: (...args: unknown[]) => mockNotificationAsync(...args),
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

vi.mock('react-native', () => ({
  Animated: {
    Value: class {
      _value: number;
      constructor(v: number) { this._value = v; }
    },
    spring: mockSpring,
  },
}));

import { useHapticPress } from '../useHapticPress';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useHapticPress', () => {
  it('returns scaleValue, animatedStyle, and pressHandlers', () => {
    const { result } = renderHook(() => useHapticPress());
    expect(result.current.scaleValue).toBeDefined();
    expect(result.current.animatedStyle.transform).toHaveLength(1);
    expect(result.current.pressHandlers.onPressIn).toBeTypeOf('function');
    expect(result.current.pressHandlers.onPressOut).toBeTypeOf('function');
  });

  it('fires selection haptic on pressIn by default', () => {
    const { result } = renderHook(() => useHapticPress());
    act(() => result.current.pressHandlers.onPressIn());
    expect(mockSelectionAsync).toHaveBeenCalledOnce();
  });

  it('fires notification haptic for success type', () => {
    const { result } = renderHook(() => useHapticPress({ haptic: 'success' }));
    act(() => result.current.pressHandlers.onPressIn());
    expect(mockNotificationAsync).toHaveBeenCalledWith('success');
  });

  it('fires impact haptic for heavy type', () => {
    const { result } = renderHook(() => useHapticPress({ haptic: 'heavy' }));
    act(() => result.current.pressHandlers.onPressIn());
    expect(mockImpactAsync).toHaveBeenCalledWith('heavy');
  });

  it('skips haptic and animation when disabled', () => {
    const { result } = renderHook(() => useHapticPress({ disabled: true }));
    act(() => result.current.pressHandlers.onPressIn());
    expect(mockSelectionAsync).not.toHaveBeenCalled();
    expect(mockSpring).not.toHaveBeenCalled();
  });

  it('triggers spring animation on pressIn and pressOut', () => {
    const { result } = renderHook(() => useHapticPress({ scale: 0.9 }));
    act(() => result.current.pressHandlers.onPressIn());
    expect(mockSpring).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0.9, useNativeDriver: true }),
    );
    act(() => result.current.pressHandlers.onPressOut());
    expect(mockSpring).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 1, useNativeDriver: true }),
    );
  });
});
