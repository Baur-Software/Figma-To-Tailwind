/**
 * Token Type Registry Implementation
 *
 * Central registry for token type handlers.
 * Enables adding new token types without modifying existing code.
 */

import type { TokenType, TokenValue } from '../schema/tokens.js';
import type {
  TokenTypeHandler,
  TokenTypeRegistry,
  FigmaDetectionContext,
  VariableDefsContext,
  CssConversionOptions,
  ScssConversionOptions,
  TailwindNamespace,
} from './types.js';

// =============================================================================
// Registry Implementation
// =============================================================================

class TokenTypeRegistryImpl implements TokenTypeRegistry {
  private handlers = new Map<TokenType, TokenTypeHandler>();
  private sortedHandlers: TokenTypeHandler[] = [];

  /**
   * Register a token type handler
   */
  register<T extends TokenType>(handler: TokenTypeHandler<T>): void {
    this.handlers.set(handler.type, handler as TokenTypeHandler);

    // Re-sort handlers by priority (descending)
    this.sortedHandlers = Array.from(this.handlers.values()).sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );
  }

  /**
   * Get handler for a specific token type
   */
  getHandler<T extends TokenType>(type: T): TokenTypeHandler<T> | undefined {
    return this.handlers.get(type) as TokenTypeHandler<T> | undefined;
  }

  /**
   * Get all registered handlers
   */
  getAllHandlers(): TokenTypeHandler[] {
    return this.sortedHandlers;
  }

  /**
   * Detect token type from Figma variable data
   */
  detectFromFigma(context: FigmaDetectionContext): TokenType {
    for (const handler of this.sortedHandlers) {
      if (handler.detectFigma?.(context)) {
        return handler.type;
      }
    }

    // Fallback to basic type mapping
    switch (context.resolvedType) {
      case 'COLOR':
        return 'color';
      case 'BOOLEAN':
        return 'boolean';
      case 'FLOAT':
        return 'number';
      case 'STRING':
      default:
        return 'string';
    }
  }

  /**
   * Detect token type from MCP variable defs format
   */
  detectFromVariableDefs(context: VariableDefsContext): TokenType {
    for (const handler of this.sortedHandlers) {
      if (handler.detectVariableDefs?.(context)) {
        return handler.type;
      }
    }

    // Fallback to string
    return 'string';
  }

  /**
   * Convert token value to CSS
   */
  toCss<T extends TokenType>(
    type: T,
    value: TokenValue<T>,
    options?: CssConversionOptions
  ): string {
    const handler = this.getHandler(type);

    if (!handler) {
      return String(value);
    }

    return handler.toCss(value as TokenValue<typeof handler.type>, options);
  }

  /**
   * Convert token value to SCSS
   */
  toScss<T extends TokenType>(
    type: T,
    value: TokenValue<T>,
    options?: ScssConversionOptions
  ): string {
    const handler = this.getHandler(type);

    if (!handler) {
      return String(value);
    }

    // Use SCSS-specific method if available, otherwise fall back to CSS
    if (handler.toScss) {
      return handler.toScss(value as TokenValue<typeof handler.type>, options);
    }

    // Convert SCSS options to CSS options (hsl -> hex for CSS fallback)
    const cssOptions: CssConversionOptions = {
      ...options,
      colorFormat: options?.colorFormat === 'hsl' ? 'hex' : options?.colorFormat,
    };

    return handler.toCss(value as TokenValue<typeof handler.type>, cssOptions);
  }

  /**
   * Get Tailwind namespace for token
   */
  getNamespace(type: TokenType, path: string[]): TailwindNamespace | null {
    const handler = this.getHandler(type);

    if (!handler) {
      return null;
    }

    // Try path-based namespace first
    if (handler.getNamespace) {
      const namespace = handler.getNamespace(path);
      if (namespace) return namespace;
    }

    // Fall back to default namespace
    return handler.defaultNamespace ?? null;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

/**
 * Global token type registry instance
 */
export const tokenTypeRegistry: TokenTypeRegistry = new TokenTypeRegistryImpl();

/**
 * Register a token type handler
 */
export function registerTokenType<T extends TokenType>(
  handler: TokenTypeHandler<T>
): void {
  tokenTypeRegistry.register(handler);
}
