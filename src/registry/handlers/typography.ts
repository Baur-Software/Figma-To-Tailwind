/**
 * Typography Token Type Handler
 *
 * Handles composite typography tokens from Figma.
 */

import type { TypographyValue, DimensionValue, FontWeightValue } from '../../schema/tokens.js';
import type {
  TokenTypeHandler,
  VariableDefsContext,
  CssConversionOptions,
  ScssConversionOptions,
} from '../types.js';

// =============================================================================
// Typography Utilities
// =============================================================================

function formatDimension(dim: DimensionValue): string {
  return `${dim.value}${dim.unit}`;
}

function formatFontFamily(families: string[]): string {
  return families
    .map(f => (f.includes(' ') ? `"${f}"` : f))
    .join(', ');
}

/**
 * Parse a Font() string from MCP format
 * Example: Font(family: "DM Sans", style: Bold, size: 56, weight: 700, lineHeight: 64, letterSpacing: -1.5)
 */
function parseFontString(fontStr: string): TypographyValue | null {
  const match = fontStr.match(/^Font\((.*)\)$/);
  if (!match) return null;

  const result: Record<string, string | number> = {};
  const content = match[1];

  // Parse key: value pairs
  const regex = /(\w+):\s*(?:"([^"]+)"|([^,)]+))/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const key = m[1];
    const value = m[2] || m[3].trim();
    // Try to parse as number
    const numValue = parseFloat(value);
    result[key] = isNaN(numValue) ? value : numValue;
  }

  // Convert to valid font weight
  const toFontWeight = (weight: number): FontWeightValue => {
    const validWeights: readonly FontWeightValue[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    let closest: FontWeightValue = 400;
    let minDiff = Math.abs(400 - weight);
    for (const w of validWeights) {
      if (typeof w === 'number') {
        const diff = Math.abs(w - weight);
        if (diff < minDiff) {
          minDiff = diff;
          closest = w;
        }
      }
    }
    return closest;
  };

  return {
    fontFamily: result.family ? [String(result.family)] : ['sans-serif'],
    fontSize: result.size
      ? { value: result.size as number, unit: 'px' }
      : { value: 16, unit: 'px' },
    fontWeight: result.weight ? toFontWeight(result.weight as number) : 400,
    lineHeight: result.lineHeight
      ? { value: result.lineHeight as number, unit: 'px' }
      : 1.5,
    letterSpacing: result.letterSpacing
      ? { value: result.letterSpacing as number, unit: 'px' }
      : undefined,
  };
}

// =============================================================================
// Typography Handler
// =============================================================================

export const typographyHandler: TokenTypeHandler<'typography'> = {
  type: 'typography',
  name: 'Typography',
  priority: 90,

  // Typography is typically created from Figma text styles, not variables
  // So we mainly detect from variable defs format
  detectVariableDefs(context: VariableDefsContext): boolean {
    return context.value.startsWith('Font(');
  },

  parseVariableDefsValue(value: string): TypographyValue | null {
    return parseFontString(value);
  },

  toCss(value: TypographyValue, _options?: CssConversionOptions): string {
    // For CSS, return as individual properties in a CSS-like format
    const parts: string[] = [];

    parts.push(`font-family: ${formatFontFamily(value.fontFamily)}`);
    parts.push(`font-size: ${formatDimension(value.fontSize)}`);
    parts.push(`font-weight: ${value.fontWeight}`);

    if (typeof value.lineHeight === 'number') {
      parts.push(`line-height: ${value.lineHeight}`);
    } else {
      parts.push(`line-height: ${formatDimension(value.lineHeight)}`);
    }

    if (value.letterSpacing) {
      parts.push(`letter-spacing: ${formatDimension(value.letterSpacing)}`);
    }

    return parts.join('; ');
  },

  toScss(value: TypographyValue, _options?: ScssConversionOptions): string {
    // For SCSS, return as a map
    const parts: string[] = [];

    parts.push(`font-family: ${formatFontFamily(value.fontFamily)}`);
    parts.push(`font-size: ${formatDimension(value.fontSize)}`);
    parts.push(`font-weight: ${value.fontWeight}`);

    if (typeof value.lineHeight === 'number') {
      parts.push(`line-height: ${value.lineHeight}`);
    } else {
      parts.push(`line-height: ${formatDimension(value.lineHeight)}`);
    }

    if (value.letterSpacing) {
      parts.push(`letter-spacing: ${formatDimension(value.letterSpacing)}`);
    }

    return `(${parts.join(', ')})`;
  },
};
