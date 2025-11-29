/**
 * CSS Input Adapter Types
 */

/**
 * Input options for CSS adapter
 */
export interface CSSInput {
  /** Raw CSS string */
  css: string;
  /** Source file name (for metadata) */
  fileName?: string;
  /** Parse options */
  options?: CSSParseOptions;
}

/**
 * Options for CSS parsing
 */
export interface CSSParseOptions {
  /** Name of the default mode for parsed tokens */
  defaultMode?: string;
  /** Collection name for parsed tokens */
  collectionName?: string;
  /** Whether to parse @theme blocks (Tailwind v4) */
  parseTailwindTheme?: boolean;
  /** Whether to parse :root variables */
  parseRootVariables?: boolean;
  /** Whether to parse .dark or [data-theme="dark"] as dark mode */
  parseDarkMode?: boolean;
  /** Custom variable prefix to strip (e.g., "--ion-color-" -> "color/") */
  stripPrefix?: string;
}

/**
 * Parsed CSS variable
 */
export interface ParsedVariable {
  /** Variable name without -- prefix */
  name: string;
  /** Raw value string */
  rawValue: string;
  /** Selector context (e.g., ":root", ".dark", "@theme") */
  context: string;
  /** Line number in source */
  line?: number;
}

/**
 * Supported CSS token types
 */
export type CSSTokenType = 'color' | 'dimension' | 'fontFamily' | 'fontWeight' | 'number' | 'string' | 'duration';

/**
 * Token type detection result
 */
export interface DetectedToken {
  /** Token path (e.g., "color/primary/500") */
  path: string;
  /** Detected token type */
  type: CSSTokenType;
  /** Parsed value */
  value: unknown;
  /** Original variable name */
  originalName: string;
}
