/**
 * afterPack Hook - macOS Code Signing for PyInstaller Backend
 *
 * This hook runs AFTER electron-builder packs the app but BEFORE signing.
 * It handles two critical tasks for macOS universal binary builds:
 *
 * ## Task 1: Architecture-Specific Backend Isolation
 *
 * When building universal binaries, electron-builder:
 * 1. Builds arm64 app (with both backend-arm64 and backend-x64 from extraResources)
 * 2. Builds x64 app (with both backend-arm64 and backend-x64 from extraResources)
 * 3. Merges using lipo
 *
 * The problem: lipo tries to merge identical files from both builds, causing
 * "same architectures" errors. Solution: remove the non-matching backend from
 * each single-arch build. The universal merge then just copies each directory.
 *
 * - arm64 build: remove backend-x64 (will come from x64 build during merge)
 * - x64 build: remove backend-arm64 (will come from arm64 build during merge)
 *
 * ## Task 2: PyInstaller Code Signing
 *
 * PyInstaller creates Python.framework with issues for notarization:
 * 1. COPIES instead of symlinks (breaks standard framework structure)
 * 2. Pre-existing signatures WITHOUT secure timestamps (Apple rejects these)
 * 3. An "ambiguous bundle format" that confuses codesign
 *
 * Solution:
 * 1. Sign all .so and .dylib files in _internal (excluding Python.framework)
 * 2. For Python.framework:
 *    a. Remove _CodeSignature directory (stale metadata without timestamps)
 *    b. Sign the real binary at Versions/X.Y/Python with --no-strict
 *    c. Replace copies with proper symlinks
 *    d. Skip bundle signing (codesign can't handle PyInstaller's format)
 * 3. Sign the main eclosion-backend executable
 *
 * The symlinks inherit the signature from their target, so we only need to
 * sign the actual binary once. electron-builder's signIgnore patterns in
 * electron-builder.yml prevent re-signing of these pre-signed binaries.
 *
 * @see https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution
 */

