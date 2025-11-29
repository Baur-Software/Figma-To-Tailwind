#!/usr/bin/env node

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import {
  figmaToTailwind,
  parseTheme,
  lintTheme,
  loadConfig,
  findConfigFile,
  createFigmaOutputAdapter,
  createCSSAdapter,
  createSCSSAdapter,
  tryConnectWriteServer,
  type LintConfig,
} from './index.js';
import type { GetLocalVariablesResponse } from '@figma/rest-api-spec';

// ANSI color codes for diff output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
@baur-software/figma-to - Transform Figma design tokens to CSS

Usage:
  figma-to sync [options]     Sync Figma variables to CSS files
  figma-to push [options]     Push tokens to Figma (via Plugin API or REST)
  figma-to lint [options]     Lint tokens for issues
  figma-to --help             Show this help message
  figma-to --version          Show version

Sync Options:
  --file-key <key>            Figma file key (required, or set FIGMA_FILE_KEY)
  --token <token>             Figma API token (required, or set FIGMA_TOKEN)
  --out <dir>                 Output directory (default: ./theme)
  --format <hex|oklch>        Color format (default: oklch)
  --framework <name>          Framework: solidjs, react, vue, angular
  --dry-run                   Preview output without writing files
  --diff                      Show what would change (implies --dry-run)
  --lint                      Run linting after sync

Push Options:
  --source <file>             Source file (CSS or SCSS)
  --source-figma <key>        Source Figma file key (pulls tokens from Figma)
  --target <key>              Target Figma file key (required)
  --token <token>             Figma API token (for source-figma, or set FIGMA_TOKEN)
  --dry-run                   Preview what would be pushed
  --json                      Output REST API JSON instead of pushing
  --allow-overwrite           Allow pushing to source file

Lint Options:
  --file-key <key>            Figma file key (required, or set FIGMA_FILE_KEY)
  --token <token>             Figma API token (required, or set FIGMA_TOKEN)
  --config <path>             Path to config file (default: auto-detect)
  --strict                    Use 'strict' preset (treat warnings as errors)

Config Files (searched in order):
  figma-to.config.js, .figmatorc.js, .figmatorc.json, .figmatorc
  Or "figma-to" field in package.json

Presets: recommended (default), strict, minimal

Examples:
  figma-to sync --file-key abc123 --token figd_xxx
  figma-to sync --lint        # Sync and lint
  figma-to lint               # Lint only
  figma-to sync --dry-run     # Preview without writing
  figma-to sync --diff        # Show changes

  # Push from CSS file to Figma
  figma-to push --source theme.css --target abc123

  # Push from one Figma file to another
  figma-to push --source-figma source123 --target dest456 --token figd_xxx

  # Preview push (dry-run)
  figma-to push --source theme.scss --target abc123 --dry-run
