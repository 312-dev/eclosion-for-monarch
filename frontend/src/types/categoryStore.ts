/**
 * Category Store Types
 *
 * Normalized category data store for shared category metadata across features.
 * All features derive their category data from this shared cache.
 */

/**
 * Single category metadata (normalized)
 */
export interface CategoryMetadata {
  id: string;
  name: string;
  icon: string;
  groupId: string;
  groupName: string;
}

/**
 * Category group (normalized)
 */
export interface CategoryGroupMetadata {
  id: string;
  name: string;
  categoryIds: string[];
}

/**
 * Normalized category store
 */
export interface CategoryStore {
  /** Categories indexed by ID */
  categories: Record<string, CategoryMetadata>;
  /** Groups indexed by ID */
  groups: Record<string, CategoryGroupMetadata>;
  /** Preserve group ordering from API */
  groupOrder: string[];
}

/**
 * Raw category response from API (before normalization)
 */
export interface RawCategoryGroup {
  id: string;
  name: string;
  categories: Array<{
    id: string;
    name: string;
    icon?: string;
  }>;
}
