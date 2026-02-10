#!/usr/bin/env node
/**
 * Icon Generation Script
 *
 * Generates all required icon formats for the desktop app from the source SVG.
 * Run this script before packaging to create platform-specific icons.
 *
 * Source: workers/tunnel-gate/src/assets/icon-512.svg
 * Output: desktop/assets/
 *
 * Dependencies: sharp, png-to-ico
 *
 * macOS Icon Best Practices:
 * - All PNGs are masked to Apple's squircle shape (~22.37% corner radius)
 *   with transparent background outside the shape. This ensures the icon
 *   aligns with the system squircle on macOS Big Sur through Tahoe.
 * - The .icns format (generated here) works on ALL macOS versions including Tahoe.
 *
 * macOS Tahoe (26) Liquid Glass (.icon format):
 * - For liquid glass effects, create a layered .icon file using Apple's Icon Composer.
 * - Compile with: actool Icon.icon --compile output/ --output-format human-readable-text
 *     --app-icon Icon --include-all-app-icons --target-device mac --platform macosx
 * - Place the resulting Assets.car in desktop/assets/
 * - electron-builder v26+ supports .icon natively: set mac.icon to the .icon path.
 * - The .icns is kept as fallback for pre-Tahoe macOS via CFBundleIconFile.
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '../..');
const desktopDir = path.resolve(__dirname, '..');
const assetsDir = path.join(desktopDir, 'assets');
const trayDir = path.join(assetsDir, 'tray');

// Source SVGs
const sourceSvg = path.join(projectRoot, 'workers/tunnel-gate/src/assets/icon-512.svg');
const betaSourceSvg = path.join(assetsDir, 'icon-beta.svg');
const traySourceSvg = path.join(trayDir, 'tray-source.svg');

// Icon sizes needed
const ICON_SIZES = {
  // macOS iconset sizes (all required for .icns)
  macosIconset: [16, 32, 64, 128, 256, 512, 1024],
  // Windows ICO sizes
  windowsIco: [16, 24, 32, 48, 64, 128, 256],
  // Linux PNG
  linux: 512,
  // Tray icons
  tray: [16, 22, 32],
};

/**
 * Ensure directories exist
 */
function ensureDirectories() {
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.mkdirSync(trayDir, { recursive: true });
}

/**
 * Apple's macOS icon squircle corner radius as a fraction of the icon size.
 * Apple HIG specifies ~22.37% for the continuous corner curve.
 * A standard rounded rect at this radius is visually indistinguishable
 * from Apple's superellipse at icon sizes.
 */
const APPLE_SQUIRCLE_RADIUS_RATIO = 0.2237;

/**
 * Create an SVG mask string for Apple's squircle shape.
 * Returns an SVG buffer that can be used as a compositing mask.
 */
