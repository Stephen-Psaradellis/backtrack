/**
 * Face Component - Base face shape with skin tone
 * Enhanced with detailed shading, contours, and natural skin appearance
 */

import React from 'react';
import { G, Ellipse, Path, Rect, Defs, RadialGradient, Stop, LinearGradient } from 'react-native-svg';
import { FaceShape, SvgPartProps } from '../types';
import { useGradientIds, adjustBrightness } from '../utils';

interface FaceProps extends SvgPartProps {
  shape: FaceShape;
  skinTone: string;
}

function getFaceShapeData(shape: FaceShape) {
  const base = { cx: 50, cy: 46 };

  // NOTE: jawPath goes RIGHT→chin→LEFT so it continues correctly after forehead (which ends at right cheek)
  switch (shape) {
    case FaceShape.ROUND:
      return { ...base, rx: 30, ry: 30, jawPath: 'M80,46 Q80,72 50,76 Q20,72 20,46', chinCurve: 'smooth' };
    case FaceShape.SQUARE:
      return { ...base, rx: 29, ry: 32, cy: 45, jawPath: 'M79,45 Q79,69 72,73 L28,73 Q21,69 21,45', chinCurve: 'angular' };
    case FaceShape.HEART:
      return { ...base, rx: 29, ry: 33, cy: 47, jawPath: 'M79,47 Q74,70 50,80 Q26,70 21,47', chinCurve: 'pointed' };
    case FaceShape.OBLONG:
      return { ...base, rx: 27, ry: 36, cy: 46, jawPath: 'M77,46 Q77,77 50,82 Q23,77 23,46', chinCurve: 'elongated' };
    case FaceShape.DIAMOND:
      return { ...base, rx: 28, ry: 34, cy: 46, jawPath: 'M78,46 Q72,72 50,78 Q28,72 22,46', chinCurve: 'diamond' };
    case FaceShape.TRIANGLE:
      // Narrower forehead, wider jaw
      return { ...base, rx: 27, ry: 33, cy: 45, jawPath: 'M77,45 Q80,69 67,75 L33,75 Q20,69 23,45', chinCurve: 'wide' };
    case FaceShape.INVERTED_TRIANGLE:
      // Wider forehead, narrow pointed chin
      return { ...base, rx: 30, ry: 33, cy: 46, jawPath: 'M80,46 Q74,72 50,82 Q26,72 20,46', chinCurve: 'pointed' };
    case FaceShape.RECTANGLE:
      // Longer square face with straight sides
      return { ...base, rx: 28, ry: 36, cy: 44, jawPath: 'M78,44 Q78,75 70,79 L30,79 Q22,75 22,44', chinCurve: 'angular' };
    case FaceShape.PEAR:
      // Narrow forehead, full cheeks and jaw
      return { ...base, rx: 26, ry: 34, cy: 45, jawPath: 'M76,45 Q82,70 64,78 L36,78 Q18,70 24,45', chinCurve: 'soft' };
    case FaceShape.LONG:
      // Elongated narrow face
      return { ...base, rx: 25, ry: 38, cy: 44, jawPath: 'M75,44 Q75,78 50,84 Q25,78 25,44', chinCurve: 'elongated' };
    case FaceShape.WIDE:
      // Short and wide face
      return { ...base, rx: 32, ry: 30, cy: 47, jawPath: 'M82,47 Q82,72 50,74 Q18,72 18,47', chinCurve: 'soft' };
    case FaceShape.ANGULAR:
      // Sharp, defined angles
      return { ...base, rx: 28, ry: 33, cy: 46, jawPath: 'M78,46 Q76,68 62,76 L38,76 Q24,68 22,46', chinCurve: 'angular' };
    case FaceShape.SOFT_SQUARE:
      // Square with rounded corners
      return { ...base, rx: 29, ry: 32, cy: 45, jawPath: 'M79,45 Q77,72 50,76 Q23,72 21,45', chinCurve: 'soft' };
    case FaceShape.NARROW:
      // Thin, slender face
      return { ...base, rx: 24, ry: 35, cy: 45, jawPath: 'M74,45 Q74,74 50,79 Q26,74 26,45', chinCurve: 'smooth' };
    // New Shapes (Phase 1.4)
    case FaceShape.BABY_FACE:
      // Youthful, soft features with full cheeks and rounded chin
      return { ...base, rx: 31, ry: 30, cy: 48, jawPath: 'M81,48 Q81,70 50,74 Q19,70 19,48', chinCurve: 'smooth' };
    case FaceShape.MATURE:
      // Distinguished, slightly longer with defined bone structure
      return { ...base, rx: 28, ry: 35, cy: 45, jawPath: 'M78,45 Q76,72 50,78 Q24,72 22,45', chinCurve: 'angular' };
    case FaceShape.HIGH_CHEEKBONES:
      // Prominent cheekbones with elegant angles
      return { ...base, rx: 29, ry: 34, cy: 46, jawPath: 'M79,46 Q72,67 50,76 Q28,67 21,46', chinCurve: 'diamond' };
    case FaceShape.FULL_CHEEKS:
      // Rounded, full cheeks with soft jawline
      return { ...base, rx: 31, ry: 32, cy: 47, jawPath: 'M81,47 Q81,72 50,75 Q19,72 19,47', chinCurve: 'soft' };
    case FaceShape.HOLLOW_CHEEKS:
      // Gaunt appearance with sunken cheeks
      return { ...base, rx: 26, ry: 35, cy: 45, jawPath: 'M76,45 Q70,70 50,78 Q30,70 24,45', chinCurve: 'angular' };
    case FaceShape.STRONG_JAW:
      // Prominent, defined jawline
      return { ...base, rx: 29, ry: 33, cy: 45, jawPath: 'M79,45 Q78,68 67,76 L33,76 Q22,68 21,45', chinCurve: 'angular' };
    case FaceShape.STRONG_JAW_WIDE:
      // Wide, powerful jaw with angular features
      return { ...base, rx: 31, ry: 32, cy: 45, jawPath: 'M81,45 Q80,67 70,75 L30,75 Q20,67 19,45', chinCurve: 'angular' };
    case FaceShape.SOFT_FEATURES:
      // Gentle, rounded features throughout
      return { ...base, rx: 30, ry: 32, cy: 47, jawPath: 'M80,47 Q78,72 50,76 Q22,72 20,47', chinCurve: 'soft' };
    case FaceShape.DEFINED_FEATURES:
      // Clear, distinct facial structure
      return { ...base, rx: 28, ry: 34, cy: 46, jawPath: 'M78,46 Q74,70 50,78 Q26,70 22,46', chinCurve: 'angular' };
    case FaceShape.CHISELED:
      // Very angular, model-like features
      return { ...base, rx: 27, ry: 35, cy: 45, jawPath: 'M77,45 Q74,66 60,76 L40,76 Q26,66 23,45', chinCurve: 'angular' };
    case FaceShape.OVAL:
    default:
      return { ...base, rx: 29, ry: 34, jawPath: 'M79,46 Q79,74 50,78 Q21,74 21,46', chinCurve: 'smooth' };
  }
}

