/**
 * CSS Input Adapter Module
 *
 * Parses CSS custom properties and Tailwind @theme blocks
 * into normalized design tokens.
 */

// Adapter
export { CSSAdapter, createCSSAdapter } from './adapter.js';

// Parser utilities
export {
  extractVariables,
  detectTokenType,
  parseColor,
  parseDimension,
  parseDuration,
  parseFontFamily,
  parseValue,
  variableToPath,
  tokensToGroup,
} from './parser.js';

// Types
export type {
  CSSInput,
  CSSParseOptions,
  CSSTokenType,
  ParsedVariable,
  DetectedToken,
} from './types.js';
