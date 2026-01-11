/**
 * Category Types
 *
 * Types for Monarch Money categories and category operations.
 */

export interface CategoryGroup {
  id: string;
  name: string;
}

export interface UnmappedCategory {
  id: string;
  name: string;
  group_id: string;
  group_name: string;
  icon?: string;
  group_order: number;
  category_order: number;
  planned_budget: number;
}

export interface LinkCategoryResult {
  success: boolean;
  category_id?: string;
  category_name?: string;
  sync_name?: boolean;
  enabled?: boolean;
  error?: string;
}

export interface DeletableCategory {
  recurring_id: string;
  category_id: string;
  name: string;
  group_name: string | null;
  is_rollup?: boolean;
  planned_budget?: number;
}

export interface DeletableCategoriesResult {
  categories: DeletableCategory[];
  count: number;
}

export interface DeleteCategoriesResult {
  success: boolean;
  deleted: { category_id: string; name: string }[];
  failed: { category_id: string; name: string; error: string }[];
  deleted_count: number;
  failed_count: number;
  total_attempted: number;
  state_reset: boolean;
}

export interface ResetDedicatedResult {
  success: boolean;
  deleted: { category_id: string; name: string }[];
  failed: { category_id: string; name: string; error: string }[];
  deleted_count: number;
  failed_count: number;
  total_attempted: number;
  items_disabled: number;
}

export interface ResetRollupResult {
  success: boolean;
  deleted_category: boolean;
  items_disabled: number;
  error?: string | null;
}
