/**
 * FullBodyAvatar Component - Full Body SVG Avatar Renderer
 *
 * Renders a complete full-body customizable avatar from an AvatarConfig.
 * Extended viewBox for full body rendering with arms, legs, hands, feet, and clothing.
 *
 * Layer order (back to front):
 * 1. Background
 * 2. Hair behind (for long hair styles)
 * 3. Legs (when visible)
 * 4. Feet/Shoes
 * 5. Body (torso)
 * 6. Bottoms (pants/skirts)
 * 7. Arms (behind)
 * 8. Clothing/top
 * 9. Arms (front)
 * 10. Hands
 * 11. Face (head, ears, neck)
 * 12. Face Details
 * 13. Makeup
 * 14. Nose
 * 15. Mouth
 * 16. Eyes
 * 17. Eyebrows
 * 18. Facial hair
 * 19. Hair (top/front)
 * 20. Accessories
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Defs, ClipPath, Rect, G, Path, Ellipse, Circle, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import {
  AvatarConfig,
  DEFAULT_MALE_CONFIG,
  isAvatarConfig,
  StoredAvatar,
  isStoredAvatar,
  FaceShape,
  EyeStyle,
  EyebrowStyle,
  NoseStyle,
  MouthStyle,
  HairStyle,
  HairTreatment,
  FacialHairStyle,
  AccessoryStyle,
  ClothingStyle,
  FreckleStyle,
  WrinkleStyle,
  CheekStyle,
  SkinDetail,
  EyeshadowStyle,
  EyelinerStyle,
  LipstickStyle,
  BlushStyle,
  BodyType,
  ArmPose,
  LegPose,
  HandGesture,
  BottomStyle,
  ShoeStyle,
} from './types';
import { Face, Eyes, Hair, HairBehind, Nose, Mouth, Eyebrows, FaceDetails, Makeup } from './parts';
import { adjustBrightness } from './utils';
import { Body } from './parts/Body';
import { Arms, getWristPositions } from './parts/Arms';
import { Legs, getAnklePositions } from './parts/Legs';
import { Hands } from './parts/Hands';
import { Feet } from './parts/Feet';
import { Bottoms } from './parts/Bottoms';
import { Shoes } from './parts/Shoes';

// ============================================================================
// TYPES
// ============================================================================

type FullBodySize = 'sm' | 'md' | 'lg' | 'xl';

const FULL_BODY_SIZE_MAP: Record<FullBodySize, number> = {
  sm: 150,
  md: 200,
  lg: 300,
  xl: 400,
};

interface FullBodyAvatarProps {
  config?: AvatarConfig | StoredAvatar | null;
  size?: FullBodySize;
  customSize?: number;
  style?: ViewStyle;
  showBorder?: boolean;
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;
  testID?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getConfig(input?: AvatarConfig | StoredAvatar | null): AvatarConfig {
  if (!input) return DEFAULT_MALE_CONFIG;

  if (isStoredAvatar(input)) {
    return { ...DEFAULT_MALE_CONFIG, ...input.config };
  }

  if (isAvatarConfig(input)) {
    return { ...DEFAULT_MALE_CONFIG, ...input };
  }

  return DEFAULT_MALE_CONFIG;
}

// ============================================================================
// CLOTHING RENDERER - Full Body Version with detailed SVG paths
// Coordinates: torso from y=72 (neck) to y=122 (hips), shoulders at x=32/68
// ============================================================================

interface ClothingProps {
  type?: ClothingStyle;
  color: string;
  secondaryColor?: string;
  skinTone: string;
}

function Clothing({ type = ClothingStyle.TSHIRT, color, secondaryColor, skinTone }: ClothingProps) {
  const shadow = adjustBrightness(color, -30);
  const deepShadow = adjustBrightness(color, -45);
  const highlight = adjustBrightness(color, 20);
  const skinShadow = adjustBrightness(skinTone, -20);

  // Use stable gradient IDs
  const gradientId = `fbClothingGrad_${type}`;
  const highlightId = `fbClothingHigh_${type}`;
  const shirtId = `fbShirt_${type}`;

  switch (type) {
    case ClothingStyle.HOODIE:
      return (
        <G>
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="40%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
            <RadialGradient id={highlightId} cx="50%" cy="30%" r="50%">
              <Stop offset="0%" stopColor={highlight} stopOpacity={0.3} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {/* Main hoodie body */}
          <Path
            d={`M 32 80 Q 28 85 26 95 Q 24 110 28 122 L 72 122 Q 76 110 74 95 Q 72 85 68 80 Q 55 82 50 82 Q 45 82 32 80 Z`}
            fill={`url(#${gradientId})`}
          />
          {/* Highlight overlay */}
          <Ellipse cx="50" cy="95" rx="18" ry="15" fill={`url(#${highlightId})`} />
          {/* Hood behind neck */}
          <Path d="M 35 75 Q 30 78 28 82 L 72 82 Q 70 78 65 75" fill={shadow} />
          {/* Hood depth shadow */}
          <Path d="M 36 76 Q 32 79 30 81 L 70 81 Q 68 79 64 76" fill={deepShadow} opacity={0.4} />
          {/* Hoodie strings */}
          <Path d="M 44 78 L 44 92" fill="none" stroke={shadow} strokeWidth={1.5} />
          <Path d="M 44 90 L 42 95 M 44 90 L 46 95" fill="none" stroke={shadow} strokeWidth={1} />
          <Path d="M 56 78 L 56 92" fill="none" stroke={shadow} strokeWidth={1.5} />
          <Path d="M 56 90 L 54 95 M 56 90 L 58 95" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Front pocket */}
          <Path d="M 38 105 Q 50 108 62 105 L 62 118 Q 50 120 38 118 Z" fill={shadow} opacity={0.25} />
          {/* Collar with depth */}
          <Path d="M 40 78 Q 50 84 60 78" fill="none" stroke={deepShadow} strokeWidth={2.5} />
          <Path d="M 40 78 Q 50 83 60 78" fill="none" stroke={shadow} strokeWidth={1.5} />
          {/* Side seams */}
          <Path d="M 28 95 Q 30 100 28 110" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.3} />
          <Path d="M 72 95 Q 70 100 72 110" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.3} />
        </G>
      );

    case ClothingStyle.VNECK:
      return (
        <G>
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          {/* Main body */}
          <Path
            d={`M 32 80 Q 28 85 26 95 Q 24 110 28 122 L 72 122 Q 76 110 74 95 Q 72 85 68 80 Q 55 82 50 82 Q 45 82 32 80 Z`}
            fill={`url(#${gradientId})`}
          />
          {/* V-neck cutout with skin */}
          <Path d="M 42 78 L 50 95 L 58 78" fill={skinTone} />
          <Path d="M 43 79 L 50 93 L 57 79" fill={skinShadow} opacity={0.2} />
          {/* V-neck edge definition */}
          <Path d="M 42 78 L 50 95 L 58 78" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Collar bone shadow hint */}
          <Path d="M 44 82 Q 50 84 56 82" fill="none" stroke={skinShadow} strokeWidth={0.5} opacity={0.3} />
          {/* Side seams */}
          <Path d="M 28 95 L 28 115" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.2} />
          <Path d="M 72 95 L 72 115" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.2} />
        </G>
      );

    case ClothingStyle.SCOOP_NECK:
      return (
        <G>
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          {/* Main body */}
          <Path
            d={`M 32 80 Q 28 85 26 95 Q 24 110 28 122 L 72 122 Q 76 110 74 95 Q 72 85 68 80 Q 55 82 50 82 Q 45 82 32 80 Z`}
            fill={`url(#${gradientId})`}
          />
          {/* Scoop neck cutout with depth */}
          <Ellipse cx="50" cy="80" rx="10" ry="5" fill={skinTone} />
          <Ellipse cx="50" cy="81" rx="9" ry="4" fill={skinShadow} opacity={0.15} />
          {/* Neckline edge */}
          <Path d="M 40 80 Q 50 86 60 80" fill="none" stroke={shadow} strokeWidth={1} />
        </G>
      );

    case ClothingStyle.BLAZER:
      return (
        <G>
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={color} />
              <Stop offset="60%" stopColor={shadow} />
              <Stop offset="100%" stopColor={deepShadow} />
            </LinearGradient>
            <LinearGradient id={shirtId} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={secondaryColor || '#ffffff'} />
              <Stop offset="100%" stopColor={adjustBrightness(secondaryColor || '#ffffff', -15)} />
            </LinearGradient>
          </Defs>
          {/* Main blazer body */}
          <Path
            d={`M 30 80 Q 26 88 24 100 Q 22 115 26 122 L 74 122 Q 78 115 76 100 Q 74 88 70 80 Q 55 82 50 82 Q 45 82 30 80 Z`}
            fill={`url(#${gradientId})`}
          />
          {/* Lapels with depth */}
          <Path d="M 38 78 L 44 95 L 50 82 L 56 95 L 62 78" fill={shadow} />
          <Path d="M 39 79 L 44 93 L 50 83" fill={deepShadow} opacity={0.3} />
          <Path d="M 61 79 L 56 93 L 50 83" fill={deepShadow} opacity={0.3} />
          {/* Lapel edge highlights */}
          <Path d="M 38 78 L 44 93" fill="none" stroke={highlight} strokeWidth={0.5} opacity={0.4} />
          <Path d="M 62 78 L 56 93" fill="none" stroke={highlight} strokeWidth={0.5} opacity={0.4} />
          {/* Inner shirt */}
          <Path d="M 44 95 L 50 82 L 56 95 L 56 122 L 44 122 Z" fill={`url(#${shirtId})`} />
          {/* Buttons with detail */}
          <Circle cx="50" cy="100" r="1.8" fill={deepShadow} />
          <Circle cx="50" cy="100" r="1" fill={shadow} />
          <Circle cx="50" cy="110" r="1.8" fill={deepShadow} />
          <Circle cx="50" cy="110" r="1" fill={shadow} />
          {/* Pocket hints */}
          <Path d="M 30 102 L 38 102 L 38 112 L 30 112" fill="none" stroke={deepShadow} strokeWidth={0.5} opacity={0.4} />
          <Path d="M 70 102 L 62 102 L 62 112 L 70 112" fill="none" stroke={deepShadow} strokeWidth={0.5} opacity={0.4} />
        </G>
      );

    case ClothingStyle.SWEATER:
      return (
        <G>
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="40%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          {/* Main body */}
          <Path
            d={`M 32 80 Q 28 85 26 95 Q 24 110 28 122 L 72 122 Q 76 110 74 95 Q 72 85 68 80 Q 55 82 50 82 Q 45 82 32 80 Z`}
            fill={`url(#${gradientId})`}
          />
          {/* Crew neck with ribbing */}
          <Ellipse cx="50" cy="79" rx="8" ry="4" fill={shadow} />
          <Ellipse cx="50" cy="79" rx="6" ry="3" fill={deepShadow} opacity={0.5} />
          {/* Neck ribbing lines */}
          <Path d="M 44 78 Q 50 82 56 78" fill="none" stroke={color} strokeWidth={0.5} />
          <Path d="M 45 79 Q 50 83 55 79" fill="none" stroke={color} strokeWidth={0.5} />
          {/* Knit texture - horizontal ribs */}
          <Path d="M 30 90 L 70 90" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.2} />
          <Path d="M 28 100 L 72 100" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.2} />
          <Path d="M 28 110 L 72 110" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.2} />
          {/* Vertical cable knit pattern hints */}
          <Path d="M 38 82 L 38 120" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.15} />
          <Path d="M 50 82 L 50 120" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.15} />
          <Path d="M 62 82 L 62 120" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.15} />
          {/* Bottom ribbing */}
          <Path d="M 28 118 Q 50 122 72 118 L 72 122 Q 50 126 28 122 Z" fill={shadow} opacity={0.3} />
        </G>
      );

    case ClothingStyle.TANK_TOP:
      return (
        <G>
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          {/* Main body - narrower for tank top */}
          <Path
            d={`M 38 82 L 36 122 L 64 122 L 62 82 Q 55 86 50 86 Q 45 86 38 82 Z`}
            fill={`url(#${gradientId})`}
          />
          {/* Armhole shadows */}
          <Path d="M 38 82 Q 34 95 36 110" fill="none" stroke={shadow} strokeWidth={2} opacity={0.3} />
          <Path d="M 62 82 Q 66 95 64 110" fill="none" stroke={shadow} strokeWidth={2} opacity={0.3} />
          {/* Straps with gradient */}
          <Path d="M 40 72 L 40 86" fill="none" stroke={color} strokeWidth={6} />
          <Path d="M 40 72 L 40 86" fill="none" stroke={highlight} strokeWidth={2} opacity={0.3} />
          <Path d="M 60 72 L 60 86" fill="none" stroke={color} strokeWidth={6} />
          <Path d="M 60 72 L 60 86" fill="none" stroke={highlight} strokeWidth={2} opacity={0.3} />
          {/* Neckline curve */}
          <Path d="M 40 86 Q 50 90 60 86" fill="none" stroke={shadow} strokeWidth={1} />
        </G>
      );

    case ClothingStyle.COLLAR_SHIRT:
      return (
        <G>
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
          </Defs>
          {/* Main body */}
          <Path
            d={`M 32 80 Q 28 85 26 95 Q 24 110 28 122 L 72 122 Q 76 110 74 95 Q 72 85 68 80 Q 55 82 50 82 Q 45 82 32 80 Z`}
            fill={`url(#${gradientId})`}
          />
          {/* Collar points */}
          <Path d="M 38 76 L 44 85 L 48 80" fill={color} />
          <Path d="M 62 76 L 56 85 L 52 80" fill={color} />
          {/* Collar shadow/depth */}
          <Path d="M 38 76 L 44 85 L 48 80" fill="none" stroke={shadow} strokeWidth={1} />
          <Path d="M 62 76 L 56 85 L 52 80" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Collar fold shadow */}
          <Path d="M 39 77 L 44 84" fill="none" stroke={deepShadow} strokeWidth={0.5} opacity={0.4} />
          <Path d="M 61 77 L 56 84" fill="none" stroke={deepShadow} strokeWidth={0.5} opacity={0.4} />
          {/* Button placket */}
          <Path d="M 48 80 L 48 122 L 52 122 L 52 80" fill={adjustBrightness(color, -10)} opacity={0.3} />
          {/* Buttons with detail */}
          <Circle cx="50" cy="88" r="1.3" fill={shadow} />
          <Circle cx="50" cy="88" r="0.6" fill={deepShadow} />
          <Circle cx="50" cy="98" r="1.3" fill={shadow} />
          <Circle cx="50" cy="98" r="0.6" fill={deepShadow} />
          <Circle cx="50" cy="108" r="1.3" fill={shadow} />
          <Circle cx="50" cy="108" r="0.6" fill={deepShadow} />
          <Circle cx="50" cy="118" r="1.3" fill={shadow} />
          <Circle cx="50" cy="118" r="0.6" fill={deepShadow} />
        </G>
      );

    case ClothingStyle.OVERALL:
    case ClothingStyle.OVERALLS:
      return (
        <G>
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={color} />
              <Stop offset="70%" stopColor={shadow} />
              <Stop offset="100%" stopColor={deepShadow} />
            </LinearGradient>
            <LinearGradient id={shirtId} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={secondaryColor || '#ffffff'} />
              <Stop offset="100%" stopColor={adjustBrightness(secondaryColor || '#ffffff', -20)} />
            </LinearGradient>
          </Defs>
          {/* Shirt underneath */}
          <Path
            d={`M 32 80 Q 28 85 26 95 Q 24 110 28 122 L 72 122 Q 76 110 74 95 Q 72 85 68 80 Q 55 82 50 82 Q 45 82 32 80 Z`}
            fill={`url(#${shirtId})`}
          />
          {/* Overall bib */}
          <Path d="M 36 88 L 36 122 L 64 122 L 64 88 Q 50 94 36 88 Z" fill={`url(#${gradientId})`} />
          {/* Bib pocket */}
          <Path d="M 44 98 L 44 110 L 56 110 L 56 98 Q 50 100 44 98" fill={shadow} opacity={0.3} />
          <Path d="M 44 98 Q 50 100 56 98" fill="none" stroke={deepShadow} strokeWidth={0.5} />
          {/* Straps with thickness */}
          <Path d="M 38 88 L 42 72" fill="none" stroke={color} strokeWidth={5} />
          <Path d="M 38 88 L 42 72" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.3} />
          <Path d="M 62 88 L 58 72" fill="none" stroke={color} strokeWidth={5} />
          <Path d="M 62 88 L 58 72" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.3} />
          {/* Metal buttons */}
          <Circle cx="39" cy="90" r="2.5" fill="#c0c0c0" />
          <Circle cx="39" cy="90" r="1.5" fill="#e0e0e0" />
          <Circle cx="39" cy="89" r="0.5" fill="#ffffff" opacity={0.6} />
          <Circle cx="61" cy="90" r="2.5" fill="#c0c0c0" />
          <Circle cx="61" cy="90" r="1.5" fill="#e0e0e0" />
          <Circle cx="61" cy="89" r="0.5" fill="#ffffff" opacity={0.6} />
        </G>
      );

    case ClothingStyle.TSHIRT:
    default:
      return (
        <G>
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={highlight} />
              <Stop offset="40%" stopColor={color} />
              <Stop offset="100%" stopColor={shadow} />
            </LinearGradient>
            <RadialGradient id={highlightId} cx="50%" cy="30%" r="40%">
              <Stop offset="0%" stopColor={highlight} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {/* Main shirt body */}
          <Path
            d={`M 32 80 Q 28 85 26 95 Q 24 110 28 122 L 72 122 Q 76 110 74 95 Q 72 85 68 80 Q 55 82 50 82 Q 45 82 32 80 Z`}
            fill={`url(#${gradientId})`}
          />
          {/* Fabric highlight */}
          <Ellipse cx="50" cy="95" rx="16" ry="12" fill={`url(#${highlightId})`} />
          {/* Crew neck with depth */}
          <Ellipse cx="50" cy="79" rx="7" ry="3.5" fill={skinTone} />
          <Ellipse cx="50" cy="80" rx="6" ry="2.5" fill={skinShadow} opacity={0.15} />
          {/* Neckline edge */}
          <Path d="M 43 79 Q 50 83 57 79" fill="none" stroke={shadow} strokeWidth={1} />
          {/* Sleeve hints */}
          <Path d="M 26 90 Q 28 88 30 92" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
          <Path d="M 74 90 Q 72 88 70 92" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
          {/* Side seams */}
          <Path d="M 28 95 L 28 118" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.2} />
          <Path d="M 72 95 L 72 118" fill="none" stroke={shadow} strokeWidth={0.5} opacity={0.2} />
        </G>
      );
  }
}

