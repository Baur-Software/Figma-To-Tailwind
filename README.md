# @baur-software/figma-to

Transform Figma design tokens to any framework via adapters.

This library bridges **Figma's MCP server** and **REST API** with your frontend stack through a pluggable adapter architecture.

## Current Adapters

### Input Adapters

- **Figma** - Parse Figma REST API and MCP server responses

### Output Adapters

- **Tailwind/Ionic** - Generate production-ready CSS for:
  - **Tailwind CSS v4** (`@theme` directive with CSS variables)
  - **Ionic Framework** (CSS custom properties with color variants)
  - **SolidJS / Capacitor** applications

## Why This Library?

**Keep your design and code in sync automatically.**

Traditionally, when designers update colors, spacing, or typography in Figma, developers manually copy those values into code. This creates drift, inconsistencies, and wasted time.

With `@baur-software/figma-to`, you can:

- **Eliminate manual token translation** - Figma variables become CSS automatically
- **Stay in sync with design changes** - Re-run the generator whenever Figma updates
- **Use AI-assisted workflows** - With Figma's MCP server, Claude can read your design tokens and generate theme CSS in one conversation
- **Support multiple modes** - Light/dark themes from Figma variable modes, no manual duplication
- **Get framework-ready output** - Ionic color variants (shade, tint, contrast, RGB) generated automatically

### The Workflow

```text
Figma Variables  →  This Library  →  Production CSS
     ↓                   ↓                 ↓
  Designer            Automated        Developer
  updates             sync             ships
  tokens              script           features
```

**Without this library:** Designer changes primary color → Slack message → Developer searches codebase → Updates 5 files → Hopes nothing was missed

**With this library:** Designer changes primary color → CI runs sync script → PR with all CSS updated → Ship it

### AI-Powered Design Sync

When using Claude with the [Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server), just ask:

```text
You: "Get the design tokens from my Figma file and generate theme CSS"
```

Claude will:

1. Use `get_variable_defs` to fetch your Figma variables
2. Use this library to transform them into Tailwind/Ionic CSS
3. Write the CSS files to your project

No scripts to maintain - the library handles `Font()` and `Effect()` strings from MCP automatically.

## Installation

```bash
npm install @baur-software/figma-to
```

## CLI

Quickly sync your Figma design tokens to CSS:

```bash
# Using npx
npx @baur-software/figma-to sync --file YOUR_FIGMA_FILE_KEY --output ./src/theme

# Or install globally
npm install -g @baur-software/figma-to
figma-to sync --file YOUR_FIGMA_FILE_KEY --output ./src/theme
```

Set your Figma token:

```bash
export FIGMA_TOKEN=your_figma_token
```

## Quick Start

```typescript
import { figmaToTailwind } from '@baur-software/figma-to';

// From Figma REST API response
const output = await figmaToTailwind({
  variablesResponse: figmaApiResponse,
});

// Write the generated CSS
fs.writeFileSync('theme.css', output.css);
```

## Usage

### From Figma MCP Server

When using the [Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server) with Claude or other AI assistants:

```typescript
import { figmaToTailwind } from '@baur-software/figma-to';

// From MCP get_variable_defs tool
const output = await figmaToTailwind({
  variableDefs: mcpVariables,  // { "Color/Primary/500": "#3880f6", ... }
  fileName: 'My Design System',
});

console.log(output.css);
```

The library also supports the full MCP response format:

```typescript
// MCP server response from get_figma_data tool
const output = await figmaToTailwind({
  mcpData: mcpResponse,
});
```

### From Figma REST API

```typescript
import { figmaToTailwind } from '@baur-software/figma-to';

// Fetch variables from Figma API
const response = await fetch(
  `https://api.figma.com/v1/files/${fileKey}/variables/local`,
  { headers: { 'X-Figma-Token': token } }
);
const variablesResponse = await response.json();

const output = await figmaToTailwind({
  variablesResponse,
  fileKey,
});
```

### Two-Step Workflow

For more control, separate parsing and generation:

```typescript
import { parseTheme, generateOutput } from '@baur-software/figma-to';

// Step 1: Parse Figma data to normalized theme
const theme = await parseTheme({
  variablesResponse: figmaApiResponse,
});

// Inspect or modify the theme
console.log(theme.collections.map(c => c.name));

// Step 2: Generate output with custom options
const output = await generateOutput(theme, {
  tailwind: { colorFormat: 'oklch' },
  framework: 'solidjs',
});
```

### Using Adapters Directly

```typescript
import {
  createFigmaAdapter,
  createTailwindIonicAdapter,
} from '@baur-software/figma-to';

const figmaAdapter = createFigmaAdapter();
const theme = await figmaAdapter.parse({ variablesResponse });

const outputAdapter = createTailwindIonicAdapter();
const output = await outputAdapter.transform(theme, options);
```

## Output Structure

```typescript
const output = await figmaToTailwind({ variablesResponse });

// Combined CSS with all sections
output.css;

// Tailwind CSS v4 output
output.tailwind.themeCss;      // @theme { ... } block
output.tailwind.darkModeCss;   // Dark mode overrides
output.tailwind.variables;     // Array of { name, value, comment }

// Ionic output
output.ionic.css;              // :root { --ion-color-* } + .ion-color-* classes
output.ionic.theme;            // Structured theme object

