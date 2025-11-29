/**
 * CLI Push Command E2E Tests
 *
 * Tests the push command functionality including parsing CSS/SCSS
 * and transforming to Figma Variables format.
 */

import { test, expect } from '@playwright/test';
import {
  createCSSAdapter,
  createSCSSAdapter,
  createFigmaOutputAdapter,
  parseTheme,
  type ThemeFile,
} from '../../dist/index.js';
import { mockFigmaVariablesResponse } from './fixtures/figma-variables.js';

// =============================================================================
// Test CSS/SCSS Fixtures
// =============================================================================

const testCSS = `
:root {
  --color-primary: #3880f6;
  --color-secondary: #3cd6af;
  --spacing-4: 16px;
  --spacing-8: 32px;
}

.dark {
  --color-primary: #4c8df7;
}
`;

const testSCSS = `
$color-primary: #3880f6;
$color-secondary: #3cd6af;
$spacing-4: 16px;
$spacing-8: 32px;
`;

const testTailwindCSS = `
@theme {
  --color-primary-500: oklch(59.15% 0.1895 262.47);
  --color-secondary-500: oklch(78.23% 0.1342 168.91);
  --spacing-1: 4px;
  --spacing-2: 8px;
  --radius-sm: 4px;
}
`;

// =============================================================================
// CSS to Figma Transformation Tests
// =============================================================================

test.describe('CLI Push: CSS to Figma', () => {
  test.describe('CSS Parsing', () => {
    test('parses CSS into theme format', async () => {
      const adapter = createCSSAdapter();
      const theme = await adapter.parse({ css: testCSS });

      expect(theme.name).toBe('CSS Theme');
      expect(theme.collections).toHaveLength(1);
      expect(theme.collections[0].modes).toContain('default');
    });

    test('parses dark mode from CSS', async () => {
      const adapter = createCSSAdapter();
      const theme = await adapter.parse({ css: testCSS });

      expect(theme.collections[0].modes).toContain('dark');
    });

    test('parses @theme blocks', async () => {
      const adapter = createCSSAdapter();
      const theme = await adapter.parse({ css: testTailwindCSS });

      const tokens = theme.collections[0].tokens['default'];
      expect(tokens.color).toBeDefined();
      expect(tokens.spacing).toBeDefined();
    });
  });

  test.describe('Figma Output Transformation', () => {
    test('transforms CSS theme to Figma format', async () => {
      const cssAdapter = createCSSAdapter();
      const theme = await cssAdapter.parse({ css: testCSS });

      const figmaAdapter = createFigmaOutputAdapter();
      const result = await figmaAdapter.transform(theme, {
        targetFileKey: 'test-target-123',
      });

      expect(result.requestBody).toBeDefined();
      expect(result.requestBody.variableCollections).toBeDefined();
      expect(result.requestBody.variables).toBeDefined();
    });

    test('result includes transformation report', async () => {
      const cssAdapter = createCSSAdapter();
      const theme = await cssAdapter.parse({ css: testCSS });

      const figmaAdapter = createFigmaOutputAdapter();
      const result = await figmaAdapter.transform(theme, {
        targetFileKey: 'test-target-123',
      });

      expect(result.report).toBeDefined();
      expect(result.report.stats).toBeDefined();
      expect(typeof result.report.stats.collectionsCreated).toBe('number');
      expect(typeof result.report.stats.variablesCreated).toBe('number');
    });

    test('report tracks created variables count', async () => {
      const cssAdapter = createCSSAdapter();
      const theme = await cssAdapter.parse({ css: testCSS });

      const figmaAdapter = createFigmaOutputAdapter();
      const result = await figmaAdapter.transform(theme, {
        targetFileKey: 'test-target-123',
      });

      // CSS has 4 root variables + 1 dark mode override
      expect(result.report.stats.variablesCreated).toBeGreaterThan(0);
    });

    test('includes manual instructions', async () => {
      const cssAdapter = createCSSAdapter();
      const theme = await cssAdapter.parse({ css: testCSS });

      const figmaAdapter = createFigmaOutputAdapter();
      const result = await figmaAdapter.transform(theme, {
        targetFileKey: 'test-target-123',
      });

      const instructions = result.getManualInstructions();
      expect(instructions).toContain('Plugin API');
    });

    test('does not include execute without write client', async () => {
      const cssAdapter = createCSSAdapter();
      const theme = await cssAdapter.parse({ css: testCSS });

      const figmaAdapter = createFigmaOutputAdapter();
      const result = await figmaAdapter.transform(theme, {
        targetFileKey: 'test-target-123',
      });

      expect(result.execute).toBeUndefined();
    });
  });
});

// =============================================================================
// SCSS to Figma Transformation Tests
// =============================================================================

