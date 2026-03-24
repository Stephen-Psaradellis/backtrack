/**
 * Hair Component - Multiple hair styles with color
 * Enhanced with realistic gradients, hair texture, and natural flow patterns
 */

import React from 'react';
import { G, Path, Ellipse, Rect, Circle, Defs, LinearGradient, RadialGradient, Stop, ClipPath } from 'react-native-svg';
import { HairStyle, HairTreatment, SvgPartProps } from '../types';
import { adjustBrightness, blendColors, useGradientIds } from '../utils';

interface HairProps extends SvgPartProps {
  style: HairStyle;
  hairColor: string;
  hairTreatment?: HairTreatment;
  hairSecondaryColor?: string;
}

// Rainbow colors for special effects
const RAINBOW_COLORS = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];

// Deterministic pseudo-random based on seed
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

// Generate hair strand texture lines
function HairStrands({
  startX, startY, endX, endY, count, color, opacity = 0.15, curvature = 0
}: {
  startX: number; startY: number; endX: number; endY: number;
  count: number; color: string; opacity?: number; curvature?: number;
}) {
  const strands = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const seed = i * 17 + startX + startY;
    const x1 = startX + (endX - startX) * t + (seededRandom(seed) - 0.5) * 2;
    const y1 = startY + (seededRandom(seed + 1) - 0.5) * 3;
    const x2 = startX + (endX - startX) * t + (seededRandom(seed + 2) - 0.5) * 3;
    const y2 = endY + (seededRandom(seed + 3) - 0.5) * 5;
    const cx = (x1 + x2) / 2 + curvature * (seededRandom(seed + 4) - 0.5);
    const cy = (y1 + y2) / 2;
    strands.push(
      <Path
        key={i}
        d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`}
        stroke={color}
        strokeWidth={0.5 + seededRandom(seed + 5) * 0.5}
        fill="none"
        opacity={opacity * (0.5 + seededRandom(seed + 6) * 0.5)}
      />
    );
  }
  return <G>{strands}</G>;
}

// Curly hair texture
function CurlyTexture({ cx, cy, radius, color, count = 8 }: {
  cx: number; cy: number; radius: number; color: string; count?: number;
}) {
  const curls = [];
  for (let i = 0; i < count; i++) {
    const seed = i * 13 + cx + cy;
    const angle = (i / count) * Math.PI * 2 + seededRandom(seed) * 0.3;
    const r = radius * (0.6 + seededRandom(seed + 1) * 0.4);
    const x = cx + Math.cos(angle) * r * 0.7;
    const y = cy + Math.sin(angle) * r * 0.7;
    const curlR = 2 + seededRandom(seed + 2) * 2;
    curls.push(
      <Circle key={i} cx={x} cy={y} r={curlR} fill={color} opacity={0.4 + seededRandom(seed + 3) * 0.3} />
    );
  }
  return <G>{curls}</G>;
}

export function Hair({ style, hairColor, hairTreatment = HairTreatment.NONE, hairSecondaryColor, scale = 1 }: HairProps) {
  const highlight = adjustBrightness(hairColor, 30);
  const brightHighlight = adjustBrightness(hairColor, 50);
  const shadow = adjustBrightness(hairColor, -25);
  const deepShadow = adjustBrightness(hairColor, -40);

  // Secondary color defaults to a lighter version if not specified
  const secondaryColor = hairSecondaryColor || adjustBrightness(hairColor, 60);
  const secondaryHighlight = adjustBrightness(secondaryColor, 30);
  const secondaryShadow = adjustBrightness(secondaryColor, -25);

  // Stable gradient IDs using useGradientIds hook for consistent IDs across renders
  type HairGradientIds = {
    main: string;
    highlight: string;
    side: string;
    treatment: string;
    ombre: string;
    tips: string;
    roots: string;
    twoTone: string;
    rainbow: string;
    peekaboo: string;
  };
  const gradientIds = useGradientIds<HairGradientIds>([
    'main', 'highlight', 'side', 'treatment', 'ombre', 'tips', 'roots', 'twoTone', 'rainbow', 'peekaboo'
  ]);

  const gradientId = gradientIds.main;
  const highlightGradientId = gradientIds.highlight;
  const sideGradientId = gradientIds.side;

  // Generate treatment-specific gradient definitions
  const renderTreatmentDefs = () => {
    if (!hairTreatment || hairTreatment === HairTreatment.NONE) return null;

    switch (hairTreatment) {
      // Ombré styles - gradual color transition
      case HairTreatment.OMBRE_SUBTLE:
        return (
          <LinearGradient id={gradientIds.ombre} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={hairColor} />
            <Stop offset="50%" stopColor={hairColor} />
            <Stop offset="75%" stopColor={blendColors(hairColor, secondaryColor, 0.5)} />
            <Stop offset="100%" stopColor={secondaryColor} />
          </LinearGradient>
        );
      case HairTreatment.OMBRE_DRAMATIC:
        return (
          <LinearGradient id={gradientIds.ombre} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={hairColor} />
            <Stop offset="35%" stopColor={hairColor} />
            <Stop offset="65%" stopColor={secondaryColor} />
            <Stop offset="100%" stopColor={secondaryColor} />
          </LinearGradient>
        );
      case HairTreatment.OMBRE_REVERSE:
        return (
          <LinearGradient id={gradientIds.ombre} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={secondaryColor} />
            <Stop offset="50%" stopColor={secondaryColor} />
            <Stop offset="75%" stopColor={blendColors(secondaryColor, hairColor, 0.5)} />
            <Stop offset="100%" stopColor={hairColor} />
          </LinearGradient>
        );

      // Roots styles - darker at roots
      case HairTreatment.ROOTS_GROWN_OUT:
        return (
          <LinearGradient id={gradientIds.roots} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={secondaryColor} />
            <Stop offset="15%" stopColor={secondaryColor} />
            <Stop offset="35%" stopColor={hairColor} />
            <Stop offset="100%" stopColor={shadow} />
          </LinearGradient>
        );
      case HairTreatment.ROOTS_DARK:
        return (
          <LinearGradient id={gradientIds.roots} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={adjustBrightness(hairColor, -60)} />
            <Stop offset="20%" stopColor={adjustBrightness(hairColor, -40)} />
            <Stop offset="40%" stopColor={hairColor} />
            <Stop offset="100%" stopColor={shadow} />
          </LinearGradient>
        );

      // Tips styles - colored ends
      case HairTreatment.TIPS_COLORED:
        return (
          <LinearGradient id={gradientIds.tips} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={highlight} />
            <Stop offset="60%" stopColor={hairColor} />
            <Stop offset="80%" stopColor={blendColors(hairColor, secondaryColor, 0.5)} />
            <Stop offset="100%" stopColor={secondaryColor} />
          </LinearGradient>
        );
      case HairTreatment.TIPS_FROSTED:
        return (
          <LinearGradient id={gradientIds.tips} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={highlight} />
            <Stop offset="70%" stopColor={hairColor} />
            <Stop offset="85%" stopColor={adjustBrightness(hairColor, 40)} />
            <Stop offset="100%" stopColor={adjustBrightness(hairColor, 70)} />
          </LinearGradient>
        );

      // Two-tone styles
      case HairTreatment.TWO_TONE_SPLIT:
        return (
          <LinearGradient id={gradientIds.twoTone} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={hairColor} />
            <Stop offset="48%" stopColor={hairColor} />
            <Stop offset="52%" stopColor={secondaryColor} />
            <Stop offset="100%" stopColor={secondaryColor} />
          </LinearGradient>
        );
      case HairTreatment.TWO_TONE_UNDER:
        return (
          <LinearGradient id={gradientIds.twoTone} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={hairColor} />
            <Stop offset="60%" stopColor={hairColor} />
            <Stop offset="70%" stopColor={secondaryColor} />
            <Stop offset="100%" stopColor={secondaryShadow} />
          </LinearGradient>
        );

      // Rainbow tips
      case HairTreatment.RAINBOW_TIPS:
        return (
          <LinearGradient id={gradientIds.rainbow} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={highlight} />
            <Stop offset="50%" stopColor={hairColor} />
            <Stop offset="60%" stopColor={RAINBOW_COLORS[0]} />
            <Stop offset="70%" stopColor={RAINBOW_COLORS[1]} />
            <Stop offset="80%" stopColor={RAINBOW_COLORS[2]} />
            <Stop offset="90%" stopColor={RAINBOW_COLORS[3]} />
            <Stop offset="100%" stopColor={RAINBOW_COLORS[4]} />
          </LinearGradient>
        );

      // Peekaboo - hidden underlayer
      case HairTreatment.PEEKABOO:
        return (
          <LinearGradient id={gradientIds.peekaboo} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={highlight} />
            <Stop offset="30%" stopColor={hairColor} />
            <Stop offset="50%" stopColor={hairColor} />
            <Stop offset="70%" stopColor={blendColors(hairColor, secondaryColor, 0.3)} />
            <Stop offset="100%" stopColor={secondaryColor} />
          </LinearGradient>
        );

      default:
        return null;
    }
  };

  // Get the appropriate gradient ID based on treatment
  const getTreatmentGradientId = () => {
    switch (hairTreatment) {
      case HairTreatment.OMBRE_SUBTLE:
      case HairTreatment.OMBRE_DRAMATIC:
      case HairTreatment.OMBRE_REVERSE:
        return gradientIds.ombre;
      case HairTreatment.ROOTS_GROWN_OUT:
      case HairTreatment.ROOTS_DARK:
        return gradientIds.roots;
      case HairTreatment.TIPS_COLORED:
      case HairTreatment.TIPS_FROSTED:
        return gradientIds.tips;
      case HairTreatment.TWO_TONE_SPLIT:
      case HairTreatment.TWO_TONE_UNDER:
        return gradientIds.twoTone;
      case HairTreatment.RAINBOW_TIPS:
        return gradientIds.rainbow;
      case HairTreatment.PEEKABOO:
        return gradientIds.peekaboo;
      default:
        return gradientId;
    }
  };

  // Render highlight streaks for highlight treatments
  const renderHighlightStreaks = () => {
    if (!hairTreatment) return null;

    switch (hairTreatment) {
      case HairTreatment.HIGHLIGHTS_BABYLIGHTS:
        return (
          <G opacity={0.4}>
            <Path d="M32,18 Q34,40 33,70" fill="none" stroke={secondaryColor} strokeWidth={1.5} />
            <Path d="M40,16 Q42,45 41,75" fill="none" stroke={secondaryColor} strokeWidth={1} />
            <Path d="M48,15 Q49,42 48,72" fill="none" stroke={secondaryColor} strokeWidth={1.5} />
            <Path d="M56,16 Q55,44 56,74" fill="none" stroke={secondaryColor} strokeWidth={1} />
            <Path d="M64,17 Q63,42 64,70" fill="none" stroke={secondaryColor} strokeWidth={1.5} />
          </G>
        );
      case HairTreatment.HIGHLIGHTS_BALAYAGE:
        return (
          <G opacity={0.5}>
            <Path d="M28,35 Q32,55 30,85" fill="none" stroke={secondaryColor} strokeWidth={3} strokeLinecap="round" />
            <Path d="M42,30 Q45,55 43,90" fill="none" stroke={secondaryColor} strokeWidth={4} strokeLinecap="round" />
            <Path d="M55,28 Q53,52 56,88" fill="none" stroke={secondaryColor} strokeWidth={3.5} strokeLinecap="round" />
            <Path d="M68,32 Q65,54 67,82" fill="none" stroke={secondaryColor} strokeWidth={3} strokeLinecap="round" />
          </G>
        );
      case HairTreatment.HIGHLIGHTS_CHUNKY:
        return (
          <G opacity={0.6}>
            <Path d="M25,25 Q28,50 26,85" fill="none" stroke={secondaryColor} strokeWidth={6} strokeLinecap="round" />
            <Path d="M50,20 Q52,50 50,90" fill="none" stroke={secondaryColor} strokeWidth={7} strokeLinecap="round" />
            <Path d="M72,24 Q70,48 73,82" fill="none" stroke={secondaryColor} strokeWidth={6} strokeLinecap="round" />
          </G>
        );
      case HairTreatment.HIGHLIGHTS_FACE_FRAMING:
        return (
          <G opacity={0.6}>
            <Path d="M22,28 Q25,50 23,90" fill="none" stroke={secondaryColor} strokeWidth={4} strokeLinecap="round" />
            <Path d="M26,26 Q28,48 27,88" fill="none" stroke={secondaryColor} strokeWidth={3} strokeLinecap="round" />
            <Path d="M74,26 Q72,48 73,88" fill="none" stroke={secondaryColor} strokeWidth={3} strokeLinecap="round" />
            <Path d="M78,28 Q75,50 77,90" fill="none" stroke={secondaryColor} strokeWidth={4} strokeLinecap="round" />
          </G>
        );
      case HairTreatment.STREAK_SINGLE:
        return (
          <G opacity={0.7}>
            <Path d="M35,18 Q38,50 36,90" fill="none" stroke={secondaryColor} strokeWidth={5} strokeLinecap="round" />
          </G>
        );
      case HairTreatment.STREAKS_MULTIPLE:
        return (
          <G opacity={0.6}>
            <Path d="M30,20 Q33,50 31,88" fill="none" stroke={secondaryColor} strokeWidth={3} strokeLinecap="round" />
            <Path d="M45,18 Q47,48 45,90" fill="none" stroke={secondaryColor} strokeWidth={3} strokeLinecap="round" />
            <Path d="M60,19 Q58,49 61,89" fill="none" stroke={secondaryColor} strokeWidth={3} strokeLinecap="round" />
          </G>
        );
      case HairTreatment.STREAK_SKUNK:
        return (
          <G opacity={0.75}>
            <Path d="M22,22 Q25,50 23,92" fill="none" stroke={secondaryColor} strokeWidth={8} strokeLinecap="round" />
            <Path d="M78,22 Q75,50 77,92" fill="none" stroke={secondaryColor} strokeWidth={8} strokeLinecap="round" />
          </G>
        );
      default:
        return null;
    }
  };

  // Check if this treatment uses a full gradient replacement
  const usesTreatmentGradient = hairTreatment && [
    HairTreatment.OMBRE_SUBTLE,
    HairTreatment.OMBRE_DRAMATIC,
    HairTreatment.OMBRE_REVERSE,
    HairTreatment.ROOTS_GROWN_OUT,
    HairTreatment.ROOTS_DARK,
    HairTreatment.TIPS_COLORED,
    HairTreatment.TIPS_FROSTED,
    HairTreatment.TWO_TONE_SPLIT,
    HairTreatment.TWO_TONE_UNDER,
    HairTreatment.RAINBOW_TIPS,
    HairTreatment.PEEKABOO,
  ].includes(hairTreatment);

  // Get the main fill gradient - use treatment gradient if applicable
  const mainGradientId = usesTreatmentGradient ? getTreatmentGradientId() : gradientId;

  // Hairline shadow color — dark with low opacity so it works for all skin tones
  const hairlineShadowColor = '#000000';

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        {/* Main hair gradient - top to bottom */}
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={highlight} />
          <Stop offset="25%" stopColor={hairColor} />
          <Stop offset="50%" stopColor={hairColor} />
          <Stop offset="75%" stopColor={shadow} />
          <Stop offset="100%" stopColor={deepShadow} />
        </LinearGradient>
        {/* Highlight for top shine */}
        <RadialGradient id={highlightGradientId} cx="50%" cy="20%" rx="40%" ry="30%">
          <Stop offset="0%" stopColor={brightHighlight} stopOpacity="0.5" />
          <Stop offset="60%" stopColor={highlight} stopOpacity="0.2" />
          <Stop offset="100%" stopColor={hairColor} stopOpacity="0" />
        </RadialGradient>
        {/* Side shadow gradient */}
        <LinearGradient id={sideGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadow} />
          <Stop offset="50%" stopColor={hairColor} />
          <Stop offset="100%" stopColor={shadow} />
        </LinearGradient>
        {/* Treatment-specific gradients */}
        {renderTreatmentDefs()}
      </Defs>
      {(() => {
        switch (style) {
          case HairStyle.BALD:
            return null;

          case HairStyle.SHAVED:
            return (
              <G>
                <Path d="M22,33 Q22,10 50,8 Q78,10 78,33 Q78,38 72,41 L28,41 Q22,38 22,33 Z" fill={hairColor} opacity={0.25} />
                {/* Stubble texture */}
                <Path d="M26,30 Q50,22 74,30" fill="none" stroke={hairColor} strokeWidth={0.5} strokeDasharray="1,2" opacity={0.4} />
                <Path d="M28,35 Q50,30 72,35" fill="none" stroke={hairColor} strokeWidth={0.5} strokeDasharray="1,2" opacity={0.3} />
              </G>
            );

          case HairStyle.SHORT_BUZZ:
            return (
              <G>
                {/* Depth shadow layer behind main shape */}
                <Path d="M21,36 Q21,11 50,9 Q79,11 79,36 Q79,40 75,42 L66,32 Q50,27 34,32 L25,42 Q21,40 21,36 Z" fill={deepShadow} opacity={0.18} />
                {/* Main shape with natural hairline edge - slightly irregular bottom */}
                <Path d="M22,34 Q22,12 50,10 Q78,12 78,34 Q78,39 74,41 L68,39 Q62,37 56,38 Q50,35 44,38 Q38,37 32,39 L26,41 Q22,39 22,34 Z" fill={`url(#${mainGradientId})`} />
                {/* Crown highlight ellipse */}
                <Ellipse cx={50} cy={20} rx={16} ry={7} fill={highlight} opacity={0.18} />
                {/* Buzzcut texture lines */}
                <Path d="M28,30 Q50,20 72,30" fill="none" stroke={highlight} strokeWidth={0.5} opacity={0.3} />
                <Path d="M30,26 Q50,18 70,26" fill="none" stroke={highlight} strokeWidth={0.5} opacity={0.25} />
                {/* Side fade */}
                <Path d="M23,34 Q26,30 28,34" fill={shadow} opacity={0.3} />
                <Path d="M77,34 Q74,30 72,34" fill={shadow} opacity={0.3} />
              </G>
            );

          case HairStyle.SHORT_CREW:
            return (
              <G>
                {/* LAYER 1: Depth shadow layer */}
                <Path d="M20,38 Q20,9 50,7 Q80,9 80,38 Q80,42 75,44 L69,36 Q50,29 31,36 L25,44 Q20,42 20,38 Z" fill={deepShadow} opacity={0.18} />

                {/* LAYER 2: Main shape with natural hairline */}
                <Path d="M21,37 Q21,10 50,8 Q79,10 79,37 Q79,41 74,43 L68,39 Q62,37 56,38 Q50,33 44,38 Q38,37 32,39 L26,43 Q21,41 21,37 Z" fill={`url(#${mainGradientId})`} />

                {/* LAYER 3: Wispy hairline strands */}
                <Path d="M28,39 L27,42" fill="none" stroke={hairColor} strokeWidth={1} opacity={0.6} />
                <Path d="M35,37 L34,40" fill="none" stroke={hairColor} strokeWidth={1} opacity={0.6} />
                <Path d="M42,36 L41,39" fill="none" stroke={hairColor} strokeWidth={1} opacity={0.6} />
                <Path d="M58,36 L59,39" fill="none" stroke={hairColor} strokeWidth={1} opacity={0.6} />
                <Path d="M65,37 L66,40" fill="none" stroke={hairColor} strokeWidth={1} opacity={0.6} />
                <Path d="M72,39 L73,42" fill="none" stroke={hairColor} strokeWidth={1} opacity={0.6} />

                {/* LAYER 4: Crown highlight ellipse */}
                <Ellipse cx={50} cy={18} rx={18} ry={8} fill={highlight} opacity={0.16} />

                {/* LAYER 5: Hair texture strands - layered groups */}
                <HairStrands startX={28} startY={20} endX={72} endY={30} count={12} color={shadow} opacity={0.15} />
                <HairStrands startX={30} startY={18} endX={70} endY={28} count={10} color={highlight} opacity={0.2} />

                {/* LAYER 6: Side fade definition */}
                <Path d="M23,33 Q26,28 30,30" fill="none" stroke={shadow} strokeWidth={1} opacity={0.25} />
                <Path d="M77,33 Q74,28 70,30" fill="none" stroke={shadow} strokeWidth={1} opacity={0.25} />
              </G>
            );

          case HairStyle.SHORT_SPIKY:
            return (
              <G>
                {/* LAYER 1: Shadow base for depth */}
                <Path d="M24,38 L29,10 L36,32 L43,5 L50,27 L57,6 L64,32 L71,12 L76,38 Q50,34 24,38 Z" fill={deepShadow} opacity={0.2} />

                {/* LAYER 2: Base spikes with gradient */}
                <Path d="M24,38 L29,8 L36,30 L43,3 L50,25 L57,4 L64,30 L71,10 L76,38 Q50,32 24,38 Z" fill={`url(#${mainGradientId})`} />

                {/* LAYER 3: Individual spike shapes using bezier curves */}
                <Path d="M28,10 C27,8 28,6 29,8 C30,6 31,8 30,10 L28,10 Z" fill={hairColor} opacity={0.9} />
                <Path d="M42,5 C41,3 42,1 43,3 C44,1 45,3 44,5 L42,5 Z" fill={hairColor} opacity={0.9} />
                <Path d="M49,25 C48,23 49,21 50,23 C51,21 52,23 51,25 L49,25 Z" fill={hairColor} opacity={0.9} />
                <Path d="M56,6 C55,4 56,2 57,4 C58,2 59,4 58,6 L56,6 Z" fill={hairColor} opacity={0.9} />
                <Path d="M70,12 C69,10 70,8 71,10 C72,8 73,10 72,12 L70,12 Z" fill={hairColor} opacity={0.9} />

                {/* LAYER 4: Spike shadows on sides */}
                <Path d="M32,14 L36,30" fill="none" stroke={deepShadow} strokeWidth={1.5} opacity={0.3} />
                <Path d="M46,10 L50,25" fill="none" stroke={deepShadow} strokeWidth={1.5} opacity={0.3} />
                <Path d="M60,10 L64,30" fill="none" stroke={deepShadow} strokeWidth={1.5} opacity={0.3} />

                {/* LAYER 5: Spike highlight strands in center */}
                <Path d="M30,12 L34,28" fill="none" stroke={brightHighlight} strokeWidth={1.5} opacity={0.4} />
                <Path d="M44,8 L48,24" fill="none" stroke={brightHighlight} strokeWidth={1.5} opacity={0.4} />
                <Path d="M58,8 L55,24" fill="none" stroke={brightHighlight} strokeWidth={1.5} opacity={0.4} />
                <Path d="M70,14 L66,28" fill="none" stroke={brightHighlight} strokeWidth={1.5} opacity={0.4} />

                {/* LAYER 6: Bright spike tips */}
                <Path d="M29,8 L29,10" fill="none" stroke={brightHighlight} strokeWidth={1.2} opacity={0.5} />
                <Path d="M43,3 L43,5" fill="none" stroke={brightHighlight} strokeWidth={1.2} opacity={0.5} />
                <Path d="M57,4 L57,6" fill="none" stroke={brightHighlight} strokeWidth={1.2} opacity={0.5} />
                <Path d="M71,10 L71,12" fill="none" stroke={brightHighlight} strokeWidth={1.2} opacity={0.5} />

                {/* LAYER 7: Base texture and hairline */}
                <Path d="M26,37 Q50,32 74,37" fill="none" stroke={shadow} strokeWidth={2} opacity={0.2} />
              </G>
            );

          case HairStyle.SHORT_CURLY:
            return (
              <G>
                {/* LAYER 1: Shadow base */}
                <Path d="M19,39 Q17,25 22,16 Q26,10 33,8 Q43,4 55,8 Q65,6 73,16 Q80,25 78,39 Q74,35 70,37 Q67,30 62,32 Q57,26 50,30 Q43,26 38,32 Q33,30 30,37 Q26,35 19,39 Z" fill={deepShadow} opacity={0.15} />

                {/* LAYER 2: Main curly base */}
                <Path d="M19,39 Q17,25 22,16 Q26,10 33,8 Q43,4 55,8 Q65,6 73,16 Q80,25 78,39 Q74,35 70,37 Q67,30 62,32 Q57,26 50,30 Q43,26 38,32 Q33,30 30,37 Q26,35 19,39 Z" fill={hairColor} />

                {/* LAYER 3: Main curl groups - larger curls with depth */}
                <Circle cx="27" cy="24" r="6" fill={hairColor} />
                <Circle cx="27" cy="24" r="3.5" fill={highlight} opacity={0.3} />
                <Circle cx="38" cy="17" r="5.5" fill={hairColor} />
                <Circle cx="38" cy="17" r="3" fill={highlight} opacity={0.3} />
                <Circle cx="50" cy="14" r="6" fill={hairColor} />
                <Circle cx="50" cy="14" r="4" fill={highlight} opacity={0.35} />
                <Circle cx="62" cy="17" r="5.5" fill={hairColor} />
                <Circle cx="62" cy="17" r="3" fill={highlight} opacity={0.3} />
                <Circle cx="73" cy="24" r="6" fill={hairColor} />
                <Circle cx="73" cy="24" r="3.5" fill={highlight} opacity={0.3} />

                {/* LAYER 4: Small shadow curls for depth */}
                <Circle cx="33" cy="28" r="3.5" fill={shadow} opacity={0.4} />
                <Circle cx="44" cy="24" r="3.5" fill={shadow} opacity={0.4} />
                <Circle cx="56" cy="24" r="3.5" fill={shadow} opacity={0.4} />
                <Circle cx="67" cy="28" r="3.5" fill={shadow} opacity={0.4} />

                {/* LAYER 5: Highlight curls on top */}
                <Circle cx="32" cy="20" r="2.5" fill={brightHighlight} opacity={0.3} />
                <Circle cx="45" cy="16" r="2.5" fill={brightHighlight} opacity={0.3} />
                <Circle cx="55" cy="16" r="2.5" fill={brightHighlight} opacity={0.3} />
                <Circle cx="68" cy="20" r="2.5" fill={brightHighlight} opacity={0.3} />

                {/* LAYER 6: Curly texture overlay */}
                <CurlyTexture cx={50} cy={20} radius={28} color={highlight} count={10} />
              </G>
            );

          case HairStyle.MEDIUM_MESSY:
            return (
              <G>
                {/* LAYER 1: Shadow base */}
                <Path d="M17,47 Q15,25 22,14 Q33,4 50,6 Q67,4 78,14 Q85,25 83,47 L77,43 Q74,38 72,40 Q64,36 58,37 Q52,34 46,37 Q40,36 32,40 Q30,38 27,43 Z" fill={deepShadow} opacity={0.15} />

                {/* LAYER 2: Main messy shape with irregular hairline */}
                <Path d="M17,47 Q15,25 22,14 Q33,4 50,6 Q67,4 78,14 Q85,25 83,47 L77,43 Q74,38 72,40 Q64,36 58,37 Q52,34 46,37 Q40,36 32,40 Q30,38 27,43 Z" fill={`url(#${mainGradientId})`} />

                {/* LAYER 3: Dark base strands sticking up */}
                <Path d="M22,18 L18,8" fill="none" stroke={shadow} strokeWidth={5} strokeLinecap="round" opacity={0.3} />
                <Path d="M35,13 L33,2" fill="none" stroke={shadow} strokeWidth={5} strokeLinecap="round" opacity={0.3} />
                <Path d="M50,12 L50,0" fill="none" stroke={shadow} strokeWidth={6} strokeLinecap="round" opacity={0.3} />
                <Path d="M65,13 L67,2" fill="none" stroke={shadow} strokeWidth={5} strokeLinecap="round" opacity={0.3} />
                <Path d="M78,18 L82,8" fill="none" stroke={shadow} strokeWidth={5} strokeLinecap="round" opacity={0.3} />

                {/* LAYER 4: Main color strands */}
                <Path d="M22,18 L18,8" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M35,13 L33,2" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M50,12 L50,0" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M65,13 L67,2" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M78,18 L82,8" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />

                {/* LAYER 5: Highlight strands on top */}
                <Path d="M22,18 L19,9" fill="none" stroke={highlight} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
                <Path d="M35,13 L34,3" fill="none" stroke={highlight} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
                <Path d="M50,12 L50,1" fill="none" stroke={highlight} strokeWidth={2.5} strokeLinecap="round" opacity={0.4} />
                <Path d="M65,13 L66,3" fill="none" stroke={highlight} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
                <Path d="M78,18 L81,9" fill="none" stroke={highlight} strokeWidth={2} strokeLinecap="round" opacity={0.4} />

                {/* LAYER 6: Internal messy texture */}
                <HairStrands startX={22} startY={25} endX={78} endY={40} count={15} color={shadow} opacity={0.2} curvature={5} />
                <HairStrands startX={26} startY={22} endX={74} endY={38} count={12} color={highlight} opacity={0.15} curvature={4} />
              </G>
            );

          case HairStyle.LONG_STRAIGHT:
            return (
              <G>
                {/* Top crown cap with natural hairline - the long draping part is in HairBehind */}
                <Path d="M18,45 Q16,13 50,8 Q84,13 82,45 Q78,41 74,43 Q64,39 58,40 Q52,37 46,40 Q40,39 28,43 Q24,41 18,45 Z" fill={`url(#${mainGradientId})`} />
                {/* Crown highlight ellipse */}
                <Ellipse cx={50} cy={18} rx={22} ry={9} fill={highlight} opacity={0.18} />
                {/* Top radial highlight */}
                <Ellipse cx={50} cy={18} rx={20} ry={9} fill={`url(#${highlightGradientId})`} />
                {/* Front framing pieces - side wisps layered over face */}
                <Path d="M22,36 Q20,50 22,64 L24,62 Q24,48 24,36" fill={hairColor} opacity={0.9} />
                <Path d="M78,36 Q80,50 78,64 L76,62 Q76,48 76,36" fill={hairColor} opacity={0.9} />
                {/* Wispy strand texture on framing pieces */}
                <HairStrands startX={22} startY={38} endX={23} endY={62} count={3} color={highlight} opacity={0.25} />
                <HairStrands startX={77} startY={38} endX={78} endY={62} count={3} color={highlight} opacity={0.25} />
              </G>
            );

          case HairStyle.LONG_WAVY:
            return (
              <G>
                {/* Top crown cap with natural hairline - the wavy body is in HairBehind */}
                <Path d="M18,45 Q16,13 50,8 Q84,13 82,45 Q78,41 74,43 Q64,39 58,40 Q52,37 46,40 Q40,39 28,43 Q24,41 18,45 Z" fill={`url(#${mainGradientId})`} />
                {/* Crown highlight ellipse */}
                <Ellipse cx={50} cy={18} rx={22} ry={9} fill={highlight} opacity={0.18} />
                {/* Top radial highlight */}
                <Ellipse cx={50} cy={18} rx={20} ry={9} fill={`url(#${highlightGradientId})`} />
                {/* Front framing wavy pieces - layered over face */}
                <Path d="M22,36 Q19,44 21,52 Q18,60 22,68 L24,66 Q22,58 24,50 Q22,42 24,36" fill={hairColor} opacity={0.9} />
                <Path d="M78,36 Q81,44 79,52 Q82,60 78,68 L76,66 Q78,58 76,50 Q78,42 76,36" fill={hairColor} opacity={0.9} />
                {/* Wavy texture on framing pieces */}
                <Path d="M22,40 Q20,48 22,56 Q20,64 22,68" fill="none" stroke={highlight} strokeWidth={0.8} opacity={0.3} />
                <Path d="M78,40 Q80,48 78,56 Q80,64 78,68" fill="none" stroke={highlight} strokeWidth={0.8} opacity={0.3} />
              </G>
            );

          case HairStyle.LONG_CURLY:
            return (
              <G>
                {/* LAYER 1: Shadow base */}
                <Path d="M18,45 Q16,13 50,8 Q84,13 82,45 Q78,41 74,43 Q64,39 58,40 Q52,37 46,40 Q40,39 28,43 Q24,41 18,45 Z" fill={deepShadow} opacity={0.15} />

                {/* LAYER 2: Main curly crown cap */}
                <Path d="M18,45 Q16,13 50,8 Q84,13 82,45 Q78,41 74,43 Q64,39 58,40 Q52,37 46,40 Q40,39 28,43 Q24,41 18,45 Z" fill={hairColor} />

                {/* LAYER 3: Main curl groups at crown - darker base */}
                <Circle cx="27" cy="22" r="6.5" fill={shadow} opacity={0.4} />
                <Circle cx="38" cy="16" r="6" fill={shadow} opacity={0.4} />
                <Circle cx="50" cy="13" r="6.5" fill={shadow} opacity={0.4} />
                <Circle cx="62" cy="16" r="6" fill={shadow} opacity={0.4} />
                <Circle cx="73" cy="22" r="6.5" fill={shadow} opacity={0.4} />

                {/* LAYER 4: Main curl colors */}
                <Circle cx="27" cy="22" r="6" fill={hairColor} />
                <Circle cx="38" cy="16" r="5.5" fill={hairColor} />
                <Circle cx="50" cy="13" r="6" fill={hairColor} />
                <Circle cx="62" cy="16" r="5.5" fill={hairColor} />
                <Circle cx="73" cy="22" r="6" fill={hairColor} />

                {/* LAYER 5: Highlight centers */}
                <Circle cx="27" cy="22" r="3.5" fill={highlight} opacity={0.3} />
                <Circle cx="38" cy="16" r="3" fill={highlight} opacity={0.3} />
                <Circle cx="50" cy="13" r="4" fill={highlight} opacity={0.35} />
                <Circle cx="62" cy="16" r="3" fill={highlight} opacity={0.3} />
                <Circle cx="73" cy="22" r="3.5" fill={highlight} opacity={0.3} />

                {/* LAYER 6: Additional small curls for texture */}
                <Circle cx="32" cy="18" r="3.5" fill={hairColor} />
                <Circle cx="44" cy="14" r="3.5" fill={hairColor} />
                <Circle cx="56" cy="14" r="3.5" fill={hairColor} />
                <Circle cx="68" cy="18" r="3.5" fill={hairColor} />

                {/* LAYER 7: Crown highlight */}
                <Ellipse cx={50} cy={18} rx={22} ry={9} fill={`url(#${highlightGradientId})`} />

                {/* LAYER 8: Front framing curly pieces - NOT covering face */}
                <Circle cx="24" cy="40" r="4" fill={hairColor} />
                <Circle cx="24" cy="40" r="2" fill={highlight} opacity={0.3} />
                <Circle cx="76" cy="40" r="4" fill={hairColor} />
                <Circle cx="76" cy="40" r="2" fill={highlight} opacity={0.3} />
              </G>
            );

          case HairStyle.LONG_PONYTAIL:
            return (
              <G>
                {/* LAYER 1: Ponytail depth shadow */}
                <Path d="M44,21 Q39,36 41,96 L59,96 Q61,36 56,21" fill={deepShadow} opacity={0.18} />

                {/* LAYER 2: Ponytail body with gradient */}
                <Path d="M45,20 Q40,35 42,95 L58,95 Q60,35 55,20" fill={`url(#${mainGradientId})`} />

                {/* LAYER 3: Hair tie shadow */}
                <Ellipse cx="50" cy="22" rx="7" ry="3.5" fill={deepShadow} />
                <Ellipse cx="50" cy="22" rx="5" ry="2" fill={shadow} opacity={0.5} />

                {/* LAYER 4: Front hair section with natural hairline */}
                <Path d="M20,41 Q18,14 50,9 Q82,14 80,41 L74,39 Q64,36 58,37 Q52,30 46,37 Q40,36 26,39 Z" fill={`url(#${sideGradientId})`} />

                {/* LAYER 5: Wispy hairline strands at forehead */}
                <Path d="M28,37 L27,39" fill="none" stroke={hairColor} strokeWidth={0.8} opacity={0.6} />
                <Path d="M35,35 L34,37" fill="none" stroke={hairColor} strokeWidth={0.8} opacity={0.6} />
                <Path d="M42,34 L41,36" fill="none" stroke={hairColor} strokeWidth={0.8} opacity={0.6} />
                <Path d="M58,34 L59,36" fill="none" stroke={hairColor} strokeWidth={0.8} opacity={0.6} />
                <Path d="M65,35 L66,37" fill="none" stroke={hairColor} strokeWidth={0.8} opacity={0.6} />
                <Path d="M72,37 L73,39" fill="none" stroke={hairColor} strokeWidth={0.8} opacity={0.6} />

                {/* LAYER 6: Crown highlights */}
                <Ellipse cx={50} cy={18} rx={18} ry={7} fill={highlight} opacity={0.18} />
                <Ellipse cx={50} cy={18} rx={17} ry={7} fill={`url(#${highlightGradientId})`} />

                {/* LAYER 7: Ponytail strand texture - multiple layers */}
                <HairStrands startX={44} startY={26} endX={47} endY={92} count={5} color={shadow} opacity={0.15} />
                <HairStrands startX={45} startY={25} endX={48} endY={90} count={5} color={highlight} opacity={0.2} />
                <HairStrands startX={53} startY={26} endX={56} endY={92} count={5} color={shadow} opacity={0.15} />
                <HairStrands startX={52} startY={25} endX={55} endY={90} count={5} color={highlight} opacity={0.2} />

                {/* LAYER 8: Ponytail side definition */}
                <Path d="M42,30 Q40,55 42,90" fill="none" stroke={shadow} strokeWidth={2} opacity={0.3} />
                <Path d="M58,30 Q60,55 58,90" fill="none" stroke={shadow} strokeWidth={2} opacity={0.3} />
              </G>
            );

          case HairStyle.LONG_BUN:
            return (
              <G>
                {/* LAYER 1: Front hair section with natural hairline */}
                <Path d="M20,41 Q18,14 50,9 Q82,14 80,41 L74,39 Q64,36 58,37 Q52,30 46,37 Q40,36 26,39 Z" fill={`url(#${sideGradientId})`} />

                {/* LAYER 2: Wispy hairline strands */}
                <Path d="M28,37 L27,39" fill="none" stroke={hairColor} strokeWidth={0.8} opacity={0.6} />
                <Path d="M35,35 L34,37" fill="none" stroke={hairColor} strokeWidth={0.8} opacity={0.6} />
                <Path d="M42,34 L41,36" fill="none" stroke={hairColor} strokeWidth={0.8} opacity={0.6} />
                <Path d="M58,34 L59,36" fill="none" stroke={hairColor} strokeWidth={0.8} opacity={0.6} />
                <Path d="M65,35 L66,37" fill="none" stroke={hairColor} strokeWidth={0.8} opacity={0.6} />
                <Path d="M72,37 L73,39" fill="none" stroke={hairColor} strokeWidth={0.8} opacity={0.6} />

                {/* LAYER 3: Bun shadow underneath */}
                <Ellipse cx="50" cy="14" rx="8" ry="3" fill={deepShadow} opacity={0.3} />

                {/* LAYER 4: Hair gathered to bun */}
                <Path d="M40,16 Q45,12 50,18 Q55,12 60,16" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.3} />

                {/* LAYER 5: Bun base shadow */}
                <Circle cx="50" cy="6.5" r="12.5" fill={deepShadow} opacity={0.2} />

                {/* LAYER 6: Bun main body */}
                <Circle cx="50" cy="6" r="12" fill={hairColor} />

                {/* LAYER 7: Bun swirl texture - darker strands */}
                <Path d="M42,6 Q50,-2 58,6 Q50,10 42,6" fill="none" stroke={shadow} strokeWidth={2} opacity={0.4} />
                <Path d="M45,3 Q50,0 55,3" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.3} />
                <Path d="M44,8 Q50,4 56,8" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.25} />

                {/* LAYER 8: Bun highlight on top */}
                <Circle cx="48" cy="4" r="4" fill={brightHighlight} opacity={0.25} />
                <Ellipse cx="50" cy="6" rx="8" ry="4" fill={highlight} opacity={0.15} />

                {/* LAYER 9: Crown highlight */}
                <Ellipse cx={50} cy={18} rx={15} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.AFRO:
            return (
              <G>
                {/* LAYER 1: Deep shadow base for depth */}
                <Path d="M16,42 Q8,32 10,18 Q12,4 26,-2 Q36,-6 50,-4 Q64,-6 74,-2 Q88,4 90,18 Q92,32 84,42 Q86,46 84,50 L80,48 Q78,42 76,38 L24,38 Q22,42 20,48 L16,50 Q14,46 16,42 Z" fill={deepShadow} opacity={0.3} />

                {/* LAYER 2: Main afro volume — halo around head with FACE CUTOUT */}
                <G>
                  <Defs>
                    <ClipPath id={`afro-clip-${gradientId}`}>
                      {/* Define afro volume shape */}
                      <Path d="M16,42 Q8,32 10,18 Q12,4 26,-2 Q36,-6 50,-4 Q64,-6 74,-2 Q88,4 90,18 Q92,32 84,42 Q86,46 84,50 L80,48 Q78,42 76,38 L24,38 Q22,42 20,48 L16,50 Q14,46 16,42 Z" />
                      {/* Subtract face area - oval cutout */}
                      <Ellipse cx="50" cy="48" rx="27" ry="32" fill="black" />
                    </ClipPath>
                  </Defs>
                  <Path
                    d="M16,42 Q8,32 10,18 Q12,4 26,-2 Q36,-6 50,-4 Q64,-6 74,-2 Q88,4 90,18 Q92,32 84,42 Q86,46 84,50 L80,48 Q78,42 76,38 L24,38 Q22,42 20,48 L16,50 Q14,46 16,42 Z"
                    fill={`url(#${mainGradientId})`}
                    clipPath={`url(#afro-clip-${gradientId})`}
                  />
                </G>

                {/* LAYER 3: Bumpy curly edge texture — circles along outline */}
                <Circle cx="14" cy="42" r="6" fill={hairColor} />
                <Circle cx="10" cy="32" r="5.5" fill={hairColor} />
                <Circle cx="14" cy="20" r="5" fill={hairColor} />
                <Circle cx="22" cy="8" r="5.5" fill={hairColor} />
                <Circle cx="30" cy="0" r="5" fill={hairColor} />
                <Circle cx="40" cy="-4" r="4.5" fill={hairColor} />
                <Circle cx="50" cy="-5" r="5" fill={hairColor} />
                <Circle cx="60" cy="-4" r="4.5" fill={hairColor} />
                <Circle cx="70" cy="0" r="5" fill={hairColor} />
                <Circle cx="78" cy="8" r="5.5" fill={hairColor} />
                <Circle cx="86" cy="20" r="5" fill={hairColor} />
                <Circle cx="90" cy="32" r="5.5" fill={hairColor} />
                <Circle cx="86" cy="42" r="6" fill={hairColor} />
                <Circle cx="8" cy="36" r="4.5" fill={hairColor} />
                <Circle cx="9" cy="26" r="4" fill={hairColor} />
                <Circle cx="92" cy="36" r="4.5" fill={hairColor} />
                <Circle cx="91" cy="26" r="4" fill={hairColor} />
                <Circle cx="86" cy="50" r="5" fill={hairColor} />
                <Circle cx="14" cy="50" r="5" fill={hairColor} />
                <Circle cx="6" cy="30" r="3.5" fill={hairColor} />
                <Circle cx="94" cy="30" r="3.5" fill={hairColor} />
                <Circle cx="18" cy="4" r="4" fill={hairColor} />
                <Circle cx="82" cy="4" r="4" fill={hairColor} />

                {/* LAYER 4: Curl texture groups - NOT covering face */}
                <CurlyTexture cx={18} cy={22} radius={12} color={shadow} count={8} />
                <CurlyTexture cx={82} cy={22} radius={12} color={shadow} count={8} />
                <CurlyTexture cx={50} cy={2} radius={18} color={highlight} count={12} />
                <CurlyTexture cx={32} cy={10} radius={10} color={highlight} count={6} />
                <CurlyTexture cx={68} cy={10} radius={10} color={highlight} count={6} />

                {/* LAYER 5: Crown highlight for shine */}
                <Ellipse cx={50} cy={10} rx={24} ry={10} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.SHORT_SIDE_PART:
            return (
              <G>
                {/* Lower hairline with side part - wider coverage */}
                <Path d="M21,46 Q21,12 50,9 Q79,12 79,46 Q79,49 74,51 L68,47 Q58,43 50,44 Q42,43 32,47 L26,51 Q21,49 21,46 Z" fill={`url(#${mainGradientId})`} />
                {/* Side part line — left side */}
                <Path d="M38,12 Q37,22 36,41" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.3} />
                <Ellipse cx={50} cy={22} rx={17} ry={7} fill={`url(#${highlightGradientId})`} />
                {/* Hairline shadow at hair-skin boundary */}
                <Ellipse cx={50} cy={47} rx={24} ry={3} fill={shadow} opacity={0.05} />
              </G>
            );

          case HairStyle.MOHAWK:
            return (
              <G>
                {/* Shaved sides - subtle stubble */}
                <Path d="M22,44 Q22,22 34,20 L34,46 Q28,46 22,44 Z" fill={hairColor} opacity={0.1} />
                <Path d="M78,44 Q78,22 66,20 L66,46 Q72,46 78,44 Z" fill={hairColor} opacity={0.1} />

                {/* LAYER 1: Shadow base for depth */}
                <Path d="M46,42 C46,42 45,28 44,18 C44,10 46,2 50,-8 C54,2 56,10 56,18 C55,28 54,42 54,42 Q50,40 46,42 Z" fill={deepShadow} opacity={0.2} />

                {/* LAYER 2: Main mohawk crest with tapered spiky shape */}
                <Path d={`M46,42
                  C46,42 45,28 44,18
                  C44,10 46,4 48,0 C49,-4 50,-8 50,-8
                  C50,-8 51,-4 52,0 C54,4 56,10 56,18
                  C55,28 54,42 54,42
                  Q50,40 46,42 Z`}
                  fill={`url(#${mainGradientId})`} />

                {/* LAYER 3: Tapered spiky peaks using bezier curves */}
                <Path d="M47,8 C46,6 45,2 46,0 C47,2 48,6 48,8" fill={hairColor} opacity={0.9} />
                <Path d="M53,8 C54,6 55,2 54,0 C53,2 52,6 52,8" fill={hairColor} opacity={0.9} />
                <Path d="M49,2 C48.5,0 48,-3 49,-5 C50,-3 50.5,0 50,2" fill={hairColor} opacity={0.9} />
                <Path d="M51,2 C51.5,0 52,-3 51,-5 C50,-3 49.5,0 50,2" fill={hairColor} opacity={0.9} />
                <Path d="M50,-5 C49.5,-6 49,-8 50,-10 C51,-8 50.5,-6 50,-5" fill={hairColor} opacity={0.9} />

                {/* LAYER 4: Highlight strands running up the center */}
                <Path d="M49,40 C49,32 48.5,18 49,8 C49.2,2 49.8,-5 50,-8 C50.2,-5 50.8,2 51,8 C51.5,18 51,32 51,40" fill={highlight} opacity={0.25} />
                <Path d="M49.5,38 C49.5,30 49,20 49.5,10 Q50,-4 50.5,10 C51,20 50.5,30 50.5,38" fill={brightHighlight} opacity={0.15} />

                {/* LAYER 5: Hairline shadow at base */}
                <Ellipse cx={50} cy={44} rx={8} ry={2} fill={shadow} opacity={0.05} />

                {/* LAYER 6: Top spike highlights */}
                <Path d="M48,4 L47,1" fill="none" stroke={brightHighlight} strokeWidth={0.8} opacity={0.4} />
                <Path d="M52,4 L53,1" fill="none" stroke={brightHighlight} strokeWidth={0.8} opacity={0.4} />
                <Path d="M50,0 L50,-4" fill="none" stroke={brightHighlight} strokeWidth={1} opacity={0.4} />
              </G>
            );

          case HairStyle.HAT_BEANIE:
            return (
              <G>
                {/* Hair peeking out */}
                <Path d="M22,42 Q25,38 30,40 L70,40 Q75,38 78,42" fill={hairColor} />
                {/* Beanie body with gradient */}
                <Defs>
                  <LinearGradient id={`beanie_${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#505050" />
                    <Stop offset="50%" stopColor="#404040" />
                    <Stop offset="100%" stopColor="#303030" />
                  </LinearGradient>
                </Defs>
                <Path d="M20,42 Q15,25 50,18 Q85,25 80,42 L20,42 Z" fill={`url(#beanie_${gradientId})`} />
                {/* Beanie ribbing */}
                <Rect x="20" y="36" width="60" height="8" fill="#454545" rx={2} />
                <Path d="M22,38 L78,38" fill="none" stroke="#555555" strokeWidth={1} />
                <Path d="M22,40" fill="none" stroke="#555555" strokeWidth={1} />
                <Path d="M22,42 L78,42" fill="none" stroke="#353535" strokeWidth={1} />
                {/* Pom pom */}
                <Circle cx="50" cy="12" r="6" fill="#505050" />
                <Circle cx="48" cy="10" r="2" fill="#606060" opacity={0.5} />
              </G>
            );

          case HairStyle.HAT_CAP:
            return (
              <G>
                {/* Hair at back */}
                <Path d="M22,45 L22,55 Q22,65 30,65 L70,65 Q78,65 78,55 L78,45" fill={hairColor} />
                {/* Cap body with gradient */}
                <Defs>
                  <LinearGradient id={`cap_${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#3182ce" />
                    <Stop offset="100%" stopColor="#2c5282" />
                  </LinearGradient>
                </Defs>
                <Path d="M18,38 Q15,25 50,20 Q85,25 82,38 L18,38 Z" fill={`url(#cap_${gradientId})`} />
                {/* Cap brim */}
                <Path d="M20,38 Q10,38 15,46 L38,42 L20,38 Z" fill="#1a365d" />
                {/* Brim shadow */}
                <Path d="M18,38 L38,42 L20,40 Z" fill="#153e75" opacity={0.5} />
                {/* Cap button */}
                <Circle cx="50" cy="22" r="2" fill="#234e82" />
                {/* Cap seam lines */}
                <Path d="M50,22 L50,38" fill="none" stroke="#2a5a8c" strokeWidth={1} opacity={0.4} />
                <Path d="M35,24 L28,38" fill="none" stroke="#2a5a8c" strokeWidth={1} opacity={0.3} />
                <Path d="M65,24 L72,38" fill="none" stroke="#2a5a8c" strokeWidth={1} opacity={0.3} />
              </G>
            );

          case HairStyle.HIJAB:
            // Hijab front layer: proper draping fabric shape with fold lines
            // The back drape is rendered in HairBehind
            {
              const hijabColor = hairColor || '#805ad5';
              const hijabDark = adjustBrightness(hijabColor, -25);
              const hijabDeep = adjustBrightness(hijabColor, -40);
              const hijabHighlight = adjustBrightness(hijabColor, 20);
              return (
                <G>
                  <Defs>
                    <LinearGradient id={`hijab_${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <Stop offset="0%" stopColor={hijabHighlight} />
                      <Stop offset="50%" stopColor={hijabColor} />
                      <Stop offset="100%" stopColor={hijabDark} />
                    </LinearGradient>
                  </Defs>

                  {/* LAYER 1: Top crown - fabric wrapping over forehead */}
                  <Path d="M16,36 Q14,12 50,3 Q86,12 84,36 Q78,30 50,26 Q22,30 16,36 Z" fill={`url(#hijab_${gradientId})`} />

                  {/* LAYER 2: Left side drape - flowing fabric framing face */}
                  <Path d="M24,30 Q16,36 12,50 Q10,65 12,80 L10,95 L26,95 L27,80 Q27,58 26,42 Q25,34 24,30 Z" fill={`url(#hijab_${gradientId})`} />

                  {/* LAYER 3: Right side drape - mirror */}
                  <Path d="M76,30 Q84,36 88,50 Q90,65 88,80 L90,95 L74,95 L73,80 Q73,58 74,42 Q75,34 76,30 Z" fill={`url(#hijab_${gradientId})`} />

                  {/* LAYER 4: Fabric fold lines for depth */}
                  <Path d="M16,50 Q18,65 16,82" fill="none" stroke={hijabDeep} strokeWidth={1.5} opacity={0.25} />
                  <Path d="M84,50 Q82,65 84,82" fill="none" stroke={hijabDeep} strokeWidth={1.5} opacity={0.25} />
                  <Path d="M20,40 Q22,55 20,70" fill="none" stroke={hijabDeep} strokeWidth={1.2} opacity={0.2} />
                  <Path d="M80,40 Q78,55 80,70" fill="none" stroke={hijabDeep} strokeWidth={1.2} opacity={0.2} />

                  {/* LAYER 5: Inner edge along face - subtle definition */}
                  <Path d="M26,34 Q22,46 22,58 Q24,72 30,80 Q40,86 50,86 Q60,86 70,80 Q76,72 78,58 Q78,46 74,34" fill="none" stroke={hijabDeep} strokeWidth={0.8} opacity={0.15} />

                  {/* LAYER 6: Top fabric highlight */}
                  <Ellipse cx={50} cy={14} rx={18} ry={6} fill={hijabHighlight} opacity={0.2} />

                  {/* LAYER 7: Draping shadows on sides */}
                  <Path d="M12,48 Q10,58 12,68" fill="none" stroke={hijabDeep} strokeWidth={2} opacity={0.2} />
                  <Path d="M88,48 Q90,58 88,68" fill="none" stroke={hijabDeep} strokeWidth={2} opacity={0.2} />
                </G>
              );
            }

          case HairStyle.TURBAN:
            return (
              <G>
                <Defs>
                  <LinearGradient id={`turban_${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#ed8936" />
                    <Stop offset="50%" stopColor="#dd6b20" />
                    <Stop offset="100%" stopColor="#c05621" />
                  </LinearGradient>
                </Defs>
                <Path d="M18,45 Q12,28 50,15 Q88,28 82,45 L82,38 Q82,20 50,18 Q18,20 18,38 Z" fill={`url(#turban_${gradientId})`} />
                {/* Fabric wrapping lines */}
                <Path d="M22,35 Q50,28 78,35" fill="none" stroke="#c05621" strokeWidth={2} opacity={0.5} />
                <Path d="M24,30 Q50,24 76,30" fill="none" stroke="#c05621" strokeWidth={1.5} opacity={0.4} />
                <Path d="M26,25 Q50,20 74,25" fill="none" stroke="#c05621" strokeWidth={1.5} opacity={0.4} />
                {/* Highlight bands */}
                <Path d="M25,32 Q50,26 75,32" fill="none" stroke="#ed8936" strokeWidth={1.5} opacity={0.3} />
                {/* Center jewel */}
                <Circle cx="50" cy="25" r="4" fill="#ffd700" />
                <Circle cx="49" cy="24" r="1.5" fill="#fff5d4" opacity={0.6} />
              </G>
            );

          // ============================================================================
          // PHASE 1.1 EXPANSION - Modern Trends (REMOVED)
          // ============================================================================

          // ============================================================================
          // PHASE 1.1 EXPANSION - Braided & Protective Styles (REMOVED)
          // ============================================================================

          case HairStyle.LONG_BUN_TOP:
            return (
              <G>
                {/* Front hair pulled back */}
                <Path d="M20,41 Q18,14 50,9 Q82,14 80,41 L74,39 Q50,30 26,39 Z" fill={`url(#${sideGradientId})`} />
                {/* Top bun */}
                <Circle cx={50} cy={12} r={9} fill={hairColor} />
                <Path d="M43,12 Q50,5 57,12 Q50,16 43,12" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.35} />
                <Circle cx={48} cy={10} r={3} fill={highlight} opacity={0.2} />
                {/* Wispy side pieces */}
                <Path d="M28,34 Q26,40 28,46" fill="none" stroke={hairColor} strokeWidth={2} opacity={0.5} />
                <Path d="M72,34 Q74,40 72,46" fill="none" stroke={hairColor} strokeWidth={2} opacity={0.5} />
                <Ellipse cx={50} cy={18} rx={15} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.MEDIUM_WOLF_CUT:
            return (
              <G>
                {/* Main top section with natural hairline */}
                <Path d="M19,41 Q17,12 50,8 Q83,12 81,41 L76,39 Q70,36 64,37 Q58,35 50,35 Q42,35 36,37 Q30,36 24,39 Z" fill={`url(#${mainGradientId})`} />
                {/* Layered face-framing pieces - left */}
                <Path d="M26,32 Q22,45 24,58 Q23,62 26,60" fill={hairColor} />
                <Path d="M26,34 Q24,44 25,55" fill="none" stroke={shadow} strokeWidth={1.2} opacity={0.3} />
                {/* Layered face-framing pieces - right */}
                <Path d="M74,32 Q78,45 76,58 Q77,62 74,60" fill={hairColor} />
                <Path d="M74,34 Q76,44 75,55" fill="none" stroke={shadow} strokeWidth={1.2} opacity={0.3} />
                {/* Choppy top texture */}
                <Path d="M35,18 Q40,14 45,18" fill="none" stroke={shadow} strokeWidth={1} opacity={0.2} />
                <Path d="M55,18 Q60,14 65,18" fill="none" stroke={shadow} strokeWidth={1} opacity={0.2} />
                <Ellipse cx={50} cy={18} rx={16} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.SHORT_TEXTURED_CROP:
            return (
              <G>
                {/* Short cropped top with lower hairline */}
                <Path d="M23,37 Q23,12 50,8 Q77,12 77,37 L72,37 Q50,28 28,37 Z" fill={`url(#${mainGradientId})`} />
                {/* Subtle edge definition */}
                <Path d="M30,28 Q50,24 70,28" fill="none" stroke={shadow} strokeWidth={0.8} strokeLinecap="round" opacity={0.15} />
                <Ellipse cx={50} cy={18} rx={14} ry={5} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.LONG_CURTAIN_BANGS:
            return (
              <G>
                {/* Main hair frame */}
                <Path d="M17,43 Q15,12 50,7 Q85,12 83,43 L83,72 Q80,80 50,78 Q20,80 17,72 Z" fill={`url(#${mainGradientId})`} />
                {/* Center part */}
                <Path d="M50,12 L50,32" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.35} />
                {/* Left curtain bang */}
                <Path d="M50,14 Q38,18 30,34 Q28,38 30,36" fill={hairColor} />
                <Path d="M48,16 Q40,22 34,32" fill="none" stroke={shadow} strokeWidth={1} opacity={0.25} />
                {/* Right curtain bang */}
                <Path d="M50,14 Q62,18 70,34 Q72,38 70,36" fill={hairColor} />
                <Path d="M52,16 Q60,22 66,32" fill="none" stroke={shadow} strokeWidth={1} opacity={0.25} />
                <Ellipse cx={50} cy={18} rx={16} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.MEDIUM_SHAG:
            return (
              <G>
                {/* Main shag shape */}
                <Path d="M17,43 Q15,12 50,7 Q85,12 83,43 L83,70 Q78,76 50,74 Q22,76 17,70 Z" fill={`url(#${mainGradientId})`} />
                {/* Choppy face-framing layers - left */}
                <Path d="M24,34 Q20,44 22,56 L26,52 Q24,42 28,34" fill={hairColor} />
                {/* Choppy face-framing layers - right */}
                <Path d="M76,34 Q80,44 78,56 L74,52 Q76,42 72,34" fill={hairColor} />
                {/* Choppy texture lines */}
                <Path d="M30,30 L28,36" fill="none" stroke={shadow} strokeWidth={1.2} opacity={0.25} />
                <Path d="M70,30 L72,36" fill="none" stroke={shadow} strokeWidth={1.2} opacity={0.25} />
                <Path d="M38,24 Q42,20 46,24" fill="none" stroke={shadow} strokeWidth={1} opacity={0.2} />
                <Ellipse cx={50} cy={18} rx={16} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.LONG_BRAIDS:
            return (
              <G>
                {/* Top hair section */}
                <Path d="M20,41 Q18,14 50,9 Q82,14 80,41 L74,39 Q50,30 26,39 Z" fill={`url(#${sideGradientId})`} />
                {/* Left braid falling forward */}
                <Path d="M28,36 Q24,50 26,70 Q24,82 28,90" fill={hairColor} strokeWidth={5} stroke={hairColor} strokeLinecap="round" />
                <Path d="M28,40 L26,44 L30,48 L26,52 L30,56 L26,60 L30,64 L26,68 L30,72 L26,76 L30,80 L28,84" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.3} />
                {/* Right braid falling forward */}
                <Path d="M72,36 Q76,50 74,70 Q76,82 72,90" fill={hairColor} strokeWidth={5} stroke={hairColor} strokeLinecap="round" />
                <Path d="M72,40 L74,44 L70,48 L74,52 L70,56 L74,60 L70,64 L74,68 L70,72 L74,76 L70,80 L72,84" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.3} />
                <Ellipse cx={50} cy={18} rx={15} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.SHORT_CAESAR:
            return (
              <G>
                {/* Short cropped top */}
                <Path d="M23,39 Q23,12 50,8 Q77,12 77,39 L72,37 Q50,28 28,37 Z" fill={`url(#${mainGradientId})`} />
                {/* Straight horizontal bangs */}
                <Path d="M30,32 L70,32 L70,28 L30,28 Z" fill={hairColor} />
                <Path d="M30,30 L70,30" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
                <Ellipse cx={50} cy={18} rx={14} ry={5} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.MEDIUM_LOB:
            return (
              <G>
                {/* Main lob shape framing face with natural hairline */}
                <Path d="M17,41 Q15,12 50,7 Q85,12 83,41 Q80,37 77,39 Q67,34 58,35 Q52,32 46,35 Q37,34 27,39 Q24,37 17,41 L17,64 Q20,70 30,72 Q40,74 50,72 Q60,74 70,72 Q80,70 83,64 Z" fill={`url(#${mainGradientId})`} />
                {/* Face-framing sides */}
                <Path d="M24,34 Q22,48 24,62" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.25} />
                <Path d="M76,34 Q78,48 76,62" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.25} />
                {/* Strand detail */}
                <Path d="M36,22 L36,66" fill="none" stroke={shadow} strokeWidth={1} opacity={0.15} />
                <Path d="M64,22 L64,66" fill="none" stroke={shadow} strokeWidth={1} opacity={0.15} />
                <Ellipse cx={50} cy={18} rx={16} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.LONG_CENTER_PART:
            return (
              <G>
                {/* Long straight hair with center part */}
                <Path d="M15,43 Q13,12 50,7 Q87,12 85,43 L85,82 Q82,90 50,88 Q18,90 15,82 Z" fill={`url(#${mainGradientId})`} />
                {/* Center part line */}
                <Path d="M50,10 L50,34" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.4} />
                {/* Left curtain */}
                <Path d="M50,12 Q34,18 26,36" fill="none" stroke={shadow} strokeWidth={1.2} opacity={0.2} />
                {/* Right curtain */}
                <Path d="M50,12 Q66,18 74,36" fill="none" stroke={shadow} strokeWidth={1.2} opacity={0.2} />
                {/* Vertical strand texture */}
                <Path d="M28,40 L28,82" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.18} />
                <Path d="M72,40 L72,82" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.18} />
                <Ellipse cx={50} cy={18} rx={16} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.SHORT_PIXIE_TEXTURED:
            return (
              <G>
                {/* Short pixie base */}
                <Path d="M25,39 Q25,14 50,9 Q75,14 75,39 L70,37 Q50,28 30,37 Z" fill={`url(#${mainGradientId})`} />
                {/* Textured fringe at forehead - soft waves */}
                <Path d="M34,30 Q37,24 40,29 Q43,23 47,28 Q50,22 53,28 Q57,23 60,29 Q63,24 66,30" fill="none" stroke={hairColor} strokeWidth={2.5} strokeLinecap="round" />
                {/* Side texture */}
                <Path d="M30,32 Q28,36 30,38" fill="none" stroke={shadow} strokeWidth={1.2} opacity={0.3} />
                <Path d="M70,32 Q72,36 70,38" fill="none" stroke={shadow} strokeWidth={1.2} opacity={0.3} />
                <Ellipse cx={50} cy={18} rx={13} ry={5} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          default:
            return (
              <G>
                <Path d="M21,42 Q21,10 50,7 Q79,10 79,42 Q79,45 74,47 L68,43 Q58,39 50,40 Q42,39 32,43 L26,47 Q21,45 21,42 Z" fill={`url(#${mainGradientId})`} />
                <Ellipse cx={50} cy={20} rx={18} ry={7} fill={`url(#${highlightGradientId})`} />
              </G>
            );
        }
      })()}
      {/* Render highlight streaks on top of hair for highlight/streak treatments */}
      {renderHighlightStreaks()}
      {/* Hairline shadow — soft gradient at forehead hairline for natural integration */}
      {style !== HairStyle.BALD && style !== HairStyle.SHAVED && (
        <G>
          {/* Very soft hairline blend — large radius, low opacity */}
          <Ellipse
            cx={50}
            cy={38}
            rx={30}
            ry={10}
            fill={hairlineShadowColor}
            opacity={0.04}
          />
        </G>
      )}
    </G>
  );
}

type HairBehindGradientIds = {
  behindGradient: string;
  treatmentBehind: string;
};

export function HairBehind({ style, hairColor, hairTreatment = HairTreatment.NONE, hairSecondaryColor, scale = 1 }: HairProps) {
  // Stable gradient IDs - must be called before early return (Rules of Hooks)
  const ids = useGradientIds<HairBehindGradientIds>(['behindGradient', 'treatmentBehind']);
  const behindGradientId = ids.behindGradient;
  const treatmentBehindId = ids.treatmentBehind;

  // Synchronized with LONG_HAIR_STYLES in Avatar.tsx
  const longStyles = [
    // Long styles
    HairStyle.LONG_STRAIGHT, HairStyle.LONG_WAVY, HairStyle.LONG_CURLY,
    HairStyle.LONG_PONYTAIL, HairStyle.LONG_PONYTAIL_HIGH, HairStyle.LONG_PONYTAIL_LOW, HairStyle.LONG_PONYTAIL_SIDE,
    HairStyle.LONG_BUN, HairStyle.LONG_BUN_MESSY, HairStyle.LONG_BUN_TOP, HairStyle.LONG_CHIGNON,
    HairStyle.LONG_BRAIDS, HairStyle.LONG_BRAID_SINGLE, HairStyle.LONG_BRAIDS_PIGTAILS,
    HairStyle.LONG_LAYERS, HairStyle.LONG_BEACH_WAVES, HairStyle.LONG_DEFINED_CURLS,
    HairStyle.LONG_HALF_UP, HairStyle.LONG_HALF_UP_BUN, HairStyle.LONG_SIDE_SWEPT, HairStyle.LONG_CENTER_PART,
    HairStyle.LONG_CURTAIN_BANGS, HairStyle.LONG_SPACE_BUNS, HairStyle.LONG_PIGTAILS, HairStyle.LONG_TWISTS,
    // Medium styles
    HairStyle.MEDIUM_STRAIGHT, HairStyle.MEDIUM_CURLY, HairStyle.MEDIUM_BOB, HairStyle.MEDIUM_BOB_ANGLED,
    HairStyle.MEDIUM_BOB_LAYERED, HairStyle.MEDIUM_BOB_BLUNT, HairStyle.MEDIUM_LOB, HairStyle.MEDIUM_SHAG,
    HairStyle.MEDIUM_WOLF_CUT, HairStyle.MEDIUM_LAYERS, HairStyle.MEDIUM_CURTAIN_BANGS, HairStyle.MEDIUM_WAVY,
    HairStyle.MEDIUM_CURLY_DEFINED, HairStyle.MEDIUM_TWIST_OUT, HairStyle.MEDIUM_HALF_UP,
    HairStyle.MEDIUM_SIDE_SWEPT, HairStyle.MEDIUM_FEATHERED,
    // Protective styles (long variants)
    HairStyle.AFRO, HairStyle.LOCS, HairStyle.BOX_BRAIDS, HairStyle.TWIST_OUT_LONG,
    HairStyle.SILK_PRESS, HairStyle.NATURAL_CURLS,
    // Headwear
    HairStyle.HIJAB,
  ];
  if (!longStyles.includes(style)) return null;

  const shadow = adjustBrightness(hairColor, -30);
  const deepShadow = adjustBrightness(hairColor, -45);
  const secondaryColor = hairSecondaryColor || adjustBrightness(hairColor, 60);

  // Check if using ombre/gradient treatment
  const usesOmbreTreatment = hairTreatment && [
    HairTreatment.OMBRE_SUBTLE,
    HairTreatment.OMBRE_DRAMATIC,
    HairTreatment.TIPS_COLORED,
    HairTreatment.PEEKABOO,
  ].includes(hairTreatment);

  // Determine which gradient to use based on treatment
  const mainBehindGradientId = usesOmbreTreatment ? treatmentBehindId : behindGradientId;

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        <LinearGradient id={behindGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={shadow} />
          <Stop offset="50%" stopColor={hairColor} />
          <Stop offset="100%" stopColor={deepShadow} />
        </LinearGradient>
        {/* Treatment gradient for ombre effects on back hair */}
        {usesOmbreTreatment && (
          <LinearGradient id={treatmentBehindId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={shadow} />
            <Stop offset="40%" stopColor={hairColor} />
            <Stop offset="70%" stopColor={blendColors(hairColor, secondaryColor, 0.5)} />
            <Stop offset="100%" stopColor={secondaryColor} />
          </LinearGradient>
        )}
      </Defs>
      {(() => {
        switch (style) {
          // Straight styles - vertical strand texture
          case HairStyle.LONG_STRAIGHT:
          case HairStyle.MEDIUM_STRAIGHT:
          case HairStyle.SILK_PRESS:
          case HairStyle.LONG_LAYERS:
          case HairStyle.LONG_SIDE_SWEPT:
          case HairStyle.LONG_CENTER_PART:
          case HairStyle.LONG_CURTAIN_BANGS:
          case HairStyle.MEDIUM_LAYERS:
          case HairStyle.MEDIUM_SIDE_SWEPT:
          case HairStyle.MEDIUM_FEATHERED:
          case HairStyle.MEDIUM_CURTAIN_BANGS:
            return (
              <G>
                {/* Left side drape */}
                <Path d="M22,28 Q15,28 13,38 L13,90 Q13,95 22,95 L24,95 L24,70 Q24,48 22,28 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Right side drape */}
                <Path d="M78,28 Q85,28 87,38 L87,90 Q87,95 78,95 L76,95 L76,70 Q76,48 78,28 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Bottom connection behind neck */}
                <Path d="M24,75 L24,95 L76,95 L76,75 Q50,80 24,75 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Vertical strand texture */}
                <Path d="M17,38 L17,90" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
                <Path d="M30,75 L30,92" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M50,78 L50,92" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M70,75 L70,92" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M83,38 L83,90" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
              </G>
            );

          // Wavy styles - wavy strand texture
          case HairStyle.LONG_WAVY:
          case HairStyle.LONG_BEACH_WAVES:
          case HairStyle.MEDIUM_WAVY:
            return (
              <G>
                {/* Left side drape */}
                <Path d="M22,28 Q15,28 13,38 L13,90 Q13,95 22,95 L24,95 L24,70 Q24,48 22,28 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Right side drape */}
                <Path d="M78,28 Q85,28 87,38 L87,90 Q87,95 78,95 L76,95 L76,70 Q76,48 78,28 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Bottom connection behind neck */}
                <Path d="M24,75 L24,95 L76,95 L76,75 Q50,80 24,75 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Wavy strand texture */}
                <Path d="M17,38 Q20,55 16,70 Q20,85 18,92" fill="none" stroke={shadow} strokeWidth={2} opacity={0.2} />
                <Path d="M83,38 Q80,55 84,70 Q80,85 82,92" fill="none" stroke={shadow} strokeWidth={2} opacity={0.2} />
                <Path d="M30,75 Q33,83 29,92" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M70,75 Q67,83 71,92" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
              </G>
            );

          // Curly/voluminous styles - elliptical shape with curly texture
          case HairStyle.LONG_CURLY:
          case HairStyle.LONG_DEFINED_CURLS:
          case HairStyle.MEDIUM_CURLY:
          case HairStyle.MEDIUM_CURLY_DEFINED:
          case HairStyle.AFRO:
          case HairStyle.NATURAL_CURLS:
          case HairStyle.TWIST_OUT_LONG:
          case HairStyle.MEDIUM_TWIST_OUT:
            return (
              <G>
                {/* Left volume */}
                <Ellipse cx="14" cy="48" rx="19" ry="32" fill={`url(#${mainBehindGradientId})`} />
                {/* Right volume */}
                <Ellipse cx="86" cy="48" rx="19" ry="32" fill={`url(#${mainBehindGradientId})`} />
                {/* Bottom volume below chin */}
                <Ellipse cx="50" cy="85" rx="35" ry="18" fill={`url(#${mainBehindGradientId})`} />
                {/* Top volume above head */}
                <Ellipse cx="50" cy="8" rx="34" ry="14" fill={`url(#${mainBehindGradientId})`} />
                {/* Curly texture */}
                <CurlyTexture cx={14} cy={48} radius={15} color={shadow} count={8} />
                <CurlyTexture cx={86} cy={48} radius={15} color={shadow} count={8} />
                <CurlyTexture cx={50} cy={85} radius={20} color={shadow} count={10} />
              </G>
            );

          // Braided/loc styles - textured strands
          case HairStyle.LONG_BRAIDS:
          case HairStyle.LONG_BRAID_SINGLE:
          case HairStyle.LONG_BRAIDS_PIGTAILS:
          case HairStyle.LONG_TWISTS:
          case HairStyle.LONG_PIGTAILS:
          case HairStyle.BOX_BRAIDS:
          case HairStyle.LOCS:
            return (
              <G>
                {/* Left side drape */}
                <Path d="M22,28 Q15,28 13,38 L13,90 Q13,95 22,95 L24,95 L24,70 Q24,48 22,28 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Right side drape */}
                <Path d="M78,28 Q85,28 87,38 L87,90 Q87,95 78,95 L76,95 L76,70 Q76,48 78,28 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Bottom connection behind neck */}
                <Path d="M24,75 L24,95 L76,95 L76,75 Q50,80 24,75 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Braided/loc strand texture */}
                <Path d="M20,40 L20,90" fill="none" stroke={shadow} strokeWidth={3} opacity={0.25} />
                <Path d="M30,75 L30,92" fill="none" stroke={shadow} strokeWidth={3} opacity={0.2} />
                <Path d="M40,78 L40,92" fill="none" stroke={shadow} strokeWidth={3} opacity={0.2} />
                <Path d="M50,78 L50,92" fill="none" stroke={shadow} strokeWidth={3} opacity={0.15} />
                <Path d="M60,78 L60,92" fill="none" stroke={shadow} strokeWidth={3} opacity={0.2} />
                <Path d="M70,75 L70,92" fill="none" stroke={shadow} strokeWidth={3} opacity={0.2} />
                <Path d="M80,40 L80,90" fill="none" stroke={shadow} strokeWidth={3} opacity={0.25} />
              </G>
            );

          // Bob/medium-length styles - shorter behind layer
          case HairStyle.MEDIUM_BOB:
          case HairStyle.MEDIUM_BOB_ANGLED:
          case HairStyle.MEDIUM_BOB_LAYERED:
          case HairStyle.MEDIUM_BOB_BLUNT:
          case HairStyle.MEDIUM_LOB:
          case HairStyle.MEDIUM_SHAG:
          case HairStyle.MEDIUM_WOLF_CUT:
            return (
              <G>
                {/* Left side */}
                <Path d="M22,28 Q17,28 15,36 L15,72 Q15,76 22,76 L24,76 L24,48 Q24,36 22,28 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Right side */}
                <Path d="M78,28 Q83,28 85,36 L85,72 Q85,76 78,76 L76,76 L76,48 Q76,36 78,28 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Bottom behind neck */}
                <Path d="M24,68 L24,76 L76,76 L76,68 Q50,72 24,68 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Shorter texture */}
                <Path d="M22,40 L22,72" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
                <Path d="M30,68 L30,74" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M70,68 L70,74" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M78,40 L78,72" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
              </G>
            );

          // Half-up styles - partial behind layer
          case HairStyle.LONG_HALF_UP:
          case HairStyle.LONG_HALF_UP_BUN:
          case HairStyle.MEDIUM_HALF_UP:
            return (
              <G>
                {/* Left side */}
                <Path d="M22,38 Q17,38 15,46 L15,90 Q15,95 22,95 L24,95 L24,70 Q24,53 22,38 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Right side */}
                <Path d="M78,38 Q83,38 85,46 L85,90 Q85,95 78,95 L76,95 L76,70 Q76,53 78,38 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Bottom connection */}
                <Path d="M24,75 L24,95 L76,95 L76,75 Q50,80 24,75 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Half-up texture */}
                <Path d="M22,50 L22,90" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
                <Path d="M50,78 L50,92" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M78,50 L78,90" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
              </G>
            );

          // Ponytail/bun styles - minimal behind layer
          case HairStyle.LONG_PONYTAIL:
          case HairStyle.LONG_PONYTAIL_HIGH:
          case HairStyle.LONG_PONYTAIL_LOW:
          case HairStyle.LONG_PONYTAIL_SIDE:
          case HairStyle.LONG_BUN:
          case HairStyle.LONG_BUN_MESSY:
          case HairStyle.LONG_BUN_TOP:
          case HairStyle.LONG_CHIGNON:
          case HairStyle.LONG_SPACE_BUNS:
            return (
              <G>
                {/* Minimal behind layer for pulled-back styles - thin strip below chin */}
                <Path d="M30,68 L30,80 L70,80 L70,68 Q50,72 30,68 Z" fill={`url(#${mainBehindGradientId})`} />
                <Path d="M32,70 L32,78" fill="none" stroke={shadow} strokeWidth={1} opacity={0.15} />
                <Path d="M68,70 L68,78" fill="none" stroke={shadow} strokeWidth={1} opacity={0.15} />
              </G>
            );

          case HairStyle.HIJAB:
            {
              const hijabBehindColor = hairColor || '#805ad5';
              const hijabBehindDark = adjustBrightness(hijabBehindColor, -30);
              const hijabBehindDeep = adjustBrightness(hijabBehindColor, -45);
              return (
                <G>
                  <Defs>
                    <LinearGradient id={`hijabBehind_${behindGradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <Stop offset="0%" stopColor={hijabBehindDark} />
                      <Stop offset="100%" stopColor={hijabBehindDeep} />
                    </LinearGradient>
                  </Defs>
                  {/* Main back drape - large shape behind the head */}
                  <Path d="M15,25 Q10,18 22,10 Q35,3 50,3 Q65,3 78,10 Q90,18 85,25 L88,95 L12,95 Z" fill={`url(#hijabBehind_${behindGradientId})`} />
                  {/* Fabric fold shadows */}
                  <Path d="M22,40 Q24,60 22,85" fill="none" stroke={hijabBehindDeep} strokeWidth={2} opacity={0.25} />
                  <Path d="M78,40 Q76,60 78,85" fill="none" stroke={hijabBehindDeep} strokeWidth={2} opacity={0.25} />
                  <Path d="M40,80 L40,95" fill="none" stroke={hijabBehindDeep} strokeWidth={1.5} opacity={0.15} />
                  <Path d="M60,80 L60,95" fill="none" stroke={hijabBehindDeep} strokeWidth={1.5} opacity={0.15} />
                </G>
              );
            }

          default:
            // For any unhandled long style, render a basic behind layer
            return (
              <G>
                {/* Left side drape */}
                <Path d="M22,28 Q15,28 13,38 L13,90 Q13,95 22,95 L24,95 L24,70 Q24,48 22,28 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Right side drape */}
                <Path d="M78,28 Q85,28 87,38 L87,90 Q87,95 78,95 L76,95 L76,70 Q76,48 78,28 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Bottom connection */}
                <Path d="M24,75 L24,95 L76,95 L76,75 Q50,80 24,75 Z" fill={`url(#${mainBehindGradientId})`} />
              </G>
            );
        }
      })()}
    </G>
  );
}

export default Hair;
