/**
 * Syncing Section
 *
 * Sync settings including auto-sync and background sync (desktop only).
 */

import { AutoSyncSettings } from '../AutoSyncSettings';
import { BackgroundSyncSection } from './desktop/DesktopSyncSections';
import { SectionHeader } from './settingsSections';
import { useBackgroundSync } from '../../hooks';
import { isDesktopMode } from '../../utils/apiBase';
import type { AutoSyncStatus } from '../../types';

interface SyncingSectionProps {
  status: AutoSyncStatus | null;
  onEnable: (intervalMinutes: number, passphrase: string) => Promise<void>;
  onDisable: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function SyncingSection({ status, onEnable, onDisable, onRefresh }: SyncingSectionProps) {
  const backgroundSync = useBackgroundSync();
  const isDesktop = isDesktopMode();

  return (
    <section className="mb-8">
      <SectionHeader sectionId="syncing" />

      {isDesktop ? (
        /* Desktop: Combined card with both sync options */
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <AutoSyncSettings
            status={status}
            onEnable={onEnable}
            onDisable={onDisable}
            onRefresh={onRefresh}
            embedded
          />
          <BackgroundSyncSection
            status={backgroundSync.status}
            intervals={backgroundSync.intervals}
            loading={backgroundSync.loading}
            enabling={backgroundSync.enabling}
            onToggle={backgroundSync.toggle}
            onIntervalChange={backgroundSync.setInterval}
          />
        </div>
      ) : (
        /* Web: Just auto sync settings */
        <AutoSyncSettings
          status={status}
          onEnable={onEnable}
          onDisable={onDisable}
          onRefresh={onRefresh}
        />
      )}
    </section>
  );
}

/** @deprecated Use SyncingSection instead */
export const AutomationSection = SyncingSection;
