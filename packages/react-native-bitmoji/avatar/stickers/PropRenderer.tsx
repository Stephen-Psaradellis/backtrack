/**
 * PropRenderer - Renders sticker props and effects
 *
 * Supports various props from the StickerProp enum:
 * - Food & Drink (coffee, pizza, burger, etc.)
 * - Objects (phone, laptop, book, etc.)
 * - Nature (sun, cloud, rainbow, etc.)
 * - Sports (basketball, football, etc.)
 * - Effects (sparkles, fire, tears, etc.)
 */

import React from 'react';
import { G, Path, Circle, Rect, Ellipse, Defs, RadialGradient, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { StickerProp } from './types';

interface PropRendererProps {
  prop: StickerProp;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
}

// Generate unique IDs for gradients
const generateId = () => `prop_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Coffee cup prop
 */
function CoffeeProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  const gradId = generateId();
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="100%" stopColor="#e0e0e0" />
        </LinearGradient>
      </Defs>
      {/* Cup body */}
      <Path d="M 5 10 L 7 35 Q 10 40 20 40 Q 30 40 33 35 L 35 10 Z" fill={`url(#${gradId})`} />
      {/* Handle */}
      <Path d="M 35 15 Q 45 15 45 25 Q 45 35 35 30" stroke="#d0d0d0" strokeWidth={3} fill="none" />
      {/* Coffee */}
      <Ellipse cx="20" cy="12" rx="13" ry="3" fill="#4a2c2a" />
      {/* Steam */}
      <Path d="M 15 5 Q 13 0 15 -5" stroke="#a0a0a0" strokeWidth={1.5} fill="none" opacity={0.6} />
      <Path d="M 20 3 Q 22 -2 20 -7" stroke="#a0a0a0" strokeWidth={1.5} fill="none" opacity={0.6} />
      <Path d="M 25 5 Q 27 0 25 -5" stroke="#a0a0a0" strokeWidth={1.5} fill="none" opacity={0.6} />
    </G>
  );
}

/**
 * Pizza slice prop
 */
function PizzaProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Crust */}
      <Path d="M 0 0 L 40 30 Q 42 32 40 35 L 0 5 Z" fill="#d4a574" />
      {/* Cheese */}
      <Path d="M 2 2 L 38 30 L 38 33 L 2 5 Z" fill="#ffd700" />
      {/* Pepperoni */}
      <Circle cx="12" cy="10" r="4" fill="#c62828" />
      <Circle cx="22" cy="18" r="4" fill="#c62828" />
      <Circle cx="30" cy="26" r="3" fill="#c62828" />
      {/* Cheese drip */}
      <Path d="M 40 32 Q 42 38 39 40" fill="#ffd700" />
    </G>
  );
}

/**
 * Burger prop
 */
function BurgerProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Top bun */}
      <Path d="M 5 15 Q 5 0 25 0 Q 45 0 45 15 Z" fill="#d4a574" />
      {/* Sesame seeds */}
      <Ellipse cx="15" cy="8" rx="2" ry="1" fill="#f5f5dc" />
      <Ellipse cx="25" cy="5" rx="2" ry="1" fill="#f5f5dc" />
      <Ellipse cx="35" cy="8" rx="2" ry="1" fill="#f5f5dc" />
      {/* Lettuce */}
      <Path d="M 3 18 Q 10 15 17 18 Q 24 15 31 18 Q 38 15 47 18" fill="#4caf50" />
      {/* Patty */}
      <Rect x="5" y="20" width="40" height="10" rx="2" fill="#5d4037" />
      {/* Cheese */}
      <Path d="M 3 22 L 7 30 L 25 22 L 43 30 L 47 22" fill="#ffd700" />
      {/* Bottom bun */}
      <Path d="M 5 32 L 5 38 Q 5 42 25 42 Q 45 42 45 38 L 45 32 Z" fill="#d4a574" />
    </G>
  );
}

/**
 * Phone prop
 */
function PhoneProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Phone body */}
      <Rect x="0" y="0" width="25" height="45" rx="3" fill="#1a1a2e" />
      {/* Screen */}
      <Rect x="2" y="5" width="21" height="35" rx="1" fill="#4a90d9" />
      {/* Camera notch */}
      <Circle cx="12.5" cy="2.5" r="1.5" fill="#333" />
      {/* Home button area */}
      <Rect x="8" y="42" width="9" height="2" rx="1" fill="#333" />
    </G>
  );
}

/**
 * Heart prop
 */
function HeartProp({ x = 0, y = 0, scale = 1, color = '#e74c3c' }: { x?: number; y?: number; scale?: number; color?: string }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Path
        d="M 20 8 C 15 0 0 0 0 15 C 0 25 20 40 20 40 C 20 40 40 25 40 15 C 40 0 25 0 20 8"
        fill={color}
      />
      {/* Highlight */}
      <Ellipse cx="10" cy="12" rx="4" ry="5" fill="#ffffff" opacity={0.3} />
    </G>
  );
}

/**
 * Sparkles effect
 */
function SparklesProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Multiple sparkles */}
      {[
        { cx: 10, cy: 10, size: 8 },
        { cx: 35, cy: 5, size: 6 },
        { cx: 5, cy: 30, size: 5 },
        { cx: 40, cy: 35, size: 7 },
        { cx: 25, cy: 20, size: 10 },
      ].map((sparkle, i) => (
        <G key={`sparkle_${i}`}>
          <Path
            d={`M ${sparkle.cx} ${sparkle.cy - sparkle.size} L ${sparkle.cx} ${sparkle.cy + sparkle.size}
                M ${sparkle.cx - sparkle.size} ${sparkle.cy} L ${sparkle.cx + sparkle.size} ${sparkle.cy}
                M ${sparkle.cx - sparkle.size * 0.7} ${sparkle.cy - sparkle.size * 0.7} L ${sparkle.cx + sparkle.size * 0.7} ${sparkle.cy + sparkle.size * 0.7}
                M ${sparkle.cx + sparkle.size * 0.7} ${sparkle.cy - sparkle.size * 0.7} L ${sparkle.cx - sparkle.size * 0.7} ${sparkle.cy + sparkle.size * 0.7}`}
            stroke="#ffd700"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </G>
      ))}
    </G>
  );
}

/**
 * Fire effect
 */
function FireProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  const gradId = generateId();
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Defs>
        <RadialGradient id={gradId} cx="50%" cy="80%" r="80%">
          <Stop offset="0%" stopColor="#ffeb3b" />
          <Stop offset="50%" stopColor="#ff9800" />
          <Stop offset="100%" stopColor="#f44336" />
        </RadialGradient>
      </Defs>
      {/* Main flame */}
      <Path d="M 20 0 Q 30 15 25 25 Q 35 20 30 35 Q 40 30 35 45 Q 20 50 5 45 Q 0 30 10 35 Q 5 20 15 25 Q 10 15 20 0"
            fill={`url(#${gradId})`} />
      {/* Inner flame */}
      <Path d="M 20 15 Q 25 25 22 35 Q 20 40 18 35 Q 15 25 20 15" fill="#ffeb3b" opacity={0.8} />
    </G>
  );
}

/**
 * Tears effect
 */
function TearsProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Left tear stream */}
      <Path d="M 5 0 Q 3 10 5 20 Q 3 30 5 40" stroke="#4fc3f7" strokeWidth={4} fill="none" opacity={0.7} />
      <Path d="M 5 0 Q 7 10 5 20 Q 7 30 5 40" stroke="#4fc3f7" strokeWidth={4} fill="none" opacity={0.7} />
      {/* Right tear stream */}
      <Path d="M 35 0 Q 33 10 35 20 Q 33 30 35 40" stroke="#4fc3f7" strokeWidth={4} fill="none" opacity={0.7} />
      <Path d="M 35 0 Q 37 10 35 20 Q 37 30 35 40" stroke="#4fc3f7" strokeWidth={4} fill="none" opacity={0.7} />
      {/* Tear drops */}
      <Path d="M 5 42 Q 5 45 3 48 Q 5 52 7 48 Q 5 45 5 42" fill="#4fc3f7" />
      <Path d="M 35 45 Q 35 48 33 51 Q 35 55 37 51 Q 35 48 35 45" fill="#4fc3f7" />
    </G>
  );
}

/**
 * Sweat drop effect
 */
function SweatDropProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Path d="M 10 0 Q 10 10 5 18 Q 10 25 15 18 Q 10 10 10 0" fill="#4fc3f7" />
      <Ellipse cx="8" cy="15" rx="2" ry="3" fill="#ffffff" opacity={0.5} />
    </G>
  );
}

/**
 * Anger vein effect
 */
function AngerVeinProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Cross-shaped anger symbol */}
      <Path d="M 10 5 L 10 0 L 15 5 L 20 0 L 20 5 L 25 5 L 20 10 L 25 10 L 20 15 L 20 20 L 15 15 L 10 20 L 10 15 L 5 15 L 10 10 L 5 10 L 10 5"
            fill="#e74c3c" />
    </G>
  );
}

/**
 * ZZZ sleep effect
 */
function ZzzProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <SvgText x="0" y="15" fontSize="16" fontWeight="bold" fill="#5c6bc0">Z</SvgText>
      <SvgText x="12" y="10" fontSize="12" fontWeight="bold" fill="#5c6bc0" opacity={0.8}>Z</SvgText>
      <SvgText x="20" y="5" fontSize="9" fontWeight="bold" fill="#5c6bc0" opacity={0.6}>Z</SvgText>
    </G>
  );
}

/**
 * Question mark effect
 */
function QuestionMarkProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Circle cx="15" cy="15" r="14" fill="#ffd700" />
      <SvgText x="9" y="22" fontSize="20" fontWeight="bold" fill="#1a1a2e">?</SvgText>
    </G>
  );
}

/**
 * Exclamation mark effect
 */
function ExclamationProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Circle cx="15" cy="15" r="14" fill="#e74c3c" />
      <SvgText x="10" y="22" fontSize="20" fontWeight="bold" fill="#ffffff">!</SvgText>
    </G>
  );
}

/**
 * Sun prop
 */
function SunProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <Path
          key={`ray_${i}`}
          d={`M 20 20 L ${20 + 18 * Math.cos((angle * Math.PI) / 180)} ${20 + 18 * Math.sin((angle * Math.PI) / 180)}`}
          stroke="#ffd700"
          strokeWidth={3}
          strokeLinecap="round"
        />
      ))}
      {/* Sun body */}
      <Circle cx="20" cy="20" r="12" fill="#ffd700" />
      {/* Face */}
      <Circle cx="15" cy="18" r="2" fill="#f57c00" />
      <Circle cx="25" cy="18" r="2" fill="#f57c00" />
      <Path d="M 15 25 Q 20 30 25 25" stroke="#f57c00" strokeWidth={2} fill="none" />
    </G>
  );
}

/**
 * Star prop
 */
function StarProp({ x = 0, y = 0, scale = 1, color = '#ffd700' }: { x?: number; y?: number; scale?: number; color?: string }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Path
        d="M 20 0 L 25 15 L 40 15 L 28 24 L 32 40 L 20 30 L 8 40 L 12 24 L 0 15 L 15 15 Z"
        fill={color}
      />
    </G>
  );
}

/**
 * Rainbow prop
 */
function RainbowProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {colors.map((color, i) => (
        <Path
          key={`rainbow_${i}`}
          d={`M 0 ${50 - i * 5} Q 40 ${-10 - i * 5} 80 ${50 - i * 5}`}
          stroke={color}
          strokeWidth={5}
          fill="none"
        />
      ))}
    </G>
  );
}

/**
 * Book prop
 */
function BookProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Book cover */}
      <Rect x="0" y="5" width="35" height="45" rx="2" fill="#3f51b5" />
      {/* Pages */}
      <Rect x="3" y="7" width="29" height="41" fill="#f5f5dc" />
      {/* Spine */}
      <Rect x="0" y="5" width="3" height="45" fill="#303f9f" />
      {/* Page lines */}
      <Path d="M 8 15 L 28 15 M 8 22 L 28 22 M 8 29 L 28 29 M 8 36 L 28 36" stroke="#ccc" strokeWidth={1} />
    </G>
  );
}

/**
 * Gift box prop
 */
function GiftProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Box */}
      <Rect x="5" y="15" width="40" height="35" fill="#e74c3c" />
      {/* Lid */}
      <Rect x="2" y="10" width="46" height="8" fill="#c0392b" />
      {/* Ribbon vertical */}
      <Rect x="22" y="10" width="6" height="40" fill="#ffd700" />
      {/* Ribbon horizontal */}
      <Rect x="2" y="12" width="46" height="6" fill="#ffd700" />
      {/* Bow */}
      <Ellipse cx="20" cy="8" rx="8" ry="5" fill="#ffd700" />
      <Ellipse cx="30" cy="8" rx="8" ry="5" fill="#ffd700" />
      <Circle cx="25" cy="10" r="4" fill="#f5b800" />
    </G>
  );
}

/**
 * Balloon prop
 */
function BalloonProp({ x = 0, y = 0, scale = 1, color = '#e74c3c' }: { x?: number; y?: number; scale?: number; color?: string }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Balloon body */}
      <Ellipse cx="20" cy="20" rx="18" ry="22" fill={color} />
      {/* Highlight */}
      <Ellipse cx="12" cy="14" rx="5" ry="7" fill="#ffffff" opacity={0.3} />
      {/* Knot */}
      <Path d="M 20 42 L 18 45 L 22 45 Z" fill={color} />
      {/* String */}
      <Path d="M 20 45 Q 15 55 20 65 Q 25 75 20 85" stroke="#888" strokeWidth={1} fill="none" />
    </G>
  );
}

/**
 * Lightning bolt prop
 */
function LightningProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Path d="M 25 0 L 10 22 L 18 22 L 8 45 L 35 18 L 25 18 L 35 0 Z" fill="#ffd700" />
      <Path d="M 25 0 L 10 22 L 18 22 L 8 45" stroke="#f57c00" strokeWidth={2} fill="none" />
    </G>
  );
}

/**
 * Ice cream prop
 */
function IceCreamProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Cone */}
      <Path d="M 10 25 L 20 55 L 30 25 Z" fill="#d4a574" />
      {/* Waffle pattern */}
      <Path d="M 12 28 L 28 28 M 14 33 L 26 33 M 16 38 L 24 38 M 18 43 L 22 43" stroke="#b8956a" strokeWidth={1} />
      {/* Ice cream scoops */}
      <Circle cx="20" cy="18" r="12" fill="#f8bbd9" />
      <Circle cx="13" cy="10" r="8" fill="#81d4fa" />
      <Circle cx="27" cy="10" r="8" fill="#c5e1a5" />
      {/* Cherry */}
      <Circle cx="20" cy="0" r="4" fill="#e74c3c" />
      <Path d="M 20 0 Q 22 -5 24 -8" stroke="#4caf50" strokeWidth={1.5} />
    </G>
  );
}

/**
 * Basketball prop
 */
function BasketballProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Circle cx="20" cy="20" r="18" fill="#e65100" />
      {/* Lines */}
      <Path d="M 20 2 L 20 38" stroke="#000" strokeWidth={1.5} />
      <Path d="M 2 20 L 38 20" stroke="#000" strokeWidth={1.5} />
      <Path d="M 5 8 Q 20 20 5 32" stroke="#000" strokeWidth={1.5} fill="none" />
      <Path d="M 35 8 Q 20 20 35 32" stroke="#000" strokeWidth={1.5} fill="none" />
    </G>
  );
}

/**
 * Laptop prop
 */
function LaptopProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Screen */}
      <Rect x="5" y="0" width="40" height="28" rx="2" fill="#424242" />
      <Rect x="8" y="3" width="34" height="22" fill="#4a90d9" />
      {/* Base */}
      <Path d="M 0 28 L 5 28 L 5 32 L 45 32 L 45 28 L 50 28 L 50 35 Q 50 38 47 38 L 3 38 Q 0 38 0 35 Z" fill="#616161" />
      {/* Keyboard hint */}
      <Rect x="10" y="30" width="30" height="5" rx="1" fill="#424242" />
    </G>
  );
}

/**
 * Cloud prop
 */
function CloudProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Ellipse cx="20" cy="25" rx="18" ry="12" fill="#ecf0f1" />
      <Ellipse cx="35" cy="22" rx="14" ry="10" fill="#ecf0f1" />
      <Ellipse cx="40" cy="28" rx="10" ry="7" fill="#ecf0f1" />
      <Ellipse cx="10" cy="28" rx="10" ry="8" fill="#ecf0f1" />
      <Ellipse cx="25" cy="18" rx="12" ry="9" fill="#ffffff" />
    </G>
  );
}