const { execSync, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');
const fs = require('node:fs');

const execFileAsync = promisify(execFile);

// Number of parallel codesign processes (tuned for GitHub Actions macOS runners)
const PARALLEL_SIGN_LIMIT = 8;

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

/**
 * Sign a single file asynchronously (for parallel signing)
 * @param {string} filePath - Path to file
 * @param {string} identity - Signing identity
 * @param {string} entitlementsPath - Path to entitlements plist
 * @param {boolean} useNoStrict - Whether to use --no-strict flag
 * @returns {Promise<{success: boolean, path: string, error?: string}>}
 */
async function signFileAsync(filePath, identity, entitlementsPath, useNoStrict = false) {
  const args = [
    '--sign', identity,
    '--force',
    '--timestamp',
    '--options', 'runtime',
  ];

  if (useNoStrict) {
    args.push('--no-strict');
  }

  if (entitlementsPath) {
    args.push('--entitlements', entitlementsPath);
  }

  args.push(filePath);

  try {
    await execFileAsync('codesign', args);
    return { success: true, path: filePath };
  } catch (e) {
    return { success: false, path: filePath, error: e.message };
  }
}

/**
 * Run async tasks in parallel with concurrency limit
 * @param {Array<() => Promise<T>>} tasks - Array of task functions
 * @param {number} limit - Max concurrent tasks
 * @returns {Promise<T[]>}
 */
async function runParallel(tasks, limit) {
  const results = [];
  const executing = new Set();

  for (const task of tasks) {
    const promise = task().then((result) => {
      executing.delete(promise);
      return result;
    });
    executing.add(promise);
    results.push(promise);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}

/**
 * Sign a single backend directory (handles both arm64 and x64 backends)
 */
async function signBackendDirectory(backendDir, identity, entitlementsPath) {
  console.log(`  Signing backend: ${path.basename(backendDir)}`);

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

  console.log(`    Found ${binaries.length} binaries to sign in _internal`);
  console.log(`    Signing in parallel (max ${PARALLEL_SIGN_LIMIT} concurrent)...`);

  // Sign binaries in parallel for faster builds
  const signTasks = binaries.map((binary) => () =>
    signFileAsync(binary, identity, entitlementsPath, true)
  );

  const startTime = Date.now();
  const results = await runParallel(signTasks, PARALLEL_SIGN_LIMIT);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Report results
  const failures = results.filter((r) => !r.success);
  console.log(`    Signed ${results.length - failures.length}/${results.length} binaries in ${elapsed}s`);

  for (const failure of failures) {
    const relativePath = path.relative(backendDir, failure.path);
    console.log(`      Warning: Failed to sign ${relativePath}: ${failure.error}`);
  }

  // Step 2: Sign Python.framework
  if (fs.existsSync(pythonFrameworkPath)) {
    console.log('    Signing Python.framework...');

    // Remove the framework's _CodeSignature directory
    const codeSignatureDir = path.join(pythonFrameworkPath, '_CodeSignature');
    if (fs.existsSync(codeSignatureDir)) {
      console.log('      Removing _CodeSignature directory');
      fs.rmSync(codeSignatureDir, { recursive: true, force: true });
    }

    // Fix framework structure and sign Python binary
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

      // Sign the actual binary first
      if (fs.existsSync(versionedPython)) {
        console.log(`      Removing signature from Versions/${actualVersion}/Python`);
        removeSignature(versionedPython);

        console.log(`      Signing Versions/${actualVersion}/Python`);
        signFile(versionedPython, identity, entitlementsPath, true);

        const result = verifySignature(versionedPython);
        console.log(`      Verify Versions/${actualVersion}/Python: ${result.valid ? 'VALID' : 'INVALID'}`);
      }

      // Replace Versions/Current with a symlink to the version directory
      if (fs.existsSync(currentDir)) {
        const currentStat = fs.lstatSync(currentDir);
        if (!currentStat.isSymbolicLink()) {
          console.log('      Replacing Versions/Current directory with symlink');
          fs.rmSync(currentDir, { recursive: true, force: true });
          fs.symlinkSync(actualVersion, currentDir);
        }
      } else {
        console.log('      Creating Versions/Current symlink');
        fs.symlinkSync(actualVersion, currentDir);
      }

      // Replace top-level Python with a symlink
      if (fs.existsSync(topLevelPython)) {
        const topStat = fs.lstatSync(topLevelPython);
        if (!topStat.isSymbolicLink()) {
          console.log('      Replacing top-level Python with symlink');
          fs.unlinkSync(topLevelPython);
          fs.symlinkSync('Versions/Current/Python', topLevelPython);
        }
      } else {
        console.log('      Creating top-level Python symlink');
        fs.symlinkSync('Versions/Current/Python', topLevelPython);
      }

      console.log('      Framework structure fixed with proper symlinks');
    } else {
      console.log('      Warning: Could not find versioned Python directory');
    }

    console.log('      Skipping bundle signing (ambiguous format - not supported by codesign)');
  }

  // Step 3: Sign the main backend executable
  const mainExecutable = path.join(backendDir, 'eclosion-backend');
  if (fs.existsSync(mainExecutable)) {
    console.log('    Signing main executable: eclosion-backend');
    try {
      signFile(mainExecutable, identity, entitlementsPath, true);
    } catch (e) {
      console.log(`      Warning: Failed to sign eclosion-backend: ${e.message}`);
    }
  }
}

exports.default = async function (context) {
  const { electronPlatformName, appOutDir, arch } = context;

  // Only needed for macOS
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appDir = path.join(appOutDir, `${appName}.app`);
  const resourcesDir = path.join(appDir, 'Contents', 'Resources');
  const entitlementsPath = path.join(__dirname, 'entitlements.mac.plist');

  // For universal binaries, we have backend-arm64 and backend-x64 directories
  // For single-arch builds (Windows/Linux), we have a single backend directory
  const backendArm64 = path.join(resourcesDir, 'backend-arm64');
  const backendX64 = path.join(resourcesDir, 'backend-x64');
  const backendSingle = path.join(resourcesDir, 'backend');

  // electron-builder arch values: 0 = x64, 1 = ia32, 3 = arm64, 4 = universal
  // When building universal, electron-builder first builds x64, then arm64, then merges.
  // We need to remove the "wrong" backend directory from each single-arch build
  // so that the universal merge just copies each backend without lipo conflicts.
  const archName = arch === 3 ? 'arm64' : arch === 0 ? 'x64' : null;

  if (archName) {
    console.log(`Architecture: ${archName} (arch=${arch})`);

    // Remove the backend directory that doesn't match this architecture
    if (archName === 'arm64' && fs.existsSync(backendX64)) {
      console.log('  Removing backend-x64 from arm64 build (will be added from x64 build during merge)');
      fs.rmSync(backendX64, { recursive: true, force: true });
    } else if (archName === 'x64' && fs.existsSync(backendArm64)) {
      console.log('  Removing backend-arm64 from x64 build (will be added from arm64 build during merge)');
      fs.rmSync(backendArm64, { recursive: true, force: true });
    }
  }

  const backendDirs = [];
  if (fs.existsSync(backendArm64)) backendDirs.push(backendArm64);
  if (fs.existsSync(backendX64)) backendDirs.push(backendX64);
  if (fs.existsSync(backendSingle)) backendDirs.push(backendSingle);

  if (backendDirs.length === 0) {
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
  console.log(`  Backend directories: ${backendDirs.map(d => path.basename(d)).join(', ')}`);
  console.log(`  Entitlements: ${entitlementsPath}`);

  try {
    // Sign each backend directory (for universal builds, we have arm64 and x64)
    for (const backendDir of backendDirs) {
      await signBackendDirectory(backendDir, identity, entitlementsPath);
    }

    console.log('Pre-signing complete');
  } catch (error) {
    console.error('Pre-signing failed:', error.message);
    throw error; // Fail the build if pre-signing fails
  }
};
