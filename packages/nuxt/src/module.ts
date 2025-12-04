/**
 * @baur-software/figma-to-nuxt
 *
 * A Nuxt 3 module for syncing Figma design tokens to your application.
 *
 * Features:
 * - Build-time sync with Figma API
 * - Multiple output formats (Tailwind CSS v4, SCSS, plain CSS)
 * - Auto-injected styles
 * - Vue composables for reactive token access
 * - TypeScript support with generated types
 * - Dark mode support
 */

import { defineNuxtModule, addImportsDir, createResolver, addTemplate, useLogger } from '@nuxt/kit';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import type { ThemeFile } from '@baur-software/figma-to';

export interface ModuleOptions {
  /**
   * Figma file key (from the URL)
   * @example 'abc123xyz'
   */
  fileKey?: string;

  /**
   * Figma personal access token
   * Can also be set via FIGMA_TOKEN environment variable
   */
  token?: string;

  /**
   * Output directory for generated files (relative to project root)
   * @default 'assets/theme'
   */
  output?: string;

  /**
   * Output format
   * @default 'tailwind'
   */
  format?: 'tailwind' | 'scss' | 'css';

  /**
   * Color format for CSS output
   * @default 'oklch'
   */
  colorFormat?: 'oklch' | 'hex' | 'rgb' | 'hsl';

  /**
   * Include Ionic CSS variables
   * @default false
   */
  ionic?: boolean;

  /**
   * Generate dark mode variants
   * @default true
   */
  darkMode?: boolean;

  /**
   * Path to a local theme.json file
   * Use this instead of fetching from Figma
   */
  themeFile?: string;

  /**
   * Sync tokens on every build
   * @default false (only sync in development or when explicitly requested)
   */
  syncOnBuild?: boolean;

  /**
   * Log level for module output
   * @default 'info'
   */
  logLevel?: 'silent' | 'info' | 'verbose';
}

declare module '@nuxt/schema' {
  interface NuxtConfig {
    figmaTo?: Partial<ModuleOptions>;
  }
  interface NuxtOptions {
    figmaTo: ModuleOptions;
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@baur-software/figma-to-nuxt',
    configKey: 'figmaTo',
    compatibility: {
      nuxt: '>=3.0.0',
    },
  },
  defaults: {
    output: 'assets/theme',
    format: 'tailwind',
    colorFormat: 'oklch',
    ionic: false,
    darkMode: true,
    syncOnBuild: false,
    logLevel: 'info',
  },
  async setup(options, nuxt) {
    const logger = useLogger('figma-to');
    const resolver = createResolver(import.meta.url);

    // Add composables
    addImportsDir(resolver.resolve('./runtime/composables'));

    // Validate configuration
    const hasCredentials = options.fileKey && (options.token || process.env.FIGMA_TOKEN);
    const hasLocalTheme = options.themeFile;

    if (!hasCredentials && !hasLocalTheme) {
      if (options.logLevel !== 'silent') {
        logger.warn('No Figma credentials or local theme file configured. Tokens will not be synced.');
        logger.info('Configure either `figmaTo.fileKey` + `figmaTo.token` or `figmaTo.themeFile`');
      }
    }

    // Generate theme types template
    addTemplate({
      filename: 'figma-to/types.d.ts',
      getContents: () => generateTypesContent(),
    });

    // Generate theme data template (will be populated during build)
    addTemplate({
      filename: 'figma-to/theme.mjs',
      getContents: async () => {
        const theme = await loadOrSyncTheme(options, nuxt.options.rootDir, logger);
        return generateThemeModule(theme);
      },
    });

    // Hook into build:before to sync tokens
    nuxt.hook('build:before', async () => {
      if (options.syncOnBuild || nuxt.options.dev) {
        await syncTheme(options, nuxt.options.rootDir, logger);
      }
    });

    // Add CSS file to nuxt config
    const outputPath = join(nuxt.options.rootDir, options.output!, getOutputFilename(options.format!));

    // Check if output file exists, if not create a placeholder
    try {
      await fs.access(outputPath);
    } catch {
      // File doesn't exist yet, will be created during sync
      if (options.logLevel === 'verbose') {
        logger.info(`Theme file will be created at: ${outputPath}`);
      }
    }

    // Add the CSS file to the app if it exists
    nuxt.hook('ready', async () => {
      try {
        await fs.access(outputPath);
        nuxt.options.css.push(outputPath);
      } catch {
        // File doesn't exist, skip adding to CSS
      }
    });

    // Provide runtime config
    nuxt.options.runtimeConfig.public.figmaTo = {
      output: options.output,
      format: options.format,
      colorFormat: options.colorFormat,
      darkMode: options.darkMode,
    };

    if (options.logLevel === 'verbose') {
      logger.info('Module initialized with options:', options);
    }
  },
});

/**
 * Get the output filename based on format
 */
