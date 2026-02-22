#!/usr/bin/env ts-node
/**
 * QA Style Guide Generator
 *
 * Generates a visual style guide document showing all avatar variations.
 * Usage: npm run qa:styleguide -- --category=Hair --format=html
 */

import * as fs from 'fs';
import * as path from 'path';
import { StyleGuideOptions, StyleGuideEntry } from './types';

// Parse command line arguments
function parseArgs(): StyleGuideOptions {
  const args = process.argv.slice(2);
  const options: StyleGuideOptions = {
    output: './scripts/qa/output/styleguide',
    format: 'html',
    includeNotes: true,
  };

  for (const arg of args) {
    const [key, value] = arg.replace('--', '').split('=');
    switch (key) {
      case 'category':
        options.category = value;
        break;
      case 'output':
        options.output = value;
        break;
      case 'format':
        options.format = value as 'html' | 'markdown' | 'json';
        break;
      case 'no-notes':
        options.includeNotes = false;
        break;
    }
  }

  return options;
}

// Style guide categories with metadata
const STYLE_GUIDE_CATEGORIES = {
  Face: {
    title: 'Face Components',
    description: 'Face shapes, features, and details',
    components: ['FaceShape', 'Eyes', 'Eyebrows', 'Nose', 'Mouth', 'Teeth', 'Eyelashes'],
  },
  Hair: {
    title: 'Hair System',
    description: 'Hair styles, colors, and treatments',
    components: ['Hair', 'HairTreatment', 'FacialHair'],
  },
  FaceDetails: {
    title: 'Face Details',
    description: 'Freckles, wrinkles, skin details, and tattoos',
    components: ['Freckles', 'Wrinkles', 'EyeBags', 'CheekStyle', 'SkinDetail', 'FaceTattoo'],
  },
  Makeup: {
    title: 'Makeup System',
    description: 'Eyeshadow, eyeliner, lipstick, and blush',
    components: ['Eyeshadow', 'Eyeliner', 'Lipstick', 'Blush'],
  },
  Accessories: {
    title: 'Accessories',
    description: 'Eyewear, jewelry, headwear, and tech',
    components: ['Accessories'],
  },
  Clothing: {
    title: 'Clothing',
    description: 'Tops, formal wear, and outerwear',
    components: ['Clothing'],
  },
  Colors: {
    title: 'Color Palettes',
    description: 'Skin tones, hair colors, eye colors, and makeup colors',
    components: ['SkinTones', 'HairColors', 'EyeColors', 'MakeupColors'],
  },
};

