/**
 * Tests for notes tool export/import functionality in demo mode.
 *
 * Tests cover:
 * - Notes tool export (category, general, archived, checkbox states)
 * - Notes tool import with ID prefixing
 * - Notes round-trip preservation
 * - Preview for notes tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as demoApi from './demoClient';
import { createInitialDemoState } from './demoData';
import { DEMO_STORAGE_KEY, createExport } from './settingsExportTestUtils';

describe('Settings Export - Notes (Demo Mode)', () => {
  beforeEach(() => {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));
  });

  afterEach(() => {
    localStorage.removeItem(DEMO_STORAGE_KEY);
  });

  describe('Notes Tool Export', () => {
    it('should export category notes with all fields', async () => {
      const result = await demoApi.exportSettings();
      const notes = result.tools.notes;

      expect(notes).toBeDefined();
      expect(notes?.category_notes.length).toBeGreaterThan(0);

      const note = notes!.category_notes[0];
      expect(note.id).toBeDefined();
      expect(note.category_type).toMatch(/^(group|category)$/);
      expect(note.category_id).toBeDefined();
      expect(note.category_name).toBeDefined();
      expect(note.month_key).toBeDefined();
      expect(note.content).toBeDefined();
      expect(note.created_at).toBeDefined();
      expect(note.updated_at).toBeDefined();
    });

    it('should export general notes', async () => {
      const result = await demoApi.exportSettings();
      const notes = result.tools.notes;

      expect(notes?.general_notes.length).toBeGreaterThan(0);

      const generalNote = notes!.general_notes[0];
      expect(generalNote.id).toBeDefined();
      expect(generalNote.month_key).toBeDefined();
      expect(generalNote.content).toBeDefined();
    });

    it('should export checkbox states', async () => {
      const result = await demoApi.exportSettings();
      expect(result.tools.notes?.checkbox_states).toBeDefined();
      expect(typeof result.tools.notes?.checkbox_states).toBe('object');
    });

    it('should export group notes with null group_id/group_name', async () => {
      const result = await demoApi.exportSettings();
      const groupNote = result.tools.notes?.category_notes.find((n) => n.category_type === 'group');

      if (groupNote) {
        expect(groupNote.group_id).toBeNull();
        expect(groupNote.group_name).toBeNull();
      }
    });

    it('should export category notes with group_id/group_name', async () => {
      const result = await demoApi.exportSettings();
      const catNote = result.tools.notes?.category_notes.find(
        (n) => n.category_type === 'category'
      );

      if (catNote) {
        expect(catNote.group_id).toBeDefined();
        expect(catNote.group_name).toBeDefined();
      }
    });
  });

  describe('Notes Tool Import', () => {
    it('should import category notes with new IDs', async () => {
      const exportData = createExport({
        notes: {
          config: {},
          category_notes: [
            {
              id: 'test-note-1',
              category_type: 'category',
              category_id: 'cat-1',
              category_name: 'Test Category',
              group_id: 'group-1',
              group_name: 'Test Group',
              month_key: '2026-01',
              content: 'Test note content',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          general_notes: [],
          archived_notes: [],
          checkbox_states: {},
        },
      });

      const result = await demoApi.importSettings(exportData);
      expect(result.success).toBe(true);
      expect(result.imported.notes).toBe(true);

      const allNotes = await demoApi.getAllNotes();
      const importedNote = allNotes.notes.find((n) => n.id === 'imported-test-note-1');
      expect(importedNote).toBeDefined();
      expect(importedNote?.content).toBe('Test note content');
    });

    it('should import general notes keyed by month', async () => {
      const exportData = createExport({
        notes: {
          config: {},
          category_notes: [],
          general_notes: [
            {
              id: 'gen-note-1',
              month_key: '2026-03',
              content: 'March general note',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          archived_notes: [],
          checkbox_states: {},
        },
      });

      const result = await demoApi.importSettings(exportData);
      expect(result.success).toBe(true);

      const generalNoteResponse = await demoApi.getGeneralNote('2026-03');
      expect(generalNoteResponse.note?.content).toBe('March general note');
    });

    it('should import checkbox states', async () => {
      const exportData = createExport({
        notes: {
          config: {},
          category_notes: [],
          general_notes: [],
          archived_notes: [],
          checkbox_states: { 'note-1:2026-01': [true, false, true] },
        },
      });

      const result = await demoApi.importSettings(exportData);
      expect(result.success).toBe(true);
      expect(result.imported.notes).toBe(true);
    });

    it('should merge imported notes with existing notes', async () => {
      const originalExport = await demoApi.exportSettings();
      const originalCount = originalExport.tools.notes?.category_notes.length ?? 0;

      const exportData = createExport({
        notes: {
          config: {},
          category_notes: [
            {
              id: 'extra-note',
              category_type: 'group',
              category_id: 'group-extra',
              category_name: 'Extra Group',
              group_id: null,
              group_name: null,
              month_key: '2026-06',
              content: 'Extra note',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          general_notes: [],
          archived_notes: [],
          checkbox_states: {},
        },
      });

      await demoApi.importSettings(exportData);

      const afterExport = await demoApi.exportSettings();
      expect(afterExport.tools.notes?.category_notes.length).toBe(originalCount + 1);
    });
  });

  describe('Notes Round-trip', () => {
    it('should preserve all notes data through export/import', async () => {
      const exported = await demoApi.exportSettings();
      const originalNotes = exported.tools.notes!;
      const originalCategoryCount = originalNotes.category_notes.length;
      const originalGeneralCount = originalNotes.general_notes.length;

      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));
      const result = await demoApi.importSettings(exported);
      expect(result.success).toBe(true);

      const reExported = await demoApi.exportSettings();
      const restoredNotes = reExported.tools.notes!;

      expect(restoredNotes.category_notes.length).toBeGreaterThanOrEqual(originalCategoryCount);
      expect(restoredNotes.general_notes.length).toBeGreaterThanOrEqual(originalGeneralCount);
    });
  });

  describe('Preview - Notes', () => {
    it('should preview notes tool data', async () => {
      const exported = await demoApi.exportSettings();
      const result = await demoApi.previewImport(exported);

      expect(result.success).toBe(true);
      expect(result.preview?.tools.notes).toBeDefined();
      expect(result.preview?.tools.notes?.category_notes_count).toBeGreaterThan(0);
      expect(result.preview?.tools.notes?.general_notes_count).toBeGreaterThan(0);
      expect(typeof result.preview?.tools.notes?.has_checkbox_states).toBe('boolean');
    });

    it('should preview notes with correct counts', async () => {
      const exportData = createExport({
        notes: {
          config: {},
          category_notes: [
            {
              id: 'n1',
              category_type: 'group',
              category_id: 'g1',
              category_name: 'G1',
              group_id: null,
              group_name: null,
              month_key: '2026-01',
              content: 'c1',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 'n2',
              category_type: 'category',
              category_id: 'c2',
              category_name: 'C2',
              group_id: 'g1',
              group_name: 'G1',
              month_key: '2026-01',
              content: 'c2',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          general_notes: [
            {
              id: 'gn1',
              month_key: '2026-01',
              content: 'general',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          archived_notes: [],
          checkbox_states: { 'note-1:2026-01': [true] },
        },
      });

      const result = await demoApi.previewImport(exportData);

      expect(result.preview?.tools.notes?.category_notes_count).toBe(2);
      expect(result.preview?.tools.notes?.general_notes_count).toBe(1);
      expect(result.preview?.tools.notes?.archived_notes_count).toBe(0);
      expect(result.preview?.tools.notes?.has_checkbox_states).toBe(true);
    });
  });
});
