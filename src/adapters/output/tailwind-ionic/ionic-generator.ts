/**
 * Ionic Theme Generator
 *
 * Generates Ionic CSS custom properties from normalized design tokens.
 */

import type {
  ThemeFile,
  TokenGroup,
  Token,
  ColorValue,
} from '../../../schema/tokens.js';
import type {
  IonicTheme,
  IonicColorVariables,
  IonicColorName,
} from '../../../schema/ionic.js';
import { IONIC_COLOR_NAMES } from '../../../schema/ionic.js';
import { isTokenReference } from '../../../schema/tokens.js';
import {
  colorToHex,
  colorToRgbTriplet,
} from './converters.js';

// =============================================================================
// Color Utilities
// =============================================================================

/**
 * Calculate a darker shade of a color (for Ionic --shade)
 */
function calculateShade(color: ColorValue): ColorValue {
  return {
    r: color.r * 0.88,
    g: color.g * 0.88,
    b: color.b * 0.88,
    a: color.a,
  };
}

/**
 * Calculate a lighter tint of a color (for Ionic --tint)
 */
function calculateTint(color: ColorValue): ColorValue {
  return {
    r: color.r + (1 - color.r) * 0.12,
    g: color.g + (1 - color.g) * 0.12,
    b: color.b + (1 - color.b) * 0.12,
    a: color.a,
  };
}

/**
 * Calculate contrast color (black or white) for a given color
 */
