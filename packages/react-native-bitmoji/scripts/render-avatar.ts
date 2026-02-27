#!/usr/bin/env node
/**
 * render-avatar.ts — Build & run the avatar renderer via esbuild
 *
 * Uses esbuild to bundle the Avatar component with react-native-web aliases,
 * then runs the bundle to produce SVG+PNG output.
 *
 * Usage:
 *   npx tsx scripts/render-avatar.ts --preset casual_alex --size 256
 *   npx tsx scripts/render-avatar.ts --all-presets
 *   npx tsx scripts/render-avatar.ts --config '{"hairStyle":"mohawk"}'
 *   npx tsx scripts/render-avatar.ts --full-body --preset casual_maya
 */

import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = typeof import.meta.dirname === 'string'
  ? import.meta.dirname
  : path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const monoRoot = path.resolve(pkgRoot, '..', '..');
const outFile = path.join(pkgRoot, 'tmp', '.render-avatar-bundle.cjs');

async function main() {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  // Build the actual renderer entry with aliases
  const entryContent = generateEntry();
  const entryFile = path.join(pkgRoot, 'tmp', '.render-entry.tsx');
  fs.writeFileSync(entryFile, entryContent);

  try {
    await build({
      entryPoints: [entryFile],
      bundle: true,
      outfile: outFile,
      format: 'cjs',
      platform: 'node',
      target: 'node20',
      jsx: 'automatic',
      alias: {
        'react-native': 'react-native-web',
        'react-native-svg': path.join(pkgRoot, 'scripts', 'svg-ssr-shim.tsx'),
      },
      external: [
        '@resvg/resvg-js',
        // Node built-ins needed by react-dom/server
        'util', 'stream', 'crypto', 'async_hooks',
      ],
      plugins: [],
      logLevel: 'warning',
      // Ignore CSS imports from react-native-web
      loader: { '.css': 'empty' },
    });
  } catch (err) {
    console.error('esbuild failed:', err);
    process.exit(1);
  }

  // Run the bundled file, forwarding CLI args
  const args = process.argv.slice(2);
  try {
    execFileSync('node', [outFile, ...args], {
      stdio: 'inherit',
      cwd: pkgRoot,
    });
  } catch (err: any) {
    process.exit(err.status ?? 1);
  } finally {
    // Cleanup
    try { fs.unlinkSync(entryFile); } catch {}
    try { fs.unlinkSync(outFile); } catch {}
  }
}

function generateEntry(): string {
  return `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Resvg } from '@resvg/resvg-js';
import path from 'node:path';
import fs from 'node:fs';

import { Avatar } from '../avatar/Avatar';
import { FullBodyAvatar } from '../avatar/FullBodyAvatar';
import { ALL_PRESETS, getPresetById } from '../avatar/presets';
import { DEFAULT_MALE_CONFIG } from '../avatar/types';
import type { AvatarConfig } from '../avatar/types';

const pkgRoot = ${JSON.stringify(pkgRoot)};

// --- CLI parsing ---
interface CliOptions {
  preset?: string;
  config?: string;
  allPresets: boolean;
  size: number;
  fullBody: boolean;
  outDir: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {
    allPresets: false,
    size: 256,
    fullBody: false,
    outDir: path.join(pkgRoot, 'tmp', 'avatar-preview'),
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--preset': opts.preset = args[++i]; break;
      case '--config': opts.config = args[++i]; break;
      case '--all-presets': opts.allPresets = true; break;
      case '--size': opts.size = parseInt(args[++i], 10); break;
      case '--full-body': opts.fullBody = true; break;
      case '--out-dir': opts.outDir = args[++i]; break;
      case '--help':
        console.log(\`
Usage: npx tsx scripts/render-avatar.ts [options]

Options:
  --preset <id>         Render a preset by ID (e.g. casual_alex)
  --config '<json>'     Render from a JSON AvatarConfig
  --all-presets         Render all \${ALL_PRESETS.length} presets
  --size <px>           Output size in pixels (default: 256)
  --full-body           Render full-body instead of head
  --out-dir <path>      Output directory (default: tmp/avatar-preview/)
  --help                Show this help
\`);
        process.exit(0);
    }
  }
  return opts;
}

// --- Rendering ---

function renderAvatarToSvg(config: AvatarConfig, size: number, fullBody: boolean): string {
  const element = fullBody
    ? React.createElement(FullBodyAvatar, { config, customSize: size, backgroundColor: '#f0f0f0' })
    : React.createElement(Avatar, { config, customSize: size, backgroundColor: '#f0f0f0' });

  const html = renderToStaticMarkup(element);

  // Extract the SVG from react-native-web's div wrapper
  const svgMatch = html.match(/<svg[\\s\\S]*<\\/svg>/i);
  if (!svgMatch) {
    const width = size;
    const height = fullBody ? size * 2 : size;
    return \`<svg xmlns="http://www.w3.org/2000/svg" width="\${width}" height="\${height}"><text x="10" y="20">No SVG output</text></svg>\`;
  }

  let svg = svgMatch[0];
  if (!svg.includes('xmlns=')) {
    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return svg;
}

function svgToPng(svgString: string): Buffer {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'original' as const },
    font: { loadSystemFonts: false },
  });
  const rendered = resvg.render();
  return Buffer.from(rendered.asPng());
}

// --- Main ---

const opts = parseArgs();
fs.mkdirSync(opts.outDir, { recursive: true });

const toRender: Array<{ name: string; config: AvatarConfig }> = [];

if (opts.allPresets) {
  for (const preset of ALL_PRESETS) {
    toRender.push({ name: preset.id, config: preset.config });
  }
} else if (opts.preset) {
  const preset = getPresetById(opts.preset) ||
    ALL_PRESETS.find(p => p.id.includes(opts.preset!) || p.name.toLowerCase() === opts.preset!.toLowerCase());
  if (!preset) {
    console.error(\`Preset "\${opts.preset}" not found. Available: \${ALL_PRESETS.map(p => p.id).join(', ')}\`);
    process.exit(1);
  }
  toRender.push({ name: preset.id, config: preset.config });
} else if (opts.config) {
  try {
    const parsed = JSON.parse(opts.config);
    toRender.push({ name: 'custom', config: { ...DEFAULT_MALE_CONFIG, ...parsed } });
  } catch (e) {
    console.error('Invalid JSON config:', e);
    process.exit(1);
  }
} else {
  toRender.push({ name: ALL_PRESETS[0].id, config: ALL_PRESETS[0].config });
}

console.log(\`Rendering \${toRender.length} avatar(s) at \${opts.size}px\${opts.fullBody ? ' (full body)' : ''}...\`);

for (const { name, config } of toRender) {
  try {
    const svg = renderAvatarToSvg(config, opts.size, opts.fullBody);
    const svgPath = path.join(opts.outDir, \`\${name}.svg\`);
    fs.writeFileSync(svgPath, svg, 'utf-8');

    const png = svgToPng(svg);
    const pngPath = path.join(opts.outDir, \`\${name}.png\`);
    fs.writeFileSync(pngPath, png);

    console.log(\`  OK \${name} -> \${pngPath} (\${png.length} bytes)\`);
  } catch (err) {
    console.error(\`  FAIL \${name}: \${err}\`);
  }
}

if (toRender.length === 1) {
  const src = path.join(opts.outDir, \`\${toRender[0].name}.png\`);
  const dst = path.join(opts.outDir, 'preview.png');
  fs.copyFileSync(src, dst);
  console.log(\`\\nPreview: \${dst}\`);
} else {
  console.log(\`\\nAll previews saved to: \${opts.outDir}/\`);
}
`;
}

main();
