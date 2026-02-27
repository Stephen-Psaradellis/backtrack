/**
 * Sleeves Component - Renders clothing sleeves along arm paths
 * Positioned between Arms and Hands in the render order.
 *
 * Sleeve geometry is derived from the same arm coordinate data used by Arms.tsx
 * so sleeves accurately follow every pose variation.
 */

import React from 'react';
import { G, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ArmPose, BodyType, ClothingStyle } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';
import { getBodyDimensions } from './Body';

// ---------------------------------------------------------------------------
// Internal arm geometry (mirrors Arms.tsx, kept private to avoid circular deps)
// ---------------------------------------------------------------------------

interface ArmDimensions {
  upperArmLength: number;
  lowerArmLength: number;
  shoulderWidth: number;
  bicepWidth: number;
  elbowWidth: number;
  forearmWidth: number;
  wristWidth: number;
}

function getArmDimensions(bodyType: BodyType): ArmDimensions {
  switch (bodyType) {
    case BodyType.SLIM:
      return { upperArmLength: 22, lowerArmLength: 20, shoulderWidth: 7, bicepWidth: 5.5, elbowWidth: 4.5, forearmWidth: 5, wristWidth: 3.5 };
    case BodyType.ATHLETIC:
      return { upperArmLength: 24, lowerArmLength: 22, shoulderWidth: 9, bicepWidth: 8, elbowWidth: 6, forearmWidth: 7, wristWidth: 4.5 };
    case BodyType.CURVY:
      return { upperArmLength: 22, lowerArmLength: 20, shoulderWidth: 8, bicepWidth: 7, elbowWidth: 5.5, forearmWidth: 6, wristWidth: 4 };
    case BodyType.PLUS_SIZE:
      return { upperArmLength: 22, lowerArmLength: 20, shoulderWidth: 10, bicepWidth: 9, elbowWidth: 7, forearmWidth: 8, wristWidth: 5 };
    case BodyType.MUSCULAR:
      return { upperArmLength: 25, lowerArmLength: 23, shoulderWidth: 11, bicepWidth: 10, elbowWidth: 7, forearmWidth: 8.5, wristWidth: 5 };
    case BodyType.AVERAGE:
    default:
      return { upperArmLength: 23, lowerArmLength: 21, shoulderWidth: 8, bicepWidth: 6.5, elbowWidth: 5, forearmWidth: 6, wristWidth: 4 };
  }
}

interface JointPositions {
  leftShoulder: { x: number; y: number };
  rightShoulder: { x: number; y: number };
  leftElbow: { x: number; y: number };
  rightElbow: { x: number; y: number };
  leftWrist: { x: number; y: number };
  rightWrist: { x: number; y: number };
}

/**
 * Reproduces the key joint coordinates from Arms.tsx for every pose.
 * These values are kept in sync with getArmPaths() in Arms.tsx.
 */
