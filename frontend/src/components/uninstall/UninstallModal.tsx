/**
 * UninstallModal - Modal for uninstalling/canceling the tool
 */

import { useState, useEffect, useCallback } from 'react';
import type { DeletableCategory } from '../../types';
import { getDeletableCategories, cancelSubscription, getDeploymentInfo } from '../../api/client';
import type { CancelSubscriptionResult, DeploymentInfo } from '../../api/client';
import { getErrorMessage } from '../../utils';
import { isDesktopMode } from '../../utils/apiBase';
import { useToast } from '../../context/ToastContext';
import { WarningIcon, XIcon } from '../icons';
import { UninstallModalFooter } from './UninstallModalFooter';
import { UninstallSuccessContent } from './UninstallSuccessContent';
import { UninstallFormContent } from './UninstallFormContent';
import { Portal } from '../Portal';

interface UninstallModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

type CategoryChoice = 'delete' | 'keep';

export function UninstallModal({ isOpen, onClose }: UninstallModalProps) {
  const toast = useToast();
  const [categories, setCategories] = useState<DeletableCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryChoice, setCategoryChoice] = useState<CategoryChoice>('delete');

  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo | null>(null);
  const [cancelResult, setCancelResult] = useState<CancelSubscriptionResult | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [fullReset, setFullReset] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDeletableCategories();
      setCategories(data.categories);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDeploymentInfo = useCallback(async () => {
    try {
      const info = await getDeploymentInfo();
      setDeploymentInfo(info);
    } catch {
      // Not critical if this fails
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchDeploymentInfo();
      setError(null);
      setCancelResult(null);
      setConfirmed(false);
      setCategoryChoice('delete');
      setFullReset(false);
    }
  }, [isOpen, fetchCategories, fetchDeploymentInfo]);

  const handleUninstall = async () => {
    if (!confirmed) return;

    setCancelling(true);
    setError(null);
    try {
      const result = await cancelSubscription(categoryChoice === 'delete', fullReset);

      // On desktop, also clear local data folder
      if (isDesktopMode() && globalThis.electron) {
        try {
          await globalThis.electron.showFactoryResetDialog();
        } catch {
          // Non-critical if this fails - data was already cleared via API
        }
      }

      setCancelResult(result);
      toast.success('Uninstall completed successfully');
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setCancelling(false);
    }
  };

  const handleBackdropClick = () => {
    if (!cancelling) {
      onClose();
    }
  };

  const handleBackdropKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !cancelling) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 modal-backdrop"
          onClick={handleBackdropClick}
          onKeyDown={handleBackdropKeyDown}
          role="presentation"
        />

        {/* Modal */}
        <div
          className="relative w-full max-w-lg mx-4 rounded-xl shadow-xl max-h-[80vh] flex flex-col modal-content"
          style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="uninstall-modal-title"
        >
          {/* Header */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--monarch-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WarningIcon size={20} color="var(--monarch-error)" />
                <h2 id="uninstall-modal-title" className="text-lg font-semibold" style={{ color: 'var(--monarch-error)' }}>
                  Uninstall
                </h2>
              </div>
              {!cancelling && (
                <button
                  onClick={onClose}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  style={{ color: 'var(--monarch-text-muted)' }}
                  aria-label="Close modal"
                >
                  <XIcon size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {error && (
              <div className="mb-4 p-3 rounded-lg text-sm error-message" style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}>
                {error}
              </div>
            )}

            {cancelResult ? (
              <UninstallSuccessContent cancelResult={cancelResult} />
            ) : (
              <UninstallFormContent
                loading={loading}
                categories={categories}
                categoryChoice={categoryChoice}
                onCategoryChoiceChange={setCategoryChoice}
                confirmed={confirmed}
                onConfirmedChange={setConfirmed}
                fullReset={fullReset}
                onFullResetChange={setFullReset}
                cancelling={cancelling}
                deploymentInfo={deploymentInfo}
              />
            )}
          </div>

          {/* Footer */}
          <UninstallModalFooter
            cancelling={cancelling}
            confirmed={confirmed}
            cancelResult={cancelResult}
            onClose={onClose}
            onUninstall={handleUninstall}
          />
        </div>
      </div>
    </Portal>
  );
}
