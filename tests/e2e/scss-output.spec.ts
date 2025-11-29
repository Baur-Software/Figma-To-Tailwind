/**
 * E2E Tests: SCSS Output Adapter
 *
 * Tests the SCSS output adapter with realistic mock data.
 */

import { test, expect } from '@playwright/test';
import { createFigmaAdapter } from '../../dist/adapters/input/figma/index.js';
import { createScssAdapter } from '../../dist/adapters/output/scss/index.js';
import { figmaToScss } from '../../dist/index.js';
import {
  mockFigmaVariablesResponse,
  mockMCPVariableDefs,
} from './fixtures/figma-variables.js';

test.describe('SCSS Output Adapter', () => {
  test.describe('Variable Generation', () => {
    test('generates SCSS variables from Figma data', async () => {
      const figmaAdapter = createFigmaAdapter();
      const theme = await figmaAdapter.parse({
        variablesResponse: mockFigmaVariablesResponse,
      });

      const scssAdapter = createScssAdapter();
      const output = await scssAdapter.transform(theme);

      expect(output.variables).toContain('$');
      expect(output.variables).toContain(':');
    });

    test('generates color variables in hex format by default', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      // Check for hex color format
      expect(output.variables).toMatch(/\$[\w-]+:\s*#[a-fA-F0-9]+/);
    });

    test('generates color variables in rgb format when specified', async () => {
      const output = await figmaToScss(
        { variableDefs: mockMCPVariableDefs },
        { colorFormat: 'rgb' }
      );

      expect(output.variables).toMatch(/rgb\(/);
    });

    test('generates color variables in hsl format when specified', async () => {
      const output = await figmaToScss(
        { variableDefs: mockMCPVariableDefs },
        { colorFormat: 'hsl' }
      );

      expect(output.variables).toMatch(/hsl\(/);
    });

    test('includes !default flag by default', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.variables).toContain('!default');
    });

    test('omits !default flag when disabled', async () => {
      const output = await figmaToScss(
        { variableDefs: mockMCPVariableDefs },
        { useDefault: false }
      );

      expect(output.variables).not.toContain('!default');
    });

    test('applies variable prefix when specified', async () => {
      const output = await figmaToScss(
        { variableDefs: mockMCPVariableDefs },
        { prefix: 'ds' }
      );

      expect(output.variables).toContain('$ds-');
    });
  });

  test.describe('Map Generation', () => {
    test('generates $colors map', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.maps).toContain('$colors:');
      expect(output.maps).toContain('(');
      expect(output.maps).toContain(')');
    });

    test('generates $fonts map when font tokens exist', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.maps).toContain('$fonts:');
    });

    test('can disable map generation', async () => {
      const output = await figmaToScss(
        { variableDefs: mockMCPVariableDefs },
        { generateMaps: false }
      );

      expect(output.maps).toBe('');
    });
  });

  test.describe('Mixin Generation', () => {
    test('generates color() function', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.mixins).toContain('@function color($name)');
      expect(output.mixins).toContain('map-get($colors, $name)');
    });

    test('generates spacing() function', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.mixins).toContain('@function spacing($name)');
    });

    test('generates typography mixin', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.mixins).toContain('@mixin typography($style)');
    });

    test('generates respond-to mixin', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.mixins).toContain('@mixin respond-to($breakpoint)');
      expect(output.mixins).toContain('@media (min-width:');
    });

    test('can disable mixin generation', async () => {
      const output = await figmaToScss(
        { variableDefs: mockMCPVariableDefs },
        { generateMixins: false }
      );

      expect(output.mixins).toBe('');
    });
  });

  test.describe('File Generation', () => {
    test('generates _variables.scss file', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.files['_variables.scss']).toBeDefined();
      expect(output.files['_variables.scss']).toContain('$');
    });

    test('generates _maps.scss file', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.files['_maps.scss']).toBeDefined();
      expect(output.files['_maps.scss']).toContain('$colors:');
    });

    test('generates _mixins.scss file', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.files['_mixins.scss']).toBeDefined();
      expect(output.files['_mixins.scss']).toContain('@function');
    });

    test('generates _index.scss with @forward statements', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.files['_index.scss']).toBeDefined();
      expect(output.files['_index.scss']).toContain('@forward "variables"');
      expect(output.files['_index.scss']).toContain('@forward "maps"');
      expect(output.files['_index.scss']).toContain('@forward "mixins"');
    });
  });

  test.describe('Combined Output', () => {
    test('generates combined scss output', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      // Should contain all sections
      expect(output.scss).toContain('$'); // Variables
      expect(output.scss).toContain('$colors:'); // Maps
      expect(output.scss).toContain('@function'); // Mixins
    });

    test('includes comments by default', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.scss).toContain('// ');
      expect(output.scss).toContain('Design Token Variables');
    });

    test('can disable comments', async () => {
      const output = await figmaToScss(
        { variableDefs: mockMCPVariableDefs },
        { format: { comments: false } }
      );

      expect(output.scss).not.toContain('Design Token Variables');
    });
  });

  test.describe('Token Type Handling', () => {
    test('formats dimension tokens with units', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      // Spacing tokens should have px unit
      expect(output.variables).toMatch(/:\s*\d+px/);
    });

    test('formats typography tokens as maps', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      // Typography should contain font properties
      expect(output.variables).toContain('font-family:');
    });

    test('formats shadow tokens correctly', async () => {
      const output = await figmaToScss({
        variableDefs: mockMCPVariableDefs,
      });

      // Shadow tokens should be formatted
      expect(output.variables).toMatch(/\d+px\s+\d+px/);
    });
  });

  test.describe('REST API Integration', () => {
    test('works with full Figma REST API response', async () => {
      const output = await figmaToScss({
        variablesResponse: mockFigmaVariablesResponse,
      });

      expect(output.variables).toBeTruthy();
      expect(output.maps).toBeTruthy();
      expect(output.mixins).toBeTruthy();
      expect(output.scss).toBeTruthy();
    });
  });
});
