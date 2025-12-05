/**
 * E2E Tests: Swift/Kotlin Output Adapter
 *
 * Tests the Swift/Kotlin output adapter with realistic mock data.
 * Validates output for iOS SwiftUI and Android Jetpack Compose.
 */

import { test, expect } from '@playwright/test';
import { createFigmaAdapter } from '../../dist/adapters/input/figma/index.js';
import { createSwiftKotlinAdapter } from '../../dist/adapters/output/swift-kotlin/index.js';
import { figmaToSwiftKotlin } from '../../dist/index.js';
import {
  mockFigmaVariablesResponse,
  mockMCPVariableDefs,
} from './fixtures/figma-variables.js';

test.describe('Swift/Kotlin Output Adapter', () => {
  test.describe('Basic Generation', () => {
    test('generates Swift and Kotlin from Figma data', async () => {
      const figmaAdapter = createFigmaAdapter();
      const theme = await figmaAdapter.parse({
        variablesResponse: mockFigmaVariablesResponse,
      });

      const swiftKotlinAdapter = createSwiftKotlinAdapter();
      const output = await swiftKotlinAdapter.transform(theme);

      expect(output.swift).toBeTruthy();
      expect(output.kotlin).toBeTruthy();
      expect(output.swift).toContain('import SwiftUI');
      expect(output.kotlin).toContain('object DesignTokens');
    });

    test('generates files object with correct paths', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.files['DesignTokens.swift']).toBeDefined();
      expect(output.files['DesignTokens.kt']).toBeDefined();
    });
  });

  test.describe('Swift Generation', () => {
    test('generates valid Swift file header', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.swift).toContain('import SwiftUI');
      expect(output.swift).toContain('DO NOT EDIT DIRECTLY');
      expect(output.swift).toContain('Generated from Figma');
    });

    test('generates Swift colors as Color initializers', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      // SwiftUI Color format: Color(red: X.XXX, green: X.XXX, blue: X.XXX, opacity: X.XXX)
      expect(output.swift).toContain('Color(red:');
      expect(output.swift).toContain('opacity:');
    });

    test('generates Swift enum structure', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.swift).toContain('public enum DesignTokens');
      expect(output.swift).toContain('public enum Colors');
      expect(output.swift).toContain('public static let');
    });

    test('uses valid Swift identifiers (camelCase)', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      // Swift identifiers should be camelCase
      // Should not contain hyphens or start with numbers
      const staticLetMatches = output.swift.match(/static let (\w+)/g);
      expect(staticLetMatches).toBeTruthy();
      for (const match of staticLetMatches || []) {
        const name = match.replace('static let ', '');
        // Should not start with uppercase (except for types)
        // Should not contain hyphens
        expect(name).not.toContain('-');
        expect(name).not.toMatch(/^\d/);
      }
    });

    test('generates spacing constants as CGFloat', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.swift).toContain('CGFloat');
      expect(output.swift).toContain('Spacing');
    });

    test('includes description comments when enabled', async () => {
      const output = await figmaToSwiftKotlin(
        { variablesResponse: mockFigmaVariablesResponse },
        { includeComments: true }
      );

      // Should include JSDoc-style comments
      expect(output.swift).toContain('///');
    });

    test('can disable comments', async () => {
      const output = await figmaToSwiftKotlin(
        { variableDefs: mockMCPVariableDefs },
        { includeComments: false }
      );

      // Should not include description comments (but file header comments are ok)
      // Count description comments - should be minimal
      const commentLines = output.swift
        .split('\n')
        .filter((line) => line.trim().startsWith('///') && !line.includes('Design tokens'));
      // With comments disabled, there should be very few description comments
      expect(commentLines.length).toBeLessThanOrEqual(2);
    });

    test('supports custom type name', async () => {
      const output = await figmaToSwiftKotlin(
        { variableDefs: mockMCPVariableDefs },
        { swiftTypeName: 'AppColors' }
      );

      expect(output.swift).toContain('public enum AppColors');
    });
  });

  test.describe('Swift UIKit Extension', () => {
    test('does not generate UIKit extension by default', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.swiftUIKit).toBeUndefined();
      expect(output.files['DesignTokens+UIKit.swift']).toBeUndefined();
    });

    test('generates UIKit extension when enabled', async () => {
      const output = await figmaToSwiftKotlin(
        { variableDefs: mockMCPVariableDefs },
        { includeUIKit: true }
      );

      expect(output.swiftUIKit).toBeTruthy();
      expect(output.files['DesignTokens+UIKit.swift']).toBeTruthy();
      expect(output.swiftUIKit).toContain('import UIKit');
      expect(output.swiftUIKit).toContain('UIColor');
    });
  });

  test.describe('Kotlin Generation', () => {
    test('generates valid Kotlin file header', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.kotlin).toContain('package com.design.tokens');
      expect(output.kotlin).toContain('import androidx.compose.ui.graphics.Color');
      expect(output.kotlin).toContain('DO NOT EDIT DIRECTLY');
    });

    test('generates Kotlin colors as Color initializers', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      // Kotlin Compose Color format: Color(r, g, b, a)
      expect(output.kotlin).toMatch(/Color\(\d+\.\d+f/);
    });

    test('generates Kotlin object structure', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.kotlin).toContain('object DesignTokens');
      expect(output.kotlin).toContain('object Colors');
      expect(output.kotlin).toContain('val ');
    });

    test('uses valid Kotlin identifiers (camelCase)', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      // Kotlin identifiers should be camelCase
      const valMatches = output.kotlin.match(/val (\w+) =/g);
      expect(valMatches).toBeTruthy();
      for (const match of valMatches || []) {
        const name = match.replace('val ', '').replace(' =', '');
        expect(name).not.toContain('-');
        expect(name).not.toMatch(/^\d/);
      }
    });

    test('generates dimensions with dp/sp units', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.kotlin).toContain('.dp');
      expect(output.kotlin).toContain('import androidx.compose.ui.unit.dp');
    });

    test('supports custom package name', async () => {
      const output = await figmaToSwiftKotlin(
        { variableDefs: mockMCPVariableDefs },
        { kotlinPackage: 'com.myapp.design' }
      );

      expect(output.kotlin).toContain('package com.myapp.design');
    });

    test('supports custom object name', async () => {
      const output = await figmaToSwiftKotlin(
        { variableDefs: mockMCPVariableDefs },
        { kotlinObjectName: 'Theme' }
      );

      expect(output.kotlin).toContain('object Theme');
    });

    test('includes regions for code organization', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.kotlin).toContain('// region');
      expect(output.kotlin).toContain('// endregion');
    });
  });

  test.describe('Typography Generation', () => {
    test('generates Swift font configuration', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      // Should have Typography section
      expect(output.swift).toContain('Typography');
      expect(output.swift).toContain('Font.system');
      expect(output.swift).toContain('weight:');
    });

    test('generates Kotlin TextStyle configuration', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.kotlin).toContain('Typography');
      expect(output.kotlin).toContain('TextStyle');
      expect(output.kotlin).toContain('fontSize');
      expect(output.kotlin).toContain('fontWeight');
    });
  });

  test.describe('Shadow Generation', () => {
    test('generates Swift shadow style', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      // Should have Shadows section if shadow tokens exist
      // The mock data has shadow-sm
      expect(output.swift).toContain('Shadows');
      expect(output.swift).toContain('ShadowStyle');
    });

    test('generates Kotlin shadow elevation', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.kotlin).toContain('Shadows');
      expect(output.kotlin).toContain('Elevation');
    });
  });

  test.describe('REST API Integration', () => {
    test('works with full Figma REST API response', async () => {
      const output = await figmaToSwiftKotlin({
        variablesResponse: mockFigmaVariablesResponse,
      });

      expect(output.swift).toBeTruthy();
      expect(output.kotlin).toBeTruthy();
      expect(output.files['DesignTokens.swift']).toBeTruthy();
      expect(output.files['DesignTokens.kt']).toBeTruthy();
    });
  });

  test.describe('MCP Integration', () => {
    test('works with MCP variable definitions', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.swift).toBeTruthy();
      expect(output.kotlin).toBeTruthy();
    });
  });

  test.describe('Color Format Options', () => {
    test('generates component-based colors by default', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: mockMCPVariableDefs,
      });

      // Default is component-based (Color(red:, green:, blue:, opacity:))
      expect(output.swift).toContain('red:');
      expect(output.kotlin).toMatch(/Color\(\d+\.\d+f/);
    });

    test('supports hex color format for Kotlin', async () => {
      const output = await figmaToSwiftKotlin(
        { variableDefs: mockMCPVariableDefs },
        { hexColors: true }
      );

      // Hex format: Color(0xAARRGGBB)
      expect(output.kotlin).toMatch(/Color\(0x[A-F0-9]{8}\)/);
    });
  });

  test.describe('Converter Functions', () => {
    test('colorToSwift produces valid SwiftUI Color', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: { 'Test/Color': '#ff0000' },
      });

      // Red color should produce Color(red: 1.0, green: 0.0, blue: 0.0, opacity: 1.0)
      expect(output.swift).toContain('Color(red:');
    });

    test('colorToKotlin produces valid Compose Color', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: { 'Test/Color': '#00ff00' },
      });

      // Green color should have high green component
      expect(output.kotlin).toContain('Color(');
    });

    test('tokenNameToSwift produces valid identifiers', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: {
          'Color/Primary-500': '#3880f6',
          'Spacing/Extra Small': '4',
        },
      });

      // Should convert to valid Swift identifiers
      // No hyphens in variable names
      expect(output.swift).not.toMatch(/static let \w*-\w*/);
      // Variable names should be camelCase (no spaces in the name itself)
      // Check that names like "primary500" and "extraSmall" exist (camelCase)
      expect(output.swift).toMatch(/static let primary500/i);
      expect(output.swift).toMatch(/static let extraSmall/i);
    });

    test('tokenNameToKotlin produces valid identifiers', async () => {
      const output = await figmaToSwiftKotlin({
        variableDefs: {
          'Color/Primary-500': '#3880f6',
          'Spacing/Extra Small': '4',
        },
      });

      // Should convert to valid Kotlin identifiers
      // No hyphens in variable names
      expect(output.kotlin).not.toMatch(/val \w*-\w*/);
      // Variable names should be camelCase
      expect(output.kotlin).toMatch(/val primary500/i);
      expect(output.kotlin).toMatch(/val extraSmall/i);
    });
  });
});
