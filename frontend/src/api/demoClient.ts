/**
 * Demo API Client
 *
 * LocalStorage-based implementation of the API client.
 * Used when the app is in demo mode (/demo/*).
 */

import type {
  DashboardData,
  CategoryGroup,
  SyncResult,
  AllocateResult,
  RollupData,
  UnmappedCategory,
  LinkCategoryResult,
  SecurityStatus,
  VersionInfo,
  VersionCheckResult,
  ChangelogStatusResult,
  MarkChangelogReadResult,
  AutoSyncStatus,
  EclosionExport,
  ImportOptions,
  ImportResult,
  ImportPreviewResponse,
} from '../types';
import { createInitialDemoState, type DemoState } from './demoData';

// ============================================================================
// Version (injected at build time from package.json)
// ============================================================================

declare const __APP_VERSION__: string;
const DEMO_VERSION = __APP_VERSION__ ?? '0.0.0';

// ============================================================================
// Storage Key
// ============================================================================

const DEMO_STORAGE_KEY = 'eclosion-demo-data';

// ============================================================================
// State Management
// ============================================================================

function getDemoState(): DemoState {
  const stored = localStorage.getItem(DEMO_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid data, reset
    }
  }
  // Initialize with fresh data
  const initial = createInitialDemoState();
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function setDemoState(state: DemoState): void {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
}

function updateDemoState(updater: (state: DemoState) => DemoState): void {
  const state = getDemoState();
  const updated = updater(state);
  setDemoState(updated);
}

// Helper to simulate network delay
async function simulateDelay(ms: number = 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Dashboard Functions
// ============================================================================

export async function getDashboard(): Promise<DashboardData> {
  await simulateDelay(100);
  const state = getDemoState();
  return state.dashboard;
}

export async function triggerSync(): Promise<SyncResult> {
  await simulateDelay(800); // Simulate sync time
  const state = getDemoState();

  // Update last_sync time
  updateDemoState((s) => ({
    ...s,
    dashboard: {
      ...s.dashboard,
      last_sync: new Date().toISOString(),
    },
  }));

  return {
    success: true,
    categories_created: 0,
    categories_updated: state.dashboard.items.length,
    categories_deactivated: 0,
    errors: [],
  };
}

// ============================================================================
// Category Functions
// ============================================================================

export async function getCategoryGroups(): Promise<CategoryGroup[]> {
  await simulateDelay(50);
  const state = getDemoState();
  return state.categoryGroups;
}

export async function setConfig(
  groupId: string,
  groupName: string
): Promise<void> {
  await simulateDelay(100);
  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      config: {
        ...state.dashboard.config,
        target_group_id: groupId,
        target_group_name: groupName,
        is_configured: true,
      },
    },
  }));
}

export async function getUnmappedCategories(): Promise<UnmappedCategory[]> {
  await simulateDelay(50);
  const state = getDemoState();
  return state.unmappedCategories;
}

// ============================================================================
// Item Functions
// ============================================================================

export async function toggleItemTracking(
  recurringId: string,
  enabled: boolean,
  _options?: { initialBudget?: number; itemData?: Record<string, unknown> }
): Promise<{ success: boolean; enabled: boolean }> {
  await simulateDelay(150);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      items: state.dashboard.items.map((item) =>
        item.id === recurringId
          ? { ...item, is_enabled: enabled, status: enabled ? 'on_track' : 'inactive' }
          : item
      ),
    },
  }));

  return { success: true, enabled };
}