`);
}

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
      result[key] = value;
    }
  }
  return result;
}

/**
 * Generate a simple line-based diff between two strings
 */
function generateDiff(oldContent: string, newContent: string, filename: string): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const output: string[] = [];
  output.push(`${colors.cyan}--- ${filename}${colors.reset}`);
  output.push(`${colors.cyan}+++ ${filename} (new)${colors.reset}`);

  // Simple line-by-line comparison
  const maxLines = Math.max(oldLines.length, newLines.length);
  let changeCount = 0;
  let contextStart = -1;

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine !== newLine) {
      // Show context header if starting new change block
      if (contextStart === -1) {
        contextStart = Math.max(0, i - 2);
        output.push(`${colors.dim}@@ line ${contextStart + 1} @@${colors.reset}`);
        // Show leading context
        for (let j = contextStart; j < i; j++) {
          if (oldLines[j] !== undefined) {
            output.push(` ${oldLines[j]}`);
          }
        }
      }

      if (oldLine !== undefined) {
        output.push(`${colors.red}-${oldLine}${colors.reset}`);
        changeCount++;
      }
      if (newLine !== undefined) {
        output.push(`${colors.green}+${newLine}${colors.reset}`);
        changeCount++;
      }
    } else if (contextStart !== -1 && i - contextStart < 5) {
      // Show trailing context
      output.push(` ${oldLine ?? ''}`);
    } else if (contextStart !== -1) {
      contextStart = -1; // Reset context
    }
  }

  if (changeCount === 0) {
    return '';
  }

  return output.join('\n');
}

async function sync(args: string[]) {
  const opts = parseArgs(args);

  const fileKey = opts['file-key'] || process.env.FIGMA_FILE_KEY;
  const token = opts['token'] || process.env.FIGMA_TOKEN;
  const outDir = opts['out'] || './theme';
  const colorFormat = (opts['format'] as 'hex' | 'oklch') || 'oklch';
  const framework = opts['framework'] as 'solidjs' | 'react' | 'vue' | 'angular' | undefined;
  const showDiff = opts['diff'] === 'true';
  const dryRun = opts['dry-run'] === 'true' || showDiff;

  if (!fileKey) {
    console.error('Error: --file-key or FIGMA_FILE_KEY is required');
    process.exit(1);
  }

  if (!token) {
    console.error('Error: --token or FIGMA_TOKEN is required');
    process.exit(1);
  }

  console.log(`Fetching variables from Figma file ${fileKey}...`);

  const response = await fetch(
    `https://api.figma.com/v1/files/${fileKey}/variables/local`,
    { headers: { 'X-Figma-Token': token } }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(`Figma API error: ${response.status} ${response.statusText}`);
    console.error(text);
    process.exit(1);
  }

  const variablesResponse = await response.json() as GetLocalVariablesResponse;

  console.log('Generating theme CSS...');

  const output = await figmaToTailwind(
    { variablesResponse, fileKey },
    {
      tailwind: { colorFormat },
      framework,
      darkMode: true,
    }
  );

  // Prepare files
  const files: Record<string, string> = {
    'theme.css': output.css,
    'tailwind-theme.css': output.files['tailwind-theme.css'] || '',
    'ionic-theme.css': output.files['ionic-theme.css'] || '',
    'variables.css': output.files['variables.css'] || '',
  };

  // Filter out empty files
  const filesToWrite = Object.fromEntries(
    Object.entries(files).filter(([, content]) => content)
  );

  if (dryRun) {
    console.log(`\n${colors.yellow}Dry run mode - no files will be written${colors.reset}\n`);

    if (showDiff) {
      let hasChanges = false;

      for (const [filename, newContent] of Object.entries(filesToWrite)) {
        const filepath = join(outDir, filename);
        const oldContent = existsSync(filepath)
          ? readFileSync(filepath, 'utf-8')
          : '';

        if (oldContent === newContent) {
          console.log(`${colors.dim}No changes: ${filepath}${colors.reset}`);
        } else if (!oldContent) {
          console.log(`${colors.green}New file: ${filepath}${colors.reset}`);
          console.log(`  ${newContent.split('\n').length} lines\n`);
          hasChanges = true;
        } else {
          const diff = generateDiff(oldContent, newContent, filepath);
          if (diff) {
            console.log(diff);
            console.log('');
            hasChanges = true;
          }
        }
      }

      if (!hasChanges) {
        console.log(`\n${colors.green}No changes detected.${colors.reset}`);
      }
    } else {
      // Just show what would be written
      console.log('Files that would be generated:');
      for (const [filename, content] of Object.entries(filesToWrite)) {
        const filepath = join(outDir, filename);
        const lineCount = content.split('\n').length;
        console.log(`  ${filepath} (${lineCount} lines)`);
      }
    }

    console.log('\nRun without --dry-run to write files.');
    return;
  }

  // Ensure output directory exists
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  // Write files
  for (const [filename, content] of Object.entries(filesToWrite)) {
    const filepath = join(outDir, filename);
    writeFileSync(filepath, content);
    console.log(`  Written: ${filepath}`);
  }

  console.log('\nDone! Theme files generated successfully.');

  // Run linting if requested
  if (opts['lint'] === 'true') {
    console.log('\nRunning linter...\n');
    const theme = await parseTheme({ variablesResponse, fileKey });
    const foundConfig = findConfigFile();
    const config = await loadConfig();
    if (foundConfig) {
      console.log(`Using config: ${colors.cyan}${foundConfig}${colors.reset}\n`);
    }
    printLintResults(lintTheme(theme, config));
  }
}

/**
 * Format and print lint results
 */
