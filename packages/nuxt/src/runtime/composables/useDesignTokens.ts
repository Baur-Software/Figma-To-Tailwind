/**
 * useDesignTokens composable
 *
 * Provides access to the full design token theme with helper methods
 * for retrieving tokens by path.
 */

import { computed, type ComputedRef } from 'vue';
import { useNuxtApp, useRuntimeConfig } from '#app';
import type { ThemeFile, Token, TokenCollection } from '@baur-software/figma-to';

export interface DesignTokensReturn {
  /**
   * The full theme object (null if not loaded)
   */
  theme: ComputedRef<ThemeFile | null>;

  /**
   * All token collections
   */
  collections: ComputedRef<TokenCollection[]>;

  /**
   * Get a token by dot-notation path
   * @example getToken('colors.primary.500')
   */
  getToken: (path: string) => Token | undefined;

  /**
   * Check if a token exists at the given path
   */
  hasToken: (path: string) => boolean;

  /**
   * Get all tokens in a collection
   */
  getCollection: (name: string) => TokenCollection | undefined;

  /**
   * Get tokens matching a pattern (simple glob support)
   * @example getTokensByPattern('colors.*')
   */
  getTokensByPattern: (pattern: string) => Array<{ path: string; token: Token }>;
}

/**
 * Access the design token theme and retrieve tokens by path
 *
 * @example
 * ```vue
 * <script setup>
 * const { theme, getToken, collections } = useDesignTokens()
 *
 * const primaryColor = getToken('colors.primary.500')
 * </script>
 * ```
 */
export function useDesignTokens(): DesignTokensReturn {
  const nuxtApp = useNuxtApp();

  // Lazy load the theme from the generated template
  const getTheme = (): ThemeFile | null => {
    try {
      // @ts-expect-error - Virtual module
      const { theme } = import('#build/figma-to/theme.mjs');
      return theme || null;
    } catch {
      return null;
    }
  };

  const theme = computed<ThemeFile | null>(() => getTheme());

  const collections = computed<TokenCollection[]>(() => {
    const t = theme.value;
    return t?.collections || [];
  });

  /**
   * Navigate to a token by dot-notation path
   */
  function getToken(path: string): Token | undefined {
    const t = theme.value;
    if (!t) return undefined;

    const parts = path.split('.');

    for (const collection of t.collections) {
      // Try each mode
      for (const mode of collection.modes) {
        const tokenGroup = collection.tokens[mode];
        if (!tokenGroup) continue;

        let current: unknown = tokenGroup;

        for (const part of parts) {
          if (current && typeof current === 'object' && part in current) {
            current = (current as Record<string, unknown>)[part];
          } else {
            current = undefined;
            break;
          }
        }

        // Check if we found a token (has $type and $value)
        if (
          current &&
          typeof current === 'object' &&
          '$type' in current &&
          '$value' in current
        ) {
          return current as Token;
        }
      }
    }

    return undefined;
  }

  /**
   * Check if a token exists at path
   */
  function hasToken(path: string): boolean {
    return getToken(path) !== undefined;
  }

  /**
   * Get a collection by name
   */
  function getCollection(name: string): TokenCollection | undefined {
    return collections.value.find((c) => c.name === name);
  }

  /**
   * Get tokens matching a simple glob pattern
   */
  function getTokensByPattern(pattern: string): Array<{ path: string; token: Token }> {
    const results: Array<{ path: string; token: Token }> = [];
    const t = theme.value;
    if (!t) return results;

    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '[^.]+')
      .replace(/\*\*/g, '.+');
    const regex = new RegExp(`^${regexPattern}$`);

    // Recursively collect all tokens
    function collectTokens(
      obj: unknown,
      currentPath: string[]
    ): void {
      if (!obj || typeof obj !== 'object') return;

      // Check if this is a token
      if ('$type' in obj && '$value' in obj) {
        const path = currentPath.join('.');
        if (regex.test(path)) {
          results.push({ path, token: obj as Token });
        }
        return;
      }

      // Recurse into nested objects
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('$')) continue; // Skip meta keys
        collectTokens(value, [...currentPath, key]);
      }
    }

    for (const collection of t.collections) {
      for (const mode of collection.modes) {
        const tokenGroup = collection.tokens[mode];
        if (tokenGroup) {
          collectTokens(tokenGroup, []);
        }
      }
    }

    return results;
  }

  return {
    theme,
    collections,
    getToken,
    hasToken,
    getCollection,
    getTokensByPattern,
  };
}
