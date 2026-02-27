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

import React, { memo, useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Defs, ClipPath, Circle, G, Rect } from 'react-native-svg';
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
  HairTreatment,
  FacialHairStyle,
  AccessoryStyle,
  ClothingStyle,
  FreckleStyle,
  WrinkleStyle,
  CheekStyle,
  SkinDetail,
  EyeBagsStyle,
  EyelashStyle,
  EyeshadowStyle,
  EyelinerStyle,
  LipstickStyle,
  BlushStyle,
  FacialProportions,
  DEFAULT_FACIAL_PROPORTIONS,
  FaceTattooStyle,
} from './types';
import { Face, Eyes, Hair, HairBehind, Nose, Mouth, Eyebrows, FaceDetails, Makeup, FaceTattoo } from './parts';
import { ClothingRenderer, FacialHairRenderer, AccessoryRenderer } from './renderers';

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
 * Calculate transforms for facial parts based on proportions
 */
function getProportionTransforms(proportions: FacialProportions) {
  const transforms = {
    // Eyes
    eyeLeftX: 50 - 12 - (proportions.eyeSpacing * 3),
    eyeRightX: 50 + 12 + (proportions.eyeSpacing * 3),
    eyeY: 44 - (proportions.eyeHeight * 3),
    eyeScale: 1 + (proportions.eyeSize * 0.15),
    // Eyebrows
    eyebrowLeftX: 50 - 12 - (proportions.eyebrowSpacing * 3),
    eyebrowRightX: 50 + 12 + (proportions.eyebrowSpacing * 3),
    eyebrowY: 36 - (proportions.eyebrowHeight * 3),
    // Nose
    noseY: 52 + (proportions.nosePosition * 4),
    noseScale: 1 + (proportions.noseSize * 0.2),
    // Mouth
    mouthY: 65 + (proportions.mouthPosition * 4),
    mouthScale: 1 + (proportions.mouthSize * 0.15),
    // Face shape
    faceScaleX: 1 + (proportions.faceWidth * 0.1),
    jawScaleX: 1 + (proportions.jawWidth * 0.1),
    foreheadScaleY: 1 + (proportions.foreheadHeight * 0.05),
    chinRoundness: proportions.chinShape,
  };
  return transforms;
}

// ============================================================================
// LONG HAIR STYLES CONSTANT (outside component for performance)
// ============================================================================

const LONG_HAIR_STYLES = new Set([
  // Long styles
  HairStyle.LONG_STRAIGHT,
  HairStyle.LONG_WAVY,
  HairStyle.LONG_CURLY,
  HairStyle.LONG_PONYTAIL,
  HairStyle.LONG_PONYTAIL_HIGH,
  HairStyle.LONG_PONYTAIL_LOW,
  HairStyle.LONG_PONYTAIL_SIDE,
  HairStyle.LONG_BUN,
  HairStyle.LONG_BUN_MESSY,
  HairStyle.LONG_BUN_TOP,
  HairStyle.LONG_CHIGNON,
  HairStyle.LONG_BRAIDS,
  HairStyle.LONG_BRAID_SINGLE,
  HairStyle.LONG_BRAIDS_PIGTAILS,
  HairStyle.LONG_LAYERS,
  HairStyle.LONG_BEACH_WAVES,
  HairStyle.LONG_DEFINED_CURLS,
  HairStyle.LONG_HALF_UP,
  HairStyle.LONG_HALF_UP_BUN,
  HairStyle.LONG_SIDE_SWEPT,
  HairStyle.LONG_CENTER_PART,
  HairStyle.LONG_CURTAIN_BANGS,
  HairStyle.LONG_SPACE_BUNS,
  HairStyle.LONG_PIGTAILS,
  HairStyle.LONG_TWISTS,
  // Medium styles
  HairStyle.MEDIUM_STRAIGHT,
  HairStyle.MEDIUM_CURLY,
  HairStyle.MEDIUM_BOB,
  HairStyle.MEDIUM_BOB_ANGLED,
  HairStyle.MEDIUM_BOB_LAYERED,
  HairStyle.MEDIUM_BOB_BLUNT,
  HairStyle.MEDIUM_LOB,
  HairStyle.MEDIUM_SHAG,
  HairStyle.MEDIUM_WOLF_CUT,
  HairStyle.MEDIUM_LAYERS,
  HairStyle.MEDIUM_CURTAIN_BANGS,
  HairStyle.MEDIUM_WAVY,
  HairStyle.MEDIUM_CURLY_DEFINED,
  HairStyle.MEDIUM_TWIST_OUT,
  HairStyle.MEDIUM_HALF_UP,
  HairStyle.MEDIUM_SIDE_SWEPT,
  HairStyle.MEDIUM_FEATHERED,
  // Protective styles (long variants)
  HairStyle.AFRO,
  HairStyle.LOCS,
  HairStyle.BOX_BRAIDS,
  HairStyle.TWIST_OUT_LONG,
  HairStyle.SILK_PRESS,
  HairStyle.NATURAL_CURLS,
  // Headwear
  HairStyle.HIJAB,
]);

