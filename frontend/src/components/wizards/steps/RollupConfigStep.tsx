/**
 * RollupConfigStep - Rollup category configuration step for the setup wizard
 */

import { SearchableSelect, type SelectGroup } from '../../SearchableSelect';
import type { UnmappedCategory } from '../../../types';
import { PackageIcon } from '../SetupWizardIcons';
import { formatCurrency } from '../../../utils';

interface RollupConfigStepProps {
  readonly mode: 'new' | 'existing';
  readonly onModeChange: (mode: 'new' | 'existing') => void;
  readonly categories: UnmappedCategory[];
  readonly selectedCategoryId: string;
  readonly onCategorySelect: (id: string) => void;
  readonly syncName: boolean;
  readonly onSyncNameChange: (sync: boolean) => void;
  readonly loading: boolean;
  readonly groupName: string;
  readonly autoCategorizeEnabled: boolean;
  readonly onAutoCategorizeChange: (enabled: boolean) => void;
}

export function RollupConfigStep({
  mode,
  onModeChange,
  categories,
  selectedCategoryId,
  onCategorySelect,
  syncName,
  onSyncNameChange,
  loading,
  groupName,
  autoCategorizeEnabled,
  onAutoCategorizeChange,
}: RollupConfigStepProps) {
  // Group categories by group_name for dropdown
  const categoryGroups: SelectGroup[] = Object.entries(
    categories.reduce((acc, cat) => {
      const group = cat.group_name || 'Other';
      acc[group] ??= [];
      acc[group].push(cat);
      return acc;
    }, {} as Record<string, UnmappedCategory[]>)
  ).map(([groupLabel, cats]) => ({
    label: groupLabel,
    options: cats.map((cat) => {
      const icon = cat.icon ? cat.icon + ' ' : '';
      const budget = formatCurrency(cat.planned_budget || 0, { maximumFractionDigits: 0 });
      return {
        value: cat.id,
        label: `${icon}${cat.name} - ${budget} budgeted`,
      };
    }),
  }));

  return (
    <div className="text-center animate-fade-in">
      <div className="mb-4 flex justify-center">
        <PackageIcon size={48} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        The Rollup Category
      </h2>
      <p className="mb-6" style={{ color: 'var(--monarch-text-muted)' }}>
        The rollup is a single catch-all category for smaller recurring charges. Would you like to use an existing category or create a new one?
      </p>

      {/* Mode selection */}
      <div className="space-y-3 mb-6">
        {/* Create new option */}
        <label
          className="flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all"
          style={{
            backgroundColor: mode === 'new' ? 'rgba(255, 105, 45, 0.08)' : 'var(--monarch-bg-page)',
            border: mode === 'new' ? '2px solid var(--monarch-orange)' : '1px solid var(--monarch-border)',
          }}
        >
          <input
            type="radio"
            name="rollupMode"
            checked={mode === 'new'}
            onChange={() => onModeChange('new')}
            className="mt-1"
            style={{ accentColor: 'var(--monarch-orange)' }}
          />
          <div className="text-left">
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Create new category
            </div>
            <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              A new "Recurring Rollup" category will be created in <strong>{groupName}</strong>
            </div>
          </div>
        </label>

        {/* Use existing option */}
        <label
          className="flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all"
          style={{
            backgroundColor: mode === 'existing' ? 'rgba(255, 105, 45, 0.08)' : 'var(--monarch-bg-page)',
            border: mode === 'existing' ? '2px solid var(--monarch-orange)' : '1px solid var(--monarch-border)',
          }}
        >
          <input
            type="radio"
            name="rollupMode"
            checked={mode === 'existing'}
            onChange={() => onModeChange('existing')}
            className="mt-1"
            style={{ accentColor: 'var(--monarch-orange)' }}
          />
          <div className="text-left flex-1">
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Use existing category
            </div>
            <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              Link the rollup to a category you already have in Monarch
            </div>
          </div>
        </label>
      </div>

      {/* Category selection (when existing mode) */}
      {mode === 'existing' && (
        <div
          className="rounded-lg p-4 text-left mb-6"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          {loading ? (
            <div className="text-center py-4" style={{ color: 'var(--monarch-text-muted)' }}>
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-4" style={{ color: 'var(--monarch-text-muted)' }}>
              No available categories found
            </div>
          ) : (
            <>
              <label id="category-select-label" className="block mb-2 text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                Select a category:
              </label>
              <div className="mb-3">
                <SearchableSelect
                  value={selectedCategoryId}
                  onChange={onCategorySelect}
                  groups={categoryGroups}
                  placeholder="Choose a category..."
                  searchPlaceholder="Search categories..."
                  loading={loading}
                  aria-labelledby="category-select-label"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncName}
                  onChange={(e) => onSyncNameChange(e.target.checked)}
                  style={{ accentColor: 'var(--monarch-orange)' }}
                />
                <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                  Rename category to "Recurring Rollup"
                </span>
              </label>
            </>
          )}
        </div>
      )}

      <p className="text-sm mb-6" style={{ color: 'var(--monarch-text-muted)' }}>
        You can configure which items go into the rollup from the dashboard after setup.
      </p>

      {/* Auto-categorize option */}
      <div
        className="rounded-lg p-4 text-left mb-4"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <label htmlFor="auto-categorize-checkbox" className="flex items-start gap-3 cursor-pointer">
          <input
            id="auto-categorize-checkbox"
            type="checkbox"
            checked={autoCategorizeEnabled}
            onChange={(e) => onAutoCategorizeChange(e.target.checked)}
            className="mt-1"
            style={{ accentColor: 'var(--monarch-orange)' }}
            aria-describedby="auto-categorize-description"
          />
          <div>
            <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Auto-categorize new transactions
            </span>
            <p id="auto-categorize-description" className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              Automatically categorize new recurring transactions to their tracking categories during sync
            </p>
          </div>
        </label>
      </div>

      {/* Advisory text about past transactions */}
      <div
        className="rounded-lg p-3 text-left text-sm"
        style={{
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          color: 'var(--monarch-text-muted)',
        }}
      >
        <strong style={{ color: 'var(--monarch-text-dark)' }}>For historical accuracy:</strong>{' '}
        You can manually re-categorize past transactions to their tracking categories in Monarch&apos;s
        Transactions view. This helps ensure your reports accurately reflect spending over time.
      </div>
    </div>
  );
}
