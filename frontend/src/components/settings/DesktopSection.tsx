/**
 * Desktop Section
 *
 * Desktop app-specific settings including:
 * - Start on Login
 * - Run in Background
 * - Show in Dock (macOS only)
 * - Reveal Data Folder
 */

import { useState, useEffect, useCallback } from 'react';
import { Monitor, FolderOpen } from 'lucide-react';
import { SettingsRow } from './SettingsRow';
import { ToggleSwitch } from './ToggleSwitch';
import type { DesktopSettings } from '../../types/electron';

export function DesktopSection() {
  const [settings, setSettings] = useState<DesktopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMac, setIsMac] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!window.electron) return;
    try {
      const desktopSettings = await window.electron.getDesktopSettings();
      setSettings(desktopSettings);
      const appInfo = await window.electron.getAppInfo();
      setIsMac(appInfo.platform === 'darwin');
    } catch {
      // Non-critical if this fails
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.electron) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [fetchSettings]);

  const handleAutoStartChange = async () => {
    if (!window.electron || !settings) return;
    try {
      const newValue = !settings.autoStart;
      await window.electron.setAutoStart(newValue);
      setSettings(prev => prev ? { ...prev, autoStart: newValue } : null);
    } catch {
      // Ignore errors
    }
  };

  const handleRunInBackgroundChange = async () => {
    if (!window.electron || !settings) return;
    try {
      const newValue = !settings.runInBackground;
      await window.electron.setRunInBackground(newValue);
      setSettings(prev => prev ? { ...prev, runInBackground: newValue } : null);
    } catch {
      // Ignore errors
    }
  };

  const handleShowInDockChange = async () => {
    if (!window.electron || !settings) return;
    try {
      const newValue = !settings.showInDock;
      await window.electron.setShowInDock(newValue);
      setSettings(prev => prev ? { ...prev, showInDock: newValue } : null);
    } catch {
      // Ignore errors
    }
  };

  const handleRevealDataFolder = async () => {
    if (!window.electron) return;
    try {
      await window.electron.revealDataFolder();
    } catch {
      // Ignore errors
    }
  };

  // Don't render if not in desktop mode
  if (!window.electron) return null;

  return (
    <section className="mb-8">
      <h2
        className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        <Monitor size={12} />
        Desktop App
      </h2>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-lg"
              style={{ backgroundColor: 'var(--monarch-bg-page)' }}
            >
              <Monitor size={20} style={{ color: 'var(--monarch-text-muted)' }} />
            </div>
            <div>
              <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                Startup & Background
              </div>
              <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                Control how Eclosion runs on your system
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--monarch-border)' }} />

        <SettingsRow
          label="Start on Login"
          description="Automatically launch Eclosion when you log in"
        >
          <ToggleSwitch
            checked={settings?.autoStart ?? false}
            onChange={handleAutoStartChange}
            disabled={loading}
            ariaLabel="Toggle start on login"
          />
        </SettingsRow>

        <SettingsRow
          label="Run in Background"
          description="Keep running in system tray when window is closed"
        >
          <ToggleSwitch
            checked={settings?.runInBackground ?? false}
            onChange={handleRunInBackgroundChange}
            disabled={loading}
            ariaLabel="Toggle run in background"
          />
        </SettingsRow>

        {isMac && (
          <SettingsRow
            label="Show in Dock"
            description="Display app icon in the macOS Dock"
          >
            <ToggleSwitch
              checked={settings?.showInDock ?? true}
              onChange={handleShowInDockChange}
              disabled={loading}
              ariaLabel="Toggle show in dock"
            />
          </SettingsRow>
        )}

        <div style={{ borderTop: '1px solid var(--monarch-border)' }} />

        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-lg"
                style={{ backgroundColor: 'var(--monarch-bg-page)' }}
              >
                <FolderOpen size={20} style={{ color: 'var(--monarch-text-muted)' }} />
              </div>
              <div>
                <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                  Data Folder
                </div>
                <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                  Open the folder where Eclosion stores its data
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRevealDataFolder}
              className="px-3 py-1.5 rounded-lg text-sm font-medium hover-bg-page-to-hover"
              style={{
                color: 'var(--monarch-text-dark)',
                border: '1px solid var(--monarch-border)',
              }}
              aria-label="Reveal data folder in file manager"
            >
              Reveal in {isMac ? 'Finder' : 'Explorer'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
