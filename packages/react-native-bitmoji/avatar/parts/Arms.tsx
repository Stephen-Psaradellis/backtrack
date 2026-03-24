/**
 * Arms Component - Joint-angle based rendering with 18 core poses
 * Simplified rendering with proportions-based calculations
 */

import React from 'react';
import { G, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ArmPose, BodyType, LegPose, SvgPartProps } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';
import {
  getProportions,
  CENTER_X,
  SHOULDER_Y,
  HEAD_UNIT,
  ARM_UPPER_RATIO,
  ARM_LOWER_RATIO,
  SHADING,
  getJointPosition,
  AnchorPoint
} from '../constants/proportions';

type ArmsGradientIds = {
  leftArmGradient: string;
  rightArmGradient: string;
};

interface ArmsProps extends SvgPartProps {
  pose: ArmPose;
  bodyType: BodyType;
  skinTone: string;
  legPose?: LegPose;
}

interface PoseDefinition {
  leftShoulder: number;  // angle from vertical in degrees (0 = down)
  leftElbow: number;     // bend angle in degrees (0 = straight)
  rightShoulder: number; // angle from vertical in degrees
  rightElbow: number;    // bend angle in degrees
}

interface ArmJoints {
  leftShoulder: AnchorPoint;
  leftElbow: AnchorPoint;
  leftWrist: AnchorPoint;
  rightShoulder: AnchorPoint;
  rightElbow: AnchorPoint;
  rightWrist: AnchorPoint;
}

/**
 * Get pose definition for 18 core poses
 */
function getPoseDefinition(pose: ArmPose): PoseDefinition {
  switch (pose) {
    case ArmPose.HIPS:
      return { leftShoulder: -30, leftElbow: 100, rightShoulder: 30, rightElbow: 100 };

    case ArmPose.CROSSED:
      return { leftShoulder: -35, leftElbow: 90, rightShoulder: 35, rightElbow: 85 };

    case ArmPose.WAVE:
      return { leftShoulder: -140, leftElbow: 120, rightShoulder: 10, rightElbow: 5 };

    case ArmPose.PEACE:
    case ArmPose.THUMBS_UP:
      return { leftShoulder: 10, leftElbow: 5, rightShoulder: -160, rightElbow: 120 };

    case ArmPose.POINTING:
      return { leftShoulder: 10, leftElbow: 5, rightShoulder: -90, rightElbow: 0 };

    case ArmPose.ARMS_UP:
      return { leftShoulder: -175, leftElbow: 30, rightShoulder: -175, rightElbow: 30 };

    case ArmPose.FLEXING:
      return { leftShoulder: 10, leftElbow: 5, rightShoulder: -120, rightElbow: 140 };

    case ArmPose.PRAYING:
      return { leftShoulder: -25, leftElbow: 100, rightShoulder: 25, rightElbow: 100 };

    case ArmPose.SHRUG:
      return { leftShoulder: -20, leftElbow: 20, rightShoulder: 20, rightElbow: 20 };

    case ArmPose.HANDS_IN_POCKETS:
      return { leftShoulder: 20, leftElbow: 50, rightShoulder: -20, rightElbow: 50 };

    case ArmPose.ARMS_BEHIND_BACK:
      return { leftShoulder: -10, leftElbow: 70, rightShoulder: 10, rightElbow: 70 };

    case ArmPose.ONE_HAND_HIP:
      return { leftShoulder: 10, leftElbow: 5, rightShoulder: -25, rightElbow: 80 };

    case ArmPose.ARMS_OUT:
      return { leftShoulder: -90, leftElbow: 5, rightShoulder: -90, rightElbow: 5 };

    case ArmPose.FIST_PUMP:
      return { leftShoulder: 10, leftElbow: 5, rightShoulder: -150, rightElbow: 140 };

    case ArmPose.HEART_HANDS:
      return { leftShoulder: -20, leftElbow: 90, rightShoulder: 20, rightElbow: 90 };

    case ArmPose.SELFIE:
      return { leftShoulder: 10, leftElbow: 5, rightShoulder: -85, rightElbow: 10 };

    case ArmPose.DOWN:
    default:
      // All other poses fall through to default (arms down)
      return { leftShoulder: 10, leftElbow: 5, rightShoulder: -10, rightElbow: 5 };
  }
}

/**
 * Calculate all joint positions from pose definition
 */
