/**
 * ItemCard - Individual recurring item card with selection state
 */

import type { RecurringItem } from '../../../types';
import type { PendingLink } from '../../LinkCategoryModal';
import { formatDueDate, formatCurrency, formatFrequency } from '../../../utils';
import { LinkIcon } from '../SetupWizardIcons';
import { CheckIcon, LinkIcon as LinkIconComponent } from '../../icons';
import { MerchantLogo } from './MerchantLogo';

export interface ItemCardProps {
  readonly item: RecurringItem;
  readonly checked: boolean;
  readonly onChange: () => void;
  readonly onLinkClick: (() => void) | undefined;
  readonly onUnlink: (() => void) | undefined;
  readonly pendingLink: PendingLink | undefined;
}

export function ItemCard({ item, checked, onChange, onLinkClick, onUnlink, pendingLink }: ItemCardProps) {
  const displayName = item.merchant_name || item.name.split(' (')[0];
  const isLinked = !!pendingLink;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover-item-card-unchecked ${checked ? 'item-card-checked' : ''}`}
      style={{
        backgroundColor: checked ? 'rgba(255, 105, 45, 0.08)' : 'var(--monarch-bg-card)',
        border: checked ? '1px solid var(--monarch-orange)' : '1px solid var(--monarch-border)',
      }}
      onClick={onChange}
    >
      <div
        className="shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
        style={{
          borderColor: checked ? 'var(--monarch-orange)' : 'var(--monarch-border)',
          backgroundColor: checked ? 'var(--monarch-orange)' : 'transparent',
        }}
      >
        {checked && (
          <CheckIcon size={12} color="white" strokeWidth={3} />
        )}
      </div>

      <MerchantLogo item={item} size={40} />

      <div className="flex-1 min-w-0">
        <div className="font-medium truncate" style={{ color: 'var(--monarch-text-dark)' }}>
          {displayName}
        </div>
        <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
          {isLinked ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnlink?.();
              }}
              className="inline-flex items-center gap-1 hover:underline"
              style={{ color: 'var(--monarch-success)' }}
              title="Click to unlink"
            >
              <LinkIconComponent size={12} />
              {pendingLink.categoryIcon && <span>{pendingLink.categoryIcon}</span>}
              {pendingLink.categoryName}
              <span style={{ color: 'var(--monarch-text-muted)' }}>x</span>
            </button>
          ) : (
            formatDueDate(item.next_due_date)
          )}
        </div>
      </div>

      <div className="text-right shrink-0 flex items-center gap-2">
        {checked && onLinkClick && !isLinked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLinkClick();
            }}
            className="p-1.5 rounded hover-link-icon"
            title="Link to existing category"
            data-tour="link-icon"
          >
            <LinkIcon size={16} />
          </button>
        )}
        <div>
          <div className="font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
            {formatCurrency(item.monthly_contribution)}/mo
          </div>
          <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
            {formatCurrency(item.amount)} {formatFrequency(item.frequency).toLowerCase()}
          </div>
        </div>
      </div>
    </div>
  );
}
