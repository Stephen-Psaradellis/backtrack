/**
 * Eyebrows Component - Multiple eyebrow styles
 *
 * Renders different eyebrow shapes and expressions,
 * from natural to thick, angry to sad.
 */

import React from 'react';
import { G, Path, Ellipse } from 'react-native-svg';
import { EyebrowStyle, SvgPartProps } from '../types';

interface EyebrowsProps extends SvgPartProps {
  style: EyebrowStyle;
  eyebrowColor: string;
}

// Eyebrow positioning constants
const LEFT_BROW_X = 33;
const RIGHT_BROW_X = 57;
const BROW_Y = 35;
const BROW_WIDTH = 12;

export function Eyebrows({ style, eyebrowColor, scale = 1 }: EyebrowsProps) {
  return (
    <G transform={`scale(${scale})`}>
      {(() => {
        switch (style) {
          case EyebrowStyle.NATURAL:
            return (
              <G>
                {/* Left eyebrow - natural soft arch */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 3} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Right eyebrow */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 3} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </G>
            );

          case EyebrowStyle.THICK:
            return (
              <G>
                {/* Left thick eyebrow */}
                <Path
                  d={`M${LEFT_BROW_X - 1},${BROW_Y + 1}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 4} ${LEFT_BROW_X + BROW_WIDTH + 1},${BROW_Y}
                      Q${LEFT_BROW_X + 6},${BROW_Y + 2} ${LEFT_BROW_X - 1},${BROW_Y + 1}`}
                  fill={eyebrowColor}
                />
                {/* Right thick eyebrow */}
                <Path
                  d={`M${RIGHT_BROW_X - 1},${BROW_Y}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 4} ${RIGHT_BROW_X + BROW_WIDTH + 1},${BROW_Y + 1}
                      Q${RIGHT_BROW_X + 6},${BROW_Y + 2} ${RIGHT_BROW_X - 1},${BROW_Y}`}
                  fill={eyebrowColor}
                />
              </G>
            );

          case EyebrowStyle.THIN:
            return (
              <G>
                {/* Left thin eyebrow */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 2} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
                {/* Right thin eyebrow */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 2} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              </G>
            );

          case EyebrowStyle.ARCHED:
            return (
              <G>
                {/* Left highly arched eyebrow */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y + 1}
                      Q${LEFT_BROW_X + 4},${BROW_Y - 5} ${LEFT_BROW_X + 8},${BROW_Y - 3}
                      Q${LEFT_BROW_X + 10},${BROW_Y - 2} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Right arched eyebrow */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y}
                      Q${RIGHT_BROW_X + 2},${BROW_Y - 2} ${RIGHT_BROW_X + 4},${BROW_Y - 3}
                      Q${RIGHT_BROW_X + 8},${BROW_Y - 5} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y + 1}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </G>
            );

          case EyebrowStyle.FLAT:
            return (
              <G>
                {/* Left flat eyebrow */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y} L${LEFT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Right flat eyebrow */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y} L${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </G>
            );

          case EyebrowStyle.ANGRY:
            return (
              <G>
                {/* Left angry eyebrow - angled down toward center */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y + 3} L${LEFT_BROW_X + BROW_WIDTH},${BROW_Y - 3}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* Right angry eyebrow - angled down toward center */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y - 3} L${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y + 3}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              </G>
            );

          case EyebrowStyle.SAD:
            return (
              <G>
                {/* Left sad eyebrow - angled up toward center */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y - 3} L${LEFT_BROW_X + BROW_WIDTH},${BROW_Y + 3}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Right sad eyebrow - angled up toward center */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y + 3} L${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y - 3}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </G>
            );

          case EyebrowStyle.RAISED:
            return (
              <G>
                {/* Left raised eyebrow */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y - 2}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 7} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y - 2}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Right raised eyebrow */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y - 2}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 7} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y - 2}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </G>
            );

          case EyebrowStyle.UNIBROW:
            return (
              <G>
                {/* Connected unibrow */}
                <Path
                  d={`M${LEFT_BROW_X - 2},${BROW_Y + 1}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 3} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y}
                      Q${MOUTH_X},${BROW_Y - 1} ${RIGHT_BROW_X},${BROW_Y}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 3} ${RIGHT_BROW_X + BROW_WIDTH + 2},${BROW_Y + 1}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              </G>
            );

          case EyebrowStyle.CONCERNED:
            return (
              <G>
                {/* Left concerned - slightly raised inner */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y}
                      Q${LEFT_BROW_X + 4},${BROW_Y - 2} ${LEFT_BROW_X + 8},${BROW_Y - 1}
                      Q${LEFT_BROW_X + 10},${BROW_Y + 1} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y + 2}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Right concerned */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y + 2}
                      Q${RIGHT_BROW_X + 2},${BROW_Y + 1} ${RIGHT_BROW_X + 4},${BROW_Y - 1}
                      Q${RIGHT_BROW_X + 8},${BROW_Y - 2} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </G>
            );

          case EyebrowStyle.SKEPTICAL:
            return (
              <G>
                {/* Left normal */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 2} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Right raised (skeptical) */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y - 4}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 8} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y - 4}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </G>
            );

          case EyebrowStyle.DEFAULT:
          default:
            return (
              <G>
                {/* Left default eyebrow */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 2} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                {/* Right default eyebrow */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 2} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </G>
            );
        }
      })()}
    </G>
  );
}

// Fix: MOUTH_X wasn't defined - using center position
const MOUTH_X = 50;

export default Eyebrows;
