/**
 * svg-ssr-shim.tsx — Drop-in replacement for react-native-svg that renders
 * standard SVG elements via React DOM for server-side rendering.
 *
 * Only implements the subset of react-native-svg used by the Avatar components.
 */

import React, { forwardRef } from 'react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Filter out RN-specific props that aren't valid HTML/SVG attributes */
function filterProps(props: Record<string, any>): Record<string, any> {
  const {
    // RN-specific
    propList, matrix, responsible, name,
    // These shouldn't go to DOM
    children,
    ...rest
  } = props;

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(rest)) {
    // Skip functions and objects (except style which React handles)
    if (k === 'style') {
      // Convert RN style to CSS-compatible
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        out[k] = v;
      }
      continue;
    }
    if (typeof v === 'function') continue;
    if (typeof v === 'object' && v !== null) continue;
    if (v === undefined) continue;

    // Map RN SVG prop names to standard SVG
    const mapped = mapPropName(k);
    if (mapped) {
      out[mapped] = v;
    }
  }

  return out;
}

function mapPropName(name: string): string | null {
  const map: Record<string, string> = {
    // Standard pass-through
    cx: 'cx', cy: 'cy', r: 'r', rx: 'rx', ry: 'ry',
    x: 'x', y: 'y', x1: 'x1', y1: 'y1', x2: 'x2', y2: 'y2',
    width: 'width', height: 'height',
    d: 'd', fill: 'fill', stroke: 'stroke',
    opacity: 'opacity', transform: 'transform',
    viewBox: 'viewBox', preserveAspectRatio: 'preserveAspectRatio',
    id: 'id', clipPath: 'clipPath',
    points: 'points', offset: 'offset',
    fx: 'fx', fy: 'fy',
    gradientUnits: 'gradientUnits',
    // Hyphenated SVG attributes
    'stroke-width': 'strokeWidth',
    'stroke-linecap': 'strokeLinecap',
    'stroke-linejoin': 'strokeLinejoin',
    'stroke-dasharray': 'strokeDasharray',
    'stroke-dashoffset': 'strokeDashoffset',
    'stroke-miterlimit': 'strokeMiterlimit',
    'clip-path': 'clipPath',
    'clip-rule': 'clipRule',
    'fill-rule': 'fillRule',
    'fill-opacity': 'fillOpacity',
    'stroke-opacity': 'strokeOpacity',
    'font-size': 'fontSize',
    'font-family': 'fontFamily',
    'font-weight': 'fontWeight',
    'text-anchor': 'textAnchor',
    // React camelCase versions
    strokeWidth: 'strokeWidth',
    strokeLinecap: 'strokeLinecap',
    strokeLinejoin: 'strokeLinejoin',
    strokeDasharray: 'strokeDasharray',
    strokeDashoffset: 'strokeDashoffset',
    strokeMiterlimit: 'strokeMiterlimit',
    clipRule: 'clipRule',
    fillRule: 'fillRule',
    fillOpacity: 'fillOpacity',
    strokeOpacity: 'strokeOpacity',
    fontSize: 'fontSize',
    fontFamily: 'fontFamily',
    fontWeight: 'fontWeight',
    textAnchor: 'textAnchor',
    stopColor: 'stopColor',
    stopOpacity: 'stopOpacity',
    gradientTransform: 'gradientTransform',
    patternUnits: 'patternUnits',
    patternTransform: 'patternTransform',
    xlinkHref: 'xlinkHref',
    href: 'href',
    focusable: 'focusable',
    origin: 'origin',
  };
  return map[name] ?? (name.match(/^[a-z]/) ? name : null);
}

// ---------------------------------------------------------------------------
// SVG element factories
// ---------------------------------------------------------------------------

function makeSvgElement(tag: string) {
  return forwardRef<any, any>(function SvgEl(props: any, ref: any) {
    const { children, ...rest } = props;
    const filtered = filterProps(rest);
    return React.createElement(tag, { ...filtered, ref }, children);
  });
}

// Main Svg component needs special handling for viewBox
const SvgComponent = forwardRef<any, any>(function Svg(props: any, ref: any) {
  const {
    children, width, height, viewBox, style,
    // Filter out RN-specific
    focusable, bbWidth, bbHeight, minX, minY, vbWidth, vbHeight,
    align, meetOrSlice, color, ...rest
  } = props;

  const svgProps: Record<string, any> = {
    xmlns: 'http://www.w3.org/2000/svg',
    ref,
  };

  if (width !== undefined) svgProps.width = width;
  if (height !== undefined) svgProps.height = height;
  if (viewBox) svgProps.viewBox = viewBox;
  if (rest.preserveAspectRatio) svgProps.preserveAspectRatio = rest.preserveAspectRatio;

  // Pass through valid SVG attributes
  for (const [k, v] of Object.entries(filterProps(rest))) {
    svgProps[k] = v;
  }

  return React.createElement('svg', svgProps, children);
});

// G component needs to handle clip-path specially
const GComponent = forwardRef<any, any>(function G(props: any, ref: any) {
  const { children, clipPath, ...rest } = props;
  const filtered = filterProps(rest);
  if (clipPath) {
    filtered.clipPath = clipPath.startsWith('url(') ? clipPath : `url(#${clipPath})`;
  }
  return React.createElement('g', { ...filtered, ref }, children);
});

// ClipPath needs id from 'name' prop
const ClipPathComponent = forwardRef<any, any>(function ClipPathEl(props: any, ref: any) {
  const { children, name, id, ...rest } = props;
  const filtered = filterProps(rest);
  return React.createElement('clipPath', { ...filtered, id: id || name, ref }, children);
});

// Gradient components
const LinearGradientComponent = forwardRef<any, any>(function LG(props: any, ref: any) {
  const { children, name, id, ...rest } = props;
  const filtered = filterProps(rest);
  return React.createElement('linearGradient', { ...filtered, id: id || name, ref }, children);
});

const RadialGradientComponent = forwardRef<any, any>(function RG(props: any, ref: any) {
  const { children, name, id, ...rest } = props;
  const filtered = filterProps(rest);
  return React.createElement('radialGradient', { ...filtered, id: id || name, ref }, children);
});

// ---------------------------------------------------------------------------
// Exports matching react-native-svg's API
// ---------------------------------------------------------------------------

export const Svg = SvgComponent;
export default SvgComponent;
export const G = GComponent;
export const Circle = makeSvgElement('circle');
export const Rect = makeSvgElement('rect');
export const Path = makeSvgElement('path');
export const Line = makeSvgElement('line');
export const Polyline = makeSvgElement('polyline');
export const Polygon = makeSvgElement('polygon');
export const Ellipse = makeSvgElement('ellipse');
export const Text = makeSvgElement('text');
export const TSpan = makeSvgElement('tspan');
export const Defs = makeSvgElement('defs');
export const ClipPath = ClipPathComponent;
export const LinearGradient = LinearGradientComponent;
export const RadialGradient = RadialGradientComponent;
export const Stop = makeSvgElement('stop');
export const Use = makeSvgElement('use');
export const Symbol = makeSvgElement('symbol');
export const Pattern = makeSvgElement('pattern');
export const Mask = makeSvgElement('mask');
export const Marker = makeSvgElement('marker');
export const ForeignObject = makeSvgElement('foreignObject');
export const Image = makeSvgElement('image');