function createSquircleMaskSvg(size) {
  const rx = Math.round(size * APPLE_SQUIRCLE_RADIUS_RATIO);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${rx}" ry="${rx}" fill="white"/>
  </svg>`);
}

/**
 * Apply Apple squircle mask to a rendered PNG buffer.
 * Composites the icon within the squircle shape on a transparent background.
 */
async function applySquircleMask(pngBuffer, size) {
  const maskSvg = createSquircleMaskSvg(size);

  // Render mask to grayscale
  const maskBuffer = await sharp(maskSvg)
    .resize(size, size)
    .grayscale()
    .toBuffer();

  // Extract the mask as a single channel to use as alpha
  const maskChannel = await sharp(maskBuffer)
    .extractChannel(0)
    .toBuffer();

  // Remove existing alpha from the source, then apply the squircle mask as the new alpha
  const rgbBuffer = await sharp(pngBuffer)
    .removeAlpha()
    .toBuffer();

  return sharp(rgbBuffer)
    .joinChannel(maskChannel)
    .png()
    .toBuffer();
}

/**
 * Generate PNG from SVG at specified size
 */
async function generatePng(outputPath, size, svgSource = sourceSvg) {
  await sharp(svgSource)
    .resize(size, size)
    .png()
    .toFile(outputPath);
  console.log(`  ✓ Generated ${path.basename(outputPath)} (${size}x${size})`);
}

/**
 * Generate PNG from SVG with Apple squircle mask applied.
 * Used for macOS icons to ensure corners align with the system squircle.
 */
async function generateSquirclePng(outputPath, size, svgSource = sourceSvg) {
  const rawPng = await sharp(svgSource)
    .resize(size, size)
    .png()
    .toBuffer();

  const maskedPng = await applySquircleMask(rawPng, size);
  await sharp(maskedPng).toFile(outputPath);
  console.log(`  ✓ Generated ${path.basename(outputPath)} (${size}x${size}, squircle)`);
}

/**
 * Generate macOS .icns file
 * Requires macOS with iconutil command
 * @param {string} svgSource - Path to source SVG
 * @param {string} outputName - Output filename without extension (e.g., 'icon' or 'icon-beta')
 */
async function generateMacIcon(svgSource = sourceSvg, outputName = 'icon') {
  console.log(`\n📱 Generating macOS icon (${outputName})...`);

  const iconsetDir = path.join(assetsDir, `${outputName}.iconset`);
  fs.mkdirSync(iconsetDir, { recursive: true });

  // Generate all required sizes for iconset with Apple squircle mask
  const sizes = [16, 32, 128, 256, 512];
  for (const size of sizes) {
    // Regular size
    await generateSquirclePng(path.join(iconsetDir, `icon_${size}x${size}.png`), size, svgSource);
    // @2x size (retina) — 512@2x = 1024px, the required max per Apple HIG
    await generateSquirclePng(path.join(iconsetDir, `icon_${size}x${size}@2x.png`), size * 2, svgSource);
  }

  // Convert iconset to icns using iconutil (macOS only)
  if (process.platform === 'darwin') {
    const icnsPath = path.join(assetsDir, `${outputName}.icns`);
    try {
      execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, { stdio: 'pipe' });
      console.log(`  ✓ Generated ${outputName}.icns`);
    } catch (error) {
      console.error(`  ✗ Failed to generate ${outputName}.icns:`, error.message);
    }
  } else {
    console.log('  ⚠ Skipping .icns generation (requires macOS)');
    console.log('    The iconset folder has been created for manual conversion');
  }

  // Clean up iconset directory if icns was created
  const icnsPath = path.join(assetsDir, `${outputName}.icns`);
  if (fs.existsSync(icnsPath)) {
    fs.rmSync(iconsetDir, { recursive: true });
  }
}

/**
 * Generate Windows .ico file
 * @param {string} svgSource - Path to source SVG
 * @param {string} outputName - Output filename without extension (e.g., 'icon' or 'icon-beta')
 */
async function generateWindowsIcon(svgSource = sourceSvg, outputName = 'icon') {
  console.log(`\n🪟 Generating Windows icon (${outputName})...`);

  const pngToIco = require('png-to-ico').default;
  const tempPngs = [];

  // Generate PNGs at required sizes
  for (const size of ICON_SIZES.windowsIco) {
    const pngPath = path.join(assetsDir, `temp_${outputName}_${size}.png`);
    await generatePng(pngPath, size, svgSource);
    tempPngs.push(pngPath);
  }

  // Convert to ICO
  const icoPath = path.join(assetsDir, `${outputName}.ico`);
  const buf = await pngToIco(tempPngs);
  fs.writeFileSync(icoPath, buf);
  console.log(`  ✓ Generated ${outputName}.ico`);

  // Clean up temp PNGs
  for (const png of tempPngs) {
    fs.unlinkSync(png);
  }
}

/**
 * Generate Linux PNG icon
 * @param {string} svgSource - Path to source SVG
 * @param {string} outputName - Output filename without extension (e.g., 'icon' or 'icon-beta')
 */
async function generateLinuxIcon(svgSource = sourceSvg, outputName = 'icon') {
  console.log(`\n🐧 Generating Linux icon (${outputName})...`);
  await generatePng(path.join(assetsDir, `${outputName}.png`), ICON_SIZES.linux, svgSource);
}

/**
 * Generate monochrome template icon for macOS.
 * Template icons should be black with alpha channel - macOS automatically
 * inverts them for light/dark mode.
 *
 * Uses tray-source.svg which contains just the butterflies (no background).
 * Converts the colored butterflies to solid black while preserving alpha.
 */
async function generateMacTemplateIcon(outputPath, size) {
  // Render the SVG to get the alpha channel
  const original = sharp(traySourceSvg).resize(size, size).ensureAlpha();

  // Extract alpha channel from original
  const alphaBuffer = await original.clone().extractChannel('alpha').toBuffer();

  // Create solid black image same size
  const black = await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();

  // Combine black RGB with original alpha
  await sharp(black)
    .joinChannel(alphaBuffer)
    .png()
    .toFile(outputPath);

  console.log(`  ✓ Generated ${path.basename(outputPath)} (${size}x${size}, template)`);
}

/**
 * Generate colored tray PNG from tray source SVG.
 */
async function generateColoredTrayPng(outputPath, size) {
  await sharp(traySourceSvg)
    .resize(size, size)
    .png()
    .toFile(outputPath);
  console.log(`  ✓ Generated ${path.basename(outputPath)} (${size}x${size}, colored)`);
}

/**
 * Generate tray icons
 */
async function generateTrayIcons() {
  console.log('\n🔔 Generating tray icons...');

  // macOS tray icons (template images - must be monochrome black with alpha)
  // The "Template" suffix tells macOS to automatically handle light/dark mode
  try {
    await generateMacTemplateIcon(path.join(trayDir, 'iconTemplate.png'), 16);
    await generateMacTemplateIcon(path.join(trayDir, 'iconTemplate@2x.png'), 32);
  } catch (err) {
    console.log(`  ⚠ Failed to generate monochrome templates: ${err.message}`);
  }

  // Windows/Linux tray icon (colored butterflies)
  await generateColoredTrayPng(path.join(trayDir, 'tray.png'), 32);

  // Windows tray ICO
  const pngToIco = require('png-to-ico').default;
  const trayPng16 = path.join(trayDir, 'temp_tray_16.png');
  const trayPng32 = path.join(trayDir, 'temp_tray_32.png');

  await generateColoredTrayPng(trayPng16, 16);
  await generateColoredTrayPng(trayPng32, 32);

  const buf = await pngToIco([trayPng16, trayPng32]);
  fs.writeFileSync(path.join(trayDir, 'tray.ico'), buf);
  console.log(`  ✓ Generated tray.ico`);

  // Clean up temp files
  fs.unlinkSync(trayPng16);
  fs.unlinkSync(trayPng32);
}

/**
 * Create the foreground SVG layer for liquid glass (butterflies only, white fill).
 * Liquid glass foreground layers use white fill with transparency — the system
 * applies color tinting and glass effects on top.
 */
function createForegroundSvg() {
  const traySvg = fs.readFileSync(traySourceSvg, 'utf8');
  const paths = traySvg.match(/<path[^>]*\/>/g);
  // Strip existing fill attributes and use white
  const whitePaths = paths.map(p => p.replace(/fill="[^"]*"/g, '').replace('<path', '<path fill="#FFFFFF"'));
  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <g transform="translate(100, 80) scale(9.5)">
    ${whitePaths.join('\n    ')}
  </g>
</svg>`;
}

