/**
 * Lint Config Loader
 *
 * Loads lint configuration from dotfiles, similar to ESLint/Prettier.
 *
 * Supported config files (in order of precedence):
 * - figma-to.config.js
 * - figma-to.config.mjs
 * - .figmatorc.js
 * - .figmatorc.json
 * - .figmatorc
 * - package.json ("figma-to" field)
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, isAbsolute } from 'path';
import { pathToFileURL } from 'url';
import type { LintConfig } from './types.js';

const CONFIG_FILES = [
  'figma-to.config.js',
  'figma-to.config.mjs',
  '.figmatorc.js',
  '.figmatorc.json',
  '.figmatorc',
];

/** Built-in config presets */
const PRESETS: Record<string, LintConfig> = {
  recommended: {
    rules: {
      // Naming & Structure
      'inconsistent-naming': 'warning',
      'invalid-token-name': 'error',
      'deep-nesting': 'warning',
      'empty-collection': 'warning',

      // Documentation
      'missing-description': 'info',

      // Value Validation
      'invalid-color-value': 'error',
      'invalid-dimension-value': 'error',
      'invalid-typography-value': 'error',
      'invalid-shadow-value': 'error',
      'invalid-gradient-value': 'error',
      'invalid-border-value': 'error',
      'invalid-cubic-bezier': 'error',

      // References
      'broken-reference': 'error',
      'circular-reference': 'error',
      'duplicate-values': 'info',

      // Collection/Mode
      'mode-consistency': 'warning',
      'missing-default-mode': 'error',

      // Figma-specific
      'hidden-from-publishing': 'info',
    },
  },
  strict: {
    rules: {
      // Naming & Structure
      'inconsistent-naming': 'error',
      'invalid-token-name': 'error',
      'deep-nesting': 'error',
      'empty-collection': 'error',

      // Documentation
      'missing-description': 'warning',

      // Value Validation
      'invalid-color-value': 'error',
      'invalid-dimension-value': 'error',
      'invalid-typography-value': 'error',
      'invalid-shadow-value': 'error',
      'invalid-gradient-value': 'error',
      'invalid-border-value': 'error',
      'invalid-cubic-bezier': 'error',

      // References
      'broken-reference': 'error',
      'circular-reference': 'error',
      'duplicate-values': 'warning',

      // Collection/Mode
      'mode-consistency': 'error',
      'missing-default-mode': 'error',

      // Figma-specific
      'hidden-from-publishing': 'warning',
    },
  },
  minimal: {
    rules: {
      // Only critical validation errors
      'inconsistent-naming': false,
      'invalid-token-name': 'error',
      'deep-nesting': false,
      'empty-collection': false,

      'missing-description': false,

      'invalid-color-value': 'error',
      'invalid-dimension-value': 'error',
      'invalid-typography-value': 'error',
      'invalid-shadow-value': 'error',
      'invalid-gradient-value': 'error',
      'invalid-border-value': 'error',
      'invalid-cubic-bezier': 'error',

      'broken-reference': 'error',
      'circular-reference': 'error',
      'duplicate-values': false,

      'mode-consistency': false,
      'missing-default-mode': 'error',

      'hidden-from-publishing': false,
    },
  },
};

/**
 * Find config file starting from a directory and walking up
 */
export function findConfigFile(startDir: string = process.cwd()): string | null {
  let currentDir = startDir;

  while (currentDir !== dirname(currentDir)) {
    // Check each config file name
    for (const filename of CONFIG_FILES) {
      const filepath = join(currentDir, filename);
      if (existsSync(filepath)) {
        return filepath;
      }
    }

    // Check package.json for "figma-to" field
    const packagePath = join(currentDir, 'package.json');
    if (existsSync(packagePath)) {
      try {
        const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
        if (pkg['figma-to']?.lint) {
          return packagePath;
        }
      } catch {
        // Ignore parse errors
      }
    }

    currentDir = dirname(currentDir);
  }

  return null;
}

/**
 * Load a config file
 */
export async function loadConfigFile(filepath: string): Promise<LintConfig> {
  const ext = filepath.split('.').pop();

  if (filepath.endsWith('package.json')) {
    const pkg = JSON.parse(readFileSync(filepath, 'utf-8'));
    return pkg['figma-to']?.lint || {};
  }

  if (ext === 'json' || filepath.endsWith('.figmatorc')) {
    const content = readFileSync(filepath, 'utf-8');
    return JSON.parse(content);
  }

  if (ext === 'js' || ext === 'mjs') {
    // Dynamic import for JS files
    const fileUrl = pathToFileURL(filepath).href;
    const module = await import(fileUrl);
    return module.default || module;
  }

  throw new Error(`Unsupported config file format: ${filepath}`);
}

/**
 * Resolve extends and merge configs
 */
export async function resolveConfig(
  config: LintConfig,
  configDir: string = process.cwd()
): Promise<LintConfig> {
  let resolved: LintConfig = {};

  // Handle extends
  if (config.extends) {
    const extendsList = Array.isArray(config.extends) ? config.extends : [config.extends];

    for (const ext of extendsList) {
      let extConfig: LintConfig;

      // Check if it's a preset
      if (PRESETS[ext]) {
        extConfig = PRESETS[ext];
      } else {
        // Load from file
        const extPath = isAbsolute(ext) ? ext : join(configDir, ext);
        extConfig = await loadConfigFile(extPath);
        extConfig = await resolveConfig(extConfig, dirname(extPath));
      }

      // Merge
      resolved = mergeConfigs(resolved, extConfig);
    }
  }

  // Merge current config (overrides extended)
  resolved = mergeConfigs(resolved, config);

  return resolved;
}

/**
 * Merge two configs (later overrides earlier)
 */
function mergeConfigs(base: LintConfig, override: LintConfig): LintConfig {
  return {
    ...base,
    ...override,
    rules: {
      ...base.rules,
      ...override.rules,
    },
    ignorePatterns: [
      ...(base.ignorePatterns || []),
      ...(override.ignorePatterns || []),
    ],
    ignoreCollections: [
      ...(base.ignoreCollections || []),
      ...(override.ignoreCollections || []),
    ],
  };
}

/**
 * Load config from default location or specified path
 */
export async function loadConfig(configPath?: string): Promise<LintConfig> {
  const filepath = configPath || findConfigFile();

  if (!filepath) {
    // Return default (recommended) config
    return PRESETS.recommended;
  }

  const config = await loadConfigFile(filepath);
  return resolveConfig(config, dirname(filepath));
}

/**
 * Get a built-in preset
 */
export function getPreset(name: string): LintConfig | undefined {
  return PRESETS[name];
}

/**
 * List available preset names
 */
export function listPresets(): string[] {
  return Object.keys(PRESETS);
}
