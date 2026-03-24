/**
 * Face Component - Base face shape with skin tone
 * Enhanced with detailed shading, contours, and natural skin appearance
 */

import React from 'react';
import { G, Ellipse, Path, Rect, Defs, RadialGradient, Stop, LinearGradient } from 'react-native-svg';
import { FaceShape, SvgPartProps } from '../types';
import { useGradientIds, adjustBrightness } from '../utils';
import { adjustSaturation } from '../utils/shading';

interface FaceProps extends SvgPartProps {
  shape: FaceShape;
  skinTone: string;
}

function getFaceShapeData(shape: FaceShape) {
  const base = { cx: 50, cy: 50 }; // Moved face center down slightly for better proportions

  // NOTE: jawPath goes RIGHT→chin→LEFT with organic bezier curves for realistic jaw taper and chin point
  switch (shape) {
    case FaceShape.ROUND:
      return { ...base, rx: 23, ry: 28, cy: 52, jawPath: 'M73,52 C73,64 68,71 60,74 C55,76 50,77 50,77 C50,77 45,76 40,74 C32,71 27,64 27,52', chinCurve: 'smooth' };
    case FaceShape.SQUARE:
      return { ...base, rx: 22, ry: 30, cy: 51, jawPath: 'M72,51 C72,62 70,68 65,72 C61,74.5 55,75 50,75 C45,75 39,74.5 35,72 C30,68 28,62 28,51', chinCurve: 'angular' };
    case FaceShape.HEART:
      return { ...base, rx: 23, ry: 31, cy: 52, jawPath: 'M73,52 C71,64 65,71 58,75 C54,77 50,78.5 50,78.5 C50,78.5 46,77 42,75 C35,71 29,64 27,52', chinCurve: 'pointed' };
    case FaceShape.OBLONG:
      return { ...base, rx: 21, ry: 34, cy: 52, jawPath: 'M71,52 C71,68 68,76 60,79 C55,81 50,81.5 50,81.5 C50,81.5 45,81 40,79 C32,76 29,68 29,52', chinCurve: 'elongated' };
    case FaceShape.DIAMOND:
      return { ...base, rx: 22, ry: 32, cy: 52, jawPath: 'M72,52 C70,63 66,70 58,74 C54,76 50,77 50,77 C50,77 46,76 42,74 C34,70 30,63 28,52', chinCurve: 'diamond' };
    case FaceShape.TRIANGLE:
      return { ...base, rx: 21, ry: 31, cy: 51, jawPath: 'M71,51 C73,62 71,68 62,73 C57,75.5 50,76 50,76 C50,76 43,75.5 38,73 C29,68 27,62 29,51', chinCurve: 'wide' };
    case FaceShape.INVERTED_TRIANGLE:
      return { ...base, rx: 24, ry: 31, cy: 52, jawPath: 'M74,52 C72,65 67,74 58,78 C54,80 50,81 50,81 C50,81 46,80 42,78 C33,74 28,65 26,52', chinCurve: 'pointed' };
    case FaceShape.RECTANGLE:
      return { ...base, rx: 22, ry: 34, cy: 50, jawPath: 'M72,50 C72,66 70,74 64,77.5 C58,80 50,80.5 50,80.5 C50,80.5 42,80 36,77.5 C30,74 28,66 28,50', chinCurve: 'angular' };
    case FaceShape.PEAR:
      return { ...base, rx: 20, ry: 32, cy: 51, jawPath: 'M70,51 C74,63 71,71 59,76 C54,77.5 50,78 50,78 C50,78 46,77.5 41,76 C29,71 26,63 30,51', chinCurve: 'soft' };
    case FaceShape.LONG:
      return { ...base, rx: 19, ry: 36, cy: 50, jawPath: 'M69,50 C69,68 67,77 58,81 C54,82.5 50,83 50,83 C50,83 46,82.5 42,81 C33,77 31,68 31,50', chinCurve: 'elongated' };
    case FaceShape.WIDE:
      return { ...base, rx: 25, ry: 28, cy: 53, jawPath: 'M75,53 C75,64 71,70 61,73 C55,74.5 50,75 50,75 C50,75 45,74.5 39,73 C29,70 25,64 25,53', chinCurve: 'soft' };
    case FaceShape.ANGULAR:
      return { ...base, rx: 22, ry: 31, cy: 52, jawPath: 'M72,52 C71,62 68,68 57,74 C53,76 50,76.5 50,76.5 C50,76.5 47,76 43,74 C32,68 29,62 28,52', chinCurve: 'angular' };
    case FaceShape.SOFT_SQUARE:
      return { ...base, rx: 23, ry: 30, cy: 51, jawPath: 'M73,51 C73,62 70,69 60,73 C55,75 50,75.5 50,75.5 C50,75.5 45,75 40,73 C30,69 27,62 27,51', chinCurve: 'soft' };
    case FaceShape.NARROW:
      return { ...base, rx: 18, ry: 33, cy: 51, jawPath: 'M68,51 C68,65 65,73 56,77 C53,78.5 50,79 50,79 C50,79 47,78.5 44,77 C35,73 32,65 32,51', chinCurve: 'smooth' };
    // New Shapes (Phase 1.4)
    case FaceShape.BABY_FACE:
      return { ...base, rx: 24, ry: 28, cy: 54, jawPath: 'M74,54 C74,64 70,69 60,72 C55,73.5 50,74 50,74 C50,74 45,73.5 40,72 C30,69 26,64 26,54', chinCurve: 'smooth' };
    case FaceShape.MATURE:
      return { ...base, rx: 22, ry: 33, cy: 51, jawPath: 'M72,51 C71,64 68,72 57,76 C53,77.5 50,78 50,78 C50,78 47,77.5 43,76 C32,72 29,64 28,51', chinCurve: 'angular' };
    case FaceShape.HIGH_CHEEKBONES:
      return { ...base, rx: 23, ry: 32, cy: 52, jawPath: 'M73,52 C70,61 66,67 56,73 C53,75 50,75.5 50,75.5 C50,75.5 47,75 44,73 C34,67 30,61 27,52', chinCurve: 'diamond' };
    case FaceShape.FULL_CHEEKS:
      return { ...base, rx: 25, ry: 30, cy: 53, jawPath: 'M75,53 C75,64 71,70 60,73 C55,74.5 50,75 50,75 C50,75 45,74.5 40,73 C29,70 25,64 25,53', chinCurve: 'soft' };
    case FaceShape.HOLLOW_CHEEKS:
      return { ...base, rx: 20, ry: 33, cy: 51, jawPath: 'M70,51 C67,63 64,70 54,75 C52,77 50,77.5 50,77.5 C50,77.5 48,77 46,75 C36,70 33,63 30,51', chinCurve: 'angular' };
    case FaceShape.STRONG_JAW:
      return { ...base, rx: 23, ry: 31, cy: 51, jawPath: 'M73,51 C73,61 71,68 62,74 C57,76 50,76.5 50,76.5 C50,76.5 43,76 38,74 C29,68 27,61 27,51', chinCurve: 'angular' };
    case FaceShape.STRONG_JAW_WIDE:
      return { ...base, rx: 25, ry: 30, cy: 51, jawPath: 'M75,51 C75,61 73,67 64,73 C58,75.5 50,76 50,76 C50,76 42,75.5 36,73 C27,67 25,61 25,51', chinCurve: 'angular' };
    case FaceShape.SOFT_FEATURES:
      return { ...base, rx: 24, ry: 30, cy: 53, jawPath: 'M74,53 C73,64 69,70 59,73.5 C54,75 50,75.5 50,75.5 C50,75.5 46,75 41,73.5 C31,70 27,64 26,53', chinCurve: 'soft' };
    case FaceShape.DEFINED_FEATURES:
      return { ...base, rx: 22, ry: 32, cy: 52, jawPath: 'M72,52 C70,63 67,70 56,75 C53,76.5 50,77 50,77 C50,77 47,76.5 44,75 C33,70 30,63 28,52', chinCurve: 'angular' };
    case FaceShape.CHISELED:
      return { ...base, rx: 21, ry: 33, cy: 51, jawPath: 'M71,51 C70,60 68,66 55,74 C52,76 50,76.5 50,76.5 C50,76.5 48,76 45,74 C32,66 30,60 29,51', chinCurve: 'angular' };
    case FaceShape.OVAL:
    default:
      return { ...base, rx: 23, ry: 32, cy: 52, jawPath: 'M73,52 C73,65 69,73 59,76 C54,77.5 50,78 50,78 C50,78 46,77.5 41,76 C31,73 27,65 27,52', chinCurve: 'smooth' };
  }
}

