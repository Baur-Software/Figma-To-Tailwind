/**
 * Figma Output Adapter Types
 *
 * Types for transforming normalized ThemeFile tokens
 * back to Figma Variables via Plugin API.
 */

import type { OutputAdapterOptions, TokenType } from '../../../schema/tokens.js';
import type { PostVariablesRequestBody, PostVariablesResponse } from '@figma/rest-api-spec';

// =============================================================================
// Adapter Options
// =============================================================================

/**
 * Options for Figma output adapter
 */
export interface FigmaOutputAdapterOptions extends OutputAdapterOptions {
  /**
   * Target Figma file key (required for safety checks)
   * If not provided, safety checks are skipped
   */
  targetFileKey?: string;

  /**
   * Operation mode:
   * - 'create-only': Only create new variables, skip existing
   * - 'update': Update existing variables, create new ones
   * - 'sync': Full sync - create, update, and mark missing as deleted
   */
  mode?: 'create-only' | 'update' | 'sync';

  /**
   * Allow overwriting source file (default: false)
   * If ThemeFile.meta.figmaFileKey matches targetFileKey,
   * this must be true to proceed
   */
  allowSourceOverwrite?: boolean;

  /**
   * Collection name mapping
   * Maps normalized collection names to Figma collection names
   */
  collectionMapping?: Record<string, string>;

  /**
   * Skip tokens marked as hidden from publishing
   */
  skipHidden?: boolean;

  /**
   * Prefix for temporary IDs in the request
   */
  idPrefix?: string;
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Result from Figma output adapter transformation
 */
export interface FigmaOutputResult {
  /**
   * POST body ready for Figma Variables API
   */
  requestBody: PostVariablesRequestBody;

  /**
   * Transformation report with stats and warnings
   */
  report: TransformationReport;

  /**
   * Execute the API call (if write-client is configured)
   */
  execute?: () => Promise<PostVariablesResponse>;

  /**
   * Get manual instructions for non-Enterprise users
   */
  getManualInstructions(): string;
}

// =============================================================================
// Report Types
// =============================================================================

/**
 * Warning codes for transformation issues
 */
export type WarningCode =
  | 'UNSUPPORTED_TYPE'
  | 'VALUE_TRUNCATED'
  | 'UNIT_DISCARDED'
  | 'COMPOSITE_SKIPPED'
  | 'ALIAS_UNRESOLVED'
  | 'NAME_COLLISION'
  | 'SOURCE_MATCH'
  | 'PLUGIN_NOT_CONNECTED';

/**
 * A single warning from transformation
 */
export interface TransformationWarning {
  code: WarningCode;
  message: string;
  path?: string;
}

/**
 * A skipped token with reason
 */
export interface SkippedToken {
  path: string;
  reason: string;
  originalType: TokenType;
  suggestion?: string;
}

/**
 * Source safety check result
 */
export interface SourceCheckResult {
  sourceFileKey?: string;
  targetFileKey?: string;
  isSameFile: boolean;
  overwriteAllowed: boolean;
}

/**
 * Transformation statistics
 */
export interface TransformationStats {
  collectionsCreated: number;
  modesCreated: number;
  variablesCreated: number;
  valuesSet: number;
  textStylesCreated: number;
  effectStylesCreated: number;
  paintStylesCreated: number;
  skipped: number;
  warnings: number;
}

/**
 * Comprehensive transformation report
 */
export interface TransformationReport {
  stats: TransformationStats;
  skipped: SkippedToken[];
  warnings: TransformationWarning[];
  sourceCheck: SourceCheckResult;

  /**
   * Format report as human-readable string
   */
  toString(): string;

