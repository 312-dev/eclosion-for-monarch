import { Monitor } from 'lucide-react';
import { SettingsRow } from '../SettingsRow';
import { ToggleSwitch } from '../ToggleSwitch';
import type { DesktopSettings, DesktopSettingKey } from '../../../types/electron';

// Re-export sections from other files for convenience
export { SyncScheduleSection, BackgroundSyncSection } from './DesktopSyncSections';
export { SecuritySection, DataFolderSection } from './DesktopSecuritySections';

interface StartupSectionProps {
  settings: DesktopSettings | null;
  loading: boolean;
  onSettingToggle: (key: DesktopSettingKey) => void;
}

export function StartupSection({
  settings,
  loading,
  onSettingToggle,
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
              Startup
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
              Control how Eclosion launches
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--monarch-border)' }} />

      <SettingsRow
        label="Launch at Login"
        description="Automatically start Eclosion when you log in"
      >
        <ToggleSwitch
          checked={settings?.launchAtLogin ?? false}
          onChange={() => onSettingToggle('launchAtLogin')}
          disabled={loading}
          ariaLabel="Toggle launch at login"
        />
      </SettingsRow>

      <SettingsRow
        label="Start Minimized"
        description="Launch to tray instead of showing the window"
      >
        <ToggleSwitch
          checked={settings?.startMinimized ?? false}
          onChange={() => onSettingToggle('startMinimized')}
          disabled={loading}
          ariaLabel="Toggle start minimized"
        />
      </SettingsRow>
    </>
  );
}
