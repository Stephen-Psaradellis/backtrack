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

  switch (shape) {
    case FaceShape.ROUND:
      return { ...base, rx: 28, ry: 28, jawPath: 'M22,46 Q22,70 50,74 Q78,70 78,46', chinCurve: 'smooth' };
    case FaceShape.SQUARE:
      return { ...base, rx: 27, ry: 30, cy: 45, jawPath: 'M23,45 Q23,68 30,72 L70,72 Q77,68 77,45', chinCurve: 'angular' };
    case FaceShape.HEART:
      return { ...base, rx: 27, ry: 31, cy: 47, jawPath: 'M23,47 Q28,68 50,78 Q72,68 77,47', chinCurve: 'pointed' };
    case FaceShape.OBLONG:
      return { ...base, rx: 25, ry: 34, cy: 46, jawPath: 'M25,46 Q25,75 50,80 Q75,75 75,46', chinCurve: 'elongated' };
    case FaceShape.DIAMOND:
      return { ...base, rx: 26, ry: 32, cy: 46, jawPath: 'M24,46 Q30,70 50,76 Q70,70 76,46', chinCurve: 'diamond' };
    case FaceShape.TRIANGLE:
      // Narrower forehead, wider jaw
      return { ...base, rx: 25, ry: 31, cy: 45, jawPath: 'M25,45 Q22,68 35,74 L65,74 Q78,68 75,45', chinCurve: 'wide' };
    case FaceShape.INVERTED_TRIANGLE:
      // Wider forehead, narrow pointed chin
      return { ...base, rx: 28, ry: 31, cy: 46, jawPath: 'M22,46 Q28,70 50,80 Q72,70 78,46', chinCurve: 'pointed' };
    case FaceShape.RECTANGLE:
      // Longer square face with straight sides
      return { ...base, rx: 26, ry: 34, cy: 44, jawPath: 'M24,44 Q24,73 32,77 L68,77 Q76,73 76,44', chinCurve: 'angular' };
    case FaceShape.PEAR:
      // Narrow forehead, full cheeks and jaw
      return { ...base, rx: 24, ry: 32, cy: 45, jawPath: 'M26,45 Q20,68 38,76 L62,76 Q80,68 74,45', chinCurve: 'soft' };
    case FaceShape.LONG:
      // Elongated narrow face
      return { ...base, rx: 23, ry: 36, cy: 44, jawPath: 'M27,44 Q27,76 50,82 Q73,76 73,44', chinCurve: 'elongated' };
    case FaceShape.WIDE:
      // Short and wide face
      return { ...base, rx: 30, ry: 28, cy: 47, jawPath: 'M20,47 Q20,70 50,72 Q80,70 80,47', chinCurve: 'soft' };
    case FaceShape.ANGULAR:
      // Sharp, defined angles
      return { ...base, rx: 26, ry: 31, cy: 46, jawPath: 'M24,46 Q26,66 40,74 L60,74 Q74,66 76,46', chinCurve: 'angular' };
    case FaceShape.SOFT_SQUARE:
      // Square with rounded corners
      return { ...base, rx: 27, ry: 30, cy: 45, jawPath: 'M23,45 Q25,70 50,74 Q75,70 77,45', chinCurve: 'soft' };
    case FaceShape.NARROW:
      // Thin, slender face
      return { ...base, rx: 22, ry: 33, cy: 45, jawPath: 'M28,45 Q28,72 50,77 Q72,72 72,45', chinCurve: 'smooth' };
    // New Shapes (Phase 1.4)
    case FaceShape.BABY_FACE:
      // Youthful, soft features with full cheeks and rounded chin
      return { ...base, rx: 29, ry: 28, cy: 48, jawPath: 'M21,48 Q21,68 50,72 Q79,68 79,48', chinCurve: 'smooth' };
    case FaceShape.MATURE:
      // Distinguished, slightly longer with defined bone structure
      return { ...base, rx: 26, ry: 33, cy: 45, jawPath: 'M24,45 Q26,70 50,76 Q74,70 76,45', chinCurve: 'angular' };
    case FaceShape.HIGH_CHEEKBONES:
      // Prominent cheekbones with elegant angles
      return { ...base, rx: 27, ry: 32, cy: 46, jawPath: 'M23,46 Q30,65 50,74 Q70,65 77,46', chinCurve: 'diamond' };
    case FaceShape.FULL_CHEEKS:
      // Rounded, full cheeks with soft jawline
      return { ...base, rx: 29, ry: 30, cy: 47, jawPath: 'M21,47 Q21,70 50,73 Q79,70 79,47', chinCurve: 'soft' };
    case FaceShape.HOLLOW_CHEEKS:
      // Gaunt appearance with sunken cheeks
      return { ...base, rx: 24, ry: 33, cy: 45, jawPath: 'M26,45 Q32,68 50,76 Q68,68 74,45', chinCurve: 'angular' };
    case FaceShape.STRONG_JAW:
      // Prominent, defined jawline
      return { ...base, rx: 27, ry: 31, cy: 45, jawPath: 'M23,45 Q24,66 35,74 L65,74 Q76,66 77,45', chinCurve: 'angular' };
    case FaceShape.STRONG_JAW_WIDE:
      // Wide, powerful jaw with angular features
      return { ...base, rx: 29, ry: 30, cy: 45, jawPath: 'M21,45 Q22,65 32,73 L68,73 Q78,65 79,45', chinCurve: 'angular' };
    case FaceShape.SOFT_FEATURES:
      // Gentle, rounded features throughout
      return { ...base, rx: 28, ry: 30, cy: 47, jawPath: 'M22,47 Q24,70 50,74 Q76,70 78,47', chinCurve: 'soft' };
    case FaceShape.DEFINED_FEATURES:
      // Clear, distinct facial structure
      return { ...base, rx: 26, ry: 32, cy: 46, jawPath: 'M24,46 Q28,68 50,76 Q72,68 76,46', chinCurve: 'angular' };
    case FaceShape.CHISELED:
      // Very angular, model-like features
      return { ...base, rx: 25, ry: 33, cy: 45, jawPath: 'M25,45 Q28,64 42,74 L58,74 Q72,64 75,45', chinCurve: 'angular' };
    case FaceShape.OVAL:
    default:
      return { ...base, rx: 27, ry: 32, jawPath: 'M23,46 Q23,72 50,76 Q77,72 77,46', chinCurve: 'smooth' };
  }
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
        <RadialGradient id={gradientId} cx="50%" cy="35%" rx="55%" ry="65%">
          <Stop offset="0%" stopColor={highlightColor} />
          <Stop offset="40%" stopColor={skinTone} />
          <Stop offset="85%" stopColor={warmTone} />
          <Stop offset="100%" stopColor={shadowColor} />
        </RadialGradient>

        {/* Highlight gradient for forehead/cheek shine */}
        <RadialGradient id={highlightGradientId} cx="50%" cy="30%" rx="40%" ry="35%">
          <Stop offset="0%" stopColor={brightHighlight} stopOpacity="0.4" />
          <Stop offset="60%" stopColor={highlightColor} stopOpacity="0.15" />
          <Stop offset="100%" stopColor={skinTone} stopOpacity="0" />
        </RadialGradient>

        {/* Neck gradient for depth */}
        <LinearGradient id={neckGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="30%" stopColor={skinTone} />
          <Stop offset="100%" stopColor={skinTone} />
        </LinearGradient>
      </Defs>

      {/* Neck with improved shading */}
      <Path
        d="M38,70 Q38,72 40,73 L40,92 L60,92 L60,73 Q62,72 62,70"
        fill={`url(#${neckGradientId})`}
      />
      {/* Neck side shadows */}
      <Path d="M38,72 Q40,70 42,72 L42,88 L38,88 Z" fill={shadowColor} opacity={0.25} />
      <Path d="M62,72 Q60,70 58,72 L58,88 L62,88 Z" fill={shadowColor} opacity={0.25} />
      {/* Neck center highlight */}
      <Path d="M48,74 L48,88 L52,88 L52,74 Z" fill={highlightColor} opacity={0.15} />
      {/* Chin shadow on neck */}
      <Path d="M40,70 Q50,68 60,70 L60,74 Q50,71 40,74 Z" fill={deepShadow} opacity={0.35} />

      {/* Ears with improved detail */}
      <G>
        {/* Left ear */}
        <Ellipse
          cx={shapeData.cx - shapeData.rx - 2}
          cy={shapeData.cy + 4}
          rx={5.5}
          ry={9}
          fill={skinTone}
        />
        {/* Ear inner shadow/detail */}
        <Path
          d={`M${shapeData.cx - shapeData.rx - 4},${shapeData.cy + 1}
              Q${shapeData.cx - shapeData.rx - 5},${shapeData.cy + 4}
              ${shapeData.cx - shapeData.rx - 3},${shapeData.cy + 8}
              Q${shapeData.cx - shapeData.rx - 1},${shapeData.cy + 6}
              ${shapeData.cx - shapeData.rx - 2},${shapeData.cy + 2}`}
          fill={shadowColor}
          opacity={0.4}
        />
        {/* Ear highlight */}
        <Ellipse
          cx={shapeData.cx - shapeData.rx - 3}
          cy={shapeData.cy + 2}
          rx={2}
          ry={3}
          fill={highlightColor}
          opacity={0.25}
        />
        {/* Earlobe */}
        <Ellipse
          cx={shapeData.cx - shapeData.rx - 2}
          cy={shapeData.cy + 10}
          rx={3}
          ry={3}
          fill={warmTone}
        />
      </G>
      <G>
        {/* Right ear */}
        <Ellipse
          cx={shapeData.cx + shapeData.rx + 2}
          cy={shapeData.cy + 4}
          rx={5.5}
          ry={9}
          fill={skinTone}
        />
        {/* Ear inner shadow/detail */}
        <Path
          d={`M${shapeData.cx + shapeData.rx + 4},${shapeData.cy + 1}
              Q${shapeData.cx + shapeData.rx + 5},${shapeData.cy + 4}
              ${shapeData.cx + shapeData.rx + 3},${shapeData.cy + 8}
              Q${shapeData.cx + shapeData.rx + 1},${shapeData.cy + 6}
              ${shapeData.cx + shapeData.rx + 2},${shapeData.cy + 2}`}
          fill={shadowColor}
          opacity={0.4}
        />
        {/* Ear highlight */}
        <Ellipse
          cx={shapeData.cx + shapeData.rx + 3}
          cy={shapeData.cy + 2}
          rx={2}
          ry={3}
          fill={highlightColor}
          opacity={0.25}
        />
        {/* Earlobe */}
        <Ellipse
          cx={shapeData.cx + shapeData.rx + 2}
          cy={shapeData.cy + 10}
          rx={3}
          ry={3}
          fill={warmTone}
        />
      </G>

      {/* Main Face Shape with gradient fill */}
      <Ellipse
        cx={shapeData.cx}
        cy={shapeData.cy}
        rx={shapeData.rx}
        ry={shapeData.ry}
        fill={`url(#${gradientId})`}
      />

      {/* Face highlight overlay for shine */}
      <Ellipse
        cx={shapeData.cx}
        cy={shapeData.cy - 4}
        rx={shapeData.rx - 2}
        ry={shapeData.ry - 4}
        fill={`url(#${highlightGradientId})`}
      />

      {/* Forehead highlight */}
      <Ellipse
        cx={shapeData.cx}
        cy={shapeData.cy - 12}
        rx={12}
        ry={8}
        fill={brightHighlight}
        opacity={0.2}
      />

      {/* Cheek highlights - rosy, natural */}
      <Ellipse
        cx={shapeData.cx - 14}
        cy={shapeData.cy + 6}
        rx={7}
        ry={5}
        fill={highlightColor}
        opacity={0.3}
      />
      <Ellipse
        cx={shapeData.cx + 14}
        cy={shapeData.cy + 6}
        rx={7}
        ry={5}
        fill={highlightColor}
        opacity={0.3}
      />

      {/* Subtle blush on cheeks */}
      <Ellipse
        cx={shapeData.cx - 15}
        cy={shapeData.cy + 8}
        rx={5}
        ry={3.5}
        fill={blushColor}
        opacity={0.15}
      />
      <Ellipse
        cx={shapeData.cx + 15}
        cy={shapeData.cy + 8}
        rx={5}
        ry={3.5}
        fill={blushColor}
        opacity={0.15}
      />

      {/* Nose bridge highlight */}
      <Path
        d={`M${shapeData.cx - 2},${shapeData.cy - 8}
            Q${shapeData.cx},${shapeData.cy - 5}
            ${shapeData.cx + 2},${shapeData.cy - 8}`}
        fill={brightHighlight}
        opacity={0.2}
      />

      {/* Temple shadows */}
      <Ellipse
        cx={shapeData.cx - shapeData.rx + 5}
        cy={shapeData.cy - 8}
        rx={6}
        ry={10}
        fill={shadowColor}
        opacity={0.15}
      />
      <Ellipse
        cx={shapeData.cx + shapeData.rx - 5}
        cy={shapeData.cy - 8}
        rx={6}
        ry={10}
        fill={shadowColor}
        opacity={0.15}
      />

      {/* Under-eye area - subtle shadow */}
      <Path
        d={`M${shapeData.cx - 18},${shapeData.cy + 2}
            Q${shapeData.cx - 14},${shapeData.cy + 5}
            ${shapeData.cx - 8},${shapeData.cy + 3}`}
        fill={shadowColor}
        opacity={0.1}
      />
      <Path
        d={`M${shapeData.cx + 18},${shapeData.cy + 2}
            Q${shapeData.cx + 14},${shapeData.cy + 5}
            ${shapeData.cx + 8},${shapeData.cy + 3}`}
        fill={shadowColor}
        opacity={0.1}
      />

      {/* Jaw and chin contour shadows - shape-specific */}
      {shape === FaceShape.SQUARE && (
        <G>
          <Path
            d="M24,50 Q26,65 32,70 L32,65 Q28,60 26,50 Z"
            fill={shadowColor}
            opacity={0.2}
          />
          <Path
            d="M76,50 Q74,65 68,70 L68,65 Q72,60 74,50 Z"
            fill={shadowColor}
            opacity={0.2}
          />
          <Path
            d="M32,70 Q50,75 68,70 L65,73 Q50,77 35,73 Z"
            fill={shadowColor}
            opacity={0.15}
          />
        </G>
      )}
      {shape === FaceShape.HEART && (
        <G>
          <Path
            d="M28,48 Q32,62 50,75 Q34,62 30,50 Z"
            fill={shadowColor}
            opacity={0.12}
          />
          <Path
            d="M72,48 Q68,62 50,75 Q66,62 70,50 Z"
            fill={shadowColor}
            opacity={0.12}
          />
          {/* Pointed chin highlight */}
          <Ellipse cx={50} cy={70} rx={4} ry={3} fill={highlightColor} opacity={0.2} />
        </G>
      )}
      {shape === FaceShape.OVAL && (
        <G>
          <Path
            d="M25,52 Q28,68 50,74 Q30,66 27,54 Z"
            fill={shadowColor}
            opacity={0.12}
          />
          <Path
            d="M75,52 Q72,68 50,74 Q70,66 73,54 Z"
            fill={shadowColor}
            opacity={0.12}
          />
        </G>
      )}
      {shape === FaceShape.ROUND && (
        <G>
          <Path
            d="M24,50 Q26,64 50,70 Q28,62 26,52 Z"
            fill={shadowColor}
            opacity={0.1}
          />
          <Path
            d="M76,50 Q74,64 50,70 Q72,62 74,52 Z"
            fill={shadowColor}
            opacity={0.1}
          />
        </G>
      )}
      {shape === FaceShape.OBLONG && (
        <G>
          <Path
            d="M27,50 Q28,70 50,78 Q32,68 29,52 Z"
            fill={shadowColor}
            opacity={0.12}
          />
          <Path
            d="M73,50 Q72,70 50,78 Q68,68 71,52 Z"
            fill={shadowColor}
            opacity={0.12}
          />
        </G>
      )}
      {shape === FaceShape.DIAMOND && (
        <G>
          <Path
            d="M26,46 Q32,62 50,72 Q34,60 28,48 Z"
            fill={shadowColor}
            opacity={0.15}
          />
          <Path
            d="M74,46 Q68,62 50,72 Q66,60 72,48 Z"
            fill={shadowColor}
            opacity={0.15}
          />
          {/* Cheekbone highlights for diamond face */}
          <Ellipse cx={32} cy={48} rx={4} ry={3} fill={brightHighlight} opacity={0.2} />
          <Ellipse cx={68} cy={48} rx={4} ry={3} fill={brightHighlight} opacity={0.2} />
        </G>
      )}
      {shape === FaceShape.TRIANGLE && (
        <G>
          <Path
            d="M27,48 Q24,65 38,73 Q30,63 28,50 Z"
            fill={shadowColor}
            opacity={0.12}
          />
          <Path
            d="M73,48 Q76,65 62,73 Q70,63 72,50 Z"
            fill={shadowColor}
            opacity={0.12}
          />
          {/* Wider jaw shadows */}
          <Path d="M35,72 Q50,76 65,72 L62,74 Q50,78 38,74 Z" fill={shadowColor} opacity={0.15} />
        </G>
      )}
      {shape === FaceShape.INVERTED_TRIANGLE && (
        <G>
          <Path
            d="M24,48 Q30,66 50,78 Q34,64 26,50 Z"
            fill={shadowColor}
            opacity={0.12}
          />
          <Path
            d="M76,48 Q70,66 50,78 Q66,64 74,50 Z"
            fill={shadowColor}
            opacity={0.12}
          />
          {/* Pointed chin highlight */}
          <Ellipse cx={50} cy={74} rx={3} ry={3} fill={highlightColor} opacity={0.2} />
        </G>
      )}
      {shape === FaceShape.RECTANGLE && (
        <G>
          <Path
            d="M26,48 Q26,70 34,76 L34,72 Q28,66 28,50 Z"
            fill={shadowColor}
            opacity={0.18}
          />
          <Path
            d="M74,48 Q74,70 66,76 L66,72 Q72,66 72,50 Z"
            fill={shadowColor}
            opacity={0.18}
          />
          <Path d="M34,75 Q50,79 66,75 L64,77 Q50,81 36,77 Z" fill={shadowColor} opacity={0.15} />
        </G>
      )}
      {shape === FaceShape.PEAR && (
        <G>
          <Path
            d="M28,48 Q22,66 40,74 Q30,64 26,52 Z"
            fill={shadowColor}
            opacity={0.12}
          />
          <Path
            d="M72,48 Q78,66 60,74 Q70,64 74,52 Z"
            fill={shadowColor}
            opacity={0.12}
          />
          {/* Fuller cheek highlights */}
          <Ellipse cx={34} cy={58} rx={5} ry={4} fill={highlightColor} opacity={0.15} />
          <Ellipse cx={66} cy={58} rx={5} ry={4} fill={highlightColor} opacity={0.15} />
        </G>
      )}
      {shape === FaceShape.LONG && (
        <G>
          <Path
            d="M29,48 Q29,74 50,80 Q34,72 31,52 Z"
            fill={shadowColor}
            opacity={0.12}
          />
          <Path
            d="M71,48 Q71,74 50,80 Q66,72 69,52 Z"
            fill={shadowColor}
            opacity={0.12}
          />
        </G>
      )}
      {shape === FaceShape.WIDE && (
        <G>
          <Path
            d="M22,50 Q22,66 50,70 Q28,64 24,52 Z"
            fill={shadowColor}
            opacity={0.1}
          />
          <Path
            d="M78,50 Q78,66 50,70 Q72,64 76,52 Z"
            fill={shadowColor}
            opacity={0.1}
          />
        </G>
      )}
      {shape === FaceShape.ANGULAR && (
        <G>
          <Path
            d="M26,48 Q28,64 42,72 L42,68 Q30,62 28,50 Z"
            fill={shadowColor}
            opacity={0.15}
          />
          <Path
            d="M74,48 Q72,64 58,72 L58,68 Q70,62 72,50 Z"
            fill={shadowColor}
            opacity={0.15}
          />
          {/* Angular cheekbone highlights */}
          <Ellipse cx={34} cy={50} rx={4} ry={3} fill={brightHighlight} opacity={0.18} />
          <Ellipse cx={66} cy={50} rx={4} ry={3} fill={brightHighlight} opacity={0.18} />
        </G>
      )}
      {shape === FaceShape.SOFT_SQUARE && (
        <G>
          <Path
            d="M25,50 Q27,68 50,73 Q30,66 27,52 Z"
            fill={shadowColor}
            opacity={0.12}
          />
          <Path
            d="M75,50 Q73,68 50,73 Q70,66 73,52 Z"
            fill={shadowColor}
            opacity={0.12}
          />
        </G>
      )}
      {shape === FaceShape.NARROW && (
        <G>
          <Path
            d="M30,48 Q30,70 50,76 Q36,68 32,52 Z"
            fill={shadowColor}
            opacity={0.12}
          />
          <Path
            d="M70,48 Q70,70 50,76 Q64,68 68,52 Z"
            fill={shadowColor}
            opacity={0.12}
          />
        </G>
      )}

      {/* Philtrum area - subtle shadow under nose */}
      <Path
        d={`M${shapeData.cx - 3},${shapeData.cy + 10}
            Q${shapeData.cx},${shapeData.cy + 14}
            ${shapeData.cx + 3},${shapeData.cy + 10}`}
        fill={shadowColor}
        opacity={0.08}
      />
    </G>
  );
}

export default Face;
