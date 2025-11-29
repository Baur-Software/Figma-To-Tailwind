/**
 * Shadow Token Type Handler
 *
 * Handles shadow tokens (box-shadow, drop-shadow) from Figma.
 */

import type { ShadowValue, DimensionValue, ColorValue } from '../../schema/tokens.js';
import type {
  TokenTypeHandler,
  VariableDefsContext,
  CssConversionOptions,
  TailwindNamespace,
} from '../types.js';
import { colorToRgb, parseHexColor } from './color.js';

// =============================================================================
// Shadow Utilities
// =============================================================================

function formatDimension(dim: DimensionValue): string {
  return `${dim.value}${dim.unit}`;
}

/**
 * Parse an Effect() string from MCP format
 * Example: Effect(type: DROP_SHADOW, color: #1D293D05, offset: (0, 1), radius: 0.5, spread: 0.05)
 */
function parseEffectString(effectStr: string): ShadowValue | null {
  const match = effectStr.match(/^Effect\((.*)\)$/);
  if (!match) return null;

  const content = match[1];

  // Parse type
  const typeMatch = content.match(/type:\s*(\w+)/);
  const isInset = typeMatch?.[1] === 'INNER_SHADOW';

  // Parse color
  const colorMatch = content.match(/color:\s*(#[A-Fa-f0-9]+)/);
  let color: ColorValue = { r: 0, g: 0, b: 0, a: 0.1 };
  if (colorMatch) {
    color = parseHexColor(colorMatch[1]);
  }

  // Parse offset (x, y)
  const offsetMatch = content.match(/offset:\s*\(([^)]+)\)/);
  let offsetX = 0;
  let offsetY = 0;
  if (offsetMatch) {
    const parts = offsetMatch[1].split(',').map((s: string) => parseFloat(s.trim()));
    offsetX = parts[0] || 0;
    offsetY = parts[1] || 0;
  }

  // Parse radius (blur)
  const radiusMatch = content.match(/radius:\s*([\d.]+)/);
  const blur = radiusMatch ? parseFloat(radiusMatch[1]) : 0;

  // Parse spread
  const spreadMatch = content.match(/spread:\s*([\d.]+)/);
  const spread = spreadMatch ? parseFloat(spreadMatch[1]) : undefined;

  return {
    offsetX: { value: offsetX, unit: 'px' },
    offsetY: { value: offsetY, unit: 'px' },
    blur: { value: blur, unit: 'px' },
    spread: spread !== undefined ? { value: spread, unit: 'px' } : undefined,
    color,
    inset: isInset || undefined,
  };
}

function shadowToCss(shadow: ShadowValue): string {
  const parts: string[] = [];

  if (shadow.inset) {
    parts.push('inset');
  }

  parts.push(formatDimension(shadow.offsetX));
  parts.push(formatDimension(shadow.offsetY));
  parts.push(formatDimension(shadow.blur));

  if (shadow.spread) {
    parts.push(formatDimension(shadow.spread));
  }

  parts.push(colorToRgb(shadow.color));

  return parts.join(' ');
}

// =============================================================================
// Shadow Handler
// =============================================================================

export const shadowHandler: TokenTypeHandler<'shadow'> = {
  type: 'shadow',
  name: 'Shadow',
  priority: 85,
  defaultNamespace: 'shadow',

  detectVariableDefs(context: VariableDefsContext): boolean {
    const lowerPath = context.path.toLowerCase();

    // Check path hints
    if (lowerPath.includes('shadow') || lowerPath.includes('elevation')) {
      return true;
    }

    // Check value format
    return context.value.startsWith('Effect(');
  },

  parseVariableDefsValue(value: string): ShadowValue | ShadowValue[] | null {
    if (!value.startsWith('Effect(')) return null;
    return parseEffectString(value);
  },

  toCss(value: ShadowValue | ShadowValue[], _options?: CssConversionOptions): string {
    if (Array.isArray(value)) {
      return value.map(shadowToCss).join(', ');
    }
    return shadowToCss(value);
  },

  getNamespace(path: string[]): TailwindNamespace | null {
    const hint = path[0]?.toLowerCase();
    if (hint === 'shadows' || hint === 'shadow' || hint === 'elevation') {
      return 'shadow';
    }
    return null;
  },
};