function calculateContrast(color: ColorValue): ColorValue {
  // Calculate relative luminance
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * toLinear(color.r) +
    0.7152 * toLinear(color.g) +
    0.0722 * toLinear(color.b);

  // Use white for dark colors, black for light colors
  if (luminance < 0.5) {
    return { r: 1, g: 1, b: 1, a: 1 };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

// =============================================================================
// Token Extraction
// =============================================================================

interface ExtractedColor {
  name: string;
  color: ColorValue;
  path: string[];
}

/**
 * Recursively extract color tokens from a token group
 */
function extractColors(
  group: TokenGroup,
  path: string[] = []
): ExtractedColor[] {
  const colors: ExtractedColor[] = [];

  for (const [key, value] of Object.entries(group)) {
    if (key.startsWith('$')) continue;

    if (isToken(value) && value.$type === 'color') {
      if (!isTokenReference(value.$value)) {
        colors.push({
          name: key,
          color: value.$value as ColorValue,
          path: [...path, key],
        });
      }
    } else if (isTokenGroup(value)) {
      colors.push(...extractColors(value, [...path, key]));
    }
  }

  return colors;
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
// Color Mapping
// =============================================================================

/**
 * Map extracted colors to Ionic color names
 * Uses fuzzy matching based on common naming conventions
 */
function mapToIonicColors(
  colors: ExtractedColor[]
): Map<IonicColorName, ExtractedColor> {
  const mapping = new Map<IonicColorName, ExtractedColor>();

  // Define matching patterns for each Ionic color
  const patterns: Record<IonicColorName, RegExp[]> = {
    primary: [/^primary$/i, /primary-?500$/i, /brand$/i],
    secondary: [/^secondary$/i, /secondary-?500$/i],
    tertiary: [/^tertiary$/i, /tertiary-?500$/i, /accent$/i],
    success: [/^success$/i, /^green$/i, /positive/i],
    warning: [/^warning$/i, /^yellow$/i, /^orange$/i, /caution/i],
    danger: [/^danger$/i, /^error$/i, /^red$/i, /destructive/i],
    dark: [/^dark$/i, /^gray-?900$/i, /^grey-?900$/i, /^black$/i],
    medium: [/^medium$/i, /^gray-?500$/i, /^grey-?500$/i],
    light: [/^light$/i, /^gray-?100$/i, /^grey-?100$/i, /^white$/i],
  };

  for (const ionicColor of IONIC_COLOR_NAMES) {
    for (const pattern of patterns[ionicColor]) {
      // Check against full path and name
      const match = colors.find(
        c =>
          pattern.test(c.name) ||
          pattern.test(c.path.join('-')) ||
          pattern.test(c.path.join('/'))
      );

      if (match && !mapping.has(ionicColor)) {
        mapping.set(ionicColor, match);
        break;
      }
    }
  }

  return mapping;
}

// =============================================================================
// CSS Generation
// =============================================================================

/**
 * Generate Ionic color CSS variables for a single color
 */
function generateColorVariables(
  _name: IonicColorName,
  baseColor: ColorValue
): IonicColorVariables {
  return {
    base: colorToHex(baseColor),
    contrast: colorToHex(calculateContrast(baseColor)),
    shade: colorToHex(calculateShade(baseColor)),
    tint: colorToHex(calculateTint(baseColor)),
    rgb: colorToRgbTriplet(baseColor),
    contrastRgb: colorToRgbTriplet(calculateContrast(baseColor)),
  };
}

/**
 * Generate CSS for Ionic color variables
 */
function generateColorCss(
  name: IonicColorName,
  variables: IonicColorVariables
): string {
  return `  --ion-color-${name}: ${variables.base};
  --ion-color-${name}-rgb: ${variables.rgb};
  --ion-color-${name}-contrast: ${variables.contrast};
  --ion-color-${name}-contrast-rgb: ${variables.contrastRgb};
  --ion-color-${name}-shade: ${variables.shade};
  --ion-color-${name}-tint: ${variables.tint};`;
}

/**
 * Generate Ionic color class CSS
 */
function generateColorClass(name: IonicColorName): string {
  return `.ion-color-${name} {
  --ion-color-base: var(--ion-color-${name});
  --ion-color-base-rgb: var(--ion-color-${name}-rgb);
  --ion-color-contrast: var(--ion-color-${name}-contrast);
  --ion-color-contrast-rgb: var(--ion-color-${name}-contrast-rgb);
  --ion-color-shade: var(--ion-color-${name}-shade);
  --ion-color-tint: var(--ion-color-${name}-tint);
}`;
}

// =============================================================================
// Main Generator
// =============================================================================

export interface IonicGeneratorOptions {
  /** Mode to use for token values (default: uses default mode) */
  mode?: string;
  /** Include utility color classes */
  includeColorClasses?: boolean;
  /** Custom color mappings (override auto-detection) */
  colorMappings?: Partial<Record<IonicColorName, string[]>>;
}

export interface IonicGeneratorOutput {
  theme: Partial<IonicTheme>;
  css: string;
}

/**
 * Generate Ionic theme from normalized design tokens
 */
export function generateIonicTheme(
  theme: ThemeFile,
  options: IonicGeneratorOptions = {}
): IonicGeneratorOutput {
  const { mode, includeColorClasses = true } = options;

  // Find color collections
  const colorTokens: TokenGroup = {};

  for (const collection of theme.collections) {
    const selectedMode = mode || collection.defaultMode;
    const tokens = collection.tokens[selectedMode];

    if (tokens) {
      Object.assign(colorTokens, tokens);
    }
  }

  // Extract all color tokens
  const extractedColors = extractColors(colorTokens);

  // Map to Ionic colors
  const ionicColorMap = mapToIonicColors(extractedColors);

  // Generate color variables
  const colors: Partial<Record<IonicColorName, IonicColorVariables>> = {};
  const colorCssLines: string[] = [];
  const colorClassCss: string[] = [];

  for (const ionicColor of IONIC_COLOR_NAMES) {
    const extracted = ionicColorMap.get(ionicColor);

    if (extracted) {
      const variables = generateColorVariables(ionicColor, extracted.color);
      colors[ionicColor] = variables;
      colorCssLines.push(generateColorCss(ionicColor, variables));

      if (includeColorClasses) {
        colorClassCss.push(generateColorClass(ionicColor));
      }
    }
  }

  // Build CSS output
  const css = `:root {
${colorCssLines.join('\n\n')}
}

${colorClassCss.join('\n\n')}`;

  return {
    theme: {
      colors: colors as IonicTheme['colors'],
    },
    css,
  };
}

/**
 * Generate dark mode Ionic theme
 */
export function generateIonicDarkTheme(
  theme: ThemeFile,
  options: IonicGeneratorOptions = {}
): IonicGeneratorOutput {
  // Look for dark mode in collections
  const darkMode = 'dark';

  return generateIonicTheme(theme, {
    ...options,
    mode: darkMode,
  });
}
