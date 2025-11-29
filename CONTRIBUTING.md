# Contributing

Thanks for your interest in contributing to `@baur-software/figma-to`!

## Getting Started

```bash
# Clone the repository
git clone git@github.com:Baur-Software/Figma-To.git
cd Figma-To

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm run test:e2e
```

## Project Structure

```text
src/
├── schema/           # Type definitions
│   ├── tokens.ts     # Normalized token schema (W3C DTCG aligned)
│   ├── figma.ts      # Figma API types (re-exports @figma/rest-api-spec)
│   ├── ionic.ts      # Ionic theme types
│   └── tailwind.ts   # Tailwind output types
├── adapters/
│   ├── figma/        # Input adapter: Figma → normalized tokens
│   └── tailwind-ionic/  # Output adapter: tokens → CSS
└── index.ts          # Public API exports

tests/
└── e2e/              # Playwright E2E tests
    └── fixtures/     # Mock data for testing
```

## Architecture: The Adapter Pattern

The library uses an adapter pattern to separate concerns:

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Input Source   │ ──▶ │ Normalized Theme │ ──▶ │  Output Format  │
│  (Figma, etc.)  │     │    (ThemeFile)   │     │  (CSS, etc.)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
    InputAdapter            ThemeFile             OutputAdapter
```

This design allows:

- Adding new input sources without changing output logic
- Adding new output formats without changing input parsing
- Testing each adapter independently

## Implementing an Input Adapter

Input adapters convert external design tool data into the normalized `ThemeFile` format.

### Step 1: Define Your Input Type

```typescript
// src/adapters/tokens-studio/types.ts
export interface TokensStudioInput {
  tokens: Record<string, TokensStudioToken>;
  // ... other fields from Tokens Studio format
}
```

### Step 2: Create the Adapter

```typescript
// src/adapters/tokens-studio/adapter.ts
import type { InputAdapter, ThemeFile } from '../../schema';
import type { TokensStudioInput } from './types';

