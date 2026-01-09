/**
 * UninstallModalFooter - Footer buttons for the UninstallModal
 */

import type { CancelSubscriptionResult } from '../../api/client';
import { SpinnerIcon, TrashIcon } from '../icons';

interface UninstallModalFooterProps {
  readonly cancelling: boolean;
  readonly confirmed: boolean;
  readonly cancelResult: CancelSubscriptionResult | null;
  readonly onClose: () => void;
  readonly onUninstall: () => void;
}

export function UninstallModalFooter({
  cancelling,
  confirmed,
  cancelResult,
  onClose,
  onUninstall,
}: UninstallModalFooterProps) {
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
        onClick={onUninstall}
        disabled={!confirmed || cancelling}
        className="flex-1 px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{
          backgroundColor: 'var(--monarch-error)',
          opacity: !confirmed && !cancelling ? 0.5 : 1,
        }}
      >
        {cancelling ? (
          <>
            <SpinnerIcon size={16} />
            Uninstalling...
          </>
        ) : (
          <>
            <TrashIcon size={16} />
            Uninstall
          </>
        )}
      </button>
    </div>
  );
}
