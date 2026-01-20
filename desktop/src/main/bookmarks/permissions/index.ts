/**
 * Permission Dispatcher
 *
 * Routes permission checks to platform-specific implementations.
 */

import type { BrowserType, PermissionStatus, PermissionResult } from '../types';
import * as macos from './macos';
import * as windows from './windows';
import * as linux from './linux';

/**
 * Check permission status for accessing a browser's bookmark file.
 */
export async function checkPermission(
  browserType: BrowserType,
  filePath: string
): Promise<PermissionStatus> {
  switch (process.platform) {
    case 'darwin':
      return macos.checkPermission(browserType, filePath);
    case 'win32':
      return windows.checkPermission(browserType, filePath);
    case 'linux':
      return linux.checkPermission(browserType, filePath);
    default:
      return 'unknown';
  }
}

/**
 * Request permission to access a browser's bookmarks.
 * For Safari on macOS, this guides the user to grant Full Disk Access.
 */
export async function requestPermission(browserType: BrowserType): Promise<PermissionResult> {
  switch (process.platform) {
    case 'darwin':
      return macos.requestPermission(browserType);
    case 'win32':
      return windows.requestPermission(browserType);
    case 'linux':
      return linux.requestPermission(browserType);
    default:
      return { granted: false, requiresManualGrant: false };
  }
}
