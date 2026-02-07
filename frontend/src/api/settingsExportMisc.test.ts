/**
 * Tests for app settings and selective import functionality in demo mode.
 *
 * Tests cover:
 * - App settings export/import (theme, landing page)
 * - Selective tool import (importing only specific tools)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as demoApi from './demoClient';
import { createInitialDemoState } from './demoData';
import { DEMO_STORAGE_KEY, createExport } from './settingsExportTestUtils';

describe('Settings Export - App Settings & Selective Import (Demo Mode)', () => {
  beforeEach(() => {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));
  });

  afterEach(() => {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    localStorage.removeItem('eclosion-theme-preference');
    localStorage.removeItem('eclosion-landing-page');
  });

  describe('App Settings Export', () => {
    it('should export theme from localStorage', async () => {
      localStorage.setItem('eclosion-theme-preference', 'dark');
      const result = await demoApi.exportSettings();
      expect(result.app_settings.theme).toBe('dark');
    });

    it('should export landing page from localStorage', async () => {
      localStorage.setItem('eclosion-landing-page', '/stashes');
      const result = await demoApi.exportSettings();
      expect(result.app_settings.landing_page).toBe('/stashes');
    });

    it('should export undefined app_settings when no preferences set', async () => {
      localStorage.removeItem('eclosion-theme-preference');
      localStorage.removeItem('eclosion-landing-page');

      const result = await demoApi.exportSettings();

      expect(result.app_settings.theme).toBeUndefined();
      expect(result.app_settings.landing_page).toBeUndefined();
    });
  });

  describe('App Settings Import', () => {
    it('should import theme to localStorage', async () => {
      const exportData = createExport({});
      exportData.app_settings = { theme: 'dark' };

      const result = await demoApi.importSettings(exportData);

      expect(result.success).toBe(true);
      expect(result.imported.app_settings).toBe(true);
      expect(localStorage.getItem('eclosion-theme-preference')).toBe('dark');
    });

    it('should import landing page to localStorage', async () => {
      const exportData = createExport({});
      exportData.app_settings = { landing_page: '/notes' };

      const result = await demoApi.importSettings(exportData);

      expect(result.success).toBe(true);
      expect(localStorage.getItem('eclosion-landing-page')).toBe('/notes');
    });

    it('should round-trip app settings', async () => {
      localStorage.setItem('eclosion-theme-preference', 'dark');
      localStorage.setItem('eclosion-landing-page', '/stashes');

      const exported = await demoApi.exportSettings();

      localStorage.removeItem('eclosion-theme-preference');
      localStorage.removeItem('eclosion-landing-page');

      await demoApi.importSettings(exported);

      expect(localStorage.getItem('eclosion-theme-preference')).toBe('dark');
      expect(localStorage.getItem('eclosion-landing-page')).toBe('/stashes');
    });
  });

  describe('Selective Tool Import', () => {
    it('should import only recurring when options.tools = ["recurring"]', async () => {
      const exported = await demoApi.exportSettings();
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));

      const result = await demoApi.importSettings(exported, { tools: ['recurring'] });

      expect(result.success).toBe(true);
      expect(result.imported.recurring).toBe(true);
      expect(result.imported.notes).toBeUndefined();
      expect(result.imported.stash).toBeUndefined();
    });

    it('should import only stash when options.tools = ["stash"]', async () => {
      const exported = await demoApi.exportSettings();
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));

      const result = await demoApi.importSettings(exported, { tools: ['stash'] });

      expect(result.success).toBe(true);
      expect(result.imported.recurring).toBeUndefined();
      expect(result.imported.notes).toBeUndefined();
      expect(result.imported.stash).toBe(true);
    });

    it('should import only notes when options.tools = ["notes"]', async () => {
      const exported = await demoApi.exportSettings();
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));

      const result = await demoApi.importSettings(exported, { tools: ['notes'] });

      expect(result.success).toBe(true);
      expect(result.imported.recurring).toBeUndefined();
      expect(result.imported.notes).toBe(true);
      expect(result.imported.stash).toBeUndefined();
    });
  });
});
