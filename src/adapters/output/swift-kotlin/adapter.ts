/**
 * Swift/Kotlin Output Adapter
 *
 * Transforms normalized design tokens into Swift (iOS/SwiftUI) and Kotlin (Android/Compose)
 * native constant files.
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
  GradientValue,
} from '../../../schema/tokens.js';

import {
  colorToSwift,
  colorToUIKit,
  colorToKotlin,
  colorToKotlinHex,
  dimensionToSwift,
  dimensionToSwiftValue,
  dimensionToKotlin,
  tokenNameToSwift,
  ensureValidSwiftName,
  typographyToSwift,
  typographyToKotlin,
  shadowToSwift,
  shadowToKotlin,
  gradientToSwift,
  gradientToKotlin,
  swiftFileHeader,
  kotlinFileHeader,
} from './converters.js';

// =============================================================================
// Output Types
// =============================================================================

/**
 * Swift/Kotlin output structure
 */
export interface SwiftKotlinOutput {
  /** Swift file content (SwiftUI colors, dimensions, typography) */
  swift: string;
  /** Swift UIKit extensions file content */
  swiftUIKit?: string;
  /** Kotlin file content (Compose colors, dimensions, typography) */
  kotlin: string;
  /** Separate files map */
  files: {
    'DesignTokens.swift': string;
    'DesignTokens+UIKit.swift'?: string;
    'DesignTokens.kt': string;
  };
}

// =============================================================================
// Adapter Options
// =============================================================================

export interface SwiftKotlinAdapterOptions extends OutputAdapterOptions {
  /** Swift struct/enum name (default: 'DesignTokens') */
  swiftTypeName?: string;
  /** Kotlin object name (default: 'DesignTokens') */
  kotlinObjectName?: string;
  /** Kotlin package name (default: 'com.design.tokens') */
  kotlinPackage?: string;
  /** Include UIKit extensions for Swift (default: false) */
  includeUIKit?: boolean;
  /** Include description comments (default: true) */
  includeComments?: boolean;
  /** Use hex color format instead of component format (default: false) */
  hexColors?: boolean;
  /** Generate separate files per token category (default: false) */
  separateCategories?: boolean;
}

// =============================================================================
// Collected Token Types
// =============================================================================

interface CollectedColor {
  name: string;
  swiftValue: string;
  uiKitValue: string;
  kotlinValue: string;
  description?: string;
}

interface CollectedDimension {
  name: string;
  swiftValue: string;
  kotlinValue: string;
  rawValue: number;
  isFontSize: boolean;
  description?: string;
}

interface CollectedTypography {
  name: string;
  swiftConfig: ReturnType<typeof typographyToSwift>;
  kotlinConfig: ReturnType<typeof typographyToKotlin>;
  description?: string;
}

interface CollectedShadow {
  name: string;
  swiftConfig: ReturnType<typeof shadowToSwift>;
  kotlinConfig: ReturnType<typeof shadowToKotlin>;
  description?: string;
}

interface CollectedGradient {
  name: string;
  swiftValue: string;
  kotlinValue: string;
  description?: string;
}

// =============================================================================
// Swift/Kotlin Adapter Implementation
// =============================================================================

/**
 * Swift/Kotlin Output Adapter
 *
 * Generates native constant files:
 * - Swift: SwiftUI Color, Font, and dimension constants
 * - Kotlin: Compose Color, TextStyle, and dp/sp constants
 */
export class SwiftKotlinAdapter implements OutputAdapter<SwiftKotlinOutput> {
  readonly id = 'swift-kotlin';
  readonly name = 'Swift/Kotlin Native Constants Adapter';

