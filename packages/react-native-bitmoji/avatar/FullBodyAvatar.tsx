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
import Svg, { Defs, ClipPath, Rect, G, Path, Circle } from 'react-native-svg';
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
import { Body, getBodyDimensions } from './parts/Body';
import { getProportions, CENTER_X, NECK_BASE_Y } from './constants/proportions';
import { Arms, getWristPositions, getHandRotations } from './parts/Arms';
import { Legs, getAnklePositions } from './parts/Legs';
import { Hands } from './parts/Hands';
import { Feet } from './parts/Feet';
import { Bottoms } from './parts/Bottoms';
import { Shoes } from './parts/Shoes';
import { Sleeves } from './parts/Sleeves';
import { ClothingRenderer } from './renderers/ClothingRenderer';
import { AccessoryRenderer } from './renderers/AccessoryRenderer';

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
        <G opacity={0.3}>
          {/* Chin area dots */}
          {Array.from({ length: 20 }).map((_, i) => {
            const seed = i * 7 + 42;
            const x = 36 + (Math.sin(seed) * 10000 % 1) * 28;
            const y = 54 + (Math.sin(seed + 1) * 10000 % 1) * 16;
            const r = 0.4 + (Math.sin(seed + 2) * 10000 % 1) * 0.4;
            return <Circle key={i} cx={x} cy={y} r={r} fill={color} />;
          })}
        </G>
      );

    case FacialHairStyle.FULL_BEARD:
      return (
        <G>
          <Path d="M24,50 Q22,68 50,72 Q78,68 76,50 L72,55 Q50,72 28,55 Z" fill={color} />
          <Path d="M30,55 Q50,66 70,55 Q50,62 30,55" fill={shadow} opacity={0.3} />
        </G>
      );

    case FacialHairStyle.MUSTACHE:
      return (
        <Path d="M38,57 Q42,54 50,55.5 Q58,54 62,57 Q58,60 50,58.5 Q42,60 38,57" fill={color} />
      );

    case FacialHairStyle.GOATEE:
      return (
        <G>
          <Path d="M44,58 Q50,56 56,58 Q56,68 50,72 Q44,68 44,58 Z" fill={color} />
          <Path d="M46,60 Q50,58 54,60 Q54,66 50,69 Q46,66 46,60" fill={shadow} opacity={0.3} />
        </G>
      );

    case FacialHairStyle.MUSTACHE_FANCY:
      return (
        <G>
          <Path d="M38,57 Q42,54 50,55.5 Q58,54 62,57 Q58,60 50,58.5 Q42,60 38,57" fill={color} />
          <Path d="M36,56 Q34,54 33,55" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M64,56 Q66,54 67,55" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
        </G>
      );

    case FacialHairStyle.LIGHT_BEARD:
      return (
        <G opacity={0.5}>
          <Path d="M28,55 Q28,72 50,78 Q72,72 72,55 L68,58 Q50,72 32,58 Z" fill={color} />
          <Path d="M34,58 Q50,66 66,58 Q50,62 34,58" fill={shadow} opacity={0.3} />
        </G>
      );

    case FacialHairStyle.MEDIUM_BEARD:
      return (
        <G>
          <Path d="M26,52 Q24,76 50,84 Q76,76 74,52 L70,56 Q50,76 30,56 Z" fill={color} />
          <Path d="M32,56 Q50,68 68,56 Q50,64 32,56" fill={shadow} opacity={0.3} />
        </G>
      );

    case FacialHairStyle.SIDEBURNS:
      return (
        <G>
          <Path d="M22,40 L22,58 Q23,62 26,60 L26,42 Q24,40 22,40 Z" fill={color} />
          <Path d="M78,40 L78,58 Q77,62 74,60 L74,42 Q76,40 78,40 Z" fill={color} />
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
  // Default shoe color harmonizes with bottom color (darkened variant)
  const shoeColor = config.shoeColor || adjustBrightness(bottomColor, -20);

  // Get wrist and ankle positions for hands and feet
  const wristPositions = getWristPositions(armPose, bodyType, legPose);
  const anklePositions = getAnklePositions(legPose, bodyType);
  const handRotations = getHandRotations(armPose);

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
    HairStyle.MEDIUM_STRAIGHT,
    HairStyle.MEDIUM_CURLY,
    HairStyle.MEDIUM_BOB,
    HairStyle.LONG_BEACH_WAVES,
    HairStyle.LONG_CENTER_PART,
    HairStyle.LONG_PIGTAILS,
    HairStyle.LONG_TWISTS,
    HairStyle.LONG_PONYTAIL,
    HairStyle.LONG_PONYTAIL_HIGH,
    HairStyle.LONG_PONYTAIL_LOW,
    HairStyle.LONG_PONYTAIL_SIDE,
    HairStyle.LONG_DEFINED_CURLS,
    HairStyle.LONG_HALF_UP,
    HairStyle.LONG_HALF_UP_BUN,
    HairStyle.LONG_SIDE_SWEPT,
    HairStyle.LONG_CURTAIN_BANGS,
    HairStyle.LONG_BRAID_SINGLE,
    HairStyle.LONG_BRAIDS_PIGTAILS,
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
              legPose={legPose}
            />
          )}

          {/* 9. Clothing/top - clipped to body outline */}
          {(() => {
            const props = getProportions(bodyType);
            const dims = getBodyDimensions(bodyType);
            const neckY = NECK_BASE_Y;
            const hipY = neckY + props.torsoLength;
            const shoulderY = neckY + 6;
            const shoulderDrop = dims.shoulderSlope * 4;
            const leftS = CENTER_X - props.shoulderWidth / 2;
            const rightS = CENTER_X + props.shoulderWidth / 2;
            const leftC = CENTER_X - props.chestWidth / 2;
            const rightC = CENTER_X + props.chestWidth / 2;
            const leftW = CENTER_X - props.waistWidth / 2;
            const rightW = CENTER_X + props.waistWidth / 2;
            const leftH = CENTER_X - props.hipWidth / 2;
            const rightH = CENTER_X + props.hipWidth / 2;
            const chestY = neckY + 16;
            const waistY = neckY + 36;
            const hipCurveY = neckY + 44;

            // Widen clip at shoulders by 10 units to cover arm-attachment skin gaps
            const shoulderExt = 10;
            const clipPath = `
              M ${CENTER_X - 10} ${neckY}
              C ${CENTER_X - 12} ${neckY + 2}, ${leftS + 4} ${shoulderY - shoulderDrop}, ${leftS - shoulderExt} ${shoulderY}
              C ${leftS - shoulderExt - 2} ${shoulderY + 4}, ${leftC - 3} ${chestY - 4}, ${leftC} ${chestY}
              C ${leftC + 1} ${chestY + 6}, ${leftW - 2} ${(chestY + waistY) / 2}, ${leftW} ${waistY}
              C ${leftW - 1} ${waistY + 4}, ${leftH - 3} ${hipCurveY - 2}, ${leftH} ${hipCurveY}
              L ${leftH} ${hipY + 4}
              L ${rightH} ${hipY + 4}
              L ${rightH} ${hipCurveY}
              C ${rightH + 3} ${hipCurveY - 2}, ${rightW + 1} ${waistY + 4}, ${rightW} ${waistY}
              C ${rightW + 2} ${(chestY + waistY) / 2}, ${rightC - 1} ${chestY + 6}, ${rightC} ${chestY}
              C ${rightC + 3} ${chestY - 4}, ${rightS + shoulderExt + 2} ${shoulderY + 4}, ${rightS + shoulderExt} ${shoulderY}
              C ${rightS + shoulderExt - 4} ${shoulderY - shoulderDrop}, ${CENTER_X + 12} ${neckY + 2}, ${CENTER_X + 10} ${neckY}
              Z`;

            return (
              <>
                <Defs>
                  <ClipPath id="bodyClothingClip">
                    <Path d={clipPath} />
                  </ClipPath>
                </Defs>
                <G clipPath="url(#bodyClothingClip)">
                  <ClothingRenderer
                    type={config.clothing as ClothingStyle}
                    color={config.clothingColor || '#3f51b5'}
                    secondaryColor={config.clothingSecondaryColor}
                    skinTone={config.skinTone}
                    bodyType={bodyType}
                  />
                </G>
              </>
            );
          })()}

          {/* 10. Arms (front for most poses) */}
          {armPose !== ArmPose.CROSSED && (
            <Arms
              pose={armPose}
              bodyType={bodyType}
              skinTone={config.skinTone}
              legPose={legPose}
            />
          )}

          {/* 10b. Sleeves (between arms and hands) */}
          <Sleeves
            armPose={armPose}
            bodyType={bodyType}
            clothingStyle={config.clothing as ClothingStyle}
            clothingColor={config.clothingColor || '#3f51b5'}
          />

          {/* 10c. Shoulder caps — cover remaining skin gaps at arm-body junction */}
          {(() => {
            const props = getProportions(bodyType);
            const clothColor = config.clothingColor || '#3f51b5';
            const clothShadow = adjustBrightness(clothColor, -25);
            const leftS = CENTER_X - props.shoulderWidth / 2;
            const rightS = CENTER_X + props.shoulderWidth / 2;
            const capY = NECK_BASE_Y + 4; // just above shoulderY
            // Wide caps that cover from inner body edge out past shoulder joint
            return (
              <G>
                <Path
                  d={`M ${leftS + 8} ${capY - 1} L ${leftS - 12} ${capY + 2} L ${leftS - 10} ${capY + 14} L ${leftS + 6} ${capY + 12} Z`}
                  fill={clothColor}
                />
                <Path
                  d={`M ${leftS + 8} ${capY - 1} L ${leftS - 12} ${capY + 2} L ${leftS - 10} ${capY + 14} L ${leftS + 6} ${capY + 12} Z`}
                  fill={clothShadow}
                  opacity={0.15}
                />
                <Path
                  d={`M ${rightS - 8} ${capY - 1} L ${rightS + 12} ${capY + 2} L ${rightS + 10} ${capY + 14} L ${rightS - 6} ${capY + 12} Z`}
                  fill={clothColor}
                />
                <Path
                  d={`M ${rightS - 8} ${capY - 1} L ${rightS + 12} ${capY + 2} L ${rightS + 10} ${capY + 14} L ${rightS - 6} ${capY + 12} Z`}
                  fill={clothShadow}
                  opacity={0.15}
                />
              </G>
            );
          })()}

          {/* 11. Hands */}
          <Hands
            leftGesture={armPose === ArmPose.CROSSED ? HandGesture.FIST : leftHandGesture}
            rightGesture={armPose === ArmPose.CROSSED ? HandGesture.FIST : rightHandGesture}
            skinTone={config.skinTone}
            leftPosition={wristPositions.left}
            rightPosition={wristPositions.right}
            leftRotation={handRotations.left}
            rightRotation={handRotations.right}
          />

          {/* 12-21. Head group */}
          <G>
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

            {/* 14. All makeup in single render (blush, eyeshadow, eyeliner, lipstick) */}
            <Makeup
              blushStyle={config.blushStyle as BlushStyle}
              blushColor={config.blushColor}
              eyeshadowStyle={config.eyeshadowStyle as EyeshadowStyle}
              eyeshadowColor={config.eyeshadowColor}
              eyelinerStyle={config.eyelinerStyle as EyelinerStyle}
              eyelinerColor={config.eyelinerColor}
              lipstickStyle={config.lipstickStyle as LipstickStyle}
              lipstickColor={config.lipstickColor}
              skinTone={config.skinTone}
            />

            {/* 15. Nose */}
            <Nose
              style={config.noseStyle as NoseStyle}
              skinTone={config.skinTone}
            />

            {/* 16. Mouth */}
            <Mouth
              style={config.mouthStyle as MouthStyle}
              lipColor={config.lipColor}
            />

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

          {/* 23. Accessories - uses modular AccessoryRenderer */}
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

export default FullBodyAvatar;