test.describe('CLI Push: SCSS to Figma', () => {
  test.describe('SCSS Parsing', () => {
    test('parses SCSS into theme format', async () => {
      const adapter = createSCSSAdapter();
      const theme = await adapter.parse({ scss: testSCSS });

      expect(theme.name).toBe('SCSS Theme');
      expect(theme.collections).toHaveLength(1);
    });

    test('extracts color tokens', async () => {
      const adapter = createSCSSAdapter();
      const theme = await adapter.parse({ scss: testSCSS });

      const tokens = theme.collections[0].tokens['default'];
      expect(tokens.color).toBeDefined();
    });

    test('extracts spacing tokens', async () => {
      const adapter = createSCSSAdapter();
      const theme = await adapter.parse({ scss: testSCSS });

      const tokens = theme.collections[0].tokens['default'];
      expect(tokens.spacing).toBeDefined();
    });
  });

  test.describe('Figma Output Transformation', () => {
    test('transforms SCSS theme to Figma format', async () => {
      const scssAdapter = createSCSSAdapter();
      const theme = await scssAdapter.parse({ scss: testSCSS });

      const figmaAdapter = createFigmaOutputAdapter();
      const result = await figmaAdapter.transform(theme, {
        targetFileKey: 'test-target-123',
      });

      expect(result.requestBody).toBeDefined();
      expect(result.requestBody.variableCollections).toBeDefined();
    });

    test('generates valid Figma variable structure', async () => {
      const scssAdapter = createSCSSAdapter();
      const theme = await scssAdapter.parse({ scss: testSCSS });

      const figmaAdapter = createFigmaOutputAdapter();
      const result = await figmaAdapter.transform(theme, {
        targetFileKey: 'test-target-123',
      });

      // Check variable structure
      const variables = result.requestBody.variables;
      expect(Array.isArray(variables)).toBe(true);

      if (variables && variables.length > 0) {
        const firstVar = variables[0];
        expect(firstVar).toHaveProperty('name');
        expect(firstVar).toHaveProperty('resolvedType');
      }
    });
  });
});

// =============================================================================
// Figma to Figma Transformation Tests
// =============================================================================

