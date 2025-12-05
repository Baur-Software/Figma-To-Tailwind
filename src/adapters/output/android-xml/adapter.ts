/**
 * Android XML Output Adapter
 *
 * Transforms normalized design tokens into Android resource XML format.
 * Supports Android 13-15 (API 33-35) with Material 3 compatibility.
 */

import type {
  ThemeFile,
  OutputAdapter,
  OutputAdapterOptions,
  Token,
  TokenGroup,
  ColorValue,
  DimensionValue,
  TypographyValue,
} from '../../../schema/tokens.js';

import {
  colorToAndroid,
  dimensionToAndroid,
  tokenNameToAndroid,
  ensureValidAndroidName,
  typographyToAndroidAttrs,
  xmlHeader,
  escapeXml,
} from './converters.js';

// =============================================================================
// Output Types
// =============================================================================

/**
 * Android XML output structure
 */
export interface AndroidXmlOutput {
  /** colors.xml content */
  colors: string;
  /** dimens.xml content */
  dimens: string;
  /** styles.xml content (typography as TextAppearance) */
  styles: string;
  /** Separate files map with Android resource directory structure */
  files: {
    'values/colors.xml': string;
    'values/dimens.xml': string;
    'values/styles.xml': string;
    'values-night/colors.xml'?: string;
  };
}

// =============================================================================
// Adapter Options
// =============================================================================

export interface AndroidXmlAdapterOptions extends OutputAdapterOptions {
  /** Resource name prefix (default: '') */
  resourcePrefix?: string;
  /** Minimum SDK version to target (default: 33 for Android 13) */
  minSdkVersion?: 33 | 34 | 35;
  /** Include XML comments with token descriptions (default: true) */
  includeComments?: boolean;
  /** Generate values-night/ for dark theme mode (default: false) */
  generateNightMode?: boolean;
  /** Use Material 3 naming conventions (default: true) */
  material3?: boolean;
}

// =============================================================================
// Collected Token Types
// =============================================================================

interface CollectedColor {
  name: string;
  value: string;
  description?: string;
}

interface CollectedDimen {
  name: string;
  value: string;
  description?: string;
}

interface CollectedStyle {
  name: string;
  parent?: string;
  attrs: Record<string, string>;
  description?: string;
}

// =============================================================================
// Android XML Adapter Implementation
// =============================================================================

/**
 * Android XML Output Adapter
 *
 * Generates Android resource XML files:
 * - colors.xml for color tokens
 * - dimens.xml for dimension and number tokens
 * - styles.xml for typography (TextAppearance styles)
 */
export class AndroidXmlAdapter implements OutputAdapter<AndroidXmlOutput> {
  readonly id = 'android-xml';
  readonly name = 'Android XML Resource Adapter';

  /**
   * Transform normalized theme to Android XML output
   */
  async transform(
    theme: ThemeFile,
    options: AndroidXmlAdapterOptions = {}
  ): Promise<AndroidXmlOutput> {
    const {
      mode,
      resourcePrefix = '',
      includeComments = true,
      generateNightMode = false,
      material3 = true,
    } = options;

    // Collect tokens by type
    const colors: CollectedColor[] = [];
    const dimens: CollectedDimen[] = [];
    const styles: CollectedStyle[] = [];

    for (const collection of theme.collections) {
      const targetMode = mode || collection.defaultMode;
      const tokens = collection.tokens[targetMode];

      if (!tokens) continue;

      this.collectTokens(tokens, [], {
        prefix: resourcePrefix,
        colors,
        dimens,
        styles,
        material3,
      });
    }

    // Generate XML content
    const colorsXml = this.generateColorsXml(colors, theme.name, includeComments);
    const dimensXml = this.generateDimensXml(dimens, theme.name, includeComments);
    const stylesXml = this.generateStylesXml(styles, theme.name, includeComments);

    // Build files object
    const files: AndroidXmlOutput['files'] = {
      'values/colors.xml': colorsXml,
      'values/dimens.xml': dimensXml,
      'values/styles.xml': stylesXml,
    };

    // Generate night mode colors if requested
    if (generateNightMode) {
      const nightColors = this.collectNightModeColors(theme, resourcePrefix, material3);
      if (nightColors.length > 0) {
        files['values-night/colors.xml'] = this.generateColorsXml(
          nightColors,
          theme.name,
          includeComments
        );
      }
    }

    return {
      colors: colorsXml,
      dimens: dimensXml,
      styles: stylesXml,
      files,
    };
  }

  /**
   * Collect night mode colors from theme (looks for 'dark' mode)
   */
  private collectNightModeColors(
    theme: ThemeFile,
    prefix: string,
    material3: boolean
  ): CollectedColor[] {
    const colors: CollectedColor[] = [];

    for (const collection of theme.collections) {
      // Look for dark mode
      const darkMode = collection.modes.find(
        (m) => m.toLowerCase().includes('dark') || m.toLowerCase() === 'night'
      );

      if (!darkMode || !collection.tokens[darkMode]) continue;

      this.collectTokens(collection.tokens[darkMode], [], {
        prefix,
        colors,
        dimens: [], // Only collecting colors for night mode
        styles: [],
        material3,
      });
    }

    return colors;
  }

