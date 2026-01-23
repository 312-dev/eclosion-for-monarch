/**
 * useStashImageUpload - Hook for uploading custom images to stash items
 *
 * Handles both desktop mode (saves to local filesystem) and demo mode (base64 in localStorage).
 */

import { useState, useCallback } from 'react';
import { useDemo } from '../context/DemoContext';

/** Maximum image size for demo mode (500KB) */
const DEMO_MAX_SIZE_BYTES = 500 * 1024;

export interface UseStashImageUploadResult {
  /** Whether an upload is in progress */
  isUploading: boolean;
  /** Error message if upload failed */
  error: string | null;
  /**
   * Upload an image file for a stash item.
   * Returns the path/URL to the saved image, or null on failure.
   */
  uploadImage: (itemId: string, file: File) => Promise<string | null>;
  /**
   * Delete a custom image.
   * Returns true if successful.
   */
  deleteImage: (imagePath: string) => Promise<boolean>;
  /**
   * Get a displayable URL for an image path.
   * In desktop mode, converts local path to file:// URL.
   * In demo mode, returns the base64 data URL directly.
   */
  getImageUrl: (imagePath: string) => Promise<string>;
  /** Clear any error state */
  clearError: () => void;
}

/**
 * Read a file as a base64 data URL.
 */
async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Hook for uploading and managing stash item images.
 */
export function useStashImageUpload(): UseStashImageUploadResult {
  const isDemo = useDemo();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = useCallback(
    async (itemId: string, file: File): Promise<string | null> => {
      setIsUploading(true);
      setError(null);

      try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error('Please select an image file');
        }

        // Read file as base64
        const base64Data = await readFileAsDataUrl(file);

        if (isDemo) {
          // Demo mode: check size limit and store in localStorage
          if (file.size > DEMO_MAX_SIZE_BYTES) {
            throw new Error(
              `Image too large. Demo mode supports images up to ${Math.round(DEMO_MAX_SIZE_BYTES / 1024)}KB`
            );
          }

          // In demo mode, we store the base64 data directly
          // The image path is the base64 data URL itself
          return base64Data;
        } else {
          // Desktop mode: save via Electron IPC
          if (!globalThis.electron?.stash) {
            throw new Error('Desktop image storage not available');
          }

          const result = await globalThis.electron.stash.saveImage(itemId, base64Data);

          if (!result.success) {
            throw new Error(result.error ?? 'Failed to save image');
          }

          return result.path ?? null;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload image';
        setError(message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [isDemo]
  );

  const deleteImage = useCallback(
    async (imagePath: string): Promise<boolean> => {
      if (isDemo) {
        // In demo mode, we don't need to do anything special
        // The base64 data URL is stored directly, no file to delete
        return true;
      }

      if (!globalThis.electron?.stash) {
        return false;
      }

      return globalThis.electron.stash.deleteImage(imagePath);
    },
    [isDemo]
  );

  const getImageUrl = useCallback(
    async (imagePath: string): Promise<string> => {
      if (isDemo) {
        // In demo mode, the path IS the base64 data URL
        return imagePath;
      }

      // If the path is already an external URL (e.g., Openverse image), return it directly
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }

      // If it's a data URL (base64), return it directly
      if (imagePath.startsWith('data:')) {
        return imagePath;
      }

      if (!globalThis.electron?.stash) {
        // Fallback: return the path as-is
        return imagePath;
      }

      return globalThis.electron.stash.getImageUrl(imagePath);
    },
    [isDemo]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isUploading,
    error,
    uploadImage,
    deleteImage,
    getImageUrl,
    clearError,
  };
}