  /**
   * Transform normalized theme to Swift/Kotlin output
   */
  async transform(
    theme: ThemeFile,
    options: SwiftKotlinAdapterOptions = {}
  ): Promise<SwiftKotlinOutput> {
    const {
      mode,
      swiftTypeName = 'DesignTokens',
      kotlinObjectName = 'DesignTokens',
      kotlinPackage = 'com.design.tokens',
      includeUIKit = false,
      includeComments = true,
      hexColors = false,
    } = options;

    // Collect tokens by type
    const colors: CollectedColor[] = [];
    const dimensions: CollectedDimension[] = [];
    const typographyTokens: CollectedTypography[] = [];
    const shadows: CollectedShadow[] = [];
    const gradients: CollectedGradient[] = [];

    for (const collection of theme.collections) {
      const targetMode = mode || collection.defaultMode;
      const tokens = collection.tokens[targetMode];

      if (!tokens) continue;

      this.collectTokens(tokens, [], {
        colors,
        dimensions,
        typographyTokens,
        shadows,
        gradients,
        hexColors,
      });
    }

    // Generate Swift content
    const swiftContent = this.generateSwift(
      colors,
      dimensions,
      typographyTokens,
      shadows,
      gradients,
      {
        typeName: swiftTypeName,
        themeName: theme.name,
        includeComments,
      }
    );

    // Generate Swift UIKit content (optional)
    const swiftUIKitContent = includeUIKit
      ? this.generateSwiftUIKit(colors, {
          typeName: swiftTypeName,
          themeName: theme.name,
          includeComments,
        })
      : undefined;

    // Generate Kotlin content
    const kotlinContent = this.generateKotlin(
      colors,
      dimensions,
      typographyTokens,
      shadows,
      gradients,
      {
        objectName: kotlinObjectName,
        packageName: kotlinPackage,
        themeName: theme.name,
        includeComments,
      }
    );

    // Build files object
    const files: SwiftKotlinOutput['files'] = {
      'DesignTokens.swift': swiftContent,
      'DesignTokens.kt': kotlinContent,
    };

    if (swiftUIKitContent) {
      files['DesignTokens+UIKit.swift'] = swiftUIKitContent;
    }

    return {
      swift: swiftContent,
      swiftUIKit: swiftUIKitContent,
      kotlin: kotlinContent,
      files,
    };
  }

  /**
   * Recursively collect tokens from token groups
   */
  private collectTokens(
    group: TokenGroup,
    path: string[],
    context: {
      colors: CollectedColor[];
      dimensions: CollectedDimension[];
      typographyTokens: CollectedTypography[];
      shadows: CollectedShadow[];
      gradients: CollectedGradient[];
      hexColors: boolean;
    }
  ): void {
    for (const [key, value] of Object.entries(group)) {
      if (key.startsWith('$')) continue;

      if (this.isToken(value)) {
        const tokenPath = [...path, key];

        switch (value.$type) {
          case 'color':
            this.collectColorToken(tokenPath, value, context);
            break;

          case 'dimension':
            this.collectDimensionToken(tokenPath, value, context);
            break;

          case 'number':
            this.collectNumberToken(tokenPath, value, context);
            break;

          case 'typography':
            this.collectTypographyToken(tokenPath, value, context);
            break;

          case 'shadow':
            this.collectShadowToken(tokenPath, value, context);
            break;

          case 'gradient':
            this.collectGradientToken(tokenPath, value, context);
            break;
        }
      } else if (typeof value === 'object' && value !== null) {
        this.collectTokens(value as TokenGroup, [...path, key], context);
      }
    }
  }

  /**
   * Collect a color token
   */
  private collectColorToken(
    path: string[],
    token: Token,
    context: { colors: CollectedColor[]; hexColors: boolean }
  ): void {
    const value = token.$value;

    if (typeof value === 'object' && value !== null && '$ref' in value) {
      return;
    }

    const colorValue = value as ColorValue;
    const swiftName = ensureValidSwiftName(tokenNameToSwift(path));

    context.colors.push({
      name: swiftName,
      swiftValue: colorToSwift(colorValue),
      uiKitValue: colorToUIKit(colorValue),
      kotlinValue: context.hexColors ? colorToKotlinHex(colorValue) : colorToKotlin(colorValue),
      description: token.$description,
    });
  }

  /**
   * Collect a dimension token
   */
  private collectDimensionToken(
    path: string[],
    token: Token,
    context: { dimensions: CollectedDimension[] }
  ): void {
    const value = token.$value;

    if (typeof value === 'object' && value !== null && '$ref' in value) {
      return;
    }

    const dimValue = value as DimensionValue;
    const swiftName = ensureValidSwiftName(tokenNameToSwift(path));
    const isFontSize =
      path.some((p) => p.toLowerCase().includes('font') || p.toLowerCase().includes('text')) ||
      path.some((p) => p.toLowerCase().includes('size'));

    context.dimensions.push({
      name: swiftName,
      swiftValue: dimensionToSwift(dimValue),
      kotlinValue: dimensionToKotlin(dimValue, isFontSize),
      rawValue: dimensionToSwiftValue(dimValue),
      isFontSize,
      description: token.$description,
    });
  }

