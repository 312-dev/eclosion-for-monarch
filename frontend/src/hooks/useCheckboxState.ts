/**
 * useCheckboxState
 *
 * Hook for managing checkbox state in notes.
 * Fetches checkbox states and provides a toggle function that updates the backend.
 * Respects the global persist/reset mode setting.
 */

import { useCallback } from 'react';
import {
  useCheckboxStatesQuery,
  useGeneralCheckboxStatesQuery,
  useUpdateCheckboxStateMutation,
} from '../api/queries/notesQueries';

interface UseCheckboxStateOptions {
  /** Note ID for category/group notes */
  noteId?: string;
  /** Month key for general notes */
  generalNoteMonthKey?: string;
  /** Current viewing month */
  viewingMonth: string;
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseCheckboxStateReturn {
  /** Array of checkbox states (true = checked) */
  checkboxStates: boolean[];
  /** Toggle a specific checkbox */
  toggleCheckbox: (index: number, isChecked: boolean) => void;
  /** Whether the checkbox states are loading */
  isLoading: boolean;
  /** Whether a checkbox update is pending */
  isUpdating: boolean;
}

/**
 * Hook for managing checkbox state in notes.
 *
 * @example
 * ```tsx
 * const { checkboxStates, toggleCheckbox, isLoading } = useCheckboxState({
 *   noteId: 'note-123',
 *   viewingMonth: '2024-01',
 * });
 *
 * // For general notes:
 * const { checkboxStates, toggleCheckbox } = useCheckboxState({
 *   generalNoteMonthKey: '2024-01',
 *   viewingMonth: '2024-01',
 * });
 * ```
 */
export function useCheckboxState({
  noteId,
  generalNoteMonthKey,
  viewingMonth,
  enabled = true,
}: UseCheckboxStateOptions): UseCheckboxStateReturn {
  // Query for category/group note checkbox states
  const categoryQuery = useCheckboxStatesQuery(noteId, viewingMonth, {
    enabled: enabled && !!noteId && !generalNoteMonthKey,
  });

  // Query for general note checkbox states
  const generalQuery = useGeneralCheckboxStatesQuery(generalNoteMonthKey, viewingMonth, {
    enabled: enabled && !!generalNoteMonthKey && !noteId,
  });

  // Mutation for updating checkbox state
  const updateMutation = useUpdateCheckboxStateMutation();

  // Determine which query result to use
  const query = noteId ? categoryQuery : generalQuery;
  const checkboxStates = query.data ?? [];

  // Toggle checkbox callback
  const toggleCheckbox = useCallback(
    (index: number, isChecked: boolean) => {
      updateMutation.mutate({
        ...(noteId !== undefined && { noteId }),
        ...(generalNoteMonthKey !== undefined && { generalNoteMonthKey }),
        viewingMonth,
        checkboxIndex: index,
        isChecked,
      });
    },
    [noteId, generalNoteMonthKey, viewingMonth, updateMutation]
  );

  return {
    checkboxStates,
    toggleCheckbox,
    isLoading: query.isLoading,
    isUpdating: updateMutation.isPending,
  };
}
