/**
 * Notes Data Transformation
 *
 * Transforms flat API response into hierarchical category structure.
 */

import type {
  CategoryGroupWithNotes,
  CategoryWithNotes,
  EffectiveGeneralNote,
  EffectiveNote,
  GeneralMonthNote,
  MonthKey,
  Note,
  NotesCategoryGroup,
} from '../types/notes';

interface EffectiveNoteData {
  note: Note;
  source_month: MonthKey;
  is_inherited: boolean;
}

interface EffectiveGeneralNoteData {
  note: GeneralMonthNote;
  source_month: MonthKey;
  is_inherited: boolean;
}

interface MonthNotesResponse {
  month_key: MonthKey;
  last_updated: string | null;
  effective_notes: Record<string, EffectiveNoteData>;
  effective_general_note: EffectiveGeneralNoteData | null;
}

/**
 * Create an empty effective note (no note exists)
 */
function createEmptyEffectiveNote(): EffectiveNote {
  return {
    note: null,
    sourceMonth: null,
    isInherited: false,
  };
}

/**
 * Convert API effective note data to EffectiveNote type
 */
function convertEffectiveNote(data: EffectiveNoteData | undefined): EffectiveNote {
  if (!data) {
    return createEmptyEffectiveNote();
  }
  return {
    note: data.note,
    sourceMonth: data.source_month,
    isInherited: data.is_inherited,
  };
}

/**
 * Convert API effective general note data to EffectiveGeneralNote type
 */
export function convertEffectiveGeneralNote(
  data: EffectiveGeneralNoteData | null | undefined
): EffectiveGeneralNote | null {
  if (!data) {
    return null;
  }
  return {
    note: data.note,
    sourceMonth: data.source_month,
    isInherited: data.is_inherited,
  };
}

/**
 * Build hierarchical category groups with notes from flat API response.
 *
 * @param monthNotesData - Flat API response with effective_notes map
 * @param notesCategories - All categories from Monarch organized by group
 * @returns Hierarchical CategoryGroupWithNotes array
 */
export function buildCategoryGroupsWithNotes(
  monthNotesData: MonthNotesResponse | null | undefined,
  notesCategories: NotesCategoryGroup[]
): CategoryGroupWithNotes[] {
  const effectiveNotes = monthNotesData?.effective_notes ?? {};

  // Build the hierarchical structure from notes categories
  const result: CategoryGroupWithNotes[] = [];

  for (const group of notesCategories) {
    const groupKey = `group:${group.id}`;
    const groupEffectiveNote = convertEffectiveNote(effectiveNotes[groupKey]);

    const categories: CategoryWithNotes[] = group.categories.map((category) => {
      const categoryKey = `category:${category.id}`;
      const categoryEffectiveNote = convertEffectiveNote(effectiveNotes[categoryKey]);

      return {
        id: category.id,
        name: category.name,
        groupId: group.id,
        ...(category.icon !== undefined && { icon: category.icon }),
        effectiveNote: categoryEffectiveNote,
      };
    });

    // Sort categories alphabetically
    categories.sort((a, b) => a.name.localeCompare(b.name));

    result.push({
      id: group.id,
      name: group.name,
      effectiveNote: groupEffectiveNote,
      categories,
      isExpanded: false,
    });
  }

  return result;
}

/**
 * Check if any notes exist in the hierarchical structure
 */
export function hasAnyNotes(
  groups: CategoryGroupWithNotes[],
  effectiveGeneralNote: { note: { content: string } | null } | null | undefined
): boolean {
  if (effectiveGeneralNote?.note?.content) {
    return true;
  }

  for (const group of groups) {
    if (group.effectiveNote.note) {
      return true;
    }
    for (const category of group.categories) {
      if (category.effectiveNote.note) {
        return true;
      }
    }
  }

  return false;
}
