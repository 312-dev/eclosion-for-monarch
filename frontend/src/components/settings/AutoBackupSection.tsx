/**
 * Auto-Backup Section
 *
 * Desktop-only settings for automatic encrypted backups.
 * Allows users to configure:
 * - Enable/disable auto-backup
 * - Backup folder selection
 * - Retention period (7-30 days)
 * - Manual backup trigger
 * - View and restore from existing backups
 */

import { useState, useEffect, useCallback } from 'react';
import { HardDrive, FolderOpen, ChevronDown, RefreshCw, ExternalLink, Clock } from 'lucide-react';
import { SettingsRow } from './SettingsRow';
import { ToggleSwitch } from './ToggleSwitch';
import { BackupRestoreModal } from './BackupRestoreModal';
import { BackupsList } from './BackupsList';
import { formatBackupDate } from './backupUtils';
import { useToast } from '../../context/ToastContext';
import type {
  AutoBackupSettings,
  AutoBackupRetentionOption,
  AutoBackupFileInfo,
} from '../../types/electron';

export function AutoBackupSection() {
  const toast = useToast();
  const [settings, setSettings] = useState<AutoBackupSettings | null>(null);
  const [retentionOptions, setRetentionOptions] = useState<AutoBackupRetentionOption[]>([]);
  const [backups, setBackups] = useState<AutoBackupFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [restoreBackup, setRestoreBackup] = useState<AutoBackupFileInfo | null>(null);

  const fetchData = useCallback(async () => {
    if (!globalThis.electron?.autoBackup) return;

    try {
      const [settingsData, optionsData, backupsData] = await Promise.all([
        globalThis.electron.autoBackup.getSettings(),
        globalThis.electron.autoBackup.getRetentionOptions(),
        globalThis.electron.autoBackup.listBackups(),
      ]);

      setSettings(settingsData);
      setRetentionOptions(optionsData);
      setBackups(backupsData);
    } catch {
      // Non-critical if this fails
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (globalThis.electron?.autoBackup) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [fetchData]);

  const handleEnabledChange = async () => {
    if (!globalThis.electron?.autoBackup || !settings) return;

    let selectedPath: string | null = null;
    if (!settings.enabled && !settings.folderPath) {
      selectedPath = await globalThis.electron.autoBackup.selectFolder();
      if (!selectedPath) return;
    }

    try {
      const newValue = !settings.enabled;
      await globalThis.electron.autoBackup.setEnabled(newValue);
      setSettings((prev) =>
        prev
          ? { ...prev, enabled: newValue, ...(selectedPath && { folderPath: selectedPath }) }
          : null
      );

      if (newValue) toast.success('Auto-backup enabled');
    } catch {
      toast.error('Failed to update auto-backup setting');
    }
  };

  const handleSelectFolder = async () => {
    if (!globalThis.electron?.autoBackup) return;

    try {
      const path = await globalThis.electron.autoBackup.selectFolder();
      if (path) {
        setSettings((prev) => (prev ? { ...prev, folderPath: path } : null));
        const backupsData = await globalThis.electron.autoBackup.listBackups();
        setBackups(backupsData);
        toast.success('Backup folder updated');
      }
    } catch {
      toast.error('Failed to select folder');
    }
  };

  const handleOpenFolder = async () => {
    if (!globalThis.electron?.autoBackup || !settings?.folderPath) return;
    await globalThis.electron.autoBackup.openFolder();
  };

  const handleRetentionChange = async (days: number) => {
    if (!globalThis.electron?.autoBackup) return;

    try {
      await globalThis.electron.autoBackup.setRetention(days);
      setSettings((prev) => (prev ? { ...prev, retentionDays: days } : null));
    } catch {
      toast.error('Failed to update retention period');
    }
  };

  const handleScheduledTimeChange = async (time: string) => {
    if (!globalThis.electron?.autoBackup) return;

    try {
      await globalThis.electron.autoBackup.setScheduledTime(time);
      setSettings((prev) => (prev ? { ...prev, scheduledTime: time } : null));
    } catch {
      toast.error('Failed to update backup time');
    }
  };

  const handleBackupNow = async () => {
    if (!globalThis.electron?.autoBackup || isBackingUp) return;

    setIsBackingUp(true);
    try {
      const result = await globalThis.electron.autoBackup.runNow();
      if (result.success) {
        toast.success('Backup created successfully');
        await fetchData();
      } else {
        toast.error(result.error || 'Backup failed');
      }
    } catch {
      toast.error('Backup failed');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (backup: AutoBackupFileInfo, passphrase?: string) => {
    if (!globalThis.electron?.autoBackup) return;

    const result = await globalThis.electron.autoBackup.restore(backup.filePath, passphrase);

    if (result.success) {
      toast.success('Settings restored successfully. Refreshing...');
      setRestoreBackup(null);
      setTimeout(() => globalThis.location.reload(), 1500);
    } else if (result.needsCredentials) {
      throw new Error('Invalid credentials - decryption failed');
    } else {
      throw new Error(result.error || 'Restore failed');
    }
  };

  if (!globalThis.electron?.autoBackup) return null;

  const isConfigured = settings?.folderPath != null;
  const lastBackupText = settings?.lastBackupDate
    ? `Last backup: ${formatBackupDate(settings.lastBackupDate + 'T00:00:00')}`
    : 'No backups yet';

  const displayPath = settings?.folderPath
    ? settings.folderPath.replace(/^\/Users\/[^/]+/, '~').replace(/^C:\\Users\\[^\\]+/, '~')
    : 'No folder selected';

  return (
    <>
      <div style={{ borderTop: '1px solid var(--monarch-border)' }} />

      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
            <HardDrive size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          </div>
          <div>
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Automatic Backups
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
              Daily encrypted backups to a folder of your choice
            </div>
          </div>
        </div>
      </div>

      <SettingsRow
        label="Enable Auto-Backup"
        description="Encrypt and save daily backups automatically"
      >
        <ToggleSwitch
          checked={settings?.enabled ?? false}
          onChange={handleEnabledChange}
          disabled={loading}
          ariaLabel="Toggle auto-backup"
        />
      </SettingsRow>

      <SettingsRow label="Backup Folder" description={displayPath}>
        <div className="flex items-center gap-2">
          {settings?.folderPath && (
            <button
              type="button"
              onClick={handleOpenFolder}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-sm font-medium hover-bg-page-to-hover flex items-center gap-1.5"
              style={{
                color: 'var(--monarch-text-dark)',
                border: '1px solid var(--monarch-border)',
              }}
              aria-label="Open backup folder"
            >
              <ExternalLink size={14} />
              Open
            </button>
          )}
          <button
            type="button"
            onClick={handleSelectFolder}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-sm font-medium hover-bg-page-to-hover flex items-center gap-1.5"
            style={{ color: 'var(--monarch-text-dark)', border: '1px solid var(--monarch-border)' }}
            aria-label="Select backup folder"
          >
            <FolderOpen size={14} />
            {settings?.folderPath ? 'Change' : 'Select'}
          </button>
        </div>
      </SettingsRow>

      <SettingsRow label="Keep backups for" description="Older backups are automatically deleted">
        <div className="relative">
          <select
            value={settings?.retentionDays ?? 14}
            onChange={(e) => handleRetentionChange(Number(e.target.value))}
            disabled={loading || !isConfigured}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm cursor-pointer hover-bg-page-to-hover"
            style={{
              color: isConfigured ? 'var(--monarch-text-dark)' : 'var(--monarch-text-muted)',
              border: '1px solid var(--monarch-border)',
              backgroundColor: 'var(--monarch-bg-card)',
              opacity: isConfigured ? 1 : 0.6,
            }}
            aria-label="Select retention period"
          >
            {retentionOptions.map((option) => (
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

      <SettingsRow label="Backup time" description="Daily backup will run at this time">
        <div className="flex items-center gap-2">
          <Clock size={14} style={{ color: 'var(--monarch-text-muted)' }} />
          <input
            type="time"
            value={settings?.scheduledTime ?? '03:00'}
            onChange={(e) => handleScheduledTimeChange(e.target.value)}
            disabled={loading || !isConfigured}
            className="px-3 py-1.5 rounded-lg text-sm hover-bg-page-to-hover"
            style={{
              color: isConfigured ? 'var(--monarch-text-dark)' : 'var(--monarch-text-muted)',
              border: '1px solid var(--monarch-border)',
              backgroundColor: 'var(--monarch-bg-card)',
              opacity: isConfigured ? 1 : 0.6,
            }}
            aria-label="Select backup time"
          />
        </div>
      </SettingsRow>

      <div
        className="px-4 py-3 ml-14 flex items-center justify-between"
        style={{
          borderBottom:
            backups.length > 0
              ? '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))'
              : undefined,
        }}
      >
        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          {lastBackupText}
        </div>
        <button
          type="button"
          onClick={handleBackupNow}
          disabled={loading || isBackingUp || !isConfigured}
          className="px-3 py-1.5 rounded-lg text-sm font-medium hover-bg-page-to-hover flex items-center gap-1.5"
          style={{
            color: 'var(--monarch-text-dark)',
            border: '1px solid var(--monarch-border)',
            opacity: isConfigured ? 1 : 0.6,
          }}
          aria-label="Create backup now"
        >
          <RefreshCw size={14} className={isBackingUp ? 'animate-spin' : ''} />
          {isBackingUp ? 'Backing up...' : 'Backup Now'}
        </button>
      </div>

      <BackupsList backups={backups} onRestore={setRestoreBackup} />

      {restoreBackup && (
        <BackupRestoreModal
          backup={restoreBackup}
          onClose={() => setRestoreBackup(null)}
          onRestore={(passphrase) => handleRestore(restoreBackup, passphrase)}
        />
      )}
    </>
  );
}
