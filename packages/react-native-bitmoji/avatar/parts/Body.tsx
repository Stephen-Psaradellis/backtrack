/**
 * Body Component - Full body shape with body type variations
 * Renders the torso from neck to hips with proper proportions for each body type
 * Uses cubic bezier curves for smooth, anatomically accurate shapes
 */

import React from 'react';
import { G, Path, Ellipse, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { BodyType, SvgPartProps } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

type BodyGradientIds = {
  bodyGradient: string;
  bodyShadowGradient: string;
  bodyHighlightGradient: string;
  chestGradient: string;
};

interface BodyProps extends SvgPartProps {
  bodyType: BodyType;
  skinTone: string;
}

interface BodyDimensions {
  shoulderWidth: number;
  chestWidth: number;
  waistWidth: number;
  hipWidth: number;
  torsoLength: number;
  muscleDefinition: number;
  // New anatomical details
  bustProminence: number;
  ribcageWidth: number;
  shoulderSlope: number;
}

function getBodyDimensions(bodyType: BodyType): BodyDimensions {
  switch (bodyType) {
    case BodyType.SLIM:
      return {
        shoulderWidth: 34,
        chestWidth: 30,
        waistWidth: 22,
        hipWidth: 28,
        torsoLength: 50,
        muscleDefinition: 0.15,
        bustProminence: 0.3,
        ribcageWidth: 26,
        shoulderSlope: 0.8,
      };
    case BodyType.ATHLETIC:
      return {
        shoulderWidth: 42,
        chestWidth: 38,
        waistWidth: 28,
        hipWidth: 34,
        torsoLength: 52,
        muscleDefinition: 0.7,
        bustProminence: 0.5,
        ribcageWidth: 34,
        shoulderSlope: 0.6,
      };
    case BodyType.CURVY:
      return {
        shoulderWidth: 36,
        chestWidth: 38,
        waistWidth: 26,
        hipWidth: 44,
        torsoLength: 50,
        muscleDefinition: 0.2,
        bustProminence: 0.8,
        ribcageWidth: 32,
        shoulderSlope: 0.9,
      };
    case BodyType.PLUS_SIZE:
      return {
        shoulderWidth: 40,
        chestWidth: 44,
        waistWidth: 40,
        hipWidth: 46,
        torsoLength: 52,
        muscleDefinition: 0.15,
        bustProminence: 0.7,
        ribcageWidth: 40,
        shoulderSlope: 0.85,
      };
    case BodyType.MUSCULAR:
      return {
        shoulderWidth: 48,
        chestWidth: 46,
        waistWidth: 34,
        hipWidth: 38,
        torsoLength: 54,
        muscleDefinition: 0.95,
        bustProminence: 0.6,
        ribcageWidth: 42,
        shoulderSlope: 0.5,
      };
    case BodyType.AVERAGE:
    default:
      return {
        shoulderWidth: 38,
        chestWidth: 34,
        waistWidth: 26,
        hipWidth: 34,
        torsoLength: 50,
        muscleDefinition: 0.3,
        bustProminence: 0.5,
        ribcageWidth: 30,
        shoulderSlope: 0.75,
      };
  }
}

export function Body({ bodyType, skinTone, scale = 1 }: BodyProps) {
  const dims = getBodyDimensions(bodyType);
  const shadowColor = adjustBrightness(skinTone, -25);
  const deepShadow = adjustBrightness(skinTone, -40);
  const highlightColor = adjustBrightness(skinTone, 18);
  const softHighlight = adjustBrightness(skinTone, 12);

  const centerX = 50;
  const neckY = 72;
  const hipY = neckY + dims.torsoLength;

  // Use stable gradient IDs for consistent rendering
  const ids = useGradientIds<BodyGradientIds>([
    'bodyGradient', 'bodyShadowGradient', 'bodyHighlightGradient', 'chestGradient'
  ]);

  // Calculate key points for the body outline
  const leftShoulder = centerX - dims.shoulderWidth / 2;
  const rightShoulder = centerX + dims.shoulderWidth / 2;
  const leftChest = centerX - dims.chestWidth / 2;
  const rightChest = centerX + dims.chestWidth / 2;
  const leftRibcage = centerX - dims.ribcageWidth / 2;
  const rightRibcage = centerX + dims.ribcageWidth / 2;
  const leftWaist = centerX - dims.waistWidth / 2;
  const rightWaist = centerX + dims.waistWidth / 2;
  const leftHip = centerX - dims.hipWidth / 2;
  const rightHip = centerX + dims.hipWidth / 2;

  // Vertical positions with anatomical accuracy
  const shoulderY = neckY + 6;
  const chestY = neckY + 16;
  const ribcageY = neckY + 26;
  const waistY = neckY + 36;
  const hipCurveY = neckY + 44;

  // Shoulder slope adjustment
  const shoulderDrop = dims.shoulderSlope * 4;

  // Main body path using cubic bezier curves for smooth organic shapes
  const bodyPath = `
    M ${centerX - 10} ${neckY}
    C ${centerX - 12} ${neckY + 2}, ${leftShoulder + 4} ${shoulderY - shoulderDrop}, ${leftShoulder} ${shoulderY}
    C ${leftShoulder - 2} ${shoulderY + 4}, ${leftChest - 3} ${chestY - 4}, ${leftChest} ${chestY}
    C ${leftChest + 1} ${chestY + 6}, ${leftRibcage - 1} ${ribcageY - 2}, ${leftRibcage} ${ribcageY}
    C ${leftRibcage + 2} ${ribcageY + 5}, ${leftWaist - 2} ${waistY - 4}, ${leftWaist} ${waistY}
    C ${leftWaist - 1} ${waistY + 4}, ${leftHip - 3} ${hipCurveY - 2}, ${leftHip} ${hipCurveY}
    C ${leftHip + 1} ${hipCurveY + 4}, ${leftHip} ${hipY - 2}, ${leftHip} ${hipY}
    L ${rightHip} ${hipY}
    C ${rightHip} ${hipY - 2}, ${rightHip - 1} ${hipCurveY + 4}, ${rightHip} ${hipCurveY}
    C ${rightHip + 3} ${hipCurveY - 2}, ${rightWaist + 1} ${waistY + 4}, ${rightWaist} ${waistY}
    C ${rightWaist + 2} ${waistY - 4}, ${rightRibcage - 2} ${ribcageY + 5}, ${rightRibcage} ${ribcageY}
    C ${rightRibcage + 1} ${ribcageY - 2}, ${rightChest - 1} ${chestY + 6}, ${rightChest} ${chestY}
    C ${rightChest + 3} ${chestY - 4}, ${rightShoulder + 2} ${shoulderY + 4}, ${rightShoulder} ${shoulderY}
    C ${rightShoulder - 4} ${shoulderY - shoulderDrop}, ${centerX + 12} ${neckY + 2}, ${centerX + 10} ${neckY}
    Z
  `;

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        {/* Main body gradient - cylindrical lighting */}
        <LinearGradient id={ids.bodyGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="18%" stopColor={skinTone} />
          <Stop offset="35%" stopColor={softHighlight} />
          <Stop offset="50%" stopColor={highlightColor} />
          <Stop offset="65%" stopColor={softHighlight} />
          <Stop offset="82%" stopColor={skinTone} />
          <Stop offset="100%" stopColor={shadowColor} />
        </LinearGradient>

        {/* Vertical shading gradient */}
        <LinearGradient id={ids.bodyShadowGradient} x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%" stopColor={shadowColor} stopOpacity={0.3} />
          <Stop offset="15%" stopColor={skinTone} stopOpacity={0} />
          <Stop offset="85%" stopColor={skinTone} stopOpacity={0} />
          <Stop offset="100%" stopColor={shadowColor} stopOpacity={0.15} />
        </LinearGradient>

        {/* Chest/sternum radial highlight */}
        <RadialGradient id={ids.chestGradient} cx="50%" cy="25%" rx="35%" ry="30%">
          <Stop offset="0%" stopColor={highlightColor} stopOpacity={0.25} />
          <Stop offset="60%" stopColor={skinTone} stopOpacity={0.1} />
          <Stop offset="100%" stopColor={skinTone} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Main body shape */}
      <Path d={bodyPath} fill={`url(#${ids.bodyGradient})`} />

      {/* Vertical shading overlay */}
      <Path d={bodyPath} fill={`url(#${ids.bodyShadowGradient})`} />

      {/* Chest highlight for 3D form */}
      <Ellipse
        cx={centerX}
        cy={chestY + 2}
        rx={dims.chestWidth * 0.35}
        ry={8}
        fill={`url(#${ids.chestGradient})`}
      />

      {/* Neck base shadow - more organic shape */}
      <Path
        d={`M ${centerX - 9} ${neckY}
            C ${centerX - 4} ${neckY + 3}, ${centerX + 4} ${neckY + 3}, ${centerX + 9} ${neckY}
            C ${centerX + 4} ${neckY + 6}, ${centerX - 4} ${neckY + 6}, ${centerX - 9} ${neckY}`}
        fill={deepShadow}
        opacity={0.35}
      />

      {/* Collarbone definition - more anatomical */}
      <Path
        d={`M ${leftShoulder + 6} ${shoulderY - 1}
            C ${leftShoulder + 10} ${shoulderY + 1}, ${centerX - 8} ${shoulderY + 2}, ${centerX - 2} ${shoulderY - 1}`}
        stroke={shadowColor}
        strokeWidth={1.2}
        fill="none"
        opacity={0.3}
      />
      <Path
        d={`M ${centerX + 2} ${shoulderY - 1}
            C ${centerX + 8} ${shoulderY + 2}, ${rightShoulder - 10} ${shoulderY + 1}, ${rightShoulder - 6} ${shoulderY - 1}`}
        stroke={shadowColor}
        strokeWidth={1.2}
        fill="none"
        opacity={0.3}
      />

      {/* Sternum/chest center line - subtle */}
      <Path
        d={`M ${centerX} ${shoulderY + 2}
            C ${centerX} ${chestY - 2}, ${centerX} ${chestY + 4}, ${centerX} ${ribcageY - 2}`}
        stroke={shadowColor}
        strokeWidth={0.6}
        fill="none"
        opacity={dims.muscleDefinition * 0.35}
      />

      {/* Chest/pectoral definition - renders for all body types with varying intensity */}
      <G opacity={0.15 + dims.muscleDefinition * 0.35}>
        {/* Left pec/chest curve */}
        <Path
          d={`M ${centerX - 4} ${chestY - 2}
              C ${centerX - 8} ${chestY}, ${leftChest + 4} ${chestY + 3}, ${leftChest + 6} ${chestY + 6}
              C ${leftChest + 8} ${chestY + 8}, ${centerX - 6} ${ribcageY - 4}, ${centerX - 4} ${ribcageY - 2}`}
          stroke={shadowColor}
          strokeWidth={0.8}
          fill="none"
        />
        {/* Right pec/chest curve */}
        <Path
          d={`M ${centerX + 4} ${chestY - 2}
              C ${centerX + 8} ${chestY}, ${rightChest - 4} ${chestY + 3}, ${rightChest - 6} ${chestY + 6}
              C ${rightChest - 8} ${chestY + 8}, ${centerX + 6} ${ribcageY - 4}, ${centerX + 4} ${ribcageY - 2}`}
          stroke={shadowColor}
          strokeWidth={0.8}
          fill="none"
        />
      </G>

      {/* Ribcage subtle definition */}
      {dims.muscleDefinition > 0.2 && (
        <G opacity={dims.muscleDefinition * 0.25}>
          <Path
            d={`M ${leftRibcage + 4} ${ribcageY + 2}
                C ${leftRibcage + 6} ${ribcageY + 4}, ${leftWaist + 2} ${waistY - 6}, ${leftWaist + 4} ${waistY - 4}`}
            stroke={shadowColor}
            strokeWidth={0.5}
            fill="none"
          />
          <Path
            d={`M ${rightRibcage - 4} ${ribcageY + 2}
                C ${rightRibcage - 6} ${ribcageY + 4}, ${rightWaist - 2} ${waistY - 6}, ${rightWaist - 4} ${waistY - 4}`}
            stroke={shadowColor}
            strokeWidth={0.5}
            fill="none"
          />
        </G>
      )}

      {/* Abdominal definition - scaled by muscle definition */}
      {dims.muscleDefinition > 0.25 && (
        <G opacity={dims.muscleDefinition * 0.4}>
          {/* Linea alba (center line) */}
          <Path
            d={`M ${centerX} ${ribcageY}
                C ${centerX - 0.5} ${ribcageY + 8}, ${centerX + 0.5} ${waistY}, ${centerX} ${waistY + 6}`}
            stroke={shadowColor}
            strokeWidth={0.7}
            fill="none"
          />

          {/* Horizontal ab lines - more anatomical curves */}
          {dims.muscleDefinition > 0.4 && (
            <G>
              <Path
                d={`M ${centerX - 7} ${ribcageY + 6}
                    C ${centerX - 4} ${ribcageY + 7}, ${centerX + 4} ${ribcageY + 7}, ${centerX + 7} ${ribcageY + 6}`}
                stroke={shadowColor}
                strokeWidth={0.5}
                fill="none"
              />
              <Path
                d={`M ${centerX - 6} ${ribcageY + 12}
                    C ${centerX - 3} ${ribcageY + 13}, ${centerX + 3} ${ribcageY + 13}, ${centerX + 6} ${ribcageY + 12}`}
                stroke={shadowColor}
                strokeWidth={0.5}
                fill="none"
              />
            </G>
          )}

          {/* Oblique hints for muscular types */}
          {dims.muscleDefinition > 0.6 && (
            <G>
              <Path
                d={`M ${leftWaist + 2} ${waistY - 2}
                    C ${leftWaist + 4} ${waistY + 2}, ${leftHip + 2} ${hipCurveY - 4}, ${leftHip + 4} ${hipCurveY}`}
                stroke={shadowColor}
                strokeWidth={0.5}
                fill="none"
              />
              <Path
                d={`M ${rightWaist - 2} ${waistY - 2}
                    C ${rightWaist - 4} ${waistY + 2}, ${rightHip - 2} ${hipCurveY - 4}, ${rightHip - 4} ${hipCurveY}`}
                stroke={shadowColor}
                strokeWidth={0.5}
                fill="none"
              />
            </G>
          )}
        </G>
      )}

      {/* Side body contour shadows for depth */}
      <Path
        d={`M ${leftShoulder + 1} ${shoulderY + 2}
            C ${leftChest - 1} ${chestY - 2}, ${leftChest} ${chestY + 4}, ${leftRibcage + 1} ${ribcageY}
            C ${leftWaist - 1} ${waistY - 4}, ${leftWaist} ${waistY + 2}, ${leftHip - 1} ${hipCurveY}
            C ${leftHip} ${hipY - 4}, ${leftHip + 2} ${hipY}, ${leftHip + 5} ${hipY}
            L ${leftHip + 5} ${hipY}
            C ${leftHip + 3} ${hipY}, ${leftHip + 2} ${hipCurveY + 2}, ${leftHip + 3} ${hipCurveY}
            C ${leftWaist + 3} ${waistY + 2}, ${leftWaist + 2} ${waistY - 2}, ${leftRibcage + 4} ${ribcageY}
            C ${leftChest + 3} ${chestY + 2}, ${leftChest + 2} ${chestY - 2}, ${leftShoulder + 4} ${shoulderY + 2}
            Z`}
        fill={shadowColor}
        opacity={0.18}
      />
      <Path
        d={`M ${rightShoulder - 1} ${shoulderY + 2}
            C ${rightChest + 1} ${chestY - 2}, ${rightChest} ${chestY + 4}, ${rightRibcage - 1} ${ribcageY}
            C ${rightWaist + 1} ${waistY - 4}, ${rightWaist} ${waistY + 2}, ${rightHip + 1} ${hipCurveY}
            C ${rightHip} ${hipY - 4}, ${rightHip - 2} ${hipY}, ${rightHip - 5} ${hipY}
            L ${rightHip - 5} ${hipY}
            C ${rightHip - 3} ${hipY}, ${rightHip - 2} ${hipCurveY + 2}, ${rightHip - 3} ${hipCurveY}
            C ${rightWaist - 3} ${waistY + 2}, ${rightWaist - 2} ${waistY - 2}, ${rightRibcage - 4} ${ribcageY}
            C ${rightChest - 3} ${chestY + 2}, ${rightChest - 2} ${chestY - 2}, ${rightShoulder - 4} ${shoulderY + 2}
            Z`}
        fill={shadowColor}
        opacity={0.18}
      />

      {/* Waist indentation highlights */}
      <Path
        d={`M ${leftWaist + 2} ${waistY - 2}
            C ${leftWaist + 4} ${waistY}, ${leftWaist + 3} ${waistY + 4}, ${leftWaist + 2} ${waistY + 6}`}
        stroke={highlightColor}
        strokeWidth={1}
        fill="none"
        opacity={0.2}
      />
      <Path
        d={`M ${rightWaist - 2} ${waistY - 2}
            C ${rightWaist - 4} ${waistY}, ${rightWaist - 3} ${waistY + 4}, ${rightWaist - 2} ${waistY + 6}`}
        stroke={highlightColor}
        strokeWidth={1}
        fill="none"
        opacity={0.2}
      />

      {/* Navel - more detailed */}
      <Ellipse
        cx={centerX}
        cy={waistY + 7}
        rx={1.8}
        ry={2.5}
        fill={deepShadow}
        opacity={0.45}
      />
      <Ellipse
        cx={centerX}
        cy={waistY + 6.5}
        rx={1}
        ry={1.2}
        fill={deepShadow}
        opacity={0.25}
      />

      {/* Hip bone hints for slim/athletic types */}
      {(bodyType === BodyType.SLIM || bodyType === BodyType.ATHLETIC) && (
        <G opacity={0.2}>
          <Ellipse
            cx={leftHip + 6}
            cy={hipCurveY + 2}
            rx={3}
            ry={2}
            fill={highlightColor}
          />
          <Ellipse
            cx={rightHip - 6}
            cy={hipCurveY + 2}
            rx={3}
            ry={2}
            fill={highlightColor}
          />
        </G>
      )}
    </G>
  );
}

export default Body;
