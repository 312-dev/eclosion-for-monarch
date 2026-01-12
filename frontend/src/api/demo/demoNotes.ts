/* eslint-disable max-lines */
/**
 * Demo Notes API
 *
 * LocalStorage-based implementation for the Monthly Notes feature.
 */

import { getDemoState, updateDemoState, simulateDelay } from './demoState';
import type {
  MonthKey,
  Note,
  GeneralMonthNote,
  ArchivedNote,
  SaveCategoryNoteRequest,
  NoteVersion,
  NotesCategoryGroup,
} from '../../types/notes';
import { DEMO_NOTES_CATEGORIES } from '../demoData';

// ============================================================================
// Types for API Responses (matching core/notes.ts)
// ============================================================================

interface MonthNotesResponse {
  month_key: MonthKey;
  last_updated: string | null;
  effective_notes: Record<
    string,
    {
      note: Note;
      source_month: MonthKey;
      is_inherited: boolean;
    }
  >;
  effective_general_note: {
    note: GeneralMonthNote;
    source_month: MonthKey;
    is_inherited: boolean;
  } | null;
}

interface SaveNoteResponse {
  success: boolean;
  note: Note;
}

interface SaveGeneralNoteResponse {
  success: boolean;
  note: GeneralMonthNote;
}

interface SyncCategoriesResponse {
  success: boolean;
  archived_count: number;
}

/**
 * Response for bulk loading all notes.
 */
