/**
 * Legs Component - Simplified leg rendering with 8 core poses
 * Uses the new proportion system from constants/proportions.ts
 */

import React from 'react';
import { G, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { LegPose, BodyType, SvgPartProps } from '../types';
import {
  getProportions,
  CENTER_X,
  HIP_Y,
  HEAD_UNIT,
  LEG_THIGH_RATIO,
  LEG_CALF_RATIO,
  SHADING,
} from '../constants/proportions';
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

interface LegPath {
  leftThigh: string;
  leftCalf: string;
  rightThigh: string;
  rightCalf: string;
  leftKnee: { x: number; y: number };
  rightKnee: { x: number; y: number };
  leftAnkle: { x: number; y: number };
  rightAnkle: { x: number; y: number };
}

function getLegPaths(pose: LegPose, bodyType: BodyType): LegPath {
  const hipY = HIP_Y; // 122
  const centerX = CENTER_X; // 50
  const proportions = getProportions(bodyType);

  const thighLength = HEAD_UNIT * LEG_THIGH_RATIO;
  const calfLength = HEAD_UNIT * LEG_CALF_RATIO;

  const hipWidth = proportions.hipWidth;
  const tw = proportions.thighWidth;
  const cw = proportions.calfWidth;
  const aw = proportions.ankleWidth;
  const kneeWidth = (tw + cw) / 2; // knee width is midpoint between thigh and calf

  const leftHipX = centerX - hipWidth / 4;
  const rightHipX = centerX + hipWidth / 4;

  // Helper to create tapered thigh with organic curves
  const createThigh = (
    hipX: number,
    hipY: number,
    kneeX: number,
    kneeY: number,
    isLeft: boolean
  ) => {
    const dir = isLeft ? -1 : 1;
    const midY = (hipY + kneeY) / 2;
    const midX = (hipX + kneeX) / 2;
    const bulge = 2; // muscle bulge outward
    return `
      M ${hipX - dir * tw / 2} ${hipY}
      C ${midX - dir * (tw / 2 + bulge)} ${midY - (kneeY - hipY) * 0.15},
        ${midX - dir * (kneeWidth / 2 + bulge)} ${midY + (kneeY - hipY) * 0.15},
        ${kneeX - dir * kneeWidth / 2} ${kneeY}
      L ${kneeX + dir * kneeWidth / 2} ${kneeY}
      C ${midX + dir * (kneeWidth / 2 + bulge)} ${midY + (kneeY - hipY) * 0.15},
        ${midX + dir * (tw / 2 + bulge)} ${midY - (kneeY - hipY) * 0.15},
        ${hipX + dir * tw / 2} ${hipY}
      Z
    `;
  };

  // Helper to create tapered calf with organic curves
  const createCalf = (
    kneeX: number,
    kneeY: number,
    ankleX: number,
    ankleY: number,
    isLeft: boolean
  ) => {
    const dir = isLeft ? -1 : 1;
    const midY = (kneeY + ankleY) / 2;
    const midX = (kneeX + ankleX) / 2;
    const bulge = 1.5; // calf muscle bulge
    return `
      M ${kneeX - dir * kneeWidth / 2} ${kneeY}
      C ${midX - dir * (kneeWidth / 2 + bulge)} ${midY - (ankleY - kneeY) * 0.2},
        ${midX - dir * (aw / 2 + bulge * 0.5)} ${midY + (ankleY - kneeY) * 0.1},
        ${ankleX - dir * aw / 2} ${ankleY}
      L ${ankleX + dir * aw / 2} ${ankleY}
      C ${midX + dir * (aw / 2 + bulge * 0.5)} ${midY + (ankleY - kneeY) * 0.1},
        ${midX + dir * (kneeWidth / 2 + bulge)} ${midY - (ankleY - kneeY) * 0.2},
        ${kneeX + dir * kneeWidth / 2} ${kneeY}
      Z
    `;
  };

  // === 8 Core Leg Poses ===

  switch (pose) {
    case LegPose.CROSSED: {
      // Legs crossed at ankles
      const leftKneeX = leftHipX + 3;
      const leftKneeY = hipY + thighLength;
      const leftAnkleX = leftHipX + 2;
      const leftAnkleY = hipY + thighLength + calfLength;

      const rightKneeX = rightHipX - 3;
      const rightKneeY = hipY + thighLength;
      const rightAnkleX = rightHipX - 2;
      const rightAnkleY = hipY + thighLength + calfLength;

      return {
        leftThigh: createThigh(leftHipX, hipY, leftKneeX, leftKneeY, true),
        leftCalf: createCalf(leftKneeX, leftKneeY, leftAnkleX, leftAnkleY, true),
        rightThigh: createThigh(rightHipX, hipY, rightKneeX, rightKneeY, false),
        rightCalf: createCalf(rightKneeX, rightKneeY, rightAnkleX, rightAnkleY, false),
        leftKnee: { x: leftKneeX, y: leftKneeY },
        rightKnee: { x: rightKneeX, y: rightKneeY },
        leftAnkle: { x: leftAnkleX, y: leftAnkleY },
        rightAnkle: { x: rightAnkleX, y: rightAnkleY },
      };
    }

    case LegPose.WIDE: {
      // Wide stance
      const wideOffset = 10;
      const leftKneeX = leftHipX - wideOffset;
      const leftKneeY = hipY + thighLength;
      const leftAnkleX = leftHipX - wideOffset + 2;
      const leftAnkleY = hipY + thighLength + calfLength;

      const rightKneeX = rightHipX + wideOffset;
      const rightKneeY = hipY + thighLength;
      const rightAnkleX = rightHipX + wideOffset - 2;
      const rightAnkleY = hipY + thighLength + calfLength;

      return {
        leftThigh: createThigh(leftHipX, hipY, leftKneeX, leftKneeY, true),
        leftCalf: createCalf(leftKneeX, leftKneeY, leftAnkleX, leftAnkleY, true),
        rightThigh: createThigh(rightHipX, hipY, rightKneeX, rightKneeY, false),
        rightCalf: createCalf(rightKneeX, rightKneeY, rightAnkleX, rightAnkleY, false),
        leftKnee: { x: leftKneeX, y: leftKneeY },
        rightKnee: { x: rightKneeX, y: rightKneeY },
        leftAnkle: { x: leftAnkleX, y: leftAnkleY },
        rightAnkle: { x: rightAnkleX, y: rightAnkleY },
      };
    }

    case LegPose.SITTING: {
      // Sitting pose - thighs extend outward horizontally
      const leftKneeX = leftHipX - 28;
      const leftKneeY = hipY + 15;
      const leftAnkleX = leftKneeX - 8;
      const leftAnkleY = leftKneeY + calfLength * 0.7;

      const rightKneeX = rightHipX + 28;
      const rightKneeY = hipY + 15;
      const rightAnkleX = rightKneeX + 8;
      const rightAnkleY = rightKneeY + calfLength * 0.7;

      // Custom horizontal thigh path for sitting
      const leftThigh = `
        M ${leftHipX - tw / 2} ${hipY}
        C ${leftHipX - tw / 2 - 5} ${hipY + 3},
          ${leftKneeX + 10} ${leftKneeY - tw / 2},
          ${leftKneeX} ${leftKneeY - kneeWidth / 2}
        L ${leftKneeX} ${leftKneeY + kneeWidth / 2}
        C ${leftKneeX + 10} ${leftKneeY + tw / 2},
          ${leftHipX + tw / 2 - 5} ${hipY + 3},
          ${leftHipX + tw / 2} ${hipY}
        Z
      `;

      const rightThigh = `
        M ${rightHipX - tw / 2} ${hipY}
        C ${rightHipX - tw / 2 + 5} ${hipY + 3},
          ${rightKneeX - 10} ${rightKneeY - tw / 2},
          ${rightKneeX} ${rightKneeY - kneeWidth / 2}
        L ${rightKneeX} ${rightKneeY + kneeWidth / 2}
        C ${rightKneeX - 10} ${rightKneeY + tw / 2},
          ${rightHipX + tw / 2 + 5} ${hipY + 3},
          ${rightHipX + tw / 2} ${hipY}
        Z
      `;

      return {
        leftThigh,
        leftCalf: createCalf(leftKneeX, leftKneeY, leftAnkleX, leftAnkleY, true),
        rightThigh,
        rightCalf: createCalf(rightKneeX, rightKneeY, rightAnkleX, rightAnkleY, false),
        leftKnee: { x: leftKneeX, y: leftKneeY },
        rightKnee: { x: rightKneeX, y: rightKneeY },
        leftAnkle: { x: leftAnkleX, y: leftAnkleY },
        rightAnkle: { x: rightAnkleX, y: rightAnkleY },
      };
    }

    case LegPose.STANDING_RELAXED: {
      // Relaxed standing - slight offset
      const leftKneeX = leftHipX + 1;
      const leftKneeY = hipY + thighLength;
      const leftAnkleX = leftHipX + 2;
      const leftAnkleY = hipY + thighLength + calfLength;

      const rightKneeX = rightHipX;
      const rightKneeY = hipY + thighLength;
      const rightAnkleX = rightHipX - 1;
      const rightAnkleY = hipY + thighLength + calfLength;

      return {
        leftThigh: createThigh(leftHipX, hipY, leftKneeX, leftKneeY, true),
        leftCalf: createCalf(leftKneeX, leftKneeY, leftAnkleX, leftAnkleY, true),
        rightThigh: createThigh(rightHipX, hipY, rightKneeX, rightKneeY, false),
        rightCalf: createCalf(rightKneeX, rightKneeY, rightAnkleX, rightAnkleY, false),
        leftKnee: { x: leftKneeX, y: leftKneeY },
        rightKnee: { x: rightKneeX, y: rightKneeY },
        leftAnkle: { x: leftAnkleX, y: leftAnkleY },
        rightAnkle: { x: rightAnkleX, y: rightAnkleY },
      };
    }

    case LegPose.STANDING_WEIGHT_SHIFT: {
      // Weight shifted to one side
      const leftKneeX = leftHipX - 3;
      const leftKneeY = hipY + thighLength + 2;
      const leftAnkleX = leftHipX - 4;
      const leftAnkleY = hipY + thighLength + calfLength + 1;

      const rightKneeX = rightHipX;
      const rightKneeY = hipY + thighLength;
      const rightAnkleX = rightHipX - 1;
      const rightAnkleY = hipY + thighLength + calfLength;

      return {
        leftThigh: createThigh(leftHipX, hipY, leftKneeX, leftKneeY, true),
        leftCalf: createCalf(leftKneeX, leftKneeY, leftAnkleX, leftAnkleY, true),
        rightThigh: createThigh(rightHipX, hipY, rightKneeX, rightKneeY, false),
        rightCalf: createCalf(rightKneeX, rightKneeY, rightAnkleX, rightAnkleY, false),
        leftKnee: { x: leftKneeX, y: leftKneeY },
        rightKnee: { x: rightKneeX, y: rightKneeY },
        leftAnkle: { x: leftAnkleX, y: leftAnkleY },
        rightAnkle: { x: rightAnkleX, y: rightAnkleY },
      };
    }

    case LegPose.WALKING: {
      // Walking stride
      const leftKneeX = leftHipX - 6;
      const leftKneeY = hipY + thighLength - 2;
      const leftAnkleX = leftHipX - 8;
      const leftAnkleY = hipY + thighLength + calfLength - 2;

      const rightKneeX = rightHipX + 6;
      const rightKneeY = hipY + thighLength - 2;
      const rightAnkleX = rightHipX + 8;
      const rightAnkleY = hipY + thighLength + calfLength - 2;

      return {
        leftThigh: createThigh(leftHipX, hipY, leftKneeX, leftKneeY, true),
        leftCalf: createCalf(leftKneeX, leftKneeY, leftAnkleX, leftAnkleY, true),
        rightThigh: createThigh(rightHipX, hipY, rightKneeX, rightKneeY, false),
        rightCalf: createCalf(rightKneeX, rightKneeY, rightAnkleX, rightAnkleY, false),
        leftKnee: { x: leftKneeX, y: leftKneeY },
        rightKnee: { x: rightKneeX, y: rightKneeY },
        leftAnkle: { x: leftAnkleX, y: leftAnkleY },
        rightAnkle: { x: rightAnkleX, y: rightAnkleY },
      };
    }

    case LegPose.KNEELING: {
      // Kneeling pose - both knees down
      const leftKneeX = leftHipX;
      const leftKneeY = hipY + 5;
      const leftAnkleX = leftHipX + 2;
      const leftAnkleY = hipY + 8;

      const rightKneeX = rightHipX;
      const rightKneeY = hipY + 5;
      const rightAnkleX = rightHipX - 2;
      const rightAnkleY = hipY + 8;

      return {
        leftThigh: createThigh(leftHipX, hipY, leftKneeX, leftKneeY, true),
        leftCalf: createCalf(leftKneeX, leftKneeY, leftAnkleX, leftAnkleY, true),
        rightThigh: createThigh(rightHipX, hipY, rightKneeX, rightKneeY, false),
        rightCalf: createCalf(rightKneeX, rightKneeY, rightAnkleX, rightAnkleY, false),
        leftKnee: { x: leftKneeX, y: leftKneeY },
        rightKnee: { x: rightKneeX, y: rightKneeY },
        leftAnkle: { x: leftAnkleX, y: leftAnkleY },
        rightAnkle: { x: rightAnkleX, y: rightAnkleY },
      };
    }

    case LegPose.STANDING:
    default: {
      // Standard standing pose - straight legs
      const leftKneeX = leftHipX;
      const leftKneeY = hipY + thighLength;
      const leftAnkleX = leftHipX + 1;
      const leftAnkleY = hipY + thighLength + calfLength;

      const rightKneeX = rightHipX;
      const rightKneeY = hipY + thighLength;
      const rightAnkleX = rightHipX - 1;
      const rightAnkleY = hipY + thighLength + calfLength;

      return {
        leftThigh: createThigh(leftHipX, hipY, leftKneeX, leftKneeY, true),
        leftCalf: createCalf(leftKneeX, leftKneeY, leftAnkleX, leftAnkleY, true),
        rightThigh: createThigh(rightHipX, hipY, rightKneeX, rightKneeY, false),
        rightCalf: createCalf(rightKneeX, rightKneeY, rightAnkleX, rightAnkleY, false),
        leftKnee: { x: leftKneeX, y: leftKneeY },
        rightKnee: { x: rightKneeX, y: rightKneeY },
        leftAnkle: { x: leftAnkleX, y: leftAnkleY },
        rightAnkle: { x: rightAnkleX, y: rightAnkleY },
      };
    }
  }
}

export function Legs({ pose, bodyType, skinTone, scale = 1 }: LegsProps) {
  const proportions = getProportions(bodyType);
  const paths = getLegPaths(pose, bodyType);
  const shadowColor = adjustBrightness(skinTone, SHADING.shadowDarken);
  const outlineColor = adjustBrightness(skinTone, SHADING.shadowDarken - 10);

  const ids = useGradientIds<LegsGradientIds>([
    'leftThighGradient',
    'rightThighGradient',
    'leftCalfGradient',
    'rightCalfGradient',
  ]);

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        {/* Simple 2-stop shadow gradients for legs */}
        <LinearGradient id={ids.leftThighGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} stopOpacity={0.3} />
          <Stop offset="100%" stopColor="transparent" />
        </LinearGradient>
        <LinearGradient id={ids.rightThighGradient} x1="100%" y1="0%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} stopOpacity={0.3} />
          <Stop offset="100%" stopColor="transparent" />
        </LinearGradient>
        <LinearGradient id={ids.leftCalfGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} stopOpacity={0.25} />
          <Stop offset="100%" stopColor="transparent" />
        </LinearGradient>
        <LinearGradient id={ids.rightCalfGradient} x1="100%" y1="0%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} stopOpacity={0.25} />
          <Stop offset="100%" stopColor="transparent" />
        </LinearGradient>
      </Defs>

      {/* Left leg */}
      <Path
        d={paths.leftThigh}
        fill={skinTone}
        stroke={outlineColor}
        strokeWidth={proportions.outlineWidth}
        strokeOpacity={SHADING.outlineOpacity}
      />
      <Path
        d={paths.leftThigh}
        fill={`url(#${ids.leftThighGradient})`}
        stroke="none"
      />
      <Path
        d={paths.leftCalf}
        fill={skinTone}
        stroke={outlineColor}
        strokeWidth={proportions.outlineWidth}
        strokeOpacity={SHADING.outlineOpacity}
      />
      <Path
        d={paths.leftCalf}
        fill={`url(#${ids.leftCalfGradient})`}
        stroke="none"
      />

      {/* Right leg */}
      <Path
        d={paths.rightThigh}
        fill={skinTone}
        stroke={outlineColor}
        strokeWidth={proportions.outlineWidth}
        strokeOpacity={SHADING.outlineOpacity}
      />
      <Path
        d={paths.rightThigh}
        fill={`url(#${ids.rightThighGradient})`}
        stroke="none"
      />
      <Path
        d={paths.rightCalf}
        fill={skinTone}
        stroke={outlineColor}
        strokeWidth={proportions.outlineWidth}
        strokeOpacity={SHADING.outlineOpacity}
      />
      <Path
        d={paths.rightCalf}
        fill={`url(#${ids.rightCalfGradient})`}
        stroke="none"
      />
    </G>
  );
}

// Export ankle positions for feet/shoe attachment
export function getAnklePositions(pose: LegPose, bodyType: BodyType) {
  const paths = getLegPaths(pose, bodyType);
  return {
    left: paths.leftAnkle,
    right: paths.rightAnkle,
  };
}

export default Legs;