function printLintResults(result: ReturnType<typeof lintTheme>): void {
  const severityColors: Record<string, string> = {
    error: colors.red,
    warning: colors.yellow,
    info: colors.cyan,
  };

  const severityIcons: Record<string, string> = {
    error: '✖',
    warning: '⚠',
    info: 'ℹ',
  };

  if (result.messages.length === 0) {
    console.log(`${colors.green}✓ No lint issues found${colors.reset}`);
    return;
  }

  // Group by collection/path
  for (const msg of result.messages) {
    const icon = severityIcons[msg.severity] || '•';
    const color = severityColors[msg.severity] || '';

    let location = '';
    if (msg.collection) location += `${msg.collection}`;
    if (msg.path) location += location ? ` > ${msg.path}` : msg.path;

    console.log(`${color}${icon} [${msg.rule}]${colors.reset} ${msg.message}`);
    if (location) {
      console.log(`  ${colors.dim}at ${location}${colors.reset}`);
    }
    if (msg.suggestion) {
      console.log(`  ${colors.dim}→ ${msg.suggestion}${colors.reset}`);
    }
  }

  console.log('');
  const summary: string[] = [];
  if (result.errorCount > 0) summary.push(`${colors.red}${result.errorCount} error(s)${colors.reset}`);
  if (result.warningCount > 0) summary.push(`${colors.yellow}${result.warningCount} warning(s)${colors.reset}`);
  if (result.infoCount > 0) summary.push(`${colors.cyan}${result.infoCount} info${colors.reset}`);

  console.log(`Found ${summary.join(', ')}`);

  if (!result.passed) {
    console.log(`\n${colors.red}Linting failed${colors.reset}`);
  }
}

/**
 * Lint command - lint tokens without syncing
 */
async function lint(args: string[]): Promise<void> {
  const opts = parseArgs(args);

  const fileKey = opts['file-key'] || process.env.FIGMA_FILE_KEY;
  const token = opts['token'] || process.env.FIGMA_TOKEN;
  const configPath = opts['config'];
  const strict = opts['strict'] === 'true';

  if (!fileKey) {
    console.error('Error: --file-key or FIGMA_FILE_KEY is required');
    process.exit(1);
  }

  if (!token) {
    console.error('Error: --token or FIGMA_TOKEN is required');
    process.exit(1);
  }

  // Load config from file or use preset
  let config: LintConfig;
  if (strict) {
    config = await loadConfig(); // Load base config
    config = { ...config, extends: 'strict' }; // Override with strict preset
    console.log(`Using ${colors.cyan}strict${colors.reset} preset`);
  } else if (configPath) {
    config = await loadConfig(configPath);
    console.log(`Using config: ${colors.cyan}${configPath}${colors.reset}`);
  } else {
    const foundConfig = findConfigFile();
    config = await loadConfig();
    if (foundConfig) {
      console.log(`Using config: ${colors.cyan}${foundConfig}${colors.reset}`);
    } else {
      console.log(`Using ${colors.cyan}recommended${colors.reset} preset (no config file found)`);
    }
  }

  console.log(`Fetching variables from Figma file ${fileKey}...`);

  const response = await fetch(
    `https://api.figma.com/v1/files/${fileKey}/variables/local`,
    { headers: { 'X-Figma-Token': token } }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(`Figma API error: ${response.status} ${response.statusText}`);
    console.error(text);
    process.exit(1);
  }

  const variablesResponse = await response.json() as GetLocalVariablesResponse;

  console.log('Parsing theme...');
  const theme = await parseTheme({ variablesResponse, fileKey });

  console.log('Running linter...\n');

  const result = lintTheme(theme, config);
  printLintResults(result);

  // Exit with error code if linting failed
  if (!result.passed || (strict && result.warningCount > 0)) {
    process.exit(1);
  }
}

/**
 * Push command - push tokens to Figma
 */
