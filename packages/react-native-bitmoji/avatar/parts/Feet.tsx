/**
 * Feet Component - Anatomically accurate bare feet
 * Features proper heel, arch, ball, and individual toe definitions
 */

import React from 'react';
import { G, Path, Ellipse, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { LegPose, SvgPartProps } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

type FeetGradientIds = {
  leftFootGradient: string;
  rightFootGradient: string;
  leftToeGradient: string;
  rightToeGradient: string;
};

interface FeetProps extends SvgPartProps {
  skinTone: string;
  leftAnkle: { x: number; y: number };
  rightAnkle: { x: number; y: number };
  legPose: LegPose;
}

// Toe sizes (anatomically accurate - big toe largest)
const TOE_SIZES = {
  big: { width: 2.8, length: 3.5 },
  second: { width: 2.0, length: 3.8 }, // Often longest
  middle: { width: 1.8, length: 3.2 },
  fourth: { width: 1.6, length: 2.8 },
  pinky: { width: 1.4, length: 2.2 },
};

interface ToePath {
  outline: string;
  nailHint: { x: number; y: number; rx: number; ry: number };
}

interface FootPaths {
  main: string;
  heel: string;
  arch: string;
  ball: string;
  toes: ToePath[];
  metatarsals: string[];
  achillesTendon: string;
}

function getFootPaths(isLeft: boolean, pose: LegPose): FootPaths {
  const flip = isLeft ? 1 : -1;

  switch (pose) {
    case LegPose.SITTING: {
      // Top-down view with feet pointing forward/down
      return {
        main: `
          M ${-4 * flip} 0
          C ${-5 * flip} 2, ${-5 * flip} 6, ${-4 * flip} 10
          C ${-3 * flip} 13, ${0} 15, ${3 * flip} 15
          C ${6 * flip} 14, ${7 * flip} 12, ${6 * flip} 8
          C ${5 * flip} 4, ${4 * flip} 1, ${3 * flip} 0
          Q ${0} -1, ${-4 * flip} 0
          Z
        `,
        heel: `
          M ${-3 * flip} 1
          C ${-4 * flip} 2, ${-5 * flip} 4, ${-4 * flip} 6
          C ${-3 * flip} 8, ${-2 * flip} 6, ${-2 * flip} 4
        `,
        arch: `
          M ${-3 * flip} 8
          Q ${-2 * flip} 10, ${0} 11
        `,
        ball: `
          M ${0} 12
          C ${2 * flip} 13, ${4 * flip} 13, ${5 * flip} 11
        `,
        toes: [
          // Big toe
          {
            outline: `
              M ${-3 * flip} 13
              C ${-4 * flip} 14, ${-4 * flip} 16, ${-2 * flip} 17
              C ${0} 18, ${1 * flip} 16, ${0} 14
              L ${-1 * flip} 13
              Z
            `,
            nailHint: { x: -2 * flip, y: 15.5, rx: 1, ry: 0.6 },
          },
          // Second toe
          {
            outline: `
              M ${0} 14
              C ${0} 16, ${1 * flip} 18, ${2 * flip} 18
              C ${3 * flip} 17, ${3 * flip} 15, ${2 * flip} 14
              Z
            `,
            nailHint: { x: 1.5 * flip, y: 16.5, rx: 0.7, ry: 0.5 },
          },
          // Middle toe
          {
            outline: `
              M ${2 * flip} 13.5
              C ${2 * flip} 15, ${3 * flip} 17, ${4 * flip} 16.5
              C ${5 * flip} 16, ${5 * flip} 14, ${4 * flip} 13
              Z
            `,
            nailHint: { x: 3.5 * flip, y: 15, rx: 0.6, ry: 0.4 },
          },
          // Fourth toe
          {
            outline: `
              M ${4 * flip} 12.5
              C ${4 * flip} 14, ${5 * flip} 15.5, ${6 * flip} 15
              C ${6.5 * flip} 14, ${6 * flip} 12.5, ${5 * flip} 12
              Z
            `,
            nailHint: { x: 5 * flip, y: 13.5, rx: 0.5, ry: 0.35 },
          },
          // Pinky toe
          {
            outline: `
              M ${5.5 * flip} 11
              C ${6 * flip} 12, ${6.5 * flip} 13.5, ${7 * flip} 13
              C ${7.5 * flip} 12, ${7 * flip} 11, ${6 * flip} 10.5
              Z
            `,
            nailHint: { x: 6.5 * flip, y: 12, rx: 0.4, ry: 0.3 },
          },
        ],
        metatarsals: [
          `M ${-1 * flip} 6 Q ${0} 9, ${-1 * flip} 12`,
          `M ${1 * flip} 5 Q ${2 * flip} 8, ${1 * flip} 12`,
          `M ${3 * flip} 5 Q ${3 * flip} 8, ${3 * flip} 11`,
        ],
        achillesTendon: `
          M ${-2 * flip} 0
          Q ${-3 * flip} 2, ${-3 * flip} 4
        `,
      };
    }

    case LegPose.CROSSED:
    case LegPose.WIDE:
    case LegPose.STANDING:
    default: {
      // Side/three-quarter view for standing poses
      return {
        main: `
          M ${-4 * flip} 0
          C ${-5 * flip} 1, ${-6 * flip} 3, ${-5 * flip} 5
          C ${-4 * flip} 7, ${-2 * flip} 8, ${2 * flip} 8
          C ${6 * flip} 8, ${10 * flip} 7, ${12 * flip} 5
          C ${13 * flip} 3, ${12 * flip} 2, ${10 * flip} 1
          C ${7 * flip} 0, ${4 * flip} -1, ${0} -1
          C ${-2 * flip} -1, ${-4 * flip} 0, ${-4 * flip} 0
          Z
        `,
        heel: `
          M ${-4 * flip} 2
          C ${-6 * flip} 3, ${-6 * flip} 5, ${-5 * flip} 6
          C ${-4 * flip} 7, ${-3 * flip} 6, ${-3 * flip} 5
        `,
        arch: `
          M ${-3 * flip} 7
          C ${-1 * flip} 8, ${2 * flip} 8, ${4 * flip} 7
        `,
        ball: `
          M ${5 * flip} 6
          C ${7 * flip} 7, ${9 * flip} 6, ${10 * flip} 5
        `,
        toes: [
          // Big toe (most visible in side view)
          {
            outline: `
              M ${10 * flip} 3
              C ${11 * flip} 2, ${13 * flip} 3, ${13 * flip} 5
              C ${13 * flip} 6, ${12 * flip} 7, ${10 * flip} 6
              L ${10 * flip} 4
              Z
            `,
            nailHint: { x: 12 * flip, y: 4.5, rx: 0.8, ry: 0.5 },
          },
          // Second toe
          {
            outline: `
              M ${9 * flip} 5
              C ${10 * flip} 5, ${11 * flip} 6, ${11 * flip} 7
              C ${10 * flip} 8, ${9 * flip} 7, ${9 * flip} 6
              Z
            `,
            nailHint: { x: 10.2 * flip, y: 6.2, rx: 0.6, ry: 0.4 },
          },
          // Middle toe
          {
            outline: `
              M ${7 * flip} 6
              C ${8 * flip} 6, ${9 * flip} 7, ${9 * flip} 8
              C ${8 * flip} 8.5, ${7 * flip} 8, ${7 * flip} 7
              Z
            `,
            nailHint: { x: 8.2 * flip, y: 7, rx: 0.5, ry: 0.35 },
          },
          // Fourth toe
          {
            outline: `
              M ${5 * flip} 7
              C ${6 * flip} 7, ${7 * flip} 7.5, ${7 * flip} 8
              C ${6 * flip} 8.5, ${5 * flip} 8, ${5 * flip} 7.5
              Z
            `,
            nailHint: { x: 6 * flip, y: 7.5, rx: 0.4, ry: 0.3 },
          },
          // Pinky toe (barely visible)
          {
            outline: `
              M ${3 * flip} 7.5
              C ${4 * flip} 7.5, ${5 * flip} 8, ${5 * flip} 8.5
              C ${4 * flip} 8.5, ${3 * flip} 8, ${3 * flip} 7.8
              Z
            `,
            nailHint: { x: 4 * flip, y: 8, rx: 0.35, ry: 0.25 },
          },
        ],
        metatarsals: [
          // Tendons on top of foot
          `M ${2 * flip} 1 C ${4 * flip} 2, ${6 * flip} 3, ${9 * flip} 3`,
          `M ${1 * flip} 2 C ${3 * flip} 3, ${5 * flip} 4, ${7 * flip} 5`,
          `M ${0} 2.5 C ${2 * flip} 4, ${4 * flip} 5, ${5 * flip} 6`,
        ],
        achillesTendon: `
          M ${-3 * flip} 0
          C ${-4 * flip} 1, ${-5 * flip} 2, ${-5 * flip} 4
        `,
      };
    }
  }
}

interface SingleFootProps {
  skinTone: string;
  position: { x: number; y: number };
  isLeft: boolean;
  pose: LegPose;
  footGradientId: string;
  toeGradientId: string;
}

function SingleFoot({
  skinTone,
  position,
  isLeft,
  pose,
  footGradientId,
  toeGradientId,
}: SingleFootProps) {
  const paths = getFootPaths(isLeft, pose);
  const shadowColor = adjustBrightness(skinTone, -25);
  const highlightColor = adjustBrightness(skinTone, 15);
  const deepShadow = adjustBrightness(skinTone, -40);
  const flip = isLeft ? 1 : -1;

  return (
    <G transform={`translate(${position.x}, ${position.y})`}>
      {/* Achilles tendon connection */}
      <Path
        d={paths.achillesTendon}
        stroke={shadowColor}
        strokeWidth={2}
        fill="none"
        opacity={0.2}
      />

      {/* Main foot shape */}
      <Path d={paths.main} fill={`url(#${footGradientId})`} />

      {/* Heel definition */}
      <Path
        d={paths.heel}
        stroke={shadowColor}
        strokeWidth={1.2}
        fill="none"
        opacity={0.25}
      />

      {/* Arch shadow (creates depth) */}
      <Path
        d={paths.arch}
        stroke={shadowColor}
        strokeWidth={1}
        fill="none"
        opacity={0.3}
      />

      {/* Ball of foot highlight */}
      <Path
        d={paths.ball}
        stroke={highlightColor}
        strokeWidth={0.8}
        fill="none"
        opacity={0.2}
      />

      {/* Individual toes */}
      {paths.toes.map((toe, index) => (
        <G key={index}>
          {/* Toe body */}
          <Path d={toe.outline} fill={`url(#${toeGradientId})`} />

          {/* Toe shadow for separation */}
          <Path
            d={toe.outline}
            fill={shadowColor}
            opacity={0.08}
          />

          {/* Toenail hint - reduced opacity for subtlety */}
          <Ellipse
            cx={toe.nailHint.x}
            cy={toe.nailHint.y}
            rx={toe.nailHint.rx}
            ry={toe.nailHint.ry}
            fill={highlightColor}
            opacity={0.1}
          />
        </G>
      ))}

      {/* Top of foot highlight */}
      <Ellipse
        cx={3 * flip}
        cy={2}
        rx={3.5}
        ry={1.8}
        fill={highlightColor}
        opacity={0.12}
      />

      {/* Sole shadow (under foot) */}
      <Path
        d={`M ${-4 * flip} 7 Q ${2 * flip} 9, ${8 * flip} 7`}
        stroke={deepShadow}
        strokeWidth={0.8}
        fill="none"
        opacity={0.15}
      />
    </G>
  );
}

export function Feet({ skinTone, leftAnkle, rightAnkle, legPose, scale = 1 }: FeetProps) {
  const highlightColor = adjustBrightness(skinTone, 15);
  const shadowColor = adjustBrightness(skinTone, -20);
  const midTone = adjustBrightness(skinTone, -8);

  const ids = useGradientIds<FeetGradientIds>([
    'leftFootGradient',
    'rightFootGradient',
    'leftToeGradient',
    'rightToeGradient',
  ]);

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        {/* Main foot gradients */}
        <LinearGradient id={ids.leftFootGradient} x1="0%" y1="0%" x2="100%" y2="60%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="20%" stopColor={midTone} />
          <Stop offset="50%" stopColor={skinTone} />
          <Stop offset="75%" stopColor={highlightColor} />
          <Stop offset="100%" stopColor={skinTone} />
        </LinearGradient>
        <LinearGradient id={ids.rightFootGradient} x1="100%" y1="0%" x2="0%" y2="60%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="20%" stopColor={midTone} />
          <Stop offset="50%" stopColor={skinTone} />
          <Stop offset="75%" stopColor={highlightColor} />
          <Stop offset="100%" stopColor={skinTone} />
        </LinearGradient>

        {/* Toe gradients - radial for rounded appearance */}
        <RadialGradient id={ids.leftToeGradient} cx="40%" cy="30%" rx="70%" ry="70%">
          <Stop offset="0%" stopColor={highlightColor} />
          <Stop offset="50%" stopColor={skinTone} />
          <Stop offset="100%" stopColor={shadowColor} />
        </RadialGradient>
        <RadialGradient id={ids.rightToeGradient} cx="60%" cy="30%" rx="70%" ry="70%">
          <Stop offset="0%" stopColor={highlightColor} />
          <Stop offset="50%" stopColor={skinTone} />
          <Stop offset="100%" stopColor={shadowColor} />
        </RadialGradient>
      </Defs>

      {/* Left foot */}
      <SingleFoot
        skinTone={skinTone}
        position={leftAnkle}
        isLeft={true}
        pose={legPose}
        footGradientId={ids.leftFootGradient}
        toeGradientId={ids.leftToeGradient}
      />

      {/* Right foot */}
      <SingleFoot
        skinTone={skinTone}
        position={rightAnkle}
        isLeft={false}
        pose={legPose}
        footGradientId={ids.rightFootGradient}
        toeGradientId={ids.rightToeGradient}
      />
    </G>
  );
}

export default Feet;
