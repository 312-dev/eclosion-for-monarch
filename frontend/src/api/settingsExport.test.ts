/**
 * Tests for settings export/import functionality in demo mode.
 *
 * Tests cover:
 * - Exporting demo state to portable format
 * - Importing settings from backup file
 * - Validating export format
 * - Round-trip export/import for all tool settings
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as demoApi from './demoClient';
import { createInitialDemoState } from './demoData';
import type { EclosionExport } from '../types';

const DEMO_STORAGE_KEY = 'eclosion-demo-data';

describe('Settings Export (Demo Mode)', () => {
  beforeEach(() => {
    // Reset demo state before each test
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));
  });

  afterEach(() => {
    // Clean up after tests
    localStorage.removeItem(DEMO_STORAGE_KEY);
  });

  describe('exportSettings', () => {
    it('should export settings with correct metadata', async () => {
      const result = await demoApi.exportSettings();

      expect(result.eclosion_export).toBeDefined();
      expect(result.eclosion_export.version).toBe('1.0');
      expect(result.eclosion_export.source_mode).toBe('demo');
      expect(result.eclosion_export.exported_at).toBeDefined();
    });

    it('should export recurring tool configuration', async () => {
      const result = await demoApi.exportSettings();

      expect(result.tools.recurring).toBeDefined();
      expect(result.tools.recurring?.config).toBeDefined();
      expect(result.tools.recurring?.config.target_group_id).toBeDefined();
    });

    it('should export enabled items list', async () => {
      const result = await demoApi.exportSettings();

      expect(Array.isArray(result.tools.recurring?.enabled_items)).toBe(true);
    });

    it('should export category mappings', async () => {
      const result = await demoApi.exportSettings();

      expect(result.tools.recurring?.categories).toBeDefined();
      expect(typeof result.tools.recurring?.categories).toBe('object');
    });

    it('should export rollup configuration', async () => {
      const result = await demoApi.exportSettings();

      expect(result.tools.recurring?.rollup).toBeDefined();
      expect(typeof result.tools.recurring?.rollup.enabled).toBe('boolean');
      expect(Array.isArray(result.tools.recurring?.rollup.item_ids)).toBe(true);
    });
  });

  describe('importSettings', () => {
    it('should import valid settings successfully', async () => {
      const exportData: EclosionExport = {
        eclosion_export: {
          version: '1.0',
          exported_at: new Date().toISOString(),
          source_mode: 'production',
        },
        tools: {
          recurring: {
            config: {
              target_group_id: 'new-group-id',
              target_group_name: 'New Group',
              auto_sync_new: true,
              auto_track_threshold: 50,
              auto_update_targets: true,
            },
            enabled_items: ['item-1', 'item-2'],
            categories: {},
            rollup: {
              enabled: true,
              monarch_category_id: null,
              category_name: 'Test Rollup',
              emoji: '📦',
              item_ids: ['item-3'],
              total_budgeted: 25.99,
              is_linked: false,
            },
          },
        },
        app_settings: {},
      };

      const result = await demoApi.importSettings(exportData);

      expect(result.success).toBe(true);
      expect(result.imported.recurring).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject unsupported version', async () => {
      const exportData: EclosionExport = {
        eclosion_export: {
          version: '99.0',
          exported_at: new Date().toISOString(),
          source_mode: 'demo',
        },
        tools: {},
        app_settings: {},
      };

      const result = await demoApi.importSettings(exportData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('version');
    });

    it('should apply imported config settings', async () => {
      const exportData: EclosionExport = {
        eclosion_export: {
          version: '1.0',
          exported_at: new Date().toISOString(),
          source_mode: 'production',
        },
        tools: {
          recurring: {
            config: {
              target_group_id: 'imported-group',
              target_group_name: 'Imported Name',
              auto_sync_new: true,
              auto_track_threshold: 100,
              auto_update_targets: false,
            },
            enabled_items: [],
            categories: {},
            rollup: {
              enabled: false,
              monarch_category_id: null,
              category_name: 'Rollup',
              emoji: '🔄',
              item_ids: [],
              total_budgeted: 0,
              is_linked: false,
            },
          },
        },
        app_settings: {},
      };

      await demoApi.importSettings(exportData);

      // Verify settings were applied
      const dashboard = await demoApi.getDashboard();
      expect(dashboard.config.target_group_id).toBe('imported-group');
      expect(dashboard.config.target_group_name).toBe('Imported Name');
      expect(dashboard.config.auto_sync_new).toBe(true);
      expect(dashboard.config.auto_track_threshold).toBe(100);
    });
  });

  describe('previewImport', () => {
    it('should return valid preview for valid data', async () => {
      const exportData: EclosionExport = {
        eclosion_export: {
          version: '1.0',
          exported_at: '2026-01-03T12:00:00Z',
          source_mode: 'production',
        },
        tools: {
          recurring: {
            config: {
              target_group_id: 'group-1',
              target_group_name: 'Group 1',
              auto_sync_new: false,
              auto_track_threshold: null,
              auto_update_targets: true,
            },
            enabled_items: ['item-1', 'item-2', 'item-3'],
            categories: {
              'item-1': {
                monarch_category_id: 'cat-1',
                name: 'Category 1',
                emoji: '🔄',
                sync_name: true,
                is_linked: false,
              },
              'item-2': {
                monarch_category_id: 'cat-2',
                name: 'Category 2',
                emoji: '📌',
                sync_name: false,
                is_linked: true,
              },
            },
            rollup: {
              enabled: true,
              monarch_category_id: 'rollup-1',
              category_name: 'Rollup',
              emoji: '📦',
              item_ids: ['item-a', 'item-b'],
              total_budgeted: 50,
              is_linked: false,
            },
          },
        },
        app_settings: {},
      };

      const result = await demoApi.previewImport(exportData);

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.preview).toBeDefined();
      expect(result.preview?.tools.recurring).toBeDefined();
      expect(result.preview?.tools.recurring?.enabled_items_count).toBe(3);
      expect(result.preview?.tools.recurring?.categories_count).toBe(2);
      expect(result.preview?.tools.recurring?.has_rollup).toBe(true);
      expect(result.preview?.tools.recurring?.rollup_items_count).toBe(2);
    });

    it('should reject invalid version', async () => {
      const exportData = {
        eclosion_export: {
          version: '999.0',
          exported_at: '2026-01-03T12:00:00Z',
          source_mode: 'demo',
        },
        tools: {},
        app_settings: {},
      } as EclosionExport;

      const result = await demoApi.previewImport(exportData);

      expect(result.success).toBe(false);
      expect(result.valid).toBe(false);
    });
  });

  describe('Round-trip Export/Import', () => {
    it('should preserve all recurring tool settings through export/import', async () => {
      // First, configure the demo state with specific values
      await demoApi.updateSettings({
        auto_sync_new: true,
        auto_track_threshold: 75,
        auto_update_targets: true,
      });

      // Get the current dashboard state
      const originalDashboard = await demoApi.getDashboard();

      // Export
      const exported = await demoApi.exportSettings();

      // Reset demo data
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));

      // Import
      const importResult = await demoApi.importSettings(exported);
      expect(importResult.success).toBe(true);

      // Verify settings were restored
      const restoredDashboard = await demoApi.getDashboard();

      // Config settings should match
      expect(restoredDashboard.config.target_group_id).toBe(originalDashboard.config.target_group_id);
      expect(restoredDashboard.config.target_group_name).toBe(originalDashboard.config.target_group_name);
      expect(restoredDashboard.config.auto_sync_new).toBe(true);
      expect(restoredDashboard.config.auto_track_threshold).toBe(75);
      expect(restoredDashboard.config.auto_update_targets).toBe(true);
    });

    it('should preserve rollup configuration through export/import', async () => {
      // Set up rollup with specific values
      await demoApi.setRollupBudget(123.45);
      await demoApi.updateRollupEmoji('🎯');
      await demoApi.updateRollupCategoryName('Custom Rollup Name');

      // Export
      const exported = await demoApi.exportSettings();

      expect(exported.tools.recurring?.rollup.total_budgeted).toBe(123.45);
      expect(exported.tools.recurring?.rollup.emoji).toBe('🎯');
      expect(exported.tools.recurring?.rollup.category_name).toBe('Custom Rollup Name');

      // Reset and import
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));
      const importResult = await demoApi.importSettings(exported);
      expect(importResult.success).toBe(true);

      // Verify rollup settings restored
      const dashboard = await demoApi.getDashboard();
      expect(dashboard.rollup.budgeted).toBe(123.45);
      expect(dashboard.rollup.emoji).toBe('🎯');
      expect(dashboard.rollup.category_name).toBe('Custom Rollup Name');
    });

    it('should preserve enabled items list through export/import', async () => {
      // Get initial dashboard
      const dashboard = await demoApi.getDashboard();
      const allItemIds = dashboard.items.map(i => i.id);

      // Disable some items
      if (allItemIds.length > 0) {
        await demoApi.toggleItemTracking(allItemIds[0], false);
      }

      // Export
      const exported = await demoApi.exportSettings();

      // The exported enabled_items should not include the disabled item
      if (allItemIds.length > 0) {
        expect(exported.tools.recurring?.enabled_items).not.toContain(allItemIds[0]);
      }

      // Reset and import
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));
      await demoApi.importSettings(exported);

      // Verify the item is still disabled after import
      const restoredDashboard = await demoApi.getDashboard();
      if (allItemIds.length > 0) {
        const item = restoredDashboard.items.find(i => i.id === allItemIds[0]);
        expect(item?.is_enabled).toBe(false);
      }
    });

    it('should handle cross-mode import (production export to demo)', async () => {
      // Simulate a production export
      const productionExport: EclosionExport = {
        eclosion_export: {
          version: '1.0',
          exported_at: new Date().toISOString(),
          source_mode: 'production',
        },
        tools: {
          recurring: {
            config: {
              target_group_id: 'prod-group-123',
              target_group_name: 'Production Group',
              auto_sync_new: true,
              auto_track_threshold: 30,
              auto_update_targets: true,
            },
            enabled_items: [],
            categories: {},
            rollup: {
              enabled: false,
              monarch_category_id: null,
              category_name: 'Rollup',
              emoji: '🔄',
              item_ids: [],
              total_budgeted: 0,
              is_linked: false,
            },
          },
        },
        app_settings: {},
      };

      // Should import successfully
      const result = await demoApi.importSettings(productionExport);
      expect(result.success).toBe(true);

      // Should apply the settings
      const dashboard = await demoApi.getDashboard();
      expect(dashboard.config.target_group_id).toBe('prod-group-123');
      expect(dashboard.config.target_group_name).toBe('Production Group');
    });
  });
});