export async function allocateFunds(
  recurringId: string,
  amount: number
): Promise<AllocateResult> {
  await simulateDelay(200);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      items: state.dashboard.items.map((item) => {
        if (item.id !== recurringId) return item;

        const newBalance = item.current_balance + amount;
        const newProgress = Math.min(100, Math.round((newBalance / item.amount) * 100));
        const newStatus = newBalance >= item.amount ? 'funded' :
                         newProgress >= 80 ? 'on_track' : 'behind';

        return {
          ...item,
          current_balance: newBalance,
          progress_percent: newProgress,
          status: newStatus,
          contributed_this_month: item.contributed_this_month + amount,
        };
      }),
      ready_to_assign: {
        ...state.dashboard.ready_to_assign,
        ready_to_assign: state.dashboard.ready_to_assign.ready_to_assign - amount,
      },
    },
  }));

  const state = getDemoState();
  const item = state.dashboard.items.find((i) => i.id === recurringId);

  return {
    success: true,
    previous_budget: (item?.current_balance ?? 0) - amount,
    allocated: amount,
    new_budget: item?.current_balance ?? 0,
  };
}

export async function recreateCategory(
  recurringId: string
): Promise<{ success: boolean; category_id?: string; error?: string }> {
  await simulateDelay(200);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      items: state.dashboard.items.map((item) =>
        item.id === recurringId ? { ...item, category_missing: false } : item
      ),
    },
  }));

  return { success: true, category_id: `cat-${recurringId}` };
}

export async function refreshItem(
  _recurringId: string
): Promise<{ success: boolean }> {
  await simulateDelay(150);
  return { success: true };
}

export async function changeCategoryGroup(
  recurringId: string,
  _groupId: string,
  groupName: string
): Promise<{ success: boolean; error?: string }> {
  await simulateDelay(150);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      items: state.dashboard.items.map((item) =>
        item.id === recurringId
          ? { ...item, category_group_name: groupName }
          : item
      ),
    },
  }));

  return { success: true };
}

// ============================================================================
// Rollup Functions
// ============================================================================

export async function getRollupData(): Promise<RollupData> {
  await simulateDelay(50);
  const state = getDemoState();
  return state.dashboard.rollup;
}

export async function addToRollup(
  recurringId: string
): Promise<{ success: boolean; item_id?: string; monthly_rate?: number; total_budgeted?: number; error?: string }> {
  await simulateDelay(150);

  updateDemoState((state) => {
    const item = state.dashboard.items.find((i) => i.id === recurringId);
    if (!item) return state;

    const updatedItems = state.dashboard.items.map((i) =>
      i.id === recurringId ? { ...i, is_in_rollup: true } : i
    );

    const rollupItems = updatedItems.filter((i) => i.is_in_rollup);
    const totalRate = rollupItems.reduce((sum, i) => sum + i.ideal_monthly_rate, 0);
    const totalSaved = rollupItems.reduce((sum, i) => sum + i.current_balance, 0);
    const totalTarget = rollupItems.reduce((sum, i) => sum + i.amount, 0);

    return {
      ...state,
      dashboard: {
        ...state.dashboard,
        items: updatedItems,
        rollup: {
          ...state.dashboard.rollup,
          items: rollupItems.map((i) => ({
            id: i.id,
            name: i.name,
            merchant_id: i.merchant_id,
            logo_url: i.logo_url,
            amount: i.amount,
            frequency: i.frequency,
            frequency_months: i.frequency_months,
            next_due_date: i.next_due_date,
            months_until_due: i.months_until_due,
            current_balance: i.current_balance,
            ideal_monthly_rate: i.ideal_monthly_rate,
            frozen_monthly_target: i.frozen_monthly_target,
            contributed_this_month: i.contributed_this_month,
            monthly_progress_percent: i.monthly_progress_percent,
            progress_percent: i.progress_percent,
            status: i.status,
            amount_needed_now: i.amount_needed_now,
          })),
          total_ideal_rate: totalRate,
          total_saved: totalSaved,
          total_target: totalTarget,
          current_balance: totalSaved,
        },
      },
    };
  });

  const state = getDemoState();
  const item = state.dashboard.items.find((i) => i.id === recurringId);

  return {
    success: true,
    item_id: recurringId,
    monthly_rate: item?.ideal_monthly_rate ?? 0,
    total_budgeted: state.dashboard.rollup.budgeted,
  };
}

