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
          <Stop offset="30%" stopColor={hairColor} />
          <Stop offset="70%" stopColor={shadow} />
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
                <Path d="M25,30 Q25,12 50,10 Q75,12 75,30 Q75,35 70,38 L30,38 Q25,35 25,30 Z" fill={hairColor} opacity={0.25} />
                {/* Stubble texture */}
                <Path d="M28,28 Q50,22 72,28" fill="none" stroke={hairColor} strokeWidth={0.5} strokeDasharray="1,2" opacity={0.4} />
                <Path d="M30,32 Q50,28 70,32" fill="none" stroke={hairColor} strokeWidth={0.5} strokeDasharray="1,2" opacity={0.3} />
              </G>
            );

          case HairStyle.SHORT_BUZZ:
            return (
              <G>
                {/* Depth shadow layer behind main shape */}
                <Path d="M24,33 Q24,13 50,11 Q76,13 76,33 Q76,37 73,39 L66,29 Q50,23 34,29 L27,39 Q24,37 24,33 Z" fill={deepShadow} opacity={0.18} />
                {/* Main shape with natural hairline edge - slightly irregular bottom */}
                <Path d="M25,32 Q25,14 50,12 Q75,14 75,32 Q75,36 72,38 L68,36 Q62,34 56,35 Q50,30 44,35 Q38,34 32,36 L28,38 Q25,36 25,32 Z" fill={`url(#${mainGradientId})`} />
                {/* Crown highlight ellipse */}
                <Ellipse cx={50} cy={20} rx={14} ry={6} fill={highlight} opacity={0.18} />
                {/* Buzzcut texture lines */}
                <Path d="M30,28 Q50,20 70,28" fill="none" stroke={highlight} strokeWidth={0.5} opacity={0.3} />
                <Path d="M32,24 Q50,18 68,24" fill="none" stroke={highlight} strokeWidth={0.5} opacity={0.25} />
                {/* Side fade */}
                <Path d="M26,32 Q28,28 30,32" fill={shadow} opacity={0.3} />
                <Path d="M74,32 Q72,28 70,32" fill={shadow} opacity={0.3} />
              </G>
            );

          case HairStyle.SHORT_CREW:
            return (
              <G>
                {/* Depth shadow layer behind main shape */}
                <Path d="M23,35 Q23,11 50,9 Q77,11 77,35 Q77,39 73,41 L69,33 Q50,25 31,33 L27,41 Q23,39 23,35 Z" fill={deepShadow} opacity={0.18} />
                {/* Main shape with natural hairline edge */}
                <Path d="M24,34 Q24,12 50,10 Q76,12 76,34 Q76,38 72,40 L68,36 Q62,34 56,35 Q50,28 44,35 Q38,34 32,36 L28,40 Q24,38 24,34 Z" fill={`url(#${mainGradientId})`} />
                {/* Top highlight */}
                <Path d="M30,22 Q50,14 70,22 Q50,18 30,22 Z" fill={`url(#${highlightGradientId})`} />
                {/* Crown highlight ellipse */}
                <Ellipse cx={50} cy={18} rx={16} ry={7} fill={highlight} opacity={0.16} />
                {/* Hair texture strands */}
                <HairStrands startX={30} startY={20} endX={70} endY={28} count={12} color={highlight} opacity={0.2} />
                {/* Side definition */}
                <Path d="M26,30 Q28,26 32,28" fill="none" stroke={shadow} strokeWidth={1} opacity={0.25} />
                <Path d="M74,30 Q72,26 68,28" fill="none" stroke={shadow} strokeWidth={1} opacity={0.25} />
              </G>
            );

          case HairStyle.SHORT_SPIKY:
            return (
              <G>
                {/* Base spikes with gradient */}
                <Path d="M28,35 L32,8 L38,28 L45,5 L50,25 L55,6 L62,28 L68,10 L72,35 Q50,30 28,35 Z" fill={`url(#${mainGradientId})`} />
                {/* Spike highlights */}
                <Path d="M33,12 L36,26" fill="none" stroke={brightHighlight} strokeWidth={1.5} opacity={0.4} />
                <Path d="M46,10 L49,24" fill="none" stroke={brightHighlight} strokeWidth={1.5} opacity={0.4} />
                <Path d="M56,10 L54,24" fill="none" stroke={brightHighlight} strokeWidth={1.5} opacity={0.4} />
                <Path d="M67,14 L64,26" fill="none" stroke={brightHighlight} strokeWidth={1.5} opacity={0.4} />
                {/* Spike shadows */}
                <Path d="M35,14 L38,28" fill="none" stroke={deepShadow} strokeWidth={1} opacity={0.3} />
                <Path d="M48,12 L50,25" fill="none" stroke={deepShadow} strokeWidth={1} opacity={0.3} />
                <Path d="M58,12 L62,28" fill="none" stroke={deepShadow} strokeWidth={1} opacity={0.3} />
                {/* Base texture */}
                <Path d="M30,34 Q50,30 70,34" fill="none" stroke={shadow} strokeWidth={2} opacity={0.2} />
              </G>
            );

          case HairStyle.SHORT_CURLY:
            return (
              <G>
                {/* Base curly shape */}
                <Path d="M22,36 Q20,25 25,18 Q28,12 35,10 Q45,6 55,10 Q65,8 72,18 Q78,25 76,36 Q72,32 68,34 Q65,28 60,30 Q55,24 50,28 Q45,24 40,30 Q35,28 32,34 Q28,32 22,36 Z" fill={hairColor} />
                {/* Individual curls with depth */}
                <Circle cx="30" cy="22" r="5" fill={hairColor} />
                <Circle cx="30" cy="22" r="3" fill={highlight} opacity={0.3} />
                <Circle cx="40" cy="17" r="5" fill={hairColor} />
                <Circle cx="40" cy="17" r="3" fill={highlight} opacity={0.3} />
                <Circle cx="50" cy="15" r="5.5" fill={hairColor} />
                <Circle cx="50" cy="15" r="3.5" fill={highlight} opacity={0.35} />
                <Circle cx="60" cy="17" r="5" fill={hairColor} />
                <Circle cx="60" cy="17" r="3" fill={highlight} opacity={0.3} />
                <Circle cx="70" cy="22" r="5" fill={hairColor} />
                <Circle cx="70" cy="22" r="3" fill={highlight} opacity={0.3} />
                {/* Extra small curls for texture */}
                <Circle cx="35" cy="26" r="3" fill={shadow} opacity={0.4} />
                <Circle cx="45" cy="22" r="3" fill={shadow} opacity={0.4} />
                <Circle cx="55" cy="22" r="3" fill={shadow} opacity={0.4} />
                <Circle cx="65" cy="26" r="3" fill={shadow} opacity={0.4} />
                {/* Top highlights */}
                <CurlyTexture cx={50} cy={20} radius={25} color={highlight} count={10} />
              </G>
            );

          case HairStyle.MEDIUM_MESSY:
            return (
              <G>
                {/* Main messy shape with irregular hairline */}
                <Path d="M20,44 Q18,25 25,16 Q35,6 50,8 Q65,6 75,16 Q82,25 80,44 L75,40 Q72,36 70,38 Q62,34 56,35 Q50,32 44,35 Q38,34 30,38 Q28,36 25,40 Z" fill={`url(#${mainGradientId})`} />
                {/* Messy strands sticking up */}
                <Path d="M25,20 L22,10" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M25,20 L23,11" fill="none" stroke={highlight} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
                <Path d="M35,15 L33,4" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M35,15 L34,5" fill="none" stroke={highlight} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
                <Path d="M50,14 L50,2" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M50,14 L50,3" fill="none" stroke={highlight} strokeWidth={2.5} strokeLinecap="round" opacity={0.4} />
                <Path d="M65,15 L67,4" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M65,15 L66,5" fill="none" stroke={highlight} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
                <Path d="M75,20 L78,10" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M75,20 L77,11" fill="none" stroke={highlight} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
                {/* Messy texture */}
                <HairStrands startX={25} startY={25} endX={75} endY={38} count={15} color={shadow} opacity={0.2} curvature={5} />
              </G>
            );

          case HairStyle.LONG_STRAIGHT:
            return (
              <G>
                {/* Top crown cap with natural hairline - the long draping part is in HairBehind */}
                <Path d="M22,42 Q20,15 50,10 Q80,15 78,42 Q75,38 72,40 Q62,37 56,38 Q50,35 44,38 Q38,37 28,40 Q25,38 22,42 Z" fill={`url(#${mainGradientId})`} />
                {/* Crown highlight ellipse */}
                <Ellipse cx={50} cy={18} rx={20} ry={8} fill={highlight} opacity={0.18} />
                {/* Top radial highlight */}
                <Ellipse cx={50} cy={18} rx={18} ry={8} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.LONG_WAVY:
            return (
              <G>
                {/* Top crown cap with natural hairline - the wavy body is in HairBehind */}
                <Path d="M22,42 Q20,15 50,10 Q80,15 78,42 Q75,38 72,40 Q62,37 56,38 Q50,35 44,38 Q38,37 28,40 Q25,38 22,42 Z" fill={`url(#${mainGradientId})`} />
                {/* Crown highlight ellipse */}
                <Ellipse cx={50} cy={20} rx={20} ry={8} fill={highlight} opacity={0.18} />
                {/* Top radial highlight */}
                <Ellipse cx={50} cy={20} rx={18} ry={8} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.LONG_CURLY:
            return (
              <G>
                {/* Curly crown cap with natural hairline */}
                <Path d="M22,42 Q20,15 50,10 Q80,15 78,42 Q75,38 72,40 Q62,37 56,38 Q50,35 44,38 Q38,37 28,40 Q25,38 22,42 Z" fill={hairColor} />
                {/* Curls at the crown for volume */}
                <Circle cx="30" cy="22" r="5" fill={hairColor} />
                <Circle cx="30" cy="22" r="3" fill={highlight} opacity={0.3} />
                <Circle cx="40" cy="17" r="5" fill={hairColor} />
                <Circle cx="40" cy="17" r="3" fill={highlight} opacity={0.3} />
                <Circle cx="50" cy="15" r="5.5" fill={hairColor} />
                <Circle cx="50" cy="15" r="3.5" fill={highlight} opacity={0.35} />
                <Circle cx="60" cy="17" r="5" fill={hairColor} />
                <Circle cx="60" cy="17" r="3" fill={highlight} opacity={0.3} />
                <Circle cx="70" cy="22" r="5" fill={hairColor} />
                <Circle cx="70" cy="22" r="3" fill={highlight} opacity={0.3} />
                {/* Crown highlight */}
                <Ellipse cx={50} cy={18} rx={18} ry={8} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.LONG_PONYTAIL:
            return (
              <G>
                {/* Ponytail depth shadow layer */}
                <Path d="M44,21 Q39,36 41,96 L59,96 Q61,36 56,21" fill={deepShadow} opacity={0.18} />
                {/* Ponytail body with gradient */}
                <Path d="M45,20 Q40,35 42,95 L58,95 Q60,35 55,20" fill={`url(#${mainGradientId})`} />
                {/* Hair tie */}
                <Ellipse cx="50" cy="22" rx="7" ry="3.5" fill={deepShadow} />
                <Ellipse cx="50" cy="22" rx="5" ry="2" fill={shadow} opacity={0.5} />
                {/* Front hair section with natural hairline */}
                <Path d="M24,38 Q22,16 50,12 Q78,16 76,38 L72,36 Q62,34 56,35 Q50,28 44,35 Q38,34 28,36 Z" fill={`url(#${sideGradientId})`} />
                {/* Crown highlight ellipse */}
                <Ellipse cx={50} cy={18} rx={16} ry={6} fill={highlight} opacity={0.18} />
                {/* Top radial highlight */}
                <Ellipse cx={50} cy={18} rx={15} ry={6} fill={`url(#${highlightGradientId})`} />
                {/* Ponytail strands */}
                <HairStrands startX={45} startY={25} endX={48} endY={90} count={5} color={highlight} opacity={0.2} />
                <HairStrands startX={52} startY={25} endX={55} endY={90} count={5} color={highlight} opacity={0.2} />
                {/* Ponytail side shadows */}
                <Path d="M42,30 Q40,55 42,90" fill="none" stroke={shadow} strokeWidth={2} opacity={0.3} />
                <Path d="M58,30 Q60,55 58,90" fill="none" stroke={shadow} strokeWidth={2} opacity={0.3} />
              </G>
            );

          case HairStyle.LONG_BUN:
            return (
              <G>
                {/* Front hair section with natural hairline */}
                <Path d="M24,38 Q22,16 50,12 Q78,16 76,38 L72,36 Q62,34 56,35 Q50,28 44,35 Q38,34 28,36 Z" fill={`url(#${sideGradientId})`} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={18} rx={15} ry={6} fill={`url(#${highlightGradientId})`} />
                {/* Bun base */}
                <Circle cx="50" cy="6" r="12" fill={hairColor} />
                {/* Bun swirl texture */}
                <Path d="M42,6 Q50,-2 58,6 Q50,10 42,6" fill="none" stroke={shadow} strokeWidth={2} opacity={0.4} />
                <Path d="M45,3 Q50,0 55,3" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.3} />
                {/* Bun highlight */}
                <Circle cx="48" cy="4" r="4" fill={brightHighlight} opacity={0.25} />
                {/* Bun shadow underneath */}
                <Ellipse cx="50" cy="14" rx="8" ry="3" fill={deepShadow} opacity={0.3} />
                {/* Hair gathered to bun */}
                <Path d="M40,16 Q45,12 50,18 Q55,12 60,16" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.3} />
              </G>
            );

          case HairStyle.AFRO:
            return (
              <G>
                {/* Main voluminous afro silhouette — single solid mass */}
                <Path d="M20,42 Q14,34 16,22 Q18,10 30,4 Q40,0 50,2 Q60,0 70,4 Q82,10 84,22 Q86,34 80,42 Q84,48 82,54 L78,52 Q76,42 76,38 L24,38 Q24,42 22,52 L18,54 Q16,48 20,42 Z" fill={`url(#${mainGradientId})`} />
                {/* Bumpy edge texture — semicircles along outline for curly silhouette */}
                <Circle cx="18" cy="40" r="5" fill={hairColor} />
                <Circle cx="16" cy="32" r="4.5" fill={hairColor} />
                <Circle cx="20" cy="22" r="4" fill={hairColor} />
                <Circle cx="26" cy="12" r="4.5" fill={hairColor} />
                <Circle cx="34" cy="5" r="4" fill={hairColor} />
                <Circle cx="42" cy="2" r="3.5" fill={hairColor} />
                <Circle cx="50" cy="1" r="4" fill={hairColor} />
                <Circle cx="58" cy="2" r="3.5" fill={hairColor} />
                <Circle cx="66" cy="5" r="4" fill={hairColor} />
                <Circle cx="74" cy="12" r="4.5" fill={hairColor} />
                <Circle cx="80" cy="22" r="4" fill={hairColor} />
                <Circle cx="84" cy="32" r="4.5" fill={hairColor} />
                <Circle cx="82" cy="40" r="5" fill={hairColor} />
                {/* Side edge bumps */}
                <Circle cx="14" cy="36" r="3.5" fill={hairColor} />
                <Circle cx="15" cy="28" r="3" fill={hairColor} />
                <Circle cx="86" cy="36" r="3.5" fill={hairColor} />
                <Circle cx="85" cy="28" r="3" fill={hairColor} />
                <Circle cx="82" cy="48" r="4" fill={hairColor} />
                <Circle cx="18" cy="48" r="4" fill={hairColor} />
                {/* Subtle internal curl suggestions — barely visible */}
                <Circle cx="35" cy="18" r="6" fill={highlight} opacity={0.15} />
                <Circle cx="55" cy="14" r="7" fill={highlight} opacity={0.12} />
                <Circle cx="45" cy="8" r="5" fill={highlight} opacity={0.15} />
                <Circle cx="65" cy="22" r="6" fill={highlight} opacity={0.12} />
                <Circle cx="25" cy="28" r="5" fill={highlight} opacity={0.15} />
                {/* Crown highlight for volume */}
                <Ellipse cx={50} cy={14} rx={20} ry={8} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.SHORT_SIDE_PART:
            return (
              <G>
                {/* Lower hairline (3-4 units down from default) with side part */}
                <Path d="M24,43 Q24,14 50,12 Q76,14 76,43 Q76,46 72,48 L68,44 Q58,40 50,41 Q42,40 32,44 L28,48 Q24,46 24,43 Z" fill={`url(#${mainGradientId})`} />
                {/* Side part line — left side */}
                <Path d="M38,14 Q37,22 36,38" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.3} />
                <Ellipse cx={50} cy={22} rx={15} ry={6} fill={`url(#${highlightGradientId})`} />
                {/* Hairline shadow at hair-skin boundary */}
                <Ellipse cx={50} cy={44} rx={22} ry={3} fill={shadow} opacity={0.05} />
              </G>
            );

          case HairStyle.MOHAWK:
            return (
              <G>
                {/* Shaved sides - subtle stubble covering more of the head */}
                <Path d="M26,42 Q26,24 35,22 L35,44 Q30,44 26,42 Z" fill={hairColor} opacity={0.1} />
                <Path d="M74,42 Q74,24 65,22 L65,44 Q70,44 74,42 Z" fill={hairColor} opacity={0.1} />
                {/* Main mohawk crest — tall narrow spiky shape, base lowered 4 units */}
                <Path d={`M43,42
                  L42,28 L40,18 L43,10 L47,2 L50,-4
                  L53,2 L57,10 L60,18 L58,28
                  L57,42 Q50,40 43,42 Z`}
                  fill={`url(#${mainGradientId})`} />
                {/* Hairline shadow at crest base */}
                <Ellipse cx={50} cy={42} rx={10} ry={2} fill={shadow} opacity={0.05} />
                {/* Spiky tips along the top edge */}
                <Path d="M43,10 L41,5 L44,8" fill={hairColor} stroke={hairColor} strokeWidth={0.5} />
                <Path d="M57,10 L59,5 L56,8" fill={hairColor} stroke={hairColor} strokeWidth={0.5} />
                <Path d="M47,2 L46,-2 L48,1" fill={hairColor} stroke={hairColor} strokeWidth={0.5} />
                <Path d="M53,2 L54,-2 L52,1" fill={hairColor} stroke={hairColor} strokeWidth={0.5} />
                {/* Center highlight */}
                <Path d="M48,36 L47,18 Q49,4 50,-2 Q51,4 53,18 L52,36" fill={highlight} opacity={0.2} />
                {/* Top glow */}
                <Ellipse cx={50} cy={4} rx={4} ry={3} fill={brightHighlight} opacity={0.25} />
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
            // Hijab front layer: wide side panels that frame the face along the jawline
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
                  {/* Top crown - wide, covers forehead and wraps around */}
                  <Path d="M20,34 Q18,14 50,6 Q82,14 80,34 Q76,30 50,28 Q24,30 20,34 Z" fill={`url(#hijab_${gradientId})`} />
                  {/* Left side panel - wide drape covering ear area and jawline */}
                  <Path d="M24,30 Q16,36 12,50 Q10,65 12,80 L10,95 L28,95 L30,80 Q30,60 28,44 Q26,36 24,30 Z" fill={`url(#hijab_${gradientId})`} />
                  {/* Right side panel - mirror */}
                  <Path d="M76,30 Q84,36 88,50 Q90,65 88,80 L90,95 L72,95 L70,80 Q70,60 72,44 Q74,36 76,30 Z" fill={`url(#hijab_${gradientId})`} />
                  {/* Subtle inner edge along face - soft shadow, not a line */}
                  <Path d="M28,32 Q24,44 24,56 Q26,70 32,78 Q42,84 50,84 Q58,84 68,78 Q74,70 76,56 Q76,44 72,32" fill="none" stroke={hijabDeep} strokeWidth={1.2} opacity={0.3} />
                  {/* Top highlight */}
                  <Ellipse cx={50} cy={14} rx={18} ry={6} fill={hijabHighlight} opacity={0.2} />
                  {/* Fabric fold shadows */}
                  <Path d="M16,50 Q18,65 16,82" fill="none" stroke={hijabDeep} strokeWidth={1.5} opacity={0.2} />
                  <Path d="M84,50 Q82,65 84,82" fill="none" stroke={hijabDeep} strokeWidth={1.5} opacity={0.2} />
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
                <Path d="M24,38 Q22,16 50,12 Q78,16 76,38 L72,36 Q50,28 28,36 Z" fill={`url(#${sideGradientId})`} />
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
                <Path d="M22,38 Q20,14 50,10 Q80,14 78,38 L74,36 Q68,34 62,35 Q56,33 50,33 Q44,33 38,35 Q32,34 26,36 Z" fill={`url(#${mainGradientId})`} />
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
                <Path d="M26,34 Q26,14 50,10 Q74,14 74,34 L70,34 Q50,26 30,34 Z" fill={`url(#${mainGradientId})`} />
                {/* Subtle edge definition */}
                <Path d="M30,28 Q50,24 70,28" fill="none" stroke={shadow} strokeWidth={0.8} strokeLinecap="round" opacity={0.15} />
                <Ellipse cx={50} cy={18} rx={14} ry={5} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.LONG_CURTAIN_BANGS:
            return (
              <G>
                {/* Main hair frame */}
                <Path d="M20,40 Q18,14 50,10 Q82,14 80,40 L80,70 Q78,78 50,76 Q22,78 20,70 Z" fill={`url(#${mainGradientId})`} />
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
                <Path d="M20,40 Q18,14 50,10 Q82,14 80,40 L80,68 Q75,74 50,72 Q25,74 20,68 Z" fill={`url(#${mainGradientId})`} />
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
                <Path d="M24,38 Q22,16 50,12 Q78,16 76,38 L72,36 Q50,28 28,36 Z" fill={`url(#${sideGradientId})`} />
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
                <Path d="M26,36 Q26,14 50,10 Q74,14 74,36 L70,34 Q50,26 30,34 Z" fill={`url(#${mainGradientId})`} />
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
                <Path d="M20,38 Q18,14 50,10 Q82,14 80,38 Q78,34 75,36 Q65,32 56,33 Q50,30 44,33 Q35,32 25,36 Q22,34 20,38 L20,62 Q22,68 30,70 Q40,72 50,70 Q60,72 70,70 Q78,68 80,62 Z" fill={`url(#${mainGradientId})`} />
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
                <Path d="M18,40 Q16,14 50,10 Q84,14 82,40 L82,80 Q80,88 50,86 Q20,88 18,80 Z" fill={`url(#${mainGradientId})`} />
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
                <Path d="M28,36 Q28,16 50,12 Q72,16 72,36 L68,34 Q50,26 32,34 Z" fill={`url(#${mainGradientId})`} />
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
                <Path d="M24,39 Q24,12 50,10 Q76,12 76,39 Q76,42 72,44 L68,40 Q58,36 50,37 Q42,36 32,40 L28,44 Q24,42 24,39 Z" fill={`url(#${mainGradientId})`} />
                <Ellipse cx={50} cy={20} rx={15} ry={6} fill={`url(#${highlightGradientId})`} />
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
            cy={34}
            rx={28}
            ry={8}
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
                <Path d="M24,30 Q18,30 16,40 L16,90 Q16,95 24,95 L26,95 L26,70 Q26,50 24,30 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Right side drape */}
                <Path d="M76,30 Q82,30 84,40 L84,90 Q84,95 76,95 L74,95 L74,70 Q74,50 76,30 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Bottom connection behind neck */}
                <Path d="M26,75 L26,95 L74,95 L74,75 Q50,80 26,75 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Vertical strand texture */}
                <Path d="M20,40 L20,90" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
                <Path d="M30,75 L30,92" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M50,78 L50,92" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M70,75 L70,92" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M80,40 L80,90" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
              </G>
            );

          // Wavy styles - wavy strand texture
          case HairStyle.LONG_WAVY:
          case HairStyle.LONG_BEACH_WAVES:
          case HairStyle.MEDIUM_WAVY:
            return (
              <G>
                {/* Left side drape */}
                <Path d="M24,30 Q18,30 16,40 L16,90 Q16,95 24,95 L26,95 L26,70 Q26,50 24,30 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Right side drape */}
                <Path d="M76,30 Q82,30 84,40 L84,90 Q84,95 76,95 L74,95 L74,70 Q74,50 76,30 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Bottom connection behind neck */}
                <Path d="M26,75 L26,95 L74,95 L74,75 Q50,80 26,75 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Wavy strand texture */}
                <Path d="M20,40 Q23,55 19,70 Q23,85 21,92" fill="none" stroke={shadow} strokeWidth={2} opacity={0.2} />
                <Path d="M80,40 Q77,55 81,70 Q77,85 79,92" fill="none" stroke={shadow} strokeWidth={2} opacity={0.2} />
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
                <Ellipse cx="18" cy="50" rx="16" ry="30" fill={`url(#${mainBehindGradientId})`} />
                {/* Right volume */}
                <Ellipse cx="82" cy="50" rx="16" ry="30" fill={`url(#${mainBehindGradientId})`} />
                {/* Bottom volume below chin */}
                <Ellipse cx="50" cy="85" rx="32" ry="16" fill={`url(#${mainBehindGradientId})`} />
                {/* Top volume above head */}
                <Ellipse cx="50" cy="12" rx="30" ry="12" fill={`url(#${mainBehindGradientId})`} />
                {/* Curly texture */}
                <CurlyTexture cx={18} cy={50} radius={12} color={shadow} count={8} />
                <CurlyTexture cx={82} cy={50} radius={12} color={shadow} count={8} />
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
                <Path d="M24,30 Q18,30 16,40 L16,90 Q16,95 24,95 L26,95 L26,70 Q26,50 24,30 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Right side drape */}
                <Path d="M76,30 Q82,30 84,40 L84,90 Q84,95 76,95 L74,95 L74,70 Q74,50 76,30 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Bottom connection behind neck */}
                <Path d="M26,75 L26,95 L74,95 L74,75 Q50,80 26,75 Z" fill={`url(#${mainBehindGradientId})`} />
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
                <Path d="M24,30 Q20,30 18,38 L18,72 Q18,76 24,76 L26,76 L26,50 Q26,38 24,30 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Right side */}
                <Path d="M76,30 Q80,30 82,38 L82,72 Q82,76 76,76 L74,76 L74,50 Q74,38 76,30 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Bottom behind neck */}
                <Path d="M26,68 L26,76 L74,76 L74,68 Q50,72 26,68 Z" fill={`url(#${mainBehindGradientId})`} />
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
                <Path d="M24,40 Q20,40 18,48 L18,90 Q18,95 24,95 L26,95 L26,70 Q26,55 24,40 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Right side */}
                <Path d="M76,40 Q80,40 82,48 L82,90 Q82,95 76,95 L74,95 L74,70 Q74,55 76,40 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Bottom connection */}
                <Path d="M26,75 L26,95 L74,95 L74,75 Q50,80 26,75 Z" fill={`url(#${mainBehindGradientId})`} />
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
                <Path d="M24,30 Q18,30 16,40 L16,90 Q16,95 24,95 L26,95 L26,70 Q26,50 24,30 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Right side drape */}
                <Path d="M76,30 Q82,30 84,40 L84,90 Q84,95 76,95 L74,95 L74,70 Q74,50 76,30 Z" fill={`url(#${mainBehindGradientId})`} />
                {/* Bottom connection */}
                <Path d="M26,75 L26,95 L74,95 L74,75 Q50,80 26,75 Z" fill={`url(#${mainBehindGradientId})`} />
              </G>
            );
        }
      })()}
    </G>
  );
}

export default Hair;
