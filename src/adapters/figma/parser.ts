/**
 * Figma Variable Parser
 *
 * Converts Figma variables and collections into normalized design tokens.
 * Uses the TokenTypeRegistry for type detection and value conversion.
 */

import type {
  LocalVariable,
  LocalVariableCollection,
  VariableAlias,
  RGBA,
} from '@figma/rest-api-spec';
import type {
  Token,
  TokenType,
  TokenGroup,
  TokenCollection,
  ColorValue,
  DimensionValue,
  TokenReference,
  FigmaExtensions,
} from '../../schema/tokens.js';
import { isRGBA, isVariableAlias } from '../../schema/figma.js';
import { tokenTypeRegistry } from '../../registry/index.js';
import type { FigmaDetectionContext, VariableDefsContext } from '../../registry/types.js';

/**
 * Variable value type from Figma's valuesByMode
 */
type VariableValue = boolean | number | string | RGBA | VariableAlias;

// =============================================================================
// Value Converters
// =============================================================================

/**
 * Convert Figma RGBA color to normalized ColorValue
 */
export function convertFigmaColor(color: RGBA): ColorValue {
  return {
    r: color.r,
    g: color.g,
    b: color.b,
    a: color.a,
  };
}

/**
 * Convert Figma numeric value to dimension
 * Figma uses pixels by default
 */
export function convertFigmaNumber(value: number, scopes: string[]): DimensionValue | number {
  // Determine if this should be a dimension based on scopes
  const dimensionScopes = [
    'CORNER_RADIUS',
    'WIDTH_HEIGHT',
    'GAP',
    'STROKE_FLOAT',
    'FONT_SIZE',
    'LINE_HEIGHT',
    'LETTER_SPACING',
    'PARAGRAPH_SPACING',
    'PARAGRAPH_INDENT',
  ];

  const isDimension = scopes.some(scope => dimensionScopes.includes(scope));

  if (isDimension) {
    return {
      value,
      unit: 'px',
    };
  }

  return value;
}

/**
 * Create a token reference from a Figma variable alias
 */
export function createTokenReference(
  alias: VariableAlias,
  variablesById: Map<string, LocalVariable>
): TokenReference {
  const referencedVar = variablesById.get(alias.id);
  if (!referencedVar) {
    // Fallback to ID if variable not found
    return { $ref: `{${alias.id}}` };
  }

  // Convert variable name path (e.g., "Colors/Primary/500" -> "colors.primary.500")
  const path = referencedVar.name
    .split('/')
    .map((segment: string) => segment.toLowerCase().replace(/\s+/g, '-'))
    .join('.');

  return { $ref: `{${path}}` };
}

// =============================================================================
// Token Type Detection
// =============================================================================

/**
 * Determine token type from Figma variable
 * Uses the TokenTypeRegistry for extensible type detection
 */
export function detectTokenType(variable: LocalVariable): TokenType {
  const context: FigmaDetectionContext = {
    resolvedType: variable.resolvedType,
    scopes: variable.scopes,
    name: variable.name,
  };

  return tokenTypeRegistry.detectFromFigma(context);
}

// =============================================================================
// Token Creation
// =============================================================================

/**
 * Create a token from a Figma variable value
 */
