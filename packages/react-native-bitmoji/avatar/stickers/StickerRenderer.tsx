/**
 * StickerRenderer - Main sticker composition component
 *
 * Composes avatar + pose + background + props + text into a complete sticker.
 * This is the primary component for rendering Bitmoji-style stickers.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { G, Defs, ClipPath, Rect } from 'react-native-svg';
import { AvatarConfig, DEFAULT_MALE_CONFIG, isAvatarConfig, StoredAvatar, isStoredAvatar } from '../types';
import { Avatar } from '../Avatar';
import { FullBodyAvatar } from '../FullBodyAvatar';
import { BackgroundRenderer } from './BackgroundRenderer';
import { PropRenderer } from './PropRenderer';
import { TextOverlay, TextPosition, TextStyle as TextOverlayStyle } from './TextOverlay';
import {
  Sticker,
  StickerPose,
  Scene,
  StickerProp,
  Emotion,
  ExpressionPreset,
} from './types';
import { EXPRESSION_PRESETS, getDefaultPresetForEmotion } from '../expressions/presets';
import {
  EyeStyle,
  EyebrowStyle,
  MouthStyle,
  ArmPose,
  LegPose,
  HandGesture,
} from '../types';

// ============================================================================
// TYPES
// ============================================================================

export type StickerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const STICKER_SIZE_MAP: Record<StickerSize, number> = {
  xs: 64,
  sm: 96,
  md: 128,
  lg: 192,
  xl: 256,
};

interface StickerRendererProps {
  /** The sticker definition to render */
  sticker: Sticker;
  /** Avatar configuration to apply to the sticker */
  avatarConfig?: AvatarConfig | StoredAvatar | null;
  /** Size preset for the sticker */
  size?: StickerSize;
  /** Custom size in pixels (overrides size preset) */
  customSize?: number;
  /** Container style */
  style?: ViewStyle;
  /** Show border around sticker */
  showBorder?: boolean;
  /** Border color */
  borderColor?: string;
  /** Border width */
  borderWidth?: number;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// POSE CONFIGURATION
// ============================================================================

/**
 * Maps sticker poses to avatar body configurations
 */
