/**
 * Token Linting Module
 *
 * Provides linting capabilities for design tokens.
 *
 * @example
 * ```typescript
 * import { lintTheme, createLinter, loadConfig } from '@baur-software/figma-to';
 *
 * // Quick lint with auto-loaded config
 * const config = await loadConfig();
 * const result = lintTheme(theme, config);
 * console.log(result.passed ? 'All good!' : `${result.errorCount} errors`);
 *
 * // Custom config
 * const linter = createLinter({
 *   extends: 'strict',
 *   rules: {
 *     'missing-description': false,  // Disable
 *   }
 * });
 * const result = linter.lint(theme);
 * ```
 *
 * Config files (in order of precedence):
 * - figma-to.config.js
 * - figma-to.config.mjs
 * - .figmatorc.js
 * - .figmatorc.json
 * - .figmatorc
 * - package.json ("figma-to" field)
 */

export { TokenLinter, createLinter, lintTheme } from './linter.js';
export { allRules } from './rules.js';
export {
  loadConfig,
  findConfigFile,
  loadConfigFile,
  resolveConfig,
  getPreset,
  listPresets,
} from './config.js';
export type {
  LintConfig,
  LintMessage,
  LintResult,
  LintRule,
  LintRuleContext,
  LintSeverity,
} from './types.js';
