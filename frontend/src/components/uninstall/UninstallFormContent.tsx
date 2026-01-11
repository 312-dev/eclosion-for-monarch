/**
 * UninstallFormContent - Form content for UninstallModal
 */

import { useMemo } from 'react';
import type { DeletableCategory } from '../../types';
import type { DeploymentInfo } from '../../api/client';
import { formatCurrency } from '../../utils';

type CategoryChoice = 'delete' | 'keep';

interface UninstallFormContentProps {
  readonly loading: boolean;
  readonly categories: DeletableCategory[];
  readonly categoryChoice: CategoryChoice;
  readonly onCategoryChoiceChange: (choice: CategoryChoice) => void;
  readonly confirmed: boolean;
  readonly onConfirmedChange: (confirmed: boolean) => void;
  readonly cancelling: boolean;
  readonly deploymentInfo: DeploymentInfo | null;
}

export function UninstallFormContent({
  loading,
  categories,
  categoryChoice,
  onCategoryChoiceChange,
  confirmed,
  onConfirmedChange,
  cancelling,
  deploymentInfo,
}: UninstallFormContentProps) {
  const currentMonth = useMemo(() => {
    return new Date().toLocaleString('default', { month: 'long' });
  }, []);

  const totalBudget = useMemo(() => {
    return categories.reduce((sum, cat) => sum + (cat.planned_budget ?? 0), 0);
  }, [categories]);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--monarch-error-bg)' }}>
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--monarch-error)' }}>
          This will permanently:
        </p>
        <ul className="text-sm space-y-1 ml-4 list-disc" style={{ color: 'var(--monarch-text-dark)' }}>
          <li>Clear your login credentials and log you out</li>
          {categories.length > 0 && (
            <li>
              Delete all {categories.length} auto-created {categories.length === 1 ? 'category' : 'categories'}
              {totalBudget > 0 && (
                <>, freeing up {formatCurrency(totalBudget)} in {currentMonth}'s budget</>
              )}
            </li>
          )}
        </ul>
      </div>

      <CategoryChoiceSection
        loading={loading}
        categories={categories}
        categoryChoice={categoryChoice}
        onCategoryChoiceChange={onCategoryChoiceChange}
        cancelling={cancelling}
      />

      {deploymentInfo?.is_railway && (
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
          <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            After uninstalling, you'll get a direct link to delete your Railway project and stop all future charges.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="confirm-input" className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
          Type <span className="font-mono px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}>DELETE ALL</span> to confirm
        </label>
        <input
          id="confirm-input"
          type="text"
          placeholder="DELETE ALL"
          onChange={(e) => onConfirmedChange(e.target.value.toUpperCase() === 'DELETE ALL')}
          disabled={cancelling}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: confirmed ? '1px solid var(--monarch-error)' : '1px solid var(--monarch-border)',
            color: 'var(--monarch-text-dark)',
          }}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

interface CategoryChoiceSectionProps {
  readonly loading: boolean;
  readonly categories: DeletableCategory[];
  readonly categoryChoice: CategoryChoice;
  readonly onCategoryChoiceChange: (choice: CategoryChoice) => void;
  readonly cancelling: boolean;
}

function CategoryChoiceSection({
  loading,
  categories,
  categoryChoice,
  onCategoryChoiceChange,
  cancelling,
}: CategoryChoiceSectionProps) {
  if (loading) {
    return (
      <div className="text-center py-4" style={{ color: 'var(--monarch-text-muted)' }}>
        Loading categories...
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
        <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          No auto-created categories to delete. All tracked categories were linked to existing categories.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
        What would you like to do with your auto-created categories?
      </p>

      <label
        className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
        style={{
          backgroundColor: categoryChoice === 'delete' ? 'var(--monarch-error-bg)' : 'var(--monarch-bg-page)',
          border: categoryChoice === 'delete' ? '1px solid var(--monarch-error)' : '1px solid var(--monarch-border)',
        }}
        aria-label="Delete categories from Monarch"
      >
        <input
          type="radio"
          name="categoryChoice"
          value="delete"
          checked={categoryChoice === 'delete'}
          onChange={() => onCategoryChoiceChange('delete')}
          disabled={cancelling}
          className="mt-0.5"
        />
        <div>
          <span className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            Delete them from Monarch
          </span>
          <p className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
            {categories.length} {categories.length === 1 ? 'category' : 'categories'} will be removed
          </p>
        </div>
      </label>

      <label
        className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          border: categoryChoice === 'keep' ? '1px solid var(--monarch-primary)' : '1px solid var(--monarch-border)',
        }}
        aria-label="Keep categories in Monarch"
      >
        <input
          type="radio"
          name="categoryChoice"
          value="keep"
          checked={categoryChoice === 'keep'}
          onChange={() => onCategoryChoiceChange('keep')}
          disabled={cancelling}
          className="mt-0.5"
        />
        <div>
          <span className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            Keep them in Monarch
          </span>
          <p className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
            Categories will remain in your Monarch account
          </p>
        </div>
      </label>

      {categoryChoice === 'delete' && (
        <div
          className="rounded-lg p-3 max-h-32 overflow-y-auto space-y-1"
          style={{ backgroundColor: 'var(--monarch-bg-page)' }}
        >
          {categories.map((cat) => (
            <div
              key={cat.category_id}
              className="flex items-center justify-between text-sm py-1"
            >
              <span style={{ color: 'var(--monarch-text-dark)' }}>
                {cat.name}
                {cat.is_rollup && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--monarch-orange-bg)', color: 'var(--monarch-orange)' }}>
                    rollup
                  </span>
                )}
              </span>
              <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                {cat.group_name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
