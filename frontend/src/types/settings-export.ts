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

/**
 * Complete export file structure.
 */
export interface EclosionExport {
  eclosion_export: EclosionExportMetadata;
  tools: {
    recurring?: RecurringExport;
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
  tools?: string[];
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