// ============================================================================
// MAIN AVATAR COMPONENT
// ============================================================================

function AvatarComponent({
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
  // Memoize config extraction
  const config = useMemo(() => getConfig(inputConfig), [inputConfig]);
  const pixelSize = customSize || AVATAR_SIZE_MAP[size];

  // Memoize derived values
  const eyebrowColor = useMemo(
    () => config.eyebrowColor || config.hairColor,
    [config.eyebrowColor, config.hairColor]
  );

  // Use Set for O(1) lookup
  const isLongHair = useMemo(
    () => LONG_HAIR_STYLES.has(config.hairStyle as HairStyle),
    [config.hairStyle]
  );

  // Calculate proportion transforms
  const proportions = config.facialProportions || DEFAULT_FACIAL_PROPORTIONS;
  const transforms = useMemo(
    () => getProportionTransforms(proportions),
    [proportions]
  );

  // Memoize container style
  const containerStyle = useMemo(
    () => [
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
    ],
    [pixelSize, showBorder, borderWidth, borderColor, backgroundColor, style]
  );

  return (
    <View style={containerStyle} testID={testID}>
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

        {/* Avatar drop shadow for depth */}
        <Circle cx="51" cy="52" r="49" fill="#00000018" />

        <G clipPath="url(#avatarClip)">
          {/* 1. Background */}
          <Rect x="0" y="0" width="100" height="100" fill={backgroundColor} />

          {/* 2. Hair behind (for long hair styles) */}
          {isLongHair && (
            <HairBehind
              style={config.hairStyle as HairStyle}
              hairColor={config.hairColor}
              hairTreatment={config.hairTreatment as HairTreatment}
              hairSecondaryColor={config.hairSecondaryColor}
            />
          )}

          {/* 3. Clothing/body */}
          <ClothingRenderer
            type={config.clothing as ClothingStyle}
            color={config.clothingColor || '#3f51b5'}
            secondaryColor={config.clothingSecondaryColor}
            skinTone={config.skinTone}
          />

          {/* 4. Face (head, ears, neck) */}
          <G transform={`scale(${transforms.faceScaleX}, 1)`} origin="50, 50">
            <Face
              shape={config.faceShape as FaceShape}
              skinTone={config.skinTone}
            />
          </G>

          {/* 4.5 Face Details (freckles, wrinkles, cheek style, skin details, eye bags) */}
          <FaceDetails
            skinTone={config.skinTone}
            freckles={config.freckles as FreckleStyle}
            wrinkles={config.wrinkles as WrinkleStyle}
            cheekStyle={config.cheekStyle as CheekStyle}
            skinDetail={config.skinDetail as SkinDetail}
            eyeBags={config.eyeBags as EyeBagsStyle}
          />

          {/* 4.6 Blush (part of makeup, rendered under other features) */}
          {config.blushStyle && config.blushStyle !== BlushStyle.NONE && (
            <Makeup
              blushStyle={config.blushStyle as BlushStyle}
              blushColor={config.blushColor}
              skinTone={config.skinTone}
            />
          )}

          {/* 5. Nose */}
          <G transform={`translate(0, ${transforms.noseY - 52}) scale(${transforms.noseScale})`} origin="50, 52">
            <Nose
              style={config.noseStyle as NoseStyle}
              skinTone={config.skinTone}
            />
          </G>

          {/* 5.5 Eye Makeup (eyeshadow and eyeliner, rendered before eyes) */}
          {(config.eyeshadowStyle && config.eyeshadowStyle !== EyeshadowStyle.NONE) ||
           (config.eyelinerStyle && config.eyelinerStyle !== EyelinerStyle.NONE) ? (
            <Makeup
              eyeshadowStyle={config.eyeshadowStyle as EyeshadowStyle}
              eyeshadowColor={config.eyeshadowColor}
              eyelinerStyle={config.eyelinerStyle as EyelinerStyle}
              eyelinerColor={config.eyelinerColor}
            />
          ) : null}

          {/* 6. Mouth */}
          <G transform={`translate(0, ${transforms.mouthY - 65}) scale(${transforms.mouthScale})`} origin="50, 65">
            <Mouth
              style={config.mouthStyle as MouthStyle}
              lipColor={config.lipColor}
            />
          </G>

          {/* 6.5 Lipstick (rendered over mouth) */}
          {config.lipstickStyle && config.lipstickStyle !== LipstickStyle.NONE && (
            <G transform={`translate(0, ${transforms.mouthY - 65}) scale(${transforms.mouthScale})`} origin="50, 65">
              <Makeup
                lipstickStyle={config.lipstickStyle as LipstickStyle}
                lipstickColor={config.lipstickColor}
              />
            </G>
          )}

          {/* 7. Eyes */}
          <G transform={`translate(${(transforms.eyeLeftX - 38 + transforms.eyeRightX - 62) / 2}, ${transforms.eyeY - 44}) scale(${transforms.eyeScale})`} origin="50, 44">
            <Eyes
              style={config.eyeStyle as EyeStyle}
              eyeColor={config.eyeColor}
              rightEyeColor={config.rightEyeColor}
              eyelashStyle={config.eyelashStyle as EyelashStyle}
            />
          </G>

          {/* 8. Eyebrows */}
          <G transform={`translate(${(transforms.eyebrowLeftX - 38 + transforms.eyebrowRightX - 62) / 2}, ${transforms.eyebrowY - 36})`}>
            <Eyebrows
              style={config.eyebrowStyle as EyebrowStyle}
              eyebrowColor={eyebrowColor}
              adjustments={{
                thickness: proportions.eyebrowThickness,
                arch: proportions.eyebrowArch,
                length: proportions.eyebrowLength,
                tilt: proportions.eyebrowTilt,
              }}
            />
          </G>

          {/* 9. Facial hair (if present) */}
          {config.facialHair && config.facialHair !== FacialHairStyle.NONE && (
            <FacialHairRenderer
              type={config.facialHair as FacialHairStyle}
              color={config.facialHairColor || config.hairColor}
            />
          )}

          {/* 9.5. Face Tattoos (if present) */}
          {config.faceTattoo && config.faceTattoo !== FaceTattooStyle.NONE && (
            <FaceTattoo
              style={config.faceTattoo as FaceTattooStyle}
              color={config.faceTattooColor || '#1a1a1a'}
            />
          )}

          {/* 10. Hair (top/front) */}
          <Hair
            style={config.hairStyle as HairStyle}
            hairColor={config.hairColor}
            hairTreatment={config.hairTreatment as HairTreatment}
            hairSecondaryColor={config.hairSecondaryColor}
          />

          {/* 11. Accessories */}
          {config.accessory && config.accessory !== AccessoryStyle.NONE && (
            <AccessoryRenderer
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

// Memoized export for performance - prevents re-renders when props haven't changed
export const Avatar = memo(AvatarComponent);

export default Avatar;
