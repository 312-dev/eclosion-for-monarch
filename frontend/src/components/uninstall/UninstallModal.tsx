/**
 * UninstallModal - Modal for uninstalling/canceling the tool
 */

import { useState, useEffect } from 'react';
import type { DeletableCategory } from '../../types';
import { getDeletableCategories, deleteAllCategories, cancelSubscription, getDeploymentInfo } from '../../api/client';
import type { CancelSubscriptionResult, DeploymentInfo } from '../../api/client';
import { getErrorMessage } from '../../utils';
import { WarningIcon, XIcon, CheckSimpleIcon } from '../icons';
import { UI } from '../../constants';
import { DeleteCategoriesContent } from './DeleteCategoriesContent';
import { CancelSubscriptionContent } from './CancelSubscriptionContent';
import { UninstallModalFooter } from './UninstallModalFooter';

interface UninstallModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

type Tab = 'delete' | 'cancel';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'warning';
}

export function UninstallModal({ isOpen, onClose }: UninstallModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('delete');
  const [categories, setCategories] = useState<DeletableCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);

  // Cancel subscription state
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo | null>(null);
  const [cancelResult, setCancelResult] = useState<CancelSubscriptionResult | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const expectedConfirmText = `Delete these ${categories.length} categories`;

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchDeploymentInfo();
      setConfirmText('');
      setError(null);
      setToast(null);
      setCancelResult(null);
      setCancelConfirm(false);
    }
  }, [isOpen]);

  const fetchCategories = async () => {
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
  };

  const fetchDeploymentInfo = async () => {
    try {
      const info = await getDeploymentInfo();
      setDeploymentInfo(info);
    } catch {
      // Not critical if this fails
    }
  };

  const handleDelete = async () => {
    if (confirmText !== expectedConfirmText) return;

    setDeleting(true);
    setError(null);
    try {
      const result = await deleteAllCategories();

      if (result.success) {
        setToast({ message: `${result.deleted_count} categories deleted`, type: 'success' });
        setTimeout(() => {
          window.location.reload();
        }, UI.DELAY.TOAST_BEFORE_RELOAD);
      } else if (result.deleted_count > 0) {
        setToast({
          message: `${result.deleted_count} deleted, ${result.failed_count} failed`,
          type: 'warning'
        });
        setTimeout(() => {
          window.location.reload();
        }, UI.DELAY.TOAST_WITH_PARTIAL_SUCCESS);
      } else {
        throw new Error(`Failed to delete categories: ${result.failed.map(f => f.error).join(', ')}`);
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!cancelConfirm) return;

    setCancelling(true);
    setError(null);
    try {
      const result = await cancelSubscription();
      setCancelResult(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  if (!isOpen) return null;

  const isProcessing = deleting || cancelling;

  return (
    <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 modal-backdrop"
        onClick={isProcessing ? undefined : onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl shadow-xl max-h-[80vh] flex flex-col modal-content"
        style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)' }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--monarch-border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WarningIcon size={20} color="var(--monarch-error)" />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--monarch-error)' }}>
                Uninstall / Cancel
              </h2>
            </div>
            {!isProcessing && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                <XIcon size={20} />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setActiveTab('delete')}
              disabled={isProcessing}
              className="px-3 py-1.5 text-sm rounded-lg transition-colors"
              style={{
                backgroundColor: activeTab === 'delete' ? 'var(--monarch-error-bg)' : 'transparent',
                color: activeTab === 'delete' ? 'var(--monarch-error)' : 'var(--monarch-text-muted)',
                border: activeTab === 'delete' ? 'none' : '1px solid var(--monarch-border)',
              }}
            >
              Delete Categories
            </button>
            <button
              onClick={() => setActiveTab('cancel')}
              disabled={isProcessing}
              className="px-3 py-1.5 text-sm rounded-lg transition-colors"
              style={{
                backgroundColor: activeTab === 'cancel' ? 'var(--monarch-error-bg)' : 'transparent',
                color: activeTab === 'cancel' ? 'var(--monarch-error)' : 'var(--monarch-text-muted)',
                border: activeTab === 'cancel' ? 'none' : '1px solid var(--monarch-border)',
              }}
            >
              Tear Down & Stop Paying
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className="mx-4 mt-4 p-3 rounded-lg text-sm flex items-center gap-2"
            style={{
              backgroundColor: toast.type === 'success' ? 'var(--monarch-success-bg)' :
                              toast.type === 'warning' ? 'var(--monarch-orange-bg)' : 'var(--monarch-error-bg)',
              color: toast.type === 'success' ? 'var(--monarch-success)' :
                     toast.type === 'warning' ? 'var(--monarch-orange)' : 'var(--monarch-error)',
            }}
          >
            {toast.type === 'success' && <CheckSimpleIcon size={16} />}
            {toast.message}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm error-message" style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}>
              {error}
            </div>
          )}

          {activeTab === 'delete' ? (
            <DeleteCategoriesContent
              categories={categories}
              loading={loading}
              confirmText={confirmText}
              expectedConfirmText={expectedConfirmText}
              deleting={deleting}
              onConfirmTextChange={setConfirmText}
            />
          ) : (
            <CancelSubscriptionContent
              cancelResult={cancelResult}
              deploymentInfo={deploymentInfo}
              cancelConfirm={cancelConfirm}
              cancelling={cancelling}
              onCancelConfirmChange={setCancelConfirm}
            />
          )}
        </div>

        {/* Footer */}
        <UninstallModalFooter
          activeTab={activeTab}
          deleting={deleting}
          cancelling={cancelling}
          confirmText={confirmText}
          expectedConfirmText={expectedConfirmText}
          categoriesCount={categories.length}
          cancelConfirm={cancelConfirm}
          cancelResult={cancelResult}
          onClose={onClose}
          onDelete={handleDelete}
          onCancelSubscription={handleCancelSubscription}
        />
      </div>
    </div>
  );
}
