/**
 * Windows Electron Detection Hook
 *
 * Detects if the app is running in Electron on Windows.
 * Used to apply platform-specific styling like title bar overlay padding.
 */

import { useState, useEffect } from 'react';
import { isDesktopMode } from '../utils/apiBase';

/**
 * Check if running in Electron on Windows.
 * Returns true only when confirmed running on Windows in desktop mode.
 */
export function useWindowsElectron(): boolean {
  const [isWindows, setIsWindows] = useState(false);

  useEffect(() => {
    if (!isDesktopMode() || !globalThis.electron) {
      return;
    }

    globalThis.electron.getAppInfo().then((info) => {
      setIsWindows(info.platform === 'win32');
    });
  }, []);

  return isWindows;
}
