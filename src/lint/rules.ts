/**
 * Token Lint Rules
 *
 * Built-in rules for checking token quality and consistency.
 */

import type { ThemeFile, Token } from '../schema/tokens.js';
import type { LintRule, LintRuleContext } from './types.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Recursively walk all tokens in a collection
 */
function walkTokens(
  obj: Record<string, unknown>,
  callback: (token: Token, path: string[]) => void,
  path: string[] = []
): void {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = [...path, key];

    if (isToken(value)) {
      callback(value as Token, currentPath);
    } else if (typeof value === 'object' && value !== null) {
      walkTokens(value as Record<string, unknown>, callback, currentPath);
    }
  }
}

function isToken(value: unknown): value is Token {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$type' in value &&
    '$value' in value
  );
}

/**
 * Detect naming convention used in a string
 */
function detectNamingConvention(name: string): 'kebab' | 'camel' | 'pascal' | 'snake' | 'unknown' {
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) return 'kebab';
  if (/^[a-z][a-zA-Z0-9]*$/.test(name)) return 'camel';
  if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) return 'pascal';
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(name)) return 'snake';
  return 'unknown';
}

/**
 * Convert to suggested naming convention
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

// =============================================================================
// Lint Rules
// =============================================================================

/**
 * Check for inconsistent naming conventions within collections
 */
export const inconsistentNaming: LintRule = {
  id: 'inconsistent-naming',
  name: 'Inconsistent Naming',
  description: 'Checks for mixed naming conventions (kebab-case, camelCase, etc.)',
  defaultSeverity: 'warning',

  check(theme: ThemeFile, context: LintRuleContext): void {
    for (const collection of theme.collections) {
      const conventions = new Map<string, string[]>();

      for (const [, tokens] of Object.entries(collection.tokens)) {
        walkTokens(tokens as Record<string, unknown>, (_, path) => {
          for (const segment of path) {
            const convention = detectNamingConvention(segment);
            if (convention !== 'unknown') {
              const existing = conventions.get(convention) || [];
              existing.push(segment);
              conventions.set(convention, existing);
            }
          }
        });
      }

      // If multiple conventions are used, report
      if (conventions.size > 1) {
        const conventionList = Array.from(conventions.entries())
          .map(([conv, examples]) => `${conv}: ${examples.slice(0, 3).join(', ')}`)
          .join('; ');

        context.report({
          message: `Mixed naming conventions in collection "${collection.name}": ${conventionList}`,
          collection: collection.name,
          suggestion: 'Use consistent kebab-case naming throughout',
        });
      }
    }
  },
};

/**
 * Check for tokens without descriptions
 */
export const missingDescription: LintRule = {
  id: 'missing-description',
  name: 'Missing Description',
  description: 'Checks for tokens that lack descriptions',
  defaultSeverity: 'info',

  check(theme: ThemeFile, context: LintRuleContext): void {
    for (const collection of theme.collections) {
      for (const [mode, tokens] of Object.entries(collection.tokens)) {
        walkTokens(tokens as Record<string, unknown>, (token, path) => {
          if (!token.$description) {
            context.report({
              message: `Token missing description`,
              path: path.join('.'),
              collection: `${collection.name}/${mode}`,
              suggestion: 'Add a $description field to document the token\'s purpose',
            });
          }
        });
      }
    }
  },
};

/**
 * Check for duplicate token values within a collection
 */
export const duplicateValues: LintRule = {
  id: 'duplicate-values',
  name: 'Duplicate Values',
  description: 'Checks for tokens with identical values that could be consolidated',
  defaultSeverity: 'info',

  check(theme: ThemeFile, context: LintRuleContext): void {
    for (const collection of theme.collections) {
      for (const [mode, tokens] of Object.entries(collection.tokens)) {
        const valueMap = new Map<string, string[]>();

        walkTokens(tokens as Record<string, unknown>, (token, path) => {
          const valueKey = JSON.stringify(token.$value);
          const existing = valueMap.get(valueKey) || [];
          existing.push(path.join('.'));
          valueMap.set(valueKey, existing);
        });

        // Report duplicates
        for (const [, paths] of valueMap.entries()) {
          if (paths.length > 1) {
            context.report({
              message: `Duplicate values found: ${paths.join(', ')}`,
              collection: `${collection.name}/${mode}`,
              suggestion: 'Consider using token references to avoid duplication',
            });
          }
        }
      }
    }
  },
};

