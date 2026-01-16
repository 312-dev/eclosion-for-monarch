/**
 * Export Notes Modal
 *
 * Modal for exporting notes to PDF/print with options for:
 * - Date range selection (start/end month)
 * - Category/category group selection
 * - Include general month notes option
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download } from 'lucide-react';
import { Portal } from '../Portal';
import { useAllNotesQuery, useMonthCheckboxStatesQuery } from '../../api/queries';
import { useExportSelection } from '../../hooks/useExportSelection';
import { getMonthRange, buildExportHtml } from '../../utils/notesExport';
import { DateRangeSelector } from './DateRangeSelector';
import { ExportGroupRow } from './ExportGroupRow';
import type { MonthKey, CategoryGroupWithNotes } from '../../types/notes';

interface ExportNotesModalProps {
  /** Current month displayed in the UI */
  currentMonth: MonthKey;
  /** Category groups with notes */
  groups: CategoryGroupWithNotes[];
  /** Close the modal */
  onClose: () => void;
}

export function ExportNotesModal({
  currentMonth,
  groups,
  onClose,
}: Readonly<ExportNotesModalProps>) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Date range state - default to current month only
  const [startMonth, setStartMonth] = useState<MonthKey>(currentMonth);
  const [endMonth, setEndMonth] = useState<MonthKey>(currentMonth);

  // Selection state (extracted to hook)
  const {
    includeMonthNotes,
    setIncludeMonthNotes,
    selectedGroups,
    selectedCategories,
    expandedGroups,
    handleToggleGroupExpand,
    handleToggleGroup,
    handleToggleCategory,
    handleSelectAll,
    handleDeselectAll,
    hasSelection,
  } = useExportSelection({ groups });

  // Fetch all notes data for date range processing
  const { data: allNotesData } = useAllNotesQuery();

  // Fetch checkbox states for the current month (for single month export)
  const { data: checkboxStates, isLoading: isLoadingCheckboxes } = useMonthCheckboxStatesQuery(
    startMonth === endMonth ? startMonth : currentMonth
  );

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleExport = useCallback(() => {
    if (!allNotesData || isLoadingCheckboxes) return;

    const monthRange = getMonthRange(startMonth, endMonth);
    const htmlContent = buildExportHtml(
      monthRange,
      allNotesData,
      groups,
      selectedGroups,
      selectedCategories,
      includeMonthNotes,
      checkboxStates ?? {}
    );

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          iframe.remove();
        }, 1000);
      }, 250);
    }

    onClose();
  }, [
    allNotesData,
    isLoadingCheckboxes,
    startMonth,
    endMonth,
    groups,
    selectedGroups,
    selectedCategories,
    includeMonthNotes,
    checkboxStates,
    onClose,
  ]);

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 'var(--z-index-modal)', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <div
          ref={modalRef}
          className="rounded-xl shadow-lg w-full max-w-lg max-h-[85vh] flex flex-col"
          style={{ backgroundColor: 'var(--monarch-bg-card)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-modal-title"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b shrink-0"
            style={{ borderColor: 'var(--monarch-border)' }}
          >
            <div className="flex items-center gap-2">
              <Download size={18} style={{ color: 'var(--monarch-orange)' }} />
              <h2
                id="export-modal-title"
                className="font-semibold"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                Export Notes
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-(--monarch-bg-hover) transition-colors"
              aria-label="Close"
            >
              <X size={18} style={{ color: 'var(--monarch-text-muted)' }} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Date Range Section */}
            <DateRangeSelector
              startMonth={startMonth}
              endMonth={endMonth}
              onStartChange={setStartMonth}
              onEndChange={setEndMonth}
            />

            {/* Include Month Notes */}
            <div
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: 'var(--monarch-bg-page)' }}
            >
              <input
                type="checkbox"
                id="include-month-notes"
                checked={includeMonthNotes}
                onChange={(e) => setIncludeMonthNotes(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
                style={{ accentColor: 'var(--monarch-orange)' }}
              />
              <label
                htmlFor="include-month-notes"
                className="text-sm cursor-pointer"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                Include general month notes
              </label>
            </div>

            {/* Category Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                  Categories & Groups
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--monarch-orange)' }}
                  >
                    Select all
                  </button>
                  <span style={{ color: 'var(--monarch-text-muted)' }}>|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--monarch-orange)' }}
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              <div
                className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto"
                style={{ borderColor: 'var(--monarch-border)' }}
              >
                {groups.map((group) => (
                  <ExportGroupRow
                    key={group.id}
                    group={group}
                    isExpanded={expandedGroups.has(group.id)}
                    isSelected={selectedGroups.has(group.id)}
                    selectedCategories={selectedCategories}
                    onToggleExpand={() => handleToggleGroupExpand(group.id)}
                    onToggleGroup={(checked) => handleToggleGroup(group.id, checked)}
                    onToggleCategory={handleToggleCategory}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3 px-4 py-3 border-t shrink-0"
            style={{ borderColor: 'var(--monarch-border)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-(--monarch-bg-hover) transition-colors"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={!hasSelection || !allNotesData || isLoadingCheckboxes}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                hasSelection && allNotesData && !isLoadingCheckboxes
                  ? 'hover:opacity-90'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{
                backgroundColor: 'var(--monarch-orange)',
                color: 'white',
              }}
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
