/**
 * useTypographyToken composable
 *
 * Provides reactive access to typography design tokens.
 * Returns typography styles as CSS-ready object.
 */

import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue';
import { useDesignTokens } from './useDesignTokens';
import type { Token, TypographyValue, DimensionValue, FontWeightValue } from '@baur-software/figma-to';

export interface TypographyStyles {
  fontFamily: string;
  fontSize: string;
  fontWeight: string | number;
  lineHeight: string | number;
  letterSpacing?: string;
  textTransform?: string;
}

export interface TypographyTokenReturn {
  /**
   * The raw token object (undefined if not found)
   */
  token: ComputedRef<Token<'typography'> | undefined>;

  /**
   * Typography value as CSS-ready style object
   */
  styles: ComputedRef<TypographyStyles | undefined>;

  /**
   * Font family as CSS string
   */
  fontFamily: ComputedRef<string | undefined>;

  /**
   * Font size with unit
   */
  fontSize: ComputedRef<string | undefined>;

  /**
   * Font weight
   */
  fontWeight: ComputedRef<string | number | undefined>;

  /**
   * Line height
   */
  lineHeight: ComputedRef<string | number | undefined>;

  /**
   * Letter spacing with unit
   */
  letterSpacing: ComputedRef<string | undefined>;

  /**
   * Whether the token exists
   */
  exists: ComputedRef<boolean>;
}

/**
 * Convert dimension value to CSS string
 */
function dimensionToString(dim: DimensionValue): string {
  return `${dim.value}${dim.unit}`;
}

/**
 * Convert font weight to CSS value
 */
function fontWeightToCSS(weight: FontWeightValue): string | number {
  if (typeof weight === 'number') return weight;

  const weightMap: Record<string, number> = {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  };

  return weightMap[weight] ?? 400;
}

/**
 * Get a typography design token reactively
 *
 * @param path - The token path (can be a ref or getter for reactivity)
 *
 * @example
 * ```vue
 * <script setup>
 * const { styles, fontFamily, fontSize } = useTypographyToken('typography.heading.h1')
 * </script>
 *
 * <template>
 *   <h1 :style="styles">
 *     Heading with design token styles
 *   </h1>
 * </template>
 * ```
 */
export function useTypographyToken(path: MaybeRefOrGetter<string>): TypographyTokenReturn {
  const { getToken } = useDesignTokens();

  const token = computed<Token<'typography'> | undefined>(() => {
    const t = getToken(toValue(path));
    if (t && t.$type === 'typography') {
      return t as Token<'typography'>;
    }
    return undefined;
  });

  const typographyValue = computed<TypographyValue | undefined>(() => {
    const t = token.value;
    if (!t) return undefined;

    const value = t.$value;
    if (typeof value === 'object' && '$ref' in value) {
      // Resolve the reference
      const refToken = getToken((value as { $ref: string }).$ref.replace(/[{}]/g, ''));
      if (refToken && refToken.$type === 'typography') {
        return refToken.$value as TypographyValue;
      }
      return undefined;
    }

    return value as TypographyValue;
  });

  const fontFamily = computed<string | undefined>(() => {
    const val = typographyValue.value;
    if (!val) return undefined;
    return val.fontFamily.join(', ');
  });

  const fontSize = computed<string | undefined>(() => {
    const val = typographyValue.value;
    if (!val) return undefined;
    return dimensionToString(val.fontSize);
  });

  const fontWeight = computed<string | number | undefined>(() => {
    const val = typographyValue.value;
    if (!val) return undefined;
    return fontWeightToCSS(val.fontWeight);
  });

  const lineHeight = computed<string | number | undefined>(() => {
    const val = typographyValue.value;
    if (!val) return undefined;

    if (typeof val.lineHeight === 'number') {
      return val.lineHeight;
    }
    return dimensionToString(val.lineHeight);
  });

  const letterSpacing = computed<string | undefined>(() => {
    const val = typographyValue.value;
    if (!val || !val.letterSpacing) return undefined;
    return dimensionToString(val.letterSpacing);
  });

  const styles = computed<TypographyStyles | undefined>(() => {
    const val = typographyValue.value;
    if (!val) return undefined;

    const result: TypographyStyles = {
      fontFamily: fontFamily.value!,
      fontSize: fontSize.value!,
      fontWeight: fontWeight.value!,
      lineHeight: lineHeight.value!,
    };

    if (letterSpacing.value) {
      result.letterSpacing = letterSpacing.value;
    }

    if (val.textTransform) {
      result.textTransform = val.textTransform;
    }

    return result;
  });

  const exists = computed(() => token.value !== undefined);

  return {
    token,
    styles,
    fontFamily,
    fontSize,
    fontWeight,
    lineHeight,
    letterSpacing,
    exists,
  };
}
