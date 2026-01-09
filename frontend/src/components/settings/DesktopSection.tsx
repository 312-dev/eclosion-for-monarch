/**
 * Desktop Section
 *
 * Desktop app-specific settings including:
 * - Start on Login
 * - Run in Background
 * - Show in Dock (macOS only)
 * - Reveal Data Folder
 * - Security & Locking (auto-lock, biometric)
 */

import { useState, useEffect, useCallback } from 'react';
import { Monitor, FolderOpen, Shield, ChevronDown } from 'lucide-react';
import { SettingsRow } from './SettingsRow';
import { ToggleSwitch } from './ToggleSwitch';
import { useBiometric } from '../../hooks';
import type { DesktopSettings, LockTrigger, LockOption } from '../../types/electron';

export function DesktopSection() {
  const [settings, setSettings] = useState<DesktopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMac, setIsMac] = useState(false);

  // Lock settings
  const [lockTrigger, setLockTrigger] = useState<LockTrigger>('system-lock');
  const [lockOptions, setLockOptions] = useState<LockOption[]>([]);

  // Biometric settings
  const biometric = useBiometric();

  const fetchSettings = useCallback(async () => {
    if (!window.electron) return;
    try {
      const desktopSettings = await window.electron.getDesktopSettings();
      setSettings(desktopSettings);
      const appInfo = await window.electron.getAppInfo();
      setIsMac(appInfo.platform === 'darwin');

      // Fetch lock settings
      const [trigger, options] = await Promise.all([
        window.electron.lock.getTrigger(),
        window.electron.lock.getOptions(),
      ]);
      setLockTrigger(trigger);
      setLockOptions(options);
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

  const handleMenuBarModeChange = async () => {
    if (!window.electron || !settings) return;
    try {
      const newValue = !settings.menuBarMode;
      await window.electron.setMenuBarMode(newValue);
      setSettings(prev => prev ? { ...prev, menuBarMode: newValue } : null);
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

  const handleLockTriggerChange = async (newTrigger: LockTrigger) => {
    if (!window.electron) return;
    try {
      await window.electron.lock.setTrigger(newTrigger);
      setLockTrigger(newTrigger);
    } catch {
      // Ignore errors
    }
  };

  const handleBiometricToggle = async () => {
    if (!window.electron || biometric.loading) return;

    if (biometric.enrolled) {
      // Clear biometric enrollment
      await biometric.clear();
    } else {
      // Enroll biometric - need to prompt user for passphrase first
      // For now, show a message that they need to unlock first
      // This will be handled by a separate enrollment flow
      const confirmed = await window.electron.showConfirmDialog({
        title: `Enable ${biometric.displayName}`,
        message: `To enable ${biometric.displayName}, you'll need to enter your passphrase once to securely store it.`,
        detail: 'After setup, you can unlock the app using biometric authentication instead of typing your passphrase.',
        confirmText: 'Continue',
        cancelText: 'Cancel',
      });

      if (confirmed) {
        // The actual enrollment happens in PassphrasePrompt after successful unlock
        // For now, we just inform the user
        await window.electron.showErrorDialog({
          title: 'Enrollment',
          content: `Please lock and unlock the app to complete ${biometric.displayName} setup. The next time you unlock with your passphrase, you'll be prompted to enable biometric authentication.`,
        });
      }
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
          label={isMac ? 'Menu Bar Mode' : 'Run in Background'}
          description={
            isMac
              ? 'Hide from Dock and run as a menu bar icon only'
              : 'Minimize to system tray instead of quitting when window is closed'
          }
        >
          <ToggleSwitch
            checked={settings?.menuBarMode ?? false}
            onChange={handleMenuBarModeChange}
            disabled={loading}
            ariaLabel={isMac ? 'Toggle menu bar mode' : 'Toggle run in background'}
          />
        </SettingsRow>

        <div style={{ borderTop: '1px solid var(--monarch-border)' }} />

        <div className="p-4">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-lg"
              style={{ backgroundColor: 'var(--monarch-bg-page)' }}
            >
              <Shield size={20} style={{ color: 'var(--monarch-text-muted)' }} />
            </div>
            <div>
              <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                Security & Locking
              </div>
              <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                Configure when to lock the app and how to unlock
              </div>
            </div>
          </div>
        </div>

        <SettingsRow
          label="Auto-lock"
          description="When to require passphrase re-entry"
        >
          <div className="relative">
            <select
              value={lockTrigger}
              onChange={(e) => handleLockTriggerChange(e.target.value as LockTrigger)}
              disabled={loading}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm cursor-pointer hover-bg-page-to-hover"
              style={{
                color: 'var(--monarch-text-dark)',
                border: '1px solid var(--monarch-border)',
                backgroundColor: 'var(--monarch-bg-card)',
              }}
              aria-label="Select auto-lock timing"
            >
              {lockOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--monarch-text-muted)' }}
            />
          </div>
        </SettingsRow>

        {biometric.available && (
          <SettingsRow
            label={`Use ${biometric.displayName}`}
            description={`Unlock with ${biometric.displayName} instead of passphrase`}
          >
            <ToggleSwitch
              checked={biometric.enrolled}
              onChange={handleBiometricToggle}
              disabled={loading || biometric.loading}
              ariaLabel={`Toggle ${biometric.displayName}`}
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