  /**
   * Collect a number token
   */
  private collectNumberToken(
    path: string[],
    token: Token,
    context: { dimensions: CollectedDimension[] }
  ): void {
    const value = token.$value;

    if (typeof value === 'object' && value !== null && '$ref' in value) {
      return;
    }

    const numValue = value as number;
    const swiftName = ensureValidSwiftName(tokenNameToSwift(path));

    context.dimensions.push({
      name: swiftName,
      swiftValue: `CGFloat(${numValue})`,
      kotlinValue: `${numValue}.dp`,
      rawValue: numValue,
      isFontSize: false,
      description: token.$description,
    });
  }

  /**
   * Collect a typography token
   */
  private collectTypographyToken(
    path: string[],
    token: Token,
    context: { typographyTokens: CollectedTypography[] }
  ): void {
    const value = token.$value;

    if (typeof value === 'object' && value !== null && '$ref' in value) {
      return;
    }

    const typoValue = value as TypographyValue;
    const swiftName = ensureValidSwiftName(tokenNameToSwift(path));

    context.typographyTokens.push({
      name: swiftName,
      swiftConfig: typographyToSwift(typoValue),
      kotlinConfig: typographyToKotlin(typoValue),
      description: token.$description,
    });
  }

  /**
   * Collect a shadow token
   */
  private collectShadowToken(
    path: string[],
    token: Token,
    context: { shadows: CollectedShadow[] }
  ): void {
    const value = token.$value;

    if (typeof value === 'object' && value !== null && '$ref' in value) {
      return;
    }

    // Handle both single shadow and array of shadows
    const shadowArray = Array.isArray(value) ? value : [value];
    const firstShadow = shadowArray[0];

    // Type guard for ShadowValue
    if (
      !firstShadow ||
      typeof firstShadow !== 'object' ||
      !('offsetX' in firstShadow) ||
      !('offsetY' in firstShadow)
    ) {
      return;
    }

    const shadowValue = firstShadow as ShadowValue;
    const swiftName = ensureValidSwiftName(tokenNameToSwift(path));

    context.shadows.push({
      name: swiftName,
      swiftConfig: shadowToSwift(shadowValue),
      kotlinConfig: shadowToKotlin(shadowValue),
      description: token.$description,
    });
  }

  /**
   * Collect a gradient token
   */
  private collectGradientToken(
    path: string[],
    token: Token,
    context: { gradients: CollectedGradient[] }
  ): void {
    const value = token.$value;

    if (typeof value === 'object' && value !== null && '$ref' in value) {
      return;
    }

    const gradientValue = value as GradientValue;
    const swiftName = ensureValidSwiftName(tokenNameToSwift(path));

    context.gradients.push({
      name: swiftName,
      swiftValue: gradientToSwift(gradientValue),
      kotlinValue: gradientToKotlin(gradientValue),
      description: token.$description,
    });
  }

