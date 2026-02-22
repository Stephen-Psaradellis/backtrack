/**
 * Legs Component - Anatomically accurate leg rendering with pose variations
 * Renders left and right legs with proper muscle taper, calf bulge, and joint definitions
 */

import React from 'react';
import { G, Path, Ellipse, Defs, LinearGradient, Stop } from 'react-native-svg';
import { LegPose, BodyType, SvgPartProps } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

type LegsGradientIds = {
  leftThighGradient: string;
  rightThighGradient: string;
  leftCalfGradient: string;
  rightCalfGradient: string;
};

interface LegsProps extends SvgPartProps {
  pose: LegPose;
  bodyType: BodyType;
  skinTone: string;
}

interface LegDimensions {
  thighLength: number;
  calfLength: number;
  hipWidth: number;
  thighWidth: number;
  kneeWidth: number;
  calfWidth: number;
  ankleWidth: number;
  muscleDefinition: number;
}

function getLegDimensions(bodyType: BodyType): LegDimensions {
  switch (bodyType) {
    case BodyType.SLIM:
      return {
        thighLength: 28,
        calfLength: 26,
        hipWidth: 26,
        thighWidth: 8,
        kneeWidth: 5.5,
        calfWidth: 6,
        ankleWidth: 3.5,
        muscleDefinition: 0.15,
      };
    case BodyType.ATHLETIC:
      return {
        thighLength: 30,
        calfLength: 28,
        hipWidth: 32,
        thighWidth: 11,
        kneeWidth: 7,
        calfWidth: 8,
        ankleWidth: 4.5,
        muscleDefinition: 0.7,
      };
    case BodyType.CURVY:
      return {
        thighLength: 28,
        calfLength: 26,
        hipWidth: 40,
        thighWidth: 12,
        kneeWidth: 7,
        calfWidth: 7,
        ankleWidth: 4,
        muscleDefinition: 0.2,
      };
    case BodyType.PLUS_SIZE:
      return {
        thighLength: 28,
        calfLength: 26,
        hipWidth: 42,
        thighWidth: 14,
        kneeWidth: 9,
        calfWidth: 9,
        ankleWidth: 5,
        muscleDefinition: 0.15,
      };
    case BodyType.MUSCULAR:
      return {
        thighLength: 30,
        calfLength: 28,
        hipWidth: 36,
        thighWidth: 13,
        kneeWidth: 8,
        calfWidth: 9,
        ankleWidth: 5,
        muscleDefinition: 0.9,
      };
    case BodyType.AVERAGE:
    default:
      return {
        thighLength: 28,
        calfLength: 26,
        hipWidth: 32,
        thighWidth: 9,
        kneeWidth: 6,
        calfWidth: 6.5,
        ankleWidth: 4,
        muscleDefinition: 0.3,
      };
  }
}

interface LegPath {
  leftThigh: string;
  leftCalf: string;
  rightThigh: string;
  rightCalf: string;
  leftKnee: { x: number; y: number };
  rightKnee: { x: number; y: number };
  leftAnkle: { x: number; y: number };
  rightAnkle: { x: number; y: number };
  leftCalfPeak: { x: number; y: number };
  rightCalfPeak: { x: number; y: number };
}