export async function removeFromRollup(
  recurringId: string
): Promise<{ success: boolean; item_id?: string; monthly_rate?: number; total_budgeted?: number; error?: string }> {
  await simulateDelay(150);

  updateDemoState((state) => {
    const item = state.dashboard.items.find((i) => i.id === recurringId);
    if (!item) return state;

    const updatedItems = state.dashboard.items.map((i) =>
      i.id === recurringId ? { ...i, is_in_rollup: false } : i
    );

    const rollupItems = updatedItems.filter((i) => i.is_in_rollup);
    const totalRate = rollupItems.reduce((sum, i) => sum + i.ideal_monthly_rate, 0);
    const totalSaved = rollupItems.reduce((sum, i) => sum + i.current_balance, 0);
    const totalTarget = rollupItems.reduce((sum, i) => sum + i.amount, 0);

    return {
      ...state,
      dashboard: {
        ...state.dashboard,
        items: updatedItems,
        rollup: {
          ...state.dashboard.rollup,
          items: rollupItems.map((i) => ({
            id: i.id,
            name: i.name,
            merchant_id: i.merchant_id,
            logo_url: i.logo_url,
            amount: i.amount,
            frequency: i.frequency,
            frequency_months: i.frequency_months,
            next_due_date: i.next_due_date,
            months_until_due: i.months_until_due,
            current_balance: i.current_balance,
            ideal_monthly_rate: i.ideal_monthly_rate,
            frozen_monthly_target: i.frozen_monthly_target,
            contributed_this_month: i.contributed_this_month,
            monthly_progress_percent: i.monthly_progress_percent,
            progress_percent: i.progress_percent,
            status: i.status,
            amount_needed_now: i.amount_needed_now,
          })),
          total_ideal_rate: totalRate,
          total_saved: totalSaved,
          total_target: totalTarget,
          current_balance: totalSaved,
        },
      },
    };
  });

  const state = getDemoState();
  const item = state.dashboard.items.find((i) => i.id === recurringId);

  return {
    success: true,
    item_id: recurringId,
    monthly_rate: item?.ideal_monthly_rate ?? 0,
    total_budgeted: state.dashboard.rollup.budgeted,
  };
}

export async function setRollupBudget(
  amount: number
): Promise<{ success: boolean; total_budgeted?: number; error?: string }> {
  await simulateDelay(100);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      rollup: {
        ...state.dashboard.rollup,
        budgeted: amount,
      },
    },
  }));

  return { success: true, total_budgeted: amount };
}

export async function updateRollupEmoji(
  emoji: string
): Promise<{ success: boolean; emoji?: string; new_name?: string; error?: string }> {
  await simulateDelay(100);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      rollup: {
        ...state.dashboard.rollup,
        emoji,
      },
    },
  }));

  return { success: true, emoji };
}

export async function updateRollupCategoryName(
  name: string
): Promise<{ success: boolean; category_name?: string; error?: string }> {
  await simulateDelay(100);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      rollup: {
        ...state.dashboard.rollup,
        category_name: name,
      },
    },
  }));

  return { success: true, category_name: name };
}

// ============================================================================
// Category Emoji/Name Functions
// ============================================================================

export async function updateCategoryEmoji(
  recurringId: string,
  emoji: string
): Promise<{ success: boolean; emoji?: string; new_name?: string; error?: string }> {
  await simulateDelay(100);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      items: state.dashboard.items.map((item) =>
        item.id === recurringId ? { ...item, emoji } : item
      ),
    },
  }));

  return { success: true, emoji };
}

export async function updateCategoryName(
  recurringId: string,
  name: string
): Promise<{ success: boolean; category_name?: string; error?: string }> {
  await simulateDelay(100);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      items: state.dashboard.items.map((item) =>
        item.id === recurringId ? { ...item, category_name: name } : item
      ),
    },
  }));

  return { success: true, category_name: name };
}

