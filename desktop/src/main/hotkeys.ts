/**
 * Global Hotkeys
 *
 * Registers system-wide keyboard shortcuts for common actions.
 * Shortcuts work even when the app is in the background.
 *
 * Default shortcuts:
 * - CmdOrCtrl+Shift+E: Toggle window visibility (show/hide)
 * - CmdOrCtrl+Shift+S: Trigger sync
 */

import { globalShortcut } from 'electron';
import { getMainWindow, showWindow } from './window';
import { debugLog } from './logger';
import { getStore, type HotkeyConfig } from './store';

// Re-export HotkeyConfig from store for backwards compatibility
export type { HotkeyConfig } from './store';

/**
 * Available hotkey actions.
 */
export type HotkeyAction = 'toggle-window' | 'trigger-sync';

/**
 * Default hotkey configurations.
 */
const DEFAULT_HOTKEYS: Record<HotkeyAction, HotkeyConfig> = {
  'toggle-window': {
    enabled: true,
    accelerator: 'CmdOrCtrl+Shift+E',
  },
  'trigger-sync': {
    enabled: true,
    accelerator: 'CmdOrCtrl+Shift+S',
  },
};

/**
 * Callback for sync action (set by initialize).
 */
let syncCallback: (() => Promise<void>) | null = null;

/**
 * Track registered shortcuts for cleanup.
 */
const registeredShortcuts: string[] = [];

/**
 * Get hotkey configuration from store or defaults.
 */
export function getHotkeyConfig(action: HotkeyAction): HotkeyConfig {
  const stored = getStore().get(`hotkeys.${action}`) as HotkeyConfig | undefined;
  return stored ?? DEFAULT_HOTKEYS[action];
}

/**
 * Get all hotkey configurations.
 */
export function getAllHotkeyConfigs(): Record<HotkeyAction, HotkeyConfig> {
  return {
    'toggle-window': getHotkeyConfig('toggle-window'),
    'trigger-sync': getHotkeyConfig('trigger-sync'),
  };
}

/**
 * Set hotkey configuration.
 */
export function setHotkeyConfig(action: HotkeyAction, config: HotkeyConfig): boolean {
  // Unregister old shortcut first
  const oldConfig = getHotkeyConfig(action);
  if (oldConfig.enabled && registeredShortcuts.includes(oldConfig.accelerator)) {
    globalShortcut.unregister(oldConfig.accelerator);
    const index = registeredShortcuts.indexOf(oldConfig.accelerator);
    if (index > -1) {
      registeredShortcuts.splice(index, 1);
    }
  }

  // Save new config
  getStore().set(`hotkeys.${action}`, config);

  // Register new shortcut if enabled
  if (config.enabled) {
    return registerHotkey(action, config.accelerator);
  }

  return true;
}

/**
 * Toggle window visibility (show/hide).
 */
function toggleWindow(): void {
  const mainWindow = getMainWindow();
  if (!mainWindow) {
    debugLog('Hotkey: toggle-window - no window, creating');
    showWindow();
    return;
  }

  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    debugLog('Hotkey: toggle-window - hiding');
    mainWindow.hide();
  } else {
    debugLog('Hotkey: toggle-window - showing');
    showWindow();
  }
}

/**
 * Trigger sync action.
 */
async function triggerSync(): Promise<void> {
  debugLog('Hotkey: trigger-sync');
  if (syncCallback) {
    await syncCallback();
  }
}

/**
 * Register a single hotkey.
 */
function registerHotkey(action: HotkeyAction, accelerator: string): boolean {
  try {
    // Check if already registered (by another action or externally)
    if (globalShortcut.isRegistered(accelerator)) {
      debugLog(`Hotkey ${accelerator} is already registered`);
      return false;
    }

    let handler: () => void;
    switch (action) {
      case 'toggle-window':
        handler = toggleWindow;
        break;
      case 'trigger-sync':
        handler = () => void triggerSync();
        break;
      default:
        debugLog(`Unknown hotkey action: ${action}`);
        return false;
    }

    const success = globalShortcut.register(accelerator, handler);
    if (success) {
      registeredShortcuts.push(accelerator);
      debugLog(`Registered hotkey: ${accelerator} for ${action}`);
    } else {
      debugLog(`Failed to register hotkey: ${accelerator} for ${action}`);
    }

    return success;
  } catch (error) {
    debugLog(`Error registering hotkey ${accelerator}: ${error}`);
    return false;
  }
}

/**
 * Initialize global hotkeys.
 * @param onSync Callback to execute when sync hotkey is pressed
 */
export function initializeHotkeys(onSync: () => Promise<void>): void {
  syncCallback = onSync;

  debugLog('Initializing global hotkeys...');

  // Register all enabled hotkeys
  for (const action of Object.keys(DEFAULT_HOTKEYS) as HotkeyAction[]) {
    const config = getHotkeyConfig(action);
    if (config.enabled) {
      registerHotkey(action, config.accelerator);
    }
  }

  debugLog(`Registered ${registeredShortcuts.length} global hotkeys`);
}

/**
 * Unregister all global hotkeys.
 * Should be called during app cleanup.
 */
export function unregisterAllHotkeys(): void {
  debugLog('Unregistering all global hotkeys...');

  for (const accelerator of registeredShortcuts) {
    globalShortcut.unregister(accelerator);
  }

  registeredShortcuts.length = 0;
  debugLog('All hotkeys unregistered');
}

/**
 * Check if a keyboard shortcut is valid and not in use.
 * Returns error message if invalid, null if valid.
 */
export function validateShortcut(accelerator: string, currentAction?: HotkeyAction): string | null {
  // Check basic format (Electron accelerator syntax)
  const validModifiers = ['Command', 'Cmd', 'Control', 'Ctrl', 'CmdOrCtrl', 'Alt', 'Option', 'AltGr', 'Shift', 'Super', 'Meta'];
  const parts = accelerator.split('+');

  if (parts.length < 2) {
    return 'Shortcut must include at least one modifier and a key';
  }

  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);

  // Validate modifiers
  for (const mod of modifiers) {
    if (!validModifiers.includes(mod)) {
      return `Invalid modifier: ${mod}`;
    }
  }

  // Validate key (basic check)
  if (!key || key.length === 0) {
    return 'Missing key';
  }

  // Check if already in use by another action
  for (const action of Object.keys(DEFAULT_HOTKEYS) as HotkeyAction[]) {
    if (action === currentAction) continue;
    const config = getHotkeyConfig(action);
    if (config.enabled && config.accelerator === accelerator) {
      return `Shortcut already used for: ${action}`;
    }
  }

  // Check if globally registered (but not by us)
  if (globalShortcut.isRegistered(accelerator) && !registeredShortcuts.includes(accelerator)) {
    return 'Shortcut is in use by another application';
  }

  return null;
}

/**
 * Reset hotkeys to defaults.
 */
export function resetHotkeysToDefaults(): void {
  debugLog('Resetting hotkeys to defaults...');

  // Unregister current hotkeys
  unregisterAllHotkeys();

  // Clear stored configs
  getStore().delete('hotkeys');

  // Re-register defaults
  for (const action of Object.keys(DEFAULT_HOTKEYS) as HotkeyAction[]) {
    const config = DEFAULT_HOTKEYS[action];
    if (config.enabled) {
      registerHotkey(action, config.accelerator);
    }
  }

  debugLog('Hotkeys reset to defaults');
}
