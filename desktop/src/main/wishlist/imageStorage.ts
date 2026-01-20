/**
 * Wishlist Image Storage
 *
 * Handles saving and deleting custom images for wishlist items.
 * Images are stored in the app data directory under 'wishlist-images/'.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { getStateDir } from '../paths';
import { debugLog } from '../logger';

/** Directory name for wishlist images */
const IMAGES_DIR = 'wishlist-images';

/**
 * Get the wishlist images directory path.
 * Creates the directory if it doesn't exist.
 */
export function getImagesDir(): string {
  const dir = path.join(getStateDir(), IMAGES_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    debugLog(`Created wishlist images directory: ${dir}`);
  }
  return dir;
}

/**
 * Result of saving an image.
 */
export interface SaveImageResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Save a wishlist item image from base64 data.
 *
 * @param itemId - The wishlist item ID (used as filename base)
 * @param base64Data - The image data as a base64 string (with or without data URL prefix)
 * @returns Result with the saved file path or error
 */
export function saveWishlistImage(itemId: string, base64Data: string): SaveImageResult {
  try {
    const imagesDir = getImagesDir();

    // Extract the image format and data from base64 string
    let imageBuffer: Buffer;
    let extension = 'png'; // Default extension

    if (base64Data.startsWith('data:')) {
      // Parse data URL format: data:image/png;base64,<data>
      const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
      if (matches) {
        extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        imageBuffer = Buffer.from(matches[2], 'base64');
      } else {
        return { success: false, error: 'Invalid data URL format' };
      }
    } else {
      // Assume raw base64 data
      imageBuffer = Buffer.from(base64Data, 'base64');
    }

    // Sanitize item ID for use as filename
    const safeId = itemId.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${safeId}.${extension}`;
    const filePath = path.join(imagesDir, filename);

    // Delete any existing images for this item (with different extensions)
    deleteExistingImages(safeId);

    // Write the image file
    fs.writeFileSync(filePath, imageBuffer);
    debugLog(`Saved wishlist image: ${filePath}`);

    // Return just the filename (not the full path) for database storage
    // This avoids path sanitization issues and is portable across platforms
    return { success: true, path: filename };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    debugLog(`Failed to save wishlist image: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Delete existing images for an item (handles extension changes).
 */
function deleteExistingImages(safeId: string): void {
  const imagesDir = getImagesDir();
  const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

  for (const ext of extensions) {
    const filePath = path.join(imagesDir, `${safeId}.${ext}`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      debugLog(`Deleted old wishlist image: ${filePath}`);
    }
  }
}

/**
 * Resolve an image path to a full filesystem path.
 * Accepts either a filename (e.g., "item-123.png") or full path.
 */
function resolveImagePath(imagePath: string): string {
  const imagesDir = getImagesDir();

  // If it's just a filename (no directory separators), construct full path
  if (!imagePath.includes('/') && !imagePath.includes('\\')) {
    return path.join(imagesDir, imagePath);
  }

  // Otherwise use as-is (for backward compatibility)
  return path.normalize(imagePath);
}

/**
 * Delete a wishlist item image.
 *
 * @param imagePath - The image filename or full path
 * @returns True if deleted successfully or file didn't exist
 */
export function deleteWishlistImage(imagePath: string): boolean {
  try {
    const imagesDir = getImagesDir();
    const fullPath = resolveImagePath(imagePath);

    // Security check: ensure the resolved path is within the images directory
    if (!fullPath.startsWith(imagesDir)) {
      debugLog(`Security: Attempted to delete file outside images directory: ${imagePath}`);
      return false;
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      debugLog(`Deleted wishlist image: ${fullPath}`);
    }

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    debugLog(`Failed to delete wishlist image: ${message}`);
    return false;
  }
}

/**
 * Get a data URL for an image path.
 * Reads the file and returns a base64 data URL.
 *
 * We use data URLs instead of file:// URLs because:
 * - file:// URLs are blocked by Electron's security policies (CSP, cross-origin)
 * - data URLs are always allowed and work reliably in the renderer
 *
 * @param imagePath - The image filename (e.g., "item-123.png") or full path
 */
export function getImageUrl(imagePath: string): string {
  try {
    const imagesDir = getImagesDir();
    const fullPath = resolveImagePath(imagePath);

    // Security check: ensure the resolved path is within the images directory
    if (!fullPath.startsWith(imagesDir)) {
      debugLog(`Security: Attempted to read file outside images directory: ${imagePath}`);
      return '';
    }

    if (!fs.existsSync(fullPath)) {
      debugLog(`Image file not found: ${fullPath}`);
      return '';
    }

    // Read the file and convert to base64 data URL
    const imageBuffer = fs.readFileSync(fullPath);
    const extension = path.extname(fullPath).slice(1).toLowerCase();
    const mimeType = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;

    return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    debugLog(`Failed to read image for URL: ${message}`);
    return '';
  }
}
