/**
 * Notes Tool Settings
 *
 * Settings component for the Monthly Notes feature.
 * Includes hidden categories management with variant support for page and modal contexts.
 */

import { useState, forwardRef, useCallback } from 'react';
import { EyeOff } from 'lucide-react';
import { useHiddenCategories } from '../../hooks';
import { NotesIcon } from '../wizards/SetupWizardIcons';
import { ToolSettingsHeader } from './ToolSettingsHeader';
import { SettingsRow } from './SettingsRow';
import { HiddenCategoriesModal } from './HiddenCategoriesModal';

interface NotesToolSettingsProps {
  defaultExpanded?: boolean;
  variant?: 'page' | 'modal';
}

export const NotesToolSettings = forwardRef<HTMLDivElement, NotesToolSettingsProps>(
  function NotesToolSettings({ defaultExpanded = false, variant = 'page' }, ref) {
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

    const containerClass =
      variant === 'modal' ? 'overflow-hidden' : 'sm:rounded-xl overflow-hidden';
    const containerStyle =
      variant === 'modal'
        ? {}
        : {
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          };

    // Show settings when in modal mode OR when expanded in page mode
    const showSettings = variant === 'modal' || isExpanded;

    return (
      <>
        <div ref={ref} className={containerClass} style={containerStyle}>
          {/* Only show header in page mode */}
          {variant === 'page' && (
            <ToolSettingsHeader
              icon={<NotesIcon size={20} />}
              title="Monthly Notes"
              description="Add notes to categories and months"
              isActive={true}
              isExpanded={isExpanded}
              onToggle={toggleExpanded}
            />
          )}

          {/* Settings - Show in modal mode OR when expanded in page mode */}
          {showSettings && (
            <div
              style={
                variant === 'page'
                  ? { borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }
                  : {}
              }
            >
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
  }
);
