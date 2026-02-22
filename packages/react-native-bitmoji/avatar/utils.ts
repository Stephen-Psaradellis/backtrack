/**
 * Avatar Utilities
 *
 * Shared utility functions for avatar components.
 * Centralized to avoid duplication across Avatar.tsx, FullBodyAvatar.tsx, and renderers.
 */

import { useRef } from 'react';

// Counter for generating unique IDs within a session
let idCounter = 0;

/**
 * Generate a unique, stable ID for SVG gradients and other elements.
 * Unlike Math.random(), this produces consistent IDs that won't change on re-render.
 */
export function generateId(prefix: string): string {
  return `${prefix}_${++idCounter}`;
}

/**
 * Hook to generate stable gradient IDs that persist across re-renders.
 * Uses useRef to ensure IDs are only generated once per component instance.
 */
export function useGradientIds<T extends { [K in keyof T]: string }>(
  prefixes: (keyof T)[]
): { [K in keyof T]: string } {
  const idsRef = useRef<{ [K in keyof T]: string } | null>(null);

  if (!idsRef.current) {
    const ids = {} as { [K in keyof T]: string };
    prefixes.forEach((prefix) => {
      (ids as Record<string, string>)[prefix as string] = generateId(prefix as string);
    });
    idsRef.current = ids;
  }

  return idsRef.current;
}

/**
 * Adjust the brightness of a hex color.
 * Positive amount = lighter, negative amount = darker.
 */
export function adjustBrightness(hex: string, amount: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  const color = hex.replace('#', '');
  const r = clamp(parseInt(color.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(color.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(color.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Blend two colors together at a given ratio.
 * Ratio of 0 = color1, ratio of 1 = color2.
 */
export function blendColors(color1: string, color2: string, ratio: number): string {
  const c1 = color1.replace('#', '');
  const c2 = color2.replace('#', '');
  const r1 = parseInt(c1.slice(0, 2), 16);
  const g1 = parseInt(c1.slice(2, 4), 16);
  const b1 = parseInt(c1.slice(4, 6), 16);
  const r2 = parseInt(c2.slice(0, 2), 16);
  const g2 = parseInt(c2.slice(2, 4), 16);
  const b2 = parseInt(c2.slice(4, 6), 16);
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Convert hex color to RGBA string.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const color = hex.replace('#', '');
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
