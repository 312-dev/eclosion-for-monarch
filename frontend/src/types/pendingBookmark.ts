/**
 * Pending Bookmark Types
 *
 * Types for bookmarks awaiting review before conversion to wishlist items.
 */

import type { BrowserType } from './bookmarks';

/** Status of a pending bookmark in the review workflow */
export type PendingBookmarkStatus = 'pending' | 'skipped' | 'converted';

/** A bookmark imported from browser sync awaiting user review */
export interface PendingBookmark {
  id: string;
  url: string;
  name: string;
  bookmark_id: string;
  browser_type: BrowserType;
  logo_url: string | null;
  status: PendingBookmarkStatus;
  created_at: string;
}

/** Response from GET /wishlist/pending */
export interface PendingBookmarksResponse {
  bookmarks: PendingBookmark[];
}

/** Response from GET /wishlist/pending/count */
export interface PendingCountResponse {
  count: number;
}

/** Bookmark data for import */
export interface ImportBookmark {
  url: string;
  name: string;
  bookmark_id: string;
  browser_type: BrowserType;
  logo_url?: string;
}

/** Response from POST /wishlist/pending/import */
export interface ImportBookmarksResponse {
  imported: number;
  skipped_existing: number;
}

/** Response from skip/convert operations */
export interface PendingBookmarkActionResponse {
  success: boolean;
  id?: string;
  error?: string;
}
