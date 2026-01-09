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
      className="p-4 rounded-lg border border-[var(--monarch-border)]"
      style={{ backgroundColor: 'var(--monarch-bg-card)' }}
    >
      {!hideHeader && (
        <h3 className="font-semibold text-[var(--monarch-text-dark)] mb-2">
          macOS
        </h3>
      )}
      <p className="text-sm text-[var(--monarch-text)] mb-3">
        Universal binary - works on both Intel and Apple Silicon Macs.
      </p>
      <ol className="text-sm text-[var(--monarch-text)] space-y-2 list-decimal list-inside">
        <li>Open the downloaded .dmg file</li>
        <li>Drag Eclosion to your Applications folder</li>
        <li>Launch Eclosion from Applications</li>
      </ol>

      <p className="text-xs text-[var(--monarch-text-muted)] mt-3">
        The app is signed and notarized by Apple for your security.
      </p>
    </div>
  );
}

function WindowsInstructions({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <div
      className="p-4 rounded-lg border border-[var(--monarch-border)]"
      style={{ backgroundColor: 'var(--monarch-bg-card)' }}
    >
      {!hideHeader && (
        <h3 className="font-semibold text-[var(--monarch-text-dark)] mb-2">
          Windows
        </h3>
      )}
      <ol className="text-sm text-[var(--monarch-text)] space-y-2 list-decimal list-inside">
        <li>Run the downloaded .exe installer</li>
        <li>
          If Windows SmartScreen appears, click "More info" then "Run
          anyway"
        </li>
        <li>Follow the installation wizard</li>
        <li>Launch Eclosion from the Start menu or desktop shortcut</li>
      </ol>
    </div>
  );
}

function LinuxInstructions({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <div
      className="p-4 rounded-lg border border-[var(--monarch-border)]"
      style={{ backgroundColor: 'var(--monarch-bg-card)' }}
    >
      {!hideHeader && (
        <h3 className="font-semibold text-[var(--monarch-text-dark)] mb-2">
          Linux
        </h3>
      )}
      <ol className="text-sm text-[var(--monarch-text)] space-y-2 list-decimal list-inside">
        <li>
          Make the AppImage executable:{' '}
          <code className="font-mono text-xs bg-[var(--monarch-bg-hover)] px-1.5 py-0.5 rounded">
            chmod +x Eclosion-*.AppImage
          </code>
        </li>
        <li>
          Run the AppImage:{' '}
          <code className="font-mono text-xs bg-[var(--monarch-bg-hover)] px-1.5 py-0.5 rounded">
            ./Eclosion-*.AppImage
          </code>
        </li>
        <li>
          Optional: Use{' '}
          <a
            href="https://github.com/TheAssassin/AppImageLauncher"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--monarch-orange)] hover:underline"
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
