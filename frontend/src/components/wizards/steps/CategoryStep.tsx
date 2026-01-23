/**
 * CategoryStep - Category group selection step for the setup wizard
 */

import { SearchableSelect } from '../../SearchableSelect';
import type { CategoryGroup } from '../../../types';

interface CategoryStepProps {
  readonly groups: CategoryGroup[];
  readonly selectedGroupId: string;
  readonly onSelectGroup: (id: string, name: string) => void;
  readonly loading: boolean;
  readonly onRefresh: () => void;
  readonly error: string | null;
}

export function CategoryStep({
  groups,
  selectedGroupId,
  onSelectGroup,
  loading,
  onRefresh,
  error,
}: CategoryStepProps) {
  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        Select Category Group
      </h2>
      <p className="mb-6" style={{ color: 'var(--monarch-text-muted)' }}>
        Choose where your recurring savings categories will be created in Monarch Money.
      </p>

      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div className="py-8 text-center" style={{ color: 'var(--monarch-text-muted)' }}>
          Loading category groups...
        </div>
      )}
      {!loading && groups.length === 0 && (
        <div className="py-4">
          <p className="mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
            No category groups found. Please create a category group in Monarch Money first.
          </p>
          <a
            href="https://app.monarch.com/settings/categories"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:underline"
            style={{ color: 'var(--monarch-orange)' }}
          >
            Open Monarch Money Categories Settings
          </a>
        </div>
      )}
      {!loading && groups.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor="category-group"
              className="block text-sm font-medium"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              Default Category Group
            </label>
            <a
              href="https://app.monarch.com/settings/categories"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline"
              style={{ color: 'var(--monarch-orange)' }}
            >
              Create New
            </a>
          </div>
          <SearchableSelect
            value={selectedGroupId}
            onChange={(id) => {
              const group = groups.find((g) => g.id === id);
              if (group) onSelectGroup(group.id, group.name);
            }}
            options={groups.map((group) => ({
              value: group.id,
              label: group.name,
            }))}
            placeholder="Select a group..."
            searchPlaceholder="Search groups..."
            aria-labelledby="category-group"
          />
        </div>
      )}

      <button
        onClick={onRefresh}
        disabled={loading}
        className="text-sm px-3 py-1 rounded transition-colors hover:underline"
        style={{ color: 'var(--monarch-orange)' }}
      >
        {loading ? 'Refreshing...' : 'Refresh groups'}
      </button>
    </div>
  );
}
