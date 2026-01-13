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
import { AutoBackupSection } from './AutoBackupSection';
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

  // Desktop mode Touch ID setting (separate from legacy passphrase-based enrollment)
  const [touchIdEnabled, setTouchIdEnabled] = useState(false);
  const [touchIdLoading, setTouchIdLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!window.electron) return;
    try {
      const desktopSettings = await window.electron.getDesktopSettings();
      setSettings(desktopSettings);
      const appInfo = await window.electron.getAppInfo();
      setIsMac(appInfo.platform === 'darwin');

      // Fetch lock settings and Touch ID setting
      const [trigger, options, requireTouchId] = await Promise.all([
        window.electron.lock.getTrigger(),
        window.electron.lock.getOptions(),
        window.electron.credentials.getRequireTouchId(),
      ]);
      setLockTrigger(trigger);
      setLockOptions(options);
      setTouchIdEnabled(requireTouchId);
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

  // Reset auto-lock to "never" when Touch ID is disabled
  // On desktop, auto-lock only makes sense with Touch ID since there's no encryption password
  useEffect(() => {
    const resetLockTrigger = async () => {
      if (!loading && !touchIdEnabled && lockTrigger !== 'never' && globalThis.electron) {
        try {
          await globalThis.electron.lock.setTrigger('never');
          setLockTrigger('never');
        } catch {
          // Ignore errors
        }
      }
    };
    void resetLockTrigger();
  }, [loading, touchIdEnabled, lockTrigger]);

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
    // On desktop, only allow auto-lock if Touch ID is enabled
    // Without Touch ID, there's no way to unlock (no encryption password on desktop)
    if (!touchIdEnabled && newTrigger !== 'never') {
      return;
    }
    try {
      await window.electron.lock.setTrigger(newTrigger);
      setLockTrigger(newTrigger);
    } catch {
      // Ignore errors
    }
  };

  const handleBiometricToggle = async () => {
    if (!window.electron || biometric.loading || touchIdLoading) return;

    setTouchIdLoading(true);

    try {
      if (touchIdEnabled) {
        // Disable Touch ID
        await window.electron.credentials.setRequireTouchId(false);
        setTouchIdEnabled(false);
      } else {
        // Enable Touch ID - prompt to verify user can use it
        const result = await window.electron.biometric.promptForSetup();

        if (result.success) {
          // Touch ID verified, enable it
          await window.electron.credentials.setRequireTouchId(true);
          setTouchIdEnabled(true);
        } else if (result.error && !result.error.includes('cancel')) {
          // Show error if not just a cancellation
          await window.electron.showErrorDialog({
            title: `${biometric.displayName} Setup Failed`,
            content: result.error,
          });
        }
        // If user cancelled, do nothing (toggle stays off)
      }
    } catch {
      // Ignore errors
    } finally {
      setTouchIdLoading(false);
    }
  };

  // Don't render if not in desktop mode
  if (!window.electron) return null;

  // Auto-lock requires Touch ID on desktop (no encryption password)
  const getAutoLockDescription = (): string => {
    if (touchIdEnabled) {
      return `When to require ${biometric.displayName} re-entry`;
    }
    if (biometric.available) {
      return `Enable ${biometric.displayName} below to use auto-lock`;
    }
    return 'Requires biometric authentication to be available';
  };

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
          description={getAutoLockDescription()}
        >
          <div className="relative">
            <select
              value={lockTrigger}
              onChange={(e) => handleLockTriggerChange(e.target.value as LockTrigger)}
              disabled={loading || !touchIdEnabled}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm cursor-pointer hover-bg-page-to-hover"
              style={{
                color: touchIdEnabled ? 'var(--monarch-text-dark)' : 'var(--monarch-text-muted)',
                border: '1px solid var(--monarch-border)',
                backgroundColor: 'var(--monarch-bg-card)',
                opacity: touchIdEnabled ? 1 : 0.6,
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
            description={`Unlock with ${biometric.displayName} instead of your credentials`}
          >
            <ToggleSwitch
              checked={touchIdEnabled}
              onChange={handleBiometricToggle}
              disabled={loading || touchIdLoading}
              ariaLabel={`Toggle ${biometric.displayName}`}
            />
          </SettingsRow>
        )}

        <AutoBackupSection />

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