/**
 * Create the background SVG layer for liquid glass.
 */
function createBackgroundSvg() {
  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#262524"/>
</svg>`;
}

/**
 * Create the icon.json manifest for the .icon bundle.
 * Defines layers, liquid glass properties, and appearance specializations.
 */
function createIconJson() {
  return JSON.stringify({
    'fill-specializations': [
      {
        value: { 'automatic-gradient': 'srgb:1.00000,0.41176,0.17647,1.00000' },
      },
      {
        appearance: 'dark',
        value: { solid: 'srgb:1.00000,0.41176,0.17647,1.00000' },
      },
    ],
    groups: [
      {
        'blur-material': null,
        layers: [
          {
            'fill-specializations': [
              { appearance: 'dark', value: 'none' },
            ],
            glass: false,
            'image-name': 'fg.svg',
            name: 'fg',
          },
        ],
        'shadow-specializations': [
          { value: { kind: 'neutral', opacity: 0.5 } },
          { appearance: 'dark', value: { kind: 'neutral', opacity: 0.6 } },
        ],
        specular: true,
        translucency: { enabled: false, value: 0.5 },
      },
      {
        'blur-material': null,
        layers: [
          {
            'fill-specializations': [
              { appearance: 'dark', value: 'none' },
              {
                appearance: 'tinted',
                value: { 'automatic-gradient': 'srgb:0.14902,0.14510,0.14118,1.00000' },
              },
            ],
            'image-name': 'bg.svg',
            name: 'bg',
            'opacity-specializations': [
              { appearance: 'dark', value: 0.8 },
            ],
            'position-specializations': [
              {
                idiom: 'square',
                value: { scale: 1, 'translation-in-points': [0, 0] },
              },
            ],
          },
        ],
        name: 'Group',
        shadow: { kind: 'layer-color', opacity: 0.5 },
        translucency: { enabled: false, value: 0.5 },
      },
    ],
    'supported-platforms': {
      squares: 'shared',
    },
  }, null, 2);
}

/**
 * Generate macOS Tahoe liquid glass .icon bundle and compile to Assets.car.
 * Requires Xcode 26+ with actool on macOS.
 *
 * @param {string} outputName - Output name (e.g., 'AppIcon')
 */
async function generateLiquidGlassIcon(outputName = 'AppIcon') {
  console.log(`\n🫧 Generating macOS Tahoe liquid glass icon (${outputName})...`);

  if (process.platform !== 'darwin') {
    console.log('  ⚠ Skipping liquid glass icon (requires macOS with Xcode 26+)');
    return;
  }

  try {
    execSync('xcrun actool --version', { stdio: 'pipe' });
  } catch {
    console.log('  ⚠ Skipping liquid glass icon (actool not found — install Xcode 26+)');
    return;
  }

  const iconDir = path.join(assetsDir, `${outputName}.icon`);
  const iconAssetsDir = path.join(iconDir, 'Assets');

  fs.mkdirSync(iconAssetsDir, { recursive: true });

  fs.writeFileSync(path.join(iconAssetsDir, 'fg.svg'), createForegroundSvg());
  console.log('  ✓ Created Assets/fg.svg (foreground)');

  fs.writeFileSync(path.join(iconAssetsDir, 'bg.svg'), createBackgroundSvg());
  console.log('  ✓ Created Assets/bg.svg (background)');

  fs.writeFileSync(path.join(iconDir, 'icon.json'), createIconJson());
  console.log('  ✓ Created icon.json');

  try {
    execSync(
      `xcrun actool "${iconDir}" ` +
      `--warnings --errors --notices ` +
      `--output-format human-readable-text ` +
      `--compile "${assetsDir}" ` +
      `--include-all-app-icons ` +
      `--enable-on-demand-resources NO ` +
      `--enable-icon-stack-fallback-generation NO ` +
      `--development-region en ` +
      `--target-device mac ` +
      `--platform macosx ` +
      `--minimum-deployment-target 11.0`,
      { stdio: 'pipe' }
    );
    console.log('  ✓ Compiled Assets.car');
  } catch (error) {
    console.log(`  ⚠ actool compilation failed: ${error.stderr?.toString() || error.message}`);
    console.log('    The .icon bundle was created but Assets.car could not be compiled.');
    console.log('    You may need Xcode 26+ or tweak layers in Icon Composer.');
  }
}

/**
 * Main function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║               Eclosion Icon Generator                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  // Check sources exist
  if (!fs.existsSync(sourceSvg)) {
    console.error(`\n✗ Source SVG not found: ${sourceSvg}`);
    process.exit(1);
  }
  if (!fs.existsSync(traySourceSvg)) {
    console.error(`\n✗ Tray source SVG not found: ${traySourceSvg}`);
    process.exit(1);
  }
  const hasBetaSvg = fs.existsSync(betaSourceSvg);
  console.log(`\nApp icon source: ${sourceSvg}`);
  console.log(`Beta icon source: ${hasBetaSvg ? betaSourceSvg : '(not found, skipping)'}`);
  console.log(`Tray icon source: ${traySourceSvg}`);
  console.log(`Output: ${assetsDir}`);

  ensureDirectories();

  try {
    // Generate regular icons
    await generateLinuxIcon();
    await generateWindowsIcon();
    await generateMacIcon();
    await generateLiquidGlassIcon();
    await generateTrayIcons();

    // Generate beta icons if source exists
    if (hasBetaSvg) {
      console.log('\n────────────────────────────────────────────────────────────────');
      console.log('Generating Beta Icons...');
      console.log('────────────────────────────────────────────────────────────────');
      await generateLinuxIcon(betaSourceSvg, 'icon-beta');
      await generateWindowsIcon(betaSourceSvg, 'icon-beta');
      await generateMacIcon(betaSourceSvg, 'icon-beta');
    }

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║               Icon Generation Complete!                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    // List generated files
    console.log('\nGenerated files:');
    const files = [
      ...fs.readdirSync(assetsDir).filter(f => !fs.statSync(path.join(assetsDir, f)).isDirectory()),
      ...fs.readdirSync(trayDir).map(f => `tray/${f}`),
    ];
    for (const file of files) {
      if (!file.startsWith('.')) {
        console.log(`  - ${file}`);
      }
    }
  } catch (error) {
    console.error('\n✗ Icon generation failed:', error.message);
    process.exit(1);
  }
}

main();
