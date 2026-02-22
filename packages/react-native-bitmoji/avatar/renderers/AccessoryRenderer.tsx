/**
 * AccessoryRenderer - Modular accessory rendering component
 *
 * Extracted from Avatar.tsx for better maintainability.
 * Renders various accessory styles as SVG elements.
 */

import React, { memo } from 'react';
import { G, Defs, Ellipse, Path, Circle, Rect, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { AccessoryStyle } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

// ============================================================================
// TYPES
// ============================================================================

export interface AccessoryRendererProps {
  type: AccessoryStyle;
  color?: string;
}

type GradientIds = {
  accessoryGrad: string;
  lens: string;
  frame: string;
  lensGrad: string;
  cup: string;
  cushion: string;
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AccessoryRenderer = memo(function AccessoryRenderer({
  type,
  color = '#1a1a2e',
}: AccessoryRendererProps) {
  if (type === AccessoryStyle.NONE) return null;

  const frameHighlight = adjustBrightness(color, 30);
  const frameShadow = adjustBrightness(color, -30);

  // Use stable gradient IDs instead of Math.random()
  const ids = useGradientIds<GradientIds>(['accessoryGrad', 'lens', 'frame', 'lensGrad', 'cup', 'cushion']);

  switch (type) {
    case AccessoryStyle.GLASSES_ROUND:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={frameHighlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={frameShadow} />
            </LinearGradient>
          </Defs>
          {/* Lens tint */}
          <Circle cx="38" cy="44" r="8.5" fill={color} opacity={0.05} />
          <Circle cx="62" cy="44" r="8.5" fill={color} opacity={0.05} />
          {/* Frames */}
          <Circle cx="38" cy="44" r="9" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={1.8} />
          <Circle cx="62" cy="44" r="9" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={1.8} />
          {/* Bridge */}
          <Path d="M47,44 Q50,42 53,44" stroke={color} strokeWidth={1.5} fill="none" />
          {/* Temples */}
          <Path d="M29,43 L22,41" stroke={color} strokeWidth={1.5} />
          <Path d="M71,43 L78,41" stroke={color} strokeWidth={1.5} />
          {/* Frame reflection */}
          <Path d="M32,40 Q35,39 38,40" fill="none" stroke={frameHighlight} strokeWidth={0.5} opacity={0.4} />
          <Path d="M56,40 Q59,39 62,40" fill="none" stroke={frameHighlight} strokeWidth={0.5} opacity={0.4} />
        </G>
      );

    case AccessoryStyle.GLASSES_SQUARE:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={frameHighlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={frameShadow} />
            </LinearGradient>
          </Defs>
          {/* Lens tint - centered at (38,44) and (62,44) */}
          <Rect x="30" y="39" width="16" height="10" rx="1" fill={color} opacity={0.05} />
          <Rect x="54" y="39" width="16" height="10" rx="1" fill={color} opacity={0.05} />
          {/* Frames - centered at (38,44) and (62,44) */}
          <Rect x="29" y="38" width="18" height="12" rx="2" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={1.8} />
          <Rect x="53" y="38" width="18" height="12" rx="2" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={1.8} />
          {/* Bridge */}
          <Path d="M47,44 L53,44" stroke={color} strokeWidth={1.5} />
          {/* Temples */}
          <Path d="M29,42 L22,40" stroke={color} strokeWidth={1.5} />
          <Path d="M71,42 L78,40" stroke={color} strokeWidth={1.5} />
          {/* Corner highlights */}
          <Path d="M30,39 L33,39" fill="none" stroke={frameHighlight} strokeWidth={0.5} opacity={0.5} />
          <Path d="M54,39 L57,39" fill="none" stroke={frameHighlight} strokeWidth={0.5} opacity={0.5} />
        </G>
      );

    case AccessoryStyle.GLASSES_PRESCRIPTION:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={frameHighlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={frameShadow} />
            </LinearGradient>
            <RadialGradient id={ids.lens} cx="30%" cy="30%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {/* Lens with refraction effect */}
          <Circle cx="38" cy="44" r="9.5" fill={`url(#${ids.lens})`} />
          <Circle cx="62" cy="44" r="9.5" fill={`url(#${ids.lens})`} />
          {/* Thick frames */}
          <Circle cx="38" cy="44" r="10" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={2.5} />
          <Circle cx="62" cy="44" r="10" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={2.5} />
          {/* Bridge */}
          <Path d="M48,44 L52,44" stroke={color} strokeWidth={2.5} />
          {/* Temples */}
          <Path d="M28,44 L22,42" stroke={color} strokeWidth={2} />
          <Path d="M72,44 L78,42" stroke={color} strokeWidth={2} />
          {/* Frame highlights */}
          <Circle cx="38" cy="44" r="10" fill="none" stroke={frameHighlight} strokeWidth={0.5} opacity={0.3} />
          <Circle cx="62" cy="44" r="10" fill="none" stroke={frameHighlight} strokeWidth={0.5} opacity={0.3} />
        </G>
      );

    case AccessoryStyle.SUNGLASSES:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#3d3d3d" />
              <Stop offset="50%" stopColor="#1a1a2e" />
              <Stop offset="100%" stopColor="#0a0a15" />
            </LinearGradient>
            <LinearGradient id={ids.lensGrad} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#2a2a3e" />
              <Stop offset="50%" stopColor="#1a1a2e" />
              <Stop offset="100%" stopColor="#0f0f1a" />
            </LinearGradient>
          </Defs>
          {/* Lenses with gradient */}
          <Rect x="28" y="38" width="19" height="14" rx="3" fill={`url(#${ids.lensGrad})`} />
          <Rect x="53" y="38" width="19" height="14" rx="3" fill={`url(#${ids.lensGrad})`} />
          {/* Frame edges */}
          <Rect x="28" y="38" width="19" height="14" rx="3" fill="none" stroke="#0a0a15" strokeWidth={0.5} />
          <Rect x="53" y="38" width="19" height="14" rx="3" fill="none" stroke="#0a0a15" strokeWidth={0.5} />
          {/* Bridge */}
          <Path d="M47,44 L53,44" stroke="#1a1a2e" strokeWidth={3} />
          {/* Temples */}
          <Path d="M28,42 L22,40" stroke="#1a1a2e" strokeWidth={2.5} />
          <Path d="M72,42 L78,40" stroke="#1a1a2e" strokeWidth={2.5} />
          {/* Reflections */}
          <Path d="M31,40 L37,40 L31,46" fill="white" opacity={0.15} />
          <Path d="M56,40 L62,40 L56,46" fill="white" opacity={0.15} />
          {/* Secondary reflection */}
          <Path d="M42,48 L45,50" fill="none" stroke="white" strokeWidth={1} opacity={0.1} />
          <Path d="M67,48 L70,50" fill="none" stroke="white" strokeWidth={1} opacity={0.1} />
        </G>
      );

    case AccessoryStyle.SUNGLASSES_AVIATOR:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2a2a3e" />
              <Stop offset="40%" stopColor="#1a1a2e" />
              <Stop offset="100%" stopColor="#0f0f1a" />
            </LinearGradient>
            <LinearGradient id={ids.frame} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#e0e0e0" />
              <Stop offset="50%" stopColor="#c0c0c0" />
              <Stop offset="100%" stopColor="#909090" />
            </LinearGradient>
          </Defs>
          {/* Lenses */}
          <Path d="M28,40 Q28,52 38,52 Q48,52 48,44 L48,40 Q48,36 38,36 Q28,36 28,40 Z" fill={`url(#${ids.accessoryGrad})`} />
          <Path d="M52,40 Q52,52 62,52 Q72,52 72,44 L72,40 Q72,36 62,36 Q52,36 52,40 Z" fill={`url(#${ids.accessoryGrad})`} />
          {/* Metal frame edge */}
          <Path d="M28,40 Q28,52 38,52 Q48,52 48,44 L48,40 Q48,36 38,36 Q28,36 28,40 Z" fill="none" stroke={`url(#${ids.frame})`} strokeWidth={1} />
          <Path d="M52,40 Q52,52 62,52 Q72,52 72,44 L72,40 Q72,36 62,36 Q52,36 52,40 Z" fill="none" stroke={`url(#${ids.frame})`} strokeWidth={1} />
          {/* Metal bridge */}
          <Path d="M48,42 L52,42" stroke={`url(#${ids.frame})`} strokeWidth={2} />
          {/* Nose pads */}
          <Ellipse cx="48" cy="44" rx="1" ry="2" fill="#c0c0c0" />
          <Ellipse cx="52" cy="44" rx="1" ry="2" fill="#c0c0c0" />
          {/* Temples */}
          <Path d="M28,40 L22,38" stroke={`url(#${ids.frame})`} strokeWidth={2} />
          <Path d="M72,40 L78,38" stroke={`url(#${ids.frame})`} strokeWidth={2} />
          {/* Reflections */}
          <Path d="M32,38 L40,40 L32,44" fill="white" opacity={0.12} />
          <Path d="M56,38 L64,40 L56,44" fill="white" opacity={0.12} />
        </G>
      );

    case AccessoryStyle.MONOCLE:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#d4af37" />
              <Stop offset="50%" stopColor="#b8960c" />
              <Stop offset="100%" stopColor="#8b7200" />
            </LinearGradient>
            <RadialGradient id={ids.lens} cx="30%" cy="30%" rx="60%" ry="60%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {/* Lens */}
          <Circle cx="62" cy="44" r="9.5" fill={`url(#${ids.lens})`} />
          {/* Gold frame */}
          <Circle cx="62" cy="44" r="10" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={2.5} />
          {/* Decorative rim */}
          <Circle cx="62" cy="44" r="11.5" fill="none" stroke="#b8960c" strokeWidth={0.5} opacity={0.5} />
          {/* Chain */}
          <Path d="M72,44 L76,48 L78,52 L78,70" fill="none" stroke="#b8960c" strokeWidth={1} />
          {/* Chain links hint */}
          <Circle cx="77" cy="55" r="1" fill="none" stroke="#b8960c" strokeWidth={0.5} />
          <Circle cx="78" cy="62" r="1" fill="none" stroke="#b8960c" strokeWidth={0.5} />
          {/* Frame highlight */}
          <Path d="M56,40 Q62,38 68,40" fill="none" stroke="#d4af37" strokeWidth={0.5} opacity={0.6} />
        </G>
      );

    case AccessoryStyle.EYEPATCH:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2d2d2d" />
              <Stop offset="50%" stopColor="#1a1a2e" />
              <Stop offset="100%" stopColor="#0a0a15" />
            </LinearGradient>
          </Defs>
          {/* Patch */}
          <Ellipse cx="38" cy="44" rx="12" ry="10" fill={`url(#${ids.accessoryGrad})`} />
          {/* Patch edge stitching */}
          <Ellipse cx="38" cy="44" rx="11" ry="9" fill="none" stroke="#3d3d3d" strokeWidth={0.5} strokeDasharray="2,2" />
          {/* Straps */}
          <Path d="M26,40 L22,35" stroke="#1a1a2e" strokeWidth={2.5} />
          <Path d="M50,40 L78,35" stroke="#1a1a2e" strokeWidth={2.5} />
          {/* Strap highlight */}
          <Path d="M27,40 L23,36" stroke="#3d3d3d" strokeWidth={0.5} opacity={0.5} />
          <Path d="M51,40 L77,35.5" stroke="#3d3d3d" strokeWidth={0.5} opacity={0.5} />
          {/* Subtle texture */}
          <Path d="M35,44 L41,44 M38,41 L38,47" fill="none" stroke="#2d2d2d" strokeWidth={0.5} opacity={0.3} />
        </G>
      );

    case AccessoryStyle.EARRING_SMALL:
      return (
        <G>
          <Defs>
            <RadialGradient id={ids.accessoryGrad} cx="30%" cy="30%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#fff5cc" />
              <Stop offset="50%" stopColor="#ffd700" />
              <Stop offset="100%" stopColor="#b8960c" />
            </RadialGradient>
          </Defs>
          {/* Left stud earring */}
          <Circle cx="20" cy="52" r="2.5" fill={`url(#${ids.accessoryGrad})`} />
          <Circle cx="19" cy="51" r="0.8" fill="#ffffff" opacity={0.6} />
          {/* Right stud earring (mirrored) */}
          <Circle cx="80" cy="52" r="2.5" fill={`url(#${ids.accessoryGrad})`} />
          <Circle cx="81" cy="51" r="0.8" fill="#ffffff" opacity={0.6} />
        </G>
      );

    case AccessoryStyle.EARRING_HOOP:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#fff5cc" />
              <Stop offset="30%" stopColor="#ffd700" />
              <Stop offset="70%" stopColor="#b8960c" />
              <Stop offset="100%" stopColor="#8b7200" />
            </LinearGradient>
          </Defs>
          {/* Left hoop */}
          <Circle cx="20" cy="55" r="5" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={1.8} />
          <Path d="M17,52 Q20,50 23,52" fill="none" stroke="#fff5cc" strokeWidth={0.5} opacity={0.5} />
          <Circle cx="20" cy="55" r="4" fill="none" stroke="#b8960c" strokeWidth={0.3} opacity={0.5} />
          {/* Right hoop (mirrored) */}
          <Circle cx="80" cy="55" r="5" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={1.8} />
          <Path d="M77,52 Q80,50 83,52" fill="none" stroke="#fff5cc" strokeWidth={0.5} opacity={0.5} />
          <Circle cx="80" cy="55" r="4" fill="none" stroke="#b8960c" strokeWidth={0.3} opacity={0.5} />
        </G>
      );

    case AccessoryStyle.NOSE_RING:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#e8e8e8" />
              <Stop offset="50%" stopColor="#c0c0c0" />
              <Stop offset="100%" stopColor="#909090" />
            </LinearGradient>
          </Defs>
          {/* Septum ring */}
          <Circle cx="50" cy="57" r="2.5" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={1.2} />
          {/* Highlight */}
          <Path d="M48,55.5 Q50,54.5 52,55.5" fill="none" stroke="#e8e8e8" strokeWidth={0.4} opacity={0.6} />
        </G>
      );

    case AccessoryStyle.HEADPHONES:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#404040" />
              <Stop offset="50%" stopColor="#2d2d2d" />
              <Stop offset="100%" stopColor="#1a1a1a" />
            </LinearGradient>
            <RadialGradient id={ids.cup} cx="40%" cy="40%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#505050" />
              <Stop offset="100%" stopColor="#2d2d2d" />
            </RadialGradient>
            <RadialGradient id={ids.cushion} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#4a4a4a" />
              <Stop offset="70%" stopColor="#3d3d3d" />
              <Stop offset="100%" stopColor="#2d2d2d" />
            </RadialGradient>
          </Defs>
          {/* Headband */}
          <Path d="M20,40 Q20,8 50,6 Q80,8 80,40" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={5} />
          {/* Headband padding */}
          <Path d="M35,12 Q50,8 65,12" fill="none" stroke="#3d3d3d" strokeWidth={6} />
          <Path d="M37,11 Q50,8 63,11" fill="none" stroke="#4a4a4a" strokeWidth={2} opacity={0.5} />
          {/* Left cup */}
          <Ellipse cx="18" cy="44" rx="9" ry="11" fill={`url(#${ids.cup})`} />
          <Ellipse cx="18" cy="44" rx="6" ry="8" fill={`url(#${ids.cushion})`} />
          {/* Left cup detail */}
          <Ellipse cx="18" cy="44" rx="4" ry="5" fill="#2d2d2d" />
          <Circle cx="18" cy="44" r="2" fill="#252525" />
          {/* Right cup */}
          <Ellipse cx="82" cy="44" rx="9" ry="11" fill={`url(#${ids.cup})`} />
          <Ellipse cx="82" cy="44" rx="6" ry="8" fill={`url(#${ids.cushion})`} />
          {/* Right cup detail */}
          <Ellipse cx="82" cy="44" rx="4" ry="5" fill="#2d2d2d" />
          <Circle cx="82" cy="44" r="2" fill="#252525" />
          {/* Cup highlights */}
          <Path d="M12,38 Q18,34 24,38" fill="none" stroke="#505050" strokeWidth={0.8} opacity={0.4} />
          <Path d="M76,38 Q82,34 88,38" fill="none" stroke="#505050" strokeWidth={0.8} opacity={0.4} />
        </G>
      );

    // ============================================================================
    // HIGH-PRIORITY ACCESSORIES (Phase 2.2)
    // ============================================================================

    case AccessoryStyle.GLASSES_CAT_EYE:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={frameHighlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={frameShadow} />
            </LinearGradient>
          </Defs>
          {/* Cat-eye frames - upswept corners */}
          <Path
            d="M28,42 Q28,48 34,48 L42,48 Q48,48 48,42 L48,40 Q48,35 44,34 L32,34 Q28,35 28,40 Z"
            fill="none"
            stroke={`url(#${ids.accessoryGrad})`}
            strokeWidth={1.8}
          />
          <Path
            d="M52,42 Q52,48 58,48 L66,48 Q72,48 72,42 L72,40 Q72,35 68,34 L56,34 Q52,35 52,40 Z"
            fill="none"
            stroke={`url(#${ids.accessoryGrad})`}
            strokeWidth={1.8}
          />
          {/* Lens tint */}
          <Path d="M29,42 Q29,47 34,47 L42,47 Q47,47 47,42 L47,40 Q47,36 44,35 L32,35 Q29,36 29,40 Z" fill={color} opacity={0.05} />
          <Path d="M53,42 Q53,47 58,47 L66,47 Q71,47 71,42 L71,40 Q71,36 68,35 L56,35 Q53,36 53,40 Z" fill={color} opacity={0.05} />
          {/* Bridge */}
          <Path d="M48,42 Q50,40 52,42" stroke={color} strokeWidth={1.5} fill="none" />
          {/* Temples */}
          <Path d="M28,38 L22,36" stroke={color} strokeWidth={1.5} />
          <Path d="M72,38 L78,36" stroke={color} strokeWidth={1.5} />
          {/* Frame reflection */}
          <Path d="M30,36 Q36,34 42,36" fill="none" stroke={frameHighlight} strokeWidth={0.5} opacity={0.4} />
          <Path d="M54,36 Q60,34 66,36" fill="none" stroke={frameHighlight} strokeWidth={0.5} opacity={0.4} />
        </G>
      );

    case AccessoryStyle.SUNGLASSES_WAYFARER:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#3d3d3d" />
              <Stop offset="50%" stopColor="#1a1a2e" />
              <Stop offset="100%" stopColor="#0a0a15" />
            </LinearGradient>
            <LinearGradient id={ids.lensGrad} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#2a2a3e" />
              <Stop offset="50%" stopColor="#1a1a2e" />
              <Stop offset="100%" stopColor="#0f0f1a" />
            </LinearGradient>
          </Defs>
          {/* Wayfarer shape - slightly trapezoidal */}
          <Path
            d="M26,38 L46,38 L44,52 L28,52 Z"
            fill={`url(#${ids.lensGrad})`}
            stroke="#1a1a2e"
            strokeWidth={2}
          />
          <Path
            d="M54,38 L74,38 L72,52 L56,52 Z"
            fill={`url(#${ids.lensGrad})`}
            stroke="#1a1a2e"
            strokeWidth={2}
          />
          {/* Bridge */}
          <Path d="M46,42 L54,42" stroke="#1a1a2e" strokeWidth={2.5} />
          {/* Temples */}
          <Path d="M26,40 L22,38" stroke="#1a1a2e" strokeWidth={2.5} />
          <Path d="M74,40 L78,38" stroke="#1a1a2e" strokeWidth={2.5} />
          {/* Reflections */}
          <Path d="M29,40 L35,40 L29,46" fill="white" opacity={0.12} />
          <Path d="M57,40 L63,40 L57,46" fill="white" opacity={0.12} />
        </G>
      );

    case AccessoryStyle.HAT_BASEBALL:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={frameHighlight} />
              <Stop offset="60%" stopColor={color} />
              <Stop offset="100%" stopColor={frameShadow} />
            </LinearGradient>
          </Defs>
          {/* Cap crown */}
          <Path
            d="M18,30 Q18,8 50,6 Q82,8 82,30 L82,35 Q82,38 75,38 L25,38 Q18,38 18,35 Z"
            fill={`url(#${ids.accessoryGrad})`}
          />
          {/* Cap front panel detail */}
          <Path d="M35,12 Q50,8 65,12 L65,38 L35,38 Z" fill={frameHighlight} opacity={0.1} />
          {/* Brim */}
          <Ellipse cx="50" cy="38" rx="35" ry="5" fill={color} />
          <Ellipse cx="50" cy="38" rx="35" ry="4" fill={frameShadow} opacity={0.3} />
          {/* Brim front shading */}
          <Path d="M20,38 Q50,34 80,38 Q50,42 20,38" fill={frameShadow} opacity={0.2} />
          {/* Button on top */}
          <Circle cx="50" cy="8" r="2" fill={color} />
          <Circle cx="50" cy="8" r="1.5" fill={frameHighlight} opacity={0.3} />
          {/* Seam lines */}
          <Path d="M35,12 L35,38 M65,12 L65,38" stroke={frameShadow} strokeWidth={0.5} opacity={0.3} />
          <Path d="M50,6 L50,38" stroke={frameShadow} strokeWidth={0.5} opacity={0.2} />
        </G>
      );

    case AccessoryStyle.NECKLACE_CHAIN:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#c0c0c0" />
              <Stop offset="30%" stopColor="#e8e8e8" />
              <Stop offset="50%" stopColor="#d0d0d0" />
              <Stop offset="70%" stopColor="#e8e8e8" />
              <Stop offset="100%" stopColor="#c0c0c0" />
            </LinearGradient>
          </Defs>
          {/* Chain necklace */}
          <Path
            d="M25,78 Q30,85 50,88 Q70,85 75,78"
            fill="none"
            stroke={`url(#${ids.accessoryGrad})`}
            strokeWidth={1.5}
          />
          {/* Chain links hint */}
          <Path d="M30,80 L32,82 M38,84 L40,86 M48,87 L52,87 M60,86 L62,84 M68,82 L70,80"
            fill="none" stroke="#e8e8e8" strokeWidth={0.5} opacity={0.5} />
        </G>
      );

    case AccessoryStyle.NECKLACE_CHOKER:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2d2d2d" />
              <Stop offset="50%" stopColor="#1a1a1a" />
              <Stop offset="100%" stopColor="#0d0d0d" />
            </LinearGradient>
          </Defs>
          {/* Choker band */}
          <Path
            d="M22,75 Q50,72 78,75"
            fill="none"
            stroke={`url(#${ids.accessoryGrad})`}
            strokeWidth={4}
          />
          {/* Center decoration */}
          <Circle cx="50" cy="73" r="3" fill="#c0c0c0" />
          <Circle cx="50" cy="73" r="2" fill="#909090" />
          <Circle cx="49" cy="72" r="0.8" fill="#e8e8e8" opacity={0.6} />
        </G>
      );

    case AccessoryStyle.HEADBAND:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={frameHighlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={frameShadow} />
            </LinearGradient>
          </Defs>
          {/* Headband */}
          <Path
            d="M22,28 Q22,18 50,15 Q78,18 78,28"
            fill="none"
            stroke={`url(#${ids.accessoryGrad})`}
            strokeWidth={5}
          />
          {/* Edge detail */}
          <Path d="M24,27 Q50,14 76,27" fill="none" stroke={frameHighlight} strokeWidth={0.5} opacity={0.4} />
        </G>
      );

    case AccessoryStyle.AIRPODS:
      return (
        <G>
          <Defs>
            <RadialGradient id={ids.accessoryGrad} cx="50%" cy="30%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#ffffff" />
              <Stop offset="70%" stopColor="#f0f0f0" />
              <Stop offset="100%" stopColor="#e0e0e0" />
            </RadialGradient>
          </Defs>
          {/* Left AirPod */}
          <Ellipse cx="20" cy="50" rx="3" ry="4" fill={`url(#${ids.accessoryGrad})`} />
          <Path d="M18,54 L17,62" stroke="#e0e0e0" strokeWidth={2.5} strokeLinecap="round" />
          {/* Left AirPod detail */}
          <Ellipse cx="20" cy="49" rx="1.5" ry="2" fill="#c0c0c0" opacity={0.3} />
          {/* Right AirPod */}
          <Ellipse cx="80" cy="50" rx="3" ry="4" fill={`url(#${ids.accessoryGrad})`} />
          <Path d="M82,54 L83,62" stroke="#e0e0e0" strokeWidth={2.5} strokeLinecap="round" />
          {/* Right AirPod detail */}
          <Ellipse cx="80" cy="49" rx="1.5" ry="2" fill="#c0c0c0" opacity={0.3} />
        </G>
      );

    case AccessoryStyle.FACE_MASK:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#f5f5f5" />
              <Stop offset="50%" stopColor="#e8e8e8" />
              <Stop offset="100%" stopColor="#d0d0d0" />
            </LinearGradient>
          </Defs>
          {/* Mask body */}
          <Path
            d="M25,52 Q25,70 50,72 Q75,70 75,52 L75,48 Q75,46 70,46 L30,46 Q25,46 25,48 Z"
            fill={`url(#${ids.accessoryGrad})`}
          />
          {/* Ear straps */}
          <Path d="M25,50 Q18,50 18,55 Q18,60 22,62" stroke="#b0b0b0" strokeWidth={1} fill="none" />
          <Path d="M75,50 Q82,50 82,55 Q82,60 78,62" stroke="#b0b0b0" strokeWidth={1} fill="none" />
          {/* Mask folds */}
          <Path d="M28,54 Q50,56 72,54" stroke="#c8c8c8" strokeWidth={0.5} fill="none" opacity={0.6} />
          <Path d="M28,60 Q50,62 72,60" stroke="#c8c8c8" strokeWidth={0.5} fill="none" opacity={0.6} />
          <Path d="M28,66 Q50,68 72,66" stroke="#c8c8c8" strokeWidth={0.5} fill="none" opacity={0.6} />
          {/* Nose wire */}
          <Path d="M40,48 Q50,45 60,48" stroke="#a0a0a0" strokeWidth={1} fill="none" />
        </G>
      );

    case AccessoryStyle.BEANIE_CUFFED:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={frameHighlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={frameShadow} />
            </LinearGradient>
          </Defs>
          {/* Beanie crown */}
          <Path
            d="M18,35 Q15,5 50,2 Q85,5 82,35 L82,38 L18,38 Z"
            fill={`url(#${ids.accessoryGrad})`}
          />
          {/* Knit texture lines */}
          <Path d="M25,10 L25,35" stroke={frameShadow} strokeWidth={0.5} opacity={0.3} />
          <Path d="M38,6 L38,35" stroke={frameShadow} strokeWidth={0.5} opacity={0.3} />
          <Path d="M50,4 L50,35" stroke={frameShadow} strokeWidth={0.5} opacity={0.2} />
          <Path d="M62,6 L62,35" stroke={frameShadow} strokeWidth={0.5} opacity={0.3} />
          <Path d="M75,10 L75,35" stroke={frameShadow} strokeWidth={0.5} opacity={0.3} />
          {/* Cuff */}
          <Rect x="16" y="35" width="68" height="8" rx="2" fill={color} />
          <Path d="M18,36 L82,36" stroke={frameHighlight} strokeWidth={0.5} opacity={0.4} />
          {/* Cuff ribbing */}
          <Path d="M20,38 L20,42 M30,38 L30,42 M40,38 L40,42 M50,38 L50,42 M60,38 L60,42 M70,38 L70,42 M80,38 L80,42"
            stroke={frameShadow} strokeWidth={0.5} opacity={0.3} />
        </G>
      );

    default:
      return null;
  }
});

export default AccessoryRenderer;
