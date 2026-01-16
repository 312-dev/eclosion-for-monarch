/**
 * Installation Instructions
 *
 * Platform-specific installation instructions for the Eclosion desktop app.
 * Can show instructions for a specific platform or all platforms.
 */

import type { Platform } from '../../utils/platformDetection';

interface InstallationInstructionsProps {
  /** If provided, only shows instructions for this platform */
  readonly platform?: Platform;
  /** If true, doesn't show the platform header (for single-platform view) */
  readonly hideHeader?: boolean;
}

function MacOSInstructions({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <div
      className="p-6 rounded-xl border border-(--monarch-border)"
      style={{ backgroundColor: 'var(--monarch-bg-card)' }}
    >
      {!hideHeader && (
        <h3 className="font-semibold text-lg text-(--monarch-text-dark) mb-3">macOS</h3>
      )}
      <p className="text-(--monarch-text) mb-4">
        Universal binary - works on both Intel and Apple Silicon Macs.
      </p>
      <ol className="text-(--monarch-text) space-y-3 list-decimal list-inside">
        <li>Open the downloaded .dmg file</li>
        <li>Drag Eclosion to your Applications folder</li>
        <li>Launch Eclosion from Applications</li>
      </ol>

      <p className="text-sm text-(--monarch-text-muted) mt-4">
        The app is signed and notarized by Apple for your security.
      </p>
    </div>
  );
}

function WindowsInstructions({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <div
      className="p-6 rounded-xl border border-(--monarch-border)"
      style={{ backgroundColor: 'var(--monarch-bg-card)' }}
    >
      {!hideHeader && (
        <h3 className="font-semibold text-lg text-(--monarch-text-dark) mb-3">Windows</h3>
      )}
      <ol className="text-(--monarch-text) space-y-3 list-decimal list-inside">
        <li>Run the downloaded .exe installer</li>
        <li>If Windows SmartScreen appears, click "More info" then "Run anyway"</li>
        <li>Follow the installation wizard</li>
        <li>Launch Eclosion from the Start menu or desktop shortcut</li>
      </ol>
    </div>
  );
}

function LinuxInstructions({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <div
      className="p-6 rounded-xl border border-(--monarch-border)"
      style={{ backgroundColor: 'var(--monarch-bg-card)' }}
    >
      {!hideHeader && (
        <h3 className="font-semibold text-lg text-(--monarch-text-dark) mb-3">Linux</h3>
      )}
      <ol className="text-(--monarch-text) space-y-3 list-decimal list-inside">
        <li>
          Make the AppImage executable:{' '}
          <code className="font-mono text-sm bg-(--monarch-bg-hover) px-2 py-1 rounded">
            chmod +x Eclosion-*.AppImage
          </code>
        </li>
        <li>
          Run the AppImage:{' '}
          <code className="font-mono text-sm bg-(--monarch-bg-hover) px-2 py-1 rounded">
            ./Eclosion-*.AppImage
          </code>
        </li>
        <li>
          Optional: Use{' '}
          <a
            href="https://github.com/TheAssassin/AppImageLauncher"
            target="_blank"
            rel="noopener noreferrer"
            className="text-(--monarch-orange) hover:underline"
          >
            AppImageLauncher
          </a>{' '}
          for system integration
        </li>
      </ol>
    </div>
  );
}

export function InstallationInstructions({ platform, hideHeader }: InstallationInstructionsProps) {
  // Show specific platform instructions
  if (platform === 'macos') {
    return <MacOSInstructions hideHeader={hideHeader === true} />;
  }
  if (platform === 'windows') {
    return <WindowsInstructions hideHeader={hideHeader === true} />;
  }
  if (platform === 'linux') {
    return <LinuxInstructions hideHeader={hideHeader === true} />;
  }

  // Show all platforms (default behavior)
  return (
    <div className="space-y-6">
      <MacOSInstructions />
      <WindowsInstructions />
      <LinuxInstructions />
    </div>
  );
}
