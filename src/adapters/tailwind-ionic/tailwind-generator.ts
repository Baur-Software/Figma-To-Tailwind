/**
 * Tailwind CSS v4 Theme Generator
 *
 * Generates Tailwind CSS v4 @theme directives and CSS variables
 * from normalized design tokens.
 *
 * Uses the TokenTypeRegistry for extensible namespace mapping.
 */

import type {
  ThemeFile,
  TokenGroup,
  Token,
} from '../../schema/tokens.js';
import type {
  TailwindThemeOutput,
  ThemeVariable,
} from '../../schema/tailwind.js';
import { isTokenReference } from '../../schema/tokens.js';
import { tokenValueToCss, colorToOklch, colorToHex } from './converters.js';
import type { ColorValue } from '../../schema/tokens.js';
import { tokenTypeRegistry } from '../../registry/index.js';
import type { TailwindNamespace } from '../../registry/types.js';

// =============================================================================
// Token Traversal Utilities
// =============================================================================

interface FlattenedToken {
  path: string[];
  token: Token;
}

/**
 * Flatten a token group into a list of path/token pairs
 */
function flattenTokenGroup(
  group: TokenGroup,
  path: string[] = []
): FlattenedToken[] {
  const result: FlattenedToken[] = [];

  for (const [key, value] of Object.entries(group)) {
    if (key.startsWith('$')) continue;

    if (isToken(value)) {
      result.push({ path: [...path, key], token: value });
    } else if (isTokenGroup(value)) {
      result.push(...flattenTokenGroup(value, [...path, key]));
    }
  }

  return result;
}

function isToken(value: unknown): value is Token {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$type' in value &&
    '$value' in value
  );
}

function isTokenGroup(value: unknown): value is TokenGroup {
  return (
    typeof value === 'object' &&
    value !== null &&
    !('$type' in value && '$value' in value)
  );
}

// =============================================================================
// Tailwind Namespace Mapping
// =============================================================================

// TailwindNamespace is now imported from registry/types.js

/**
 * Map token type to Tailwind namespace
 *
 * Uses the TokenTypeRegistry for extensible namespace mapping.
 * New token types added to the registry will automatically get namespace support.
 */
function getNamespace(token: Token, path: string[]): TailwindNamespace | null {
  // First check path-based hints that override type defaults
  const pathHint = path[0]?.toLowerCase();

  // Handle special typography path cases
  if (pathHint === 'typography' || pathHint === 'fonts' || pathHint === 'font') {
    if (token.$type === 'dimension') {
      if (path.some(p => p.includes('size'))) return 'font-size';
      if (path.some(p => p.includes('height') || p.includes('leading'))) return 'line-height';
      if (path.some(p => p.includes('spacing') || p.includes('tracking'))) return 'letter-spacing';
    }
  }

  // Handle opacity and z-index paths
  if (pathHint === 'opacity') {
    return 'opacity';
  }
  if (pathHint === 'z-index' || pathHint === 'zindex') {
    return 'z-index';
  }

  // Use the registry for namespace resolution
  return tokenTypeRegistry.getNamespace(token.$type, path);
}

// =============================================================================
// CSS Variable Name Generation
// =============================================================================

/**
 * Convert token path to CSS variable name
 */
function pathToVariableName(namespace: string, path: string[]): string {
  // Skip the first segment if it matches the namespace
  const cleanPath = path[0]?.toLowerCase() === namespace.replace('-', '')
    ? path.slice(1)
    : path;

  const name = cleanPath.join('-').toLowerCase().replace(/\s+/g, '-');

  return `--${namespace}-${name}`;
}

// =============================================================================
// Tailwind v4 @theme Generation
// =============================================================================

export interface TailwindGeneratorOptions {
  /** Mode to use for token values */
  mode?: string;
  /** Include comments in output */
  includeComments?: boolean;
  /** Color format for output */
  colorFormat?: 'hex' | 'oklch';
  /** Include Ionic color integration */
  ionicIntegration?: boolean;
  /** Prefix for CSS variables */
  prefix?: string;
}

/**
 * Generate Tailwind CSS v4 theme from normalized design tokens
 */
export function generateTailwindTheme(
  theme: ThemeFile,
  options: TailwindGeneratorOptions = {}
): TailwindThemeOutput {
  const {
    mode,
    includeComments = true,
    colorFormat = 'oklch',
    ionicIntegration = true,
    prefix = '',
  } = options;

  const variables: ThemeVariable[] = [];
  const variablesByNamespace = new Map<string, ThemeVariable[]>();

  // Process all collections
  for (const collection of theme.collections) {
    const selectedMode = mode || collection.defaultMode;
    const tokens = collection.tokens[selectedMode];

    if (!tokens) continue;

    // Flatten and process tokens
    const flattened = flattenTokenGroup(tokens);

    for (const { path, token } of flattened) {
      // Skip references for now (they need special handling)
      if (isTokenReference(token.$value)) continue;

      const namespace = getNamespace(token, path);
      if (!namespace) continue;

      // Generate variable
      const varName = pathToVariableName(namespace, path);
      const value = convertTokenValue(token, { colorFormat, prefix });

      const variable: ThemeVariable = {
        name: varName.replace(/^--/, ''),
        value,
        comment: includeComments ? token.$description : undefined,
      };

      variables.push(variable);

      // Group by namespace
      const nsVars = variablesByNamespace.get(namespace) || [];
      nsVars.push(variable);
      variablesByNamespace.set(namespace, nsVars);
    }
  }

  // Generate @theme CSS
  const themeCss = generateThemeCss(variablesByNamespace, { includeComments });

  // Generate Ionic integration CSS if requested
  let ionicIntegrationCss: string | undefined;
  if (ionicIntegration) {
    ionicIntegrationCss = generateIonicIntegrationCss(variablesByNamespace);
  }

  // Generate dark mode CSS
  const darkModeCss = generateDarkModeCss(theme, options);

  return {
    variables,
    themeCss,
    darkModeCss,
    ionicIntegrationCss,
  };
}

