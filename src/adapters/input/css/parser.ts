/**
 * CSS Parser
 *
 * Parses CSS variables from :root, @theme blocks, and dark mode selectors.
 */

import type {
  ColorValue,
  DimensionValue,
  DurationValue,
  Token,
  TokenGroup,
} from '../../../schema/tokens.js';
import type { ParsedVariable, DetectedToken, CSSParseOptions, CSSTokenType } from './types.js';

// =============================================================================
// CSS Variable Extraction
// =============================================================================

/**
 * Extract CSS variables from a CSS string
 */
export function extractVariables(css: string, options: CSSParseOptions = {}): ParsedVariable[] {
  const variables: ParsedVariable[] = [];
  const {
    parseTailwindTheme = true,
    parseRootVariables = true,
    parseDarkMode = true,
  } = options;

  // Parse @theme blocks (Tailwind v4)
  if (parseTailwindTheme) {
    const themeRegex = /@theme\s*\{([^}]+)\}/g;
    let match;
    while ((match = themeRegex.exec(css)) !== null) {
      const blockContent = match[1];
      const blockStart = css.substring(0, match.index).split('\n').length;
      extractFromBlock(blockContent, '@theme', variables, blockStart);
    }
  }

  // Parse :root variables
  if (parseRootVariables) {
    const rootRegex = /:root\s*\{([^}]+)\}/g;
    let match;
    while ((match = rootRegex.exec(css)) !== null) {
      const blockContent = match[1];
      const blockStart = css.substring(0, match.index).split('\n').length;
      extractFromBlock(blockContent, ':root', variables, blockStart);
    }
  }

  // Parse dark mode variables
  if (parseDarkMode) {
    // .dark selector
    const darkClassRegex = /\.dark\s*\{([^}]+)\}/g;
    let match;
    while ((match = darkClassRegex.exec(css)) !== null) {
      const blockContent = match[1];
      const blockStart = css.substring(0, match.index).split('\n').length;
      extractFromBlock(blockContent, '.dark', variables, blockStart);
    }

    // [data-theme="dark"] selector
    const dataThemeRegex = /\[data-theme=["']dark["']\]\s*\{([^}]+)\}/g;
    while ((match = dataThemeRegex.exec(css)) !== null) {
      const blockContent = match[1];
      const blockStart = css.substring(0, match.index).split('\n').length;
      extractFromBlock(blockContent, '[data-theme="dark"]', variables, blockStart);
    }

    // @media (prefers-color-scheme: dark) :root
    const prefersRegex = /@media\s*\(\s*prefers-color-scheme:\s*dark\s*\)\s*\{[^{]*:root\s*\{([^}]+)\}/g;
    while ((match = prefersRegex.exec(css)) !== null) {
      const blockContent = match[1];
      const blockStart = css.substring(0, match.index).split('\n').length;
      extractFromBlock(blockContent, '@media (prefers-color-scheme: dark)', variables, blockStart);
    }
  }

  return variables;
}

/**
 * Extract variables from a CSS block
 */
function extractFromBlock(
  content: string,
  context: string,
  variables: ParsedVariable[],
  startLine: number
): void {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineVarRegex = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
    let lineMatch;
    while ((lineMatch = lineVarRegex.exec(line)) !== null) {
      variables.push({
        name: lineMatch[1],
        rawValue: lineMatch[2].trim(),
        context,
        line: startLine + i,
      });
    }
  }
}

// =============================================================================
// Value Type Detection
// =============================================================================

/**
 * Detect the token type from a CSS value
 */
export function detectTokenType(value: string): CSSTokenType {
  const trimmed = value.trim();

  // Color detection
  if (isColor(trimmed)) {
    return 'color';
  }

  // Dimension detection
  if (isDimension(trimmed)) {
    return 'dimension';
  }

  // Duration detection
  if (isDuration(trimmed)) {
    return 'duration';
  }

  // Font family detection (quoted or comma-separated)
  if (isFontFamily(trimmed)) {
    return 'fontFamily';
  }

  // Font weight detection
  if (isFontWeight(trimmed)) {
    return 'fontWeight';
  }

  // Number detection
  if (isNumber(trimmed)) {
    return 'number';
  }

  // Default to string
  return 'string';
}

/**
 * Check if value is a color
 */
