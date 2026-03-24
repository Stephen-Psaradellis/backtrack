import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAnimationConfig, springConfigs, timingConfigs } from '../useAnimationConfig';

vi.mock('react-native-reanimated', () => ({
  Easing: {
    bezier: (a: number, b: number, c: number, d: number) => `bezier(${a},${b},${c},${d})`,
  },
}));

vi.mock('../../constants/theme', () => ({
  animation: {
    duration: { fast: 150, normal: 200, slow: 300 },
  },
}));

describe('useAnimationConfig', () => {
  it('gentle spring has damping 15, stiffness 120, mass 1', () => {
    expect(springConfigs.gentle).toEqual({ damping: 15, stiffness: 120, mass: 1 });
  });

  it('snappy spring has damping 10, stiffness 300, mass 0.8', () => {
    expect(springConfigs.snappy).toEqual({ damping: 10, stiffness: 300, mass: 0.8 });
  });

  it('bouncy spring has damping 8, stiffness 180, mass 1', () => {
    expect(springConfigs.bouncy).toEqual({ damping: 8, stiffness: 180, mass: 1 });
  });

  it('timing presets have correct durations', () => {
    expect(timingConfigs.fast.duration).toBe(150);
    expect(timingConfigs.normal.duration).toBe(200);
    expect(timingConfigs.slow.duration).toBe(300);
  });

  it('hook returns stable references across renders', () => {
    const { result, rerender } = renderHook(() => useAnimationConfig());
    const first = result.current;
    rerender();
    expect(result.current.springConfigs).toBe(first.springConfigs);
    expect(result.current.timingConfigs).toBe(first.timingConfigs);
  });
});
