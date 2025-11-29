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
