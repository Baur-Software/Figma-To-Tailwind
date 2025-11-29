/**
 * Timing Token Type Handlers
 *
 * Handles duration, cubicBezier, and transition tokens.
 */

import type {
  DurationValue,
  CubicBezierValue,
  TransitionValue,
} from '../../schema/tokens.js';
import type {
  TokenTypeHandler,
  TailwindNamespace,
} from '../types.js';

// =============================================================================
// Duration Handler
// =============================================================================

export const durationHandler: TokenTypeHandler<'duration'> = {
  type: 'duration',
  name: 'Duration',
  priority: 60,
  defaultNamespace: 'transition-duration',

  parseFigmaValue(value: unknown): DurationValue {
    const numValue = value as number;
    // Figma typically uses milliseconds
    return {
      value: numValue,
      unit: 'ms',
    };
  },

  parseVariableDefsValue(value: string): DurationValue | null {
    const match = value.match(/^(\d+(?:\.\d+)?)(ms|s)?$/);
    if (!match) return null;

    return {
      value: parseFloat(match[1]),
      unit: (match[2] as 'ms' | 's') || 'ms',
    };
  },

  toCss(value: DurationValue): string {
    return `${value.value}${value.unit}`;
  },

  getNamespace(path: string[]): TailwindNamespace | null {
    const hint = path[0]?.toLowerCase();
    if (hint === 'duration' || hint === 'timing' || hint === 'animation') {
      return 'transition-duration';
    }
    return null;
  },
};

// =============================================================================
// Cubic Bezier Handler
// =============================================================================

export const cubicBezierHandler: TokenTypeHandler<'cubicBezier'> = {
  type: 'cubicBezier',
  name: 'Cubic Bezier',
  priority: 55,
  defaultNamespace: 'transition-timing-function',

  parseFigmaValue(value: unknown): CubicBezierValue {
    const arr = value as number[];
    return {
      x1: arr[0] ?? 0,
      y1: arr[1] ?? 0,
      x2: arr[2] ?? 1,
      y2: arr[3] ?? 1,
    };
  },

  parseVariableDefsValue(value: string): CubicBezierValue | null {
    // Parse cubic-bezier(x1, y1, x2, y2)
    const match = value.match(/cubic-bezier\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/);
    if (!match) return null;

    return {
      x1: parseFloat(match[1]),
      y1: parseFloat(match[2]),
      x2: parseFloat(match[3]),
      y2: parseFloat(match[4]),
    };
  },

  toCss(value: CubicBezierValue): string {
    return `cubic-bezier(${value.x1}, ${value.y1}, ${value.x2}, ${value.y2})`;
  },

  getNamespace(path: string[]): TailwindNamespace | null {
    const hint = path[0]?.toLowerCase();
    if (hint === 'easing' || hint === 'timing' || hint === 'animation') {
      return 'transition-timing-function';
    }
    return null;
  },
};

// =============================================================================
// Transition Handler
// =============================================================================

export const transitionHandler: TokenTypeHandler<'transition'> = {
  type: 'transition',
  name: 'Transition',
  priority: 50,

  toCss(value: TransitionValue): string {
    const timing = typeof value.timingFunction === 'string'
      ? value.timingFunction
      : `cubic-bezier(${value.timingFunction.x1}, ${value.timingFunction.y1}, ${value.timingFunction.x2}, ${value.timingFunction.y2})`;

    const parts = [`${value.duration.value}${value.duration.unit}`, timing];

    if (value.delay) {
      parts.push(`${value.delay.value}${value.delay.unit}`);
    }

    return parts.join(' ');
  },
};
