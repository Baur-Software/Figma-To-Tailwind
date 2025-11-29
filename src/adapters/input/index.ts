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

// CSS Input Adapter
export {
  CSSAdapter,
  createCSSAdapter,
  type CSSInput,
  type CSSParseOptions,
  type CSSTokenType,
  type ParsedVariable,
  type DetectedToken,
} from './css/index.js';

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
} from './css/parser.js';
