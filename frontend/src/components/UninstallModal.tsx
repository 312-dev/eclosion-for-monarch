import { useState, useEffect } from 'react';
import type { DeletableCategory } from '../types';
import { getDeletableCategories, deleteAllCategories, cancelSubscription, getDeploymentInfo } from '../api/client';
import type { CancelSubscriptionResult, DeploymentInfo } from '../api/client';
import { getErrorMessage } from '../utils';
import { WarningIcon, XIcon, CheckSimpleIcon, SpinnerIcon, TrashIcon } from './icons';
import { UI } from '../constants';

interface UninstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'delete' | 'cancel';

export function UninstallModal({ isOpen, onClose }: UninstallModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('delete');
  const [categories, setCategories] = useState<DeletableCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

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

  return (
    <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 modal-backdrop"
        onClick={(deleting || cancelling) ? undefined : onClose}
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
            {!(deleting || cancelling) && (
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
              disabled={deleting || cancelling}
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
              disabled={deleting || cancelling}
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
            {toast.type === 'success' && (
              <CheckSimpleIcon size={16} />
            )}
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
            // Delete Categories Tab
            <>
              <p className="text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
                Delete all budget categories created by this tool from your Monarch account. This does not cancel your subscription.
              </p>

              {loading ? (
                <div className="text-center py-8" style={{ color: 'var(--monarch-text-muted)' }}>
                  Loading categories...
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--monarch-text-muted)' }}>
                  No categories to delete. All tracked categories were linked to existing categories.
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
                      The following {categories.length} {categories.length === 1 ? 'category' : 'categories'} will be deleted:
                    </div>
                    <div
                      className="rounded-lg p-3 max-h-40 overflow-y-auto space-y-1"
                      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
                    >
                      {categories.map((cat) => (
                        <div
                          key={cat.category_id}
                          className="flex items-center justify-between text-sm py-1"
                        >
                          <span style={{ color: 'var(--monarch-text-dark)' }}>
                            {cat.name}
                            {cat.is_rollup && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--monarch-orange-bg)', color: 'var(--monarch-orange)' }}>
                                rollup
                              </span>
                            )}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                            {cat.group_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
                      Type "<span style={{ color: 'var(--monarch-error)' }}>{expectedConfirmText}</span>" to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      disabled={deleting}
                      placeholder={expectedConfirmText}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        border: '1px solid var(--monarch-border)',
                        backgroundColor: 'var(--monarch-bg-card)',
                        color: 'var(--monarch-text-dark)',
                      }}
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            // Cancel Subscription Tab
            <>
              {cancelResult ? (
                // Show result after cancellation
                <div className="space-y-4">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--monarch-success-bg)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckSimpleIcon size={20} color="var(--monarch-success)" />
                      <span className="font-medium" style={{ color: 'var(--monarch-success)' }}>Data Cleared Successfully</span>
                    </div>
                    <ul className="text-sm space-y-1 ml-7" style={{ color: 'var(--monarch-text-dark)' }}>
                      {cancelResult.instructions.map((instruction, i) => (
                        <li key={i}>{instruction}</li>
                      ))}
                    </ul>
                  </div>

                  {cancelResult.railway_deletion_url && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                        Final Step: Delete Your Railway Project
                      </p>
                      <a
                        href={cancelResult.railway_deletion_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full px-4 py-3 text-center text-white rounded-lg transition-colors hover:opacity-90"
                        style={{ backgroundColor: 'var(--monarch-error)' }}
                      >
                        Open Railway Project Settings
                      </a>
                      <p className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                        Click the button above, then scroll down and click "Delete Project" to stop all future charges.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Show cancel confirmation
                <div className="space-y-4">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--monarch-error-bg)' }}>
                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--monarch-error)' }}>
                      This will permanently:
                    </p>
                    <ul className="text-sm space-y-1 ml-4 list-disc" style={{ color: 'var(--monarch-text-dark)' }}>
                      <li>Delete all budget categories created by this tool from Monarch</li>
                      <li>Clear your stored credentials and app data</li>
                      <li>Log you out of the app</li>
                    </ul>
                  </div>

                  {deploymentInfo?.is_railway && (
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
                      <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                        After clearing your data, you'll get a direct link to delete your Railway project and stop all future charges.
                      </p>
                    </div>
                  )}

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cancelConfirm}
                      onChange={(e) => setCancelConfirm(e.target.checked)}
                      disabled={cancelling}
                      className="mt-1"
                    />
                    <span className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                      I understand this action is irreversible and want to tear down this instance
                    </span>
                  </label>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3" style={{ borderColor: 'var(--monarch-border)' }}>
          {activeTab === 'delete' ? (
            <>
              <button
                onClick={onClose}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm rounded-lg transition-colors btn-hover-lift disabled:opacity-50"
                style={{
                  border: '1px solid var(--monarch-border)',
                  color: 'var(--monarch-text-dark)',
                  backgroundColor: 'var(--monarch-bg-card)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== expectedConfirmText || deleting || categories.length === 0}
                className="flex-1 px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--monarch-error)',
                  opacity: (confirmText !== expectedConfirmText || categories.length === 0) && !deleting ? 0.5 : 1,
                }}
              >
                {deleting ? (
                  <>
                    <SpinnerIcon size={16} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon size={16} />
                    Delete All
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {cancelResult ? (
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm rounded-lg transition-colors btn-hover-lift"
                  style={{
                    border: '1px solid var(--monarch-border)',
                    color: 'var(--monarch-text-dark)',
                    backgroundColor: 'var(--monarch-bg-card)',
                  }}
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    disabled={cancelling}
                    className="flex-1 px-4 py-2 text-sm rounded-lg transition-colors btn-hover-lift disabled:opacity-50"
                    style={{
                      border: '1px solid var(--monarch-border)',
                      color: 'var(--monarch-text-dark)',
                      backgroundColor: 'var(--monarch-bg-card)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={!cancelConfirm || cancelling}
                    className="flex-1 px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: 'var(--monarch-error)',
                      opacity: !cancelConfirm && !cancelling ? 0.5 : 1,
                    }}
                  >
                    {cancelling ? (
                      <>
                        <SpinnerIcon size={16} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <XIcon size={16} />
                        Tear Down Instance
                      </>
                    )}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
