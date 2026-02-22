/**
 * PreviewThumbnail Component
 *
 * Renders a mini-avatar preview for option grids.
 * Shows how a style option would look on the current avatar.
 */

import React, { memo, useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Defs, ClipPath, Circle, G, Rect } from 'react-native-svg';
import {
  AvatarConfig,
  FaceShape,
  EyeStyle,
  EyebrowStyle,
  NoseStyle,
  MouthStyle,
  HairStyle,
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
} from '../avatar/types';
import { Face, Eyes, Hair, HairBehind, Nose, Mouth, Eyebrows } from '../avatar/parts';

// =============================================================================
// TYPES
// =============================================================================

export type PreviewType =
  | 'hairStyle'
  | 'eyeStyle'
  | 'eyebrowStyle'
  | 'noseStyle'
  | 'mouthStyle'
  | 'faceShape'
  | 'facialHair'
  | 'accessory'
  | 'clothing';

interface PreviewThumbnailProps {
  type: PreviewType;
  value: string;
  baseConfig: AvatarConfig;
  size?: number;
  style?: ViewStyle;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_SIZE = 48;

// Long hair styles that need the "behind" layer
const LONG_HAIR_STYLES = [
  HairStyle.LONG_STRAIGHT,
  HairStyle.LONG_WAVY,
  HairStyle.LONG_CURLY,
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
  HairStyle.LONG_PIGTAILS,
  HairStyle.LONG_TWISTS,
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
  HairStyle.AFRO,
  HairStyle.LOCS,
  HairStyle.BOX_BRAIDS,
  HairStyle.TWIST_OUT_LONG,
  HairStyle.SILK_PRESS,
  HairStyle.NATURAL_CURLS,
  HairStyle.HIJAB,
];

// =============================================================================
// PREVIEW RENDERERS
// =============================================================================

function HairPreview({
  value,
  baseConfig,
}: {
  value: string;
  baseConfig: AvatarConfig;
}) {
  const hairStyle = value as HairStyle;
  const isLongHair = LONG_HAIR_STYLES.includes(hairStyle);

  return (
    <G>
      {/* Background face shape */}
      <Face shape={baseConfig.faceShape as FaceShape} skinTone={baseConfig.skinTone} />
      {/* Hair behind (for long hair) */}
      {isLongHair && (
        <HairBehind style={hairStyle} hairColor={baseConfig.hairColor} />
      )}
      {/* Eyes for context */}
      <Eyes style={EyeStyle.DEFAULT} eyeColor={baseConfig.eyeColor} />
      {/* Hair on top */}
      <Hair style={hairStyle} hairColor={baseConfig.hairColor} />
    </G>
  );
}

function EyePreview({
  value,
  baseConfig,
}: {
  value: string;
  baseConfig: AvatarConfig;
}) {
  return (
    <G>
      <Face shape={baseConfig.faceShape as FaceShape} skinTone={baseConfig.skinTone} />
      <Eyebrows style={baseConfig.eyebrowStyle as EyebrowStyle} eyebrowColor={baseConfig.hairColor} />
      <Eyes style={value as EyeStyle} eyeColor={baseConfig.eyeColor} />
    </G>
  );
}

function EyebrowPreview({
  value,
  baseConfig,
}: {
  value: string;
  baseConfig: AvatarConfig;
}) {
  return (
    <G>
      <Face shape={baseConfig.faceShape as FaceShape} skinTone={baseConfig.skinTone} />
      <Eyes style={EyeStyle.DEFAULT} eyeColor={baseConfig.eyeColor} />
      <Eyebrows style={value as EyebrowStyle} eyebrowColor={baseConfig.hairColor} />
    </G>
  );
}

function NosePreview({
  value,
  baseConfig,
}: {
  value: string;
  baseConfig: AvatarConfig;
}) {
  return (
    <G>
      <Face shape={baseConfig.faceShape as FaceShape} skinTone={baseConfig.skinTone} />
      <Eyes style={EyeStyle.DEFAULT} eyeColor={baseConfig.eyeColor} />
      <Nose style={value as NoseStyle} skinTone={baseConfig.skinTone} />
    </G>
  );
}

function MouthPreview({
  value,
  baseConfig,
}: {
  value: string;
  baseConfig: AvatarConfig;
}) {
  return (
    <G>
      <Face shape={baseConfig.faceShape as FaceShape} skinTone={baseConfig.skinTone} />
      <Nose style={baseConfig.noseStyle as NoseStyle} skinTone={baseConfig.skinTone} />
      <Mouth style={value as MouthStyle} />
    </G>
  );
}

function FaceShapePreview({
  value,
  baseConfig,
}: {
  value: string;
  baseConfig: AvatarConfig;
}) {
  return (
    <G>
      <Face shape={value as FaceShape} skinTone={baseConfig.skinTone} />
      <Eyes style={EyeStyle.DEFAULT} eyeColor={baseConfig.eyeColor} />
      <Nose style={NoseStyle.DEFAULT} skinTone={baseConfig.skinTone} />
      <Mouth style={MouthStyle.SMILE} />
    </G>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function PreviewThumbnailComponent({
  type,
  value,
  baseConfig,
  size = DEFAULT_SIZE,
  style,
}: PreviewThumbnailProps) {
  const content = useMemo(() => {
    switch (type) {
      case 'hairStyle':
        return <HairPreview value={value} baseConfig={baseConfig} />;
      case 'eyeStyle':
        return <EyePreview value={value} baseConfig={baseConfig} />;
      case 'eyebrowStyle':
        return <EyebrowPreview value={value} baseConfig={baseConfig} />;
      case 'noseStyle':
        return <NosePreview value={value} baseConfig={baseConfig} />;
      case 'mouthStyle':
        return <MouthPreview value={value} baseConfig={baseConfig} />;
      case 'faceShape':
        return <FaceShapePreview value={value} baseConfig={baseConfig} />;
      default:
        return null;
    }
  }, [type, value, baseConfig]);

  if (!content) return null;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id="thumbnailClip">
            <Circle cx="50" cy="50" r="48" />
          </ClipPath>
        </Defs>
        <G clipPath="url(#thumbnailClip)">
          <Rect x="0" y="0" width="100" height="100" fill="#f5f5f5" />
          {content}
        </G>
      </Svg>
    </View>
  );
}

export const PreviewThumbnail = memo(PreviewThumbnailComponent);

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    overflow: 'hidden',
  },
});

export default PreviewThumbnail;
