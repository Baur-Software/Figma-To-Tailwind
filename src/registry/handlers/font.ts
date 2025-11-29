/**
 * Font Token Type Handlers
 *
 * Handles fontFamily and fontWeight tokens.
 */

import type { FontWeightValue } from '../../schema/tokens.js';
import type {
  TokenTypeHandler,
  FigmaDetectionContext,
  VariableDefsContext,
  TailwindNamespace,
} from '../types.js';

// =============================================================================
// Font Family Handler
// =============================================================================

export const fontFamilyHandler: TokenTypeHandler<'fontFamily'> = {
  type: 'fontFamily',
  name: 'Font Family',
  priority: 70,
  defaultNamespace: 'font-family',

  detectFigma(context: FigmaDetectionContext): boolean {
    return (
      context.resolvedType === 'STRING' &&
      context.scopes.includes('FONT_FAMILY')
    );
  },

  detectVariableDefs(context: VariableDefsContext): boolean {
    const lowerPath = context.path.toLowerCase();

    // Check path hints for font family
    if (lowerPath.includes('font') && lowerPath.includes('family')) {
      return true;
    }

    // Font family values are plain strings (not Font(), not hex, not numbers)
    if (
      !context.value.startsWith('Font(') &&
      !context.value.startsWith('#') &&
      !context.value.startsWith('Effect(') &&
      !/^\d+(\.\d+)?(px)?$/.test(context.value) &&
      lowerPath.includes('font')
    ) {
      return true;
    }

    return false;
  },

  parseFigmaValue(value: unknown): string[] {
    // Font family comes as a string but should be an array
    const fontString = String(value);
    // Split by comma if multiple fonts, otherwise return as single-item array
    if (fontString.includes(',')) {
      return fontString.split(',').map(f => f.trim().replace(/^["']|["']$/g, ''));
    }
    return [fontString];
  },

  parseVariableDefsValue(value: string): string[] | null {
    if (!value) return null;
    // Handle comma-separated font stacks
    if (value.includes(',')) {
      return value.split(',').map(f => f.trim().replace(/^["']|["']$/g, ''));
    }
    return [value.replace(/^["']|["']$/g, '')];
  },

  toCss(value: string[]): string {
    return value
      .map(f => (f.includes(' ') ? `"${f}"` : f))
      .join(', ');
  },

  getNamespace(_path: string[]): TailwindNamespace {
    return 'font-family';
  },
};

// =============================================================================
// Font Weight Handler
// =============================================================================

const WEIGHT_MAP: Record<string, string> = {
  thin: '100',
  hairline: '100',
  extralight: '200',
  ultralight: '200',
  light: '300',
  normal: '400',
  regular: '400',
  medium: '500',
  semibold: '600',
  demibold: '600',
  bold: '700',
  extrabold: '800',
  ultrabold: '800',
  black: '900',
  heavy: '900',
};

export const fontWeightHandler: TokenTypeHandler<'fontWeight'> = {
  type: 'fontWeight',
  name: 'Font Weight',
  priority: 75,
  defaultNamespace: 'font-weight',

  detectFigma(context: FigmaDetectionContext): boolean {
    return (
      context.resolvedType === 'FLOAT' &&
      context.scopes.includes('FONT_WEIGHT')
    );
  },

  parseFigmaValue(value: unknown): FontWeightValue {
    const numValue = value as number;
    // Round to nearest valid weight
    const validWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
    let closest: FontWeightValue = 400;
    let minDiff = Math.abs(400 - numValue);

    for (const w of validWeights) {
      const diff = Math.abs(w - numValue);
      if (diff < minDiff) {
        minDiff = diff;
        closest = w;
      }
    }

    return closest;
  },

  parseVariableDefsValue(value: string): FontWeightValue | null {
    // Try parsing as number
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      const validWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
      let closest: FontWeightValue = 400;
      let minDiff = Math.abs(400 - num);

      for (const w of validWeights) {
        const diff = Math.abs(w - num);
        if (diff < minDiff) {
          minDiff = diff;
          closest = w;
        }
      }

      return closest;
    }

    // Try parsing as keyword
    const lowerValue = value.toLowerCase();
    if (lowerValue in WEIGHT_MAP) {
      return parseInt(WEIGHT_MAP[lowerValue], 10) as FontWeightValue;
    }

    return null;
  },

  toCss(value: FontWeightValue): string {
    if (typeof value === 'number') {
      return value.toString();
    }

    return WEIGHT_MAP[value] || '400';
  },

  getNamespace(_path: string[]): TailwindNamespace {
    return 'font-weight';
  },
};
