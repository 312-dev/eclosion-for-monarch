/**
 * DeleteCategoriesContent - Content for the delete categories tab in UninstallModal
 */

import type { DeletableCategory } from '../../types';

interface DeleteCategoriesContentProps {
  readonly categories: DeletableCategory[];
  readonly loading: boolean;
  readonly confirmText: string;
  readonly expectedConfirmText: string;
  readonly deleting: boolean;
  readonly onConfirmTextChange: (text: string) => void;
}

export function DeleteCategoriesContent({
  categories,
  loading,
  confirmText,
  expectedConfirmText,
  deleting,
  onConfirmTextChange,
}: DeleteCategoriesContentProps) {
  return (
    <>
      <p className="text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
        Delete all budget categories created by this tool from your Monarch account. This does not cancel your subscription.
      </p>

      {loading ? (
        <div className="text-center py-8" style={{ color: 'var(--monarch-text-muted)' }}>
          Loading categories...
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--monarch-text-muted)' }}>
          No categories to delete. All tracked categories were linked to existing categories.
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="text-sm font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
              The following {categories.length} {categories.length === 1 ? 'category' : 'categories'} will be deleted:
            </div>
            <div
              className="rounded-lg p-3 max-h-40 overflow-y-auto space-y-1"
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
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
              Type "<span style={{ color: 'var(--monarch-error)' }}>{expectedConfirmText}</span>" to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => onConfirmTextChange(e.target.value)}
              disabled={deleting}
              placeholder={expectedConfirmText}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                border: '1px solid var(--monarch-border)',
                backgroundColor: 'var(--monarch-bg-card)',
                color: 'var(--monarch-text-dark)',
              }}
            />
          </div>
        </>
      )}
    </>
  );
}
