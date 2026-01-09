/**
 * Auto-Start Management
 *
 * Handles automatic launch on system login using Electron's built-in API.
 * This avoids the need for System Events permissions on macOS.
 */

import { app } from 'electron';
import Store from 'electron-store';

const store = new Store();

/**
 * Check if auto-start is enabled.
 */
export function isAutoStartEnabled(): boolean {
  const settings = app.getLoginItemSettings();
  return settings.openAtLogin;
}

/**
 * Enable auto-start on login.
 */
export function enableAutoStart(): void {
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
  });
  store.set('autoStart', true);
  console.log('Auto-start enabled');
}

/**
 * Disable auto-start on login.
 */
export function disableAutoStart(): void {
  app.setLoginItemSettings({
    openAtLogin: false,
    openAsHidden: false,
  });
  store.set('autoStart', false);
  console.log('Auto-start disabled');
}

/**
 * Set auto-start state.
 */
export function setAutoStart(enabled: boolean): boolean {
  if (enabled) {
    enableAutoStart();
  } else {
    disableAutoStart();
  }
  return enabled;
}

/**
 * Toggle auto-start state.
 */
export function toggleAutoStart(): boolean {
  const isEnabled = isAutoStartEnabled();
  return setAutoStart(!isEnabled);
}
