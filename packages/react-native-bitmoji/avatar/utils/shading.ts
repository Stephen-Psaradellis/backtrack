/**
 * Shading Utilities
 *
 * Centralized color shading and manipulation utilities for consistent
 * lighting, shadows, and tonal variations across all avatar parts.
 *
 * Design principles:
 * - Light source from top-left (LIGHT_DIRECTION)
 * - Consistent shade calculation across parts
 * - Edge-case handling for very dark/light colors
 * - Pure functions with no external dependencies
 */

import { adjustBrightness, blendColors } from '../utils';

/**
 * Global light direction constant.
 * Top-left lighting is standard for avatars and portraits.
 */
export const LIGHT_DIRECTION = { x: -0.3, y: -0.7 } as const;

/**
 * Skin tone shade variations for natural skin rendering.
 * Includes highlights, shadows, and warm/cool tones for depth.
 */
export interface SkinShades {
  highlight: string;      // Brightest areas (forehead, nose bridge, cheekbones)
  base: string;          // Original skin color
  shadow: string;        // Standard shadow areas (under chin, jaw contour)
  warmTone: string;      // Warm areas (cheeks, ears, nose tip)
  coolTone: string;      // Cool shadow areas (under jaw, temples)
}

/**
 * Hair color variations for realistic hair rendering.
 * Five-tone system provides depth and natural highlights.
 */
export interface HairShades {
  brightHighlight: string; // Lightest streaks (sunlight reflection)
  highlight: string;       // General highlight areas
  base: string;           // Original hair color
  shadow: string;         // Shadow areas (underneath, behind ears)
  deepShadow: string;     // Darkest areas (roots, deep layers)
}

/**
 * Fabric/clothing color variations.
 * Simulates folds, creases, and fabric depth.
 */
export interface FabricShades {
  highlight: string;    // Raised areas, light-facing surfaces
  base: string;        // Original fabric color
  foldShadow: string;  // Minor creases and folds
  deepShadow: string;  // Deep folds, seams, under-layers
}

/**
 * Generate skin tone shades with natural warm/cool variations.
 */
export function getSkinShades(skinColor: string): SkinShades {
  const base = skinColor;
  const highlight = adjustBrightness(base, 20);
  const shadow = adjustBrightness(base, -30);

  // Warm tone: add slight orange/red shift for natural cheek warmth
  const warmTone = addWarmth(adjustBrightness(base, -10), 0.15);

  // Cool tone: reduce saturation for shadow areas
  const coolTone = adjustBrightness(base, -40);

  return {
    highlight,
    base,
    shadow,
    warmTone,
    coolTone,
  };
}

/**
 * Generate hair color shades with five-tone depth system.
 */
export function getHairShades(hairColor: string): HairShades {
  return {
    brightHighlight: adjustBrightness(hairColor, 50),
    highlight: adjustBrightness(hairColor, 30),
    base: hairColor,
    shadow: adjustBrightness(hairColor, -25),
    deepShadow: adjustBrightness(hairColor, -40),
  };
}

/**
 * Generate fabric/clothing shades for realistic material rendering.
 */
export function getFabricShades(fabricColor: string): FabricShades {
  return {
    highlight: adjustBrightness(fabricColor, 20),
    base: fabricColor,
    foldShadow: adjustBrightness(fabricColor, -30),
    deepShadow: adjustBrightness(fabricColor, -45),
  };
}

/**
 * Add warm tone to a color (shift toward orange/red).
 * Amount: 0-1, where 0 = no change, 1 = maximum warmth.
 *
 * Works by increasing red channel and slightly reducing blue.
 */
