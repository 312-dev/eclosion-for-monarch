import { useState, useEffect } from 'react';
import { getDeploymentInfo } from '../api/client';
import type { DeploymentInfo } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils';
import { isDesktopMode } from '../utils/apiBase';
import { Portal } from './Portal';

interface ResetAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
}

function DataLocationMessage({ deploymentInfo }: { readonly deploymentInfo: DeploymentInfo | null }) {
  if (deploymentInfo?.is_railway) {
    return <>Your configuration data is safely stored on Railway and will be preserved.</>;
  }
  if (isDesktopMode()) {
    return <>Your configuration data is stored in your local data folder and will be preserved.</>;
  }
  return <>Your configuration data is stored in the Docker volume and will be preserved.</>;
}

export function ResetAppModal({ isOpen, onClose, onReset }: ResetAppModalProps) {
  const { resetApp } = useAuth();
  const toast = useToast();
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo | null>(null);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchDeploymentInfo();
    }
  }, [isOpen]);

  const fetchDeploymentInfo = async () => {
    try {
      const info = await getDeploymentInfo();
      setDeploymentInfo(info);
    } catch {
      // Not critical if this fails - assume non-Railway
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError(null);
    try {
      const result = await resetApp();
      if (result.success) {
        toast.success('Credentials reset successfully');
        onReset();
      } else {
        const errorMsg = result.error || 'Failed to reset app';
        toast.error(errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 modal-backdrop"
          onClick={resetting ? undefined : onClose}
        />

        {/* Modal */}
        <div
          className="relative w-full max-w-md mx-4 rounded-xl shadow-xl modal-content"
          style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)' }}
        >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--monarch-border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--monarch-orange)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
                Reset App
              </h2>
            </div>
            {!resetting && (
              <button
                onClick={onClose}
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
          <p style={{ color: 'var(--monarch-text-muted)' }}>
            Since you can't remember your passphrase, you'll need to reset your credentials and log in again.
          </p>

          {/* What happens */}
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-elevated)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
              This will:
            </p>
            <ul className="text-sm space-y-1" style={{ color: 'var(--monarch-text-muted)' }}>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--monarch-error)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear your encrypted Monarch credentials
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--monarch-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Keep your tracked subscriptions and settings
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--monarch-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Keep your linked categories and rollups
              </li>
            </ul>
          </div>

          {/* Deployment-specific info */}
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-elevated)' }}>
            <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              <DataLocationMessage deploymentInfo={deploymentInfo} />
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={resetting}
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
              onClick={handleReset}
              disabled={resetting}
              className="flex-1 px-4 py-2 rounded-lg transition-colors text-white"
              style={{
                backgroundColor: resetting ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)',
              }}
            >
              {resetting ? 'Resetting...' : 'Reset and Re-login'}
            </button>
          </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
