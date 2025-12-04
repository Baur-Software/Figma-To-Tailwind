# @baur-software/figma-to-nuxt

A Nuxt 3 module for syncing Figma design tokens to your application. Automatically fetches design tokens from Figma and generates Tailwind CSS v4, SCSS, or plain CSS files.

## Features

- **Build-time sync** - Automatically fetch Figma tokens during build via Nuxt hooks
- **Multiple output formats** - Tailwind CSS v4, SCSS, or plain CSS
- **Auto-injected styles** - Generated CSS is automatically added to your app
- **Vue composables** - Access tokens reactively in components
- **Type-safe** - Full TypeScript support with generated types
- **Dark mode ready** - Built-in support for light/dark themes

## Installation

```bash
# npm
npm install @baur-software/figma-to-nuxt

# yarn
yarn add @baur-software/figma-to-nuxt

# pnpm
pnpm add @baur-software/figma-to-nuxt

# bun
bun add @baur-software/figma-to-nuxt
```

## Quick Start

1. Add the module to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@baur-software/figma-to-nuxt'],

  figmaTo: {
    fileKey: 'your-figma-file-key',
    token: process.env.FIGMA_TOKEN,
  },
})
```

2. Create a `.env` file with your Figma token:

```env
FIGMA_TOKEN=your-personal-access-token
```

3. Run `nuxt dev` - tokens will be synced automatically!

## Configuration Options

```ts
export default defineNuxtConfig({
  figmaTo: {
    // Figma file key (from the URL: figma.com/file/[FILE_KEY]/...)
    fileKey: 'abc123xyz',

    // Figma personal access token (or use FIGMA_TOKEN env var)
    token: process.env.FIGMA_TOKEN,

    // Output directory for generated files
    // Default: 'assets/theme'
    output: 'assets/theme',

    // Output format: 'tailwind' | 'scss' | 'css'
    // Default: 'tailwind'
    format: 'tailwind',

    // Color format: 'oklch' | 'hex' | 'rgb' | 'hsl'
    // Default: 'oklch'
    colorFormat: 'oklch',

    // Include Ionic CSS variables
    // Default: false
    ionic: false,

    // Generate dark mode variants
    // Default: true
    darkMode: true,

    // Use a local theme.json instead of fetching from Figma
    themeFile: './theme.json',

    // Sync tokens on every build (not just dev)
    // Default: false
    syncOnBuild: false,

    // Log level: 'silent' | 'info' | 'verbose'
    // Default: 'info'
    logLevel: 'info',
  },
})
```

## Using Local Theme File

If you prefer to manage tokens locally or want to avoid API calls during build:

1. Export your tokens from Figma (or use the CLI to generate a `theme.json`)
2. Configure the module to use the local file:

```ts
export default defineNuxtConfig({
  figmaTo: {
    themeFile: './design-tokens/theme.json',
  },
})
```

## Vue Composables

The module provides several composables for accessing design tokens reactively in your Vue components.

### `useDesignTokens()`

Access the full theme and query tokens by path.

```vue
<script setup>
const { theme, collections, getToken, hasToken } = useDesignTokens()

// Get a specific token
const primaryColor = getToken('colors.primary.500')

// Check if a token exists
if (hasToken('typography.heading.h1')) {
  // Token exists
}

// Get all collections
console.log(collections.value)
</script>
```

### `useColorToken(path)`

Get a color token with formatted CSS values.

```vue
<script setup>
const { value, hex, oklch, rgba, exists } = useColorToken('colors.primary.500')

// Reactive paths work too!
const colorName = ref('primary')
const { value: dynamicColor } = useColorToken(() => `colors.${colorName.value}.500`)
</script>

<template>
  <div :style="{ backgroundColor: value }">
    Primary color
  </div>
  <p>Hex: {{ hex }}</p>
  <p>OKLCH: {{ oklch }}</p>
</template>
```

### `useTypographyToken(path)`

Get typography styles as a CSS-ready object.

```vue
<script setup>
const { styles, fontFamily, fontSize, fontWeight, lineHeight } = useTypographyToken('typography.heading.h1')
</script>

<template>
  <h1 :style="styles">
    Styled Heading
  </h1>
