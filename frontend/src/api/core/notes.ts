/**
 * Notes API Functions
 *
 * Monthly notes for categories and groups.
 */

import type {
  MonthKey,
  Note,
  GeneralMonthNote,
  ArchivedNote,
  SaveCategoryNoteRequest,
  NoteVersion,
  NotesCategoryGroup,
} from '../../types/notes';
import { fetchApi } from './fetchApi';

// ============================================================================
// Types for API Responses
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

interface ArchivedNotesResponse {
  archived_notes: ArchivedNote[];
}

interface NoteHistoryResponse {
  history: NoteVersion[];
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
// Month Notes
// ============================================================================

/**
 * Get all notes for a specific month with inheritance resolved.
 */
export async function getMonthNotes(monthKey: MonthKey): Promise<MonthNotesResponse> {
  return fetchApi<MonthNotesResponse>(`/notes/month/${monthKey}`);
}

/**
 * Get all notes data for bulk loading.
 *
 * Returns all raw notes and general notes so the frontend can compute
 * effective notes for any month instantly without additional API calls.
 */
export async function getAllNotes(): Promise<AllNotesResponse> {
  return fetchApi<AllNotesResponse>('/notes/all');
}

// ============================================================================
// Category/Group Notes
// ============================================================================

/**
 * Save or update a note for a category or group.
 */
export async function saveCategoryNote(params: SaveCategoryNoteRequest): Promise<SaveNoteResponse> {
  return fetchApi<SaveNoteResponse>('/notes/category', {
    method: 'POST',
    body: JSON.stringify({
      category_type: params.categoryType,
      category_id: params.categoryId,
      category_name: params.categoryName,
      group_id: params.groupId,
      group_name: params.groupName,
      month_key: params.monthKey,
      content: params.content,
    }),
  });
}

/**
 * Delete a category note.
 */
export async function deleteCategoryNote(noteId: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/notes/category/${noteId}`, {
    method: 'DELETE',
  });
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
  return fetchApi<{ note: GeneralMonthNote | null }>(`/notes/general/${monthKey}`);
}

/**
 * Save or update a general note for a month.
 */
export async function saveGeneralNote(
  monthKey: MonthKey,
  content: string
): Promise<SaveGeneralNoteResponse> {
  return fetchApi<SaveGeneralNoteResponse>('/notes/general', {
    method: 'POST',
    body: JSON.stringify({
      month_key: monthKey,
      content,
    }),
  });
}

/**
 * Delete the general note for a month.
 */
export async function deleteGeneralNote(monthKey: MonthKey): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/notes/general/${monthKey}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Archived Notes
// ============================================================================

/**
 * Get all archived notes.
 */
export async function getArchivedNotes(): Promise<ArchivedNote[]> {
  const response = await fetchApi<ArchivedNotesResponse>('/notes/archived');
  return response.archived_notes;
}

/**
 * Permanently delete an archived note.
 */
export async function deleteArchivedNote(noteId: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/notes/archived/${noteId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Category Sync
// ============================================================================

/**
 * Sync known categories with current Monarch categories.
 * Detects deleted categories and archives their notes.
 */
export async function syncNotesCategories(): Promise<SyncCategoriesResponse> {
  return fetchApi<SyncCategoriesResponse>('/notes/sync-categories', {
    method: 'POST',
  });
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
  const response = await fetchApi<NoteHistoryResponse>(
    `/notes/history/${categoryType}/${categoryId}`
  );
  return response.history;
}

// ============================================================================
// Checkbox States
// ============================================================================

/**
 * Get checkbox states for a category/group note.
 */
export async function getCheckboxStates(
  noteId: string,
  viewingMonth: string
): Promise<boolean[]> {
  const response = await fetchApi<{ states: boolean[] }>(
    `/notes/checkboxes/${noteId}?viewing_month=${viewingMonth}`
  );
  return response.states;
}

/**
 * Get checkbox states for a general note.
 */
export async function getGeneralCheckboxStates(
  monthKey: string,
  viewingMonth: string
): Promise<boolean[]> {
  const response = await fetchApi<{ states: boolean[] }>(
    `/notes/checkboxes/general/${monthKey}?viewing_month=${viewingMonth}`
  );
  return response.states;
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
  const response = await fetchApi<{ success: boolean; states: boolean[] }>(
    '/notes/checkboxes',
    {
      method: 'POST',
      body: JSON.stringify({
        note_id: params.noteId,
        general_note_month_key: params.generalNoteMonthKey,
        viewing_month: params.viewingMonth,
        checkbox_index: params.checkboxIndex,
        is_checked: params.isChecked,
      }),
    }
  );
  return response.states;
}

/**
 * Get all checkbox states for a month.
 */
export async function getMonthCheckboxStates(
  monthKey: string
): Promise<Record<string, boolean[]>> {
  const response = await fetchApi<{ states: Record<string, boolean[]> }>(
    `/notes/checkboxes/month/${monthKey}`
  );
  return response.states;
}

// ============================================================================
// Inheritance Impact
// ============================================================================

/**
 * Get the impact of creating a new note (breaking inheritance).
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
  const queryParams = new URLSearchParams({
    month_key: params.monthKey,
  });
  if (params.isGeneral) {
    queryParams.set('is_general', 'true');
  } else if (params.categoryType && params.categoryId) {
    queryParams.set('category_type', params.categoryType);
    queryParams.set('category_id', params.categoryId);
  }

  const response = await fetchApi<{
    source_note: { id: string; month_key: string; content_preview: string } | null;
    affected_months: string[];
    months_with_checkbox_states: Record<string, number>;
    next_custom_note_month: string | null;
  }>(`/notes/inheritance-impact?${queryParams.toString()}`);

  return {
    sourceNote: response.source_note
      ? {
          id: response.source_note.id,
          monthKey: response.source_note.month_key,
          contentPreview: response.source_note.content_preview,
        }
      : null,
    affectedMonths: response.affected_months,
    monthsWithCheckboxStates: response.months_with_checkbox_states,
    nextCustomNoteMonth: response.next_custom_note_month,
  };
}

// ============================================================================
// Notes Categories
// ============================================================================

/**
 * Get all Monarch categories organized by group.
 *
 * Returns all category groups with their categories for the Notes feature.
 * This is not filtered by recurring expenses - it returns all categories.
 */
export async function getNotesCategories(): Promise<NotesCategoryGroup[]> {
  const response = await fetchApi<{ groups: NotesCategoryGroup[] }>('/notes/categories');
  return response.groups;
}
