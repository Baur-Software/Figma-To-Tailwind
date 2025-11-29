/**
 * Gradient Token Type Handler
 *
 * Handles gradient tokens from Figma.
 */

import type { GradientValue, GradientStop, ColorValue } from '../../schema/tokens.js';
import type {
  TokenTypeHandler,
  VariableDefsContext,
  CssConversionOptions,
  TailwindNamespace,
} from '../types.js';
import { colorToRgb, parseHexColor } from './color.js';

// =============================================================================
// Gradient Utilities
// =============================================================================

/**
 * Parse a CSS gradient string
 * Supports: linear-gradient, radial-gradient, conic-gradient
 */
function parseGradientString(value: string): GradientValue | null {
  // Match gradient type
  const typeMatch = value.match(/^(linear|radial|conic)-gradient\s*\(/);
  if (!typeMatch) return null;

  const type = typeMatch[1] as 'linear' | 'radial' | 'conic';
  const content = value.slice(typeMatch[0].length, -1); // Remove "xxx-gradient(" and ")"

  // Parse angle for linear gradients
  let angle: number | undefined;
  let stopsStr = content;

  if (type === 'linear') {
    const angleMatch = content.match(/^(\d+(?:\.\d+)?)(deg|turn|rad|grad)?\s*,\s*/);
    if (angleMatch) {
      const angleValue = parseFloat(angleMatch[1]);
      const unit = angleMatch[2] || 'deg';

      // Convert to degrees
      switch (unit) {
        case 'turn':
          angle = angleValue * 360;
          break;
        case 'rad':
          angle = angleValue * (180 / Math.PI);
          break;
        case 'grad':
          angle = angleValue * 0.9;
          break;
        default:
          angle = angleValue;
      }

      stopsStr = content.slice(angleMatch[0].length);
    }
  }

  // Parse color stops
  const stops: GradientStop[] = [];
  const stopRegex = /(#[A-Fa-f0-9]+|rgba?\([^)]+\)|[a-z]+)\s*(\d+(?:\.\d+)?%)?/gi;
  let match;

  while ((match = stopRegex.exec(stopsStr)) !== null) {
    const colorStr = match[1];
    const positionStr = match[2];

    let color: ColorValue;
    if (colorStr.startsWith('#')) {
      color = parseHexColor(colorStr);
    } else if (colorStr.startsWith('rgb')) {
      const rgbMatch = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
      if (rgbMatch) {
        color = {
          r: parseInt(rgbMatch[1], 10) / 255,
          g: parseInt(rgbMatch[2], 10) / 255,
          b: parseInt(rgbMatch[3], 10) / 255,
          a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
        };
      } else {
        continue;
      }
    } else {
      // Named color - skip for now
      continue;
    }

    const position = positionStr
      ? parseFloat(positionStr) / 100
      : stops.length === 0 ? 0 : 1;

    stops.push({ color, position });
  }

  if (stops.length === 0) return null;

  return {
    type,
    angle,
    stops,
  };
}

/**
 * Parse Figma gradient data
 */
function parseFigmaGradient(value: unknown): GradientValue | null {
  const gradient = value as {
    type?: string;
    gradientHandlePositions?: Array<{ x: number; y: number }>;
    gradientStops?: Array<{
      color: { r: number; g: number; b: number; a: number };
      position: number;
    }>;
  };

  if (!gradient.gradientStops || gradient.gradientStops.length === 0) {
    return null;
  }

  // Determine gradient type
  let type: 'linear' | 'radial' | 'conic' = 'linear';
  if (gradient.type === 'GRADIENT_RADIAL') {
    type = 'radial';
  } else if (gradient.type === 'GRADIENT_ANGULAR') {
    type = 'conic';
  }

  // Calculate angle from handle positions
  let angle: number | undefined;
  if (type === 'linear' && gradient.gradientHandlePositions && gradient.gradientHandlePositions.length >= 2) {
    const p1 = gradient.gradientHandlePositions[0];
    const p2 = gradient.gradientHandlePositions[1];
    angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
    // Convert to CSS angle (0deg = to top)
    angle = (angle + 90) % 360;
    if (angle < 0) angle += 360;
  }

  // Convert stops
  const stops: GradientStop[] = gradient.gradientStops.map(stop => ({
    color: {
      r: stop.color.r,
      g: stop.color.g,
      b: stop.color.b,
      a: stop.color.a,
    },
    position: stop.position,
  }));

  return {
    type,
    angle,
    stops,
  };
}

// =============================================================================
// Gradient Handler
// =============================================================================

export const gradientHandler: TokenTypeHandler<'gradient'> = {
  type: 'gradient',
  name: 'Gradient',
  priority: 85,
  defaultNamespace: 'gradient',

  detectVariableDefs(context: VariableDefsContext): boolean {
    const lowerPath = context.path.toLowerCase();

    // Check path hints
    if (lowerPath.includes('gradient')) {
      return true;
    }

    // Check value format
    return /^(linear|radial|conic)-gradient\s*\(/.test(context.value);
  },

  parseFigmaValue(value: unknown): GradientValue {
    const result = parseFigmaGradient(value);
    if (!result) {
      // Return a default gradient
      return {
        type: 'linear',
        angle: 0,
        stops: [
          { color: { r: 0, g: 0, b: 0, a: 1 }, position: 0 },
          { color: { r: 1, g: 1, b: 1, a: 1 }, position: 1 },
        ],
      };
    }
    return result;
  },

  parseVariableDefsValue(value: string): GradientValue | null {
    return parseGradientString(value);
  },

  toCss(value: GradientValue, _options?: CssConversionOptions): string {
    const stops = value.stops
      .map(stop => `${colorToRgb(stop.color)} ${(stop.position * 100).toFixed(1)}%`)
      .join(', ');

    switch (value.type) {
      case 'linear':
        return `linear-gradient(${value.angle || 0}deg, ${stops})`;
      case 'radial':
        return `radial-gradient(${stops})`;
      case 'conic':
        return `conic-gradient(${stops})`;
      default:
        return `linear-gradient(${stops})`;
    }
  },

  getNamespace(path: string[]): TailwindNamespace | null {
    const hint = path[0]?.toLowerCase();
    if (hint === 'gradient' || hint === 'gradients') {
      return 'gradient';
    }
    return null;
  },
};
