/**
 * E2E Tests: Tailwind/Ionic Output Adapter
 *
 * Tests the CSS output generation for Tailwind CSS v4 and Ionic themes.
 */

import { test, expect } from '@playwright/test';
import { createFigmaAdapter } from '../../dist/adapters/input/figma/index.js';
import { createTailwindIonicAdapter } from '../../dist/adapters/output/tailwind-ionic/index.js';
import { mockFigmaVariablesResponse } from './fixtures/figma-variables.js';

test.describe('Tailwind/Ionic Output Adapter', () => {
  let theme: Awaited<ReturnType<ReturnType<typeof createFigmaAdapter>['parse']>>;

  test.beforeAll(async () => {
    const figmaAdapter = createFigmaAdapter();
    theme = await figmaAdapter.parse({
      variablesResponse: mockFigmaVariablesResponse,
    });
  });

  test.describe('Tailwind CSS Output', () => {
    test('generates @theme CSS block', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme);

      expect(output.tailwind.themeCss).toContain('@theme {');
      expect(output.tailwind.themeCss).toContain('}');
    });

    test('generates color variables in @theme', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme);

      // Should contain color namespace
      expect(output.tailwind.themeCss).toContain('/* color */');

      // Should have color variables
      expect(output.tailwind.themeCss).toMatch(/--color-[\w-]+:/);
    });

    test('generates spacing variables in @theme', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme);

      // Should contain spacing namespace
      expect(output.tailwind.themeCss).toContain('/* spacing */');

      // Should have spacing variables
      expect(output.tailwind.themeCss).toMatch(/--spacing-[\w-]+:/);
    });

    test('uses oklch color format by default', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme);

      expect(output.tailwind.themeCss).toMatch(/oklch\(/);
    });

    test('can use hex color format', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme, {
        tailwind: { colorFormat: 'hex' },
      });

      expect(output.tailwind.themeCss).toMatch(/#[0-9a-f]{6}/i);
    });

    test('generates theme variables array', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme);

      expect(output.tailwind.variables.length).toBeGreaterThan(0);

      // Each variable should have name and value
      for (const variable of output.tailwind.variables) {
        expect(variable.name).toBeTruthy();
        expect(variable.value).toBeTruthy();
      }
    });

    test('generates dark mode CSS', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme, { darkMode: true });

      // Should have dark mode CSS (if dark mode exists in theme)
      if (output.tailwind.darkModeCss) {
        expect(output.tailwind.darkModeCss).toContain('@media (prefers-color-scheme: dark)');
        expect(output.tailwind.darkModeCss).toContain('.dark {');
      }
    });
  });

  test.describe('Ionic CSS Output', () => {
    test('generates Ionic color variables', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme);

      expect(output.ionic.css).toContain(':root {');
      expect(output.ionic.css).toContain('--ion-color-');
    });

    test('generates primary color with all variants', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme);

      // Primary color should have all Ionic variants
      expect(output.ionic.css).toContain('--ion-color-primary:');
      expect(output.ionic.css).toContain('--ion-color-primary-rgb:');
      expect(output.ionic.css).toContain('--ion-color-primary-contrast:');
      expect(output.ionic.css).toContain('--ion-color-primary-contrast-rgb:');
      expect(output.ionic.css).toContain('--ion-color-primary-shade:');
      expect(output.ionic.css).toContain('--ion-color-primary-tint:');
    });

    test('generates Ionic utility classes', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme);

      // Should generate .ion-color-* classes
      expect(output.ionic.css).toContain('.ion-color-primary {');
      expect(output.ionic.css).toContain('--ion-color-base: var(--ion-color-primary)');
    });

    test('maps semantic colors to Ionic colors', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme);

      // Should map success, warning, danger colors
      expect(output.ionic.css).toContain('--ion-color-success:');
      expect(output.ionic.css).toContain('--ion-color-warning:');
      expect(output.ionic.css).toContain('--ion-color-danger:');
    });

    test('ionic theme object contains color data', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme);

      expect(output.ionic.theme.colors).toBeDefined();

      if (output.ionic.theme.colors?.primary) {
        expect(output.ionic.theme.colors.primary.base).toMatch(/^#[0-9a-f]{6}$/i);
        expect(output.ionic.theme.colors.primary.contrast).toMatch(/^#[0-9a-f]{6}$/i);
        expect(output.ionic.theme.colors.primary.shade).toMatch(/^#[0-9a-f]{6}$/i);
        expect(output.ionic.theme.colors.primary.tint).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });
  });

  test.describe('Combined Output', () => {
    test('generates combined CSS with all sections', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme);

      // Combined CSS should include header
      expect(output.css).toContain('Generated Theme');
      expect(output.css).toContain('Tailwind CSS v4');

      // Should include Tailwind section
      expect(output.css).toContain('Tailwind Theme');
      expect(output.css).toContain('@theme {');

      // Should include Ionic section
      expect(output.css).toContain('Ionic Theme');
      expect(output.css).toContain('--ion-color-');
    });

    test('generates separate files map', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme);

      expect(output.files['tailwind-theme.css']).toBeTruthy();
      expect(output.files['ionic-theme.css']).toBeTruthy();
      expect(output.files['variables.css']).toBeTruthy();
    });

    test('tailwind-theme.css contains @theme directive', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme);

      expect(output.files['tailwind-theme.css']).toContain('@theme {');
    });

    test('ionic-theme.css contains Ionic variables', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme);

      expect(output.files['ionic-theme.css']).toContain('--ion-color-');
      expect(output.files['ionic-theme.css']).toContain('.ion-color-');
    });

    test('variables.css contains pure CSS variables', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme);

      expect(output.files['variables.css']).toContain(':root {');
      expect(output.files['variables.css']).toMatch(/--[\w-]+:/);
    });

    test('includes Ionic integration bridge', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme);

      if (output.tailwind.ionicIntegrationCss) {
        expect(output.tailwind.ionicIntegrationCss).toContain('Ionic Integration');
        expect(output.tailwind.ionicIntegrationCss).toContain('var(--');
      }
    });
  });

  test.describe('SolidJS Framework Option', () => {
    test('adds SolidJS section when framework is solidjs', async () => {
      const adapter = createTailwindIonicAdapter();
      const output = await adapter.transform(theme, { framework: 'solidjs' });

      expect(output.css).toContain('SolidJS Integration');
    });
  });
});
