/**
 * Token Linter
 *
 * Main linting engine that runs rules against theme files.
 */

import type { ThemeFile } from '../schema/tokens.js';
import type { LintConfig, LintMessage, LintResult, LintRule, LintRuleContext, LintSeverity } from './types.js';
import { allRules } from './rules.js';

/**
 * Token Linter
 *
 * Runs lint rules against theme files to check for
 * naming consistency, invalid values, and best practices.
 */
export class TokenLinter {
  private rules: Map<string, LintRule> = new Map();
  private config: LintConfig;

  constructor(config: LintConfig = {}) {
    this.config = config;

    // Register all built-in rules
    for (const rule of allRules) {
      this.rules.set(rule.id, rule);
    }
  }

  /**
   * Register a custom lint rule
   */
  registerRule(rule: LintRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Get all registered rules
   */
  getRules(): LintRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Check if a rule is enabled
   */
  private isRuleEnabled(ruleId: string): boolean {
    const config = this.config.rules?.[ruleId];
    if (config === false) return false;
    return true;
  }

  /**
   * Get severity for a rule
   */
  private getRuleSeverity(rule: LintRule): LintSeverity {
    const config = this.config.rules?.[rule.id];
    if (typeof config === 'string') return config;
    return rule.defaultSeverity;
  }

  /**
   * Lint a theme file
   */
  lint(theme: ThemeFile): LintResult {
    const messages: LintMessage[] = [];

    for (const rule of this.rules.values()) {
      if (!this.isRuleEnabled(rule.id)) continue;

      const severity = this.getRuleSeverity(rule);

      const context: LintRuleContext = {
        report: (msg) => {
          messages.push({
            rule: rule.id,
            severity: msg.severity ?? severity,
            message: msg.message,
            path: msg.path,
            collection: msg.collection,
            suggestion: msg.suggestion,
          });
        },
      };

      try {
        rule.check(theme, context);
      } catch (error) {
        messages.push({
          rule: rule.id,
          severity: 'error',
          message: `Rule "${rule.id}" threw an error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    // Sort by severity (errors first)
    const severityOrder: Record<LintSeverity, number> = { error: 0, warning: 1, info: 2 };
    messages.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const errorCount = messages.filter(m => m.severity === 'error').length;
    const warningCount = messages.filter(m => m.severity === 'warning').length;
    const infoCount = messages.filter(m => m.severity === 'info').length;

    return {
      messages,
      errorCount,
      warningCount,
      infoCount,
      passed: errorCount === 0,
    };
  }
}

/**
 * Create a new linter instance
 */
export function createLinter(config?: LintConfig): TokenLinter {
  return new TokenLinter(config);
}

/**
 * Quick lint function for simple use cases
 */
export function lintTheme(theme: ThemeFile, config?: LintConfig): LintResult {
  const linter = createLinter(config);
  return linter.lint(theme);
}
