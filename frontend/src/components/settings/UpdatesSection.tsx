/**
 * Updates Section
 *
 * Displays current version and allows checking for updates.
 * On desktop, also shows auto-update toggle.
 */

import { useState, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
import { VersionBadge } from '../VersionBadge';
import { SettingsRow } from './SettingsRow';
import { ToggleSwitch } from './ToggleSwitch';
import type { VersionInfo } from '../../types';

interface UpdatesSectionProps {
  versionInfo: VersionInfo | null;
  onShowUpdateModal: () => void;
}

export function UpdatesSection({ versionInfo, onShowUpdateModal }: UpdatesSectionProps) {
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const isDesktop = !!window.electron;

  const fetchAutoUpdateSetting = useCallback(async () => {
    if (!window.electron) {
      setLoading(false);
      return;
    }
    try {
      const enabled = await window.electron.getAutoUpdateEnabled();
      setAutoUpdateEnabled(enabled);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAutoUpdateSetting();
  }, [fetchAutoUpdateSetting]);

  const handleAutoUpdateChange = async () => {
    if (!window.electron) return;
    try {
      const newValue = !autoUpdateEnabled;
      await window.electron.setAutoUpdateEnabled(newValue);
      setAutoUpdateEnabled(newValue);
    } catch {
      // Ignore errors
    }
  };

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5" style={{ color: 'var(--monarch-text-muted)' }}>
        <Download size={12} />
        Updates
      </h2>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-lg"
                style={{ backgroundColor: 'var(--monarch-bg-page)' }}
              >
                <Download size={20} style={{ color: 'var(--monarch-text-muted)' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                    v{versionInfo?.version || '...'}
                  </span>
                  {versionInfo && (
                    <VersionBadge
                      version={versionInfo.version}
                      channel={versionInfo.channel}
                    />
                  )}
                </div>
                <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                  {versionInfo?.build_time && versionInfo.build_time !== 'unknown'
                    ? `Last updated: ${new Date(versionInfo.build_time).toLocaleDateString()}`
                    : 'Current version'
                  }
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onShowUpdateModal}
              className="px-3 py-1.5 rounded-lg text-sm font-medium hover-bg-page-to-hover"
              style={{
                color: 'var(--monarch-text-dark)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              Check for Updates
            </button>
          </div>
        </div>

        {isDesktop && (
          <>
            <div style={{ borderTop: '1px solid var(--monarch-border)' }} />
            <SettingsRow
              label="Auto-update"
              description="Automatically download and install updates when available"
            >
              <ToggleSwitch
                checked={autoUpdateEnabled}
                onChange={handleAutoUpdateChange}
                disabled={loading}
                ariaLabel="Toggle auto-update"
              />
            </SettingsRow>
          </>
        )}

      </div>
    </section>
  );
}