export class TokensStudioAdapter implements InputAdapter<TokensStudioInput> {
  /**
   * Validate the input data before parsing
   */
  async validate(source: TokensStudioInput): Promise<{
    valid: boolean;
    errors?: string[];
  }> {
    const errors: string[] = [];

    if (!source.tokens) {
      errors.push('Missing tokens object');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Parse input into normalized ThemeFile
   */
  async parse(source: TokensStudioInput): Promise<ThemeFile> {
    const validation = await this.validate(source);
    if (!validation.valid) {
      throw new Error(`Invalid input: ${validation.errors?.join(', ')}`);
    }

    return {
      name: 'Tokens Studio Theme',
      collections: this.parseCollections(source.tokens),
      meta: {
        source: 'tokens-studio',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private parseCollections(tokens: Record<string, unknown>): TokenCollection[] {
    // Convert Tokens Studio structure to TokenCollection[]
    // ...
  }
}

// Factory function for cleaner API
export function createTokensStudioAdapter(): TokensStudioAdapter {
  return new TokensStudioAdapter();
}
```

### Step 3: Export from Index

```typescript
// src/adapters/tokens-studio/index.ts
export { TokensStudioAdapter, createTokensStudioAdapter } from './adapter';
export type { TokensStudioInput } from './types';
```

### Step 4: Add to Main Exports

```typescript
// src/index.ts
export {
  createTokensStudioAdapter,
  type TokensStudioInput,
} from './adapters/tokens-studio';
```

## Implementing an Output Adapter

Output adapters convert the normalized `ThemeFile` into specific output formats.

### Step 1: Define Your Output Type

```typescript
// src/adapters/scss/types.ts
export interface ScssOutput {
  variables: string;      // $color-primary: #3880f6;
  maps: string;           // $colors: (primary: #3880f6, ...);
  mixins: string;         // @mixin theme-colors { ... }
  files: Record<string, string>;
}

export interface ScssOptions {
  prefix?: string;
  generateMaps?: boolean;
  generateMixins?: boolean;
}
```

### Step 2: Create the Adapter

```typescript
// src/adapters/scss/adapter.ts
import type { OutputAdapter, ThemeFile } from '../../schema';
import type { ScssOutput, ScssOptions } from './types';

export class ScssAdapter implements OutputAdapter<ScssOutput, ScssOptions> {
  /**
   * Transform normalized theme into SCSS output
   */
  async transform(
    theme: ThemeFile,
    options?: ScssOptions
  ): Promise<ScssOutput> {
    const variables = this.generateVariables(theme, options);
    const maps = options?.generateMaps
      ? this.generateMaps(theme, options)
      : '';
    const mixins = options?.generateMixins
      ? this.generateMixins(theme, options)
      : '';

    return {
      variables,
      maps,
      mixins,
      files: {
        '_variables.scss': variables,
        '_maps.scss': maps,
        '_mixins.scss': mixins,
        '_theme.scss': [variables, maps, mixins].filter(Boolean).join('\n\n'),
      },
    };
  }

  private generateVariables(theme: ThemeFile, options?: ScssOptions): string {
    const prefix = options?.prefix ?? '';
    const lines: string[] = ['// Generated SCSS Variables'];

    for (const collection of theme.collections) {
      const tokens = collection.tokens[collection.defaultMode];
      // Recursively process tokens...
      this.processTokens(tokens, prefix, lines);
    }

    return lines.join('\n');
  }

  private processTokens(
    tokens: Record<string, unknown>,
    prefix: string,
    lines: string[]
  ): void {
    // Convert tokens to SCSS variable declarations
    // $prefix-name: value;
  }

  private generateMaps(theme: ThemeFile, options?: ScssOptions): string {
    // Generate SCSS maps like $colors: (primary: $color-primary, ...)
  }

  private generateMixins(theme: ThemeFile, options?: ScssOptions): string {
    // Generate useful mixins
  }
}

export function createScssAdapter(): ScssAdapter {
  return new ScssAdapter();
}
```

### Step 3: Add Tests

```typescript
// tests/e2e/scss-output.spec.ts
import { test, expect } from '@playwright/test';
import { createFigmaAdapter } from '../../dist/adapters/figma/index.js';
import { createScssAdapter } from '../../dist/adapters/scss/index.js';
import { mockFigmaVariablesResponse } from './fixtures/figma-variables.js';

test.describe('SCSS Output Adapter', () => {
  test('generates SCSS variables', async () => {
    const figmaAdapter = createFigmaAdapter();
    const theme = await figmaAdapter.parse({
      variablesResponse: mockFigmaVariablesResponse,
    });

    const scssAdapter = createScssAdapter();
    const output = await scssAdapter.transform(theme);

    expect(output.variables).toContain('$color-primary');
    expect(output.files['_variables.scss']).toBeTruthy();
  });

  test('generates SCSS maps when enabled', async () => {
    // ...
  });
});
```

## The Normalized Token Schema

All adapters work with the `ThemeFile` format defined in `src/schema/tokens.ts`:

```typescript
interface ThemeFile {
  name: string;
  collections: TokenCollection[];
  meta?: {
    source?: string;
    figmaFileKey?: string;
    lastSynced?: string;
    generatedAt?: string;
  };
}

interface TokenCollection {
  name: string;
  modes: string[];           // ['Light', 'Dark']
  defaultMode: string;       // 'Light'
  tokens: Record<string, TokenGroup>;  // tokens per mode
}

interface Token {
  $type: TokenType;          // 'color' | 'dimension' | 'fontFamily' | ...
  $value: TokenValue;        // The actual value
  $description?: string;
  $extensions?: {
    'com.figma'?: FigmaExtensions;
    'com.ionic'?: IonicExtensions;
  };
}
```

### Token Types

| Type | $value Format | Example |
|------|---------------|---------|
| `color` | `{ r, g, b, a }` (0-1) | `{ r: 0.22, g: 0.50, b: 0.96, a: 1 }` |
| `dimension` | `{ value, unit }` | `{ value: 16, unit: 'px' }` |
| `fontFamily` | `string[]` | `['Inter', 'sans-serif']` |
| `fontWeight` | `number` | `700` |
| `string` | `string` | `'Inter'` |

### Token References

Tokens can reference other tokens:

```typescript
{
  $type: 'color',
  $value: {
    $ref: 'colors.primary.500'  // Reference path
  }
}
```

## Code Style

- TypeScript strict mode
- Explicit return types on public functions
- JSDoc comments on exported items
- Prefer `interface` over `type` for object shapes
- Use factory functions (`createXxxAdapter()`) for instantiation

## Testing

We use Playwright for E2E tests that validate the full pipeline:

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/scss-output.spec.ts

# Run with UI
npx playwright test --ui
```

### Test Structure

```typescript
test.describe('Adapter Name', () => {
  // Setup: parse mock data once
  let theme: ThemeFile;

  test.beforeAll(async () => {
    const figmaAdapter = createFigmaAdapter();
    theme = await figmaAdapter.parse({
      variablesResponse: mockFigmaVariablesResponse,
    });
  });

  test('does something specific', async () => {
    const adapter = createYourAdapter();
    const output = await adapter.transform(theme);

    expect(output.someProperty).toBe(expectedValue);
  });
});
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/tokens-studio-adapter`
3. Make your changes with tests
4. Run the full test suite: `npm run test:e2e`
5. Commit with a descriptive message
6. Open a Pull Request

### Commit Message Format

```text
feat(adapters): add Tokens Studio input adapter

- Parse Tokens Studio JSON format
- Support nested token groups
- Handle token references
```

Prefixes: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`

## Questions?

Open an issue on [GitHub](https://github.com/Baur-Software/Figma-To/issues) or start a discussion.
