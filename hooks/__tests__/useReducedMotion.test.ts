import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReducedMotion, getAnimationDuration, getSpringConfig } from '../useReducedMotion';

const mockRemove = vi.fn();
let motionEnabled = false;
let changeListener: ((enabled: boolean) => void) | null = null;

vi.mock('react-native', () => ({
  AccessibilityInfo: {
    isReduceMotionEnabled: vi.fn(() => Promise.resolve(motionEnabled)),
    addEventListener: vi.fn((_event: string, handler: (enabled: boolean) => void) => {
      changeListener = handler;
      return { remove: mockRemove };
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  motionEnabled = false;
  changeListener = null;
});

describe('useReducedMotion', () => {
  it('returns false by default', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when system reduce motion is enabled', async () => {
    motionEnabled = true;
    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('updates when reduceMotionChanged fires', async () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    act(() => changeListener?.(true));
    expect(result.current).toBe(true);
  });

  it('cleans up subscription on unmount', () => {
    const { unmount } = renderHook(() => useReducedMotion());
    unmount();
    expect(mockRemove).toHaveBeenCalledOnce();
  });
});

describe('getAnimationDuration', () => {
  it('returns 0 when reduceMotion is true', () => {
    expect(getAnimationDuration(300, true)).toBe(0);
  });

  it('returns original duration when reduceMotion is false', () => {
    expect(getAnimationDuration(300, false)).toBe(300);
  });
});

describe('getSpringConfig', () => {
  it('returns instant config when reduceMotion is true', () => {
    expect(getSpringConfig({ damping: 15, stiffness: 120 }, true)).toEqual({
      damping: 100, stiffness: 1000, mass: 1,
    });
  });

  it('returns original config when reduceMotion is false', () => {
    const config = { damping: 15, stiffness: 120, mass: 1 };
    expect(getSpringConfig(config, false)).toBe(config);
  });
});
