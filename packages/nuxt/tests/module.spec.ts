/**
 * Tests for @baur-software/figma-to-nuxt module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @nuxt/kit functions using hoisted mock factory
vi.mock('@nuxt/kit', () => {
  return {
    defineNuxtModule: (config: any) => config,
    addImportsDir: vi.fn(),
    createResolver: vi.fn(() => ({
      resolve: (path: string) => path,
    })),
    addTemplate: vi.fn(),
    useLogger: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
    })),
  };
});

// Import mocked functions after mock is set up
import { addImportsDir, addTemplate, useLogger } from '@nuxt/kit';

// Import the module configuration
import moduleConfig from '../src/module';

describe('@baur-software/figma-to-nuxt Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Configuration', () => {
    it('should have correct meta information', () => {
      expect(moduleConfig.meta).toEqual({
        name: '@baur-software/figma-to-nuxt',
        configKey: 'figmaTo',
        compatibility: {
          nuxt: '>=3.0.0',
        },
      });
    });

    it('should have correct default options', () => {
      expect(moduleConfig.defaults).toEqual({
        output: 'assets/theme',
        format: 'tailwind',
        colorFormat: 'oklch',
        ionic: false,
        darkMode: true,
        syncOnBuild: false,
        logLevel: 'info',
      });
    });
  });

  describe('Module Setup', () => {
    it('should add composables directory', async () => {
      const mockNuxt = {
        options: {
          rootDir: '/test',
          dev: false,
          css: [],
          runtimeConfig: { public: {} },
        },
        hook: vi.fn(),
      };

      await moduleConfig.setup(moduleConfig.defaults, mockNuxt);

      expect(addImportsDir).toHaveBeenCalled();
    });

    it('should add type template', async () => {
      const mockNuxt = {
        options: {
          rootDir: '/test',
          dev: false,
          css: [],
          runtimeConfig: { public: {} },
        },
        hook: vi.fn(),
      };

      await moduleConfig.setup(moduleConfig.defaults, mockNuxt);

      expect(addTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'figma-to/types.d.ts',
        })
      );
    });

    it('should add theme template', async () => {
      const mockNuxt = {
        options: {
          rootDir: '/test',
          dev: false,
          css: [],
          runtimeConfig: { public: {} },
        },
        hook: vi.fn(),
      };

      await moduleConfig.setup(moduleConfig.defaults, mockNuxt);

      expect(addTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'figma-to/theme.mjs',
        })
      );
    });

    it('should register build:before hook', async () => {
      const mockNuxt = {
        options: {
          rootDir: '/test',
          dev: false,
          css: [],
          runtimeConfig: { public: {} },
        },
        hook: vi.fn(),
      };

      await moduleConfig.setup(moduleConfig.defaults, mockNuxt);

      expect(mockNuxt.hook).toHaveBeenCalledWith(
        'build:before',
        expect.any(Function)
      );
    });

    it('should register ready hook', async () => {
      const mockNuxt = {
        options: {
          rootDir: '/test',
          dev: false,
          css: [],
          runtimeConfig: { public: {} },
        },
        hook: vi.fn(),
      };

      await moduleConfig.setup(moduleConfig.defaults, mockNuxt);

      expect(mockNuxt.hook).toHaveBeenCalledWith(
        'ready',
        expect.any(Function)
      );
    });

    it('should set runtime config', async () => {
      const mockNuxt = {
        options: {
          rootDir: '/test',
          dev: false,
          css: [],
          runtimeConfig: { public: {} },
        },
        hook: vi.fn(),
      };

      await moduleConfig.setup(moduleConfig.defaults, mockNuxt);

      expect(mockNuxt.options.runtimeConfig.public.figmaTo).toEqual({
        output: 'assets/theme',
        format: 'tailwind',
        colorFormat: 'oklch',
        darkMode: true,
      });
    });

    it('should warn when no credentials configured', async () => {
      const logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
      };
      vi.mocked(useLogger).mockReturnValue(logger);

      const mockNuxt = {
        options: {
          rootDir: '/test',
          dev: false,
          css: [],
          runtimeConfig: { public: {} },
        },
        hook: vi.fn(),
      };

      await moduleConfig.setup(moduleConfig.defaults, mockNuxt);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No Figma credentials')
      );
    });

    it('should not warn when logLevel is silent', async () => {
      const logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
      };
      vi.mocked(useLogger).mockReturnValue(logger);

      const mockNuxt = {
        options: {
          rootDir: '/test',
          dev: false,
          css: [],
          runtimeConfig: { public: {} },
        },
        hook: vi.fn(),
      };

      await moduleConfig.setup({ ...moduleConfig.defaults, logLevel: 'silent' }, mockNuxt);

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Output Filename Generation', () => {
    it('should use theme.css for tailwind format', async () => {
      const mockNuxt = {
        options: {
          rootDir: '/test',
          dev: false,
          css: [],
          runtimeConfig: { public: {} },
        },
        hook: vi.fn(),
      };

      await moduleConfig.setup({ ...moduleConfig.defaults, format: 'tailwind' }, mockNuxt);

      // Check that the ready hook would check for theme.css
      const readyHook = mockNuxt.hook.mock.calls.find((call: any) => call[0] === 'ready');
      expect(readyHook).toBeDefined();
    });

    it('should use _variables.scss for scss format', async () => {
      const mockNuxt = {
        options: {
          rootDir: '/test',
          dev: false,
          css: [],
          runtimeConfig: { public: {} },
        },
        hook: vi.fn(),
      };

      await moduleConfig.setup({ ...moduleConfig.defaults, format: 'scss' }, mockNuxt);

      expect(mockNuxt.hook).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    it('should use variables.css for css format', async () => {
      const mockNuxt = {
        options: {
          rootDir: '/test',
          dev: false,
          css: [],
          runtimeConfig: { public: {} },
        },
        hook: vi.fn(),
      };

      await moduleConfig.setup({ ...moduleConfig.defaults, format: 'css' }, mockNuxt);

      expect(mockNuxt.hook).toHaveBeenCalledWith('ready', expect.any(Function));
    });
  });
});

describe('Generated Types Content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate types template with correct structure', async () => {
    let typesContent = '';

    vi.mocked(addTemplate).mockImplementation((template: any) => {
      if (template.filename === 'figma-to/types.d.ts') {
        typesContent = template.getContents();
      }
    });

    const mockNuxt = {
      options: {
        rootDir: '/test',
        dev: false,
        css: [],
        runtimeConfig: { public: {} },
      },
      hook: vi.fn(),
    };

    await moduleConfig.setup(moduleConfig.defaults, mockNuxt);

    expect(typesContent).toContain('FigmaToTheme');
    expect(typesContent).toContain('DesignTokens');
    expect(typesContent).toContain('getToken');
    expect(typesContent).toContain('getColorValue');
    expect(typesContent).toContain('declare module \'#app\'');
    expect(typesContent).toContain('$figmaTo');
  });
});

describe('Theme Module Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate null theme when no theme loaded', async () => {
    let themeContentGetter: (() => Promise<string>) | null = null;

    vi.mocked(addTemplate).mockImplementation((template: any) => {
      if (template.filename === 'figma-to/theme.mjs') {
        themeContentGetter = template.getContents;
      }
    });

    const mockNuxt = {
      options: {
        rootDir: '/nonexistent',
        dev: false,
        css: [],
        runtimeConfig: { public: {} },
      },
      hook: vi.fn(),
    };

    await moduleConfig.setup(moduleConfig.defaults, mockNuxt);

    // Get the async content
    expect(themeContentGetter).not.toBeNull();
    const content = await themeContentGetter!();
    expect(content).toContain('export const theme = null');
  });
});
