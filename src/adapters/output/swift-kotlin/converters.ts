/**
 * Swift/Kotlin Converters
 *
 * Utilities for converting design token values to Swift (iOS) and Kotlin (Android)
 * native constant formats.
 */

import type {
  ColorValue,
  DimensionValue,
  TypographyValue,
  FontWeightValue,
  ShadowValue,
  GradientValue,
  GradientStop,
} from '../../../schema/tokens.js';

// =============================================================================
// Swift Color Conversion
// =============================================================================

/**
 * Convert a normalized color value to Swift UIColor/Color format.
 *
 * @param color - Color value with r, g, b, a in 0-1 range
 * @returns Swift color initializer string
 */
export function colorToSwift(color: ColorValue): string {
  // Format as Color(red:green:blue:opacity:) for SwiftUI
  return `Color(red: ${color.r.toFixed(3)}, green: ${color.g.toFixed(3)}, blue: ${color.b.toFixed(3)}, opacity: ${color.a.toFixed(3)})`;
}

/**
 * Convert a normalized color value to Swift UIColor format (UIKit).
 */
export function colorToUIKit(color: ColorValue): string {
  return `UIColor(red: ${color.r.toFixed(3)}, green: ${color.g.toFixed(3)}, blue: ${color.b.toFixed(3)}, alpha: ${color.a.toFixed(3)})`;
}

/**
 * Convert a normalized color value to Swift hex string format.
 */
