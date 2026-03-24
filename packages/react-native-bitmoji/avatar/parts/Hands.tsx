/**
 * Hands Component - Simplified finger-silhouette hands
 *
 * Hands have subtle finger bumps rather than rounded mitten blobs.
 * Hand is ~6 units wide, ~8 units tall — small relative to arm.
 */

import React from 'react';
import { G, Path, Ellipse } from 'react-native-svg';
import { HandGesture, SvgPartProps } from '../types';
import { adjustBrightness } from '../utils';

interface HandsProps extends SvgPartProps {
  leftGesture: HandGesture;
  rightGesture: HandGesture;
  skinTone: string;
  leftPosition: { x: number; y: number };
  rightPosition: { x: number; y: number };
  leftRotation?: number;
  rightRotation?: number;
}

interface HandPaths {
  main: string;
  thumbCx: number;
  thumbCy: number;
  thumbRx: number;
  thumbRy: number;
}

/**
 * Returns a hand path centered at (0,0) with finger-silhouette edges.
 * Wrist at top (y~0), fingertips at bottom (y~6).
 */
function getHandPaths(gesture: HandGesture, isLeft: boolean): HandPaths {
  const flip = isLeft ? 1 : -1;

  switch (gesture) {
    case HandGesture.FIST:
      // Compact blob, slightly squared off
      return {
        main: `
          M 0,-2
          C ${2.2 * flip},-2 ${2.8 * flip},-0.5 ${2.8 * flip},1.5
          C ${2.8 * flip},3.5 ${1.8 * flip},5 0,5
          C ${-1.8 * flip},5 ${-2.8 * flip},3.5 ${-2.8 * flip},1.5
          C ${-2.8 * flip},-0.5 ${-2.2 * flip},-2 0,-2
          Z
        `,
        thumbCx: -2.5 * flip,
        thumbCy: 1,
        thumbRx: 1.0,
        thumbRy: 1.5,
      };

    case HandGesture.THUMBS_UP:
      // Fist with thumb extending upward
      return {
        main: `
          M 0,-2
          C ${2.2 * flip},-2 ${2.8 * flip},-0.5 ${2.8 * flip},1.5
          C ${2.8 * flip},3.5 ${1.8 * flip},5 0,5
          C ${-1.8 * flip},5 ${-2.8 * flip},3.5 ${-2.8 * flip},1.5
          C ${-2.8 * flip},-0.5 ${-2.2 * flip},-2 0,-2
          Z
        `,
        thumbCx: -1.5 * flip,
        thumbCy: -3.5,
        thumbRx: 1.0,
        thumbRy: 2.0,
      };

    case HandGesture.THUMBS_DOWN:
      // Fist with thumb extending downward
      return {
        main: `
          M 0,-2
          C ${2.2 * flip},-2 ${2.8 * flip},-0.5 ${2.8 * flip},1.5
          C ${2.8 * flip},3.5 ${1.8 * flip},5 0,5
          C ${-1.8 * flip},5 ${-2.8 * flip},3.5 ${-2.8 * flip},1.5
          C ${-2.8 * flip},-0.5 ${-2.2 * flip},-2 0,-2
          Z
        `,
        thumbCx: -1.5 * flip,
        thumbCy: 6.5,
        thumbRx: 1.0,
        thumbRy: 2.0,
      };

    case HandGesture.PEACE:
      // Fist base with two extended finger bumps (index + middle)
      return {
        main: `
          M 0,-2
          C ${2.2 * flip},-2 ${2.8 * flip},-0.5 ${2.8 * flip},1.5
          C ${2.8 * flip},3.5 ${1.8 * flip},5 0,5
          C ${-1.8 * flip},5 ${-2.8 * flip},3.5 ${-2.8 * flip},1.5
          C ${-2.8 * flip},-0.5 ${-2.2 * flip},-2 0,-2
          Z
          M ${0.5 * flip},-2
          C ${0.8 * flip},-2.5 ${1.2 * flip},-5.5 ${1 * flip},-6
          C ${0.8 * flip},-6.3 ${0.3 * flip},-6.3 ${0.2 * flip},-6
          C ${0 * flip},-5 ${0.2 * flip},-2.5 ${0.5 * flip},-2
          Z
          M ${-1 * flip},-2
          C ${-0.7 * flip},-2.5 ${-0.3 * flip},-5.5 ${-0.5 * flip},-6
          C ${-0.7 * flip},-6.3 ${-1.2 * flip},-6.3 ${-1.3 * flip},-6
          C ${-1.5 * flip},-5 ${-1.3 * flip},-2.5 ${-1 * flip},-2
          Z
        `,
        thumbCx: -2.5 * flip,
        thumbCy: 1,
        thumbRx: 1.0,
        thumbRy: 1.5,
      };

    case HandGesture.POINT:
      // Fist with single finger extending upward
      return {
        main: `
          M 0,-2
          C ${2.2 * flip},-2 ${2.8 * flip},-0.5 ${2.8 * flip},1.5
          C ${2.8 * flip},3.5 ${1.8 * flip},5 0,5
          C ${-1.8 * flip},5 ${-2.8 * flip},3.5 ${-2.8 * flip},1.5
          C ${-2.8 * flip},-0.5 ${-2.2 * flip},-2 0,-2
          Z
          M ${0 * flip},-2
          C ${0.3 * flip},-2.5 ${0.7 * flip},-5.8 ${0.5 * flip},-6.5
          C ${0.3 * flip},-6.8 ${-0.3 * flip},-6.8 ${-0.5 * flip},-6.5
          C ${-0.7 * flip},-5.8 ${-0.3 * flip},-2.5 ${0 * flip},-2
          Z
        `,
        thumbCx: -2.5 * flip,
        thumbCy: 1,
        thumbRx: 1.0,
        thumbRy: 1.5,
      };

    case HandGesture.WAVE:
    case HandGesture.OK:
    case HandGesture.ROCK_ON_GESTURE:
    case HandGesture.HOLDING:
    case HandGesture.FINGER_GUN:
    case HandGesture.RELAXED:
    case HandGesture.OPEN:
    default:
      // Open hand with separated thumb and finger group (4 fingers together)
      return {
        main: `
          M 0,-2
          C ${0.5 * flip},-2.5 ${1 * flip},-2.8 ${1.5 * flip},-2.5
          L ${1.8 * flip},-1.5
          C ${2 * flip},-1 ${2.2 * flip},-0.5 ${2.5 * flip},0
          L ${2.8 * flip},1
          C ${3 * flip},2 ${3 * flip},3.5 ${2.8 * flip},4.5
          L ${2.5 * flip},5
          C ${2.2 * flip},5.5 ${1.8 * flip},6 ${1.5 * flip},6
          L ${1 * flip},5.8
          C ${0.8 * flip},5.8 ${0.5 * flip},6 ${0.3 * flip},5.8
          L ${0 * flip},5.6
          C ${-0.2 * flip},5.8 ${-0.5 * flip},6 ${-0.8 * flip},5.8
          L ${-1.2 * flip},5.6
          C ${-1.5 * flip},5.5 ${-1.8 * flip},5 ${-2 * flip},4.5
          L ${-2.2 * flip},3
          C ${-2.5 * flip},2 ${-2.5 * flip},1 ${-2.3 * flip},0
          C ${-2 * flip},-1 ${-1.5 * flip},-1.5 ${-1 * flip},-2
          C ${-0.5 * flip},-2.3 0,-2.5 0,-2
          Z
          M ${1.2 * flip},4.8 L ${1.4 * flip},5.8
          M ${0.5 * flip},4.9 L ${0.5 * flip},5.9
          M ${-0.3 * flip},4.9 L ${-0.3 * flip},5.9
          M ${-1 * flip},4.8 L ${-1.2 * flip},5.8
        `,
        thumbCx: -3.2 * flip,
        thumbCy: 1.5,
        thumbRx: 1.3,
        thumbRy: 2,
      };
  }
}

