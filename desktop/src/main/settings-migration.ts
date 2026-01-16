/**
 * Settings Migration Module
 *
 * Handles migration of legacy settings to new schema.
 * Runs once on startup before any settings are read.
 */

import { getStore } from './store';
import { debugLog } from './logger';

/**
 * Migrate legacy settings to new schema.
 *
 * Migrations:
 * 1. Clean up legacy menuBarMode setting
 * 2. Clean up legacy minimizeToTray, closeToTray, showInDock settings
 * 3. Clean up legacy runInSystemTray setting (now always-on behavior)
 *
 * This function is idempotent - it only runs if legacy settings exist,
 * and deletes them after migration to prevent re-running.
 */
export function migrateSettings(): void {
  const store = getStore();

  // Migration 1: Clean up legacy menuBarMode
  const oldMenuBarMode = store.get('menuBarMode');

  if (oldMenuBarMode !== undefined) {
    debugLog(`Cleaning up legacy menuBarMode=${oldMenuBarMode}`);

    // Set defaults for other settings if not already set
    if (store.get('desktop.startMinimized') === undefined) {
      store.set('desktop.startMinimized', false);
    }
    if (store.get('desktop.launchAtLogin') === undefined) {
      store.set('desktop.launchAtLogin', false);
    }
    if (store.get('desktop.showInTaskbar') === undefined) {
      store.set('desktop.showInTaskbar', true);
    }

    // Remove old setting
    store.delete('menuBarMode');

    debugLog('menuBarMode cleanup complete');
  }

  // Migration 2: Clean up legacy tray settings
  const oldMinimizeToTray = store.get('desktop.minimizeToTray');
  const oldCloseToTray = store.get('desktop.closeToTray');
  const oldShowInDock = store.get('desktop.showInDock');

  if (
    oldMinimizeToTray !== undefined ||
    oldCloseToTray !== undefined ||
    oldShowInDock !== undefined
  ) {
    debugLog('Cleaning up legacy tray settings');

    // Clean up old settings
    store.delete('desktop.minimizeToTray');
    store.delete('desktop.closeToTray');
    store.delete('desktop.showInDock');

    debugLog('Legacy tray settings cleanup complete');
  }

  // Migration 3: Clean up legacy runInSystemTray (now always-on behavior)
  const oldRunInSystemTray = store.get('desktop.runInSystemTray');

  if (oldRunInSystemTray !== undefined) {
    debugLog('Cleaning up legacy runInSystemTray setting (now always-on)');
    store.delete('desktop.runInSystemTray');
    debugLog('runInSystemTray cleanup complete');
  }
}
