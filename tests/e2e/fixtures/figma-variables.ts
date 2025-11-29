/**
 * Mock Figma Variables Data
 *
 * Realistic test fixtures based on Figma REST API response format.
 * These simulate a typical design system with colors, spacing, and typography.
 */

import type {
  LocalVariable,
  LocalVariableCollection,
  GetLocalVariablesResponse,
} from '@figma/rest-api-spec';

// =============================================================================
// Color Variables
// =============================================================================

const colorVariables: Record<string, LocalVariable> = {
  'var-color-primary': {
    id: 'var-color-primary',
    name: 'Colors/Primary/500',
    key: 'color-primary-500',
    variableCollectionId: 'collection-colors',
    resolvedType: 'COLOR',
    valuesByMode: {
      'mode-light': { r: 0.2196, g: 0.5020, b: 0.9647, a: 1 }, // #3880f6
      'mode-dark': { r: 0.3098, g: 0.5647, b: 0.9765, a: 1 },  // #4f90f9
    },
    remote: false,
    description: 'Primary brand color',
    scopes: ['ALL_FILLS', 'STROKE_COLOR'],
    codeSyntax: { WEB: '--color-primary-500' },
    hiddenFromPublishing: false,
  },
  'var-color-primary-shade': {
    id: 'var-color-primary-shade',
    name: 'Colors/Primary/600',
    key: 'color-primary-600',
    variableCollectionId: 'collection-colors',
    resolvedType: 'COLOR',
    valuesByMode: {
      'mode-light': { r: 0.1765, g: 0.4000, b: 0.7725, a: 1 }, // #2d66c5
      'mode-dark': { r: 0.2549, g: 0.4706, b: 0.8118, a: 1 },
    },
    remote: false,
    description: 'Primary shade for hover states',
    scopes: ['ALL_FILLS', 'STROKE_COLOR'],
    codeSyntax: { WEB: '--color-primary-600' },
    hiddenFromPublishing: false,
  },
  'var-color-secondary': {
    id: 'var-color-secondary',
    name: 'Colors/Secondary/500',
    key: 'color-secondary-500',
    variableCollectionId: 'collection-colors',
    resolvedType: 'COLOR',
    valuesByMode: {
      'mode-light': { r: 0.2353, g: 0.8392, b: 0.6863, a: 1 }, // #3cd6af
      'mode-dark': { r: 0.3137, g: 0.8784, b: 0.7333, a: 1 },
    },
    remote: false,
    description: 'Secondary accent color',
    scopes: ['ALL_FILLS', 'STROKE_COLOR'],
    codeSyntax: { WEB: '--color-secondary-500' },
    hiddenFromPublishing: false,
  },
  'var-color-success': {
    id: 'var-color-success',
    name: 'Colors/Success',
    key: 'color-success',
    variableCollectionId: 'collection-colors',
    resolvedType: 'COLOR',
    valuesByMode: {
      'mode-light': { r: 0.1569, g: 0.7137, b: 0.3647, a: 1 }, // #28b65d
      'mode-dark': { r: 0.2157, g: 0.7647, b: 0.4196, a: 1 },
    },
    remote: false,
    description: 'Success state color',
    scopes: ['ALL_FILLS'],
    codeSyntax: { WEB: '--color-success' },
    hiddenFromPublishing: false,
  },
  'var-color-warning': {
    id: 'var-color-warning',
    name: 'Colors/Warning',
    key: 'color-warning',
    variableCollectionId: 'collection-colors',
    resolvedType: 'COLOR',
    valuesByMode: {
      'mode-light': { r: 1.0, g: 0.7608, b: 0.0, a: 1 }, // #ffc200
      'mode-dark': { r: 1.0, g: 0.8118, b: 0.1373, a: 1 },
    },
    remote: false,
    description: 'Warning state color',
    scopes: ['ALL_FILLS'],
    codeSyntax: { WEB: '--color-warning' },
    hiddenFromPublishing: false,
  },
  'var-color-danger': {
    id: 'var-color-danger',
    name: 'Colors/Danger',
    key: 'color-danger',
    variableCollectionId: 'collection-colors',
    resolvedType: 'COLOR',
    valuesByMode: {
      'mode-light': { r: 0.9216, g: 0.2588, b: 0.2078, a: 1 }, // #eb4235
      'mode-dark': { r: 0.9451, g: 0.3333, b: 0.2824, a: 1 },
    },
    remote: false,
    description: 'Danger/error state color',
    scopes: ['ALL_FILLS'],
    codeSyntax: { WEB: '--color-danger' },
    hiddenFromPublishing: false,
  },
  'var-color-background': {
    id: 'var-color-background',
    name: 'Colors/Background',
    key: 'color-background',
    variableCollectionId: 'collection-colors',
    resolvedType: 'COLOR',
    valuesByMode: {
      'mode-light': { r: 1.0, g: 1.0, b: 1.0, a: 1 }, // #ffffff
      'mode-dark': { r: 0.0667, g: 0.0667, b: 0.0667, a: 1 }, // #111111
    },
    remote: false,
    description: 'App background color',
    scopes: ['FRAME_FILL'],
    codeSyntax: { WEB: '--color-background' },
    hiddenFromPublishing: false,
  },
  'var-color-text': {
    id: 'var-color-text',
    name: 'Colors/Text',
    key: 'color-text',
    variableCollectionId: 'collection-colors',
    resolvedType: 'COLOR',
    valuesByMode: {
      'mode-light': { r: 0.0667, g: 0.0667, b: 0.0667, a: 1 }, // #111111
      'mode-dark': { r: 0.9333, g: 0.9333, b: 0.9333, a: 1 }, // #eeeeee
    },
    remote: false,
    description: 'Primary text color',
    scopes: ['TEXT_FILL'],
    codeSyntax: { WEB: '--color-text' },
    hiddenFromPublishing: false,
  },
};

