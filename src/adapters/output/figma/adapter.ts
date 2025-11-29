/**
 * Figma Output Adapter
 *
 * Transforms normalized ThemeFile tokens into Figma Variables
 * via the Plugin API (write-server) or REST API.
 */

import type { ThemeFile, OutputAdapter } from '../../../schema/tokens.js';
import type {
  FigmaOutputAdapterOptions,
  FigmaOutputResult,
  WriteServerClient,
  VariableCreateParams,
} from './types.js';
import { PluginNotConnectedError } from './types.js';
import { transformToFigmaVariables } from './transformer.js';
import { extractStyleTokens } from './styles-transformer.js';
import { checkSourceSafety, checkPluginSafety } from './safety.js';

// =============================================================================
// Adapter Class
// =============================================================================

/**
 * Figma output adapter for pushing design tokens back to Figma
 */
export class FigmaOutputAdapter implements OutputAdapter<FigmaOutputResult> {
  readonly id = 'figma-output';
  readonly name = 'Figma Output Adapter';

  private writeClient?: WriteServerClient;

  /**
   * Create a new Figma output adapter
   *
   * @param writeClient Optional write client for Plugin API integration
   */
  constructor(writeClient?: WriteServerClient) {
    this.writeClient = writeClient;
  }

  /**
   * Transform a ThemeFile into Figma Variables format
   */
  async transform(
    theme: ThemeFile,
    options: FigmaOutputAdapterOptions = {}
  ): Promise<FigmaOutputResult> {
    // Perform source safety check
    checkSourceSafety(theme, options);

    // Transform tokens to Figma format
    const { requestBody, report } = transformToFigmaVariables(theme, options);

    // Add source match warning if applicable
    if (report.sourceCheck.isSameFile && report.sourceCheck.overwriteAllowed) {
      report.addWarning(
        'SOURCE_MATCH',
        'Target file matches source file - proceeding with explicit permission'
      );
    }

    // Build result
    const result: FigmaOutputResult = {
      requestBody,
      report,

      getManualInstructions: () => this.getManualInstructions(
        options.targetFileKey || '<YOUR_FILE_KEY>',
        requestBody
      ),
    };

    // Add execute method if write client is available
    if (this.writeClient) {
      result.execute = async () => {
        // Check plugin connection
        const status = await this.writeClient!.getStatus();
        if (!status.connected) {
          throw new PluginNotConnectedError();
        }

        // Safety check against currently open file
        checkPluginSafety(theme, status, options);

        // Convert request body to write client format
        const variableParams = this.convertToVariableParams(requestBody);

        // Push variables
        if (variableParams.length > 0) {
          await this.writeClient!.variables(variableParams);
        }

        // Extract and push styles
        const styleTokens = extractStyleTokens(theme, report);
        const allStyles = [
          ...styleTokens.textStyles,
          ...styleTokens.effectStyles,
          ...styleTokens.paintStyles,
        ];

        if (allStyles.length > 0) {
          await this.writeClient!.styles(allStyles);
        }

        return {
          status: 200,
          error: false,
          meta: {
            tempIdToRealId: {},
            // Additional info (not part of standard response)
            // variablesCreated: variableParams.length,
            // stylesCreated: allStyles.length,
          },
        };
      };
    }

    return result;
  }

  /**
   * Convert REST API request body to write client variable params
   */
  private convertToVariableParams(
    requestBody: FigmaOutputResult['requestBody']
  ): VariableCreateParams[] {
    const params: VariableCreateParams[] = [];

    // Build collection and mode ID maps
    const collectionNames = new Map<string, string>();
    for (const col of requestBody.variableCollections ?? []) {
      if (col.action === 'CREATE' && col.id && col.name) {
        collectionNames.set(col.id, col.name);
      }
    }

    const modeNames = new Map<string, string>();
    for (const col of requestBody.variableCollections ?? []) {
      // Only CREATE actions have initialModeId
      if (col.action === 'CREATE' && 'initialModeId' in col && col.initialModeId) {
        // Initial mode uses collection's default mode name (we use 'default')
        modeNames.set(col.initialModeId, 'default');
      }
    }
    for (const mode of requestBody.variableModes ?? []) {
      if (mode.action === 'CREATE' && mode.id && mode.name) {
        modeNames.set(mode.id, mode.name);
      }
    }

    // Convert variables
    for (const variable of requestBody.variables ?? []) {
      if (variable.action !== 'CREATE' || !variable.id) continue;

      const collectionName = collectionNames.get(variable.variableCollectionId ?? '');
      if (!collectionName) continue;

      // Gather values by mode
      const valuesByMode: Record<string, unknown> = {};
      for (const modeValue of requestBody.variableModeValues ?? []) {
        if (modeValue.variableId === variable.id) {
          const modeName = modeNames.get(modeValue.modeId ?? '') ?? 'default';
          valuesByMode[modeName] = modeValue.value;
        }
      }

      params.push({
        name: variable.name ?? '',
        collectionName,
        resolvedType: variable.resolvedType as 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR',
        valuesByMode,
        description: variable.description,
      });
    }

    return params;
  }

  /**
   * Generate manual instructions for users without Plugin API access
   */
  private getManualInstructions(
    targetFileKey: string,
    requestBody: unknown
  ): string {
    return `
To push these variables to Figma, use the REST API:

POST https://api.figma.com/v1/files/${targetFileKey}/variables

Headers:
  X-Figma-Token: YOUR_TOKEN

Body:
${JSON.stringify(requestBody, null, 2)}

Note: Requires Figma Enterprise plan with file_variables:write scope.

Alternatively, use the Figma MCP Write Server for Plugin API access:
https://github.com/oO/figma-mcp-write-server
`.trim();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new Figma output adapter
 *
 * @param writeClient Optional write client for Plugin API integration
 */
export function createFigmaOutputAdapter(
  writeClient?: WriteServerClient
): FigmaOutputAdapter {
  return new FigmaOutputAdapter(writeClient);
}
