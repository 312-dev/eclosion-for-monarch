/**
 * Wishlist Module
 *
 * IPC handlers for wishlist-related desktop functionality.
 * Includes image storage for custom item images.
 */

import { ipcMain } from 'electron';
import {
  saveWishlistImage,
  deleteWishlistImage,
  getImageUrl,
  type SaveImageResult,
} from './imageStorage';

// Re-export types
export type { SaveImageResult } from './imageStorage';

/**
 * Setup wishlist-related IPC handlers.
 * Call this from the main process initialization.
 */
export function setupWishlistIpcHandlers(): void {
  // =========================================================================
  // Image Storage
  // =========================================================================

  /**
   * Save a custom image for a wishlist item.
   * Accepts base64-encoded image data and stores it locally.
   */
  ipcMain.handle(
    'wishlist:save-image',
    (_event, itemId: string, base64Data: string): SaveImageResult => {
      return saveWishlistImage(itemId, base64Data);
    }
  );

  /**
   * Delete a custom image for a wishlist item.
   */
  ipcMain.handle('wishlist:delete-image', (_event, imagePath: string): boolean => {
    return deleteWishlistImage(imagePath);
  });

  /**
   * Get the file:// URL for displaying a local image.
   */
  ipcMain.handle('wishlist:get-image-url', (_event, imagePath: string): string => {
    return getImageUrl(imagePath);
  });
}
