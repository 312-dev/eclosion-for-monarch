/**
 * afterPack Hook
 *
 * Signs PyInstaller backend binaries BEFORE electron-builder signs the app.
 * PyInstaller's Python.framework is non-standard and requires --no-strict.
 *
 * Strategy:
 * 1. Sign all .so and .dylib files in _internal (excluding Python.framework)
 * 2. For Python.framework:
 *    a. Remove _CodeSignature directory (has stale metadata without timestamps)
 *    b. Sign ONLY the real binary at Versions/X.Y/Python (not symlinks)
 *    c. Do NOT sign the bundle (PyInstaller's format is "ambiguous" to codesign)
 * 3. Sign the main eclosion-backend executable
 *
 * electron-builder's signIgnore patterns prevent re-signing of backend binaries.
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

      // Step 2b: Find and sign the REAL Python binary (not symlinks)
      // Structure: Python.framework/Versions/X.Y/Python (real binary)
      //            Python.framework/Versions/Current -> X.Y (symlink)
      //            Python.framework/Python -> Versions/Current/Python (symlink)
      const versionsDir = path.join(pythonFrameworkPath, 'Versions');
      if (fs.existsSync(versionsDir)) {
        const versions = fs.readdirSync(versionsDir);
        for (const version of versions) {
          // Skip the 'Current' symlink - we only want real version directories
          const versionPath = path.join(versionsDir, version);
          if (fs.lstatSync(versionPath).isSymbolicLink()) {
            console.log(`    Skipping symlink: Versions/${version}`);
            continue;
          }

          const pythonBinary = path.join(versionPath, 'Python');
          if (fs.existsSync(pythonBinary) && !fs.lstatSync(pythonBinary).isSymbolicLink()) {
            console.log(`    Removing signature from Versions/${version}/Python`);
            removeSignature(pythonBinary);

            console.log(`    Signing Versions/${version}/Python`);
            try {
              signFile(pythonBinary, identity, entitlementsPath, true); // --no-strict
            } catch (e) {
              console.log(`      Warning: Failed to sign: ${e.message}`);
            }

            // Verify the signature
            const result = verifySignature(pythonBinary);
            console.log(`    Verify Versions/${version}/Python: ${result.valid ? 'VALID' : 'INVALID'}`);
            if (!result.valid) {
              console.log(`      ${result.output}`);
            }
          }
        }
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
