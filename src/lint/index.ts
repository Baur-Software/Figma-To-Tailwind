/**
 * Token Linting Module
 *
 * Provides linting capabilities for design tokens.
 *
 * @example
 * ```typescript
 * import { lintTheme, createLinter } from '@baur-software/figma-to';
 *
 * // Quick lint
 * const result = lintTheme(theme);
 * console.log(result.passed ? 'All good!' : `${result.errorCount} errors`);
 *
 * // Custom config
 * const linter = createLinter({
 *   rules: {
 *     'missing-description': false,  // Disable
 *     'deep-nesting': 'error',        // Upgrade to error
 *   }
 * });
 * const result = linter.lint(theme);
 * ```
 */

export { TokenLinter, createLinter, lintTheme } from './linter.js';
export { allRules } from './rules.js';
export type {
  LintConfig,
  LintMessage,
  LintResult,
  LintRule,
  LintRuleContext,
  LintSeverity,
} from './types.js';
