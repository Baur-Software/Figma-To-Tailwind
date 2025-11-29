/**
 * Token Linting Types
 *
 * Types for the token linting system.
 */

export type LintSeverity = 'error' | 'warning' | 'info';

export interface LintMessage {
  /** Rule that generated this message */
  rule: string;
  /** Severity level */
  severity: LintSeverity;
  /** Human-readable message */
  message: string;
  /** Token path (e.g., "colors.primary.500") */
  path?: string;
  /** Collection name */
  collection?: string;
  /** Suggested fix */
  suggestion?: string;
}

export interface LintResult {
  /** All lint messages */
  messages: LintMessage[];
  /** Number of errors */
  errorCount: number;
  /** Number of warnings */
  warningCount: number;
  /** Number of info messages */
  infoCount: number;
  /** Whether linting passed (no errors) */
  passed: boolean;
}

export interface LintRuleContext {
  /** Report a lint message */
  report(message: Omit<LintMessage, 'rule'>): void;
}

export interface LintRule {
  /** Unique rule identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this rule checks */
  description: string;
  /** Default severity */
  defaultSeverity: LintSeverity;
  /** Run the rule against a theme */
  check(theme: import('../schema/tokens.js').ThemeFile, context: LintRuleContext): void;
}

export interface LintConfig {
  /** Extend another config (path or preset name) */
  extends?: string | string[];
  /** Rules to enable/disable or configure */
  rules?: {
    [ruleId: string]: boolean | LintSeverity;
  };
  /** Token paths to ignore (glob patterns) */
  ignorePatterns?: string[];
  /** Collections to ignore */
  ignoreCollections?: string[];
}
