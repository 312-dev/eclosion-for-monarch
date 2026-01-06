/**
 * macOS Electron Detection Hook
 *
 * Detects if the app is running in Electron on macOS.
 * Used to apply platform-specific styling like traffic light button padding.
 */

import { useState, useEffect } from 'react';
import { isDesktopMode } from '../utils/apiBase';

/**
 * Check if running in Electron on macOS.
 * Returns true only when confirmed running on macOS in desktop mode.
 */
export function useMacOSElectron(): boolean {
  const [isMacOS, setIsMacOS] = useState(false);

  useEffect(() => {
    if (!isDesktopMode() || !globalThis.electron) {
      return;
    }

    globalThis.electron.getAppInfo().then((info) => {
      setIsMacOS(info.platform === 'darwin');
    });
  }, []);

  return isMacOS;
}
