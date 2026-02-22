/**
 * Hands Component - Anatomically accurate hand rendering with 7 gesture variations
 * Features proper finger proportions, knuckle articulation, and palm anatomy
 */

import React from 'react';
import { G, Path, Ellipse, Defs, RadialGradient, LinearGradient, Stop } from 'react-native-svg';
import { HandGesture, SvgPartProps } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

type HandsGradientIds = {
  leftHandGradient: string;
  rightHandGradient: string;
  leftFingerGradient: string;
  rightFingerGradient: string;
};

interface HandsProps extends SvgPartProps {
  leftGesture: HandGesture;
  rightGesture: HandGesture;
  skinTone: string;
  leftPosition: { x: number; y: number };
  rightPosition: { x: number; y: number };
}

// Finger lengths relative to palm (anatomically accurate)
const FINGER_LENGTHS = {
  index: 10,
  middle: 11.5,
  ring: 10.5,
  pinky: 8,
  thumb: 7,
};

// Finger widths (base to tip) - increased for natural proportions
const FINGER_WIDTHS = {
  base: 3.2,
  middle: 2.6,
  tip: 2.0,
};

interface FingerPath {
  outline: string;
  knucklePos: { x: number; y: number };
}

interface HandPaths {
  palm: string;
  fingers: FingerPath[];
  thumb: string;
  thenarEminence?: string;
  hypothenarEminence?: string;
}

// Create anatomically tapered finger with proper curvature
function createFinger(
  baseX: number,
  baseY: number,
  tipX: number,
  tipY: number,
  length: number,
  isLeft: boolean,
  curl: number = 0 // 0 = straight, 1 = fully curled
): FingerPath {
  const dir = isLeft ? 1 : -1;
  const bw = FINGER_WIDTHS.base;
  const mw = FINGER_WIDTHS.middle;
  const tw = FINGER_WIDTHS.tip;

  // Calculate direction vector
  const dx = tipX - baseX;
  const dy = tipY - baseY;
  const dist = Math.sqrt(dx * dx + dy * dy) || length;
  const nx = dx / dist;
  const ny = dy / dist;

  // Perpendicular for width
  const px = -ny;
  const py = nx;

  // Control points for curl
  const midX = baseX + dx * 0.5 + curl * 4 * dir;
  const midY = baseY + dy * 0.5 + curl * 3;
  const mid2X = baseX + dx * 0.75 + curl * 6 * dir;
  const mid2Y = baseY + dy * 0.75 + curl * 5;

  const knuckleX = baseX + dx * 0.15;
  const knuckleY = baseY + dy * 0.15;

  const outline = `
    M ${baseX + px * bw / 2} ${baseY + py * bw / 2}
    C ${midX + px * mw / 2} ${midY + py * mw / 2},
      ${mid2X + px * tw / 2} ${mid2Y + py * tw / 2},
      ${tipX + px * tw / 2} ${tipY + py * tw / 2}
    Q ${tipX} ${tipY + 0.5},
      ${tipX - px * tw / 2} ${tipY - py * tw / 2}
    C ${mid2X - px * tw / 2} ${mid2Y - py * tw / 2},
      ${midX - px * mw / 2} ${midY - py * mw / 2},
      ${baseX - px * bw / 2} ${baseY - py * bw / 2}
    Z
  `;

  return { outline, knucklePos: { x: knuckleX, y: knuckleY } };
}

