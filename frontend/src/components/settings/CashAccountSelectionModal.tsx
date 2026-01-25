/**
 * Cash Account Selection Modal
 *
 * Modal for selecting which cash accounts to include in Available to Stash calculation.
 * Credit cards are always included (shown as disabled in UI).
 */

import { useState, useMemo } from 'react';
import { Wallet, CreditCard } from 'lucide-react';
import { Portal } from '../Portal';
import { CancelButton, PrimaryButton } from '../ui/ModalButtons';
import { useAvailableToStashDataQuery } from '../../api/queries';
import { isCashAccount, isCreditCardAccount } from '../../types/availableToStash';
import { decodeHtmlEntities } from '../../utils';

/**
 * Format account balance with proper negative sign placement.
 * Shows -$387 instead of $-387 for negative balances.
 */
function formatBalance(balance: number): string {
  const rounded = Math.round(balance);
  if (rounded < 0) {
    return `-$${Math.abs(rounded).toLocaleString()}`;
  }
  return `$${rounded.toLocaleString()}`;
}

interface CashAccountSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAccountIds: string[] | null;
  onSave: (accountIds: string[] | null) => Promise<void>;
}

export function CashAccountSelectionModal({
  isOpen,
  onClose,
  selectedAccountIds,
  onSave,
}: CashAccountSelectionModalProps) {
  // Local state for selection (starts with current selection)
  const [localSelection, setLocalSelection] = useState<string[] | null>(selectedAccountIds);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch account data
  const { data: availableData, isLoading } = useAvailableToStashDataQuery();

  // Separate cash accounts and credit cards
  const { cashAccounts, creditCards } = useMemo(() => {
    if (!availableData) {
      return { cashAccounts: [], creditCards: [] };
    }

    return {
      cashAccounts: availableData.accounts.filter(
        (acc) => acc.isEnabled && isCashAccount(acc.accountType)
      ),
      creditCards: availableData.accounts.filter(
        (acc) => acc.isEnabled && isCreditCardAccount(acc.accountType)
      ),
    };
  }, [availableData]);

  const isAllSelected = localSelection === null;
  const selectedCount = isAllSelected ? cashAccounts.length : (localSelection?.length ?? 0);

  const handleToggleAccount = (accountId: string) => {
    if (isAllSelected) {
      // First selection: switch to explicit mode, deselect this one
      const allIds = cashAccounts.map((acc) => acc.id);
      setLocalSelection(allIds.filter((id) => id !== accountId));
    } else {
      const current = localSelection ?? [];
      if (current.includes(accountId)) {
        // Deselect
        const updated = current.filter((id) => id !== accountId);
        setLocalSelection(updated.length === 0 ? [] : updated);
      } else {
        // Select
        const updated = [...current, accountId];
        // If all are now selected, switch back to "all" mode
        if (updated.length === cashAccounts.length) {
          setLocalSelection(null);
        } else {
          setLocalSelection(updated);
        }
      }
    }
  };

  const handleSelectAll = () => {
    setLocalSelection(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localSelection);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center">
        {/* Backdrop */}
        <button
          type="button"
          className="absolute inset-0 bg-black/50 modal-backdrop cursor-default"
          onClick={onClose}
          aria-label="Close modal"
          tabIndex={-1}
        />

        {/* Modal */}
        <div
          className="relative w-full max-w-md mx-4 rounded-xl shadow-xl flex flex-col modal-content bg-monarch-bg-card border border-monarch-border"
          style={{ maxHeight: 'var(--modal-max-height)' }}
        >
          {/* Header */}
          <div
            className="p-4 border-b border-monarch-border rounded-t-xl"
            style={{ backgroundColor: 'var(--monarch-bg-page)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={20} style={{ color: 'var(--monarch-orange)' }} />
                <h2 className="text-lg font-semibold text-monarch-text-dark">
                  Select Cash Accounts
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-(--monarch-bg-hover) transition-colors text-monarch-text-muted"
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
            </div>
            <p className="text-sm mt-1 text-monarch-text-muted">
              Choose which accounts to include in Available Funds calculation
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Select All Button */}
            {!isAllSelected && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--monarch-bg-hover)',
                    color: 'var(--monarch-orange)',
                  }}
                >
                  Select All Accounts
                </button>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-8 text-monarch-text-muted">Loading accounts...</div>
            )}

            {!isLoading && (
              <div className="space-y-3">
                {/* Cash Accounts */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase text-monarch-text-muted">
                      Cash Accounts
                    </h3>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-(--monarch-bg-hover) text-monarch-text-muted">
                      {selectedCount} of {cashAccounts.length} selected
                    </span>
                  </div>
                  <div className="space-y-1">
                    {cashAccounts.map((account) => {
                      const isSelected = isAllSelected || localSelection?.includes(account.id);

                      return (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => handleToggleAccount(account.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-(--monarch-bg-hover) transition-colors"
                          style={{
                            backgroundColor: isSelected
                              ? 'var(--monarch-orange-light, rgba(255, 134, 72, 0.1))'
                              : 'transparent',
                          }}
                        >
                          <div
                            className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0"
                            style={{
                              borderColor: isSelected
                                ? 'var(--monarch-orange)'
                                : 'var(--monarch-border)',
                              backgroundColor: isSelected ? 'var(--monarch-orange)' : 'transparent',
                            }}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <span className="flex-1 text-left text-sm text-monarch-text-dark">
                            {decodeHtmlEntities(account.name)}
                          </span>
                          <span className="text-sm text-monarch-text-muted">
                            {formatBalance(account.balance)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Credit Cards (Always Included) */}
                {creditCards.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-monarch-text-muted mb-2">
                      Credit Cards (Always Included)
                    </h3>
                    <div className="space-y-1">
                      {creditCards.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-60"
                          style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
                        >
                          <CreditCard size={18} style={{ color: 'var(--monarch-text-muted)' }} />
                          <span className="flex-1 text-left text-sm text-monarch-text-muted">
                            {decodeHtmlEntities(account.name)}
                          </span>
                          <span className="text-sm text-monarch-text-muted">
                            {formatBalance(account.balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="p-4 border-t border-monarch-border rounded-b-xl flex gap-2"
            style={{ backgroundColor: 'var(--monarch-bg-page)' }}
          >
            <CancelButton onClick={onClose} disabled={isSaving} fullWidth>
              Cancel
            </CancelButton>
            <PrimaryButton
              onClick={handleSave}
              isLoading={isSaving}
              loadingText="Saving..."
              fullWidth
            >
              Save
            </PrimaryButton>
          </div>
        </div>
      </div>
    </Portal>
  );
}
