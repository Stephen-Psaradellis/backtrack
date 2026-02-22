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
                <Path d="M25,32 Q25,14 50,12 Q75,14 75,32 Q75,36 72,38 L65,28 Q50,22 35,28 L28,38 Q25,36 25,32 Z" fill={`url(#${mainGradientId})`} />
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
                <Path d="M24,34 Q24,12 50,10 Q76,12 76,34 Q76,38 72,40 L68,26 Q50,18 32,26 L28,40 Q24,38 24,34 Z" fill={`url(#${mainGradientId})`} />
                {/* Top highlight */}
                <Path d="M30,22 Q50,14 70,22 Q50,18 30,22 Z" fill={`url(#${highlightGradientId})`} />
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
                {/* Main messy shape */}
                <Path d="M20,42 Q18,25 25,16 Q35,6 50,8 Q65,6 75,16 Q82,25 80,42 L75,38 Q70,30 65,38 Q58,32 50,36 Q42,32 35,38 Q30,30 25,38 Z" fill={`url(#${mainGradientId})`} />
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
                {/* Main long hair body */}
                <Path d="M15,40 L15,90 Q15,95 25,95 L75,95 Q85,95 85,90 L85,40 Q85,15 50,10 Q15,15 15,40 Z" fill={`url(#${mainGradientId})`} />
                {/* Top section with volume */}
                <Path d="M22,38 Q20,18 50,12 Q80,18 78,38 L75,32 L65,36 L55,32 L50,34 L45,32 L35,36 L25,32 Z" fill={hairColor} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={18} rx={18} ry={8} fill={`url(#${highlightGradientId})`} />
                {/* Hair strands texture */}
                <HairStrands startX={20} startY={40} endX={35} endY={90} count={8} color={highlight} opacity={0.15} />
                <HairStrands startX={40} startY={38} endX={50} endY={92} count={6} color={highlight} opacity={0.12} />
                <HairStrands startX={50} startY={38} endX={60} endY={92} count={6} color={highlight} opacity={0.12} />
                <HairStrands startX={65} startY={40} endX={80} endY={90} count={8} color={highlight} opacity={0.15} />
                {/* Side shadows */}
                <Path d="M15,45 L15,85 Q20,85 22,45 Z" fill={deepShadow} opacity={0.25} />
                <Path d="M85,45 L85,85 Q80,85 78,45 Z" fill={deepShadow} opacity={0.25} />
              </G>
            );

          case HairStyle.LONG_WAVY:
            return (
              <G>
                {/* Main wavy body */}
                <Path d="M15,40 Q12,55 18,70 Q15,85 25,95 L75,95 Q85,85 82,70 Q88,55 85,40 Q85,15 50,10 Q15,15 15,40 Z" fill={`url(#${mainGradientId})`} />
                {/* Top section */}
                <Path d="M22,40 Q20,18 50,12 Q80,18 78,40 L75,34 Q65,28 50,32 Q35,28 25,34 Z" fill={hairColor} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={20} rx={18} ry={8} fill={`url(#${highlightGradientId})`} />
                {/* Wave lines - left side */}
                <Path d="M18,50 Q24,55 18,65 Q24,75 20,88" fill="none" stroke={shadow} strokeWidth={2.5} opacity={0.3} />
                <Path d="M20,52 Q25,57 20,67 Q25,77 22,88" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.2} />
                {/* Wave lines - right side */}
                <Path d="M82,50 Q76,55 82,65 Q76,75 80,88" fill="none" stroke={shadow} strokeWidth={2.5} opacity={0.3} />
                <Path d="M80,52 Q75,57 80,67 Q75,77 78,88" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.2} />
                {/* Center wave texture */}
                <Path d="M45,45 Q48,55 44,65 Q48,75 46,88" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M55,45 Q52,55 56,65 Q52,75 54,88" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
              </G>
            );

          case HairStyle.LONG_CURLY:
            return (
              <G>
                {/* Main curly mass */}
                <Ellipse cx="50" cy="55" rx="40" ry="45" fill={hairColor} />
                {/* Outer curls with depth */}
                <Circle cx="25" cy="25" r="9" fill={hairColor} />
                <Circle cx="25" cy="25" r="5" fill={highlight} opacity={0.25} />
                <Circle cx="75" cy="25" r="9" fill={hairColor} />
                <Circle cx="75" cy="25" r="5" fill={highlight} opacity={0.25} />
                <Circle cx="35" cy="14" r="8" fill={hairColor} />
                <Circle cx="35" cy="14" r="4.5" fill={highlight} opacity={0.25} />
                <Circle cx="65" cy="14" r="8" fill={hairColor} />
                <Circle cx="65" cy="14" r="4.5" fill={highlight} opacity={0.25} />
                <Circle cx="50" cy="10" r="9" fill={hairColor} />
                <Circle cx="50" cy="10" r="5" fill={highlight} opacity={0.3} />
                <Circle cx="12" cy="45" r="8" fill={hairColor} />
                <Circle cx="12" cy="45" r="4.5" fill={highlight} opacity={0.2} />
                <Circle cx="88" cy="45" r="8" fill={hairColor} />
                <Circle cx="88" cy="45" r="4.5" fill={highlight} opacity={0.2} />
                {/* Top section covering forehead */}
                <Path d="M22,40 Q20,20 50,14 Q80,20 78,40" fill={hairColor} />
                {/* Curly texture throughout */}
                <CurlyTexture cx={50} cy={55} radius={35} color={shadow} count={20} />
                <CurlyTexture cx={50} cy={45} radius={25} color={highlight} count={12} />
                {/* Volume shadows */}
                <Path d="M12,55 Q15,70 20,85" fill="none" stroke={deepShadow} strokeWidth={3} opacity={0.2} />
                <Path d="M88,55 Q85,70 80,85" fill="none" stroke={deepShadow} strokeWidth={3} opacity={0.2} />
              </G>
            );

          case HairStyle.LONG_PONYTAIL:
            return (
              <G>
                {/* Ponytail body with gradient */}
                <Path d="M45,20 Q40,35 42,95 L58,95 Q60,35 55,20" fill={`url(#${mainGradientId})`} />
                {/* Hair tie */}
                <Ellipse cx="50" cy="22" rx="7" ry="3.5" fill={deepShadow} />
                <Ellipse cx="50" cy="22" rx="5" ry="2" fill={shadow} opacity={0.5} />
                {/* Front hair section */}
                <Path d="M24,38 Q22,16 50,12 Q78,16 76,38 L72,30 Q50,22 28,30 Z" fill={`url(#${sideGradientId})`} />
                {/* Top highlight */}
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
                {/* Front hair section */}
                <Path d="M24,38 Q22,16 50,12 Q78,16 76,38 L72,30 Q50,22 28,30 Z" fill={`url(#${sideGradientId})`} />
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
                {/* Main afro body */}
                <Ellipse cx="50" cy="35" rx="42" ry="35" fill={hairColor} />
                {/* Outer volume curls */}
                <Circle cx="18" cy="30" r="10" fill={hairColor} />
                <Circle cx="82" cy="30" r="10" fill={hairColor} />
                <Circle cx="13" cy="48" r="8" fill={hairColor} />
                <Circle cx="87" cy="48" r="8" fill={hairColor} />
                <Circle cx="28" cy="8" r="9" fill={hairColor} />
                <Circle cx="72" cy="8" r="9" fill={hairColor} />
                <Circle cx="50" cy="2" r="10" fill={hairColor} />
                {/* Inner curly texture */}
                <CurlyTexture cx={50} cy={35} radius={38} color={shadow} count={30} />
                <CurlyTexture cx={50} cy={28} radius={30} color={highlight} count={20} />
                {/* Top highlights */}
                <Circle cx="40" cy="15" r="6" fill={highlight} opacity={0.2} />
                <Circle cx="60" cy="15" r="6" fill={highlight} opacity={0.2} />
                <Circle cx="50" cy="10" r="7" fill={highlight} opacity={0.25} />
                {/* Side shadows for depth */}
                <Ellipse cx="15" cy="40" rx="8" ry="15" fill={deepShadow} opacity={0.15} />
                <Ellipse cx="85" cy="40" rx="8" ry="15" fill={deepShadow} opacity={0.15} />
              </G>
            );

          case HairStyle.MOHAWK:
            return (
              <G>
                {/* Shaved sides */}
                <Path d="M25,35 Q25,20 35,20 L35,45 L25,45 Q25,40 25,35 Z" fill={hairColor} opacity={0.15} />
                <Path d="M75,35 Q75,20 65,20 L65,45 L75,45 Q75,40 75,35 Z" fill={hairColor} opacity={0.15} />
                {/* Main mohawk with gradient */}
                <Path d="M40,45 L38,0 Q50,-6 62,0 L60,45 Q50,42 40,45 Z" fill={`url(#${mainGradientId})`} />
                {/* Center highlight */}
                <Path d="M45,40 L44,6 Q50,2 56,6 L55,40" fill={highlight} opacity={0.25} />
                {/* Edge definition */}
                <Path d="M38,2 L40,45" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.3} />
                <Path d="M62,2 L60,45" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.3} />
                {/* Hair texture strands */}
                <HairStrands startX={42} startY={5} endX={58} endY={42} count={10} color={highlight} opacity={0.15} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={8} rx={8} ry={4} fill={brightHighlight} opacity={0.3} />
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
            return (
              <G>
                <Defs>
                  <LinearGradient id={`hijab_${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#805ad5" />
                    <Stop offset="50%" stopColor="#6b46c1" />
                    <Stop offset="100%" stopColor="#553c9a" />
                  </LinearGradient>
                </Defs>
                <Path d="M15,45 Q10,30 25,20 Q40,10 50,12 Q60,10 75,20 Q90,30 85,45 L88,95 L12,95 L15,45 Z" fill={`url(#hijab_${gradientId})`} />
                {/* Fabric folds */}
                <Path d="M20,50 Q25,60 22,75 Q28,85 25,95" fill="none" stroke="#553c9a" strokeWidth={2} opacity={0.3} />
                <Path d="M80,50 Q75,60 78,75 Q72,85 75,95" fill="none" stroke="#553c9a" strokeWidth={2} opacity={0.3} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={20} ry={8} fill="#9f7aea" opacity={0.2} />
                {/* Inner edge */}
                <Path d="M25,40 Q50,35 75,40" fill="none" stroke="#805ad5" strokeWidth={2} opacity={0.4} />
              </G>
            );

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
          // PHASE 1.1 EXPANSION - Modern Trends
          // ============================================================================

          case HairStyle.CURTAIN_BANGS_SHORT:
            return (
              <G>
                {/* Main hair body */}
                <Path d="M20,42 Q18,20 50,14 Q82,20 80,42 L75,38 Q65,32 50,35 Q35,32 25,38 Z" fill={`url(#${mainGradientId})`} />
                {/* Curtain bangs - parted in middle */}
                <Path d="M28,38 Q35,32 42,42 L42,48 Q38,42 32,45 Z" fill={hairColor} />
                <Path d="M72,38 Q65,32 58,42 L58,48 Q62,42 68,45 Z" fill={hairColor} />
                {/* Bangs center part */}
                <Path d="M48,38 L50,28 L52,38" fill="none" stroke={shadow} strokeWidth={1} opacity={0.4} />
                {/* Highlights on bangs */}
                <Path d="M32,36 Q38,34 42,42" fill="none" stroke={highlight} strokeWidth={2} opacity={0.25} />
                <Path d="M68,36 Q62,34 58,42" fill="none" stroke={highlight} strokeWidth={2} opacity={0.25} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={20} rx={15} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.CURTAIN_BANGS_LONG:
            return (
              <G>
                {/* Main long hair body */}
                <Path d="M15,40 L15,90 Q15,95 25,95 L75,95 Q85,95 85,90 L85,40 Q85,15 50,10 Q15,15 15,40 Z" fill={`url(#${mainGradientId})`} />
                {/* Top section */}
                <Path d="M22,40 Q20,18 50,12 Q80,18 78,40" fill={hairColor} />
                {/* Curtain bangs - longer, framing face */}
                <Path d="M25,40 Q32,35 38,52 L38,65 Q34,55 28,60 L25,40 Z" fill={hairColor} />
                <Path d="M75,40 Q68,35 62,52 L62,65 Q66,55 72,60 L75,40 Z" fill={hairColor} />
                {/* Center part line */}
                <Path d="M48,40 L50,22 L52,40" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.4} />
                {/* Bangs texture */}
                <Path d="M30,42 Q35,40 38,55" fill="none" stroke={highlight} strokeWidth={2} opacity={0.2} />
                <Path d="M70,42 Q65,40 62,55" fill="none" stroke={highlight} strokeWidth={2} opacity={0.2} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={18} rx={18} ry={7} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.CURTAIN_BANGS_WAVY:
            return (
              <G>
                {/* Main wavy body */}
                <Path d="M15,40 Q12,55 18,70 Q15,85 25,95 L75,95 Q85,85 82,70 Q88,55 85,40 Q85,15 50,10 Q15,15 15,40 Z" fill={`url(#${mainGradientId})`} />
                {/* Top section */}
                <Path d="M22,40 Q20,18 50,12 Q80,18 78,40" fill={hairColor} />
                {/* Wavy curtain bangs */}
                <Path d="M25,40 Q30,35 35,45 Q38,50 36,60 Q32,52 28,58 Z" fill={hairColor} />
                <Path d="M75,40 Q70,35 65,45 Q62,50 64,60 Q68,52 72,58 Z" fill={hairColor} />
                {/* Wave texture on bangs */}
                <Path d="M28,42 Q32,48 30,58" fill="none" stroke={shadow} strokeWidth={2} opacity={0.25} />
                <Path d="M72,42 Q68,48 70,58" fill="none" stroke={shadow} strokeWidth={2} opacity={0.25} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={18} rx={18} ry={7} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.EGIRL_STYLE:
            return (
              <G>
                {/* Main hair - straight with volume */}
                <Path d="M15,40 L15,88 Q15,92 25,92 L75,92 Q85,92 85,88 L85,40 Q85,15 50,10 Q15,15 15,40 Z" fill={`url(#${mainGradientId})`} />
                {/* Top section with volume */}
                <Path d="M22,40 Q20,16 50,12 Q80,16 78,40 L72,32 Q50,24 28,32 Z" fill={hairColor} />
                {/* Signature face-framing pieces */}
                <Path d="M22,40 L20,65 Q24,60 26,70 L28,40 Z" fill={hairColor} />
                <Path d="M78,40 L80,65 Q76,60 74,70 L72,40 Z" fill={hairColor} />
                {/* Wispy bangs */}
                <Path d="M35,38 L33,48" fill="none" stroke={hairColor} strokeWidth={3} strokeLinecap="round" />
                <Path d="M40,36 L39,50" fill="none" stroke={hairColor} strokeWidth={2.5} strokeLinecap="round" />
                <Path d="M60,36 L61,50" fill="none" stroke={hairColor} strokeWidth={2.5} strokeLinecap="round" />
                <Path d="M65,38 L67,48" fill="none" stroke={hairColor} strokeWidth={3} strokeLinecap="round" />
                {/* Hair clips (signature e-girl accessory) */}
                <Rect x="25" y="35" width="6" height="2" rx={1} fill="#ff69b4" />
                <Rect x="69" y="35" width="6" height="2" rx={1} fill="#ff69b4" />
                {/* Highlight */}
                <Ellipse cx={50} cy={18} rx={16} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.EBOY_STYLE:
            return (
              <G>
                {/* Main messy hair with volume */}
                <Path d="M22,38 Q20,16 50,12 Q80,16 78,38 L74,32 Q50,22 26,32 Z" fill={`url(#${mainGradientId})`} />
                {/* Messy fringe hanging over forehead */}
                <Path d="M30,28 L28,48 Q32,44 34,50 L36,30 Z" fill={hairColor} />
                <Path d="M38,26 L37,52 Q40,48 42,54 L44,28 Z" fill={hairColor} />
                <Path d="M48,25 L48,55 Q50,50 52,55 L52,25 Z" fill={hairColor} />
                <Path d="M56,26 L58,52 Q60,48 62,54 L64,28 Z" fill={hairColor} />
                <Path d="M68,28 L70,48 Q66,44 64,50 L62,30 Z" fill={hairColor} />
                {/* Spiky texture at top */}
                <Path d="M35,18 L34,8" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M50,16 L50,5" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M65,18 L66,8" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                {/* Highlights on fringe */}
                <Path d="M32,32 L31,46" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.3} />
                <Path d="M50,30 L50,50" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.3} />
                <Path d="M68,32 L69,46" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.3} />
              </G>
            );

          case HairStyle.SOFT_BOY:
            return (
              <G>
                {/* Main fluffy hair */}
                <Path d="M22,38 Q18,18 50,12 Q82,18 78,38 L75,34 Q50,26 25,34 Z" fill={`url(#${mainGradientId})`} />
                {/* Soft, fluffy texture */}
                <Circle cx="30" cy="22" r="6" fill={hairColor} />
                <Circle cx="40" cy="18" r="6" fill={hairColor} />
                <Circle cx="50" cy="16" r="7" fill={hairColor} />
                <Circle cx="60" cy="18" r="6" fill={hairColor} />
                <Circle cx="70" cy="22" r="6" fill={hairColor} />
                {/* Soft fringe */}
                <Path d="M35,32 Q38,38 36,48" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M45,30 Q47,38 46,50" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M55,30 Q53,38 54,50" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M65,32 Q62,38 64,48" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                {/* Highlights */}
                <Circle cx="35" cy="20" r="3" fill={highlight} opacity={0.25} />
                <Circle cx="50" cy="14" r="3.5" fill={highlight} opacity={0.3} />
                <Circle cx="65" cy="20" r="3" fill={highlight} opacity={0.25} />
              </G>
            );

          case HairStyle.SOFT_GIRL:
            return (
              <G>
                {/* Main hair with soft waves */}
                <Path d="M18,42 Q16,20 50,14 Q84,20 82,42 L78,38 Q50,30 22,38 Z" fill={`url(#${mainGradientId})`} />
                {/* Side pieces framing face */}
                <Path d="M20,42 Q22,50 20,62 Q18,55 16,58 L16,42 Z" fill={hairColor} />
                <Path d="M80,42 Q78,50 80,62 Q82,55 84,58 L84,42 Z" fill={hairColor} />
                {/* Soft, face-framing bangs */}
                <Path d="M30,36 Q35,40 33,52" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M38,34 Q42,40 40,54" fill="none" stroke={hairColor} strokeWidth={3.5} strokeLinecap="round" />
                <Path d="M62,34 Q58,40 60,54" fill="none" stroke={hairColor} strokeWidth={3.5} strokeLinecap="round" />
                <Path d="M70,36 Q65,40 67,52" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                {/* Hair clips */}
                <Circle cx="24" cy="38" r="3" fill="#ffb6c1" />
                <Circle cx="76" cy="38" r="3" fill="#ffb6c1" />
                {/* Top highlight */}
                <Ellipse cx={50} cy={20} rx={18} ry={7} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.MIDDLE_PART_FLUFFY:
            return (
              <G>
                {/* Main fluffy hair with middle part */}
                <Path d="M20,42 Q18,18 50,12 Q82,18 80,42 L75,36 Q50,28 25,36 Z" fill={`url(#${mainGradientId})`} />
                {/* Fluffy volume on sides */}
                <Circle cx="28" cy="28" r="8" fill={hairColor} />
                <Circle cx="72" cy="28" r="8" fill={hairColor} />
                <Circle cx="35" cy="22" r="7" fill={hairColor} />
                <Circle cx="65" cy="22" r="7" fill={hairColor} />
                <Circle cx="42" cy="18" r="6" fill={hairColor} />
                <Circle cx="58" cy="18" r="6" fill={hairColor} />
                {/* Clear middle part */}
                <Path d="M48,38 L50,12 L52,38" fill="none" stroke={shadow} strokeWidth={2} opacity={0.5} />
                {/* Top highlights */}
                <Circle cx="35" cy="20" r="3" fill={highlight} opacity={0.25} />
                <Circle cx="65" cy="20" r="3" fill={highlight} opacity={0.25} />
              </G>
            );

          case HairStyle.SIDE_PART_VOLUMINOUS:
            return (
              <G>
                {/* Main voluminous hair with side part */}
                <Path d="M18,42 Q16,18 50,12 Q84,18 82,42 L78,36 Q50,26 22,36 Z" fill={`url(#${mainGradientId})`} />
                {/* Volume on one side (heavier on left) */}
                <Circle cx="25" cy="25" r="9" fill={hairColor} />
                <Circle cx="32" cy="20" r="8" fill={hairColor} />
                <Circle cx="40" cy="16" r="7" fill={hairColor} />
                <Circle cx="50" cy="14" r="7" fill={hairColor} />
                <Circle cx="60" cy="16" r="6" fill={hairColor} />
                <Circle cx="70" cy="22" r="6" fill={hairColor} />
                {/* Side part line */}
                <Path d="M32,38 L35,14" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.5} />
                {/* Swooping hair over to one side */}
                <Path d="M22,32 Q35,26 48,36" fill="none" stroke={highlight} strokeWidth={2} opacity={0.2} />
                {/* Highlights */}
                <Ellipse cx={38} cy={18} rx={12} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.TEXTURED_FRINGE:
            return (
              <G>
                {/* Main hair */}
                <Path d="M22,38 Q20,16 50,12 Q80,16 78,38 L74,32 Q50,22 26,32 Z" fill={`url(#${mainGradientId})`} />
                {/* Textured fringe pieces */}
                <Path d="M28,30 L26,52" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M34,28 L33,55" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M40,26 L40,54" fill="none" stroke={hairColor} strokeWidth={4.5} strokeLinecap="round" />
                <Path d="M46,25 L47,56" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M52,25 L52,55" fill="none" stroke={hairColor} strokeWidth={4.5} strokeLinecap="round" />
                <Path d="M58,26 L58,54" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M64,28 L65,52" fill="none" stroke={hairColor} strokeWidth={4.5} strokeLinecap="round" />
                <Path d="M70,30 L72,50" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                {/* Highlights on fringe */}
                <Path d="M35,30 L34,50" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.25} />
                <Path d="M50,28 L50,52" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.25} />
                <Path d="M65,30 L66,48" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.25} />
              </G>
            );

          case HairStyle.KOREAN_COMMA:
            return (
              <G>
                {/* Main hair base */}
                <Path d="M22,38 Q20,16 50,12 Q80,16 78,38 L74,32 Q50,22 26,32 Z" fill={`url(#${mainGradientId})`} />
                {/* Comma-shaped bangs */}
                <Path d="M35,28 Q32,35 35,48 Q38,42 40,36 Z" fill={hairColor} />
                <Path d="M65,28 Q68,35 65,48 Q62,42 60,36 Z" fill={hairColor} />
                {/* Center bangs slightly parted */}
                <Path d="M45,26 Q44,35 46,50" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M55,26 Q56,35 54,50" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                {/* Comma curl highlights */}
                <Path d="M36,32 Q34,38 36,46" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.3} />
                <Path d="M64,32 Q66,38 64,46" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.3} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={18} rx={15} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.FRENCH_BOB:
            return (
              <G>
                {/* Classic French bob - chin length, slight inward curl */}
                <Path d="M22,40 Q20,18 50,14 Q80,18 78,40 L78,60 Q78,68 70,68 Q60,70 50,68 Q40,70 30,68 Q22,68 22,60 Z" fill={`url(#${mainGradientId})`} />
                {/* Blunt bangs */}
                <Rect x="28" y="36" width="44" height="12" rx={2} fill={hairColor} />
                {/* Inward curl at ends */}
                <Path d="M22,58 Q24,66 30,66" fill="none" stroke={shadow} strokeWidth={2} opacity={0.3} />
                <Path d="M78,58 Q76,66 70,66" fill="none" stroke={shadow} strokeWidth={2} opacity={0.3} />
                {/* Side texture */}
                <Path d="M25,45 L25,62" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
                <Path d="M75,45 L75,62" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={16} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.ITALIAN_BOB:
            return (
              <G>
                {/* Italian bob - slightly longer, more layers */}
                <Path d="M20,42 Q18,18 50,14 Q82,18 80,42 L80,70 Q78,78 65,76 Q50,78 35,76 Q22,78 20,70 Z" fill={`url(#${mainGradientId})`} />
                {/* Layered front pieces */}
                <Path d="M24,42 Q26,55 24,68" fill="none" stroke={shadow} strokeWidth={3} opacity={0.25} />
                <Path d="M76,42 Q74,55 76,68" fill="none" stroke={shadow} strokeWidth={3} opacity={0.25} />
                {/* Side-swept bangs */}
                <Path d="M32,38 Q40,36 55,42 L55,48 Q45,44 35,46 Z" fill={hairColor} />
                {/* Layer texture */}
                <Path d="M30,50 Q35,55 32,65" fill="none" stroke={shadow} strokeWidth={2} opacity={0.2} />
                <Path d="M70,50 Q65,55 68,65" fill="none" stroke={shadow} strokeWidth={2} opacity={0.2} />
                {/* Highlight */}
                <Ellipse cx={45} cy={20} rx={18} ry={7} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.BLUNT_BOB_CHIN:
            return (
              <G>
                {/* Super blunt chin-length bob */}
                <Path d="M22,40 Q20,16 50,12 Q80,16 78,40 L78,62 L22,62 Z" fill={`url(#${mainGradientId})`} />
                {/* Perfectly straight bottom */}
                <Rect x="22" y="58" width="56" height="6" fill={shadow} opacity={0.3} />
                {/* Blunt bangs */}
                <Rect x="30" y="34" width="40" height="10" rx={1} fill={hairColor} />
                {/* Vertical texture lines */}
                <Path d="M30,40 L30,60" fill="none" stroke={shadow} strokeWidth={1} opacity={0.15} />
                <Path d="M40,38 L40,60" fill="none" stroke={shadow} strokeWidth={1} opacity={0.15} />
                <Path d="M50,38 L50,60" fill="none" stroke={shadow} strokeWidth={1} opacity={0.15} />
                <Path d="M60,38 L60,60" fill="none" stroke={shadow} strokeWidth={1} opacity={0.15} />
                <Path d="M70,40 L70,60" fill="none" stroke={shadow} strokeWidth={1} opacity={0.15} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={20} rx={15} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.MICRO_BANGS:
            return (
              <G>
                {/* Main hair */}
                <Path d="M18,42 Q16,18 50,12 Q84,18 82,42 L78,38 Q50,30 22,38 Z" fill={`url(#${mainGradientId})`} />
                {/* Very short micro bangs */}
                <Rect x="32" y="32" width="36" height="6" rx={1} fill={hairColor} />
                {/* Micro bang texture */}
                <Path d="M35,33 L35,37" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
                <Path d="M42,33 L42,37" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
                <Path d="M50,33 L50,37" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
                <Path d="M58,33 L58,37" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
                <Path d="M65,33 L65,37" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={20} rx={16} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          // ============================================================================
          // PHASE 1.1 EXPANSION - Braided & Protective Styles
          // ============================================================================

          case HairStyle.GODDESS_LOCS:
            return (
              <G>
                {/* Main locs mass */}
                <Ellipse cx="50" cy="55" rx="38" ry="42" fill={hairColor} />
                {/* Individual goddess locs with curly wraps */}
                <Path d="M20,35 Q18,55 22,90" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M30,30 Q28,55 32,92" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M40,28 Q38,55 42,94" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M50,26 Q50,55 50,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M60,28 Q62,55 58,94" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M70,30 Q72,55 68,92" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M80,35 Q82,55 78,90" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                {/* Curly wraps on locs */}
                <CurlyTexture cx={25} cy={60} radius={8} color={highlight} count={5} />
                <CurlyTexture cx={50} cy={65} radius={8} color={highlight} count={5} />
                <CurlyTexture cx={75} cy={60} radius={8} color={highlight} count={5} />
                {/* Top hair section */}
                <Path d="M22,38 Q20,18 50,14 Q80,18 78,38" fill={hairColor} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={18} ry={8} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.PASSION_TWISTS:
            return (
              <G>
                {/* Main twists mass */}
                <Ellipse cx="50" cy="58" rx="40" ry="40" fill={hairColor} />
                {/* Individual passion twists - thicker, more textured */}
                <Path d="M18,38 Q15,60 20,95" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M28,32 Q25,60 30,95" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M38,28 Q35,60 40,95" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M50,26 Q50,60 50,95" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M62,28 Q65,60 60,95" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M72,32 Q75,60 70,95" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M82,38 Q85,60 80,95" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                {/* Twist texture */}
                <Path d="M19,45 Q21,50 19,55 Q21,60 19,65" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
                <Path d="M50,35 Q52,45 50,55 Q52,65 50,75" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
                <Path d="M81,45 Q79,50 81,55 Q79,60 81,65" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
                {/* Top section */}
                <Path d="M22,40 Q20,20 50,15 Q80,20 78,40" fill={hairColor} />
                <Ellipse cx={50} cy={22} rx={18} ry={8} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.KNOTLESS_BRAIDS:
            return (
              <G>
                {/* Knotless braids - medium length */}
                <Path d="M22,40 Q20,18 50,14 Q80,18 78,40" fill={hairColor} />
                {/* Individual braids */}
                <Path d="M22,38 L20,75" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M30,35 L28,78" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M38,32 L36,80" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M46,30 L45,82" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M54,30 L55,82" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M62,32 L64,80" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M70,35 L72,78" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M78,38 L80,75" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                {/* Braid texture - diagonal lines */}
                <Path d="M21,45 L23,48 L21,51 L23,54" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.4} />
                <Path d="M45,40 L47,43 L45,46 L47,49" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.4} />
                <Path d="M79,45 L77,48 L79,51 L77,54" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.4} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={20} rx={16} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.KNOTLESS_BRAIDS_LONG:
            return (
              <G>
                {/* Knotless braids - extra long */}
                <Path d="M22,40 Q20,18 50,14 Q80,18 78,40" fill={hairColor} />
                {/* Long individual braids */}
                <Path d="M18,40 L15,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M26,36 L22,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M34,32 L30,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M42,30 L40,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M50,28 L50,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M58,30 L60,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M66,32 L70,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M74,36 L78,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M82,40 L85,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                {/* Braid texture */}
                <Path d="M16,50 L18,53 L16,56 L18,59 L16,62" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.4} />
                <Path d="M50,40 L52,43 L50,46 L52,49 L50,52" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.4} />
                <Path d="M84,50 L82,53 L84,56 L82,59 L84,62" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.4} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={20} rx={16} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.FULANI_BRAIDS:
            return (
              <G>
                {/* Top section with center part */}
                <Path d="M22,40 Q20,18 50,14 Q80,18 78,40" fill={hairColor} />
                {/* Center cornrow */}
                <Path d="M50,15 L50,38" fill="none" stroke={shadow} strokeWidth={3} strokeLinecap="round" />
                <Path d="M49,18 L51,22 L49,26 L51,30 L49,34" fill="none" stroke={deepShadow} strokeWidth={1} opacity={0.5} />
                {/* Side cornrows going to ear */}
                <Path d="M35,20 Q28,28 22,35" fill="none" stroke={shadow} strokeWidth={2.5} />
                <Path d="M65,20 Q72,28 78,35" fill="none" stroke={shadow} strokeWidth={2.5} />
                {/* Decorative beads */}
                <Circle cx="25" cy="35" r="2" fill="#ffd700" />
                <Circle cx="35" cy="45" r="2" fill="#ffd700" />
                <Circle cx="75" cy="35" r="2" fill="#ffd700" />
                <Circle cx="65" cy="45" r="2" fill="#ffd700" />
                {/* Side braids hanging down */}
                <Path d="M22,38 L18,75" fill="none" stroke={hairColor} strokeWidth={3.5} strokeLinecap="round" />
                <Path d="M78,38 L82,75" fill="none" stroke={hairColor} strokeWidth={3.5} strokeLinecap="round" />
                {/* Front pieces */}
                <Path d="M28,40 L26,60" fill="none" stroke={hairColor} strokeWidth={3} strokeLinecap="round" />
                <Path d="M72,40 L74,60" fill="none" stroke={hairColor} strokeWidth={3} strokeLinecap="round" />
                {/* Top highlight */}
                <Ellipse cx={50} cy={18} rx={12} ry={4} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.TRIBAL_BRAIDS:
            return (
              <G>
                {/* Base hair */}
                <Path d="M22,42 Q20,20 50,14 Q80,20 78,42" fill={hairColor} />
                {/* Large tribal braids */}
                <Path d="M15,42 L12,95" fill="none" stroke={hairColor} strokeWidth={8} strokeLinecap="round" />
                <Path d="M30,38 L27,95" fill="none" stroke={hairColor} strokeWidth={8} strokeLinecap="round" />
                <Path d="M45,35 L43,95" fill="none" stroke={hairColor} strokeWidth={8} strokeLinecap="round" />
                <Path d="M55,35 L57,95" fill="none" stroke={hairColor} strokeWidth={8} strokeLinecap="round" />
                <Path d="M70,38 L73,95" fill="none" stroke={hairColor} strokeWidth={8} strokeLinecap="round" />
                <Path d="M85,42 L88,95" fill="none" stroke={hairColor} strokeWidth={8} strokeLinecap="round" />
                {/* Braid pattern texture */}
                <Path d="M13,50 L17,55 L13,60 L17,65 L13,70" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.4} />
                <Path d="M44,45 L48,50 L44,55 L48,60 L44,65" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.4} />
                <Path d="M87,50 L83,55 L87,60 L83,65 L87,70" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.4} />
                {/* Hair cuffs/beads */}
                <Rect x="10" y="65" width="8" height="4" rx={1} fill="#c9a86c" />
                <Rect x="42" y="60" width="8" height="4" rx={1} fill="#c9a86c" />
                <Rect x="82" y="65" width="8" height="4" rx={1} fill="#c9a86c" />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={18} ry={8} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.FAUX_LOCS:
            return (
              <G>
                {/* Main locs volume */}
                <Ellipse cx="50" cy="55" rx="38" ry="40" fill={hairColor} />
                {/* Individual faux locs */}
                <Path d="M18,40 L15,92" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M28,35 L25,94" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M38,32 L36,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M50,30 L50,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M62,32 L64,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M72,35 L75,94" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M82,40 L85,92" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                {/* Loc texture - wrapped look */}
                <Path d="M16,50 Q18,52 16,55 Q18,58 16,60" fill="none" stroke={shadow} strokeWidth={1} opacity={0.4} />
                <Path d="M50,40 Q52,43 50,46 Q52,49 50,52" fill="none" stroke={shadow} strokeWidth={1} opacity={0.4} />
                <Path d="M84,50 Q82,52 84,55 Q82,58 84,60" fill="none" stroke={shadow} strokeWidth={1} opacity={0.4} />
                {/* Top section */}
                <Path d="M22,42 Q20,20 50,15 Q80,20 78,42" fill={hairColor} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={18} ry={8} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.FAUX_LOCS_UPDO:
            return (
              <G>
                {/* Front section */}
                <Path d="M24,40 Q22,18 50,14 Q78,18 76,40 L72,34 Q50,26 28,34 Z" fill={hairColor} />
                {/* Updo bun of locs */}
                <Ellipse cx="50" cy="8" rx="16" ry="12" fill={hairColor} />
                {/* Locs wrapped in bun */}
                <Path d="M38,8 Q42,0 50,2 Q58,0 62,8" fill="none" stroke={shadow} strokeWidth={3} opacity={0.4} />
                <Path d="M40,12 Q45,6 50,8 Q55,6 60,12" fill="none" stroke={shadow} strokeWidth={2.5} opacity={0.3} />
                {/* Loc texture in bun */}
                <Circle cx="45" cy="6" r="2" fill={shadow} opacity={0.3} />
                <Circle cx="55" cy="6" r="2" fill={shadow} opacity={0.3} />
                <Circle cx="50" cy="4" r="2" fill={shadow} opacity={0.3} />
                {/* Side pieces hanging */}
                <Path d="M24,38 L22,55" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M76,38 L78,55" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                {/* Top highlight */}
                <Ellipse cx={50} cy={6} rx={10} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.CROCHET_CURLS:
            return (
              <G>
                {/* Voluminous curly mass */}
                <Ellipse cx="50" cy="50" rx="42" ry="42" fill={hairColor} />
                {/* Lots of curly texture */}
                <CurlyTexture cx={50} cy={50} radius={40} color={shadow} count={35} />
                <CurlyTexture cx={50} cy={40} radius={30} color={highlight} count={20} />
                {/* Define some curls */}
                <Circle cx="15" cy="45" r="7" fill={hairColor} />
                <Circle cx="85" cy="45" r="7" fill={hairColor} />
                <Circle cx="25" cy="25" r="8" fill={hairColor} />
                <Circle cx="75" cy="25" r="8" fill={hairColor} />
                <Circle cx="50" cy="12" r="9" fill={hairColor} />
                {/* Top section */}
                <Path d="M25,42 Q22,22 50,16 Q78,22 75,42" fill={hairColor} />
                {/* Top highlights */}
                <Circle cx="35" cy="18" r="4" fill={highlight} opacity={0.2} />
                <Circle cx="50" cy="14" r="5" fill={highlight} opacity={0.25} />
                <Circle cx="65" cy="18" r="4" fill={highlight} opacity={0.2} />
              </G>
            );

          case HairStyle.CROCHET_LOCS:
            return (
              <G>
                {/* Main locs volume */}
                <Ellipse cx="50" cy="55" rx="40" ry="42" fill={hairColor} />
                {/* Crochet locs - thicker, more textured */}
                <Path d="M15,42 Q12,65 18,95" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M26,36 Q22,62 28,95" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M38,32 Q35,60 40,95" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M50,30 Q50,60 50,95" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M62,32 Q65,60 60,95" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M74,36 Q78,62 72,95" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M85,42 Q88,65 82,95" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                {/* Fuzzy texture on locs */}
                <CurlyTexture cx={16} cy={60} radius={6} color={highlight} count={4} />
                <CurlyTexture cx={50} cy={55} radius={6} color={highlight} count={4} />
                <CurlyTexture cx={84} cy={60} radius={6} color={highlight} count={4} />
                {/* Top section */}
                <Path d="M24,44 Q22,22 50,16 Q78,22 76,44" fill={hairColor} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={18} ry={8} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.MARLEY_TWISTS:
            return (
              <G>
                {/* Main twist volume */}
                <Ellipse cx="50" cy="58" rx="42" ry="40" fill={hairColor} />
                {/* Marley twists - thick and textured */}
                <Path d="M14,42 Q10,65 16,95" fill="none" stroke={hairColor} strokeWidth={7} strokeLinecap="round" />
                <Path d="M28,36 Q24,62 30,95" fill="none" stroke={hairColor} strokeWidth={7} strokeLinecap="round" />
                <Path d="M42,32 Q38,58 44,95" fill="none" stroke={hairColor} strokeWidth={7} strokeLinecap="round" />
                <Path d="M58,32 Q62,58 56,95" fill="none" stroke={hairColor} strokeWidth={7} strokeLinecap="round" />
                <Path d="M72,36 Q76,62 70,95" fill="none" stroke={hairColor} strokeWidth={7} strokeLinecap="round" />
                <Path d="M86,42 Q90,65 84,95" fill="none" stroke={hairColor} strokeWidth={7} strokeLinecap="round" />
                {/* Kinky texture on twists */}
                <Path d="M13,50 Q16,52 13,55 Q16,58 13,62" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.4} />
                <Path d="M42,45 Q45,48 42,52 Q45,56 42,60" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.4} />
                <Path d="M87,50 Q84,52 87,55 Q84,58 87,62" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.4} />
                {/* Top section */}
                <Path d="M24,44 Q22,22 50,16 Q78,22 76,44" fill={hairColor} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={18} ry={8} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.SENEGALESE_TWISTS:
            return (
              <G>
                {/* Main twist volume */}
                <Ellipse cx="50" cy="60" rx="40" ry="38" fill={hairColor} />
                {/* Senegalese twists - sleek and uniform */}
                <Path d="M16,40 L14,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M26,36 L24,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M36,33 L35,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M46,31 L45,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M54,31 L55,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M64,33 L65,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M74,36 L76,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M84,40 L86,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                {/* Twist texture */}
                <Path d="M15,50 L17,53 L15,56 L17,59" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.4} />
                <Path d="M46,45 L48,48 L46,51 L48,54" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.4} />
                <Path d="M85,50 L83,53 L85,56 L83,59" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.4} />
                {/* Top section */}
                <Path d="M24,42 Q22,20 50,15 Q78,20 76,42" fill={hairColor} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={17} ry={7} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.HAVANA_TWISTS:
            return (
              <G>
                {/* Main twist volume - extra thick */}
                <Ellipse cx="50" cy="58" rx="44" ry="42" fill={hairColor} />
                {/* Havana twists - very thick and chunky */}
                <Path d="M12,44 Q8,68 15,95" fill="none" stroke={hairColor} strokeWidth={9} strokeLinecap="round" />
                <Path d="M30,36 Q26,64 33,95" fill="none" stroke={hairColor} strokeWidth={9} strokeLinecap="round" />
                <Path d="M50,32 Q50,62 50,95" fill="none" stroke={hairColor} strokeWidth={9} strokeLinecap="round" />
                <Path d="M70,36 Q74,64 67,95" fill="none" stroke={hairColor} strokeWidth={9} strokeLinecap="round" />
                <Path d="M88,44 Q92,68 85,95" fill="none" stroke={hairColor} strokeWidth={9} strokeLinecap="round" />
                {/* Chunky twist texture */}
                <Path d="M11,52 Q15,56 11,62 Q15,68 11,74" fill="none" stroke={shadow} strokeWidth={2} opacity={0.4} />
                <Path d="M50,42 Q54,48 50,55 Q54,62 50,70" fill="none" stroke={shadow} strokeWidth={2} opacity={0.4} />
                <Path d="M89,52 Q85,56 89,62 Q85,68 89,74" fill="none" stroke={shadow} strokeWidth={2} opacity={0.4} />
                {/* Top section */}
                <Path d="M24,46 Q22,22 50,16 Q78,22 76,46" fill={hairColor} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={24} rx={18} ry={8} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.SPRING_TWISTS:
            return (
              <G>
                {/* Bouncy spring twist volume */}
                <Ellipse cx="50" cy="55" rx="40" ry="40" fill={hairColor} />
                {/* Spring twists - bouncy, defined curls */}
                <Path d="M18,40 Q15,50 20,60 Q15,70 20,80 Q15,90 18,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M32,35 Q28,48 34,58 Q28,70 34,82 Q28,92 32,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M50,32 Q46,45 52,55 Q46,68 52,78 Q46,90 50,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M68,35 Q72,48 66,58 Q72,70 66,82 Q72,92 68,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M82,40 Q85,50 80,60 Q85,70 80,80 Q85,90 82,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                {/* Spring coil details */}
                <CurlyTexture cx={20} cy={65} radius={5} color={highlight} count={3} />
                <CurlyTexture cx={50} cy={60} radius={5} color={highlight} count={3} />
                <CurlyTexture cx={80} cy={65} radius={5} color={highlight} count={3} />
                {/* Top section */}
                <Path d="M24,42 Q22,20 50,15 Q78,20 76,42" fill={hairColor} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={17} ry={7} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.BUTTERFLY_LOCS:
            return (
              <G>
                {/* Main locs volume with butterfly texture */}
                <Ellipse cx="50" cy="55" rx="42" ry="42" fill={hairColor} />
                {/* Butterfly locs - distressed, loopy texture */}
                <Path d="M16,42 Q12,65 18,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M30,36 Q26,62 32,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M44,32 Q40,58 46,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M56,32 Q60,58 54,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M70,36 Q74,62 68,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M84,42 Q88,65 82,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                {/* Butterfly/distressed loops */}
                <Circle cx="14" cy="55" r="3" fill="none" stroke={hairColor} strokeWidth={2} />
                <Circle cx="18" cy="70" r="3" fill="none" stroke={hairColor} strokeWidth={2} />
                <Circle cx="44" cy="50" r="3" fill="none" stroke={hairColor} strokeWidth={2} />
                <Circle cx="48" cy="68" r="3" fill="none" stroke={hairColor} strokeWidth={2} />
                <Circle cx="56" cy="55" r="3" fill="none" stroke={hairColor} strokeWidth={2} />
                <Circle cx="84" cy="58" r="3" fill="none" stroke={hairColor} strokeWidth={2} />
                <Circle cx="82" cy="75" r="3" fill="none" stroke={hairColor} strokeWidth={2} />
                {/* Top section */}
                <Path d="M24,44 Q22,22 50,16 Q78,22 76,44" fill={hairColor} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={18} ry={8} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          // ============================================================================
          // PHASE 1.1 EXPANSION - Textured Variations
          // ============================================================================

          case HairStyle.COILS_4C:
            return (
              <G>
                {/* Dense 4C coil volume */}
                <Ellipse cx="50" cy="38" rx="38" ry="32" fill={hairColor} />
                {/* Dense coil texture - very tight */}
                <CurlyTexture cx={50} cy={38} radius={35} color={shadow} count={40} />
                <CurlyTexture cx={50} cy={32} radius={28} color={highlight} count={25} />
                {/* Defined outer coils */}
                <Circle cx="18" cy="32" r="6" fill={hairColor} />
                <Circle cx="82" cy="32" r="6" fill={hairColor} />
                <Circle cx="28" cy="18" r="7" fill={hairColor} />
                <Circle cx="72" cy="18" r="7" fill={hairColor} />
                <Circle cx="50" cy="10" r="8" fill={hairColor} />
                {/* Top highlight */}
                <Circle cx="40" cy="16" r="4" fill={highlight} opacity={0.2} />
                <Circle cx="60" cy="16" r="4" fill={highlight} opacity={0.2} />
                <Circle cx="50" cy="12" r="4.5" fill={highlight} opacity={0.25} />
              </G>
            );

          case HairStyle.COILS_4B:
            return (
              <G>
                {/* 4B coil volume - slightly looser than 4C */}
                <Ellipse cx="50" cy="36" rx="40" ry="34" fill={hairColor} />
                {/* 4B texture - z-pattern coils */}
                <CurlyTexture cx={50} cy={36} radius={36} color={shadow} count={32} />
                <CurlyTexture cx={50} cy={30} radius={28} color={highlight} count={18} />
                {/* Outer coils with more definition */}
                <Circle cx="16" cy="35" r="7" fill={hairColor} />
                <Circle cx="84" cy="35" r="7" fill={hairColor} />
                <Circle cx="26" cy="18" r="8" fill={hairColor} />
                <Circle cx="74" cy="18" r="8" fill={hairColor} />
                <Circle cx="50" cy="8" r="9" fill={hairColor} />
                {/* Top highlights */}
                <Circle cx="38" cy="15" r="4.5" fill={highlight} opacity={0.22} />
                <Circle cx="62" cy="15" r="4.5" fill={highlight} opacity={0.22} />
                <Circle cx="50" cy="10" r="5" fill={highlight} opacity={0.28} />
              </G>
            );

          case HairStyle.HEAT_DAMAGED:
            return (
              <G>
                {/* Mixed texture - some straight, some reverting */}
                <Path d="M20,42 Q18,20 50,14 Q82,20 80,42 L75,38 Q50,30 25,38 Z" fill={`url(#${mainGradientId})`} />
                {/* Straight sections */}
                <Path d="M25,38 L24,65" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M35,36 L34,68" fill="none" stroke={hairColor} strokeWidth={3.5} strokeLinecap="round" />
                <Path d="M75,38 L76,65" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M65,36 L66,68" fill="none" stroke={hairColor} strokeWidth={3.5} strokeLinecap="round" />
                {/* Reverting/frizzy sections */}
                <Path d="M45,35 Q48,45 44,55 Q48,62 46,70" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M55,35 Q52,45 56,55 Q52,62 54,70" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                {/* Frizz texture at roots */}
                <CurlyTexture cx={40} cy={38} radius={6} color={shadow} count={5} />
                <CurlyTexture cx={60} cy={38} radius={6} color={shadow} count={5} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={16} ry={7} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.WASH_AND_GO:
            return (
              <G>
                {/* Defined wash and go curls */}
                <Ellipse cx="50" cy="45" rx="40" ry="38" fill={hairColor} />
                {/* Defined curl clumps */}
                <Circle cx="22" cy="35" r="8" fill={hairColor} />
                <Circle cx="35" cy="25" r="8" fill={hairColor} />
                <Circle cx="50" cy="20" r="9" fill={hairColor} />
                <Circle cx="65" cy="25" r="8" fill={hairColor} />
                <Circle cx="78" cy="35" r="8" fill={hairColor} />
                <Circle cx="15" cy="50" r="7" fill={hairColor} />
                <Circle cx="85" cy="50" r="7" fill={hairColor} />
                {/* Curl definition highlights */}
                <Circle cx="22" cy="33" r="4" fill={highlight} opacity={0.25} />
                <Circle cx="50" cy="18" r="5" fill={highlight} opacity={0.3} />
                <Circle cx="78" cy="33" r="4" fill={highlight} opacity={0.25} />
                {/* Wet/product shine effect */}
                <Ellipse cx={50} cy={22} rx={20} ry={8} fill={brightHighlight} opacity={0.15} />
                {/* Curl clump texture */}
                <CurlyTexture cx={50} cy={45} radius={35} color={shadow} count={20} />
              </G>
            );

          case HairStyle.TWIST_OUT_DEFINED:
            return (
              <G>
                {/* Defined twist out pattern */}
                <Ellipse cx="50" cy="42" rx="40" ry="36" fill={hairColor} />
                {/* Elongated curl pattern from twists */}
                <Path d="M22,38 Q25,50 22,62 Q25,74 22,85" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M35,32 Q38,48 35,62 Q38,76 35,88" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M50,28 Q53,45 50,60 Q53,75 50,90" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M65,32 Q62,48 65,62 Q62,76 65,88" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M78,38 Q75,50 78,62 Q75,74 78,85" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                {/* Wave pattern texture */}
                <Path d="M23,45 Q27,50 23,56" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.3} />
                <Path d="M50,38 Q54,45 50,52" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.3} />
                <Path d="M77,45 Q73,50 77,56" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.3} />
                {/* Top section */}
                <Path d="M24,40 Q22,20 50,15 Q78,20 76,40" fill={hairColor} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={18} ry={8} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.BRAID_OUT:
            return (
              <G>
                {/* Braid out - more defined waves than twist out */}
                <Ellipse cx="50" cy="45" rx="42" ry="38" fill={hairColor} />
                {/* Crimped wave pattern */}
                <Path d="M20,40 L22,48 L18,56 L22,64 L18,72 L22,80" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M32,35 L35,45 L31,55 L35,65 L31,75 L35,85" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M44,32 L47,42 L43,52 L47,62 L43,72 L47,82" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M56,32 L53,42 L57,52 L53,62 L57,72 L53,82" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M68,35 L65,45 L69,55 L65,65 L69,75 L65,85" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M80,40 L78,48 L82,56 L78,64 L82,72 L78,80" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                {/* Top section */}
                <Path d="M24,42 Q22,20 50,15 Q78,20 76,42" fill={hairColor} />
                {/* Crimped texture highlights */}
                <Path d="M33,40 L36,50 L32,60" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.2} />
                <Path d="M67,40 L64,50 L68,60" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.2} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={18} ry={8} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.FINGER_COILS:
            return (
              <G>
                {/* Defined finger coils */}
                <Ellipse cx="50" cy="48" rx="38" ry="40" fill={hairColor} />
                {/* Individual defined coils */}
                <Path d="M20,38 Q22,42 20,48 Q22,54 20,60 Q22,66 20,72 Q22,78 20,85" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M30,34 Q32,40 30,48 Q32,56 30,64 Q32,72 30,80 Q32,86 30,92" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M40,30 Q42,38 40,48 Q42,58 40,68 Q42,78 40,88" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M50,28 Q52,38 50,50 Q52,62 50,74 Q52,86 50,95" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M60,30 Q58,38 60,48 Q58,58 60,68 Q58,78 60,88" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M70,34 Q68,40 70,48 Q68,56 70,64 Q68,72 70,80 Q68,86 70,92" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                <Path d="M80,38 Q78,42 80,48 Q78,54 80,60 Q78,66 80,72 Q78,78 80,85" fill="none" stroke={hairColor} strokeWidth={4} strokeLinecap="round" />
                {/* Top section */}
                <Path d="M24,40 Q22,20 50,15 Q78,20 76,40" fill={hairColor} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={16} ry={7} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.SHINGLED_CURLS:
            return (
              <G>
                {/* Super defined shingled curls */}
                <Ellipse cx="50" cy="45" rx="40" ry="38" fill={hairColor} />
                {/* Very defined S-curl pattern */}
                <Path d="M18,40 Q22,45 18,52 Q22,60 18,68 Q22,76 18,84" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M30,35 Q34,42 30,50 Q34,58 30,66 Q34,74 30,82" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M42,32 Q46,40 42,48 Q46,56 42,64 Q46,72 42,80" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M58,32 Q54,40 58,48 Q54,56 58,64 Q54,72 58,80" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M70,35 Q66,42 70,50 Q66,58 70,66 Q66,74 70,82" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M82,40 Q78,45 82,52 Q78,60 82,68 Q78,76 82,84" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                {/* Shine/gel effect */}
                <Ellipse cx={50} cy={40} rx={30} ry={15} fill={brightHighlight} opacity={0.12} />
                {/* Top section */}
                <Path d="M24,42 Q22,20 50,15 Q78,20 76,42" fill={hairColor} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={18} ry={8} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.STRETCHED_NATURAL:
            return (
              <G>
                {/* Stretched natural - elongated curls */}
                <Ellipse cx="50" cy="50" rx="38" ry="45" fill={hairColor} />
                {/* Elongated curly texture */}
                <Path d="M22,38 Q25,55 22,75 Q25,88 22,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M35,32 Q38,52 35,72 Q38,86 35,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M50,28 Q53,50 50,72 Q53,88 50,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M65,32 Q62,52 65,72 Q62,86 65,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                <Path d="M78,38 Q75,55 78,75 Q75,88 78,95" fill="none" stroke={hairColor} strokeWidth={5} strokeLinecap="round" />
                {/* Subtle wave texture */}
                <Path d="M23,50 Q26,58 23,66" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.25} />
                <Path d="M50,42 Q53,52 50,62" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.25} />
                <Path d="M77,50 Q74,58 77,66" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.25} />
                {/* Top section */}
                <Path d="M24,40 Q22,20 50,15 Q78,20 76,40" fill={hairColor} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={17} ry={7} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.PINEAPPLE_UPDO:
            return (
              <G>
                {/* Front section */}
                <Path d="M24,40 Q22,20 50,15 Q78,20 76,40 L72,35 Q50,28 28,35 Z" fill={hairColor} />
                {/* Pineapple ponytail on top */}
                <Ellipse cx="50" cy="5" rx="20" ry="15" fill={hairColor} />
                {/* Curly pineapple texture */}
                <CurlyTexture cx={50} cy={5} radius={18} color={shadow} count={15} />
                <CurlyTexture cx={50} cy={2} radius={12} color={highlight} count={8} />
                {/* Some curls spilling out */}
                <Circle cx="35" cy="0" r="5" fill={hairColor} />
                <Circle cx="65" cy="0" r="5" fill={hairColor} />
                <Circle cx="50" cy="-5" r="6" fill={hairColor} />
                {/* Scrunchie/band */}
                <Ellipse cx="50" cy="15" rx="12" ry="4" fill={deepShadow} />
                <Ellipse cx="50" cy="15" rx="10" ry="3" fill={shadow} opacity={0.6} />
                {/* Edges/baby hair */}
                <Path d="M28,38 Q32,42 36,38" fill="none" stroke={hairColor} strokeWidth={2} opacity={0.5} />
                <Path d="M64,38 Q68,42 72,38" fill="none" stroke={hairColor} strokeWidth={2} opacity={0.5} />
              </G>
            );

          // ============================================================================
          // PHASE 1.1 EXPANSION - Age Appropriate
          // ============================================================================

          case HairStyle.RECEDING_SHORT:
            return (
              <G>
                {/* Receding hairline - short style */}
                <Path d="M32,32 Q35,18 50,16 Q65,18 68,32 Q75,28 76,36 L72,32 Q50,24 28,32 L24,36 Q25,28 32,32 Z" fill={`url(#${mainGradientId})`} />
                {/* Visible scalp at temples */}
                <Path d="M26,34 Q28,28 32,30" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
                <Path d="M74,34 Q72,28 68,30" fill="none" stroke={shadow} strokeWidth={1} opacity={0.3} />
                {/* Short hair texture */}
                <HairStrands startX={35} startY={22} endX={65} endY={30} count={10} color={highlight} opacity={0.2} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={12} ry={5} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.RECEDING_SLICKED:
            return (
              <G>
                {/* Slicked back with receding hairline */}
                <Path d="M30,34 Q35,16 50,14 Q65,16 70,34 Q78,30 80,40 L75,35 Q50,22 25,35 L20,40 Q22,30 30,34 Z" fill={`url(#${mainGradientId})`} />
                {/* Slicked back lines */}
                <Path d="M35,28 Q45,22 55,28" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.3} />
                <Path d="M38,32 Q50,26 62,32" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.3} />
                {/* Slick product shine */}
                <Ellipse cx={50} cy={24} rx={14} ry={6} fill={brightHighlight} opacity={0.2} />
                {/* Temple recession */}
                <Path d="M25,36 Q30,30 34,34" fill="none" stroke={shadow} strokeWidth={1} opacity={0.4} />
                <Path d="M75,36 Q70,30 66,34" fill="none" stroke={shadow} strokeWidth={1} opacity={0.4} />
              </G>
            );

          case HairStyle.THINNING_TOP:
            return (
              <G>
                {/* Thinning on top */}
                <Path d="M24,36 Q24,14 50,12 Q76,14 76,36 Q76,40 72,42 L68,28 Q50,20 32,28 L28,42 Q24,40 24,36 Z" fill={`url(#${mainGradientId})`} />
                {/* Sparse hair on top - see-through effect */}
                <Path d="M35,24 L36,30" fill="none" stroke={hairColor} strokeWidth={2} opacity={0.5} />
                <Path d="M42,22 L43,28" fill="none" stroke={hairColor} strokeWidth={2} opacity={0.5} />
                <Path d="M50,20 L50,28" fill="none" stroke={hairColor} strokeWidth={2} opacity={0.6} />
                <Path d="M58,22 L57,28" fill="none" stroke={hairColor} strokeWidth={2} opacity={0.5} />
                <Path d="M65,24 L64,30" fill="none" stroke={hairColor} strokeWidth={2} opacity={0.5} />
                {/* Fuller sides */}
                <Path d="M26,32 Q28,28 32,32" fill={hairColor} />
                <Path d="M74,32 Q72,28 68,32" fill={hairColor} />
                {/* Top highlight (subtle) */}
                <Ellipse cx={50} cy={20} rx={12} ry={5} fill={`url(#${highlightGradientId})`} opacity={0.5} />
              </G>
            );

          case HairStyle.THINNING_CROWN:
            return (
              <G>
                {/* Thinning at crown */}
                <Path d="M24,36 Q24,14 50,12 Q76,14 76,36 Q76,40 72,42 L68,28 Q50,20 32,28 L28,42 Q24,40 24,36 Z" fill={`url(#${mainGradientId})`} />
                {/* Crown area sparse */}
                <Circle cx="50" cy="18" r="8" fill={shadow} opacity={0.15} />
                {/* Sparse strands over crown */}
                <Path d="M45,16 L46,24" fill="none" stroke={hairColor} strokeWidth={1.5} opacity={0.4} />
                <Path d="M50,14 L50,22" fill="none" stroke={hairColor} strokeWidth={1.5} opacity={0.4} />
                <Path d="M55,16 L54,24" fill="none" stroke={hairColor} strokeWidth={1.5} opacity={0.4} />
                {/* Fuller front and sides */}
                <Path d="M32,26 Q40,22 48,26" fill={hairColor} />
                <Path d="M52,26 Q60,22 68,26" fill={hairColor} />
              </G>
            );

          case HairStyle.MATURE_BOB:
            return (
              <G>
                {/* Classic mature bob - chin length, elegant */}
                <Path d="M22,40 Q20,18 50,14 Q80,18 78,40 L78,65 Q76,72 65,70 Q50,72 35,70 Q24,72 22,65 Z" fill={`url(#${mainGradientId})`} />
                {/* Volume at crown */}
                <Path d="M28,38 Q25,22 50,18 Q75,22 72,38" fill={hairColor} />
                {/* Gentle inward curl */}
                <Path d="M24,60 Q28,68 35,68" fill="none" stroke={shadow} strokeWidth={2} opacity={0.3} />
                <Path d="M76,60 Q72,68 65,68" fill="none" stroke={shadow} strokeWidth={2} opacity={0.3} />
                {/* Side texture */}
                <Path d="M26,45 L26,62" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
                <Path d="M74,45 L74,62" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={16} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.MATURE_PIXIE:
            return (
              <G>
                {/* Elegant mature pixie */}
                <Path d="M24,36 Q22,16 50,12 Q78,16 76,36 Q76,40 72,42 L68,28 Q50,20 32,28 L28,42 Q24,40 24,36 Z" fill={`url(#${mainGradientId})`} />
                {/* Soft, feathered texture */}
                <Path d="M28,32 Q35,26 42,34" fill="none" stroke={hairColor} strokeWidth={3} strokeLinecap="round" />
                <Path d="M40,28 Q50,22 60,28" fill="none" stroke={hairColor} strokeWidth={3} strokeLinecap="round" />
                <Path d="M58,34 Q65,26 72,32" fill="none" stroke={hairColor} strokeWidth={3} strokeLinecap="round" />
                {/* Soft side-swept fringe */}
                <Path d="M30,34 Q38,30 45,38" fill="none" stroke={hairColor} strokeWidth={3.5} strokeLinecap="round" />
                {/* Top highlight */}
                <Ellipse cx={50} cy={20} rx={15} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.DISTINGUISHED_GRAY:
            return (
              <G>
                {/* Distinguished gray - neat, classic style */}
                <Path d="M24,36 Q24,14 50,12 Q76,14 76,36 Q76,40 72,42 L68,26 Q50,18 32,26 L28,42 Q24,40 24,36 Z" fill={`url(#${mainGradientId})`} />
                {/* Side part */}
                <Path d="M35,36 L38,14" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.5} />
                {/* Neat combed texture */}
                <Path d="M40,22 Q52,18 65,24" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.2} />
                <Path d="M38,26 Q50,22 68,28" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.2} />
                <Path d="M36,30 Q48,26 70,32" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.2} />
                {/* Top highlight */}
                <Ellipse cx={52} cy={20} rx={14} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.SILVER_FOX:
            return (
              <G>
                {/* Silver fox - full, well-groomed gray/silver */}
                <Path d="M22,38 Q20,14 50,10 Q80,14 78,38 Q78,42 74,44 L70,28 Q50,18 30,28 L26,44 Q22,42 22,38 Z" fill={`url(#${mainGradientId})`} />
                {/* Voluminous top */}
                <Path d="M28,30 Q35,20 50,18 Q65,20 72,30" fill={hairColor} />
                {/* Swept back styling */}
                <Path d="M30,28 Q42,22 55,26" fill="none" stroke={highlight} strokeWidth={2} opacity={0.25} />
                <Path d="M32,32 Q45,26 62,30" fill="none" stroke={highlight} strokeWidth={2} opacity={0.25} />
                <Path d="M55,26 Q65,24 72,30" fill="none" stroke={highlight} strokeWidth={2} opacity={0.25} />
                {/* Silver shine effect */}
                <Ellipse cx={50} cy={22} rx={18} ry={8} fill={brightHighlight} opacity={0.25} />
              </G>
            );

          case HairStyle.ELEGANT_UPDO:
            return (
              <G>
                {/* Front section */}
                <Path d="M26,42 Q24,22 50,16 Q76,22 74,42 L70,36 Q50,30 30,36 Z" fill={`url(#${sideGradientId})`} />
                {/* Elegant bun */}
                <Ellipse cx="50" cy="6" rx="14" ry="10" fill={hairColor} />
                {/* Bun twist texture */}
                <Path d="M40,6 Q50,-2 60,6 Q50,10 40,6" fill="none" stroke={shadow} strokeWidth={2} opacity={0.35} />
                <Path d="M44,4 Q50,0 56,4" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.3} />
                {/* Bun highlight */}
                <Ellipse cx={48} cy={4} rx={5} ry={4} fill={brightHighlight} opacity={0.2} />
                {/* Hair pins decorations */}
                <Circle cx="42" cy="10" r="1.5" fill="#c9a86c" />
                <Circle cx="58" cy="10" r="1.5" fill="#c9a86c" />
                {/* Swept hair to bun */}
                <Path d="M30,34 Q40,24 50,16" fill="none" stroke={shadow} strokeWidth={2} opacity={0.3} />
                <Path d="M70,34 Q60,24 50,16" fill="none" stroke={shadow} strokeWidth={2} opacity={0.3} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={14} ry={5} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.CLASSIC_WAVES:
            return (
              <G>
                {/* Classic finger waves / vintage waves */}
                <Path d="M22,42 Q20,20 50,14 Q80,20 78,42 L78,70 Q76,78 50,76 Q24,78 22,70 Z" fill={`url(#${mainGradientId})`} />
                {/* Wave ridges */}
                <Path d="M26,35 Q38,30 50,35 Q62,30 74,35" fill="none" stroke={shadow} strokeWidth={2.5} opacity={0.35} />
                <Path d="M24,45 Q38,40 50,45 Q62,40 76,45" fill="none" stroke={shadow} strokeWidth={2.5} opacity={0.35} />
                <Path d="M24,55 Q38,50 50,55 Q62,50 76,55" fill="none" stroke={shadow} strokeWidth={2.5} opacity={0.35} />
                <Path d="M24,65 Q38,60 50,65 Q62,60 76,65" fill="none" stroke={shadow} strokeWidth={2.5} opacity={0.35} />
                {/* Wave highlights */}
                <Path d="M28,32 Q40,28 52,32" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.2} />
                <Path d="M28,42 Q40,38 52,42" fill="none" stroke={highlight} strokeWidth={1.5} opacity={0.2} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={16} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          // ============================================================================
          // PHASE 1.1 EXPANSION - Hair Accessories Integration
          // ============================================================================

          case HairStyle.WITH_CLIPS:
            return (
              <G>
                {/* Base medium hair */}
                <Path d="M20,42 Q18,18 50,14 Q82,18 80,42 L75,38 Q50,30 25,38 Z" fill={`url(#${mainGradientId})`} />
                {/* Side pieces */}
                <Path d="M22,42 L20,70" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                <Path d="M78,42 L80,70" fill="none" stroke={hairColor} strokeWidth={6} strokeLinecap="round" />
                {/* Hair clips */}
                <Rect x="26" y="38" width="8" height="3" rx={1} fill="#ff69b4" />
                <Rect x="36" y="36" width="8" height="3" rx={1} fill="#87ceeb" />
                <Rect x="56" y="36" width="8" height="3" rx={1} fill="#98fb98" />
                <Rect x="66" y="38" width="8" height="3" rx={1} fill="#dda0dd" />
                {/* Top highlight */}
                <Ellipse cx={50} cy={20} rx={16} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.WITH_SCRUNCHIE:
            return (
              <G>
                {/* Front hair section */}
                <Path d="M24,40 Q22,18 50,14 Q78,18 76,40 L72,34 Q50,26 28,34 Z" fill={`url(#${sideGradientId})`} />
                {/* High ponytail */}
                <Path d="M42,22 Q40,40 44,95 L56,95 Q60,40 58,22" fill={`url(#${mainGradientId})`} />
                {/* Scrunchie */}
                <Ellipse cx="50" cy="24" rx="10" ry="5" fill="#ff69b4" />
                <Ellipse cx="50" cy="24" rx="8" ry="4" fill="#ff85c1" opacity={0.5} />
                {/* Scrunchie texture */}
                <Path d="M42,24 Q45,22 48,24 Q51,22 54,24 Q57,22 58,24" fill="none" stroke="#ff4d94" strokeWidth={1.5} opacity={0.5} />
                {/* Ponytail strands */}
                <HairStrands startX={44} startY={30} endX={56} endY={90} count={6} color={highlight} opacity={0.18} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={18} rx={12} ry={5} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.WITH_BOBBY_PINS:
            return (
              <G>
                {/* Pinned back style */}
                <Path d="M22,42 Q20,18 50,14 Q80,18 78,42 L74,36 Q50,28 26,36 Z" fill={`url(#${mainGradientId})`} />
                {/* Side sections pinned back */}
                <Path d="M28,40 Q35,38 40,42" fill={hairColor} />
                <Path d="M72,40 Q65,38 60,42" fill={hairColor} />
                {/* Bobby pins */}
                <Rect x="32" y="36" width="10" height="1.5" rx={0.5} fill="#1a1a1a" />
                <Rect x="34" y="40" width="10" height="1.5" rx={0.5} fill="#1a1a1a" />
                <Rect x="58" y="36" width="10" height="1.5" rx={0.5} fill="#1a1a1a" />
                <Rect x="56" y="40" width="10" height="1.5" rx={0.5} fill="#1a1a1a" />
                {/* Top highlight */}
                <Ellipse cx={50} cy={20} rx={16} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.WITH_FLOWER_CROWN:
            return (
              <G>
                {/* Long wavy hair base */}
                <Path d="M15,40 Q12,55 18,70 Q15,85 25,95 L75,95 Q85,85 82,70 Q88,55 85,40 Q85,15 50,10 Q15,15 15,40 Z" fill={`url(#${mainGradientId})`} />
                {/* Top section */}
                <Path d="M22,40 Q20,18 50,12 Q80,18 78,40 L75,34 Q50,26 25,34 Z" fill={hairColor} />
                {/* Flower crown */}
                <Path d="M22,28 Q50,22 78,28" fill="none" stroke="#228b22" strokeWidth={2} />
                {/* Flowers */}
                <Circle cx="28" cy="26" r="4" fill="#ff69b4" />
                <Circle cx="28" cy="26" r="2" fill="#ffff00" />
                <Circle cx="40" cy="24" r="4" fill="#ff6347" />
                <Circle cx="40" cy="24" r="2" fill="#ffff00" />
                <Circle cx="50" cy="23" r="4.5" fill="#ffffff" />
                <Circle cx="50" cy="23" r="2.5" fill="#ffff00" />
                <Circle cx="60" cy="24" r="4" fill="#da70d6" />
                <Circle cx="60" cy="24" r="2" fill="#ffff00" />
                <Circle cx="72" cy="26" r="4" fill="#87ceeb" />
                <Circle cx="72" cy="26" r="2" fill="#ffff00" />
                {/* Leaves */}
                <Ellipse cx="34" cy="26" rx="3" ry="1.5" fill="#228b22" />
                <Ellipse cx="66" cy="26" rx="3" ry="1.5" fill="#228b22" />
                {/* Top highlight */}
                <Ellipse cx={50} cy={18} rx={16} ry={5} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.WITH_HAIR_PINS:
            return (
              <G>
                {/* Elegant updo base */}
                <Path d="M26,42 Q24,22 50,16 Q76,22 74,42 L70,36 Q50,30 30,36 Z" fill={`url(#${sideGradientId})`} />
                {/* Bun */}
                <Ellipse cx="50" cy="8" rx="14" ry="10" fill={hairColor} />
                {/* Decorative hair pins */}
                <Circle cx="40" cy="6" r="2.5" fill="#ffd700" />
                <Path d="M40,8 L40,16" fill="none" stroke="#c9a86c" strokeWidth={1.5} />
                <Circle cx="50" cy="2" r="3" fill="#c0c0c0" />
                <Path d="M50,5 L50,14" fill="none" stroke="#a0a0a0" strokeWidth={1.5} />
                <Circle cx="60" cy="6" r="2.5" fill="#ffd700" />
                <Path d="M60,8 L60,16" fill="none" stroke="#c9a86c" strokeWidth={1.5} />
                {/* Bun texture */}
                <Path d="M42,8 Q50,2 58,8" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.3} />
                {/* Top highlight */}
                <Ellipse cx={50} cy={6} rx={10} ry={5} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.WITH_BARRETTES:
            return (
              <G>
                {/* Medium hair with side barrettes */}
                <Path d="M20,42 Q18,18 50,14 Q82,18 80,42 L80,72 Q78,80 50,78 Q22,80 20,72 Z" fill={`url(#${mainGradientId})`} />
                {/* Top section */}
                <Path d="M24,42 Q22,20 50,16 Q78,20 76,42" fill={hairColor} />
                {/* Decorative barrettes */}
                <Rect x="26" y="40" width="12" height="4" rx={2} fill="#ffd700" />
                <Path d="M28,42 L36,42" fill="none" stroke="#b8860b" strokeWidth={1} />
                <Rect x="62" y="40" width="12" height="4" rx={2} fill="#ffd700" />
                <Path d="M64,42 L72,42" fill="none" stroke="#b8860b" strokeWidth={1} />
                {/* Pearl decorations on barrettes */}
                <Circle cx="29" cy="42" r="1.5" fill="#fff5ee" />
                <Circle cx="32" cy="42" r="1.5" fill="#fff5ee" />
                <Circle cx="35" cy="42" r="1.5" fill="#fff5ee" />
                <Circle cx="65" cy="42" r="1.5" fill="#fff5ee" />
                <Circle cx="68" cy="42" r="1.5" fill="#fff5ee" />
                <Circle cx="71" cy="42" r="1.5" fill="#fff5ee" />
                {/* Top highlight */}
                <Ellipse cx={50} cy={22} rx={16} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.WITH_RIBBON:
            return (
              <G>
                {/* Long hair with ribbon */}
                <Path d="M15,40 L15,90 Q15,95 25,95 L75,95 Q85,95 85,90 L85,40 Q85,15 50,10 Q15,15 15,40 Z" fill={`url(#${mainGradientId})`} />
                {/* Top section */}
                <Path d="M22,40 Q20,18 50,12 Q80,18 78,40 L75,34 Q50,26 25,34 Z" fill={hairColor} />
                {/* Ribbon bow */}
                <Path d="M40,26 Q35,20 40,14 Q45,20 40,26 Z" fill="#ff69b4" />
                <Path d="M60,26 Q65,20 60,14 Q55,20 60,26 Z" fill="#ff69b4" />
                <Ellipse cx="50" cy="22" rx="5" ry="3" fill="#ff69b4" />
                {/* Ribbon tails */}
                <Path d="M45,24 L42,35" fill="none" stroke="#ff69b4" strokeWidth={3} strokeLinecap="round" />
                <Path d="M55,24 L58,35" fill="none" stroke="#ff69b4" strokeWidth={3} strokeLinecap="round" />
                {/* Bow center */}
                <Circle cx="50" cy="22" r="2" fill="#ff1493" />
                {/* Top highlight */}
                <Ellipse cx={50} cy={16} rx={14} ry={5} fill={`url(#${highlightGradientId})`} />
              </G>
            );

          case HairStyle.WITH_HEADSCARF:
            return (
              <G>
                {/* Hair visible at front and bottom */}
                <Path d="M22,50 L20,85 Q22,92 35,92 L65,92 Q78,92 80,85 L78,50" fill={hairColor} />
                {/* Headscarf */}
                <Defs>
                  <LinearGradient id={`scarf_${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#e74c3c" />
                    <Stop offset="50%" stopColor="#c0392b" />
                    <Stop offset="100%" stopColor="#a93226" />
                  </LinearGradient>
                </Defs>
                <Path d="M18,48 Q15,30 50,25 Q85,30 82,48 L82,38 Q80,22 50,20 Q20,22 18,38 Z" fill={`url(#scarf_${gradientId})`} />
                {/* Scarf tie/knot at side */}
                <Ellipse cx="22" cy="45" rx="5" ry="4" fill="#c0392b" />
                <Path d="M20,48 L15,58" fill="none" stroke="#c0392b" strokeWidth={4} strokeLinecap="round" />
                <Path d="M24,48 L22,60" fill="none" stroke="#c0392b" strokeWidth={4} strokeLinecap="round" />
                {/* Pattern on scarf */}
                <Path d="M30,32 Q50,28 70,32" fill="none" stroke="#f5b041" strokeWidth={1.5} opacity={0.6} />
                <Path d="M28,38 Q50,34 72,38" fill="none" stroke="#f5b041" strokeWidth={1.5} opacity={0.6} />
                {/* Bangs peeking out */}
                <Path d="M28,42 Q35,38 42,44" fill={hairColor} />
                {/* Hair strand texture */}
                <Path d="M25,55 L24,82" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
                <Path d="M75,55 L76,82" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
              </G>
            );

          default:
            return (
              <G>
                <Path d="M24,34 Q24,12 50,10 Q76,12 76,34 Q76,38 72,40 L68,26 Q50,18 32,26 L28,40 Q24,38 24,34 Z" fill={`url(#${mainGradientId})`} />
                <Ellipse cx={50} cy={18} rx={15} ry={6} fill={`url(#${highlightGradientId})`} />
              </G>
            );
        }
      })()}
      {/* Render highlight streaks on top of hair for highlight/streak treatments */}
      {renderHighlightStreaks()}
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
    HairStyle.SILK_PRESS, HairStyle.NATURAL_CURLS, HairStyle.GODDESS_LOCS, HairStyle.PASSION_TWISTS,
    HairStyle.KNOTLESS_BRAIDS_LONG, HairStyle.FULANI_BRAIDS, HairStyle.TRIBAL_BRAIDS,
    HairStyle.FAUX_LOCS, HairStyle.CROCHET_LOCS, HairStyle.MARLEY_TWISTS, HairStyle.SENEGALESE_TWISTS,
    HairStyle.HAVANA_TWISTS, HairStyle.SPRING_TWISTS, HairStyle.BUTTERFLY_LOCS,
    // Additional Phase 1.1 styles
    HairStyle.CURTAIN_BANGS_LONG, HairStyle.CURTAIN_BANGS_WAVY, HairStyle.EGIRL_STYLE,
    HairStyle.CROCHET_CURLS, HairStyle.TWIST_OUT_DEFINED, HairStyle.BRAID_OUT, HairStyle.FINGER_COILS,
    HairStyle.SHINGLED_CURLS, HairStyle.STRETCHED_NATURAL, HairStyle.CLASSIC_WAVES,
    HairStyle.WITH_FLOWER_CROWN, HairStyle.WITH_RIBBON,
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
          case HairStyle.STRETCHED_NATURAL:
          case HairStyle.CURTAIN_BANGS_LONG:
            return (
              <G>
                <Rect x="18" y="35" width="64" height="60" fill={`url(#${mainBehindGradientId})`} />
                {/* Vertical strand texture */}
                <Path d="M25,40 L25,90" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
                <Path d="M35,38 L35,92" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M50,38 L50,92" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M65,38 L65,92" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M75,40 L75,90" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
              </G>
            );

          // Wavy styles - wavy strand texture
          case HairStyle.LONG_WAVY:
          case HairStyle.LONG_BEACH_WAVES:
          case HairStyle.MEDIUM_WAVY:
          case HairStyle.CLASSIC_WAVES:
          case HairStyle.CURTAIN_BANGS_WAVY:
          case HairStyle.EGIRL_STYLE:
          case HairStyle.WITH_FLOWER_CROWN:
          case HairStyle.WITH_RIBBON:
            return (
              <G>
                <Rect x="18" y="35" width="64" height="60" fill={`url(#${mainBehindGradientId})`} />
                {/* Wavy strand texture */}
                <Path d="M25,40 Q28,55 24,70 Q28,85 26,92" fill="none" stroke={shadow} strokeWidth={2} opacity={0.2} />
                <Path d="M75,40 Q72,55 76,70 Q72,85 74,92" fill="none" stroke={shadow} strokeWidth={2} opacity={0.2} />
                <Path d="M40,38 Q43,55 39,70 Q43,85 41,92" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M60,38 Q57,55 61,70 Q57,85 59,92" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
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
          case HairStyle.TWIST_OUT_DEFINED:
          case HairStyle.BRAID_OUT:
          case HairStyle.FINGER_COILS:
          case HairStyle.SHINGLED_CURLS:
          case HairStyle.CROCHET_CURLS:
            return (
              <G>
                <Ellipse cx="50" cy="60" rx="38" ry="40" fill={`url(#${mainBehindGradientId})`} />
                {/* Curly texture */}
                <CurlyTexture cx={50} cy={60} radius={35} color={shadow} count={15} />
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
          case HairStyle.GODDESS_LOCS:
          case HairStyle.PASSION_TWISTS:
          case HairStyle.KNOTLESS_BRAIDS_LONG:
          case HairStyle.FULANI_BRAIDS:
          case HairStyle.TRIBAL_BRAIDS:
          case HairStyle.FAUX_LOCS:
          case HairStyle.CROCHET_LOCS:
          case HairStyle.MARLEY_TWISTS:
          case HairStyle.SENEGALESE_TWISTS:
          case HairStyle.HAVANA_TWISTS:
          case HairStyle.SPRING_TWISTS:
          case HairStyle.BUTTERFLY_LOCS:
            return (
              <G>
                <Rect x="18" y="35" width="64" height="60" fill={`url(#${mainBehindGradientId})`} />
                {/* Braided/loc strand texture */}
                <Path d="M22,40 L22,90" fill="none" stroke={shadow} strokeWidth={3} opacity={0.25} />
                <Path d="M30,38 L30,92" fill="none" stroke={shadow} strokeWidth={3} opacity={0.2} />
                <Path d="M38,38 L38,92" fill="none" stroke={shadow} strokeWidth={3} opacity={0.2} />
                <Path d="M50,38 L50,92" fill="none" stroke={shadow} strokeWidth={3} opacity={0.15} />
                <Path d="M62,38 L62,92" fill="none" stroke={shadow} strokeWidth={3} opacity={0.2} />
                <Path d="M70,38 L70,92" fill="none" stroke={shadow} strokeWidth={3} opacity={0.2} />
                <Path d="M78,40 L78,90" fill="none" stroke={shadow} strokeWidth={3} opacity={0.25} />
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
                <Rect x="20" y="35" width="60" height="40" fill={`url(#${mainBehindGradientId})`} />
                {/* Shorter texture */}
                <Path d="M28,40 L28,72" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
                <Path d="M40,38 L40,74" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M60,38 L60,74" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M72,40 L72,72" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
              </G>
            );

          // Half-up styles - partial behind layer
          case HairStyle.LONG_HALF_UP:
          case HairStyle.LONG_HALF_UP_BUN:
          case HairStyle.MEDIUM_HALF_UP:
            return (
              <G>
                <Rect x="22" y="45" width="56" height="50" fill={`url(#${mainBehindGradientId})`} />
                {/* Half-up texture */}
                <Path d="M28,50 L28,90" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
                <Path d="M50,48 L50,92" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.15} />
                <Path d="M72,50 L72,90" fill="none" stroke={shadow} strokeWidth={1.5} opacity={0.2} />
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
                {/* Minimal behind layer for pulled-back styles */}
                <Rect x="25" y="50" width="50" height="30" fill={`url(#${mainBehindGradientId})`} />
                <Path d="M30,55 L30,78" fill="none" stroke={shadow} strokeWidth={1} opacity={0.15} />
                <Path d="M70,55 L70,78" fill="none" stroke={shadow} strokeWidth={1} opacity={0.15} />
              </G>
            );

          case HairStyle.HIJAB:
            return (
              <G>
                <Defs>
                  <LinearGradient id={`hijabBehind_${behindGradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#6b46c1" />
                    <Stop offset="100%" stopColor="#44337a" />
                  </LinearGradient>
                </Defs>
                <Rect x="15" y="40" width="70" height="55" fill={`url(#hijabBehind_${behindGradientId})`} />
                {/* Fabric fold shadows */}
                <Path d="M20,45 L22,92" fill="none" stroke="#44337a" strokeWidth={2} opacity={0.3} />
                <Path d="M80,45 L78,92" fill="none" stroke="#44337a" strokeWidth={2} opacity={0.3} />
              </G>
            );

          default:
            // For any unhandled long style, render a basic behind layer
            return (
              <G>
                <Rect x="20" y="38" width="60" height="55" fill={`url(#${mainBehindGradientId})`} />
              </G>
            );
        }
      })()}
    </G>
  );
}

export default Hair;