export function createToken(
  variable: LocalVariable,
  value: VariableValue,
  variablesById: Map<string, LocalVariable>
): Token {
  const tokenType = detectTokenType(variable);

  // Build Figma extensions
  const figmaExtensions: FigmaExtensions = {
    variableId: variable.id,
    scopes: variable.scopes,
    hiddenFromPublishing: variable.hiddenFromPublishing,
  };

  if (variable.codeSyntax && Object.keys(variable.codeSyntax).length > 0) {
    figmaExtensions.codeSyntax = {
      web: variable.codeSyntax.WEB,
      android: variable.codeSyntax.ANDROID,
      ios: variable.codeSyntax.iOS,
    };
  }

  // Handle alias (reference to another variable)
  if (isVariableAlias(value)) {
    return {
      $type: tokenType,
      $value: createTokenReference(value, variablesById),
      $description: variable.description || undefined,
      $extensions: {
        'com.figma': figmaExtensions,
      },
    };
  }

  // Handle concrete values
  let tokenValue: Token['$value'];

  if (isRGBA(value)) {
    tokenValue = convertFigmaColor(value);
  } else if (typeof value === 'number') {
    const converted = convertFigmaNumber(value, variable.scopes);
    tokenValue = converted as Token['$value'];
  } else if (typeof value === 'string') {
    // Font family comes as a string but should be an array
    if (tokenType === 'fontFamily') {
      tokenValue = [value];
    } else {
      tokenValue = value;
    }
  } else {
    tokenValue = value as Token['$value'];
  }

  return {
    $type: tokenType,
    $value: tokenValue,
    $description: variable.description || undefined,
    $extensions: {
      'com.figma': figmaExtensions,
    },
  };
}

// =============================================================================
// Token Group Building
// =============================================================================

/**
 * Convert a variable path (e.g., "Colors/Primary/500") to nested group structure
 */
export function buildTokenPath(
  name: string
): { path: string[]; tokenName: string } {
  const segments = name.split('/');
  const tokenName = segments.pop() || name;
  const path = segments.map((s: string) => s.toLowerCase().replace(/\s+/g, '-'));

  return { path, tokenName: tokenName.toLowerCase().replace(/\s+/g, '-') };
}

/**
 * Set a token at a nested path in a token group
 */
export function setTokenAtPath(
  group: TokenGroup,
  path: string[],
  tokenName: string,
  token: Token
): void {
  let current = group;

  for (const segment of path) {
    if (!(segment in current)) {
      current[segment] = {} as TokenGroup;
    }
    current = current[segment] as TokenGroup;
  }

  current[tokenName] = token;
}

// =============================================================================
// Collection Parsing
// =============================================================================

/**
 * Parse a Figma variable collection into a normalized TokenCollection
 */
export function parseCollection(
  collection: LocalVariableCollection,
  variables: LocalVariable[],
  variablesById: Map<string, LocalVariable>
): TokenCollection {
  const modes = collection.modes.map((m: { modeId: string; name: string }) => m.name);
  const defaultMode = collection.modes.find((m: { modeId: string; name: string }) => m.modeId === collection.defaultModeId)?.name || modes[0];

  // Build tokens for each mode
  const tokens: Record<string, TokenGroup> = {};

  for (const mode of collection.modes) {
    const modeTokens: TokenGroup = {};

    for (const variable of variables) {
      const value = variable.valuesByMode[mode.modeId];
      if (value === undefined) continue;

      const token = createToken(variable, value, variablesById);
      const { path, tokenName } = buildTokenPath(variable.name);

      setTokenAtPath(modeTokens, path, tokenName, token);
    }

    tokens[mode.name] = modeTokens;
  }

  return {
    name: collection.name,
    description: collection.hiddenFromPublishing ? undefined : `Figma collection: ${collection.name}`,
    modes,
    defaultMode,
    tokens,
  };
}

/**
 * Parse all Figma variables into normalized token collections
 */
export function parseVariables(
  variables: Record<string, LocalVariable>,
  collections: Record<string, LocalVariableCollection>
): TokenCollection[] {
  // Build lookup maps
  const variablesById = new Map<string, LocalVariable>();
  const variablesByCollection = new Map<string, LocalVariable[]>();

  for (const variable of Object.values(variables)) {
    variablesById.set(variable.id, variable);

    const collectionVars = variablesByCollection.get(variable.variableCollectionId) || [];
    collectionVars.push(variable);
    variablesByCollection.set(variable.variableCollectionId, collectionVars);
  }

  // Parse each collection
  const result: TokenCollection[] = [];

  for (const collection of Object.values(collections)) {
    const collectionVariables = variablesByCollection.get(collection.id) || [];

    // Skip empty collections
    if (collectionVariables.length === 0) continue;

    // Skip hidden collections if needed
    if (collection.hiddenFromPublishing) continue;

    result.push(parseCollection(collection, collectionVariables, variablesById));
  }

  return result;
}