// =============================================================================
// Spacing Variables
// =============================================================================

const spacingVariables: Record<string, LocalVariable> = {
  'var-spacing-1': {
    id: 'var-spacing-1',
    name: 'Spacing/1',
    key: 'spacing-1',
    variableCollectionId: 'collection-spacing',
    resolvedType: 'FLOAT',
    valuesByMode: {
      'mode-default': 4,
    },
    remote: false,
    description: '4px spacing unit',
    scopes: ['GAP', 'WIDTH_HEIGHT'],
    codeSyntax: { WEB: '--spacing-1' },
    hiddenFromPublishing: false,
  },
  'var-spacing-2': {
    id: 'var-spacing-2',
    name: 'Spacing/2',
    key: 'spacing-2',
    variableCollectionId: 'collection-spacing',
    resolvedType: 'FLOAT',
    valuesByMode: {
      'mode-default': 8,
    },
    remote: false,
    description: '8px spacing unit',
    scopes: ['GAP', 'WIDTH_HEIGHT'],
    codeSyntax: { WEB: '--spacing-2' },
    hiddenFromPublishing: false,
  },
  'var-spacing-4': {
    id: 'var-spacing-4',
    name: 'Spacing/4',
    key: 'spacing-4',
    variableCollectionId: 'collection-spacing',
    resolvedType: 'FLOAT',
    valuesByMode: {
      'mode-default': 16,
    },
    remote: false,
    description: '16px spacing unit',
    scopes: ['GAP', 'WIDTH_HEIGHT'],
    codeSyntax: { WEB: '--spacing-4' },
    hiddenFromPublishing: false,
  },
  'var-spacing-8': {
    id: 'var-spacing-8',
    name: 'Spacing/8',
    key: 'spacing-8',
    variableCollectionId: 'collection-spacing',
    resolvedType: 'FLOAT',
    valuesByMode: {
      'mode-default': 32,
    },
    remote: false,
    description: '32px spacing unit',
    scopes: ['GAP', 'WIDTH_HEIGHT'],
    codeSyntax: { WEB: '--spacing-8' },
    hiddenFromPublishing: false,
  },
  'var-radius-sm': {
    id: 'var-radius-sm',
    name: 'Radius/Small',
    key: 'radius-sm',
    variableCollectionId: 'collection-spacing',
    resolvedType: 'FLOAT',
    valuesByMode: {
      'mode-default': 4,
    },
    remote: false,
    description: 'Small border radius',
    scopes: ['CORNER_RADIUS'],
    codeSyntax: { WEB: '--radius-sm' },
    hiddenFromPublishing: false,
  },
  'var-radius-md': {
    id: 'var-radius-md',
    name: 'Radius/Medium',
    key: 'radius-md',
    variableCollectionId: 'collection-spacing',
    resolvedType: 'FLOAT',
    valuesByMode: {
      'mode-default': 8,
    },
    remote: false,
    description: 'Medium border radius',
    scopes: ['CORNER_RADIUS'],
    codeSyntax: { WEB: '--radius-md' },
    hiddenFromPublishing: false,
  },
  'var-radius-lg': {
    id: 'var-radius-lg',
    name: 'Radius/Large',
    key: 'radius-lg',
    variableCollectionId: 'collection-spacing',
    resolvedType: 'FLOAT',
    valuesByMode: {
      'mode-default': 16,
    },
    remote: false,
    description: 'Large border radius',
    scopes: ['CORNER_RADIUS'],
    codeSyntax: { WEB: '--radius-lg' },
    hiddenFromPublishing: false,
  },
};

