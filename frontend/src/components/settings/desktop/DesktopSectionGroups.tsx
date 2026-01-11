import { Monitor, FolderOpen, Shield, RefreshCw, ChevronDown, Clock } from 'lucide-react';
import { SettingsRow } from '../SettingsRow';
import { ToggleSwitch } from '../ToggleSwitch';
import type { DesktopSettings, LockTrigger, LockOption, PeriodicSyncSettings, PeriodicSyncInterval, BackgroundSyncStatus, BackgroundSyncInterval } from '../../../types/electron';

interface StartupSectionProps {
  settings: DesktopSettings | null;
  loading: boolean;
  isMac: boolean;
  onAutoStartChange: () => void;
  onMenuBarModeChange: () => void;
}

export function StartupSection({
  settings,
  loading,
  isMac,
  onAutoStartChange,
  onMenuBarModeChange,
}: Readonly<StartupSectionProps>) {
  return (
    <>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
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

      <SettingsRow label="Start on Login" description="Automatically launch Eclosion when you log in">
        <ToggleSwitch checked={settings?.autoStart ?? false} onChange={onAutoStartChange} disabled={loading} ariaLabel="Toggle start on login" />
      </SettingsRow>

      <SettingsRow
        label={isMac ? 'Menu Bar Mode' : 'Run in Background'}
        description={isMac ? 'Hide from Dock and run as a menu bar icon only' : 'Minimize to system tray instead of quitting when window is closed'}
      >
        <ToggleSwitch
          checked={settings?.menuBarMode ?? false}
          onChange={onMenuBarModeChange}
          disabled={loading}
          ariaLabel={isMac ? 'Toggle menu bar mode' : 'Toggle run in background'}
        />
      </SettingsRow>
    </>
  );
}

interface SyncScheduleSectionProps {
  periodicSyncSettings: PeriodicSyncSettings | null;
  periodicSyncIntervals: PeriodicSyncInterval[];
  loading: boolean;
  onToggle: () => void;
  onIntervalChange: (interval: number) => void;
}

export function SyncScheduleSection({
  periodicSyncSettings,
  periodicSyncIntervals,
  loading,
  onToggle,
  onIntervalChange,
}: Readonly<SyncScheduleSectionProps>) {
  return (
    <>
      <div style={{ borderTop: '1px solid var(--monarch-border)' }} />

      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
            <RefreshCw size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          </div>
          <div>
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Sync Schedule
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
              Automatically sync while the app is running
            </div>
          </div>
        </div>
      </div>

      <SettingsRow label="Auto-sync" description="Sync your recurring expenses at regular intervals">
        <ToggleSwitch checked={periodicSyncSettings?.enabled ?? false} onChange={onToggle} disabled={loading} ariaLabel="Toggle automatic sync" />
      </SettingsRow>

      {periodicSyncSettings?.enabled && (
        <SettingsRow label="Sync interval" description="How often to sync while app is open">
          <div className="relative">
            <select
              value={periodicSyncSettings?.intervalMinutes ?? 30}
              onChange={(e) => onIntervalChange(Number(e.target.value))}
              disabled={loading}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm cursor-pointer hover-bg-page-to-hover"
              style={{ color: 'var(--monarch-text-dark)', border: '1px solid var(--monarch-border)', backgroundColor: 'var(--monarch-bg-card)' }}
              aria-label="Select sync interval"
            >
              {periodicSyncIntervals.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--monarch-text-muted)' }} />
          </div>
        </SettingsRow>
      )}
    </>
  );
}

interface SecuritySectionProps {
  lockTrigger: LockTrigger;
  lockOptions: LockOption[];
  loading: boolean;
  biometric: {
    available: boolean;
    enrolled: boolean;
    loading: boolean;
    displayName: string;
  };
  onLockTriggerChange: (trigger: LockTrigger) => void;
  onBiometricToggle: () => void;
}