// Generate HTML style guide
function generateHTMLStyleGuide(options: StyleGuideOptions): string {
  const category = options.category;
  const categories = category
    ? { [category]: STYLE_GUIDE_CATEGORIES[category as keyof typeof STYLE_GUIDE_CATEGORIES] }
    : STYLE_GUIDE_CATEGORIES;

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Avatar Style Guide${category ? ` - ${category}` : ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
    header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; text-align: center; }
    header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    header p { opacity: 0.9; font-size: 1.1rem; }
    nav { background: white; padding: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 100; }
    nav ul { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; list-style: none; }
    nav a { color: #667eea; text-decoration: none; padding: 0.5rem 1rem; border-radius: 20px; transition: all 0.3s; }
    nav a:hover { background: #667eea; color: white; }
    main { max-width: 1400px; margin: 0 auto; padding: 2rem; }
    section { margin-bottom: 3rem; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    section h2 { background: #f8f9fa; padding: 1.5rem 2rem; border-bottom: 1px solid #eee; font-size: 1.5rem; display: flex; align-items: center; gap: 0.5rem; }
    section h2::before { content: ''; display: inline-block; width: 4px; height: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 2px; }
    .section-description { padding: 1rem 2rem; color: #666; border-bottom: 1px solid #eee; }
    .component-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem; padding: 2rem; }
    .component-item { text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px; transition: transform 0.2s, box-shadow 0.2s; }
    .component-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .component-item img, .component-item .placeholder { width: 80px; height: 80px; margin: 0 auto 0.5rem; border-radius: 50%; object-fit: cover; }
    .placeholder { background: linear-gradient(135deg, #e0e0e0 0%, #f0f0f0 100%); display: flex; align-items: center; justify-content: center; color: #999; font-size: 0.75rem; }
    .component-item .label { font-size: 0.75rem; color: #666; word-break: break-word; }
    .color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 1rem; padding: 2rem; }
    .color-item { text-align: center; }
    .color-swatch { width: 60px; height: 60px; margin: 0 auto 0.5rem; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
    .color-item .label { font-size: 0.7rem; color: #666; }
    .color-item .hex { font-size: 0.65rem; color: #999; font-family: monospace; }
    .stats { display: flex; gap: 2rem; padding: 1rem 2rem; background: #f8f9fa; border-top: 1px solid #eee; }
    .stat { text-align: center; }
    .stat-value { font-size: 1.5rem; font-weight: bold; color: #667eea; }
    .stat-label { font-size: 0.75rem; color: #666; }
    footer { text-align: center; padding: 2rem; color: #666; font-size: 0.875rem; }
    @media (max-width: 768px) {
      header h1 { font-size: 1.75rem; }
      .component-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); }
    }
  </style>
</head>
<body>
  <header>
    <h1>Avatar Style Guide</h1>
    <p>Visual reference for all avatar customization options</p>
    <p style="margin-top: 1rem; font-size: 0.875rem; opacity: 0.8;">Generated: ${new Date().toLocaleString()}</p>
  </header>

  <nav>
    <ul>
      ${Object.entries(STYLE_GUIDE_CATEGORIES).map(([key, cat]) =>
        `<li><a href="#${key.toLowerCase()}">${cat.title}</a></li>`
      ).join('\n      ')}
    </ul>
  </nav>

  <main>
`;

  // Generate sections for each category
  for (const [key, cat] of Object.entries(categories)) {
    if (!cat) continue;

    html += `
    <section id="${key.toLowerCase()}">
      <h2>${cat.title}</h2>
      <div class="section-description">${cat.description}</div>

      ${cat.components.map(component => `
      <div class="component-section">
        <h3 style="padding: 1rem 2rem; background: #fafafa; font-size: 1rem; color: #555;">${component}</h3>
        <div class="component-grid">
          <!-- Component items will be rendered by the app -->
          <div class="component-item">
            <div class="placeholder">Preview</div>
            <div class="label">style_name</div>
          </div>
        </div>
      </div>
      `).join('\n')}

      <div class="stats">
        <div class="stat">
          <div class="stat-value">${cat.components.length}</div>
          <div class="stat-label">Components</div>
        </div>
        <div class="stat">
          <div class="stat-value">~</div>
          <div class="stat-label">Total Styles</div>
        </div>
      </div>
    </section>
`;
  }

  html += `
  </main>

  <footer>
    <p>React Native Bitmoji - Avatar Style Guide</p>
    <p>For QA testing and visual reference</p>
  </footer>
</body>
</html>`;

  return html;
}

// Generate Markdown style guide
function generateMarkdownStyleGuide(options: StyleGuideOptions): string {
  const category = options.category;
  const categories = category
    ? { [category]: STYLE_GUIDE_CATEGORIES[category as keyof typeof STYLE_GUIDE_CATEGORIES] }
    : STYLE_GUIDE_CATEGORIES;

  let md = `# Avatar Style Guide

> Visual reference for all avatar customization options

Generated: ${new Date().toLocaleString()}

---

## Table of Contents

${Object.entries(STYLE_GUIDE_CATEGORIES).map(([key, cat]) =>
  `- [${cat.title}](#${key.toLowerCase()})`
).join('\n')}

---

`;

  for (const [key, cat] of Object.entries(categories)) {
    if (!cat) continue;

    md += `## ${cat.title}

${cat.description}

### Components

${cat.components.map(c => `- ${c}`).join('\n')}

---

`;
  }

  return md;
}

// Generate JSON style guide data
function generateJSONStyleGuide(options: StyleGuideOptions): object {
  return {
    generatedAt: new Date().toISOString(),
    categories: STYLE_GUIDE_CATEGORIES,
    options,
  };
}

// Main execution
function main() {
  const options = parseArgs();

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
QA Style Guide Generator

Usage: npm run qa:styleguide -- [options]

Options:
  --category=NAME     Generate for specific category
  --output=PATH       Output directory (default: ./scripts/qa/output/styleguide)
  --format=FORMAT     Output format: html, markdown, json (default: html)
  --no-notes          Exclude notes from output

Available Categories:
  ${Object.keys(STYLE_GUIDE_CATEGORIES).join(', ')}

Examples:
  npm run qa:styleguide
  npm run qa:styleguide -- --category=Hair
  npm run qa:styleguide -- --format=markdown
    `);
    process.exit(0);
  }

  console.log('QA Style Guide Generator');
  console.log('========================\n');

  const outputDir = path.resolve(options.output || './scripts/qa/output/styleguide');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let content: string;
  let filename: string;

  switch (options.format) {
    case 'markdown':
      content = generateMarkdownStyleGuide(options);
      filename = 'style-guide.md';
      break;
    case 'json':
      content = JSON.stringify(generateJSONStyleGuide(options), null, 2);
      filename = 'style-guide.json';
      break;
    case 'html':
    default:
      content = generateHTMLStyleGuide(options);
      filename = 'style-guide.html';
      break;
  }

  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, content);
  console.log(`Generated style guide: ${outputPath}`);
  console.log(`Format: ${options.format || 'html'}`);
  console.log(`Category: ${options.category || 'All'}`);
}

main();
