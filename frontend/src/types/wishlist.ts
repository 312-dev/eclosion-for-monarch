/**
 * Wishlist Types
 *
 * Types for wishlist items - one-time purchase goals synced from browser bookmarks.
 */

import type { ItemStatus } from './common';

/**
 * A wishlist item represents a goal to save for a one-time purchase.
 * Items are synced from browser bookmarks and linked to Monarch categories.
 */
export interface WishlistItem {
  type: 'wishlist';
  id: string;
  name: string;
  amount: number; // Target amount to save
  current_balance: number; // Total saved so far
  planned_budget: number; // Budget allocated this month
  category_id: string | null;
  category_name: string;
  category_group_id: string | null;
  category_group_name: string | null;
  is_enabled: boolean;
  status: ItemStatus;
  progress_percent: number; // current_balance / amount * 100
  emoji?: string;

  // Wishlist-specific fields
  target_date: string; // User-specified goal date (ISO format)
  months_remaining: number; // Computed from target_date
  source_url?: string; // Original bookmark URL
  source_bookmark_id?: string; // For tracking sync
  logo_url?: string; // Favicon from URL
  custom_image_path?: string; // User-uploaded image path

  // Computed values (frontend single source of truth)
  monthly_target: number; // What to save this month
  shortfall: number; // amount - current_balance

  // Archive state
  is_archived: boolean;
  archived_at?: string; // ISO timestamp

  // Sort order for drag/drop reordering (legacy)
  sort_order: number;

  // Grid layout for widget-style resizable cards
  grid_x: number; // Column position (0-based)
  grid_y: number; // Row position (0-based)
  col_span: number; // Width in grid units (1-3)
  row_span: number; // Height in grid units (1-2)
}

/**
 * Data needed to create a new wishlist item.
 * Amount and target_date are required, others have defaults.
 *
 * Category selection (mutually exclusive):
 * - category_group_id: Creates a new category in this group
 * - existing_category_id: Links to an existing Monarch category
 */
export interface CreateWishlistItemRequest {
  name: string;
  amount: number;
  target_date: string;
  /** Creates a new category in this group (mutually exclusive with existing_category_id) */
  category_group_id?: string;
  /** Links to an existing category (mutually exclusive with category_group_id) */
  existing_category_id?: string;
  source_url?: string;
  source_bookmark_id?: string;
  emoji?: string;
  custom_image_path?: string;
}

/**
 * Data for updating an existing wishlist item.
 */
export interface UpdateWishlistItemRequest {
  name?: string;
  amount?: number;
  target_date?: string;
  emoji?: string;
  is_enabled?: boolean;
  custom_image_path?: string | null;
  source_url?: string | null;
}

/**
 * Layout update for a single wishlist item.
 * Used for batch layout updates from drag/resize operations.
 */
export interface WishlistLayoutUpdate {
  id: string;
  grid_x: number;
  grid_y: number;
  col_span: number;
  row_span: number;
}

/**
 * Result of a wishlist sync operation.
 */
export interface WishlistSyncResult {
  success: boolean;
  items_updated: number;
  newly_funded: string[]; // IDs of items that became funded
  error?: string;
}

/**
 * Dashboard-style data for the wishlist tab.
 */
export interface WishlistData {
  items: WishlistItem[];
  archived_items: WishlistItem[];
  total_target: number; // Sum of all item amounts
  total_saved: number; // Sum of all current_balance
  total_monthly_target: number; // Sum of all monthly_target
}