/**
 * Check for invalid color values
 */
export const invalidColorValue: LintRule = {
  id: 'invalid-color-value',
  name: 'Invalid Color Value',
  description: 'Checks for color tokens with invalid RGBA values',
  defaultSeverity: 'error',

  check(theme: ThemeFile, context: LintRuleContext): void {
    for (const collection of theme.collections) {
      for (const [mode, tokens] of Object.entries(collection.tokens)) {
        walkTokens(tokens as Record<string, unknown>, (token, path) => {
          if (token.$type === 'color' && typeof token.$value === 'object') {
            const color = token.$value as { r?: number; g?: number; b?: number; a?: number };

            // Skip references
            if ('$ref' in color) return;

            const isValid = (v: unknown) =>
              typeof v === 'number' && v >= 0 && v <= 1;

            if (!isValid(color.r) || !isValid(color.g) || !isValid(color.b)) {
              context.report({
                message: `Invalid color value: RGB values must be between 0 and 1`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
              });
            }

            if (color.a !== undefined && !isValid(color.a)) {
              context.report({
                message: `Invalid alpha value: must be between 0 and 1`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
              });
            }
          }
        });
      }
    }
  },
};

/**
 * Check for deeply nested token structures
 */
export const deepNesting: LintRule = {
  id: 'deep-nesting',
  name: 'Deep Nesting',
  description: 'Warns when token paths are deeply nested (>4 levels)',
  defaultSeverity: 'warning',

  check(theme: ThemeFile, context: LintRuleContext): void {
    const maxDepth = 4;

    for (const collection of theme.collections) {
      for (const [mode, tokens] of Object.entries(collection.tokens)) {
        walkTokens(tokens as Record<string, unknown>, (_, path) => {
          if (path.length > maxDepth) {
            context.report({
              message: `Token path too deep (${path.length} levels): ${path.join('.')}`,
              path: path.join('.'),
              collection: `${collection.name}/${mode}`,
              suggestion: `Consider flattening to ${maxDepth} levels or less for easier maintenance`,
            });
          }
        });
      }
    }
  },
};

/**
 * Check for naming convention issues (numbers at start, special characters)
 */
export const invalidTokenName: LintRule = {
  id: 'invalid-token-name',
  name: 'Invalid Token Name',
  description: 'Checks for token names with invalid characters or patterns',
  defaultSeverity: 'error',

  check(theme: ThemeFile, context: LintRuleContext): void {
    for (const collection of theme.collections) {
      for (const [mode, tokens] of Object.entries(collection.tokens)) {
        walkTokens(tokens as Record<string, unknown>, (_, path) => {
          for (const segment of path) {
            // Check for starting with number (not valid CSS custom property)
            if (/^\d/.test(segment)) {
              context.report({
                message: `Token name "${segment}" starts with a number`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
                suggestion: `Prefix with a letter: "${toKebabCase('n' + segment)}"`,
              });
            }

            // Check for special characters
            if (/[^a-zA-Z0-9\-_]/.test(segment)) {
              context.report({
                message: `Token name "${segment}" contains invalid characters`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
                suggestion: `Use only letters, numbers, hyphens, and underscores`,
              });
            }
          }
        });
      }
    }
  },
};

/**
 * Check for empty collections
 */
