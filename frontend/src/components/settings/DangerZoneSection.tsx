/**
 * Danger Zone Section
 *
 * Destructive actions like resetting credentials and uninstalling.
 */

import { AlertTriangle, Key, Bomb, Trash2, RefreshCw, ChevronRight } from 'lucide-react';

interface DangerZoneSectionProps {
  onShowResetModal: () => void;
  onShowUninstallModal: () => void;
}

export function DangerZoneSection({ onShowResetModal, onShowUninstallModal }: DangerZoneSectionProps) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5" style={{ color: 'var(--monarch-error)' }}>
        <AlertTriangle size={12} />
        Danger Zone
      </h2>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-error)',
          boxShadow: '0 1px 3px rgba(220, 38, 38, 0.08)'
        }}
      >
        {/* Reset App */}
        <button
          type="button"
          className="w-full p-4 flex items-center gap-4 text-left hover-bg-transparent-to-hover"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={onShowResetModal}
        >
          <div
            className="p-2.5 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--monarch-error-bg)' }}
          >
            <Key size={20} style={{ color: 'var(--monarch-error)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Reset Credentials
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
              Clear login but keep tracked subscriptions and settings
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <RefreshCw size={16} style={{ color: 'var(--monarch-error)' }} />
            <ChevronRight size={16} style={{ color: 'var(--monarch-text-muted)' }} />
          </div>
        </button>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: 'var(--monarch-border)', margin: '0 1rem' }} />

        {/* Uninstall */}
        <button
          type="button"
          className="w-full p-4 flex items-center gap-4 text-left hover-bg-transparent-to-error-bg"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={onShowUninstallModal}
        >
          <div
            className="p-2.5 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--monarch-error-bg)' }}
          >
            <Bomb size={20} style={{ color: 'var(--monarch-error)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Reset Completely
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
              Remove categories from Monarch and delete all local data
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Trash2 size={16} style={{ color: 'var(--monarch-error)' }} />
            <ChevronRight size={16} style={{ color: 'var(--monarch-text-muted)' }} />
          </div>
        </button>
      </div>
    </section>
  );
}
