/**
 * Token Type Registry
 *
 * Central registry for token type handlers.
 * Provides a unified interface for:
 * - Type detection from Figma data
 * - Value parsing and conversion
 * - CSS/SCSS output generation
 * - Tailwind namespace resolution
 *
 * ## Adding a New Token Type
 *
 * 1. Create a handler file in `src/registry/handlers/`
 * 2. Implement the `TokenTypeHandler` interface
 * 3. Add export to `src/registry/handlers/index.ts`
 * 4. Register the handler in this file
 *
 * That's it! The new token type will automatically work with:
 * - Figma input adapter
 * - All output adapters (Tailwind, SCSS, Ionic, CSS-in-JS)
 * - CLI tool
 */

// Re-export types
export type {
  TokenTypeHandler,
  TokenTypeRegistry,
  FigmaDetectionContext,
  VariableDefsContext,
  CssConversionOptions,
  ScssConversionOptions,
  TailwindNamespace,
} from './types.js';

// Export registry
export { tokenTypeRegistry, registerTokenType } from './registry.js';

// Export handlers for direct use
export * from './handlers/index.js';

// =============================================================================
// Register All Handlers
// =============================================================================

import { registerTokenType } from './registry.js';
import {
  colorHandler,
  dimensionHandler,
  typographyHandler,
  shadowHandler,
  borderHandler,
  gradientHandler,
  fontFamilyHandler,
  fontWeightHandler,
  durationHandler,
  cubicBezierHandler,
  transitionHandler,
  stringHandler,
  numberHandler,
  booleanHandler,
} from './handlers/index.js';

// Register all built-in handlers
// Order doesn't matter - handlers are sorted by priority
registerTokenType(colorHandler);
registerTokenType(dimensionHandler);
registerTokenType(typographyHandler);
registerTokenType(shadowHandler);
registerTokenType(borderHandler);
registerTokenType(gradientHandler);
registerTokenType(fontFamilyHandler);
registerTokenType(fontWeightHandler);
registerTokenType(durationHandler);
registerTokenType(cubicBezierHandler);
registerTokenType(transitionHandler);
registerTokenType(stringHandler);
registerTokenType(numberHandler);
registerTokenType(booleanHandler);
