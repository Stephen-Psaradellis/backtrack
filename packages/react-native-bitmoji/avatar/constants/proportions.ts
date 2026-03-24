/**
 * Avatar Proportion Constants
 *
 * 7-head-tall cartoon proportion system (Bitmoji-style).
 * ALL body measurements are derived from HEAD_UNIT.
 * ViewBox is 0-100 x, 0-200 y.
 */

import { BodyType } from '../types';

// === Core Unit ===
export const HEAD_UNIT = 13; // head height in viewBox units
export const BODY_HEADS = 7; // total height = 7 heads
export const VIEWBOX_WIDTH = 100;
export const VIEWBOX_HEIGHT = 200;
export const CENTER_X = 50;

// === Vertical Layout (top to bottom) ===
// Head occupies ~1.2 heads at top of viewBox
export const HEAD_TOP_Y = 8;
export const HEAD_CENTER_Y = HEAD_TOP_Y + HEAD_UNIT * 0.7; // ~17.1 (eyes moved down ~8%)
export const CHIN_Y = HEAD_TOP_Y + HEAD_UNIT * 1.2; // ~26
export const NECK_Y = CHIN_Y + 4; // ~30 — but in full body, head is shifted up

// Full body vertical positions (head sits at top, body below)
export const NECK_BASE_Y = 72; // where neck meets shoulders
export const SHOULDER_Y = NECK_BASE_Y + 6; // ~78
export const CHEST_Y = NECK_BASE_Y + 16; // ~88
export const WAIST_Y = NECK_BASE_Y + 36; // ~108
export const HIP_Y = NECK_BASE_Y + 50; // ~122
export const KNEE_Y = HIP_Y + HEAD_UNIT * 1.8; // ~149
export const ANKLE_Y = KNEE_Y + HEAD_UNIT * 1.7; // ~174.5

// === Horizontal Proportions (derived from HEAD_UNIT) ===
export const SHOULDER_WIDTH_RATIO = 2.4; // shoulder width = 2.4× head
export const ARM_UPPER_RATIO = 1.5; // upper arm length = 1.5× head
export const ARM_LOWER_RATIO = 1.4; // forearm length = 1.4× head
export const LEG_THIGH_RATIO = 1.8; // thigh length = 1.8× head
export const LEG_CALF_RATIO = 1.7; // calf length = 1.7× head
export const HAND_SIZE_RATIO = 0.6; // hand size = 0.6× head
export const FOOT_LENGTH_RATIO = 0.8; // foot length = 0.8× head

// === Anchor Points ===
export interface AnchorPoint {
  x: number;
  y: number;
}

export interface BodyAnchors {
  neck: AnchorPoint;
  leftShoulder: AnchorPoint;
  rightShoulder: AnchorPoint;
  leftElbow: AnchorPoint;
  rightElbow: AnchorPoint;
  leftWrist: AnchorPoint;
  rightWrist: AnchorPoint;
  leftHip: AnchorPoint;
  rightHip: AnchorPoint;
  leftKnee: AnchorPoint;
  rightKnee: AnchorPoint;
  leftAnkle: AnchorPoint;
  rightAnkle: AnchorPoint;
}

// === Body Type Dimensions ===
export interface ProportionSet {
  shoulderWidth: number;
  chestWidth: number;
  waistWidth: number;
  hipWidth: number;
  torsoLength: number;
  // Limb widths
  upperArmWidth: number;
  forearmWidth: number;
  wristWidth: number;
  thighWidth: number;
  calfWidth: number;
  ankleWidth: number;
  // Style
  muscleDefinition: number; // 0-1
  outlineWidth: number; // stroke width for outlines
}

const BASE_PROPORTIONS: ProportionSet = {
  shoulderWidth: HEAD_UNIT * 2.4,
  chestWidth: HEAD_UNIT * 2.1,
  waistWidth: HEAD_UNIT * 1.6,
  hipWidth: HEAD_UNIT * 2.0,
  torsoLength: HEAD_UNIT * 3.3,
  upperArmWidth: 5,
  forearmWidth: 4.5,
  wristWidth: 3.5,
  thighWidth: 7,
  calfWidth: 5.5,
  ankleWidth: 3.5,
  muscleDefinition: 0.2,
  outlineWidth: 1.0,
};

