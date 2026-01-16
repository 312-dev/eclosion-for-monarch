import { RefreshCw, ChevronDown, Clock } from 'lucide-react';
import { SettingsRow } from '../SettingsRow';
import { ToggleSwitch } from '../ToggleSwitch';
import type {
  PeriodicSyncSettings,
  PeriodicSyncInterval,
  BackgroundSyncStatus,
  BackgroundSyncInterval,
} from '../../../types/electron';

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
          <div className="flex-1 min-w-0">
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Auto-sync
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
              Sync your recurring expenses at regular intervals
            </div>
          </div>
          <ToggleSwitch
            checked={periodicSyncSettings?.enabled ?? false}
            onChange={onToggle}
            disabled={loading}
            ariaLabel="Toggle automatic sync"
          />
        </div>
      </div>

      {periodicSyncSettings?.enabled && (
        <SettingsRow label="Sync interval" description="How often to sync while app is open">
          <div className="relative">
            <select
              value={periodicSyncSettings?.intervalMinutes ?? 30}
              onChange={(e) => onIntervalChange(Number(e.target.value))}
              disabled={loading}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm cursor-pointer hover-bg-page-to-hover"
              style={{
                color: 'var(--monarch-text-dark)',
                border: '1px solid var(--monarch-border)',
                backgroundColor: 'var(--monarch-bg-card)',
              }}
              aria-label="Select sync interval"
            >
              {periodicSyncIntervals.map((option) => (
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
      )}
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
          <div className="flex-1 min-w-0">
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Background Sync
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
              Sync automatically even when the app is closed
            </div>
          </div>
          <ToggleSwitch
            checked={status?.installed ?? false}
            onChange={onToggle}
            disabled={loading || enabling}
            ariaLabel="Toggle background sync"
          />
        </div>
      </div>

      {status?.installed && (
        <SettingsRow label="Background interval" description="How often to sync when app is closed">
          <div className="relative">
            <select
              value={status?.intervalMinutes ?? 60}
              onChange={(e) => onIntervalChange(Number(e.target.value))}
              disabled={loading || enabling}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm cursor-pointer hover-bg-page-to-hover"
              style={{
                color: 'var(--monarch-text-dark)',
                border: '1px solid var(--monarch-border)',
                backgroundColor: 'var(--monarch-bg-card)',
              }}
              aria-label="Select background sync interval"
            >
              {intervals.map((option) => (
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
      )}

      {status?.installed && (
        <div className="px-4 pb-4">
          <div
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              color: 'var(--monarch-text-muted)',
            }}
          >
            Your passphrase is securely stored in your system keychain to enable background sync.
          </div>
        </div>
      )}
    </>
  );
}