interface SingleHandProps {
  gesture: HandGesture;
  skinTone: string;
  position: { x: number; y: number };
  isLeft: boolean;
  rotation?: number;
}

function SingleHand({ gesture, skinTone, position, isLeft, rotation = 0 }: SingleHandProps) {
  const paths = getHandPaths(gesture, isLeft);
  const outlineColor = adjustBrightness(skinTone, -30);
  const knuckleColor = adjustBrightness(skinTone, -15);

  const transform = rotation !== 0
    ? `translate(${position.x}, ${position.y}) rotate(${rotation})`
    : `translate(${position.x}, ${position.y})`;

  const flip = isLeft ? 1 : -1;

  return (
    <G transform={transform}>
      {/* Main hand shape with finger separation */}
      <Path
        d={paths.main}
        fill={skinTone}
        stroke={outlineColor}
        strokeWidth={0.35}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Thumb with proper wrist transition */}
      <Ellipse
        cx={paths.thumbCx}
        cy={paths.thumbCy}
        rx={paths.thumbRx}
        ry={paths.thumbRy}
        fill={skinTone}
        stroke={outlineColor}
        strokeWidth={0.3}
      />

      {/* Knuckle suggestion lines for open hands */}
      {(gesture === HandGesture.OPEN || gesture === HandGesture.WAVE || gesture === HandGesture.RELAXED) && (
        <G opacity={0.12}>
          <Path d={`M ${0.8 * flip},2 L ${0.8 * flip},3.5`} stroke={knuckleColor} strokeWidth={0.25} />
          <Path d={`M ${0.2 * flip},2.2 L ${0.2 * flip},3.8`} stroke={knuckleColor} strokeWidth={0.25} />
          <Path d={`M ${-0.5 * flip},2.2 L ${-0.5 * flip},3.8`} stroke={knuckleColor} strokeWidth={0.25} />
        </G>
      )}

    </G>
  );
}

export function Hands({
  leftGesture,
  rightGesture,
  skinTone,
  leftPosition,
  rightPosition,
  leftRotation = 0,
  rightRotation = 0,
  scale = 1,
}: HandsProps) {
  return (
    <G transform={`scale(${scale})`}>
      {/* Left hand */}
      <SingleHand
        gesture={leftGesture}
        skinTone={skinTone}
        position={leftPosition}
        isLeft={true}
        rotation={leftRotation}
      />

      {/* Right hand */}
      <SingleHand
        gesture={rightGesture}
        skinTone={skinTone}
        position={rightPosition}
        isLeft={false}
        rotation={rightRotation}
      />
    </G>
  );
}

export default Hands;
