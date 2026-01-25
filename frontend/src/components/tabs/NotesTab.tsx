/**
 * Notes Tab
 *
 * Main tab for monthly notes feature.
 * - Category tree with expandable groups
 * - Notes for each category and group
 * - General month notes in sidebar
 * - PDF export capability
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import { CategoryTree, GeneralMonthNotes, MonthYearSelector, ExportNotesModal } from '../notes';
import { ContentLoadingSpinner } from '../ui/LoadingSpinner';
import { EXPAND_FIRST_GROUP_EVENT } from '../layout/notesTourSteps';
import { useAllNotesQuery, useMonthNotesQuery } from '../../api/queries';
import { useCategoriesByGroup } from '../../api/queries/categoryStoreQueries';
import { usePageTitle, useHiddenCategories, useNotesTour, useLocalStorage } from '../../hooks';
import { useToast } from '../../context/ToastContext';
import { NotesEditorProvider } from '../../context/NotesEditorContext';
import { ToolPageHeader, ToolSettingsModal } from '../ui';
import { NotesIcon } from '../wizards/SetupWizardIcons';
import {
  buildCategoryGroupsWithNotes,
  convertEffectiveGeneralNote,
  hasAnyNotes,
} from '../../utils';
import { STORAGE_KEYS } from '../../constants';
import type { MonthKey, EffectiveGeneralNote, CategoryGroupWithNotes } from '../../types/notes';

/**
 * Notes UI state persisted to localStorage
 */
interface NotesUIState {
  expandedGroups: string[];
  scrollTop: number;
}

/**
 * Get current month key
 */
