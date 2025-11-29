/**
 * Tailwind/Ionic Output Adapter
 *
 * Transforms normalized design tokens into Tailwind CSS v4 themes
 * with Ionic framework integration for SolidJS/Capacitor apps.
 */

import type { ThemeFile, OutputAdapter, OutputAdapterOptions } from '../../../schema/tokens.js';
import type { TailwindThemeOutput } from '../../../schema/tailwind.js';
import type { IonicGeneratorOutput } from './ionic-generator.js';
import {
  generateTailwindTheme,
  type TailwindGeneratorOptions,
} from './tailwind-generator.js';
import {
  generateIonicTheme,
  generateIonicDarkTheme,
  type IonicGeneratorOptions,
} from './ionic-generator.js';

// =============================================================================
// Output Types
// =============================================================================

/**
 * Combined output for Tailwind + Ionic
 */
export interface TailwindIonicOutput {
  /** Tailwind CSS v4 theme output */
  tailwind: TailwindThemeOutput;
  /** Ionic theme output */
  ionic: IonicGeneratorOutput;
  /** Ionic dark theme output (if applicable) */
  ionicDark?: IonicGeneratorOutput;
  /** Combined CSS output */
  css: string;
  /** Separate files map for outputting to different files */
  files: {
    'tailwind-theme.css': string;
    'ionic-theme.css': string;
    'variables.css': string;
  };
}

// =============================================================================
// Adapter Options
// =============================================================================

export interface TailwindIonicAdapterOptions extends OutputAdapterOptions {
  /** Tailwind-specific options */
  tailwind?: Partial<TailwindGeneratorOptions>;
  /** Ionic-specific options */
  ionic?: Partial<IonicGeneratorOptions>;
  /** Generate dark mode variants */
  darkMode?: boolean;
  /** Target framework */
  framework?: 'solidjs' | 'react' | 'vue' | 'angular';
}

// =============================================================================
// Adapter Implementation
// =============================================================================

/**
 * Tailwind/Ionic Output Adapter
 *
 * Generates CSS themes compatible with:
 * - Tailwind CSS v4 (@theme directive)
 * - Ionic Framework CSS variables
 * - SolidJS/Capacitor applications
 */
export class TailwindIonicAdapter implements OutputAdapter<TailwindIonicOutput> {
  readonly id = 'tailwind-ionic';
  readonly name = 'Tailwind CSS v4 + Ionic Adapter';

  /**
   * Transform normalized theme to Tailwind/Ionic output
   */
  async transform(
    theme: ThemeFile,
    options: TailwindIonicAdapterOptions = {}
  ): Promise<TailwindIonicOutput> {
    const {
      mode,
      format = {},
      tailwind: tailwindOptions = {},
      ionic: ionicOptions = {},
      darkMode = true,
    } = options;

    // Generate Tailwind theme
    const tailwindOutput = generateTailwindTheme(theme, {
      mode,
      includeComments: format.comments !== false,
      colorFormat: 'oklch',
      ionicIntegration: true,
      ...tailwindOptions,
    });

    // Generate Ionic theme
    const ionicOutput = generateIonicTheme(theme, {
      mode,
      includeColorClasses: true,
      ...ionicOptions,
    });

    // Generate dark mode variants if requested
    let ionicDarkOutput: IonicGeneratorOutput | undefined;
    if (darkMode) {
      // Check if theme has dark mode
      const hasDarkMode = theme.collections.some(c =>
        Object.keys(c.tokens).some(k => k.toLowerCase().includes('dark'))
      );

      if (hasDarkMode) {
        ionicDarkOutput = generateIonicDarkTheme(theme, ionicOptions);
      }
    }

    // Generate combined CSS
    const combinedCss = this.generateCombinedCss(
      tailwindOutput,
      ionicOutput,
      ionicDarkOutput,
      options
    );

    // Generate separate files
    const files = this.generateSeparateFiles(
      tailwindOutput,
      ionicOutput,
      ionicDarkOutput
    );

    return {
      tailwind: tailwindOutput,
      ionic: ionicOutput,
      ionicDark: ionicDarkOutput,
      css: combinedCss,
      files,
    };
  }

