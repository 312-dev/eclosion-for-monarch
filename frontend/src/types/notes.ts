/**
 * Monthly Notes Type Definitions
 *
 * Types for the Monthly Notes feature that allows users to attach
 * markdown notes to Monarch category groups and categories.
 * Notes support time-based inheritance and are stored locally.
 */

/**
 * Month key format: "YYYY-MM" (e.g., "2025-01")
 * Used as the primary identifier for month-based lookups.
 *
 * This branded type provides:
 * 1. Semantic documentation that this is specifically a month key, not any string
 * 2. Intentional friction when passing arbitrary strings as month keys
 *
 * Use `as MonthKey` when creating month keys from known valid sources.
 */
export type MonthKey = string & { readonly __brand?: 'MonthKey' };

/**
 * Reference to a category or category group in Monarch
 */
export interface CategoryReference {
  /** Whether this is a group or individual category */
  type: 'group' | 'category';
  /** Monarch category_id or group_id */
  id: string;
  /** Display name */
  name: string;
  /** For categories, their parent group ID */
  groupId?: string;
  /** For categories, their parent group name */
  groupName?: string;
}

/**
 * A single note entry attached to a category or group
 */
export interface Note {
  /** UUID for the note */
  id: string;
  /** Reference to the category or group this note is attached to */
  categoryRef: CategoryReference;
  /** The month when this note was explicitly set (not inherited) */
  monthKey: MonthKey;
  /** Markdown content of the note */
  content: string;
  /** ISO timestamp when note was created */
  createdAt: string;
  /** ISO timestamp when note was last modified */
  updatedAt: string;
}

/**
 * General notes for a month (not tied to any category)
 */
export interface GeneralMonthNote {
  /** UUID for the note */
  id: string;
  /** The month this note is for */
  monthKey: MonthKey;
  /** Markdown content of the note */
  content: string;
  /** ISO timestamp when note was created */
  createdAt: string;
  /** ISO timestamp when note was last modified */
  updatedAt: string;
}

/**
 * Metadata about a month's notes
 */
export interface MonthMetadata {
  /** The month key */
  monthKey: MonthKey;
  /** Most recent edit to any note this month (category or general) */
  lastUpdatedAt: string | null;
}

/**
 * An archived note (category was deleted from Monarch)
 */
export interface ArchivedNote extends Note {
  /** ISO timestamp when note was archived */
  archivedAt: string;
  /** Original category name before deletion */
  originalCategoryName: string;
  /** Original group name before deletion (for categories) */
  originalGroupName?: string;
}

/**
 * The effective note for display, which may be inherited from an earlier month.
 * This is the result of the inheritance lookup algorithm.
 */
export interface EffectiveNote {
  /** The note content, or null if no note exists */
  note: Note | null;
  /** Which month the note originates from */
  sourceMonth: MonthKey | null;
  /** True if note is inherited from an earlier month */
  isInherited: boolean;
}

/**
 * The effective general note for display, which may be inherited from an earlier month.
 * Same concept as EffectiveNote but for general month notes.
 */
export interface EffectiveGeneralNote {
  /** The general note content, or null if no note exists */
  note: GeneralMonthNote | null;
  /** Which month the note originates from */
  sourceMonth: MonthKey | null;
  /** True if note is inherited from an earlier month */
  isInherited: boolean;
}

/**
 * A category group with its effective note and child categories
 */
export interface CategoryGroupWithNotes {
  /** Monarch group ID */
  id: string;
  /** Group display name */
  name: string;
  /** The effective note for this group */
  effectiveNote: EffectiveNote;
  /** Child categories with their notes */
  categories: CategoryWithNotes[];
  /** Whether this group is expanded in the UI */
  isExpanded: boolean;
}

/**
 * A category with its effective note
 */
export interface CategoryWithNotes {
  /** Monarch category ID */
  id: string;
  /** Category display name */
  name: string;
  /** Parent group ID */
  groupId: string;
  /** Category icon/emoji if available */
  icon?: string;
  /** The effective note for this category */
  effectiveNote: EffectiveNote;
}

/**
 * Full state for a month view
 */
export interface MonthNotesState {
  /** The month being viewed */
  monthKey: MonthKey;
  /** Metadata about this month */
  metadata: MonthMetadata;
  /** Category groups with their notes */
  groups: CategoryGroupWithNotes[];
  /** Effective general month note (may be inherited from earlier month) */
  effectiveGeneralNote: EffectiveGeneralNote | null;
  /** Archived notes from deleted categories */
  archivedNotes: ArchivedNote[];
}