// Separate files for different use cases
output.files['tailwind-theme.css'];  // Just Tailwind
output.files['ionic-theme.css'];     // Just Ionic
output.files['variables.css'];       // Pure CSS variables
```

## Options

```typescript
const output = await figmaToTailwind(input, {
  // Select specific mode (default: uses collection's default mode)
  mode: 'Dark',

  // Target framework for additional CSS
  framework: 'solidjs', // 'solidjs' | 'react' | 'vue' | 'angular'

  // Generate dark mode CSS
  darkMode: true,

  // Tailwind-specific options
  tailwind: {
    colorFormat: 'oklch',    // 'oklch' | 'hex'
    includeComments: true,
    ionicIntegration: true,
    prefix: '',
  },

  // Ionic-specific options
  ionic: {
    includeColorClasses: true,
  },

  // Output formatting
  format: {
    comments: true,
    minify: false,
  },
});
```

## Generated CSS Examples

### Tailwind CSS v4 (`@theme`)

```css
@theme {
  /* color */
  --color-primary-500: oklch(59.15% 0.1895 262.47);
  --color-secondary-500: oklch(78.23% 0.1342 168.91);
  --color-success: oklch(67.84% 0.1756 149.23);

  /* spacing */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-4: 16px;

  /* font-family */
  --font-family-sans: "Inter", sans-serif;

  /* radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
}
```

### Ionic Theme

```css
:root {
  --ion-color-primary: #3880f6;
  --ion-color-primary-rgb: 56, 128, 246;
  --ion-color-primary-contrast: #ffffff;
  --ion-color-primary-contrast-rgb: 255, 255, 255;
  --ion-color-primary-shade: #3171d8;
  --ion-color-primary-tint: #4c8df7;

  --ion-color-secondary: #3cd6af;
  /* ... */
}

.ion-color-primary {
  --ion-color-base: var(--ion-color-primary);
  --ion-color-base-rgb: var(--ion-color-primary-rgb);
  --ion-color-contrast: var(--ion-color-primary-contrast);
  --ion-color-contrast-rgb: var(--ion-color-primary-contrast-rgb);
  --ion-color-shade: var(--ion-color-primary-shade);
  --ion-color-tint: var(--ion-color-primary-tint);
}
```

## Figma Variable Mapping

The library automatically maps your Figma variables to the appropriate output:

| Figma Variable Path | Tailwind Namespace | Ionic Color |
|---------------------|-------------------|-------------|
| `Colors/Primary/500` | `--color-primary-500` | `--ion-color-primary` |
| `Colors/Success` | `--color-success` | `--ion-color-success` |
| `Spacing/4` | `--spacing-4` | - |
| `Typography/Font Family` | `--font-family-*` | - |
| `Radius/Medium` | `--radius-md` | - |

### Ionic Color Detection

Colors are auto-mapped to Ionic's semantic colors based on naming:

- `primary`, `brand` → `--ion-color-primary`
- `secondary`, `accent` → `--ion-color-secondary`
- `success`, `green`, `positive` → `--ion-color-success`
- `warning`, `yellow`, `orange` → `--ion-color-warning`
- `danger`, `error`, `red` → `--ion-color-danger`
- `dark`, `gray-900`, `black` → `--ion-color-dark`
- `medium`, `gray-500` → `--ion-color-medium`
- `light`, `gray-100`, `white` → `--ion-color-light`

## TypeScript Types

The library exports all types from `@figma/rest-api-spec` plus custom types:

```typescript
import type {
  // Figma API types (from @figma/rest-api-spec)
  LocalVariable,
  LocalVariableCollection,
  GetLocalVariablesResponse,
  RGBA,
  VariableAlias,
  VariableScope,

  // Normalized theme types
  ThemeFile,
  TokenCollection,
  Token,
  ColorValue,
  DimensionValue,

  // Output types
  TailwindThemeOutput,
  IonicTheme,
} from '@baur-software/figma-to';
```

## Integration with Ionic + SolidJS + Capacitor

```typescript
// generate-theme.ts
import { figmaToTailwind } from '@baur-software/figma-to';
import { writeFileSync } from 'fs';

async function generateTheme() {
  const response = await fetch(
    `https://api.figma.com/v1/files/${process.env.FIGMA_FILE_KEY}/variables/local`,
    { headers: { 'X-Figma-Token': process.env.FIGMA_TOKEN! } }
  );

  const output = await figmaToTailwind({
    variablesResponse: await response.json(),
  }, {
    framework: 'solidjs',
    darkMode: true,
  });

  // Write to your project
  writeFileSync('src/theme/variables.css', output.files['variables.css']);
  writeFileSync('src/theme/ionic.css', output.files['ionic-theme.css']);
  writeFileSync('src/theme/tailwind.css', output.files['tailwind-theme.css']);
}

generateTheme();
```

Then import in your app:

```css
/* src/index.css */
@import './theme/tailwind.css';
@import './theme/ionic.css';
@import "tailwindcss";
```

## API Reference

### `figmaToTailwind(input, options?)`

One-step conversion from Figma data to CSS output.

### `parseTheme(input)`

Parse Figma data into normalized `ThemeFile` format.

### `generateOutput(theme, options?)`

Generate CSS output from a normalized theme.

### `createFigmaAdapter()`

Create a Figma input adapter instance with `parse()` and `validate()` methods.

### `createTailwindIonicAdapter()`

Create a Tailwind/Ionic output adapter instance with `transform()` method.

## Requirements

- Node.js >= 20
- Tailwind CSS v4 (peer dependency)

## License

MIT