export interface AllNotesResponse {
  notes: Note[];
  general_notes: Record<MonthKey, GeneralMonthNote>;
  month_last_updated: Record<MonthKey, string>;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get effective note for a category/group at a given month (inheritance lookup)
 */
function getEffectiveNote(
  categoryType: 'group' | 'category',
  categoryId: string,
  targetMonth: MonthKey,
  notes: Record<string, Note>
): { note: Note; source_month: MonthKey; is_inherited: boolean } | null {
  // Filter notes for this category/group
  const categoryNotes = Object.values(notes).filter(
    (n) => n.categoryRef.id === categoryId && n.categoryRef.type === categoryType
  );

  // Sort by month descending
  categoryNotes.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  // Find most recent note at or before target month
  for (const note of categoryNotes) {
    if (note.monthKey <= targetMonth) {
      return {
        note,
        source_month: note.monthKey,
        is_inherited: note.monthKey !== targetMonth,
      };
    }
  }

  return null;
}

/**
 * Get effective general note for a given month (inheritance lookup)
 */
function getEffectiveGeneralNote(
  targetMonth: MonthKey,
  generalNotes: Record<MonthKey, GeneralMonthNote>
): { note: GeneralMonthNote; source_month: MonthKey; is_inherited: boolean } | null {
  // Get all general note months sorted descending
  const months = Object.keys(generalNotes).sort((a, b) => b.localeCompare(a));

  // Find most recent note at or before target month
  for (const month of months) {
    if (month <= targetMonth) {
      return {
        note: generalNotes[month],
        source_month: month,
        is_inherited: month !== targetMonth,
      };
    }
  }

  return null;
}

// ============================================================================
// Month Notes
// ============================================================================

/**
 * Get all notes for a specific month with inheritance resolved.
 */
export async function getMonthNotes(monthKey: MonthKey): Promise<MonthNotesResponse> {
  await simulateDelay(100);

  const state = getDemoState();
  const notes = state.notes;

  // Get all unique category/group references from notes
  const categoryRefs = new Set<string>();
  for (const note of Object.values(notes.notes)) {
    categoryRefs.add(`${note.categoryRef.type}:${note.categoryRef.id}`);
  }

  // Get effective note for each
  const effectiveNotes: MonthNotesResponse['effective_notes'] = {};
  for (const ref of categoryRefs) {
    const [catType, catId] = ref.split(':') as ['group' | 'category', string];
    const effective = getEffectiveNote(catType, catId, monthKey, notes.notes);
    if (effective) {
      effectiveNotes[ref] = effective;
    }
  }

  return {
    month_key: monthKey,
    last_updated: notes.monthLastUpdated[monthKey] ?? null,
    effective_notes: effectiveNotes,
    effective_general_note: getEffectiveGeneralNote(monthKey, notes.generalNotes),
  };
}

/**
 * Get all notes data for bulk loading.
 *
 * Returns all raw notes and general notes so the frontend can compute
 * effective notes for any month instantly without additional API calls.
 */
export async function getAllNotes(): Promise<AllNotesResponse> {
  await simulateDelay(100);

  const state = getDemoState();
  const notes = state.notes;

  // Convert notes object to array
  const allNotes: Note[] = Object.values(notes.notes);

  return {
    notes: allNotes,
    general_notes: notes.generalNotes,
    month_last_updated: notes.monthLastUpdated,
  };
}

// ============================================================================
// Category/Group Notes
// ============================================================================

/**
 * Save or update a note for a category or group.
 */
export async function saveCategoryNote(
  params: SaveCategoryNoteRequest
): Promise<SaveNoteResponse> {
  await simulateDelay(150);

  const now = new Date().toISOString();
  let savedNote: Note | null = null;

  updateDemoState((state) => {
    // Check if note already exists for this category/group and month
    let existingNoteId: string | null = null;
    for (const [noteId, note] of Object.entries(state.notes.notes)) {
      if (
        note.categoryRef.id === params.categoryId &&
        note.categoryRef.type === params.categoryType &&
        note.monthKey === params.monthKey
      ) {
        existingNoteId = noteId;
        break;
      }
    }

    if (existingNoteId) {
      // Update existing note
      const existingNote = state.notes.notes[existingNoteId];
      if (existingNote) {
        const updatedNote: Note = {
          ...existingNote,
          content: params.content,
          updatedAt: now,
          categoryRef: {
            ...existingNote.categoryRef,
            name: params.categoryName,
            ...(params.groupId !== undefined && { groupId: params.groupId }),
            ...(params.groupName !== undefined && { groupName: params.groupName }),
          },
        };
        state.notes.notes[existingNoteId] = updatedNote;
        savedNote = updatedNote;
      }
    } else {
      // Create new note
      const noteId = generateId();
      const newNote: Note = {
        id: noteId,
        categoryRef: {
          type: params.categoryType,
          id: params.categoryId,
          name: params.categoryName,
          ...(params.groupId !== undefined && { groupId: params.groupId }),
          ...(params.groupName !== undefined && { groupName: params.groupName }),
        },
        monthKey: params.monthKey,
        content: params.content,
        createdAt: now,
        updatedAt: now,
      };
      state.notes.notes[noteId] = newNote;
      savedNote = newNote;
    }

    // Update known categories
    state.notes.knownCategoryIds[params.categoryId] = params.categoryName;

    // Update month timestamp
    state.notes.monthLastUpdated[params.monthKey] = now;

    return state;
  });

  return {
    success: true,
    note: savedNote!,
  };
}

/**
 * Delete a category note.
 */
export async function deleteCategoryNote(noteId: string): Promise<{ success: boolean }> {
  await simulateDelay(100);

  let found = false;

  updateDemoState((state) => {
    if (state.notes.notes[noteId]) {
      const monthKey = state.notes.notes[noteId].monthKey;
      delete state.notes.notes[noteId];
      state.notes.monthLastUpdated[monthKey] = new Date().toISOString();
      found = true;
    }
    return state;
  });

  return { success: found };
}

// ============================================================================
// General Month Notes
// ============================================================================

/**
 * Get the general note for a specific month.
 */
export async function getGeneralNote(
  monthKey: MonthKey
): Promise<{ note: GeneralMonthNote | null }> {
  await simulateDelay(50);

  const state = getDemoState();
  return { note: state.notes.generalNotes[monthKey] ?? null };
}

/**
 * Save or update a general note for a month.
 */
export async function saveGeneralNote(
  monthKey: MonthKey,
  content: string
): Promise<SaveGeneralNoteResponse> {
  await simulateDelay(150);

  const now = new Date().toISOString();
  let savedNote: GeneralMonthNote | null = null;

  updateDemoState((state) => {
    if (state.notes.generalNotes[monthKey]) {
      // Update existing
      state.notes.generalNotes[monthKey] = {
        ...state.notes.generalNotes[monthKey],
        content,
        updatedAt: now,
      };
      savedNote = state.notes.generalNotes[monthKey];
    } else {
      // Create new
      const newNote: GeneralMonthNote = {
        id: generateId(),
        monthKey,
        content,
        createdAt: now,
        updatedAt: now,
      };
      state.notes.generalNotes[monthKey] = newNote;
      savedNote = newNote;
    }

    state.notes.monthLastUpdated[monthKey] = now;
    return state;
  });

  return {
    success: true,
    note: savedNote!,
  };
}

/**
 * Delete the general note for a month.
 */
export async function deleteGeneralNote(monthKey: MonthKey): Promise<{ success: boolean }> {
  await simulateDelay(100);

  let found = false;

  updateDemoState((state) => {
    if (state.notes.generalNotes[monthKey]) {
      delete state.notes.generalNotes[monthKey];
      state.notes.monthLastUpdated[monthKey] = new Date().toISOString();
      found = true;
    }
    return state;
  });

  return { success: found };
}

// ============================================================================
// Archived Notes
// ============================================================================

/**
 * Get all archived notes.
 */
export async function getArchivedNotes(): Promise<ArchivedNote[]> {
  await simulateDelay(50);

  const state = getDemoState();
  return state.notes.archivedNotes;
}

/**
 * Permanently delete an archived note.
 */
export async function deleteArchivedNote(noteId: string): Promise<{ success: boolean }> {
  await simulateDelay(100);

  let found = false;

  updateDemoState((state) => {
    const index = state.notes.archivedNotes.findIndex((n) => n.id === noteId);
    if (index !== -1) {
      state.notes.archivedNotes.splice(index, 1);
      found = true;
    }
    return state;
  });

  return { success: found };
}

// ============================================================================
// Category Sync
// ============================================================================

/**
 * Sync known categories with current categories.
 * In demo mode, this doesn't do much since we don't delete categories.
 */
export async function syncNotesCategories(): Promise<SyncCategoriesResponse> {
  await simulateDelay(100);

  // In demo mode, we don't actually have category deletion,
  // so just return success with 0 archived
  return {
    success: true,
    archived_count: 0,
  };
}

// ============================================================================
// Revision History
// ============================================================================

/**
 * Get revision history for a category or group's notes.
 */
export async function getNoteHistory(
  categoryType: 'group' | 'category',
  categoryId: string
): Promise<NoteVersion[]> {
  await simulateDelay(100);

  const state = getDemoState();

  // Filter notes for this category/group
  const categoryNotes = Object.values(state.notes.notes).filter(
    (n) => n.categoryRef.id === categoryId && n.categoryRef.type === categoryType
  );

  // Sort by month ascending
  categoryNotes.sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  // Convert to version history
  return categoryNotes.map((note) => ({
    monthKey: note.monthKey,
    content: note.content,
    contentPreview: note.content.length > 100 ? note.content.slice(0, 100) + '...' : note.content,
    isCurrent: false, // Will be set by the caller based on current month
    createdAt: note.createdAt,
  }));
}

// ============================================================================
// Checkbox States
// ============================================================================

/**
 * Get checkbox key for storage.
 */
function getCheckboxKey(
  noteId: string | undefined,
  generalNoteMonthKey: string | undefined,
  viewingMonth: string,
  mode: 'persist' | 'reset'
): string {
  const scope = mode === 'persist' ? 'global' : viewingMonth;
  if (noteId) {
    return `${noteId}:${scope}`;
  }
  return `general:${generalNoteMonthKey}:${scope}`;
}

/**
 * Get checkbox states for a category/group note.
 */
export async function getCheckboxStates(
  noteId: string,
  viewingMonth: string
): Promise<boolean[]> {
  await simulateDelay(50);

  const state = getDemoState();
  const mode = state.notes.checkboxMode ?? 'persist';
  const key = getCheckboxKey(noteId, undefined, viewingMonth, mode);
  return state.notes.checkboxStates?.[key] ?? [];
}

/**
 * Get checkbox states for a general note.
 */
export async function getGeneralCheckboxStates(
  monthKey: string,
  viewingMonth: string
): Promise<boolean[]> {
  await simulateDelay(50);

  const state = getDemoState();
  const mode = state.notes.checkboxMode ?? 'persist';
  const key = getCheckboxKey(undefined, monthKey, viewingMonth, mode);
  return state.notes.checkboxStates?.[key] ?? [];
}

/**
 * Update a checkbox state.
 */
export async function updateCheckboxState(params: {
  noteId?: string;
  generalNoteMonthKey?: string;
  viewingMonth: string;
  checkboxIndex: number;
  isChecked: boolean;
}): Promise<boolean[]> {
  await simulateDelay(50);

  let updatedStates: boolean[] = [];

  updateDemoState((state) => {
    // Initialize checkboxStates if needed
    if (!state.notes.checkboxStates) {
      state.notes.checkboxStates = {};
    }
    if (!state.notes.checkboxMode) {
      state.notes.checkboxMode = 'persist';
    }

    const key = getCheckboxKey(
      params.noteId,
      params.generalNoteMonthKey,
      params.viewingMonth,
      state.notes.checkboxMode
    );

    // Get or create states array
    const states = state.notes.checkboxStates[key] ? [...state.notes.checkboxStates[key]] : [];

    // Extend array if needed
    while (states.length <= params.checkboxIndex) {
      states.push(false);
    }

    // Update state
    states[params.checkboxIndex] = params.isChecked;
    state.notes.checkboxStates[key] = states;
    updatedStates = states;

    return state;
  });

  return updatedStates;
}

/**
 * Get all checkbox states for a month.
 *
 * Returns checkbox states for all notes relevant to the given viewing month.
 * Keys are returned in backend format: note_id or "general:{source_month}"
 */
export async function getMonthCheckboxStates(
  monthKey: string
): Promise<Record<string, boolean[]>> {
  await simulateDelay(50);

  const state = getDemoState();
  const mode = state.notes.checkboxMode ?? 'persist';
  const result: Record<string, boolean[]> = {};

  // Filter checkbox states relevant for this month
  // Return keys in backend format: note_id or "general:{source_month}" (no scope suffix)
  for (const [key, states] of Object.entries(state.notes.checkboxStates ?? {})) {
    const parts = key.split(':');

    if (parts[0] === 'general' && parts.length >= 3) {
      // General note: stored as "general:{source_month}:{scope}"
      const sourceMonth = parts[1];
      const scope = parts[2];

      // Check if scope matches current mode
      const scopeMatches = mode === 'persist' ? scope === 'global' : scope === monthKey;

      // In persist mode, return all matching checkbox states (for inherited note support)
      // In reset mode, only return states where source month matches viewing month
      if (scopeMatches && (mode === 'persist' || sourceMonth === monthKey)) {
        result[`general:${sourceMonth}`] = states;
      }
    } else if (parts.length >= 2) {
      // Category note: stored as "{note_id}:{scope}"
      const noteId = parts[0];
      const scope = parts[1];

      // Check if scope matches current mode
      const scopeMatches = mode === 'persist' ? scope === 'global' : scope === monthKey;

      if (scopeMatches) {
        result[noteId] = states;
      }
    }
  }

  return result;
}

// ============================================================================
// Notes Settings
// ============================================================================

/**
 * Get notes settings.
 */
export async function getNotesSettings(): Promise<{ checkboxMode: 'persist' | 'reset' }> {
  await simulateDelay(50);

  const state = getDemoState();
  return {
    checkboxMode: state.notes.checkboxMode ?? 'persist',
  };
}

/**
 * Update notes settings.
 */
export async function updateNotesSettings(params: {
  checkboxMode?: 'persist' | 'reset';
}): Promise<{ checkboxMode: 'persist' | 'reset' }> {
  await simulateDelay(50);

  let newMode: 'persist' | 'reset' = 'persist';

  updateDemoState((state) => {
    if (params.checkboxMode) {
      state.notes.checkboxMode = params.checkboxMode;
    }
    newMode = state.notes.checkboxMode ?? 'persist';
    return state;
  });

  return { checkboxMode: newMode };
}

// ============================================================================
// Notes Categories
// ============================================================================

/**
 * Get all Monarch categories organized by group for the Notes feature.
 *
 * Returns all category groups with their categories, simulating what
 * a typical Monarch user would have in their budget.
 */
export async function getNotesCategories(): Promise<NotesCategoryGroup[]> {
  await simulateDelay(100);
  return DEMO_NOTES_CATEGORIES;
}
