/**
 * Body Component - Full body shape with body type variations
 * Renders the torso from neck to hips with Bitmoji-style flat shading
 * Uses unified proportion constants for consistency across all parts
 */

import React from 'react';
import { G, Path, Ellipse, Defs, LinearGradient, Stop } from 'react-native-svg';
import { BodyType, SvgPartProps } from '../types';
import { adjustBrightness } from '../utils';
import {
  getProportions,
  CENTER_X,
  NECK_BASE_Y,
  SHADING,
  ProportionSet,
} from '../constants/proportions';

interface BodyProps extends SvgPartProps {
  bodyType: BodyType;
  skinTone: string;
}

/**
 * Legacy compatibility: Map ProportionSet to old BodyDimensions interface
 * @deprecated Use getProportions directly in new code
 */
interface BodyDimensions {
  shoulderWidth: number;
  chestWidth: number;
  waistWidth: number;
  hipWidth: number;
  torsoLength: number;
  muscleDefinition: number;
  bustProminence: number;
  ribcageWidth: number;
  shoulderSlope: number;
}

/**
 * Get body dimensions for a given body type
 * Maps new ProportionSet to legacy BodyDimensions interface for backward compatibility
 */
export function getBodyDimensions(bodyType: BodyType): BodyDimensions {
  const props = getProportions(bodyType);

  // Calculate legacy fields from new proportions
  const ribcageWidth = (props.chestWidth + props.waistWidth) / 2;
  const shoulderSlope = bodyType === BodyType.MUSCULAR ? 0.5 :
                       bodyType === BodyType.CURVY ? 0.9 :
                       bodyType === BodyType.PLUS_SIZE ? 0.85 :
                       bodyType === BodyType.ATHLETIC ? 0.6 : 0.75;
  const bustProminence = bodyType === BodyType.CURVY ? 0.8 :
                        bodyType === BodyType.PLUS_SIZE ? 0.7 :
                        bodyType === BodyType.MUSCULAR ? 0.6 :
                        bodyType === BodyType.ATHLETIC ? 0.5 :
                        bodyType === BodyType.SLIM ? 0.3 : 0.5;

  return {
    shoulderWidth: props.shoulderWidth,
    chestWidth: props.chestWidth,
    waistWidth: props.waistWidth,
    hipWidth: props.hipWidth,
    torsoLength: props.torsoLength,
    muscleDefinition: props.muscleDefinition,
    bustProminence,
    ribcageWidth,
    shoulderSlope,
  };
}

