/**
 * afterPack Hook - macOS Code Signing for PyInstaller Backend
 *
 * Signs PyInstaller backend binaries BEFORE electron-builder signs the app.
 * This is necessary because PyInstaller creates a non-standard Python.framework
 * that requires special handling for Apple notarization.
 *
 * ## The Problem
 *
 * PyInstaller creates Python.framework with:
 * 1. COPIES instead of symlinks (breaks standard framework structure)
 * 2. Pre-existing signatures WITHOUT secure timestamps (Apple rejects these)
 * 3. An "ambiguous bundle format" that confuses codesign
 *
 * ## The Solution
 *
 * 1. Sign all .so and .dylib files in _internal (excluding Python.framework)
 * 2. For Python.framework:
 *    a. Remove _CodeSignature directory (stale metadata without timestamps)
 *    b. Sign the real binary at Versions/X.Y/Python with --no-strict
 *    c. Replace copies with proper symlinks:
 *       - Python.framework/Python -> Versions/Current/Python
 *       - Python.framework/Versions/Current -> X.Y (e.g., 3.12)
 *    d. Skip bundle signing (codesign can't handle PyInstaller's format)
 * 3. Sign the main eclosion-backend executable
 *
 * The symlinks inherit the signature from their target, so we only need to
 * sign the actual binary once. electron-builder's signIgnore patterns in
 * electron-builder.yml prevent re-signing of these pre-signed binaries.
 *
 * @see https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Recursively find all files matching a predicate
 */