// =============================================================================
// Typography Variables
// =============================================================================

const typographyVariables: Record<string, LocalVariable> = {
  'var-font-family': {
    id: 'var-font-family',
    name: 'Typography/Font Family',
    key: 'font-family',
    variableCollectionId: 'collection-typography',
    resolvedType: 'STRING',
    valuesByMode: {
      'mode-default': 'Inter',
    },
    remote: false,
    description: 'Primary font family',
    scopes: ['FONT_FAMILY'],
    codeSyntax: { WEB: '--font-family' },
    hiddenFromPublishing: false,
  },
  'var-font-size-sm': {
    id: 'var-font-size-sm',
    name: 'Typography/Size/Small',
    key: 'font-size-sm',
    variableCollectionId: 'collection-typography',
    resolvedType: 'FLOAT',
    valuesByMode: {
      'mode-default': 12,
    },
    remote: false,
    description: 'Small font size',
    scopes: ['FONT_SIZE'],
    codeSyntax: { WEB: '--font-size-sm' },
    hiddenFromPublishing: false,
  },
  'var-font-size-base': {
    id: 'var-font-size-base',
    name: 'Typography/Size/Base',
    key: 'font-size-base',
    variableCollectionId: 'collection-typography',
    resolvedType: 'FLOAT',
    valuesByMode: {
      'mode-default': 16,
    },
    remote: false,
    description: 'Base font size',
    scopes: ['FONT_SIZE'],
    codeSyntax: { WEB: '--font-size-base' },
    hiddenFromPublishing: false,
  },
  'var-font-size-lg': {
    id: 'var-font-size-lg',
    name: 'Typography/Size/Large',
    key: 'font-size-lg',
    variableCollectionId: 'collection-typography',
    resolvedType: 'FLOAT',
    valuesByMode: {
      'mode-default': 20,
    },
    remote: false,
    description: 'Large font size',
    scopes: ['FONT_SIZE'],
    codeSyntax: { WEB: '--font-size-lg' },
    hiddenFromPublishing: false,
  },
  'var-font-weight-normal': {
    id: 'var-font-weight-normal',
    name: 'Typography/Weight/Normal',
    key: 'font-weight-normal',
    variableCollectionId: 'collection-typography',
    resolvedType: 'FLOAT',
    valuesByMode: {
      'mode-default': 400,
    },
    remote: false,
    description: 'Normal font weight',
    scopes: ['FONT_WEIGHT'],
    codeSyntax: { WEB: '--font-weight-normal' },
    hiddenFromPublishing: false,
  },
  'var-font-weight-bold': {
    id: 'var-font-weight-bold',
    name: 'Typography/Weight/Bold',
    key: 'font-weight-bold',
    variableCollectionId: 'collection-typography',
    resolvedType: 'FLOAT',
    valuesByMode: {
      'mode-default': 700,
    },
    remote: false,
    description: 'Bold font weight',
    scopes: ['FONT_WEIGHT'],
    codeSyntax: { WEB: '--font-weight-bold' },
    hiddenFromPublishing: false,
  },
};

// =============================================================================
// Variable with Alias Reference
// =============================================================================

const aliasVariables: Record<string, LocalVariable> = {
  'var-button-bg': {
    id: 'var-button-bg',
    name: 'Components/Button/Background',
    key: 'button-bg',
    variableCollectionId: 'collection-components',
    resolvedType: 'COLOR',
    valuesByMode: {
      'mode-light': { type: 'VARIABLE_ALIAS', id: 'var-color-primary' },
      'mode-dark': { type: 'VARIABLE_ALIAS', id: 'var-color-primary' },
    },
    remote: false,
    description: 'Button background - references primary color',
    scopes: ['ALL_FILLS'],
    codeSyntax: { WEB: '--button-bg' },
    hiddenFromPublishing: false,
  },
};

