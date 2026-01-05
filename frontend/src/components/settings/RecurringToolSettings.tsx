/**
 * Recurring Tool Settings
 *
 * Settings section for the recurring expense tracking tool.
 * Includes category group selection, auto-add, threshold, and auto-update settings.
 */

import { useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Repeat, ChevronRight } from 'lucide-react';
import { SearchableSelect } from '../SearchableSelect';
import { useToast } from '../../context/ToastContext';
import { useDemo } from '../../context/DemoContext';
import { useApiClient } from '../../hooks';
import type { DashboardData, CategoryGroup } from '../../types';

interface RecurringToolSettingsProps {
  dashboardData: DashboardData | null;
  loading: boolean;
  onRefreshDashboard: () => Promise<void>;
  onShowResetModal: () => void;
}

export const RecurringToolSettings = forwardRef<HTMLElement, RecurringToolSettingsProps>(
  function RecurringToolSettings(
    { dashboardData, loading, onRefreshDashboard, onShowResetModal },
    ref
  ) {
    const navigate = useNavigate();
    const toast = useToast();
    const isDemo = useDemo();
    const client = useApiClient();

    const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [savingGroup, setSavingGroup] = useState(false);
    const [savingAutoTrack, setSavingAutoTrack] = useState(false);
    const [savingThreshold, setSavingThreshold] = useState(false);
    const [savingAutoUpdateTargets, setSavingAutoUpdateTargets] = useState(false);

    // Calculate recurring tool info
    const isConfigured = dashboardData?.config?.target_group_id != null;
    const dedicatedItems = dashboardData?.items.filter(
      item => item.is_enabled && !item.is_in_rollup && item.category_id
    ) || [];
    const rollupItems = dashboardData?.rollup?.items || [];
    const totalCategories = dedicatedItems.length + (dashboardData?.rollup?.category_id ? 1 : 0);
    const totalItems = dedicatedItems.length + rollupItems.length;
    const hasAnythingToReset = isConfigured || totalCategories > 0 || totalItems > 0;

    const fetchCategoryGroups = async () => {
      setLoadingGroups(true);
      try {
        const groups = await client.getCategoryGroups();
        setCategoryGroups(groups);
      } catch {
        toast.error('Failed to load category groups');
      } finally {
        setLoadingGroups(false);
      }
    };

    const handleGroupChange = async (groupId: string) => {
      const group = categoryGroups.find(g => g.id === groupId);
      if (!group) return;

      setSavingGroup(true);
      try {
        await client.setConfig(group.id, group.name);
        await onRefreshDashboard();
        toast.success(`Category group set to ${group.name}`);
      } catch {
        toast.error('Failed to update category group');
      } finally {
        setSavingGroup(false);
      }
    };

    const handleAutoTrackChange = async () => {
      const newValue = !(dashboardData?.config.auto_sync_new ?? false);
      setSavingAutoTrack(true);
      try {
        await client.updateSettings({ auto_sync_new: newValue });
        await onRefreshDashboard();
        toast.success(newValue ? 'Auto-track enabled' : 'Auto-track disabled');
      } catch {
        toast.error('Failed to update setting');
      } finally {
        setSavingAutoTrack(false);
      }
    };

    const handleThresholdChange = async (value: number | null) => {
      setSavingThreshold(true);
      try {
        await client.updateSettings({ auto_track_threshold: value });
        await onRefreshDashboard();
        toast.success('Threshold updated');
      } catch {
        toast.error('Failed to update threshold');
      } finally {
        setSavingThreshold(false);
      }
    };

    const handleAutoUpdateTargetsChange = async () => {
      const newValue = !(dashboardData?.config.auto_update_targets ?? false);
      setSavingAutoUpdateTargets(true);
      try {
        await client.updateSettings({ auto_update_targets: newValue });
        await onRefreshDashboard();
        toast.success(newValue ? 'Auto-update targets enabled' : 'Auto-update targets disabled');
      } catch {
        toast.error('Failed to update setting');
      } finally {
        setSavingAutoUpdateTargets(false);
      }
    };

    const getCategoryGroupOptions = () => {
      if (categoryGroups.length > 0) {
        return categoryGroups.map((group) => ({
          value: group.id,
          label: group.name,
        }));
      }
      if (dashboardData?.config.target_group_name) {
        return [{
          value: dashboardData.config.target_group_id || '',
          label: dashboardData.config.target_group_name,
        }];
      }
      return [];
    };

    return (
      <section ref={ref} id="recurring" className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: 'var(--monarch-text-muted)' }}>
          Tool Settings
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}
        >
          {loading ? (
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg skeleton" />
                <div className="flex-1">
                  <div className="h-4 w-24 rounded skeleton mb-2" />
                  <div className="h-3 w-32 rounded skeleton" />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Recurring Tool Header */}
              <div className="p-4">
                <div className="flex items-center gap-4">
                  <div
                    className="p-2.5 rounded-lg shrink-0"
                    style={{ backgroundColor: hasAnythingToReset ? 'var(--monarch-orange-light)' : 'var(--monarch-bg-page)' }}
                  >
                    <Repeat size={20} style={{ color: hasAnythingToReset ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)' }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2" style={{ color: 'var(--monarch-text-dark)' }}>
                      Recurring Tool
                      {hasAnythingToReset && (
                        <span
                          className="px-2 py-0.5 text-xs font-medium rounded-full"
                          style={{ backgroundColor: 'var(--monarch-success-bg)', color: 'var(--monarch-success)' }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                      {hasAnythingToReset ? (
                        <span className="flex items-center gap-3">
                          <span>{totalCategories} {totalCategories === 1 ? 'category' : 'categories'}</span>
                          <span style={{ color: 'var(--monarch-border)' }}>|</span>
                          <span>{totalItems} tracked {totalItems === 1 ? 'item' : 'items'}</span>
                        </span>
                      ) : (
                        'Not configured'
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="p-2 rounded-lg shrink-0 hover-bg-transparent-to-hover"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => navigate(isDemo ? '/demo/recurring' : '/recurring')}
                    aria-label="Go to Recurring tool"
                  >
                    <ChevronRight size={20} style={{ color: 'var(--monarch-text-muted)' }} />
                  </button>
                </div>
              </div>

              {/* Nested Settings - Only show when configured */}
              {isConfigured && (
                <div style={{ borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}>
                  {/* Default Category Group */}
                  <div className="px-4 py-3 ml-14" style={{ borderBottom: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                        Default Category Group
                      </div>
                      <SearchableSelect
                        value={dashboardData?.config.target_group_id || ''}
                        onChange={handleGroupChange}
                        options={getCategoryGroupOptions()}
                        placeholder="Select a group..."
                        searchPlaceholder="Search groups..."
                        disabled={savingGroup}
                        loading={loadingGroups}
                        onOpen={() => {
                          if (categoryGroups.length === 0) {
                            fetchCategoryGroups();
                          }
                        }}
                        className="min-w-45"
                      />
                    </div>
                  </div>

                  {/* Auto-add new recurring */}
                  <div className="px-4 py-3 ml-14" style={{ borderBottom: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                        Auto-add new recurring
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoTrackChange}
                        disabled={savingAutoTrack}
                        className="relative inline-flex h-5 w-9 items-center rounded-full toggle-switch"
                        style={{
                          backgroundColor: dashboardData?.config.auto_sync_new
                            ? 'var(--monarch-orange)'
                            : 'var(--monarch-border)',
                        }}
                        aria-label={dashboardData?.config.auto_sync_new ? 'Disable auto-add' : 'Enable auto-add'}
                      >
                        <span
                          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm toggle-knob"
                          style={{
                            transform: dashboardData?.config.auto_sync_new
                              ? 'translateX(1rem)'
                              : 'translateX(0.15rem)',
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Rollup threshold - only show when auto-add is enabled */}
                  {dashboardData?.config.auto_sync_new && (
                    <div className="px-4 py-3 ml-14" style={{ borderBottom: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                            Auto-add to rollup threshold
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                            Items at or below this amount go to rollup
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>$</span>
                          <input
                            type="number"
                            defaultValue={dashboardData?.config.auto_track_threshold ?? ''}
                            placeholder="any"
                            onBlur={(e) => {
                              const value = e.target.value ? Number.parseFloat(e.target.value) : null;
                              if (value !== dashboardData?.config.auto_track_threshold) {
                                handleThresholdChange(value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            disabled={savingThreshold}
                            className="w-16 px-2 py-1 text-right rounded text-sm"
                            style={{
                              border: '1px solid var(--monarch-border)',
                              backgroundColor: 'var(--monarch-bg-card)',
                              color: 'var(--monarch-text-dark)',
                            }}
                          />
                          <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>/mo</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Auto-update targets */}
                  <div className="px-4 py-3 ml-14">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                          Auto-update category targets
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                          Update targets when recurring amounts change
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoUpdateTargetsChange}
                        disabled={savingAutoUpdateTargets}
                        className="relative inline-flex h-5 w-9 items-center rounded-full toggle-switch"
                        style={{
                          backgroundColor: dashboardData?.config.auto_update_targets
                            ? 'var(--monarch-orange)'
                            : 'var(--monarch-border)',
                        }}
                        aria-label={dashboardData?.config.auto_update_targets ? 'Disable auto-update targets' : 'Enable auto-update targets'}
                      >
                        <span
                          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm toggle-knob"
                          style={{
                            transform: dashboardData?.config.auto_update_targets
                              ? 'translateX(1rem)'
                              : 'translateX(0.15rem)',
                          }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Reset link */}
              {hasAnythingToReset && (
                <div className="px-4 py-2 text-right" style={{ borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}>
                  <button
                    type="button"
                    className="text-xs hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--monarch-error)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={onShowResetModal}
                  >
                    Reset
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    );
  }
);
