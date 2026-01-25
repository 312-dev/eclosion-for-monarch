/**
 * UninstallModalFooter - Footer buttons for the UninstallModal
 */

import type { CancelSubscriptionResult } from '../../api/client';
import { TrashIcon } from '../icons';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { CancelButton, DestructiveButton } from '../ui/ModalButtons';

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
  const isRateLimited = useIsRateLimited();

  if (cancelResult) {
    return (
      <div
        className="p-4 border-t rounded-b-xl flex gap-3"
        style={{ borderColor: 'var(--monarch-border)', backgroundColor: 'var(--monarch-bg-page)' }}
      >
        <CancelButton onClick={onClose} fullWidth>
          Close
        </CancelButton>
      </div>
    );
  }

  return (
    <div
      className="p-4 border-t rounded-b-xl flex gap-3"
      style={{ borderColor: 'var(--monarch-border)', backgroundColor: 'var(--monarch-bg-page)' }}
    >
      <CancelButton onClick={onClose} disabled={cancelling} fullWidth>
        Cancel
      </CancelButton>
      <DestructiveButton
        onClick={onUninstall}
        disabled={!confirmed || isRateLimited}
        isLoading={cancelling}
        loadingText="Deleting..."
        icon={cancelling ? undefined : <TrashIcon size={16} />}
        fullWidth
      >
        Delete All
      </DestructiveButton>
    </div>
  );
}