test.describe('CLI Push: Figma to Figma', () => {
  test('parses source Figma file', async () => {
    const theme = await parseTheme({
      variablesResponse: mockFigmaVariablesResponse,
    });

    expect(theme.collections.length).toBeGreaterThan(0);
  });

  test('transforms to target Figma format', async () => {
    const theme = await parseTheme({
      variablesResponse: mockFigmaVariablesResponse,
    });

    const figmaAdapter = createFigmaOutputAdapter();
    const result = await figmaAdapter.transform(theme, {
      targetFileKey: 'new-target-file',
    });

    expect(result.requestBody).toBeDefined();
    expect(result.requestBody.variableCollections).toBeDefined();
    expect(result.requestBody.variables).toBeDefined();
  });

  test('generates collections matching source', async () => {
    const theme = await parseTheme({
      variablesResponse: mockFigmaVariablesResponse,
    });

    const figmaAdapter = createFigmaOutputAdapter();
    const result = await figmaAdapter.transform(theme, {
      targetFileKey: 'new-target-file',
    });

    // Should create collection entries
    const collections = result.requestBody.variableCollections;
    expect(Array.isArray(collections)).toBe(true);
    expect(collections!.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Request Body Format Tests
// =============================================================================

test.describe('CLI Push: Request Body Format', () => {
  test('collections have required fields', async () => {
    const cssAdapter = createCSSAdapter();
    const theme = await cssAdapter.parse({ css: testCSS });

    const figmaAdapter = createFigmaOutputAdapter();
    const result = await figmaAdapter.transform(theme, {
      targetFileKey: 'test-target',
    });

    const collections = result.requestBody.variableCollections;
    if (collections && collections.length > 0) {
      const collection = collections[0];
      expect(collection).toHaveProperty('id');
      expect(collection).toHaveProperty('name');
      expect(collection.action).toBe('CREATE');
    }
  });

  test('variables have required fields', async () => {
    const cssAdapter = createCSSAdapter();
    const theme = await cssAdapter.parse({ css: testCSS });

    const figmaAdapter = createFigmaOutputAdapter();
    const result = await figmaAdapter.transform(theme, {
      targetFileKey: 'test-target',
    });

    const variables = result.requestBody.variables;
    if (variables && variables.length > 0) {
      const variable = variables[0];
      expect(variable).toHaveProperty('id');
      expect(variable).toHaveProperty('name');
      expect(variable).toHaveProperty('resolvedType');
      expect(variable.action).toBe('CREATE');
    }
  });

  test('color variables have COLOR resolvedType', async () => {
    const cssAdapter = createCSSAdapter();
    const theme = await cssAdapter.parse({ css: testCSS });

    const figmaAdapter = createFigmaOutputAdapter();
    const result = await figmaAdapter.transform(theme, {
      targetFileKey: 'test-target',
    });

    const variables = result.requestBody.variables || [];
    const colorVars = variables.filter(v => v.resolvedType === 'COLOR');
    expect(colorVars.length).toBeGreaterThan(0);
  });

  test('dimension variables have FLOAT resolvedType', async () => {
    const cssAdapter = createCSSAdapter();
    const theme = await cssAdapter.parse({ css: testCSS });

    const figmaAdapter = createFigmaOutputAdapter();
    const result = await figmaAdapter.transform(theme, {
      targetFileKey: 'test-target',
    });

    const variables = result.requestBody.variables || [];
    const floatVars = variables.filter(v => v.resolvedType === 'FLOAT');
    expect(floatVars.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Collection Name Configuration Tests
// =============================================================================

test.describe('CLI Push: Collection Name Configuration', () => {
  test('uses custom collection name from input adapter', async () => {
    const cssAdapter = createCSSAdapter();
    const theme = await cssAdapter.parse({
      css: testCSS,
      options: { collectionName: 'Custom Tokens' },
    });

    const figmaAdapter = createFigmaOutputAdapter();
    const result = await figmaAdapter.transform(theme, {
      targetFileKey: 'test-target',
    });

    const collections = result.requestBody.variableCollections || [];
    const customCollection = collections.find(c => c.name === 'Custom Tokens');
    expect(customCollection).toBeDefined();
  });
});

// =============================================================================
// Dry Run / JSON Output Tests
// =============================================================================

test.describe('CLI Push: Output Modes', () => {
  test('JSON output contains serializable data', async () => {
    const cssAdapter = createCSSAdapter();
    const theme = await cssAdapter.parse({ css: testCSS });

    const figmaAdapter = createFigmaOutputAdapter();
    const result = await figmaAdapter.transform(theme, {
      targetFileKey: 'test-target',
    });

    // Should be JSON serializable
    const json = JSON.stringify(result.requestBody);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty('variableCollections');
    expect(parsed).toHaveProperty('variables');
  });

  test('report toString provides human-readable summary', async () => {
    const cssAdapter = createCSSAdapter();
    const theme = await cssAdapter.parse({ css: testCSS });

    const figmaAdapter = createFigmaOutputAdapter();
    const result = await figmaAdapter.transform(theme, {
      targetFileKey: 'test-target',
    });

    const reportString = result.report.toString();
    expect(typeof reportString).toBe('string');
    expect(reportString.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// End-to-End Transformation Tests
// =============================================================================

test.describe('CLI Push: Full Pipeline', () => {
  test('CSS -> Parse -> Transform -> Request Body', async () => {
    // Step 1: Parse CSS
    const cssAdapter = createCSSAdapter();
    const theme = await cssAdapter.parse({ css: testCSS });
    expect(theme.collections.length).toBeGreaterThan(0);

    // Step 2: Transform to Figma
    const figmaAdapter = createFigmaOutputAdapter();
    const result = await figmaAdapter.transform(theme, {
      targetFileKey: 'integration-test',
    });

    // Step 3: Verify output
    expect(result.requestBody.variableCollections).toBeDefined();
    expect(result.requestBody.variables).toBeDefined();
    expect(result.report.stats.variablesCreated).toBeGreaterThan(0);
  });

  test('SCSS -> Parse -> Transform -> Request Body', async () => {
    // Step 1: Parse SCSS
    const scssAdapter = createSCSSAdapter();
    const theme = await scssAdapter.parse({ scss: testSCSS });
    expect(theme.collections.length).toBeGreaterThan(0);

    // Step 2: Transform to Figma
    const figmaAdapter = createFigmaOutputAdapter();
    const result = await figmaAdapter.transform(theme, {
      targetFileKey: 'integration-test',
    });

    // Step 3: Verify output
    expect(result.requestBody.variableCollections).toBeDefined();
    expect(result.requestBody.variables).toBeDefined();
  });

  test('Figma -> Parse -> Transform -> Request Body', async () => {
    // Step 1: Parse Figma response
    const theme = await parseTheme({
      variablesResponse: mockFigmaVariablesResponse,
    });
    expect(theme.collections.length).toBeGreaterThan(0);

    // Step 2: Transform to Figma format (for different target)
    const figmaAdapter = createFigmaOutputAdapter();
    const result = await figmaAdapter.transform(theme, {
      targetFileKey: 'different-target-file',
    });

    // Step 3: Verify output
    expect(result.requestBody.variableCollections).toBeDefined();
    expect(result.requestBody.variables).toBeDefined();
  });
});
