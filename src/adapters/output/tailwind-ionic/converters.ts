/**
 * Value Converters
 *
 * Convert normalized token values to CSS-compatible strings
 * for Tailwind and Ionic output.
 *
 * Note: This module re-exports utilities from the TokenTypeRegistry handlers
 * for backward compatibility. New code should use the registry directly.
 */

import type {
  FontWeightValue,
  DurationValue,
  CubicBezierValue,
  ShadowValue,
  BorderValue,
  GradientValue,
  TransitionValue,
  Token,
  TokenType,
  TokenReference,
} from '../../../schema/tokens.js';
import { isTokenReference } from '../../../schema/tokens.js';
import { tokenTypeRegistry } from '../../../registry/index.js';

// Re-export utilities from registry handlers for backward compatibility
export {
  colorToHex,
  colorToRgb,
  colorToOklch,
  colorToRgbTriplet,
} from '../../../registry/handlers/color.js';
export { dimensionToCss, pxToRem } from '../../../registry/handlers/dimension.js';

// Import locally used utilities
import { colorToRgb } from '../../../registry/handlers/color.js';
import { dimensionToCss } from '../../../registry/handlers/dimension.js';

// =============================================================================
// Legacy Color/Dimension Converters (now provided by registry handlers)
// =============================================================================

// The following functions are re-exported from registry handlers above:
// - colorToHex, colorToRgb, colorToOklch, colorToRgbTriplet
// - dimensionToCss, pxToRem

// =============================================================================
// Typography Converters
// =============================================================================

/**
 * Convert FontWeightValue to CSS string
 */
export function fontWeightToCss(weight: FontWeightValue): string {
  if (typeof weight === 'number') {
    return weight.toString();
  }

  const weightMap: Record<string, string> = {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  };

  return weightMap[weight] || '400';
}

/**
 * Convert font family array to CSS string
 */
export function fontFamilyToCss(families: string[]): string {
  return families
    .map(f => (f.includes(' ') ? `"${f}"` : f))
    .join(', ');
}

// =============================================================================
// Duration and Timing Converters
// =============================================================================

/**
 * Convert DurationValue to CSS string
 */
export function durationToCss(duration: DurationValue): string {
  return `${duration.value}${duration.unit}`;
}

/**
 * Convert CubicBezierValue to CSS string
 */
export function cubicBezierToCss(bezier: CubicBezierValue): string {
  return `cubic-bezier(${bezier.x1}, ${bezier.y1}, ${bezier.x2}, ${bezier.y2})`;
}

// =============================================================================
// Shadow Converters
// =============================================================================

/**
 * Convert ShadowValue to CSS string
 */
export function shadowToCss(shadow: ShadowValue): string {
  const parts: string[] = [];

  if (shadow.inset) {
    parts.push('inset');
  }

  parts.push(dimensionToCss(shadow.offsetX));
  parts.push(dimensionToCss(shadow.offsetY));
  parts.push(dimensionToCss(shadow.blur));

  if (shadow.spread) {
    parts.push(dimensionToCss(shadow.spread));
  }

  parts.push(colorToRgb(shadow.color));

  return parts.join(' ');
}

/**
 * Convert array of shadows to CSS string
 */
export function shadowsToCss(shadows: ShadowValue | ShadowValue[]): string {
  if (Array.isArray(shadows)) {
    return shadows.map(shadowToCss).join(', ');
  }
  return shadowToCss(shadows);
}

// =============================================================================
// Border Converters
// =============================================================================

/**
 * Convert BorderValue to CSS string
 */
export function borderToCss(border: BorderValue): string {
  return `${dimensionToCss(border.width)} ${border.style} ${colorToRgb(border.color)}`;
}

// =============================================================================
// Gradient Converters
// =============================================================================

/**
 * Convert GradientValue to CSS string
 */
export function gradientToCss(gradient: GradientValue): string {
  const stops = gradient.stops
    .map(stop => `${colorToRgb(stop.color)} ${(stop.position * 100).toFixed(1)}%`)
    .join(', ');

  switch (gradient.type) {
    case 'linear':
      return `linear-gradient(${gradient.angle || 0}deg, ${stops})`;
    case 'radial':
      return `radial-gradient(${stops})`;
    case 'conic':
      return `conic-gradient(${stops})`;
    default:
      return `linear-gradient(${stops})`;
  }
}

// =============================================================================
// Transition Converters
// =============================================================================

/**
 * Convert TransitionValue to CSS string
 */
export function transitionToCss(transition: TransitionValue): string {
  const timing = typeof transition.timingFunction === 'string'
    ? transition.timingFunction
    : cubicBezierToCss(transition.timingFunction);

  const parts = [durationToCss(transition.duration), timing];

  if (transition.delay) {
    parts.push(durationToCss(transition.delay));
  }

  return parts.join(' ');
}

// =============================================================================
// Generic Token Value Converter
// =============================================================================

/**
 * Convert a token reference to CSS var() syntax
 */
export function referenceToVar(ref: TokenReference, prefix: string = ''): string {
  // Convert reference path to CSS variable name
  // e.g., "{colors.primary.500}" -> "var(--colors-primary-500)"
  const path = ref.$ref
    .replace(/^\{/, '')
    .replace(/\}$/, '')
    .replace(/\./g, '-');

  return `var(--${prefix}${path})`;
}

/**
 * Convert any token value to CSS string
 *
 * This function uses the TokenTypeRegistry for extensible token conversion.
 * New token types added to the registry will automatically be supported.
 */
export function tokenValueToCss(
  token: Token<TokenType>,
  options: { prefix?: string; colorFormat?: 'hex' | 'rgb' | 'oklch' } = {}
): string {
  const { prefix = '', colorFormat = 'hex' } = options;

  // Handle references
  if (isTokenReference(token.$value)) {
    return referenceToVar(token.$value, prefix);
  }

  // Use the registry for type-safe conversion
  return tokenTypeRegistry.toCss(token.$type, token.$value, {
    prefix,
    colorFormat,
  });
}
