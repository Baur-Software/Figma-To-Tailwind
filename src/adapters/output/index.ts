/**
 * Output Adapters
 *
 * Adapters that transform the normalized ThemeFile format into target outputs.
 */

// Tailwind/Ionic Output Adapter
export {
  TailwindIonicAdapter,
  createTailwindIonicAdapter,
  type TailwindIonicOutput,
  type TailwindIonicAdapterOptions,
  generateTailwindTheme,
  generateCompleteCss,
  type TailwindGeneratorOptions,
  generateIonicTheme,
  generateIonicDarkTheme,
  type IonicGeneratorOptions,
  type IonicGeneratorOutput,
} from './tailwind-ionic/index.js';

export * from './tailwind-ionic/converters.js';

// SCSS Output Adapter
export {
  ScssAdapter,
  createScssAdapter,
  type ScssOutput,
  type ScssAdapterOptions,
} from './scss/index.js';

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
} from './nextjs/index.js';

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
  SourceOverwriteError,
  PluginNotConnectedError,
  type TransformResult,
  type FigmaOutputAdapterOptions,
  type FigmaOutputResult,
  type TransformationReport,
  type TransformationStats,
  type TransformationWarning,
  type SkippedToken,
  type SourceCheckResult,
  type WarningCode,
  type PluginVariableParams,
  type PluginStyleParams,
  type PluginStatus,
  type WriteServerClient,
} from './figma/index.js';

// Android XML Output Adapter
export {
  AndroidXmlAdapter,
  createAndroidXmlAdapter,
  colorToAndroid,
  colorToAndroidRgb,
  dimensionToAndroid,
  numberToAndroidDimen,
  tokenNameToAndroid,
  ensureValidAndroidName,
  fontWeightToAndroid,
  typographyToAndroidAttrs,
  type AndroidXmlOutput,
  type AndroidXmlAdapterOptions,
  type AndroidDimensionUnit,
} from './android-xml/index.js';
