/**
 * Settings Export/Import Types
 *
 * Type definitions for the backup/restore functionality.
 */

// ============================================================================
// Export Format Types
// ============================================================================

/**
 * Metadata about the export file.
 */
export interface EclosionExportMetadata {
  version: string;
  exported_at: string;
  source_mode: 'production' | 'demo';
}

/**
 * Recurring tool configuration settings.
 */
export interface RecurringExportConfig {
  target_group_id: string | null;
  target_group_name: string | null;
  auto_sync_new: boolean;
  auto_track_threshold: number | null;
  auto_update_targets: boolean;
}

/**
 * Category mapping for a recurring item.
 */
export interface RecurringExportCategory {
  monarch_category_id: string;
  name: string;
  emoji: string;
  sync_name: boolean;
  is_linked: boolean;
}

/**
 * Rollup configuration.
 */
export interface RecurringExportRollup {
  enabled: boolean;
  monarch_category_id: string | null;
  category_name: string;
  emoji: string;
  item_ids: string[];
  total_budgeted: number;
  is_linked: boolean;
}

/**
 * Complete recurring tool export data.
 */
export interface RecurringExport {
  config: RecurringExportConfig;
  enabled_items: string[];
  categories: Record<string, RecurringExportCategory>;
  rollup: RecurringExportRollup;
}

/**
 * App-level settings (frontend preferences).
 */
export interface AppSettingsExport {
  theme?: 'light' | 'dark' | 'system';
  landing_page?: string;
}

// ============================================================================
// Notes Export Types
// ============================================================================

/**
 * Category or group note in export format.
 * Note: content is decrypted for export.
 */
export interface NotesExportCategoryNote {
  id: string;
  category_type: 'group' | 'category';
  category_id: string;
  category_name: string;
  group_id: string | null;
  group_name: string | null;
  month_key: string;
  content: string;
  created_at: string;
  updated_at: string;
}

/**
 * General (monthly) note in export format.
 */
export interface NotesExportGeneralNote {
  id: string;
  month_key: string;
  content: string;
  created_at: string;
  updated_at: string;
}

/**
 * Archived note in export format.
 */
export interface NotesExportArchivedNote extends NotesExportCategoryNote {
  archived_at: string;
  original_category_name: string;
  original_group_name: string | null;
}

/**
 * Complete notes tool export data.
 *
 * SECURITY: Notes content is decrypted in the export JSON.
 * This should only be included in encrypted exports (auto-backups).
 */
export interface NotesExport {
  config: Record<string, unknown>;
  category_notes: NotesExportCategoryNote[];
  general_notes: NotesExportGeneralNote[];
  archived_notes: NotesExportArchivedNote[];
  /** Checkbox states keyed by "{noteId}:{viewingMonth}" or "general:{sourceMonth}:{viewingMonth}" */
  checkbox_states: Record<string, boolean[]>;
}

// ============================================================================
// Stash Export Types
// ============================================================================

/**
 * Stash configuration in export format.
 */
export interface StashExportConfig {
  is_configured: boolean;
  default_category_group_id: string | null;
  default_category_group_name: string | null;
  selected_browser: string | null;
  selected_folder_ids: string[];
  selected_folder_names: string[];
  auto_archive_on_bookmark_delete: boolean;
  auto_archive_on_goal_met: boolean;
  include_expected_income?: boolean;
  show_monarch_goals?: boolean;
}

/**
 * Stash item in export format.
 * Note: custom_image_path is excluded (not portable).
 */
export interface StashExportItem {
  id: string;
  name: string;
  amount: number;
  target_date: string;
  emoji: string;
  monarch_category_id: string | null;
  category_group_id: string | null;
  category_group_name: string | null;
  source_url: string | null;
  source_bookmark_id: string | null;
  logo_url: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string | null;
  grid_x: number;
  grid_y: number;
  col_span: number;
  row_span: number;
}

/**
 * Pending bookmark in export format.
 */
export interface StashExportBookmark {
  url: string;
  name: string;
  bookmark_id: string;
  browser_type: string;
  logo_url: string | null;
  status: 'pending' | 'skipped' | 'converted';
  stash_item_id: string | null;
  created_at: string | null;
}

/**
 * Stash hypothesis in export format.
 * Contains saved what-if scenarios for the Distribute Wizard.
 */
export interface StashExportHypothesis {
  id: string;
  name: string;
  savings_allocations: Record<string, number>;
  savings_total: number;
  monthly_allocations: Record<string, number>;
  monthly_total: number;
  events: Record<string, unknown[]>;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Complete stash tool export data.
 */
export interface StashExport {
  config: StashExportConfig;
  items: StashExportItem[];
  pending_bookmarks: StashExportBookmark[];
  hypotheses?: StashExportHypothesis[];
}

// ============================================================================
// Complete Export Structure
// ============================================================================

/**
 * Complete export file structure.
 *
 * Version history:
 * - 1.0: Initial version (recurring tool only)
 * - 1.1: Added notes and stash tools
 */
export interface EclosionExport {
  eclosion_export: EclosionExportMetadata;
  tools: {
    recurring?: RecurringExport;
    /** Notes tool data. Only included in encrypted exports for security. */
    notes?: NotesExport;
    /** Stash tool data. */
    stash?: StashExport;
  };
  app_settings: AppSettingsExport;
}

// ============================================================================
// Import Types
// ============================================================================

/**
 * Options for selective import.
 */
export interface ImportOptions {
  /** Specific tools to import. If not provided, all tools are imported. */
  tools?: ('recurring' | 'notes' | 'stash')[];
  /** Passphrase for notes re-encryption. Required if importing notes. */
  passphrase?: string;
}

/**
 * Result of an import operation.
 */
export interface ImportResult {
  success: boolean;
  imported: Record<string, boolean>;
  warnings: string[];
  error?: string | null;
}

/**
 * Preview of what an export file contains.
 * NOTE: Does not include sensitive content (note text, etc.)
 */
export interface ImportPreview {
  version: string;
  exported_at: string;
  source_mode: 'production' | 'demo';
  tools: {
    recurring?: {
      has_config: boolean;
      enabled_items_count: number;
      categories_count: number;
      has_rollup: boolean;
      rollup_items_count: number;
    };
    notes?: {
      category_notes_count: number;
      general_notes_count: number;
      archived_notes_count: number;
      has_checkbox_states: boolean;
    };
    stash?: {
      has_config: boolean;
      items_count: number;
      archived_items_count: number;
      pending_bookmarks_count: number;
      hypotheses_count: number;
    };
  };
}

/**
 * Response from the preview endpoint.
 */
export interface ImportPreviewResponse {
  success: boolean;
  valid: boolean;
  preview?: ImportPreview;
  errors?: string[];
}