export const emptyCollection: LintRule = {
  id: 'empty-collection',
  name: 'Empty Collection',
  description: 'Warns about collections with no tokens',
  defaultSeverity: 'warning',

  check(theme: ThemeFile, context: LintRuleContext): void {
    for (const collection of theme.collections) {
      let hasTokens = false;

      for (const [, tokens] of Object.entries(collection.tokens)) {
        walkTokens(tokens as Record<string, unknown>, () => {
          hasTokens = true;
        });
        if (hasTokens) break;
      }

      if (!hasTokens) {
        context.report({
          message: `Collection "${collection.name}" has no tokens`,
          collection: collection.name,
          suggestion: 'Remove empty collections or add tokens',
        });
      }
    }
  },
};

/**
 * Check for broken token references
 */
export const brokenReference: LintRule = {
  id: 'broken-reference',
  name: 'Broken Reference',
  description: 'Checks for token references that point to non-existent tokens',
  defaultSeverity: 'error',

  check(theme: ThemeFile, context: LintRuleContext): void {
    // Build a set of all token paths
    const allPaths = new Set<string>();

    for (const collection of theme.collections) {
      for (const [, tokens] of Object.entries(collection.tokens)) {
        walkTokens(tokens as Record<string, unknown>, (_, path) => {
          allPaths.add(path.join('.'));
        });
      }
    }

    // Check references
    for (const collection of theme.collections) {
      for (const [mode, tokens] of Object.entries(collection.tokens)) {
        walkTokens(tokens as Record<string, unknown>, (token, path) => {
          if (typeof token.$value === 'object' && token.$value !== null && '$ref' in token.$value) {
            const ref = (token.$value as { $ref: string }).$ref;
            // Note: refs might be in format {path.to.token}
            const cleanRef = ref.replace(/^\{|\}$/g, '');

            if (!allPaths.has(cleanRef)) {
              context.report({
                message: `Broken reference: "${ref}" not found`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
              });
            }
          }
        });
      }
    }
  },
};

// =============================================================================
// Type-Specific Validation Rules
// =============================================================================

const VALID_DIMENSION_UNITS = ['px', 'rem', 'em', '%', 'vw', 'vh', 'dvh', 'svh', 'lvh'];
const VALID_FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900,
  'thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black'];
const VALID_BORDER_STYLES = ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'none'];

/**
 * Check for invalid dimension values
 */
export const invalidDimensionValue: LintRule = {
  id: 'invalid-dimension-value',
  name: 'Invalid Dimension Value',
  description: 'Checks dimension tokens for valid values and units',
  defaultSeverity: 'error',

  check(theme: ThemeFile, context: LintRuleContext): void {
    for (const collection of theme.collections) {
      for (const [mode, tokens] of Object.entries(collection.tokens)) {
        walkTokens(tokens as Record<string, unknown>, (token, path) => {
          if (token.$type === 'dimension' && typeof token.$value === 'object' && !('$ref' in token.$value)) {
            const dim = token.$value as { value?: number; unit?: string };

            if (typeof dim.value !== 'number') {
              context.report({
                message: `Dimension value must be a number`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
              });
            } else if (dim.value < 0) {
              context.report({
                message: `Dimension value should not be negative: ${dim.value}`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
                suggestion: 'Use a positive value or zero',
              });
            }

            if (!dim.unit || !VALID_DIMENSION_UNITS.includes(dim.unit)) {
              context.report({
                message: `Invalid dimension unit: "${dim.unit}"`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
                suggestion: `Valid units: ${VALID_DIMENSION_UNITS.join(', ')}`,
              });
            }
          }
        });
      }
    }
  },
};

/**
 * Check for invalid typography values
 */
