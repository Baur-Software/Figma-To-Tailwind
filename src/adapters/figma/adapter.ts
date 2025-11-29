/**
 * Figma Input Adapter
 *
 * Converts Figma MCP server responses and REST API data
 * into normalized design tokens.
 */

import type { GetLocalVariablesResponse } from '@figma/rest-api-spec';
import type { FigmaMCPDataResponse, MCPVariableDefs } from '../../schema/figma.js';
import type {
  ThemeFile,
  InputAdapter,
} from '../../schema/tokens.js';
import { parseVariables, parseVariableDefs } from './parser.js';

// =============================================================================
// Input Types
// =============================================================================

/**
 * Combined input from Figma sources
 */
export interface FigmaInput {
  /** Data from MCP get_figma_data tool */
  mcpData?: FigmaMCPDataResponse;
  /** Data from REST API /variables/local endpoint */
  variablesResponse?: GetLocalVariablesResponse;
  /** Variable definitions from MCP get_variable_defs tool */
  variableDefs?: MCPVariableDefs;
  /** Figma file key (for metadata) */
  fileKey?: string;
  /** File name (for metadata when using variable defs) */
  fileName?: string;
}

// =============================================================================
// Figma Adapter Implementation
// =============================================================================

/**
 * Figma MCP/API Input Adapter
 *
 * Parses design data from Figma's MCP server or REST API
 * and converts it to the normalized token format.
 */
export class FigmaAdapter implements InputAdapter<FigmaInput> {
  readonly id = 'figma';
  readonly name = 'Figma MCP/API Adapter';

  /**
   * Validate Figma input data
   */
  async validate(source: FigmaInput): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    if (!source.mcpData && !source.variablesResponse && !source.variableDefs) {
      errors.push('Either mcpData, variablesResponse, or variableDefs must be provided');
    }

    if (source.mcpData) {
      if (!source.mcpData.name) {
        errors.push('MCP data missing file name');
      }
    }

    if (source.variablesResponse) {
      if (source.variablesResponse.error) {
        errors.push('Variables response contains error');
      }
      if (!source.variablesResponse.meta?.variables) {
        errors.push('Variables response missing variables data');
      }
      if (!source.variablesResponse.meta?.variableCollections) {
        errors.push('Variables response missing collections data');
      }
    }

    if (source.variableDefs) {
      if (Object.keys(source.variableDefs).length === 0) {
        errors.push('Variable defs object is empty');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Parse Figma data into normalized theme format
   */
  async parse(source: FigmaInput): Promise<ThemeFile> {
    // Validate first
    const validation = await this.validate(source);
    if (!validation.valid) {
      throw new Error(`Invalid Figma input: ${validation.errors?.join(', ')}`);
    }

    let tokenCollections;
    let fileName = source.fileName || 'Untitled';
    let lastModified: string | undefined;
    let sourceType: 'figma-api' | 'figma-mcp' | 'figma-mcp-defs';

    if (source.variablesResponse) {
      // Prefer REST API response (most complete)
      const variables = source.variablesResponse.meta.variables;
      const collections = source.variablesResponse.meta.variableCollections;
      tokenCollections = parseVariables(variables, collections);
      sourceType = 'figma-api';
    } else if (source.variableDefs) {
      // Use MCP variable defs format (from get_variable_defs)
      tokenCollections = parseVariableDefs(source.variableDefs);
      sourceType = 'figma-mcp-defs';
    } else if (source.mcpData) {
      // Fall back to full MCP data
      const variables = source.mcpData.variables || {};
      const collections = source.mcpData.variableCollections || {};
      tokenCollections = parseVariables(variables, collections);
      fileName = source.mcpData.name;
      lastModified = source.mcpData.lastModified;
      sourceType = 'figma-mcp';
    } else {
      throw new Error('No valid data source');
    }

    // Build theme file
    const theme: ThemeFile = {
      $schema: 'https://figma-to-tailwind.dev/schema/v1/theme.json',
      name: fileName,
      description: `Design tokens exported from Figma file: ${fileName}`,
      collections: tokenCollections,
      meta: {
        source: sourceType,
        figmaFileKey: source.fileKey,
        lastSynced: lastModified || new Date().toISOString(),
        version: '1.0.0',
      },
    };

    return theme;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new Figma adapter instance
 */
export function createFigmaAdapter(): FigmaAdapter {
  return new FigmaAdapter();
}