function getHandPaths(gesture: HandGesture, isLeft: boolean): HandPaths {
  const flip = isLeft ? 1 : -1;

  // Palm dimensions
  const palmWidth = 10;
  const palmHeight = 12;

  switch (gesture) {
    case HandGesture.FIST: {
      return {
        palm: `
          M ${-5 * flip} -4
          C ${-6 * flip} -1, ${-5 * flip} 3, ${-4 * flip} 6
          C ${-2 * flip} 8, ${2 * flip} 8, ${5 * flip} 6
          Q ${7 * flip} 4, ${7 * flip} 0
          Q ${6 * flip} -4, ${3 * flip} -5
          C ${0 * flip} -6, ${-3 * flip} -5, ${-5 * flip} -4
          Z
        `,
        fingers: [], // Fingers curled into fist
        thumb: `
          M ${-5 * flip} 0
          C ${-7 * flip} -2, ${-7 * flip} -5, ${-5 * flip} -6
          C ${-3 * flip} -7, ${-1 * flip} -5, ${-2 * flip} -3
          Q ${-3 * flip} -1, ${-4 * flip} 1
        `,
        thenarEminence: `
          M ${-4 * flip} 2
          Q ${-6 * flip} 4, ${-4 * flip} 6
          Q ${-2 * flip} 5, ${-3 * flip} 3
        `,
      };
    }

    case HandGesture.PEACE: {
      const indexFinger = createFinger(-1 * flip, -3, -2 * flip, -14, FINGER_LENGTHS.index, isLeft, 0);
      const middleFinger = createFinger(2 * flip, -3, 3 * flip, -15, FINGER_LENGTHS.middle, isLeft, 0);

      return {
        palm: `
          M ${-4 * flip} 0
          C ${-5 * flip} 3, ${-3 * flip} 6, ${0 * flip} 7
          C ${3 * flip} 8, ${6 * flip} 6, ${6 * flip} 3
          Q ${6 * flip} 0, ${5 * flip} -2
          L ${-3 * flip} -2
          Q ${-4 * flip} -1, ${-4 * flip} 0
          Z
        `,
        fingers: [indexFinger, middleFinger],
        thumb: `
          M ${-4 * flip} 3
          C ${-7 * flip} 2, ${-8 * flip} 4, ${-7 * flip} 6
          C ${-6 * flip} 7, ${-4 * flip} 6, ${-4 * flip} 5
        `,
        hypothenarEminence: `
          M ${5 * flip} 2
          Q ${6 * flip} 4, ${5 * flip} 5
          Q ${4 * flip} 4, ${4 * flip} 3
        `,
      };
    }

    case HandGesture.POINT: {
      const indexFinger = createFinger(0 * flip, -3, 0 * flip, -16, FINGER_LENGTHS.index + 2, isLeft, 0);

      return {
        palm: `
          M ${-4 * flip} 0
          C ${-5 * flip} 3, ${-3 * flip} 6, ${0 * flip} 7
          C ${3 * flip} 8, ${6 * flip} 6, ${6 * flip} 3
          Q ${6 * flip} 0, ${5 * flip} -2
          L ${-3 * flip} -2
          Q ${-4 * flip} -1, ${-4 * flip} 0
          Z
        `,
        fingers: [indexFinger],
        thumb: `
          M ${-4 * flip} 3
          C ${-7 * flip} 2, ${-8 * flip} 4, ${-7 * flip} 6
          C ${-6 * flip} 7, ${-4 * flip} 6, ${-4 * flip} 5
        `,
        // Curled fingers suggestion
        hypothenarEminence: `
          M ${4 * flip} -1
          Q ${6 * flip} 0, ${6 * flip} 2
          Q ${5 * flip} 3, ${4 * flip} 2
        `,
      };
    }

    case HandGesture.THUMBS_UP: {
      return {
        palm: `
          M ${-4 * flip} -2
          C ${-5 * flip} 1, ${-4 * flip} 5, ${-2 * flip} 7
          C ${1 * flip} 9, ${5 * flip} 8, ${6 * flip} 5
          Q ${7 * flip} 2, ${6 * flip} -1
          Q ${4 * flip} -3, ${1 * flip} -3
          C ${-2 * flip} -4, ${-4 * flip} -3, ${-4 * flip} -2
          Z
        `,
        fingers: [], // Fist with thumb up
        thumb: `
          M ${-2 * flip} -3
          C ${-3 * flip} -6, ${-2 * flip} -10, ${0 * flip} -12
          C ${2 * flip} -13, ${3 * flip} -11, ${2 * flip} -8
          C ${1 * flip} -5, ${0 * flip} -3, ${-1 * flip} -3
        `,
        thenarEminence: `
          M ${-3 * flip} 0
          Q ${-5 * flip} 2, ${-3 * flip} 4
          Q ${-1 * flip} 3, ${-2 * flip} 1
        `,
      };
    }

    case HandGesture.WAVE: {
      const indexFinger = createFinger(-2 * flip, -3, -4 * flip, -12, FINGER_LENGTHS.index, isLeft, 0.1);
      const middleFinger = createFinger(1 * flip, -3, 0 * flip, -14, FINGER_LENGTHS.middle, isLeft, 0.05);
      const ringFinger = createFinger(4 * flip, -2, 5 * flip, -12, FINGER_LENGTHS.ring, isLeft, 0.1);
      const pinkyFinger = createFinger(6 * flip, 0, 8 * flip, -8, FINGER_LENGTHS.pinky, isLeft, 0.15);

      return {
        palm: `
          M ${-5 * flip} 0
          C ${-6 * flip} 3, ${-4 * flip} 7, ${0 * flip} 8
          C ${4 * flip} 9, ${8 * flip} 6, ${8 * flip} 2
          Q ${7 * flip} -1, ${5 * flip} -2
          L ${-3 * flip} -3
          Q ${-5 * flip} -2, ${-5 * flip} 0
          Z
        `,
        fingers: [indexFinger, middleFinger, ringFinger, pinkyFinger],
        thumb: `
          M ${-5 * flip} 3
          C ${-8 * flip} 2, ${-10 * flip} 4, ${-9 * flip} 7
          C ${-8 * flip} 9, ${-5 * flip} 8, ${-5 * flip} 6
        `,
        thenarEminence: `
          M ${-4 * flip} 4
          Q ${-6 * flip} 5, ${-5 * flip} 7
          Q ${-3 * flip} 6, ${-3 * flip} 5
        `,
        hypothenarEminence: `
          M ${6 * flip} 3
          Q ${7 * flip} 5, ${6 * flip} 6
          Q ${5 * flip} 5, ${5 * flip} 4
        `,
      };
    }

    case HandGesture.HOLDING: {
      // Curved fingers as if holding something
      const indexFinger = createFinger(-1 * flip, -3, 1 * flip, -8, FINGER_LENGTHS.index, isLeft, 0.7);
      const middleFinger = createFinger(2 * flip, -3, 4 * flip, -9, FINGER_LENGTHS.middle, isLeft, 0.7);

      return {
        palm: `
          M ${-4 * flip} -1
          C ${-5 * flip} 2, ${-4 * flip} 5, ${-1 * flip} 7
          C ${2 * flip} 8, ${6 * flip} 6, ${6 * flip} 2
          Q ${5 * flip} -1, ${3 * flip} -3
          L ${-2 * flip} -3
          Q ${-4 * flip} -2, ${-4 * flip} -1
          Z
        `,
        fingers: [indexFinger, middleFinger],
        thumb: `
          M ${-4 * flip} 1
          C ${-6 * flip} -1, ${-7 * flip} 1, ${-6 * flip} 3
          C ${-5 * flip} 5, ${-3 * flip} 5, ${-4 * flip} 3
        `,
        thenarEminence: `
          M ${-3 * flip} 3
          Q ${-5 * flip} 4, ${-4 * flip} 6
          Q ${-2 * flip} 5, ${-2 * flip} 4
        `,
      };
    }

    case HandGesture.OPEN:
    default: {
      const indexFinger = createFinger(-2 * flip, -3, -3 * flip, -13, FINGER_LENGTHS.index, isLeft, 0);
      const middleFinger = createFinger(1 * flip, -3, 1 * flip, -15, FINGER_LENGTHS.middle, isLeft, 0);
      const ringFinger = createFinger(4 * flip, -2, 6 * flip, -12, FINGER_LENGTHS.ring, isLeft, 0);
      const pinkyFinger = createFinger(6 * flip, 0, 9 * flip, -8, FINGER_LENGTHS.pinky, isLeft, 0);

      return {
        palm: `
          M ${-5 * flip} 0
          C ${-6 * flip} 3, ${-4 * flip} 7, ${0 * flip} 8
          C ${4 * flip} 9, ${8 * flip} 6, ${8 * flip} 2
          Q ${7 * flip} -1, ${5 * flip} -2
          L ${-3 * flip} -3
          Q ${-5 * flip} -2, ${-5 * flip} 0
          Z
        `,
        fingers: [indexFinger, middleFinger, ringFinger, pinkyFinger],
        thumb: `
          M ${-5 * flip} 3
          C ${-9 * flip} 1, ${-11 * flip} 4, ${-10 * flip} 7
          C ${-9 * flip} 10, ${-6 * flip} 9, ${-5 * flip} 7
        `,
        thenarEminence: `
          M ${-4 * flip} 4
          Q ${-6 * flip} 5, ${-5 * flip} 7
          Q ${-3 * flip} 6, ${-3 * flip} 5
        `,
        hypothenarEminence: `
          M ${6 * flip} 3
          Q ${8 * flip} 5, ${7 * flip} 6
          Q ${5 * flip} 5, ${5 * flip} 4
        `,
      };
    }
  }
}