const POSE_CONFIG: Record<StickerPose, {
  armPose?: ArmPose;
  legPose?: LegPose;
  leftHandGesture?: HandGesture;
  rightHandGesture?: HandGesture;
  isFaceOnly?: boolean;
}> = {
  // Standing poses
  [StickerPose.STANDING]: {
    armPose: ArmPose.DOWN,
    legPose: LegPose.STANDING,
  },
  [StickerPose.STANDING_HANDS_ON_HIPS]: {
    armPose: ArmPose.HIPS,
    legPose: LegPose.STANDING,
  },
  [StickerPose.STANDING_ARMS_CROSSED]: {
    armPose: ArmPose.CROSSED,
    legPose: LegPose.STANDING,
  },

  // Gestures
  [StickerPose.WAVING]: {
    armPose: ArmPose.WAVE,
    legPose: LegPose.STANDING,
    rightHandGesture: HandGesture.WAVE,
  },
  [StickerPose.THUMBS_UP]: {
    armPose: ArmPose.THUMBS_UP,
    legPose: LegPose.STANDING,
    rightHandGesture: HandGesture.THUMBS_UP,
  },
  [StickerPose.THUMBS_DOWN]: {
    armPose: ArmPose.THUMBS_UP,
    legPose: LegPose.STANDING,
    rightHandGesture: HandGesture.THUMBS_UP,
  },
  [StickerPose.PEACE_SIGN]: {
    armPose: ArmPose.PEACE,
    legPose: LegPose.STANDING,
    rightHandGesture: HandGesture.PEACE,
  },
  [StickerPose.OK_SIGN]: {
    armPose: ArmPose.THUMBS_UP,
    legPose: LegPose.STANDING,
  },
  [StickerPose.POINTING]: {
    armPose: ArmPose.POINTING,
    legPose: LegPose.STANDING,
    rightHandGesture: HandGesture.POINT,
  },
  [StickerPose.FACEPALM]: {
    armPose: ArmPose.WAVE,
    legPose: LegPose.STANDING,
  },
  [StickerPose.SHRUG]: {
    armPose: ArmPose.WAVE,
    legPose: LegPose.STANDING,
    leftHandGesture: HandGesture.OPEN,
    rightHandGesture: HandGesture.OPEN,
  },
  [StickerPose.CLAPPING]: {
    armPose: ArmPose.DOWN,
    legPose: LegPose.STANDING,
  },
  [StickerPose.HEART_HANDS]: {
    armPose: ArmPose.DOWN,
    legPose: LegPose.STANDING,
  },

  // Actions
  [StickerPose.SITTING]: {
    armPose: ArmPose.DOWN,
    legPose: LegPose.SITTING,
  },
  [StickerPose.LYING_DOWN]: {
    armPose: ArmPose.DOWN,
    legPose: LegPose.STANDING,
  },
  [StickerPose.RUNNING]: {
    armPose: ArmPose.WAVE,
    legPose: LegPose.WIDE,
  },
  [StickerPose.DANCING]: {
    armPose: ArmPose.WAVE,
    legPose: LegPose.WIDE,
  },
  [StickerPose.JUMPING]: {
    armPose: ArmPose.WAVE,
    legPose: LegPose.WIDE,
  },
  [StickerPose.WALKING]: {
    armPose: ArmPose.DOWN,
    legPose: LegPose.WIDE,
  },

  // Activities
  [StickerPose.SLEEPING]: {
    armPose: ArmPose.DOWN,
    legPose: LegPose.STANDING,
    isFaceOnly: true,
  },
  [StickerPose.EATING]: {
    armPose: ArmPose.WAVE,
    legPose: LegPose.STANDING,
    rightHandGesture: HandGesture.HOLDING,
  },
  [StickerPose.DRINKING]: {
    armPose: ArmPose.WAVE,
    legPose: LegPose.STANDING,
    rightHandGesture: HandGesture.HOLDING,
  },
  [StickerPose.WORKING]: {
    armPose: ArmPose.DOWN,
    legPose: LegPose.SITTING,
  },
  [StickerPose.READING]: {
    armPose: ArmPose.DOWN,
    legPose: LegPose.SITTING,
    leftHandGesture: HandGesture.HOLDING,
    rightHandGesture: HandGesture.HOLDING,
  },
  [StickerPose.THINKING_POSE]: {
    armPose: ArmPose.WAVE,
    legPose: LegPose.STANDING,
  },
  [StickerPose.CELEBRATING]: {
    armPose: ArmPose.WAVE,
    legPose: LegPose.WIDE,
  },

  // Face-only
  [StickerPose.FACE_ONLY]: {
    isFaceOnly: true,
  },
  [StickerPose.BUST]: {
    isFaceOnly: true,
  },
};

/**
 * Get prop positions based on pose
 */