/**
 * Rain prop
 */
function RainProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Cloud */}
      <Ellipse cx="20" cy="12" rx="15" ry="10" fill="#95a5a6" />
      <Ellipse cx="32" cy="10" rx="10" ry="8" fill="#95a5a6" />
      <Ellipse cx="10" cy="14" rx="8" ry="6" fill="#95a5a6" />
      {/* Rain drops */}
      {[8, 16, 24, 32].map((dx, i) => (
        <Path
          key={`rain_${i}`}
          d={`M ${dx} 25 L ${dx - 4} 40`}
          stroke="#3498db"
          strokeWidth={2}
          strokeLinecap="round"
        />
      ))}
    </G>
  );
}

/**
 * Snow prop
 */
function SnowProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Cloud */}
      <Ellipse cx="20" cy="10" rx="15" ry="8" fill="#bdc3c7" />
      <Ellipse cx="32" cy="8" rx="10" ry="6" fill="#bdc3c7" />
      {/* Snowflakes */}
      {[
        { cx: 10, cy: 25 },
        { cx: 20, cy: 30 },
        { cx: 30, cy: 25 },
        { cx: 15, cy: 38 },
        { cx: 25, cy: 35 },
      ].map((flake, i) => (
        <G key={`snow_${i}`}>
          <Circle cx={flake.cx} cy={flake.cy} r={3} fill="#ffffff" />
          <Path
            d={`M ${flake.cx} ${flake.cy - 4} L ${flake.cx} ${flake.cy + 4}
                M ${flake.cx - 4} ${flake.cy} L ${flake.cx + 4} ${flake.cy}`}
            stroke="#ffffff"
            strokeWidth={1}
          />
        </G>
      ))}
    </G>
  );
}

/**
 * Moon prop
 */
function MoonProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Moon body */}
      <Circle cx="20" cy="20" r="18" fill="#f5f5dc" />
      {/* Crescent shadow */}
      <Circle cx="28" cy="18" r="15" fill="#1a1a2e" />
      {/* Stars around */}
      {[
        { cx: 5, cy: 8, size: 2 },
        { cx: 38, cy: 35, size: 3 },
        { cx: 35, cy: 5, size: 2 },
      ].map((star, i) => (
        <Path
          key={`star_${i}`}
          d={`M ${star.cx} ${star.cy - star.size} L ${star.cx} ${star.cy + star.size}
              M ${star.cx - star.size} ${star.cy} L ${star.cx + star.size} ${star.cy}`}
          stroke="#ffd700"
          strokeWidth={1.5}
        />
      ))}
    </G>
  );
}

/**
 * Taco prop
 */
function TacoProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Shell */}
      <Path d="M 5 30 Q 20 0 35 30 Q 20 35 5 30" fill="#f5d79e" />
      {/* Meat */}
      <Path d="M 8 28 Q 20 10 32 28" fill="#8b4513" />
      {/* Lettuce */}
      <Path d="M 10 26 Q 15 20 20 26 Q 25 20 30 26" fill="#4caf50" />
      {/* Cheese */}
      <Path d="M 12 24 Q 17 18 22 24 Q 27 18 28 24" fill="#ffd700" />
      {/* Tomato */}
      <Circle cx="15" cy="22" r="3" fill="#e74c3c" />
      <Circle cx="25" cy="22" r="2" fill="#e74c3c" />
    </G>
  );
}

/**
 * Cake prop
 */
function CakeProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Bottom layer */}
      <Rect x="5" y="30" width="40" height="15" rx="3" fill="#f8bbd9" />
      {/* Top layer */}
      <Rect x="10" y="18" width="30" height="14" rx="2" fill="#f48fb1" />
      {/* Frosting drip */}
      <Path d="M 10 20 Q 15 25 20 20 Q 25 25 30 20 Q 35 25 40 20" fill="#ffffff" />
      {/* Candle */}
      <Rect x="23" y="5" width="4" height="14" fill="#e3f2fd" />
      {/* Flame */}
      <Ellipse cx="25" cy="3" rx="3" ry="5" fill="#ff9800" />
      <Ellipse cx="25" cy="2" rx="1.5" ry="3" fill="#ffeb3b" />
    </G>
  );
}

/**
 * Wine glass prop
 */
function WineProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Glass */}
      <Path d="M 12 0 L 8 20 Q 8 25 20 25 Q 32 25 32 20 L 28 0 Z" fill="rgba(255,255,255,0.3)" stroke="#ccc" strokeWidth={1} />
      {/* Wine */}
      <Path d="M 10 10 L 8 20 Q 8 25 20 25 Q 32 25 32 20 L 30 10 Z" fill="#722f37" />
      {/* Stem */}
      <Rect x="18" y="25" width="4" height="12" fill="#ccc" />
      {/* Base */}
      <Ellipse cx="20" cy="40" rx="10" ry="3" fill="#ccc" />
    </G>
  );
}

/**
 * Beer mug prop
 */
function BeerProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Mug body */}
      <Rect x="5" y="8" width="30" height="35" rx="3" fill="#f5deb3" />
      {/* Beer */}
      <Rect x="8" y="12" width="24" height="28" fill="#f5a623" />
      {/* Foam */}
      <Ellipse cx="20" cy="10" rx="14" ry="5" fill="#ffffff" />
      <Ellipse cx="12" cy="8" rx="5" ry="4" fill="#ffffff" />
      <Ellipse cx="28" cy="8" rx="5" ry="4" fill="#ffffff" />
      {/* Handle */}
      <Path d="M 35 15 Q 45 15 45 27 Q 45 38 35 38" stroke="#d4a574" strokeWidth={5} fill="none" />
    </G>
  );
}

/**
 * Headphones prop
 */
function HeadphonesProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Band */}
      <Path d="M 5 25 Q 5 5 25 5 Q 45 5 45 25" stroke="#2c3e50" strokeWidth={4} fill="none" />
      {/* Left ear */}
      <Rect x="0" y="20" width="12" height="20" rx="4" fill="#2c3e50" />
      <Rect x="2" y="23" width="8" height="14" rx="2" fill="#bdc3c7" />
      {/* Right ear */}
      <Rect x="38" y="20" width="12" height="20" rx="4" fill="#2c3e50" />
      <Rect x="40" y="23" width="8" height="14" rx="2" fill="#bdc3c7" />
    </G>
  );
}

/**
 * Umbrella prop
 */
function UmbrellaProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Canopy */}
      <Path d="M 5 20 Q 5 5 25 5 Q 45 5 45 20 L 40 22 Q 35 18 30 22 Q 25 18 20 22 Q 15 18 10 22 Z" fill="#e74c3c" />
      {/* Handle */}
      <Rect x="24" y="20" width="3" height="25" fill="#5d4037" />
      {/* Hook */}
      <Path d="M 25.5 45 Q 20 45 20 50 Q 20 55 25 55" stroke="#5d4037" strokeWidth={3} fill="none" strokeLinecap="round" />
    </G>
  );
}

/**
 * Flower prop
 */
function FlowerProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  const petalColor = '#ff69b4';
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Stem */}
      <Path d="M 20 25 L 20 45" stroke="#228b22" strokeWidth={3} />
      {/* Leaf */}
      <Path d="M 20 35 Q 10 30 15 40" fill="#228b22" />
      {/* Petals */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <Ellipse
          key={`petal_${i}`}
          cx={20 + 10 * Math.cos((angle * Math.PI) / 180)}
          cy={15 + 10 * Math.sin((angle * Math.PI) / 180)}
          rx={6}
          ry={10}
          fill={petalColor}
          transform={`rotate(${angle}, ${20 + 10 * Math.cos((angle * Math.PI) / 180)}, ${15 + 10 * Math.sin((angle * Math.PI) / 180)})`}
        />
      ))}
      {/* Center */}
      <Circle cx="20" cy="15" r="6" fill="#ffd700" />
    </G>
  );
}

/**
 * Football prop
 */
function FootballProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Ball */}
      <Ellipse cx="20" cy="20" rx="18" ry="12" fill="#8b4513" />
      {/* Laces */}
      <Path d="M 20 10 L 20 30" stroke="#ffffff" strokeWidth={2} />
      {/* Lace cross-stitches */}
      {[12, 16, 20, 24, 28].map((y, i) => (
        <Path
          key={`lace_${i}`}
          d={`M 17 ${y} L 23 ${y}`}
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      ))}
    </G>
  );
}

/**
 * Soccer ball prop
 */
function SoccerBallProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Circle cx="20" cy="20" r="18" fill="#ffffff" stroke="#000" strokeWidth={1} />
      {/* Pentagon pattern */}
      <Path d="M 20 8 L 28 14 L 25 24 L 15 24 L 12 14 Z" fill="#000" />
      <Path d="M 6 18 L 10 12 L 12 18" fill="#000" />
      <Path d="M 34 18 L 30 12 L 28 18" fill="#000" />
      <Path d="M 10 30 L 15 25 L 20 32" fill="#000" />
      <Path d="M 30 30 L 25 25 L 20 32" fill="#000" />
    </G>
  );
}

/**
 * Tennis racket prop
 */
function TennisRacketProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Handle */}
      <Rect x="18" y="30" width="6" height="20" rx="2" fill="#8b4513" />
      {/* Handle wrap */}
      {[32, 36, 40, 44].map((y, i) => (
        <Path key={`wrap_${i}`} d={`M 18 ${y} L 24 ${y + 2}`} stroke="#fff" strokeWidth={2} />
      ))}
      {/* Head frame */}
      <Ellipse cx="21" cy="16" rx="16" ry="18" fill="none" stroke="#2ecc71" strokeWidth={3} />
      {/* Strings */}
      {[-10, -5, 0, 5, 10].map((offset, i) => (
        <G key={`string_${i}`}>
          <Path d={`M ${21 + offset} 2 L ${21 + offset} 30`} stroke="#ccc" strokeWidth={0.5} />
          <Path d={`M 8 ${16 + offset * 1.2} L 34 ${16 + offset * 1.2}`} stroke="#ccc" strokeWidth={0.5} />
        </G>
      ))}
    </G>
  );
}

// ============================================================================
// PHASE 3 EXPANSION - Additional Props
// ============================================================================

/**
 * Donut prop
 */
function DonutProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Donut body */}
      <Circle cx="20" cy="20" r="18" fill="#d4a574" />
      {/* Frosting */}
      <Path d="M 5 20 Q 5 5 20 5 Q 35 5 35 20 Q 38 12 30 8 Q 25 15 20 8 Q 15 15 10 8 Q 2 12 5 20" fill="#f48fb1" />
      {/* Hole */}
      <Circle cx="20" cy="20" r="6" fill="#ffffff" />
      {/* Sprinkles */}
      <Rect x="10" y="8" width="3" height="1.5" fill="#ffeb3b" transform="rotate(30, 10, 8)" />
      <Rect x="25" y="10" width="3" height="1.5" fill="#4fc3f7" transform="rotate(-20, 25, 10)" />
      <Rect x="30" y="15" width="3" height="1.5" fill="#81c784" transform="rotate(45, 30, 15)" />
      <Rect x="15" y="12" width="3" height="1.5" fill="#e57373" transform="rotate(-10, 15, 12)" />
    </G>
  );
}

/**
 * Sushi prop
 */
function SushiProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Rice base */}
      <Ellipse cx="20" cy="30" rx="16" ry="8" fill="#ffffff" />
      <Rect x="4" y="15" width="32" height="15" rx="3" fill="#ffffff" />
      {/* Nori wrap */}
      <Rect x="8" y="18" width="24" height="10" fill="#1b5e20" />
      {/* Salmon */}
      <Ellipse cx="20" cy="15" rx="12" ry="5" fill="#ff7043" />
      <Path d="M 12 15 Q 16 13 20 15 Q 24 13 28 15" stroke="#ff5722" strokeWidth={0.5} fill="none" />
    </G>
  );
}

/**
 * Popcorn prop
 */
function PopcornProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Container */}
      <Path d="M 8 20 L 5 45 L 35 45 L 32 20 Z" fill="#e74c3c" />
      <Path d="M 10 25 L 30 25" stroke="#ffffff" strokeWidth={1} />
      <Path d="M 10 30 L 30 30" stroke="#ffffff" strokeWidth={1} />
      {/* Popcorn pieces */}
      {[
        { cx: 15, cy: 12 },
        { cx: 22, cy: 8 },
        { cx: 28, cy: 14 },
        { cx: 12, cy: 18 },
        { cx: 20, cy: 16 },
        { cx: 28, cy: 20 },
      ].map((p, i) => (
        <Circle key={`popcorn_${i}`} cx={p.cx} cy={p.cy} r={4 + (i % 2)} fill="#fff9c4" />
      ))}
    </G>
  );
}

/**
 * Gaming controller prop
 */
function GamingControllerProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Body */}
      <Path d="M 5 15 Q 0 20 5 30 L 15 30 L 15 35 L 25 35 L 25 30 L 35 30 Q 40 20 35 15 Q 30 10 20 10 Q 10 10 5 15" fill="#2c3e50" />
      {/* D-pad */}
      <Rect x="8" y="17" width="3" height="8" rx="0.5" fill="#34495e" />
      <Rect x="6" y="19" width="8" height="3" rx="0.5" fill="#34495e" />
      {/* Buttons */}
      <Circle cx="32" cy="18" r="2" fill="#e74c3c" />
      <Circle cx="28" cy="22" r="2" fill="#3498db" />
      <Circle cx="32" cy="26" r="2" fill="#2ecc71" />
      <Circle cx="36" cy="22" r="2" fill="#f1c40f" />
      {/* Joysticks */}
      <Circle cx="15" cy="28" r="3" fill="#34495e" />
      <Circle cx="25" cy="28" r="3" fill="#34495e" />
    </G>
  );
}

/**
 * Camera prop
 */
function CameraProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Body */}
      <Rect x="5" y="12" width="35" height="25" rx="3" fill="#37474f" />
      {/* Viewfinder bump */}
      <Rect x="12" y="7" width="15" height="8" rx="1" fill="#455a64" />
      {/* Lens */}
      <Circle cx="22" cy="24" r="10" fill="#263238" />
      <Circle cx="22" cy="24" r="8" fill="#1a237e" />
      <Circle cx="22" cy="24" r="6" fill="#0d1b2a" />
      <Circle cx="19" cy="21" r="2" fill="#ffffff" opacity={0.3} />
      {/* Flash */}
      <Rect x="32" y="14" width="5" height="4" rx="1" fill="#ffeb3b" />
      {/* Shutter button */}
      <Circle cx="37" cy="10" r="3" fill="#78909c" />
    </G>
  );
}

/**
 * Guitar prop
 */
function GuitarProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Neck */}
      <Rect x="17" y="0" width="6" height="25" fill="#8d6e63" />
      {/* Frets */}
      {[5, 10, 15, 20].map((fy, i) => (
        <Path key={`fret_${i}`} d={`M 17 ${fy} L 23 ${fy}`} stroke="#bdbdbd" strokeWidth={1} />
      ))}
      {/* Body */}
      <Ellipse cx="20" cy="40" rx="18" ry="12" fill="#d4a574" />
      <Ellipse cx="20" cy="35" rx="12" ry="8" fill="#a1887f" />
      {/* Sound hole */}
      <Circle cx="20" cy="40" r="5" fill="#3e2723" />
      {/* Strings */}
      {[18, 20, 22].map((sx, i) => (
        <Path key={`string_${i}`} d={`M ${sx} 3 L ${sx} 45`} stroke="#e0e0e0" strokeWidth={0.5} />
      ))}
      {/* Bridge */}
      <Rect x="14" y="45" width="12" height="3" rx="1" fill="#5d4037" />
    </G>
  );
}

/**
 * Microphone prop
 */
function MicrophoneProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Mic head */}
      <Ellipse cx="20" cy="12" rx="10" ry="12" fill="#78909c" />
      {/* Grill pattern */}
      {[6, 10, 14, 18].map((my, i) => (
        <Path key={`grill_${i}`} d={`M 12 ${my} L 28 ${my}`} stroke="#546e7a" strokeWidth={1} />
      ))}
      {/* Handle */}
      <Rect x="17" y="22" width="6" height="25" rx="2" fill="#37474f" />
      {/* Ring */}
      <Rect x="15" y="22" width="10" height="3" fill="#ffd700" />
    </G>
  );
}

