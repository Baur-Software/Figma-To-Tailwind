/**
 * useColorToken composable
 *
 * Provides reactive access to color design tokens.
 * Automatically formats the color value for CSS use.
 */

import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue';
import { useDesignTokens } from './useDesignTokens';
import type { ColorValue, Token } from '@baur-software/figma-to';

export interface ColorTokenReturn {
  /**
   * The raw token object (undefined if not found)
   */
  token: ComputedRef<Token<'color'> | undefined>;

  /**
   * The color value as a CSS string
   * Format depends on module configuration (oklch, hex, rgb, hsl)
   */
  value: ComputedRef<string | undefined>;

  /**
   * The color value as RGBA object
   */
  rgba: ComputedRef<ColorValue | undefined>;

  /**
   * The color value as hex string
   */
  hex: ComputedRef<string | undefined>;

  /**
   * The color value as oklch string
   */
  oklch: ComputedRef<string | undefined>;

  /**
   * Whether the token exists
   */
  exists: ComputedRef<boolean>;
}

/**
 * Convert RGBA (0-1 range) to hex
 */
function rgbaToHex(color: ColorValue): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  if (color.a < 1) {
    const a = Math.round(color.a * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
  }

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Convert RGBA to OKLCH
 * Note: This is a simplified conversion. For production, consider using a color library.
 */
function rgbaToOklch(color: ColorValue): string {
  // Convert to linear RGB
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lr = toLinear(color.r);
  const lg = toLinear(color.g);
  const lb = toLinear(color.b);

  // Convert to XYZ
  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb;
  const z = 0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb;

  // Convert to Oklab
  const l_ = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
  const m_ = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
  const s_ = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.633851707 * z);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  // Convert to OKLCH
  const C = Math.sqrt(a * a + b * b);
  let H = Math.atan2(b, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  const lightness = (L * 100).toFixed(2);
  const chroma = C.toFixed(4);
  const hue = H.toFixed(2);

  if (color.a < 1) {
    return `oklch(${lightness}% ${chroma} ${hue} / ${color.a.toFixed(2)})`;
  }

  return `oklch(${lightness}% ${chroma} ${hue})`;
}

/**
 * Get a color design token reactively
 *
 * @param path - The token path (can be a ref or getter for reactivity)
 *
 * @example
 * ```vue
 * <script setup>
 * const { value, hex, oklch } = useColorToken('colors.primary.500')
 *
 * // With reactive path
 * const colorName = ref('primary')
 * const { value } = useColorToken(() => `colors.${colorName.value}.500`)
 * </script>
 *
 * <template>
 *   <div :style="{ backgroundColor: value }">
 *     Primary color
 *   </div>
 * </template>
 * ```
 */
export function useColorToken(path: MaybeRefOrGetter<string>): ColorTokenReturn {
  const { getToken } = useDesignTokens();

  const token = computed<Token<'color'> | undefined>(() => {
    const t = getToken(toValue(path));
    if (t && t.$type === 'color') {
      return t as Token<'color'>;
    }
    return undefined;
  });

  const rgba = computed<ColorValue | undefined>(() => {
    const t = token.value;
    if (!t) return undefined;

    // Handle token references
    const value = t.$value;
    if (typeof value === 'object' && '$ref' in value) {
      // Resolve the reference
      const refToken = getToken((value as { $ref: string }).$ref.replace(/[{}]/g, ''));
      if (refToken && refToken.$type === 'color') {
        return refToken.$value as ColorValue;
      }
      return undefined;
    }

    return value as ColorValue;
  });

  const hex = computed<string | undefined>(() => {
    const color = rgba.value;
    if (!color) return undefined;
    return rgbaToHex(color);
  });

  const oklch = computed<string | undefined>(() => {
    const color = rgba.value;
    if (!color) return undefined;
    return rgbaToOklch(color);
  });

  const value = computed<string | undefined>(() => {
    // Return oklch by default (modern CSS)
    return oklch.value;
  });

  const exists = computed(() => token.value !== undefined);

  return {
    token,
    value,
    rgba,
    hex,
    oklch,
    exists,
  };
}