// ============================================================================
// Linking Functions
// ============================================================================

export async function linkToCategory(
  recurringId: string,
  categoryId: string,
  syncName: boolean
): Promise<LinkCategoryResult> {
  await simulateDelay(150);

  const state = getDemoState();
  const category = state.unmappedCategories.find((c) => c.id === categoryId);

  updateDemoState((s) => ({
    ...s,
    dashboard: {
      ...s.dashboard,
      items: s.dashboard.items.map((item) =>
        item.id === recurringId
          ? {
              ...item,
              category_id: categoryId,
              category_name: syncName && category ? category.name : item.category_name,
            }
          : item
      ),
    },
    unmappedCategories: s.unmappedCategories.filter((c) => c.id !== categoryId),
  }));

  return {
    success: true,
    category_id: categoryId,
    category_name: category?.name ?? 'Linked Category',
    sync_name: syncName,
    enabled: true,
  };
}

export async function linkRollupToCategory(
  categoryId: string,
  syncName: boolean = true
): Promise<{
  success: boolean;
  category_id?: string;
  category_name?: string;
  planned_budget?: number;
  is_linked?: boolean;
  error?: string;
}> {
  await simulateDelay(150);

  const state = getDemoState();
  const category = state.unmappedCategories.find((c) => c.id === categoryId);

  updateDemoState((s) => ({
    ...s,
    dashboard: {
      ...s.dashboard,
      rollup: {
        ...s.dashboard.rollup,
        category_id: categoryId,
        ...(syncName && category ? { category_name: category.name } : {}),
      },
    },
    unmappedCategories: s.unmappedCategories.filter((c) => c.id !== categoryId),
  }));

  return {
    success: true,
    category_id: categoryId,
    category_name: category?.name ?? 'Small Subscriptions',
    planned_budget: state.dashboard.rollup.budgeted,
    is_linked: true,
  };
}

export async function createRollupCategory(
  budget: number = 0
): Promise<{
  success: boolean;
  category_id?: string;
  category_name?: string;
  budget?: number;
  error?: string;
}> {
  await simulateDelay(200);

  const newCategoryId = `cat-rollup-${Date.now()}`;

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      rollup: {
        ...state.dashboard.rollup,
        category_id: newCategoryId,
        budgeted: budget,
      },
    },
  }));

  return {
    success: true,
    category_id: newCategoryId,
    category_name: 'Small Subscriptions',
    budget,
  };
}

// ============================================================================
// Settings Functions
// ============================================================================

export async function getSettings(): Promise<{ auto_sync_new: boolean }> {
  await simulateDelay(50);
  const state = getDemoState();
  return { auto_sync_new: state.settings.auto_sync_new };
}

export async function updateSettings(settings: {
  auto_sync_new?: boolean;
  auto_track_threshold?: number | null;
  auto_update_targets?: boolean;
}): Promise<void> {
  await simulateDelay(100);

  updateDemoState((state) => ({
    ...state,
    settings: { ...state.settings, ...settings },
    dashboard: {
      ...state.dashboard,
      config: {
        ...state.dashboard.config,
        ...(settings.auto_sync_new !== undefined && {
          auto_sync_new: settings.auto_sync_new,
        }),
        ...(settings.auto_track_threshold !== undefined && {
          auto_track_threshold: settings.auto_track_threshold,
        }),
        ...(settings.auto_update_targets !== undefined && {
          auto_update_targets: settings.auto_update_targets,
        }),
      },
    },
  }));
}

// ============================================================================
// Settings Export/Import Functions
// ============================================================================