export function Body({ bodyType, skinTone, scale = 1 }: BodyProps) {
  const props = getProportions(bodyType);

  // Simplified Bitmoji-style shading (only 2 colors: shadow and highlight)
  const shadowColor = adjustBrightness(skinTone, SHADING.shadowDarken);
  const highlightColor = adjustBrightness(skinTone, SHADING.highlightBrighten);

  const neckY = NECK_BASE_Y;
  const hipY = neckY + props.torsoLength;

  // Unique gradient IDs to avoid conflicts
  const bodyGradientId = `body-gradient-${bodyType}`;
  const shadowGradientId = `body-shadow-${bodyType}`;

  // Calculate key points for the body outline
  const leftShoulder = CENTER_X - props.shoulderWidth / 2;
  const rightShoulder = CENTER_X + props.shoulderWidth / 2;
  const leftChest = CENTER_X - props.chestWidth / 2;
  const rightChest = CENTER_X + props.chestWidth / 2;
  const leftWaist = CENTER_X - props.waistWidth / 2;
  const rightWaist = CENTER_X + props.waistWidth / 2;
  const leftHip = CENTER_X - props.hipWidth / 2;
  const rightHip = CENTER_X + props.hipWidth / 2;

  // Vertical positions (same as before)
  const shoulderY = neckY + 6;
  const chestY = neckY + 16;
  const waistY = neckY + 36;
  const hipCurveY = neckY + 44;

  // Shoulder slope adjustment
  const dims = getBodyDimensions(bodyType);
  const shoulderDrop = dims.shoulderSlope * 4;

  // Main body path using cubic bezier curves for smooth organic shapes
  const bodyPath = `
    M ${CENTER_X - 10} ${neckY}
    C ${CENTER_X - 12} ${neckY + 2}, ${leftShoulder + 4} ${shoulderY - shoulderDrop}, ${leftShoulder} ${shoulderY}
    C ${leftShoulder - 2} ${shoulderY + 4}, ${leftChest - 3} ${chestY - 4}, ${leftChest} ${chestY}
    C ${leftChest + 1} ${chestY + 6}, ${leftWaist - 2} ${(chestY + waistY) / 2}, ${leftWaist} ${waistY}
    C ${leftWaist - 1} ${waistY + 4}, ${leftHip - 3} ${hipCurveY - 2}, ${leftHip} ${hipCurveY}
    C ${leftHip + 1} ${hipCurveY + 4}, ${leftHip} ${hipY - 2}, ${leftHip} ${hipY}
    L ${rightHip} ${hipY}
    C ${rightHip} ${hipY - 2}, ${rightHip - 1} ${hipCurveY + 4}, ${rightHip} ${hipCurveY}
    C ${rightHip + 3} ${hipCurveY - 2}, ${rightWaist + 1} ${waistY + 4}, ${rightWaist} ${waistY}
    C ${rightWaist + 2} ${(chestY + waistY) / 2}, ${rightChest - 1} ${chestY + 6}, ${rightChest} ${chestY}
    C ${rightChest + 3} ${chestY - 4}, ${rightShoulder + 2} ${shoulderY + 4}, ${rightShoulder} ${shoulderY}
    C ${rightShoulder - 4} ${shoulderY - shoulderDrop}, ${CENTER_X + 12} ${neckY + 2}, ${CENTER_X + 10} ${neckY}
    Z
  `;

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        {/* Base gradient - simple left-to-right for cylindrical form */}
        <LinearGradient id={bodyGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} stopOpacity={SHADING.shadowOpacity} />
          <Stop offset="30%" stopColor={skinTone} stopOpacity={0} />
          <Stop offset="70%" stopColor={skinTone} stopOpacity={0} />
          <Stop offset="100%" stopColor={shadowColor} stopOpacity={SHADING.shadowOpacity} />
        </LinearGradient>

        {/* Highlight gradient - top-to-bottom */}
        <LinearGradient id={shadowGradientId} x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%" stopColor={highlightColor} stopOpacity={0.15} />
          <Stop offset="40%" stopColor={skinTone} stopOpacity={0} />
          <Stop offset="100%" stopColor={shadowColor} stopOpacity={SHADING.shadowOpacity} />
        </LinearGradient>
      </Defs>

      {/* Main body shape with base skin tone */}
      <Path
        d={bodyPath}
        fill={skinTone}
        stroke={adjustBrightness(skinTone, -30)}
        strokeWidth={1}
      />

      {/* Side shadows for cylindrical form */}
      <Path d={bodyPath} fill={`url(#${bodyGradientId})`} />

      {/* Top highlight and bottom shadow */}
      <Path d={bodyPath} fill={`url(#${shadowGradientId})`} />

      {/* Neck base shadow */}
      <Ellipse
        cx={CENTER_X}
        cy={neckY + 2}
        rx={9}
        ry={3}
        fill={shadowColor}
        opacity={0.3}
      />

      {/* Navel - simple dot */}
      <Ellipse
        cx={CENTER_X}
        cy={waistY + 7}
        rx={1.5}
        ry={2}
        fill={shadowColor}
        opacity={0.4}
      />

      {/* Muscle definition - ONLY for MUSCULAR body type */}
      {props.muscleDefinition > 0.8 && (
        <G opacity={0.25}>
          {/* Center line */}
          <Path
            d={`M ${CENTER_X} ${chestY}
                L ${CENTER_X} ${waistY + 4}`}
            stroke={shadowColor}
            strokeWidth={0.8}
            fill="none"
          />

          {/* Left pec curve */}
          <Path
            d={`M ${CENTER_X - 4} ${chestY}
                Q ${leftChest + 6} ${chestY + 8} ${CENTER_X - 3} ${chestY + 16}`}
            stroke={shadowColor}
            strokeWidth={0.7}
            fill="none"
          />

          {/* Right pec curve */}
          <Path
            d={`M ${CENTER_X + 4} ${chestY}
                Q ${rightChest - 6} ${chestY + 8} ${CENTER_X + 3} ${chestY + 16}`}
            stroke={shadowColor}
            strokeWidth={0.7}
            fill="none"
          />
        </G>
      )}
    </G>
  );
}

export default Body;