export const invalidTypographyValue: LintRule = {
  id: 'invalid-typography-value',
  name: 'Invalid Typography Value',
  description: 'Checks typography tokens for required fields and valid values',
  defaultSeverity: 'error',

  check(theme: ThemeFile, context: LintRuleContext): void {
    for (const collection of theme.collections) {
      for (const [mode, tokens] of Object.entries(collection.tokens)) {
        walkTokens(tokens as Record<string, unknown>, (token, path) => {
          if (token.$type === 'typography' && typeof token.$value === 'object' && !('$ref' in token.$value)) {
            const typo = token.$value as Record<string, unknown>;

            // Check required fields
            if (!typo.fontFamily) {
              context.report({
                message: `Typography token missing required field: fontFamily`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
              });
            } else if (!Array.isArray(typo.fontFamily)) {
              context.report({
                message: `Typography fontFamily must be an array of font names`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
              });
            }

            if (!typo.fontSize) {
              context.report({
                message: `Typography token missing required field: fontSize`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
              });
            }

            if (typo.fontWeight !== undefined && !VALID_FONT_WEIGHTS.includes(typo.fontWeight as number | string)) {
              context.report({
                message: `Invalid font weight: "${typo.fontWeight}"`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
                suggestion: `Valid weights: 100-900 or ${VALID_FONT_WEIGHTS.filter(w => typeof w === 'string').join(', ')}`,
              });
            }
          }
        });
      }
    }
  },
};

/**
 * Check for invalid shadow values
 */
export const invalidShadowValue: LintRule = {
  id: 'invalid-shadow-value',
  name: 'Invalid Shadow Value',
  description: 'Checks shadow tokens for required fields',
  defaultSeverity: 'error',

  check(theme: ThemeFile, context: LintRuleContext): void {
    for (const collection of theme.collections) {
      for (const [mode, tokens] of Object.entries(collection.tokens)) {
        walkTokens(tokens as Record<string, unknown>, (token, path) => {
          if (token.$type === 'shadow') {
            const shadows = Array.isArray(token.$value) ? token.$value : [token.$value];

            for (const shadow of shadows) {
              if (typeof shadow !== 'object' || shadow === null || '$ref' in shadow) continue;

              const s = shadow as Record<string, unknown>;
              const requiredFields = ['offsetX', 'offsetY', 'blur', 'color'];

              for (const field of requiredFields) {
                if (!s[field]) {
                  context.report({
                    message: `Shadow token missing required field: ${field}`,
                    path: path.join('.'),
                    collection: `${collection.name}/${mode}`,
                  });
                }
              }
            }
          }
        });
      }
    }
  },
};

/**
 * Check for invalid gradient values
 */
export const invalidGradientValue: LintRule = {
  id: 'invalid-gradient-value',
  name: 'Invalid Gradient Value',
  description: 'Checks gradient tokens for valid type and stops',
  defaultSeverity: 'error',

  check(theme: ThemeFile, context: LintRuleContext): void {
    const validTypes = ['linear', 'radial', 'conic'];

    for (const collection of theme.collections) {
      for (const [mode, tokens] of Object.entries(collection.tokens)) {
        walkTokens(tokens as Record<string, unknown>, (token, path) => {
          if (token.$type === 'gradient' && typeof token.$value === 'object' && !('$ref' in token.$value)) {
            const grad = token.$value as Record<string, unknown>;

            if (!grad.type || !validTypes.includes(grad.type as string)) {
              context.report({
                message: `Invalid gradient type: "${grad.type}"`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
                suggestion: `Valid types: ${validTypes.join(', ')}`,
              });
            }

            if (!grad.stops || !Array.isArray(grad.stops)) {
              context.report({
                message: `Gradient must have stops array`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
              });
            } else if (grad.stops.length < 2) {
              context.report({
                message: `Gradient must have at least 2 stops`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
              });
            } else {
              // Check stop positions
              for (const stop of grad.stops as Array<{ position?: number }>) {
                if (typeof stop.position !== 'number' || stop.position < 0 || stop.position > 1) {
                  context.report({
                    message: `Gradient stop position must be between 0 and 1`,
                    path: path.join('.'),
                    collection: `${collection.name}/${mode}`,
                  });
                  break;
                }
              }
            }
          }
        });
      }
    }
  },
};

/**
 * Check for invalid border values
 */
