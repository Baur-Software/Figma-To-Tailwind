/**
 * Figma REST API and MCP Server Types
 *
 * Re-exports official types from @figma/rest-api-spec and provides
 * additional types for MCP server integration.
 *
 * Reference:
 * - https://github.com/figma/rest-api-spec
 * - https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server
 */

// =============================================================================
// Re-export Official Figma REST API Types
// =============================================================================

export type {
  // Color types
  RGBA,
  RGB,
  ColorStop,

  // Variable types
  VariableAlias,
  VariableScope,
  VariableCodeSyntax,
  VariableResolvedDataType,
  VariableDataType,
  VariableData,
  VariableValue,

  // Local variables (from GET /v1/files/{file_key}/variables/local)
  LocalVariable,
  LocalVariableCollection,

  // Published variables (from GET /v1/files/{file_key}/variables/published)
  PublishedVariable,
  PublishedVariableCollection,

  // Variable mutations (for POST /v1/files/{file_key}/variables)
  VariableCreate,
  VariableUpdate,
  VariableDelete,
  VariableChange,
  VariableCollectionCreate,
  VariableCollectionUpdate,
  VariableCollectionDelete,
  VariableCollectionChange,
  VariableModeCreate,
  VariableModeUpdate,
  VariableModeDelete,
  VariableModeChange,
  VariableModeValue,

  // API Response types
  GetLocalVariablesResponse,
  GetLocalVariablesPathParams,
  GetPublishedVariablesResponse,
  PostVariablesResponse,
  PostVariablesRequestBody,

  // Style types
  Style,
  StyleType,
  Paint,
  SolidPaint,
  GradientPaint,
  ImagePaint,
  Effect,
  DropShadowEffect,
  InnerShadowEffect,
  BlurEffect,
  TypeStyle,

  // Component types
  Component,
  ComponentSet,

  // Node types
  Node,
  DocumentNode,
  CanvasNode,
  FrameNode,
  GroupNode,
  VectorNode,
  BooleanOperationNode,
  StarNode,
  LineNode,
  EllipseNode,
  RegularPolygonNode,
  RectangleNode,
  TableNode,
  TableCellNode,
  TextNode,
  SliceNode,
  ComponentNode,
  ComponentSetNode,
  InstanceNode,
  StickyNode,
  ShapeWithTextNode,
  ConnectorNode,
  WashiTapeNode,
} from '@figma/rest-api-spec';

// Import for use in this module
import type {
  RGBA,
  VariableAlias,
  LocalVariable,
  LocalVariableCollection,
  GetLocalVariablesResponse,
  Style,
  Component,
  ComponentSet,
} from '@figma/rest-api-spec';

// =============================================================================
// Convenience Type Aliases (for backwards compatibility)
// =============================================================================

/** @deprecated Use RGBA from @figma/rest-api-spec */
export type FigmaColor = RGBA;

/** @deprecated Use VariableAlias from @figma/rest-api-spec */
export type FigmaVariableAlias = VariableAlias;

/** @deprecated Use LocalVariable from @figma/rest-api-spec */
export type FigmaVariable = LocalVariable;

/** @deprecated Use LocalVariableCollection from @figma/rest-api-spec */
export type FigmaVariableCollection = LocalVariableCollection;

/** @deprecated Use GetLocalVariablesResponse from @figma/rest-api-spec */
export type FigmaVariablesResponse = GetLocalVariablesResponse;

// =============================================================================
// Figma MCP Server Types
// (Not covered by @figma/rest-api-spec - these are MCP-specific)
// =============================================================================

/**
 * Figma MCP tool names available in the official Figma MCP server
 */
export type FigmaMCPToolName =
  | 'get_figma_data'
  | 'download_figma_images';

/**
 * Parameters for get_figma_data MCP tool
 */
export interface FigmaMCPGetDataParams {
  /** Figma file URL or node URL */
  url: string;
  /** Depth of nodes to traverse (default: 2) */
  depth?: number;
}

/**
 * Simplified node data from MCP server
 * (MCP returns a simplified version of the full node tree)
 */
export interface FigmaMCPNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaMCPNode[];
  /** Style references */
  styles?: Record<string, string>;
  /** Bound variables */
  boundVariables?: Record<string, VariableAlias | VariableAlias[]>;
  /** Additional properties vary by node type */
  [key: string]: unknown;
}

/**
 * Response from Figma MCP get_figma_data tool
 */
export interface FigmaMCPDataResponse {
  /** File name */
  name: string;
  /** File last modified timestamp */
  lastModified: string;
  /** Document node tree */
  document: FigmaMCPNode;
  /** Variables in the file (same structure as REST API) */
  variables?: Record<string, LocalVariable>;
  /** Variable collections */
  variableCollections?: Record<string, LocalVariableCollection>;
  /** Styles in the file */
  styles?: Record<string, Style>;
  /** Components in the file */
  components?: Record<string, Component>;
  /** Component sets */
  componentSets?: Record<string, ComponentSet>;
}

// =============================================================================
// Helper Type Guards
// =============================================================================

/**
 * Type guard for RGBA color values
 */
export function isRGBA(value: unknown): value is RGBA {
  return (
    typeof value === 'object' &&
    value !== null &&
    'r' in value &&
    'g' in value &&
    'b' in value &&
    'a' in value
  );
}

/**
 * Type guard for variable alias references
 */
export function isVariableAlias(value: unknown): value is VariableAlias {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as VariableAlias).type === 'VARIABLE_ALIAS'
  );
}

/** @deprecated Use isRGBA instead */
export const isFigmaColor = isRGBA;

/** @deprecated Use isVariableAlias instead */
export const isFigmaVariableAlias = isVariableAlias;

// =============================================================================
// MCP Variable Defs Format (from get_variable_defs tool)
// =============================================================================

/**
 * Variable definitions from Figma MCP get_variable_defs tool
 *
 * Format: { "Variable/Path/Name": "value", ... }
 *
 * Values can be:
 * - Hex colors: "#ffffff", "#0038a8"
 * - Multiple modes: "#ffffff,#000000" (comma-separated)
 * - Dimensions: "16", "24px"
 * - Font definitions: "Font(family: \"DM Sans\", style: Bold, size: 56, ...)"
 * - Effects: "Effect(type: DROP_SHADOW, ...)"
 *
 * @example
 * ```typescript
 * const variables: MCPVariableDefs = {
 *   "Color/Primary/Primary-500": "#0038a8",
 *   "Spacing/4": "16",
 *   "Display/6xl/Bold": "Font(family: \"DM Sans\", style: Bold, size: 56, weight: 700, lineHeight: 64, letterSpacing: -1.5)"
 * };
 * ```
 */
export type MCPVariableDefs = Record<string, string>;

/** @deprecated Use MCPVariableDefs instead */
export type MCPSimplifiedVariables = MCPVariableDefs;
