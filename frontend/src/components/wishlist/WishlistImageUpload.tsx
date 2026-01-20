/**
 * WishlistImageUpload - Drag-drop image upload for wishlist items
 *
 * Supports drag-drop and click-to-select for custom item images.
 * Handles both desktop mode (local storage) and demo mode (base64).
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { useWishlistImageUpload } from '../../hooks/useWishlistImageUpload';
import { Icons } from '../icons';

interface WishlistImageUploadProps {
  /** The wishlist item ID */
  readonly itemId: string;
  /** Current image path/URL (if any) */
  readonly currentImagePath?: string | null;
  /** Callback when image is uploaded successfully */
  readonly onImageUploaded: (imagePath: string) => void;
  /** Callback when image is removed */
  readonly onImageRemoved: () => void;
}

export function WishlistImageUpload({
  itemId,
  currentImagePath,
  onImageUploaded,
  onImageRemoved,
}: WishlistImageUploadProps) {
  const { isUploading, error, uploadImage, deleteImage, getImageUrl, clearError } =
    useWishlistImageUpload();
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    fileInputRef.current?.click();
  }, []);

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

  return (
    <div className="space-y-2">
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
          borderColor: isDragging
            ? 'var(--monarch-orange)'
            : error
              ? 'var(--monarch-error)'
              : 'var(--monarch-border)',
          backgroundColor: isDragging ? 'var(--monarch-orange-bg)' : 'var(--monarch-bg-card)',
        }}
        aria-label={hasImage ? 'Change image' : 'Upload image'}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />

        {/* Loading overlay */}
        {isUploading && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          >
            <Icons.Refresh
              size={24}
              className="animate-spin"
              style={{ color: 'white' }}
            />
          </div>
        )}

        {/* Image preview */}
        {hasImage && (
          <>
            <img
              src={previewUrl}
              alt="Custom item image"
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
            <Icons.Upload
              size={24}
              style={{ color: isDragging ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)' }}
            />
            <span
              className="text-sm"
              style={{ color: isDragging ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)' }}
            >
              {isDragging ? 'Drop image here' : 'Add custom image'}
            </span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm" style={{ color: 'var(--monarch-error)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
