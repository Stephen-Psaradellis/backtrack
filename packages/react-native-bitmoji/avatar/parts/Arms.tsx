/**
 * Arms Component - Anatomically accurate arm rendering with pose variations
 * Renders left and right arms with proper muscle taper, bicep bulge, and joint definitions
 */

import React from 'react';
import { G, Path, Ellipse, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { ArmPose, BodyType, SvgPartProps } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

type ArmsGradientIds = {
  leftArmGradient: string;
  rightArmGradient: string;
  leftForearmGradient: string;
  rightForearmGradient: string;
};

interface ArmsProps extends SvgPartProps {
  pose: ArmPose;
  bodyType: BodyType;
  skinTone: string;
}

interface ArmDimensions {
  upperArmLength: number;
  lowerArmLength: number;
  shoulderWidth: number;
  bicepWidth: number;
  elbowWidth: number;
  forearmWidth: number;
  wristWidth: number;
  muscleDefinition: number;
}

function getArmDimensions(bodyType: BodyType): ArmDimensions {
  switch (bodyType) {
    case BodyType.SLIM:
      return {
        upperArmLength: 22,
        lowerArmLength: 20,
        shoulderWidth: 7,
        bicepWidth: 5.5,
        elbowWidth: 4.5,
        forearmWidth: 5,
        wristWidth: 3.5,
        muscleDefinition: 0.15,
      };
    case BodyType.ATHLETIC:
      return {
        upperArmLength: 24,
        lowerArmLength: 22,
        shoulderWidth: 9,
        bicepWidth: 8,
        elbowWidth: 6,
        forearmWidth: 7,
        wristWidth: 4.5,
        muscleDefinition: 0.7,
      };
    case BodyType.CURVY:
      return {
        upperArmLength: 22,
        lowerArmLength: 20,
        shoulderWidth: 8,
        bicepWidth: 7,
        elbowWidth: 5.5,
        forearmWidth: 6,
        wristWidth: 4,
        muscleDefinition: 0.2,
      };
    case BodyType.PLUS_SIZE:
      return {
        upperArmLength: 22,
        lowerArmLength: 20,
        shoulderWidth: 10,
        bicepWidth: 9,
        elbowWidth: 7,
        forearmWidth: 8,
        wristWidth: 5,
        muscleDefinition: 0.15,
      };
    case BodyType.MUSCULAR:
      return {
        upperArmLength: 25,
        lowerArmLength: 23,
        shoulderWidth: 11,
        bicepWidth: 10,
        elbowWidth: 7,
        forearmWidth: 8.5,
        wristWidth: 5,
        muscleDefinition: 0.95,
      };
    case BodyType.AVERAGE:
    default:
      return {
        upperArmLength: 23,
        lowerArmLength: 21,
        shoulderWidth: 8,
        bicepWidth: 6.5,
        elbowWidth: 5,
        forearmWidth: 6,
        wristWidth: 4,
        muscleDefinition: 0.3,
      };
  }
}

interface ArmPath {
  leftUpper: string;
  leftLower: string;
  rightUpper: string;
  rightLower: string;
  leftElbow: { x: number; y: number };
  rightElbow: { x: number; y: number };
  leftWrist: { x: number; y: number };
  rightWrist: { x: number; y: number };
  leftBicepPeak: { x: number; y: number };
  rightBicepPeak: { x: number; y: number };
}

function getArmPaths(pose: ArmPose, dims: ArmDimensions): ArmPath {
  const shoulderY = 80;
  const leftShoulderX = 32;
  const rightShoulderX = 68;

  // Arm segment widths for taper
  const sw = dims.shoulderWidth;
  const bw = dims.bicepWidth;
  const ew = dims.elbowWidth;
  const fw = dims.forearmWidth;
  const ww = dims.wristWidth;

  // Helper to create anatomically tapered arm path
  const createUpperArm = (
    startX: number, startY: number,
    elbowX: number, elbowY: number,
    bicepPeakX: number, bicepPeakY: number,
    isLeft: boolean
  ) => {
    const dir = isLeft ? -1 : 1;
    // Upper arm with bicep bulge
    return `
      M ${startX} ${startY - sw/2}
      C ${startX + dir * 2} ${startY + 4}, ${bicepPeakX - dir * (bw - 2)} ${bicepPeakY - 4}, ${bicepPeakX - dir * bw/2} ${bicepPeakY}
      C ${bicepPeakX - dir * (bw - 1)} ${bicepPeakY + 4}, ${elbowX - dir * ew/2} ${elbowY - 2}, ${elbowX - dir * ew/2} ${elbowY}
      L ${elbowX + dir * ew/2} ${elbowY}
      C ${elbowX + dir * ew/2} ${elbowY - 2}, ${bicepPeakX + dir * (bw - 1)} ${bicepPeakY + 4}, ${bicepPeakX + dir * bw/2} ${bicepPeakY}
      C ${bicepPeakX + dir * (bw - 2)} ${bicepPeakY - 4}, ${startX + dir * 2} ${startY + 4}, ${startX} ${startY + sw/2}
      Z
    `;
  };

  const createLowerArm = (
    elbowX: number, elbowY: number,
    wristX: number, wristY: number,
    isLeft: boolean
  ) => {
    const dir = isLeft ? -1 : 1;
    const midY = (elbowY + wristY) / 2;
    // Forearm with taper from elbow to wrist
    return `
      M ${elbowX - dir * ew/2} ${elbowY}
      C ${elbowX - dir * fw/2} ${midY - 4}, ${wristX - dir * ww/2} ${wristY - 6}, ${wristX - dir * ww/2} ${wristY}
      L ${wristX + dir * ww/2} ${wristY}
      C ${wristX + dir * ww/2} ${wristY - 6}, ${elbowX + dir * fw/2} ${midY - 4}, ${elbowX + dir * ew/2} ${elbowY}
      Z
    `;
  };

  switch (pose) {
    case ArmPose.HIPS: {
      const leftElbowX = leftShoulderX - 14;
      const leftElbowY = shoulderY + dims.upperArmLength * 0.85;
      const leftWristX = leftShoulderX - 8;
      const leftWristY = shoulderY + 38;
      const leftBicepX = leftShoulderX - 10;
      const leftBicepY = shoulderY + dims.upperArmLength * 0.4;

      const rightElbowX = rightShoulderX + 14;
      const rightElbowY = shoulderY + dims.upperArmLength * 0.85;
      const rightWristX = rightShoulderX + 8;
      const rightWristY = shoulderY + 38;
      const rightBicepX = rightShoulderX + 10;
      const rightBicepY = shoulderY + dims.upperArmLength * 0.4;

      return {
        leftUpper: createUpperArm(leftShoulderX, shoulderY, leftElbowX, leftElbowY, leftBicepX, leftBicepY, true),
        leftLower: createLowerArm(leftElbowX, leftElbowY, leftWristX, leftWristY, true),
        rightUpper: createUpperArm(rightShoulderX, shoulderY, rightElbowX, rightElbowY, rightBicepX, rightBicepY, false),
        rightLower: createLowerArm(rightElbowX, rightElbowY, rightWristX, rightWristY, false),
        leftElbow: { x: leftElbowX, y: leftElbowY },
        rightElbow: { x: rightElbowX, y: rightElbowY },
        leftWrist: { x: leftWristX, y: leftWristY },
        rightWrist: { x: rightWristX, y: rightWristY },
        leftBicepPeak: { x: leftBicepX, y: leftBicepY },
        rightBicepPeak: { x: rightBicepX, y: rightBicepY },
      };
    }

    case ArmPose.CROSSED: {
      const leftElbowX = leftShoulderX + 12;
      const leftElbowY = shoulderY + 22;
      const leftWristX = 52;
      const leftWristY = shoulderY + 32;
      const leftBicepX = leftShoulderX + 4;
      const leftBicepY = shoulderY + 12;

      const rightElbowX = rightShoulderX - 12;
      const rightElbowY = shoulderY + 20;
      const rightWristX = 48;
      const rightWristY = shoulderY + 28;
      const rightBicepX = rightShoulderX - 4;
      const rightBicepY = shoulderY + 10;

      return {
        leftUpper: createUpperArm(leftShoulderX, shoulderY, leftElbowX, leftElbowY, leftBicepX, leftBicepY, true),
        leftLower: createLowerArm(leftElbowX, leftElbowY, leftWristX, leftWristY, true),
        rightUpper: createUpperArm(rightShoulderX, shoulderY, rightElbowX, rightElbowY, rightBicepX, rightBicepY, false),
        rightLower: createLowerArm(rightElbowX, rightElbowY, rightWristX, rightWristY, false),
        leftElbow: { x: leftElbowX, y: leftElbowY },
        rightElbow: { x: rightElbowX, y: rightElbowY },
        leftWrist: { x: leftWristX, y: leftWristY },
        rightWrist: { x: rightWristX, y: rightWristY },
        leftBicepPeak: { x: leftBicepX, y: leftBicepY },
        rightBicepPeak: { x: rightBicepX, y: rightBicepY },
      };
    }

    case ArmPose.WAVE: {
      const leftElbowX = leftShoulderX - 16;
      const leftElbowY = shoulderY + 6;
      const leftWristX = leftShoulderX - 18;
      const leftWristY = shoulderY - 18;
      const leftBicepX = leftShoulderX - 12;
      const leftBicepY = shoulderY + 10;

      const rightElbowX = rightShoulderX + 8;
      const rightElbowY = shoulderY + dims.upperArmLength;
      const rightWristX = rightShoulderX + 6;
      const rightWristY = shoulderY + dims.upperArmLength + dims.lowerArmLength;
      const rightBicepX = rightShoulderX + 6;
      const rightBicepY = shoulderY + dims.upperArmLength * 0.45;

      return {
        leftUpper: createUpperArm(leftShoulderX, shoulderY, leftElbowX, leftElbowY, leftBicepX, leftBicepY, true),
        leftLower: createLowerArm(leftElbowX, leftElbowY, leftWristX, leftWristY, true),
        rightUpper: createUpperArm(rightShoulderX, shoulderY, rightElbowX, rightElbowY, rightBicepX, rightBicepY, false),
        rightLower: createLowerArm(rightElbowX, rightElbowY, rightWristX, rightWristY, false),
        leftElbow: { x: leftElbowX, y: leftElbowY },
        rightElbow: { x: rightElbowX, y: rightElbowY },
        leftWrist: { x: leftWristX, y: leftWristY },
        rightWrist: { x: rightWristX, y: rightWristY },
        leftBicepPeak: { x: leftBicepX, y: leftBicepY },
        rightBicepPeak: { x: rightBicepX, y: rightBicepY },
      };
    }

    case ArmPose.PEACE:
    case ArmPose.THUMBS_UP: {
      const leftElbowX = leftShoulderX - 8;
      const leftElbowY = shoulderY + dims.upperArmLength;
      const leftWristX = leftShoulderX - 6;
      const leftWristY = shoulderY + dims.upperArmLength + dims.lowerArmLength;
      const leftBicepX = leftShoulderX - 6;
      const leftBicepY = shoulderY + dims.upperArmLength * 0.45;

      const rightElbowX = rightShoulderX + 16;
      const rightElbowY = shoulderY + 4;
      const rightWristX = rightShoulderX + 18;
      const rightWristY = shoulderY - 22;
      const rightBicepX = rightShoulderX + 12;
      const rightBicepY = shoulderY + 8;

      return {
        leftUpper: createUpperArm(leftShoulderX, shoulderY, leftElbowX, leftElbowY, leftBicepX, leftBicepY, true),
        leftLower: createLowerArm(leftElbowX, leftElbowY, leftWristX, leftWristY, true),
        rightUpper: createUpperArm(rightShoulderX, shoulderY, rightElbowX, rightElbowY, rightBicepX, rightBicepY, false),
        rightLower: createLowerArm(rightElbowX, rightElbowY, rightWristX, rightWristY, false),
        leftElbow: { x: leftElbowX, y: leftElbowY },
        rightElbow: { x: rightElbowX, y: rightElbowY },
        leftWrist: { x: leftWristX, y: leftWristY },
        rightWrist: { x: rightWristX, y: rightWristY },
        leftBicepPeak: { x: leftBicepX, y: leftBicepY },
        rightBicepPeak: { x: rightBicepX, y: rightBicepY },
      };
    }

    case ArmPose.POINTING: {
      const leftElbowX = leftShoulderX - 8;
      const leftElbowY = shoulderY + dims.upperArmLength;
      const leftWristX = leftShoulderX - 6;
      const leftWristY = shoulderY + dims.upperArmLength + dims.lowerArmLength;
      const leftBicepX = leftShoulderX - 6;
      const leftBicepY = shoulderY + dims.upperArmLength * 0.45;

      const rightElbowX = rightShoulderX + 26;
      const rightElbowY = shoulderY;
      const rightWristX = rightShoulderX + 44;
      const rightWristY = shoulderY - 2;
      const rightBicepX = rightShoulderX + 14;
      const rightBicepY = shoulderY + 3;

      return {
        leftUpper: createUpperArm(leftShoulderX, shoulderY, leftElbowX, leftElbowY, leftBicepX, leftBicepY, true),
        leftLower: createLowerArm(leftElbowX, leftElbowY, leftWristX, leftWristY, true),
        rightUpper: createUpperArm(rightShoulderX, shoulderY, rightElbowX, rightElbowY, rightBicepX, rightBicepY, false),
        rightLower: createLowerArm(rightElbowX, rightElbowY, rightWristX, rightWristY, false),
        leftElbow: { x: leftElbowX, y: leftElbowY },
        rightElbow: { x: rightElbowX, y: rightElbowY },
        leftWrist: { x: leftWristX, y: leftWristY },
        rightWrist: { x: rightWristX, y: rightWristY },
        leftBicepPeak: { x: leftBicepX, y: leftBicepY },
        rightBicepPeak: { x: rightBicepX, y: rightBicepY },
      };
    }

    case ArmPose.ARMS_UP: {
      const leftElbowX = leftShoulderX - 6;
      const leftElbowY = shoulderY - dims.upperArmLength;
      const leftWristX = leftShoulderX + 2;
      const leftWristY = shoulderY - dims.upperArmLength - dims.lowerArmLength + 5;
      const leftBicepX = leftShoulderX - 8;
      const leftBicepY = shoulderY - dims.upperArmLength * 0.5;

      const rightElbowX = rightShoulderX + 6;
      const rightElbowY = shoulderY - dims.upperArmLength;
      const rightWristX = rightShoulderX - 2;
      const rightWristY = shoulderY - dims.upperArmLength - dims.lowerArmLength + 5;
      const rightBicepX = rightShoulderX + 8;
      const rightBicepY = shoulderY - dims.upperArmLength * 0.5;

      return {
        leftUpper: createUpperArm(leftShoulderX, shoulderY, leftElbowX, leftElbowY, leftBicepX, leftBicepY, true),
        leftLower: createLowerArm(leftElbowX, leftElbowY, leftWristX, leftWristY, true),
        rightUpper: createUpperArm(rightShoulderX, shoulderY, rightElbowX, rightElbowY, rightBicepX, rightBicepY, false),
        rightLower: createLowerArm(rightElbowX, rightElbowY, rightWristX, rightWristY, false),
        leftElbow: { x: leftElbowX, y: leftElbowY },
        rightElbow: { x: rightElbowX, y: rightElbowY },
        leftWrist: { x: leftWristX, y: leftWristY },
        rightWrist: { x: rightWristX, y: rightWristY },
        leftBicepPeak: { x: leftBicepX, y: leftBicepY },
        rightBicepPeak: { x: rightBicepX, y: rightBicepY },
      };
    }

    case ArmPose.FLEXING: {
      const leftElbowX = leftShoulderX - 8;
      const leftElbowY = shoulderY + dims.upperArmLength;
      const leftWristX = leftShoulderX - 6;
      const leftWristY = shoulderY + dims.upperArmLength + dims.lowerArmLength;
      const leftBicepX = leftShoulderX - 6;
      const leftBicepY = shoulderY + dims.upperArmLength * 0.45;

      const rightElbowX = rightShoulderX + 20;
      const rightElbowY = shoulderY - 8;
      const rightWristX = rightShoulderX + 12;
      const rightWristY = shoulderY - 24;
      const rightBicepX = rightShoulderX + 14;
      const rightBicepY = shoulderY - 2;

      return {
        leftUpper: createUpperArm(leftShoulderX, shoulderY, leftElbowX, leftElbowY, leftBicepX, leftBicepY, true),
        leftLower: createLowerArm(leftElbowX, leftElbowY, leftWristX, leftWristY, true),
        rightUpper: createUpperArm(rightShoulderX, shoulderY, rightElbowX, rightElbowY, rightBicepX, rightBicepY, false),
        rightLower: createLowerArm(rightElbowX, rightElbowY, rightWristX, rightWristY, false),
        leftElbow: { x: leftElbowX, y: leftElbowY },
        rightElbow: { x: rightElbowX, y: rightElbowY },
        leftWrist: { x: leftWristX, y: leftWristY },
        rightWrist: { x: rightWristX, y: rightWristY },
        leftBicepPeak: { x: leftBicepX, y: leftBicepY },
        rightBicepPeak: { x: rightBicepX, y: rightBicepY },
      };
    }

    case ArmPose.PRAYING: {
      const leftElbowX = leftShoulderX + 10;
      const leftElbowY = shoulderY + dims.upperArmLength - 5;
      const leftWristX = 48;
      const leftWristY = shoulderY + dims.upperArmLength + 10;
      const leftBicepX = leftShoulderX + 4;
      const leftBicepY = shoulderY + 10;

      const rightElbowX = rightShoulderX - 10;
      const rightElbowY = shoulderY + dims.upperArmLength - 5;
      const rightWristX = 52;
      const rightWristY = shoulderY + dims.upperArmLength + 10;
      const rightBicepX = rightShoulderX - 4;
      const rightBicepY = shoulderY + 10;

      return {
        leftUpper: createUpperArm(leftShoulderX, shoulderY, leftElbowX, leftElbowY, leftBicepX, leftBicepY, true),
        leftLower: createLowerArm(leftElbowX, leftElbowY, leftWristX, leftWristY, true),
        rightUpper: createUpperArm(rightShoulderX, shoulderY, rightElbowX, rightElbowY, rightBicepX, rightBicepY, false),
        rightLower: createLowerArm(rightElbowX, rightElbowY, rightWristX, rightWristY, false),
        leftElbow: { x: leftElbowX, y: leftElbowY },
        rightElbow: { x: rightElbowX, y: rightElbowY },
        leftWrist: { x: leftWristX, y: leftWristY },
        rightWrist: { x: rightWristX, y: rightWristY },
        leftBicepPeak: { x: leftBicepX, y: leftBicepY },
        rightBicepPeak: { x: rightBicepX, y: rightBicepY },
      };
    }

    case ArmPose.SHRUG: {
      const leftElbowX = leftShoulderX - 18;
      const leftElbowY = shoulderY + dims.upperArmLength - 10;
      const leftWristX = leftShoulderX - 15;
      const leftWristY = shoulderY + dims.upperArmLength + dims.lowerArmLength - 10;
      const leftBicepX = leftShoulderX - 14;
      const leftBicepY = shoulderY + 6;

      const rightElbowX = rightShoulderX + 18;
      const rightElbowY = shoulderY + dims.upperArmLength - 10;
      const rightWristX = rightShoulderX + 15;
      const rightWristY = shoulderY + dims.upperArmLength + dims.lowerArmLength - 10;
      const rightBicepX = rightShoulderX + 14;
      const rightBicepY = shoulderY + 6;

      return {
        leftUpper: createUpperArm(leftShoulderX, shoulderY - 5, leftElbowX, leftElbowY, leftBicepX, leftBicepY, true),
        leftLower: createLowerArm(leftElbowX, leftElbowY, leftWristX, leftWristY, true),
        rightUpper: createUpperArm(rightShoulderX, shoulderY - 5, rightElbowX, rightElbowY, rightBicepX, rightBicepY, false),
        rightLower: createLowerArm(rightElbowX, rightElbowY, rightWristX, rightWristY, false),
        leftElbow: { x: leftElbowX, y: leftElbowY },
        rightElbow: { x: rightElbowX, y: rightElbowY },
        leftWrist: { x: leftWristX, y: leftWristY },
        rightWrist: { x: rightWristX, y: rightWristY },
        leftBicepPeak: { x: leftBicepX, y: leftBicepY },
        rightBicepPeak: { x: rightBicepX, y: rightBicepY },
      };
    }

    case ArmPose.DOWN:
    default: {
      const leftElbowX = leftShoulderX - 8;
      const leftElbowY = shoulderY + dims.upperArmLength;
      const leftWristX = leftShoulderX - 6;
      const leftWristY = shoulderY + dims.upperArmLength + dims.lowerArmLength;
      const leftBicepX = leftShoulderX - 6;
      const leftBicepY = shoulderY + dims.upperArmLength * 0.45;

      const rightElbowX = rightShoulderX + 8;
      const rightElbowY = shoulderY + dims.upperArmLength;
      const rightWristX = rightShoulderX + 6;
      const rightWristY = shoulderY + dims.upperArmLength + dims.lowerArmLength;
      const rightBicepX = rightShoulderX + 6;
      const rightBicepY = shoulderY + dims.upperArmLength * 0.45;

      return {
        leftUpper: createUpperArm(leftShoulderX, shoulderY, leftElbowX, leftElbowY, leftBicepX, leftBicepY, true),
        leftLower: createLowerArm(leftElbowX, leftElbowY, leftWristX, leftWristY, true),
        rightUpper: createUpperArm(rightShoulderX, shoulderY, rightElbowX, rightElbowY, rightBicepX, rightBicepY, false),
        rightLower: createLowerArm(rightElbowX, rightElbowY, rightWristX, rightWristY, false),
        leftElbow: { x: leftElbowX, y: leftElbowY },
        rightElbow: { x: rightElbowX, y: rightElbowY },
        leftWrist: { x: leftWristX, y: leftWristY },
        rightWrist: { x: rightWristX, y: rightWristY },
        leftBicepPeak: { x: leftBicepX, y: leftBicepY },
        rightBicepPeak: { x: rightBicepX, y: rightBicepY },
      };
    }
  }
}

export function Arms({ pose, bodyType, skinTone, scale = 1 }: ArmsProps) {
  const dims = getArmDimensions(bodyType);
  const paths = getArmPaths(pose, dims);
  const shadowColor = adjustBrightness(skinTone, -30);
  const highlightColor = adjustBrightness(skinTone, 20);
  const deepShadow = adjustBrightness(skinTone, -45);

  const ids = useGradientIds<ArmsGradientIds>([
    'leftArmGradient',
    'rightArmGradient',
    'leftForearmGradient',
    'rightForearmGradient',
  ]);

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        {/* Upper arm gradients - more pronounced for bicep definition */}
        <LinearGradient id={ids.leftArmGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="25%" stopColor={skinTone} />
          <Stop offset="50%" stopColor={highlightColor} />
          <Stop offset="75%" stopColor={skinTone} />
          <Stop offset="100%" stopColor={shadowColor} />
        </LinearGradient>
        <LinearGradient id={ids.rightArmGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="25%" stopColor={skinTone} />
          <Stop offset="50%" stopColor={highlightColor} />
          <Stop offset="75%" stopColor={skinTone} />
          <Stop offset="100%" stopColor={shadowColor} />
        </LinearGradient>
        {/* Forearm gradients - slightly different lighting */}
        <LinearGradient id={ids.leftForearmGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="35%" stopColor={skinTone} />
          <Stop offset="65%" stopColor={highlightColor} />
          <Stop offset="100%" stopColor={skinTone} />
        </LinearGradient>
        <LinearGradient id={ids.rightForearmGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={skinTone} />
          <Stop offset="35%" stopColor={highlightColor} />
          <Stop offset="65%" stopColor={skinTone} />
          <Stop offset="100%" stopColor={shadowColor} />
        </LinearGradient>
      </Defs>

      {/* Left arm - upper (bicep area) */}
      <Path d={paths.leftUpper} fill={`url(#${ids.leftArmGradient})`} />

      {/* Left bicep muscle definition */}
      {dims.muscleDefinition > 0.2 && (
        <G opacity={dims.muscleDefinition * 0.4}>
          {/* Bicep highlight */}
          <Ellipse
            cx={paths.leftBicepPeak.x}
            cy={paths.leftBicepPeak.y}
            rx={dims.bicepWidth * 0.4}
            ry={dims.bicepWidth * 0.25}
            fill={highlightColor}
            opacity={0.4}
          />
          {/* Tricep shadow */}
          <Ellipse
            cx={paths.leftBicepPeak.x + dims.bicepWidth * 0.6}
            cy={paths.leftBicepPeak.y + 2}
            rx={dims.bicepWidth * 0.3}
            ry={dims.bicepWidth * 0.5}
            fill={shadowColor}
            opacity={0.25}
          />
        </G>
      )}

      {/* Left arm - lower (forearm) */}
      <Path d={paths.leftLower} fill={`url(#${ids.leftForearmGradient})`} />

      {/* Left forearm muscle definition */}
      {dims.muscleDefinition > 0.3 && (
        <Path
          d={`M ${paths.leftElbow.x - dims.forearmWidth * 0.3} ${paths.leftElbow.y + 4}
              Q ${paths.leftElbow.x - dims.forearmWidth * 0.2} ${(paths.leftElbow.y + paths.leftWrist.y) / 2}
                ${paths.leftWrist.x - dims.wristWidth * 0.2} ${paths.leftWrist.y - 4}`}
          stroke={shadowColor}
          strokeWidth={0.6}
          fill="none"
          opacity={dims.muscleDefinition * 0.25}
        />
      )}

      {/* Right arm - upper (bicep area) */}
      <Path d={paths.rightUpper} fill={`url(#${ids.rightArmGradient})`} />

      {/* Right bicep muscle definition */}
      {dims.muscleDefinition > 0.2 && (
        <G opacity={dims.muscleDefinition * 0.4}>
          {/* Bicep highlight */}
          <Ellipse
            cx={paths.rightBicepPeak.x}
            cy={paths.rightBicepPeak.y}
            rx={dims.bicepWidth * 0.4}
            ry={dims.bicepWidth * 0.25}
            fill={highlightColor}
            opacity={0.4}
          />
          {/* Tricep shadow */}
          <Ellipse
            cx={paths.rightBicepPeak.x - dims.bicepWidth * 0.6}
            cy={paths.rightBicepPeak.y + 2}
            rx={dims.bicepWidth * 0.3}
            ry={dims.bicepWidth * 0.5}
            fill={shadowColor}
            opacity={0.25}
          />
        </G>
      )}

      {/* Right arm - lower (forearm) */}
      <Path d={paths.rightLower} fill={`url(#${ids.rightForearmGradient})`} />

      {/* Right forearm muscle definition */}
      {dims.muscleDefinition > 0.3 && (
        <Path
          d={`M ${paths.rightElbow.x + dims.forearmWidth * 0.3} ${paths.rightElbow.y + 4}
              Q ${paths.rightElbow.x + dims.forearmWidth * 0.2} ${(paths.rightElbow.y + paths.rightWrist.y) / 2}
                ${paths.rightWrist.x + dims.wristWidth * 0.2} ${paths.rightWrist.y - 4}`}
          stroke={shadowColor}
          strokeWidth={0.6}
          fill="none"
          opacity={dims.muscleDefinition * 0.25}
        />
      )}

    </G>
  );
}

// Export wrist positions for hand attachment
export function getWristPositions(pose: ArmPose, bodyType: BodyType) {
  const dims = getArmDimensions(bodyType);
  const paths = getArmPaths(pose, dims);
  return {
    left: paths.leftWrist,
    right: paths.rightWrist,
  };
}

export default Arms;