/**
 * A note version entry for revision history
 */
export interface NoteVersion {
  /** The month when this version was set */
  monthKey: MonthKey;
  /** Preview of the note content (first ~100 chars) */
  contentPreview: string;
  /** Full content */
  content: string;
  /** Whether this is the currently viewed month */
  isCurrent: boolean;
  /** ISO timestamp when this version was created */
  createdAt: string;
}

/**
 * Revision history for a category or group's notes
 */
export interface NoteRevisionHistory {
  /** Reference to the category/group */
  categoryRef: CategoryReference;
  /** All versions of notes for this category/group, sorted by month */
  versions: NoteVersion[];
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to save a category note
 */
export interface SaveCategoryNoteRequest {
  /** Type of target (group or category) */
  categoryType: 'group' | 'category';
  /** Monarch ID of the category or group */
  categoryId: string;
  /** Display name */
  categoryName: string;
  /** For categories, parent group ID */
  groupId?: string;
  /** For categories, parent group name */
  groupName?: string;
  /** Month to save the note for */
  monthKey: MonthKey;
  /** Markdown content */
  content: string;
}

/**
 * Request to save a general month note
 */
export interface SaveGeneralNoteRequest {
  /** Month to save the note for */
  monthKey: MonthKey;
  /** Markdown content */
  content: string;
}

/**
 * Request to export notes as PDF
 */
export interface ExportNotesRequest {
  /** Start month (inclusive) */
  startMonth: MonthKey;
  /** End month (inclusive) */
  endMonth: MonthKey;
  /** Whether to include category notes */
  includeCategoryNotes: boolean;
  /** Whether to include general month notes */
  includeGeneralNotes: boolean;
}

/**
 * Response from saving a note
 */
export interface SaveNoteResponse {
  /** Whether the save was successful */
  success: boolean;
  /** The saved note */
  note?: Note | GeneralMonthNote;
  /** Error message if save failed */
  error?: string;
}

/**
 * Response from getting month notes
 */
export interface GetMonthNotesResponse {
  /** The month notes state */
  data: MonthNotesState;
}

/**
 * Response from getting revision history
 */
export interface GetRevisionHistoryResponse {
  /** The revision history */
  history: NoteRevisionHistory;
}

// ============================================================================
// Checkbox State Types
// ============================================================================

/**
 * Checkbox states for a note
 */
export interface CheckboxStates {
  /** Array of checked states, indexed by checkbox position in markdown */
  states: boolean[];
}

/**
 * Request to update a checkbox state
 */
export interface UpdateCheckboxRequest {
  /** Note ID for category/group notes */
  noteId?: string;
  /** Month key for general notes */
  generalNoteMonthKey?: string;
  /** The month being viewed */
  viewingMonth: string;
  /** Checkbox position in the markdown (0-indexed) */
  checkboxIndex: number;
  /** New checked state */
  isChecked: boolean;
}

/**
 * Response from getting checkbox states
 */
export interface GetCheckboxStatesResponse {
  /** Array of checkbox states */
  states: boolean[];
}

/**
 * Response from getting all checkbox states for a month
 */
export interface GetMonthCheckboxStatesResponse {
  /** Map of note_id -> checkbox states */
  states: Record<string, boolean[]>;
}

/**
 * Response from updating checkbox state
 */
export interface UpdateCheckboxResponse {
  success: boolean;
  /** Updated checkbox states */
  states: boolean[];
}

// ============================================================================
// Notes Categories Types
// ============================================================================

/**
 * A category within a group for the notes feature
 */
export interface NotesCategory {
  /** Monarch category ID */
  id: string;
  /** Category display name */
  name: string;
  /** Category icon/emoji if available */
  icon?: string;
}

/**
 * A category group with its categories for the notes feature
 */
export interface NotesCategoryGroup {
  /** Monarch group ID */
  id: string;
  /** Group display name */
  name: string;
  /** Categories within this group */
  categories: NotesCategory[];
}

/**
 * Response from getting all notes categories
 */
export interface GetNotesCategoriesResponse {
  /** All category groups with their categories */
  groups: NotesCategoryGroup[];
}
