/**
 * Hands Component - Simple mitten-style hands
 *
 * All gestures use a basic rounded mitten/paddle shape.
 * No individual fingers, no negative-Y spikes.
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
 * Returns a simple mitten hand path centered at (0,0).
 * The mitten extends downward (positive Y) from the wrist.
 * All gestures are minor variations of the same basic paddle.
 */
function getHandPaths(gesture: HandGesture, isLeft: boolean): HandPaths {
  const flip = isLeft ? 1 : -1;

  // Base mitten: ~6 wide, ~8 tall, rounded rectangle
  // Wrist at top (y=0), fingers at bottom (y=8)
  switch (gesture) {
    case HandGesture.FIST:
      // Compact rounded blob — shorter, wider
      return {
        main: `
          M 0,-2
          C ${2.5 * flip},-2 ${3 * flip},0 ${3 * flip},2
          C ${3 * flip},4 ${2 * flip},5.5 0,5.5
          C ${-2 * flip},5.5 ${-3 * flip},4 ${-3 * flip},2
          C ${-3 * flip},0 ${-2.5 * flip},-2 0,-2
          Z
        `,
        thumbCx: -2.8 * flip,
        thumbCy: 1,
        thumbRx: 1.0,
        thumbRy: 1.5,
      };

    case HandGesture.THUMBS_UP:
      // Fist with thumb bump on top
      return {
        main: `
          M 0,-2
          C ${2.5 * flip},-2 ${3 * flip},0 ${3 * flip},2
          C ${3 * flip},4 ${2 * flip},5.5 0,5.5
          C ${-2 * flip},5.5 ${-3 * flip},4 ${-3 * flip},2
          C ${-3 * flip},0 ${-2.5 * flip},-2 0,-2
          Z
        `,
        thumbCx: -1.5 * flip,
        thumbCy: -3.5,
        thumbRx: 1.0,
        thumbRy: 2.0,
      };

    case HandGesture.THUMBS_DOWN:
      // Fist with thumb bump on bottom
      return {
        main: `
          M 0,-2
          C ${2.5 * flip},-2 ${3 * flip},0 ${3 * flip},2
          C ${3 * flip},4 ${2 * flip},5.5 0,5.5
          C ${-2 * flip},5.5 ${-3 * flip},4 ${-3 * flip},2
          C ${-3 * flip},0 ${-2.5 * flip},-2 0,-2
          Z
        `,
        thumbCx: -1.5 * flip,
        thumbCy: 7,
        thumbRx: 1.0,
        thumbRy: 2.0,
      };

    case HandGesture.PEACE:
    case HandGesture.POINT:
    case HandGesture.WAVE:
    case HandGesture.OK:
    case HandGesture.ROCK_ON_GESTURE:
    case HandGesture.HOLDING:
    case HandGesture.FINGER_GUN:
    case HandGesture.RELAXED:
    case HandGesture.OPEN:
    default:
      // Standard open mitten — rounded rectangle paddle
      return {
        main: `
          M 0,-3
          C ${1.5 * flip},-3 ${3 * flip},-1.5 ${3 * flip},0
          L ${3 * flip},3
          C ${3 * flip},5 ${1.5 * flip},6 0,6
          C ${-1.5 * flip},6 ${-3 * flip},5 ${-3 * flip},3
          L ${-3 * flip},0
          C ${-3 * flip},-1.5 ${-1.5 * flip},-3 0,-3
          Z
        `,
        thumbCx: -3 * flip,
        thumbCy: 1,
        thumbRx: 1.2,
        thumbRy: 1.8,
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

  const transform = rotation !== 0
    ? `translate(${position.x}, ${position.y}) rotate(${rotation})`
    : `translate(${position.x}, ${position.y})`;

  return (
    <G transform={transform}>
      {/* Main mitten shape */}
      <Path
        d={paths.main}
        fill={skinTone}
        stroke={outlineColor}
        strokeWidth={0.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Thumb */}
      <Ellipse
        cx={paths.thumbCx}
        cy={paths.thumbCy}
        rx={paths.thumbRx}
        ry={paths.thumbRy}
        fill={skinTone}
        stroke={outlineColor}
        strokeWidth={0.4}
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