function getLegPaths(pose: LegPose, dims: LegDimensions): LegPath {
  const hipY = 122;
  const centerX = 50;
  const leftHipX = centerX - dims.hipWidth / 4;
  const rightHipX = centerX + dims.hipWidth / 4;

  // Dimension aliases for cleaner code
  const tw = dims.thighWidth;
  const kw = dims.kneeWidth;
  const cw = dims.calfWidth;
  const aw = dims.ankleWidth;

  // Helper to create anatomically tapered thigh
  const createThigh = (
    hipX: number,
    hipY: number,
    kneeX: number,
    kneeY: number,
    isLeft: boolean
  ) => {
    const dir = isLeft ? -1 : 1;
    const midY = (hipY + kneeY) / 2;
    // Thigh with natural taper from hip to knee
    return `
      M ${hipX - dir * tw / 2} ${hipY}
      C ${hipX - dir * tw / 2} ${hipY + 6},
        ${hipX - dir * (tw * 0.55)} ${midY - 4},
        ${hipX - dir * (tw * 0.5)} ${midY}
      C ${hipX - dir * (tw * 0.45)} ${midY + 6},
        ${kneeX - dir * kw / 2} ${kneeY - 4},
        ${kneeX - dir * kw / 2} ${kneeY}
      L ${kneeX + dir * kw / 2} ${kneeY}
      C ${kneeX + dir * kw / 2} ${kneeY - 4},
        ${hipX + dir * (tw * 0.45)} ${midY + 6},
        ${hipX + dir * (tw * 0.5)} ${midY}
      C ${hipX + dir * (tw * 0.55)} ${midY - 4},
        ${hipX + dir * tw / 2} ${hipY + 6},
        ${hipX + dir * tw / 2} ${hipY}
      Z
    `;
  };

  // Helper to create calf with muscle bulge
  const createCalf = (
    kneeX: number,
    kneeY: number,
    ankleX: number,
    ankleY: number,
    calfPeakX: number,
    calfPeakY: number,
    isLeft: boolean
  ) => {
    const dir = isLeft ? -1 : 1;
    // Calf with gastrocnemius bulge and taper to ankle
    return `
      M ${kneeX - dir * kw / 2} ${kneeY}
      C ${kneeX - dir * kw / 2} ${kneeY + 3},
        ${calfPeakX - dir * cw / 2} ${calfPeakY - 4},
        ${calfPeakX - dir * cw / 2} ${calfPeakY}
      C ${calfPeakX - dir * (cw * 0.4)} ${calfPeakY + 6},
        ${ankleX - dir * aw / 2} ${ankleY - 8},
        ${ankleX - dir * aw / 2} ${ankleY}
      L ${ankleX + dir * aw / 2} ${ankleY}
      C ${ankleX + dir * aw / 2} ${ankleY - 8},
        ${calfPeakX + dir * (cw * 0.4)} ${calfPeakY + 6},
        ${calfPeakX + dir * cw / 2} ${calfPeakY}
      C ${calfPeakX + dir * cw / 2} ${calfPeakY - 4},
        ${kneeX + dir * kw / 2} ${kneeY + 3},
        ${kneeX + dir * kw / 2} ${kneeY}
      Z
    `;
  };

  switch (pose) {
    case LegPose.CROSSED: {
      const leftKneeX = leftHipX + 5;
      const leftKneeY = hipY + dims.thighLength;
      const leftAnkleX = leftHipX + 3;
      const leftAnkleY = hipY + dims.thighLength + dims.calfLength;
      const leftCalfPeakX = leftKneeX + 2;
      const leftCalfPeakY = leftKneeY + dims.calfLength * 0.35;

      const rightKneeX = rightHipX - 5;
      const rightKneeY = hipY + dims.thighLength;
      const rightAnkleX = rightHipX - 3;
      const rightAnkleY = hipY + dims.thighLength + dims.calfLength;
      const rightCalfPeakX = rightKneeX - 2;
      const rightCalfPeakY = rightKneeY + dims.calfLength * 0.35;

      return {
        leftThigh: createThigh(leftHipX, hipY, leftKneeX, leftKneeY, true),
        leftCalf: createCalf(leftKneeX, leftKneeY, leftAnkleX, leftAnkleY, leftCalfPeakX, leftCalfPeakY, true),
        rightThigh: createThigh(rightHipX, hipY, rightKneeX, rightKneeY, false),
        rightCalf: createCalf(rightKneeX, rightKneeY, rightAnkleX, rightAnkleY, rightCalfPeakX, rightCalfPeakY, false),
        leftKnee: { x: leftKneeX, y: leftKneeY },
        rightKnee: { x: rightKneeX, y: rightKneeY },
        leftAnkle: { x: leftAnkleX, y: leftAnkleY },
        rightAnkle: { x: rightAnkleX, y: rightAnkleY },
        leftCalfPeak: { x: leftCalfPeakX, y: leftCalfPeakY },
        rightCalfPeak: { x: rightCalfPeakX, y: rightCalfPeakY },
      };
    }

    case LegPose.WIDE: {
      const wideOffset = 10;
      const leftKneeX = leftHipX - wideOffset;
      const leftKneeY = hipY + dims.thighLength;
      const leftAnkleX = leftHipX - wideOffset + 2;
      const leftAnkleY = hipY + dims.thighLength + dims.calfLength;
      const leftCalfPeakX = leftKneeX;
      const leftCalfPeakY = leftKneeY + dims.calfLength * 0.35;

      const rightKneeX = rightHipX + wideOffset;
      const rightKneeY = hipY + dims.thighLength;
      const rightAnkleX = rightHipX + wideOffset - 2;
      const rightAnkleY = hipY + dims.thighLength + dims.calfLength;
      const rightCalfPeakX = rightKneeX;
      const rightCalfPeakY = rightKneeY + dims.calfLength * 0.35;

      return {
        leftThigh: createThigh(leftHipX, hipY, leftKneeX, leftKneeY, true),
        leftCalf: createCalf(leftKneeX, leftKneeY, leftAnkleX, leftAnkleY, leftCalfPeakX, leftCalfPeakY, true),
        rightThigh: createThigh(rightHipX, hipY, rightKneeX, rightKneeY, false),
        rightCalf: createCalf(rightKneeX, rightKneeY, rightAnkleX, rightAnkleY, rightCalfPeakX, rightCalfPeakY, false),
        leftKnee: { x: leftKneeX, y: leftKneeY },
        rightKnee: { x: rightKneeX, y: rightKneeY },
        leftAnkle: { x: leftAnkleX, y: leftAnkleY },
        rightAnkle: { x: rightAnkleX, y: rightAnkleY },
        leftCalfPeak: { x: leftCalfPeakX, y: leftCalfPeakY },
        rightCalfPeak: { x: rightCalfPeakX, y: rightCalfPeakY },
      };
    }

    case LegPose.SITTING: {
      // Sitting pose - thighs extend outward horizontally
      const leftKneeX = leftHipX - 28;
      const leftKneeY = hipY + 15;
      const leftAnkleX = leftKneeX - 8;
      const leftAnkleY = leftKneeY + dims.calfLength * 0.7;
      const leftCalfPeakX = leftKneeX - 4;
      const leftCalfPeakY = leftKneeY + dims.calfLength * 0.3;

      const rightKneeX = rightHipX + 28;
      const rightKneeY = hipY + 15;
      const rightAnkleX = rightKneeX + 8;
      const rightAnkleY = rightKneeY + dims.calfLength * 0.7;
      const rightCalfPeakX = rightKneeX + 4;
      const rightCalfPeakY = rightKneeY + dims.calfLength * 0.3;

      // Custom sitting thigh path (horizontal orientation)
      const leftThigh = `
        M ${leftHipX - tw / 2} ${hipY}
        C ${leftHipX - tw / 2 - 5} ${hipY + 3},
          ${leftKneeX + 10} ${leftKneeY - tw / 2},
          ${leftKneeX} ${leftKneeY - kw / 2}
        L ${leftKneeX} ${leftKneeY + kw / 2}
        C ${leftKneeX + 10} ${leftKneeY + tw / 2},
          ${leftHipX + tw / 2 - 5} ${hipY + 3},
          ${leftHipX + tw / 2} ${hipY}
        Z
      `;

      const rightThigh = `
        M ${rightHipX - tw / 2} ${hipY}
        C ${rightHipX - tw / 2 + 5} ${hipY + 3},
          ${rightKneeX - 10} ${rightKneeY - tw / 2},
          ${rightKneeX} ${rightKneeY - kw / 2}
        L ${rightKneeX} ${rightKneeY + kw / 2}
        C ${rightKneeX - 10} ${rightKneeY + tw / 2},
          ${rightHipX + tw / 2 + 5} ${hipY + 3},
          ${rightHipX + tw / 2} ${hipY}
        Z
      `;

      return {
        leftThigh,
        leftCalf: createCalf(leftKneeX, leftKneeY, leftAnkleX, leftAnkleY, leftCalfPeakX, leftCalfPeakY, true),
        rightThigh,
        rightCalf: createCalf(rightKneeX, rightKneeY, rightAnkleX, rightAnkleY, rightCalfPeakX, rightCalfPeakY, false),
        leftKnee: { x: leftKneeX, y: leftKneeY },
        rightKnee: { x: rightKneeX, y: rightKneeY },
        leftAnkle: { x: leftAnkleX, y: leftAnkleY },
        rightAnkle: { x: rightAnkleX, y: rightAnkleY },
        leftCalfPeak: { x: leftCalfPeakX, y: leftCalfPeakY },
        rightCalfPeak: { x: rightCalfPeakX, y: rightCalfPeakY },
      };
    }

    case LegPose.STANDING:
    default: {
      const leftKneeX = leftHipX;
      const leftKneeY = hipY + dims.thighLength;
      const leftAnkleX = leftHipX + 1;
      const leftAnkleY = hipY + dims.thighLength + dims.calfLength;
      const leftCalfPeakX = leftKneeX + 1;
      const leftCalfPeakY = leftKneeY + dims.calfLength * 0.35;

      const rightKneeX = rightHipX;
      const rightKneeY = hipY + dims.thighLength;
      const rightAnkleX = rightHipX - 1;
      const rightAnkleY = hipY + dims.thighLength + dims.calfLength;
      const rightCalfPeakX = rightKneeX - 1;
      const rightCalfPeakY = rightKneeY + dims.calfLength * 0.35;

      return {
        leftThigh: createThigh(leftHipX, hipY, leftKneeX, leftKneeY, true),
        leftCalf: createCalf(leftKneeX, leftKneeY, leftAnkleX, leftAnkleY, leftCalfPeakX, leftCalfPeakY, true),
        rightThigh: createThigh(rightHipX, hipY, rightKneeX, rightKneeY, false),
        rightCalf: createCalf(rightKneeX, rightKneeY, rightAnkleX, rightAnkleY, rightCalfPeakX, rightCalfPeakY, false),
        leftKnee: { x: leftKneeX, y: leftKneeY },
        rightKnee: { x: rightKneeX, y: rightKneeY },
        leftAnkle: { x: leftAnkleX, y: leftAnkleY },
        rightAnkle: { x: rightAnkleX, y: rightAnkleY },
        leftCalfPeak: { x: leftCalfPeakX, y: leftCalfPeakY },
        rightCalfPeak: { x: rightCalfPeakX, y: rightCalfPeakY },
      };
    }
  }
}