// ============================================================================
// FACIAL HAIR RENDERER
// ============================================================================

interface FacialHairProps {
  type: FacialHairStyle;
  color: string;
}

function FacialHair({ type, color }: FacialHairProps) {
  if (type === FacialHairStyle.NONE) return null;

  const shadow = adjustBrightness(color, -25);

  switch (type) {
    case FacialHairStyle.STUBBLE:
      return (
        <G opacity={0.35}>
          <Ellipse cx="50" cy="64" rx="14" ry="12" fill={color} />
          <Ellipse cx="33" cy="56" rx="6" ry="10" fill={color} />
          <Ellipse cx="67" cy="56" rx="6" ry="10" fill={color} />
        </G>
      );

    case FacialHairStyle.FULL_BEARD:
      return (
        <G>
          <Path d="M24,50 Q22,82 50,92 Q78,82 76,50 L72,55 Q50,82 28,55 Z" fill={color} />
          <Path d="M30,55 Q50,70 70,55 Q50,65 30,55" fill={shadow} opacity={0.3} />
        </G>
      );

    case FacialHairStyle.MUSTACHE:
      return (
        <Path d="M38,57 Q42,54 50,55.5 Q58,54 62,57 Q58,60 50,58.5 Q42,60 38,57" fill={color} />
      );

    default:
      return null;
  }
}

