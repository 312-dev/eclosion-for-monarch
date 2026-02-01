/**
 * Backend Integrity Checker
 *
 * Verifies the backend binary is valid and matches the expected app version.
 * If corruption or version mismatch is detected, downloads the correct binary
 * from GitHub releases.
 *
 * Validation approach:
 * 1. Run the backend with --version flag
 * 2. Verify it executes successfully (not corrupted)
 * 3. Verify the output matches the expected app version
 *
 * The backend has its version baked in via version.txt during the CI build.
 * This is more reliable than size-based checks because it actually tests
 * if the binary is executable and contains the correct version.
 */

import fs, { createWriteStream } from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { URL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { app, dialog, shell } from 'electron';
import { debugLog as log } from './logger';

const execFileAsync = promisify(execFile);

const LOG_PREFIX = '[Integrity]';

function debugLog(msg: string): void {
  log(msg, LOG_PREFIX);
}

/**
 * Get the path to the backend executable based on platform and architecture.
 *
 * On macOS, the app is a universal binary containing backends for both ARM64 and x64.
 * We select the appropriate backend at runtime based on process.arch.
 *
 * Directory structure:
 * - macOS: resources/backend-arm64/ and resources/backend-x64/
 * - Windows/Linux: resources/backend/
 */
function getBackendPath(): string {
  const resourcesPath = process.resourcesPath || app.getAppPath();

  if (process.platform === 'darwin') {
    // macOS universal binary: select architecture-specific backend
    const archDir = process.arch === 'arm64' ? 'backend-arm64' : 'backend-x64';
    return path.join(resourcesPath, archDir, 'eclosion-backend');
  }

  // Windows and Linux: single architecture backend
  const backendDir = path.join(resourcesPath, 'backend');
  if (process.platform === 'win32') {
    return path.join(backendDir, 'eclosion-backend.exe');
  }
  return path.join(backendDir, 'eclosion-backend');
}

/**
 * Check if the backend binary is corrupted.
 *
 * Validation:
 * 1. Verifies the binary exists
 * 2. Verifies the binary is executable via --version
 * 3. Verifies the version matches the expected app version
 *
 * The backend reads its version from the bundled version.txt (baked in during
 * CI build). If critical packages are missing, the backend won't start at all
 * (import error), so we don't need to check for specific packages.
 *
 * Returns true if corruption is detected, false if OK.
 */
/**
 * Check if a macOS binary matches the expected architecture.
 * Reads the Mach-O header to determine if it's arm64 or x86_64.
 */
function checkBinaryArchitecture(binaryPath: string): 'arm64' | 'x64' | 'unknown' {
  try {
    // Read first 8 bytes of the binary (Mach-O magic + CPU type)
    const fd = fs.openSync(binaryPath, 'r');
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    // Mach-O magic numbers
    const MH_MAGIC_64 = 0xfeedfacf; // 64-bit little endian
    const MH_CIGAM_64 = 0xcffaedfe; // 64-bit big endian

    const magic = buffer.readUInt32LE(0);
    if (magic !== MH_MAGIC_64 && magic !== MH_CIGAM_64) {
      // Could be a fat binary or not a Mach-O file
      return 'unknown';
    }

    // CPU type is at offset 4
    const cpuType = buffer.readUInt32LE(4);
    const CPU_TYPE_ARM64 = 0x0100000c; // ARM64
    const CPU_TYPE_X86_64 = 0x01000007; // x86_64

    if (cpuType === CPU_TYPE_ARM64) return 'arm64';
    if (cpuType === CPU_TYPE_X86_64) return 'x64';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function isBackendCorrupted(): Promise<boolean> {
  const backendPath = getBackendPath();
  const expectedVersion = app.getVersion();

  debugLog(`Backend path: ${backendPath}`);
  debugLog(`Expected version: ${expectedVersion}`);

  // Check if backend exists
  if (!fs.existsSync(backendPath)) {
    debugLog(`Backend not found at ${backendPath}`);
    return false; // Not corrupted, just missing (will fail later with proper error)
  }

  // On macOS, check if the binary architecture matches the system
  if (process.platform === 'darwin') {
    const binaryArch = checkBinaryArchitecture(backendPath);
    const systemArch = process.arch; // 'arm64' or 'x64'

    debugLog(`Binary architecture: ${binaryArch}, System architecture: ${systemArch}`);

    if (binaryArch !== 'unknown' && binaryArch !== systemArch) {
      debugLog(`CORRUPTED: Architecture mismatch - binary is ${binaryArch} but system is ${systemArch}`);
      return true;
    }
  }

  try {
    // Run the backend with --version flag
    // Backend reads its version from bundled version.txt, not from env var
    const { stdout, stderr } = await execFileAsync(backendPath, ['--version'], {
      timeout: 10000, // 10 second timeout
    });

    const backendVersion = stdout.trim();
    debugLog(`Backend reported version: ${backendVersion}`);

    if (stderr) {
      debugLog(`Backend stderr: ${stderr}`);
    }

    // Check if version matches
    if (backendVersion !== expectedVersion) {
      debugLog(`CORRUPTED: Version mismatch - expected ${expectedVersion}, got ${backendVersion}`);
      return true;
    }

    debugLog('Backend integrity check passed - version verified');
    return false;
  } catch (error) {
    // If the binary fails to execute, it's corrupted
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugLog(`CORRUPTED: Failed to execute backend - ${errorMessage}`);
    return true;
  }
}

/**
 * Get the download URL for the correct backend from GitHub releases.
 *
 * macOS builds are universal binaries (single zip for both ARM64 and x64).
 */
function getBackendDownloadUrl(): string {
  const version = app.getVersion();
  const platform = process.platform;

  // Determine the zip filename based on platform
  // macOS uses universal binary (no arch suffix)
  let zipName: string;
  if (platform === 'darwin') {
    zipName = `Eclosion-${version}-mac.zip`;
  } else if (platform === 'win32') {
    zipName = `Eclosion.Setup.${version}.exe`;
  } else {
    // Linux - use AppImage
    zipName = `Eclosion-${version}.AppImage`;
  }

  return `https://github.com/312-dev/eclosion/releases/download/v${version}/${zipName}`;
}

/**
 * Download file from URL with redirect following.
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const makeRequest = (requestUrl: string, redirectCount = 0): void => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      const urlObj = new URL(requestUrl);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        headers: {
          'User-Agent': `Eclosion/${app.getVersion()}`,
        },
      };

      https.get(options, (response) => {
        // Handle redirects
        if (response.statusCode === 302 || response.statusCode === 301) {
          const location = response.headers.location;
          if (location) {
            debugLog(`Following redirect to: ${location}`);
            makeRequest(location, redirectCount + 1);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const file = createWriteStream(destPath);
        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });

        file.on('error', (err) => {
          fs.unlink(destPath, () => {}); // Delete partial file
          reject(err);
        });
      }).on('error', reject);
    };

    makeRequest(url);
  });
}

/**
 * Extract and replace the entire backend directory from downloaded zip (macOS only).
 * We replace the whole directory because differential updates can corrupt
 * any file in the backend folder, not just the main executable.
 *
 * For universal binaries, the downloaded zip contains both backend-arm64 and backend-x64.
 * We extract the one matching the current architecture.
 */
async function extractAndReplaceBackend(zipPath: string, backendDir: string): Promise<void> {
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);

  const tempDir = path.join(app.getPath('temp'), `eclosion-repair-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Extract the zip
    debugLog(`Extracting ${zipPath} to ${tempDir}`);
    await execAsync(`unzip -q "${zipPath}" -d "${tempDir}"`);

    // Determine the backend directory name based on architecture
    // Universal builds have backend-arm64 and backend-x64
    // Older builds have a single 'backend' directory
    const archDirName = process.arch === 'arm64' ? 'backend-arm64' : 'backend-x64';
    const resourcesBase = path.join(tempDir, 'Eclosion.app', 'Contents', 'Resources');

    // Try architecture-specific directory first (universal build)
    let extractedBackendDir = path.join(resourcesBase, archDirName);
    if (!fs.existsSync(extractedBackendDir)) {
      // Fall back to single 'backend' directory (older non-universal build)
      extractedBackendDir = path.join(resourcesBase, 'backend');
    }

    const extractedBackend = path.join(extractedBackendDir, 'eclosion-backend');

    if (!fs.existsSync(extractedBackend)) {
      throw new Error(`Backend not found in extracted zip at ${extractedBackend}`);
    }

    // Log the extracted backend size for debugging
    const stats = fs.statSync(extractedBackend);
    debugLog(`Extracted backend size: ${stats.size} bytes`);

    // Remove old backend directory and replace with new one
    // Use shell commands to avoid Electron's fs patching issues with .asar files
    debugLog(`Removing old backend directory: ${backendDir}`);
    await execAsync(`rm -rf "${backendDir}"`);

    debugLog(`Copying new backend directory to: ${backendDir}`);
    await execAsync(`cp -R "${extractedBackendDir}" "${backendDir}"`);

    // Ensure the main executable has correct permissions
    const newBackendPath = path.join(backendDir, 'eclosion-backend');
    fs.chmodSync(newBackendPath, 0o755);

    debugLog('Backend repair successful');
  } finally {
    // Cleanup temp directory using shell command
    try {
      await execAsync(`rm -rf "${tempDir}"`);
    } catch {
      // Ignore cleanup errors - temp files will be cleaned up eventually
      debugLog(`Warning: Failed to cleanup temp directory ${tempDir}`);
    }
  }
}

/** Callback for reporting repair status to the loading screen */
export type RepairStatusCallback = (message: string, progress: number) => void;

/**
 * Repair the corrupted backend by downloading the correct one.
 * Reports progress via callback for the loading screen.
 */
async function repairBackend(onStatus?: RepairStatusCallback): Promise<boolean> {
  const backendPath = getBackendPath();
  const backendDir = path.dirname(backendPath); // Get the backend directory
  const version = app.getVersion();

  debugLog(`Starting backend repair for v${version}`);

  // Only support macOS repair for now (most common case)
  if (process.platform !== 'darwin') {
    debugLog('Backend repair only supported on macOS currently');
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Reinstall Required',
      message: 'A recent update didn\'t install correctly.',
      detail:
        'Your data is safe - just reinstall the app to fix this.\n\n' +
        'Click "Download" to get the latest version.',
      buttons: ['Quit', 'Download'],
      defaultId: 1,
      cancelId: 0,
    });

    if (result.response === 1) {
      // User clicked "Download" - open the download page
      await shell.openExternal('https://eclosion.app/download');
    }
    return false;
  }

  const downloadUrl = getBackendDownloadUrl();
  debugLog(`Download URL: ${downloadUrl}`);

  // Download to temp file
  const tempZip = path.join(app.getPath('temp'), `eclosion-${version}.zip`);

  try {
    onStatus?.('Downloading update...', 20);
    debugLog('Downloading correct backend...');
    await downloadFile(downloadUrl, tempZip);
    debugLog('Download complete');

    onStatus?.('Installing update...', 60);
    // Extract and replace the entire backend directory
    await extractAndReplaceBackend(tempZip, backendDir);

    onStatus?.('Verifying installation...', 90);
    // Verify the repair worked
    if (await isBackendCorrupted()) {
      throw new Error('Repair verification failed - backend still corrupted');
    }

    debugLog('Backend repair completed and verified');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugLog(`Backend repair failed: ${errorMessage}`);

    dialog.showErrorBox(
      'Backend Repair Failed',
      `Failed to repair the Eclosion backend: ${errorMessage}\n\n` +
        'Please reinstall Eclosion manually from:\n' +
        `https://github.com/312-dev/eclosion/releases/tag/v${version}`
    );
    return false;
  } finally {
    // Cleanup temp zip
    if (fs.existsSync(tempZip)) {
      fs.unlinkSync(tempZip);
    }
  }
}

/**
 * Check backend integrity and repair if needed.
 * Call this during app startup, after the loading screen is visible.
 * Repairs automatically without user prompt - status shown in loading screen.
 *
 * @param onStatus - Callback to report status to loading screen
 * @returns true if backend is OK (or was repaired), false if repair failed
 */
export async function checkAndRepairBackend(onStatus?: RepairStatusCallback): Promise<boolean> {
  debugLog('Checking backend integrity...');

  if (!(await isBackendCorrupted())) {
    return true;
  }

  debugLog('Backend corruption detected - attempting automatic repair');
  onStatus?.('Migrating backend to new version...', 10);

  // Attempt repair automatically - no user prompt needed
  return repairBackend(onStatus);
}
