/**
 * Automation Section
 *
 * Auto-sync settings for scheduled Monarch syncs.
 */

import { Clock } from 'lucide-react';
import { AutoSyncSettings } from '../AutoSyncSettings';
import type { AutoSyncStatus } from '../../types';

interface AutomationSectionProps {
  status: AutoSyncStatus | null;
  onEnable: (intervalMinutes: number, passphrase: string) => Promise<void>;
  onDisable: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function AutomationSection({ status, onEnable, onDisable, onRefresh }: AutomationSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5" style={{ color: 'var(--monarch-text-muted)' }}>
        <Clock size={12} />
        Automation
      </h2>
      <AutoSyncSettings
        status={status}
        onEnable={onEnable}
        onDisable={onDisable}
        onRefresh={onRefresh}
      />
    </section>
  );
}