function findFiles(dir, predicate, results = []) {
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip symlinks to avoid signing the same file multiple times
    if (entry.isSymbolicLink()) continue;

    if (entry.isDirectory()) {
      findFiles(fullPath, predicate, results);
    } else if (predicate(entry.name, fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Check if a file is a Mach-O binary
 */
function isMachO(filePath) {
  try {
    const result = execSync(`file "${filePath}"`, { encoding: 'utf-8' });
    return result.includes('Mach-O');
  } catch {
    return false;
  }
}

/**
 * Remove any existing signature from a file
 * @param {string} filePath - Path to file
 */
function removeSignature(filePath) {
  try {
    execSync(`codesign --remove-signature "${filePath}"`, { stdio: 'pipe' });
  } catch {
    // Ignore errors - file might not have a signature
  }
}

/**
 * Verify a signature and return the result
 * @param {string} filePath - Path to file
 * @returns {object} - { valid: boolean, output: string }
 */
function verifySignature(filePath) {
  try {
    const output = execSync(`codesign -vvv --deep --strict "${filePath}" 2>&1`, { encoding: 'utf-8' });
    return { valid: true, output };
  } catch (e) {
    return { valid: false, output: e.stdout || e.stderr || e.message };
  }
}

/**
 * Sign a single file with the given flags
 * @param {string} filePath - Path to file
 * @param {string} identity - Signing identity
 * @param {string} entitlementsPath - Path to entitlements plist
 * @param {boolean} useNoStrict - Whether to use --no-strict flag
 * @param {boolean} useDeep - Whether to use --deep flag for recursive signing
 */
function signFile(filePath, identity, entitlementsPath, useNoStrict = false, useDeep = false) {
  const noStrictFlag = useNoStrict ? '--no-strict' : '';
  const deepFlag = useDeep ? '--deep' : '';
  const entitlementsFlag = entitlementsPath ? `--entitlements "${entitlementsPath}"` : '';

  const cmd = `codesign --sign "${identity}" --force --timestamp --options runtime ${deepFlag} ${noStrictFlag} ${entitlementsFlag} "${filePath}"`;

  execSync(cmd, { stdio: 'inherit' });
}

exports.default = async function (context) {
  const { electronPlatformName, appOutDir } = context;

  // Only needed for macOS
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appDir = path.join(appOutDir, `${appName}.app`);
  const backendDir = path.join(appDir, 'Contents', 'Resources', 'backend');
  const entitlementsPath = path.join(__dirname, 'entitlements.mac.plist');

  if (!fs.existsSync(backendDir)) {
    console.log('No backend directory found, skipping pre-sign');
    return;
  }

  // Get the signing identity from environment or find it
  let identity = process.env.CSC_NAME;

  if (!identity) {
    try {
      const result = execSync(
        'security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | sed \'s/.*"\\(.*\\)".*/\\1/\''
      ).toString().trim();
      if (result) {
        identity = result;
      }
    } catch {
      console.log('Could not find signing identity, skipping pre-sign');
      return;
    }
  }

  if (!identity) {
    console.log('No signing identity available, skipping pre-sign');
    return;
  }

  console.log('Pre-signing PyInstaller backend binaries...');
  console.log(`  Identity: ${identity}`);
  console.log(`  Backend: ${backendDir}`);
  console.log(`  Entitlements: ${entitlementsPath}`);

  try {
    // Step 1: Find all .so and .dylib files in _internal (excluding Python.framework)
    const internalDir = path.join(backendDir, '_internal');
    const pythonFrameworkPath = path.join(internalDir, 'Python.framework');

    const binaries = findFiles(internalDir, (name, fullPath) => {
      // Skip anything inside Python.framework - we'll sign it as a bundle
      if (fullPath.includes('Python.framework')) return false;

      if (name.endsWith('.dylib') || name.endsWith('.so')) return true;
      // Check executables (no extension but are Mach-O)
      if (!name.includes('.') && isMachO(fullPath)) return true;
      return false;
    });

    console.log(`  Found ${binaries.length} binaries to sign in _internal`);

    // Sign binaries (deepest first by sorting by path depth)
    binaries.sort((a, b) => b.split('/').length - a.split('/').length);

    for (const binary of binaries) {
      const relativePath = path.relative(backendDir, binary);
      console.log(`  Signing: ${relativePath}`);
      try {
        signFile(binary, identity, entitlementsPath, true); // --no-strict for PyInstaller binaries
      } catch (e) {
        console.log(`    Warning: Failed to sign ${relativePath}: ${e.message}`);
      }
    }

    // Step 2: Sign Python.framework
    // PyInstaller's Python.framework has an "ambiguous bundle format" that codesign
    // can't properly sign as a bundle. We must sign ONLY the binary directly.
    if (fs.existsSync(pythonFrameworkPath)) {
      console.log('  Signing Python.framework...');

      // Step 2a: Remove the framework's _CodeSignature directory
      // It contains stale metadata without timestamps that causes validation failures
      const codeSignatureDir = path.join(pythonFrameworkPath, '_CodeSignature');
      if (fs.existsSync(codeSignatureDir)) {
        console.log('    Removing _CodeSignature directory');
        fs.rmSync(codeSignatureDir, { recursive: true, force: true });
      }

      // Step 2b: Fix framework structure and sign Python binary
      // PyInstaller creates COPIES instead of symlinks, which breaks code signing.
      // A proper framework structure should be:
      //   - Python.framework/Python -> Versions/Current/Python (symlink)
      //   - Python.framework/Versions/Current -> 3.12 (symlink)
      //   - Python.framework/Versions/3.12/Python (actual binary)
      //
      // We'll replace the copies with proper symlinks before signing.

      const versionsDir = path.join(pythonFrameworkPath, 'Versions');
      const topLevelPython = path.join(pythonFrameworkPath, 'Python');

      // Find the actual version directory (e.g., "3.12")
      let actualVersion = null;
      if (fs.existsSync(versionsDir)) {
        const entries = fs.readdirSync(versionsDir);
        for (const entry of entries) {
          if (/^\d+\.\d+$/.test(entry)) {
            actualVersion = entry;
            break;
          }
        }
      }

      if (actualVersion) {
        const versionedPython = path.join(versionsDir, actualVersion, 'Python');
        const currentDir = path.join(versionsDir, 'Current');

        // Step 1: Sign the actual binary first
        if (fs.existsSync(versionedPython)) {
          console.log(`    Removing signature from Versions/${actualVersion}/Python`);
          removeSignature(versionedPython);

          console.log(`    Signing Versions/${actualVersion}/Python`);
          signFile(versionedPython, identity, entitlementsPath, true);

          const result = verifySignature(versionedPython);
          console.log(`    Verify Versions/${actualVersion}/Python: ${result.valid ? 'VALID' : 'INVALID'}`);
        }

        // Step 2: Replace Versions/Current with a symlink to the version directory
        if (fs.existsSync(currentDir)) {
          const currentStat = fs.lstatSync(currentDir);
          if (!currentStat.isSymbolicLink()) {
            console.log('    Replacing Versions/Current directory with symlink');
            fs.rmSync(currentDir, { recursive: true, force: true });
            fs.symlinkSync(actualVersion, currentDir);
          }
        } else {
          console.log('    Creating Versions/Current symlink');
          fs.symlinkSync(actualVersion, currentDir);
        }

        // Step 3: Replace top-level Python with a symlink
        if (fs.existsSync(topLevelPython)) {
          const topStat = fs.lstatSync(topLevelPython);
          if (!topStat.isSymbolicLink()) {
            console.log('    Replacing top-level Python with symlink');
            fs.unlinkSync(topLevelPython);
            fs.symlinkSync('Versions/Current/Python', topLevelPython);
          }
        } else {
          console.log('    Creating top-level Python symlink');
          fs.symlinkSync('Versions/Current/Python', topLevelPython);
        }

        console.log('    Framework structure fixed with proper symlinks');
      } else {
        console.log('    Warning: Could not find versioned Python directory');
      }

      // NOTE: We intentionally do NOT sign Python.framework as a bundle.
      // PyInstaller's framework has an "ambiguous bundle format" (could be app or framework)
      // that codesign cannot properly handle. The signIgnore patterns in electron-builder.yml
      // prevent electron-builder from signing it either.
      console.log('    Skipping bundle signing (ambiguous format - not supported by codesign)');
    }

    // Step 3: Sign the main backend executable
    const mainExecutable = path.join(backendDir, 'eclosion-backend');
    if (fs.existsSync(mainExecutable)) {
      console.log('  Signing main executable: eclosion-backend');
      try {
        signFile(mainExecutable, identity, entitlementsPath, true);
      } catch (e) {
        console.log(`    Warning: Failed to sign eclosion-backend: ${e.message}`);
      }
    }

    console.log('Pre-signing complete');
  } catch (error) {
    console.error('Pre-signing failed:', error.message);
    throw error; // Fail the build if pre-signing fails
  }
};
