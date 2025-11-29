/**
 * CSS Input Adapter E2E Tests
 */

import { test, expect } from '@playwright/test';
import {
  createCSSAdapter,
  extractVariables,
  detectTokenType,
  parseColor,
  parseDimension,
  parseDuration,
  parseFontFamily,
  variableToPath,
  tokensToGroup,
} from '../../src/adapters/input/css/index.js';

// =============================================================================
// Test CSS Fixtures
// =============================================================================

const basicRootCSS = `
:root {
  --color-primary: #3880f6;
  --color-secondary: #3cd6af;
  --spacing-4: 16px;
  --font-family-sans: "Inter", sans-serif;
}
`;

const tailwindThemeCSS = `
@theme {
  --color-primary-500: oklch(59.15% 0.1895 262.47);
  --color-secondary-500: oklch(78.23% 0.1342 168.91);
  --spacing-1: 4px;
  --spacing-2: 8px;
  --radius-sm: 4px;
}
`;

const darkModeCSS = `
:root {
  --color-background: #ffffff;
  --color-text: #000000;
}

.dark {
  --color-background: #1a1a1a;
  --color-text: #ffffff;
}
`;

const dataThemeDarkCSS = `
:root {
  --color-primary: #3880f6;
}

[data-theme="dark"] {
  --color-primary: #4c8df7;
}
`;

const mediaQueryDarkCSS = `
:root {
  --color-bg: white;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: black;
  }
}
`;

const complexCSS = `
@theme {
  /* Colors */
  --color-primary-500: oklch(59.15% 0.1895 262.47);
  --color-success: #22c55e;

  /* Spacing */
  --spacing-4: 16px;
  --spacing-8: 32px;

  /* Typography */
  --font-family-sans: "Inter", "Helvetica", sans-serif;
  --font-weight-bold: 700;

  /* Dimensions */
  --radius-md: 8px;
  --radius-lg: 16px;
}

:root {
  --ion-color-primary: #3880f6;
  --ion-color-primary-rgb: 56, 128, 246;
}

.dark {
  --color-primary-500: oklch(70% 0.15 260);
}
`;

// =============================================================================
// Adapter Tests
// =============================================================================

