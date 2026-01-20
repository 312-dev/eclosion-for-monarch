/**
 * Windows Permission Handling
 *
 * Browser bookmarks are stored in %APPDATA% which is accessible to user applications.
 * No special permissions required.
 */

import * as fs from 'node:fs';
import type { BrowserType, PermissionStatus, PermissionResult } from '../types';

/**
 * Check permission status.
 * Windows doesn't restrict access to user's AppData folder.
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
    // Other errors (permission denied, etc.)
    return 'denied';
  }
}

/**
 * Request permission.
 * No special permissions needed on Windows for reading user's AppData.
 */
export async function requestPermission(_browserType: BrowserType): Promise<PermissionResult> {
  return { granted: true, requiresManualGrant: false };
}
