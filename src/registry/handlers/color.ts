/**
 * Color Token Type Handler
 *
 * Handles color tokens from Figma and converts to CSS/SCSS.
 */

import type { ColorValue } from '../../schema/tokens.js';
import type {
  TokenTypeHandler,
  FigmaDetectionContext,
  VariableDefsContext,
  CssConversionOptions,
  ScssConversionOptions,
  TailwindNamespace,
} from '../types.js';

// =============================================================================
// Color Conversion Utilities
// =============================================================================

export function colorToHex(color: ColorValue): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  if (color.a < 1) {
    const a = Math.round(color.a * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
  }

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function colorToRgb(color: ColorValue): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  if (color.a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(2)})`;
  }

  return `rgb(${r}, ${g}, ${b})`;
}

export function colorToOklch(color: ColorValue): string {
  // Convert sRGB to linear RGB
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const lr = toLinear(color.r);
  const lg = toLinear(color.g);
  const lb = toLinear(color.b);

  // Linear RGB to XYZ
  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
  const z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb;

  // XYZ to LMS
  const l = 0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z;
  const m = 0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z;
  const s = 0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z;

  // LMS to Oklab
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bVal = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  // Oklab to Oklch
  const C = Math.sqrt(a * a + bVal * bVal);
  let H = Math.atan2(bVal, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  const lightness = (L * 100).toFixed(2);
  const chroma = C.toFixed(4);
  const hue = H.toFixed(2);

  if (color.a < 1) {
    return `oklch(${lightness}% ${chroma} ${hue} / ${color.a.toFixed(2)})`;
  }

  return `oklch(${lightness}% ${chroma} ${hue})`;
}

export function colorToHsl(color: ColorValue): string {
  const r = color.r;
  const g = color.g;
  const b = color.b;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  if (color.a < 1) {
    return `hsla(${hDeg}, ${sPercent}%, ${lPercent}%, ${color.a.toFixed(2)})`;
  }
  return `hsl(${hDeg}, ${sPercent}%, ${lPercent}%)`;
}

export function parseHexColor(hex: string): ColorValue {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
  const a = cleanHex.length === 8 ? parseInt(cleanHex.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

/**
 * Convert color to RGB triplet (for Ionic --ion-color-*-rgb variables)
 */
export function colorToRgbTriplet(color: ColorValue): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `${r}, ${g}, ${b}`;
}

// =============================================================================
// Color Handler
// =============================================================================

export const colorHandler: TokenTypeHandler<'color'> = {
  type: 'color',
  name: 'Color',
  priority: 100,
  defaultNamespace: 'color',

  detectFigma(context: FigmaDetectionContext): boolean {
    return context.resolvedType === 'COLOR';
  },

  detectVariableDefs(context: VariableDefsContext): boolean {
    // Check path hints
    const lowerPath = context.path.toLowerCase();
    if (lowerPath.includes('color') || lowerPath.includes('foundation')) {
      return context.value.startsWith('#');
    }

    // Check value format
    return context.value.startsWith('#') && !context.value.includes('gradient');
  },

  parseFigmaValue(value: unknown): ColorValue {
    const rgba = value as { r: number; g: number; b: number; a: number };
    return {
      r: rgba.r,
      g: rgba.g,
      b: rgba.b,
      a: rgba.a,
    };
  },

  parseVariableDefsValue(value: string): ColorValue | null {
    if (!value.startsWith('#')) return null;
    try {
      return parseHexColor(value);
    } catch {
      return null;
    }
  },

  toCss(value: ColorValue, options?: CssConversionOptions): string {
    const format = options?.colorFormat ?? 'hex';
    switch (format) {
      case 'rgb':
        return colorToRgb(value);
      case 'oklch':
        return colorToOklch(value);
      default:
        return colorToHex(value);
    }
  },

  toScss(value: ColorValue, options?: ScssConversionOptions): string {
    const format = options?.colorFormat ?? 'hex';
    switch (format) {
      case 'rgb':
        return colorToRgb(value);
      case 'hsl':
        return colorToHsl(value);
      default:
        return colorToHex(value);
    }
  },

  getNamespace(path: string[]): TailwindNamespace | null {
    const hint = path[0]?.toLowerCase();
    if (hint === 'colors' || hint === 'color') {
      return 'color';
    }
    return null;
  },
};