test.describe('CSS Input Adapter', () => {
  test.describe('Adapter Creation', () => {
    test('createCSSAdapter creates adapter instance', async () => {
      const adapter = createCSSAdapter();
      expect(adapter.id).toBe('css');
      expect(adapter.name).toBe('CSS Input Adapter');
    });
  });

  test.describe('Validation', () => {
    test('rejects empty input', async () => {
      const adapter = createCSSAdapter();
      const result = await adapter.validate({ css: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CSS content is empty');
    });

    test('rejects missing css property', async () => {
      const adapter = createCSSAdapter();
      const result = await adapter.validate({} as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CSS content is required');
    });

    test('accepts valid CSS', async () => {
      const adapter = createCSSAdapter();
      const result = await adapter.validate({ css: basicRootCSS });
      expect(result.valid).toBe(true);
    });
  });

  test.describe('Parsing', () => {
    test('parses :root variables', async () => {
      const adapter = createCSSAdapter();
      const theme = await adapter.parse({ css: basicRootCSS });

      expect(theme.name).toBe('CSS Theme');
      expect(theme.collections).toHaveLength(1);
      expect(theme.collections[0].modes).toContain('default');
    });

    test('parses @theme blocks', async () => {
      const adapter = createCSSAdapter();
      const theme = await adapter.parse({ css: tailwindThemeCSS });

      const collection = theme.collections[0];
      expect(collection.tokens['default']).toBeDefined();
    });

    test('detects dark mode from .dark selector', async () => {
      const adapter = createCSSAdapter();
      const theme = await adapter.parse({ css: darkModeCSS });

      const collection = theme.collections[0];
      expect(collection.modes).toContain('default');
      expect(collection.modes).toContain('dark');
    });

    test('detects dark mode from [data-theme="dark"]', async () => {
      const adapter = createCSSAdapter();
      const theme = await adapter.parse({ css: dataThemeDarkCSS });

      const collection = theme.collections[0];
      expect(collection.modes).toContain('dark');
    });

    test('custom collection name', async () => {
      const adapter = createCSSAdapter();
      const theme = await adapter.parse({
        css: basicRootCSS,
        options: { collectionName: 'Brand Colors' },
      });

      expect(theme.collections[0].name).toBe('Brand Colors');
    });

    test('custom file name', async () => {
      const adapter = createCSSAdapter();
      const theme = await adapter.parse({
        css: basicRootCSS,
        fileName: 'design-tokens.css',
      });

      expect(theme.name).toBe('design-tokens.css');
    });
  });
});

// =============================================================================
// Parser Tests
// =============================================================================

test.describe('CSS Parser', () => {
  test.describe('extractVariables', () => {
    test('extracts :root variables', async () => {
      const vars = extractVariables(basicRootCSS);
      expect(vars.length).toBeGreaterThan(0);
      expect(vars.some(v => v.name === 'color-primary')).toBe(true);
      expect(vars.some(v => v.context === ':root')).toBe(true);
    });

    test('extracts @theme variables', async () => {
      const vars = extractVariables(tailwindThemeCSS);
      expect(vars.some(v => v.context === '@theme')).toBe(true);
      expect(vars.some(v => v.name === 'color-primary-500')).toBe(true);
    });

    test('extracts .dark variables', async () => {
      const vars = extractVariables(darkModeCSS);
      expect(vars.some(v => v.context === '.dark')).toBe(true);
    });

    test('can disable :root parsing', async () => {
      const vars = extractVariables(darkModeCSS, { parseRootVariables: false });
      expect(vars.every(v => v.context !== ':root')).toBe(true);
    });

    test('can disable dark mode parsing', async () => {
      const vars = extractVariables(darkModeCSS, { parseDarkMode: false });
      expect(vars.every(v => v.context === ':root')).toBe(true);
    });
  });

  test.describe('detectTokenType', () => {
    test('detects hex colors', async () => {
      expect(detectTokenType('#3880f6')).toBe('color');
      expect(detectTokenType('#fff')).toBe('color');
      expect(detectTokenType('#ffffff80')).toBe('color');
    });

    test('detects rgb/rgba colors', async () => {
      expect(detectTokenType('rgb(255, 0, 0)')).toBe('color');
      expect(detectTokenType('rgba(255, 0, 0, 0.5)')).toBe('color');
    });

    test('detects oklch colors', async () => {
      expect(detectTokenType('oklch(59.15% 0.1895 262.47)')).toBe('color');
    });

    test('detects hsl/hsla colors', async () => {
      expect(detectTokenType('hsl(220, 90%, 56%)')).toBe('color');
      expect(detectTokenType('hsla(220, 90%, 56%, 0.8)')).toBe('color');
    });

    test('detects dimensions', async () => {
      expect(detectTokenType('16px')).toBe('dimension');
      expect(detectTokenType('1.5rem')).toBe('dimension');
      expect(detectTokenType('100%')).toBe('dimension');
      expect(detectTokenType('50vh')).toBe('dimension');
    });

    test('detects durations', async () => {
      expect(detectTokenType('300ms')).toBe('duration');
      expect(detectTokenType('0.3s')).toBe('duration');
    });

    test('detects font families', async () => {
      expect(detectTokenType('"Inter", sans-serif')).toBe('fontFamily');
    });

    test('detects font weights', async () => {
      expect(detectTokenType('700')).toBe('fontWeight');
      expect(detectTokenType('bold')).toBe('fontWeight');
    });

    test('detects numbers', async () => {
      expect(detectTokenType('1.5')).toBe('number');
      expect(detectTokenType('42')).toBe('number');
    });

    test('defaults to string', async () => {
      expect(detectTokenType('some-value')).toBe('string');
    });
  });
});

// =============================================================================
// Color Parsing Tests
// =============================================================================

test.describe('Color Parsing', () => {
  test('parses hex colors', async () => {
    const color = parseColor('#3880f6');
    expect(color.r).toBeCloseTo(0.22, 1);
    expect(color.g).toBeCloseTo(0.5, 1);
    expect(color.b).toBeCloseTo(0.96, 1);
    expect(color.a).toBe(1);
  });

  test('parses short hex colors', async () => {
    const color = parseColor('#fff');
    expect(color.r).toBe(1);
    expect(color.g).toBe(1);
    expect(color.b).toBe(1);
  });

  test('parses hex with alpha', async () => {
    const color = parseColor('#ffffff80');
    expect(color.a).toBeCloseTo(0.5, 1);
  });

  test('parses rgb colors', async () => {
    const color = parseColor('rgb(255, 128, 0)');
    expect(color.r).toBe(1);
    expect(color.g).toBeCloseTo(0.5, 1);
    expect(color.b).toBe(0);
  });

  test('parses rgba colors', async () => {
    const color = parseColor('rgba(255, 0, 0, 0.5)');
    expect(color.r).toBe(1);
    expect(color.g).toBe(0);
    expect(color.b).toBe(0);
    expect(color.a).toBe(0.5);
  });

  test('parses hsl colors', async () => {
    const color = parseColor('hsl(0, 100%, 50%)');
    expect(color.r).toBeCloseTo(1, 1);
    expect(color.g).toBeCloseTo(0, 1);
    expect(color.b).toBeCloseTo(0, 1);
  });

  test('parses named colors', async () => {
    expect(parseColor('black')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseColor('white')).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    expect(parseColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });
});

// =============================================================================
// Dimension/Duration Parsing Tests
// =============================================================================

test.describe('Dimension Parsing', () => {
  test('parses pixel values', async () => {
    const dim = parseDimension('16px');
    expect(dim.value).toBe(16);
    expect(dim.unit).toBe('px');
  });

  test('parses rem values', async () => {
    const dim = parseDimension('1.5rem');
    expect(dim.value).toBe(1.5);
    expect(dim.unit).toBe('rem');
  });

  test('parses percentage values', async () => {
    const dim = parseDimension('50%');
    expect(dim.value).toBe(50);
    expect(dim.unit).toBe('%');
  });

  test('parses negative values', async () => {
    const dim = parseDimension('-8px');
    expect(dim.value).toBe(-8);
  });
});

test.describe('Duration Parsing', () => {
  test('parses milliseconds', async () => {
    const dur = parseDuration('300ms');
    expect(dur.value).toBe(300);
    expect(dur.unit).toBe('ms');
  });

  test('parses seconds', async () => {
    const dur = parseDuration('0.3s');
    expect(dur.value).toBe(0.3);
    expect(dur.unit).toBe('s');
  });
});

// =============================================================================
// Font Family Parsing Tests
// =============================================================================

test.describe('Font Family Parsing', () => {
  test('parses comma-separated families', async () => {
    const families = parseFontFamily('"Inter", "Helvetica", sans-serif');
    expect(families).toEqual(['Inter', 'Helvetica', 'sans-serif']);
  });

  test('strips quotes', async () => {
    const families = parseFontFamily("'Open Sans', Arial");
    expect(families).toEqual(['Open Sans', 'Arial']);
  });
});

// =============================================================================
// Variable to Path Tests
// =============================================================================

test.describe('Variable to Path', () => {
  test('converts dashes to slashes', async () => {
    expect(variableToPath('color-primary-500')).toBe('color/primary/500');
  });

  test('handles Tailwind conventions', async () => {
    expect(variableToPath('font-family-sans')).toBe('fontFamily/sans');
    expect(variableToPath('font-size-lg')).toBe('fontSize/lg');
    expect(variableToPath('font-weight-bold')).toBe('fontWeight/bold');
  });

  test('strips prefix when specified', async () => {
    expect(variableToPath('ion-color-primary', 'ion-')).toBe('color/primary');
  });
});

// =============================================================================
// Token Group Building Tests
// =============================================================================

test.describe('Tokens to Group', () => {
  test('builds nested structure from paths', async () => {
    const tokens = [
      { path: 'color/primary/500', type: 'color' as const, value: { r: 0, g: 0, b: 1, a: 1 }, originalName: 'color-primary-500' },
      { path: 'color/primary/600', type: 'color' as const, value: { r: 0, g: 0, b: 0.8, a: 1 }, originalName: 'color-primary-600' },
      { path: 'spacing/4', type: 'dimension' as const, value: { value: 16, unit: 'px' }, originalName: 'spacing-4' },
    ];

    const group = tokensToGroup(tokens);

    expect(group.color).toBeDefined();
    expect((group.color as any).primary).toBeDefined();
    expect((group.color as any).primary['500'].$type).toBe('color');
    expect(group.spacing).toBeDefined();
    expect((group.spacing as any)['4'].$value).toEqual({ value: 16, unit: 'px' });
  });
});

// =============================================================================
// Full Integration Tests
// =============================================================================

test.describe('Full Integration', () => {
  test('parses complex CSS with multiple contexts', async () => {
    const adapter = createCSSAdapter();
    const theme = await adapter.parse({ css: complexCSS });

    expect(theme.collections).toHaveLength(1);
    const collection = theme.collections[0];

    // Should have default and dark modes
    expect(collection.modes).toContain('default');
    expect(collection.modes).toContain('dark');

    // Check default mode tokens exist
    const defaultTokens = collection.tokens['default'];
    expect(defaultTokens.color).toBeDefined();
    expect(defaultTokens.spacing).toBeDefined();
  });

  test('round-trip: CSS parsed correctly builds valid theme', async () => {
    const adapter = createCSSAdapter();
    const theme = await adapter.parse({ css: basicRootCSS });

    // Verify structure
    expect(theme.$schema).toBeDefined();
    expect(theme.collections[0].tokens['default']).toBeDefined();
    expect(theme.meta?.source).toBe('manual');
  });
});
