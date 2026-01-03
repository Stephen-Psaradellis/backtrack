import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const assetsDir = join(__dirname, '..', 'assets');

// Brand colors from tailwind.config.ts
const PRIMARY_COLOR = '#FF6B47';  // Warm Coral
const ACCENT_COLOR = '#8B5CF6';   // Deep Violet
const BG_COLOR = '#FFFFFF';

// Create a gradient-like icon with the backtrack "B" letter
async function createMainIcon(size, outputPath) {
  // Create SVG with gradient background and "B" letter
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${PRIMARY_COLOR};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${ACCENT_COLOR};stop-opacity:1" />
        </linearGradient>
        <linearGradient id="arrow" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#F0F0F0;stop-opacity:1" />
        </linearGradient>
      </defs>
      <!-- Background with rounded corners -->
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>
      
      <!-- Backtrack arrow/chevron pointing left (going back in time) -->
      <g transform="translate(${size * 0.5}, ${size * 0.5})">
        <!-- Left-pointing arrow/chevron -->
        <path d="M ${size * 0.12} 0 
                 L ${size * -0.18} ${size * -0.22}
                 L ${size * -0.05} ${size * -0.22}
                 L ${size * 0.22} 0
                 L ${size * -0.05} ${size * 0.22}
                 L ${size * -0.18} ${size * 0.22}
                 Z" 
              fill="#FFFFFF" 
              opacity="0.95"/>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  
  console.log(`Created: ${outputPath} (${size}x${size})`);
}

// Create adaptive icon foreground (no background, just the arrow)
async function createAdaptiveIconForeground(size, outputPath) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Transparent background -->
      <rect width="${size}" height="${size}" fill="transparent"/>
      
      <!-- Backtrack arrow centered for adaptive icon safe zone -->
      <g transform="translate(${size * 0.5}, ${size * 0.5})">
        <defs>
          <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${PRIMARY_COLOR};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${ACCENT_COLOR};stop-opacity:1" />
          </linearGradient>
        </defs>
        <!-- Left-pointing arrow in gradient -->
        <path d="M ${size * 0.08} 0 
                 L ${size * -0.12} ${size * -0.15}
                 L ${size * -0.02} ${size * -0.15}
                 L ${size * 0.15} 0
                 L ${size * -0.02} ${size * 0.15}
                 L ${size * -0.12} ${size * 0.15}
                 Z" 
              fill="url(#arrowGrad)"/>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  
  console.log(`Created: ${outputPath} (${size}x${size})`);
}

// Create splash icon
async function createSplashIcon(size, outputPath) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${PRIMARY_COLOR};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${ACCENT_COLOR};stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Arrow icon for splash -->
      <g transform="translate(${size * 0.5}, ${size * 0.5})">
        <path d="M ${size * 0.15} 0 
                 L ${size * -0.22} ${size * -0.28}
                 L ${size * -0.06} ${size * -0.28}
                 L ${size * 0.28} 0
                 L ${size * -0.06} ${size * 0.28}
                 L ${size * -0.22} ${size * 0.28}
                 Z" 
              fill="url(#grad)"/>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  
  console.log(`Created: ${outputPath} (${size}x${size})`);
}

// Create favicon
async function createFavicon(size, outputPath) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${PRIMARY_COLOR};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${ACCENT_COLOR};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#bg)"/>
      <g transform="translate(${size * 0.5}, ${size * 0.5})">
        <path d="M ${size * 0.1} 0 
                 L ${size * -0.15} ${size * -0.18}
                 L ${size * -0.05} ${size * -0.18}
                 L ${size * 0.18} 0
                 L ${size * -0.05} ${size * 0.18}
                 L ${size * -0.15} ${size * 0.18}
                 Z" 
              fill="#FFFFFF"/>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  
  console.log(`Created: ${outputPath} (${size}x${size})`);
}

async function main() {
  console.log('Generating app icons...\n');

  // Main app icon (1024x1024 for iOS, used by EAS to generate all sizes)
  await createMainIcon(1024, join(assetsDir, 'icon.png'));

  // Adaptive icon foreground for Android (432x432 at xxxhdpi, 108dp)
  await createAdaptiveIconForeground(432, join(assetsDir, 'adaptive-icon.png'));

  // Splash screen icon (larger for visibility)
  await createSplashIcon(288, join(assetsDir, 'splash-icon.png'));

  // Favicon for web
  await createFavicon(32, join(assetsDir, 'favicon.png'));

  console.log('\nAll icons generated successfully!');
}

main().catch(console.error);