export function colorToSwiftHex(color: ColorValue): string {
  const r = Math.round(color.r * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  const g = Math.round(color.g * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  const b = Math.round(color.b * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  const a = Math.round(color.a * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();

  return color.a === 1 ? `"#${r}${g}${b}"` : `"#${r}${g}${b}${a}"`;
}

// =============================================================================
// Kotlin Color Conversion
// =============================================================================

/**
 * Convert a normalized color value to Kotlin Compose Color format.
 *
 * @param color - Color value with r, g, b, a in 0-1 range
 * @returns Kotlin color initializer string
 */
export function colorToKotlin(color: ColorValue): string {
  // Format as Color(red, green, blue, alpha) for Jetpack Compose
  return `Color(${color.r.toFixed(3)}f, ${color.g.toFixed(3)}f, ${color.b.toFixed(3)}f, ${color.a.toFixed(3)}f)`;
}

/**
 * Convert a normalized color value to Kotlin ARGB Long format.
 */
export function colorToKotlinArgb(color: ColorValue): string {
  const a = Math.round(color.a * 255);
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  // Use unsigned long literal format
  const argb = ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
  return `0x${argb.toString(16).toUpperCase().padStart(8, '0')}`;
}

/**
 * Convert a normalized color value to Kotlin Color(0xAARRGGBB) format.
 */
export function colorToKotlinHex(color: ColorValue): string {
  return `Color(${colorToKotlinArgb(color)})`;
}

// =============================================================================
// Dimension Conversion
// =============================================================================

/**
 * Swift dimension units
 */
export type SwiftDimensionUnit = 'pt' | 'px';

/**
 * Convert a dimension value to Swift CGFloat.
 * Swift UI uses points (pt) as the base unit.
 */
export function dimensionToSwift(dim: DimensionValue): string {
  switch (dim.unit) {
    case 'px':
      // 1px = 1pt at 1x scale
      return `CGFloat(${dim.value})`;
    case 'rem':
    case 'em':
      // Convert to points assuming 16pt base
      return `CGFloat(${dim.value * 16})`;
    case '%':
      // Percentage needs context, return as multiplier
      return `CGFloat(${dim.value / 100})`;
    default:
      return `CGFloat(${dim.value})`;
  }
}

/**
 * Convert a dimension value to Swift numeric literal.
 */
export function dimensionToSwiftValue(dim: DimensionValue): number {
  switch (dim.unit) {
    case 'px':
      return dim.value;
    case 'rem':
    case 'em':
      return dim.value * 16;
    case '%':
      return dim.value / 100;
    default:
      return dim.value;
  }
}

/**
 * Convert a dimension value to Kotlin Dp format.
 * Jetpack Compose uses dp as the base unit.
 */
export function dimensionToKotlin(dim: DimensionValue, useSp: boolean = false): string {
  const unit = useSp ? 'sp' : 'dp';
  switch (dim.unit) {
    case 'px':
      // 1px = 1dp at mdpi baseline
      return `${dim.value}.${unit}`;
    case 'rem':
    case 'em':
      // Convert to sp for text sizes
      return `${dim.value * 16}.sp`;
    case '%':
      // Percentage - return as dp (will need context)
      return `${dim.value}.${unit}`;
    default:
      return `${dim.value}.${unit}`;
  }
}

/**
 * Convert a dimension value to Kotlin numeric value.
 */
export function dimensionToKotlinValue(dim: DimensionValue): number {
  switch (dim.unit) {
    case 'px':
      return dim.value;
    case 'rem':
    case 'em':
      return dim.value * 16;
    case '%':
      return dim.value;
    default:
      return dim.value;
  }
}

// =============================================================================
// Name Conversion
// =============================================================================

/**
 * Convert a token path to a valid Swift constant name.
 * Swift uses camelCase for constants (though PascalCase for types).
 *
 * @param path - Array of path segments
 * @param prefix - Optional prefix
 * @returns Valid Swift identifier like "colorsPrimary500"
 */
export function tokenNameToSwift(path: string[], prefix: string = ''): string {
  const segments = prefix ? [prefix, ...path] : path;

  // Flatten all segments into words
  const words: string[] = [];
  for (const segment of segments) {
    // Split on hyphens, underscores, spaces, and camelCase boundaries
    const parts = segment
      .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to spaces
      .replace(/[-_\s]+/g, ' ') // normalize separators to spaces
      .replace(/[^a-zA-Z0-9 ]/g, '') // remove special chars
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    words.push(...parts);
  }

  // Convert to camelCase
  return words
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * Convert a token path to a valid Kotlin constant name.
 * Kotlin uses camelCase for properties, SCREAMING_SNAKE_CASE for const val.
 *
 * @param path - Array of path segments
 * @param prefix - Optional prefix
 * @param screaming - Use SCREAMING_SNAKE_CASE (default: false)
 * @returns Valid Kotlin identifier
 */
export function tokenNameToKotlin(
  path: string[],
  prefix: string = '',
  screaming: boolean = false
): string {
  const segments = prefix ? [prefix, ...path] : path;

  // Flatten all segments into words
  const words: string[] = [];
  for (const segment of segments) {
    const parts = segment
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_\s]+/g, ' ')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    words.push(...parts);
  }

  if (screaming) {
    return words.map((w) => w.toUpperCase()).join('_');
  }

  // Convert to camelCase
  return words
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * Ensure a name is a valid Swift identifier.
 * Prepends underscore if name starts with a digit.
 */
export function ensureValidSwiftName(name: string): string {
  if (/^\d/.test(name)) {
    return `_${name}`;
  }
  // Swift reserved words
  const reserved = [
    'class',
    'struct',
    'enum',
    'protocol',
    'extension',
    'func',
    'var',
    'let',
    'if',
    'else',
    'switch',
    'case',
    'default',
    'for',
    'while',
    'repeat',
    'break',
    'continue',
    'return',
    'throw',
    'try',
    'catch',
    'import',
    'true',
    'false',
    'nil',
    'self',
    'Self',
    'super',
    'init',
    'deinit',
    'subscript',
    'typealias',
    'associatedtype',
    'inout',
    'static',
    'public',
    'private',
    'fileprivate',
    'internal',
    'open',
    'final',
    'override',
    'mutating',
    'nonmutating',
    'lazy',
    'weak',
    'unowned',
    'guard',
    'defer',
    'is',
    'as',
    'Any',
    'Type',
  ];
  if (reserved.includes(name)) {
    return `\`${name}\``;
  }
  return name;
}

/**
 * Ensure a name is a valid Kotlin identifier.
 */
export function ensureValidKotlinName(name: string): string {
  if (/^\d/.test(name)) {
    return `_${name}`;
  }
  // Kotlin reserved words
  const reserved = [
    'as',
    'break',
    'class',
    'continue',
    'do',
    'else',
    'false',
    'for',
    'fun',
    'if',
    'in',
    'interface',
    'is',
    'null',
    'object',
    'package',
    'return',
    'super',
    'this',
    'throw',
    'true',
    'try',
    'typealias',
    'typeof',
    'val',
    'var',
    'when',
    'while',
  ];
  if (reserved.includes(name)) {
    return `\`${name}\``;
  }
  return name;
}

// =============================================================================
// Typography Conversion
// =============================================================================

/**
 * Convert font weight to Swift UIFont.Weight.
 */
export function fontWeightToSwift(weight: FontWeightValue): string {
  const numericWeight = typeof weight === 'number' ? weight : fontWeightToNumeric(weight);

  if (numericWeight <= 100) return '.ultraLight';
  if (numericWeight <= 200) return '.thin';
  if (numericWeight <= 300) return '.light';
  if (numericWeight <= 400) return '.regular';
  if (numericWeight <= 500) return '.medium';
  if (numericWeight <= 600) return '.semibold';
  if (numericWeight <= 700) return '.bold';
  if (numericWeight <= 800) return '.heavy';
  return '.black';
}

/**
 * Convert font weight to Kotlin FontWeight.
 */
export function fontWeightToKotlin(weight: FontWeightValue): string {
  const numericWeight = typeof weight === 'number' ? weight : fontWeightToNumeric(weight);
  return `FontWeight.W${Math.round(numericWeight / 100) * 100}`;
}

/**
 * Convert keyword font weight to numeric.
 */
function fontWeightToNumeric(weight: string): number {
  const weightMap: Record<string, number> = {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  };
  return weightMap[weight] ?? 400;
}

/**
 * Convert typography value to Swift Font configuration.
 */
export function typographyToSwift(typography: TypographyValue): {
  size: number;
  weight: string;
  family: string;
  lineHeight?: number;
  letterSpacing?: number;
} {
  const fontFamily =
    typography.fontFamily.length > 0
      ? typography.fontFamily[0]
          .replace(/['"]/g, '')
          .replace(/,.*$/, '')
          .trim()
      : 'system';

  const lineHeight =
    typeof typography.lineHeight === 'number'
      ? typography.fontSize.value * typography.lineHeight
      : typography.lineHeight
        ? dimensionToSwiftValue(typography.lineHeight)
        : undefined;

  const letterSpacing = typography.letterSpacing
    ? dimensionToSwiftValue(typography.letterSpacing)
    : undefined;

  return {
    size: dimensionToSwiftValue(typography.fontSize),
    weight: fontWeightToSwift(typography.fontWeight),
    family: fontFamily,
    lineHeight,
    letterSpacing,
  };
}

/**
 * Convert typography value to Kotlin TextStyle configuration.
 */
export function typographyToKotlin(typography: TypographyValue): {
  fontSize: string;
  fontWeight: string;
  fontFamily: string;
  lineHeight?: string;
  letterSpacing?: string;
} {
  const fontFamily =
    typography.fontFamily.length > 0
      ? typography.fontFamily[0]
          .replace(/['"]/g, '')
          .replace(/,.*$/, '')
          .trim()
      : 'Default';

  // Map common font families to Kotlin FontFamily
  let kotlinFontFamily = 'FontFamily.Default';
  const lowerFamily = fontFamily.toLowerCase();
  if (lowerFamily.includes('mono') || lowerFamily.includes('courier')) {
    kotlinFontFamily = 'FontFamily.Monospace';
  } else if (lowerFamily.includes('serif') && !lowerFamily.includes('sans')) {
    kotlinFontFamily = 'FontFamily.Serif';
  } else if (lowerFamily.includes('sans')) {
    kotlinFontFamily = 'FontFamily.SansSerif';
  }

  const lineHeight =
    typeof typography.lineHeight === 'number'
      ? `${(typography.fontSize.value * typography.lineHeight).toFixed(1)}.sp`
      : typography.lineHeight
        ? dimensionToKotlin(typography.lineHeight, true)
        : undefined;

  const letterSpacing = typography.letterSpacing
    ? dimensionToKotlin(typography.letterSpacing, true)
    : undefined;

  return {
    fontSize: dimensionToKotlin(typography.fontSize, true),
    fontWeight: fontWeightToKotlin(typography.fontWeight),
    fontFamily: kotlinFontFamily,
    lineHeight,
    letterSpacing,
  };
}

// =============================================================================
// Shadow Conversion
// =============================================================================

/**
 * Convert shadow value to Swift shadow modifier parameters.
 */
export function shadowToSwift(shadow: ShadowValue): {
  color: string;
  radius: number;
  x: number;
  y: number;
} {
  return {
    color: colorToSwift(shadow.color),
    radius: dimensionToSwiftValue(shadow.blur),
    x: dimensionToSwiftValue(shadow.offsetX),
    y: dimensionToSwiftValue(shadow.offsetY),
  };
}

/**
 * Convert shadow value to Kotlin shadow parameters.
 */
export function shadowToKotlin(shadow: ShadowValue): {
  color: string;
  elevation: string;
  offsetX: string;
  offsetY: string;
} {
  return {
    color: colorToKotlin(shadow.color),
    elevation: dimensionToKotlin(shadow.blur),
    offsetX: dimensionToKotlin(shadow.offsetX),
    offsetY: dimensionToKotlin(shadow.offsetY),
  };
}

// =============================================================================
// Gradient Conversion
// =============================================================================

/**
 * Convert gradient stop to Swift format.
 */
function gradientStopToSwift(stop: GradientStop): string {
  return `Gradient.Stop(color: ${colorToSwift(stop.color)}, location: ${stop.position.toFixed(3)})`;
}

/**
 * Convert gradient value to Swift LinearGradient/RadialGradient.
 */
export function gradientToSwift(gradient: GradientValue): string {
  const stops = gradient.stops.map(gradientStopToSwift).join(',\n        ');

  switch (gradient.type) {
    case 'linear': {
      const angle = gradient.angle ?? 0;
      // Convert angle to SwiftUI start/end points
      const radians = (angle * Math.PI) / 180;
      const startX = 0.5 - Math.cos(radians) * 0.5;
      const startY = 0.5 - Math.sin(radians) * 0.5;
      const endX = 0.5 + Math.cos(radians) * 0.5;
      const endY = 0.5 + Math.sin(radians) * 0.5;
      return `LinearGradient(
      stops: [
        ${stops}
      ],
      startPoint: UnitPoint(x: ${startX.toFixed(3)}, y: ${startY.toFixed(3)}),
      endPoint: UnitPoint(x: ${endX.toFixed(3)}, y: ${endY.toFixed(3)})
    )`;
    }
    case 'radial':
      return `RadialGradient(
      stops: [
        ${stops}
      ],
      center: .center,
      startRadius: 0,
      endRadius: 100
    )`;
    case 'conic':
      return `AngularGradient(
      stops: [
        ${stops}
      ],
      center: .center,
      angle: .degrees(${gradient.angle ?? 0})
    )`;
    default:
      return `LinearGradient(stops: [${stops}], startPoint: .top, endPoint: .bottom)`;
  }
}

/**
 * Convert gradient stop to Kotlin format.
 */
function gradientStopToKotlin(stop: GradientStop): string {
  return `${stop.position.toFixed(3)}f to ${colorToKotlin(stop.color)}`;
}

/**
 * Convert gradient value to Kotlin Brush.
 */
export function gradientToKotlin(gradient: GradientValue): string {
  const stops = gradient.stops.map(gradientStopToKotlin).join(',\n        ');

  switch (gradient.type) {
    case 'linear': {
      const angle = gradient.angle ?? 0;
      return `Brush.linearGradient(
      colorStops = arrayOf(
        ${stops}
      ),
      start = Offset(0f, 0f),
      end = Offset(${Math.cos((angle * Math.PI) / 180).toFixed(3)}f, ${Math.sin((angle * Math.PI) / 180).toFixed(3)}f)
    )`;
    }
    case 'radial':
      return `Brush.radialGradient(
      colorStops = arrayOf(
        ${stops}
      ),
      center = Offset.Unspecified
    )`;
    case 'conic':
      return `Brush.sweepGradient(
      colorStops = arrayOf(
        ${stops}
      ),
      center = Offset.Unspecified
    )`;
    default:
      return `Brush.linearGradient(colorStops = arrayOf(${stops}))`;
  }
}

// =============================================================================
// Code Generation Utilities
// =============================================================================

/**
 * Generate Swift file header.
 */
export function swiftFileHeader(
  fileName: string,
  options: { imports?: string[]; description?: string } = {}
): string {
  const imports = options.imports ?? ['SwiftUI'];
  const importLines = imports.map((i) => `import ${i}`).join('\n');

  return `//
// ${fileName}
// Auto-generated design tokens
//
// DO NOT EDIT DIRECTLY - Generated from Figma design tokens
//

${importLines}
`;
}

/**
 * Generate Kotlin file header.
 */
export function kotlinFileHeader(
  packageName: string,
  options: { imports?: string[]; description?: string } = {}
): string {
  const defaultImports = [
    'androidx.compose.ui.graphics.Color',
    'androidx.compose.ui.unit.dp',
    'androidx.compose.ui.unit.sp',
  ];
  const imports = options.imports ?? defaultImports;
  const importLines = imports.map((i) => `import ${i}`).join('\n');

  return `/**
 * Auto-generated design tokens
 *
 * DO NOT EDIT DIRECTLY - Generated from Figma design tokens
 */

package ${packageName}

${importLines}
`;
}

/**
 * Indent content by a number of spaces.
 */
export function indent(content: string, spaces: number = 4): string {
  const pad = ' '.repeat(spaces);
  return content
    .split('\n')
    .map((line) => (line.trim() ? `${pad}${line}` : line))
    .join('\n');
}

/**
 * Escape a Swift string.
 */
export function escapeSwiftString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

/**
 * Escape a Kotlin string.
 */
export function escapeKotlinString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\$/g, '\\$');
}