export function SecuritySection({
  lockTrigger,
  lockOptions,
  loading,
  biometric,
  onLockTriggerChange,
  onBiometricToggle,
}: Readonly<SecuritySectionProps>) {
  return (
    <>
      <div style={{ borderTop: '1px solid var(--monarch-border)' }} />

      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
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

      <SettingsRow label="Auto-lock" description="When to require passphrase re-entry">
        <div className="relative">
          <select
            value={lockTrigger}
            onChange={(e) => onLockTriggerChange(e.target.value as LockTrigger)}
            disabled={loading}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm cursor-pointer hover-bg-page-to-hover"
            style={{ color: 'var(--monarch-text-dark)', border: '1px solid var(--monarch-border)', backgroundColor: 'var(--monarch-bg-card)' }}
            aria-label="Select auto-lock timing"
          >
            {lockOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--monarch-text-muted)' }} />
        </div>
      </SettingsRow>

      {biometric.available && (
        <SettingsRow label={`Use ${biometric.displayName}`} description={`Unlock with ${biometric.displayName} instead of passphrase`}>
          <ToggleSwitch checked={biometric.enrolled} onChange={onBiometricToggle} disabled={loading || biometric.loading} ariaLabel={`Toggle ${biometric.displayName}`} />
        </SettingsRow>
      )}
    </>
  );
}

interface DataFolderSectionProps {
  isMac: boolean;
  onReveal: () => void;
}

export function DataFolderSection({ isMac, onReveal }: Readonly<DataFolderSectionProps>) {
  return (
    <>
      <div style={{ borderTop: '1px solid var(--monarch-border)' }} />

      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
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
            onClick={onReveal}
            className="px-3 py-1.5 rounded-lg text-sm font-medium hover-bg-page-to-hover"
            style={{ color: 'var(--monarch-text-dark)', border: '1px solid var(--monarch-border)' }}
            aria-label="Reveal data folder in file manager"
          >
            Reveal in {isMac ? 'Finder' : 'Explorer'}
          </button>
        </div>
      </div>
    </>
  );
}

interface BackgroundSyncSectionProps {
  status: BackgroundSyncStatus | null;
  intervals: BackgroundSyncInterval[];
  loading: boolean;
  enabling: boolean;
  onToggle: () => void;
  onIntervalChange: (interval: number) => void;
}

export function BackgroundSyncSection({
  status,
  intervals,
  loading,
  enabling,
  onToggle,
  onIntervalChange,
}: Readonly<BackgroundSyncSectionProps>) {
  return (
    <>
      <div style={{ borderTop: '1px solid var(--monarch-border)' }} />

      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
            <Clock size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          </div>
          <div>
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Background Sync
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
              Sync automatically even when the app is closed
            </div>
          </div>
        </div>
      </div>

      <SettingsRow
        label="Sync when closed"
        description="Uses your system's task scheduler to sync periodically"
      >
        <ToggleSwitch
          checked={status?.installed ?? false}
          onChange={onToggle}
          disabled={loading || enabling}
          ariaLabel="Toggle background sync"
        />
      </SettingsRow>

      {status?.installed && (
        <SettingsRow label="Background interval" description="How often to sync when app is closed">
          <div className="relative">
            <select
              value={status?.intervalMinutes ?? 60}
              onChange={(e) => onIntervalChange(Number(e.target.value))}
              disabled={loading || enabling}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm cursor-pointer hover-bg-page-to-hover"
              style={{ color: 'var(--monarch-text-dark)', border: '1px solid var(--monarch-border)', backgroundColor: 'var(--monarch-bg-card)' }}
              aria-label="Select background sync interval"
            >
              {intervals.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--monarch-text-muted)' }} />
          </div>
        </SettingsRow>
      )}

      {status?.installed && (
        <div className="px-4 pb-4">
          <div
            className="text-xs px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--monarch-bg-page)', color: 'var(--monarch-text-muted)' }}
          >
            Your passphrase is securely stored in your system keychain to enable background sync.
          </div>
        </div>
      )}
    </>
  );
}
