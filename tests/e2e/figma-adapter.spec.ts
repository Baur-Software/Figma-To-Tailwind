/**
 * E2E Tests: Figma Adapter
 *
 * Tests the Figma input adapter with realistic mock data.
 */

import { test, expect } from '@playwright/test';
import { createFigmaAdapter } from '../../dist/adapters/figma/index.js';
import {
  mockFigmaVariablesResponse,
  mockFigmaMCPResponse,
  mockMCPVariableDefs,
} from './fixtures/figma-variables.js';

test.describe('Figma Adapter', () => {
  test.describe('Validation', () => {
    test('validates REST API response correctly', async () => {
      const adapter = createFigmaAdapter();

      const result = await adapter.validate({
        variablesResponse: mockFigmaVariablesResponse,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('validates MCP response correctly', async () => {
      const adapter = createFigmaAdapter();

      const result = await adapter.validate({
        mcpData: mockFigmaMCPResponse,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('rejects empty input', async () => {
      const adapter = createFigmaAdapter();

      const result = await adapter.validate({});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Either mcpData, variablesResponse, or variableDefs must be provided');
    });

    test('rejects MCP data without name', async () => {
      const adapter = createFigmaAdapter();

      const result = await adapter.validate({
        mcpData: {
          ...mockFigmaMCPResponse,
          name: '',
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('MCP data missing file name');
    });

    test('validates MCP variable defs correctly', async () => {
      const adapter = createFigmaAdapter();

      const result = await adapter.validate({
        variableDefs: mockMCPVariableDefs,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('rejects empty variable defs', async () => {
      const adapter = createFigmaAdapter();

      const result = await adapter.validate({
        variableDefs: {},
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Variable defs object is empty');
    });
  });

  test.describe('Parsing REST API Response', () => {
    test('parses variables into theme file', async () => {
      const adapter = createFigmaAdapter();

      const theme = await adapter.parse({
        variablesResponse: mockFigmaVariablesResponse,
        fileKey: 'test-file-key',
      });

      expect(theme.name).toBe('Untitled');
      expect(theme.meta?.source).toBe('figma-api');
      expect(theme.meta?.figmaFileKey).toBe('test-file-key');
      expect(theme.collections.length).toBeGreaterThan(0);
    });

    test('parses color collection with light and dark modes', async () => {
      const adapter = createFigmaAdapter();

      const theme = await adapter.parse({
        variablesResponse: mockFigmaVariablesResponse,
      });

      const colorCollection = theme.collections.find(c => c.name === 'Colors');
      expect(colorCollection).toBeDefined();
      expect(colorCollection?.modes).toContain('Light');
      expect(colorCollection?.modes).toContain('Dark');
      expect(colorCollection?.defaultMode).toBe('Light');
    });

    test('parses color tokens correctly', async () => {
      const adapter = createFigmaAdapter();

      const theme = await adapter.parse({
        variablesResponse: mockFigmaVariablesResponse,
      });

      const colorCollection = theme.collections.find(c => c.name === 'Colors');
      const lightTokens = colorCollection?.tokens['Light'];

      // Check nested structure: Colors/Primary/500 -> colors.primary.500
      const primaryColor = (lightTokens?.['colors'] as Record<string, unknown>)?.['primary'] as Record<string, unknown>;
      const color500 = primaryColor?.['500'] as { $type: string; $value: { r: number; g: number; b: number; a: number } };

      expect(color500?.$type).toBe('color');
      expect(color500?.$value.r).toBeCloseTo(0.2196, 2);
      expect(color500?.$value.g).toBeCloseTo(0.5020, 2);
      expect(color500?.$value.b).toBeCloseTo(0.9647, 2);
    });

    test('parses spacing tokens as dimensions', async () => {
      const adapter = createFigmaAdapter();

      const theme = await adapter.parse({
        variablesResponse: mockFigmaVariablesResponse,
      });

      const spacingCollection = theme.collections.find(c => c.name === 'Spacing');
      const defaultTokens = spacingCollection?.tokens['Default'];

      const spacing = (defaultTokens?.['spacing'] as Record<string, unknown>);
      const spacing4 = spacing?.['4'] as { $type: string; $value: { value: number; unit: string } };

      expect(spacing4?.$type).toBe('dimension');
      expect(spacing4?.$value.value).toBe(16);
      expect(spacing4?.$value.unit).toBe('px');
    });

    test('parses typography tokens correctly', async () => {
      const adapter = createFigmaAdapter();

      const theme = await adapter.parse({
        variablesResponse: mockFigmaVariablesResponse,
      });

      const typographyCollection = theme.collections.find(c => c.name === 'Typography');
      const defaultTokens = typographyCollection?.tokens['Default'];

      // Font family
      const typography = (defaultTokens?.['typography'] as Record<string, unknown>);
      const fontFamily = typography?.['font-family'] as { $type: string; $value: string[] };
      expect(fontFamily?.$type).toBe('fontFamily');
      expect(fontFamily?.$value).toContain('Inter');

      // Font weight
      const weight = (typography?.['weight'] as Record<string, unknown>);
      const boldWeight = weight?.['bold'] as { $type: string; $value: number };
      expect(boldWeight?.$type).toBe('fontWeight');
      expect(boldWeight?.$value).toBe(700);
    });

    test('parses variable aliases as references', async () => {
      const adapter = createFigmaAdapter();

      const theme = await adapter.parse({
        variablesResponse: mockFigmaVariablesResponse,
      });

      const componentsCollection = theme.collections.find(c => c.name === 'Components');
      const lightTokens = componentsCollection?.tokens['Light'];

      const components = (lightTokens?.['components'] as Record<string, unknown>);
      const button = (components?.['button'] as Record<string, unknown>);
      const background = button?.['background'] as { $type: string; $value: { $ref: string } };

      expect(background?.$type).toBe('color');
      expect(background?.$value.$ref).toContain('colors.primary.500');
    });

    test('includes Figma extensions in tokens', async () => {
      const adapter = createFigmaAdapter();

      const theme = await adapter.parse({
        variablesResponse: mockFigmaVariablesResponse,
      });

      const colorCollection = theme.collections.find(c => c.name === 'Colors');
      const lightTokens = colorCollection?.tokens['Light'];

      const colors = (lightTokens?.['colors'] as Record<string, unknown>);
      const primary = (colors?.['primary'] as Record<string, unknown>);
      const color500 = primary?.['500'] as { $extensions?: { 'com.figma'?: { variableId?: string; scopes?: string[] } } };

      expect(color500?.$extensions?.['com.figma']?.variableId).toBe('var-color-primary');
      expect(color500?.$extensions?.['com.figma']?.scopes).toContain('ALL_FILLS');
    });
  });

  test.describe('Parsing MCP Response', () => {
    test('parses MCP response with correct metadata', async () => {
      const adapter = createFigmaAdapter();

      const theme = await adapter.parse({
        mcpData: mockFigmaMCPResponse,
      });

      expect(theme.name).toBe('Design System');
      expect(theme.meta?.source).toBe('figma-mcp');
      expect(theme.meta?.lastSynced).toBe('2025-01-15T10:30:00Z');
    });

    test('produces same token structure from MCP as REST API', async () => {
      const adapter = createFigmaAdapter();

      const restTheme = await adapter.parse({
        variablesResponse: mockFigmaVariablesResponse,
      });

      const mcpTheme = await adapter.parse({
        mcpData: mockFigmaMCPResponse,
      });

      // Both should have same collections
      expect(mcpTheme.collections.length).toBe(restTheme.collections.length);

      // Color collection should have same structure
      const restColors = restTheme.collections.find(c => c.name === 'Colors');
      const mcpColors = mcpTheme.collections.find(c => c.name === 'Colors');

      expect(mcpColors?.modes).toEqual(restColors?.modes);
      expect(mcpColors?.defaultMode).toEqual(restColors?.defaultMode);
    });
  });

  test.describe('Parsing MCP Variable Defs', () => {
    test('parses variable defs with correct metadata', async () => {
      const adapter = createFigmaAdapter();

      const theme = await adapter.parse({
        variableDefs: mockMCPVariableDefs,
        fileName: 'Test Design System',
      });

      expect(theme.name).toBe('Test Design System');
      expect(theme.meta?.source).toBe('figma-mcp-defs');
    });

    test('parses color tokens from hex values', async () => {
      const adapter = createFigmaAdapter();

      const theme = await adapter.parse({
        variableDefs: mockMCPVariableDefs,
      });

      const colorCollection = theme.collections.find(c => c.name === 'Color');
      expect(colorCollection).toBeDefined();

      const defaultTokens = colorCollection?.tokens['Default'];
      // Structure: Color/Primary/500 -> collection: "Color", path: ["primary"], tokenName: "500"
      // So tokens['Default']['primary']['500']
      const primary = (defaultTokens?.['primary'] as Record<string, unknown>);
      const color500 = primary?.['500'] as { $type: string; $value: { r: number; g: number; b: number; a: number } };

      expect(color500?.$type).toBe('color');
      // #3880f6 = rgb(56, 128, 246) = r: 0.2196, g: 0.502, b: 0.9647
      expect(color500?.$value.r).toBeCloseTo(0.2196, 2);
      expect(color500?.$value.g).toBeCloseTo(0.502, 2);
      expect(color500?.$value.b).toBeCloseTo(0.9647, 2);
    });

    test('parses spacing tokens as dimensions', async () => {
      const adapter = createFigmaAdapter();

      const theme = await adapter.parse({
        variableDefs: mockMCPVariableDefs,
      });

      const spacingCollection = theme.collections.find(c => c.name === 'Spacing');
      expect(spacingCollection).toBeDefined();

      const defaultTokens = spacingCollection?.tokens['Default'];
      // Structure: Spacing/4 -> collection: "Spacing", path: [], tokenName: "4"
      // So tokens['Default']['4']
      const spacing4 = defaultTokens?.['4'] as { $type: string; $value: { value: number; unit: string } };

      expect(spacing4?.$type).toBe('dimension');
      expect(spacing4?.$value.value).toBe(16);
      expect(spacing4?.$value.unit).toBe('px');
    });

    test('parses Font() strings into typography tokens', async () => {
      const adapter = createFigmaAdapter();

      const theme = await adapter.parse({
        variableDefs: mockMCPVariableDefs,
      });

      const displayCollection = theme.collections.find(c => c.name === 'Display');
      expect(displayCollection).toBeDefined();

      const defaultTokens = displayCollection?.tokens['Default'];
      // Structure: Display/xl/Bold -> collection: "Display", path: ["xl"], tokenName: "bold"
      // So tokens['Default']['xl']['bold']
      const xl = (defaultTokens?.['xl'] as Record<string, unknown>);
      const bold = xl?.['bold'] as { $type: string; $value: unknown };

      expect(bold?.$type).toBe('typography');
    });

    test('parses Effect() strings into shadow tokens', async () => {
      const adapter = createFigmaAdapter();

      const theme = await adapter.parse({
        variableDefs: mockMCPVariableDefs,
      });

      // shadow-sm -> collection: "shadow", path: [], tokenName: "shadow-sm"
      // The collection is named from the first segment, which in this case is "shadow-sm"
      // So the collection name will be "shadow-sm" with no path
      const shadowCollection = theme.collections.find(c => c.name === 'shadow-sm');
      expect(shadowCollection).toBeDefined();

      const defaultTokens = shadowCollection?.tokens['Default'];
      // Since "shadow-sm" is both the collection (first segment) and token name (last segment)
      // when there's only one segment, the token is at the root level
      const shadowSm = defaultTokens?.['shadow-sm'] as { $type: string; $value: unknown };

      expect(shadowSm?.$type).toBe('shadow');
    });

    test('uses default fileName when not provided', async () => {
      const adapter = createFigmaAdapter();

      const theme = await adapter.parse({
        variableDefs: mockMCPVariableDefs,
      });

      expect(theme.name).toBe('Untitled');
    });
  });
});