export const invalidBorderValue: LintRule = {
  id: 'invalid-border-value',
  name: 'Invalid Border Value',
  description: 'Checks border tokens for required fields and valid styles',
  defaultSeverity: 'error',

  check(theme: ThemeFile, context: LintRuleContext): void {
    for (const collection of theme.collections) {
      for (const [mode, tokens] of Object.entries(collection.tokens)) {
        walkTokens(tokens as Record<string, unknown>, (token, path) => {
          if (token.$type === 'border' && typeof token.$value === 'object' && !('$ref' in token.$value)) {
            const border = token.$value as Record<string, unknown>;

            if (!border.width) {
              context.report({
                message: `Border token missing required field: width`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
              });
            }

            if (!border.style) {
              context.report({
                message: `Border token missing required field: style`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
              });
            } else if (!VALID_BORDER_STYLES.includes(border.style as string)) {
              context.report({
                message: `Invalid border style: "${border.style}"`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
                suggestion: `Valid styles: ${VALID_BORDER_STYLES.join(', ')}`,
              });
            }

            if (!border.color) {
              context.report({
                message: `Border token missing required field: color`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
              });
            }
          }
        });
      }
    }
  },
};

/**
 * Check for invalid cubic bezier values
 */
export const invalidCubicBezier: LintRule = {
  id: 'invalid-cubic-bezier',
  name: 'Invalid Cubic Bezier',
  description: 'Checks cubic bezier tokens for valid control points',
  defaultSeverity: 'error',

  check(theme: ThemeFile, context: LintRuleContext): void {
    for (const collection of theme.collections) {
      for (const [mode, tokens] of Object.entries(collection.tokens)) {
        walkTokens(tokens as Record<string, unknown>, (token, path) => {
          if (token.$type === 'cubicBezier' && typeof token.$value === 'object' && !('$ref' in token.$value)) {
            const bezier = token.$value as Record<string, unknown>;
            const requiredPoints = ['x1', 'y1', 'x2', 'y2'];

            for (const point of requiredPoints) {
              if (typeof bezier[point] !== 'number') {
                context.report({
                  message: `Cubic bezier missing or invalid control point: ${point}`,
                  path: path.join('.'),
                  collection: `${collection.name}/${mode}`,
                });
              }
            }

            // x values must be between 0 and 1
            if (typeof bezier.x1 === 'number' && (bezier.x1 < 0 || bezier.x1 > 1)) {
              context.report({
                message: `Cubic bezier x1 must be between 0 and 1`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
              });
            }
            if (typeof bezier.x2 === 'number' && (bezier.x2 < 0 || bezier.x2 > 1)) {
              context.report({
                message: `Cubic bezier x2 must be between 0 and 1`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
              });
            }
          }
        });
      }
    }
  },
};

/**
 * Check for circular token references
 */
export const circularReference: LintRule = {
  id: 'circular-reference',
  name: 'Circular Reference',
  description: 'Detects circular references between tokens',
  defaultSeverity: 'error',

  check(theme: ThemeFile, context: LintRuleContext): void {
    // Build reference graph
    const references = new Map<string, string[]>();

    for (const collection of theme.collections) {
      for (const [, tokens] of Object.entries(collection.tokens)) {
        walkTokens(tokens as Record<string, unknown>, (token, path) => {
          const tokenPath = path.join('.');

          if (typeof token.$value === 'object' && token.$value !== null && '$ref' in token.$value) {
            const ref = (token.$value as { $ref: string }).$ref.replace(/^\{|\}$/g, '');
            const existing = references.get(tokenPath) || [];
            existing.push(ref);
            references.set(tokenPath, existing);
          }
        });
      }
    }

    // Detect cycles using DFS
    function hasCycle(start: string, visited: Set<string>, path: string[]): string[] | null {
      if (path.includes(start)) {
        return [...path, start];
      }

      if (visited.has(start)) return null;
      visited.add(start);

      const refs = references.get(start) || [];
      for (const ref of refs) {
        const cycle = hasCycle(ref, visited, [...path, start]);
        if (cycle) return cycle;
      }

      return null;
    }

    const checked = new Set<string>();
    for (const tokenPath of references.keys()) {
      if (checked.has(tokenPath)) continue;

      const cycle = hasCycle(tokenPath, new Set(), []);
      if (cycle) {
        context.report({
          message: `Circular reference detected: ${cycle.join(' → ')}`,
          path: tokenPath,
          suggestion: 'Break the circular reference by using a concrete value',
        });

        // Mark all tokens in cycle as checked
        for (const p of cycle) {
          checked.add(p);
        }
      }
    }
  },
};