/**
 * Trophy prop
 */
function TrophyProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Cup body */}
      <Path d="M 10 5 L 8 25 Q 8 30 20 30 Q 32 30 32 25 L 30 5 Z" fill="#ffd700" />
      {/* Handles */}
      <Path d="M 8 10 Q 0 10 0 18 Q 0 25 8 22" stroke="#ffd700" strokeWidth={4} fill="none" />
      <Path d="M 32 10 Q 40 10 40 18 Q 40 25 32 22" stroke="#ffd700" strokeWidth={4} fill="none" />
      {/* Stem */}
      <Rect x="17" y="30" width="6" height="10" fill="#ffd700" />
      {/* Base */}
      <Rect x="10" y="40" width="20" height="5" rx="1" fill="#5d4037" />
      <Rect x="12" y="38" width="16" height="4" fill="#ffd700" />
      {/* Star */}
      <Path d="M 20 12 L 22 17 L 27 17 L 23 20 L 25 25 L 20 22 L 15 25 L 17 20 L 13 17 L 18 17 Z" fill="#fff8e1" />
    </G>
  );
}

/**
 * Medal prop
 */
function MedalProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Ribbon */}
      <Path d="M 10 0 L 10 20 L 20 15 L 30 20 L 30 0" fill="#e74c3c" />
      <Path d="M 10 0 L 30 0" stroke="#c62828" strokeWidth={3} />
      {/* Medal */}
      <Circle cx="20" cy="32" r="14" fill="#ffd700" />
      <Circle cx="20" cy="32" r="11" fill="#ffeb3b" />
      {/* Star on medal */}
      <Path d="M 20 22 L 22 28 L 28 28 L 23 32 L 25 38 L 20 34 L 15 38 L 17 32 L 12 28 L 18 28 Z" fill="#ffd700" />
    </G>
  );
}

/**
 * Party hat prop
 */
function PartyHatProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Cone */}
      <Path d="M 20 0 L 5 40 L 35 40 Z" fill="#e91e63" />
      {/* Stripes */}
      <Path d="M 20 0 L 10 25 L 12 25 L 20 5 L 28 25 L 30 25 Z" fill="#ffc107" />
      {/* Pom pom */}
      <Circle cx="20" cy="0" r="5" fill="#ffeb3b" />
      {/* Elastic band */}
      <Path d="M 5 40 Q 5 45 10 45" stroke="#9e9e9e" strokeWidth={1.5} fill="none" />
      <Path d="M 35 40 Q 35 45 30 45" stroke="#9e9e9e" strokeWidth={1.5} fill="none" />
    </G>
  );
}

/**
 * Party popper prop
 */
function PartyPopperProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  const confettiColors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6'];
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Popper body */}
      <Path d="M 30 45 L 15 20 L 25 20 Z" fill="#f1c40f" />
      <Path d="M 15 20 L 25 20 L 20 5" fill="#ffd54f" />
      {/* Confetti */}
      {confettiColors.map((color, i) => (
        <G key={`conf_${i}`}>
          <Rect x={5 + i * 6} y={10 - i * 2} width={4} height={2} fill={color} transform={`rotate(${i * 30}, ${7 + i * 6}, ${11 - i * 2})`} />
          <Circle cx={8 + i * 5} cy={5 + i * 3} r={2} fill={confettiColors[(i + 2) % 5]} />
        </G>
      ))}
    </G>
  );
}

/**
 * Rocket prop
 */
function RocketProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Body */}
      <Path d="M 20 0 Q 30 10 30 25 L 30 40 L 10 40 L 10 25 Q 10 10 20 0" fill="#e0e0e0" />
      {/* Window */}
      <Circle cx="20" cy="18" r="6" fill="#4fc3f7" />
      <Circle cx="18" cy="16" r="2" fill="#ffffff" opacity={0.5} />
      {/* Fins */}
      <Path d="M 10 30 L 2 45 L 10 40 Z" fill="#e74c3c" />
      <Path d="M 30 30 L 38 45 L 30 40 Z" fill="#e74c3c" />
      {/* Flame */}
      <Path d="M 14 40 L 20 55 L 26 40 Z" fill="#ff9800" />
      <Path d="M 16 40 L 20 50 L 24 40 Z" fill="#ffeb3b" />
    </G>
  );
}

/**
 * Music notes prop
 */
function MusicNotesProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* First note */}
      <Ellipse cx="12" cy="35" rx="6" ry="4" fill="#1a1a2e" transform="rotate(-20, 12, 35)" />
      <Rect x="16" y="10" width="3" height="27" fill="#1a1a2e" />
      <Path d="M 19 10 Q 30 5 35 15" stroke="#1a1a2e" strokeWidth={3} fill="none" />
      {/* Second note */}
      <Ellipse cx="35" cy="30" rx="5" ry="3.5" fill="#1a1a2e" transform="rotate(-20, 35, 30)" />
      <Rect x="38" y="8" width="3" height="24" fill="#1a1a2e" />
    </G>
  );
}

/**
 * Bubble tea prop
 */
function BubbleTeaProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Cup */}
      <Path d="M 10 15 L 8 45 Q 8 48 20 48 Q 32 48 32 45 L 30 15 Z" fill="rgba(255,255,255,0.3)" stroke="#e0e0e0" strokeWidth={1} />
      {/* Drink */}
      <Path d="M 10 20 L 8 45 Q 8 48 20 48 Q 32 48 32 45 L 30 20 Z" fill="#e1bee7" />
      {/* Tapioca pearls */}
      {[
        { cx: 13, cy: 42 }, { cx: 20, cy: 44 }, { cx: 27, cy: 42 },
        { cx: 15, cy: 38 }, { cx: 22, cy: 40 }, { cx: 25, cy: 36 },
      ].map((p, i) => (
        <Circle key={`pearl_${i}`} cx={p.cx} cy={p.cy} r={2.5} fill="#4e342e" />
      ))}
      {/* Lid */}
      <Ellipse cx="20" cy="15" rx="12" ry="3" fill="#f5f5f5" />
      {/* Straw */}
      <Rect x="22" y="0" width="4" height="20" fill="#e91e63" />
    </G>
  );
}

/**
 * Pumpkin prop
 */
function PumpkinProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Main body */}
      <Ellipse cx="20" cy="28" rx="18" ry="15" fill="#ff5722" />
      {/* Segments */}
      <Path d="M 20 13 Q 15 28 20 43" stroke="#e64a19" strokeWidth={2} fill="none" />
      <Path d="M 10 18 Q 8 28 10 38" stroke="#e64a19" strokeWidth={1.5} fill="none" />
      <Path d="M 30 18 Q 32 28 30 38" stroke="#e64a19" strokeWidth={1.5} fill="none" />
      {/* Stem */}
      <Rect x="17" y="8" width="6" height="8" rx="2" fill="#4caf50" />
      <Path d="M 17 10 Q 12 5 15 0" stroke="#4caf50" strokeWidth={2} fill="none" />
    </G>
  );
}

/**
 * Skull prop
 */
function SkullProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Skull shape */}
      <Path d="M 20 5 Q 40 5 38 25 Q 38 35 30 40 L 30 45 L 10 45 L 10 40 Q 2 35 2 25 Q 0 5 20 5" fill="#f5f5f5" />
      {/* Eye sockets */}
      <Ellipse cx="12" cy="22" rx="5" ry="6" fill="#1a1a2e" />
      <Ellipse cx="28" cy="22" rx="5" ry="6" fill="#1a1a2e" />
      {/* Nose */}
      <Path d="M 20 30 L 17 35 L 23 35 Z" fill="#1a1a2e" />
      {/* Teeth */}
      <Rect x="12" y="40" width="4" height="5" fill="#ffffff" stroke="#e0e0e0" strokeWidth={0.5} />
      <Rect x="18" y="40" width="4" height="5" fill="#ffffff" stroke="#e0e0e0" strokeWidth={0.5} />
      <Rect x="24" y="40" width="4" height="5" fill="#ffffff" stroke="#e0e0e0" strokeWidth={0.5} />
    </G>
  );
}

/**
 * Ghost prop
 */
function GhostProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Body */}
      <Path d="M 20 5 Q 38 5 38 25 L 38 40 Q 35 35 30 40 Q 25 35 20 40 Q 15 35 10 40 Q 5 35 2 40 L 2 25 Q 2 5 20 5" fill="#ffffff" />
      {/* Eyes */}
      <Ellipse cx="13" cy="20" rx="4" ry="5" fill="#1a1a2e" />
      <Ellipse cx="27" cy="20" rx="4" ry="5" fill="#1a1a2e" />
      {/* Pupils */}
      <Circle cx="14" cy="21" r="1.5" fill="#ffffff" />
      <Circle cx="28" cy="21" r="1.5" fill="#ffffff" />
      {/* Mouth */}
      <Ellipse cx="20" cy="32" rx="4" ry="3" fill="#1a1a2e" />
    </G>
  );
}

/**
 * Check mark prop
 */
function CheckMarkProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Circle cx="20" cy="20" r="18" fill="#4caf50" />
      <Path d="M 10 20 L 17 27 L 32 12" stroke="#ffffff" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </G>
  );
}

/**
 * X mark prop
 */
function XMarkProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Circle cx="20" cy="20" r="18" fill="#e74c3c" />
      <Path d="M 12 12 L 28 28 M 28 12 L 12 28" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
    </G>
  );
}

/**
 * Dollar sign prop
 */
function DollarSignProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Circle cx="20" cy="20" r="18" fill="#4caf50" />
      <Path d="M 20 8 L 20 32" stroke="#ffffff" strokeWidth={2} />
      <Path d="M 27 13 Q 15 10 15 18 Q 15 23 20 24 Q 27 26 27 32 Q 27 38 13 35" stroke="#ffffff" strokeWidth={3} fill="none" strokeLinecap="round" />
    </G>
  );
}

/**
 * Thumbs up sign prop
 */
function ThumbsUpSignProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Circle cx="20" cy="20" r="18" fill="#3498db" />
      {/* Thumb */}
      <Path d="M 15 30 L 15 20 Q 15 12 22 12 L 28 12 Q 30 12 30 15 L 30 25 Q 30 28 27 28 L 20 28" fill="#ffd54f" />
      <Rect x="10" y="22" width="8" height="12" rx="2" fill="#ffd54f" />
    </G>
  );
}

/**
 * Snowflake prop
 */
function SnowflakeProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Main spokes */}
      {[0, 60, 120].map((angle, i) => (
        <G key={`spoke_${i}`} transform={`rotate(${angle}, 20, 20)`}>
          <Path d="M 20 2 L 20 38" stroke="#81d4fa" strokeWidth={2} />
          <Path d="M 20 8 L 14 14 M 20 8 L 26 14" stroke="#81d4fa" strokeWidth={1.5} />
          <Path d="M 20 32 L 14 26 M 20 32 L 26 26" stroke="#81d4fa" strokeWidth={1.5} />
        </G>
      ))}
      {/* Center */}
      <Circle cx="20" cy="20" r="3" fill="#b3e5fc" />
    </G>
  );
}

// ============================================================================
// PHASE 4 EXPANSION - More Effects and Props
// ============================================================================

/**
 * Multiple hearts effect
 */
function HeartsMultipleProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  const hearts = [
    { cx: 10, cy: 10, size: 0.5, color: '#e74c3c' },
    { cx: 30, cy: 8, size: 0.6, color: '#ff6b6b' },
    { cx: 20, cy: 20, size: 0.8, color: '#e74c3c' },
    { cx: 8, cy: 30, size: 0.4, color: '#ff6b6b' },
    { cx: 35, cy: 28, size: 0.5, color: '#e74c3c' },
  ];
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {hearts.map((h, i) => (
        <G key={`heart_${i}`} transform={`translate(${h.cx - 10}, ${h.cy - 10}) scale(${h.size})`}>
          <Path
            d="M 10 4 C 7.5 0 0 0 0 7.5 C 0 12.5 10 20 10 20 C 10 20 20 12.5 20 7.5 C 20 0 12.5 0 10 4"
            fill={h.color}
          />
        </G>
      ))}
    </G>
  );
}

/**
 * Multiple stars effect
 */
function StarsMultipleProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  const stars = [
    { cx: 8, cy: 12, size: 0.4, color: '#ffd700' },
    { cx: 25, cy: 5, size: 0.5, color: '#ffeb3b' },
    { cx: 38, cy: 18, size: 0.35, color: '#ffd700' },
    { cx: 15, cy: 30, size: 0.45, color: '#ffeb3b' },
    { cx: 32, cy: 35, size: 0.4, color: '#ffd700' },
  ];
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {stars.map((s, i) => (
        <G key={`star_${i}`} transform={`translate(${s.cx - 10}, ${s.cy - 10}) scale(${s.size})`}>
          <Path
            d="M 10 0 L 12 7 L 20 7 L 14 11 L 16 19 L 10 14 L 4 19 L 6 11 L 0 7 L 8 7 Z"
            fill={s.color}
          />
        </G>
      ))}
    </G>
  );
}

/**
 * Heart eyes effect (for face)
 */
function HeartEyesProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Left heart eye */}
      <G transform="translate(5, 10) scale(0.7)">
        <Path
          d="M 10 4 C 7.5 0 0 0 0 7.5 C 0 12.5 10 20 10 20 C 10 20 20 12.5 20 7.5 C 20 0 12.5 0 10 4"
          fill="#e74c3c"
        />
      </G>
      {/* Right heart eye */}
      <G transform="translate(25, 10) scale(0.7)">
        <Path
          d="M 10 4 C 7.5 0 0 0 0 7.5 C 0 12.5 10 20 10 20 C 10 20 20 12.5 20 7.5 C 20 0 12.5 0 10 4"
          fill="#e74c3c"
        />
      </G>
    </G>
  );
}

/**
 * Broken heart effect
 */
function HeartBrokenProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Left half */}
      <Path
        d="M 20 8 C 15 0 0 0 0 15 C 0 25 20 40 20 40 L 18 30 L 22 25 L 18 20 L 22 15 L 20 8"
        fill="#e74c3c"
      />
      {/* Right half (slightly offset) */}
      <Path
        d="M 22 8 C 25 0 40 0 40 15 C 40 25 22 40 22 40 L 24 30 L 20 25 L 24 20 L 20 15 L 22 8"
        fill="#c0392b"
        transform="translate(3, 0)"
      />
    </G>
  );
}

/**
 * Confetti effect
 */
function ConfettiProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e91e63', '#00bcd4'];
  const pieces = [
    { x: 5, y: 8, w: 5, h: 2, angle: 30 },
    { x: 15, y: 5, w: 4, h: 2, angle: -20 },
    { x: 28, y: 10, w: 5, h: 2, angle: 45 },
    { x: 35, y: 6, w: 4, h: 2, angle: -35 },
    { x: 10, y: 20, w: 5, h: 2, angle: 15 },
    { x: 22, y: 18, w: 4, h: 2, angle: -40 },
    { x: 32, y: 22, w: 5, h: 2, angle: 25 },
    { x: 8, y: 32, w: 4, h: 2, angle: -10 },
    { x: 20, y: 35, w: 5, h: 2, angle: 50 },
    { x: 30, y: 30, w: 4, h: 2, angle: -30 },
  ];
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {pieces.map((p, i) => (
        <Rect
          key={`confetti_${i}`}
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          fill={colors[i % colors.length]}
          transform={`rotate(${p.angle}, ${p.x + p.w / 2}, ${p.y + p.h / 2})`}
        />
      ))}
      {/* Some circles */}
      {[
        { cx: 12, cy: 15, r: 2 },
        { cx: 25, cy: 28, r: 2.5 },
        { cx: 38, cy: 15, r: 2 },
      ].map((c, i) => (
        <Circle key={`dot_${i}`} cx={c.cx} cy={c.cy} r={c.r} fill={colors[(i + 3) % colors.length]} />
      ))}
    </G>
  );
}

/**
 * Thumbs down sign prop
 */
function ThumbsDownSignProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Circle cx="20" cy="20" r="18" fill="#e74c3c" />
      {/* Thumb down */}
      <G transform="rotate(180, 20, 20)">
        <Path d="M 15 30 L 15 20 Q 15 12 22 12 L 28 12 Q 30 12 30 15 L 30 25 Q 30 28 27 28 L 20 28" fill="#ffd54f" />
        <Rect x="10" y="22" width="8" height="12" rx="2" fill="#ffd54f" />
      </G>
    </G>
  );
}