  /**
   * Generate Swift file content
   */
  private generateSwift(
    colors: CollectedColor[],
    dimensions: CollectedDimension[],
    typography: CollectedTypography[],
    shadows: CollectedShadow[],
    gradients: CollectedGradient[],
    options: {
      typeName: string;
      themeName: string;
      includeComments: boolean;
    }
  ): string {
    const lines: string[] = [];

    // File header
    lines.push(swiftFileHeader(`${options.typeName}.swift`));

    // Open struct
    lines.push(`/// Design tokens generated from: ${options.themeName}`);
    lines.push(`public enum ${options.typeName} {`);
    lines.push('');

    // Colors section
    if (colors.length > 0) {
      lines.push('    // MARK: - Colors');
      lines.push('    public enum Colors {');
      for (const color of colors) {
        if (options.includeComments && color.description) {
          lines.push(`        /// ${color.description}`);
        }
        lines.push(`        public static let ${color.name} = ${color.swiftValue}`);
      }
      lines.push('    }');
      lines.push('');
    }

    // Spacing/Dimensions section
    if (dimensions.length > 0) {
      const spacingDims = dimensions.filter((d) => !d.isFontSize);
      const fontDims = dimensions.filter((d) => d.isFontSize);

      if (spacingDims.length > 0) {
        lines.push('    // MARK: - Spacing');
        lines.push('    public enum Spacing {');
        for (const dim of spacingDims) {
          if (options.includeComments && dim.description) {
            lines.push(`        /// ${dim.description}`);
          }
          lines.push(`        public static let ${dim.name}: CGFloat = ${dim.rawValue}`);
        }
        lines.push('    }');
        lines.push('');
      }

      if (fontDims.length > 0) {
        lines.push('    // MARK: - Font Sizes');
        lines.push('    public enum FontSizes {');
        for (const dim of fontDims) {
          if (options.includeComments && dim.description) {
            lines.push(`        /// ${dim.description}`);
          }
          lines.push(`        public static let ${dim.name}: CGFloat = ${dim.rawValue}`);
        }
        lines.push('    }');
        lines.push('');
      }
    }

    // Typography section
    if (typography.length > 0) {
      lines.push('    // MARK: - Typography');
      lines.push('    public enum Typography {');
      for (const typo of typography) {
        if (options.includeComments && typo.description) {
          lines.push(`        /// ${typo.description}`);
        }
        lines.push(`        public static let ${typo.name} = Font.system(`);
        lines.push(`            size: ${typo.swiftConfig.size},`);
        lines.push(`            weight: ${typo.swiftConfig.weight}`);
        lines.push('        )');
      }
      lines.push('    }');
      lines.push('');
    }

    // Shadows section
    if (shadows.length > 0) {
      lines.push('    // MARK: - Shadows');
      lines.push('    public enum Shadows {');
      for (const shadow of shadows) {
        if (options.includeComments && shadow.description) {
          lines.push(`        /// ${shadow.description}`);
        }
        lines.push(`        public static let ${shadow.name} = ShadowStyle(`);
        lines.push(`            color: ${shadow.swiftConfig.color},`);
        lines.push(`            radius: ${shadow.swiftConfig.radius},`);
        lines.push(`            x: ${shadow.swiftConfig.x},`);
        lines.push(`            y: ${shadow.swiftConfig.y}`);
        lines.push('        )');
      }
      lines.push('    }');
      lines.push('');
    }

    // Gradients section
    if (gradients.length > 0) {
      lines.push('    // MARK: - Gradients');
      lines.push('    public enum Gradients {');
      for (const gradient of gradients) {
        if (options.includeComments && gradient.description) {
          lines.push(`        /// ${gradient.description}`);
        }
        lines.push(`        public static let ${gradient.name} = ${gradient.swiftValue}`);
      }
      lines.push('    }');
      lines.push('');
    }

    // Close struct
    lines.push('}');

    // Add ShadowStyle helper struct if shadows exist
    if (shadows.length > 0) {
      lines.push('');
      lines.push('/// Helper struct for shadow configuration');
      lines.push('public struct ShadowStyle {');
      lines.push('    public let color: Color');
      lines.push('    public let radius: CGFloat');
      lines.push('    public let x: CGFloat');
      lines.push('    public let y: CGFloat');
      lines.push('');
      lines.push('    public init(color: Color, radius: CGFloat, x: CGFloat, y: CGFloat) {');
      lines.push('        self.color = color');
      lines.push('        self.radius = radius');
      lines.push('        self.x = x');
      lines.push('        self.y = y');
      lines.push('    }');
      lines.push('}');
      lines.push('');
      lines.push('extension View {');
      lines.push('    public func shadow(_ style: ShadowStyle) -> some View {');
      lines.push('        self.shadow(color: style.color, radius: style.radius, x: style.x, y: style.y)');
      lines.push('    }');
      lines.push('}');
    }

    return lines.join('\n');
  }