function getOutputFilename(format: 'tailwind' | 'scss' | 'css'): string {
  switch (format) {
    case 'tailwind':
      return 'theme.css';
    case 'scss':
      return '_variables.scss';
    case 'css':
      return 'variables.css';
  }
}

/**
 * Load theme from local file or sync from Figma
 */
async function loadOrSyncTheme(
  options: ModuleOptions,
  rootDir: string,
  logger: ReturnType<typeof useLogger>
): Promise<ThemeFile | null> {
  // Try loading from local theme file first
  if (options.themeFile) {
    const themePath = join(rootDir, options.themeFile);
    try {
      const content = await fs.readFile(themePath, 'utf-8');
      return JSON.parse(content) as ThemeFile;
    } catch (error) {
      logger.error(`Failed to load theme file: ${themePath}`, error);
      return null;
    }
  }

  // Try loading from output directory (cached)
  const outputDir = join(rootDir, options.output!);
  const cacheFile = join(outputDir, 'theme.json');
  try {
    const content = await fs.readFile(cacheFile, 'utf-8');
    return JSON.parse(content) as ThemeFile;
  } catch {
    // Cache doesn't exist, return null
    return null;
  }
}

/**
 * Sync theme from Figma
 */
async function syncTheme(
  options: ModuleOptions,
  rootDir: string,
  logger: ReturnType<typeof useLogger>
): Promise<void> {
  const token = options.token || process.env.FIGMA_TOKEN;

  if (!options.fileKey || !token) {
    return;
  }

  if (options.logLevel !== 'silent') {
    logger.info('Syncing design tokens from Figma...');
  }

  try {
    // Import the core library dynamically
    const { createFigmaAdapter, createTailwindIonicAdapter, createScssAdapter } = await import(
      '@baur-software/figma-to'
    );

    // Fetch variables from Figma API
    const response = await fetch(
      `https://api.figma.com/v1/files/${options.fileKey}/variables/local`,
      {
        headers: {
          'X-Figma-Token': token,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    const figmaData = await response.json();

    // Parse Figma data
    const figmaAdapter = createFigmaAdapter();
    const theme = await figmaAdapter.parse({ variableDefs: figmaData });

    // Generate output based on format
    const outputDir = join(rootDir, options.output!);
    await fs.mkdir(outputDir, { recursive: true });

    let cssContent: string;

    if (options.format === 'scss') {
      const scssAdapter = createScssAdapter();
      const output = await scssAdapter.transform(theme, {
        format: { comments: true },
      });
      cssContent = output.files['_variables.scss'];
    } else {
      // Use Tailwind adapter for both 'tailwind' and 'css' formats
      const tailwindAdapter = createTailwindIonicAdapter();
      const output = await tailwindAdapter.transform(theme, {
        darkMode: options.darkMode,
        tailwind: {
          colorFormat: options.colorFormat,
          ionicIntegration: options.ionic,
        },
      });
      cssContent = options.format === 'css' ? output.files['variables.css'] : output.css;
    }

    // Write the theme file
    const outputFilename = getOutputFilename(options.format!);
    const outputPath = join(outputDir, outputFilename);
    await fs.writeFile(outputPath, cssContent, 'utf-8');

    // Write the theme.json cache
    const cacheFile = join(outputDir, 'theme.json');
    await fs.writeFile(cacheFile, JSON.stringify(theme, null, 2), 'utf-8');

    if (options.logLevel !== 'silent') {
      logger.success(`Theme synced successfully to ${outputPath}`);
    }
  } catch (error) {
    logger.error('Failed to sync theme from Figma:', error);
    throw error;
  }
}

/**
 * Generate TypeScript types for the theme
 */
function generateTypesContent(): string {
  return `// Generated by @baur-software/figma-to-nuxt
// Do not edit this file manually

import type { ThemeFile, Token, TokenCollection } from '@baur-software/figma-to';

export interface FigmaToTheme extends ThemeFile {}

export interface DesignTokens {
  theme: FigmaToTheme | null;
  collections: TokenCollection[];
  getToken: (path: string) => Token | undefined;
  getColorValue: (path: string) => string | undefined;
  getTypographyValue: (path: string) => Record<string, string> | undefined;
  getShadowValue: (path: string) => string | undefined;
}

declare module '#app' {
  interface NuxtApp {
    $figmaTo: DesignTokens;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $figmaTo: DesignTokens;
  }
}

export {};
`;
}

/**
 * Generate the theme module content
 */
function generateThemeModule(theme: ThemeFile | null): string {
  if (!theme) {
    return `// Generated by @baur-software/figma-to-nuxt
export const theme = null;
export const collections = [];
`;
  }

  return `// Generated by @baur-software/figma-to-nuxt
export const theme = ${JSON.stringify(theme, null, 2)};
export const collections = theme.collections;
`;
}
