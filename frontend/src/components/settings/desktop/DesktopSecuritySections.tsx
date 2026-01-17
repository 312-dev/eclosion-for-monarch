import { Shield, FolderOpen, ChevronDown } from 'lucide-react';
import { SettingsRow } from '../SettingsRow';
import { ToggleSwitch } from '../ToggleSwitch';
import type { LockTrigger, LockOption } from '../../../types/electron';

interface SecuritySectionProps {
  lockTrigger: LockTrigger;
  lockOptions: LockOption[];
  loading: boolean;
  biometric: {
    available: boolean;
    requireBiometric: boolean;
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

      <SettingsRow label="Auto-lock" description="When to require unlock">
        <div className="relative">
          <select
            value={lockTrigger}
            onChange={(e) => onLockTriggerChange(e.target.value as LockTrigger)}
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
          description={`Unlock with ${biometric.displayName} instead of entering your credentials`}
        >
          <ToggleSwitch
            checked={biometric.requireBiometric}
            onChange={onBiometricToggle}
            disabled={loading || biometric.loading}
            ariaLabel={`Toggle ${biometric.displayName}`}
          />
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