</template>
```

### `useShadowToken(path)`

Get shadow values as CSS box-shadow strings.

```vue
<script setup>
const { value, layers } = useShadowToken('shadows.elevation.md')
</script>

<template>
  <div :style="{ boxShadow: value }">
    Card with shadow
  </div>
</template>
```

## Generated Files

Based on your configuration, the module generates:

### Tailwind Format (`format: 'tailwind'`)

- `assets/theme/theme.css` - Complete Tailwind CSS v4 theme with `@theme` directive

### SCSS Format (`format: 'scss'`)

- `assets/theme/_variables.scss` - SCSS variables for use with `@use`

### CSS Format (`format: 'css'`)

- `assets/theme/variables.css` - Plain CSS custom properties

All formats also generate a `theme.json` cache file for the composables.

## TypeScript Support

The module automatically generates TypeScript types for your theme. Access them via:

```ts
import type { FigmaToTheme, DesignTokens } from '#build/figma-to/types'
```

## Figma Setup

1. Open your Figma file
2. Go to **File > Preferences > Access Tokens**
3. Generate a personal access token with **File content** and **Variables** permissions
4. Copy your file key from the URL: `figma.com/file/[FILE_KEY]/...`

## API Reference

### Module Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fileKey` | `string` | - | Figma file key from URL |
| `token` | `string` | `process.env.FIGMA_TOKEN` | Personal access token |
| `output` | `string` | `'assets/theme'` | Output directory |
| `format` | `'tailwind' \| 'scss' \| 'css'` | `'tailwind'` | Output format |
| `colorFormat` | `'oklch' \| 'hex' \| 'rgb' \| 'hsl'` | `'oklch'` | Color format |
| `ionic` | `boolean` | `false` | Include Ionic variables |
| `darkMode` | `boolean` | `true` | Generate dark mode |
| `themeFile` | `string` | - | Path to local theme.json |
| `syncOnBuild` | `boolean` | `false` | Sync on production builds |
| `logLevel` | `'silent' \| 'info' \| 'verbose'` | `'info'` | Logging level |

### Composable Returns

#### `useDesignTokens()`

| Property | Type | Description |
|----------|------|-------------|
| `theme` | `ComputedRef<ThemeFile \| null>` | Full theme object |
| `collections` | `ComputedRef<TokenCollection[]>` | All collections |
| `getToken(path)` | `(path: string) => Token \| undefined` | Get token by path |
| `hasToken(path)` | `(path: string) => boolean` | Check if token exists |
| `getCollection(name)` | `(name: string) => TokenCollection \| undefined` | Get collection by name |

#### `useColorToken(path)`

| Property | Type | Description |
|----------|------|-------------|
| `token` | `ComputedRef<Token<'color'> \| undefined>` | Raw token |
| `value` | `ComputedRef<string \| undefined>` | CSS color value |
| `hex` | `ComputedRef<string \| undefined>` | Hex color |
| `oklch` | `ComputedRef<string \| undefined>` | OKLCH color |
| `rgba` | `ComputedRef<ColorValue \| undefined>` | RGBA object |
| `exists` | `ComputedRef<boolean>` | Token exists |

#### `useTypographyToken(path)`

| Property | Type | Description |
|----------|------|-------------|
| `token` | `ComputedRef<Token<'typography'> \| undefined>` | Raw token |
| `styles` | `ComputedRef<TypographyStyles \| undefined>` | CSS style object |
| `fontFamily` | `ComputedRef<string \| undefined>` | Font family string |
| `fontSize` | `ComputedRef<string \| undefined>` | Font size with unit |
| `fontWeight` | `ComputedRef<string \| number \| undefined>` | Font weight |
| `lineHeight` | `ComputedRef<string \| number \| undefined>` | Line height |
| `letterSpacing` | `ComputedRef<string \| undefined>` | Letter spacing |
| `exists` | `ComputedRef<boolean>` | Token exists |

#### `useShadowToken(path)`

| Property | Type | Description |
|----------|------|-------------|
| `token` | `ComputedRef<Token<'shadow'> \| undefined>` | Raw token |
| `value` | `ComputedRef<string \| undefined>` | CSS box-shadow value |
| `layers` | `ComputedRef<ShadowValue[] \| undefined>` | Individual shadow layers |
| `exists` | `ComputedRef<boolean>` | Token exists |

## License

MIT