async function push(args: string[]): Promise<void> {
  const opts = parseArgs(args);

  const sourceFile = opts['source'];
  const sourceFigma = opts['source-figma'];
  const targetKey = opts['target'];
  const token = opts['token'] || process.env.FIGMA_TOKEN;
  const dryRun = opts['dry-run'] === 'true';
  const jsonOutput = opts['json'] === 'true';
  const allowOverwrite = opts['allow-overwrite'] === 'true';

  // Validate options
  if (!sourceFile && !sourceFigma) {
    console.error('Error: Either --source or --source-figma is required');
    process.exit(1);
  }

  if (sourceFile && sourceFigma) {
    console.error('Error: Cannot specify both --source and --source-figma');
    process.exit(1);
  }

  if (!targetKey) {
    console.error('Error: --target is required');
    process.exit(1);
  }

  if (sourceFigma && !token) {
    console.error('Error: --token or FIGMA_TOKEN is required when using --source-figma');
    process.exit(1);
  }

  let theme;

  // Parse source
  if (sourceFile) {
    // Parse from local file (CSS or SCSS)
    if (!existsSync(sourceFile)) {
      console.error(`Error: Source file not found: ${sourceFile}`);
      process.exit(1);
    }

    const content = readFileSync(sourceFile, 'utf-8');
    const ext = sourceFile.toLowerCase();

    console.log(`Parsing ${sourceFile}...`);

    if (ext.endsWith('.scss') || ext.endsWith('.sass')) {
      const adapter = createSCSSAdapter();
      theme = await adapter.parse({ scss: content, fileName: sourceFile });
    } else {
      // Assume CSS for .css or any other extension
      const adapter = createCSSAdapter();
      theme = await adapter.parse({ css: content, fileName: sourceFile });
    }
  } else {
    // Parse from Figma
    console.log(`Fetching variables from Figma file ${sourceFigma}...`);

    const response = await fetch(
      `https://api.figma.com/v1/files/${sourceFigma}/variables/local`,
      { headers: { 'X-Figma-Token': token! } }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error(`Figma API error: ${response.status} ${response.statusText}`);
      console.error(text);
      process.exit(1);
    }

    const variablesResponse = await response.json() as GetLocalVariablesResponse;
    theme = await parseTheme({ variablesResponse, fileKey: sourceFigma });
  }

  // Transform to Figma format
  console.log('Transforming tokens to Figma format...');

  const outputAdapter = createFigmaOutputAdapter();
  const result = await outputAdapter.transform(theme, {
    targetFileKey: targetKey,
    allowSourceOverwrite: allowOverwrite,
  });

  // Print report
  console.log('\n' + result.report.toString());

  // Handle output mode
  if (jsonOutput) {
    console.log('\nREST API Request Body:');
    console.log(JSON.stringify(result.requestBody, null, 2));
    console.log('\n' + result.getManualInstructions());
    return;
  }

  if (dryRun) {
    console.log(`\n${colors.yellow}Dry run mode - nothing will be pushed${colors.reset}`);
    console.log('\nTo push, run without --dry-run');
    console.log('Or use --json to get the REST API request body');
    return;
  }

  // Try to connect to write server
  console.log('\nConnecting to figma-mcp-write-server...');
  const writeClient = await tryConnectWriteServer();

  if (!writeClient) {
    console.log(`${colors.yellow}Write server not available.${colors.reset}`);
    console.log('\nTo push via Plugin API:');
    console.log('  1. Run: npx figma-mcp-write-server');
    console.log('  2. Open Figma Desktop and activate the write-server plugin');
    console.log('  3. Run this command again\n');
    console.log('Alternatively, use --json to get the REST API request body.\n');
    console.log(result.getManualInstructions());
    process.exit(1);
  }

  // Check plugin status
  const status = await writeClient.getStatus();
  if (!status.connected) {
    console.error(`${colors.red}Figma plugin not connected.${colors.reset}`);
    console.log('Ensure Figma Desktop is open with the write-server plugin active.');
    writeClient.disconnect();
    process.exit(1);
  }

  // Check if target matches currently open file
  if (status.fileKey && status.fileKey !== targetKey) {
    console.log(`${colors.yellow}Warning: Target file (${targetKey}) differs from open file (${status.fileKey})${colors.reset}`);
    console.log('The push will go to the currently open file in Figma.\n');
  }

  console.log(`Connected to Figma: ${status.file || 'Unknown file'}`);
  console.log('Pushing tokens...\n');

  // Push using write client
  const outputAdapterWithClient = createFigmaOutputAdapter(writeClient);
  const resultWithExecute = await outputAdapterWithClient.transform(theme, {
    targetFileKey: targetKey,
    allowSourceOverwrite: allowOverwrite,
  });

  if (resultWithExecute.execute) {
    await resultWithExecute.execute();
    console.log(`${colors.green}✓ Tokens pushed successfully!${colors.reset}`);
  }

  writeClient.disconnect();
}

async function main() {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    // Read version from package.json at runtime
    console.log('0.1.0');
    process.exit(0);
  }

  if (command === 'sync') {
    await sync(args.slice(1));
  } else if (command === 'push') {
    await push(args.slice(1));
  } else if (command === 'lint') {
    await lint(args.slice(1));
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
