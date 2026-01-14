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
      const note = generalNotes[month];
      if (note) {
        return {
          note,
          source_month: month,
          is_inherited: month !== targetMonth,
        };
      }
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
// Checkbox States (Always Reset Mode - each viewing month has independent states)
// ============================================================================

/**
 * Get checkbox key for storage.
 * Key format: "{noteId}:{viewingMonth}" or "general:{sourceMonth}:{viewingMonth}"
 */
function getCheckboxKey(
  noteId: string | undefined,
  generalNoteMonthKey: string | undefined,
  viewingMonth: string
): string {
  if (noteId) {
    return `${noteId}:${viewingMonth}`;
  }
  return `general:${generalNoteMonthKey}:${viewingMonth}`;
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
  const key = getCheckboxKey(noteId, undefined, viewingMonth);
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
  const key = getCheckboxKey(undefined, monthKey, viewingMonth);
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

    const key = getCheckboxKey(
      params.noteId,
      params.generalNoteMonthKey,
      params.viewingMonth
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
 * Get all checkbox states for a viewing month.
 *
 * Returns checkbox states for all notes relevant to the given viewing month.
 * Keys are returned in backend format: note_id or "general:{source_month}"
 */
export async function getMonthCheckboxStates(
  viewingMonth: string
): Promise<Record<string, boolean[]>> {
  await simulateDelay(50);

  const state = getDemoState();
  const result: Record<string, boolean[]> = {};

  // Filter checkbox states for this viewing month
  for (const [key, states] of Object.entries(state.notes.checkboxStates ?? {})) {
    const parts = key.split(':');

    if (parts[0] === 'general' && parts.length >= 3) {
      // General note: stored as "general:{source_month}:{viewing_month}"
      const sourceMonth = parts[1];
      const keyViewingMonth = parts[2];

      if (keyViewingMonth === viewingMonth && sourceMonth) {
        result[`general:${sourceMonth}`] = states;
      }
    } else if (parts.length >= 2) {
      // Category note: stored as "{note_id}:{viewing_month}"
      const noteId = parts[0];
      const keyViewingMonth = parts[1];

      if (keyViewingMonth === viewingMonth && noteId) {
        result[noteId] = states;
      }
    }
  }

  return result;
}

// ============================================================================
// Inheritance Impact
// ============================================================================

/**
 * Get the impact of creating a new note (breaking inheritance).
 *
 * For demo mode, this returns mock data simulating the inheritance analysis.
 */
export async function getInheritanceImpact(params: {
  categoryType?: 'group' | 'category';
  categoryId?: string;
  monthKey: string;
  isGeneral?: boolean;
}): Promise<{
  sourceNote: { id: string; monthKey: string; contentPreview: string } | null;
  affectedMonths: string[];
  monthsWithCheckboxStates: Record<string, number>;
  nextCustomNoteMonth: string | null;
}> {
  await simulateDelay(50);

  const state = getDemoState();
  let sourceNote = null;
  let nextCustomNoteMonth: string | null = null;

  if (params.isGeneral) {
    // Find general notes to determine inheritance
    const generalNotes = Object.entries(state.notes.generalNotes)
      .filter(([, note]) => note && note.monthKey < params.monthKey)
      .sort(([, a], [, b]) => (b?.monthKey ?? '').localeCompare(a?.monthKey ?? ''));

    if (generalNotes.length > 0 && generalNotes[0]?.[1]) {
      const note = generalNotes[0][1];
      sourceNote = {
        id: note.id,
        monthKey: note.monthKey,
        contentPreview:
          note.content.length > 100 ? note.content.slice(0, 100) + '...' : note.content,
      };
    }

    // Find next custom note
    const futureNotes = Object.entries(state.notes.generalNotes)
      .filter(([, note]) => note && note.monthKey > params.monthKey)
      .sort(([, a], [, b]) => (a?.monthKey ?? '').localeCompare(b?.monthKey ?? ''));
    if (futureNotes.length > 0 && futureNotes[0]?.[1]) {
      nextCustomNoteMonth = futureNotes[0][1].monthKey;
    }
  } else if (params.categoryType && params.categoryId) {
    // Find category notes by filtering all notes
    const allCategoryNotes = Object.values(state.notes.notes).filter(
      (note: Note) =>
        note.categoryRef.id === params.categoryId &&
        note.categoryRef.type === params.categoryType
    );

    const pastNotes = allCategoryNotes
      .filter((note: Note) => note.monthKey < params.monthKey)
      .sort((a: Note, b: Note) => b.monthKey.localeCompare(a.monthKey));

    if (pastNotes.length > 0 && pastNotes[0]) {
      const note = pastNotes[0];
      sourceNote = {
        id: note.id,
        monthKey: note.monthKey,
        contentPreview:
          note.content.length > 100 ? note.content.slice(0, 100) + '...' : note.content,
      };
    }

    // Find next custom note
    const futureNotes = allCategoryNotes
      .filter((note: Note) => note.monthKey > params.monthKey)
      .sort((a: Note, b: Note) => a.monthKey.localeCompare(b.monthKey));
    if (futureNotes.length > 0 && futureNotes[0]) {
      nextCustomNoteMonth = futureNotes[0].monthKey;
    }
  }

  if (!sourceNote) {
    return {
      sourceNote: null,
      affectedMonths: [],
      monthsWithCheckboxStates: {},
      nextCustomNoteMonth: null,
    };
  }

  // Calculate affected months (from monthKey to nextCustomNoteMonth or 12 months)
  const affectedMonths: string[] = [];
  const [startYear, startMonth] = params.monthKey.split('-').map(Number);
  let year = startYear ?? new Date().getFullYear();
  let month = startMonth ?? 1;

  for (let i = 0; i < 12; i++) {
    const mk = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}`;
    if (nextCustomNoteMonth && mk >= nextCustomNoteMonth) break;
    affectedMonths.push(mk);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  // Check which months have checkbox states
  const monthsWithCheckboxStates: Record<string, number> = {};
  for (const mk of affectedMonths) {
    const key = sourceNote.id
      ? `${sourceNote.id}:${mk}`
      : `general:${sourceNote.monthKey}:${mk}`;
    const states = state.notes.checkboxStates?.[key];
    if (states) {
      const checkedCount = states.filter(Boolean).length;
      if (checkedCount > 0) {
        monthsWithCheckboxStates[mk] = checkedCount;
      }
    }
  }

  return {
    sourceNote,
    affectedMonths,
    monthsWithCheckboxStates,
    nextCustomNoteMonth,
  };
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
