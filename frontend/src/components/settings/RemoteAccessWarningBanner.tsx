/**
 * Remote Access Warning Banner
 *
 * Displays a prominent warning when remote access is active,
 * alerting users that their instance is accessible from other devices.
 */

import { AlertTriangle, Shield } from 'lucide-react';

interface RemoteAccessWarningBannerProps {
  onScrollToSecurity: () => void;
}

export function RemoteAccessWarningBanner({
  onScrollToSecurity,
}: Readonly<RemoteAccessWarningBannerProps>) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl mb-4"
      style={{
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid var(--monarch-orange)',
      }}
    >
      <AlertTriangle
        size={20}
        className="shrink-0 mt-0.5"
        style={{ color: 'var(--monarch-orange)' }}
      />
      <div className="flex-1">
        <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
          Remote Access is Active
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
          Your Eclosion instance is accessible from other devices. Anyone with your tunnel URL and
          passphrase can view and modify your financial data.
        </p>
        <div className="flex items-center gap-4 mt-2">
          <button
            type="button"
            onClick={onScrollToSecurity}
            className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80"
            style={{ color: 'var(--monarch-orange)' }}
          >
            <Shield size={14} />
            Review login activity
          </button>
        </div>
      </div>
    </div>
  );
}