  /**
   * Generate combined CSS output
   */
  private generateCombinedCss(
    tailwind: TailwindThemeOutput,
    ionic: IonicGeneratorOutput,
    ionicDark: IonicGeneratorOutput | undefined,
    options: TailwindIonicAdapterOptions
  ): string {
    const sections: string[] = [];

    // Header
    sections.push('/**');
    sections.push(' * Generated Theme');
    sections.push(' * Source: Figma Design System');
    sections.push(` * Generated: ${new Date().toISOString()}`);
    sections.push(' *');
    sections.push(' * This file contains:');
    sections.push(' * - Tailwind CSS v4 @theme variables');
    sections.push(' * - Ionic Framework CSS custom properties');
    sections.push(' * - Dark mode support');
    sections.push(' */');
    sections.push('');

    // Tailwind @theme block
    sections.push('/* ==================== Tailwind Theme ==================== */');
    sections.push('');
    sections.push(tailwind.themeCss);
    sections.push('');

    // Ionic theme variables
    sections.push('/* ==================== Ionic Theme ==================== */');
    sections.push('');
    sections.push(ionic.css);
    sections.push('');

    // Tailwind-Ionic bridge
    if (tailwind.ionicIntegrationCss) {
      sections.push('/* ==================== Tailwind-Ionic Bridge ==================== */');
      sections.push('');
      sections.push(tailwind.ionicIntegrationCss);
      sections.push('');
    }

    // Dark mode
    if (tailwind.darkModeCss || ionicDark) {
      sections.push('/* ==================== Dark Mode ==================== */');
      sections.push('');

      if (tailwind.darkModeCss) {
        sections.push(tailwind.darkModeCss);
        sections.push('');
      }

      if (ionicDark) {
        sections.push('/* Ionic Dark Theme */');
        sections.push('@media (prefers-color-scheme: dark) {');
        // Extract :root content from ionic dark CSS
        const ionicDarkVars = ionicDark.css
          .replace(':root {', '')
          .replace(/\n}/g, '')
          .replace(/^}/m, '')
          .split('\n')
          .filter(line => line.includes('--ion-color'))
          .map(line => `  ${line.trim()}`)
          .join('\n');
        sections.push('  :root {');
        sections.push(ionicDarkVars);
        sections.push('  }');
        sections.push('}');
        sections.push('');
      }
    }

    // Framework-specific additions
    if (options.framework === 'solidjs') {
      sections.push('/* ==================== SolidJS Integration ==================== */');
      sections.push('');
      sections.push('/* SolidJS-specific CSS utilities can be added here */');
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Generate separate files for different purposes
   */
  private generateSeparateFiles(
    tailwind: TailwindThemeOutput,
    ionic: IonicGeneratorOutput,
    ionicDark: IonicGeneratorOutput | undefined
  ): TailwindIonicOutput['files'] {
    // Tailwind theme file (for @import in CSS)
    const tailwindThemeCss = [
      '/* Tailwind CSS v4 Theme Variables */',
      '',
      tailwind.themeCss,
      '',
      tailwind.darkModeCss || '',
    ].join('\n');

    // Ionic theme file (standalone)
    const ionicThemeCss = [
      '/* Ionic Framework Theme */',
      '',
      ionic.css,
      '',
      ionicDark ? `/* Dark Mode */\n@media (prefers-color-scheme: dark) {\n${ionicDark.css}\n}` : '',
    ].join('\n');

    // Pure CSS variables file (framework agnostic)
    const variablesCss = [
      '/* Design System CSS Variables */',
      '/* Can be imported independently of Tailwind or Ionic */',
      '',
      ':root {',
      ...tailwind.variables.map(v => `  --${v.name}: ${v.value};`),
      '}',
    ].join('\n');

    return {
      'tailwind-theme.css': tailwindThemeCss,
      'ionic-theme.css': ionicThemeCss,
      'variables.css': variablesCss,
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new Tailwind/Ionic adapter instance
 */
export function createTailwindIonicAdapter(): TailwindIonicAdapter {
  return new TailwindIonicAdapter();
}
