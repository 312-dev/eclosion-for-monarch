/**
 * Updates Section
 *
 * Displays current version and allows checking for updates.
 * In desktop mode, also allows switching between stable and beta update channels.
 */

import { useState, useEffect, useCallback } from 'react';
import { Download, FlaskConical, Shield } from 'lucide-react';
import { VersionBadge } from '../VersionBadge';
import type { VersionInfo } from '../../types';

type UpdateChannel = 'stable' | 'beta';

interface UpdatesSectionProps {
  versionInfo: VersionInfo | null;
  onShowUpdateModal: () => void;
}

export function UpdatesSection({ versionInfo, onShowUpdateModal }: UpdatesSectionProps) {
  const [channel, setChannel] = useState<UpdateChannel>('stable');
  const [isDesktop, setIsDesktop] = useState(false);
  const [switching, setSwitching] = useState(false);

  const fetchChannel = useCallback(async () => {
    if (!window.electron) return;
    try {
      const currentChannel = await window.electron.getUpdateChannel();
      setChannel(currentChannel);
    } catch {
      // Ignore errors
    }
  }, []);

  useEffect(() => {
    if (window.electron) {
      setIsDesktop(true);
      fetchChannel();
    }
  }, [fetchChannel]);

  const handleChannelSwitch = async (newChannel: UpdateChannel) => {
    if (!window.electron || switching) return;

    const confirmMessage = newChannel === 'beta'
      ? 'Switch to beta updates? You\'ll receive early releases with new features, but they may have bugs.'
      : 'Switch to stable updates? You\'ll stay on your current version until the next stable release.';

    const confirmed = await window.electron.showConfirmDialog({
      title: `Switch to ${newChannel} channel`,
      message: confirmMessage,
      confirmText: 'Switch',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    setSwitching(true);
    try {
      await window.electron.setUpdateChannel(newChannel);
      setChannel(newChannel);
      // Check for updates on the new channel
      await window.electron.checkForUpdates();
    } finally {
      setSwitching(false);
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
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5 rounded-lg"
                    style={{ backgroundColor: 'var(--monarch-bg-page)' }}
                  >
                    {channel === 'beta' ? (
                      <FlaskConical size={20} style={{ color: 'var(--monarch-orange)' }} />
                    ) : (
                      <Shield size={20} style={{ color: 'var(--monarch-text-muted)' }} />
                    )}
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                      Update Channel
                    </div>
                    <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                      {channel === 'beta'
                        ? 'Receiving early releases with new features'
                        : 'Receiving stable, tested releases'
                      }
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
                  <button
                    type="button"
                    onClick={() => handleChannelSwitch('stable')}
                    disabled={switching || channel === 'stable'}
                    className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: channel === 'stable' ? 'var(--monarch-bg-card)' : 'transparent',
                      color: channel === 'stable' ? 'var(--monarch-text-dark)' : 'var(--monarch-text-muted)',
                      boxShadow: channel === 'stable' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                      cursor: channel === 'stable' || switching ? 'default' : 'pointer',
                      opacity: switching ? 0.6 : 1,
                    }}
                    aria-label="Switch to stable update channel"
                  >
                    Stable
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChannelSwitch('beta')}
                    disabled={switching || channel === 'beta'}
                    className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: channel === 'beta' ? 'var(--monarch-bg-card)' : 'transparent',
                      color: channel === 'beta' ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)',
                      boxShadow: channel === 'beta' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                      cursor: channel === 'beta' || switching ? 'default' : 'pointer',
                      opacity: switching ? 0.6 : 1,
                    }}
                    aria-label="Switch to beta update channel"
                  >
                    Beta
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