/**
 * Generate complete face path combining forehead arc with jaw path
 * Uses organic bezier curves for realistic head shape with proper cheekbone contours
 */
function getFacePath(shape: FaceShape): string {
  const shapeData = getFaceShapeData(shape);
  const { cx, cy, rx, ry } = shapeData;

  // Calculate key points for organic face shape
  const leftCheekX = cx - rx;
  const rightCheekX = cx + rx;
  const cheekY = cy; // Cheekbone level

  // Crown (top center of head)
  const crownY = cy - ry;

  // Temple points (where forehead curves into sides)
  const templeInset = rx * 0.15; // Slight inward curve at temples
  const templeY = crownY + ry * 0.25;

  // Build complete face path with organic curves and subtle cheekbone contour
  // Path: left cheek → left temple → crown → right temple → right cheek → jaw → back to start
  return `
    M ${leftCheekX},${cheekY}
    C ${leftCheekX - templeInset},${templeY + 8} ${leftCheekX},${templeY} ${cx - rx * 0.7},${crownY + 2}
    C ${cx - rx * 0.4},${crownY - 1} ${cx + rx * 0.4},${crownY - 1} ${cx + rx * 0.7},${crownY + 2}
    C ${rightCheekX},${templeY} ${rightCheekX + templeInset},${templeY + 8} ${rightCheekX},${cheekY}
    ${shapeData.jawPath.replace(/^M\s*[\d.]+,[\d.]+\s*/, '')}
    Z
  `.trim();
}


