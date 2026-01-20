/**
 * Persistent Drag Region
 *
 * Provides a persistent draggable area at the top of the window for Electron.
 * This ensures the window can always be dragged, even when modals cover the header.
 *
 * The region is:
 * - Fixed at the top of the viewport
 * - Above all other content (z-index 9999)
 * - Rendered on macOS and Windows in Electron mode (Linux uses native title bar)
 * - On Windows, excludes the right side where window controls overlay
 *
 * Note: The -webkit-app-region: drag CSS property enables window dragging.
 * Single clicks pass through to content below, but click-and-drag moves the window.
 */

import { useMacOSElectron, useWindowsElectron } from '../../hooks';

export function MacOSDragRegion() {
  const isMacOSElectron = useMacOSElectron();
  const isWindowsElectron = useWindowsElectron();

  // Only render on macOS or Windows Electron (Linux uses native title bar)
  if (!isMacOSElectron && !isWindowsElectron) {
    return null;
  }

  return (
    <div
      className="macos-drag-region"
      style={isWindowsElectron ? { right: '150px' } : undefined}
      aria-hidden="true"
    />
  );
}
