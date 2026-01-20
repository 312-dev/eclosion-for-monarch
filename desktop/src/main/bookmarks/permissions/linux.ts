/**
 * Linux Permission Handling
 *
 * Handles Flatpak/Snap sandboxing where bookmark files may be inaccessible.
 */

import * as fs from 'node:fs';
import type { BrowserType, PermissionStatus, PermissionResult } from '../types';

/**
 * Check if running in a sandboxed environment.
 */
function isFlatpak(): boolean {
  return fs.existsSync('/.flatpak-info');
}

function isSnap(): boolean {
  return !!process.env.SNAP;
}

function isSandboxed(): boolean {
  return isFlatpak() || isSnap();
}

/**
 * Check permission status.
 */
export async function checkPermission(
  _browserType: BrowserType,
  filePath: string
): Promise<PermissionStatus> {
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
    return 'granted';
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return 'unknown'; // File doesn't exist
    }
    // In sandboxed environments, access failures are expected
    if (isSandboxed()) {
      return 'denied';
    }
    return 'unknown';
  }
}

/**
 * Request permission.
 * For sandboxed apps, provide instructions for granting access.
 */
export async function requestPermission(_browserType: BrowserType): Promise<PermissionResult> {
  if (!isSandboxed()) {
    return { granted: true, requiresManualGrant: false };
  }

  if (isSnap()) {
    return {
      granted: false,
      requiresManualGrant: true,
      instructions: `Eclosion is running in a Snap sandbox. To access browser bookmarks:

1. Open a terminal
2. Run: snap connect eclosion:home
3. Restart Eclosion

This grants access to your home directory where browsers store bookmarks.`,
    };
  }

  if (isFlatpak()) {
    return {
      granted: false,
      requiresManualGrant: true,
      instructions: `Eclosion is running in a Flatpak sandbox. To access browser bookmarks:

1. Open a terminal
2. Run: flatpak override --user --filesystem=~/.config:ro app.eclosion.Eclosion
3. Restart Eclosion

This grants read-only access to browser configuration directories.`,
    };
  }

  return { granted: false, requiresManualGrant: false };
}
