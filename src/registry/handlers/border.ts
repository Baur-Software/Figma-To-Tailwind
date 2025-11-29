/**
 * Border Token Type Handler
 *
 * Handles border tokens from Figma.
 */

import type { BorderValue, DimensionValue, ColorValue } from '../../schema/tokens.js';
import type {
  TokenTypeHandler,
  VariableDefsContext,
  CssConversionOptions,
  TailwindNamespace,
} from '../types.js';
import { colorToRgb, parseHexColor } from './color.js';

// =============================================================================
// Border Utilities
// =============================================================================

function formatDimension(dim: DimensionValue): string {
  return `${dim.value}${dim.unit}`;
}

/**
 * Parse a border string (e.g., "1px solid #000000")
 */
function parseBorderString(value: string): BorderValue | null {
  // Match: width style color
  const match = value.match(/^(\d+(?:\.\d+)?)(px|rem|em)?\s+(solid|dashed|dotted|double|groove|ridge|inset|outset|none)\s+(#[A-Fa-f0-9]+|rgba?\([^)]+\))$/i);

  if (!match) return null;

  const width = parseFloat(match[1]);
  const unit = (match[2] as DimensionValue['unit']) || 'px';
  const style = match[3].toLowerCase() as BorderValue['style'];
  const colorStr = match[4];

  let color: ColorValue;
  if (colorStr.startsWith('#')) {
    color = parseHexColor(colorStr);
  } else {
    // Parse rgba/rgb
    const rgbMatch = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (rgbMatch) {
      color = {
        r: parseInt(rgbMatch[1], 10) / 255,
        g: parseInt(rgbMatch[2], 10) / 255,
        b: parseInt(rgbMatch[3], 10) / 255,
        a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
      };
    } else {
      color = { r: 0, g: 0, b: 0, a: 1 };
    }
  }

  return {
    width: { value: width, unit },
    style,
    color,
  };
}

// =============================================================================
// Border Handler
// =============================================================================

export const borderHandler: TokenTypeHandler<'border'> = {
  type: 'border',
  name: 'Border',
  priority: 65,
  defaultNamespace: 'border',

  detectVariableDefs(context: VariableDefsContext): boolean {
    const lowerPath = context.path.toLowerCase();

    // Check path hints
    if (lowerPath.includes('border') && !lowerPath.includes('radius')) {
      return true;
    }

    // Check value format (width style color)
    return /^\d+(?:\.\d+)?(px|rem|em)?\s+(solid|dashed|dotted|double|groove|ridge|inset|outset|none)\s+/.test(context.value);
  },

  parseVariableDefsValue(value: string): BorderValue | null {
    return parseBorderString(value);
  },

  toCss(value: BorderValue, _options?: CssConversionOptions): string {
    return `${formatDimension(value.width)} ${value.style} ${colorToRgb(value.color)}`;
  },

  getNamespace(path: string[]): TailwindNamespace | null {
    const hint = path[0]?.toLowerCase();
    if (hint === 'border' || hint === 'borders') {
      return 'border';
    }
    return null;
  },
};
