/**
 * Tailwind/Ionic Adapter Module
 *
 * Output adapter for generating Tailwind CSS v4 and Ionic themes
 * from normalized design tokens.
 */

export {
  TailwindIonicAdapter,
  createTailwindIonicAdapter,
} from './adapter.js';
export type {
  TailwindIonicOutput,
  TailwindIonicAdapterOptions,
} from './adapter.js';

export {
  generateTailwindTheme,
  generateCompleteCss,
} from './tailwind-generator.js';
export type { TailwindGeneratorOptions } from './tailwind-generator.js';

export {
  generateIonicTheme,
  generateIonicDarkTheme,
} from './ionic-generator.js';
export type {
  IonicGeneratorOptions,
  IonicGeneratorOutput,
} from './ionic-generator.js';

export * from './converters.js';
