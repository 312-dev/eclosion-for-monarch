/**
 * Shared Path Utilities
 *
 * Provides consistent path resolution across the application.
 * Uses beta-aware folder names to ensure complete isolation between
 * production and beta installations.
 */

import { app } from 'electron';
import * as path from 'node:path';
import { getAppFolderName, getAppFolderNameLower } from './beta';

/**
 * Get the state directory path for the current platform.
 * This is where app data, settings, and logs are stored.
 *
 * Production builds:
 * - macOS: ~/Library/Application Support/Eclosion
 * - Windows: %APPDATA%/Eclosion
 * - Linux: ~/.config/eclosion
 *
 * Beta builds:
 * - macOS: ~/Library/Application Support/Eclosion Beta
 * - Windows: %APPDATA%/Eclosion Beta
 * - Linux: ~/.config/eclosion-beta
 */
export function getStateDir(): string {
  switch (process.platform) {
    case 'darwin':
      return path.join(app.getPath('home'), 'Library', 'Application Support', getAppFolderName());
    case 'win32':
      return path.join(app.getPath('appData'), getAppFolderName());
    default: // Linux
      return path.join(app.getPath('home'), '.config', getAppFolderNameLower());
  }
}

/**
 * Get the logs directory path.
 */
export function getLogsDir(): string {
  return path.join(getStateDir(), 'logs');
}
