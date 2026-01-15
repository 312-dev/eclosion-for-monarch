/**
 * Electron Title Bar
 *
 * Provides a draggable region at the top of fullscreen pages for desktop Electron.
 * This allows users to drag the window when there's no visible header (e.g., login/unlock pages).
 *
 * On macOS with `titleBarStyle: 'hiddenInset'`, the traffic lights are embedded
 * in the content area on the left. Without a drag region, users cannot move the window.
 *
 * On Windows with `titleBarStyle: 'hidden'` and `titleBarOverlay`, the window controls
 * (minimize/maximize/close) are overlaid on the right. The drag region excludes this area.
 */

import { useMacOSElectron, useWindowsElectron } from '../hooks';

interface ElectronTitleBarProps {
  /** Height of the drag region (default: 28px on macOS, 32px on Windows to match overlay) */
  height?: number;
}

export function ElectronTitleBar({ height }: Readonly<ElectronTitleBarProps>) {
  const isMacOSElectron = useMacOSElectron();
  const isWindowsElectron = useWindowsElectron();

  // Only render on macOS or Windows Electron (Linux uses native title bar)
  if (!isMacOSElectron && !isWindowsElectron) {
    return null;
  }

  // Platform-specific height: macOS traffic lights are ~28px, Windows overlay is 32px
  const regionHeight = height ?? (isWindowsElectron ? 32 : 28);

  return (
    <div
      className="fixed top-0 left-0 z-50"
      style={{
        height: `${regionHeight}px`,
        // On Windows, exclude the right side where overlay controls are (~150px)
        right: isWindowsElectron ? '150px' : 0,
        // @ts-expect-error - WebKit-specific CSS property for Electron
        WebkitAppRegion: 'drag',
      }}
      aria-hidden="true"
    />
  );
}
