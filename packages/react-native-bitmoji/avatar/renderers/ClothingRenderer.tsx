/**
 * ClothingRenderer - Modular clothing rendering component
 *
 * Extracted from Avatar.tsx for better maintainability.
 * Renders various clothing styles as SVG elements.
 */

import React, { memo } from 'react';
import { G, Defs, Ellipse, Path, Circle, Rect, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { ClothingStyle } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ClothingRendererProps {
  type?: ClothingStyle;
  color: string;
  secondaryColor?: string;
  skinTone: string;
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
}: ClothingRendererProps) {
  const shadow = adjustBrightness(color, -30);
  const deepShadow = adjustBrightness(color, -45);
  const highlight = adjustBrightness(color, 20);
  const skinShadow = adjustBrightness(skinTone, -20);

  // Use stable gradient IDs instead of Math.random()
  const ids = useGradientIds<GradientIds>(['clothingGrad', 'clothingHigh', 'shirt']);

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
          <Ellipse cx="50" cy="105" rx="42" ry="28" fill={`url(#${ids.clothingGrad})`} />
          {/* Highlight overlay */}
          <Ellipse cx="50" cy="100" rx="35" ry="22" fill={`url(#${ids.clothingHigh})`} />
          {/* Hood behind neck */}
          <Path d="M30,85 Q25,90 25,95 L75,95 Q75,90 70,85" fill={shadow} />
          {/* Hood depth shadow */}
          <Path d="M32,86 Q28,90 28,93 L72,93 Q72,90 68,86" fill={deepShadow} opacity={0.4} />
          {/* Hoodie strings */}
          <Path d="M42,88 L42,100" fill="none" stroke={shadow} strokeWidth={1.5} />
          <Path d="M42,98 L40,102 M42,98 L44,102" fill="none" stroke={shadow} strokeWidth={1} />
          <Path d="M58,88 L58,100" fill="none" stroke={shadow} strokeWidth={1.5} />
          <Path d="M58,98 L56,102 M58,98 L60,102" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Collar with depth */}
          <Path d="M38,85 Q50,92 62,85" fill="none" stroke={deepShadow} strokeWidth={3} />
          <Path d="M38,85 Q50,91 62,85" fill="none" stroke={shadow} strokeWidth={1.5} />
          {/* Side seams */}
          <Path d="M15,100 Q18,95 20,100" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
          <Path d="M85,100 Q82,95 80,100" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
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
          <Ellipse cx="50" cy="105" rx="42" ry="28" fill={`url(#${ids.clothingGrad})`} />
          {/* V-neck cutout with skin shadow */}
          <Path d="M40,82 L50,98 L60,82" fill={skinTone} />
          <Path d="M41,83 L50,96 L59,83" fill={skinShadow} opacity={0.2} />
          {/* V-neck edge definition */}
          <Path d="M40,82 L50,98 L60,82" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Collar bone shadow hint */}
          <Path d="M43,86 Q50,88 57,86" fill="none" stroke={skinShadow} strokeWidth={0.5} opacity={0.3} />
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
          <Ellipse cx="50" cy="105" rx="42" ry="28" fill={`url(#${ids.clothingGrad})`} />
          {/* Scoop neck cutout with depth */}
          <Ellipse cx="50" cy="86" rx="12" ry="6" fill={skinTone} />
          <Ellipse cx="50" cy="87" rx="11" ry="5" fill={skinShadow} opacity={0.15} />
          {/* Neckline edge */}
          <Path d="M38,86 Q50,92 62,86" fill="none" stroke={shadow} strokeWidth={1} />
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
          <Ellipse cx="50" cy="105" rx="42" ry="28" fill={`url(#${ids.clothingGrad})`} />
          {/* Lapels with depth */}
          <Path d="M35,85 L42,95 L50,85 L58,95 L65,85" fill={shadow} />
          <Path d="M36,86 L42,94 L50,86" fill={deepShadow} opacity={0.3} />
          <Path d="M64,86 L58,94 L50,86" fill={deepShadow} opacity={0.3} />
          {/* Lapel edge highlights */}
          <Path d="M36,85 L42,94" fill="none" stroke={highlight} strokeWidth={0.5} opacity={0.4} />
          <Path d="M64,85 L58,94" fill="none" stroke={highlight} strokeWidth={0.5} opacity={0.4} />
          {/* Inner shirt */}
          <Path d="M42,95 L50,85 L58,95 L58,110 L42,110 Z" fill={`url(#${ids.shirt})`} />
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
          <Ellipse cx="50" cy="105" rx="42" ry="28" fill={`url(#${ids.clothingGrad})`} />
          {/* Crew neck with ribbing */}
          <Ellipse cx="50" cy="85" rx="10" ry="5" fill={shadow} />
          <Ellipse cx="50" cy="85" rx="8" ry="4" fill={deepShadow} opacity={0.5} />
          {/* Neck ribbing lines */}
          <Path d="M42,84 Q50,88 58,84" fill="none" stroke={color} strokeWidth={0.5} />
          <Path d="M43,85 Q50,89 57,85" fill="none" stroke={color} strokeWidth={0.5} />
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
          {/* Main body */}
          <Path d="M30,85 L30,120 L70,120 L70,85 Q60,88 50,88 Q40,88 30,85 Z" fill={`url(#${ids.clothingGrad})`} />
          {/* Armhole shadows */}
          <Path d="M30,85 Q28,95 30,105" fill="none" stroke={shadow} strokeWidth={2} opacity={0.3} />
          <Path d="M70,85 Q72,95 70,105" fill="none" stroke={shadow} strokeWidth={2} opacity={0.3} />
          {/* Straps with gradient */}
          <Path d="M35,75 L35,88" fill="none" stroke={color} strokeWidth={7} />
          <Path d="M35,75 L35,88" fill="none" stroke={highlight} strokeWidth={2} opacity={0.3} />
          <Path d="M65,75 L65,88" fill="none" stroke={color} strokeWidth={7} />
          <Path d="M65,75 L65,88" fill="none" stroke={highlight} strokeWidth={2} opacity={0.3} />
          {/* Neckline curve */}
          <Path d="M35,88 Q50,92 65,88" fill="none" stroke={shadow} strokeWidth={1} />
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
          <Ellipse cx="50" cy="105" rx="42" ry="28" fill={`url(#${ids.clothingGrad})`} />
          {/* Collar points */}
          <Path d="M35,82 L40,88 L44,84" fill={color} />
          <Path d="M65,82 L60,88 L56,84" fill={color} />
          {/* Collar shadow/depth */}
          <Path d="M35,82 L40,88 L44,84" fill="none" stroke={shadow} strokeWidth={1} />
          <Path d="M65,82 L60,88 L44,84" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Collar fold shadow */}
          <Path d="M36,83 L40,87" fill="none" stroke={deepShadow} strokeWidth={0.5} opacity={0.4} />
          <Path d="M64,83 L60,87" fill="none" stroke={deepShadow} strokeWidth={0.5} opacity={0.4} />
          {/* Button placket */}
          <Path d="M48,84 L48,115 L52,115 L52,84" fill={adjustBrightness(color, -10)} opacity={0.3} />
          {/* Buttons with detail */}
          <Circle cx="50" cy="92" r="1.3" fill={shadow} />
          <Circle cx="50" cy="92" r="0.6" fill={deepShadow} />
          <Circle cx="50" cy="98" r="1.3" fill={shadow} />
          <Circle cx="50" cy="98" r="0.6" fill={deepShadow} />
          <Circle cx="50" cy="104" r="1.3" fill={shadow} />
          <Circle cx="50" cy="104" r="0.6" fill={deepShadow} />
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
          <Ellipse cx="50" cy="105" rx="42" ry="28" fill={`url(#${ids.shirt})`} />
          {/* Overall bib */}
          <Path d="M32,90 L32,120 L68,120 L68,90 Q50,95 32,90 Z" fill={`url(#${ids.clothingGrad})`} />
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
          <Ellipse cx="50" cy="105" rx="42" ry="28" fill={`url(#${ids.clothingGrad})`} />
          {/* Fabric highlight */}
          <Ellipse cx="50" cy="100" rx="35" ry="22" fill={`url(#${ids.clothingHigh})`} />
          {/* Crew neck with depth */}
          <Ellipse cx="50" cy="85" rx="9" ry="4.5" fill={skinTone} />
          <Ellipse cx="50" cy="86" rx="8" ry="3.5" fill={skinShadow} opacity={0.15} />
          {/* Neckline edge */}
          <Path d="M41,85 Q50,89 59,85" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Sleeve hints */}
          <Path d="M12,98 Q15,95 18,100" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
          <Path d="M88,98 Q85,95 82,100" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
        </G>
      );
  }
});

export default ClothingRenderer;
