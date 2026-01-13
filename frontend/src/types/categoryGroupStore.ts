/**
 * Category Group Store Types
 *
 * Normalized store for category groups and unmapped categories.
 * Used across wizards, settings, and modals.
 */

import type { CategoryGroup, UnmappedCategory } from './category';

/**
 * Normalized category group store
 */
export interface CategoryGroupStore {
  /** Category groups indexed by ID */
  groups: Record<string, CategoryGroup>;
  /** Preserve group ordering from API */
  groupOrder: string[];
  /** Unmapped categories indexed by ID */
  unmappedCategories: Record<string, UnmappedCategory>;
  /** Unmapped category IDs ordered by group, then category order */
  unmappedCategoryOrder: string[];
}