interface SingleHandProps {
  gesture: HandGesture;
  skinTone: string;
  position: { x: number; y: number };
  isLeft: boolean;
  palmGradientId: string;
  fingerGradientId: string;
}

function SingleHand({ gesture, skinTone, position, isLeft, palmGradientId, fingerGradientId }: SingleHandProps) {
  const paths = getHandPaths(gesture, isLeft);
  const shadowColor = adjustBrightness(skinTone, -25);
  const highlightColor = adjustBrightness(skinTone, 15);
  const deepShadow = adjustBrightness(skinTone, -40);
  const flip = isLeft ? 1 : -1;

  return (
    <G transform={`translate(${position.x}, ${position.y})`}>
      {/* Thenar eminence (thumb pad) */}
      {paths.thenarEminence && (
        <Path
          d={paths.thenarEminence}
          fill={skinTone}
          opacity={0.9}
        />
      )}

      {/* Hypothenar eminence (pinky side pad) */}
      {paths.hypothenarEminence && (
        <Path
          d={paths.hypothenarEminence}
          fill={skinTone}
          opacity={0.85}
        />
      )}

      {/* Palm */}
      <Path d={paths.palm} fill={`url(#${palmGradientId})`} />

      {/* Palm depth shadow */}
      <Path
        d={paths.palm}
        fill={shadowColor}
        opacity={0.08}
      />

      {/* Fingers */}
      {paths.fingers.map((finger, index) => (
        <G key={index}>
          {/* Finger body */}
          <Path d={finger.outline} fill={`url(#${fingerGradientId})`} />

          {/* Finger shadow for depth */}
          <Path
            d={finger.outline}
            fill={shadowColor}
            opacity={0.06}
          />

          {/* Knuckle highlight - reduced for natural appearance */}
          <Ellipse
            cx={finger.knucklePos.x}
            cy={finger.knucklePos.y}
            rx={1.2}
            ry={0.8}
            fill={highlightColor}
            opacity={0.08}
          />

          {/* Fingertip highlight for all visible fingers */}
          {(gesture === HandGesture.OPEN || gesture === HandGesture.WAVE ||
            gesture === HandGesture.PEACE || gesture === HandGesture.POINT) && (
            <Ellipse
              cx={finger.knucklePos.x + (isLeft ? -0.5 : 0.5)}
              cy={finger.knucklePos.y - 8}
              rx={0.8}
              ry={0.5}
              fill={highlightColor}
              opacity={0.15}
            />
          )}
        </G>
      ))}

      {/* Thumb */}
      <Path d={paths.thumb} fill={`url(#${palmGradientId})`} />
      <Path d={paths.thumb} fill={shadowColor} opacity={0.1} />

      {/* Palm creases for open/wave hands */}
      {(gesture === HandGesture.OPEN || gesture === HandGesture.WAVE) && (
        <G>
          {/* Heart line */}
          <Path
            d={`M ${(-3 * flip)} 1
                Q ${(-1 * flip)} 2, ${(2 * flip)} 1.5
                Q ${(4 * flip)} 1, ${(5 * flip)} 2`}
            stroke={shadowColor}
            strokeWidth={0.35}
            fill="none"
            opacity={0.25}
          />
          {/* Head line */}
          <Path
            d={`M ${(-3 * flip)} 3
                Q ${(0 * flip)} 4, ${(3 * flip)} 3.5
                Q ${(5 * flip)} 3, ${(6 * flip)} 4`}
            stroke={shadowColor}
            strokeWidth={0.3}
            fill="none"
            opacity={0.2}
          />
          {/* Life line */}
          <Path
            d={`M ${(-2 * flip)} 0
                C ${(-3 * flip)} 2, ${(-4 * flip)} 4, ${(-3 * flip)} 6`}
            stroke={shadowColor}
            strokeWidth={0.35}
            fill="none"
            opacity={0.22}
          />
        </G>
      )}

      {/* Knuckle ridge for fist/holding */}
      {(gesture === HandGesture.FIST || gesture === HandGesture.HOLDING ||
        gesture === HandGesture.THUMBS_UP) && (
        <G>
          {/* Knuckle bumps */}
          <Ellipse
            cx={-2 * flip}
            cy={-2}
            rx={1.5}
            ry={1}
            fill={highlightColor}
            opacity={0.3}
          />
          <Ellipse
            cx={1 * flip}
            cy={-2.5}
            rx={1.5}
            ry={1}
            fill={highlightColor}
            opacity={0.3}
          />
          <Ellipse
            cx={4 * flip}
            cy={-2}
            rx={1.3}
            ry={0.9}
            fill={highlightColor}
            opacity={0.25}
          />
          {/* Shadow between knuckles */}
          <Path
            d={`M ${(-3 * flip)} -1 Q ${(0 * flip)} -3, ${(5 * flip)} -1`}
            stroke={deepShadow}
            strokeWidth={0.4}
            fill="none"
            opacity={0.15}
          />
        </G>
      )}

      {/* Wrist connection hint */}
      <Ellipse
        cx={0}
        cy={8}
        rx={4}
        ry={1.5}
        fill={shadowColor}
        opacity={0.1}
      />
    </G>
  );
}

