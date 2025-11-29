#!/usr/bin/env node

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { figmaToTailwind } from './index.js';
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

Examples:
  figma-to sync --file-key abc123 --token figd_xxx
  FIGMA_FILE_KEY=abc123 FIGMA_TOKEN=figd_xxx figma-to sync
  figma-to sync --out src/styles --format hex
  figma-to sync --dry-run     # Preview without writing
  figma-to sync --diff        # Show changes
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
