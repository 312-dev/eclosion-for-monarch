/** TransactionRow — individual transaction row with desktop grid and mobile card layout. */
import React from 'react';
import { Check } from 'lucide-react';
import { MerchantIcon } from '../ui';
import { decodeHtmlEntities } from '../../utils';
import { AccountIcon, TagsNotesAmount, formatAmount } from './TransactionRowParts';
import type { MatchType } from './TransactionRowParts';
import type { Transaction, RefundsMatch } from '../../types/refunds';

interface TransactionRowProps {
  readonly transaction: Transaction;
  readonly match: RefundsMatch | undefined;
  readonly effectiveRefundAmount: number | undefined;
  readonly agingWarningDays: number;
  readonly isSelected: boolean;
  readonly onToggleSelect: (transaction: Transaction, shiftKey: boolean) => void;
  readonly matchType: MatchType;
  readonly matchDate: string | null;
  readonly matchAmount: number | null;
  readonly creditGroupId: string | null;
  readonly onScrollToCredit: ((id: string) => void) | null;
}

const MS_PER_DAY = 86_400_000;

/** Aging left-border accent (box-shadow): amber→red from 75%→100% of threshold. */
function getAgingBorder(transactionDate: string, thresholdDays: number): string | null {
  if (thresholdDays <= 0) return null;
  const daysOld = Math.floor(
    (Date.now() - new Date(transactionDate + 'T00:00:00').getTime()) / MS_PER_DAY
  );
  const progress = daysOld / thresholdDays;
  if (progress < 0.75) return null;
  const t = Math.min(1, (progress - 0.75) / 0.25);
  return `inset 3px 0 0 hsl(${(35 * (1 - t)).toFixed(0)} ${(90 + 10 * t).toFixed(0)}% ${(55 - 5 * t).toFixed(0)}%)`;
}

function getRowClassName(isMatched: boolean, isExpected: boolean, isSelected: boolean): string {
  if (isSelected) return 'bg-(--monarch-orange)/5';
  if (isMatched) return 'bg-(--monarch-success)/5';
  if (isExpected) return 'bg-(--monarch-accent)/5';
  return '';
}

function getCheckboxClassName(isSelected: boolean): string {
  return isSelected
    ? 'bg-(--monarch-orange) border-(--monarch-orange) text-white'
    : 'border-(--monarch-text-muted)/40 hover:border-(--monarch-text-muted)';
}

function getStatusLabel(isMatched: boolean, isExpected: boolean, isSkipped: boolean): string {
  if (isMatched) return ', matched';
  if (isExpected) return ', expected refund';
  if (isSkipped) return ', skipped';
  return ', unmatched';
}

/** Desktop-only 6-column grid: [actions][icon][merchant][category][account][amount]. */
const GRID_CLASSES_DESKTOP =
  'hidden md:grid gap-x-3 grid-cols-[48px_24px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_130px]';

function SelectCheckbox({
  isSelected,
  onToggle,
}: {
  readonly isSelected: boolean;
  readonly onToggle: (e: React.MouseEvent) => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${getCheckboxClassName(isSelected)}`}
      aria-label={isSelected ? 'Deselect transaction' : 'Select transaction'}
      aria-pressed={isSelected}
      onClick={onToggle}
    >
      {isSelected && <Check size={14} />}
    </button>
  );
}

export const TransactionRow = React.memo(function TransactionRow({
  transaction,
  match,
  effectiveRefundAmount: _effectiveRefundAmount,
  agingWarningDays,
  isSelected,
  onToggleSelect,
  matchType,
  matchDate,
  matchAmount,
  creditGroupId,
  onScrollToCredit,
}: TransactionRowProps) {
  const isExpected = match?.expectedRefund === true;
  const isMatched = match != null && !match.skipped && !isExpected;
  const isSkipped = match?.skipped === true;
  const merchantName = decodeHtmlEntities(transaction.merchant?.name ?? transaction.originalName);
  const agingBorder =
    !isMatched && !isSkipped && !isExpected
      ? getAgingBorder(transaction.date, agingWarningDays)
      : null;
  const handleCheckbox = (e: React.MouseEvent): void => onToggleSelect(transaction, e.shiftKey);
  const handleRowClick = (e: React.MouseEvent): void => {
    if (!(e.target as HTMLElement).closest('button, a')) onToggleSelect(transaction, e.shiftKey);
  };
  const logoUrl = transaction.merchant?.logoUrl ?? null;
  const merchantIconDesktop = <MerchantIcon logoUrl={logoUrl} itemName={merchantName} size="sm" />;
  const merchantIconMobile = <MerchantIcon logoUrl={logoUrl} itemName={merchantName} size="xs" />;

  return (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- native button can't contain nested interactive elements
    <div
      className={`w-full border-b border-(--monarch-border) hover:bg-(--monarch-bg-hover) transition-colors text-left cursor-pointer ${getRowClassName(isMatched, isExpected, isSelected)}`}
      style={agingBorder ? { boxShadow: agingBorder } : undefined}
      aria-label={`${merchantName}: ${formatAmount(transaction.amount)}${getStatusLabel(isMatched, isExpected, isSkipped)}`}
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleSelect(transaction, e.shiftKey);
        }
      }}
    >
      {/* Desktop: 6-column grid */}
      <div className={`items-center px-4 py-3 ${GRID_CLASSES_DESKTOP}`}>
        <div className="flex items-center justify-center">
          <SelectCheckbox isSelected={isSelected} onToggle={handleCheckbox} />
        </div>
        {merchantIconDesktop}
        <div className="min-w-0">
          <span className="font-medium text-sm text-(--monarch-text-dark) truncate block">
            {merchantName}
          </span>
        </div>
        <div className="min-w-0 flex items-center gap-1.5">
          {transaction.category ? (
            <>
              <span className="shrink-0 text-sm">{transaction.category.icon}</span>
              <span className="text-sm text-(--monarch-text-muted) truncate">
                {decodeHtmlEntities(transaction.category.name)}
              </span>
            </>
          ) : (
            <span />
          )}
        </div>
        <div className="min-w-0 flex items-center gap-1.5">
          {transaction.account ? (
            <>
              <AccountIcon account={transaction.account} />
              <span className="text-sm text-(--monarch-text-muted) truncate">
                {transaction.account.displayName}
              </span>
            </>
          ) : (
            <span />
          )}
        </div>
        <TagsNotesAmount
          transaction={transaction}
          matchType={matchType}
          matchDate={matchDate}
          matchAmount={matchAmount}
          creditGroupId={creditGroupId}
          onScrollToCredit={onScrollToCredit}
        />
      </div>
      {/* Mobile: card layout */}
      <div className="md:hidden px-3 py-2.5 flex items-center gap-3">
        <div className="flex items-center justify-center w-5 shrink-0">
          <SelectCheckbox isSelected={isSelected} onToggle={handleCheckbox} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {merchantIconMobile}
            <span className="font-medium text-sm text-(--monarch-text-dark) truncate flex-1 min-w-0">
              {merchantName}
            </span>
            <TagsNotesAmount
              transaction={transaction}
              matchType={matchType}
              matchDate={matchDate}
              matchAmount={matchAmount}
              creditGroupId={creditGroupId}
              onScrollToCredit={onScrollToCredit}
            />
          </div>
          {(transaction.category || transaction.account) && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-(--monarch-text-muted)">
              {transaction.category && (
                <span className="truncate">{decodeHtmlEntities(transaction.category.name)}</span>
              )}
              {transaction.account && (
                <span className="ml-auto truncate max-w-[55%]">
                  {transaction.account.displayName}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
