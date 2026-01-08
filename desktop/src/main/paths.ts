/**
 * Shared Path Utilities
 *
 * Provides consistent path resolution across the application.
 */

import { app } from 'electron';
import * as path from 'node:path';

const APP_NAME = 'Eclosion';

/**
 * Get the state directory path for the current platform.
 * This is where app data, settings, and logs are stored.
 *
 * - macOS: ~/Library/Application Support/Eclosion
 * - Windows: %APPDATA%/Eclosion
 * - Linux: ~/.config/eclosion
 */
export function getStateDir(): string {
  switch (process.platform) {
    case 'darwin':
      return path.join(app.getPath('home'), 'Library', 'Application Support', APP_NAME);
    case 'win32':
      return path.join(app.getPath('appData'), APP_NAME);
    default: // Linux
      return path.join(app.getPath('home'), '.config', APP_NAME.toLowerCase());
  }
}

/**
 * Get the logs directory path.
 */
export function getLogsDir(): string {
  return path.join(getStateDir(), 'logs');
}