/**
 * Generate complete face path combining forehead arc with jaw path
 */
function getFacePath(shape: FaceShape): string {
  const shapeData = getFaceShapeData(shape);
  const { cx, cy, rx, ry } = shapeData;

  // Calculate forehead curve points
  const leftCheekX = cx - rx;
  const rightCheekX = cx + rx;
  const cheekY = cy; // Cheekbone level

  // Crown (top center of head)
  const crownY = cy - ry;

  // Build complete face path: left cheek → forehead → right cheek → jaw → back to left cheek
  return `
    M ${leftCheekX},${cheekY}
    Q ${leftCheekX},${crownY + 4} ${cx},${crownY}
    Q ${rightCheekX},${crownY + 4} ${rightCheekX},${cheekY}
    ${shapeData.jawPath.replace(/^M\s*[\d.]+,[\d.]+\s*/, '')}
    Z
  `.trim();
}


function adjustSaturation(hex: string, amount: number): string {
  const color = hex.replace('#', '');
  let r = parseInt(color.slice(0, 2), 16);
  let g = parseInt(color.slice(2, 4), 16);
  let b = parseInt(color.slice(4, 6), 16);
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  r = Math.min(255, Math.max(0, Math.round(gray + (r - gray) * (1 + amount))));
  g = Math.min(255, Math.max(0, Math.round(gray + (g - gray) * (1 + amount))));
  b = Math.min(255, Math.max(0, Math.round(gray + (b - gray) * (1 + amount))));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
        {/* Main face radial gradient for natural skin appearance */}
        <RadialGradient id={gradientId} cx="44%" cy="40%" rx="50%" ry="55%">
          <Stop offset="0%" stopColor={skinTone} />
          <Stop offset="50%" stopColor={skinTone} />
          <Stop offset="75%" stopColor={warmTone} />
          <Stop offset="100%" stopColor={shadowColor} stopOpacity="1" />
        </RadialGradient>

        {/* Highlight gradient for forehead/cheek shine */}
        <RadialGradient id={highlightGradientId} cx="45%" cy="32%" rx="35%" ry="30%">
          <Stop offset="0%" stopColor={brightHighlight} stopOpacity="0.2" />
          <Stop offset="50%" stopColor={highlightColor} stopOpacity="0.08" />
          <Stop offset="100%" stopColor={skinTone} stopOpacity="0" />
        </RadialGradient>

        {/* Neck gradient for depth */}
        <LinearGradient id={neckGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="30%" stopColor={skinTone} />
          <Stop offset="100%" stopColor={skinTone} />
        </LinearGradient>
      </Defs>

      {/* Neck - narrow column connecting chin to shoulders */}
      <Path
        d="M42,70 C42,72 41,80 40,88 L60,88 C59,80 58,72 58,70"
        fill={`url(#${neckGradientId})`}
      />
      {/* Neck side shadows */}
      <Path d="M41,72 Q42,70 44,72 L44,85 L40,87 Z" fill={shadowColor} opacity={0.25} />
      <Path d="M59,72 Q58,70 56,72 L56,85 L60,87 Z" fill={shadowColor} opacity={0.25} />
      {/* Neck center highlight */}
      <Path d="M48,74 L48,85 L52,85 L52,74 Z" fill={highlightColor} opacity={0.15} />
      {/* Chin shadow on neck */}
      <Path d="M42,70 Q50,68 58,70 L58,74 Q50,71 42,74 Z" fill={deepShadow} opacity={0.2} />

      {/* Ears with improved detail - connected to face */}
      <G>
        {/* Left ear */}
        <Ellipse
          cx={shapeData.cx - shapeData.rx + 1}
          cy={shapeData.cy + 4}
          rx={3.5}
          ry={5.5}
          fill={skinTone}
        />
        {/* Ear inner shadow/detail */}
        <Path
          d={`M${shapeData.cx - shapeData.rx - 0.5},${shapeData.cy + 1}
              Q${shapeData.cx - shapeData.rx - 1.5},${shapeData.cy + 4}
              ${shapeData.cx - shapeData.rx},${shapeData.cy + 7}
              Q${shapeData.cx - shapeData.rx + 1.5},${shapeData.cy + 5}
              ${shapeData.cx - shapeData.rx + 1},${shapeData.cy + 2}`}
          fill={shadowColor}
          opacity={0.4}
        />
        {/* Earlobe */}
        <Ellipse
          cx={shapeData.cx - shapeData.rx + 1}
          cy={shapeData.cy + 8}
          rx={2}
          ry={2}
          fill={warmTone}
        />
      </G>
      <G>
        {/* Right ear */}
        <Ellipse
          cx={shapeData.cx + shapeData.rx - 1}
          cy={shapeData.cy + 4}
          rx={3.5}
          ry={5.5}
          fill={skinTone}
        />
        {/* Ear inner shadow/detail */}
        <Path
          d={`M${shapeData.cx + shapeData.rx + 0.5},${shapeData.cy + 1}
              Q${shapeData.cx + shapeData.rx + 1.5},${shapeData.cy + 4}
              ${shapeData.cx + shapeData.rx},${shapeData.cy + 7}
              Q${shapeData.cx + shapeData.rx - 1.5},${shapeData.cy + 5}
              ${shapeData.cx + shapeData.rx - 1},${shapeData.cy + 2}`}
          fill={shadowColor}
          opacity={0.4}
        />
        {/* Earlobe */}
        <Ellipse
          cx={shapeData.cx + shapeData.rx - 1}
          cy={shapeData.cy + 8}
          rx={2}
          ry={2}
          fill={warmTone}
        />
      </G>

      {/* Main Face Shape with gradient fill - using path instead of ellipse */}
      <Path
        d={getFacePath(shape)}
        fill={`url(#${gradientId})`}
        stroke={adjustBrightness(skinTone, -40)}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Cheek warmth - very soft blush */}
      <Ellipse
        cx={shapeData.cx - 14}
        cy={shapeData.cy + 8}
        rx={8}
        ry={6}
        fill={blushColor}
        opacity={0.06}
      />
      <Ellipse
        cx={shapeData.cx + 14}
        cy={shapeData.cy + 8}
        rx={8}
        ry={6}
        fill={blushColor}
        opacity={0.06}
      />

      {/* Simple jaw shadows - subtle definition */}
      <Path
        d={`M${shapeData.cx - shapeData.rx + 4},${shapeData.cy + 10}
            Q${shapeData.cx - shapeData.rx + 2},${shapeData.cy + 20}
            ${shapeData.cx - 10},${shapeData.cy + 25}`}
        fill={shadowColor}
        opacity={0.1}
      />
      <Path
        d={`M${shapeData.cx + shapeData.rx - 4},${shapeData.cy + 10}
            Q${shapeData.cx + shapeData.rx - 2},${shapeData.cy + 20}
            ${shapeData.cx + 10},${shapeData.cy + 25}`}
        fill={shadowColor}
        opacity={0.1}
      />
    </G>
  );
}

export default Face;
