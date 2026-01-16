import { useState, useEffect } from 'react';
import type { AutoSyncStatus } from '../types';
import { formatInterval, formatDateTime } from '../utils';
import { isDesktopMode } from '../utils/apiBase';
import { AutoSyncSecurityModal } from './AutoSyncSecurityModal';
import { SpinnerIcon, ClockIcon, XIcon, CheckSimpleIcon, AlertCircleIcon } from './icons';

interface AutoSyncSettingsProps {
  status: AutoSyncStatus | null;
  onEnable: (intervalMinutes: number, passphrase: string) => Promise<void>;
  onDisable: () => Promise<void>;
  onRefresh: () => Promise<void>;
  /** When true, renders without card wrapper (for embedding in a combined card) */
  embedded?: boolean;
}

/**
 * Desktop-specific auto-sync display.
 * On desktop, auto-sync works when credentials are stored in OS keychain.
 * Credentials are stored automatically on successful login.
 */
function DesktopAutoSyncSettings({
  status,
  embedded,
}: {
  status: AutoSyncStatus | null;
  embedded?: boolean;
}) {
  const [credentialsStored, setCredentialsStored] = useState<boolean | null>(null);

  useEffect(() => {
    const checkCredentials = async () => {
      if (globalThis.electron?.credentials) {
        const hasCredentials = await globalThis.electron.credentials.has();
        setCredentialsStored(hasCredentials);
      } else {
        setCredentialsStored(false);
      }
    };
    void checkCredentials();
  }, []);

  if (!status || credentialsStored === null) {
    const loadingContent = (
      <div className="flex items-center gap-3">
        <SpinnerIcon size={20} color="var(--monarch-text-muted)" />
        <span style={{ color: 'var(--monarch-text-muted)' }}>Loading auto-sync status...</span>
      </div>
    );

    if (embedded) {
      return <div className="p-4">{loadingContent}</div>;
    }

    return (
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        {loadingContent}
      </div>
    );
  }

  // Desktop auto-sync is active when credentials are stored in keychain
  // This happens automatically on login - no extra setup needed
  const isActive = credentialsStored;

  const content = (
    <>
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
          <ClockIcon
            size={20}
            color={isActive ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)'}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            Automatic Background Sync
          </div>
          <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
            {isActive
              ? `Syncs every ${formatInterval(status.interval_minutes || 360)} on startup and wake`
              : 'Enabled automatically after login'}
          </div>
        </div>

        {isActive ? (
          <span
            className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5"
            style={{
              backgroundColor: 'var(--monarch-success-bg)',
              color: 'var(--monarch-success)',
            }}
          >
            <CheckSimpleIcon size={14} />
            Active
          </span>
        ) : (
          <span
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--monarch-bg-elevated)',
              color: 'var(--monarch-text-muted)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            Inactive
          </span>
        )}
      </div>

      {/* Status info when active */}
      {isActive && status.last_sync && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
          <div className="text-sm">
            <div style={{ color: 'var(--monarch-text-muted)' }}>Last sync</div>
            <div
              className="flex items-center gap-1 mt-0.5"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              {formatDateTime(status.last_sync)}
              {status.last_sync_success === false && (
                <AlertCircleIcon size={16} color="var(--monarch-error)" />
              )}
              {status.last_sync_success === true && (
                <CheckSimpleIcon size={16} color="var(--monarch-success)" />
              )}
            </div>
          </div>
          {status.last_sync_error && (
            <div
              className="mt-2 p-2 rounded text-sm"
              style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
            >
              Last error: {status.last_sync_error}
            </div>
          )}
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="p-4">{content}</div>;
  }

  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      {content}
    </div>
  );
}

/**
 * Web-specific auto-sync settings with enable/disable controls.
 * On web, auto-sync requires server-encrypted credentials.
 */
function WebAutoSyncSettings({ status, onEnable, onDisable, onRefresh }: AutoSyncSettingsProps) {
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const handleDisable = async () => {
    setDisabling(true);
    try {
      await onDisable();
      await onRefresh();
    } finally {
      setDisabling(false);
    }
  };

  const handleEnable = async (intervalMinutes: number, passphrase: string) => {
    await onEnable(intervalMinutes, passphrase);
    await onRefresh();
  };

  if (!status) {
    return (
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <SpinnerIcon size={20} color="var(--monarch-text-muted)" />
          <span style={{ color: 'var(--monarch-text-muted)' }}>Loading auto-sync status...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClockIcon size={20} color="var(--monarch-orange)" />
            <div>
              <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                Automatic Background Sync
              </div>
              <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                {status.enabled
                  ? `Syncs every ${formatInterval(status.interval_minutes)}`
                  : 'Keep your budget in sync automatically'}
              </div>
            </div>
          </div>

          {status.enabled ? (
            <button
              onClick={handleDisable}
              disabled={disabling}
              className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              style={{
                backgroundColor: 'var(--monarch-bg-elevated)',
                color: 'var(--monarch-text-dark)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              {disabling ? (
                <>
                  <SpinnerIcon size={16} />
                  Disabling...
                </>
              ) : (
                <>
                  <XIcon size={16} />
                  Disable
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setShowEnableModal(true)}
              className="px-4 py-2 rounded-lg flex items-center gap-2 text-white transition-colors"
              style={{ backgroundColor: 'var(--monarch-orange)' }}
            >
              <CheckSimpleIcon size={16} />
              Enable
            </button>
          )}
        </div>

        {/* Status info when enabled */}
        {status.enabled && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div style={{ color: 'var(--monarch-text-muted)' }}>Next sync</div>
                <div style={{ color: 'var(--monarch-text-dark)' }}>
                  {status.next_run ? formatDateTime(status.next_run) : 'Scheduled'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--monarch-text-muted)' }}>Last sync</div>
                <div
                  className="flex items-center gap-1"
                  style={{ color: 'var(--monarch-text-dark)' }}
                >
                  {formatDateTime(status.last_sync)}
                  {status.last_sync && status.last_sync_success === false && (
                    <AlertCircleIcon size={16} color="var(--monarch-error)" />
                  )}
                  {status.last_sync && status.last_sync_success === true && (
                    <CheckSimpleIcon size={16} color="var(--monarch-success)" />
                  )}
                </div>
              </div>
            </div>
            {status.last_sync_error && (
              <div
                className="mt-2 p-2 rounded text-sm"
                style={{
                  backgroundColor: 'var(--monarch-error-bg)',
                  color: 'var(--monarch-error)',
                }}
              >
                Last error: {status.last_sync_error}
              </div>
            )}
          </div>
        )}
      </div>

      <AutoSyncSecurityModal
        isOpen={showEnableModal}
        onClose={() => setShowEnableModal(false)}
        onEnable={handleEnable}
      />
    </>
  );
}

export function AutoSyncSettings(props: AutoSyncSettingsProps) {
  // Desktop and web have different auto-sync flows
  if (isDesktopMode()) {
    return <DesktopAutoSyncSettings status={props.status} embedded={props.embedded ?? false} />;
  }

  return <WebAutoSyncSettings {...props} />;
}