export function Face({ shape, skinTone, scale = 1 }: FaceProps) {
  const shapeData = getFaceShapeData(shape);
  const shadowColor = adjustBrightness(skinTone, -30);
  const deepShadow = adjustBrightness(skinTone, -45);
  const highlightColor = adjustBrightness(skinTone, 20);
  const brightHighlight = adjustBrightness(skinTone, 35);
  const warmTone = adjustSaturation(adjustBrightness(skinTone, -10), 0.15);
  const blushColor = '#e8a0a0';

  // Use stable gradient IDs
  const gradientIds = useGradientIds(['faceGradient', 'highlightGradient', 'neckGradient']);
  const gradientId = gradientIds.faceGradient;
  const highlightGradientId = gradientIds.highlightGradient;
  const neckGradientId = gradientIds.neckGradient;

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        {/* Main face radial gradient with warm undertones and realistic depth */}
        <RadialGradient id={gradientId} cx="50%" cy="42%" rx="50%" ry="55%">
          <Stop offset="0%" stopColor={skinTone} />
          <Stop offset="80%" stopColor={skinTone} />
          <Stop offset="100%" stopColor={shadowColor} stopOpacity="0.2" />
        </RadialGradient>

        {/* Highlight gradient for forehead and cheekbone shine (not circular blush) */}
        <RadialGradient id={highlightGradientId} cx="50%" cy="35%" rx="32%" ry="25%">
          <Stop offset="0%" stopColor={brightHighlight} stopOpacity="0.12" />
          <Stop offset="45%" stopColor={highlightColor} stopOpacity="0.05" />
          <Stop offset="100%" stopColor={skinTone} stopOpacity="0" />
        </RadialGradient>

        {/* Neck gradient with natural shadow-to-skin transition */}
        <LinearGradient id={neckGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={shadowColor} stopOpacity="0.6" />
          <Stop offset="25%" stopColor={skinTone} />
          <Stop offset="100%" stopColor={adjustBrightness(skinTone, -5)} />
        </LinearGradient>
      </Defs>

      {/* Neck - simple tapered shape */}
      <Path
        d="M44,72 C43,76 42,82 41,88 L59,88 C58,82 57,76 56,72 C54,73 52,73.5 50,73.5 C48,73.5 46,73 44,72 Z"
        fill={skinTone}
      />
      {/* Subtle chin shadow on neck */}
      <Path
        d="M44,72 C46,71.5 48,71 50,71 C52,71 54,71.5 56,72 C54.5,73 52.5,73.5 50,73.5 C47.5,73.5 45.5,73 44,72 Z"
        fill={shadowColor}
        opacity={0.12}
      />

      {/* Ears - smaller (40% reduction), tucked behind face edge, with organic detail */}
      <G>
        {/* Left ear - positioned more behind face */}
        <Path
          d={`M${shapeData.cx - shapeData.rx + 2},${shapeData.cy + 1}
              C${shapeData.cx - shapeData.rx + 0.5},${shapeData.cy + 1.5}
              ${shapeData.cx - shapeData.rx - 0.5},${shapeData.cy + 3}
              ${shapeData.cx - shapeData.rx - 0.5},${shapeData.cy + 4}
              C${shapeData.cx - shapeData.rx - 0.5},${shapeData.cy + 5.5}
              ${shapeData.cx - shapeData.rx + 0.5},${shapeData.cy + 7}
              ${shapeData.cx - shapeData.rx + 2},${shapeData.cy + 7}
              C${shapeData.cx - shapeData.rx + 2.5},${shapeData.cy + 6}
              ${shapeData.cx - shapeData.rx + 2.5},${shapeData.cy + 2}
              ${shapeData.cx - shapeData.rx + 2},${shapeData.cy + 1} Z`}
          fill={skinTone}
        />
        {/* Ear inner shadow (concha) */}
        <Path
          d={`M${shapeData.cx - shapeData.rx + 1.5},${shapeData.cy + 2.5}
              C${shapeData.cx - shapeData.rx + 0.8},${shapeData.cy + 3}
              ${shapeData.cx - shapeData.rx + 0.8},${shapeData.cy + 5}
              ${shapeData.cx - shapeData.rx + 1.5},${shapeData.cy + 5.5}
              C${shapeData.cx - shapeData.rx + 1.8},${shapeData.cy + 4.5}
              ${shapeData.cx - shapeData.rx + 1.8},${shapeData.cy + 3.5}
              ${shapeData.cx - shapeData.rx + 1.5},${shapeData.cy + 2.5} Z`}
          fill={shadowColor}
          opacity={0.35}
        />
        {/* Earlobe detail */}
        <Ellipse
          cx={shapeData.cx - shapeData.rx + 1.2}
          cy={shapeData.cy + 7.2}
          rx={0.9}
          ry={1}
          fill={warmTone}
          opacity={0.6}
        />
      </G>
      <G>
        {/* Right ear - positioned more behind face */}
        <Path
          d={`M${shapeData.cx + shapeData.rx - 2},${shapeData.cy + 1}
              C${shapeData.cx + shapeData.rx - 0.5},${shapeData.cy + 1.5}
              ${shapeData.cx + shapeData.rx + 0.5},${shapeData.cy + 3}
              ${shapeData.cx + shapeData.rx + 0.5},${shapeData.cy + 4}
              C${shapeData.cx + shapeData.rx + 0.5},${shapeData.cy + 5.5}
              ${shapeData.cx + shapeData.rx - 0.5},${shapeData.cy + 7}
              ${shapeData.cx + shapeData.rx - 2},${shapeData.cy + 7}
              C${shapeData.cx + shapeData.rx - 2.5},${shapeData.cy + 6}
              ${shapeData.cx + shapeData.rx - 2.5},${shapeData.cy + 2}
              ${shapeData.cx + shapeData.rx - 2},${shapeData.cy + 1} Z`}
          fill={skinTone}
        />
        {/* Ear inner shadow (concha) */}
        <Path
          d={`M${shapeData.cx + shapeData.rx - 1.5},${shapeData.cy + 2.5}
              C${shapeData.cx + shapeData.rx - 0.8},${shapeData.cy + 3}
              ${shapeData.cx + shapeData.rx - 0.8},${shapeData.cy + 5}
              ${shapeData.cx + shapeData.rx - 1.5},${shapeData.cy + 5.5}
              C${shapeData.cx + shapeData.rx - 1.8},${shapeData.cy + 4.5}
              ${shapeData.cx + shapeData.rx - 1.8},${shapeData.cy + 3.5}
              ${shapeData.cx + shapeData.rx - 1.5},${shapeData.cy + 2.5} Z`}
          fill={shadowColor}
          opacity={0.35}
        />
        {/* Earlobe detail */}
        <Ellipse
          cx={shapeData.cx + shapeData.rx - 1.2}
          cy={shapeData.cy + 7.2}
          rx={0.9}
          ry={1}
          fill={warmTone}
          opacity={0.6}
        />
      </G>

      {/* Main Face Shape with gradient fill - using path instead of ellipse */}
      <Path
        d={getFacePath(shape)}
        fill={`url(#${gradientId})`}
        stroke={adjustBrightness(skinTone, -15)}
        strokeWidth={0.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Natural cheek warmth - not circular blush, but organic warmth */}
      <Path
        d={`M${shapeData.cx - 16},${shapeData.cy + 6}
            C${shapeData.cx - 18},${shapeData.cy + 8} ${shapeData.cx - 16},${shapeData.cy + 11} ${shapeData.cx - 12},${shapeData.cy + 10}
            C${shapeData.cx - 10},${shapeData.cy + 9} ${shapeData.cx - 10},${shapeData.cy + 7} ${shapeData.cx - 16},${shapeData.cy + 6} Z`}
        fill={blushColor}
        opacity={0.1}
      />
      <Path
        d={`M${shapeData.cx + 16},${shapeData.cy + 6}
            C${shapeData.cx + 18},${shapeData.cy + 8} ${shapeData.cx + 16},${shapeData.cy + 11} ${shapeData.cx + 12},${shapeData.cy + 10}
            C${shapeData.cx + 10},${shapeData.cy + 9} ${shapeData.cx + 10},${shapeData.cy + 7} ${shapeData.cx + 16},${shapeData.cy + 6} Z`}
        fill={blushColor}
        opacity={0.1}
      />

      {/* Cheekbone highlight - subtle 3D definition */}
      <Path
        d={`M${shapeData.cx - 12},${shapeData.cy + 2}
            C${shapeData.cx - 14},${shapeData.cy + 3} ${shapeData.cx - 13},${shapeData.cy + 5} ${shapeData.cx - 10},${shapeData.cy + 4.5}
            C${shapeData.cx - 8},${shapeData.cy + 4} ${shapeData.cx - 9},${shapeData.cy + 2.5} ${shapeData.cx - 12},${shapeData.cy + 2} Z`}
        fill={highlightColor}
        opacity={0.15}
      />
      <Path
        d={`M${shapeData.cx + 12},${shapeData.cy + 2}
            C${shapeData.cx + 14},${shapeData.cy + 3} ${shapeData.cx + 13},${shapeData.cy + 5} ${shapeData.cx + 10},${shapeData.cy + 4.5}
            C${shapeData.cx + 8},${shapeData.cy + 4} ${shapeData.cx + 9},${shapeData.cy + 2.5} ${shapeData.cx + 12},${shapeData.cy + 2} Z`}
        fill={highlightColor}
        opacity={0.15}
      />

      {/* Jaw contour shadows - very subtle */}
      <Path
        d={`M${shapeData.cx - shapeData.rx + 5},${shapeData.cy + 8}
            C${shapeData.cx - shapeData.rx + 3},${shapeData.cy + 14} ${shapeData.cx - shapeData.rx + 4},${shapeData.cy + 20} ${shapeData.cx - 8},${shapeData.cy + 24}
            C${shapeData.cx - 7},${shapeData.cy + 22} ${shapeData.cx - 8},${shapeData.cy + 15} ${shapeData.cx - shapeData.rx + 5},${shapeData.cy + 8} Z`}
        fill={shadowColor}
        opacity={0.06}
      />
      <Path
        d={`M${shapeData.cx + shapeData.rx - 5},${shapeData.cy + 8}
            C${shapeData.cx + shapeData.rx - 3},${shapeData.cy + 14} ${shapeData.cx + shapeData.rx - 4},${shapeData.cy + 20} ${shapeData.cx + 8},${shapeData.cy + 24}
            C${shapeData.cx + 7},${shapeData.cy + 22} ${shapeData.cx + 8},${shapeData.cy + 15} ${shapeData.cx + shapeData.rx - 5},${shapeData.cy + 8} Z`}
        fill={shadowColor}
        opacity={0.06}
      />

      {/* Chin contour - soft shadow under lower lip */}
      <Path
        d={`M${shapeData.cx - 6},${shapeData.cy + 24}
            C${shapeData.cx - 8},${shapeData.cy + 26} ${shapeData.cx - 4},${shapeData.cy + 27} ${shapeData.cx},${shapeData.cy + 27}
            C${shapeData.cx + 4},${shapeData.cy + 27} ${shapeData.cx + 8},${shapeData.cy + 26} ${shapeData.cx + 6},${shapeData.cy + 24}
            C${shapeData.cx + 3},${shapeData.cy + 25} ${shapeData.cx - 3},${shapeData.cy + 25} ${shapeData.cx - 6},${shapeData.cy + 24} Z`}
        fill={shadowColor}
        opacity={0.1}
      />
    </G>
  );
}

export default Face;