function getArmJoints(pose: ArmPose, bodyType: BodyType, legPose?: LegPose): ArmJoints {
  const props = getProportions(bodyType);
  const poseAngles = getPoseDefinition(pose);

  // Adjust shoulder Y when sitting
  const adjustedShoulderY = legPose === LegPose.SITTING ? SHOULDER_Y + 5 : SHOULDER_Y;

  // Shoulder positions
  const leftShoulderX = CENTER_X - props.shoulderWidth / 2;
  const rightShoulderX = CENTER_X + props.shoulderWidth / 2;

  const leftShoulder: AnchorPoint = { x: leftShoulderX, y: adjustedShoulderY };
  const rightShoulder: AnchorPoint = { x: rightShoulderX, y: adjustedShoulderY };

  // Arm segment lengths
  const upperArmLen = HEAD_UNIT * ARM_UPPER_RATIO;
  const lowerArmLen = HEAD_UNIT * ARM_LOWER_RATIO;

  // Calculate left arm joints
  const leftElbow = getJointPosition(leftShoulder, poseAngles.leftShoulder, upperArmLen);
  const leftWrist = getJointPosition(leftElbow, poseAngles.leftShoulder + poseAngles.leftElbow, lowerArmLen);

  // Calculate right arm joints
  const rightElbow = getJointPosition(rightShoulder, poseAngles.rightShoulder, upperArmLen);
  const rightWrist = getJointPosition(rightElbow, poseAngles.rightShoulder + poseAngles.rightElbow, lowerArmLen);

  // Clamp positions to viewBox bounds
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

  return {
    leftShoulder,
    leftElbow,
    leftWrist: {
      x: clamp(leftWrist.x, 5, 95),
      y: clamp(leftWrist.y, 38, 180)
    },
    rightShoulder,
    rightElbow,
    rightWrist: {
      x: clamp(rightWrist.x, 5, 95),
      y: clamp(rightWrist.y, 38, 180)
    },
  };
}

/**
 * Create single continuous curved arm from shoulder to wrist
 * No visible joints - one organic tapered path
 */
function createArm(
  shoulder: AnchorPoint,
  elbow: AnchorPoint,
  wrist: AnchorPoint,
  shoulderWidth: number,
  wristWidth: number,
  isLeft: boolean
): string {
  const dir = isLeft ? -1 : 1;
  const sw = shoulderWidth / 2;
  const ww = wristWidth / 2;

  // Mid-arm width (at elbow area) - smooth taper with proper wrist narrowing
  const elbowWidth = (shoulderWidth * 0.7 + wristWidth * 0.3); // Elbow is wider than wrist
  const midWidth = elbowWidth / 2; // Smooth transition point

  // Calculate perpendicular vectors for shoulder→elbow segment
  const dx1 = elbow.x - shoulder.x;
  const dy1 = elbow.y - shoulder.y;
  const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const perpX1 = (-dy1 / len1) * dir;
  const perpY1 = (dx1 / len1) * dir;

  // Calculate perpendicular vectors for elbow→wrist segment
  const dx2 = wrist.x - elbow.x;
  const dy2 = wrist.y - elbow.y;
  const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
  const perpX2 = (-dy2 / len2) * dir;
  const perpY2 = (dx2 / len2) * dir;

  // Outer edge: shoulder outer → elbow outer → wrist outer
  const shoulderOuter = { x: shoulder.x - perpX1 * sw, y: shoulder.y - perpY1 * sw };
  const elbowOuter = { x: elbow.x - perpX2 * (elbowWidth / 2), y: elbow.y - perpY2 * (elbowWidth / 2) };
  const wristOuter = { x: wrist.x - perpX2 * ww, y: wrist.y - perpY2 * ww };

  // Inner edge: shoulder inner → elbow inner → wrist inner
  const shoulderInner = { x: shoulder.x + perpX1 * sw, y: shoulder.y + perpY1 * sw };
  const elbowInner = { x: elbow.x + perpX2 * (elbowWidth / 2), y: elbow.y + perpY2 * (elbowWidth / 2) };
  const wristInner = { x: wrist.x + perpX2 * ww, y: wrist.y + perpY2 * ww };

  // Control points for smooth curves (use elbow as guide)
  const control1X = elbow.x - perpX1 * (midWidth + 1);
  const control1Y = elbow.y - perpY1 * (midWidth + 1);
  const control2X = elbow.x + perpX1 * (midWidth + 1);
  const control2Y = elbow.y + perpY1 * (midWidth + 1);

  return `
    M ${shoulderOuter.x} ${shoulderOuter.y}
    Q ${control1X} ${control1Y}, ${elbowOuter.x} ${elbowOuter.y}
    Q ${(elbowOuter.x + wristOuter.x) / 2} ${(elbowOuter.y + wristOuter.y) / 2},
      ${wristOuter.x} ${wristOuter.y}
    L ${wristInner.x} ${wristInner.y}
    Q ${(elbowInner.x + wristInner.x) / 2} ${(elbowInner.y + wristInner.y) / 2},
      ${elbowInner.x} ${elbowInner.y}
    Q ${control2X} ${control2Y}, ${shoulderInner.x} ${shoulderInner.y}
    Z
  `;
}

