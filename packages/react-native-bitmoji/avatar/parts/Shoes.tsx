/**
 * Shoes Component - Footwear rendering with 25 styles
 * Renders left and right shoes that attach to ankle positions
 */

import React from 'react';
import { G, Path, Ellipse, Rect, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { ShoeStyle, LegPose, SvgPartProps } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

type ShoesGradientIds = {
  leftShoeGradient: string;
  rightShoeGradient: string;
  leftSoleGradient: string;
  rightSoleGradient: string;
};

interface ShoesProps extends SvgPartProps {
  style: ShoeStyle;
  color: string;
  leftAnkle: { x: number; y: number };
  rightAnkle: { x: number; y: number };
  legPose: LegPose;
}

interface ShoePaths {
  main: string;
  sole: string;
  details: string[];
  laces?: string[];
  heel?: string;
}

function getShoePaths(style: ShoeStyle, isLeft: boolean, pose: LegPose): ShoePaths {
  const flip = isLeft ? 1 : -1;

  // Adjust shoe orientation based on pose
  const isFlat = pose === LegPose.SITTING;

  switch (style) {
    case ShoeStyle.SNEAKERS:
    case ShoeStyle.RUNNING:
      return {
        main: `
          M ${-4 * flip} 0
          Q ${-5 * flip} 2 ${-4 * flip} 4
          L ${-5 * flip} 6
          Q ${-3 * flip} 10 ${6 * flip} 10
          Q ${12 * flip} 9 ${13 * flip} 6
          Q ${12 * flip} 3 ${8 * flip} 0
          Q ${2 * flip} -2 ${-4 * flip} 0
          Z
        `,
        sole: `
          M ${-5 * flip} 6
          Q ${-3 * flip} 12 ${6 * flip} 12
          Q ${12 * flip} 11 ${13 * flip} 8
          L ${13 * flip} 6
          Q ${12 * flip} 9 ${6 * flip} 10
          Q ${-3 * flip} 10 ${-5 * flip} 6
        `,
        details: [
          `M ${-2 * flip} 2 Q ${4 * flip} 3 ${8 * flip} 2`, // Shoe panel line
          `M ${10 * flip} 4 Q ${11 * flip} 6 ${10 * flip} 8`, // Heel counter
        ],
        laces: [
          `M ${0 * flip} 1 L ${2 * flip} 0 L ${4 * flip} 1`,
          `M ${0 * flip} 3 L ${2 * flip} 2 L ${4 * flip} 3`,
        ],
      };

    case ShoeStyle.SNEAKERS_HIGH:
    case ShoeStyle.CONVERSE:
      return {
        main: `
          M ${-4 * flip} -4
          Q ${-5 * flip} 0 ${-4 * flip} 4
          L ${-5 * flip} 6
          Q ${-3 * flip} 10 ${6 * flip} 10
          Q ${12 * flip} 9 ${13 * flip} 6
          Q ${12 * flip} 3 ${8 * flip} -2
          Q ${4 * flip} -5 ${-4 * flip} -4
          Z
        `,
        sole: `
          M ${-5 * flip} 6
          Q ${-3 * flip} 12 ${6 * flip} 12
          Q ${12 * flip} 11 ${14 * flip} 7
          L ${13 * flip} 6
          Q ${12 * flip} 9 ${6 * flip} 10
          Q ${-3 * flip} 10 ${-5 * flip} 6
        `,
        details: [
          `M ${-2 * flip} 0 Q ${4 * flip} 1 ${8 * flip} 0`,
          `M ${10 * flip} 2 Q ${11 * flip} 5 ${10 * flip} 8`,
        ],
        laces: [
          `M ${0 * flip} -2 L ${2 * flip} -3 L ${4 * flip} -2`,
          `M ${0 * flip} 0 L ${2 * flip} -1 L ${4 * flip} 0`,
          `M ${0 * flip} 2 L ${2 * flip} 1 L ${4 * flip} 2`,
        ],
      };

    case ShoeStyle.HEELS:
      const heelHeight = 5;
      return {
        main: `
          M ${-3 * flip} 0
          Q ${-4 * flip} 2 ${-3 * flip} 4
          L ${-4 * flip} 5
          Q ${-2 * flip} 8 ${6 * flip} 8
          Q ${10 * flip} 7 ${11 * flip} 4
          Q ${10 * flip} 1 ${6 * flip} 0
          Q ${1 * flip} -1 ${-3 * flip} 0
          Z
        `,
        sole: `
          M ${-4 * flip} 5
          Q ${-2 * flip} 9 ${6 * flip} 9
          Q ${10 * flip} 8 ${11 * flip} 5
          L ${11 * flip} 4
          Q ${10 * flip} 7 ${6 * flip} 8
          Q ${-2 * flip} 8 ${-4 * flip} 5
        `,
        details: [],
        heel: `
          M ${-4 * flip} 5
          L ${-5 * flip} ${5 + heelHeight}
          L ${-2 * flip} ${5 + heelHeight}
          L ${-2 * flip} 6
          Q ${-3 * flip} 5 ${-4 * flip} 5
        `,
      };

    case ShoeStyle.BOOTS_ANKLE:
    case ShoeStyle.BOOTS_COMBAT:
      return {
        main: `
          M ${-4 * flip} -8
          Q ${-5 * flip} -4 ${-5 * flip} 0
          Q ${-5 * flip} 4 ${-4 * flip} 6
          Q ${-2 * flip} 10 ${6 * flip} 10
          Q ${12 * flip} 9 ${13 * flip} 6
          Q ${12 * flip} 2 ${10 * flip} -4
          Q ${6 * flip} -10 ${-4 * flip} -8
          Z
        `,
        sole: `
          M ${-4 * flip} 6
          Q ${-2 * flip} 12 ${6 * flip} 12
          Q ${12 * flip} 11 ${14 * flip} 7
          L ${13 * flip} 6
          Q ${12 * flip} 9 ${6 * flip} 10
          Q ${-2 * flip} 10 ${-4 * flip} 6
        `,
        details: [
          `M ${-3 * flip} -6 Q ${3 * flip} -5 ${8 * flip} -6`, // Boot shaft line
          `M ${-3 * flip} -2 Q ${3 * flip} -1 ${8 * flip} -2`,
        ],
        laces: style === ShoeStyle.BOOTS_COMBAT
          ? [
              `M ${0 * flip} -6 L ${2 * flip} -7 L ${4 * flip} -6`,
              `M ${0 * flip} -4 L ${2 * flip} -5 L ${4 * flip} -4`,
              `M ${0 * flip} -2 L ${2 * flip} -3 L ${4 * flip} -2`,
              `M ${0 * flip} 0 L ${2 * flip} -1 L ${4 * flip} 0`,
            ]
          : [],
      };

    case ShoeStyle.FLATS:
      return {
        main: `
          M ${-3 * flip} 1
          Q ${-4 * flip} 3 ${-3 * flip} 5
          Q ${-1 * flip} 8 ${6 * flip} 8
          Q ${11 * flip} 7 ${12 * flip} 4
          Q ${11 * flip} 2 ${7 * flip} 1
          Q ${2 * flip} 0 ${-3 * flip} 1
          Z
        `,
        sole: `
          M ${-3 * flip} 5
          Q ${-1 * flip} 9 ${6 * flip} 9
          Q ${11 * flip} 8 ${12 * flip} 5
          L ${12 * flip} 4
          Q ${11 * flip} 7 ${6 * flip} 8
          Q ${-1 * flip} 8 ${-3 * flip} 5
        `,
        details: [
          `M ${2 * flip} 3 Q ${4 * flip} 2 ${6 * flip} 3`, // Decorative bow line
        ],
      };

    case ShoeStyle.OXFORDS:
    case ShoeStyle.LOAFERS:
      return {
        main: `
          M ${-4 * flip} 0
          Q ${-5 * flip} 2 ${-4 * flip} 4
          L ${-5 * flip} 6
          Q ${-3 * flip} 10 ${6 * flip} 10
          Q ${12 * flip} 9 ${14 * flip} 5
          Q ${12 * flip} 2 ${7 * flip} 0
          Q ${1 * flip} -1 ${-4 * flip} 0
          Z
        `,
        sole: `
          M ${-5 * flip} 6
          Q ${-3 * flip} 11 ${6 * flip} 11
          Q ${12 * flip} 10 ${14 * flip} 6
          L ${14 * flip} 5
          Q ${12 * flip} 9 ${6 * flip} 10
          Q ${-3 * flip} 10 ${-5 * flip} 6
        `,
        details: [
          `M ${-2 * flip} 2 Q ${4 * flip} 3 ${8 * flip} 2`,
        ],
        laces: style === ShoeStyle.OXFORDS
          ? [
              `M ${0 * flip} 1 L ${2 * flip} 0 L ${4 * flip} 1`,
              `M ${0 * flip} 3 L ${2 * flip} 2 L ${4 * flip} 3`,
            ]
          : [],
      };

    case ShoeStyle.SANDALS:
    case ShoeStyle.FLIP_FLOPS:
      return {
        main: '', // Sandals show feet
        sole: `
          M ${-4 * flip} 6
          Q ${-2 * flip} 10 ${6 * flip} 10
          Q ${11 * flip} 9 ${12 * flip} 6
          L ${12 * flip} 8
          Q ${11 * flip} 11 ${6 * flip} 12
          Q ${-2 * flip} 12 ${-4 * flip} 8
          Z
        `,
        details: [
          // Straps
          `M ${-2 * flip} 4 Q ${2 * flip} 2 ${6 * flip} 4`,
          style === ShoeStyle.SANDALS ? `M ${4 * flip} 2 L ${4 * flip} 8` : '',
        ].filter(Boolean),
      };

    case ShoeStyle.SLIPPERS:
      return {
        main: `
          M ${-4 * flip} 0
          Q ${-5 * flip} 3 ${-4 * flip} 6
          Q ${-2 * flip} 10 ${6 * flip} 10
          Q ${12 * flip} 9 ${13 * flip} 5
          Q ${12 * flip} 1 ${8 * flip} -1
          Q ${2 * flip} -2 ${-4 * flip} 0
          Z
        `,
        sole: `
          M ${-4 * flip} 6
          Q ${-2 * flip} 11 ${6 * flip} 11
          Q ${12 * flip} 10 ${13 * flip} 6
          L ${13 * flip} 5
          Q ${12 * flip} 9 ${6 * flip} 10
          Q ${-2 * flip} 10 ${-4 * flip} 6
        `,
        details: [],
      };

    case ShoeStyle.CROCS:
      return {
        main: `
          M ${-4 * flip} -2
          Q ${-6 * flip} 2 ${-5 * flip} 6
          Q ${-3 * flip} 11 ${6 * flip} 11
          Q ${13 * flip} 10 ${14 * flip} 5
          Q ${13 * flip} 0 ${9 * flip} -3
          Q ${3 * flip} -5 ${-4 * flip} -2
          Z
        `,
        sole: `
          M ${-5 * flip} 6
          Q ${-3 * flip} 13 ${6 * flip} 13
          Q ${13 * flip} 12 ${15 * flip} 6
          L ${14 * flip} 5
          Q ${13 * flip} 10 ${6 * flip} 11
          Q ${-3 * flip} 11 ${-5 * flip} 6
        `,
        details: [
          // Croc holes
          `M ${0 * flip} 2 A 1 1 0 1 1 ${0.1 * flip} 2`,
          `M ${3 * flip} 1 A 1 1 0 1 1 ${3.1 * flip} 1`,
          `M ${6 * flip} 2 A 1 1 0 1 1 ${6.1 * flip} 2`,
          `M ${1 * flip} 5 A 1 1 0 1 1 ${1.1 * flip} 5`,
          `M ${4 * flip} 4 A 1 1 0 1 1 ${4.1 * flip} 4`,
          `M ${7 * flip} 5 A 1 1 0 1 1 ${7.1 * flip} 5`,
        ],
      };

    case ShoeStyle.BAREFOOT:
    case ShoeStyle.SOCKS_ONLY:
    case ShoeStyle.NONE:
    default:
      return {
        main: '',
        sole: '',
        details: [],
      };
  }
}

interface SingleShoeProps {
  style: ShoeStyle;
  color: string;
  position: { x: number; y: number };
  isLeft: boolean;
  pose: LegPose;
  gradientId: string;
  soleGradientId: string;
}

function SingleShoe({
  style,
  color,
  position,
  isLeft,
  pose,
  gradientId,
  soleGradientId,
}: SingleShoeProps) {
  if (style === ShoeStyle.NONE || style === ShoeStyle.BAREFOOT) {
    return null;
  }

  const paths = getShoePaths(style, isLeft, pose);
  const shadowColor = adjustBrightness(color, -35);
  const highlightColor = adjustBrightness(color, 20);

  // Socks only - render simple sock shape
  if (style === ShoeStyle.SOCKS_ONLY) {
    return (
      <G transform={`translate(${position.x}, ${position.y})`}>
        <Path
          d={`
            M ${-3 * (isLeft ? 1 : -1)} -2
            Q ${-4 * (isLeft ? 1 : -1)} 1 ${-3 * (isLeft ? 1 : -1)} 4
            Q ${-1 * (isLeft ? 1 : -1)} 8 ${6 * (isLeft ? 1 : -1)} 8
            Q ${10 * (isLeft ? 1 : -1)} 7 ${10 * (isLeft ? 1 : -1)} 4
            Q ${9 * (isLeft ? 1 : -1)} 0 ${5 * (isLeft ? 1 : -1)} -2
            Q ${1 * (isLeft ? 1 : -1)} -3 ${-3 * (isLeft ? 1 : -1)} -2
            Z
          `}
          fill="#f5f5f5"
          stroke="#e0e0e0"
          strokeWidth={0.5}
        />
      </G>
    );
  }

  return (
    <G transform={`translate(${position.x}, ${position.y})`}>
      {/* Main shoe body */}
      {paths.main && <Path d={paths.main} fill={`url(#${gradientId})`} stroke={adjustBrightness(color, -40)} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />}

      {/* Sole */}
      {paths.sole && <Path d={paths.sole} fill={`url(#${soleGradientId})`} />}

      {/* Heel for heeled shoes */}
      {paths.heel && <Path d={paths.heel} fill={shadowColor} />}

      {/* Shoe details */}
      {paths.details.map((detail, index) => (
        <Path
          key={index}
          d={detail}
          stroke={shadowColor}
          strokeWidth={0.8}
          fill="none"
          opacity={0.5}
        />
      ))}

      {/* Laces */}
      {paths.laces?.map((lace, index) => (
        <Path
          key={`lace-${index}`}
          d={lace}
          stroke="#f5f5f5"
          strokeWidth={0.8}
          fill="none"
          opacity={0.9}
        />
      ))}

      {/* Highlight */}
      {paths.main && (
        <Ellipse
          cx={isLeft ? 3 : -3}
          cy={2}
          rx={4}
          ry={2}
          fill={highlightColor}
          opacity={0.2}
        />
      )}
    </G>
  );
}

export function Shoes({
  style,
  color,
  leftAnkle,
  rightAnkle,
  legPose,
  scale = 1,
}: ShoesProps) {
  // Use stable gradient IDs for consistent rendering (must be called before early return)
  const ids = useGradientIds<ShoesGradientIds>([
    'leftShoeGradient', 'rightShoeGradient', 'leftSoleGradient', 'rightSoleGradient'
  ]);

  if (style === ShoeStyle.NONE || style === ShoeStyle.BAREFOOT) {
    return null;
  }

  const shadowColor = adjustBrightness(color, -30);
  const highlightColor = adjustBrightness(color, 15);

  const leftGradientId = ids.leftShoeGradient;
  const rightGradientId = ids.rightShoeGradient;
  const leftSoleGradientId = ids.leftSoleGradient;
  const rightSoleGradientId = ids.rightSoleGradient;

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        <LinearGradient id={leftGradientId} x1="0%" y1="0%" x2="100%" y2="50%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="30%" stopColor={color} />
          <Stop offset="60%" stopColor={highlightColor} />
          <Stop offset="100%" stopColor={color} />
        </LinearGradient>
        <LinearGradient id={rightGradientId} x1="100%" y1="0%" x2="0%" y2="50%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="30%" stopColor={color} />
          <Stop offset="60%" stopColor={highlightColor} />
          <Stop offset="100%" stopColor={color} />
        </LinearGradient>
        <LinearGradient id={leftSoleGradientId} x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%" stopColor="#3d3d3d" />
          <Stop offset="100%" stopColor="#1a1a1a" />
        </LinearGradient>
        <LinearGradient id={rightSoleGradientId} x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%" stopColor="#3d3d3d" />
          <Stop offset="100%" stopColor="#1a1a1a" />
        </LinearGradient>
      </Defs>

      {/* Left shoe */}
      <SingleShoe
        style={style}
        color={color}
        position={leftAnkle}
        isLeft={true}
        pose={legPose}
        gradientId={leftGradientId}
        soleGradientId={leftSoleGradientId}
      />

      {/* Right shoe */}
      <SingleShoe
        style={style}
        color={color}
        position={rightAnkle}
        isLeft={false}
        pose={legPose}
        gradientId={rightGradientId}
        soleGradientId={rightSoleGradientId}
      />
    </G>
  );
}

export default Shoes;
