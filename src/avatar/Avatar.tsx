/**
 * Avatar Component - Main SVG Avatar Renderer
 *
 * Renders a complete customizable avatar from an AvatarConfig.
 * Composes multiple SVG part components in proper z-order layering.
 *
 * Layer order (back to front):
 * 1. Background
 * 2. Hair behind (for long hair styles)
 * 3. Clothing/body
 * 4. Face (head, ears, neck)
 * 5. Nose
 * 6. Mouth
 * 7. Eyes
 * 8. Eyebrows
 * 9. Hair (top/front)
 * 10. Accessories
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Defs, ClipPath, Circle, G, Rect, Ellipse, Path } from 'react-native-svg';
import {
  AvatarConfig,
  AvatarSize,
  AVATAR_SIZE_MAP,
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
  FacialHairStyle,
  AccessoryStyle,
  ClothingStyle,
} from './types';
import { Face, Eyes, Hair, HairBehind, Nose, Mouth, Eyebrows } from './parts';

// ============================================================================
// PROPS
// ============================================================================

interface AvatarProps {
  /**
   * Avatar configuration or stored avatar object
   */
  config?: AvatarConfig | StoredAvatar | null;

  /**
   * Avatar size variant
   */
  size?: AvatarSize;

  /**
   * Custom size in pixels (overrides size prop)
   */
  customSize?: number;

  /**
   * Container style
   */
  style?: ViewStyle;

  /**
   * Whether to show a border around the avatar
   */
  showBorder?: boolean;

  /**
   * Border color (when showBorder is true)
   */
  borderColor?: string;

  /**
   * Border width (when showBorder is true)
   */
  borderWidth?: number;

  /**
   * Background color (visible in circular crop)
   */
  backgroundColor?: string;

  /**
   * Test ID for testing
   */
  testID?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract AvatarConfig from various input types
 */
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

/**
 * Adjust color brightness
 */
