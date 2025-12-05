/**
 * Android XML Converters
 *
 * Utilities for converting design token values to Android resource formats.
 * Supports Android 13-15 (API 33-35) with Material 3 compatibility.
 */

import type { ColorValue, DimensionValue, TypographyValue, FontWeightValue } from '../../../schema/tokens.js';

// =============================================================================
// Color Conversion
// =============================================================================

/**
 * Convert a normalized color value to Android ARGB hex format.
 * Android uses #AARRGGBB format (alpha first), not #RRGGBBAA.
 *
 * @param color - Color value with r, g, b, a in 0-1 range
 * @returns Android color string like "#FF3880F6"
 */
export function colorToAndroid(color: ColorValue): string {
  const a = Math.round(color.a * 255);
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  return `#${a.toString(16).padStart(2, '0').toUpperCase()}${r.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}`;
}

/**
 * Convert a normalized color value to Android RGB hex format (no alpha).
 * Use this when alpha is always 1.0.
 *
 * @param color - Color value with r, g, b in 0-1 range
 * @returns Android color string like "#3880F6"
 */
export function colorToAndroidRgb(color: ColorValue): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  return `#${r.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}`;
}

// =============================================================================
// Dimension Conversion
// =============================================================================

/**
 * Android dimension units
 */
export type AndroidDimensionUnit = 'dp' | 'sp' | 'px';

/**
 * Convert a dimension value to Android format.
 * Converts web units to Android dp/sp:
 * - px → dp (1:1 for mdpi baseline)
 * - rem/em → sp (assuming 16px base, for text)
 * - % → kept as-is (rarely used in Android resources)
 *
 * @param dim - Dimension value with value and unit
 * @param preferSp - Use sp instead of dp (for text sizes)
 * @returns Android dimension string like "16dp" or "14sp"
 */
export function dimensionToAndroid(dim: DimensionValue, preferSp: boolean = false): string {
  const unit: AndroidDimensionUnit = preferSp ? 'sp' : 'dp';

  switch (dim.unit) {
    case 'px':
      // 1px = 1dp at mdpi baseline
      return `${dim.value}${unit}`;

    case 'rem':
    case 'em':
      // Convert rem/em to sp for scalable text
      // Assuming 1rem = 16px base
      const spValue = dim.value * 16;
      return `${spValue}sp`;

    case '%':
      // Percentages are rarely used in Android resources
      // Return as-is, will need manual handling
      return `${dim.value}%`;

    default:
      // For vw, vh, dvh, etc. - convert to dp assuming 360dp width baseline
      return `${dim.value}${unit}`;
  }
}

/**
 * Convert a raw number to Android dimension (assumes dp).
 */
export function numberToAndroidDimen(value: number, unit: AndroidDimensionUnit = 'dp'): string {
  return `${value}${unit}`;
}

// =============================================================================
// Name Conversion
// =============================================================================

/**
 * Convert a token path to a valid Android resource name.
 * Android resource names must be:
 * - Lowercase letters, digits, and underscores only
 * - Start with a letter or underscore
 * - No hyphens, spaces, or special characters
 *
 * @param path - Array of path segments (e.g., ['colors', 'primary', '500'])
 * @param prefix - Optional prefix for the resource name
 * @returns Valid Android resource name like "colors_primary_500"
 */
export function tokenNameToAndroid(path: string[], prefix: string = ''): string {
  const segments = prefix ? [prefix, ...path] : path;

  return segments
    .map((segment) =>
      segment
        .toLowerCase()
        // Replace hyphens and spaces with underscores
        .replace(/[-\s]+/g, '_')
        // Remove any non-alphanumeric characters except underscores
        .replace(/[^a-z0-9_]/g, '')
        // Collapse multiple underscores
        .replace(/_+/g, '_')
        // Remove leading/trailing underscores from segment
        .replace(/^_+|_+$/g, '')
    )
    .filter((segment) => segment.length > 0)
    .join('_');
}

/**
 * Ensure a resource name is valid for Android.
 * Prepends underscore if name starts with a digit.
 */
export function ensureValidAndroidName(name: string): string {
  // If starts with a digit, prepend underscore
  if (/^\d/.test(name)) {
    return `_${name}`;
  }
  return name;
}

// =============================================================================
// Typography Conversion
// =============================================================================

/**
 * Convert font weight to Android fontWeight attribute value.
 * Android supports numeric weights 100-900.
 */
export function fontWeightToAndroid(weight: FontWeightValue): number {
  if (typeof weight === 'number') {
    return weight;
  }

  // Convert keyword to numeric value
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
 * Convert typography value to Android TextAppearance style attributes.
 */
export function typographyToAndroidAttrs(typography: TypographyValue): Record<string, string> {
  const attrs: Record<string, string> = {};

  // Font size (always use sp for accessibility)
  attrs['android:textSize'] = dimensionToAndroid(typography.fontSize, true);

  // Font family
  if (typography.fontFamily.length > 0) {
    // Android uses sans-serif, serif, monospace, or custom font family name
    const family = typography.fontFamily[0].toLowerCase();
    if (family.includes('mono') || family.includes('courier')) {
      attrs['android:fontFamily'] = 'monospace';
    } else if (family.includes('serif') && !family.includes('sans')) {
      attrs['android:fontFamily'] = 'serif';
    } else {
      attrs['android:fontFamily'] = 'sans-serif';
    }
  }

  // Font weight (API 28+)
  const weight = fontWeightToAndroid(typography.fontWeight);
  attrs['android:textFontWeight'] = String(weight);

  // Text style for bold/italic
  if (weight >= 700) {
    attrs['android:textStyle'] = 'bold';
  }

  // Line height (API 28+)
  if (typeof typography.lineHeight === 'number') {
    // Multiplier - convert to explicit line height
    const lineHeightPx = typography.fontSize.value * typography.lineHeight;
    attrs['android:lineHeight'] = `${Math.round(lineHeightPx)}sp`;
  } else if (typography.lineHeight) {
    attrs['android:lineHeight'] = dimensionToAndroid(typography.lineHeight, true);
  }

  // Letter spacing (em units in Android)
  if (typography.letterSpacing) {
    // Convert to em (Android uses em for letterSpacing)
    let emValue: number;
    if (typography.letterSpacing.unit === 'em') {
      emValue = typography.letterSpacing.value;
    } else {
      // Convert px to em based on font size
      emValue = typography.letterSpacing.value / typography.fontSize.value;
    }
    attrs['android:letterSpacing'] = emValue.toFixed(3);
  }

  // Text transform
  if (typography.textTransform === 'uppercase') {
    attrs['android:textAllCaps'] = 'true';
  }

  return attrs;
}

// =============================================================================
// XML Utilities
// =============================================================================

/**
 * Escape special characters for XML content.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate XML declaration header.
 */
export function xmlHeader(): string {
  return '<?xml version="1.0" encoding="utf-8"?>';
}

/**
 * Indent XML content by a number of spaces.
 */
export function indent(content: string, spaces: number = 4): string {
  const pad = ' '.repeat(spaces);
  return content
    .split('\n')
    .map((line) => (line.trim() ? `${pad}${line}` : line))
    .join('\n');
}
