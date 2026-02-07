/**
 * Remote Access Section
 *
 * Allows users to enable remote access to their Eclosion instance
 * via a named Cloudflare Tunnel with a claimed *.eclosion.me subdomain.
 *
 * Two states:
 * 1. No subdomain claimed → shows SubdomainClaimForm
 * 2. Subdomain claimed → shows toggle + TunnelStatusDisplay
 *
 * Security:
 * - Remote access is opt-in (disabled by default)
 * - Remote users authenticate with the desktop app passphrase (PBKDF2 validated)
 * - Tunnel credentials encrypted via safeStorage
 * - HTTPS automatic via Cloudflare
 */

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Radio } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { ToggleSwitch } from '../ToggleSwitch';
import { Modal } from '../../ui/Modal';
import { ModalFooter } from '../../ui/ModalButtons';
import { RemoteAccessPassphraseModal } from './RemoteAccessPassphraseModal';
import { SubdomainClaimForm } from './SubdomainClaimForm';
import { TunnelStatusDisplay } from './TunnelStatusDisplay';
import { checkAuthStatus } from '../../../api/core/auth';
import type { TunnelStatus } from '../../../types/electron';

export function RemoteAccessSection() {
  const [status, setStatus] = useState<TunnelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [passphraseMode, setPassphraseMode] = useState<'create' | 'change'>('create');
  const [showUnclaimModal, setShowUnclaimModal] = useState(false);
  const [unclaiming, setUnclaiming] = useState(false);
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
    // Initial fetch
    fetchStatus();

    // Subscribe to status change events for live updates
    const unsubscribe = globalThis.electron?.tunnel?.onStatusChanged?.(setStatus);
    return () => unsubscribe?.();
  }, [fetchStatus]);

  const startTunnel = async () => {
    if (!globalThis.electron?.tunnel) return;

    setBusy(true);
    try {
      const result = await globalThis.electron.tunnel.start();
      if (!result.success) {
        toast.error(result.error ?? 'Failed to start tunnel');
        return;
      }
      await fetchStatus();
      toast.success('Remote access enabled');
    } catch {
      toast.error('Failed to enable remote access');
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async () => {
    if (!globalThis.electron?.tunnel || busy) return;

    setBusy(true);
    try {
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
        try {
          const authStatus = await checkAuthStatus();
          if (!authStatus.has_stored_credentials) {
            setPassphraseMode('create');
            setShowPassphraseModal(true);
            return;
          }
          await startTunnel();
        } catch {
          toast.error('Failed to check authentication status');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePassphraseSuccess = () => {
    if (passphraseMode === 'create') {
      startTunnel();
    } else {
      toast.success('Passphrase updated');
    }
  };

  const handleClaimed = () => {
    // Subdomain was just claimed — refresh status and start setup
    fetchStatus();
  };

  const handleResetSubdomain = () => {
    setShowUnclaimModal(true);
  };

  const handleUnclaimConfirm = async () => {
    if (!globalThis.electron?.tunnel) return;

    setUnclaiming(true);
    try {
      // Stop tunnel first if active
      if (status?.active) {
        await globalThis.electron.tunnel.stop();
      }
      const result = await globalThis.electron.tunnel.unclaim();
      if (result.success) {
        setShowUnclaimModal(false);
        toast.success('Subdomain released');
        await fetchStatus();
      } else {
        toast.error(result.error ?? 'Failed to release subdomain');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to release subdomain';
      toast.error(msg);
    } finally {
      setUnclaiming(false);
    }
  };

  // Don't render if not in desktop mode
  if (!globalThis.electron?.tunnel) return null;

  const isConfigured = status?.configured ?? false;
  const subdomain = status?.subdomain;

  return (
    <div
      className={`rounded-xl overflow-hidden${busy ? ' cursor-wait' : ''}`}
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="p-2.5 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--monarch-bg-page)' }}
            >
              <Radio size={20} style={{ color: 'var(--monarch-text-muted)' }} />
            </div>
            <div className="min-w-0">
              <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                Remote Access
              </div>
              <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                Access Eclosion from your phone or other devices
              </div>
            </div>
          </div>

          {/* Show toggle only when subdomain is configured */}
          {isConfigured && (
            <div className="shrink-0">
              {loading ? (
                <div
                  className="w-9 h-5 rounded-full animate-pulse"
                  style={{ backgroundColor: 'var(--monarch-border)' }}
                />
              ) : (
                <ToggleSwitch
                  checked={status?.active ?? false}
                  onChange={handleToggle}
                  disabled={loading || busy}
                  ariaLabel="Toggle remote access"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* State 1: No subdomain claimed — show claim form */}
      {!loading && !isConfigured && (
        <SubdomainClaimForm onClaimed={handleClaimed} />
      )}

      {/* State 2: Subdomain claimed, tunnel active — show status */}
      {status?.active && status.configured && (
        <TunnelStatusDisplay
          status={status}
          onChangePassphrase={() => {
            setPassphraseMode('change');
            setShowPassphraseModal(true);
          }}
          onReset={handleResetSubdomain}
          resetting={busy}
        />
      )}

      {/* Release Subdomain — visible when configured but tunnel is stopped */}
      {isConfigured && !status?.active && !loading && (
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowUnclaimModal(true)}
            disabled={busy}
            className="flex items-center gap-1.5 text-xs transition-colors disabled:opacity-50"
            style={{ color: 'var(--monarch-error)' }}
            type="button"
            aria-label="Release subdomain"
          >
            Release subdomain
          </button>
        </div>
      )}

      {/* Release Subdomain Confirmation Modal */}
      <Modal
        isOpen={showUnclaimModal}
        onClose={() => !unclaiming && setShowUnclaimModal(false)}
        title="Release Subdomain"
        maxWidth="sm"
        closeOnBackdrop={!unclaiming}
        closeOnEscape={!unclaiming}
        footer={
          <ModalFooter
            onCancel={() => setShowUnclaimModal(false)}
            onSubmit={handleUnclaimConfirm}
            submitLabel="Release"
            submitLoadingLabel="Releasing..."
            isSubmitting={unclaiming}
            variant="destructive"
          />
        }
      >
        <div className="space-y-3">
          <div
            className="flex items-start gap-3 p-3 rounded-lg"
            style={{
              backgroundColor: 'var(--monarch-error-light, rgba(239, 68, 68, 0.1))',
              border: '1px solid var(--monarch-error)',
            }}
          >
            <AlertTriangle
              size={20}
              className="shrink-0 mt-0.5"
              style={{ color: 'var(--monarch-error)' }}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--monarch-error)' }}>
                This will release {subdomain}.eclosion.me
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
                Your tunnel, DNS record, and all remote access data will be deleted.
                The subdomain will become available for anyone to claim.
              </p>
            </div>
          </div>
          <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            You can claim a new subdomain afterwards.
          </p>
        </div>
      </Modal>

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
