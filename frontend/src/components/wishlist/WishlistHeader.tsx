/**
 * Wishlist Header
 *
 * Header section with title and action buttons.
 */

import { Plus } from 'lucide-react';
import { WishlistIcon } from '../wizards/WizardComponents';
import { Icons } from '../icons';
import { getBrowserName } from './utils';
import type { BrowserType } from '../../types';

interface WishlistHeaderProps {
  selectedBrowser: BrowserType | null;
  isBrowserConfigured: boolean;
  isSyncingBookmarks: boolean;
  onSyncBookmarks: () => void;
  onAddItem: () => void;
}

export function WishlistHeader({
  selectedBrowser,
  isBrowserConfigured,
  isSyncingBookmarks,
  onSyncBookmarks,
  onAddItem,
}: WishlistHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <WishlistIcon size={24} />
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
            Wishlist
          </h1>
          <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            Save for things you want to buy
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          data-tour="wishlist-sync-bookmarks"
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
          data-tour="wishlist-add-item"
          onClick={onAddItem}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: 'var(--monarch-orange)' }}
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>
    </div>
  );
}