// =============================================================================
// MCP Variable Defs Parsing (from get_variable_defs tool)
// =============================================================================

/**
 * Parse a hex color string to ColorValue
 */
function parseHexColor(hex: string): ColorValue {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
  const a = cleanHex.length === 8 ? parseInt(cleanHex.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

/**
 * Parse a Font() string from MCP format
 * Example: Font(family: "DM Sans", style: Bold, size: 56, weight: 700, lineHeight: 64, letterSpacing: -1.5)
 */
function parseFontString(fontStr: string): Record<string, string | number> | null {
  const match = fontStr.match(/^Font\((.*)\)$/);
  if (!match) return null;

  const result: Record<string, string | number> = {};
  const content = match[1];

  // Parse key: value pairs
  const regex = /(\w+):\s*(?:"([^"]+)"|([^,)]+))/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const key = m[1];
    const value = m[2] || m[3].trim();
    // Try to parse as number
    const numValue = parseFloat(value);
    result[key] = isNaN(numValue) ? value : numValue;
  }

  return result;
}

/**
 * Parse an Effect() string from MCP format
 * Example: Effect(type: DROP_SHADOW, color: #1D293D05, offset: (0, 1), radius: 0.5, spread: 0.05)
 */
function parseEffectString(effectStr: string): {
  offsetX: { value: number; unit: 'px' };
  offsetY: { value: number; unit: 'px' };
  blur: { value: number; unit: 'px' };
  spread?: { value: number; unit: 'px' };
  color: ColorValue;
  inset?: boolean;
} | null {
  const match = effectStr.match(/^Effect\((.*)\)$/);
  if (!match) return null;

  const content = match[1];

  // Parse type
  const typeMatch = content.match(/type:\s*(\w+)/);
  const isInset = typeMatch?.[1] === 'INNER_SHADOW';

  // Parse color
  const colorMatch = content.match(/color:\s*(#[A-Fa-f0-9]+)/);
  let color: ColorValue = { r: 0, g: 0, b: 0, a: 0.1 };
  if (colorMatch) {
    color = parseHexColor(colorMatch[1]);
  }

  // Parse offset (x, y)
  const offsetMatch = content.match(/offset:\s*\(([^)]+)\)/);
  let offsetX = 0;
  let offsetY = 0;
  if (offsetMatch) {
    const parts = offsetMatch[1].split(',').map((s: string) => parseFloat(s.trim()));
    offsetX = parts[0] || 0;
    offsetY = parts[1] || 0;
  }

  // Parse radius (blur)
  const radiusMatch = content.match(/radius:\s*([\d.]+)/);
  const blur = radiusMatch ? parseFloat(radiusMatch[1]) : 0;

  // Parse spread
  const spreadMatch = content.match(/spread:\s*([\d.]+)/);
  const spread = spreadMatch ? parseFloat(spreadMatch[1]) : undefined;

  return {
    offsetX: { value: offsetX, unit: 'px' },
    offsetY: { value: offsetY, unit: 'px' },
    blur: { value: blur, unit: 'px' },
    spread: spread !== undefined ? { value: spread, unit: 'px' } : undefined,
    color,
    inset: isInset || undefined,
  };
}

/**
 * Detect token type from variable path and value
 * Uses the TokenTypeRegistry for extensible type detection
 */
function detectVariableDefsTokenType(path: string, value: string): TokenType {
  const context: VariableDefsContext = {
    path,
    value,
  };

  return tokenTypeRegistry.detectFromVariableDefs(context);
}

/**
 * Convert numeric font weight to FontWeightValue type
 */
function toFontWeight(weight: number): 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 {
  // Round to nearest valid weight
  const validWeights: readonly (100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900)[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];
  let closest: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 = 400;
  let minDiff = Math.abs(400 - weight);
  for (const w of validWeights) {
    const diff = Math.abs(w - weight);
    if (diff < minDiff) {
      minDiff = diff;
      closest = w;
    }
  }
  return closest;
}

/**
 * Parse MCP variable defs into normalized token collections
 *
 * Input format: { "Color/Primary/Primary-500": "#0038a8", ... }
 * This is the output from Figma MCP's get_variable_defs tool.
 */
export function parseVariableDefs(
  variables: Record<string, string>
): TokenCollection[] {
  // Group variables by their top-level category
  const groups = new Map<string, Map<string, { path: string[]; tokenName: string; value: string }>>();

  for (const [fullPath, rawValue] of Object.entries(variables)) {
    const segments = fullPath.split('/');
    const category = segments[0] || 'Variables';
    const tokenName = segments.pop() || fullPath;
    const path = segments.slice(1).map((s: string) => s.toLowerCase().replace(/\s+/g, '-'));

    if (!groups.has(category)) {
      groups.set(category, new Map());
    }

    const groupMap = groups.get(category)!;
    groupMap.set(fullPath, {
      path,
      tokenName: tokenName.toLowerCase().replace(/\s+/g, '-'),
      value: rawValue,
    });
  }

  // Build collections from groups
  const collections: TokenCollection[] = [];

  for (const [category, variableMap] of groups) {
    const tokens: TokenGroup = {};

    for (const [fullPath, { path, tokenName, value }] of variableMap) {
      const tokenType = detectVariableDefsTokenType(fullPath, value);
      let tokenValue: Token['$value'];

      // For complex values (Font(), Effect()), use the value directly without splitting
      // For simple values, handle multiple modes (comma-separated)
      let primaryValue: string;
      if (value.startsWith('Font(') || value.startsWith('Effect(')) {
        primaryValue = value;
      } else {
        const values = value.split(',').map((v: string) => v.trim());
        primaryValue = values[0];
      }

      // Parse the value based on type
      if (tokenType === 'color' && primaryValue.startsWith('#')) {
        tokenValue = parseHexColor(primaryValue);
      } else if (tokenType === 'dimension') {
        const numMatch = primaryValue.match(/^(\d+(?:\.\d+)?)(px)?$/);
        if (numMatch) {
          tokenValue = { value: parseFloat(numMatch[1]), unit: 'px' };
        } else {
          tokenValue = primaryValue;
        }
      } else if (tokenType === 'typography' && primaryValue.startsWith('Font(')) {
        const fontData = parseFontString(primaryValue);
        if (fontData) {
          tokenValue = {
            fontFamily: fontData.family ? [String(fontData.family)] : ['sans-serif'],
            fontSize: fontData.size ? { value: fontData.size as number, unit: 'px' } : { value: 16, unit: 'px' },
            fontWeight: fontData.weight ? toFontWeight(fontData.weight as number) : 400,
            lineHeight: fontData.lineHeight ? { value: fontData.lineHeight as number, unit: 'px' } : 1.5,
            letterSpacing: fontData.letterSpacing ? { value: fontData.letterSpacing as number, unit: 'px' } : undefined,
          };
        } else {
          tokenValue = primaryValue;
        }
      } else if (tokenType === 'shadow' && primaryValue.startsWith('Effect(')) {
        const shadowData = parseEffectString(primaryValue);
        if (shadowData) {
          tokenValue = shadowData;
        } else {
          // Skip unparseable shadow tokens
          continue;
        }
      } else {
        tokenValue = primaryValue;
      }

      const token: Token = {
        $type: tokenType,
        $value: tokenValue,
        $extensions: {
          'com.figma': {
            // Store original path in codeSyntax.web
            codeSyntax: {
              web: fullPath,
            },
          },
        },
      };

      setTokenAtPath(tokens, path, tokenName, token);
    }

    collections.push({
      name: category,
      description: `Design tokens from ${category}`,
      modes: ['Default'],
      defaultMode: 'Default',
      tokens: {
        Default: tokens,
      },
    });
  }

  return collections;
}