export function getProportions(bodyType: BodyType): ProportionSet {
  switch (bodyType) {
    case BodyType.SLIM:
      return {
        ...BASE_PROPORTIONS,
        shoulderWidth: 33,
        chestWidth: 28,
        waistWidth: 21,
        hipWidth: 28,
        upperArmWidth: 4,
        forearmWidth: 3.5,
        wristWidth: 3,
        thighWidth: 6,
        calfWidth: 4.5,
        ankleWidth: 3,
        muscleDefinition: 0.1,
      };
    case BodyType.ATHLETIC:
      return {
        ...BASE_PROPORTIONS,
        shoulderWidth: 41,
        chestWidth: 37,
        waistWidth: 28,
        hipWidth: 32,
        upperArmWidth: 6.5,
        forearmWidth: 5.5,
        wristWidth: 4,
        thighWidth: 9,
        calfWidth: 7,
        ankleWidth: 4,
        muscleDefinition: 0.6,
      };
    case BodyType.CURVY:
      return {
        ...BASE_PROPORTIONS,
        shoulderWidth: 35,
        chestWidth: 34,
        waistWidth: 25,
        hipWidth: 40,
        upperArmWidth: 5.5,
        forearmWidth: 4.5,
        wristWidth: 3.5,
        thighWidth: 9,
        calfWidth: 6,
        ankleWidth: 3.5,
        muscleDefinition: 0.15,
      };
    case BodyType.PLUS_SIZE:
      return {
        ...BASE_PROPORTIONS,
        shoulderWidth: 39,
        chestWidth: 41,
        waistWidth: 39,
        hipWidth: 43,
        upperArmWidth: 7,
        forearmWidth: 6,
        wristWidth: 4.5,
        thighWidth: 11,
        calfWidth: 8,
        ankleWidth: 4.5,
        muscleDefinition: 0.1,
      };
    case BodyType.MUSCULAR:
      return {
        ...BASE_PROPORTIONS,
        shoulderWidth: 46,
        chestWidth: 43,
        waistWidth: 32,
        hipWidth: 36,
        upperArmWidth: 8,
        forearmWidth: 7,
        wristWidth: 4.5,
        thighWidth: 10,
        calfWidth: 8,
        ankleWidth: 4.5,
        muscleDefinition: 0.85,
      };
    case BodyType.AVERAGE:
    default:
      return BASE_PROPORTIONS;
  }
}

// === Joint Angle System for Limbs ===
export interface JointAngles {
  shoulder: number; // degrees from vertical (0 = down)
  elbow: number; // degrees of bend (0 = straight)
  wrist: number; // degrees of wrist rotation
}

export interface LegJointAngles {
  hip: number; // degrees from vertical
  knee: number; // degrees of bend
  ankle: number; // degrees
}

/**
 * Calculate a point along a limb segment given start point, angle, and length.
 * Angle 0 = straight down, positive = clockwise.
 */
export function getJointPosition(
  start: AnchorPoint,
  angleDeg: number,
  length: number,
): AnchorPoint {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: start.x + Math.sin(rad) * length,
    y: start.y + Math.cos(rad) * length,
  };
}

/**
 * Get default anchor positions for a body type (standing neutral pose).
 */
export function getDefaultAnchors(bodyType: BodyType): BodyAnchors {
  const p = getProportions(bodyType);
  const halfShoulder = p.shoulderWidth / 2;
  const halfHip = p.hipWidth / 4; // hip joint is inset from hip width

  const upperArmLen = HEAD_UNIT * ARM_UPPER_RATIO;
  const lowerArmLen = HEAD_UNIT * ARM_LOWER_RATIO;
  const thighLen = HEAD_UNIT * LEG_THIGH_RATIO;
  const calfLen = HEAD_UNIT * LEG_CALF_RATIO;

  return {
    neck: { x: CENTER_X, y: NECK_BASE_Y },
    leftShoulder: { x: CENTER_X - halfShoulder, y: SHOULDER_Y },
    rightShoulder: { x: CENTER_X + halfShoulder, y: SHOULDER_Y },
    leftElbow: { x: CENTER_X - halfShoulder - 4, y: SHOULDER_Y + upperArmLen },
    rightElbow: { x: CENTER_X + halfShoulder + 4, y: SHOULDER_Y + upperArmLen },
    leftWrist: { x: CENTER_X - halfShoulder - 2, y: SHOULDER_Y + upperArmLen + lowerArmLen },
    rightWrist: { x: CENTER_X + halfShoulder + 2, y: SHOULDER_Y + upperArmLen + lowerArmLen },
    leftHip: { x: CENTER_X - halfHip, y: HIP_Y },
    rightHip: { x: CENTER_X + halfHip, y: HIP_Y },
    leftKnee: { x: CENTER_X - halfHip, y: HIP_Y + thighLen },
    rightKnee: { x: CENTER_X + halfHip, y: HIP_Y + thighLen },
    leftAnkle: { x: CENTER_X - halfHip, y: HIP_Y + thighLen + calfLen },
    rightAnkle: { x: CENTER_X + halfHip, y: HIP_Y + thighLen + calfLen },
  };
}

// === Shading Constants (Bitmoji-style flat shading) ===
export const SHADING = {
  shadowDarken: -20, // brightness adjustment for shadow zone
  highlightBrighten: 12, // brightness adjustment for highlight zone
  outlineOpacity: 0.7,
  shadowOpacity: 0.2,
} as const;
