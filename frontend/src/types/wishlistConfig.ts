/**
 * Wishlist Configuration Types
 *
 * Types for wishlist feature configuration including browser sync
 * settings and auto-archive preferences.
 */

import type { BrowserType } from './bookmarks';

/**
 * Persisted wishlist configuration from backend.
 */
export interface WishlistConfig {
  /** Whether the wishlist wizard has been completed */
  isConfigured: boolean;
  /** Default category group ID for new wishlist items */
  defaultCategoryGroupId: string | null;
  /** Default category group name for display */
  defaultCategoryGroupName: string | null;
  /** Selected browser for bookmark sync */
  selectedBrowser: BrowserType | null;
  /** Selected bookmark folder IDs to sync */
  selectedFolderIds: string[];
  /** Selected bookmark folder names for display */
  selectedFolderNames: string[];
  /** Auto-archive items when their bookmark is deleted */
  autoArchiveOnBookmarkDelete: boolean;
  /** Auto-archive items at the start of the month after being fully funded */
  autoArchiveOnGoalMet: boolean;
}

/**
 * Wizard state for the wishlist onboarding flow.
 */
export interface WishlistWizardState {
  /** Currently selected browser */
  selectedBrowser: BrowserType | null;
  /** Whether browser permission has been granted (especially for Safari) */
  browserPermissionGranted: boolean;
  /** Selected category group ID */
  selectedGroupId: string;
  /** Selected category group name */
  selectedGroupName: string;
  /** Selected bookmark folder IDs */
  selectedFolderIds: string[];
}

/**
 * Category mapping choice when linking a wishlist item to Monarch.
 */
export type CategoryMappingChoice = 'create_new' | 'link_existing';

/**
 * Request to map a wishlist item to a Monarch category.
 */
export interface CategoryMappingRequest {
  /** Wishlist item ID */
  itemId: string;
  /** Whether to create new or link existing */
  choice: CategoryMappingChoice;
  /** Existing category ID (when choice is 'link_existing') */
  existingCategoryId?: string;
  /** Whether to sync item name to category name */
  syncName?: boolean;
}

/**
 * Result of an image upload operation.
 */
export interface WishlistImageUploadResult {
  /** Whether the upload succeeded */
  success: boolean;
  /** Path to the saved image (on success) */
  imagePath?: string;
  /** Error message (on failure) */
  error?: string;
}
