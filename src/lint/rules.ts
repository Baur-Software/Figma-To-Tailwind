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
          severity: 'warning',
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
              severity: 'info',
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
              severity: 'info',
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
                severity: 'error',
                message: `Invalid color value: RGB values must be between 0 and 1`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
              });
            }

            if (color.a !== undefined && !isValid(color.a)) {
              context.report({
                severity: 'error',
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
              severity: 'warning',
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
                severity: 'error',
                message: `Token name "${segment}" starts with a number`,
                path: path.join('.'),
                collection: `${collection.name}/${mode}`,
                suggestion: `Prefix with a letter: "${toKebabCase('n' + segment)}"`,
              });
            }

            // Check for special characters
            if (/[^a-zA-Z0-9\-_]/.test(segment)) {
              context.report({
                severity: 'error',
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
          severity: 'warning',
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
                severity: 'error',
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
// Export All Rules
// =============================================================================

export const allRules: LintRule[] = [
  inconsistentNaming,
  missingDescription,
  duplicateValues,
  invalidColorValue,
  deepNesting,
  invalidTokenName,
  emptyCollection,
  brokenReference,
];
