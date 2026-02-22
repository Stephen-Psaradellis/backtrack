/**
 * FacialHairRenderer - Modular facial hair rendering component
 *
 * Extracted from Avatar.tsx for better maintainability.
 * Renders various facial hair styles as SVG elements.
 */

import React, { memo } from 'react';
import { G, Defs, Ellipse, Path, Circle, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { FacialHairStyle } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

// ============================================================================
// TYPES
// ============================================================================

export interface FacialHairRendererProps {
  type: FacialHairStyle;
  color: string;
}

type GradientIds = {
  beardGrad: string;
  beardHighlight: string;
};

// ============================================================================
// COMPONENT
// ============================================================================

export const FacialHairRenderer = memo(function FacialHairRenderer({
  type,
  color,
}: FacialHairRendererProps) {
  if (type === FacialHairStyle.NONE) return null;

  const shadow = adjustBrightness(color, -25);
  const highlight = adjustBrightness(color, 15);

  // Use stable gradient IDs instead of Math.random()
  const ids = useGradientIds<GradientIds>(['beardGrad', 'beardHighlight']);

  switch (type) {
    case FacialHairStyle.STUBBLE:
      return (
        <G opacity={0.35}>
          {/* Chin stubble */}
          <Ellipse cx="50" cy="64" rx="14" ry="12" fill={color} />
          {/* Jaw stubble */}
          <Ellipse cx="33" cy="56" rx="6" ry="10" fill={color} />
          <Ellipse cx="67" cy="56" rx="6" ry="10" fill={color} />
          {/* Stubble texture dots */}
          <G opacity={0.5}>
            <Circle cx="45" cy="60" r="0.5" fill={color} />
            <Circle cx="50" cy="62" r="0.5" fill={color} />
            <Circle cx="55" cy="60" r="0.5" fill={color} />
            <Circle cx="42" cy="65" r="0.5" fill={color} />
            <Circle cx="58" cy="65" r="0.5" fill={color} />
            <Circle cx="48" cy="68" r="0.5" fill={color} />
            <Circle cx="52" cy="68" r="0.5" fill={color} />
          </G>
        </G>
      );

    case FacialHairStyle.LIGHT_BEARD:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.beardGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={color} stopOpacity="0.5" />
              <Stop offset="100%" stopColor={shadow} stopOpacity="0.8" />
            </LinearGradient>
          </Defs>
          <Path d="M32,58 Q32,74 50,78 Q68,74 68,58 L65,62 Q50,72 35,62 Z" fill={`url(#${ids.beardGrad})`} />
          {/* Hair texture strokes */}
          <Path d="M40,62 L42,72" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.3} />
          <Path d="M50,60 L50,74" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.3} />
          <Path d="M60,62 L58,72" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.3} />
        </G>
      );

    case FacialHairStyle.MEDIUM_BEARD:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.beardGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={color} />
              <Stop offset="60%" stopColor={shadow} />
              <Stop offset="100%" stopColor={adjustBrightness(color, -35)} />
            </LinearGradient>
          </Defs>
          <Path d="M28,55 Q28,78 50,84 Q72,78 72,55 L68,60 Q50,76 32,60 Z" fill={`url(#${ids.beardGrad})`} />
          {/* Cheek blend */}
          <Ellipse cx="30" cy="58" rx="4" ry="6" fill={color} opacity={0.6} />
          <Ellipse cx="70" cy="58" rx="4" ry="6" fill={color} opacity={0.6} />
          {/* Hair texture */}
          <Path d="M38,62 L40,78" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.25} />
          <Path d="M50,58 L50,80" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.25} />
          <Path d="M62,62 L60,78" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.25} />
          {/* Chin detail */}
          <Path d="M45,76 Q50,82 55,76" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
        </G>
      );

    case FacialHairStyle.FULL_BEARD:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.beardGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="30%" stopColor={color} />
              <Stop offset="70%" stopColor={shadow} />
              <Stop offset="100%" stopColor={adjustBrightness(color, -40)} />
            </LinearGradient>
            <RadialGradient id={ids.beardHighlight} cx="50%" cy="30%" rx="40%" ry="30%">
              <Stop offset="0%" stopColor={highlight} stopOpacity="0.2" />
              <Stop offset="100%" stopColor={color} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Path d="M24,50 Q22,82 50,92 Q78,82 76,50 L72,55 Q50,82 28,55 Z" fill={`url(#${ids.beardGrad})`} />
          {/* Volume highlight */}
          <Path d="M30,55 Q50,70 70,55 Q50,65 30,55" fill={`url(#${ids.beardHighlight})`} />
          {/* Sideburn blend */}
          <Ellipse cx="25" cy="52" rx="4" ry="8" fill={color} />
          <Ellipse cx="75" cy="52" rx="4" ry="8" fill={color} />
          {/* Hair texture lines */}
          <Path d="M35,58 L38,85" fill="none" stroke={shadow} strokeWidth={1} opacity={0.2} />
          <Path d="M45,56 L46,88" fill="none" stroke={shadow} strokeWidth={1} opacity={0.2} />
          <Path d="M50,55 L50,90" fill="none" stroke={shadow} strokeWidth={1} opacity={0.2} />
          <Path d="M55,56 L54,88" fill="none" stroke={shadow} strokeWidth={1} opacity={0.2} />
          <Path d="M65,58 L62,85" fill="none" stroke={shadow} strokeWidth={1} opacity={0.2} />
          {/* Chin curl */}
          <Path d="M44,85 Q50,92 56,85" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.3} />
        </G>
      );

    case FacialHairStyle.GOATEE:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.beardGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          {/* Chin beard */}
          <Ellipse cx="50" cy="70" rx="9" ry="12" fill={`url(#${ids.beardGrad})`} />
          {/* Soul patch connection */}
          <Path d="M47,60 L47,62 L53,62 L53,60" fill={color} />
          {/* Mustache part */}
          <Path d="M44,56 Q50,54 56,56 Q53,58 50,57 Q47,58 44,56" fill={color} />
          {/* Texture */}
          <Path d="M48,64 L48,78" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.3} />
          <Path d="M52,64 L52,78" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.3} />
          {/* Chin point */}
          <Path d="M46,76 Q50,82 54,76" fill="none" stroke={shadow} strokeWidth={1} opacity={0.25} />
        </G>
      );

    case FacialHairStyle.MUSTACHE:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.beardGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          <Path d="M38,57 Q42,54 50,55.5 Q58,54 62,57 Q58,60 50,58.5 Q42,60 38,57" fill={`url(#${ids.beardGrad})`} />
          {/* Center part line */}
          <Path d="M50,55.5 L50,58.5" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.4} />
          {/* Hair direction strokes */}
          <Path d="M42,56 L40,57.5" fill="none" stroke={shadow} strokeWidth={0.3} opacity={0.3} />
          <Path d="M58,56 L60,57.5" fill="none" stroke={shadow} strokeWidth={0.3} opacity={0.3} />
        </G>
      );

    case FacialHairStyle.MUSTACHE_FANCY:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.beardGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          {/* Main mustache body */}
          <Path d="M35,56 Q40,51 50,53 Q60,51 65,56 Q60,61 50,58 Q40,61 35,56" fill={`url(#${ids.beardGrad})`} />
          {/* Curled ends - left */}
          <Path d="M35,56 Q31,58 29,55 Q31,52 35,55" fill={color} />
          <Circle cx="29" cy="55" r="2" fill={color} />
          <Circle cx="29" cy="55" r="1" fill={highlight} opacity={0.3} />
          {/* Curled ends - right */}
          <Path d="M65,56 Q69,58 71,55 Q69,52 65,55" fill={color} />
          <Circle cx="71" cy="55" r="2" fill={color} />
          <Circle cx="71" cy="55" r="1" fill={highlight} opacity={0.3} />
          {/* Wax shine highlight */}
          <Path d="M40,54 Q50,52 60,54" fill="none" stroke={highlight} strokeWidth={0.5} opacity={0.4} />
          {/* Center part */}
          <Path d="M50,53 L50,58" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.3} />
        </G>
      );

    case FacialHairStyle.SIDEBURNS:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.beardGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          {/* Left sideburn */}
          <Path d="M22,38 L22,62 Q24,68 28,62 L28,38 Z" fill={`url(#${ids.beardGrad})`} />
          <Path d="M23,40 L23,58" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.3} />
          <Path d="M26,40 L26,60" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.3} />
          {/* Right sideburn */}
          <Path d="M78,38 L78,62 Q76,68 72,62 L72,38 Z" fill={`url(#${ids.beardGrad})`} />
          <Path d="M77,40 L77,58" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.3} />
          <Path d="M74,40 L74,60" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.3} />
          {/* Top blend into hair */}
          <Ellipse cx="25" cy="40" rx="4" ry="3" fill={color} opacity={0.7} />
          <Ellipse cx="75" cy="40" rx="4" ry="3" fill={color} opacity={0.7} />
        </G>
      );

    default:
      return null;
  }
});

export default FacialHairRenderer;