function getJointPositions(pose: ArmPose, dims: ArmDimensions, bodyType: BodyType): JointPositions {
  const bodyDims = getBodyDimensions(bodyType);
  const shoulderY = 80;
  const leftShoulderX = 50 - bodyDims.shoulderWidth / 2;
  const rightShoulderX = 50 + bodyDims.shoulderWidth / 2;

  switch (pose) {
    case ArmPose.HIPS: {
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY },
        rightShoulder: { x: rightShoulderX, y: shoulderY },
        leftElbow:  { x: leftShoulderX  - 14, y: shoulderY + dims.upperArmLength * 0.85 },
        rightElbow: { x: rightShoulderX + 14, y: shoulderY + dims.upperArmLength * 0.85 },
        leftWrist:  { x: leftShoulderX  - 8,  y: shoulderY + 38 },
        rightWrist: { x: rightShoulderX + 8,  y: shoulderY + 38 },
      };
    }

    case ArmPose.CROSSED: {
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY },
        rightShoulder: { x: rightShoulderX, y: shoulderY },
        leftElbow:  { x: leftShoulderX  + 12, y: shoulderY + 22 },
        rightElbow: { x: rightShoulderX - 12, y: shoulderY + 20 },
        leftWrist:  { x: 52, y: shoulderY + 32 },
        rightWrist: { x: 48, y: shoulderY + 28 },
      };
    }

    case ArmPose.WAVE: {
      let leftWristY = shoulderY - 18;
      leftWristY = Math.max(leftWristY, 52);
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY },
        rightShoulder: { x: rightShoulderX, y: shoulderY },
        leftElbow:  { x: leftShoulderX  - 16, y: shoulderY + 6 },
        rightElbow: { x: rightShoulderX + 8,  y: shoulderY + dims.upperArmLength },
        leftWrist:  { x: leftShoulderX  - 18, y: leftWristY },
        rightWrist: { x: rightShoulderX + 6,  y: shoulderY + dims.upperArmLength + dims.lowerArmLength },
      };
    }

    case ArmPose.PEACE:
    case ArmPose.THUMBS_UP: {
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY },
        rightShoulder: { x: rightShoulderX, y: shoulderY },
        leftElbow:  { x: leftShoulderX  - 8,  y: shoulderY + dims.upperArmLength },
        rightElbow: { x: rightShoulderX + 16, y: shoulderY + 4 },
        leftWrist:  { x: leftShoulderX  - 6,  y: shoulderY + dims.upperArmLength + dims.lowerArmLength },
        rightWrist: { x: rightShoulderX + 18, y: shoulderY - 22 },
      };
    }

    case ArmPose.POINTING: {
      let rightElbowX = rightShoulderX + 26;
      let rightWristX = rightShoulderX + 44;
      rightWristX = Math.min(rightWristX, 95);
      rightElbowX = Math.min(rightElbowX, 92);
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY },
        rightShoulder: { x: rightShoulderX, y: shoulderY },
        leftElbow:  { x: leftShoulderX  - 8, y: shoulderY + dims.upperArmLength },
        rightElbow: { x: rightElbowX,        y: shoulderY },
        leftWrist:  { x: leftShoulderX  - 6, y: shoulderY + dims.upperArmLength + dims.lowerArmLength },
        rightWrist: { x: rightWristX,        y: shoulderY - 2 },
      };
    }

    case ArmPose.ARMS_UP: {
      let leftWristY  = shoulderY - dims.upperArmLength - dims.lowerArmLength + 5;
      let rightWristY = shoulderY - dims.upperArmLength - dims.lowerArmLength + 5;
      leftWristY  = Math.max(leftWristY,  38);
      rightWristY = Math.max(rightWristY, 38);
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY },
        rightShoulder: { x: rightShoulderX, y: shoulderY },
        leftElbow:  { x: leftShoulderX  - 6, y: shoulderY - dims.upperArmLength },
        rightElbow: { x: rightShoulderX + 6, y: shoulderY - dims.upperArmLength },
        leftWrist:  { x: leftShoulderX  + 2, y: leftWristY },
        rightWrist: { x: rightShoulderX - 2, y: rightWristY },
      };
    }

    case ArmPose.FLEXING: {
      let rightWristY = shoulderY - 24;
      rightWristY = Math.max(rightWristY, 52);
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY },
        rightShoulder: { x: rightShoulderX, y: shoulderY },
        leftElbow:  { x: leftShoulderX  - 8,  y: shoulderY + dims.upperArmLength },
        rightElbow: { x: rightShoulderX + 20, y: shoulderY - 8 },
        leftWrist:  { x: leftShoulderX  - 6,  y: shoulderY + dims.upperArmLength + dims.lowerArmLength },
        rightWrist: { x: rightShoulderX + 12, y: rightWristY },
      };
    }

    case ArmPose.PRAYING: {
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY },
        rightShoulder: { x: rightShoulderX, y: shoulderY },
        leftElbow:  { x: leftShoulderX  + 10, y: shoulderY + dims.upperArmLength - 5 },
        rightElbow: { x: rightShoulderX - 10, y: shoulderY + dims.upperArmLength - 5 },
        leftWrist:  { x: 48, y: shoulderY + dims.upperArmLength + 10 },
        rightWrist: { x: 52, y: shoulderY + dims.upperArmLength + 10 },
      };
    }

    case ArmPose.SHRUG: {
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY - 5 },
        rightShoulder: { x: rightShoulderX, y: shoulderY - 5 },
        leftElbow:  { x: leftShoulderX  - 18, y: shoulderY + dims.upperArmLength - 10 },
        rightElbow: { x: rightShoulderX + 18, y: shoulderY + dims.upperArmLength - 10 },
        leftWrist:  { x: leftShoulderX  - 15, y: shoulderY + dims.upperArmLength + dims.lowerArmLength - 10 },
        rightWrist: { x: rightShoulderX + 15, y: shoulderY + dims.upperArmLength + dims.lowerArmLength - 10 },
      };
    }

    case ArmPose.HANDS_IN_POCKETS: {
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY },
        rightShoulder: { x: rightShoulderX, y: shoulderY },
        leftElbow:  { x: leftShoulderX  - 10, y: shoulderY + dims.upperArmLength * 0.7 },
        rightElbow: { x: rightShoulderX + 10, y: shoulderY + dims.upperArmLength * 0.7 },
        leftWrist:  { x: leftShoulderX  - 6,  y: shoulderY + 38 },
        rightWrist: { x: rightShoulderX + 6,  y: shoulderY + 38 },
      };
    }

    case ArmPose.ARMS_BEHIND_BACK: {
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY },
        rightShoulder: { x: rightShoulderX, y: shoulderY },
        leftElbow:  { x: leftShoulderX  + 4, y: shoulderY + dims.upperArmLength * 0.8 },
        rightElbow: { x: rightShoulderX - 4, y: shoulderY + dims.upperArmLength * 0.8 },
        leftWrist:  { x: 46, y: shoulderY + 35 },
        rightWrist: { x: 54, y: shoulderY + 35 },
      };
    }

    case ArmPose.ONE_HAND_HIP: {
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY },
        rightShoulder: { x: rightShoulderX, y: shoulderY },
        leftElbow:  { x: leftShoulderX  - 8,  y: shoulderY + dims.upperArmLength },
        rightElbow: { x: rightShoulderX + 14, y: shoulderY + dims.upperArmLength * 0.85 },
        leftWrist:  { x: leftShoulderX  - 6,  y: shoulderY + dims.upperArmLength + dims.lowerArmLength },
        rightWrist: { x: rightShoulderX + 8,  y: shoulderY + 38 },
      };
    }

    case ArmPose.ARMS_OUT: {
      let leftElbowX = leftShoulderX - 22;
      let leftWristX = leftShoulderX - 40;
      let rightElbowX = rightShoulderX + 22;
      let rightWristX = rightShoulderX + 40;
      leftWristX = Math.max(leftWristX, 5);
      leftElbowX = Math.max(leftElbowX, 8);
      rightWristX = Math.min(rightWristX, 95);
      rightElbowX = Math.min(rightElbowX, 92);
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY },
        rightShoulder: { x: rightShoulderX, y: shoulderY },
        leftElbow:  { x: leftElbowX,  y: shoulderY + 2 },
        rightElbow: { x: rightElbowX, y: shoulderY + 2 },
        leftWrist:  { x: leftWristX,  y: shoulderY + 4 },
        rightWrist: { x: rightWristX, y: shoulderY + 4 },
      };
    }

    case ArmPose.FIST_PUMP: {
      let rightWristY = shoulderY - 28;
      rightWristY = Math.max(rightWristY, 42);
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY },
        rightShoulder: { x: rightShoulderX, y: shoulderY },
        leftElbow:  { x: leftShoulderX  - 8,  y: shoulderY + dims.upperArmLength },
        rightElbow: { x: rightShoulderX + 12, y: shoulderY - 10 },
        leftWrist:  { x: leftShoulderX  - 6,  y: shoulderY + dims.upperArmLength + dims.lowerArmLength },
        rightWrist: { x: rightShoulderX + 6,  y: rightWristY },
      };
    }

    case ArmPose.HEART_HANDS: {
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY },
        rightShoulder: { x: rightShoulderX, y: shoulderY },
        leftElbow:  { x: leftShoulderX  + 8, y: shoulderY + 16 },
        rightElbow: { x: rightShoulderX - 8, y: shoulderY + 16 },
        leftWrist:  { x: 46, y: shoulderY + 10 },
        rightWrist: { x: 54, y: shoulderY + 10 },
      };
    }

    case ArmPose.SELFIE: {
      let rightElbowX = rightShoulderX + 26;
      let rightWristX = rightShoulderX + 42;
      rightWristX = Math.min(rightWristX, 95);
      rightElbowX = Math.min(rightElbowX, 92);
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY },
        rightShoulder: { x: rightShoulderX, y: shoulderY },
        leftElbow:  { x: leftShoulderX - 8, y: shoulderY + dims.upperArmLength },
        rightElbow: { x: rightElbowX,       y: shoulderY - 6 },
        leftWrist:  { x: leftShoulderX - 6, y: shoulderY + dims.upperArmLength + dims.lowerArmLength },
        rightWrist: { x: rightWristX,       y: shoulderY - 10 },
      };
    }

    case ArmPose.DOWN:
    default: {
      return {
        leftShoulder:  { x: leftShoulderX,  y: shoulderY },
        rightShoulder: { x: rightShoulderX, y: shoulderY },
        leftElbow:  { x: leftShoulderX  - 8, y: shoulderY + dims.upperArmLength },
        rightElbow: { x: rightShoulderX + 8, y: shoulderY + dims.upperArmLength },
        leftWrist:  { x: leftShoulderX  - 6, y: shoulderY + dims.upperArmLength + dims.lowerArmLength },
        rightWrist: { x: rightShoulderX + 6, y: shoulderY + dims.upperArmLength + dims.lowerArmLength },
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Sleeve type classification
// ---------------------------------------------------------------------------

type SleeveType = 'none' | 'short' | 'long';

/**
 * Maps every ClothingStyle to the sleeve coverage it needs.
 *
 * - 'long'  : sleeve runs from shoulder to wrist (covers upper + lower arm)
 * - 'short' : sleeve runs from shoulder to just past the elbow midpoint
 * - 'none'  : no sleeve rendering needed (tank / sleeveless / dresses, etc.)
 */
function getSleeveType(style: ClothingStyle): SleeveType {
  switch (style) {
    // ---- Long-sleeve styles ----
    case ClothingStyle.HOODIE:
    case ClothingStyle.HOODIE_ZIP:
    case ClothingStyle.SWEATER:
    case ClothingStyle.SWEATER_CABLE:
    case ClothingStyle.CARDIGAN:
    case ClothingStyle.TURTLENECK:
    case ClothingStyle.SWEATSHIRT:
    case ClothingStyle.BLAZER:
    case ClothingStyle.SUIT_JACKET:
    case ClothingStyle.DRESS_SHIRT:
    case ClothingStyle.COLLAR_SHIRT:
    case ClothingStyle.BUTTON_UP:
    case ClothingStyle.BUTTON_UP_OPEN:
    case ClothingStyle.FLANNEL:
    case ClothingStyle.DENIM_SHIRT:
    case ClothingStyle.BLOUSE:
    case ClothingStyle.JACKET_DENIM:
    case ClothingStyle.JACKET_LEATHER:
    case ClothingStyle.JACKET_BOMBER:
    case ClothingStyle.JACKET_VARSITY:
    case ClothingStyle.COAT:
      return 'long';

    // ---- Short-sleeve styles ----
    case ClothingStyle.TSHIRT:
    case ClothingStyle.TSHIRT_CREW:
    case ClothingStyle.TSHIRT_GRAPHIC:
    case ClothingStyle.TSHIRT_STRIPED:
    case ClothingStyle.VNECK:
    case ClothingStyle.SCOOP_NECK:
    case ClothingStyle.POLO:
    case ClothingStyle.HENLEY:
    case ClothingStyle.HAWAIIAN:
    case ClothingStyle.JERSEY:
    case ClothingStyle.ATHLETIC_TOP:
    case ClothingStyle.DRESS_CASUAL:
      return 'short';

    // ---- No sleeves ----
    case ClothingStyle.TANK_TOP:
    case ClothingStyle.TANK_ATHLETIC:
    case ClothingStyle.CROP_TOP:
    case ClothingStyle.SPORTS_BRA:
    case ClothingStyle.VEST:
    case ClothingStyle.DRESS_FORMAL:
    case ClothingStyle.OVERALL:
    case ClothingStyle.OVERALLS:
    case ClothingStyle.SUSPENDERS:
    default:
      return 'none';
  }
}

// ---------------------------------------------------------------------------
// Gradient ID type
// ---------------------------------------------------------------------------

type SleevesGradientIds = {
  leftSleeveGradient: string;
  rightSleeveGradient: string;
};

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

interface SleevesProps {
  armPose: ArmPose;
  bodyType: BodyType;
  clothingStyle: ClothingStyle;
  clothingColor: string;
}

// ---------------------------------------------------------------------------
// Sleeve path builder
// ---------------------------------------------------------------------------

/**
 * Builds an SVG path that covers the arm from shoulder to the sleeve hem.
 *
 * The path is a quadratic-bezier tapered tube that closely mirrors the cubic
 * bezier tube drawn by Arms.tsx, using the same shoulder → elbow → wrist
 * coordinate system.  The sleeve is intentionally 1-2 px wider than the arm
 * on each side so clothing fabric reads correctly over skin.
 *
 * @param shoulder  - shoulder joint position
 * @param elbow     - elbow joint position
 * @param wrist     - wrist joint position  (only used when sleeveType === 'long')
 * @param dims      - arm dimensions for width references
 * @param isLeft    - which arm (affects internal highlight/shadow direction)
 * @param sleeveType - 'short' stops at ~55 % of the upper arm; 'long' goes to wrist
 */
function buildSleevePath(
  shoulder: { x: number; y: number },
  elbow:    { x: number; y: number },
  wrist:    { x: number; y: number },
  dims: ArmDimensions,
  isLeft: boolean,
  sleeveType: 'short' | 'long',
): string {
  // Fabric is 1.5 px wider than the arm on each side
  const fabric = 1.5;
  const shoulderHalfW = dims.shoulderWidth / 2 + fabric;
  const elbowHalfW    = dims.elbowWidth    / 2 + fabric;
  const wristHalfW    = dims.wristWidth    / 2 + fabric;

  // Direction perpendicular to the arm (simplified: treat arm as roughly
  // vertical and use horizontal offsets for the sleeve walls).
  // For arms that extend diagonally we compute an approximate normal.
  const normalise = (dx: number, dy: number): { nx: number; ny: number } => {
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { nx: -dy / len, ny: dx / len };
  };

  if (sleeveType === 'short') {
    // Hem sits 55 % of the way from shoulder to elbow
    const t = 0.55;
    const hemX = shoulder.x + (elbow.x - shoulder.x) * t;
    const hemY = shoulder.y + (elbow.y - shoulder.y) * t;
    const hemHalfW = shoulderHalfW + (elbowHalfW - shoulderHalfW) * t;

    const { nx, ny } = normalise(elbow.x - shoulder.x, elbow.y - shoulder.y);

    // Four control points: two at shoulder, two at hem
    const sL = { x: shoulder.x - nx * shoulderHalfW, y: shoulder.y - ny * shoulderHalfW };
    const sR = { x: shoulder.x + nx * shoulderHalfW, y: shoulder.y + ny * shoulderHalfW };
    const hL = { x: hemX - nx * hemHalfW,           y: hemY - ny * hemHalfW };
    const hR = { x: hemX + nx * hemHalfW,           y: hemY + ny * hemHalfW };

    // Mid-control points for gentle taper curve
    const midX = (shoulder.x + hemX) / 2;
    const midY = (shoulder.y + hemY) / 2;
    const midHalfW = (shoulderHalfW + hemHalfW) / 2;
    const mcL = { x: midX - nx * midHalfW, y: midY - ny * midHalfW };
    const mcR = { x: midX + nx * midHalfW, y: midY + ny * midHalfW };

    return [
      `M ${sL.x.toFixed(2)} ${sL.y.toFixed(2)}`,
      `Q ${mcL.x.toFixed(2)} ${mcL.y.toFixed(2)} ${hL.x.toFixed(2)} ${hL.y.toFixed(2)}`,
      `L ${hR.x.toFixed(2)} ${hR.y.toFixed(2)}`,
      `Q ${mcR.x.toFixed(2)} ${mcR.y.toFixed(2)} ${sR.x.toFixed(2)} ${sR.y.toFixed(2)}`,
      'Z',
    ].join(' ');
  }

  // Long sleeve: shoulder → elbow → wrist
  // Build the path in two segments joined at the elbow.
  const nUpper = normalise(elbow.x - shoulder.x, elbow.y - shoulder.y);
  const nLower = normalise(wrist.x - elbow.x,    wrist.y - elbow.y);

  const sL  = { x: shoulder.x - nUpper.nx * shoulderHalfW, y: shoulder.y - nUpper.ny * shoulderHalfW };
  const sR  = { x: shoulder.x + nUpper.nx * shoulderHalfW, y: shoulder.y + nUpper.ny * shoulderHalfW };
  const eUL = { x: elbow.x    - nUpper.nx * elbowHalfW,    y: elbow.y    - nUpper.ny * elbowHalfW };
  const eUR = { x: elbow.x    + nUpper.nx * elbowHalfW,    y: elbow.y    + nUpper.ny * elbowHalfW };
  const eLl = { x: elbow.x    - nLower.nx * elbowHalfW,    y: elbow.y    - nLower.ny * elbowHalfW };
  const eLR = { x: elbow.x    + nLower.nx * elbowHalfW,    y: elbow.y    + nLower.ny * elbowHalfW };
  const wL  = { x: wrist.x    - nLower.nx * wristHalfW,    y: wrist.y    - nLower.ny * wristHalfW };
  const wR  = { x: wrist.x    + nLower.nx * wristHalfW,    y: wrist.y    + nLower.ny * wristHalfW };

  // Mid control points for upper and lower segments
  const midUpperX = (shoulder.x + elbow.x) / 2;
  const midUpperY = (shoulder.y + elbow.y) / 2;
  const midUpperHW = (shoulderHalfW + elbowHalfW) / 2;
  const mcUL = { x: midUpperX - nUpper.nx * midUpperHW, y: midUpperY - nUpper.ny * midUpperHW };
  const mcUR = { x: midUpperX + nUpper.nx * midUpperHW, y: midUpperY + nUpper.ny * midUpperHW };

  const midLowerX = (elbow.x + wrist.x) / 2;
  const midLowerY = (elbow.y + wrist.y) / 2;
  const midLowerHW = (elbowHalfW + wristHalfW) / 2;
  const mcLL = { x: midLowerX - nLower.nx * midLowerHW, y: midLowerY - nLower.ny * midLowerHW };
  const mcLR = { x: midLowerX + nLower.nx * midLowerHW, y: midLowerY + nLower.ny * midLowerHW };

  // Trace left edge down, then right edge back up
  return [
    `M ${sL.x.toFixed(2)} ${sL.y.toFixed(2)}`,
    // Left edge: shoulder → elbow → wrist
    `Q ${mcUL.x.toFixed(2)} ${mcUL.y.toFixed(2)} ${eUL.x.toFixed(2)} ${eUL.y.toFixed(2)}`,
    `L ${eLl.x.toFixed(2)} ${eLl.y.toFixed(2)}`,
    `Q ${mcLL.x.toFixed(2)} ${mcLL.y.toFixed(2)} ${wL.x.toFixed(2)} ${wL.y.toFixed(2)}`,
    // Wrist hem
    `L ${wR.x.toFixed(2)} ${wR.y.toFixed(2)}`,
    // Right edge: wrist → elbow → shoulder
    `Q ${mcLR.x.toFixed(2)} ${mcLR.y.toFixed(2)} ${eLR.x.toFixed(2)} ${eLR.y.toFixed(2)}`,
    `L ${eUR.x.toFixed(2)} ${eUR.y.toFixed(2)}`,
    `Q ${mcUR.x.toFixed(2)} ${mcUR.y.toFixed(2)} ${sR.x.toFixed(2)} ${sR.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

// ---------------------------------------------------------------------------
// Sleeves component
// ---------------------------------------------------------------------------

export function Sleeves({ armPose, bodyType, clothingStyle, clothingColor }: SleevesProps) {
  const sleeveType = getSleeveType(clothingStyle);
  if (sleeveType === 'none') return null;

  const ids = useGradientIds<SleevesGradientIds>(['leftSleeveGradient', 'rightSleeveGradient']);

  const shadow    = adjustBrightness(clothingColor, -28);
  const mid       = clothingColor;
  const highlight = adjustBrightness(clothingColor, 18);

  const dims  = getArmDimensions(bodyType);
  const joints = getJointPositions(armPose, dims, bodyType);

  const leftPath  = buildSleevePath(
    joints.leftShoulder,
    joints.leftElbow,
    joints.leftWrist,
    dims,
    true,
    sleeveType,
  );

  const rightPath = buildSleevePath(
    joints.rightShoulder,
    joints.rightElbow,
    joints.rightWrist,
    dims,
    false,
    sleeveType,
  );

  return (
    <G>
      <Defs>
        {/* Left sleeve: light source from the right, so left edge is in shadow */}
        <LinearGradient id={ids.leftSleeveGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%"   stopColor={shadow} />
          <Stop offset="35%"  stopColor={mid} />
          <Stop offset="65%"  stopColor={highlight} />
          <Stop offset="100%" stopColor={mid} />
        </LinearGradient>
        {/* Right sleeve: mirror of left */}
        <LinearGradient id={ids.rightSleeveGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%"   stopColor={mid} />
          <Stop offset="35%"  stopColor={highlight} />
          <Stop offset="65%"  stopColor={mid} />
          <Stop offset="100%" stopColor={shadow} />
        </LinearGradient>
      </Defs>

      {/* Left sleeve */}
      <Path
        d={leftPath}
        fill={`url(#${ids.leftSleeveGradient})`}
      />

      {/* Right sleeve */}
      <Path
        d={rightPath}
        fill={`url(#${ids.rightSleeveGradient})`}
      />
    </G>
  );
}

export default Sleeves;