function getPropPositions(pose: StickerPose, prop: StickerProp, isFaceOnly: boolean): { x: number; y: number; scale: number }[] {
  const positions: { x: number; y: number; scale: number }[] = [];

  // Effect props (sparkles, fire, tears, etc.) go around the avatar
  const effectProps = [
    StickerProp.SPARKLES,
    StickerProp.FIRE,
    StickerProp.TEARS,
    StickerProp.SWEAT_DROP,
    StickerProp.ANGER_VEIN,
    StickerProp.ZZZ,
    StickerProp.QUESTION_MARK,
    StickerProp.EXCLAMATION,
    StickerProp.HEART_EYES,
    StickerProp.LIGHTNING,
  ];

  const isEffect = effectProps.includes(prop);

  if (isEffect) {
    // Position effects relative to head/face
    switch (prop) {
      case StickerProp.TEARS:
        positions.push({ x: isFaceOnly ? 30 : 30, y: isFaceOnly ? 40 : 25, scale: 0.5 });
        break;
      case StickerProp.SWEAT_DROP:
        positions.push({ x: isFaceOnly ? 75 : 75, y: isFaceOnly ? 15 : 10, scale: 0.5 });
        break;
      case StickerProp.ANGER_VEIN:
        positions.push({ x: isFaceOnly ? 70 : 70, y: isFaceOnly ? 5 : 0, scale: 0.6 });
        break;
      case StickerProp.ZZZ:
        positions.push({ x: isFaceOnly ? 75 : 75, y: isFaceOnly ? 5 : 0, scale: 0.7 });
        break;
      case StickerProp.QUESTION_MARK:
        positions.push({ x: isFaceOnly ? 75 : 75, y: isFaceOnly ? 5 : 0, scale: 0.5 });
        break;
      case StickerProp.EXCLAMATION:
        positions.push({ x: isFaceOnly ? 75 : 75, y: isFaceOnly ? 5 : 0, scale: 0.5 });
        break;
      case StickerProp.SPARKLES:
        positions.push({ x: 5, y: 5, scale: 0.6 });
        positions.push({ x: 70, y: 10, scale: 0.4 });
        positions.push({ x: 60, y: 75, scale: 0.5 });
        break;
      case StickerProp.FIRE:
        positions.push({ x: isFaceOnly ? 70 : 70, y: isFaceOnly ? 5 : 0, scale: 0.5 });
        break;
      case StickerProp.HEART:
        positions.push({ x: 70, y: 5, scale: 0.4 });
        positions.push({ x: 5, y: 15, scale: 0.3 });
        break;
      case StickerProp.LIGHTNING:
        positions.push({ x: 70, y: 5, scale: 0.5 });
        break;
      default:
        positions.push({ x: 70, y: 10, scale: 0.5 });
    }
  } else {
    // Position object props based on pose
    switch (pose) {
      case StickerPose.EATING:
      case StickerPose.DRINKING:
        // Near the hand/mouth area
        positions.push({ x: isFaceOnly ? 65 : 60, y: isFaceOnly ? 50 : 70, scale: 0.5 });
        break;
      case StickerPose.READING:
      case StickerPose.WORKING:
        // In front of avatar
        positions.push({ x: isFaceOnly ? 35 : 35, y: isFaceOnly ? 75 : 130, scale: 0.6 });
        break;
      default:
        // Default position - beside avatar
        positions.push({ x: isFaceOnly ? 70 : 65, y: isFaceOnly ? 60 : 110, scale: 0.5 });
    }
  }

  return positions;
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

/**
 * Apply expression preset to avatar config
 */
function applyExpression(config: AvatarConfig, emotion: Emotion): AvatarConfig {
  const preset = getDefaultPresetForEmotion(emotion);
  if (!preset) return config;

  return {
    ...config,
    eyeStyle: preset.eyeStyle as EyeStyle,
    eyebrowStyle: preset.eyebrowStyle as EyebrowStyle,
    mouthStyle: preset.mouthStyle as MouthStyle,
  };
}

/**
 * Apply pose configuration to avatar config
 */
function applyPose(config: AvatarConfig, pose: StickerPose): AvatarConfig {
  const poseConfig = POSE_CONFIG[pose];
  if (!poseConfig) return config;

  return {
    ...config,
    armPose: poseConfig.armPose ?? config.armPose,
    legPose: poseConfig.legPose ?? config.legPose,
    leftHandGesture: poseConfig.leftHandGesture ?? config.leftHandGesture,
    rightHandGesture: poseConfig.rightHandGesture ?? config.rightHandGesture,
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StickerRenderer({
  sticker,
  avatarConfig: inputConfig,
  size = 'md',
  customSize,
  style,
  showBorder = false,
  borderColor = '#e0e0e0',
  borderWidth = 1,
  testID,
}: StickerRendererProps) {
  // Get and process avatar config
  let config = getConfig(inputConfig);
  config = applyExpression(config, sticker.emotion);
  config = applyPose(config, sticker.pose);

  const pixelSize = customSize || STICKER_SIZE_MAP[size];
  const poseConfig = POSE_CONFIG[sticker.pose];
  const isFaceOnly = sticker.isFaceOnly ?? poseConfig?.isFaceOnly ?? false;

  // Viewbox dimensions
  const viewBoxWidth = 100;
  const viewBoxHeight = isFaceOnly ? 100 : 200;
  const aspectRatio = viewBoxHeight / viewBoxWidth;

  const width = pixelSize;
  const height = pixelSize * aspectRatio;

  // Determine background color
  const backgroundColor = sticker.sceneColor || '#ffffff';

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius: pixelSize * 0.1,
          borderWidth: showBorder ? borderWidth : 0,
          borderColor: showBorder ? borderColor : 'transparent',
        },
        style,
      ]}
      testID={testID}
    >
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs>
          <ClipPath id="stickerClip">
            <Rect x="0" y="0" width={viewBoxWidth} height={viewBoxHeight} rx="5" />
          </ClipPath>
        </Defs>

        <G clipPath="url(#stickerClip)">
          {/* Layer 1: Background */}
          <BackgroundRenderer
            scene={sticker.scene || Scene.SOLID_COLOR}
            sceneColor={backgroundColor}
            width={viewBoxWidth}
            height={viewBoxHeight}
          />

          {/* Layer 2: Avatar */}
          <G transform={isFaceOnly ? 'translate(0, 0)' : 'translate(0, 0)'}>
            {isFaceOnly ? (
              // Render head/shoulders only using inline SVG
              <AvatarInline config={config} />
            ) : (
              // Render full body using inline SVG
              <FullBodyAvatarInline config={config} />
            )}
          </G>

          {/* Layer 3: Props */}
          {sticker.props?.map((prop, index) => {
            const positions = getPropPositions(sticker.pose, prop, isFaceOnly);
            return positions.map((pos, posIndex) => (
              <PropRenderer
                key={`prop_${index}_${posIndex}`}
                prop={prop}
                x={pos.x}
                y={pos.y}
                scale={pos.scale}
              />
            ));
          })}

          {/* Layer 4: Text Overlay */}
          {sticker.textOverlay && (
            <TextOverlay
              text={sticker.textOverlay}
              position="bottom"
              textStyle="outline"
              fontSize={isFaceOnly ? 12 : 14}
              color="#1a1a2e"
              width={viewBoxWidth}
              height={viewBoxHeight}
            />
          )}
        </G>
      </Svg>
    </View>
  );
}

