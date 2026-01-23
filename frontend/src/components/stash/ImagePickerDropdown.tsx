/**
 * ImagePickerDropdown Component
 *
 * A dropdown that provides two options for selecting an image:
 * 1. Search for an image (opens ImageSearchModal)
 * 2. Browse computer (opens native file picker)
 *
 * Used in Stash item creation/editing to select goal images.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Icons } from '../icons';
import { Z_INDEX } from '../../constants';
import { useToast } from '../../context/ToastContext';
import type { ImageSelection } from '../../types';
import { ImageSearchModal } from './ImageSearchModal';

interface ImagePickerDropdownProps {
  /** Currently selected image URL (if any) */
  currentImage?: string | null;
  /** Callback when an image is selected */
  onImageSelect: (selection: ImageSelection | null) => void;
  /** Optional class name for the trigger button */
  className?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
}

/** Maximum file size for uploaded images (2MB) */
const MAX_FILE_SIZE = 2 * 1024 * 1024;

/** Supported image MIME types */
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function ImagePickerDropdown({
  currentImage,
  onImageSelect,
  className = '',
  disabled = false,
}: ImagePickerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSearchClick = useCallback(() => {
    setIsOpen(false);
    setIsSearchModalOpen(true);
  }, []);

  const handleBrowseClick = useCallback(() => {
    setIsOpen(false);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error('Please select a JPEG, PNG, WebP, or GIF image.');
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Image must be smaller than 2MB.');
        return;
      }

      // Convert to base64 data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onImageSelect({
          url: dataUrl,
          thumbnail: dataUrl,
          attribution: '',
          source: 'local',
        });
      };
      reader.onerror = () => {
        toast.error('Failed to read image file.');
      };
      reader.readAsDataURL(file);

      // Reset input so the same file can be selected again
      event.target.value = '';
    },
    [onImageSelect, toast]
  );

  const handleSearchSelect = useCallback(
    (selection: ImageSelection) => {
      setIsSearchModalOpen(false);
      onImageSelect(selection);
    },
    [onImageSelect]
  );

  const handleRemoveImage = useCallback(() => {
    setIsOpen(false);
    onImageSelect(null);
  }, [onImageSelect]);

  return (
    <>
      <div ref={dropdownRef} className={`relative ${className}`}>
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full h-32 rounded-lg border-2 border-dashed
            flex flex-col items-center justify-center gap-2
            transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-(--monarch-accent) hover:bg-(--monarch-accent)/5'}
            ${currentImage ? 'border-transparent' : 'border-(--monarch-border)'}
          `}
          style={{
            backgroundColor: currentImage ? 'transparent' : 'var(--monarch-bg-page)',
          }}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          {currentImage ? (
            <img
              src={currentImage}
              alt="Selected goal image"
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <>
              <Icons.Plus className="h-6 w-6 text-(--monarch-text-muted)" />
              <span className="text-sm text-(--monarch-text-muted)">Add Image</span>
            </>
          )}
        </button>

        {/* Dropdown menu */}
        {isOpen && (
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
              onClick={handleSearchClick}
              className="w-full px-3 py-2.5 flex items-center gap-2 text-left transition-colors hover:bg-(--monarch-bg-page)"
              role="menuitem"
            >
              <Icons.Search className="h-4 w-4 text-(--monarch-text-muted)" />
              <span className="text-sm">Search for an image</span>
            </button>
            <button
              type="button"
              onClick={handleBrowseClick}
              className="w-full px-3 py-2.5 flex items-center gap-2 text-left transition-colors hover:bg-(--monarch-bg-page)"
              role="menuitem"
            >
              <Icons.Upload className="h-4 w-4 text-(--monarch-text-muted)" />
              <span className="text-sm">Browse computer</span>
            </button>
            {currentImage && (
              <>
                <div className="border-t" style={{ borderColor: 'var(--monarch-border)' }} />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left transition-colors hover:bg-(--monarch-bg-page)"
                  style={{ color: 'var(--monarch-error)' }}
                  role="menuitem"
                >
                  <Icons.Trash className="h-4 w-4" />
                  <span className="text-sm">Remove image</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Image search modal */}
      <ImageSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelect={handleSearchSelect}
      />
    </>
  );
}
