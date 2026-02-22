/**
 * TextOverlay - Renders text captions on stickers
 *
 * Supports various text styles and positions for sticker captions.
 */

import React from 'react';
import { G, Text as SvgText, Rect, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

export type TextPosition = 'top' | 'bottom' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type TextStyle = 'default' | 'bubble' | 'banner' | 'comic' | 'outline' | 'shadow' | 'gradient';

interface TextOverlayProps {
  text: string;
  position?: TextPosition;
  textStyle?: TextStyle;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  width?: number;
  height?: number;
}

// Generate unique IDs
const generateId = () => `text_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Calculate position coordinates based on position prop
 */
function getPositionCoords(
  position: TextPosition,
  width: number,
  height: number,
  textHeight: number
): { x: number; y: number; anchor: 'start' | 'middle' | 'end' } {
  const padding = 10;

  switch (position) {
    case 'top':
      return { x: width / 2, y: padding + textHeight, anchor: 'middle' };
    case 'bottom':
      return { x: width / 2, y: height - padding, anchor: 'middle' };
    case 'center':
      return { x: width / 2, y: height / 2 + textHeight / 3, anchor: 'middle' };
    case 'top-left':
      return { x: padding, y: padding + textHeight, anchor: 'start' };
    case 'top-right':
      return { x: width - padding, y: padding + textHeight, anchor: 'end' };
    case 'bottom-left':
      return { x: padding, y: height - padding, anchor: 'start' };
    case 'bottom-right':
      return { x: width - padding, y: height - padding, anchor: 'end' };
    default:
      return { x: width / 2, y: height - padding, anchor: 'middle' };
  }
}

/**
 * Default text style - simple text
 */
function DefaultText({
  text,
  x,
  y,
  anchor,
  fontSize,
  color,
}: {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  fontSize: number;
  color: string;
}) {
  return (
    <SvgText
      x={x}
      y={y}
      fontSize={fontSize}
      fontWeight="bold"
      fill={color}
      textAnchor={anchor}
    >
      {text}
    </SvgText>
  );
}

/**
 * Speech bubble style text
 */
function BubbleText({
  text,
  x,
  y,
  anchor,
  fontSize,
  color,
  backgroundColor,
}: {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  fontSize: number;
  color: string;
  backgroundColor: string;
}) {
  const textWidth = text.length * fontSize * 0.6;
  const textHeight = fontSize * 1.5;
  const padding = 8;

  // Calculate bubble position based on anchor
  let bubbleX = x;
  if (anchor === 'middle') bubbleX = x - textWidth / 2 - padding;
  else if (anchor === 'end') bubbleX = x - textWidth - padding * 2;

  const bubbleY = y - textHeight - padding / 2;

  return (
    <G>
      {/* Bubble background */}
      <Rect
        x={bubbleX}
        y={bubbleY}
        width={textWidth + padding * 2}
        height={textHeight + padding}
        rx={textHeight / 2}
        fill={backgroundColor}
        stroke={color}
        strokeWidth={2}
      />
      {/* Bubble tail */}
      <Path
        d={`M ${bubbleX + textWidth / 2} ${bubbleY + textHeight + padding}
            L ${bubbleX + textWidth / 2 - 5} ${bubbleY + textHeight + padding + 10}
            L ${bubbleX + textWidth / 2 + 8} ${bubbleY + textHeight + padding}`}
        fill={backgroundColor}
        stroke={color}
        strokeWidth={2}
      />
      {/* Cover the stroke where tail meets bubble */}
      <Rect
        x={bubbleX + textWidth / 2 - 6}
        y={bubbleY + textHeight + padding - 2}
        width={15}
        height={4}
        fill={backgroundColor}
      />
      {/* Text */}
      <SvgText
        x={bubbleX + padding + textWidth / 2}
        y={bubbleY + textHeight / 2 + padding / 2 + fontSize / 3}
        fontSize={fontSize}
        fontWeight="bold"
        fill={color}
        textAnchor="middle"
      >
        {text}
      </SvgText>
    </G>
  );
}

/**
 * Banner style text
 */
function BannerText({
  text,
  x,
  y,
  anchor,
  fontSize,
  color,
  backgroundColor,
  width: containerWidth,
}: {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  fontSize: number;
  color: string;
  backgroundColor: string;
  width: number;
}) {
  const bannerHeight = fontSize * 1.8;
  const bannerY = y - bannerHeight + fontSize / 3;

  return (
    <G>
      {/* Banner background */}
      <Rect
        x={0}
        y={bannerY}
        width={containerWidth}
        height={bannerHeight}
        fill={backgroundColor}
      />
      {/* Banner edge decoration */}
      <Path
        d={`M 0 ${bannerY} L -5 ${bannerY + bannerHeight / 2} L 0 ${bannerY + bannerHeight}`}
        fill={backgroundColor}
      />
      <Path
        d={`M ${containerWidth} ${bannerY} L ${containerWidth + 5} ${bannerY + bannerHeight / 2} L ${containerWidth} ${bannerY + bannerHeight}`}
        fill={backgroundColor}
      />
      {/* Text */}
      <SvgText
        x={x}
        y={y}
        fontSize={fontSize}
        fontWeight="bold"
        fill={color}
        textAnchor={anchor}
      >
        {text}
      </SvgText>
    </G>
  );
}

/**
 * Comic book style text (with action lines)
 */
function ComicText({
  text,
  x,
  y,
  anchor,
  fontSize,
  color,
  backgroundColor,
}: {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  fontSize: number;
  color: string;
  backgroundColor: string;
}) {
  const textWidth = text.length * fontSize * 0.7;
  const textHeight = fontSize * 1.5;

  // Calculate center position
  let centerX = x;
  if (anchor === 'middle') centerX = x;
  else if (anchor === 'start') centerX = x + textWidth / 2;
  else centerX = x - textWidth / 2;

  const centerY = y - textHeight / 2;

  return (
    <G>
      {/* Starburst background */}
      <Path
        d={`M ${centerX} ${centerY - textHeight}
            L ${centerX + textWidth * 0.3} ${centerY - textHeight * 0.6}
            L ${centerX + textWidth * 0.7} ${centerY - textHeight * 0.8}
            L ${centerX + textWidth * 0.6} ${centerY - textHeight * 0.3}
            L ${centerX + textWidth * 0.9} ${centerY}
            L ${centerX + textWidth * 0.6} ${centerY + textHeight * 0.3}
            L ${centerX + textWidth * 0.7} ${centerY + textHeight * 0.8}
            L ${centerX + textWidth * 0.3} ${centerY + textHeight * 0.6}
            L ${centerX} ${centerY + textHeight}
            L ${centerX - textWidth * 0.3} ${centerY + textHeight * 0.6}
            L ${centerX - textWidth * 0.7} ${centerY + textHeight * 0.8}
            L ${centerX - textWidth * 0.6} ${centerY + textHeight * 0.3}
            L ${centerX - textWidth * 0.9} ${centerY}
            L ${centerX - textWidth * 0.6} ${centerY - textHeight * 0.3}
            L ${centerX - textWidth * 0.7} ${centerY - textHeight * 0.8}
            L ${centerX - textWidth * 0.3} ${centerY - textHeight * 0.6}
            Z`}
        fill={backgroundColor}
        stroke={color}
        strokeWidth={2}
      />
      {/* Text */}
      <SvgText
        x={centerX}
        y={centerY + fontSize / 3}
        fontSize={fontSize}
        fontWeight="bold"
        fill={color}
        textAnchor="middle"
      >
        {text}
      </SvgText>
    </G>
  );
}

/**
 * Outline style text
 */
function OutlineText({
  text,
  x,
  y,
  anchor,
  fontSize,
  color,
}: {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  fontSize: number;
  color: string;
}) {
  return (
    <G>
      {/* Outline (multiple offset copies for thickness) */}
      {[
        { dx: -2, dy: -2 },
        { dx: 2, dy: -2 },
        { dx: -2, dy: 2 },
        { dx: 2, dy: 2 },
        { dx: 0, dy: -2 },
        { dx: 0, dy: 2 },
        { dx: -2, dy: 0 },
        { dx: 2, dy: 0 },
      ].map((offset, i) => (
        <SvgText
          key={`outline_${i}`}
          x={x + offset.dx}
          y={y + offset.dy}
          fontSize={fontSize}
          fontWeight="bold"
          fill="#ffffff"
          textAnchor={anchor}
        >
          {text}
        </SvgText>
      ))}
      {/* Main text */}
      <SvgText
        x={x}
        y={y}
        fontSize={fontSize}
        fontWeight="bold"
        fill={color}
        textAnchor={anchor}
      >
        {text}
      </SvgText>
    </G>
  );
}

/**
 * Shadow style text
 */
function ShadowText({
  text,
  x,
  y,
  anchor,
  fontSize,
  color,
}: {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  fontSize: number;
  color: string;
}) {
  return (
    <G>
      {/* Shadow */}
      <SvgText
        x={x + 3}
        y={y + 3}
        fontSize={fontSize}
        fontWeight="bold"
        fill="rgba(0,0,0,0.3)"
        textAnchor={anchor}
      >
        {text}
      </SvgText>
      {/* Main text */}
      <SvgText
        x={x}
        y={y}
        fontSize={fontSize}
        fontWeight="bold"
        fill={color}
        textAnchor={anchor}
      >
        {text}
      </SvgText>
    </G>
  );
}

/**
 * Gradient style text
 */
function GradientText({
  text,
  x,
  y,
  anchor,
  fontSize,
  color,
}: {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  fontSize: number;
  color: string;
}) {
  const gradientId = generateId();

  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="50%" stopColor={adjustColor(color, 30)} />
          <Stop offset="100%" stopColor={adjustColor(color, -30)} />
        </LinearGradient>
      </Defs>
      {/* Outline */}
      {[
        { dx: -1, dy: -1 },
        { dx: 1, dy: -1 },
        { dx: -1, dy: 1 },
        { dx: 1, dy: 1 },
      ].map((offset, i) => (
        <SvgText
          key={`grad_outline_${i}`}
          x={x + offset.dx}
          y={y + offset.dy}
          fontSize={fontSize}
          fontWeight="bold"
          fill="#ffffff"
          textAnchor={anchor}
        >
          {text}
        </SvgText>
      ))}
      {/* Gradient text */}
      <SvgText
        x={x}
        y={y}
        fontSize={fontSize}
        fontWeight="bold"
        fill={`url(#${gradientId})`}
        textAnchor={anchor}
      >
        {text}
      </SvgText>
    </G>
  );
}

