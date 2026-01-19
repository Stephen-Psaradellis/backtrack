/**
 * Eyes Component - Multiple eye styles with color
 *
 * Renders different eye styles including default, wink, happy, surprised, etc.
 * Supports custom eye colors with realistic pupil rendering.
 */

import React from 'react';
import { G, Circle, Ellipse, Path } from 'react-native-svg';
import { EyeStyle, SvgPartProps } from '../types';

interface EyesProps extends SvgPartProps {
  style: EyeStyle;
  eyeColor: string;
}

// Eye positioning constants
const LEFT_EYE_X = 38;
const RIGHT_EYE_X = 62;
const EYE_Y = 44;
const EYE_RADIUS = 5;

/**
 * Render a single default eye with color
 */
function DefaultEye({
  cx,
  cy,
  eyeColor,
  radius = EYE_RADIUS,
  lookDirection = 0,
}: {
  cx: number;
  cy: number;
  eyeColor: string;
  radius?: number;
  lookDirection?: number;
}) {
  const irisRadius = radius * 0.7;
  const pupilRadius = radius * 0.35;
  const highlightRadius = radius * 0.2;

  return (
    <G>
      {/* Eye white */}
      <Ellipse
        cx={cx}
        cy={cy}
        rx={radius}
        ry={radius * 0.85}
        fill="white"
      />
      {/* Eye outline */}
      <Ellipse
        cx={cx}
        cy={cy}
        rx={radius}
        ry={radius * 0.85}
        fill="none"
        stroke="#3a3a3a"
        strokeWidth={0.5}
      />
      {/* Iris */}
      <Circle
        cx={cx + lookDirection}
        cy={cy}
        r={irisRadius}
        fill={eyeColor}
      />
      {/* Pupil */}
      <Circle
        cx={cx + lookDirection}
        cy={cy}
        r={pupilRadius}
        fill="#1a1a1a"
      />
      {/* Highlight (gives life to the eye) */}
      <Circle
        cx={cx + lookDirection - radius * 0.2}
        cy={cy - radius * 0.2}
        r={highlightRadius}
        fill="white"
        opacity={0.9}
      />
      {/* Secondary highlight */}
      <Circle
        cx={cx + lookDirection + radius * 0.15}
        cy={cy + radius * 0.15}
        r={highlightRadius * 0.5}
        fill="white"
        opacity={0.5}
      />
    </G>
  );
}

/**
 * Render closed eye (curved line)
 */
function ClosedEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <Path
      d={`M${cx - 5},${cy} Q${cx},${cy + 3} ${cx + 5},${cy}`}
      fill="none"
      stroke="#2c2c2c"
      strokeWidth={2}
      strokeLinecap="round"
    />
  );
}

/**
 * Render happy eye (upward curved line)
 */
function HappyEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <Path
      d={`M${cx - 5},${cy + 2} Q${cx},${cy - 3} ${cx + 5},${cy + 2}`}
      fill="none"
      stroke="#2c2c2c"
      strokeWidth={2}
      strokeLinecap="round"
    />
  );
}

/**
 * Render heart-shaped eye
 */
function HeartEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <Path
      d={`M${cx},${cy + 4}
         L${cx - 5},${cy}
         A3,3 0 1,1 ${cx},${cy - 3}
         A3,3 0 1,1 ${cx + 5},${cy}
         Z`}
      fill="#e91e63"
    />
  );
}

/**
 * Render star-shaped eye
 */
function StarEye({ cx, cy }: { cx: number; cy: number }) {
  const size = 5;
  const innerSize = size * 0.4;
  const points = 5;
  let path = '';

  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? size : innerSize;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    path += `${i === 0 ? 'M' : 'L'}${x},${y} `;
  }
  path += 'Z';

  return <Path d={path} fill="#ffc107" />;
}

/**
 * Render dizzy eye (spiral)
 */
function DizzyEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G>
      <Circle
        cx={cx}
        cy={cy}
        r={5}
        fill="none"
        stroke="#2c2c2c"
        strokeWidth={1.5}
      />
      <Path
        d={`M${cx - 3},${cy - 3} L${cx + 3},${cy + 3} M${cx + 3},${cy - 3} L${cx - 3},${cy + 3}`}
        stroke="#2c2c2c"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </G>
  );
}

/**
 * Render cry eye (with tear)
 */
function CryEye({
  cx,
  cy,
  eyeColor,
}: {
  cx: number;
  cy: number;
  eyeColor: string;
}) {
  return (
    <G>
      <DefaultEye cx={cx} cy={cy} eyeColor={eyeColor} />
      {/* Tear */}
      <Path
        d={`M${cx + 3},${cy + 6} Q${cx + 5},${cy + 10} ${cx + 3},${cy + 14}`}
        fill="#64b5f6"
      />
      <Ellipse
        cx={cx + 3}
        cy={cy + 14}
        rx={2}
        ry={2.5}
        fill="#64b5f6"
      />
    </G>
  );
}

