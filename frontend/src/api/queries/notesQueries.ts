/* eslint-disable max-lines */
/**
 * Notes Queries
 *
 * React Query hooks for monthly notes feature.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type { MonthKey, SaveCategoryNoteRequest, Note, GeneralMonthNote } from '../../types/notes';
import type { AllNotesResponse } from '../core/notes';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Compute effective note for a category/group at a given month (inheritance lookup).
 */
function getEffectiveNote(
  categoryType: 'group' | 'category',
  categoryId: string,
  targetMonth: MonthKey,
  notes: Note[]
): { note: Note; source_month: MonthKey; is_inherited: boolean } | null {
  // Filter notes for this category/group
  const categoryNotes = notes.filter(
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
 * Compute effective general note for a given month (inheritance lookup).
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

/**
 * Compute month notes data from bulk data for a specific month.
 */
function computeMonthNotesFromBulk(
  monthKey: MonthKey,
  allData: AllNotesResponse
): {
  month_key: MonthKey;
  last_updated: string | null;
  effective_notes: Record<string, { note: Note; source_month: MonthKey; is_inherited: boolean }>;
  effective_general_note: { note: GeneralMonthNote; source_month: MonthKey; is_inherited: boolean } | null;
} {
  // Get all unique category/group references from notes
  const categoryRefs = new Set<string>();
  for (const note of allData.notes) {
    categoryRefs.add(`${note.categoryRef.type}:${note.categoryRef.id}`);
  }

  // Get effective note for each
  const effectiveNotes: Record<
    string,
    { note: Note; source_month: MonthKey; is_inherited: boolean }
  > = {};
  for (const ref of categoryRefs) {
    const [catType, catId] = ref.split(':') as ['group' | 'category', string];
    const effective = getEffectiveNote(catType, catId, monthKey, allData.notes);
    if (effective) {
      effectiveNotes[ref] = effective;
    }
  }

  return {
    month_key: monthKey,
    last_updated: allData.month_last_updated[monthKey] ?? null,
    effective_notes: effectiveNotes,
    effective_general_note: getEffectiveGeneralNote(monthKey, allData.general_notes),
  };
}

/**
 * Get all unique months from notes data (for cache population).
 * Returns a reasonable range of months for preloading.
 */
function getMonthsToPreload(allData: AllNotesResponse): MonthKey[] {
  const months = new Set<MonthKey>();

  // Add months from notes
  for (const note of allData.notes) {
    months.add(note.monthKey);
  }

  // Add months from general notes
  for (const monthKey of Object.keys(allData.general_notes)) {
    months.add(monthKey);
  }

  // Always include current month and surrounding months for smooth navigation
  const now = new Date();
  for (let i = -6; i <= 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.add(key);
  }

  return Array.from(months).sort((a, b) => a.localeCompare(b));
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Preload all notes data and populate the cache for individual months.
 * This enables immediate page navigation without waiting for API calls.
 */
export function useAllNotesQuery() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...getQueryKey(queryKeys.monthNotes, isDemo), '__all__'],
    queryFn: async () => {
      const data = isDemo ? await demoApi.getAllNotes() : await api.getAllNotes();

      // Populate cache for individual months
      const monthsToPreload = getMonthsToPreload(data);
      for (const monthKey of monthsToPreload) {
        const monthData = computeMonthNotesFromBulk(monthKey, data);
        queryClient.setQueryData(
          [...getQueryKey(queryKeys.monthNotes, isDemo), monthKey],
          monthData
        );
      }

      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - longer since this is bulk data
  });
}

/**
 * Get all notes for a specific month with inheritance resolved.
 */
export function useMonthNotesQuery(monthKey: MonthKey) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: [...getQueryKey(queryKeys.monthNotes, isDemo), monthKey],
    queryFn: () => (isDemo ? demoApi.getMonthNotes(monthKey) : api.getMonthNotes(monthKey)),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get all archived notes.
 */
export function useArchivedNotesQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.archivedNotes, isDemo),
    queryFn: isDemo ? demoApi.getArchivedNotes : api.getArchivedNotes,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get all Monarch categories organized by group for the Notes feature.
 */
export function useNotesCategoriesQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.notesCategories, isDemo),
    queryFn: () => (isDemo ? demoApi.getNotesCategories() : api.getNotesCategories()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get revision history for a category or group.
 */
export function useNoteHistoryQuery(
  categoryType: 'group' | 'category',
  categoryId: string,
  options?: { enabled?: boolean }
) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: [...getQueryKey(queryKeys.noteHistory, isDemo), categoryType, categoryId],
    queryFn: () =>
      isDemo
        ? demoApi.getNoteHistory(categoryType, categoryId)
        : api.getNoteHistory(categoryType, categoryId),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Save or update a category/group note.
 */
export function useSaveCategoryNoteMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SaveCategoryNoteRequest) =>
      isDemo ? demoApi.saveCategoryNote(params) : api.saveCategoryNote(params),
    onSuccess: (_data, variables) => {
      // Invalidate the month notes for this month and all future months
      // Since notes inherit forward, we need to invalidate all months >= this one
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.monthNotes, isDemo),
      });
      // Also invalidate history for this category
      queryClient.invalidateQueries({
        queryKey: [
          ...getQueryKey(queryKeys.noteHistory, isDemo),
          variables.categoryType,
          variables.categoryId,
        ],
      });
    },
  });
}

/**
 * Delete a category/group note.
 */
export function useDeleteCategoryNoteMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) =>
      isDemo ? demoApi.deleteCategoryNote(noteId) : api.deleteCategoryNote(noteId),
    onSuccess: () => {
      // Invalidate all month notes since we don't know which months are affected
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.monthNotes, isDemo),
      });
      // Invalidate all history queries
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.noteHistory, isDemo),
      });
    },
  });
}

/**
 * Save or update a general month note.
 */
export function useSaveGeneralNoteMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ monthKey, content }: { monthKey: MonthKey; content: string }) =>
      isDemo ? demoApi.saveGeneralNote(monthKey, content) : api.saveGeneralNote(monthKey, content),
    onSuccess: (_data, variables) => {
      // Invalidate the specific month
      queryClient.invalidateQueries({
        queryKey: [...getQueryKey(queryKeys.monthNotes, isDemo), variables.monthKey],
      });
    },
  });
}

/**
 * Delete a general month note.
 */
export function useDeleteGeneralNoteMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (monthKey: MonthKey) =>
      isDemo ? demoApi.deleteGeneralNote(monthKey) : api.deleteGeneralNote(monthKey),
    onSuccess: (_data, monthKey) => {
      queryClient.invalidateQueries({
        queryKey: [...getQueryKey(queryKeys.monthNotes, isDemo), monthKey],
      });
    },
  });
}

/**
 * Delete an archived note.
 */
export function useDeleteArchivedNoteMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) =>
      isDemo ? demoApi.deleteArchivedNote(noteId) : api.deleteArchivedNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.archivedNotes, isDemo),
      });
    },
  });
}

/**
 * Sync categories and archive notes for deleted categories.
 */
export function useSyncNotesCategoriesMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => (isDemo ? demoApi.syncNotesCategories() : api.syncNotesCategories()),
    onSuccess: () => {
      // Invalidate both month notes and archived notes
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.monthNotes, isDemo),
      });
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.archivedNotes, isDemo),
      });
    },
  });
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Helper to invalidate all notes-related queries.
 */
export function useInvalidateNotes() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: getQueryKey(queryKeys.monthNotes, isDemo),
    });
    queryClient.invalidateQueries({
      queryKey: getQueryKey(queryKeys.archivedNotes, isDemo),
    });
    queryClient.invalidateQueries({
      queryKey: getQueryKey(queryKeys.noteHistory, isDemo),
    });
  };
}

// ============================================================================
// Checkbox State Queries
// ============================================================================

/**
 * Get checkbox states for a note.
 */
export function useCheckboxStatesQuery(
  noteId: string | undefined,
  viewingMonth: string,
  options?: { enabled?: boolean }
) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: [...getQueryKey(queryKeys.checkboxStates, isDemo), noteId, viewingMonth],
    queryFn: () =>
      isDemo
        ? demoApi.getCheckboxStates(noteId!, viewingMonth)
        : api.getCheckboxStates(noteId!, viewingMonth),
    enabled: !!noteId && options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get checkbox states for a general note.
 */
export function useGeneralCheckboxStatesQuery(
  monthKey: string | undefined,
  viewingMonth: string,
  options?: { enabled?: boolean }
) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: [...getQueryKey(queryKeys.checkboxStates, isDemo), 'general', monthKey, viewingMonth],
    queryFn: () =>
      isDemo
        ? demoApi.getGeneralCheckboxStates(monthKey!, viewingMonth)
        : api.getGeneralCheckboxStates(monthKey!, viewingMonth),
    enabled: !!monthKey && options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get all checkbox states for a month (bulk).
 */
export function useMonthCheckboxStatesQuery(monthKey: string) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: [...getQueryKey(queryKeys.checkboxStates, isDemo), 'month', monthKey],
    queryFn: () =>
      isDemo ? demoApi.getMonthCheckboxStates(monthKey) : api.getMonthCheckboxStates(monthKey),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Update a checkbox state.
 */
export function useUpdateCheckboxStateMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      noteId?: string;
      generalNoteMonthKey?: string;
      viewingMonth: string;
      checkboxIndex: number;
      isChecked: boolean;
    }) => (isDemo ? demoApi.updateCheckboxState(params) : api.updateCheckboxState(params)),
    onSuccess: (_data, variables) => {
      // Invalidate the specific checkbox query
      if (variables.noteId) {
        queryClient.invalidateQueries({
          queryKey: [
            ...getQueryKey(queryKeys.checkboxStates, isDemo),
            variables.noteId,
            variables.viewingMonth,
          ],
        });
      } else if (variables.generalNoteMonthKey) {
        queryClient.invalidateQueries({
          queryKey: [
            ...getQueryKey(queryKeys.checkboxStates, isDemo),
            'general',
            variables.generalNoteMonthKey,
            variables.viewingMonth,
          ],
        });
      }
      // Also invalidate bulk query for the month
      queryClient.invalidateQueries({
        queryKey: [...getQueryKey(queryKeys.checkboxStates, isDemo), 'month', variables.viewingMonth],
      });
    },
  });
}

// ============================================================================
// Notes Settings Queries
// ============================================================================

/**
 * Get notes settings.
 */
export function useNotesSettingsQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.notesSettings, isDemo),
    queryFn: () => (isDemo ? demoApi.getNotesSettings() : api.getNotesSettings()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Update notes settings.
 */
export function useUpdateNotesSettingsMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { checkboxMode?: 'persist' | 'reset' }) =>
      isDemo ? demoApi.updateNotesSettings(params) : api.updateNotesSettings(params),
    onSuccess: () => {
      // Invalidate settings
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.notesSettings, isDemo),
      });
      // Also invalidate all checkbox states since the mode changed
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.checkboxStates, isDemo),
      });
    },
  });
}
