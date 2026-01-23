/**
 * ImagePickerMenu Component
 *
 * Dropdown menu for image picker with "Search for an image" and "Browse computer" options.
 * Used by both NewStashImageUpload and StashImageUpload.
 */

import { Icons } from '../icons';
import { Z_INDEX } from '../../constants';

interface ImagePickerMenuProps {
  readonly onSearchClick: () => void;
  readonly onBrowseClick: () => void;
}

export function ImagePickerMenu({ onSearchClick, onBrowseClick }: ImagePickerMenuProps) {
  return (
    <div
      className="absolute top-full left-0 mt-1 w-48 rounded-lg shadow-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
        zIndex: Z_INDEX.DROPDOWN,
      }}
      role="menu"
    >
      <button
        type="button"
        onClick={onSearchClick}
        className="w-full px-3 py-2.5 flex items-center gap-2 text-left transition-colors hover:bg-(--monarch-bg-page)"
        role="menuitem"
      >
        <Icons.Search className="h-4 w-4" style={{ color: 'var(--monarch-text-muted)' }} />
        <span className="text-sm">Search for an image</span>
      </button>
      <button
        type="button"
        onClick={onBrowseClick}
        className="w-full px-3 py-2.5 flex items-center gap-2 text-left transition-colors hover:bg-(--monarch-bg-page)"
        role="menuitem"
      >
        <Icons.Upload className="h-4 w-4" style={{ color: 'var(--monarch-text-muted)' }} />
        <span className="text-sm">Browse computer</span>
      </button>
    </div>
  );
}
