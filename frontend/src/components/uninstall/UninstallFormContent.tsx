/**
 * UninstallFormContent - Form content for UninstallModal
 */

import type { DeletableCategory } from '../../types';
import type { DeploymentInfo } from '../../api/client';

type CategoryChoice = 'delete' | 'keep';

interface UninstallFormContentProps {
  readonly loading: boolean;
  readonly categories: DeletableCategory[];
  readonly categoryChoice: CategoryChoice;
  readonly onCategoryChoiceChange: (choice: CategoryChoice) => void;
  readonly confirmed: boolean;
  readonly onConfirmedChange: (confirmed: boolean) => void;
  readonly fullReset: boolean;
  readonly onFullResetChange: (fullReset: boolean) => void;
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
  fullReset,
  onFullResetChange,
  cancelling,
  deploymentInfo,
}: UninstallFormContentProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--monarch-error-bg)' }}>
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--monarch-error)' }}>
          This will permanently:
        </p>
        <ul className="text-sm space-y-1 ml-4 list-disc" style={{ color: 'var(--monarch-text-dark)' }}>
          <li>Clear your stored credentials and app data</li>
          <li>Log you out of the app</li>
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

      <label className="flex items-start gap-3 cursor-pointer" aria-label="Full reset option">
        <input
          type="checkbox"
          checked={fullReset}
          onChange={(e) => onFullResetChange(e.target.checked)}
          disabled={cancelling}
          className="mt-1"
          aria-describedby="full-reset-description"
        />
        <div>
          <span className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            Full reset
          </span>
          <p id="full-reset-description" className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
            Also reset all recurring items and wizard state before uninstalling
          </p>
        </div>
      </label>

      <label className="flex items-start gap-3 cursor-pointer" aria-label="Confirm uninstall">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmedChange(e.target.checked)}
          disabled={cancelling}
          className="mt-1"
          aria-describedby="confirm-description"
        />
        <span id="confirm-description" className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
          I understand this action is irreversible
        </span>
      </label>
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
