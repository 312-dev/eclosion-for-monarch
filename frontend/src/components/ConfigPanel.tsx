import { useState, useEffect } from 'react';
import type { CategoryGroup, DashboardConfig } from '../types';
import { getCategoryGroups, setConfig } from '../api/client';
import { Portal } from './Portal';
import { SearchableSelect } from './SearchableSelect';
import { useDropdown } from '../hooks';
import { handleApiError } from '../utils';
import { SettingsIcon } from './icons';

interface ConfigPanelProps {
  config: DashboardConfig;
  onUpdate: () => void;
}

export function ConfigPanel({ config, onUpdate }: ConfigPanelProps) {
  const dropdown = useDropdown<HTMLDivElement, HTMLButtonElement>({
    alignment: 'right',
    offset: { y: 8 },
  });
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>(
    config.target_group_id || ''
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCategoryGroups();
      setGroups(data);
    } catch (err) {
      setError(handleApiError(err, 'Loading category groups'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dropdown.isOpen) {
      fetchGroups();
    }
  }, [dropdown.isOpen]);

  const handleSave = async () => {
    const group = groups.find((g) => g.id === selectedGroup);
    if (!group) return;

    setSaving(true);
    setError(null);
    try {
      await setConfig(group.id, group.name);
      onUpdate();
      dropdown.close();
    } catch (err) {
      setError(handleApiError(err, 'Saving configuration'));
    } finally {
      setSaving(false);
    }
  };

  const isDisabled = !selectedGroup || saving || selectedGroup === config.target_group_id;

  return (
    <>
      <button
        ref={dropdown.triggerRef}
        onClick={dropdown.toggle}
        className="p-2 rounded-lg transition-colors"
        style={{ color: 'var(--monarch-text-muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--monarch-text-dark)'; e.currentTarget.style.backgroundColor = 'var(--monarch-bg-page)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--monarch-text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
        title="Settings"
      >
        <svg
          className="h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {dropdown.isOpen && (
        <Portal>
          <div
            className="fixed inset-0 z-(--z-index-popover)"
            onClick={dropdown.close}
          />
          <div
            ref={dropdown.dropdownRef}
            className="fixed z-(--z-index-popover) w-80 rounded-xl shadow-lg p-4"
            style={{
              backgroundColor: 'var(--monarch-bg-card)',
              border: '1px solid var(--monarch-border)',
              top: dropdown.position.top,
              right: dropdown.position.right,
            }}
          >
            <h3 className="font-medium mb-3" style={{ color: 'var(--monarch-text-dark)' }}>Settings</h3>

            {error && (
              <div className="mb-3 p-2 rounded text-sm" style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}>
                {error}
              </div>
            )}

            <div className="mb-4">
              <div className="text-sm mb-1 text-(--monarch-text-muted)">
                Default Category Group
              </div>
              <SearchableSelect
                value={selectedGroup}
                onChange={setSelectedGroup}
                options={groups.map((group) => ({
                  value: group.id,
                  label: group.name,
                }))}
                placeholder="Select a group..."
                searchPlaceholder="Search groups..."
                loading={loading}
                className="w-full"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={fetchGroups}
                disabled={loading}
                className="px-3 py-1.5 text-sm rounded disabled:opacity-50 transition-colors"
                style={{ border: '1px solid var(--monarch-border)', color: 'var(--monarch-text-dark)', backgroundColor: 'var(--monarch-bg-card)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--monarch-bg-page)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--monarch-bg-card)'}
              >
                Refresh
              </button>
              <button
                onClick={handleSave}
                disabled={isDisabled}
                className="flex-1 px-3 py-1.5 text-sm text-white rounded transition-colors disabled:cursor-not-allowed"
                style={{
                  backgroundColor: isDisabled ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)',
                }}
                onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.backgroundColor = 'var(--monarch-orange-hover)'; }}
                onMouseLeave={(e) => { if (!isDisabled) e.currentTarget.style.backgroundColor = 'var(--monarch-orange)'; }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            <a
              href="https://app.monarchmoney.com/settings/categories"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 text-xs hover:underline"
              style={{ color: 'var(--monarch-orange)' }}
            >
              Manage categories in Monarch
            </a>
          </div>
        </Portal>
      )}
    </>
  );
}
