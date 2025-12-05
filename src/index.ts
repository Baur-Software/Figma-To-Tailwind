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

// Next.js Output Adapter
export {
  NextJsAdapter,
  createNextJsAdapter,
  generateNextJsCss,
  generateTypeScript,
  withFigmaToTheme,
  generateTheme,
  syncTheme,
  type NextJsOutput,
  type NextJsAdapterOptions,
  type NextJsTailwindConfig,
  type NextJsGeneratorOptions,
  type NextJsCssOutput,
  type CssVariable,
  type TypeScriptGeneratorOptions,
  type TypeScriptOutput,
  type FigmaToNextJsOptions,
  type GeneratedThemeOutput,
  type NextConfigWithFigmaTo,
} from './adapters/output/nextjs/index.js';

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

// Android XML Output Adapter
export {
  AndroidXmlAdapter,
  createAndroidXmlAdapter,
  type AndroidXmlOutput,
  type AndroidXmlAdapterOptions,
} from './adapters/output/android-xml/index.js';

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
import {
  createNextJsAdapter,
  type NextJsAdapterOptions,
  type NextJsOutput,
} from './adapters/output/nextjs/index.js';
import {
  createAndroidXmlAdapter,
  type AndroidXmlAdapterOptions,
  type AndroidXmlOutput,
} from './adapters/output/android-xml/index.js';
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

/**
 * Quick conversion from Figma data to Next.js theme
 *
 * @example
 * ```typescript
 * const output = await figmaToNextJs({ variablesResponse, fileKey });
 * fs.writeFileSync('theme.css', output.css);
 * fs.writeFileSync('theme.ts', output.constants);
 * ```
 */
export async function figmaToNextJs(
  input: FigmaInput,
  options?: NextJsAdapterOptions
): Promise<NextJsOutput> {
  const figmaAdapter = createFigmaAdapter();
  const theme = await figmaAdapter.parse(input);

  const outputAdapter = createNextJsAdapter();
  return outputAdapter.transform(theme, options);
}

/**
 * Generate Next.js output from normalized theme
 */
export async function generateNextJsOutput(
  theme: ThemeFile,
  options?: NextJsAdapterOptions
): Promise<NextJsOutput> {
  const adapter = createNextJsAdapter();
  return adapter.transform(theme, options);
}

/**
 * Quick conversion from Figma data to Android XML resources
 *
 * Generates Android resource XML files compatible with Android 13-15 (API 33-35)
 * and Material 3 theming.
 *
 * @example
 * ```typescript
 * const output = await figmaToAndroidXml({ variablesResponse, fileKey });
 * fs.writeFileSync('res/values/colors.xml', output.files['values/colors.xml']);
 * fs.writeFileSync('res/values/dimens.xml', output.files['values/dimens.xml']);
 * fs.writeFileSync('res/values/styles.xml', output.files['values/styles.xml']);
 * ```
 */
export async function figmaToAndroidXml(
  input: FigmaInput,
  options?: AndroidXmlAdapterOptions
): Promise<AndroidXmlOutput> {
  const figmaAdapter = createFigmaAdapter();
  const theme = await figmaAdapter.parse(input);

  const outputAdapter = createAndroidXmlAdapter();
  return outputAdapter.transform(theme, options);
}

/**
 * Generate Android XML output from normalized theme
 */
export async function generateAndroidXmlOutput(
  theme: ThemeFile,
  options?: AndroidXmlAdapterOptions
): Promise<AndroidXmlOutput> {
  const adapter = createAndroidXmlAdapter();
  return adapter.transform(theme, options);
}