/**
 * Main TextOverlay component
 */
export function TextOverlay({
  text,
  position = 'bottom',
  textStyle = 'default',
  fontSize = 16,
  color = '#1a1a2e',
  backgroundColor = '#ffffff',
  width = 200,
  height = 200,
}: TextOverlayProps) {
  if (!text) return null;

  const { x, y, anchor } = getPositionCoords(position, width, height, fontSize);

  switch (textStyle) {
    case 'bubble':
      return (
        <BubbleText
          text={text}
          x={x}
          y={y}
          anchor={anchor}
          fontSize={fontSize}
          color={color}
          backgroundColor={backgroundColor}
        />
      );

    case 'banner':
      return (
        <BannerText
          text={text}
          x={x}
          y={y}
          anchor={anchor}
          fontSize={fontSize}
          color={color}
          backgroundColor={backgroundColor}
          width={width}
        />
      );

    case 'comic':
      return (
        <ComicText
          text={text}
          x={x}
          y={y}
          anchor={anchor}
          fontSize={fontSize}
          color={color}
          backgroundColor={backgroundColor}
        />
      );

    case 'outline':
      return (
        <OutlineText
          text={text}
          x={x}
          y={y}
          anchor={anchor}
          fontSize={fontSize}
          color={color}
        />
      );

    case 'shadow':
      return (
        <ShadowText
          text={text}
          x={x}
          y={y}
          anchor={anchor}
          fontSize={fontSize}
          color={color}
        />
      );

    case 'gradient':
      return (
        <GradientText
          text={text}
          x={x}
          y={y}
          anchor={anchor}
          fontSize={fontSize}
          color={color}
        />
      );

    case 'default':
    default:
      return (
        <DefaultText
          text={text}
          x={x}
          y={y}
          anchor={anchor}
          fontSize={fontSize}
          color={color}
        />
      );
  }
}

/**
 * Utility to adjust color brightness
 */
function adjustColor(hex: string, amount: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  const color = hex.replace('#', '');
  const r = clamp(parseInt(color.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(color.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(color.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default TextOverlay;