// ============================================================================
// ACCESSORIES RENDERER
// ============================================================================

interface AccessoriesProps {
  type: AccessoryStyle;
  color?: string;
}

function Accessories({ type, color = '#1a1a2e' }: AccessoriesProps) {
  if (type === AccessoryStyle.NONE) return null;

  switch (type) {
    case AccessoryStyle.GLASSES_ROUND:
      return (
        <G>
          <Circle cx="38" cy="44" r="9" fill="none" stroke={color} strokeWidth={1.8} />
          <Circle cx="62" cy="44" r="9" fill="none" stroke={color} strokeWidth={1.8} />
          <Path d="M47,44 Q50,42 53,44" stroke={color} strokeWidth={1.5} fill="none" />
          <Path d="M29,43 L22,41" stroke={color} strokeWidth={1.5} />
          <Path d="M71,43 L78,41" stroke={color} strokeWidth={1.5} />
        </G>
      );

    case AccessoryStyle.SUNGLASSES:
      return (
        <G>
          <Rect x="28" y="38" width="19" height="14" rx="3" fill="#1a1a2e" />
          <Rect x="53" y="38" width="19" height="14" rx="3" fill="#1a1a2e" />
          <Path d="M47,44 L53,44" stroke="#1a1a2e" strokeWidth={3} />
          <Path d="M28,42 L22,40" stroke="#1a1a2e" strokeWidth={2.5} />
          <Path d="M72,42 L78,40" stroke="#1a1a2e" strokeWidth={2.5} />
        </G>
      );

    default:
      return null;
  }
}