export async function exportSettings(): Promise<EclosionExport> {
  await simulateDelay(100);
  const state = getDemoState();

  // Build export from demo state
  const enabledItems = state.dashboard.items
    .filter((item) => item.is_enabled)
    .map((item) => item.id);

  const categories: Record<string, {
    monarch_category_id: string;
    name: string;
    emoji: string;
    sync_name: boolean;
    is_linked: boolean;
  }> = {};

  // Build category mappings from enabled items not in rollup
  state.dashboard.items
    .filter((item) => item.is_enabled && !item.is_in_rollup && item.category_id)
    .forEach((item) => {
      categories[item.id] = {
        monarch_category_id: item.category_id!,
        name: item.category_name,
        emoji: item.emoji || '🔄',
        sync_name: true,
        is_linked: false,
      };
    });

  return {
    eclosion_export: {
      version: '1.0',
      exported_at: new Date().toISOString(),
      source_mode: 'demo',
    },
    tools: {
      recurring: {
        config: {
          target_group_id: state.dashboard.config.target_group_id,
          target_group_name: state.dashboard.config.target_group_name,
          auto_sync_new: state.settings.auto_sync_new,
          auto_track_threshold: state.settings.auto_track_threshold,
          auto_update_targets: state.settings.auto_update_targets,
        },
        enabled_items: enabledItems,
        categories,
        rollup: {
          enabled: state.dashboard.rollup.enabled,
          monarch_category_id: state.dashboard.rollup.category_id,
          category_name: state.dashboard.rollup.category_name || 'Small Subscriptions',
          emoji: state.dashboard.rollup.emoji || '📦',
          item_ids: state.dashboard.rollup.items.map((i) => i.id),
          total_budgeted: state.dashboard.rollup.budgeted,
          is_linked: false,
        },
      },
    },
    app_settings: {},
  };
}

export async function importSettings(
  data: EclosionExport,
  options?: ImportOptions
): Promise<ImportResult> {
  await simulateDelay(200);

  // Validate version
  if (data.eclosion_export.version !== '1.0') {
    return {
      success: false,
      imported: {},
      warnings: [],
      error: `Unsupported export version: ${data.eclosion_export.version}`,
    };
  }

  const imported: Record<string, boolean> = {};
  const warnings: string[] = [];
  const toolsToImport = options?.tools ?? ['recurring'];

  // Import recurring tool if requested
  if (toolsToImport.includes('recurring') && data.tools.recurring) {
    const recurring = data.tools.recurring;

    updateDemoState((state) => {
      // Apply config
      const newConfig = {
        ...state.dashboard.config,
        target_group_id: recurring.config.target_group_id,
        target_group_name: recurring.config.target_group_name,
        is_configured: !!recurring.config.target_group_id,
        auto_sync_new: recurring.config.auto_sync_new,
        auto_track_threshold: recurring.config.auto_track_threshold,
        auto_update_targets: recurring.config.auto_update_targets,
      };

      // Update settings
      const newSettings = {
        auto_sync_new: recurring.config.auto_sync_new,
        auto_track_threshold: recurring.config.auto_track_threshold,
        auto_update_targets: recurring.config.auto_update_targets,
      };

      // Update items based on enabled_items list
      const newItems = state.dashboard.items.map((item) => ({
        ...item,
        is_enabled: recurring.enabled_items.includes(item.id),
        is_in_rollup: recurring.rollup.item_ids.includes(item.id),
      }));

      return {
        ...state,
        settings: newSettings,
        dashboard: {
          ...state.dashboard,
          config: newConfig,
          items: newItems,
          rollup: {
            ...state.dashboard.rollup,
            enabled: recurring.rollup.enabled,
            category_name: recurring.rollup.category_name,
            emoji: recurring.rollup.emoji,
            budgeted: recurring.rollup.total_budgeted,
          },
        },
      };
    });

    imported.recurring = true;
  }

  return {
    success: true,
    imported,
    warnings,
  };
}