// ============================================================================
// INLINE AVATAR RENDERERS
// ============================================================================

/**
 * Inline head/shoulders avatar renderer for stickers
 * This renders the avatar directly in the sticker SVG context
 */
function AvatarInline({ config }: { config: AvatarConfig }) {
  // Import the actual avatar parts for inline rendering
  const { Face, Eyes, Hair, HairBehind, Nose, Mouth, Eyebrows, FaceDetails, Makeup } = require('../parts');

  const isLongHair = [
    'long_straight', 'long_wavy', 'long_curly', 'long_braids', 'long_layers',
    'afro', 'locs', 'box_braids', 'hijab', 'medium_straight', 'medium_curly', 'medium_bob'
  ].includes(config.hairStyle);

  const eyebrowColor = config.eyebrowColor || config.hairColor;

  return (
    <G>
      {/* Hair behind for long styles */}
      {isLongHair && (
        <HairBehind
          style={config.hairStyle}
          hairColor={config.hairColor}
        />
      )}

      {/* Clothing hint */}
      <G>
        <Rect x="30" y="80" width="40" height="25" rx="3" fill={config.clothingColor || '#3f51b5'} />
      </G>

      {/* Face */}
      <Face
        shape={config.faceShape}
        skinTone={config.skinTone}
      />

      {/* Face Details */}
      <FaceDetails
        skinTone={config.skinTone}
        freckles={config.freckles}
        wrinkles={config.wrinkles}
        cheekStyle={config.cheekStyle}
        skinDetail={config.skinDetail}
      />

      {/* Blush */}
      {config.blushStyle && config.blushStyle !== 'none' && (
        <Makeup
          blushStyle={config.blushStyle}
          blushColor={config.blushColor}
          skinTone={config.skinTone}
        />
      )}

      {/* Nose */}
      <Nose
        style={config.noseStyle}
        skinTone={config.skinTone}
      />

      {/* Eye Makeup */}
      {((config.eyeshadowStyle && config.eyeshadowStyle !== 'none') ||
        (config.eyelinerStyle && config.eyelinerStyle !== 'none')) && (
        <Makeup
          eyeshadowStyle={config.eyeshadowStyle}
          eyeshadowColor={config.eyeshadowColor}
          eyelinerStyle={config.eyelinerStyle}
          eyelinerColor={config.eyelinerColor}
        />
      )}

      {/* Mouth */}
      <Mouth
        style={config.mouthStyle}
        lipColor={config.lipColor}
      />

      {/* Lipstick */}
      {config.lipstickStyle && config.lipstickStyle !== 'none' && (
        <Makeup
          lipstickStyle={config.lipstickStyle}
          lipstickColor={config.lipstickColor}
        />
      )}

      {/* Eyes */}
      <Eyes
        style={config.eyeStyle}
        eyeColor={config.eyeColor}
      />

      {/* Eyebrows */}
      <Eyebrows
        style={config.eyebrowStyle}
        eyebrowColor={eyebrowColor}
      />

      {/* Hair */}
      <Hair
        style={config.hairStyle}
        hairColor={config.hairColor}
      />
    </G>
  );
}

/**
 * Inline full body avatar renderer for stickers
 */
