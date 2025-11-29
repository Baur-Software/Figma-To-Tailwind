/**
 * SCSS Output Adapter
 *
 * Transforms normalized design tokens into SCSS/Sass format
 * with variables, maps, and optional mixins.
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
  ShadowValue,
} from '../../schema/tokens.js';

// =============================================================================
// Output Types
// =============================================================================

/**
 * SCSS output structure
 */
export interface ScssOutput {
  /** SCSS variable declarations ($color-primary: #3880f6;) */
  variables: string;
  /** SCSS maps ($colors: (primary: $color-primary, ...);) */
  maps: string;
  /** SCSS mixins for common patterns */
  mixins: string;
  /** Combined SCSS output */
  scss: string;
  /** Separate files map */
  files: {
    '_variables.scss': string;
    '_maps.scss': string;
    '_mixins.scss': string;
    '_index.scss': string;
  };
}

// =============================================================================
// Adapter Options
// =============================================================================

export interface ScssAdapterOptions extends OutputAdapterOptions {
  /** Variable name prefix (default: '') */
  prefix?: string;
  /** Generate SCSS maps (default: true) */
  generateMaps?: boolean;
  /** Generate mixins (default: true) */
  generateMixins?: boolean;
  /** Use !default flag on variables (default: true) */
  useDefault?: boolean;
  /** Color output format */
  colorFormat?: 'hex' | 'rgb' | 'hsl';
}

// =============================================================================
// Color Conversion Utilities
// =============================================================================

function colorToHex(color: ColorValue): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  if (color.a < 1) {
    const a = Math.round(color.a * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
  }

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function colorToRgba(color: ColorValue): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  if (color.a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(2)})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function colorToHsl(color: ColorValue): string {
  const r = color.r;
  const g = color.g;
  const b = color.b;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  if (color.a < 1) {
    return `hsla(${hDeg}, ${sPercent}%, ${lPercent}%, ${color.a.toFixed(2)})`;
  }
  return `hsl(${hDeg}, ${sPercent}%, ${lPercent}%)`;
}

function formatColor(color: ColorValue, format: 'hex' | 'rgb' | 'hsl'): string {
  switch (format) {
    case 'rgb':
      return colorToRgba(color);
    case 'hsl':
      return colorToHsl(color);
    case 'hex':
    default:
      return colorToHex(color);
  }
}

function formatDimension(dim: DimensionValue): string {
  return `${dim.value}${dim.unit}`;
}

function formatShadow(shadow: ShadowValue): string {
  const parts: string[] = [];
  if (shadow.inset) {
    parts.push('inset');
  }
  parts.push(formatDimension(shadow.offsetX));
  parts.push(formatDimension(shadow.offsetY));
  parts.push(formatDimension(shadow.blur));
  if (shadow.spread) {
    parts.push(formatDimension(shadow.spread));
  }
  parts.push(colorToRgba(shadow.color));
  return parts.join(' ');
}

// =============================================================================
// SCSS Adapter Implementation
// =============================================================================

/**
 * SCSS Output Adapter
 *
 * Generates SCSS/Sass output with:
 * - Variable declarations
 * - Organized maps for colors, spacing, typography
 * - Utility mixins
 */
export class ScssAdapter implements OutputAdapter<ScssOutput> {
  readonly id = 'scss';
  readonly name = 'SCSS/Sass Adapter';

  /**
   * Transform normalized theme to SCSS output
   */
  async transform(
    theme: ThemeFile,
    options: ScssAdapterOptions = {}
  ): Promise<ScssOutput> {
    const {
      mode,
      prefix = '',
      generateMaps = true,
      generateMixins = true,
      useDefault = true,
      colorFormat = 'hex',
      format = {},
    } = options;

    const includeComments = format.comments !== false;

    // Generate variables
    const variables = this.generateVariables(theme, {
      mode,
      prefix,
      useDefault,
      colorFormat,
      includeComments,
    });

    // Generate maps
    const maps = generateMaps
      ? this.generateMaps(theme, { mode, prefix, includeComments })
      : '';

    // Generate mixins
    const mixins = generateMixins
      ? this.generateMixins(theme, { includeComments })
      : '';

    // Combined output
    const scss = this.generateCombined(variables, maps, mixins, includeComments);

    // Separate files
    const files = this.generateFiles(variables, maps, mixins, includeComments);

    return {
      variables,
      maps,
      mixins,
      scss,
      files,
    };
  }

