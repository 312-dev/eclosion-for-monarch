import { useState } from 'react';
import { getErrorMessage } from '../utils';
import { Portal } from './Portal';

interface AutoSyncSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnable: (intervalMinutes: number, passphrase: string) => Promise<void>;
}

const INTERVAL_OPTIONS = [
  { value: 60, label: 'Every hour' },
  { value: 180, label: 'Every 3 hours' },
  { value: 360, label: 'Every 6 hours (recommended)' },
  { value: 720, label: 'Every 12 hours' },
  { value: 1440, label: 'Once daily' },
];

export function AutoSyncSecurityModal({
  isOpen,
  onClose,
  onEnable,
}: AutoSyncSecurityModalProps) {
  const [interval, setInterval] = useState(360);
  const [passphrase, setPassphrase] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnable = async () => {
    if (!consentChecked || !passphrase) return;

    setLoading(true);
    setError(null);
    try {
      await onEnable(interval, passphrase);
      handleClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setPassphrase('');
    setConsentChecked(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 modal-backdrop"
          onClick={handleClose}
        />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto modal-content"
        style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)' }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--monarch-border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--monarch-orange)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
                Enable Automatic Sync
              </h2>
            </div>
            {!loading && (
              <button
                onClick={handleClose}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Security Disclosure */}
          <div
            className="p-4 rounded-lg"
            style={{
              backgroundColor: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid var(--monarch-orange)',
            }}
          >
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--monarch-orange)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
                  Important: Security Trade-off
                </h3>
                <div className="text-sm space-y-2" style={{ color: 'var(--monarch-text-muted)' }}>
                  <p><strong>What happens when you enable auto-sync:</strong></p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>A <strong>second copy</strong> of your Monarch credentials will be saved</li>
                    <li>This copy is encrypted with a <strong>server key</strong>, not your passphrase</li>
                    <li>The server can decrypt this copy to run syncs in the background</li>
                  </ul>
                  <p className="pt-2"><strong>What this means:</strong></p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Your original passphrase-protected credentials remain unchanged</li>
                    <li>Anyone with access to your server could access your Monarch account</li>
                    <li>For self-hosted users: this is typically just you</li>
                    <li>For cloud deployments: ensure you trust the platform</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Interval Selector */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
              Sync Frequency
            </label>
            <select
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              disabled={loading}
              className="w-full p-2 rounded-lg"
              style={{
                backgroundColor: 'var(--monarch-bg-elevated)',
                color: 'var(--monarch-text-dark)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              {INTERVAL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Passphrase Input */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Enter your passphrase to confirm
            </label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              disabled={loading}
              placeholder="Your encryption passphrase"
              className="w-full p-2 rounded-lg"
              style={{
                backgroundColor: 'var(--monarch-bg-elevated)',
                color: 'var(--monarch-text-dark)',
                border: '1px solid var(--monarch-border)',
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
              Required to decrypt your credentials for the server copy
            </p>
          </div>

          {/* Consent Checkbox */}
          <label
            className="flex items-start gap-3 cursor-pointer p-3 rounded-lg"
            style={{ backgroundColor: 'var(--monarch-bg-elevated)' }}
          >
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              disabled={loading}
              className="mt-1"
            />
            <span className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
              I understand that enabling automatic sync stores a server-accessible copy of my Monarch credentials,
              and I accept this trade-off for the convenience of background syncing.
            </span>
          </label>

          {error && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--monarch-bg-elevated)',
                color: 'var(--monarch-text-dark)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleEnable}
              disabled={!consentChecked || !passphrase || loading}
              className="flex-1 px-4 py-2 rounded-lg transition-colors text-white flex items-center justify-center gap-2"
              style={{
                backgroundColor: loading ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)',
                opacity: (!consentChecked || !passphrase) && !loading ? 0.5 : 1,
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Enabling...
                </>
              ) : (
                'Enable Auto-Sync'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
}