/**
 * Check for mode consistency in collections
 */
export const modeConsistency: LintRule = {
  id: 'mode-consistency',
  name: 'Mode Consistency',
  description: 'Checks that all modes in a collection have matching token paths',
  defaultSeverity: 'warning',

  check(theme: ThemeFile, context: LintRuleContext): void {
    for (const collection of theme.collections) {
      if (collection.modes.length <= 1) continue;

      // Collect all token paths per mode
      const modeTokens = new Map<string, Set<string>>();

      for (const [mode, tokens] of Object.entries(collection.tokens)) {
        const paths = new Set<string>();
        walkTokens(tokens as Record<string, unknown>, (_, path) => {
          paths.add(path.join('.'));
        });
        modeTokens.set(mode, paths);
      }

      // Compare modes
      const allPaths = new Set<string>();
      for (const paths of modeTokens.values()) {
        for (const p of paths) allPaths.add(p);
      }

      for (const [mode, paths] of modeTokens.entries()) {
        for (const p of allPaths) {
          if (!paths.has(p)) {
            context.report({
              message: `Token "${p}" missing in mode "${mode}"`,
              path: p,
              collection: collection.name,
              suggestion: `Add "${p}" to mode "${mode}" or remove from other modes`,
            });
          }
        }
      }
    }
  },
};

/**
 * Check for missing default mode
 */
export const missingDefaultMode: LintRule = {
  id: 'missing-default-mode',
  name: 'Missing Default Mode',
  description: 'Checks that collection defaultMode exists in modes array',
  defaultSeverity: 'error',

  check(theme: ThemeFile, context: LintRuleContext): void {
    for (const collection of theme.collections) {
      if (collection.defaultMode && !collection.modes.includes(collection.defaultMode)) {
        context.report({
          message: `Default mode "${collection.defaultMode}" not found in modes list`,
          collection: collection.name,
          suggestion: `Add "${collection.defaultMode}" to modes or change defaultMode to one of: ${collection.modes.join(', ')}`,
        });
      }
    }
  },
};

/**
 * Warn about tokens hidden from Figma publishing
 */
export const hiddenFromPublishing: LintRule = {
  id: 'hidden-from-publishing',
  name: 'Hidden From Publishing',
  description: 'Warns about tokens that are hidden from Figma publishing',
  defaultSeverity: 'info',

  check(theme: ThemeFile, context: LintRuleContext): void {
    for (const collection of theme.collections) {
      for (const [mode, tokens] of Object.entries(collection.tokens)) {
        walkTokens(tokens as Record<string, unknown>, (token, path) => {
          const figmaExt = token.$extensions?.['com.figma'];
          if (figmaExt?.hiddenFromPublishing) {
            context.report({
              message: `Token is hidden from Figma publishing`,
              path: path.join('.'),
              collection: `${collection.name}/${mode}`,
              suggestion: 'Consider whether this token should be included in output',
            });
          }
        });
      }
    }
  },
};

// =============================================================================
// Export All Rules
// =============================================================================

export const allRules: LintRule[] = [
  // Naming & Structure
  inconsistentNaming,
  invalidTokenName,
  deepNesting,
  emptyCollection,

  // Documentation
  missingDescription,

  // Value Validation
  invalidColorValue,
  invalidDimensionValue,
  invalidTypographyValue,
  invalidShadowValue,
  invalidGradientValue,
  invalidBorderValue,
  invalidCubicBezier,

  // References
  brokenReference,
  circularReference,
  duplicateValues,

  // Collection/Mode
  modeConsistency,
  missingDefaultMode,

  // Figma-specific
  hiddenFromPublishing,
];
