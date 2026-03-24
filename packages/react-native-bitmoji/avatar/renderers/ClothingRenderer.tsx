/**
 * ClothingRenderer - Modular clothing rendering component
 *
 * Extracted from Avatar.tsx for better maintainability.
 * Renders various clothing styles as SVG elements.
 */

import React, { memo } from 'react';
import { G, Defs, Ellipse, Path, Circle, Rect, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { ClothingStyle, BodyType } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';
import { getBodyDimensions } from '../parts/Body';

// ============================================================================
// TYPES
// ============================================================================

export interface ClothingRendererProps {
  type?: ClothingStyle;
  color: string;
  secondaryColor?: string;
  skinTone: string;
  bodyType?: BodyType;
}

type GradientIds = {
  clothingGrad: string;
  clothingHigh: string;
  shirt: string;
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ClothingRenderer = memo(function ClothingRenderer({
  type = ClothingStyle.TSHIRT,
  color,
  secondaryColor,
  skinTone,
  bodyType,
}: ClothingRendererProps) {
  const shadow = adjustBrightness(color, -30);
  const deepShadow = adjustBrightness(color, -45);
  const highlight = adjustBrightness(color, 20);
  const skinShadow = adjustBrightness(skinTone, -20);

  // Use stable gradient IDs instead of Math.random()
  const ids = useGradientIds<GradientIds>(['clothingGrad', 'clothingHigh', 'shirt']);

  // Body-type-aware clothing dimensions
  const bodyDims = getBodyDimensions(bodyType || BodyType.AVERAGE);
  const clothingRx = bodyDims.shoulderWidth / 2 + 16;
  const clothingRy = bodyDims.torsoLength * 0.6 + 10;

  // Shoulder-width clothing body path with natural shoulder slope and body contour
  // Natural shoulders slope down from neck, not flat horizontal line
  const clothingTopY = 68; // above neck base to ensure full coverage
  const shoulderY = 76; // natural shoulder height (below neck)
  const waistY = 105; // waist level
  const hemY = 105 + clothingRy * 0.8; // bottom hem

  // Natural body contour path with curved shoulders and tapered waist
  const clothingBodyPath = `
    M ${50},${clothingTopY}
    C ${50 - clothingRx * 0.3},${clothingTopY + 2} ${50 - clothingRx * 0.6},${shoulderY - 2} ${50 - clothingRx},${shoulderY + 2}
    Q ${50 - clothingRx + 2},${(shoulderY + waistY) / 2} ${50 - clothingRx * 0.85},${waistY}
    Q ${50 - clothingRx * 0.7},${waistY + 6} ${50 - clothingRx * 0.7},${hemY}
    Q ${50},${hemY + 2} ${50 + clothingRx * 0.7},${hemY}
    Q ${50 + clothingRx * 0.7},${waistY + 6} ${50 + clothingRx * 0.85},${waistY}
    Q ${50 + clothingRx - 2},${(shoulderY + waistY) / 2} ${50 + clothingRx},${shoulderY + 2}
    C ${50 + clothingRx * 0.6},${shoulderY - 2} ${50 + clothingRx * 0.3},${clothingTopY + 2} ${50},${clothingTopY}
    Z
  `;

  switch (type) {
    case ClothingStyle.HOODIE:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="40%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
            <RadialGradient id={ids.clothingHigh} cx="50%" cy="30%" rx="50%" ry="40%">
              <Stop offset="0%" stopColor={highlight} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={color} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Highlight overlay */}
          <Ellipse cx="50" cy="100" rx="35" ry="22" fill={`url(#${ids.clothingHigh})`} />
          {/* Center fold for dimension */}
          <Path d="M50,92 Q48,102 50,114" fill="none" stroke={shadow} strokeWidth={1} opacity={0.12} />
          {/* Elbow wrinkle suggestions */}
          <Path d="M20,95 Q22,97 20,99" fill="none" stroke={shadow} strokeWidth={0.6} opacity={0.08} />
          <Path d="M80,95 Q78,97 80,99" fill="none" stroke={shadow} strokeWidth={0.6} opacity={0.08} />
          {/* Shoulder seam lines */}
          <Path d="M ${50 - clothingRx},${shoulderY + 2} Q ${50 - clothingRx * 0.6},${shoulderY + 4} ${50 - clothingRx * 0.4},${shoulderY + 6}" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.15} />
          <Path d="M ${50 + clothingRx},${shoulderY + 2} Q ${50 + clothingRx * 0.6},${shoulderY + 4} ${50 + clothingRx * 0.4},${shoulderY + 6}" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.15} />
          {/* Hood behind neck — raised */}
          <Path d="M30,80 Q25,85 25,90 L75,90 Q75,85 70,80" fill={shadow} />
          {/* Hood depth shadow */}
          <Path d="M32,81 Q28,85 28,88 L72,88 Q72,85 68,81" fill={deepShadow} opacity={0.4} />
          {/* Hoodie strings */}
          <Path d="M42,83 L42,95" fill="none" stroke={shadow} strokeWidth={1.5} />
          <Path d="M42,93 L40,97 M42,93 L44,97" fill="none" stroke={shadow} strokeWidth={1} />
          <Path d="M58,83 L58,95" fill="none" stroke={shadow} strokeWidth={1.5} />
          <Path d="M58,93 L56,97 M58,93 L60,97" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Hoodie string detail - dangling from center */}
          <Path d="M48,84 L48,96" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.5} />
          <Path d="M52,84 L52,96" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.5} />
          <Path d="M48,96 L47,98" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.4} />
          <Path d="M52,96 L53,98" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.4} />
          {/* Collar with depth — raised */}
          <Path d="M38,80 Q50,87 62,80" fill="none" stroke={deepShadow} strokeWidth={3} />
          <Path d="M38,80 Q50,86 62,80" fill="none" stroke={shadow} strokeWidth={1.5} />
          {/* Side seams */}
          <Path d="M15,100 Q18,95 20,100" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
          <Path d="M85,100 Q82,95 80,100" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
          {/* Fabric fold lines at waist */}
          <Path d="M30,112 Q35,110 40,112" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.1} />
          <Path d="M60,111 Q65,109 70,111" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.12} />
          <Path d="M35,116 Q42,114 48,116" fill="none" stroke={shadow} strokeWidth={0.7} opacity={0.1} />
        </G>
      );

    case ClothingStyle.VNECK:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* V-neck cutout with skin shadow — sharp V angle */}
          <Path d="M40,${shoulderY + 1} L50,96 L60,${shoulderY + 1}" fill={skinTone} />
          <Path d="M41,${shoulderY + 2} L50,94 L59,${shoulderY + 2}" fill={skinShadow} opacity={0.2} />
          {/* V-neck edge definition with proper angle */}
          <Path d="M40,${shoulderY + 1} L50,96 L60,${shoulderY + 1}" fill="none" stroke={shadow} strokeWidth={1.2} />
          {/* Shoulder seam lines */}
          <Path d="M ${50 - clothingRx},${shoulderY + 2} Q ${50 - clothingRx * 0.6},${shoulderY + 4} ${50 - clothingRx * 0.4},${shoulderY + 6}" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.15} />
          <Path d="M ${50 + clothingRx},${shoulderY + 2} Q ${50 + clothingRx * 0.6},${shoulderY + 4} ${50 + clothingRx * 0.4},${shoulderY + 6}" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.15} />
          {/* Collar bone shadow hint */}
          <Path d="M43,81 Q50,83 57,81" fill="none" stroke={skinShadow} strokeWidth={0.5} opacity={0.3} />
          {/* Fabric fold suggestion */}
          <Path d="M32,108 Q38,106 42,108" fill="none" stroke={shadow} strokeWidth={0.7} opacity={0.12} />
          <Path d="M58,107 Q63,105 68,107" fill="none" stroke={shadow} strokeWidth={0.7} opacity={0.1} />
          <Path d="M40,114 Q46,112 52,114" fill="none" stroke={shadow} strokeWidth={0.6} opacity={0.1} />
        </G>
      );

    case ClothingStyle.SCOOP_NECK:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Scoop neck cutout with natural curve */}
          <Ellipse cx="50" cy="81" rx="10" ry="5" fill={skinTone} />
          <Ellipse cx="50" cy="82" rx="9" ry="4" fill={skinShadow} opacity={0.15} />
          {/* Neckline edge with curved shape */}
          <Path d="M40,81 Q50,86 60,81" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Shoulder seam lines */}
          <Path d="M ${50 - clothingRx},${shoulderY + 2} Q ${50 - clothingRx * 0.6},${shoulderY + 4} ${50 - clothingRx * 0.4},${shoulderY + 6}" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.15} />
          <Path d="M ${50 + clothingRx},${shoulderY + 2} Q ${50 + clothingRx * 0.6},${shoulderY + 4} ${50 + clothingRx * 0.4},${shoulderY + 6}" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.15} />
        </G>
      );

    case ClothingStyle.BLAZER:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={color} />
              <Stop offset="60%" stopColor={shadow} />
              <Stop offset="100%" stopColor={deepShadow} />
            </LinearGradient>
            <LinearGradient id={ids.shirt} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={secondaryColor || '#ffffff'} />
              <Stop offset="100%" stopColor={adjustBrightness(secondaryColor || '#ffffff', -15)} />
            </LinearGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Lapels with depth — raised */}
          <Path d="M35,80 L42,90 L50,80 L58,90 L65,80" fill={shadow} />
          <Path d="M36,81 L42,89 L50,81" fill={deepShadow} opacity={0.3} />
          <Path d="M64,81 L58,89 L50,81" fill={deepShadow} opacity={0.3} />
          {/* Lapel edge highlights */}
          <Path d="M36,80 L42,89" fill="none" stroke={highlight} strokeWidth={0.5} opacity={0.4} />
          <Path d="M64,80 L58,89" fill="none" stroke={highlight} strokeWidth={0.5} opacity={0.4} />
          {/* Inner shirt */}
          <Path d="M42,90 L50,80 L58,90 L58,110 L42,110 Z" fill={`url(#${ids.shirt})`} />
          {/* Buttons with detail */}
          <Circle cx="50" cy="98" r="1.8" fill={deepShadow} />
          <Circle cx="50" cy="98" r="1" fill={shadow} />
          <Circle cx="50" cy="104" r="1.8" fill={deepShadow} />
          <Circle cx="50" cy="104" r="1" fill={shadow} />
          {/* Pocket hints */}
          <Path d="M25,100 L32,100 L32,108 L25,108" fill="none" stroke={deepShadow} strokeWidth={0.5} opacity={0.4} />
          <Path d="M75,100 L68,100 L68,108 L75,108" fill="none" stroke={deepShadow} strokeWidth={0.5} opacity={0.4} />
        </G>
      );

    case ClothingStyle.SWEATER:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="40%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Crew neck with ribbing — raised */}
          <Ellipse cx="50" cy="80" rx="10" ry="5" fill={shadow} />
          <Ellipse cx="50" cy="80" rx="8" ry="4" fill={deepShadow} opacity={0.5} />
          {/* Neck ribbing lines */}
          <Path d="M43,79 Q50,83 57,79" fill="none" stroke={color} strokeWidth={0.5} />
          <Path d="M44,80 Q50,84 56,80" fill="none" stroke={color} strokeWidth={0.5} />
          {/* Knit texture - horizontal ribs */}
          <Path d="M20,95 L80,95" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.25} />
          <Path d="M18,100 L82,100" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.25} />
          <Path d="M20,105 L80,105" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.25} />
          <Path d="M22,110 L78,110" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.25} />
          {/* Vertical cable knit pattern hints */}
          <Path d="M35,88 L35,115" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.15} />
          <Path d="M50,88 L50,115" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.15} />
          <Path d="M65,88 L65,115" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.15} />
        </G>
      );

    case ClothingStyle.TANK_TOP:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          {/* Main body — raised */}
          <Path d="M30,80 L30,120 L70,120 L70,80 Q60,83 50,83 Q40,83 30,80 Z" fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Center fold for dimension */}
          <Path d="M50,85 Q48,100 50,115" fill="none" stroke={shadow} strokeWidth={1} opacity={0.12} />
          {/* Armhole shadows */}
          <Path d="M30,80 Q28,90 30,100" fill="none" stroke={shadow} strokeWidth={2} opacity={0.3} />
          <Path d="M70,80 Q72,90 70,100" fill="none" stroke={shadow} strokeWidth={2} opacity={0.3} />
          {/* Straps with gradient */}
          <Path d="M35,73 L35,83" fill="none" stroke={color} strokeWidth={7} />
          <Path d="M35,73 L35,83" fill="none" stroke={highlight} strokeWidth={2} opacity={0.3} />
          <Path d="M65,73 L65,83" fill="none" stroke={color} strokeWidth={7} />
          <Path d="M65,73 L65,83" fill="none" stroke={highlight} strokeWidth={2} opacity={0.3} />
          {/* Neckline curve */}
          <Path d="M35,83 Q50,87 65,83" fill="none" stroke={shadow} strokeWidth={1} />
        </G>
      );

    case ClothingStyle.COLLAR_SHIRT:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Center fold for dimension */}
          <Path d="M50,90 Q48,102 50,114" fill="none" stroke={shadow} strokeWidth={1} opacity={0.12} />
          {/* Collar points — raised */}
          <Path d="M35,77 L40,83 L44,79" fill={color} />
          <Path d="M65,77 L60,83 L56,79" fill={color} />
          {/* Collar shadow/depth */}
          <Path d="M35,77 L40,83 L44,79" fill="none" stroke={shadow} strokeWidth={1} />
          <Path d="M65,77 L60,83 L44,79" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Collar fold shadow */}
          <Path d="M36,78 L40,82" fill="none" stroke={deepShadow} strokeWidth={0.5} opacity={0.4} />
          <Path d="M64,78 L60,82" fill="none" stroke={deepShadow} strokeWidth={0.5} opacity={0.4} />
          {/* Button placket */}
          <Path d="M48,79 L48,115 L52,115 L52,79" fill={adjustBrightness(color, -10)} opacity={0.3} />
          {/* Buttons with detail */}
          <Circle cx="50" cy="92" r="1.3" fill={shadow} />
          <Circle cx="50" cy="92" r="0.6" fill={deepShadow} />
          <Circle cx="50" cy="98" r="1.3" fill={shadow} />
          <Circle cx="50" cy="98" r="0.6" fill={deepShadow} />
          <Circle cx="50" cy="104" r="1.3" fill={shadow} />
          <Circle cx="50" cy="104" r="0.6" fill={deepShadow} />
          <Circle cx="50" cy="110" r="1.3" fill={shadow} />
          <Circle cx="50" cy="110" r="0.6" fill={deepShadow} />
          {/* Fabric fold lines */}
          <Path d="M28,110 Q34,108 38,110" fill="none" stroke={shadow} strokeWidth={0.7} opacity={0.12} />
          <Path d="M62,109 Q67,107 72,109" fill="none" stroke={shadow} strokeWidth={0.7} opacity={0.1} />
          <Path d="M35,115 Q42,113 48,115" fill="none" stroke={shadow} strokeWidth={0.6} opacity={0.1} />
        </G>
      );

    case ClothingStyle.OVERALL:
    case ClothingStyle.OVERALLS:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={color} />
              <Stop offset="70%" stopColor={shadow} />
              <Stop offset="100%" stopColor={deepShadow} />
            </LinearGradient>
            <LinearGradient id={ids.shirt} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={secondaryColor || '#ffffff'} />
              <Stop offset="100%" stopColor={adjustBrightness(secondaryColor || '#ffffff', -20)} />
            </LinearGradient>
          </Defs>
          {/* Shirt underneath */}
          <Path d={clothingBodyPath} fill={`url(#${ids.shirt})`} />
          {/* Overall bib — raised */}
          <Path d="M32,85 L32,120 L68,120 L68,85 Q50,90 32,85 Z" fill={`url(#${ids.clothingGrad})`} />
          {/* Bib pocket */}
          <Path d="M42,98 L42,108 L58,108 L58,98 Q50,100 42,98" fill={shadow} opacity={0.3} />
          <Path d="M42,98 Q50,100 58,98" fill="none" stroke={deepShadow} strokeWidth={0.5} />
          {/* Straps with thickness */}
          <Path d="M35,90 L38,75" fill="none" stroke={color} strokeWidth={6} />
          <Path d="M35,90 L38,75" fill="none" stroke={highlight} strokeWidth={2} opacity={0.3} />
          <Path d="M65,90 L62,75" fill="none" stroke={color} strokeWidth={6} />
          <Path d="M65,90 L62,75" fill="none" stroke={highlight} strokeWidth={2} opacity={0.3} />
          {/* Metal buttons */}
          <Circle cx="36" cy="92" r="2.5" fill="#c0c0c0" />
          <Circle cx="36" cy="92" r="1.5" fill="#e0e0e0" />
          <Circle cx="36" cy="91" r="0.5" fill="#ffffff" opacity={0.6} />
          <Circle cx="64" cy="92" r="2.5" fill="#c0c0c0" />
          <Circle cx="64" cy="92" r="1.5" fill="#e0e0e0" />
          <Circle cx="64" cy="91" r="0.5" fill="#ffffff" opacity={0.6} />
        </G>
      );

    case ClothingStyle.POLO:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="40%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Center fold for dimension */}
          <Path d="M50,90 Q48,100 50,112" fill="none" stroke={shadow} strokeWidth={1} opacity={0.12} />
          {/* Collar points — raised */}
          <Path d="M36,77 L41,83 L45,79" fill={color} />
          <Path d="M64,77 L59,83 L55,79" fill={color} />
          <Path d="M36,77 L41,83 L45,79" fill="none" stroke={shadow} strokeWidth={1} />
          <Path d="M64,77 L59,83 L55,79" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Collar fold shadow — softer than button-up */}
          <Path d="M37,78 L41,82" fill="none" stroke={deepShadow} strokeWidth={0.4} opacity={0.35} />
          <Path d="M63,78 L59,82" fill="none" stroke={deepShadow} strokeWidth={0.4} opacity={0.35} />
          {/* Button placket */}
          <Path d="M48,79 L48,95 L52,95 L52,79" fill={adjustBrightness(color, -10)} opacity={0.3} />
          {/* Buttons */}
          <Circle cx="50" cy="83" r="1.2" fill={shadow} />
          <Circle cx="50" cy="88" r="1.2" fill={shadow} />
          <Circle cx="50" cy="93" r="1.2" fill={shadow} />
          {/* Fabric fold lines */}
          <Path d="M30,108 Q36,106 40,108" fill="none" stroke={shadow} strokeWidth={0.7} opacity={0.1} />
          <Path d="M60,107 Q65,105 70,107" fill="none" stroke={shadow} strokeWidth={0.7} opacity={0.12} />
        </G>
      );

    case ClothingStyle.DRESS_SHIRT:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Center fold for dimension */}
          <Path d="M50,90 Q48,103 50,116" fill="none" stroke={shadow} strokeWidth={1} opacity={0.12} />
          {/* Collar points — raised */}
          <Path d="M34,77 L40,83 L44,78" fill={color} />
          <Path d="M66,77 L60,83 L56,78" fill={color} />
          <Path d="M34,77 L40,83 L44,78" fill="none" stroke={shadow} strokeWidth={1} />
          <Path d="M66,77 L60,83 L56,78" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Button placket */}
          <Path d="M48,79 L48,118 L52,118 L52,79" fill={adjustBrightness(color, -10)} opacity={0.3} />
          {/* Buttons */}
          <Circle cx="50" cy="89" r="1.2" fill={shadow} />
          <Circle cx="50" cy="95" r="1.2" fill={shadow} />
          <Circle cx="50" cy="101" r="1.2" fill={shadow} />
          <Circle cx="50" cy="107" r="1.2" fill={shadow} />
          <Circle cx="50" cy="113" r="1.2" fill={shadow} />
          {/* French cuffs */}
          <Rect x="10" y="108" width="8" height="5" rx="1" fill={highlight} opacity={0.5} />
          <Rect x="82" y="108" width="8" height="5" rx="1" fill={highlight} opacity={0.5} />
          <Circle cx="14" cy="110" r="1" fill={deepShadow} />
          <Circle cx="86" cy="110" r="1" fill={deepShadow} />
        </G>
      );

    case ClothingStyle.CROP_TOP: {
      const cropRy = clothingRy * 0.6;
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          <Ellipse cx="50" cy="97" rx={clothingRx - 4} ry={cropRy} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Center fold for dimension */}
          <Path d="M50,88 Q48,95 50,102" fill="none" stroke={shadow} strokeWidth={1} opacity={0.12} />
          {/* Crew neck — raised */}
          <Ellipse cx="50" cy="80" rx="8" ry="4" fill={skinTone} />
          <Path d="M42,80 Q50,84 58,80" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Hem with midriff skin showing */}
          <Path d={`M ${50 - clothingRx + 4} 105 Q 50 107 ${50 + clothingRx - 4} 105`} fill="none" stroke={shadow} strokeWidth={1.5} />
        </G>
      );
    }

    case ClothingStyle.TURTLENECK:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="40%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Center fold for dimension */}
          <Path d="M50,92 Q48,100 50,110" fill="none" stroke={shadow} strokeWidth={1} opacity={0.12} />
          {/* Tall neck tube — raised, taller coverage */}
          <Rect x="40" y="67" width="20" height="18" rx="6" fill={color} />
          <Rect x="41" y="68" width="18" height="16" rx="5" fill={shadow} opacity={0.3} />
          {/* Ribbing texture lines on neck */}
          <Path d="M41,71 Q50,73 59,71" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.4} />
          <Path d="M41,74 Q50,76 59,74" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.4} />
          <Path d="M41,77 Q50,79 59,77" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.4} />
          <Path d="M41,80 Q50,82 59,80" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.4} />
          <Path d="M41,83 Q50,85 59,83" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.4} />
          {/* Knit texture */}
          <Path d="M20,95 L80,95" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.2} />
          <Path d="M18,100 L82,100" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.2} />
          <Path d="M20,105 L80,105" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.2} />
        </G>
      );

    case ClothingStyle.CARDIGAN:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={color} />
              <Stop offset="60%" stopColor={shadow} />
              <Stop offset="100%" stopColor={deepShadow} />
            </LinearGradient>
            <LinearGradient id={ids.shirt} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={secondaryColor || '#ffffff'} />
              <Stop offset="100%" stopColor={adjustBrightness(secondaryColor || '#ffffff', -15)} />
            </LinearGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Center fold for dimension */}
          <Path d="M50,90 Q48,103 50,116" fill="none" stroke={shadow} strokeWidth={1} opacity={0.12} />
          {/* Inner shirt visible through open front */}
          <Path d="M42,85 L42,118 L58,118 L58,85 Z" fill={`url(#${ids.shirt})`} />
          {/* Open front edges */}
          <Path d="M42,85 L42,118" fill="none" stroke={shadow} strokeWidth={1.5} />
          <Path d="M58,85 L58,118" fill="none" stroke={shadow} strokeWidth={1.5} />
          {/* Button line down center */}
          <Circle cx="42" cy="92" r="1.5" fill={deepShadow} />
          <Circle cx="42" cy="100" r="1.5" fill={deepShadow} />
          <Circle cx="42" cy="108" r="1.5" fill={deepShadow} />
          {/* Knit ribbing at hem */}
          <Path d="M18,115 L82,115" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.25} />
          <Path d="M20,118 L80,118" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.25} />
        </G>
      );

    case ClothingStyle.JACKET_DENIM:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={color} />
              <Stop offset="60%" stopColor={shadow} />
              <Stop offset="100%" stopColor={deepShadow} />
            </LinearGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Center fold for dimension */}
          <Path d="M50,92 Q48,103 50,116" fill="none" stroke={shadow} strokeWidth={1} opacity={0.12} />
          {/* Lapels — raised */}
          <Path d="M35,80 L42,90 L50,80 L58,90 L65,80" fill={shadow} />
          {/* Chest pockets */}
          <Rect x="26" y="95" width="12" height="10" rx="1" fill={shadow} opacity={0.25} />
          <Path d="M26,100 L38,100" fill="none" stroke={deepShadow} strokeWidth={0.5} />
          <Rect x="62" y="95" width="12" height="10" rx="1" fill={shadow} opacity={0.25} />
          <Path d="M62,100 L74,100" fill="none" stroke={deepShadow} strokeWidth={0.5} />
          {/* Visible stitching */}
          <Path d="M50,85 L50,118" fill="none" stroke={highlight} strokeWidth={0.5} strokeDasharray="2,2" opacity={0.4} />
          <Path d="M26,108 L74,108" fill="none" stroke={highlight} strokeWidth={0.5} strokeDasharray="2,2" opacity={0.3} />
          {/* Buttons */}
          <Circle cx="50" cy="95" r="1.5" fill="#c0c0c0" />
          <Circle cx="50" cy="103" r="1.5" fill="#c0c0c0" />
          <Circle cx="50" cy="111" r="1.5" fill="#c0c0c0" />
        </G>
      );

    case ClothingStyle.JACKET_LEATHER:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={adjustBrightness(color, 10)} />
              <Stop offset="30%" stopColor={color} />
              <Stop offset="100%" stopColor={deepShadow} />
            </LinearGradient>
            <RadialGradient id={ids.clothingHigh} cx="40%" cy="35%" rx="30%" ry="25%">
              <Stop offset="0%" stopColor={highlight} stopOpacity="0.35" />
              <Stop offset="100%" stopColor={color} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          <Ellipse cx="45" cy="100" rx="30" ry="20" fill={`url(#${ids.clothingHigh})`} />
          {/* Center fold for dimension */}
          <Path d="M50,90 Q48,100 50,112" fill="none" stroke={deepShadow} strokeWidth={1} opacity={0.12} />
          {/* Collar detail — raised */}
          <Path d="M35,78 L40,83 L44,79" fill={shadow} />
          <Path d="M65,78 L60,83 L56,79" fill={shadow} />
          <Path d="M35,78 L40,83" fill="none" stroke={highlight} strokeWidth={0.5} opacity={0.5} />
          <Path d="M65,78 L60,83" fill="none" stroke={highlight} strokeWidth={0.5} opacity={0.5} />
          {/* Diagonal zipper */}
          <Path d="M44,80 L52,112" fill="none" stroke="#c0c0c0" strokeWidth={1.5} />
          <Path d="M44,80 L52,112" fill="none" stroke="#e0e0e0" strokeWidth={0.5} />
          {/* Zipper pull */}
          <Circle cx="48" cy="98" r="2" fill="#c0c0c0" />
          <Circle cx="48" cy="98" r="1" fill="#e0e0e0" />
        </G>
      );

    case ClothingStyle.HAWAIIAN:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="40%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Center fold for dimension */}
          <Path d="M50,95 Q48,105 50,115" fill="none" stroke={shadow} strokeWidth={1} opacity={0.12} />
          {/* Open collar showing skin */}
          <Path d="M42,78 L50,87 L58,78" fill={skinTone} />
          <Path d="M42,78 L50,87 L58,78" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Collar fold */}
          <Path d="M38,82 L40,82 L44,86" fill={shadow} opacity={0.3} />
          <Path d="M62,82 L60,82 L56,86" fill={shadow} opacity={0.3} />
          {/* Floral pattern hints - small circles scattered */}
          <Circle cx="30" cy="98" r="2.5" fill={secondaryColor || highlight} opacity={0.3} />
          <Circle cx="32" cy="96" r="1.5" fill={secondaryColor || highlight} opacity={0.2} />
          <Circle cx="70" cy="100" r="2.5" fill={secondaryColor || highlight} opacity={0.3} />
          <Circle cx="68" cy="98" r="1.5" fill={secondaryColor || highlight} opacity={0.2} />
          <Circle cx="40" cy="110" r="2" fill={secondaryColor || highlight} opacity={0.25} />
          <Circle cx="60" cy="108" r="2" fill={secondaryColor || highlight} opacity={0.25} />
          <Circle cx="50" cy="115" r="2.5" fill={secondaryColor || highlight} opacity={0.2} />
          <Circle cx="25" cy="108" r="1.8" fill={secondaryColor || highlight} opacity={0.2} />
          <Circle cx="75" cy="110" r="1.8" fill={secondaryColor || highlight} opacity={0.2} />
        </G>
      );

    case ClothingStyle.FLANNEL:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="40%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Center fold for dimension */}
          <Path d="M50,95 Q48,105 50,116" fill="none" stroke={shadow} strokeWidth={1} opacity={0.12} />
          {/* Open collar */}
          <Path d="M42,78 L50,87 L58,78" fill={skinTone} />
          <Path d="M42,78 L50,87 L58,78" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Plaid pattern - horizontal */}
          <Path d="M20,92 L80,92" fill="none" stroke={secondaryColor || highlight} strokeWidth={1.5} opacity={0.3} />
          <Path d="M18,100 L82,100" fill="none" stroke={secondaryColor || highlight} strokeWidth={1.5} opacity={0.3} />
          <Path d="M20,108 L80,108" fill="none" stroke={secondaryColor || highlight} strokeWidth={1.5} opacity={0.3} />
          {/* Plaid pattern - vertical */}
          <Path d="M35,85 L35,118" fill="none" stroke={secondaryColor || highlight} strokeWidth={1.5} opacity={0.25} />
          <Path d="M50,85 L50,118" fill="none" stroke={secondaryColor || highlight} strokeWidth={1.5} opacity={0.25} />
          <Path d="M65,85 L65,118" fill="none" stroke={secondaryColor || highlight} strokeWidth={1.5} opacity={0.25} />
          {/* Button placket */}
          <Path d="M48,84 L48,118 L52,118 L52,84" fill={adjustBrightness(color, -10)} opacity={0.3} />
          <Circle cx="50" cy="92" r="1.2" fill={shadow} />
          <Circle cx="50" cy="100" r="1.2" fill={shadow} />
          <Circle cx="50" cy="108" r="1.2" fill={shadow} />
        </G>
      );

    case ClothingStyle.JERSEY:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="40%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Center fold for dimension */}
          <Path d="M50,95 Q48,105 50,115" fill="none" stroke={shadow} strokeWidth={1} opacity={0.12} />
          {/* V-neck — raised */}
          <Path d="M43,78 L50,87 L57,78" fill={skinTone} />
          <Path d="M43,78 L50,87 L57,78" fill="none" stroke={shadow} strokeWidth={1.5} />
          {/* Side stripes */}
          <Path d="M18,90 L18,115" fill="none" stroke={secondaryColor || highlight} strokeWidth={3} opacity={0.5} />
          <Path d="M82,90 L82,115" fill="none" stroke={secondaryColor || highlight} strokeWidth={3} opacity={0.5} />
          {/* Number panel area */}
          <Rect x="38" y="96" width="24" height="16" rx="2" fill={shadow} opacity={0.15} />
        </G>
      );

    case ClothingStyle.HENLEY:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="40%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Center fold for dimension */}
          <Path d="M50,90 Q48,98 50,105" fill="none" stroke={shadow} strokeWidth={1} opacity={0.12} />
          {/* Crew neck — raised */}
          <Ellipse cx="50" cy="80" rx="8" ry="4" fill={skinTone} />
          <Path d="M42,80 Q50,84 58,80" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Short button placket (3 buttons) */}
          <Path d="M48,85 L48,100 L52,100 L52,85" fill={adjustBrightness(color, -10)} opacity={0.25} />
          <Circle cx="50" cy="88" r="1.1" fill={shadow} />
          <Circle cx="50" cy="92" r="1.1" fill={shadow} />
          <Circle cx="50" cy="96" r="1.1" fill={shadow} />
        </G>
      );

    case ClothingStyle.JACKET_BOMBER:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={color} />
              <Stop offset="60%" stopColor={shadow} />
              <Stop offset="100%" stopColor={deepShadow} />
            </LinearGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Center fold for dimension */}
          <Path d="M50,90 Q48,103 50,116" fill="none" stroke={shadow} strokeWidth={1} opacity={0.12} />
          {/* Ribbed collar — raised */}
          <Path d="M36,77 Q50,81 64,77" fill={shadow} />
          <Path d="M37,78 Q50,82 63,78" fill="none" stroke={deepShadow} strokeWidth={0.5} opacity={0.5} />
          <Path d="M38,79 Q50,83 62,79" fill="none" stroke={deepShadow} strokeWidth={0.5} opacity={0.5} />
          {/* Center zipper */}
          <Path d="M50,85 L50,118" fill="none" stroke="#c0c0c0" strokeWidth={1.5} />
          <Path d="M50,85 L50,118" fill="none" stroke="#e0e0e0" strokeWidth={0.5} />
          {/* Zipper pull */}
          <Circle cx="50" cy="95" r="1.8" fill="#c0c0c0" />
          <Circle cx="50" cy="95" r="0.8" fill="#e0e0e0" />
          {/* Chest pockets */}
          <Rect x="28" y="95" width="10" height="8" rx="1" fill={shadow} opacity={0.2} />
          <Rect x="62" y="95" width="10" height="8" rx="1" fill={shadow} opacity={0.2} />
          {/* Ribbed hem */}
          <Path d="M20,115 L80,115" fill="none" stroke={deepShadow} strokeWidth={0.8} opacity={0.3} />
          <Path d="M20,117 L80,117" fill="none" stroke={deepShadow} strokeWidth={0.8} opacity={0.3} />
          {/* Ribbed cuffs */}
          <Rect x="10" y="108" width="8" height="4" rx="1" fill={shadow} opacity={0.3} />
          <Rect x="82" y="108" width="8" height="4" rx="1" fill={shadow} opacity={0.3} />
        </G>
      );

    case ClothingStyle.TSHIRT:
    default:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.clothingGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="40%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
            <RadialGradient id={ids.clothingHigh} cx="50%" cy="30%" rx="40%" ry="35%">
              <Stop offset="0%" stopColor={highlight} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={color} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Path d={clothingBodyPath} fill={`url(#${ids.clothingGrad})`} stroke={deepShadow} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Fabric highlight */}
          <Ellipse cx="50" cy="100" rx="35" ry="22" fill={`url(#${ids.clothingHigh})`} />
          {/* Center fold for dimension */}
          <Path d="M50,90 Q48,100 50,112" fill="none" stroke={shadow} strokeWidth={1} opacity={0.15} />
          {/* Crew neck with depth — natural curved neckline */}
          <Ellipse cx="50" cy="80" rx="9" ry="4.5" fill={skinTone} />
          <Ellipse cx="50" cy="81" rx="8" ry="3.5" fill={skinShadow} opacity={0.15} />
          {/* Crew neck curve */}
          <Path d="M41,80 Q46,85 50,85 Q54,85 59,80" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Shoulder seam lines */}
          <Path d="M ${50 - clothingRx},${shoulderY + 2} Q ${50 - clothingRx * 0.6},${shoulderY + 4} ${50 - clothingRx * 0.4},${shoulderY + 6}" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.15} />
          <Path d="M ${50 + clothingRx},${shoulderY + 2} Q ${50 + clothingRx * 0.6},${shoulderY + 4} ${50 + clothingRx * 0.4},${shoulderY + 6}" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.15} />
          {/* Sleeve hints */}
          <Path d="M12,98 Q15,95 18,100" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
          <Path d="M88,98 Q85,95 82,100" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
          {/* Elbow wrinkle suggestions */}
          <Path d="M20,95 Q22,97 20,99" fill="none" stroke={shadow} strokeWidth={0.6} opacity={0.08} />
          <Path d="M80,95 Q78,97 80,99" fill="none" stroke={shadow} strokeWidth={0.6} opacity={0.08} />
          {/* Fabric fold lines at waist */}
          <Path d="M30,108 Q37,106 42,108" fill="none" stroke={shadow} strokeWidth={0.7} opacity={0.12} />
          <Path d="M58,107 Q64,105 70,107" fill="none" stroke={shadow} strokeWidth={0.7} opacity={0.1} />
          <Path d="M38,114 Q44,112 50,114" fill="none" stroke={shadow} strokeWidth={0.6} opacity={0.1} />
        </G>
      );
  }
});

export default ClothingRenderer;
