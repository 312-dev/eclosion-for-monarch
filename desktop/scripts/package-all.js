#!/usr/bin/env node
/**
 * Full Build Orchestration Script
 *
 * Builds the complete Eclosion desktop application:
 * 1. Frontend (React/Vite)
 * 2. Backend (PyInstaller)
 * 3. Electron main process (TypeScript)
 * 4. Package with electron-builder
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '../..');
const desktopDir = path.resolve(__dirname, '..');
const frontendDir = path.join(projectRoot, 'frontend');

// Parse command line arguments
const args = process.argv.slice(2);
const platform = args[0] || 'current';
const skipFrontend = args.includes('--skip-frontend');
const skipBackend = args.includes('--skip-backend');
const skipMainProcess = args.includes('--skip-main');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Eclosion Desktop Build                           ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log();
console.log(`Platform: ${platform}`);
console.log(`Project root: ${projectRoot}`);
console.log();

/**
 * Execute a command and log output.
 */
function run(command, cwd, description) {
  console.log(`\n▶ ${description}...`);
  console.log(`  Command: ${command}`);
  console.log(`  Working directory: ${cwd}`);
  console.log('─'.repeat(60));

  try {
    execSync(command, {
      cwd,
      stdio: 'inherit',
      env: {
        ...process.env,
        // Ensure npm/node can be found
        PATH: process.env.PATH,
      },
    });
    console.log(`✓ ${description} complete`);
  } catch (error) {
    console.error(`✗ ${description} failed!`);
    throw error;
  }
}

/**
 * Check if required tools are installed.
 */
function checkPrerequisites() {
  console.log('Checking prerequisites...');

  const checks = [
    { cmd: 'node --version', name: 'Node.js' },
    { cmd: 'npm --version', name: 'npm' },
  ];

  // Check Python (platform-specific)
  if (process.platform === 'win32') {
    checks.push({ cmd: 'python --version', name: 'Python' });
  } else {
    checks.push({ cmd: 'python3 --version', name: 'Python 3' });
  }

  for (const check of checks) {
    try {
      const result = execSync(check.cmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
      console.log(`  ✓ ${check.name}: ${result}`);
    } catch {
      console.error(`  ✗ ${check.name}: not found`);
      console.error(`    Please install ${check.name} and ensure it's in your PATH`);
      process.exit(1);
    }
  }

  console.log();
}

/**
 * Main build process.
 */
async function build() {
  const startTime = Date.now();

  checkPrerequisites();

  // Step 1: Build Frontend
  if (!skipFrontend) {
    run('npm run build', frontendDir, 'Building frontend (React/Vite)');
  } else {
    console.log('\n⏭ Skipping frontend build (--skip-frontend)');
  }

  // Step 2: Build Python Backend
  if (!skipBackend) {
    run('node scripts/build-backend.js', desktopDir, 'Building Python backend (PyInstaller)');
  } else {
    console.log('\n⏭ Skipping backend build (--skip-backend)');
  }

  // Step 3: Build Electron Main Process
  if (!skipMainProcess) {
    run('npm run build:main', desktopDir, 'Building Electron main process (TypeScript)');
  } else {
    console.log('\n⏭ Skipping main process build (--skip-main)');
  }

  // Step 4: Package with electron-builder
  let buildCommand = 'npx electron-builder';

  switch (platform) {
    case 'mac':
      buildCommand += ' --mac';
      break;
    case 'win':
      buildCommand += ' --win';
      break;
    case 'linux':
      buildCommand += ' --linux';
      break;
    case 'all':
      // Build for all platforms (requires appropriate host or CI)
      buildCommand += ' --mac --win --linux';
      break;
    case 'current':
    default:
      // Build for current platform only
      break;
  }

  run(buildCommand, desktopDir, 'Packaging application (electron-builder)');

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const releaseDir = path.join(desktopDir, 'release');

  console.log();
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    Build Complete!                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`  Duration: ${duration}s`);
  console.log(`  Output: ${releaseDir}`);
  console.log();

  // List output files
  if (fs.existsSync(releaseDir)) {
    console.log('  Generated files:');
    const files = fs.readdirSync(releaseDir);
    for (const file of files) {
      const filePath = path.join(releaseDir, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`    - ${file} (${sizeMB} MB)`);
      }
    }
  }

  console.log();
}

// Run the build
build().catch((error) => {
  console.error('\nBuild failed:', error.message);
  process.exit(1);
});
