/**
 * useBrowserSelection - Hook for browser selection in wishlist wizard
 *
 * Wraps useBookmarks to provide browser detection and selection state.
 * Handles Safari permission flow with user guidance.
 */

import { useState, useCallback, useMemo } from 'react';
import { useBookmarks } from '../useBookmarks';
import type { BrowserType, DetectedBrowser, PermissionResult } from '../../types/bookmarks';

export interface UseBrowserSelectionResult {
  /** Detected browsers with accessibility status */
  browsers: DetectedBrowser[];
  /** Only browsers that are accessible or can request permission */
  availableBrowsers: DetectedBrowser[];
  /** Currently selected browser */
  selectedBrowser: BrowserType | null;
  /** Whether browser permission has been granted */
  permissionGranted: boolean;
  /** Whether browser detection is in progress */
  isLoading: boolean;
  /** Error message if detection or permission failed */
  error: string | null;
  /** Whether we're in desktop mode (bookmarks only work in desktop) */
  isDesktopMode: boolean;
  /** Permission result with instructions for manual grant */
  permissionResult: PermissionResult | null;

  /** Re-detect available browsers */
  refreshBrowsers: () => Promise<void>;
  /** Select a browser */
  selectBrowser: (browserType: BrowserType) => void;
  /** Request permission for the selected browser (mainly Safari) */
  requestPermission: () => Promise<PermissionResult>;
  /** Clear selection */
  clearSelection: () => void;
}

export function useBrowserSelection(): UseBrowserSelectionResult {
  const {
    browsers,
    isLoading,
    error,
    detectBrowsers,
    requestPermission: requestBrowserPermission,
  } = useBookmarks();

  const [selectedBrowser, setSelectedBrowser] = useState<BrowserType | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionResult, setPermissionResult] = useState<PermissionResult | null>(null);

  // Check if we're in desktop mode
  const isDesktopMode = typeof globalThis.electron?.bookmarks !== 'undefined';

  // Filter to only accessible browsers or those that can request permission
  const availableBrowsers = useMemo(() => {
    return browsers.filter((b) => {
      // Include if accessible
      if (b.accessible) return true;
      // Include Safari even if not accessible - user can grant permission
      if (b.type === 'safari') return true;
      return false;
    });
  }, [browsers]);

  const refreshBrowsers = useCallback(async () => {
    await detectBrowsers();
    // Reset selection if the selected browser is no longer available
    if (selectedBrowser) {
      const stillAvailable = browsers.some(
        (b) => b.type === selectedBrowser && (b.accessible || b.type === 'safari')
      );
      if (!stillAvailable) {
        setSelectedBrowser(null);
        setPermissionGranted(false);
        setPermissionResult(null);
      }
    }
  }, [detectBrowsers, selectedBrowser, browsers]);

  const selectBrowser = useCallback(
    (browserType: BrowserType) => {
      setSelectedBrowser(browserType);
      // Check if already accessible
      const browser = browsers.find((b) => b.type === browserType);
      if (browser?.accessible) {
        setPermissionGranted(true);
        setPermissionResult({ granted: true, requiresManualGrant: false });
      } else {
        setPermissionGranted(false);
        setPermissionResult(null);
      }
    },
    [browsers]
  );

  const requestPermission = useCallback(async (): Promise<PermissionResult> => {
    if (!selectedBrowser) {
      const result = { granted: false, requiresManualGrant: false };
      setPermissionResult(result);
      return result;
    }

    const result = await requestBrowserPermission(selectedBrowser);
    setPermissionResult(result);
    setPermissionGranted(result.granted);

    // If permission was granted, re-detect to update browser status
    if (result.granted) {
      await detectBrowsers();
    }

    return result;
  }, [selectedBrowser, requestBrowserPermission, detectBrowsers]);

  const clearSelection = useCallback(() => {
    setSelectedBrowser(null);
    setPermissionGranted(false);
    setPermissionResult(null);
  }, []);

  return {
    browsers,
    availableBrowsers,
    selectedBrowser,
    permissionGranted,
    isLoading,
    error,
    isDesktopMode,
    permissionResult,
    refreshBrowsers,
    selectBrowser,
    requestPermission,
    clearSelection,
  };
}