/**
 * Angel halo effect
 */
function AngelHaloProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Ellipse cx="20" cy="12" rx="16" ry="5" fill="none" stroke="#ffd700" strokeWidth={4} />
      <Ellipse cx="20" cy="12" rx="16" ry="5" fill="none" stroke="#ffeb3b" strokeWidth={2} />
    </G>
  );
}

/**
 * Angel wings effect
 */
function AngelWingsProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Left wing */}
      <Path d="M 20 25 Q 5 15 2 25 Q 0 35 8 40 Q 12 35 20 40" fill="#ffffff" opacity={0.9} />
      <Path d="M 20 28 Q 8 20 5 28 Q 3 35 10 38" fill="#f5f5f5" />
      {/* Right wing */}
      <Path d="M 20 25 Q 35 15 38 25 Q 40 35 32 40 Q 28 35 20 40" fill="#ffffff" opacity={0.9} />
      <Path d="M 20 28 Q 32 20 35 28 Q 37 35 30 38" fill="#f5f5f5" />
    </G>
  );
}

/**
 * Devil horns effect
 */
function DevilHornsProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Left horn */}
      <Path d="M 12 30 L 5 5 Q 8 8 15 15 Z" fill="#e74c3c" />
      <Path d="M 12 30 L 8 12 Q 10 15 15 18" fill="#c0392b" />
      {/* Right horn */}
      <Path d="M 28 30 L 35 5 Q 32 8 25 15 Z" fill="#e74c3c" />
      <Path d="M 28 30 L 32 12 Q 30 15 25 18" fill="#c0392b" />
    </G>
  );
}

/**
 * Devil tail effect
 */
function DevilTailProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Path d="M 5 5 Q 15 20 10 35 Q 20 40 30 30 Q 35 25 40 30" stroke="#e74c3c" strokeWidth={4} fill="none" />
      {/* Tail tip */}
      <Path d="M 40 30 L 45 22 L 50 32 Z" fill="#e74c3c" />
    </G>
  );
}

/**
 * Alien face prop
 */
function AlienProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Head */}
      <Ellipse cx="20" cy="22" rx="18" ry="20" fill="#4caf50" />
      {/* Eyes */}
      <Ellipse cx="12" cy="18" rx="6" ry="8" fill="#1a1a2e" />
      <Ellipse cx="28" cy="18" rx="6" ry="8" fill="#1a1a2e" />
      {/* Eye shine */}
      <Circle cx="10" cy="16" r="2" fill="#ffffff" opacity={0.5} />
      <Circle cx="26" cy="16" r="2" fill="#ffffff" opacity={0.5} />
      {/* Mouth */}
      <Ellipse cx="20" cy="32" rx="4" ry="2" fill="#2e7d32" />
    </G>
  );
}

/**
 * Speech bubble prop
 */
function SpeechBubbleProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Path d="M 5 5 Q 5 0 20 0 Q 35 0 35 5 L 35 25 Q 35 30 20 30 L 12 30 L 8 38 L 10 30 Q 5 30 5 25 Z" fill="#ffffff" stroke="#e0e0e0" strokeWidth={1} />
    </G>
  );
}

/**
 * Thought bubble prop
 */
function ThoughtBubbleProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Main bubble */}
      <Ellipse cx="25" cy="15" rx="18" ry="12" fill="#ffffff" stroke="#e0e0e0" strokeWidth={1} />
      {/* Thought dots */}
      <Circle cx="10" cy="32" r="4" fill="#ffffff" stroke="#e0e0e0" strokeWidth={1} />
      <Circle cx="5" cy="40" r="2.5" fill="#ffffff" stroke="#e0e0e0" strokeWidth={1} />
    </G>
  );
}

/**
 * Glow/aura effect
 */
function GlowProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  const gradId = generateId();
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Defs>
        <RadialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#ffeb3b" stopOpacity={0.8} />
          <Stop offset="50%" stopColor="#ffd700" stopOpacity={0.4} />
          <Stop offset="100%" stopColor="#ffd700" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="20" cy="20" r="20" fill={`url(#${gradId})`} />
    </G>
  );
}

/**
 * Bubbles effect
 */
function BubblesProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  const bubbles = [
    { cx: 10, cy: 30, r: 5 },
    { cx: 20, cy: 20, r: 7 },
    { cx: 30, cy: 28, r: 4 },
    { cx: 15, cy: 10, r: 6 },
    { cx: 35, cy: 12, r: 3 },
    { cx: 8, cy: 18, r: 3 },
  ];
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {bubbles.map((b, i) => (
        <G key={`bubble_${i}`}>
          <Circle cx={b.cx} cy={b.cy} r={b.r} fill="rgba(135, 206, 235, 0.3)" stroke="#87ceeb" strokeWidth={1} />
          <Circle cx={b.cx - b.r * 0.3} cy={b.cy - b.r * 0.3} r={b.r * 0.2} fill="#ffffff" opacity={0.6} />
        </G>
      ))}
    </G>
  );
}

/**
 * Fireworks effect
 */
function FireworksProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  const colors = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#9b59b6'];
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Center burst */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <Path
          key={`burst_${i}`}
          d={`M 20 20 L ${20 + 15 * Math.cos((angle * Math.PI) / 180)} ${20 + 15 * Math.sin((angle * Math.PI) / 180)}`}
          stroke={colors[i % colors.length]}
          strokeWidth={2}
          strokeLinecap="round"
        />
      ))}
      {/* Sparkles at tips */}
      {[0, 90, 180, 270].map((angle, i) => (
        <Circle
          key={`tip_${i}`}
          cx={20 + 16 * Math.cos((angle * Math.PI) / 180)}
          cy={20 + 16 * Math.sin((angle * Math.PI) / 180)}
          r={2}
          fill={colors[(i + 2) % colors.length]}
        />
      ))}
    </G>
  );
}

/**
 * Balloons (multiple) prop
 */
function BalloonsProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  const balloons = [
    { cx: 12, cy: 15, color: '#e74c3c' },
    { cx: 25, cy: 12, color: '#3498db' },
    { cx: 38, cy: 18, color: '#2ecc71' },
  ];
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {balloons.map((b, i) => (
        <G key={`balloon_${i}`}>
          <Ellipse cx={b.cx} cy={b.cy} rx={8} ry={10} fill={b.color} />
          <Ellipse cx={b.cx - 2} cy={b.cy - 3} rx={2} ry={3} fill="#ffffff" opacity={0.3} />
          <Path d={`M ${b.cx} ${b.cy + 10} L ${b.cx - 1} ${b.cy + 12} L ${b.cx + 1} ${b.cy + 12} Z`} fill={b.color} />
          <Path d={`M ${b.cx} ${b.cy + 12} Q ${b.cx - 3} ${b.cy + 25} ${b.cx} ${b.cy + 40}`} stroke="#888" strokeWidth={0.5} fill="none" />
        </G>
      ))}
    </G>
  );
}

/**
 * Presents (multiple gifts) prop
 */
function PresentsProp({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  const gifts = [
    { x: 0, y: 15, w: 20, h: 18, color: '#e74c3c', ribbon: '#ffd700' },
    { x: 18, y: 20, w: 22, h: 15, color: '#3498db', ribbon: '#ffffff' },
  ];
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {gifts.map((g, i) => (
        <G key={`gift_${i}`}>
          <Rect x={g.x} y={g.y} width={g.w} height={g.h} rx={2} fill={g.color} />
          <Rect x={g.x + g.w / 2 - 2} y={g.y} width={4} height={g.h} fill={g.ribbon} />
          <Rect x={g.x} y={g.y + g.h / 2 - 2} width={g.w} height={4} fill={g.ribbon} />
          {/* Bow */}
          <Circle cx={g.x + g.w / 2} cy={g.y - 3} r={4} fill={g.ribbon} />
        </G>
      ))}
    </G>
  );
}

/**
 * Main PropRenderer component
 */