export async function previewImport(
  data: EclosionExport
): Promise<ImportPreviewResponse> {
  await simulateDelay(100);

  // Validate version
  if (data.eclosion_export?.version !== '1.0') {
    return {
      success: false,
      valid: false,
      errors: ['Unsupported or invalid export format'],
    };
  }

  const preview = {
    version: data.eclosion_export.version,
    exported_at: data.eclosion_export.exported_at,
    source_mode: data.eclosion_export.source_mode,
    tools: {} as Record<string, {
      has_config: boolean;
      enabled_items_count: number;
      categories_count: number;
      has_rollup: boolean;
      rollup_items_count: number;
    }>,
  };

  if (data.tools.recurring) {
    preview.tools.recurring = {
      has_config: !!data.tools.recurring.config,
      enabled_items_count: data.tools.recurring.enabled_items.length,
      categories_count: Object.keys(data.tools.recurring.categories).length,
      has_rollup: data.tools.recurring.rollup.enabled,
      rollup_items_count: data.tools.recurring.rollup.item_ids.length,
    };
  }

  return {
    success: true,
    valid: true,
    preview,
  };
}

// ============================================================================
// Notice Functions
// ============================================================================

export async function dismissNotice(
  noticeId: string
): Promise<{ success: boolean }> {
  await simulateDelay(50);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      notices: state.dashboard.notices.filter((n) => n.id !== noticeId),
    },
  }));

  return { success: true };
}

// ============================================================================
// Security/Version Functions (Demo stubs)
// ============================================================================

export async function getSecurityStatus(): Promise<SecurityStatus> {
  await simulateDelay(50);
  return {
    encryption_enabled: true,
    encryption_algorithm: 'AES-256-GCM',
    key_derivation: 'PBKDF2',
    file_permissions: '600',
    passphrase_requirements: {
      min_length: 8,
      requires_uppercase: true,
      requires_lowercase: true,
      requires_number: true,
      requires_special: false,
    },
  };
}

export async function getVersion(): Promise<VersionInfo> {
  await simulateDelay(50);
  return {
    version: `${DEMO_VERSION}-demo`,
    build_time: new Date().toISOString(),
    channel: 'demo',
    is_beta: false,
    schema_version: '1.0',
    git_sha: 'demo',
  };
}

export async function checkVersion(
  clientVersion: string
): Promise<VersionCheckResult> {
  await simulateDelay(50);
  return {
    client_version: clientVersion,
    server_version: DEMO_VERSION,
    update_available: false,
    update_type: null,
  };
}

export async function getChangelogStatus(): Promise<ChangelogStatusResult> {
  await simulateDelay(50);
  return {
    current_version: `${DEMO_VERSION}-demo`,
    last_read_version: DEMO_VERSION,
    has_unread: false,
  };
}

export async function markChangelogRead(): Promise<MarkChangelogReadResult> {
  await simulateDelay(50);
  return { success: true, marked_version: `${DEMO_VERSION}-demo` };
}

// ============================================================================
// Auto-sync Functions (Demo stubs)
// ============================================================================

export async function getAutoSyncStatus(): Promise<AutoSyncStatus> {
  await simulateDelay(50);
  return {
    enabled: false,
    interval_minutes: 0,
    next_run: null,
    last_sync: null,
    last_sync_success: null,
    last_sync_error: null,
    consent_acknowledged: false,
  };
}

// ============================================================================
// Deployment Info (Demo stub)
// ============================================================================

export async function getDeploymentInfo(): Promise<{
  is_railway: boolean;
  railway_project_url: string | null;
  railway_project_id: string | null;
}> {
  await simulateDelay(50);
  return {
    is_railway: false,
    railway_project_url: null,
    railway_project_id: null,
  };
}

// ============================================================================
// Reset Demo Data
// ============================================================================

export function resetDemoData(): void {
  const initial = createInitialDemoState();
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(initial));
}

// ============================================================================
// Clear Category Cache (Demo stub)
// ============================================================================

export async function clearCategoryCache(): Promise<{ success: boolean; message?: string }> {
  await simulateDelay(50);
  return { success: true, message: 'Cache cleared (demo mode)' };
}