function FullBodyAvatarInline({ config }: { config: AvatarConfig }) {
  // This uses the same structure as FullBodyAvatar but renders inline
  const { Face, Eyes, Hair, HairBehind, Nose, Mouth, Eyebrows, FaceDetails, Makeup } = require('../parts');
  const { Body } = require('../parts/Body');
  const { Arms } = require('../parts/Arms');
  const { Legs } = require('../parts/Legs');
  const { Hands } = require('../parts/Hands');
  const { Bottoms } = require('../parts/Bottoms');
  const { Shoes } = require('../parts/Shoes');
  const { Feet } = require('../parts/Feet');
  const { getWristPositions } = require('../parts/Arms');
  const { getAnklePositions } = require('../parts/Legs');

  const bodyType = config.bodyType || 'average';
  const armPose = config.armPose || 'down';
  const legPose = config.legPose || 'standing';
  const leftHandGesture = config.leftHandGesture || 'open';
  const rightHandGesture = config.rightHandGesture || 'open';
  const bottomStyle = config.bottomStyle || 'jeans';
  const bottomColor = config.bottomColor || '#1a237e';
  const shoeStyle = config.shoeStyle || 'sneakers';
  const shoeColor = config.shoeColor || '#f5f5f5';

  const wristPositions = getWristPositions(armPose, bodyType);
  const anklePositions = getAnklePositions(legPose, bodyType);
  const eyebrowColor = config.eyebrowColor || config.hairColor;

  const isLongHair = [
    'long_straight', 'long_wavy', 'long_curly', 'long_braids', 'long_layers',
    'afro', 'locs', 'box_braids', 'hijab', 'medium_straight', 'medium_curly', 'medium_bob'
  ].includes(config.hairStyle);

  return (
    <G>
      {/* Hair behind */}
      {isLongHair && (
        <HairBehind
          style={config.hairStyle}
          hairColor={config.hairColor}
        />
      )}

      {/* Legs */}
      <Legs
        pose={legPose}
        bodyType={bodyType}
        skinTone={config.skinTone}
      />

      {/* Feet or Shoes */}
      {shoeStyle === 'barefoot' || shoeStyle === 'none' ? (
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

      {/* Body */}
      <Body
        bodyType={bodyType}
        skinTone={config.skinTone}
      />

      {/* Bottoms */}
      <Bottoms
        style={bottomStyle}
        bodyType={bodyType}
        legPose={legPose}
        color={bottomColor}
      />

      {/* Arms (behind for crossed) */}
      {armPose === 'crossed' && (
        <Arms
          pose={armPose}
          bodyType={bodyType}
          skinTone={config.skinTone}
        />
      )}

      {/* Clothing */}
      <G>
        <Rect x="32" y="72" width="36" height="35" rx="3" fill={config.clothingColor || '#3f51b5'} />
        <Rect x="24" y="75" width="12" height="20" rx="2" fill={config.clothingColor || '#3f51b5'} />
        <Rect x="64" y="75" width="12" height="20" rx="2" fill={config.clothingColor || '#3f51b5'} />
      </G>

      {/* Arms (front) */}
      {armPose !== 'crossed' && (
        <Arms
          pose={armPose}
          bodyType={bodyType}
          skinTone={config.skinTone}
        />
      )}

      {/* Hands */}
      <Hands
        leftGesture={leftHandGesture}
        rightGesture={rightHandGesture}
        skinTone={config.skinTone}
        leftPosition={wristPositions.left}
        rightPosition={wristPositions.right}
      />

      {/* Face */}
      <Face
        shape={config.faceShape}
        skinTone={config.skinTone}
      />

      {/* Face Details */}
      <FaceDetails
        skinTone={config.skinTone}
        freckles={config.freckles}
        wrinkles={config.wrinkles}
        cheekStyle={config.cheekStyle}
        skinDetail={config.skinDetail}
      />

      {/* Blush */}
      {config.blushStyle && config.blushStyle !== 'none' && (
        <Makeup
          blushStyle={config.blushStyle}
          blushColor={config.blushColor}
          skinTone={config.skinTone}
        />
      )}

      {/* Nose */}
      <Nose
        style={config.noseStyle}
        skinTone={config.skinTone}
      />

      {/* Mouth */}
      <Mouth
        style={config.mouthStyle}
        lipColor={config.lipColor}
      />

      {/* Eyes */}
      <Eyes
        style={config.eyeStyle}
        eyeColor={config.eyeColor}
      />

      {/* Eyebrows */}
      <Eyebrows
        style={config.eyebrowStyle}
        eyebrowColor={eyebrowColor}
      />

      {/* Hair */}
      <Hair
        style={config.hairStyle}
        hairColor={config.hairColor}
      />
    </G>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});

export default StickerRenderer;
