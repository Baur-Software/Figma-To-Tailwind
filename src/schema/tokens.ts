/**
 * Normalized Design Token Schema
 *
 * This schema serves as the canonical intermediate representation between:
 * - Input: Figma MCP server (variables, styles, components)
 * - Output: Tailwind CSS v4 + Ionic theme variables
 *
 * Based on W3C Design Tokens Community Group draft specification
 * with extensions for Ionic/Capacitor/SolidJS targets.
 */

import type { VariableScope } from '@figma/rest-api-spec';

// =============================================================================
// Primitive Value Types
// =============================================================================

/** RGBA color in normalized 0-1 range */
export interface ColorValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Dimension with explicit unit */
export interface DimensionValue {
  value: number;
  unit: 'px' | 'rem' | 'em' | '%' | 'vw' | 'vh' | 'dvh' | 'svh' | 'lvh';
}

/** Font weight as number (100-900) or keyword */
export type FontWeightValue =
  | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  | 'thin' | 'extralight' | 'light' | 'normal' | 'medium'
  | 'semibold' | 'bold' | 'extrabold' | 'black';

/** Duration for animations/transitions */
export interface DurationValue {
  value: number;
  unit: 'ms' | 's';
}

/** Cubic bezier easing function */
export interface CubicBezierValue {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// =============================================================================
// Composite Value Types
// =============================================================================

/** Shadow definition (box-shadow or text-shadow) */
export interface ShadowValue {
  offsetX: DimensionValue;
  offsetY: DimensionValue;
  blur: DimensionValue;
  spread?: DimensionValue;
  color: ColorValue;
  inset?: boolean;
}

/** Border definition */
export interface BorderValue {
  width: DimensionValue;
  style: 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset' | 'none';
  color: ColorValue;
}

/** Typography composite token */
export interface TypographyValue {
  fontFamily: string[];
  fontSize: DimensionValue;
  fontWeight: FontWeightValue;
  lineHeight: number | DimensionValue;
  letterSpacing?: DimensionValue;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

/** Gradient stop */
export interface GradientStop {
  color: ColorValue;
  position: number; // 0-1
}

/** Gradient definition */
export interface GradientValue {
  type: 'linear' | 'radial' | 'conic';
  angle?: number; // degrees, for linear
  stops: GradientStop[];
}

/** Transition definition */
export interface TransitionValue {
  duration: DurationValue;
  timingFunction: CubicBezierValue | 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  delay?: DurationValue;
}

// =============================================================================
// Token Types - W3C DTCG aligned
// =============================================================================

export type TokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'string'
  | 'boolean'
  // Composite types
  | 'shadow'
  | 'border'
  | 'typography'
  | 'gradient'
  | 'transition';

export type TokenValue<T extends TokenType> =
  T extends 'color' ? ColorValue :
  T extends 'dimension' ? DimensionValue :
  T extends 'fontFamily' ? string[] :
  T extends 'fontWeight' ? FontWeightValue :
  T extends 'duration' ? DurationValue :
  T extends 'cubicBezier' ? CubicBezierValue :
  T extends 'number' ? number :
  T extends 'string' ? string :
  T extends 'boolean' ? boolean :
  T extends 'shadow' ? ShadowValue | ShadowValue[] :
  T extends 'border' ? BorderValue :
  T extends 'typography' ? TypographyValue :
  T extends 'gradient' ? GradientValue :
  T extends 'transition' ? TransitionValue :
  never;

// =============================================================================
// Token Reference System
// =============================================================================

/**
 * Reference to another token using path notation
 * e.g., "{colors.primary.500}" or "{spacing.4}"
 */
export interface TokenReference {
  $ref: string;
}

export function isTokenReference(value: unknown): value is TokenReference {
  return typeof value === 'object' && value !== null && '$ref' in value;
}

// =============================================================================
// Token Definition
// =============================================================================

/** Figma-specific token extensions */
export interface FigmaExtensions {
  /** Original Figma variable ID */
  variableId?: string;
  /** Figma scopes where this variable can be applied */
  scopes?: VariableScope[];
  /** Code syntax hints from Figma */
  codeSyntax?: {
    web?: string;
    android?: string;
    ios?: string;
  };
  /** Hidden from Figma publishing */
  hiddenFromPublishing?: boolean;
}

/** Ionic-specific token extensions */
export interface IonicExtensions {
  /** Maps to Ionic CSS variable name (e.g., "--ion-color-primary") */
  ionicVariable?: string;
  /** Platform-specific overrides */
  platforms?: {
    ios?: Partial<Token<TokenType>>;
    md?: Partial<Token<TokenType>>;
  };
}

/** Tailwind-specific token extensions */
export interface TailwindExtensions {
  /** Tailwind utility class mapping */
  utility?: string;
  /** CSS variable name for @theme */
  cssVariable?: string;
  /** Whether to include in Tailwind's @theme directive */
  includeInTheme?: boolean;
}

/** Complete token extensions */
export interface TokenExtensions {
  'com.figma'?: FigmaExtensions;
  'com.ionic'?: IonicExtensions;
  'com.tailwind'?: TailwindExtensions;
}

/**
 * A single design token
 * Aligned with W3C DTCG specification
 */
export interface Token<T extends TokenType = TokenType> {
  /** Token type identifier */
  $type: T;
  /** Token value or reference to another token */
  $value: TokenValue<T> | TokenReference;
  /** Human-readable description */
  $description?: string;
  /** Extension data for specific platforms */
  $extensions?: TokenExtensions;
}

// =============================================================================
// Token Groups and Collections
// =============================================================================

/** A group of tokens (can be nested) */
export interface TokenGroup {
  /** Optional description for the group */
  $description?: string;
  /** Nested tokens or groups */
  [key: string]: Token | TokenGroup | string | undefined;
}

/**
 * A token collection represents a Figma variable collection
 * with one or more modes (e.g., light/dark, brand variants)
 */
export interface TokenCollection {
  /** Collection name */
  name: string;
  /** Collection description */
  description?: string;
  /** Available modes in this collection */
  modes: string[];
  /** Default mode */
  defaultMode: string;
  /** Tokens organized by mode */
  tokens: Record<string, TokenGroup>;
}

/**
 * Complete theme file structure
 * Root-level container for all design tokens
 */
export interface ThemeFile {
  /** Schema version for forward compatibility */
  $schema?: string;
  /** Theme name */
  name: string;
  /** Theme description */
  description?: string;
  /** Token collections (from Figma variable collections) */
  collections: TokenCollection[];
  /** Metadata about the theme source */
  meta?: {
    source: 'figma-mcp' | 'figma-api' | 'figma-mcp-defs' | 'manual';
    figmaFileKey?: string;
    lastSynced?: string;
    version?: string;
  };
}

// =============================================================================
// Adapter Interfaces
// =============================================================================

/** Input adapter - converts source format to normalized tokens */
export interface InputAdapter<TSource> {
  /** Adapter identifier */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Parse source data into normalized theme */
  parse(source: TSource): Promise<ThemeFile>;
  /** Validate source data before parsing */
  validate(source: TSource): Promise<{ valid: boolean; errors?: string[] }>;
}

/** Output adapter - converts normalized tokens to target format */
export interface OutputAdapter<TOutput> {
  /** Adapter identifier */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Transform normalized theme to target format */
  transform(theme: ThemeFile, options?: OutputAdapterOptions): Promise<TOutput>;
}

/** Common options for output adapters */
export interface OutputAdapterOptions {
  /** Specific mode to output (if omitted, outputs all modes) */
  mode?: string;
  /** Output format preferences */
  format?: {
    /** Include comments in output */
    comments?: boolean;
    /** Minify output */
    minify?: boolean;
  };
  /** Token path prefix */
  prefix?: string;
}