  /**
   * Generate Swift UIKit extensions file
   */
  private generateSwiftUIKit(
    colors: CollectedColor[],
    options: {
      typeName: string;
      themeName: string;
      includeComments: boolean;
    }
  ): string {
    const lines: string[] = [];

    // File header
    lines.push(swiftFileHeader(`${options.typeName}+UIKit.swift`, { imports: ['UIKit'] }));

    // Open extension
    lines.push(`/// UIKit color extensions for: ${options.themeName}`);
    lines.push(`public extension ${options.typeName}.Colors {`);
    lines.push('');

    // UIKit colors section
    lines.push('    // MARK: - UIKit Colors');
    lines.push('    public enum UIKit {');
    for (const color of colors) {
      if (options.includeComments && color.description) {
        lines.push(`        /// ${color.description}`);
      }
      lines.push(`        public static let ${color.name} = ${color.uiKitValue}`);
    }
    lines.push('    }');

    // Close extension
    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate Kotlin file content
   */
  private generateKotlin(
    colors: CollectedColor[],
    dimensions: CollectedDimension[],
    typography: CollectedTypography[],
    shadows: CollectedShadow[],
    gradients: CollectedGradient[],
    options: {
      objectName: string;
      packageName: string;
      themeName: string;
      includeComments: boolean;
    }
  ): string {
    const lines: string[] = [];

    // Collect imports
    const imports = [
      'androidx.compose.ui.graphics.Color',
      'androidx.compose.ui.unit.dp',
      'androidx.compose.ui.unit.sp',
    ];

    if (typography.length > 0) {
      imports.push('androidx.compose.ui.text.TextStyle');
      imports.push('androidx.compose.ui.text.font.FontFamily');
      imports.push('androidx.compose.ui.text.font.FontWeight');
    }

    if (gradients.length > 0) {
      imports.push('androidx.compose.ui.graphics.Brush');
      imports.push('androidx.compose.ui.geometry.Offset');
    }

    // File header
    lines.push(kotlinFileHeader(options.packageName, { imports }));

    // Open object
    lines.push(`/**`);
    lines.push(` * Design tokens generated from: ${options.themeName}`);
    lines.push(` */`);
    lines.push(`object ${options.objectName} {`);
    lines.push('');

    // Colors section
    if (colors.length > 0) {
      lines.push('    // region Colors');
      lines.push('    object Colors {');
      for (const color of colors) {
        if (options.includeComments && color.description) {
          lines.push(`        /** ${color.description} */`);
        }
        lines.push(`        val ${color.name} = ${color.kotlinValue}`);
      }
      lines.push('    }');
      lines.push('    // endregion');
      lines.push('');
    }

    // Spacing/Dimensions section
    if (dimensions.length > 0) {
      const spacingDims = dimensions.filter((d) => !d.isFontSize);
      const fontDims = dimensions.filter((d) => d.isFontSize);

      if (spacingDims.length > 0) {
        lines.push('    // region Spacing');
        lines.push('    object Spacing {');
        for (const dim of spacingDims) {
          if (options.includeComments && dim.description) {
            lines.push(`        /** ${dim.description} */`);
          }
          lines.push(`        val ${dim.name} = ${dim.kotlinValue}`);
        }
        lines.push('    }');
        lines.push('    // endregion');
        lines.push('');
      }

      if (fontDims.length > 0) {
        lines.push('    // region Font Sizes');
        lines.push('    object FontSizes {');
        for (const dim of fontDims) {
          if (options.includeComments && dim.description) {
            lines.push(`        /** ${dim.description} */`);
          }
          lines.push(`        val ${dim.name} = ${dim.kotlinValue}`);
        }
        lines.push('    }');
        lines.push('    // endregion');
        lines.push('');
      }
    }

    // Typography section
    if (typography.length > 0) {
      lines.push('    // region Typography');
      lines.push('    object Typography {');
      for (const typo of typography) {
        if (options.includeComments && typo.description) {
          lines.push(`        /** ${typo.description} */`);
        }
        lines.push(`        val ${typo.name} = TextStyle(`);
        lines.push(`            fontSize = ${typo.kotlinConfig.fontSize},`);
        lines.push(`            fontWeight = ${typo.kotlinConfig.fontWeight},`);
        lines.push(`            fontFamily = ${typo.kotlinConfig.fontFamily}`);
        if (typo.kotlinConfig.lineHeight) {
          lines.push(`            lineHeight = ${typo.kotlinConfig.lineHeight},`);
        }
        if (typo.kotlinConfig.letterSpacing) {
          lines.push(`            letterSpacing = ${typo.kotlinConfig.letterSpacing}`);
        }
        lines.push('        )');
      }
      lines.push('    }');
      lines.push('    // endregion');
      lines.push('');
    }

    // Shadows section (as elevation values for Compose)
    if (shadows.length > 0) {
      lines.push('    // region Shadows');
      lines.push('    object Shadows {');
      for (const shadow of shadows) {
        if (options.includeComments && shadow.description) {
          lines.push(`        /** ${shadow.description} */`);
        }
        lines.push(`        val ${shadow.name}Elevation = ${shadow.kotlinConfig.elevation}`);
        lines.push(`        val ${shadow.name}Color = ${shadow.kotlinConfig.color}`);
      }
      lines.push('    }');
      lines.push('    // endregion');
      lines.push('');
    }

    // Gradients section
    if (gradients.length > 0) {
      lines.push('    // region Gradients');
      lines.push('    object Gradients {');
      for (const gradient of gradients) {
        if (options.includeComments && gradient.description) {
          lines.push(`        /** ${gradient.description} */`);
        }
        lines.push(`        val ${gradient.name} = ${gradient.kotlinValue}`);
      }
      lines.push('    }');
      lines.push('    // endregion');
      lines.push('');
    }

    // Close object
    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Check if value is a Token
   */
  private isToken(value: unknown): value is Token {
    return (
      typeof value === 'object' && value !== null && '$type' in value && '$value' in value
    );
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new Swift/Kotlin adapter instance
 */
export function createSwiftKotlinAdapter(): SwiftKotlinAdapter {
  return new SwiftKotlinAdapter();
}