  /**
   * Recursively collect tokens from token groups
   */
  private collectTokens(
    group: TokenGroup,
    path: string[],
    context: {
      prefix: string;
      colors: CollectedColor[];
      dimens: CollectedDimen[];
      styles: CollectedStyle[];
      material3: boolean;
    }
  ): void {
    for (const [key, value] of Object.entries(group)) {
      if (key.startsWith('$')) continue; // Skip meta keys

      if (this.isToken(value)) {
        const tokenPath = [...path, key];
        const name = ensureValidAndroidName(tokenNameToAndroid(tokenPath, context.prefix));

        switch (value.$type) {
          case 'color':
            this.collectColorToken(name, value, context.colors);
            break;

          case 'dimension':
            this.collectDimensionToken(name, value, context.dimens);
            break;

          case 'number':
            this.collectNumberToken(name, value, context.dimens);
            break;

          case 'typography':
            this.collectTypographyToken(name, value, context.styles);
            break;

          // Skip unsupported types (shadow, gradient, etc.)
          // These require drawable XML which is out of scope
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recurse into nested token groups
        this.collectTokens(value as TokenGroup, [...path, key], context);
      }
    }
  }

  /**
   * Collect a color token
   */
  private collectColorToken(name: string, token: Token, colors: CollectedColor[]): void {
    const value = token.$value;

    // Skip references for now (would need resolution)
    if (typeof value === 'object' && value !== null && '$ref' in value) {
      return;
    }

    colors.push({
      name,
      value: colorToAndroid(value as ColorValue),
      description: token.$description,
    });
  }

  /**
   * Collect a dimension token
   */
  private collectDimensionToken(name: string, token: Token, dimens: CollectedDimen[]): void {
    const value = token.$value;

    // Skip references
    if (typeof value === 'object' && value !== null && '$ref' in value) {
      return;
    }

    // Determine if this is a font-size (use sp) or other dimension (use dp)
    const isFontSize = name.toLowerCase().includes('font') || name.toLowerCase().includes('text');

    dimens.push({
      name,
      value: dimensionToAndroid(value as DimensionValue, isFontSize),
      description: token.$description,
    });
  }

  /**
   * Collect a number token
   */
  private collectNumberToken(name: string, token: Token, dimens: CollectedDimen[]): void {
    const value = token.$value;

    // Skip references
    if (typeof value === 'object' && value !== null && '$ref' in value) {
      return;
    }

    // Numbers become dimens with dp unit
    dimens.push({
      name,
      value: `${value}dp`,
      description: token.$description,
    });
  }

  /**
   * Collect a typography token as a TextAppearance style
   */
  private collectTypographyToken(name: string, token: Token, styles: CollectedStyle[]): void {
    const value = token.$value;

    // Skip references
    if (typeof value === 'object' && value !== null && '$ref' in value) {
      return;
    }

    const typography = value as TypographyValue;
    const attrs = typographyToAndroidAttrs(typography);

    // Convert name to PascalCase for style naming
    const styleName = this.toPascalCase(name);

    styles.push({
      name: `TextAppearance.${styleName}`,
      parent: 'TextAppearance.Material3.BodyMedium',
      attrs,
      description: token.$description,
    });
  }

  /**
   * Convert snake_case to PascalCase
   */
  private toPascalCase(name: string): string {
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Generate colors.xml content
   */
  private generateColorsXml(
    colors: CollectedColor[],
    themeName: string,
    includeComments: boolean
  ): string {
    const lines: string[] = [xmlHeader()];

    if (includeComments) {
      lines.push(`<!-- Generated from: ${escapeXml(themeName)} -->`);
      lines.push('<!-- Android 13+ (API 33+) color resources -->');
    }

    lines.push('<resources>');

    for (const color of colors) {
      if (includeComments && color.description) {
        lines.push(`    <!-- ${escapeXml(color.description)} -->`);
      }
      lines.push(`    <color name="${escapeXml(color.name)}">${color.value}</color>`);
    }

    lines.push('</resources>');

    return lines.join('\n');
  }

  /**
   * Generate dimens.xml content
   */
  private generateDimensXml(
    dimens: CollectedDimen[],
    themeName: string,
    includeComments: boolean
  ): string {
    const lines: string[] = [xmlHeader()];

    if (includeComments) {
      lines.push(`<!-- Generated from: ${escapeXml(themeName)} -->`);
      lines.push('<!-- Android 13+ (API 33+) dimension resources -->');
    }

    lines.push('<resources>');

    for (const dimen of dimens) {
      if (includeComments && dimen.description) {
        lines.push(`    <!-- ${escapeXml(dimen.description)} -->`);
      }
      lines.push(`    <dimen name="${escapeXml(dimen.name)}">${dimen.value}</dimen>`);
    }

    lines.push('</resources>');

    return lines.join('\n');
  }

  /**
   * Generate styles.xml content with TextAppearance styles
   */
  private generateStylesXml(
    styles: CollectedStyle[],
    themeName: string,
    includeComments: boolean
  ): string {
    const lines: string[] = [xmlHeader()];

    if (includeComments) {
      lines.push(`<!-- Generated from: ${escapeXml(themeName)} -->`);
      lines.push('<!-- Android 13+ (API 33+) text appearance styles -->');
      lines.push('<!-- Requires Material 3 components library -->');
    }

    lines.push('<resources>');

    for (const style of styles) {
      if (includeComments && style.description) {
        lines.push(`    <!-- ${escapeXml(style.description)} -->`);
      }

      const parentAttr = style.parent ? ` parent="${escapeXml(style.parent)}"` : '';
      lines.push(`    <style name="${escapeXml(style.name)}"${parentAttr}>`);

      for (const [attrName, attrValue] of Object.entries(style.attrs)) {
        lines.push(`        <item name="${escapeXml(attrName)}">${escapeXml(attrValue)}</item>`);
      }

      lines.push('    </style>');
    }

    lines.push('</resources>');

    return lines.join('\n');
  }

  /**
   * Check if value is a Token
   */
  private isToken(value: unknown): value is Token {
    return (
      typeof value === 'object' &&
      value !== null &&
      '$type' in value &&
      '$value' in value
    );
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new Android XML adapter instance
 */
export function createAndroidXmlAdapter(): AndroidXmlAdapter {
  return new AndroidXmlAdapter();
}
