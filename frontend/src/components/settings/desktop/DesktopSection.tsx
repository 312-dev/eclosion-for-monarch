/**
 * Desktop Section
 *
 * Desktop app-specific settings including:
 * - Startup (launch at login, start minimized)
 * - Window Behavior (minimize to tray, close to tray, show in dock)
 * - Keyboard Shortcut (global hotkey)
 * - Sync Schedule (periodic sync)
 * - Background Sync (sync when app is closed)
 * - Security & Locking (auto-lock, biometric)
 * - Automatic Backups (encrypted daily backups)
 * - Data Folder
 */

import { useState, useEffect, useCallback } from 'react';
import { Monitor } from 'lucide-react';
import { useBiometric } from '../../../hooks';
import type { DesktopSettings, DesktopSettingKey, LockTrigger, LockOption, PeriodicSyncSettings, PeriodicSyncInterval, BackgroundSyncStatus, BackgroundSyncInterval, HotkeyConfig } from '../../../types/electron';
import { StartupSection, WindowBehaviorSection, KeyboardShortcutSection, SyncScheduleSection, SecuritySection, DataFolderSection, BackgroundSyncSection } from './DesktopSectionGroups';
import { AutoBackupSection } from '../AutoBackupSection';

export function DesktopSection() {
  const [settings, setSettings] = useState<DesktopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMac, setIsMac] = useState(false);

  // Lock settings
  const [lockTrigger, setLockTrigger] = useState<LockTrigger>('system-lock');
  const [lockOptions, setLockOptions] = useState<LockOption[]>([]);

  // Periodic sync settings
  const [periodicSyncSettings, setPeriodicSyncSettings] = useState<PeriodicSyncSettings | null>(null);
  const [periodicSyncIntervals, setPeriodicSyncIntervals] = useState<PeriodicSyncInterval[]>([]);

  // Background sync settings
  const [backgroundSyncStatus, setBackgroundSyncStatus] = useState<BackgroundSyncStatus | null>(null);
  const [backgroundSyncIntervals, setBackgroundSyncIntervals] = useState<BackgroundSyncInterval[]>([]);
  const [backgroundSyncEnabling, setBackgroundSyncEnabling] = useState(false);

  // Hotkey settings
  const [toggleWindowHotkey, setToggleWindowHotkey] = useState<HotkeyConfig | null>(null);

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
      const [trigger, options] = await Promise.all([window.electron.lock.getTrigger(), window.electron.lock.getOptions()]);
      setLockTrigger(trigger);
      setLockOptions(options);

      // Fetch periodic sync settings
      const [syncSettings, syncIntervals] = await Promise.all([window.electron.periodicSync.getSettings(), window.electron.periodicSync.getIntervals()]);
      setPeriodicSyncSettings(syncSettings);
      setPeriodicSyncIntervals(syncIntervals);

      // Fetch background sync settings
      const [bgStatus, bgIntervals] = await Promise.all([window.electron.backgroundSync.getStatus(), window.electron.backgroundSync.getIntervals()]);
      setBackgroundSyncStatus(bgStatus);
      setBackgroundSyncIntervals(bgIntervals);

      // Fetch hotkey settings
      const hotkeyConfigs = await window.electron.getHotkeyConfigs();
      setToggleWindowHotkey(hotkeyConfigs['toggle-window'] ?? null);
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

  /**
   * Generic handler for toggling desktop settings via the new setDesktopSetting API.
   */
  const handleSettingToggle = useCallback(
    async (key: DesktopSettingKey) => {
      if (!window.electron || !settings) return;
      try {
        const currentValue = settings[key];
        if (typeof currentValue !== 'boolean') return;
        const newValue = !currentValue;
        await window.electron.setDesktopSetting(key, newValue);
        setSettings((prev) => (prev ? { ...prev, [key]: newValue } : null));
      } catch {
        // Ignore errors
      }
    },
    [settings]
  );

  const handleRevealDataFolder = async () => {
    if (!window.electron) return;
    try {
      await window.electron.revealDataFolder();
    } catch {
      // Ignore errors
    }
  };

  const handleHotkeyToggle = async () => {
    if (!window.electron || !toggleWindowHotkey) return;
    try {
      const newEnabled = !toggleWindowHotkey.enabled;
      await window.electron.setHotkeyConfig('toggle-window', {
        ...toggleWindowHotkey,
        enabled: newEnabled,
      });
      setToggleWindowHotkey((prev) => (prev ? { ...prev, enabled: newEnabled } : null));
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

  const handlePeriodicSyncToggle = async () => {
    if (!window.electron || !periodicSyncSettings) return;
    try {
      const newEnabled = !periodicSyncSettings.enabled;
      const result = await window.electron.periodicSync.setEnabled(newEnabled);
      setPeriodicSyncSettings(result);
    } catch {
      // Ignore errors
    }
  };

  const handlePeriodicSyncIntervalChange = async (newInterval: number) => {
    if (!window.electron) return;
    try {
      const result = await window.electron.periodicSync.setInterval(newInterval);
      setPeriodicSyncSettings(result);
    } catch {
      // Ignore errors
    }
  };

  const handleBackgroundSyncToggle = async () => {
    if (!window.electron || !backgroundSyncStatus) return;

    if (backgroundSyncStatus.installed) {
      // Disable background sync
      try {
        const result = await window.electron.backgroundSync.disable();
        if (result.success) {
          setBackgroundSyncStatus({ installed: false, intervalMinutes: backgroundSyncStatus.intervalMinutes });
        } else {
          await window.electron.showErrorDialog({
            title: 'Error',
            content: result.error || 'Failed to disable background sync',
          });
        }
      } catch {
        // Ignore errors
      }
    } else {
      // Enable background sync - need to get passphrase
      const confirmed = await window.electron.showConfirmDialog({
        title: 'Enable Background Sync',
        message: 'Background sync requires storing your passphrase securely in your system keychain.',
        detail: 'This allows Eclosion to sync your recurring expenses even when the app is closed. Your passphrase is encrypted using your operating system\'s secure credential storage.',
        confirmText: 'Continue',
        cancelText: 'Cancel',
      });

      if (!confirmed) return;

      // Check if passphrase is already stored (from biometric enrollment)
      const passphraseStored = await window.electron.biometric.isPassphraseStored();

      if (passphraseStored) {
        // Use the stored passphrase
        const storedPassphrase = await window.electron.biometric.getStoredPassphrase();
        if (storedPassphrase) {
          setBackgroundSyncEnabling(true);
          try {
            const result = await window.electron.backgroundSync.enable(60, storedPassphrase);
            if (result.success) {
              setBackgroundSyncStatus({ installed: true, intervalMinutes: 60 });
            } else {
              await window.electron.showErrorDialog({
                title: 'Error',
                content: result.error || 'Failed to enable background sync',
              });
            }
          } finally {
            setBackgroundSyncEnabling(false);
          }
          return;
        }
      }

      // Need user to enter passphrase - prompt them to lock and unlock
      await window.electron.showErrorDialog({
        title: 'Passphrase Required',
        content: 'Please lock and unlock the app to enable background sync. The next time you unlock with your passphrase, background sync will be configured.',
      });
    }
  };

  const handleBackgroundSyncIntervalChange = async (newInterval: number) => {
    if (!window.electron) return;
    try {
      const result = await window.electron.backgroundSync.setInterval(newInterval);
      if (result.success) {
        setBackgroundSyncStatus((prev) => prev ? { ...prev, intervalMinutes: newInterval } : null);
      }
    } catch {
      // Ignore errors
    }
  };

  const handleBiometricToggle = async () => {
    if (!window.electron || biometric.loading) return;

    if (biometric.enrolled) {
      await biometric.clear();
    } else {
      const confirmed = await window.electron.showConfirmDialog({
        title: `Enable ${biometric.displayName}`,
        message: `To enable ${biometric.displayName}, you'll need to enter your passphrase once to securely store it.`,
        detail: 'After setup, you can unlock the app using biometric authentication instead of typing your passphrase.',
        confirmText: 'Continue',
        cancelText: 'Cancel',
      });

      if (confirmed) {
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
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5" style={{ color: 'var(--monarch-text-muted)' }}>
        <Monitor size={12} />
        Desktop App
      </h2>
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}
      >
        <StartupSection
          settings={settings}
          loading={loading}
          onSettingToggle={handleSettingToggle}
        />

        <WindowBehaviorSection
          settings={settings}
          loading={loading}
          isMac={isMac}
          onSettingToggle={handleSettingToggle}
        />

        <KeyboardShortcutSection
          hotkeyConfig={toggleWindowHotkey}
          loading={loading}
          isMac={isMac}
          onToggle={handleHotkeyToggle}
        />

        <SyncScheduleSection
          periodicSyncSettings={periodicSyncSettings}
          periodicSyncIntervals={periodicSyncIntervals}
          loading={loading}
          onToggle={handlePeriodicSyncToggle}
          onIntervalChange={handlePeriodicSyncIntervalChange}
        />

        <BackgroundSyncSection
          status={backgroundSyncStatus}
          intervals={backgroundSyncIntervals}
          loading={loading}
          enabling={backgroundSyncEnabling}
          onToggle={handleBackgroundSyncToggle}
          onIntervalChange={handleBackgroundSyncIntervalChange}
        />

        <SecuritySection
          lockTrigger={lockTrigger}
          lockOptions={lockOptions}
          loading={loading}
          biometric={{ available: biometric.available, enrolled: biometric.enrolled, loading: biometric.loading, displayName: biometric.displayName }}
          onLockTriggerChange={handleLockTriggerChange}
          onBiometricToggle={handleBiometricToggle}
        />

        <AutoBackupSection />

        <DataFolderSection isMac={isMac} onReveal={handleRevealDataFolder} />
      </div>
    </section>
  );
}