function isColor(value: string): boolean {
  // Hex colors
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) {
    return true;
  }

  // RGB/RGBA
  if (/^rgba?\s*\(/.test(value)) {
    return true;
  }

  // HSL/HSLA
  if (/^hsla?\s*\(/.test(value)) {
    return true;
  }

  // OKLCH
  if (/^oklch\s*\(/.test(value)) {
    return true;
  }

  // Named colors (common ones)
  const namedColors = [
    'transparent', 'currentcolor', 'inherit',
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
  ];
  if (namedColors.includes(value.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Check if value is a dimension
 */
function isDimension(value: string): boolean {
  return /^-?[\d.]+\s*(px|rem|em|%|vw|vh|dvh|svh|lvh|ch|ex|vmin|vmax)$/.test(value);
}

/**
 * Check if value is a duration
 */
function isDuration(value: string): boolean {
  return /^-?[\d.]+\s*(ms|s)$/.test(value);
}

/**
 * Check if value is a font family
 */
function isFontFamily(value: string): boolean {
  // Quoted font names or comma-separated list
  return /^["'].*["']/.test(value) || /,/.test(value) && !isColor(value);
}

/**
 * Check if value is a font weight
 */
function isFontWeight(value: string): boolean {
  const weights = [
    '100', '200', '300', '400', '500', '600', '700', '800', '900',
    'thin', 'extralight', 'light', 'normal', 'medium',
    'semibold', 'bold', 'extrabold', 'black',
  ];
  return weights.includes(value.toLowerCase());
}

/**
 * Check if value is a number
 */
function isNumber(value: string): boolean {
  return /^-?[\d.]+$/.test(value) && !isNaN(parseFloat(value));
}

// =============================================================================
// Value Parsing
// =============================================================================

/**
 * Parse a color value to ColorValue
 */
export function parseColor(value: string): ColorValue {
  const trimmed = value.trim().toLowerCase();

  // Hex
  if (trimmed.startsWith('#')) {
    return hexToColor(trimmed);
  }

  // RGB/RGBA
  if (trimmed.startsWith('rgb')) {
    return rgbToColor(trimmed);
  }

  // HSL/HSLA
  if (trimmed.startsWith('hsl')) {
    return hslToColor(trimmed);
  }

  // OKLCH
  if (trimmed.startsWith('oklch')) {
    return oklchToColor(trimmed);
  }

  // Named colors
  const namedColors: Record<string, ColorValue> = {
    black: { r: 0, g: 0, b: 0, a: 1 },
    white: { r: 1, g: 1, b: 1, a: 1 },
    transparent: { r: 0, g: 0, b: 0, a: 0 },
    red: { r: 1, g: 0, b: 0, a: 1 },
    green: { r: 0, g: 0.502, b: 0, a: 1 },
    blue: { r: 0, g: 0, b: 1, a: 1 },
  };

  return namedColors[trimmed] || { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Convert hex to ColorValue
 */
function hexToColor(hex: string): ColorValue {
  let r = 0, g = 0, b = 0, a = 1;

  if (hex.length === 4) {
    // #RGB
    r = parseInt(hex[1] + hex[1], 16) / 255;
    g = parseInt(hex[2] + hex[2], 16) / 255;
    b = parseInt(hex[3] + hex[3], 16) / 255;
  } else if (hex.length === 5) {
    // #RGBA
    r = parseInt(hex[1] + hex[1], 16) / 255;
    g = parseInt(hex[2] + hex[2], 16) / 255;
    b = parseInt(hex[3] + hex[3], 16) / 255;
    a = parseInt(hex[4] + hex[4], 16) / 255;
  } else if (hex.length === 7) {
    // #RRGGBB
    r = parseInt(hex.slice(1, 3), 16) / 255;
    g = parseInt(hex.slice(3, 5), 16) / 255;
    b = parseInt(hex.slice(5, 7), 16) / 255;
  } else if (hex.length === 9) {
    // #RRGGBBAA
    r = parseInt(hex.slice(1, 3), 16) / 255;
    g = parseInt(hex.slice(3, 5), 16) / 255;
    b = parseInt(hex.slice(5, 7), 16) / 255;
    a = parseInt(hex.slice(7, 9), 16) / 255;
  }

  return { r, g, b, a };
}

/**
 * Convert rgb/rgba to ColorValue
 */
function rgbToColor(value: string): ColorValue {
  const match = value.match(/rgba?\s*\(\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/);
  if (!match) return { r: 0, g: 0, b: 0, a: 1 };

  const parseComponent = (v: string, max: number = 255) => {
    if (v.endsWith('%')) {
      return parseFloat(v) / 100;
    }
    return parseFloat(v) / max;
  };

  const r = parseComponent(match[1]);
  const g = parseComponent(match[2]);
  const b = parseComponent(match[3]);
  const a = match[4] ? parseComponent(match[4], 1) : 1;

  return { r, g, b, a };
}

/**
 * Convert hsl/hsla to ColorValue
 */
function hslToColor(value: string): ColorValue {
  const match = value.match(/hsla?\s*\(\s*([\d.]+)(?:deg)?\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)/);
  if (!match) return { r: 0, g: 0, b: 0, a: 1 };

  const h = parseFloat(match[1]) / 360;
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;
  const a = match[4] ? (match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4])) : 1;

  // HSL to RGB conversion
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return { r, g, b, a };
}

/**
 * Convert oklch to ColorValue (approximate)
 */
function oklchToColor(value: string): ColorValue {
  const match = value.match(/oklch\s*\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/);
  if (!match) return { r: 0, g: 0, b: 0, a: 1 };

  // OKLCH to RGB is complex - this is a simplified approximation
  // For accurate conversion, would need full color space math
  const l = match[1].endsWith('%') ? parseFloat(match[1]) / 100 : parseFloat(match[1]);
  const c = parseFloat(match[2]);
  const h = parseFloat(match[3]);
  const a = match[4] ? (match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4])) : 1;

  // Very rough approximation using hue
  const hRad = (h * Math.PI) / 180;
  const r = Math.max(0, Math.min(1, l + c * Math.cos(hRad)));
  const g = Math.max(0, Math.min(1, l + c * Math.cos(hRad - 2.094)));
  const b = Math.max(0, Math.min(1, l + c * Math.cos(hRad + 2.094)));

  return { r, g, b, a };
}

/**
 * Parse a dimension value
 */
export function parseDimension(value: string): DimensionValue {
  const match = value.match(/^(-?[\d.]+)\s*(px|rem|em|%|vw|vh|dvh|svh|lvh)$/);
  if (!match) return { value: 0, unit: 'px' };

  return {
    value: parseFloat(match[1]),
    unit: match[2] as DimensionValue['unit'],
  };
}

/**
 * Parse a duration value
 */
export function parseDuration(value: string): DurationValue {
  const match = value.match(/^(-?[\d.]+)\s*(ms|s)$/);
  if (!match) return { value: 0, unit: 'ms' };

  return {
    value: parseFloat(match[1]),
    unit: match[2] as 'ms' | 's',
  };
}

/**
 * Parse a font family value
 */
export function parseFontFamily(value: string): string[] {
  return value
    .split(',')
    .map(f => f.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

/**
 * Parse any CSS value to appropriate token value
 */
export function parseValue(value: string, type: CSSTokenType): unknown {
  switch (type) {
    case 'color':
      return parseColor(value);
    case 'dimension':
      return parseDimension(value);
    case 'duration':
      return parseDuration(value);
    case 'fontFamily':
      return parseFontFamily(value);
    case 'fontWeight':
      const numWeight = parseInt(value, 10);
      if (!isNaN(numWeight)) return numWeight;
      return value.toLowerCase();
    case 'number':
      return parseFloat(value);
    default:
      return value;
  }
}

// =============================================================================
// Variable Name to Token Path
// =============================================================================

/**
 * Convert CSS variable name to token path
 */
export function variableToPath(name: string, stripPrefix?: string): string {
  let path = name;

  // Strip prefix if specified
  if (stripPrefix && path.startsWith(stripPrefix)) {
    path = path.substring(stripPrefix.length);
  }

  // Convert common patterns
  // --color-primary-500 -> color/primary/500
  // --font-family-sans -> fontFamily/sans
  // --spacing-4 -> spacing/4
  path = path.replace(/-/g, '/');

  // Handle Tailwind namespace conventions
  path = path
    .replace(/^font\/family/, 'fontFamily')
    .replace(/^font\/size/, 'fontSize')
    .replace(/^font\/weight/, 'fontWeight')
    .replace(/^line\/height/, 'lineHeight')
    .replace(/^letter\/spacing/, 'letterSpacing');

  return path;
}

/**
 * Convert detected tokens to TokenGroup structure
 */
export function tokensToGroup(tokens: DetectedToken[]): TokenGroup {
  const group: TokenGroup = {};

  for (const token of tokens) {
    const parts = token.path.split('/');
    let current: TokenGroup = group;

    // Navigate/create nested structure
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] === 'string') {
        current[part] = {};
      }
      current = current[part] as TokenGroup;
    }

    // Set the token at the final path
    const finalKey = parts[parts.length - 1];
    current[finalKey] = {
      $type: token.type,
      $value: token.value,
    } as Token;
  }

  return group;
}