// ============================================================================
// MAIN FULL BODY AVATAR COMPONENT
// ============================================================================

export function FullBodyAvatar({
  config: inputConfig,
  size = 'md',
  customSize,
  style,
  showBorder = false,
  borderColor = '#e0e0e0',
  borderWidth = 2,
  backgroundColor = '#f0f0f0',
  testID,
}: FullBodyAvatarProps) {
  const config = getConfig(inputConfig);
  const pixelSize = customSize || FULL_BODY_SIZE_MAP[size];

  // Get body-related config with defaults
  const bodyType = config.bodyType || BodyType.AVERAGE;
  const armPose = config.armPose || ArmPose.DOWN;
  const legPose = config.legPose || LegPose.STANDING;
  const leftHandGesture = config.leftHandGesture || HandGesture.OPEN;
  const rightHandGesture = config.rightHandGesture || HandGesture.OPEN;
  const bottomStyle = config.bottomStyle || BottomStyle.JEANS;
  const bottomColor = config.bottomColor || '#1a237e';
  const shoeStyle = config.shoeStyle || ShoeStyle.SNEAKERS;
  const shoeColor = config.shoeColor || '#f5f5f5';

  // Get wrist and ankle positions for hands and feet
  const wristPositions = getWristPositions(armPose, bodyType);
  const anklePositions = getAnklePositions(legPose, bodyType);

  // Determine eyebrow color (defaults to hair color)
  const eyebrowColor = config.eyebrowColor || config.hairColor;

  // Determine if hair should render behind face
  const isLongHair = [
    HairStyle.LONG_STRAIGHT,
    HairStyle.LONG_WAVY,
    HairStyle.LONG_CURLY,
    HairStyle.LONG_BRAIDS,
    HairStyle.LONG_LAYERS,
    HairStyle.AFRO,
    HairStyle.LOCS,
    HairStyle.BOX_BRAIDS,
    HairStyle.HIJAB,
    HairStyle.MEDIUM_STRAIGHT,
    HairStyle.MEDIUM_CURLY,
    HairStyle.MEDIUM_BOB,
  ].includes(config.hairStyle as HairStyle);

  // Calculate aspect ratio for full body (taller than wide)
  const aspectRatio = 200 / 100; // Height / Width of viewBox
  const width = pixelSize;
  const height = pixelSize * aspectRatio;

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius: 10,
          borderWidth: showBorder ? borderWidth : 0,
          borderColor: showBorder ? borderColor : 'transparent',
          backgroundColor,
        },
        style,
      ]}
      testID={testID}
    >
      <Svg
        width={width}
        height={height}
        viewBox="0 0 100 200"
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs>
          <ClipPath id="fullBodyClip">
            <Rect x="0" y="0" width="100" height="200" rx="5" />
          </ClipPath>
        </Defs>

        <G clipPath="url(#fullBodyClip)">
          {/* 1. Background */}
          <Rect x="0" y="0" width="100" height="200" fill={backgroundColor} />

          {/* 2. Hair behind (for long hair styles) */}
          {isLongHair && (
            <HairBehind
              style={config.hairStyle as HairStyle}
              hairColor={config.hairColor}
              hairTreatment={config.hairTreatment as HairTreatment}
              hairSecondaryColor={config.hairSecondaryColor}
            />
          )}

          {/* 3. Legs */}
          <Legs
            pose={legPose}
            bodyType={bodyType}
            skinTone={config.skinTone}
          />

          {/* 4. Feet or Shoes */}
          {shoeStyle === ShoeStyle.BAREFOOT || shoeStyle === ShoeStyle.NONE ? (
            <Feet
              skinTone={config.skinTone}
              leftAnkle={anklePositions.left}
              rightAnkle={anklePositions.right}
              legPose={legPose}
            />
          ) : (
            <Shoes
              style={shoeStyle}
              color={shoeColor}
              leftAnkle={anklePositions.left}
              rightAnkle={anklePositions.right}
              legPose={legPose}
            />
          )}

          {/* 5. Body (torso - skin) */}
          <Body
            bodyType={bodyType}
            skinTone={config.skinTone}
          />

          {/* 6. Bottoms (pants/skirts) */}
          <Bottoms
            style={bottomStyle}
            bodyType={bodyType}
            legPose={legPose}
            color={bottomColor}
          />

          {/* 7-8. Arms (behind body for some poses) */}
          {armPose === ArmPose.CROSSED && (
            <Arms
              pose={armPose}
              bodyType={bodyType}
              skinTone={config.skinTone}
            />
          )}

          {/* 9. Clothing/top */}
          <Clothing
            type={config.clothing as ClothingStyle}
            color={config.clothingColor || '#3f51b5'}
            secondaryColor={config.clothingSecondaryColor}
            skinTone={config.skinTone}
          />

          {/* 10. Arms (front for most poses) */}
          {armPose !== ArmPose.CROSSED && (
            <Arms
              pose={armPose}
              bodyType={bodyType}
              skinTone={config.skinTone}
            />
          )}

          {/* 11. Hands */}
          <Hands
            leftGesture={leftHandGesture}
            rightGesture={rightHandGesture}
            skinTone={config.skinTone}
            leftPosition={wristPositions.left}
            rightPosition={wristPositions.right}
          />

          {/* 12-21. Head group with consistent orientation */}
          <G transform="translate(50, 50) rotate(0) translate(-50, -50)">
            {/* 12. Face (head, ears, neck) */}
            <Face
              shape={config.faceShape as FaceShape}
              skinTone={config.skinTone}
            />

            {/* 13. Face Details */}
            <FaceDetails
              skinTone={config.skinTone}
              freckles={config.freckles as FreckleStyle}
              wrinkles={config.wrinkles as WrinkleStyle}
              cheekStyle={config.cheekStyle as CheekStyle}
              skinDetail={config.skinDetail as SkinDetail}
            />

            {/* 14. Blush */}
            {config.blushStyle && config.blushStyle !== BlushStyle.NONE && (
              <Makeup
                blushStyle={config.blushStyle as BlushStyle}
                blushColor={config.blushColor}
                skinTone={config.skinTone}
              />
            )}

            {/* 15. Nose */}
            <Nose
              style={config.noseStyle as NoseStyle}
              skinTone={config.skinTone}
            />

            {/* 16. Eye Makeup */}
            {(config.eyeshadowStyle && config.eyeshadowStyle !== EyeshadowStyle.NONE) ||
             (config.eyelinerStyle && config.eyelinerStyle !== EyelinerStyle.NONE) ? (
              <Makeup
                eyeshadowStyle={config.eyeshadowStyle as EyeshadowStyle}
                eyeshadowColor={config.eyeshadowColor}
                eyelinerStyle={config.eyelinerStyle as EyelinerStyle}
                eyelinerColor={config.eyelinerColor}
              />
            ) : null}

            {/* 17. Mouth */}
            <Mouth
              style={config.mouthStyle as MouthStyle}
              lipColor={config.lipColor}
            />

            {/* 18. Lipstick */}
            {config.lipstickStyle && config.lipstickStyle !== LipstickStyle.NONE && (
              <Makeup
                lipstickStyle={config.lipstickStyle as LipstickStyle}
                lipstickColor={config.lipstickColor}
              />
            )}

            {/* 19. Eyes */}
            <Eyes
              style={config.eyeStyle as EyeStyle}
              eyeColor={config.eyeColor}
            />

            {/* 20. Eyebrows */}
            <Eyebrows
              style={config.eyebrowStyle as EyebrowStyle}
              eyebrowColor={eyebrowColor}
            />

            {/* 21. Facial hair */}
            {config.facialHair && config.facialHair !== FacialHairStyle.NONE && (
              <FacialHair
                type={config.facialHair as FacialHairStyle}
                color={config.facialHairColor || config.hairColor}
              />
            )}
          </G>

          {/* 22. Hair (top/front) */}
          <Hair
            style={config.hairStyle as HairStyle}
            hairColor={config.hairColor}
            hairTreatment={config.hairTreatment as HairTreatment}
            hairSecondaryColor={config.hairSecondaryColor}
          />

          {/* 23. Accessories */}
          {config.accessory && config.accessory !== AccessoryStyle.NONE && (
            <Accessories
              type={config.accessory as AccessoryStyle}
              color={config.accessoryColor}
            />
          )}
        </G>
      </Svg>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default FullBodyAvatar;