/**
 * Convert token value to CSS string with options
 */
function convertTokenValue(
  token: Token,
  options: { colorFormat: 'hex' | 'oklch'; prefix: string }
): string {
  if (token.$type === 'color' && !isTokenReference(token.$value)) {
    const color = token.$value as ColorValue;
    return options.colorFormat === 'oklch'
      ? colorToOklch(color)
      : colorToHex(color);
  }

  return tokenValueToCss(token, { prefix: options.prefix });
}

/**
 * Generate @theme CSS block
 */
function generateThemeCss(
  variablesByNamespace: Map<string, ThemeVariable[]>,
  options: { includeComments: boolean }
): string {
  const lines: string[] = ['@theme {'];

  // Order namespaces logically
  const namespaceOrder: string[] = [
    'color',
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'letter-spacing',
    'spacing',
    'radius',
    'shadow',
    'opacity',
    'transition-duration',
    'transition-timing-function',
    'z-index',
  ];

  for (const namespace of namespaceOrder) {
    const vars = variablesByNamespace.get(namespace);
    if (!vars || vars.length === 0) continue;

    lines.push('');
    lines.push(`  /* ${namespace} */`);

    for (const variable of vars) {
      if (options.includeComments && variable.comment) {
        lines.push(`  /* ${variable.comment} */`);
      }
      lines.push(`  --${variable.name}: ${variable.value};`);
    }
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Generate CSS that bridges Tailwind and Ionic variables
 */
function generateIonicIntegrationCss(
  variablesByNamespace: Map<string, ThemeVariable[]>
): string {
  const colorVars = variablesByNamespace.get('color') || [];

  // Look for colors that match Ionic color names
  const ionicColors = [
    'primary',
    'secondary',
    'tertiary',
    'success',
    'warning',
    'danger',
    'dark',
    'medium',
    'light',
  ];

  const lines: string[] = [
    '/* Ionic Integration - Bridge Tailwind colors to Ionic CSS variables */',
    ':root {',
  ];

  for (const ionicColor of ionicColors) {
    // Find matching Tailwind color variable
    const match = colorVars.find(
      v =>
        v.name.endsWith(`-${ionicColor}`) ||
        v.name.includes(`-${ionicColor}-500`) ||
        v.name === `color-${ionicColor}`
    );

    if (match) {
      lines.push(`  --ion-color-${ionicColor}: var(--${match.name});`);
    }
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Generate dark mode CSS using Tailwind v4 @variant
 */
function generateDarkModeCss(
  theme: ThemeFile,
  options: TailwindGeneratorOptions
): string | undefined {
  // Look for dark mode in collections
  let darkTokens: TokenGroup | undefined;

  for (const collection of theme.collections) {
    if (collection.tokens['dark']) {
      darkTokens = collection.tokens['dark'];
      break;
    }
    // Also check for 'Dark' or 'Dark Mode'
    const darkKey = Object.keys(collection.tokens).find(k =>
      k.toLowerCase().includes('dark')
    );
    if (darkKey) {
      darkTokens = collection.tokens[darkKey];
      break;
    }
  }

  if (!darkTokens) return undefined;

  const variablesByNamespace = new Map<string, ThemeVariable[]>();
  const flattened = flattenTokenGroup(darkTokens);

  for (const { path, token } of flattened) {
    if (isTokenReference(token.$value)) continue;

    const namespace = getNamespace(token, path);
    if (!namespace) continue;

    const varName = pathToVariableName(namespace, path);
    const value = convertTokenValue(token, {
      colorFormat: options.colorFormat || 'oklch',
      prefix: options.prefix || '',
    });

    const variable: ThemeVariable = {
      name: varName.replace(/^--/, ''),
      value,
    };

    const nsVars = variablesByNamespace.get(namespace) || [];
    nsVars.push(variable);
    variablesByNamespace.set(namespace, nsVars);
  }

  // Generate dark mode CSS using media query (Tailwind v4 style)
  const lines: string[] = [
    '@media (prefers-color-scheme: dark) {',
    '  :root {',
  ];

  for (const [, vars] of variablesByNamespace) {
    for (const variable of vars) {
      lines.push(`    --${variable.name}: ${variable.value};`);
    }
  }

  lines.push('  }');
  lines.push('}');

  // Also add .dark class support
  lines.push('');
  lines.push('.dark {');

  for (const [, vars] of variablesByNamespace) {
    for (const variable of vars) {
      lines.push(`  --${variable.name}: ${variable.value};`);
    }
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Generate a complete CSS file with all theme output
 */
export function generateCompleteCss(output: TailwindThemeOutput): string {
  const sections: string[] = [];

  sections.push('/* Generated by figma-to-tailwind */');
  sections.push('/* Tailwind CSS v4 Theme */');
  sections.push('');
  sections.push(output.themeCss);

  if (output.ionicIntegrationCss) {
    sections.push('');
    sections.push(output.ionicIntegrationCss);
  }

  if (output.darkModeCss) {
    sections.push('');
    sections.push('/* Dark Mode */');
    sections.push(output.darkModeCss);
  }

  return sections.join('\n');
}
