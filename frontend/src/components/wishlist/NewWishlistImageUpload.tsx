/**
 * NewWishlistImageUpload Component
 *
 * Image upload section for the New Wishlist modal with drag-and-drop support.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Icons } from '../icons';
import { useToast } from '../../context/ToastContext';
import { useDemo } from '../../context/DemoContext';
import * as api from '../../api/core/wishlist';

interface NewWishlistImageUploadProps {
  readonly sourceUrl?: string | undefined;
  readonly selectedImage: File | null;
  readonly imagePreview: string | null;
  readonly onImageSelect: (file: File) => void;
  readonly onImageRemove: () => void;
  readonly onPreviewChange: (preview: string | null) => void;
}

export function NewWishlistImageUpload({
  sourceUrl,
  selectedImage,
  imagePreview,
  onImageSelect,
  onImageRemove,
  onPreviewChange,
}: NewWishlistImageUploadProps) {
  const toast = useToast();
  const isDemo = useDemo();
  const [isDragging, setIsDragging] = useState(false);
  const [isFetchingOgImage, setIsFetchingOgImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const ogFetchIdRef = useRef(0);

  // Auto-fetch og:image when component mounts with a URL (desktop only)
  useEffect(() => {
    if (!sourceUrl || isDemo || selectedImage) return;

    const currentFetchId = ++ogFetchIdRef.current;
    setIsFetchingOgImage(true);

    const fetchImage = async () => {
      try {
        const imageData = await api.fetchOgImage(sourceUrl);
        if (ogFetchIdRef.current === currentFetchId && imageData) {
          onPreviewChange(imageData);
          const response = await fetch(imageData);
          const blob = await response.blob();
          const file = new File([blob], 'og-image.jpg', { type: blob.type });
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
      onImageRemove();
      onPreviewChange(null);
    },
    [onImageRemove, onPreviewChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageSelect(file);
      e.target.value = '';
    },
    [handleImageSelect]
  );

  return (
    <button
      type="button"
      onClick={() => imageInputRef.current?.click()}
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
      aria-label={imagePreview ? 'Change image' : 'Upload image'}
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        tabIndex={-1}
      />

      {imagePreview && (
        <>
          <img
            src={imagePreview}
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

      {!imagePreview && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          {isFetchingOgImage ? (
            <>
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
              <Icons.Upload
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
    </button>
  );
}
