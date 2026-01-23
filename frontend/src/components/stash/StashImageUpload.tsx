/**
 * StashImageUpload - Drag-drop image upload for stash items
 *
 * Supports drag-drop and click-to-select for custom item images.
 * Handles both desktop mode (local storage) and demo mode (base64).
 * Also supports Openverse image search.
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { useStashImageUpload } from '../../hooks/useStashImageUpload';
import { Icons } from '../icons';
import { ImageSearchModal } from './ImageSearchModal';
import { ImagePickerMenu } from './ImagePickerMenu';
import type { ImageSelection } from '../../types';

interface StashImageUploadProps {
  /** The stash item ID */
  readonly itemId: string;
  /** Current image path/URL (if any) */
  readonly currentImagePath?: string | null;
  /** Callback when image is uploaded successfully */
  readonly onImageUploaded: (imagePath: string) => void;
  /** Callback when image is removed */
  readonly onImageRemoved: () => void;
  /** Callback when attribution changes (for Openverse images) */
  readonly onAttributionChange?: (attribution: string | null) => void;
}

export function StashImageUpload({
  itemId,
  currentImagePath,
  onImageUploaded,
  onImageRemoved,
  onAttributionChange,
}: StashImageUploadProps) {
  const { isUploading, error, uploadImage, deleteImage, getImageUrl, clearError } =
    useStashImageUpload();
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load preview URL when currentImagePath changes
  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (currentImagePath) {
        const url = await getImageUrl(currentImagePath);
        if (!cancelled) {
          setPreviewUrl(url);
        }
      } else {
        setPreviewUrl(null);
      }
    }

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [currentImagePath, getImageUrl]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isDropdownOpen]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      clearError();

      // Create immediate preview from the file
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPreviewUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);

      // Upload the file
      const result = await uploadImage(itemId, file);
      if (result) {
        onImageUploaded(result);
      }
    },
    [itemId, uploadImage, onImageUploaded, clearError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('image/')) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  const handleSearchClick = useCallback(() => {
    setIsDropdownOpen(false);
    setIsSearchModalOpen(true);
  }, []);

  const handleBrowseClick = useCallback(() => {
    setIsDropdownOpen(false);
    fileInputRef.current?.click();
  }, []);

  const handleOpenverseSelect = useCallback(
    (selection: ImageSelection) => {
      setIsSearchModalOpen(false);
      // For Openverse images, store the URL directly
      setPreviewUrl(selection.thumbnail);
      onImageUploaded(selection.url);
      onAttributionChange?.(selection.attribution);
    },
    [onImageUploaded, onAttributionChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [handleFileSelect]
  );

  const handleRemove = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (currentImagePath) {
        await deleteImage(currentImagePath);
        onImageRemoved();
      }
    },
    [currentImagePath, deleteImage, onImageRemoved]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  const hasImage = !!previewUrl;

  const getBorderColor = () => {
    if (isDragging) return 'var(--monarch-orange)';
    if (error) return 'var(--monarch-error)';
    return 'var(--monarch-border)';
  };

  return (
    <>
      <div className="space-y-2">
        <div ref={dropdownRef} className="relative">
          {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Drop zone requires div for drag events */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className="relative w-full h-32 rounded-lg border-2 border-dashed transition-all cursor-pointer overflow-hidden"
            style={{
              borderColor: getBorderColor(),
              backgroundColor: isDragging ? 'var(--monarch-orange-bg)' : 'var(--monarch-bg-card)',
            }}
            aria-label={hasImage ? 'Change image' : 'Upload image'}
            aria-haspopup="true"
            aria-expanded={isDropdownOpen}
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
              tabIndex={-1}
            />

            {/* Loading overlay */}
            {isUploading && (
              <div
                className="absolute inset-0 flex items-center justify-center z-10"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              >
                <Icons.Refresh size={24} className="animate-spin" style={{ color: 'white' }} />
              </div>
            )}

            {/* Image preview */}
            {hasImage && (
              <>
                <img
                  src={previewUrl}
                  alt="Item preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Remove button */}
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute top-2 right-2 p-1 rounded-full transition-colors z-10"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                  }}
                  aria-label="Remove image"
                >
                  <Icons.X size={16} />
                </button>
                {/* Change overlay on hover */}
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                >
                  <span className="text-sm font-medium text-white">Click to change</span>
                </div>
              </>
            )}

            {/* Empty state */}
            {!hasImage && !isUploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Icons.Plus
                  size={24}
                  style={{
                    color: isDragging ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)',
                  }}
                />
                <span
                  className="text-sm"
                  style={{
                    color: isDragging ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)',
                  }}
                >
                  {isDragging ? 'Drop image here' : 'Add custom image'}
                </span>
              </div>
            )}
          </div>

          {/* Dropdown menu */}
          {isDropdownOpen && (
            <ImagePickerMenu onSearchClick={handleSearchClick} onBrowseClick={handleBrowseClick} />
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm" style={{ color: 'var(--monarch-error)' }}>
            {error}
          </p>
        )}
      </div>

      {/* Image search modal */}
      <ImageSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelect={handleOpenverseSelect}
      />
    </>
  );
}
