/**
 * Figma to Tailwind Design Token Normalizer
 *
 * A library for normalizing Figma design tokens (via MCP server or REST API)
 * to Tailwind CSS v4 and Ionic Framework themes.
 *
 * @example
 * ```typescript
 * import {
 *   createFigmaAdapter,
 *   createTailwindIonicAdapter,
 * } from '@figma-to-tailwind/core';
 *
 * // Parse Figma data
 * const figmaAdapter = createFigmaAdapter();
 * const theme = await figmaAdapter.parse({ mcpData: figmaResponse });
 *
 * // Generate Tailwind/Ionic output
 * const outputAdapter = createTailwindIonicAdapter();
 * const output = await outputAdapter.transform(theme);
 *
 * // Use the generated CSS
 * console.log(output.css);
 * ```
 */

// =============================================================================
// Schema Types (Re-exports)
// =============================================================================

export * from './schema/index.js';

// =============================================================================
// Adapters
// =============================================================================

export {
  FigmaAdapter,
  createFigmaAdapter,
  type FigmaInput,
} from './adapters/input/figma/index.js';

export {
  TailwindIonicAdapter,
  createTailwindIonicAdapter,
  type TailwindIonicOutput,
  type TailwindIonicAdapterOptions,
} from './adapters/output/tailwind-ionic/index.js';

export {
  ScssAdapter,
  createScssAdapter,
  type ScssOutput,
  type ScssAdapterOptions,
} from './adapters/output/scss/index.js';

// Figma Output Adapter
export {
  FigmaOutputAdapter,
  createFigmaOutputAdapter,
  transformToFigmaVariables,
  resetIdCounter,
  TransformationReportBuilder,
  createReport,
  checkSourceSafety,
  checkPluginSafety,
  FigmaWriteClient,
  createWriteClient,
  tryConnectWriteServer,
  SourceOverwriteError,
  PluginNotConnectedError,
  type FigmaOutputAdapterOptions,
  type FigmaOutputResult,
  type TransformationReport,
  type WriteServerClient,
  type PluginStatus,
} from './adapters/output/figma/index.js';

// CSS Input Adapter
export {
  CSSAdapter,
  createCSSAdapter,
  type CSSInput,
  type CSSParseOptions,
} from './adapters/input/css/index.js';

// SCSS Input Adapter
export {
  SCSSAdapter,
  createSCSSAdapter,
  type SCSSInput,
  type SCSSParseOptions,
} from './adapters/input/scss/index.js';

// =============================================================================
// Linting
// =============================================================================

export {
  TokenLinter,
  createLinter,
  lintTheme,
  allRules,
  loadConfig,
  findConfigFile,
  getPreset,
  listPresets,
  type LintConfig,
  type LintMessage,
  type LintResult,
  type LintRule,
  type LintSeverity,
} from './lint/index.js';

// =============================================================================
// Convenience Functions
// =============================================================================

import { createFigmaAdapter, type FigmaInput } from './adapters/input/figma/index.js';
import {
  createTailwindIonicAdapter,
  type TailwindIonicAdapterOptions,
  type TailwindIonicOutput,
} from './adapters/output/tailwind-ionic/index.js';
import {
  createScssAdapter,
  type ScssAdapterOptions,
  type ScssOutput,
} from './adapters/output/scss/index.js';
import type { ThemeFile } from './schema/tokens.js';

/**
 * Quick conversion from Figma data to Tailwind/Ionic CSS
 *
 * @example
 * ```typescript
 * const output = await figmaToTailwind({ mcpData: figmaResponse });
 * fs.writeFileSync('theme.css', output.css);
 * ```
 */
export async function figmaToTailwind(
  input: FigmaInput,
  options?: TailwindIonicAdapterOptions
): Promise<TailwindIonicOutput> {
  const figmaAdapter = createFigmaAdapter();
  const theme = await figmaAdapter.parse(input);

  const outputAdapter = createTailwindIonicAdapter();
  return outputAdapter.transform(theme, options);
}

/**
 * Parse Figma data to normalized theme format
 */
export async function parseTheme(input: FigmaInput): Promise<ThemeFile> {
  const adapter = createFigmaAdapter();
  return adapter.parse(input);
}

/**
 * Generate Tailwind/Ionic output from normalized theme
 */
export async function generateOutput(
  theme: ThemeFile,
  options?: TailwindIonicAdapterOptions
): Promise<TailwindIonicOutput> {
  const adapter = createTailwindIonicAdapter();
  return adapter.transform(theme, options);
}

/**
 * Quick conversion from Figma data to SCSS
 *
 * @example
 * ```typescript
 * const output = await figmaToScss({ variableDefs: mcpVariables });
 * fs.writeFileSync('_variables.scss', output.files['_variables.scss']);
 * ```
 */
export async function figmaToScss(
  input: FigmaInput,
  options?: ScssAdapterOptions
): Promise<ScssOutput> {
  const figmaAdapter = createFigmaAdapter();
  const theme = await figmaAdapter.parse(input);

  const outputAdapter = createScssAdapter();
  return outputAdapter.transform(theme, options);
}

/**
 * Generate SCSS output from normalized theme
 */
export async function generateScssOutput(
  theme: ThemeFile,
  options?: ScssAdapterOptions
): Promise<ScssOutput> {
  const adapter = createScssAdapter();
  return adapter.transform(theme, options);
}
