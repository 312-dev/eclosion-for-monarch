/**
 * Desktop Section
 *
 * Desktop app-specific settings including:
 * - Startup (launch at login, start minimized)
 * - Security & Locking (auto-lock, biometric)
 * - Automatic Backups (encrypted daily backups)
 * - Data Folder
 */

import { useState, useEffect, useCallback } from 'react';
import { SectionHeader } from '../settingsSections';
import { useBiometric } from '../../../hooks';
import type {
  DesktopSettings,
  DesktopSettingKey,
  LockTrigger,
  LockOption,
} from '../../../types/electron';
import { StartupSection, SecuritySection, DataFolderSection } from './DesktopSectionGroups';
import { AutoBackupSection } from '../AutoBackupSection';

export function DesktopSection() {
  const [settings, setSettings] = useState<DesktopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMac, setIsMac] = useState(false);

  // Lock settings
  const [lockTrigger, setLockTrigger] = useState<LockTrigger>('system-lock');
  const [lockOptions, setLockOptions] = useState<LockOption[]>([]);

  // Biometric settings
  const biometric = useBiometric();
  const [requireBiometric, setRequireBiometricState] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!globalThis.electron) return;
    try {
      const desktopSettings = await globalThis.electron.getDesktopSettings();
      setSettings(desktopSettings);
      const appInfo = await globalThis.electron.getAppInfo();
      setIsMac(appInfo.platform === 'darwin');

      // Fetch lock settings
      const [trigger, options] = await Promise.all([
        globalThis.electron.lock.getTrigger(),
        globalThis.electron.lock.getOptions(),
      ]);
      setLockTrigger(trigger);
      setLockOptions(options);

      // Fetch biometric setting (desktop mode)
      const biometricRequired = await globalThis.electron.credentials.getRequireBiometric();
      setRequireBiometricState(biometricRequired);
    } catch {
      // Non-critical if this fails
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (globalThis.electron) {
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
      if (!globalThis.electron || !settings) return;
      try {
        const currentValue = settings[key];
        if (typeof currentValue !== 'boolean') return;
        const newValue = !currentValue;
        await globalThis.electron.setDesktopSetting(key, newValue);
        setSettings((prev) => (prev ? { ...prev, [key]: newValue } : null));
      } catch {
        // Ignore errors
      }
    },
    [settings]
  );

  const handleRevealDataFolder = async () => {
    if (!globalThis.electron) return;
    try {
      await globalThis.electron.revealDataFolder();
    } catch {
      // Ignore errors
    }
  };

  const handleLockTriggerChange = async (newTrigger: LockTrigger) => {
    if (!globalThis.electron) return;
    try {
      await globalThis.electron.lock.setTrigger(newTrigger);
      setLockTrigger(newTrigger);
    } catch {
      // Ignore errors
    }
  };

  const handleBiometricToggle = async () => {
    if (!globalThis.electron || biometric.loading) return;

    const newValue = !requireBiometric;
    await globalThis.electron.credentials.setRequireBiometric(newValue);
    setRequireBiometricState(newValue);
  };

  // Don't render if not in desktop mode
  if (!globalThis.electron) return null;

  return (
    <section className="mb-8">
      <SectionHeader sectionId="desktop" />
      <div
        className="sm:rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <StartupSection
          settings={settings}
          loading={loading}
          onSettingToggle={handleSettingToggle}
        />

        <SecuritySection
          lockTrigger={lockTrigger}
          lockOptions={lockOptions}
          loading={loading}
          biometric={{
            available: biometric.available,
            requireBiometric: requireBiometric,
            loading: biometric.loading,
            displayName: biometric.displayName,
          }}
          onLockTriggerChange={handleLockTriggerChange}
          onBiometricToggle={handleBiometricToggle}
        />

        <AutoBackupSection />

        <DataFolderSection isMac={isMac} onReveal={handleRevealDataFolder} />
      </div>
    </section>
  );
}
