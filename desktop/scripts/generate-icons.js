#!/usr/bin/env node
/**
 * Icon Generation Script
 *
 * Generates all required icon formats for the desktop app from the source SVG.
 * Run this script before packaging to create platform-specific icons.
 *
 * Source: frontend/public/icons/icon-512.svg
 * Output: desktop/assets/
 *
 * Dependencies: sharp, png-to-ico
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
const sourceSvg = path.join(projectRoot, 'frontend/public/icons/icon-512.svg');
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
 * Generate macOS .icns file
 * Requires macOS with iconutil command
 * @param {string} svgSource - Path to source SVG
 * @param {string} outputName - Output filename without extension (e.g., 'icon' or 'icon-beta')
 */
async function generateMacIcon(svgSource = sourceSvg, outputName = 'icon') {
  console.log(`\n📱 Generating macOS icon (${outputName})...`);

  const iconsetDir = path.join(assetsDir, `${outputName}.iconset`);
  fs.mkdirSync(iconsetDir, { recursive: true });

  // Generate all required sizes for iconset
  const sizes = [16, 32, 128, 256, 512];
  for (const size of sizes) {
    // Regular size
    await generatePng(path.join(iconsetDir, `icon_${size}x${size}.png`), size, svgSource);
    // @2x size (retina)
    await generatePng(path.join(iconsetDir, `icon_${size}x${size}@2x.png`), size * 2, svgSource);
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
