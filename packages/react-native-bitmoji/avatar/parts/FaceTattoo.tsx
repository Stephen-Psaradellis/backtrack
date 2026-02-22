/**
 * FaceTattoo Component - Renders face tattoos with various styles
 *
 * Face tattoos are rendered after facial features but before hair,
 * providing realistic layering for modern tattoo styles.
 */

import React, { memo } from 'react';
import { G, Path, Circle, Ellipse, Text as SvgText, Line, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { FaceTattooStyle } from '../types';
import { useGradientIds } from '../utils';

type TattooGradientIds = {
  tattoo: string;
};

interface FaceTattooProps {
  style: FaceTattooStyle;
  color?: string;
  opacity?: number;
}

/**
 * FaceTattoo renders various face tattoo designs
 */
function FaceTattooComponent({ style, color = '#1a1a1a', opacity = 0.85 }: FaceTattooProps) {
  if (!style || style === FaceTattooStyle.NONE) return null;

  // Use stable gradient IDs for consistent rendering
  const ids = useGradientIds<TattooGradientIds>(['tattoo']);
  const tattooId = ids.tattoo;

  switch (style) {
    // Tear drops - Classic style under eye
    case FaceTattooStyle.TEARDROP_SINGLE:
      return (
        <G opacity={opacity}>
          <Path
            d="M32,52 Q33,54 32,56 Q31,54 32,52"
            fill={color}
          />
        </G>
      );

    case FaceTattooStyle.TEARDROP_MULTIPLE:
      return (
        <G opacity={opacity}>
          {/* Three teardrops under left eye */}
          <Path d="M30,51 Q31,53 30,55 Q29,53 30,51" fill={color} />
          <Path d="M33,52 Q34,54 33,56 Q32,54 33,52" fill={color} />
          <Path d="M36,51 Q37,53 36,55 Q35,53 36,51" fill={color} />
        </G>
      );

    // Face symbols
    case FaceTattooStyle.CROSS_UNDER_EYE:
      return (
        <G opacity={opacity}>
          {/* Cross under left eye */}
          <Line x1="30" y1="51" x2="30" y2="57" stroke={color} strokeWidth={1.2} />
          <Line x1="27" y1="54" x2="33" y2="54" stroke={color} strokeWidth={1.2} />
        </G>
      );

    case FaceTattooStyle.STAR_FACE:
      return (
        <G opacity={opacity}>
          {/* Star on left cheek */}
          <Path
            d="M28,55 L30,51 L32,55 L27,52.5 L33,52.5 Z"
            fill={color}
          />
          {/* Small star near right eye */}
          <Path
            d="M68,48 L69,46 L70,48 L67.5,47 L70.5,47 Z"
            fill={color}
            transform="scale(0.7)"
            origin="69, 47"
          />
        </G>
      );

    case FaceTattooStyle.HEART_CHEEK:
      return (
        <G opacity={opacity}>
          {/* Heart on left cheek */}
          <Path
            d="M30,54 Q28,52 30,50 Q32,52 30,54 M30,54 Q32,52 34,50 Q36,52 34,54 L30,58 L26,54 Q28,52 30,54"
            fill={color}
            transform="translate(-2, 1) scale(0.6)"
            origin="30, 54"
          />
        </G>
      );

    case FaceTattooStyle.SPIDER_WEB:
      return (
        <G opacity={opacity}>
          {/* Spider web on temple */}
          <G transform="translate(22, 42)">
            {/* Web lines radiating out */}
            <Line x1="0" y1="0" x2="6" y2="-4" stroke={color} strokeWidth={0.5} />
            <Line x1="0" y1="0" x2="8" y2="0" stroke={color} strokeWidth={0.5} />
            <Line x1="0" y1="0" x2="6" y2="4" stroke={color} strokeWidth={0.5} />
            <Line x1="0" y1="0" x2="4" y2="6" stroke={color} strokeWidth={0.5} />
            <Line x1="0" y1="0" x2="-2" y2="6" stroke={color} strokeWidth={0.5} />
            {/* Web arcs */}
            <Path d="M3,-2 Q4.5,0 3,2" fill="none" stroke={color} strokeWidth={0.4} />
            <Path d="M5,-3 Q7,0 5,3" fill="none" stroke={color} strokeWidth={0.4} />
          </G>
        </G>
      );

    case FaceTattooStyle.ROSE_FACE:
      return (
        <G opacity={opacity}>
          {/* Rose on left side of face */}
          <G transform="translate(24, 52)">
            {/* Rose petals */}
            <Ellipse cx="0" cy="0" rx="3" ry="2.5" fill={color} />
            <Path d="M-2,-1 Q0,-3 2,-1" fill={color} />
            <Path d="M-2.5,0.5 Q-4,0 -3,-2 Q-1,-2 0,0" fill={color} />
            <Path d="M2.5,0.5 Q4,0 3,-2 Q1,-2 0,0" fill={color} />
            {/* Stem */}
            <Path d="M0,2.5 Q-1,6 -2,8" stroke={color} strokeWidth={0.6} fill="none" />
            {/* Leaves */}
            <Path d="M-1,5 Q-3,4 -2,6" fill={color} />
          </G>
        </G>
      );

    case FaceTattooStyle.BUTTERFLY_FACE:
      return (
        <G opacity={opacity}>
          {/* Butterfly across nose/cheeks */}
          <G transform="translate(50, 48)">
            {/* Left wing */}
            <Path d="M0,0 Q-8,-4 -10,0 Q-8,4 0,0" fill={color} opacity={0.8} />
            <Path d="M0,0 Q-6,-2 -7,0 Q-6,2 0,0" fill={color} opacity={0.9} />
            {/* Right wing */}
            <Path d="M0,0 Q8,-4 10,0 Q8,4 0,0" fill={color} opacity={0.8} />
            <Path d="M0,0 Q6,-2 7,0 Q6,2 0,0" fill={color} opacity={0.9} />
            {/* Body */}
            <Ellipse cx="0" cy="0" rx="1" ry="3" fill={color} />
            {/* Antennae */}
            <Path d="M-0.5,-3 Q-2,-5 -3,-4" stroke={color} strokeWidth={0.4} fill="none" />
            <Path d="M0.5,-3 Q2,-5 3,-4" stroke={color} strokeWidth={0.4} fill="none" />
          </G>
        </G>
      );

    case FaceTattooStyle.SNAKE_FACE:
      return (
        <G opacity={opacity}>
          {/* Snake wrapping around eye */}
          <Path
            d="M26,40 Q30,38 35,42 Q38,48 35,52 Q30,56 25,54 Q22,50 25,46"
            stroke={color}
            strokeWidth={2}
            fill="none"
          />
          {/* Snake head */}
          <Circle cx="26" cy="40" r="2" fill={color} />
          {/* Snake eye */}
          <Circle cx="25.5" cy="39.5" r="0.5" fill="#ffffff" opacity={0.8} />
          {/* Snake scales hint */}
          <Path d="M30,42 Q31,44 30,46" stroke={color} strokeWidth={0.5} fill="none" opacity={0.5} />
          <Path d="M33,46 Q34,48 33,50" stroke={color} strokeWidth={0.5} fill="none" opacity={0.5} />
        </G>
      );

    case FaceTattooStyle.FLAMES_FACE:
      return (
        <G opacity={opacity}>
          {/* Flames on side of face */}
          <G transform="translate(22, 48)">
            <Path d="M0,10 Q-2,5 0,0 Q2,5 4,2 Q2,7 4,10 Z" fill={color} />
            <Path d="M4,10 Q3,6 5,2 Q7,6 8,4 Q6,8 8,10 Z" fill={color} />
            <Path d="M-2,10 Q-4,7 -2,4 Q0,7 -2,10 Z" fill={color} opacity={0.8} />
          </G>
        </G>
      );

    case FaceTattooStyle.TRIBAL_FACE:
      return (
        <G opacity={opacity}>
          {/* Tribal pattern on cheek */}
          <G transform="translate(26, 50)">
            <Path d="M0,0 L4,-4 L6,0 L4,4 Z" fill={color} />
            <Path d="M6,0 L10,-2 L12,2 L10,4 L6,0" fill={color} />
            <Path d="M-2,0 L0,-4 L0,4 Z" fill={color} />
            {/* Decorative lines */}
            <Line x1="12" y1="0" x2="16" y2="0" stroke={color} strokeWidth={1} />
            <Line x1="14" y1="-2" x2="16" y2="-1" stroke={color} strokeWidth={0.8} />
            <Line x1="14" y1="2" x2="16" y2="1" stroke={color} strokeWidth={0.8} />
          </G>
        </G>
      );

    // Modern/rapper style
    case FaceTattooStyle.NUMBER_FACE:
      return (
        <G opacity={opacity}>
          {/* Number "21" under eye - common rapper style */}
          <SvgText
            x="28"
            y="56"
            fontSize="6"
            fontWeight="bold"
            fill={color}
          >
            21
          </SvgText>
        </G>
      );

    case FaceTattooStyle.WORD_FACE:
      return (
        <G opacity={opacity}>
          {/* Word above eyebrow */}
          <SvgText
            x="32"
            y="34"
            fontSize="4"
            fontWeight="bold"
            fill={color}
            letterSpacing={0.5}
          >
            LOYALTY
          </SvgText>
        </G>
      );

    case FaceTattooStyle.BARCODE_FACE:
      return (
        <G opacity={opacity}>
          {/* Barcode on temple/forehead */}
          <G transform="translate(24, 32)">
            {[0, 1.5, 2.5, 4, 5, 6.5, 7.5, 9, 10, 11.5].map((x, i) => (
              <Rect
                key={`bar-${i}`}
                x={x}
                y={0}
                width={i % 3 === 0 ? 1.2 : 0.8}
                height={6}
                fill={color}
              />
            ))}
          </G>
        </G>
      );

    case FaceTattooStyle.SOUNDWAVE_FACE:
      return (
        <G opacity={opacity}>
          {/* Soundwave on temple */}
          <G transform="translate(22, 45)">
            {[0, 2, 4, 6, 8, 10, 12].map((x, i) => {
              const heights = [3, 6, 4, 8, 5, 7, 3];
              return (
                <Rect
                  key={`wave-${i}`}
                  x={x}
                  y={-heights[i] / 2}
                  width={1.2}
                  height={heights[i]}
                  fill={color}
                />
              );
            })}
          </G>
        </G>
      );

    case FaceTattooStyle.MONEY_SIGN:
      return (
        <G opacity={opacity}>
          {/* Dollar sign on cheek */}
          <SvgText
            x="28"
            y="56"
            fontSize="8"
            fontWeight="bold"
            fill={color}
          >
            $
          </SvgText>
        </G>
      );

    case FaceTattooStyle.LIGHTNING_BOLT_FACE:
      return (
        <G opacity={opacity}>
          {/* Lightning bolt near eye - Harry Potter style but tougher */}
          <Path
            d="M68,40 L65,46 L68,46 L64,54 L67,48 L64,48 L68,40"
            fill={color}
          />
        </G>
      );

    // Traditional/cultural tattoos
    case FaceTattooStyle.MAORI_MOKO:
      return (
        <G opacity={opacity}>
          {/* Traditional Maori face tattoo patterns */}
          <G>
            {/* Chin pattern (tauihu) */}
            <Path
              d="M42,68 Q50,72 58,68"
              stroke={color}
              strokeWidth={2}
              fill="none"
            />
            <Path
              d="M44,70 Q50,73 56,70"
              stroke={color}
              strokeWidth={1.5}
              fill="none"
            />
            {/* Spiral patterns on cheeks */}
            <Path
              d="M30,55 Q28,52 32,50 Q36,52 34,56 Q30,58 28,55"
              stroke={color}
              strokeWidth={1.5}
              fill="none"
            />
            <Path
              d="M70,55 Q72,52 68,50 Q64,52 66,56 Q70,58 72,55"
              stroke={color}
              strokeWidth={1.5}
              fill="none"
            />
            {/* Forehead lines */}
            <Path d="M40,30 L42,35" stroke={color} strokeWidth={1.2} />
            <Path d="M60,30 L58,35" stroke={color} strokeWidth={1.2} />
          </G>
        </G>
      );

    case FaceTattooStyle.POLYNESIAN_FACE:
      return (
        <G opacity={opacity}>
          {/* Polynesian tribal patterns */}
          <G transform="translate(26, 48)">
            {/* Triangle patterns */}
            <Path d="M0,0 L3,-4 L6,0 Z" fill={color} />
            <Path d="M6,0 L9,-4 L12,0 Z" fill={color} />
            <Path d="M3,0 L6,4 L9,0 Z" fill="none" stroke={color} strokeWidth={0.8} />
            {/* Decorative dots */}
            <Circle cx="1.5" cy="2" r="0.8" fill={color} />
            <Circle cx="4.5" cy="2" r="0.8" fill={color} />
            <Circle cx="7.5" cy="2" r="0.8" fill={color} />
            <Circle cx="10.5" cy="2" r="0.8" fill={color} />
          </G>
        </G>
      );

    case FaceTattooStyle.DOTWORK_FACE:
      return (
        <G opacity={opacity}>
          {/* Dotwork mandala pattern */}
          <G transform="translate(28, 52)">
            {/* Central dot */}
            <Circle cx="0" cy="0" r="1" fill={color} />
            {/* Inner ring */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <Circle
                  key={`dot1-${i}`}
                  cx={Math.cos(rad) * 3}
                  cy={Math.sin(rad) * 3}
                  r={0.7}
                  fill={color}
                />
              );
            })}
            {/* Outer ring */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <Circle
                  key={`dot2-${i}`}
                  cx={Math.cos(rad) * 6}
                  cy={Math.sin(rad) * 6}
                  r={0.5}
                  fill={color}
                />
              );
            })}
          </G>
        </G>
      );

    case FaceTattooStyle.GEOMETRIC_FACE:
      return (
        <G opacity={opacity}>
          {/* Geometric shapes */}
          <G transform="translate(26, 48)">
            {/* Hexagon */}
            <Path
              d="M4,0 L8,-2 L12,0 L12,4 L8,6 L4,4 Z"
              stroke={color}
              strokeWidth={1}
              fill="none"
            />
            {/* Inner triangle */}
            <Path
              d="M6,1 L10,1 L8,4 Z"
              stroke={color}
              strokeWidth={0.8}
              fill="none"
            />
            {/* Lines extending */}
            <Line x1="0" y1="2" x2="4" y2="2" stroke={color} strokeWidth={0.8} />
            <Line x1="12" y1="2" x2="16" y2="2" stroke={color} strokeWidth={0.8} />
          </G>
        </G>
      );

    // Location-specific tattoos
    case FaceTattooStyle.FOREHEAD_TATTOO:
      return (
        <G opacity={opacity}>
          {/* Word or design on forehead */}
          <SvgText
            x="50"
            y="28"
            fontSize="5"
            fontWeight="bold"
            fill={color}
            textAnchor="middle"
          >
            BLESSED
          </SvgText>
        </G>
      );

    case FaceTattooStyle.TEMPLE_TATTOO:
      return (
        <G opacity={opacity}>
          {/* Clock/watch design on temple - popular style */}
          <Circle cx="22" cy="42" r="6" stroke={color} strokeWidth={1} fill="none" />
          <Circle cx="22" cy="42" r="4.5" stroke={color} strokeWidth={0.5} fill="none" />
          {/* Clock hands */}
          <Line x1="22" y1="42" x2="22" y2="38" stroke={color} strokeWidth={0.8} />
          <Line x1="22" y1="42" x2="25" y2="43" stroke={color} strokeWidth={0.6} />
          {/* Hour markers */}
          <Circle cx="22" cy="37" r="0.4" fill={color} />
          <Circle cx="27" cy="42" r="0.4" fill={color} />
          <Circle cx="22" cy="47" r="0.4" fill={color} />
          <Circle cx="17" cy="42" r="0.4" fill={color} />
        </G>
      );

    case FaceTattooStyle.NECK_FRONT:
      return (
        <G opacity={opacity}>
          {/* Neck tattoo - wings or text */}
          <G transform="translate(50, 78)">
            {/* Wings design */}
            <Path d="M0,0 Q-10,-4 -15,0 Q-10,2 0,0" fill={color} />
            <Path d="M0,0 Q10,-4 15,0 Q10,2 0,0" fill={color} />
            {/* Feather details */}
            <Path d="M-5,-1 Q-8,-2 -10,-1" stroke={color} strokeWidth={0.4} fill="none" />
            <Path d="M5,-1 Q8,-2 10,-1" stroke={color} strokeWidth={0.4} fill="none" />
          </G>
        </G>
      );

    case FaceTattooStyle.NECK_SIDE:
      return (
        <G opacity={opacity}>
          {/* Side neck tattoo - rose or script */}
          <G transform="translate(75, 70)">
            {/* Vertical text - rendered horizontally with rotation */}
            <SvgText
              x="0"
              y="0"
              fontSize="4"
              fill={color}
              transform="rotate(-90) translate(-8, 2)"
            >
              FEAR
            </SvgText>
          </G>
        </G>
      );

    case FaceTattooStyle.BEHIND_EAR:
      return (
        <G opacity={opacity}>
          {/* Small tattoo behind ear */}
          <G transform="translate(20, 48)">
            {/* Small rose or symbol */}
            <Path
              d="M0,0 Q-2,-2 0,-4 Q2,-2 0,0"
              fill={color}
            />
            <Path
              d="M0,0 Q-2,0 -2,-2 Q0,-2 0,0"
              fill={color}
              opacity={0.8}
            />
            <Path
              d="M0,0 L0,3"
              stroke={color}
              strokeWidth={0.5}
            />
          </G>
        </G>
      );

    default:
      return null;
  }
}

export const FaceTattoo = memo(FaceTattooComponent);
export default FaceTattoo;
