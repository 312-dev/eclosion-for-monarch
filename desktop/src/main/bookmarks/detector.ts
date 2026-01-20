/**
 * Browser Detection
 *
 * Detects installed browsers and locates their bookmark files.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { BrowserType, DetectedBrowser, PermissionStatus } from './types';
import { BROWSER_CONFIGS } from './types';
import { checkPermission } from './permissions';

/**
 * Get the home directory with proper Windows handling.
 */
function getHomeDir(): string {
  if (process.platform === 'win32') {
    return process.env.USERPROFILE || os.homedir();
  }
  return os.homedir();
}

/**
 * Detect all installed browsers with accessible bookmark files.
 */
export async function detectBrowsers(): Promise<DetectedBrowser[]> {
  const homeDir = getHomeDir();
  const platform = process.platform as 'darwin' | 'win32' | 'linux';
  const results: DetectedBrowser[] = [];

  for (const config of BROWSER_CONFIGS) {
    const paths = config.paths[platform];
    if (!paths) continue; // Browser not available on this platform

    for (const relativePath of paths) {
      const fullPath = path.join(homeDir, relativePath);

      // Check if file exists
      let exists = false;
      try {
        await fs.promises.access(fullPath, fs.constants.F_OK);
        exists = true;
      } catch {
        // File doesn't exist
      }

      if (!exists) continue;

      // Check permissions (especially for Safari)
      let permissionStatus: PermissionStatus;
      try {
        permissionStatus = await checkPermission(config.type, fullPath);
      } catch {
        permissionStatus = 'unknown';
      }

      results.push({
        type: config.type,
        displayName: config.displayName,
        bookmarkFilePath: fullPath,
        accessible: permissionStatus === 'granted' || permissionStatus === 'not_required',
        permissionStatus,
        error: permissionStatus === 'denied' ? 'Permission denied' : undefined,
      });

      // Only add first matching path per browser (e.g., Chrome before Chromium)
      break;
    }
  }

  return results;
}

/**
 * Get bookmark file path for a specific browser.
 * Returns null if browser not installed.
 */
export function getBookmarkFilePath(browserType: BrowserType): string | null {
  const homeDir = getHomeDir();
  const platform = process.platform as 'darwin' | 'win32' | 'linux';

  const config = BROWSER_CONFIGS.find((c) => c.type === browserType);
  if (!config) return null;

  const paths = config.paths[platform];
  if (!paths) return null;

  for (const relativePath of paths) {
    const fullPath = path.join(homeDir, relativePath);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Get display name for a browser type.
 */
export function getBrowserDisplayName(browserType: BrowserType): string {
  const config = BROWSER_CONFIGS.find((c) => c.type === browserType);
  return config?.displayName ?? browserType;
}