function adjustBrightness(hex: string, amount: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  const color = hex.replace('#', '');
  const r = clamp(parseInt(color.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(color.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(color.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ============================================================================
// CLOTHING RENDERER
// ============================================================================

interface ClothingProps {
  type?: ClothingStyle;
  color: string;
  secondaryColor?: string;
  skinTone: string;
}

function Clothing({ type = ClothingStyle.TSHIRT, color, secondaryColor, skinTone }: ClothingProps) {
  const shadow = adjustBrightness(color, -30);

  switch (type) {
    case ClothingStyle.HOODIE:
      return (
        <G>
          <Ellipse cx="50" cy="105" rx="42" ry="28" fill={color} />
          {/* Hood behind neck */}
          <Path
            d="M30,85 Q25,90 25,95 L75,95 Q75,90 70,85"
            fill={shadow}
          />
          {/* Hoodie strings */}
          <Path
            d="M42,88 L42,100 M58,88 L58,100"
            fill="none"
            stroke={shadow}
            strokeWidth={1.5}
          />
          {/* Collar */}
          <Path
            d="M38,85 Q50,92 62,85"
            fill="none"
            stroke={shadow}
            strokeWidth={2}
          />
        </G>
      );

    case ClothingStyle.VNECK:
      return (
        <G>
          <Ellipse cx="50" cy="105" rx="42" ry="28" fill={color} />
          {/* V-neck cutout */}
          <Path
            d="M40,82 L50,98 L60,82"
            fill={skinTone}
          />
        </G>
      );

    case ClothingStyle.SCOOP_NECK:
      return (
        <G>
          <Ellipse cx="50" cy="105" rx="42" ry="28" fill={color} />
          {/* Scoop neck cutout */}
          <Ellipse cx="50" cy="86" rx="12" ry="6" fill={skinTone} />
        </G>
      );

    case ClothingStyle.BLAZER:
      return (
        <G>
          <Ellipse cx="50" cy="105" rx="42" ry="28" fill={color} />
          {/* Lapels */}
          <Path
            d="M35,85 L42,95 L50,85 L58,95 L65,85"
            fill={shadow}
          />
          {/* Inner shirt */}
          <Path
            d="M42,95 L50,85 L58,95 L58,105 L42,105 Z"
            fill={secondaryColor || '#ffffff'}
          />
          {/* Buttons */}
          <Circle cx="50" cy="98" r="1.5" fill={shadow} />
          <Circle cx="50" cy="104" r="1.5" fill={shadow} />
        </G>
      );

    case ClothingStyle.SWEATER:
      return (
        <G>
          <Ellipse cx="50" cy="105" rx="42" ry="28" fill={color} />
          {/* Crew neck */}
          <Ellipse cx="50" cy="85" rx="10" ry="5" fill={shadow} />
          {/* Knit texture lines */}
          <Path
            d="M25,95 L75,95 M25,100 L75,100 M25,105 L75,105"
            fill="none"
            stroke={shadow}
            strokeWidth={0.5}
            opacity={0.3}
          />
        </G>
      );

    case ClothingStyle.TANK_TOP:
      return (
        <G>
          <Path
            d="M30,85 L30,120 L70,120 L70,85 Q60,88 50,88 Q40,88 30,85 Z"
            fill={color}
          />
          {/* Straps */}
          <Path
            d="M35,75 L35,88 M65,75 L65,88"
            fill="none"
            stroke={color}
            strokeWidth={6}
          />
        </G>
      );

    case ClothingStyle.COLLAR_SHIRT:
      return (
        <G>
          <Ellipse cx="50" cy="105" rx="42" ry="28" fill={color} />
          {/* Collar */}
          <Path
            d="M35,82 L40,88 L50,82 L60,88 L65,82"
            fill="none"
            stroke={color}
            strokeWidth={4}
          />
          <Path
            d="M35,82 L40,88 L50,82 L60,88 L65,82"
            fill="none"
            stroke={shadow}
            strokeWidth={1}
          />
          {/* Buttons */}
          <Circle cx="50" cy="92" r="1" fill={shadow} />
          <Circle cx="50" cy="98" r="1" fill={shadow} />
          <Circle cx="50" cy="104" r="1" fill={shadow} />
        </G>
      );

    case ClothingStyle.OVERALL:
      return (
        <G>
          {/* Shirt underneath */}
          <Ellipse cx="50" cy="105" rx="42" ry="28" fill={secondaryColor || '#ffffff'} />
          {/* Overall bib */}
          <Path
            d="M32,90 L32,120 L68,120 L68,90 Q50,95 32,90 Z"
            fill={color}
          />
          {/* Straps */}
          <Path
            d="M35,90 L38,75 M65,90 L62,75"
            fill="none"
            stroke={color}
            strokeWidth={5}
          />
          {/* Buttons */}
          <Circle cx="36" cy="92" r="2" fill={shadow} />
          <Circle cx="64" cy="92" r="2" fill={shadow} />
        </G>
      );

    case ClothingStyle.TSHIRT:
    default:
      return (
        <G>
          <Ellipse cx="50" cy="105" rx="42" ry="28" fill={color} />
          {/* Crew neck */}
          <Ellipse cx="50" cy="85" rx="8" ry="4" fill={skinTone} />
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

  switch (type) {
    case FacialHairStyle.STUBBLE:
      return (
        <G opacity={0.4}>
          <Ellipse cx="50" cy="62" rx="12" ry="10" fill={color} />
          <Ellipse cx="35" cy="55" rx="5" ry="8" fill={color} />
          <Ellipse cx="65" cy="55" rx="5" ry="8" fill={color} />
        </G>
      );

    case FacialHairStyle.LIGHT_BEARD:
      return (
        <Path
          d="M32,58 Q32,72 50,75 Q68,72 68,58"
          fill="none"
          stroke={color}
          strokeWidth={4}
          opacity={0.7}
        />
      );

    case FacialHairStyle.MEDIUM_BEARD:
      return (
        <Path
          d="M28,55 Q28,78 50,82 Q72,78 72,55 L68,60 Q50,75 32,60 Z"
          fill={color}
          opacity={0.9}
        />
      );

    case FacialHairStyle.FULL_BEARD:
      return (
        <Path
          d="M24,50 Q22,82 50,90 Q78,82 76,50 L72,55 Q50,80 28,55 Z"
          fill={color}
        />
      );

    case FacialHairStyle.GOATEE:
      return (
        <G>
          <Ellipse cx="50" cy="68" rx="8" ry="10" fill={color} />
          <Path
            d="M45,56 Q50,54 55,56"
            fill="none"
            stroke={color}
            strokeWidth={2}
          />
        </G>
      );

    case FacialHairStyle.MUSTACHE:
      return (
        <Path
          d="M38,57 Q42,55 50,56 Q58,55 62,57 Q58,59 50,58 Q42,59 38,57"
          fill={color}
        />
      );

    case FacialHairStyle.MUSTACHE_FANCY:
      return (
        <G>
          <Path
            d="M35,56 Q40,52 50,54 Q60,52 65,56 Q60,60 50,58 Q40,60 35,56"
            fill={color}
          />
          {/* Curled ends */}
          <Path
            d="M35,56 Q32,58 30,56 Q32,54 35,56"
            fill={color}
          />
          <Path
            d="M65,56 Q68,58 70,56 Q68,54 65,56"
            fill={color}
          />
        </G>
      );

    case FacialHairStyle.SIDEBURNS:
      return (
        <G>
          <Path d="M22,40 L22,60 Q24,65 28,60 L28,40 Z" fill={color} />
          <Path d="M78,40 L78,60 Q76,65 72,60 L72,40 Z" fill={color} />
        </G>
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
          <Circle cx="38" cy="44" r="9" fill="none" stroke={color} strokeWidth={1.5} />
          <Circle cx="62" cy="44" r="9" fill="none" stroke={color} strokeWidth={1.5} />
          <Path d="M47,44 L53,44" stroke={color} strokeWidth={1.5} />
          <Path d="M29,44 L22,42" stroke={color} strokeWidth={1.5} />
          <Path d="M71,44 L78,42" stroke={color} strokeWidth={1.5} />
        </G>
      );

    case AccessoryStyle.GLASSES_SQUARE:
      return (
        <G>
          <Rect x="28" y="38" width="18" height="12" rx="2" fill="none" stroke={color} strokeWidth={1.5} />
          <Rect x="54" y="38" width="18" height="12" rx="2" fill="none" stroke={color} strokeWidth={1.5} />
          <Path d="M46,44 L54,44" stroke={color} strokeWidth={1.5} />
          <Path d="M28,42 L22,40" stroke={color} strokeWidth={1.5} />
          <Path d="M72,42 L78,40" stroke={color} strokeWidth={1.5} />
        </G>
      );

    case AccessoryStyle.GLASSES_PRESCRIPTION:
      return (
        <G>
          <Circle cx="38" cy="44" r="10" fill="none" stroke={color} strokeWidth={2} />
          <Circle cx="62" cy="44" r="10" fill="none" stroke={color} strokeWidth={2} />
          <Path d="M48,44 L52,44" stroke={color} strokeWidth={2} />
          <Path d="M28,44 L22,42" stroke={color} strokeWidth={2} />
          <Path d="M72,44 L78,42" stroke={color} strokeWidth={2} />
        </G>
      );

    case AccessoryStyle.SUNGLASSES:
      return (
        <G>
          <Rect x="28" y="38" width="19" height="14" rx="3" fill="#1a1a2e" />
          <Rect x="53" y="38" width="19" height="14" rx="3" fill="#1a1a2e" />
          <Path d="M47,44 L53,44" stroke="#1a1a2e" strokeWidth={3} />
          <Path d="M28,42 L22,40" stroke="#1a1a2e" strokeWidth={2} />
          <Path d="M72,42 L78,40" stroke="#1a1a2e" strokeWidth={2} />
          {/* Reflection */}
          <Path d="M32,41 L36,41 L32,45" fill="white" opacity={0.2} />
          <Path d="M57,41 L61,41 L57,45" fill="white" opacity={0.2} />
        </G>
      );

    case AccessoryStyle.SUNGLASSES_AVIATOR:
      return (
        <G>
          <Path
            d="M28,40 Q28,52 38,52 Q48,52 48,44 L48,40 Q48,36 38,36 Q28,36 28,40 Z"
            fill="#1a1a2e"
          />
          <Path
            d="M52,40 Q52,52 62,52 Q72,52 72,44 L72,40 Q72,36 62,36 Q52,36 52,40 Z"
            fill="#1a1a2e"
          />
          <Path d="M48,42 L52,42" stroke="#c0c0c0" strokeWidth={2} />
          <Path d="M28,40 L22,38" stroke="#c0c0c0" strokeWidth={2} />
          <Path d="M72,40 L78,38" stroke="#c0c0c0" strokeWidth={2} />
        </G>
      );

    case AccessoryStyle.MONOCLE:
      return (
        <G>
          <Circle cx="62" cy="44" r="10" fill="none" stroke={color} strokeWidth={2} />
          <Path d="M72,44 L78,50 L78,70" stroke={color} strokeWidth={1} />
        </G>
      );

    case AccessoryStyle.EYEPATCH:
      return (
        <G>
          <Ellipse cx="38" cy="44" rx="12" ry="10" fill="#1a1a2e" />
          <Path d="M26,40 L22,35" stroke="#1a1a2e" strokeWidth={2} />
          <Path d="M50,40 L78,35" stroke="#1a1a2e" strokeWidth={2} />
        </G>
      );

    case AccessoryStyle.EARRING_SMALL:
      return (
        <G>
          <Circle cx="20" cy="52" r="2" fill="#ffd700" />
        </G>
      );

    case AccessoryStyle.EARRING_HOOP:
      return (
        <G>
          <Circle cx="20" cy="55" r="5" fill="none" stroke="#ffd700" strokeWidth={1.5} />
        </G>
      );

    case AccessoryStyle.NOSE_RING:
      return (
        <G>
          <Circle cx="50" cy="56" r="2" fill="none" stroke="#c0c0c0" strokeWidth={1} />
        </G>
      );

    case AccessoryStyle.HEADPHONES:
      return (
        <G>
          {/* Headband */}
          <Path
            d="M20,40 Q20,10 50,8 Q80,10 80,40"
            fill="none"
            stroke="#2d2d2d"
            strokeWidth={4}
          />
          {/* Left cup */}
          <Ellipse cx="18" cy="44" rx="8" ry="10" fill="#2d2d2d" />
          <Ellipse cx="18" cy="44" rx="5" ry="7" fill="#404040" />
          {/* Right cup */}
          <Ellipse cx="82" cy="44" rx="8" ry="10" fill="#2d2d2d" />
          <Ellipse cx="82" cy="44" rx="5" ry="7" fill="#404040" />
        </G>
      );

    default:
      return null;
  }
}

// ============================================================================
// MAIN AVATAR COMPONENT
// ============================================================================

export function Avatar({
  config: inputConfig,
  size = 'md',
  customSize,
  style,
  showBorder = false,
  borderColor = '#e0e0e0',
  borderWidth = 2,
  backgroundColor = '#f0f0f0',
  testID,
}: AvatarProps) {
  const config = getConfig(inputConfig);
  const pixelSize = customSize || AVATAR_SIZE_MAP[size];

  // Determine eyebrow color (defaults to hair color)
  const eyebrowColor = config.eyebrowColor || config.hairColor;

  // Determine if hair should render behind face
  const isLongHair = [
    HairStyle.LONG_STRAIGHT,
    HairStyle.LONG_WAVY,
    HairStyle.LONG_CURLY,
    HairStyle.LONG_BRAIDS,
    HairStyle.MEDIUM_STRAIGHT,
    HairStyle.MEDIUM_CURLY,
    HairStyle.AFRO,
    HairStyle.HIJAB,
  ].includes(config.hairStyle as HairStyle);

  return (
    <View
      style={[
        styles.container,
        {
          width: pixelSize,
          height: pixelSize,
          borderRadius: pixelSize / 2,
          borderWidth: showBorder ? borderWidth : 0,
          borderColor: showBorder ? borderColor : 'transparent',
          backgroundColor,
        },
        style,
      ]}
      testID={testID}
    >
      <Svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 100 100"
      >
        <Defs>
          <ClipPath id="avatarClip">
            <Circle cx="50" cy="50" r="49" />
          </ClipPath>
        </Defs>

        <G clipPath="url(#avatarClip)">
          {/* 1. Background */}
          <Rect x="0" y="0" width="100" height="100" fill={backgroundColor} />

          {/* 2. Hair behind (for long hair styles) */}
          {isLongHair && (
            <HairBehind
              style={config.hairStyle as HairStyle}
              hairColor={config.hairColor}
            />
          )}

          {/* 3. Clothing/body */}
          <Clothing
            type={config.clothing as ClothingStyle}
            color={config.clothingColor || '#3f51b5'}
            secondaryColor={config.clothingSecondaryColor}
            skinTone={config.skinTone}
          />

          {/* 4. Face (head, ears, neck) */}
          <Face
            shape={config.faceShape as FaceShape}
            skinTone={config.skinTone}
          />

          {/* 5. Nose */}
          <Nose
            style={config.noseStyle as NoseStyle}
            skinTone={config.skinTone}
          />

          {/* 6. Mouth */}
          <Mouth
            style={config.mouthStyle as MouthStyle}
            lipColor={config.lipColor}
          />

          {/* 7. Eyes */}
          <Eyes
            style={config.eyeStyle as EyeStyle}
            eyeColor={config.eyeColor}
          />

          {/* 8. Eyebrows */}
          <Eyebrows
            style={config.eyebrowStyle as EyebrowStyle}
            eyebrowColor={eyebrowColor}
          />

          {/* 9. Facial hair (if present) */}
          {config.facialHair && config.facialHair !== FacialHairStyle.NONE && (
            <FacialHair
              type={config.facialHair as FacialHairStyle}
              color={config.facialHairColor || config.hairColor}
            />
          )}

          {/* 10. Hair (top/front) */}
          <Hair
            style={config.hairStyle as HairStyle}
            hairColor={config.hairColor}
          />

          {/* 11. Accessories */}
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

export default Avatar;
