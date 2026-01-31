/**
 * Remote Access Section
 *
 * Allows users to enable remote access to their Eclosion instance
 * via a secure tunnel. When enabled, displays a QR code and URL
 * that can be used to access the app from a phone or other device.
 *
 * Security:
 * - Remote access is opt-in (disabled by default)
 * - Remote users authenticate with the desktop app passphrase (PBKDF2 validated)
 * - Tunnel URL is random and unguessable
 * - HTTPS is automatic via Tunnelmole
 */

import { useState, useEffect, useCallback } from 'react';
import { Globe, Copy, Check, AlertTriangle, KeyRound } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../../../context/ToastContext';
import { ToggleSwitch } from '../ToggleSwitch';
import { RemoteAccessPassphraseModal } from './RemoteAccessPassphraseModal';
import { checkAuthStatus } from '../../../api/core/auth';
import type { TunnelStatus } from '../../../types/electron';

export function RemoteAccessSection() {
  const [status, setStatus] = useState<TunnelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [passphraseMode, setPassphraseMode] = useState<'create' | 'change'>('create');
  const toast = useToast();

  const fetchStatus = useCallback(async () => {
    if (!globalThis.electron?.tunnel) return;
    try {
      const tunnelStatus = await globalThis.electron.tunnel.getStatus();
      setStatus(tunnelStatus);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const startTunnel = async () => {
    if (!globalThis.electron?.tunnel) return;

    setEnabling(true);
    try {
      const result = await globalThis.electron.tunnel.start();
      if (!result.success) {
        toast.error(result.error || 'Failed to start tunnel');
        return;
      }
      await fetchStatus();
      toast.success('Remote access enabled');
    } catch {
      toast.error('Failed to enable remote access');
    } finally {
      setEnabling(false);
    }
  };

  const handleToggle = async () => {
    if (!globalThis.electron?.tunnel) return;

    if (status?.active) {
      // Disable remote access
      try {
        await globalThis.electron.tunnel.stop();
        await fetchStatus();
        toast.success('Remote access disabled');
      } catch {
        toast.error('Failed to disable remote access');
      }
    } else {
      // Enable remote access - check if backend credentials exist
      // If not, prompt for passphrase to encrypt session credentials
      try {
        const authStatus = await checkAuthStatus();
        if (!authStatus.has_stored_credentials) {
          // Need to set up passphrase first
          setPassphraseMode('create');
          setShowPassphraseModal(true);
          return;
        }
        // Backend credentials exist, start tunnel directly
        await startTunnel();
      } catch {
        toast.error('Failed to check authentication status');
      }
    }
  };

  const handlePassphraseSuccess = () => {
    if (passphraseMode === 'create') {
      // First-time setup - start the tunnel
      startTunnel();
    } else {
      // Changed passphrase - just show success toast
      toast.success('Passphrase updated');
    }
  };

  const handleCopyUrl = async () => {
    if (!status?.url) return;
    try {
      await navigator.clipboard.writeText(status.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  // Don't render if not in desktop mode
  if (!globalThis.electron?.tunnel) return null;

  return (
    <div
      className="rounded-xl overflow-hidden mb-4"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--monarch-bg-page)' }}
            >
              <Globe size={20} style={{ color: 'var(--monarch-orange)' }} />
            </div>
            <div>
              <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                Remote Access
              </div>
              <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                Access Eclosion from your phone or other devices
              </div>
            </div>
          </div>
          {loading ? (
            <div
              className="w-9 h-5 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--monarch-border)' }}
            />
          ) : (
            <ToggleSwitch
              checked={status?.active ?? false}
              onChange={handleToggle}
              disabled={loading || enabling}
              ariaLabel="Toggle remote access"
            />
          )}
        </div>
      </div>

      {status?.active && status.url && (
        <div className="px-4 pb-4">
          {/* Security Warning Banner */}
          <div
            className="flex items-start gap-2 px-3 py-2 rounded-lg mb-3"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid var(--monarch-orange)',
            }}
          >
            <AlertTriangle
              size={16}
              className="shrink-0 mt-0.5"
              style={{ color: 'var(--monarch-orange)' }}
            />
            <div className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
              <span className="font-medium">Remote access is active.</span> Anyone with your URL
              will be prompted for your app passphrase. Keep your URL private.
            </div>
          </div>

          <div
            className="rounded-lg p-3"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            <div className="flex items-start gap-4">
              {/* Left side: explanation and URL */}
              <div className="flex-1 min-w-0">
                <p className="text-sm mb-2" style={{ color: 'var(--monarch-text-muted)' }}>
                  Scan the QR code with your phone or copy the URL to access Eclosion remotely.
                  You&apos;ll need your app passphrase to connect.
                </p>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'var(--monarch-bg-card)',
                    border: '1px solid var(--monarch-border)',
                  }}
                >
                  <code
                    className="flex-1 text-xs break-all"
                    style={{ color: 'var(--monarch-text-dark)' }}
                  >
                    {status.url}
                  </code>
                  <button
                    onClick={handleCopyUrl}
                    className="p-1.5 rounded hover:bg-black/5 transition-colors shrink-0"
                    title="Copy URL"
                    aria-label="Copy URL to clipboard"
                  >
                    {copied ? (
                      <Check size={14} style={{ color: 'var(--monarch-green)' }} />
                    ) : (
                      <Copy size={14} style={{ color: 'var(--monarch-text-muted)' }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Right side: QR Code */}
              <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: 'white' }}>
                <QRCodeSVG value={status.url} size={100} level="M" />
              </div>
            </div>
          </div>

          {/* Change Passphrase Button */}
          <button
            onClick={() => {
              setPassphraseMode('change');
              setShowPassphraseModal(true);
            }}
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-black/5"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              border: '1px solid var(--monarch-border)',
              color: 'var(--monarch-text-dark)',
            }}
          >
            <KeyRound size={16} style={{ color: 'var(--monarch-orange)' }} />
            Change Passphrase
          </button>
        </div>
      )}

      {/* Passphrase Modal */}
      <RemoteAccessPassphraseModal
        isOpen={showPassphraseModal}
        onClose={() => setShowPassphraseModal(false)}
        onSuccess={handlePassphraseSuccess}
        mode={passphraseMode}
      />
    </div>
  );
}