function getCurrentMonthKey(): MonthKey {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const DEFAULT_UI_STATE: NotesUIState = {
  expandedGroups: [],
  scrollTop: 0,
};

export function NotesTab() {
  const [currentMonth, setCurrentMonth] = useState<MonthKey>(getCurrentMonthKey());
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const toast = useToast();

  // Persist UI state (expanded groups and scroll position) to localStorage
  const [uiState, setUIState] = useLocalStorage<NotesUIState>(
    STORAGE_KEYS.NOTES_UI_STATE,
    DEFAULT_UI_STATE
  );

  // Convert stored array to Set for efficient lookups
  const expandedGroups = useMemo(() => new Set(uiState.expandedGroups), [uiState.expandedGroups]);

  // Update expanded groups in localStorage
  const setExpandedGroups = useCallback(
    (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      setUIState((prev) => {
        const prevSet = new Set(prev.expandedGroups);
        const newSet = typeof updater === 'function' ? updater(prevSet) : updater;
        return { ...prev, expandedGroups: Array.from(newSet) };
      });
    },
    [setUIState]
  );

  // Hidden categories
  const { hiddenGroups, hiddenCategories } = useHiddenCategories();

  // Set page title
  usePageTitle('Notes');

  // Preload all notes data into cache for instant navigation
  useAllNotesQuery();

  // Fetch month notes data (will use cached data from preload)
  const { data: monthData, isLoading: notesLoading } = useMonthNotesQuery(currentMonth);

  // Fetch all Monarch categories from the shared category store
  const { data: notesCategories, isLoading: categoriesLoading } = useCategoriesByGroup();

  const isLoading = notesLoading || categoriesLoading;

  // Extract data from responses
  const effectiveGeneralNote: EffectiveGeneralNote | null = convertEffectiveGeneralNote(
    monthData?.effective_general_note
  );

  // Build hierarchical structure from notes categories
  const allGroups: CategoryGroupWithNotes[] = useMemo(() => {
    return buildCategoryGroupsWithNotes(monthData, notesCategories ?? []);
  }, [monthData, notesCategories]);

  // Filter out hidden groups and categories
  const groups: CategoryGroupWithNotes[] = useMemo(() => {
    return allGroups
      .filter((group) => !hiddenGroups.includes(group.id))
      .map((group) => ({
        ...group,
        categories: group.categories.filter((category) => !hiddenCategories.includes(category.id)),
      }));
  }, [allGroups, hiddenGroups, hiddenCategories]);

  // Check if there are any notes
  const hasNotes = useMemo(
    () => hasAnyNotes(groups, effectiveGeneralNote),
    [groups, effectiveGeneralNote]
  );

  // Get tour state to auto-expand first group for tour
  const { hasSeenTour } = useNotesTour();

  // Track whether we've auto-expanded for the tour
  const hasAutoExpanded = useRef(false);

  // Auto-expand first group when tour hasn't been seen (so tour can highlight category)
  // This is a one-time initialization based on async data, not a cascading render pattern
  useEffect(() => {
    const firstGroup = groups[0];
    if (!hasAutoExpanded.current && !hasSeenTour && firstGroup) {
      hasAutoExpanded.current = true;
      setExpandedGroups(new Set([firstGroup.id]));
    }
  }, [hasSeenTour, groups, setExpandedGroups]);

  // Listen for tour event to expand first group (in case user collapsed it during tour)
  useEffect(() => {
    const handleExpandFirstGroup = () => {
      const firstGroup = groups[0];
      if (firstGroup) {
        setExpandedGroups((prev) => new Set([...prev, firstGroup.id]));
      }
    };

    globalThis.addEventListener(EXPAND_FIRST_GROUP_EVENT, handleExpandFirstGroup);
    return () => {
      globalThis.removeEventListener(EXPAND_FIRST_GROUP_EVENT, handleExpandFirstGroup);
    };
  }, [groups, setExpandedGroups]);

  // Restore scroll position on mount (after loading completes)
  const hasRestoredScroll = useRef(false);
  useEffect(() => {
    if (!isLoading && !hasRestoredScroll.current && uiState.scrollTop > 0) {
      hasRestoredScroll.current = true;
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        globalThis.scrollTo(0, uiState.scrollTop);
      });
    }
  }, [isLoading, uiState.scrollTop]);

  // Save scroll position on scroll (debounced)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setUIState((prev) => ({
          ...prev,
          scrollTop: globalThis.scrollY,
        }));
      }, 150); // Debounce to avoid excessive writes
    };

    globalThis.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      globalThis.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [setUIState]);

  // Group expansion handlers
  const handleToggleGroup = useCallback(
    (groupId: string) => {
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        if (next.has(groupId)) {
          next.delete(groupId);
        } else {
          next.add(groupId);
        }
        return next;
      });
    },
    [setExpandedGroups]
  );

  const handleExpandAll = useCallback(() => {
    setExpandedGroups(new Set(groups.map((g) => g.id)));
  }, [groups, setExpandedGroups]);

  const handleCollapseAll = useCallback(() => {
    setExpandedGroups(new Set());
  }, [setExpandedGroups]);

  // Open export modal
  const handleOpenExportModal = useCallback(() => {
    if (!hasNotes) {
      toast.error('No notes to export');
      return;
    }
    setShowExportModal(true);
  }, [hasNotes, toast]);

  // Loading state
  if (isLoading) {
    return <ContentLoadingSpinner message="Loading notes..." fullHeight />;
  }

  return (
    <NotesEditorProvider>
      <div className="max-w-7xl mx-auto px-4 tab-content-enter">
        {/* Header */}
        <ToolPageHeader
          icon={<NotesIcon size={40} />}
          title="Monthly Notes"
          description="Add notes to categories and months"
          actions={
            <button
              type="button"
              onClick={handleOpenExportModal}
              disabled={!hasNotes}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                hasNotes ? 'hover:bg-(--monarch-bg-hover)' : 'opacity-50 cursor-not-allowed'
              }`}
              style={{ color: 'var(--monarch-text-muted)' }}
              title={hasNotes ? 'Export notes' : 'No notes to export'}
              data-tour="export-notes"
            >
              <Download size={14} />
              Export
            </button>
          }
          onSettingsClick={() => setShowSettingsModal(true)}
        />

        {/* Month navigation */}
        <div className="mb-4 lg:mb-6">
          <MonthYearSelector currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
        </div>

        {/* General month notes - mobile only (stacked below navigator) */}
        <div className="block lg:hidden mb-6">
          <GeneralMonthNotes monthKey={currentMonth} effectiveNote={effectiveGeneralNote} />
        </div>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Category tree (2/3 width on desktop, full width on mobile) */}
          <div className="lg:col-span-2">
            <CategoryTree
              groups={groups}
              expandedGroups={expandedGroups}
              onToggleGroup={handleToggleGroup}
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
              currentMonth={currentMonth}
            />
          </div>

          {/* General month notes sidebar - desktop only (1/3 width) */}
          <div className="hidden lg:block lg:col-span-1">
            <GeneralMonthNotes
              monthKey={currentMonth}
              effectiveNote={effectiveGeneralNote}
              dataTourId="general-notes"
            />
          </div>
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <ExportNotesModal
            currentMonth={currentMonth}
            groups={groups}
            onClose={() => setShowExportModal(false)}
          />
        )}

        {/* Settings Modal */}
        <ToolSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          tool="notes"
        />
      </div>
    </NotesEditorProvider>
  );
}
