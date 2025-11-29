/**
 * Token Type Registry Types
 *
 * Defines the interfaces for token type handlers and the registry.
 * This enables Open/Closed principle - new token types can be added
 * by creating a handler file without modifying existing code.
 */

import type { TokenType, TokenValue } from '../schema/tokens.js';

// =============================================================================
// Tailwind Namespace Types
// =============================================================================

export type TailwindNamespace =
  | 'color'
  | 'spacing'
  | 'font-family'
  | 'font-size'
  | 'font-weight'
  | 'line-height'
  | 'letter-spacing'
  | 'radius'
  | 'shadow'
  | 'opacity'
  | 'transition-duration'
  | 'transition-timing-function'
  | 'z-index'
  | 'border'
  | 'gradient'
  | 'animation'
  | 'blur';

// =============================================================================
// Detection Context
// =============================================================================

/**
 * Context provided when detecting token type from Figma data
 */
export interface FigmaDetectionContext {
  /** Figma's resolved type (COLOR, FLOAT, STRING, BOOLEAN) */
  resolvedType: string;
  /** Figma variable scopes */
  scopes: string[];
  /** Variable name for path-based hints */
  name?: string;
}

/**
 * Context provided when detecting token type from MCP get_variable_defs format
 */
export interface VariableDefsContext {
  /** Full variable path (e.g., "Color/Primary/500") */
  path: string;
  /** Raw string value */
  value: string;
}

// =============================================================================
// Conversion Options
// =============================================================================

export interface CssConversionOptions {
  /** Color output format */
  colorFormat?: 'hex' | 'rgb' | 'oklch';
  /** CSS variable prefix */
  prefix?: string;
}

export interface ScssConversionOptions {
  /** Color output format */
  colorFormat?: 'hex' | 'rgb' | 'hsl';
  /** Variable prefix */
  prefix?: string;
}

// =============================================================================
// Token Type Handler Interface
// =============================================================================

/**
 * Handler for a specific token type.
 *
 * Each token type implements this interface to provide:
 * - Detection from Figma data
 * - Value parsing from Figma format
 * - CSS/SCSS output conversion
 * - Tailwind namespace mapping
 *
 * To add a new token type:
 * 1. Create a handler file in src/registry/handlers/
 * 2. Implement TokenTypeHandler interface
 * 3. Register in src/registry/index.ts
 */
export interface TokenTypeHandler<T extends TokenType = TokenType> {
  /** Token type identifier */
  readonly type: T;

  /** Human-readable name */
  readonly name: string;

  /**
   * Priority for detection (higher = checked first)
   * Useful when multiple handlers could match
   */
  readonly priority?: number;

  // ===========================================================================
  // Detection Methods
  // ===========================================================================

  /**
   * Check if this handler can handle the given Figma variable
   * @returns true if this handler should process this variable
   */
  detectFigma?(context: FigmaDetectionContext): boolean;

  /**
   * Check if this handler can handle the given MCP variable defs value
   * @returns true if this handler should process this value
   */
  detectVariableDefs?(context: VariableDefsContext): boolean;

  // ===========================================================================
  // Parsing Methods
  // ===========================================================================

  /**
   * Parse a Figma value into normalized token value
   * @param value Raw value from Figma (RGBA, number, string, etc.)
   * @param scopes Figma variable scopes
   * @returns Normalized token value
   */
  parseFigmaValue?(value: unknown, scopes: string[]): TokenValue<T>;

  /**
   * Parse an MCP variable defs string value into normalized token value
   * @param value Raw string value (e.g., "#ff0000", "Font(...)", "16px")
   * @returns Normalized token value or null if cannot parse
   */
  parseVariableDefsValue?(value: string): TokenValue<T> | null;

  // ===========================================================================
  // Output Methods
  // ===========================================================================

  /**
   * Convert token value to CSS string
   * Required for all handlers
   */
  toCss(value: TokenValue<T>, options?: CssConversionOptions): string;

  /**
   * Convert token value to SCSS string
   * Optional - falls back to toCss if not provided
   */
  toScss?(value: TokenValue<T>, options?: ScssConversionOptions): string;

  // ===========================================================================
  // Tailwind Integration
  // ===========================================================================

  /**
   * Get Tailwind namespace for this token type
   * @param path Token path for context (e.g., ['colors', 'primary', '500'])
   * @returns Tailwind namespace or null if not applicable
   */
  getNamespace?(path: string[]): TailwindNamespace | null;

  /**
   * Default namespace when path doesn't provide hints
   */
  readonly defaultNamespace?: TailwindNamespace;
}

// =============================================================================
// Registry Interface
// =============================================================================

/**
 * Token Type Registry
 *
 * Central registry for all token type handlers.
 * Provides unified interface for:
 * - Type detection
 * - Value parsing
 * - CSS/SCSS conversion
 * - Namespace resolution
 */
export interface TokenTypeRegistry {
  /**
   * Register a token type handler
   */
  register<T extends TokenType>(handler: TokenTypeHandler<T>): void;

  /**
   * Get handler for a specific token type
   */
  getHandler<T extends TokenType>(type: T): TokenTypeHandler<T> | undefined;

  /**
   * Get all registered handlers
   */
  getAllHandlers(): TokenTypeHandler[];

  /**
   * Detect token type from Figma variable data
   */
  detectFromFigma(context: FigmaDetectionContext): TokenType;

  /**
   * Detect token type from MCP variable defs format
   */
  detectFromVariableDefs(context: VariableDefsContext): TokenType;

  /**
   * Convert token value to CSS
   */
  toCss<T extends TokenType>(
    type: T,
    value: TokenValue<T>,
    options?: CssConversionOptions
  ): string;

  /**
   * Convert token value to SCSS
   */
  toScss<T extends TokenType>(
    type: T,
    value: TokenValue<T>,
    options?: ScssConversionOptions
  ): string;

  /**
   * Get Tailwind namespace for token
   */
  getNamespace(type: TokenType, path: string[]): TailwindNamespace | null;
}
