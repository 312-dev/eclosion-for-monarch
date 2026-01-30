/* eslint-disable sonarjs/no-nested-conditional */
/**
 * DebtAccountSelectorModal
 *
 * Modal for selecting a debt account to populate the stash amount.
 * Shows all debt accounts (credit cards, loans, etc.) with their current balances.
 */

import { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Icons } from '../icons';
import { useAvailableToStash } from '../../api/queries';
import type { AccountBalance } from '../../types';
import { isDebtAccount } from '../../types';

interface DebtAccountSelectorModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSelect: (account: AccountBalance) => void;
}

export function DebtAccountSelectorModal({
  isOpen,
  onClose,
  onSelect,
}: DebtAccountSelectorModalProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const { rawData, isLoading } = useAvailableToStash();

  // Group account types into categories for display
  // Based on Monarch's loan subtypes: auto, student, mortgage, home_equity, line_of_credit, etc.
  const getAccountCategory = (accountType: string): string => {
    const normalized = accountType.toLowerCase();
    if (normalized.includes('credit')) return 'Credit Cards';
    if (normalized === 'mortgage' || normalized === 'home' || normalized === 'home_equity')
      return 'Mortgages';
    if (normalized === 'auto') return 'Auto Loans';
    if (normalized === 'student') return 'Student Loans';
    if (normalized === 'line_of_credit' || normalized === 'consumer') return 'Personal Loans';
    return 'Other Loans';
  };

  // Filter to debt accounts and group by category
  const accounts = rawData?.accounts;
  const debtAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts
      .filter((account) => account.isEnabled && isDebtAccount(account.accountType))
      .filter((account) => account.balance !== 0) // Show accounts with any balance (debt is negative for credit cards)
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)); // Sort by debt size descending
  }, [accounts]);

  // Group accounts by category
  const groupedAccounts = useMemo(() => {
    const groups: Record<string, AccountBalance[]> = {};
    const categoryOrder = [
      'Credit Cards',
      'Auto Loans',
      'Student Loans',
      'Personal Loans',
      'Mortgages',
      'Other Loans',
    ];

    for (const account of debtAccounts) {
      const category = getAccountCategory(account.accountType);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(account);
    }

    // Return ordered array of [category, accounts] pairs
    return categoryOrder
      .filter((cat) => groups[cat] && groups[cat].length > 0)
      .map((cat) => [cat, groups[cat]!] as const);
  }, [debtAccounts]);

  const handleSelect = () => {
    const selected = debtAccounts.find((a) => a.id === selectedAccountId);
    if (selected) {
      onSelect(selected);
      setSelectedAccountId(null);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedAccountId(null);
    onClose();
  };

  const handleRowClick = (accountId: string) => {
    setSelectedAccountId(accountId);
  };

  const handleRowDoubleClick = (account: AccountBalance) => {
    onSelect(account);
    setSelectedAccountId(null);
    onClose();
  };

  const footer = (
    <div
      className="flex justify-end gap-2 p-4 border-t"
      style={{ borderColor: 'var(--monarch-border)' }}
    >
      <button
        type="button"
        onClick={handleClose}
        className="px-4 py-2 text-sm rounded-md transition-colors"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          color: 'var(--monarch-text-muted)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSelect}
        disabled={!selectedAccountId}
        className="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: selectedAccountId ? 'var(--monarch-teal)' : 'var(--monarch-bg-page)',
          color: selectedAccountId ? 'white' : 'var(--monarch-text-muted)',
        }}
      >
        Select
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <Icons.HandCoins size={20} style={{ color: 'var(--monarch-warning)' }} />
          <span>Select Debt Account</span>
        </div>
      }
      footer={footer}
      maxWidth="md"
    >
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--monarch-teal)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : debtAccounts.length === 0 ? (
          <div className="text-center py-8">
            <Icons.Wallet
              size={32}
              className="mx-auto mb-2"
              style={{ color: 'var(--monarch-text-muted)' }}
            />
            <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              No debt accounts found
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
              Add credit cards or loans in Monarch to see them here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
              Select an account to use its current balance as your savings target
            </p>
            {groupedAccounts.map(([category, categoryAccounts]) => (
              <div key={category}>
                <h4
                  className="text-xs font-medium uppercase tracking-wide mb-2 px-1"
                  style={{ color: 'var(--monarch-text-muted)' }}
                >
                  {category}
                </h4>
                <div className="space-y-1">
                  {categoryAccounts.map((account) => {
                    const isSelected = account.id === selectedAccountId;
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => handleRowClick(account.id)}
                        onDoubleClick={() => handleRowDoubleClick(account)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                          isSelected ? 'ring-2 ring-(--monarch-teal)' : ''
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? 'var(--monarch-teal-light)'
                            : 'var(--monarch-bg-page)',
                          border: '1px solid var(--monarch-border)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'var(--monarch-bg-card)' }}
                          >
                            {category === 'Credit Cards' ? (
                              <Icons.Wallet size={16} style={{ color: 'var(--monarch-warning)' }} />
                            ) : (
                              <Icons.Landmark
                                size={16}
                                style={{ color: 'var(--monarch-text-muted)' }}
                              />
                            )}
                          </div>
                          <div className="text-left">
                            <div
                              className="text-sm font-medium"
                              style={{ color: 'var(--monarch-text-dark)' }}
                            >
                              {account.name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-medium tabular-nums"
                            style={{ color: 'var(--monarch-warning)' }}
                          >
                            $
                            {Math.abs(account.balance).toLocaleString('en-US', {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                          {isSelected && (
                            <Icons.Check size={16} style={{ color: 'var(--monarch-teal)' }} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
