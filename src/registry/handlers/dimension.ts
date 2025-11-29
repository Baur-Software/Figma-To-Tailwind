/**
 * Dimension Token Type Handler
 *
 * Handles dimension tokens (spacing, radius, sizes) from Figma.
 */

import type { DimensionValue } from '../../schema/tokens.js';
import type {
  TokenTypeHandler,
  FigmaDetectionContext,
  VariableDefsContext,
  TailwindNamespace,
} from '../types.js';

// =============================================================================
// Dimension Utilities
// =============================================================================

/** Figma scopes that indicate a dimension */
const DIMENSION_SCOPES = [
  'CORNER_RADIUS',
  'WIDTH_HEIGHT',
  'GAP',
  'STROKE_FLOAT',
  'FONT_SIZE',
  'LINE_HEIGHT',
  'LETTER_SPACING',
  'PARAGRAPH_SPACING',
  'PARAGRAPH_INDENT',
];

export function dimensionToCss(dim: DimensionValue): string {
  return `${dim.value}${dim.unit}`;
}

export function pxToRem(px: number, baseFontSize: number = 16): string {
  return `${px / baseFontSize}rem`;
}

// =============================================================================
// Dimension Handler
// =============================================================================

export const dimensionHandler: TokenTypeHandler<'dimension'> = {
  type: 'dimension',
  name: 'Dimension',
  priority: 80,
  defaultNamespace: 'spacing',

  detectFigma(context: FigmaDetectionContext): boolean {
    if (context.resolvedType !== 'FLOAT') return false;

    // Check if any dimension scope matches
    return context.scopes.some(scope => DIMENSION_SCOPES.includes(scope));
  },

  detectVariableDefs(context: VariableDefsContext): boolean {
    const lowerPath = context.path.toLowerCase();

    // Check path hints
    if (
      lowerPath.includes('spacing') ||
      lowerPath.includes('radius') ||
      lowerPath.includes('gap') ||
      lowerPath.includes('size') ||
      lowerPath.includes('width') ||
      lowerPath.includes('height')
    ) {
      return true;
    }

    // Check value format (number with optional px)
    return /^\d+(\.\d+)?(px)?$/.test(context.value);
  },

  parseFigmaValue(value: unknown, scopes: string[]): DimensionValue {
    const numValue = value as number;

    // Determine if this is a dimension based on scopes
    const isDimension = scopes.some(scope => DIMENSION_SCOPES.includes(scope));

    if (isDimension) {
      return {
        value: numValue,
        unit: 'px',
      };
    }

    // Default to px
    return {
      value: numValue,
      unit: 'px',
    };
  },

  parseVariableDefsValue(value: string): DimensionValue | null {
    const match = value.match(/^(\d+(?:\.\d+)?)(px)?$/);
    if (!match) return null;

    return {
      value: parseFloat(match[1]),
      unit: 'px',
    };
  },

  toCss(value: DimensionValue): string {
    return dimensionToCss(value);
  },

  getNamespace(path: string[]): TailwindNamespace | null {
    const hint = path[0]?.toLowerCase();

    if (hint === 'spacing' || hint === 'space') {
      return 'spacing';
    }
    if (hint === 'radius' || hint === 'border-radius' || hint === 'radii') {
      return 'radius';
    }
    if (hint === 'font' || hint === 'typography') {
      // Check nested path for specific typography dimensions
      if (path.some(p => p.includes('size'))) return 'font-size';
      if (path.some(p => p.includes('height') || p.includes('leading'))) return 'line-height';
      if (path.some(p => p.includes('spacing') || p.includes('tracking'))) return 'letter-spacing';
    }

    return null;
  },
};
