#!/usr/bin/env node
/**
 * Build script for PyInstaller backend.
 * Compiles the Python Flask application into a standalone executable.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '../..');
const desktopDir = path.resolve(__dirname, '..');
const specFile = path.join(desktopDir, 'pyinstaller', 'eclosion.spec');
const distDir = path.join(desktopDir, 'pyinstaller', 'dist');

// Detect platform
const platform = process.platform;
const pythonCmd = platform === 'win32' ? 'python' : 'python3';

console.log('=== Building Python Backend with PyInstaller ===\n');
console.log(`Platform: ${platform}`);
console.log(`Project root: ${projectRoot}`);
console.log(`Spec file: ${specFile}`);
console.log(`Output directory: ${distDir}\n`);

// Ensure spec file exists
if (!fs.existsSync(specFile)) {
  console.error(`Error: Spec file not found at ${specFile}`);
  process.exit(1);
}

// Ensure pyinstaller dist directory exists
fs.mkdirSync(distDir, { recursive: true });

// Clean previous build
const buildDir = path.join(projectRoot, 'build');
const pyinstallerDist = path.join(projectRoot, 'dist');

console.log('Cleaning previous build artifacts...');
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
}
if (fs.existsSync(pyinstallerDist)) {
  fs.rmSync(pyinstallerDist, { recursive: true });
}

// Run PyInstaller
console.log('\nRunning PyInstaller...\n');

try {
  execSync(
    `${pythonCmd} -m PyInstaller --clean --noconfirm "${specFile}"`,
    {
      cwd: projectRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
      },
    }
  );
} catch (error) {
  console.error('\nPyInstaller build failed!');
  console.error(error.message);
  process.exit(1);
}

// Move output to expected location
const srcDist = path.join(projectRoot, 'dist', 'eclosion-backend');
const destDist = path.join(distDir, 'eclosion-backend');

console.log('\nMoving build output...');

if (!fs.existsSync(srcDist)) {
  console.error(`Error: Build output not found at ${srcDist}`);
  process.exit(1);
}

// Remove existing destination if it exists
if (fs.existsSync(destDist)) {
  fs.rmSync(destDist, { recursive: true });
}

// Move the build output
fs.renameSync(srcDist, destDist);

// Clean up PyInstaller temp directories
console.log('Cleaning up temporary files...');
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
}
if (fs.existsSync(pyinstallerDist)) {
  fs.rmSync(pyinstallerDist, { recursive: true });
}

// Verify the executable exists
const exeName = platform === 'win32' ? 'eclosion-backend.exe' : 'eclosion-backend';
const exePath = path.join(destDist, exeName);

if (fs.existsSync(exePath)) {
  const stats = fs.statSync(exePath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`\n=== Build Complete ===`);
  console.log(`Executable: ${exePath}`);
  console.log(`Size: ${sizeMB} MB`);
} else {
  console.error(`Error: Executable not found at ${exePath}`);
  process.exit(1);
}