export function Hands({
  leftGesture,
  rightGesture,
  skinTone,
  leftPosition,
  rightPosition,
  scale = 1,
}: HandsProps) {
  const highlightColor = adjustBrightness(skinTone, 15);
  const shadowColor = adjustBrightness(skinTone, -20);
  const midTone = adjustBrightness(skinTone, -5);

  const ids = useGradientIds<HandsGradientIds>([
    'leftHandGradient',
    'rightHandGradient',
    'leftFingerGradient',
    'rightFingerGradient',
  ]);

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        {/* Palm gradients - radial for natural curvature */}
        <RadialGradient id={ids.leftHandGradient} cx="35%" cy="35%" rx="65%" ry="65%">
          <Stop offset="0%" stopColor={highlightColor} />
          <Stop offset="40%" stopColor={skinTone} />
          <Stop offset="80%" stopColor={midTone} />
          <Stop offset="100%" stopColor={shadowColor} />
        </RadialGradient>
        <RadialGradient id={ids.rightHandGradient} cx="65%" cy="35%" rx="65%" ry="65%">
          <Stop offset="0%" stopColor={highlightColor} />
          <Stop offset="40%" stopColor={skinTone} />
          <Stop offset="80%" stopColor={midTone} />
          <Stop offset="100%" stopColor={shadowColor} />
        </RadialGradient>

        {/* Finger gradients - linear for cylindrical appearance */}
        <LinearGradient id={ids.leftFingerGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="30%" stopColor={skinTone} />
          <Stop offset="50%" stopColor={highlightColor} />
          <Stop offset="70%" stopColor={skinTone} />
          <Stop offset="100%" stopColor={shadowColor} />
        </LinearGradient>
        <LinearGradient id={ids.rightFingerGradient} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="30%" stopColor={skinTone} />
          <Stop offset="50%" stopColor={highlightColor} />
          <Stop offset="70%" stopColor={skinTone} />
          <Stop offset="100%" stopColor={shadowColor} />
        </LinearGradient>
      </Defs>

      {/* Left hand */}
      <SingleHand
        gesture={leftGesture}
        skinTone={skinTone}
        position={leftPosition}
        isLeft={true}
        palmGradientId={ids.leftHandGradient}
        fingerGradientId={ids.leftFingerGradient}
      />

      {/* Right hand */}
      <SingleHand
        gesture={rightGesture}
        skinTone={skinTone}
        position={rightPosition}
        isLeft={false}
        palmGradientId={ids.rightHandGradient}
        fingerGradientId={ids.rightFingerGradient}
      />
    </G>
  );
}

export default Hands;
