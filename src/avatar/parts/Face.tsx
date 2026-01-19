/**
 * Face Component - Base face shape with skin tone
 *
 * Renders the base face shape, neck, ears, and applies skin tone coloring.
 * Different face shapes are supported via the FaceShape enum.
 */

import React from 'react';
import { G, Ellipse, Path, Rect } from 'react-native-svg';
import { FaceShape, SvgPartProps } from '../types';

interface FaceProps extends SvgPartProps {
  shape: FaceShape;
  skinTone: string;
}

/**
 * Get face shape path/dimensions based on FaceShape type
 */
function getFaceShapeData(shape: FaceShape): {
  path?: string;
  rx: number;
  ry: number;
  cx: number;
  cy: number;
} {
  const base = { cx: 50, cy: 46 };

  switch (shape) {
    case FaceShape.ROUND:
      return { ...base, rx: 28, ry: 28 };

    case FaceShape.SQUARE:
      return { ...base, rx: 27, ry: 30, cy: 45 };

    case FaceShape.HEART:
      return { ...base, rx: 27, ry: 31, cy: 47 };

    case FaceShape.OBLONG:
      return { ...base, rx: 25, ry: 34, cy: 46 };

    case FaceShape.DIAMOND:
      return { ...base, rx: 26, ry: 32, cy: 46 };

    case FaceShape.OVAL:
    default:
      return { ...base, rx: 27, ry: 32 };
  }
}

/**
 * Adjust color brightness
 */
function adjustBrightness(hex: string, amount: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  const color = hex.replace('#', '');
  const r = clamp(parseInt(color.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(color.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(color.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function Face({ shape, skinTone, scale = 1 }: FaceProps) {
  const shapeData = getFaceShapeData(shape);
  const shadowColor = adjustBrightness(skinTone, -25);
  const highlightColor = adjustBrightness(skinTone, 15);

  return (
    <G transform={`scale(${scale})`}>
      {/* Neck */}
      <Rect
        x="40"
        y="70"
        width="20"
        height="22"
        fill={skinTone}
      />
      {/* Neck shadow */}
      <Path
        d="M40,70 L40,75 Q50,72 60,75 L60,70 Z"
        fill={shadowColor}
        opacity={0.3}
      />

      {/* Left Ear */}
      <G>
        <Ellipse
          cx={shapeData.cx - shapeData.rx - 2}
          cy={shapeData.cy + 4}
          rx={5}
          ry={8}
          fill={skinTone}
        />
        {/* Inner ear detail */}
        <Ellipse
          cx={shapeData.cx - shapeData.rx - 1}
          cy={shapeData.cy + 4}
          rx={2.5}
          ry={5}
          fill={shadowColor}
          opacity={0.3}
        />
      </G>

      {/* Right Ear */}
      <G>
        <Ellipse
          cx={shapeData.cx + shapeData.rx + 2}
          cy={shapeData.cy + 4}
          rx={5}
          ry={8}
          fill={skinTone}
        />
        {/* Inner ear detail */}
        <Ellipse
          cx={shapeData.cx + shapeData.rx + 1}
          cy={shapeData.cy + 4}
          rx={2.5}
          ry={5}
          fill={shadowColor}
          opacity={0.3}
        />
      </G>

      {/* Main Face Shape */}
      <Ellipse
        cx={shapeData.cx}
        cy={shapeData.cy}
        rx={shapeData.rx}
        ry={shapeData.ry}
        fill={skinTone}
      />

      {/* Face highlight (cheek area) */}
      <Ellipse
        cx={shapeData.cx - 12}
        cy={shapeData.cy + 8}
        rx={6}
        ry={4}
        fill={highlightColor}
        opacity={0.2}
      />
      <Ellipse
        cx={shapeData.cx + 12}
        cy={shapeData.cy + 8}
        rx={6}
        ry={4}
        fill={highlightColor}
        opacity={0.2}
      />

      {/* Jaw shadow for depth (varies by face shape) */}
      {shape === FaceShape.SQUARE && (
        <Path
          d="M28,55 Q35,72 50,75 Q65,72 72,55"
          fill={shadowColor}
          opacity={0.15}
        />
      )}
      {shape === FaceShape.HEART && (
        <Path
          d="M30,50 Q40,70 50,75 Q60,70 70,50"
          fill={shadowColor}
          opacity={0.1}
        />
      )}
      {shape === FaceShape.DIAMOND && (
        <Path
          d="M35,48 Q42,68 50,72 Q58,68 65,48"
          fill={shadowColor}
          opacity={0.1}
        />
      )}
    </G>
  );
}

export default Face;