export function Arms({ pose, bodyType, skinTone, legPose, scale = 1 }: ArmsProps) {
  const props = getProportions(bodyType);
  const joints = getArmJoints(pose, bodyType, legPose);

  // Simple 2-stop gradient (base + shadow)
  const shadowColor = adjustBrightness(skinTone, SHADING.shadowDarken);

  const ids = useGradientIds<ArmsGradientIds>([
    'leftArmGradient',
    'rightArmGradient',
  ]);

  // Create single continuous arm paths
  const leftArmPath = createArm(
    joints.leftShoulder,
    joints.leftElbow,
    joints.leftWrist,
    props.upperArmWidth,
    props.wristWidth,
    true
  );

  const rightArmPath = createArm(
    joints.rightShoulder,
    joints.rightElbow,
    joints.rightWrist,
    props.upperArmWidth,
    props.wristWidth,
    false
  );

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        {/* Subtle side-shadow gradients - no harsh borders */}
        <LinearGradient id={ids.leftArmGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="100%" stopColor={skinTone} />
        </LinearGradient>
        <LinearGradient id={ids.rightArmGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={skinTone} />
          <Stop offset="100%" stopColor={shadowColor} />
        </LinearGradient>
      </Defs>

      {/* Left arm - single continuous path */}
      <Path
        d={leftArmPath}
        fill={`url(#${ids.leftArmGradient})`}
        stroke={adjustBrightness(skinTone, -15)}
        strokeWidth={0.5}
        strokeOpacity={0.4}
      />
      {/* Elbow shadow hint for left arm */}
      <Path
        d={`M ${joints.leftElbow.x - 2} ${joints.leftElbow.y - 1} Q ${joints.leftElbow.x} ${joints.leftElbow.y} ${joints.leftElbow.x + 2} ${joints.leftElbow.y - 1}`}
        fill="none"
        stroke={shadowColor}
        strokeWidth={0.4}
        opacity={0.12}
      />

      {/* Right arm - single continuous path */}
      <Path
        d={rightArmPath}
        fill={`url(#${ids.rightArmGradient})`}
        stroke={adjustBrightness(skinTone, -15)}
        strokeWidth={0.5}
        strokeOpacity={0.4}
      />
      {/* Elbow shadow hint for right arm */}
      <Path
        d={`M ${joints.rightElbow.x - 2} ${joints.rightElbow.y - 1} Q ${joints.rightElbow.x} ${joints.rightElbow.y} ${joints.rightElbow.x + 2} ${joints.rightElbow.y - 1}`}
        fill="none"
        stroke={shadowColor}
        strokeWidth={0.4}
        opacity={0.12}
      />
    </G>
  );
}

/**
 * Export wrist positions for hand attachment
 */
export function getWristPositions(pose: ArmPose, bodyType: BodyType, legPose?: LegPose) {
  const joints = getArmJoints(pose, bodyType, legPose);
  return {
    left: joints.leftWrist,
    right: joints.rightWrist,
  };
}

/**
 * Returns hand rotation angles (degrees) so hands orient correctly
 * relative to the arm direction. 0 = fingers point down (default),
 * 180 = fingers point up (raised arm), 90 = fingers point sideways.
 */
export function getHandRotations(pose: ArmPose): { left: number; right: number } {
  switch (pose) {
    case ArmPose.WAVE:
      return { left: 180, right: 0 };

    case ArmPose.PEACE:
    case ArmPose.THUMBS_UP:
      return { left: 0, right: 180 };

    case ArmPose.ARMS_UP:
      return { left: 180, right: 180 };

    case ArmPose.FLEXING:
      return { left: 0, right: 180 };

    case ArmPose.POINTING:
      return { left: 0, right: 90 };

    case ArmPose.SHRUG:
      return { left: 30, right: -30 };

    case ArmPose.CROSSED:
      return { left: -15, right: 15 };

    case ArmPose.FIST_PUMP:
      return { left: 0, right: 180 };

    case ArmPose.ARMS_OUT:
      return { left: 90, right: -90 };

    case ArmPose.HEART_HANDS:
      return { left: -30, right: 30 };

    case ArmPose.SELFIE:
      return { left: 0, right: 90 };

    case ArmPose.ONE_HAND_HIP:
    case ArmPose.HANDS_IN_POCKETS:
    case ArmPose.ARMS_BEHIND_BACK:
    case ArmPose.DOWN:
    case ArmPose.HIPS:
    case ArmPose.PRAYING:
    default:
      return { left: 0, right: 0 };
  }
}

export default Arms;
