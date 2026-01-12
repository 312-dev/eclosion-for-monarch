/**
 * macOS Drag Region
 *
 * Provides a persistent draggable area at the top of the window for macOS Electron.
 * This ensures the window can always be dragged, even when modals cover the header.
 *
 * The region is:
 * - Fixed at the top of the viewport
 * - Above all other content (z-index 9999)
 * - Only rendered on macOS in Electron mode
 *
 * Note: The -webkit-app-region: drag CSS property enables window dragging.
 * Single clicks pass through to content below, but click-and-drag moves the window.
 */

import { useMacOSElectron } from '../../hooks';

export function MacOSDragRegion() {
  const isMacOSElectron = useMacOSElectron();

  // Only render on macOS Electron
  if (!isMacOSElectron) {
    return null;
  }

  return (
    <div
      className="macos-drag-region"
      aria-hidden="true"
    />
  );
}