export function PropRenderer({ prop, x = 0, y = 0, scale = 1 }: PropRendererProps) {
  switch (prop) {
    case StickerProp.COFFEE:
    case StickerProp.TEA:
      return <CoffeeProp x={x} y={y} scale={scale} />;

    case StickerProp.PIZZA:
      return <PizzaProp x={x} y={y} scale={scale} />;

    case StickerProp.BURGER:
      return <BurgerProp x={x} y={y} scale={scale} />;

    case StickerProp.PHONE:
      return <PhoneProp x={x} y={y} scale={scale} />;

    case StickerProp.HEART:
      return <HeartProp x={x} y={y} scale={scale} />;

    case StickerProp.SPARKLES:
      return <SparklesProp x={x} y={y} scale={scale} />;

    case StickerProp.FIRE:
      return <FireProp x={x} y={y} scale={scale} />;

    case StickerProp.TEARS:
      return <TearsProp x={x} y={y} scale={scale} />;

    case StickerProp.SWEAT_DROP:
      return <SweatDropProp x={x} y={y} scale={scale} />;

    case StickerProp.ANGER_VEIN:
      return <AngerVeinProp x={x} y={y} scale={scale} />;

    case StickerProp.ZZZ:
      return <ZzzProp x={x} y={y} scale={scale} />;

    case StickerProp.QUESTION_MARK:
      return <QuestionMarkProp x={x} y={y} scale={scale} />;

    case StickerProp.EXCLAMATION:
      return <ExclamationProp x={x} y={y} scale={scale} />;

    case StickerProp.SUN:
      return <SunProp x={x} y={y} scale={scale} />;

    case StickerProp.STAR:
      return <StarProp x={x} y={y} scale={scale} />;

    case StickerProp.RAINBOW:
      return <RainbowProp x={x} y={y} scale={scale} />;

    case StickerProp.BOOK:
      return <BookProp x={x} y={y} scale={scale} />;

    case StickerProp.GIFT:
      return <GiftProp x={x} y={y} scale={scale} />;

    case StickerProp.BALLOON:
      return <BalloonProp x={x} y={y} scale={scale} />;

    case StickerProp.LIGHTNING:
      return <LightningProp x={x} y={y} scale={scale} />;

    case StickerProp.ICE_CREAM:
      return <IceCreamProp x={x} y={y} scale={scale} />;

    case StickerProp.BASKETBALL:
      return <BasketballProp x={x} y={y} scale={scale} />;

    case StickerProp.LAPTOP:
      return <LaptopProp x={x} y={y} scale={scale} />;

    case StickerProp.CLOUD:
      return <CloudProp x={x} y={y} scale={scale} />;

    case StickerProp.RAIN:
      return <RainProp x={x} y={y} scale={scale} />;

    case StickerProp.SNOW:
      return <SnowProp x={x} y={y} scale={scale} />;

    case StickerProp.MOON:
      return <MoonProp x={x} y={y} scale={scale} />;

    case StickerProp.TACO:
      return <TacoProp x={x} y={y} scale={scale} />;

    case StickerProp.CAKE:
      return <CakeProp x={x} y={y} scale={scale} />;

    case StickerProp.WINE:
      return <WineProp x={x} y={y} scale={scale} />;

    case StickerProp.BEER:
      return <BeerProp x={x} y={y} scale={scale} />;

    case StickerProp.HEADPHONES:
      return <HeadphonesProp x={x} y={y} scale={scale} />;

    case StickerProp.UMBRELLA:
      return <UmbrellaProp x={x} y={y} scale={scale} />;

    case StickerProp.FLOWER:
      return <FlowerProp x={x} y={y} scale={scale} />;

    case StickerProp.FOOTBALL:
      return <FootballProp x={x} y={y} scale={scale} />;

    case StickerProp.SOCCER_BALL:
      return <SoccerBallProp x={x} y={y} scale={scale} />;

    case StickerProp.TENNIS_RACKET:
      return <TennisRacketProp x={x} y={y} scale={scale} />;

    // ====================================================================
    // Phase 3 Expansion - Additional Props
    // ====================================================================

    case StickerProp.DONUT:
      return <DonutProp x={x} y={y} scale={scale} />;

    case StickerProp.SUSHI:
    case StickerProp.RAMEN:
      return <SushiProp x={x} y={y} scale={scale} />;

    case StickerProp.POPCORN:
      return <PopcornProp x={x} y={y} scale={scale} />;

    case StickerProp.GAMING_CONTROLLER:
      return <GamingControllerProp x={x} y={y} scale={scale} />;

    case StickerProp.CAMERA:
      return <CameraProp x={x} y={y} scale={scale} />;

    case StickerProp.GUITAR:
    case StickerProp.ELECTRIC_GUITAR:
      return <GuitarProp x={x} y={y} scale={scale} />;

    case StickerProp.MICROPHONE_PROP:
      return <MicrophoneProp x={x} y={y} scale={scale} />;

    case StickerProp.TROPHY:
      return <TrophyProp x={x} y={y} scale={scale} />;

    case StickerProp.MEDAL:
      return <MedalProp x={x} y={y} scale={scale} />;

    case StickerProp.PARTY_HAT:
      return <PartyHatProp x={x} y={y} scale={scale} />;

    case StickerProp.PARTY_POPPER:
      return <PartyPopperProp x={x} y={y} scale={scale} />;

    case StickerProp.ROCKET:
      return <RocketProp x={x} y={y} scale={scale} />;

    case StickerProp.MUSIC_NOTES:
      return <MusicNotesProp x={x} y={y} scale={scale} />;

    case StickerProp.BUBBLE_TEA:
      return <BubbleTeaProp x={x} y={y} scale={scale} />;

    case StickerProp.PUMPKIN:
      return <PumpkinProp x={x} y={y} scale={scale} />;

    case StickerProp.SKULL:
      return <SkullProp x={x} y={y} scale={scale} />;

    case StickerProp.GHOST:
      return <GhostProp x={x} y={y} scale={scale} />;

    case StickerProp.CHECK_MARK:
      return <CheckMarkProp x={x} y={y} scale={scale} />;

    case StickerProp.X_MARK:
      return <XMarkProp x={x} y={y} scale={scale} />;

    case StickerProp.DOLLAR_SIGNS:
      return <DollarSignProp x={x} y={y} scale={scale} />;

    case StickerProp.THUMBS_UP_PROP:
      return <ThumbsUpSignProp x={x} y={y} scale={scale} />;

    case StickerProp.SNOW_FLAKE:
      return <SnowflakeProp x={x} y={y} scale={scale} />;

    // ====================================================================
    // Phase 4 Expansion - New Props
    // ====================================================================

    case StickerProp.HEARTS_MULTIPLE:
      return <HeartsMultipleProp x={x} y={y} scale={scale} />;

    case StickerProp.STARS_MULTIPLE:
      return <StarsMultipleProp x={x} y={y} scale={scale} />;

    case StickerProp.HEART_EYES:
      return <HeartEyesProp x={x} y={y} scale={scale} />;

    case StickerProp.HEART_BROKEN:
      return <HeartBrokenProp x={x} y={y} scale={scale} />;

    case StickerProp.THUMBS_DOWN_PROP:
      return <ThumbsDownSignProp x={x} y={y} scale={scale} />;

    case StickerProp.ANGEL_HALO:
      return <AngelHaloProp x={x} y={y} scale={scale} />;

    case StickerProp.ANGEL_WINGS:
      return <AngelWingsProp x={x} y={y} scale={scale} />;

    case StickerProp.DEVIL_HORNS:
      return <DevilHornsProp x={x} y={y} scale={scale} />;

    case StickerProp.DEVIL_TAIL:
      return <DevilTailProp x={x} y={y} scale={scale} />;

    case StickerProp.ALIEN:
      return <AlienProp x={x} y={y} scale={scale} />;

    case StickerProp.SPEECH_BUBBLE:
      return <SpeechBubbleProp x={x} y={y} scale={scale} />;

    case StickerProp.THOUGHT_BUBBLE:
      return <ThoughtBubbleProp x={x} y={y} scale={scale} />;

    case StickerProp.GLOW:
    case StickerProp.AURA:
      return <GlowProp x={x} y={y} scale={scale} />;

    case StickerProp.BUBBLES:
      return <BubblesProp x={x} y={y} scale={scale} />;

    case StickerProp.FIREWORKS:
      return <FireworksProp x={x} y={y} scale={scale} />;

    case StickerProp.BALLOONS:
      return <BalloonsProp x={x} y={y} scale={scale} />;

    case StickerProp.PRESENTS:
      return <PresentsProp x={x} y={y} scale={scale} />;

    case StickerProp.STREAMERS:
      return <ConfettiProp x={x} y={y} scale={scale} />;

    default:
      return null;
  }
}

export default PropRenderer;
