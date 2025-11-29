# Figma Output Adapter Research & Planning

## Executive Summary

This document captures research findings for implementing a Figma Output Adapter that can push design tokens back to Figma, plus a CSS Input Adapter for parsing stylesheets.

---

## Figma API Capabilities

### REST API

**Endpoint:** `POST /v1/files/:file_key/variables`

| Capability | Supported | Notes |
|------------|-----------|-------|
| Create/Update Variables | Yes | Enterprise plan + `file_variables:write` scope |
| Create/Update Styles | No | REST API is read-only for styles |
| Types Supported | 4 only | `BOOLEAN`, `FLOAT`, `STRING`, `COLOR` |

**Constraints:**
- Max 5000 variables per collection
- Max 40 modes per collection
- Atomic operations (all fail if any validation fails)
- 4MB max request body size

**Sources:**
- [Figma REST API Docs](https://developers.figma.com/docs/rest-api/)
- [Variables Endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/)

### Official MCP Server

The official Figma MCP server is **read-only**. Available tools:
- `get_design_context` - Get design tokens and code
- `get_metadata` - Get node structure
- `get_variable_defs` - Get variable definitions
- `get_screenshot` - Capture node images

**No write operations available.**

**Sources:**
- [Figma MCP Blog Post](https://www.figma.com/blog/introducing-figma-mcp-server/)
- [MCP Server Guide](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)

### Community Write Server (Plugin API)

[figma-mcp-write-server](https://github.com/oO/figma-mcp-write-server) provides **full write access** via Plugin API.

**Tools Available:**
- `figma_variables` - Create/update variables
- `figma_styles` - Create/update paint/text styles
- `figma_effects` - Create/update effect styles
- `figma_plugin_status` - Check connection status

**Requirements:**
- Figma Desktop (not browser)
- Plugin manually activated per session
- WebSocket connection to plugin
- Node.js 22.x

**Limitations:**
- Pre-release (< 1.0.0)
- Single file scope
- Manual plugin activation required
- Potential WebSocket instability

---

## API Comparison

| Feature | REST API | Official MCP | Write Server (Plugin) |
|---------|----------|--------------|----------------------|
| Variables | Enterprise only | Read-only | Full access |
| Text Styles | No | Read-only | Full access |
| Effect Styles | No | Read-only | Full access |
| Paint Styles | No | Read-only | Full access |
| Plan Required | Enterprise | Any | Any |
| Desktop Required | No | No | Yes |

**Decision:** Use Plugin API via write-server for full capabilities without Enterprise requirement.

---

## Token Type Mapping

| Token Type | Figma Output | Plugin Tool | Notes |
|------------|--------------|-------------|-------|
| `color` | Variable (COLOR) | `figma_variables` | RGBA 0-1 normalized |
| `dimension` | Variable (FLOAT) | `figma_variables` | Unit discarded |
| `number` | Variable (FLOAT) | `figma_variables` | Direct mapping |
| `string` | Variable (STRING) | `figma_variables` | Direct mapping |
| `boolean` | Variable (BOOLEAN) | `figma_variables` | Direct mapping |
| `fontFamily` | Variable (STRING) | `figma_variables` | First family only |
| `fontWeight` | Variable (FLOAT) | `figma_variables` | Numeric value |
| `typography` | Text Style | `figma_styles` | Full composite |
| `shadow` | Effect Style | `figma_effects` | DROP_SHADOW/INNER_SHADOW |
| `gradient` | Paint Style | `figma_styles` | LINEAR/RADIAL/ANGULAR |
| `border` | Mixed | Variable + Style | Width as var, color as paint |

---

## Business Rules

### Source Safety (Input != Output)

The MCP operates on whatever frame is selected in Figma UI. To prevent accidental overwrites:

1. Check `ThemeFile.meta.figmaFileKey` against target
2. Query `figma_plugin_status()` for currently active file
3. If source matches target and `allowSourceOverwrite: false` → throw error
4. If `allowSourceOverwrite: true` → add warning to report

### Unmapped Values

CSS values that can't map to Figma types:
- Skip the value
- Add to report with reason and suggestion
- Continue processing remaining tokens

### Framework Detection

For CSS input, detect framework from patterns:
```typescript
if (content.includes('@theme {') || content.includes('@tailwind')) return 'tailwind';
if (content.includes('--ion-color-')) return 'ionic';
return 'vanilla';
```

---

## Warning Codes

| Code | Description |
|------|-------------|
| `UNSUPPORTED_TYPE` | Token type not representable in Figma |
| `VALUE_TRUNCATED` | Value simplified for compatibility |
| `UNIT_DISCARDED` | Dimension unit was lost |
| `COMPOSITE_SKIPPED` | Composite token skipped (REST API only) |
| `ALIAS_UNRESOLVED` | Token reference could not be resolved |
| `NAME_COLLISION` | Variable name collision detected |
| `SOURCE_MATCH` | Source file matches target file |

---

## Existing Codebase Architecture

### Current Adapter Structure (needs refactor)

```
src/adapters/
  figma/           # Input adapter (unclear naming)
  tailwind-ionic/  # Output adapter (unclear naming)
  scss/            # Output adapter (unclear naming)
```

### Proposed Structure

```
src/adapters/
  input/
    figma/         # FigmaAdapter (existing, moved)
    css/           # CssInputAdapter (new)
    index.ts
  output/
    tailwind-ionic/  # TailwindIonicAdapter (existing, moved)
    scss/            # ScssAdapter (existing, moved)
    figma/           # FigmaOutputAdapter (new)
    index.ts
  index.ts
```

### Adapter Interfaces

**InputAdapter:**
```typescript
interface InputAdapter<TSource> {
  readonly id: string;
  readonly name: string;
  validate(source: TSource): Promise<{ valid: boolean; errors?: string[] }>;
  parse(source: TSource): Promise<ThemeFile>;
}
```

**OutputAdapter:**
```typescript
interface OutputAdapter<TOutput> {
  readonly id: string;
  readonly name: string;
  transform(theme: ThemeFile, options?: OutputAdapterOptions): Promise<TOutput>;
}
```

### Existing Figma Types

Already imported in `src/schema/figma.ts`:
- `PostVariablesRequestBody`
- `PostVariablesResponse`
- `VariableCreate`, `VariableUpdate`, `VariableDelete`
- `VariableCollectionCreate`, `VariableModeCreate`
- `VariableModeValue`

---

## Implementation Plan

### Phase 0: Adapter Directory Refactor
- Create `src/adapters/input/` and `src/adapters/output/`
- Move existing adapters to appropriate subdirectories
- Update all imports
- Create barrel exports
- Verify tests pass

### Phase 1: Core Output Adapter
- `FigmaOutputAdapter` class
- Variable transformer (color, dimension, number, string, boolean)
- Integration with `figma_variables` Plugin API tool
- Unit tests

### Phase 2: Styles Support
- Typography → Text Style (`figma_styles`)
- Shadow → Effect Style (`figma_effects`)
- Gradient → Paint Style (`figma_styles`)
- E2E tests

### Phase 3: Safety & Reporting
- Source safety checks
- `TransformationReport` class
- Warning collection
- Active file detection

### Phase 4: CSS Input Adapter
- CSS custom property parser
- SCSS variable parser
- Framework detection
- `CssInputAdapter` class

### Phase 5: CLI Integration
- `figma-to push` command
- Options: `--target`, `--allow-overwrite`, `--dry-run`
- Report formatting

---

## Key Files

### To Create
- `src/adapters/output/figma/adapter.ts`
- `src/adapters/output/figma/transformer.ts`
- `src/adapters/output/figma/styles-transformer.ts`
- `src/adapters/output/figma/write-client.ts`
- `src/adapters/output/figma/safety.ts`
- `src/adapters/output/figma/report.ts`
- `src/adapters/input/css/adapter.ts`
- `src/adapters/input/css/parser.ts`
- `src/adapters/input/css/framework-detector.ts`

### To Reference
- `src/schema/figma.ts` - Figma types
- `src/adapters/tailwind-ionic/adapter.ts` - Output adapter pattern
- `src/adapters/figma/adapter.ts` - Input adapter pattern
- `src/registry/handlers/*.ts` - Value conversion

### To Modify
- `src/index.ts` - Add exports
- `src/cli.ts` - Add push command
- `package.json` - Update exports

---

## Plugin API Integration

```typescript
interface WriteServerClient {
  figma_variables(params: VariableParams): Promise<void>;
  figma_styles(params: StyleParams): Promise<void>;
  figma_effects(params: EffectParams): Promise<void>;
  figma_plugin_status(): Promise<{ connected: boolean; file?: string }>;
}

// Safety check before write
const status = await client.figma_plugin_status();
if (status.file === sourceFileKey && !options.allowSourceOverwrite) {
  throw new SourceOverwriteError(sourceFileKey);
}
```

---

## References

- [Figma REST API Spec (GitHub)](https://github.com/figma/rest-api-spec)
- [Figma MCP Write Server](https://github.com/oO/figma-mcp-write-server)
- [Variables API Forum Discussion](https://forum.figma.com/t/updating-paintstyles-and-textstyles/6352)
- [REST API TextStyles Limitation](https://forum.figma.com/t/rest-api-textstyles/60587)
