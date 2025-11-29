/**
 * CSS Input Adapter
 *
 * Parses CSS files with custom properties and @theme blocks
 * into normalized design tokens.
 */

import type { ThemeFile, InputAdapter, TokenCollection } from '../../../schema/tokens.js';
import type { CSSInput, DetectedToken } from './types.js';
import {
  extractVariables,
  detectTokenType,
  parseValue,
  variableToPath,
  tokensToGroup,
} from './parser.js';

// =============================================================================
// CSS Adapter Implementation
// =============================================================================

/**
 * CSS Input Adapter
 *
 * Parses CSS custom properties and Tailwind @theme blocks
 * into the normalized token format.
 */
export class CSSAdapter implements InputAdapter<CSSInput> {
  readonly id = 'css';
  readonly name = 'CSS Input Adapter';

  /**
   * Validate CSS input
   */
  async validate(source: CSSInput): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    if (source.css === undefined || source.css === null) {
      errors.push('CSS content is required');
    } else if (typeof source.css !== 'string') {
      errors.push('CSS content must be a string');
    } else if (source.css.trim().length === 0) {
      errors.push('CSS content is empty');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Parse CSS into normalized theme format
   */
  async parse(source: CSSInput): Promise<ThemeFile> {
    // Validate first
    const validation = await this.validate(source);
    if (!validation.valid) {
      throw new Error(`Invalid CSS input: ${validation.errors?.join(', ')}`);
    }

    const options = source.options || {};
    const {
      defaultMode = 'default',
      collectionName = 'tokens',
      stripPrefix,
    } = options;

    // Extract all variables from CSS
    const variables = extractVariables(source.css, options);

    // Group variables by context (mode detection)
    const lightContexts = [':root', '@theme'];
    const darkContexts = ['.dark', '[data-theme="dark"]', '@media (prefers-color-scheme: dark)'];

    const lightVariables = variables.filter(v => lightContexts.includes(v.context));
    const darkVariables = variables.filter(v => darkContexts.includes(v.context));

    // Detect token types and parse values
    const lightTokens = this.parseVariables(lightVariables, stripPrefix);
    const darkTokens = this.parseVariables(darkVariables, stripPrefix);

    // Determine modes
    const modes: string[] = [defaultMode];
    if (darkTokens.length > 0) {
      modes.push('dark');
    }

    // Build token groups
    const tokensByMode: Record<string, ReturnType<typeof tokensToGroup>> = {
      [defaultMode]: tokensToGroup(lightTokens),
    };

    if (darkTokens.length > 0) {
      tokensByMode['dark'] = tokensToGroup(darkTokens);
    }

    // Create collection
    const collection: TokenCollection = {
      name: collectionName,
      modes,
      defaultMode,
      tokens: tokensByMode,
    };

    // Build theme file
    const theme: ThemeFile = {
      $schema: 'https://figma-to-tailwind.dev/schema/v1/theme.json',
      name: source.fileName || 'CSS Theme',
      description: `Design tokens parsed from CSS`,
      collections: [collection],
      meta: {
        source: 'manual',
        lastSynced: new Date().toISOString(),
        version: '1.0.0',
      },
    };

    return theme;
  }

  /**
   * Parse variables into detected tokens
   */
  private parseVariables(
    variables: Array<{ name: string; rawValue: string }>,
    stripPrefix?: string
  ): DetectedToken[] {
    const tokens: DetectedToken[] = [];

    for (const variable of variables) {
      const type = detectTokenType(variable.rawValue);
      const value = parseValue(variable.rawValue, type);
      const path = variableToPath(variable.name, stripPrefix);

      tokens.push({
        path,
        type,
        value,
        originalName: variable.name,
      });
    }

    return tokens;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new CSS adapter instance
 */
export function createCSSAdapter(): CSSAdapter {
  return new CSSAdapter();
}