export function addWarmth(hex: string, amount: number): string {
  if (amount <= 0) return hex;

  const color = hex.replace('#', '');
  let r = parseInt(color.slice(0, 2), 16);
  let g = parseInt(color.slice(2, 4), 16);
  let b = parseInt(color.slice(4, 6), 16);

  // Clamp amount to 0-1 range
  const clampedAmount = Math.max(0, Math.min(1, amount));

  // Increase red, slightly increase green, reduce blue
  r = Math.min(255, Math.round(r + (255 - r) * clampedAmount * 0.3));
  g = Math.min(255, Math.round(g + (255 - g) * clampedAmount * 0.1));
  b = Math.max(0, Math.round(b - b * clampedAmount * 0.2));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Parse hex color to RGB object.
 * Handles both 3-digit and 6-digit hex codes.
 * Returns null if invalid hex format.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '');

  if (cleaned.length === 3) {
    // Convert 3-digit hex to 6-digit
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b };
  }

  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b };
  }

  return null;
}

/**
 * Convert RGB object to hex color.
 */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, Math.round(val)));
  const rHex = clamp(r).toString(16).padStart(2, '0');
  const gHex = clamp(g).toString(16).padStart(2, '0');
  const bHex = clamp(b).toString(16).padStart(2, '0');
  return `#${rHex}${gHex}${bHex}`;
}

/**
 * Adjust saturation of a hex color.
 * Amount: -1 (desaturate/grayscale) to 1 (max saturation).
 *
 * Uses luminance-weighted desaturation for natural results.
 */
export function adjustSaturation(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex; // Return original if invalid

  const { r, g, b } = rgb;

  // Calculate luminance using standard weights
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;

  // Interpolate between gray and original color based on amount
  const newR = gray + (r - gray) * (1 + amount);
  const newG = gray + (g - gray) * (1 + amount);
  const newB = gray + (b - gray) * (1 + amount);

  return rgbToHex(newR, newG, newB);
}

/**
 * Get a lighter shade of a color, clamped to prevent pure white.
 * Useful for highlights that should retain some color.
 *
 * @param hex - Base color
 * @param percent - Percentage to lighten (0-100)
 * @param maxBrightness - Maximum brightness limit (0-255, default 245)
 */
export function lighten(hex: string, percent: number, maxBrightness: number = 245): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const { r, g, b } = rgb;
  const amount = (percent / 100) * 255;

  const newR = Math.min(maxBrightness, r + amount);
  const newG = Math.min(maxBrightness, g + amount);
  const newB = Math.min(maxBrightness, b + amount);

  return rgbToHex(newR, newG, newB);
}

/**
 * Get a darker shade of a color, clamped to prevent pure black.
 * Useful for shadows that should retain some color.
 *
 * @param hex - Base color
 * @param percent - Percentage to darken (0-100)
 * @param minBrightness - Minimum brightness limit (0-255, default 10)
 */
export function darken(hex: string, percent: number, minBrightness: number = 10): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const { r, g, b } = rgb;
  const amount = (percent / 100) * 255;

  const newR = Math.max(minBrightness, r - amount);
  const newG = Math.max(minBrightness, g - amount);
  const newB = Math.max(minBrightness, b - amount);

  return rgbToHex(newR, newG, newB);
}

/**
 * Create a multi-stop gradient array for smooth shading.
 * Useful for SVG gradients with intermediate color stops.
 *
 * @param baseColor - Starting color
 * @param endColor - Ending color
 * @param steps - Number of intermediate steps (default 3)
 */
export function createGradientStops(
  baseColor: string,
  endColor: string,
  steps: number = 3
): Array<{ offset: number; color: string }> {
  const stops: Array<{ offset: number; color: string }> = [];

  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const color = blendColors(baseColor, endColor, ratio);
    stops.push({
      offset: ratio,
      color,
    });
  }

  return stops;
}

/**
 * Get edge highlight color - very subtle bright edge for depth.
 * Used for rim lighting effects on hair, clothing edges, etc.
 */
export function getEdgeHighlight(baseColor: string): string {
  return lighten(baseColor, 40, 250);
}

/**
 * Get contact shadow color - dark shadow where objects touch.
 * Used for shadows under chin, between clothing layers, etc.
 */
export function getContactShadow(baseColor: string): string {
  return darken(baseColor, 50, 5);
}