export function Eyes({ style, eyeColor, scale = 1 }: EyesProps) {
  return (
    <G transform={`scale(${scale})`}>
      {(() => {
        switch (style) {
          case EyeStyle.CLOSED:
            return (
              <G>
                <ClosedEye cx={LEFT_EYE_X} cy={EYE_Y} />
                <ClosedEye cx={RIGHT_EYE_X} cy={EYE_Y} />
              </G>
            );

          case EyeStyle.HAPPY:
            return (
              <G>
                <HappyEye cx={LEFT_EYE_X} cy={EYE_Y} />
                <HappyEye cx={RIGHT_EYE_X} cy={EYE_Y} />
              </G>
            );

          case EyeStyle.WINK:
            return (
              <G>
                <DefaultEye cx={LEFT_EYE_X} cy={EYE_Y} eyeColor={eyeColor} />
                <ClosedEye cx={RIGHT_EYE_X} cy={EYE_Y} />
              </G>
            );

          case EyeStyle.WINK_LEFT:
            return (
              <G>
                <ClosedEye cx={LEFT_EYE_X} cy={EYE_Y} />
                <DefaultEye cx={RIGHT_EYE_X} cy={EYE_Y} eyeColor={eyeColor} />
              </G>
            );

          case EyeStyle.SLEEPY:
            return (
              <G>
                {/* Half-closed eyes */}
                <G>
                  <Ellipse cx={LEFT_EYE_X} cy={EYE_Y} rx={5} ry={3} fill="white" />
                  <Ellipse cx={LEFT_EYE_X} cy={EYE_Y} rx={5} ry={3} fill="none" stroke="#3a3a3a" strokeWidth={0.5} />
                  <Ellipse cx={LEFT_EYE_X} cy={EYE_Y + 1} rx={3} ry={2} fill={eyeColor} />
                  <Circle cx={LEFT_EYE_X} cy={EYE_Y + 1} r={1} fill="#1a1a1a" />
                </G>
                <G>
                  <Ellipse cx={RIGHT_EYE_X} cy={EYE_Y} rx={5} ry={3} fill="white" />
                  <Ellipse cx={RIGHT_EYE_X} cy={EYE_Y} rx={5} ry={3} fill="none" stroke="#3a3a3a" strokeWidth={0.5} />
                  <Ellipse cx={RIGHT_EYE_X} cy={EYE_Y + 1} rx={3} ry={2} fill={eyeColor} />
                  <Circle cx={RIGHT_EYE_X} cy={EYE_Y + 1} r={1} fill="#1a1a1a" />
                </G>
              </G>
            );

          case EyeStyle.SURPRISED:
            return (
              <G>
                <DefaultEye cx={LEFT_EYE_X} cy={EYE_Y} eyeColor={eyeColor} radius={6.5} />
                <DefaultEye cx={RIGHT_EYE_X} cy={EYE_Y} eyeColor={eyeColor} radius={6.5} />
              </G>
            );

          case EyeStyle.WIDE:
            return (
              <G>
                <DefaultEye cx={LEFT_EYE_X} cy={EYE_Y} eyeColor={eyeColor} radius={6} />
                <DefaultEye cx={RIGHT_EYE_X} cy={EYE_Y} eyeColor={eyeColor} radius={6} />
              </G>
            );

          case EyeStyle.NARROW:
            return (
              <G>
                <DefaultEye cx={LEFT_EYE_X} cy={EYE_Y} eyeColor={eyeColor} radius={4} />
                <DefaultEye cx={RIGHT_EYE_X} cy={EYE_Y} eyeColor={eyeColor} radius={4} />
              </G>
            );

          case EyeStyle.SQUINT:
            return (
              <G>
                <Ellipse cx={LEFT_EYE_X} cy={EYE_Y} rx={5} ry={2.5} fill="white" />
                <Ellipse cx={LEFT_EYE_X} cy={EYE_Y} rx={5} ry={2.5} fill="none" stroke="#3a3a3a" strokeWidth={0.5} />
                <Ellipse cx={LEFT_EYE_X} cy={EYE_Y} rx={2.5} ry={2} fill={eyeColor} />
                <Circle cx={LEFT_EYE_X} cy={EYE_Y} r={1} fill="#1a1a1a" />

                <Ellipse cx={RIGHT_EYE_X} cy={EYE_Y} rx={5} ry={2.5} fill="white" />
                <Ellipse cx={RIGHT_EYE_X} cy={EYE_Y} rx={5} ry={2.5} fill="none" stroke="#3a3a3a" strokeWidth={0.5} />
                <Ellipse cx={RIGHT_EYE_X} cy={EYE_Y} rx={2.5} ry={2} fill={eyeColor} />
                <Circle cx={RIGHT_EYE_X} cy={EYE_Y} r={1} fill="#1a1a1a" />
              </G>
            );

          case EyeStyle.SIDE:
            return (
              <G>
                <DefaultEye cx={LEFT_EYE_X} cy={EYE_Y} eyeColor={eyeColor} lookDirection={2} />
                <DefaultEye cx={RIGHT_EYE_X} cy={EYE_Y} eyeColor={eyeColor} lookDirection={2} />
              </G>
            );

          case EyeStyle.ROLL:
            return (
              <G>
                <Ellipse cx={LEFT_EYE_X} cy={EYE_Y} rx={5} ry={4.5} fill="white" />
                <Ellipse cx={LEFT_EYE_X} cy={EYE_Y} rx={5} ry={4.5} fill="none" stroke="#3a3a3a" strokeWidth={0.5} />
                <Circle cx={LEFT_EYE_X} cy={EYE_Y - 2} r={3} fill={eyeColor} />
                <Circle cx={LEFT_EYE_X} cy={EYE_Y - 2} r={1.5} fill="#1a1a1a" />

                <Ellipse cx={RIGHT_EYE_X} cy={EYE_Y} rx={5} ry={4.5} fill="white" />
                <Ellipse cx={RIGHT_EYE_X} cy={EYE_Y} rx={5} ry={4.5} fill="none" stroke="#3a3a3a" strokeWidth={0.5} />
                <Circle cx={RIGHT_EYE_X} cy={EYE_Y - 2} r={3} fill={eyeColor} />
                <Circle cx={RIGHT_EYE_X} cy={EYE_Y - 2} r={1.5} fill="#1a1a1a" />
              </G>
            );

          case EyeStyle.HEARTS:
            return (
              <G>
                <HeartEye cx={LEFT_EYE_X} cy={EYE_Y} />
                <HeartEye cx={RIGHT_EYE_X} cy={EYE_Y} />
              </G>
            );

          case EyeStyle.STARS:
            return (
              <G>
                <StarEye cx={LEFT_EYE_X} cy={EYE_Y} />
                <StarEye cx={RIGHT_EYE_X} cy={EYE_Y} />
              </G>
            );

          case EyeStyle.DIZZY:
            return (
              <G>
                <DizzyEye cx={LEFT_EYE_X} cy={EYE_Y} />
                <DizzyEye cx={RIGHT_EYE_X} cy={EYE_Y} />
              </G>
            );

          case EyeStyle.CRY:
            return (
              <G>
                <CryEye cx={LEFT_EYE_X} cy={EYE_Y} eyeColor={eyeColor} />
                <CryEye cx={RIGHT_EYE_X} cy={EYE_Y} eyeColor={eyeColor} />
              </G>
            );

          case EyeStyle.ALMOND:
            return (
              <G>
                <Path
                  d={`M${LEFT_EYE_X - 6},${EYE_Y} Q${LEFT_EYE_X},${EYE_Y - 4} ${LEFT_EYE_X + 6},${EYE_Y} Q${LEFT_EYE_X},${EYE_Y + 3} ${LEFT_EYE_X - 6},${EYE_Y}`}
                  fill="white"
                  stroke="#3a3a3a"
                  strokeWidth={0.5}
                />
                <Circle cx={LEFT_EYE_X} cy={EYE_Y} r={3} fill={eyeColor} />
                <Circle cx={LEFT_EYE_X} cy={EYE_Y} r={1.5} fill="#1a1a1a" />
                <Circle cx={LEFT_EYE_X - 1} cy={EYE_Y - 1} r={0.8} fill="white" />

                <Path
                  d={`M${RIGHT_EYE_X - 6},${EYE_Y} Q${RIGHT_EYE_X},${EYE_Y - 4} ${RIGHT_EYE_X + 6},${EYE_Y} Q${RIGHT_EYE_X},${EYE_Y + 3} ${RIGHT_EYE_X - 6},${EYE_Y}`}
                  fill="white"
                  stroke="#3a3a3a"
                  strokeWidth={0.5}
                />
                <Circle cx={RIGHT_EYE_X} cy={EYE_Y} r={3} fill={eyeColor} />
                <Circle cx={RIGHT_EYE_X} cy={EYE_Y} r={1.5} fill="#1a1a1a" />
                <Circle cx={RIGHT_EYE_X - 1} cy={EYE_Y - 1} r={0.8} fill="white" />
              </G>
            );

          case EyeStyle.ROUND:
          case EyeStyle.DEFAULT:
          default:
            return (
              <G>
                <DefaultEye cx={LEFT_EYE_X} cy={EYE_Y} eyeColor={eyeColor} />
                <DefaultEye cx={RIGHT_EYE_X} cy={EYE_Y} eyeColor={eyeColor} />
              </G>
            );
        }
      })()}
    </G>
  );
}

export default Eyes;
