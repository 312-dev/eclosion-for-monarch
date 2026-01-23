/**
 * NewStashImageUpload Component
 *
 * Image upload section for the New Stash modal with drag-and-drop support
 * and Openverse image search integration.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Icons } from '../icons';
import { useToast } from '../../context/ToastContext';
import { useDemo } from '../../context/DemoContext';
import * as api from '../../api/core/stash';
import { ImageSearchModal } from './ImageSearchModal';
import { ImagePickerMenu } from './ImagePickerMenu';
import type { ImageSelection } from '../../types';

/**
 * Convert a base64 data URL to a File object without using fetch.
 * This avoids CSP connect-src restrictions on data URLs.
 */
function dataUrlToFile(dataUrl: string, filename: string): File {
  const commaIndex = dataUrl.indexOf(',');
  const header = dataUrl.slice(0, commaIndex);
  const base64Data = dataUrl.slice(commaIndex + 1);
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch?.[1] ?? 'image/jpeg';
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.codePointAt(i) ?? 0;
  }
  return new File([bytes], filename, { type: mimeType });
}

interface NewStashImageUploadProps {
  readonly sourceUrl?: string | undefined;
  readonly selectedImage: File | null;
  readonly imagePreview: string | null;
  readonly onImageSelect: (file: File) => void;
  readonly onImageRemove: () => void;
  readonly onPreviewChange: (preview: string | null) => void;
  /** Called when an Openverse image is selected (URL-based, no File) */
  readonly onOpenverseSelect?: ((selection: ImageSelection) => void) | undefined;
  /** Currently selected Openverse image URL */
  readonly openverseImageUrl?: string | null | undefined;
}

export function NewStashImageUpload({
  sourceUrl,
  selectedImage,
  imagePreview,
  onImageSelect,
  onImageRemove,
  onPreviewChange,
  onOpenverseSelect,
  openverseImageUrl,
}: NewStashImageUploadProps) {
  const toast = useToast();
  const isDemo = useDemo();
  const [isDragging, setIsDragging] = useState(false);
  const [isFetchingOgImage, setIsFetchingOgImage] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const ogFetchIdRef = useRef(0);
  // Track if user explicitly dismissed the auto-fetched image
  const userDismissedImageRef = useRef(false);

  // Reset dismissed state when sourceUrl changes (new URL should trigger fresh fetch)
  useEffect(() => {
    userDismissedImageRef.current = false;
  }, [sourceUrl]);

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

  // Auto-fetch og:image when component mounts with a URL (desktop only)
  useEffect(() => {
    // Don't fetch if user explicitly dismissed the image
    if (!sourceUrl || isDemo || selectedImage || userDismissedImageRef.current) return;

    const currentFetchId = ++ogFetchIdRef.current;
    setIsFetchingOgImage(true);

    const fetchImage = async () => {
      try {
        const imageData = await api.fetchOgImage(sourceUrl);
        if (ogFetchIdRef.current === currentFetchId && imageData) {
          onPreviewChange(imageData);
          const file = dataUrlToFile(imageData, 'og-image.jpg');
          onImageSelect(file);
        }
      } catch {
        // Fail silently
      } finally {
        if (ogFetchIdRef.current === currentFetchId) {
          setIsFetchingOgImage(false);
        }
      }
    };

    fetchImage();
    // Store ref value for cleanup - ESLint requires this pattern
    const refValue = ogFetchIdRef.current;
    return () => {
      ogFetchIdRef.current = refValue + 1;
    };
  }, [sourceUrl, isDemo, selectedImage, onImageSelect, onPreviewChange]);

  const handleImageSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      ogFetchIdRef.current++;
      setIsFetchingOgImage(false);
      onImageSelect(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          onPreviewChange(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    },
    [toast, onImageSelect, onPreviewChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleImageSelect(file);
    },
    [handleImageSelect]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      ogFetchIdRef.current++;
      setIsFetchingOgImage(false);
      // Mark as user-dismissed to prevent re-fetching
      userDismissedImageRef.current = true;
      onImageRemove();
      onPreviewChange(null);
      // Also clear Openverse selection if any
      onOpenverseSelect?.({ url: '', thumbnail: '', attribution: '', source: 'local' });
    },
    [onImageRemove, onPreviewChange, onOpenverseSelect]
  );

  const handleSearchClick = useCallback(() => {
    setIsDropdownOpen(false);
    setIsSearchModalOpen(true);
  }, []);

  const handleBrowseClick = useCallback(() => {
    setIsDropdownOpen(false);
    imageInputRef.current?.click();
  }, []);

  const handleOpenverseImageSelect = useCallback(
    (selection: ImageSelection) => {
      setIsSearchModalOpen(false);
      ogFetchIdRef.current++;
      setIsFetchingOgImage(false);
      // Clear any local file selection
      onImageRemove();
      // Set the Openverse image
      onPreviewChange(selection.thumbnail);
      onOpenverseSelect?.(selection);
    },
    [onImageRemove, onPreviewChange, onOpenverseSelect]
  );

  const handleAreaClick = useCallback(() => {
    // If there's already an image, show dropdown to change it
    // If no image, also show dropdown for options
    setIsDropdownOpen((prev) => !prev);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageSelect(file);
      e.target.value = '';
    },
    [handleImageSelect]
  );

  // Determine if we have any image (local file preview or Openverse URL)
  const hasImage = imagePreview || openverseImageUrl;
  const displayImageUrl = imagePreview || openverseImageUrl;

  return (
    <>
      <div ref={dropdownRef} className="relative">
        {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Drop zone requires div for drag events */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleAreaClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleAreaClick();
            }
          }}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          className="relative w-full h-32 rounded-lg border-2 border-dashed transition-all cursor-pointer overflow-hidden"
          style={{
            borderColor: isDragging ? 'var(--monarch-orange)' : 'var(--monarch-border)',
            backgroundColor: isDragging ? 'var(--monarch-orange-bg)' : 'var(--monarch-bg-card)',
          }}
          aria-label={hasImage ? 'Change image' : 'Upload image'}
          aria-haspopup="true"
          aria-expanded={isDropdownOpen}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
            tabIndex={-1}
          />

          {hasImage && displayImageUrl && (
            <>
              <img
                src={displayImageUrl}
                alt="Item preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 right-2 p-1 rounded-full transition-colors z-10"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', color: 'white' }}
                aria-label="Remove image"
              >
                <Icons.X size={16} />
              </button>
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
              >
                <span className="text-sm font-medium text-white">Click to change</span>
              </div>
            </>
          )}

          {!hasImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              {isFetchingOgImage ? (
                <>
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="absolute top-2 right-2 p-1 rounded-full transition-colors z-10"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', color: 'white' }}
                    aria-label="Cancel image fetch"
                  >
                    <Icons.X size={16} />
                  </button>
                  <Icons.Refresh
                    size={24}
                    className="animate-spin"
                    style={{ color: 'var(--monarch-teal)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--monarch-teal)' }}>
                    Fetching image...
                  </span>
                </>
              ) : (
                <>
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
                    {isDragging ? 'Drop image here' : 'Add cover image (optional)'}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Dropdown menu */}
        {isDropdownOpen && (
          <ImagePickerMenu onSearchClick={handleSearchClick} onBrowseClick={handleBrowseClick} />
        )}
      </div>

      {/* Image search modal */}
      <ImageSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelect={handleOpenverseImageSelect}
      />
    </>
  );
}
