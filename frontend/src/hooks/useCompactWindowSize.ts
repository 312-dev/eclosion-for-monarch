/**
 * useCompactWindowSize Hook
 *
 * Allows compact-mode screens (loading, login, modals) to request their optimal
 * window height. The main process will resize the window, clamping to min/max
 * bounds and respecting the user's screen size.
 *
 * Only has effect in desktop (Electron) compact mode.
 */

import { useEffect, useRef } from 'react';
import { isDesktopMode } from '../utils/apiBase';

/**
 * Request a specific compact window height on mount.
 * The height is clamped to bounds and respects user's screen size.
 *
 * @param height - Desired height in pixels
 */
export function useCompactWindowSize(height: number): void {
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    // Only run once per mount, only in desktop mode
    if (hasRequestedRef.current) return;
    if (!isDesktopMode()) return;

    const api = globalThis.electron?.windowMode;
    if (!api?.setCompactSize) return;

    hasRequestedRef.current = true;
    api.setCompactSize(height).catch(() => {
      // Ignore errors - this is a UX enhancement, not critical
    });
  }, [height]);
}

/**
 * Measure content and request appropriate window size.
 * Uses a ResizeObserver to track content changes.
 *
 * @returns A ref to attach to the content container
 */
export function useAutoCompactWindowSize(): React.RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHeightRef = useRef<number>(0);

  useEffect(() => {
    if (!isDesktopMode()) return;

    const api = globalThis.electron?.windowMode;
    if (!api?.setCompactSize) return;

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Get the content height plus some padding for window chrome
        const contentHeight = entry.contentRect.height;
        // Add padding for window chrome, title bar, etc. (~80px on macOS with hiddenInset)
        const desiredHeight = Math.ceil(contentHeight + 80);

        // Only resize if height changed significantly (avoid constant resizing)
        if (Math.abs(desiredHeight - lastHeightRef.current) > 20) {
          lastHeightRef.current = desiredHeight;
          api.setCompactSize(desiredHeight).catch(() => {
            // Ignore errors
          });
        }
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  return containerRef;
}
