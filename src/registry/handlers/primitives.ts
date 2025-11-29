/**
 * Primitive Token Type Handlers
 *
 * Handles basic token types: string, number, boolean
 */

import type { TokenTypeHandler, FigmaDetectionContext } from '../types.js';

// =============================================================================
// String Handler
// =============================================================================

export const stringHandler: TokenTypeHandler<'string'> = {
  type: 'string',
  name: 'String',
  priority: 10, // Low priority - fallback type

  detectFigma(context: FigmaDetectionContext): boolean {
    return context.resolvedType === 'STRING' && !context.scopes.includes('FONT_FAMILY');
  },

  parseFigmaValue(value: unknown): string {
    return String(value);
  },

  parseVariableDefsValue(value: string): string {
    return value;
  },

  toCss(value: string): string {
    // Quote if contains spaces
    if (value.includes(' ') && !value.startsWith('"') && !value.startsWith("'")) {
      return `"${value}"`;
    }
    return value;
  },
};

// =============================================================================
// Number Handler
// =============================================================================

export const numberHandler: TokenTypeHandler<'number'> = {
  type: 'number',
  name: 'Number',
  priority: 20,

  detectFigma(context: FigmaDetectionContext): boolean {
    if (context.resolvedType !== 'FLOAT') return false;

    // Only match if no dimension/fontWeight scopes
    const dimensionScopes = [
      'CORNER_RADIUS', 'WIDTH_HEIGHT', 'GAP', 'STROKE_FLOAT',
      'FONT_SIZE', 'LINE_HEIGHT', 'LETTER_SPACING', 'FONT_WEIGHT',
    ];

    return !context.scopes.some(s => dimensionScopes.includes(s));
  },

  parseFigmaValue(value: unknown): number {
    return value as number;
  },

  parseVariableDefsValue(value: string): number | null {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  },

  toCss(value: number): string {
    return value.toString();
  },
};

// =============================================================================
// Boolean Handler
// =============================================================================

export const booleanHandler: TokenTypeHandler<'boolean'> = {
  type: 'boolean',
  name: 'Boolean',
  priority: 50,

  detectFigma(context: FigmaDetectionContext): boolean {
    return context.resolvedType === 'BOOLEAN';
  },

  parseFigmaValue(value: unknown): boolean {
    return Boolean(value);
  },

  parseVariableDefsValue(value: string): boolean | null {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
  },

  toCss(value: boolean): string {
    return value.toString();
  },
};
