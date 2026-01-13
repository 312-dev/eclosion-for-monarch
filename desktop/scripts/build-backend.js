#!/usr/bin/env node
/**
 * Build script for PyInstaller backend.
 * Compiles the Python Flask application into a standalone executable.
 *
 * Uses an isolated virtualenv to ensure reproducible builds with correct dependencies.
 * This prevents issues where the wrong package version (e.g., PyPI monarchmoney
 * instead of our fork) gets bundled into the app.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '../..');
const desktopDir = path.resolve(__dirname, '..');
const specFile = path.join(desktopDir, 'pyinstaller', 'eclosion.spec');
const distDir = path.join(desktopDir, 'pyinstaller', 'dist');
const venvDir = path.join(desktopDir, '.venv-build');

// Detect platform
const platform = process.platform;
const isWindows = platform === 'win32';
const pythonCmd = isWindows ? 'python' : 'python3';
const venvPython = isWindows
  ? path.join(venvDir, 'Scripts', 'python.exe')
  : path.join(venvDir, 'bin', 'python');
const venvPip = isWindows
  ? path.join(venvDir, 'Scripts', 'pip.exe')
  : path.join(venvDir, 'bin', 'pip');

// Check if running in CI (GitHub Actions sets CI=true)
const isCI = process.env.CI === 'true';

console.log('=== Building Python Backend with PyInstaller ===\n');
console.log(`Platform: ${platform}`);
console.log(`Project root: ${projectRoot}`);
console.log(`Spec file: ${specFile}`);
console.log(`Output directory: ${distDir}`);
if (!isCI) {
  console.log(`Build virtualenv: ${venvDir}`);
}
console.log(`Environment: ${isCI ? 'CI (using pre-installed deps)' : 'Local (using isolated venv)'}\n`);

// Ensure spec file exists
if (!fs.existsSync(specFile)) {
  console.error(`Error: Spec file not found at ${specFile}`);
  process.exit(1);
}

// Ensure pyinstaller dist directory exists
fs.mkdirSync(distDir, { recursive: true });

// Clean previous build artifacts
const buildDir = path.join(projectRoot, 'build');
const pyinstallerDist = path.join(projectRoot, 'dist');

console.log('Cleaning previous build artifacts...');
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
}
if (fs.existsSync(pyinstallerDist)) {
  fs.rmSync(pyinstallerDist, { recursive: true });
}

// Determine which Python to use for PyInstaller
let pyInstallerPython;

if (isCI) {
  // In CI, dependencies are pre-installed by the workflow
  // Just use the system Python directly
  pyInstallerPython = pythonCmd;
  console.log('CI mode: Using pre-installed dependencies from workflow\n');

  // Still verify monarchmoney fork in CI
  console.log('Verifying monarchmoney fork...');
  try {
    const checkResult = execSync(
      `${pythonCmd} -c "import monarchmoney; import inspect; src = inspect.getsourcefile(monarchmoney.MonarchMoney); print(f'Source: {src}'); code = open(src.replace('__init__.py', 'monarchmoney.py')).read(); assert 'GraphQLRequest' in code, 'monarchmoney is NOT from our fork!'; print('OK: monarchmoney fork verified')"`,
      { cwd: projectRoot, encoding: 'utf-8' }
    );
    console.log(checkResult);
  } catch (error) {
    console.error('\nERROR: monarchmoney verification failed!');
    console.error('CI workflow may have installed wrong monarchmoney version.');
    console.error('Check that requirements-vcs.txt is installed AFTER requirements.txt');
    process.exit(1);
  }
} else {
  // Local builds: Create isolated virtualenv for reproducible builds
  pyInstallerPython = venvPython;

  console.log('Setting up isolated build environment...\n');

  // Remove existing venv if it exists (ensures clean state)
  if (fs.existsSync(venvDir)) {
    console.log('Removing existing build virtualenv...');
    fs.rmSync(venvDir, { recursive: true });
  }

  // Create new virtualenv
  console.log('Creating build virtualenv...');
  try {
    execSync(`${pythonCmd} -m venv "${venvDir}"`, {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to create virtualenv!');
    console.error(error.message);
    process.exit(1);
  }

  // Upgrade pip in venv
  console.log('Upgrading pip...');
  try {
    execSync(`"${venvPip}" install --upgrade pip`, {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to upgrade pip!');
    console.error(error.message);
    process.exit(1);
  }

  // Install hash-verified dependencies
  console.log('\nInstalling dependencies (hash-verified)...');
  const requirementsFile = path.join(projectRoot, 'requirements.txt');
  try {
    execSync(`"${venvPip}" install --require-hashes -r "${requirementsFile}"`, {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to install requirements.txt!');
    console.error(error.message);
    process.exit(1);
  }

  // Install VCS dependencies (our monarchmoney fork)
  // CRITICAL: This must come AFTER requirements.txt to override any PyPI version
  console.log('\nInstalling VCS dependencies (monarchmoney fork)...');
  const vcsRequirementsFile = path.join(projectRoot, 'requirements-vcs.txt');
  try {
    execSync(`"${venvPip}" install --no-deps -r "${vcsRequirementsFile}"`, {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to install requirements-vcs.txt!');
    console.error(error.message);
    process.exit(1);
  }

  // Install build tools (PyInstaller)
  console.log('\nInstalling build tools (PyInstaller)...');
  try {
    execSync(`"${venvPip}" install pyinstaller>=6.0`, {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to install PyInstaller!');
    console.error(error.message);
    process.exit(1);
  }

  // Verify monarchmoney is from our fork (has GraphQLRequest in gql_call)
  console.log('\nVerifying monarchmoney fork...');
  try {
    const checkResult = execSync(
      `"${venvPython}" -c "import monarchmoney; import inspect; src = inspect.getsourcefile(monarchmoney.MonarchMoney); print(f'Source: {src}'); code = open(src.replace('__init__.py', 'monarchmoney.py')).read(); assert 'GraphQLRequest' in code, 'monarchmoney is NOT from our fork - missing GraphQLRequest!'; print('OK: monarchmoney fork verified (has GraphQLRequest)')"`,
      { cwd: projectRoot, encoding: 'utf-8' }
    );
    console.log(checkResult);
  } catch (error) {
    console.error('\nERROR: monarchmoney verification failed!');
    console.error('The wrong monarchmoney package is installed.');
    console.error('Expected: 312-dev/monarchmoney fork with gql 4.0 compatibility');
    console.error('This would cause runtime errors in the built app.');
    process.exit(1);
  }
}

// Run PyInstaller
console.log('\nRunning PyInstaller...\n');
try {
  execSync(
    `"${pyInstallerPython}" -m PyInstaller --clean --noconfirm "${specFile}"`,
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

// Clean up build virtualenv (only for local builds)
if (!isCI && fs.existsSync(venvDir)) {
  console.log('Removing build virtualenv...');
  fs.rmSync(venvDir, { recursive: true });
}

// Verify the executable exists
const exeName = isWindows ? 'eclosion-backend.exe' : 'eclosion-backend';
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
