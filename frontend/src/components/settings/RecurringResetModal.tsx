/**
 * Recurring Reset Modal
 *
 * Modal dialog for resetting the recurring tool to its initial state.
 * Handles confirmation, displays impact summary, and executes reset.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import { useToast } from '../../context/ToastContext';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { CancelButton, WarningButton } from '../ui/ModalButtons';
import * as api from '../../api/client';
import * as demoApi from '../../api/demoClient';

interface RecurringResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalCategories: number;
  totalItems: number;
}

export function RecurringResetModal({
  isOpen,
  onClose,
  totalCategories,
  totalItems,
}: RecurringResetModalProps) {
  const [resetting, setResetting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDemo = useDemo();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isRateLimited = useIsRateLimited();

  const handleReset = async () => {
    if (!confirmed) return;

    setResetting(true);
    setError(null);
    try {
      if (isDemo) {
        demoApi.resetDemoData();
        queryClient.invalidateQueries();
      } else {
        await api.resetRecurringTool();
      }
      toast.success('Recurring tool reset successfully');
      globalThis.location.reload();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to reset';
      toast.error(errorMsg);
      setError(errorMsg);
      setResetting(false);
    }
  };

  const handleClose = () => {
    if (resetting) return;
    onClose();
    setConfirmed(false);
    setError(null);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 modal-backdrop" onClick={handleClose} />
      <div
        className="relative w-full max-w-md mx-4 rounded-xl shadow-xl modal-content"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        {/* Header */}
        <div
          className="p-4 border-b rounded-t-xl"
          style={{ borderColor: 'var(--monarch-border)', backgroundColor: 'var(--monarch-bg-page)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={20} style={{ color: 'var(--monarch-orange)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
                Reset Recurring Tool
              </h2>
            </div>
            {!resetting && (
              <button
                onClick={handleClose}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--monarch-text-muted)' }}
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p style={{ color: 'var(--monarch-text-muted)' }}>
            This will completely reset the Recurring tool to its initial state, as if you just
            installed it.
          </p>

          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-elevated)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
              This will:
            </p>
            <ul className="text-sm space-y-1" style={{ color: 'var(--monarch-text-muted)' }}>
              <li className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: 'var(--monarch-error)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span>
                  Delete {totalCategories} {totalCategories === 1 ? 'category' : 'categories'} from
                  Monarch
                </span>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: 'var(--monarch-orange)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
                <span>
                  Disable tracking for {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: 'var(--monarch-orange)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Reset the setup wizard</span>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: 'var(--monarch-success)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Keep your login credentials</span>
              </li>
            </ul>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={resetting}
              className="mt-1"
            />
            <span className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
              I understand this will delete categories and reset my recurring configuration
            </span>
          </label>

          {error && (
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <CancelButton onClick={handleClose} disabled={resetting} fullWidth>
              Cancel
            </CancelButton>
            <WarningButton
              onClick={handleReset}
              disabled={!confirmed || isRateLimited}
              isLoading={resetting}
              loadingText="Resetting..."
              fullWidth
            >
              Reset Tool
            </WarningButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
