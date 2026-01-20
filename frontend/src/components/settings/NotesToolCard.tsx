/**
 * Notes Tool Card
 *
 * Settings card for the Monthly Notes feature.
 * Displays as a separate card under Tool Settings.
 */

import { useState, useCallback, forwardRef } from 'react';
import { EyeOff } from 'lucide-react';
import { useHiddenCategories } from '../../hooks';
import { NotesToolSettings } from './NotesToolSettings';
import { HiddenCategoriesModal } from './HiddenCategoriesModal';
import { SettingsRow } from './SettingsRow';

interface NotesToolCardProps {
  defaultExpanded?: boolean;
}

export const NotesToolCard = forwardRef<HTMLDivElement, NotesToolCardProps>(
  function NotesToolCard({ defaultExpanded = false }, ref) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showHiddenCategoriesModal, setShowHiddenCategoriesModal] = useState(false);

  const toggleExpanded = useCallback(() => setIsExpanded((prev) => !prev), []);

  const {
    hiddenGroups,
    hiddenCategories,
    hiddenCount,
    toggleGroup: toggleHiddenGroup,
    toggleCategory: toggleHiddenCategory,
  } = useHiddenCategories();

  return (
    <>
      <div
        ref={ref}
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <NotesToolSettings isExpanded={isExpanded} onToggle={toggleExpanded} />

        {/* Hidden categories setting - only show when expanded */}
        {isExpanded && (
          <div style={{ borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}>
            <SettingsRow
              label="Hidden categories"
              description="Categories hidden from the notes view"
              isLast
            >
              <button
                type="button"
                onClick={() => setShowHiddenCategoriesModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-(--monarch-bg-hover)"
                style={{
                  color: 'var(--monarch-text-dark)',
                  border: '1px solid var(--monarch-border)',
                }}
              >
                <EyeOff size={14} style={{ color: 'var(--monarch-text-muted)' }} />
                {hiddenCount > 0 ? `${hiddenCount} hidden` : 'None'}
              </button>
            </SettingsRow>
          </div>
        )}
      </div>

      {/* Hidden Categories Modal */}
      <HiddenCategoriesModal
        isOpen={showHiddenCategoriesModal}
        onClose={() => setShowHiddenCategoriesModal(false)}
        hiddenGroups={hiddenGroups}
        hiddenCategories={hiddenCategories}
        onToggleGroup={toggleHiddenGroup}
        onToggleCategory={toggleHiddenCategory}
      />
    </>
  );
});
