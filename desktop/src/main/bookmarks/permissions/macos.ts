/**
 * macOS Permission Handling
 *
 * Safari requires Full Disk Access due to Apple's privacy restrictions.
 * Chromium browsers store bookmarks in ~/Library/Application Support which is accessible.
 */

import * as fs from 'node:fs';
import { shell, app } from 'electron';
import type { BrowserType, PermissionStatus, PermissionResult } from '../types';

/**
 * Check if we can read the bookmark file.
 * Safari's Bookmarks.plist is protected by Full Disk Access on macOS 10.14+.
 */
export async function checkPermission(
  browserType: BrowserType,
  filePath: string
): Promise<PermissionStatus> {
  // Chromium browsers don't require special permissions on macOS
  if (browserType !== 'safari') {
    return 'not_required';
  }

  // For Safari, try to read the file to check if FDA is granted
  // Use a single open+read operation to avoid TOCTOU race condition
  try {
    const fd = await fs.promises.open(filePath, 'r');
    try {
      // Try to actually read a small portion of the file
      const buffer = Buffer.alloc(16);
      await fd.read(buffer, 0, 16, 0);
    } finally {
      await fd.close();
    }

    return 'granted';
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EPERM' || err.code === 'EACCES') {
      return 'denied';
    }
    return 'unknown';
  }
}

/**
 * Request permission for Safari.
 * Since Full Disk Access can't be programmatically requested,
 * we guide the user to System Preferences.
 */
export async function requestPermission(browserType: BrowserType): Promise<PermissionResult> {
  if (browserType !== 'safari') {
    return { granted: true, requiresManualGrant: false };
  }

  // Open System Preferences to Privacy & Security > Full Disk Access
  // This deep link works on macOS 13+ (Ventura and later)
  const prefPanePath = 'x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles';

  try {
    await shell.openExternal(prefPanePath);
  } catch {
    // Fallback to opening System Preferences main pane
    try {
      await shell.openExternal('x-apple.systempreferences:com.apple.preference.security');
    } catch {
      // Last resort - just open System Preferences
      await shell.openPath('/System/Applications/System Preferences.app');
    }
  }

  const appName = app.getName();
  return {
    granted: false,
    requiresManualGrant: true,
    instructions: `To sync Safari bookmarks, ${appName} needs Full Disk Access:

1. System Settings will open automatically
2. Go to Privacy & Security > Full Disk Access
3. Click the "+" button at the bottom of the list
4. Navigate to Applications and select "${appName}"
5. Click "Open"
6. Restart ${appName}

This permission is required because macOS protects Safari data for your privacy.`,
  };
}