// =============================================================================
// Variable Collections
// =============================================================================

const variableCollections: Record<string, LocalVariableCollection> = {
  'collection-colors': {
    id: 'collection-colors',
    name: 'Colors',
    key: 'colors',
    modes: [
      { modeId: 'mode-light', name: 'Light' },
      { modeId: 'mode-dark', name: 'Dark' },
    ],
    defaultModeId: 'mode-light',
    remote: false,
    hiddenFromPublishing: false,
    variableIds: Object.keys(colorVariables),
  },
  'collection-spacing': {
    id: 'collection-spacing',
    name: 'Spacing',
    key: 'spacing',
    modes: [
      { modeId: 'mode-default', name: 'Default' },
    ],
    defaultModeId: 'mode-default',
    remote: false,
    hiddenFromPublishing: false,
    variableIds: Object.keys(spacingVariables),
  },
  'collection-typography': {
    id: 'collection-typography',
    name: 'Typography',
    key: 'typography',
    modes: [
      { modeId: 'mode-default', name: 'Default' },
    ],
    defaultModeId: 'mode-default',
    remote: false,
    hiddenFromPublishing: false,
    variableIds: Object.keys(typographyVariables),
  },
  'collection-components': {
    id: 'collection-components',
    name: 'Components',
    key: 'components',
    modes: [
      { modeId: 'mode-light', name: 'Light' },
      { modeId: 'mode-dark', name: 'Dark' },
    ],
    defaultModeId: 'mode-light',
    remote: false,
    hiddenFromPublishing: false,
    variableIds: Object.keys(aliasVariables),
  },
};

// =============================================================================
// Complete Mock Response
// =============================================================================

export const mockFigmaVariablesResponse: GetLocalVariablesResponse = {
  status: 200,
  error: false,
  meta: {
    variables: {
      ...colorVariables,
      ...spacingVariables,
      ...typographyVariables,
      ...aliasVariables,
    },
    variableCollections,
  },
};

export const mockFigmaMCPResponse = {
  name: 'Design System',
  lastModified: '2025-01-15T10:30:00Z',
  document: {
    id: 'doc-1',
    name: 'Document',
    type: 'DOCUMENT',
    children: [],
  },
  variables: {
    ...colorVariables,
    ...spacingVariables,
    ...typographyVariables,
    ...aliasVariables,
  },
  variableCollections,
};

// Export individual parts for granular testing
export {
  colorVariables,
  spacingVariables,
  typographyVariables,
  aliasVariables,
  variableCollections,
};

// =============================================================================
// MCP Variable Defs (from get_variable_defs tool)
// =============================================================================

/**
 * Mock MCP variable defs - simulates output from Figma MCP get_variable_defs tool
 */
export const mockMCPVariableDefs: Record<string, string> = {
  // Colors
  "Color/Primary/500": "#3880f6",
  "Color/Primary/600": "#2d66c5",
  "Color/Secondary/500": "#3cd6af",
  "Color/Success": "#28b65d",
  "Color/Warning": "#ffc200",
  "Color/Danger": "#eb4235",
  "Color/Background": "#ffffff,#111111", // Light,Dark modes
  "Color/Text": "#111111,#eeeeee", // Light,Dark modes

  // Spacing
  "Spacing/1": "4",
  "Spacing/2": "8",
  "Spacing/4": "16",
  "Spacing/8": "32",
  "Radius/Small": "4",
  "Radius/Medium": "8",
  "Radius/Large": "16",

  // Typography
  "Typography/Font Family": "Inter",
  "Display/xl/Bold": "Font(family: \"Inter\", style: Bold, size: 20, weight: 700, lineHeight: 28, letterSpacing: 0)",
  "Text/md/Regular": "Font(family: \"Inter\", style: Regular, size: 16, weight: 400, lineHeight: 24, letterSpacing: 0)",

  // Effects
  "shadow-sm": "Effect(type: DROP_SHADOW, color: #00000020, offset: (0, 1), radius: 2, spread: 0)",
};

/** @deprecated Use mockMCPVariableDefs instead */
export const mockSimplifiedMCPVariables = mockMCPVariableDefs;