export function Legs({ pose, bodyType, skinTone, scale = 1 }: LegsProps) {
  const dims = getLegDimensions(bodyType);
  const paths = getLegPaths(pose, dims);
  const shadowColor = adjustBrightness(skinTone, -30);
  const highlightColor = adjustBrightness(skinTone, 20);
  const deepShadow = adjustBrightness(skinTone, -45);

  const ids = useGradientIds<LegsGradientIds>([
    'leftThighGradient',
    'rightThighGradient',
    'leftCalfGradient',
    'rightCalfGradient',
  ]);

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        {/* Thigh gradients - fuller, rounder lighting */}
        <LinearGradient id={ids.leftThighGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="25%" stopColor={skinTone} />
          <Stop offset="50%" stopColor={highlightColor} />
          <Stop offset="75%" stopColor={skinTone} />
          <Stop offset="100%" stopColor={shadowColor} />
        </LinearGradient>
        <LinearGradient id={ids.rightThighGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="25%" stopColor={skinTone} />
          <Stop offset="50%" stopColor={highlightColor} />
          <Stop offset="75%" stopColor={skinTone} />
          <Stop offset="100%" stopColor={shadowColor} />
        </LinearGradient>
        {/* Calf gradients - slightly different for muscle definition */}
        <LinearGradient id={ids.leftCalfGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="35%" stopColor={skinTone} />
          <Stop offset="55%" stopColor={highlightColor} />
          <Stop offset="100%" stopColor={skinTone} />
        </LinearGradient>
        <LinearGradient id={ids.rightCalfGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={skinTone} />
          <Stop offset="45%" stopColor={highlightColor} />
          <Stop offset="65%" stopColor={skinTone} />
          <Stop offset="100%" stopColor={shadowColor} />
        </LinearGradient>
      </Defs>

      {/* Left thigh */}
      <Path d={paths.leftThigh} fill={`url(#${ids.leftThighGradient})`} />

      {/* Left thigh muscle definition */}
      {dims.muscleDefinition > 0.2 && (
        <G opacity={dims.muscleDefinition * 0.35}>
          {/* Quadriceps definition */}
          <Path
            d={`M ${paths.leftKnee.x - dims.thighWidth * 0.2} ${122 + 8}
                Q ${paths.leftKnee.x - dims.thighWidth * 0.15} ${122 + dims.thighLength * 0.5}
                  ${paths.leftKnee.x - dims.kneeWidth * 0.3} ${paths.leftKnee.y - 4}`}
            stroke={shadowColor}
            strokeWidth={0.6}
            fill="none"
            opacity={0.4}
          />
          {/* Vastus lateralis hint */}
          <Ellipse
            cx={paths.leftKnee.x - dims.thighWidth * 0.35}
            cy={122 + dims.thighLength * 0.4}
            rx={dims.thighWidth * 0.15}
            ry={dims.thighLength * 0.15}
            fill={highlightColor}
            opacity={0.25}
          />
        </G>
      )}

      {/* Left calf */}
      <Path d={paths.leftCalf} fill={`url(#${ids.leftCalfGradient})`} />

      {/* Left calf muscle definition */}
      {dims.muscleDefinition > 0.25 && (
        <G opacity={dims.muscleDefinition * 0.4}>
          {/* Gastrocnemius highlight */}
          <Ellipse
            cx={paths.leftCalfPeak.x}
            cy={paths.leftCalfPeak.y}
            rx={dims.calfWidth * 0.35}
            ry={dims.calfWidth * 0.5}
            fill={highlightColor}
            opacity={0.35}
          />
          {/* Achilles tendon definition */}
          <Path
            d={`M ${paths.leftCalfPeak.x} ${paths.leftCalfPeak.y + dims.calfLength * 0.3}
                Q ${paths.leftAnkle.x} ${paths.leftAnkle.y - 6}
                  ${paths.leftAnkle.x} ${paths.leftAnkle.y - 2}`}
            stroke={shadowColor}
            strokeWidth={0.5}
            fill="none"
            opacity={0.3}
          />
        </G>
      )}

      {/* Right thigh */}
      <Path d={paths.rightThigh} fill={`url(#${ids.rightThighGradient})`} />

      {/* Right thigh muscle definition */}
      {dims.muscleDefinition > 0.2 && (
        <G opacity={dims.muscleDefinition * 0.35}>
          {/* Quadriceps definition */}
          <Path
            d={`M ${paths.rightKnee.x + dims.thighWidth * 0.2} ${122 + 8}
                Q ${paths.rightKnee.x + dims.thighWidth * 0.15} ${122 + dims.thighLength * 0.5}
                  ${paths.rightKnee.x + dims.kneeWidth * 0.3} ${paths.rightKnee.y - 4}`}
            stroke={shadowColor}
            strokeWidth={0.6}
            fill="none"
            opacity={0.4}
          />
          {/* Vastus lateralis hint */}
          <Ellipse
            cx={paths.rightKnee.x + dims.thighWidth * 0.35}
            cy={122 + dims.thighLength * 0.4}
            rx={dims.thighWidth * 0.15}
            ry={dims.thighLength * 0.15}
            fill={highlightColor}
            opacity={0.25}
          />
        </G>
      )}

      {/* Right calf */}
      <Path d={paths.rightCalf} fill={`url(#${ids.rightCalfGradient})`} />

      {/* Right calf muscle definition */}
      {dims.muscleDefinition > 0.25 && (
        <G opacity={dims.muscleDefinition * 0.4}>
          {/* Gastrocnemius highlight */}
          <Ellipse
            cx={paths.rightCalfPeak.x}
            cy={paths.rightCalfPeak.y}
            rx={dims.calfWidth * 0.35}
            ry={dims.calfWidth * 0.5}
            fill={highlightColor}
            opacity={0.35}
          />
          {/* Achilles tendon definition */}
          <Path
            d={`M ${paths.rightCalfPeak.x} ${paths.rightCalfPeak.y + dims.calfLength * 0.3}
                Q ${paths.rightAnkle.x} ${paths.rightAnkle.y - 6}
                  ${paths.rightAnkle.x} ${paths.rightAnkle.y - 2}`}
            stroke={shadowColor}
            strokeWidth={0.5}
            fill="none"
            opacity={0.3}
          />
        </G>
      )}

      {/* Inner thigh shadows for depth - standing pose */}
      {pose === LegPose.STANDING && (
        <G>
          <Path
            d={`M ${50 - dims.hipWidth / 8} ${122}
                C ${50 - dims.hipWidth / 12} ${132},
                  ${50 - dims.hipWidth / 10} ${142},
                  ${paths.leftKnee.x + dims.kneeWidth / 3} ${paths.leftKnee.y - 2}`}
            stroke={shadowColor}
            strokeWidth={1.2}
            fill="none"
            opacity={0.18}
          />
          <Path
            d={`M ${50 + dims.hipWidth / 8} ${122}
                C ${50 + dims.hipWidth / 12} ${132},
                  ${50 + dims.hipWidth / 10} ${142},
                  ${paths.rightKnee.x - dims.kneeWidth / 3} ${paths.rightKnee.y - 2}`}
            stroke={shadowColor}
            strokeWidth={1.2}
            fill="none"
            opacity={0.18}
          />
        </G>
      )}

    </G>
  );
}

// Export ankle positions for feet/shoe attachment
export function getAnklePositions(pose: LegPose, bodyType: BodyType) {
  const dims = getLegDimensions(bodyType);
  const paths = getLegPaths(pose, dims);
  return {
    left: paths.leftAnkle,
    right: paths.rightAnkle,
  };
}

export default Legs;
