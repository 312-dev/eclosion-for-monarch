/**
 * UninstallModalFooter - Footer buttons for the UninstallModal
 */

import type { CancelSubscriptionResult } from '../../api/client';
import { SpinnerIcon, TrashIcon, XIcon } from '../icons';

type Tab = 'delete' | 'cancel';

interface UninstallModalFooterProps {
  readonly activeTab: Tab;
  readonly deleting: boolean;
  readonly cancelling: boolean;
  readonly confirmText: string;
  readonly expectedConfirmText: string;
  readonly categoriesCount: number;
  readonly cancelConfirm: boolean;
  readonly cancelResult: CancelSubscriptionResult | null;
  readonly onClose: () => void;
  readonly onDelete: () => void;
  readonly onCancelSubscription: () => void;
}

export function UninstallModalFooter({
  activeTab,
  deleting,
  cancelling,
  confirmText,
  expectedConfirmText,
  categoriesCount,
  cancelConfirm,
  cancelResult,
  onClose,
  onDelete,
  onCancelSubscription,
}: UninstallModalFooterProps) {
  if (activeTab === 'delete') {
    return (
      <div className="p-4 border-t flex gap-3" style={{ borderColor: 'var(--monarch-border)' }}>
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
          onClick={onDelete}
          disabled={confirmText !== expectedConfirmText || deleting || categoriesCount === 0}
          className="flex-1 px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{
            backgroundColor: 'var(--monarch-error)',
            opacity: (confirmText !== expectedConfirmText || categoriesCount === 0) && !deleting ? 0.5 : 1,
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
      </div>
    );
  }

  // Cancel tab
  if (cancelResult) {
    return (
      <div className="p-4 border-t flex gap-3" style={{ borderColor: 'var(--monarch-border)' }}>
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
      </div>
    );
  }

  return (
    <div className="p-4 border-t flex gap-3" style={{ borderColor: 'var(--monarch-border)' }}>
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
        onClick={onCancelSubscription}
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
    </div>
  );
}