  /**
   * Generate SCSS variable declarations
   */
  private generateVariables(
    theme: ThemeFile,
    options: {
      mode?: string;
      prefix: string;
      useDefault: boolean;
      colorFormat: 'hex' | 'rgb' | 'hsl';
      includeComments: boolean;
    }
  ): string {
    const { mode, prefix, useDefault, colorFormat, includeComments } = options;
    const lines: string[] = [];
    const defaultFlag = useDefault ? ' !default' : '';

    if (includeComments) {
      lines.push('// =============================================================================');
      lines.push('// Design Token Variables');
      lines.push(`// Generated from: ${theme.name}`);
      lines.push('// =============================================================================');
      lines.push('');
    }

    for (const collection of theme.collections) {
      const targetMode = mode || collection.defaultMode;
      const tokens = collection.tokens[targetMode];

      if (!tokens) continue;

      if (includeComments) {
        lines.push(`// ${collection.name}`);
        lines.push('// ' + '-'.repeat(70));
      }

      this.processTokenGroup(tokens, [], lines, {
        prefix,
        defaultFlag,
        colorFormat,
        includeComments,
      });

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Recursively process token groups
   */
  private processTokenGroup(
    group: TokenGroup,
    path: string[],
    lines: string[],
    options: {
      prefix: string;
      defaultFlag: string;
      colorFormat: 'hex' | 'rgb' | 'hsl';
      includeComments: boolean;
    }
  ): void {
    for (const [key, value] of Object.entries(group)) {
      if (key.startsWith('$')) continue; // Skip meta keys

      if (this.isToken(value)) {
        const varName = this.toScssVarName([...path, key], options.prefix);
        const varValue = this.formatTokenValue(value, options.colorFormat);

        if (options.includeComments && value.$description) {
          lines.push(`// ${value.$description}`);
        }

        lines.push(`$${varName}: ${varValue}${options.defaultFlag};`);
      } else if (typeof value === 'object' && value !== null) {
        this.processTokenGroup(value as TokenGroup, [...path, key], lines, options);
      }
    }
  }

  /**
   * Convert path to SCSS variable name
   */
  private toScssVarName(path: string[], prefix: string): string {
    const name = path
      .map(p => p.toLowerCase().replace(/\s+/g, '-'))
      .join('-');
    return prefix ? `${prefix}-${name}` : name;
  }

  /**
   * Format token value for SCSS
   */
  private formatTokenValue(
    token: Token,
    colorFormat: 'hex' | 'rgb' | 'hsl'
  ): string {
    const value = token.$value;

    // Handle references
    if (typeof value === 'object' && value !== null && '$ref' in value) {
      // Convert reference to SCSS variable reference
      const refPath = (value.$ref as string).replace(/\./g, '-');
      return `$${refPath}`;
    }

    switch (token.$type) {
      case 'color':
        return formatColor(value as ColorValue, colorFormat);

      case 'dimension':
        return formatDimension(value as DimensionValue);

      case 'fontFamily': {
        // Handle both string and array formats
        const fonts: string[] = Array.isArray(value) ? value as string[] : [String(value)];
        return fonts.map(f =>
          f.includes(' ') ? `"${f}"` : f
        ).join(', ');
      }

      case 'fontWeight':
        return String(value);

      case 'typography': {
        const typo = value as TypographyValue;
        // Return as a map for typography
        const parts: string[] = [];
        parts.push(`font-family: ${typo.fontFamily.map(f => f.includes(' ') ? `"${f}"` : f).join(', ')}`);
        parts.push(`font-size: ${formatDimension(typo.fontSize)}`);
        parts.push(`font-weight: ${typo.fontWeight}`);
        if (typeof typo.lineHeight === 'number') {
          parts.push(`line-height: ${typo.lineHeight}`);
        } else {
          parts.push(`line-height: ${formatDimension(typo.lineHeight)}`);
        }
        if (typo.letterSpacing) {
          parts.push(`letter-spacing: ${formatDimension(typo.letterSpacing)}`);
        }
        return `(${parts.join(', ')})`;
      }

      case 'shadow': {
        if (Array.isArray(value)) {
          return (value as ShadowValue[]).map(formatShadow).join(', ');
        }
        return formatShadow(value as ShadowValue);
      }

      case 'number':
        return String(value);

      case 'string':
      default:
        return typeof value === 'string' && value.includes(' ')
          ? `"${value}"`
          : String(value);
    }
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

  /**
   * Generate SCSS maps
   */
  private generateMaps(
    theme: ThemeFile,
    options: {
      mode?: string;
      prefix: string;
      includeComments: boolean;
    }
  ): string {
    const { mode, prefix, includeComments } = options;
    const lines: string[] = [];

    if (includeComments) {
      lines.push('// =============================================================================');
      lines.push('// Token Maps');
      lines.push('// =============================================================================');
      lines.push('');
    }

    // Collect tokens by type
    const colorTokens: Array<{ name: string; varName: string }> = [];
    const spacingTokens: Array<{ name: string; varName: string }> = [];
    const fontTokens: Array<{ name: string; varName: string }> = [];
    const radiusTokens: Array<{ name: string; varName: string }> = [];

    for (const collection of theme.collections) {
      const targetMode = mode || collection.defaultMode;
      const tokens = collection.tokens[targetMode];
      if (!tokens) continue;

      this.collectTokensForMaps(tokens, [], {
        prefix,
        colorTokens,
        spacingTokens,
        fontTokens,
        radiusTokens,
      });
    }

    // Generate color map
    if (colorTokens.length > 0) {
      if (includeComments) {
        lines.push('// Color palette map');
      }
      lines.push('$colors: (');
      for (const token of colorTokens) {
        lines.push(`  "${token.name}": $${token.varName},`);
      }
      lines.push(') !default;');
      lines.push('');
    }

    // Generate spacing map
    if (spacingTokens.length > 0) {
      if (includeComments) {
        lines.push('// Spacing scale map');
      }
      lines.push('$spacing: (');
      for (const token of spacingTokens) {
        lines.push(`  "${token.name}": $${token.varName},`);
      }
      lines.push(') !default;');
      lines.push('');
    }

    // Generate font families map
    if (fontTokens.length > 0) {
      if (includeComments) {
        lines.push('// Font families map');
      }
      lines.push('$fonts: (');
      for (const token of fontTokens) {
        lines.push(`  "${token.name}": $${token.varName},`);
      }
      lines.push(') !default;');
      lines.push('');
    }

    // Generate radius map
    if (radiusTokens.length > 0) {
      if (includeComments) {
        lines.push('// Border radius map');
      }
      lines.push('$radii: (');
      for (const token of radiusTokens) {
        lines.push(`  "${token.name}": $${token.varName},`);
      }
      lines.push(') !default;');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Collect tokens for map generation
   */
  private collectTokensForMaps(
    group: TokenGroup,
    path: string[],
    context: {
      prefix: string;
      colorTokens: Array<{ name: string; varName: string }>;
      spacingTokens: Array<{ name: string; varName: string }>;
      fontTokens: Array<{ name: string; varName: string }>;
      radiusTokens: Array<{ name: string; varName: string }>;
    }
  ): void {
    for (const [key, value] of Object.entries(group)) {
      if (key.startsWith('$')) continue;

      if (this.isToken(value)) {
        const fullPath = [...path, key];
        const varName = this.toScssVarName(fullPath, context.prefix);
        const name = fullPath.join('-');

        switch (value.$type) {
          case 'color':
            context.colorTokens.push({ name, varName });
            break;
          case 'dimension':
            if (path.some(p => p.toLowerCase().includes('spacing') || p.toLowerCase().includes('space'))) {
              context.spacingTokens.push({ name, varName });
            } else if (path.some(p => p.toLowerCase().includes('radius'))) {
              context.radiusTokens.push({ name, varName });
            }
            break;
          case 'fontFamily':
            context.fontTokens.push({ name, varName });
            break;
        }
      } else if (typeof value === 'object' && value !== null) {
        this.collectTokensForMaps(value as TokenGroup, [...path, key], context);
      }
    }
  }

  /**
   * Generate SCSS mixins
   */
  private generateMixins(
    _theme: ThemeFile,
    options: { includeComments: boolean }
  ): string {
    const { includeComments } = options;
    const lines: string[] = [];

    if (includeComments) {
      lines.push('// =============================================================================');
      lines.push('// Utility Mixins');
      lines.push('// =============================================================================');
      lines.push('');
    }

    // Color getter function
    lines.push('@function color($name) {');
    lines.push('  @if map-has-key($colors, $name) {');
    lines.push('    @return map-get($colors, $name);');
    lines.push('  }');
    lines.push('  @warn "Color `#{$name}` not found in $colors map.";');
    lines.push('  @return null;');
    lines.push('}');
    lines.push('');

    // Spacing getter function
    lines.push('@function spacing($name) {');
    lines.push('  @if map-has-key($spacing, $name) {');
    lines.push('    @return map-get($spacing, $name);');
    lines.push('  }');
    lines.push('  @warn "Spacing `#{$name}` not found in $spacing map.";');
    lines.push('  @return null;');
    lines.push('}');
    lines.push('');

    // Typography mixin
    lines.push('@mixin typography($style) {');
    lines.push('  @if type-of($style) == "map" {');
    lines.push('    font-family: map-get($style, font-family);');
    lines.push('    font-size: map-get($style, font-size);');
    lines.push('    font-weight: map-get($style, font-weight);');
    lines.push('    line-height: map-get($style, line-height);');
    lines.push('    @if map-has-key($style, letter-spacing) {');
    lines.push('      letter-spacing: map-get($style, letter-spacing);');
    lines.push('    }');
    lines.push('  }');
    lines.push('}');
    lines.push('');

    // Responsive mixin
    lines.push('@mixin respond-to($breakpoint) {');
    lines.push('  @if $breakpoint == "sm" {');
    lines.push('    @media (min-width: 640px) { @content; }');
    lines.push('  } @else if $breakpoint == "md" {');
    lines.push('    @media (min-width: 768px) { @content; }');
    lines.push('  } @else if $breakpoint == "lg" {');
    lines.push('    @media (min-width: 1024px) { @content; }');
    lines.push('  } @else if $breakpoint == "xl" {');
    lines.push('    @media (min-width: 1280px) { @content; }');
    lines.push('  }');
    lines.push('}');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate combined SCSS file
   */
  private generateCombined(
    variables: string,
    maps: string,
    mixins: string,
    includeComments: boolean
  ): string {
    const sections: string[] = [];

    if (includeComments) {
      sections.push('/**');
      sections.push(' * Design System SCSS');
      sections.push(` * Generated: ${new Date().toISOString()}`);
      sections.push(' */');
      sections.push('');
    }

    sections.push(variables);

    if (maps) {
      sections.push('');
      sections.push(maps);
    }

    if (mixins) {
      sections.push('');
      sections.push(mixins);
    }

    return sections.join('\n');
  }

  /**
   * Generate separate SCSS files
   */
  private generateFiles(
    variables: string,
    maps: string,
    mixins: string,
    includeComments: boolean
  ): ScssOutput['files'] {
    const header = includeComments
      ? `// Generated: ${new Date().toISOString()}\n\n`
      : '';

    return {
      '_variables.scss': header + variables,
      '_maps.scss': maps ? header + maps : '// No maps generated\n',
      '_mixins.scss': mixins ? header + mixins : '// No mixins generated\n',
      '_index.scss': [
        header,
        '@forward "variables";',
        '@forward "maps";',
        '@forward "mixins";',
        '',
      ].join('\n'),
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new SCSS adapter instance
 */
export function createScssAdapter(): ScssAdapter {
  return new ScssAdapter();
}
