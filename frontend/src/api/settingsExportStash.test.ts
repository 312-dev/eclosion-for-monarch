/**
 * Tests for stash tool export/import functionality in demo mode.
 *
 * Tests cover:
 * - Stash tool export (config, items, bookmarks, hypotheses)
 * - Stash tool import with unlinking and ID prefixing
 * - Stash round-trip preservation
 * - Preview for stash tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as demoApi from './demoClient';
import { createInitialDemoState } from './demoData';
import {
  DEMO_STORAGE_KEY,
  createStashItem,
  createStashConfig,
  createExport,
} from './settingsExportTestUtils';

describe('Settings Export - Stash (Demo Mode)', () => {
  beforeEach(() => {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));
  });

  afterEach(() => {
    localStorage.removeItem(DEMO_STORAGE_KEY);
  });

  describe('Stash Tool Export', () => {
    it('should export stash config with all fields', async () => {
      const result = await demoApi.exportSettings();
      const stash = result.tools.stash;

      expect(stash).toBeDefined();
      expect(typeof stash?.config.is_configured).toBe('boolean');
      expect('default_category_group_id' in stash!.config).toBe(true);
      expect('default_category_group_name' in stash!.config).toBe(true);
      expect('selected_browser' in stash!.config).toBe(true);
      expect(Array.isArray(stash?.config.selected_folder_ids)).toBe(true);
      expect(Array.isArray(stash?.config.selected_folder_names)).toBe(true);
      expect(typeof stash?.config.auto_archive_on_bookmark_delete).toBe('boolean');
      expect(typeof stash?.config.auto_archive_on_goal_met).toBe('boolean');
      expect('include_expected_income' in stash!.config).toBe(true);
      expect('show_monarch_goals' in stash!.config).toBe(true);
    });

    it('should export active and archived stash items', async () => {
      const result = await demoApi.exportSettings();
      const items = result.tools.stash?.items ?? [];

      const activeItems = items.filter((i) => !i.is_archived);
      const archivedItems = items.filter((i) => i.is_archived);

      expect(activeItems.length).toBe(5);
      expect(archivedItems.length).toBe(1);
    });

    it('should export stash item fields correctly', async () => {
      const result = await demoApi.exportSettings();
      const items = result.tools.stash?.items ?? [];
      const headphones = items.find((i) => i.name === 'Sony WH-1000XM5');

      expect(headphones).toBeDefined();
      expect(headphones?.id).toBe('stash-headphones');
      expect(headphones?.amount).toBe(350);
      expect(headphones?.emoji).toBe('🎧');
      expect(headphones?.monarch_category_id).toBe('cat-stash-headphones');
      expect(headphones?.source_url).toContain('amazon.com');
      expect(headphones?.is_archived).toBe(false);
      expect(typeof headphones?.grid_x).toBe('number');
      expect(typeof headphones?.grid_y).toBe('number');
    });

    it('should export open-ended goals with null amount', async () => {
      const result = await demoApi.exportSettings();
      const items = result.tools.stash?.items ?? [];
      const travelFund = items.find((i) => i.name === 'Travel Fund');
      expect(travelFund?.amount).toBeNull();
    });

    it('should export no-deadline goals with null target_date', async () => {
      const result = await demoApi.exportSettings();
      const items = result.tools.stash?.items ?? [];
      const car = items.find((i) => i.name === 'New Car Down Payment');
      expect(car?.target_date).toBeNull();
    });

    it('should export pending bookmarks', async () => {
      const result = await demoApi.exportSettings();
      const bookmarks = result.tools.stash?.pending_bookmarks ?? [];

      expect(bookmarks.length).toBeGreaterThan(0);
      expect(bookmarks[0].url).toBeDefined();
      expect(bookmarks[0].name).toBeDefined();
      expect(bookmarks[0].bookmark_id).toBeDefined();
      expect(bookmarks[0].browser_type).toBeDefined();
    });
  });

  describe('Stash Tool Import', () => {
    it('should import stash items as unlinked', async () => {
      const exportData = createExport({
        stash: {
          config: createStashConfig({
            is_configured: true,
            default_category_group_id: 'group-1',
            default_category_group_name: 'Group 1',
          }),
          items: [
            createStashItem({
              id: 'import-item-1',
              name: 'Test Stash',
              amount: 500,
              target_date: '2026-12-31',
              emoji: '🎁',
              monarch_category_id: 'original-cat-id',
            }),
          ],
          pending_bookmarks: [],
        },
      });

      const result = await demoApi.importSettings(exportData);
      expect(result.success).toBe(true);
      expect(result.imported.stash).toBe(true);

      const stashData = await demoApi.getStash();
      const importedItem = stashData.items.find((i) => i.id === 'imported-import-item-1');
      expect(importedItem).toBeDefined();
      expect(importedItem?.category_id).toBeNull();
      expect(importedItem?.category_name).toBe('Unlinked');
    });

    it('should import stash config including defaultCategoryGroupId and selectedFolderIds', async () => {
      const exportData = createExport({
        stash: {
          config: createStashConfig({
            is_configured: true,
            default_category_group_id: 'imported-group-id',
            default_category_group_name: 'Imported Group',
            selected_browser: 'chrome',
            selected_folder_ids: ['folder-1', 'folder-2'],
            selected_folder_names: ['Bookmarks', 'Wishlist'],
            auto_archive_on_bookmark_delete: false,
            auto_archive_on_goal_met: false,
            include_expected_income: true,
            show_monarch_goals: false,
          }),
          items: [],
          pending_bookmarks: [],
        },
      });

      await demoApi.importSettings(exportData);

      const config = await demoApi.getStashConfig();
      expect(config.isConfigured).toBe(true);
      expect(config.defaultCategoryGroupId).toBe('imported-group-id');
      expect(config.defaultCategoryGroupName).toBe('Imported Group');
      expect(config.selectedBrowser).toBe('chrome');
      expect(config.selectedFolderIds).toEqual(['folder-1', 'folder-2']);
      expect(config.selectedFolderNames).toEqual(['Bookmarks', 'Wishlist']);
      expect(config.autoArchiveOnBookmarkDelete).toBe(false);
      expect(config.autoArchiveOnGoalMet).toBe(false);
      expect(config.includeExpectedIncome).toBe(true);
      expect(config.showMonarchGoals).toBe(false);
    });

    it('should generate warnings for imported stash items', async () => {
      const exportData = createExport({
        stash: {
          config: createStashConfig(),
          items: [createStashItem({ id: 'warn-item-1', name: 'Warning Test', emoji: '⚠️' })],
          pending_bookmarks: [],
        },
      });

      const result = await demoApi.importSettings(exportData);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('unlinked');
    });

    it('should separate active and archived items on import', async () => {
      const exportData = createExport({
        stash: {
          config: createStashConfig(),
          items: [
            createStashItem({ id: 'active-1', name: 'Active Item', emoji: '✅' }),
            createStashItem({
              id: 'archived-1',
              name: 'Archived Item',
              amount: 200,
              emoji: '📦',
              is_archived: true,
              archived_at: new Date().toISOString(),
            }),
          ],
          pending_bookmarks: [],
        },
      });

      await demoApi.importSettings(exportData);

      const stashData = await demoApi.getStash();
      const importedActive = stashData.items.find((i) => i.id === 'imported-active-1');
      const importedArchived = stashData.archived_items.find((i) => i.id === 'imported-archived-1');

      expect(importedActive).toBeDefined();
      expect(importedActive?.is_archived).toBe(false);
      expect(importedArchived).toBeDefined();
      expect(importedArchived?.is_archived).toBe(true);
    });

    it('should import hypotheses with prefixed IDs', async () => {
      const exportData = createExport({
        stash: {
          config: createStashConfig(),
          items: [],
          pending_bookmarks: [],
          hypotheses: [
            {
              id: 'hyp-1',
              name: 'Test Hypothesis',
              savings_allocations: { 'item-1': 100 },
              savings_total: 100,
              monthly_allocations: { 'item-1': 50 },
              monthly_total: 50,
              events: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        },
      });

      await demoApi.importSettings(exportData);

      const hypothesesResponse = await demoApi.getHypotheses();
      const imported = hypothesesResponse.hypotheses.find(
        (h: { id: string }) => h.id === 'imported-hyp-1'
      );
      expect(imported).toBeDefined();
      expect(imported?.name).toBe('Test Hypothesis');
    });
  });

  describe('Stash Round-trip', () => {
    it('should preserve stash config through export/import', async () => {
      await demoApi.updateStashConfig({
        autoArchiveOnBookmarkDelete: false,
        autoArchiveOnGoalMet: false,
        includeExpectedIncome: true,
        showMonarchGoals: false,
      });

      const exported = await demoApi.exportSettings();
      const originalConfig = exported.tools.stash!.config;

      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));
      const result = await demoApi.importSettings(exported);
      expect(result.success).toBe(true);

      const config = await demoApi.getStashConfig();
      expect(config.autoArchiveOnBookmarkDelete).toBe(
        originalConfig.auto_archive_on_bookmark_delete
      );
      expect(config.autoArchiveOnGoalMet).toBe(originalConfig.auto_archive_on_goal_met);
      expect(config.includeExpectedIncome).toBe(originalConfig.include_expected_income);
      expect(config.showMonarchGoals).toBe(originalConfig.show_monarch_goals);
    });

    it('should preserve stash item count through export/import', async () => {
      const exported = await demoApi.exportSettings();
      const originalItemCount = exported.tools.stash!.items.length;

      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));
      await demoApi.importSettings(exported);

      const stashData = await demoApi.getStash();
      const totalItems = stashData.items.length + stashData.archived_items.length;
      expect(totalItems).toBeGreaterThanOrEqual(originalItemCount);
    });
  });

  describe('Preview - Stash', () => {
    it('should preview stash tool data', async () => {
      const exported = await demoApi.exportSettings();
      const result = await demoApi.previewImport(exported);

      expect(result.success).toBe(true);
      expect(result.preview?.tools.stash).toBeDefined();
      expect(result.preview?.tools.stash?.items_count).toBeGreaterThan(0);
      expect(result.preview?.tools.stash?.archived_items_count).toBeGreaterThanOrEqual(0);
      expect(typeof result.preview?.tools.stash?.pending_bookmarks_count).toBe('number');
      expect(typeof result.preview?.tools.stash?.hypotheses_count).toBe('number');
    });

    it('should preview stash with correct counts', async () => {
      const exportData = createExport({
        stash: {
          config: createStashConfig({ is_configured: true }),
          items: [
            createStashItem({ id: 'i1', name: 'Active' }),
            createStashItem({
              id: 'i2',
              name: 'Archived',
              amount: 200,
              emoji: '📦',
              is_archived: true,
              archived_at: new Date().toISOString(),
            }),
          ],
          pending_bookmarks: [
            {
              url: 'https://example.com',
              name: 'Example',
              bookmark_id: 'bm-1',
              browser_type: 'chrome',
              logo_url: null,
              status: 'pending',
              stash_item_id: null,
              created_at: null,
            },
          ],
          hypotheses: [
            {
              id: 'h1',
              name: 'H1',
              savings_allocations: {},
              savings_total: 0,
              monthly_allocations: {},
              monthly_total: 0,
              events: {},
              created_at: null,
              updated_at: null,
            },
          ],
        },
      });

      const result = await demoApi.previewImport(exportData);

      expect(result.preview?.tools.stash?.items_count).toBe(1);
      expect(result.preview?.tools.stash?.archived_items_count).toBe(1);
      expect(result.preview?.tools.stash?.pending_bookmarks_count).toBe(1);
      expect(result.preview?.tools.stash?.hypotheses_count).toBe(1);
    });
  });
});
