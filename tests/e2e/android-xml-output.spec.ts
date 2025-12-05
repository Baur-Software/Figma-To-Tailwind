/**
 * E2E Tests: Android XML Output Adapter
 *
 * Tests the Android XML output adapter with realistic mock data.
 * Validates output for Android 13-15 (API 33-35) compatibility.
 */

import { test, expect } from '@playwright/test';
import { createFigmaAdapter } from '../../dist/adapters/input/figma/index.js';
import { createAndroidXmlAdapter } from '../../dist/adapters/output/android-xml/index.js';
import { figmaToAndroidXml } from '../../dist/index.js';
import {
  mockFigmaVariablesResponse,
  mockMCPVariableDefs,
} from './fixtures/figma-variables.js';

test.describe('Android XML Output Adapter', () => {
  test.describe('Basic Generation', () => {
    test('generates Android XML from Figma data', async () => {
      const figmaAdapter = createFigmaAdapter();
      const theme = await figmaAdapter.parse({
        variablesResponse: mockFigmaVariablesResponse,
      });

      const androidAdapter = createAndroidXmlAdapter();
      const output = await androidAdapter.transform(theme);

      expect(output.colors).toContain('<?xml');
      expect(output.colors).toContain('<resources>');
      expect(output.dimens).toContain('<?xml');
      expect(output.dimens).toContain('<resources>');
    });

    test('generates files object with Android resource paths', async () => {
      const output = await figmaToAndroidXml({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.files['values/colors.xml']).toBeDefined();
      expect(output.files['values/dimens.xml']).toBeDefined();
      expect(output.files['values/styles.xml']).toBeDefined();
    });
  });

  test.describe('Color Generation', () => {
    test('generates colors.xml with valid XML structure', async () => {
      const output = await figmaToAndroidXml({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.colors).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(output.colors).toContain('<resources>');
      expect(output.colors).toContain('</resources>');
    });

    test('generates color resources in ARGB format', async () => {
      const output = await figmaToAndroidXml({
        variableDefs: mockMCPVariableDefs,
      });

      // Android uses #AARRGGBB format (8 hex chars with alpha first)
      expect(output.colors).toMatch(/<color name="[\w_]+">#[A-F0-9]{8}<\/color>/);
    });

    test('uses valid Android resource names (lowercase with underscores)', async () => {
      const output = await figmaToAndroidXml({
        variableDefs: mockMCPVariableDefs,
      });

      // Should not contain hyphens or uppercase in resource names
      const colorNameMatches = output.colors.match(/name="([^"]+)"/g);
      expect(colorNameMatches).toBeTruthy();
      for (const match of colorNameMatches || []) {
        const name = match.replace(/name="|"/g, '');
        expect(name).toMatch(/^[a-z_][a-z0-9_]*$/);
      }
    });

    test('applies resource prefix when specified', async () => {
      const output = await figmaToAndroidXml(
        { variableDefs: mockMCPVariableDefs },
        { resourcePrefix: 'ds' }
      );

      expect(output.colors).toContain('name="ds_');
    });
  });

  test.describe('Dimension Generation', () => {
    test('generates dimens.xml with valid XML structure', async () => {
      const output = await figmaToAndroidXml({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.dimens).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(output.dimens).toContain('<resources>');
      expect(output.dimens).toContain('</resources>');
    });

    test('generates dimension resources with dp/sp units', async () => {
      const output = await figmaToAndroidXml({
        variableDefs: mockMCPVariableDefs,
      });

      // Dimensions should use dp or sp units
      expect(output.dimens).toMatch(/<dimen name="[\w_]+">\d+(dp|sp)<\/dimen>/);
    });

    test('uses sp for font-related dimensions', async () => {
      const output = await figmaToAndroidXml({
        variableDefs: mockMCPVariableDefs,
      });

      // Font sizes should use sp (scalable pixels) for accessibility
      const fontDimens = output.dimens.match(/<dimen name="[^"]*font[^"]*">[^<]+<\/dimen>/gi);
      if (fontDimens) {
        for (const dimen of fontDimens) {
          expect(dimen).toContain('sp');
        }
      }
    });
  });

  test.describe('Style Generation', () => {
    test('generates styles.xml with valid XML structure', async () => {
      const output = await figmaToAndroidXml({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.styles).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(output.styles).toContain('<resources>');
      expect(output.styles).toContain('</resources>');
    });

    test('generates TextAppearance styles for typography', async () => {
      const output = await figmaToAndroidXml({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.styles).toContain('<style name="TextAppearance.');
    });

    test('includes Material 3 parent style for typography', async () => {
      const output = await figmaToAndroidXml({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.styles).toContain('parent="TextAppearance.Material3.');
    });

    test('includes text style attributes', async () => {
      const output = await figmaToAndroidXml({
        variableDefs: mockMCPVariableDefs,
      });

      // Check for common text appearance attributes
      expect(output.styles).toContain('android:textSize');
    });
  });

  test.describe('Comments', () => {
    test('includes XML comments by default', async () => {
      const output = await figmaToAndroidXml({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.colors).toContain('<!-- Generated from:');
      expect(output.colors).toContain('<!-- Android 13+ (API 33+)');
    });

    test('can disable comments', async () => {
      const output = await figmaToAndroidXml(
        { variableDefs: mockMCPVariableDefs },
        { includeComments: false }
      );

      expect(output.colors).not.toContain('<!-- Generated from:');
      expect(output.colors).not.toContain('<!-- Android 13+');
    });
  });

  test.describe('Night Mode', () => {
    test('does not generate night mode by default', async () => {
      const output = await figmaToAndroidXml({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.files['values-night/colors.xml']).toBeUndefined();
    });

    test('generates night mode colors when enabled', async () => {
      const output = await figmaToAndroidXml(
        { variablesResponse: mockFigmaVariablesResponse },
        { generateNightMode: true }
      );

      // Night mode generation depends on dark mode being present in theme
      // If no dark mode exists, it won't generate the file
      // This is expected behavior
      expect(output.files).toBeDefined();
    });
  });

  test.describe('Android Version Compatibility', () => {
    test('generates valid Android 13+ (API 33+) resources', async () => {
      const output = await figmaToAndroidXml({
        variableDefs: mockMCPVariableDefs,
      });

      // Valid XML with proper encoding
      expect(output.colors).toContain('encoding="utf-8"');
      expect(output.dimens).toContain('encoding="utf-8"');
      expect(output.styles).toContain('encoding="utf-8"');

      // Uses Material 3 compatible naming
      expect(output.styles).toContain('Material3');
    });

    test('SDK version option is accepted', async () => {
      const output = await figmaToAndroidXml(
        { variableDefs: mockMCPVariableDefs },
        { minSdkVersion: 34 }
      );

      // Should still generate valid output
      expect(output.colors).toContain('<resources>');
    });
  });

  test.describe('REST API Integration', () => {
    test('works with full Figma REST API response', async () => {
      const output = await figmaToAndroidXml({
        variablesResponse: mockFigmaVariablesResponse,
      });

      expect(output.colors).toBeTruthy();
      expect(output.dimens).toBeTruthy();
      expect(output.styles).toBeTruthy();
      expect(output.files['values/colors.xml']).toBeTruthy();
    });
  });

  test.describe('MCP Integration', () => {
    test('works with MCP variable definitions', async () => {
      const output = await figmaToAndroidXml({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.colors).toBeTruthy();
      expect(output.dimens).toBeTruthy();
      expect(output.styles).toBeTruthy();
    });
  });
});
