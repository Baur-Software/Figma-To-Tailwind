/**
 * Input Adapters
 *
 * Adapters that parse external data sources into the normalized ThemeFile format.
 */

// Figma Input Adapter
export {
  FigmaAdapter,
  createFigmaAdapter,
  type FigmaInput,
} from './figma/index.js';

export * from './figma/parser.js';
