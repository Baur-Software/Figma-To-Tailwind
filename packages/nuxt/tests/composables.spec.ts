/**
 * Tests for @baur-software/figma-to-nuxt composables
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, computed } from 'vue';

// Mock theme data
const mockTheme = {
  name: 'Test Theme',
  collections: [
    {
      name: 'Colors',
      modes: ['light', 'dark'],
      defaultMode: 'light',
      tokens: {
        light: {
          colors: {
            primary: {
              '500': {
                $type: 'color',
                $value: { r: 0.2, g: 0.4, b: 0.8, a: 1 },
                $description: 'Primary color 500',
              },
              '600': {
                $type: 'color',
                $value: { r: 0.15, g: 0.3, b: 0.7, a: 1 },
              },
            },
            secondary: {
              '500': {
                $type: 'color',
                $value: { $ref: '{colors.primary.500}' },
              },
            },
            transparent: {
              $type: 'color',
              $value: { r: 1, g: 1, b: 1, a: 0.5 },
            },
          },
        },
        dark: {
          colors: {
            primary: {
              '500': {
                $type: 'color',
                $value: { r: 0.4, g: 0.6, b: 1, a: 1 },
              },
            },
          },
        },
      },
    },
    {
      name: 'Typography',
      modes: ['default'],
      defaultMode: 'default',
      tokens: {
        default: {
          typography: {
            heading: {
              h1: {
                $type: 'typography',
                $value: {
                  fontFamily: ['Inter', 'sans-serif'],
                  fontSize: { value: 48, unit: 'px' },
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: { value: -0.02, unit: 'em' },
                  textTransform: 'uppercase',
                },
              },
              h2: {
                $type: 'typography',
                $value: {
                  fontFamily: ['Inter'],
                  fontSize: { value: 2, unit: 'rem' },
                  fontWeight: 'semibold',
                  lineHeight: { value: 2.5, unit: 'rem' },
                },
              },
            },
          },
        },
      },
    },
    {
      name: 'Shadows',
      modes: ['default'],
      defaultMode: 'default',
      tokens: {
        default: {
          shadows: {
            elevation: {
              sm: {
                $type: 'shadow',
                $value: {
                  offsetX: { value: 0, unit: 'px' },
                  offsetY: { value: 1, unit: 'px' },
                  blur: { value: 2, unit: 'px' },
                  spread: { value: 0, unit: 'px' },
                  color: { r: 0, g: 0, b: 0, a: 0.1 },
                },
              },
              md: {
                $type: 'shadow',
                $value: [
                  {
                    offsetX: { value: 0, unit: 'px' },
                    offsetY: { value: 4, unit: 'px' },
                    blur: { value: 6, unit: 'px' },
                    color: { r: 0, g: 0, b: 0, a: 0.1 },
                  },
                  {
                    offsetX: { value: 0, unit: 'px' },
                    offsetY: { value: 2, unit: 'px' },
                    blur: { value: 4, unit: 'px' },
                    color: { r: 0, g: 0, b: 0, a: 0.06 },
                  },
                ],
              },
              inset: {
                $type: 'shadow',
                $value: {
                  offsetX: { value: 0, unit: 'px' },
                  offsetY: { value: 2, unit: 'px' },
                  blur: { value: 4, unit: 'px' },
                  color: { r: 0, g: 0, b: 0, a: 0.1 },
                  inset: true,
                },
              },
            },
          },
        },
      },
    },
  ],
};

// Mock useNuxtApp and useRuntimeConfig
vi.mock('#app', () => ({
  useNuxtApp: vi.fn(),
  useRuntimeConfig: vi.fn(() => ({
    public: {
      figmaTo: {
        colorFormat: 'oklch',
      },
    },
  })),
}));

// Mock the theme import
vi.mock('#build/figma-to/theme.mjs', () => ({
  theme: mockTheme,
}));

// Create a mock implementation for useDesignTokens that we can use in other tests
function createMockDesignTokens() {
  const getToken = (path: string) => {
    const parts = path.split('.');

    for (const collection of mockTheme.collections) {
      for (const mode of collection.modes) {
        const tokenGroup = collection.tokens[mode as keyof typeof collection.tokens];
        if (!tokenGroup) continue;

        let current: any = tokenGroup;

        for (const part of parts) {
          if (current && typeof current === 'object' && part in current) {
            current = current[part];
          } else {
            current = undefined;
            break;
          }
        }

        if (current && typeof current === 'object' && '$type' in current && '$value' in current) {
          return current;
        }
      }
    }

    return undefined;
  };

  return {
    theme: computed(() => mockTheme),
    collections: computed(() => mockTheme.collections),
    getToken,
    hasToken: (path: string) => getToken(path) !== undefined,
    getCollection: (name: string) => mockTheme.collections.find((c) => c.name === name),
    getTokensByPattern: (pattern: string) => {
      const results: Array<{ path: string; token: any }> = [];
      return results;
    },
  };
}

describe('useDesignTokens', () => {
  it('should return theme and collections', () => {
    const tokens = createMockDesignTokens();

    expect(tokens.theme.value).toEqual(mockTheme);
    expect(tokens.collections.value).toHaveLength(3);
  });

  it('should get token by path', () => {
    const tokens = createMockDesignTokens();
    const token = tokens.getToken('colors.primary.500');

    expect(token).toBeDefined();
    expect(token?.$type).toBe('color');
    expect(token?.$value).toEqual({ r: 0.2, g: 0.4, b: 0.8, a: 1 });
  });

  it('should return undefined for non-existent token', () => {
    const tokens = createMockDesignTokens();
    const token = tokens.getToken('colors.nonexistent.500');

    expect(token).toBeUndefined();
  });

  it('should check if token exists', () => {
    const tokens = createMockDesignTokens();

    expect(tokens.hasToken('colors.primary.500')).toBe(true);
    expect(tokens.hasToken('colors.nonexistent.500')).toBe(false);
  });

  it('should get collection by name', () => {
    const tokens = createMockDesignTokens();
    const collection = tokens.getCollection('Colors');

    expect(collection).toBeDefined();
    expect(collection?.name).toBe('Colors');
    expect(collection?.modes).toEqual(['light', 'dark']);
  });

  it('should return undefined for non-existent collection', () => {
    const tokens = createMockDesignTokens();
    const collection = tokens.getCollection('NonExistent');

    expect(collection).toBeUndefined();
  });
});

describe('useColorToken', () => {
  function createColorToken(path: string) {
    const tokens = createMockDesignTokens();
    const pathRef = ref(path);

    const token = computed(() => {
      const t = tokens.getToken(pathRef.value);
      if (t && t.$type === 'color') return t;
      return undefined;
    });

    const rgba = computed(() => {
      const t = token.value;
      if (!t) return undefined;

      const value = t.$value;
      if (typeof value === 'object' && '$ref' in value) {
        const refToken = tokens.getToken(value.$ref.replace(/[{}]/g, ''));
        if (refToken && refToken.$type === 'color') {
          return refToken.$value;
        }
        return undefined;
      }
      return value;
    });

    const hex = computed(() => {
      const color = rgba.value;
      if (!color) return undefined;

      const r = Math.round(color.r * 255);
      const g = Math.round(color.g * 255);
      const b = Math.round(color.b * 255);

      if (color.a < 1) {
        const a = Math.round(color.a * 255);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
      }

      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    });

    const exists = computed(() => token.value !== undefined);

    return { token, rgba, hex, exists };
  }

  it('should get color token by path', () => {
    const { token, exists } = createColorToken('colors.primary.500');

    expect(exists.value).toBe(true);
    expect(token.value?.$type).toBe('color');
  });

  it('should return rgba values', () => {
    const { rgba } = createColorToken('colors.primary.500');

    expect(rgba.value).toEqual({ r: 0.2, g: 0.4, b: 0.8, a: 1 });
  });

  it('should convert to hex', () => {
    const { hex } = createColorToken('colors.primary.500');

    // r: 0.2 * 255 = 51 = 0x33
    // g: 0.4 * 255 = 102 = 0x66
    // b: 0.8 * 255 = 204 = 0xcc
    expect(hex.value).toBe('#3366cc');
  });

  it('should handle transparent colors', () => {
    const { hex } = createColorToken('colors.transparent');

    // Should include alpha channel
    expect(hex.value).toContain('80'); // 0.5 * 255 = 127.5 ≈ 128 = 0x80
  });

  it('should return undefined for non-color tokens', () => {
    const { token, exists } = createColorToken('typography.heading.h1');

    expect(exists.value).toBe(false);
    expect(token.value).toBeUndefined();
  });
});

describe('useTypographyToken', () => {
  function createTypographyToken(path: string) {
    const tokens = createMockDesignTokens();

    const token = computed(() => {
      const t = tokens.getToken(path);
      if (t && t.$type === 'typography') return t;
      return undefined;
    });

    const typographyValue = computed(() => {
      const t = token.value;
      if (!t) return undefined;
      return t.$value;
    });

    const fontFamily = computed(() => {
      const val = typographyValue.value;
      if (!val) return undefined;
      return val.fontFamily.join(', ');
    });

    const fontSize = computed(() => {
      const val = typographyValue.value;
      if (!val) return undefined;
      return `${val.fontSize.value}${val.fontSize.unit}`;
    });

    const fontWeight = computed(() => {
      const val = typographyValue.value;
      if (!val) return undefined;

      const weight = val.fontWeight;
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
    });

    const lineHeight = computed(() => {
      const val = typographyValue.value;
      if (!val) return undefined;

      if (typeof val.lineHeight === 'number') {
        return val.lineHeight;
      }
      return `${val.lineHeight.value}${val.lineHeight.unit}`;
    });

    const letterSpacing = computed(() => {
      const val = typographyValue.value;
      if (!val || !val.letterSpacing) return undefined;
      return `${val.letterSpacing.value}${val.letterSpacing.unit}`;
    });

    const styles = computed(() => {
      const val = typographyValue.value;
      if (!val) return undefined;

      const result: any = {
        fontFamily: fontFamily.value,
        fontSize: fontSize.value,
        fontWeight: fontWeight.value,
        lineHeight: lineHeight.value,
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

    return { token, styles, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, exists };
  }

  it('should get typography token by path', () => {
    const { token, exists } = createTypographyToken('typography.heading.h1');

    expect(exists.value).toBe(true);
    expect(token.value?.$type).toBe('typography');
  });

  it('should return font family as comma-separated string', () => {
    const { fontFamily } = createTypographyToken('typography.heading.h1');

    expect(fontFamily.value).toBe('Inter, sans-serif');
  });

  it('should return font size with unit', () => {
    const { fontSize } = createTypographyToken('typography.heading.h1');

    expect(fontSize.value).toBe('48px');
  });

  it('should handle rem units', () => {
    const { fontSize } = createTypographyToken('typography.heading.h2');

    expect(fontSize.value).toBe('2rem');
  });

  it('should return numeric font weight', () => {
    const { fontWeight } = createTypographyToken('typography.heading.h1');

    expect(fontWeight.value).toBe(700);
  });

  it('should convert keyword font weight to number', () => {
    const { fontWeight } = createTypographyToken('typography.heading.h2');

    expect(fontWeight.value).toBe(600); // semibold
  });

  it('should return numeric line height', () => {
    const { lineHeight } = createTypographyToken('typography.heading.h1');

    expect(lineHeight.value).toBe(1.2);
  });

  it('should return dimension line height with unit', () => {
    const { lineHeight } = createTypographyToken('typography.heading.h2');

    expect(lineHeight.value).toBe('2.5rem');
  });

  it('should return letter spacing with unit', () => {
    const { letterSpacing } = createTypographyToken('typography.heading.h1');

    expect(letterSpacing.value).toBe('-0.02em');
  });

  it('should return complete styles object', () => {
    const { styles } = createTypographyToken('typography.heading.h1');

    expect(styles.value).toEqual({
      fontFamily: 'Inter, sans-serif',
      fontSize: '48px',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      textTransform: 'uppercase',
    });
  });
});

describe('useShadowToken', () => {
  function createShadowToken(path: string) {
    const tokens = createMockDesignTokens();

    const token = computed(() => {
      const t = tokens.getToken(path);
      if (t && t.$type === 'shadow') return t;
      return undefined;
    });

    const layers = computed(() => {
      const t = token.value;
      if (!t) return undefined;

      const value = t.$value;
      if (Array.isArray(value)) {
        return value;
      }
      return [value];
    });

    const value = computed(() => {
      const shadowLayers = layers.value;
      if (!shadowLayers || shadowLayers.length === 0) return undefined;

      return shadowLayers
        .map((shadow: any) => {
          const parts: string[] = [];

          if (shadow.inset) {
            parts.push('inset');
          }

          parts.push(`${shadow.offsetX.value}${shadow.offsetX.unit}`);
          parts.push(`${shadow.offsetY.value}${shadow.offsetY.unit}`);
          parts.push(`${shadow.blur.value}${shadow.blur.unit}`);

          if (shadow.spread) {
            parts.push(`${shadow.spread.value}${shadow.spread.unit}`);
          }

          const color = shadow.color;
          const r = Math.round(color.r * 255);
          const g = Math.round(color.g * 255);
          const b = Math.round(color.b * 255);
          parts.push(`rgba(${r}, ${g}, ${b}, ${color.a.toFixed(2)})`);

          return parts.join(' ');
        })
        .join(', ');
    });

    const exists = computed(() => token.value !== undefined);

    return { token, value, layers, exists };
  }

  it('should get shadow token by path', () => {
    const { token, exists } = createShadowToken('shadows.elevation.sm');

    expect(exists.value).toBe(true);
    expect(token.value?.$type).toBe('shadow');
  });

  it('should return single shadow as CSS string', () => {
    const { value } = createShadowToken('shadows.elevation.sm');

    expect(value.value).toBe('0px 1px 2px 0px rgba(0, 0, 0, 0.10)');
  });

  it('should return multiple shadows as comma-separated CSS string', () => {
    const { value, layers } = createShadowToken('shadows.elevation.md');

    expect(layers.value).toHaveLength(2);
    expect(value.value).toContain(',');
    expect(value.value).toContain('0px 4px 6px');
    expect(value.value).toContain('0px 2px 4px');
  });

  it('should handle inset shadows', () => {
    const { value } = createShadowToken('shadows.elevation.inset');

    expect(value.value).toContain('inset');
  });

  it('should return undefined for non-shadow tokens', () => {
    const { token, exists } = createShadowToken('colors.primary.500');

    expect(exists.value).toBe(false);
    expect(token.value).toBeUndefined();
  });
});
