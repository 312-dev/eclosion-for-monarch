/**
 * Stash Header
 *
 * Header section with Available Funds amount and action buttons.
 */

import { GiTwoCoins } from 'react-icons/gi';
import { Icons } from '../icons';
import { AvailableToStash } from './AvailableToStash';
import { getBrowserName } from './utils';
import type { BrowserType } from '../../types';

interface StashHeaderProps {
  readonly selectedBrowser: BrowserType | null;
  readonly isBrowserConfigured: boolean;
  readonly isSyncingBookmarks: boolean;
  readonly onSyncBookmarks: () => void;
  readonly onAddItem: () => void;
  readonly includeExpectedIncome?: boolean;
}

export function StashHeader({
  selectedBrowser,
  isBrowserConfigured,
  isSyncingBookmarks,
  onSyncBookmarks,
  onAddItem,
  includeExpectedIncome = false,
}: StashHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <AvailableToStash mode="header" includeExpectedIncome={includeExpectedIncome} />
      <div className="flex items-center gap-2">
        <button
          data-tour="stash-sync-bookmarks"
          onClick={onSyncBookmarks}
          disabled={isSyncingBookmarks}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-(--monarch-bg-hover)"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            color: 'var(--monarch-text-dark)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          {isBrowserConfigured ? (
            <Icons.Refresh size={16} className={isSyncingBookmarks ? 'animate-spin' : ''} />
          ) : (
            <Icons.Download size={16} />
          )}
          Sync {getBrowserName(selectedBrowser)}
        </button>
        <button
          data-tour="stash-add-item"
          onClick={onAddItem}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: 'var(--monarch-orange)' }}
        >
          <GiTwoCoins size={16} />
          New Stash
        </button>
      </div>
    </div>
  );
}
