/**
 * useShadowToken composable
 *
 * Provides reactive access to shadow design tokens.
 * Returns shadow values as CSS box-shadow strings.
 */

import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue';
import { useDesignTokens } from './useDesignTokens';
import type { Token, ShadowValue, ColorValue, DimensionValue } from '@baur-software/figma-to';

export interface ShadowTokenReturn {
  /**
   * The raw token object (undefined if not found)
   */
  token: ComputedRef<Token<'shadow'> | undefined>;

  /**
   * The shadow value as a CSS box-shadow string
   */
  value: ComputedRef<string | undefined>;

  /**
   * Individual shadow layers (for multi-layer shadows)
   */
  layers: ComputedRef<ShadowValue[] | undefined>;

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
 * Convert RGBA color to CSS rgba() string
 */
function colorToRgba(color: ColorValue): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  if (color.a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(2)})`;
  }

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Convert a single shadow value to CSS string
 */
function shadowToString(shadow: ShadowValue): string {
  const parts: string[] = [];

  if (shadow.inset) {
    parts.push('inset');
  }

  parts.push(dimensionToString(shadow.offsetX));
  parts.push(dimensionToString(shadow.offsetY));
  parts.push(dimensionToString(shadow.blur));

  if (shadow.spread) {
    parts.push(dimensionToString(shadow.spread));
  }

  parts.push(colorToRgba(shadow.color));

  return parts.join(' ');
}

/**
 * Get a shadow design token reactively
 *
 * @param path - The token path (can be a ref or getter for reactivity)
 *
 * @example
 * ```vue
 * <script setup>
 * const { value, layers } = useShadowToken('shadows.elevation.md')
 * </script>
 *
 * <template>
 *   <div :style="{ boxShadow: value }">
 *     Card with shadow
 *   </div>
 * </template>
 * ```
 */
export function useShadowToken(path: MaybeRefOrGetter<string>): ShadowTokenReturn {
  const { getToken } = useDesignTokens();

  const token = computed<Token<'shadow'> | undefined>(() => {
    const t = getToken(toValue(path));
    if (t && t.$type === 'shadow') {
      return t as Token<'shadow'>;
    }
    return undefined;
  });

  const layers = computed<ShadowValue[] | undefined>(() => {
    const t = token.value;
    if (!t) return undefined;

    const value = t.$value;

    // Handle token references
    if (typeof value === 'object' && '$ref' in value) {
      const refToken = getToken((value as { $ref: string }).$ref.replace(/[{}]/g, ''));
      if (refToken && refToken.$type === 'shadow') {
        const refValue = refToken.$value;
        if (Array.isArray(refValue)) {
          return refValue as ShadowValue[];
        }
        return [refValue as ShadowValue];
      }
      return undefined;
    }

    // Handle array of shadows or single shadow
    if (Array.isArray(value)) {
      return value as ShadowValue[];
    }

    return [value as ShadowValue];
  });

  const value = computed<string | undefined>(() => {
    const shadowLayers = layers.value;
    if (!shadowLayers || shadowLayers.length === 0) return undefined;

    return shadowLayers.map(shadowToString).join(', ');
  });

  const exists = computed(() => token.value !== undefined);

  return {
    token,
    value,
    layers,
    exists,
  };
}
