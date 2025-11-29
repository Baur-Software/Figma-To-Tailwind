/**
 * Animation Token Type Handlers
 *
 * Handles keyframes and animation tokens.
 */

import type {
  KeyframesValue,
  AnimationValue,
  CubicBezierValue,
} from '../../schema/tokens.js';
import type {
  TokenTypeHandler,
  VariableDefsContext,
} from '../types.js';

// =============================================================================
// Keyframes Handler
// =============================================================================

export const keyframesHandler: TokenTypeHandler<'keyframes'> = {
  type: 'keyframes',
  name: 'Keyframes',
  priority: 45,

  detectVariableDefs(context: VariableDefsContext): boolean {
    const lowerPath = context.path.toLowerCase();
    // Detect keyframe definitions
    return lowerPath.includes('keyframe') ||
           (lowerPath.includes('animation') && context.value.includes('%'));
  },

  parseVariableDefsValue(value: string): KeyframesValue | null {
    // Parse keyframe syntax like: "0%: opacity 0; 100%: opacity 1"
    // or "from: opacity 0; to: opacity 1"
    const steps: KeyframesValue = {};

    // Split by semicolon to get individual steps
    const stepParts = value.split(';').map(s => s.trim()).filter(Boolean);

    for (const part of stepParts) {
      const colonIndex = part.indexOf(':');
      if (colonIndex === -1) continue;

      const stepKey = part.substring(0, colonIndex).trim();
      const propsStr = part.substring(colonIndex + 1).trim();

      // Parse properties (simple space-separated key value pairs)
      const props: Record<string, string | number> = {};
      const propParts = propsStr.split(/\s+/);
      for (let i = 0; i < propParts.length - 1; i += 2) {
        const propName = propParts[i];
        const propValue = propParts[i + 1];
        if (propName && propValue) {
          const numValue = parseFloat(propValue);
          props[propName] = isNaN(numValue) ? propValue : numValue;
        }
      }

      if (Object.keys(props).length > 0) {
        steps[stepKey] = props;
      }
    }

    return Object.keys(steps).length > 0 ? steps : null;
  },

  toCss(value: KeyframesValue): string {
    const steps = Object.entries(value).map(([step, props]) => {
      const cssProps = Object.entries(props)
        .map(([prop, val]) => `${prop}: ${val}`)
        .join('; ');
      return `${step} { ${cssProps} }`;
    });
    return steps.join(' ');
  },
};

// =============================================================================
// Animation Handler
// =============================================================================

function formatTimingFunction(tf: CubicBezierValue | string): string {
  if (typeof tf === 'string') return tf;
  return `cubic-bezier(${tf.x1}, ${tf.y1}, ${tf.x2}, ${tf.y2})`;
}

export const animationHandler: TokenTypeHandler<'animation'> = {
  type: 'animation',
  name: 'Animation',
  priority: 50,
  defaultNamespace: 'animation',

  detectVariableDefs(context: VariableDefsContext): boolean {
    const lowerPath = context.path.toLowerCase();
    const lowerValue = context.value.toLowerCase();

    // Detect animation definitions (but not keyframes)
    if (lowerPath.includes('animation') && !lowerPath.includes('keyframe')) {
      // Check for animation-like values
      return lowerValue.includes('ms') ||
             lowerValue.includes('s') ||
             lowerValue.includes('ease') ||
             lowerValue.includes('linear') ||
             lowerValue.includes('infinite');
    }
    return false;
  },

  parseVariableDefsValue(value: string): AnimationValue | null {
    // Parse animation shorthand: "name 300ms ease-in-out infinite"
    const parts = value.trim().split(/\s+/);
    if (parts.length === 0) return null;

    const result: AnimationValue = {
      name: '',
      duration: { value: 0, unit: 'ms' },
    };

    for (const part of parts) {
      // Check for duration (ends with ms or s)
      const durationMatch = part.match(/^(\d+(?:\.\d+)?)(ms|s)$/);
      if (durationMatch) {
        result.duration = {
          value: parseFloat(durationMatch[1]),
          unit: durationMatch[2] as 'ms' | 's',
        };
        continue;
      }

      // Check for timing functions
      if (['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'].includes(part)) {
        result.timingFunction = part as AnimationValue['timingFunction'];
        continue;
      }

      // Check for iteration count
      if (part === 'infinite') {
        result.iterationCount = 'infinite';
        continue;
      }
      const iterCount = parseInt(part);
      if (!isNaN(iterCount) && part === String(iterCount)) {
        result.iterationCount = iterCount;
        continue;
      }

      // Check for direction
      if (['normal', 'reverse', 'alternate', 'alternate-reverse'].includes(part)) {
        result.direction = part as AnimationValue['direction'];
        continue;
      }

      // Check for fill mode
      if (['none', 'forwards', 'backwards', 'both'].includes(part)) {
        result.fillMode = part as AnimationValue['fillMode'];
        continue;
      }

      // Check for play state
      if (['running', 'paused'].includes(part)) {
        result.playState = part as AnimationValue['playState'];
        continue;
      }

      // Otherwise treat as animation name
      if (!result.name) {
        result.name = part;
      }
    }

    return result.name ? result : null;
  },

  toCss(value: AnimationValue): string {
    const parts: string[] = [value.name];

    parts.push(`${value.duration.value}${value.duration.unit}`);

    if (value.timingFunction) {
      parts.push(formatTimingFunction(value.timingFunction));
    }

    if (value.delay) {
      parts.push(`${value.delay.value}${value.delay.unit}`);
    }

    if (value.iterationCount !== undefined) {
      parts.push(String(value.iterationCount));
    }

    if (value.direction) {
      parts.push(value.direction);
    }

    if (value.fillMode) {
      parts.push(value.fillMode);
    }

    if (value.playState) {
      parts.push(value.playState);
    }

    return parts.join(' ');
  },

  getNamespace(): 'animation' {
    return 'animation';
  },
};
