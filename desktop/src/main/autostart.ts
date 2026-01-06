/**
 * Auto-Start Management
 *
 * Handles automatic launch on system login.
 */

import AutoLaunch from 'auto-launch';
import { app } from 'electron';
import Store from 'electron-store';

const store = new Store();

let autoLauncher: AutoLaunch | null = null;

/**
 * Initialize the auto-launcher.
 */
function getAutoLauncher(): AutoLaunch {
  if (!autoLauncher) {
    autoLauncher = new AutoLaunch({
      name: 'Eclosion',
      path: app.getPath('exe'),
      isHidden: true, // Start minimized to tray
    });
  }
  return autoLauncher;
}

/**
 * Check if auto-start is enabled.
 */
export async function isAutoStartEnabled(): Promise<boolean> {
  try {
    const launcher = getAutoLauncher();
    return await launcher.isEnabled();
  } catch (err) {
    console.error('Failed to check auto-start status:', err);
    return false;
  }
}

/**
 * Enable auto-start on login.
 */
export async function enableAutoStart(): Promise<void> {
  try {
    const launcher = getAutoLauncher();
    const isEnabled = await launcher.isEnabled();
    if (!isEnabled) {
      await launcher.enable();
    }
    store.set('autoStart', true);
    console.log('Auto-start enabled');
  } catch (err) {
    console.error('Failed to enable auto-start:', err);
    throw err;
  }
}

/**
 * Disable auto-start on login.
 */
export async function disableAutoStart(): Promise<void> {
  try {
    const launcher = getAutoLauncher();
    const isEnabled = await launcher.isEnabled();
    if (isEnabled) {
      await launcher.disable();
    }
    store.set('autoStart', false);
    console.log('Auto-start disabled');
  } catch (err) {
    console.error('Failed to disable auto-start:', err);
    throw err;
  }
}

/**
 * Set auto-start state.
 */
export async function setAutoStart(enabled: boolean): Promise<boolean> {
  if (enabled) {
    await enableAutoStart();
  } else {
    await disableAutoStart();
  }
  return enabled;
}

/**
 * Toggle auto-start state.
 */
export async function toggleAutoStart(): Promise<boolean> {
  const isEnabled = await isAutoStartEnabled();
  return setAutoStart(!isEnabled);
}