  /**
   * Get report as JSON object
   */
  toJSON(): object;
}

// =============================================================================
// Figma Style Types
// =============================================================================

/**
 * Figma RGBA color (0-1 range)
 */
export interface FigmaRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Figma line height
 */
export interface FigmaLineHeight {
  unit: 'PIXELS' | 'PERCENT' | 'AUTO';
  value?: number;
}

/**
 * Figma letter spacing
 */
export interface FigmaLetterSpacing {
  unit: 'PIXELS' | 'PERCENT';
  value: number;
}

/**
 * Figma text style definition
 */
export interface FigmaTextStyle {
  name: string;
  description?: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight?: FigmaLineHeight;
  letterSpacing?: FigmaLetterSpacing;
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
}

/**
 * Figma effect (shadow, blur, etc.)
 */
export interface FigmaEffect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible: boolean;
  blendMode: string;
  color?: FigmaRGBA;
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
}

/**
 * Figma effect style definition
 */
export interface FigmaEffectStyle {
  name: string;
  description?: string;
  effects: FigmaEffect[];
}

/**
 * Figma gradient stop
 */
export interface FigmaGradientStop {
  color: FigmaRGBA;
  position: number;
}

/**
 * Figma paint (solid, gradient, etc.)
 */
export interface FigmaPaint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'IMAGE';
  visible: boolean;
  blendMode: string;
  color?: FigmaRGBA;
  gradientStops?: FigmaGradientStop[];
  gradientHandlePositions?: Array<{ x: number; y: number }>;
}

/**
 * Figma paint style definition
 */
export interface FigmaPaintStyle {
  name: string;
  description?: string;
  paints: FigmaPaint[];
}

// =============================================================================
// Write Client Types
// =============================================================================

/**
 * Parameters for creating/updating variables via Plugin API
 */
export interface PluginVariableParams {
  action: 'create' | 'update' | 'delete';
  name: string;
  collectionName: string;
  resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';
  valuesByMode: Record<string, unknown>;
  description?: string;
  scopes?: string[];
}

/**
 * Parameters for creating/updating text styles via Plugin API
 */
export interface PluginTextStyleParams {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  id?: string;
  style: FigmaTextStyle;
}

/**
 * Parameters for creating/updating effect styles via Plugin API
 */
export interface PluginEffectStyleParams {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  id?: string;
  style: FigmaEffectStyle;
}

/**
 * Parameters for creating/updating paint styles via Plugin API
 */
export interface PluginPaintStyleParams {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  id?: string;
  style: FigmaPaintStyle;
}

/**
 * Parameters for creating/updating styles via Plugin API
 */
export interface PluginStyleParams {
  action: 'create' | 'update' | 'delete';
  type: 'TEXT' | 'PAINT' | 'EFFECT';
  name: string;
  properties: Record<string, unknown>;
}

/**
 * Plugin connection status
 */
export interface PluginStatus {
  connected: boolean;
  file?: string;
  fileKey?: string;
}

/**
 * Variable creation parameters for write client
 */
export interface VariableCreateParams {
  name: string;
  collectionName: string;
  resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';
  valuesByMode: Record<string, unknown>;
  description?: string;
}

/**
 * Write client interface for Plugin API integration
 */
export interface WriteServerClient {
  /**
   * Check if plugin is connected and get current file info
   */
  getStatus(): Promise<PluginStatus>;

  /**
   * Create/update variables
   */
  variables(params: VariableCreateParams[]): Promise<void>;

  /**
   * Create/update styles (text, paint, effect)
   */
  styles(params: Array<PluginTextStyleParams | PluginEffectStyleParams | PluginPaintStyleParams>): Promise<void>;
}

// =============================================================================
// Errors
// =============================================================================

/**
 * Error thrown when attempting to overwrite source file without permission
 */
export class SourceOverwriteError extends Error {
  constructor(
    public sourceFileKey: string,
    public targetFileKey: string
  ) {
    super(
      `Target file matches source file (${sourceFileKey}). ` +
        `Set allowSourceOverwrite: true to proceed.`
    );
    this.name = 'SourceOverwriteError';
  }
}

/**
 * Error thrown when plugin is not connected
 */
export class PluginNotConnectedError extends Error {
  constructor() {
    super('Figma plugin is not connected. Ensure Figma Desktop is running with the write-server plugin active.');
    this.name = 'PluginNotConnectedError';
  }
}
