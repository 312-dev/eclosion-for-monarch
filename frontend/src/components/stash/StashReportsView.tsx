/**
 * StashReportsView - Reports tab content for stash progress
 *
 * Shows historical progress charts with controls for:
 * - Time range selection (3mo, 6mo, 12mo, all)
 * - Toggle balance lines on/off
 * - Toggle monthly contributions on/off
 * - Filter individual stashes
 */

import { useMemo } from 'react';
import { useStashHistoryQuery } from '../../api/queries';
import { useReportSettings } from './useReportSettings';
import { StashProgressChart } from './StashProgressChart';
import { StashSummaryCards } from './StashSummaryCards';
import { PageLoadingSpinner } from '../ui/LoadingSpinner';
import { Icons } from '../icons';
import { formatCurrency } from '../../utils/formatters';
import type { StashReportTimeRange } from '../../types';

const TIME_RANGE_OPTIONS: { value: StashReportTimeRange; label: string }[] = [
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '12mo', label: '1Y' },
  { value: 'all', label: 'All' },
];

/** Currency formatting options for whole dollars */
const currencyOpts = { maximumFractionDigits: 0 };

/**
 * Skeleton placeholder for summary cards (4-card grid).
 * Matches StashSummaryCards layout: label at top, large value at bottom.
 */
function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-lg p-6 flex flex-col animate-pulse"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          {/* Label row with optional percentage placeholder */}
          <div className="flex items-center justify-between mb-8">
            <div
              className="h-3.5 w-20 rounded"
              style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
            />
            {/* Show percentage placeholder on some cards */}
            {i % 2 === 1 && (
              <div
                className="h-3.5 w-12 rounded"
                style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
              />
            )}
          </div>
          {/* Large value at bottom */}
          <div
            className="h-9 w-28 rounded"
            style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton placeholder for the chart area.
 */
function ChartSkeleton() {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      <div
        className="h-87.5 w-full rounded animate-pulse"
        style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
      />
    </div>
  );
}

export function StashReportsView() {
  const { settings, setTimeRange, setActiveTab, clearStashFilter } = useReportSettings();

  const { data, isLoading, error } = useStashHistoryQuery(settings.timeRange, { enabled: true });

  // Get list of all stash IDs for visibility filtering
  const allStashIds = useMemo(() => data?.items.map((item) => item.id) ?? [], [data?.items]);

  // Visible stash IDs - filtered by filteredStashId if set, otherwise use hiddenStashIds
  const visibleStashIds = useMemo(() => {
    // If a specific stash is filtered, show only that one
    if (settings.filteredStashId) {
      return [settings.filteredStashId];
    }
    // Otherwise, show all except hidden
    if (settings.hiddenStashIds.length === 0) {
      return allStashIds;
    }
    return allStashIds.filter((id) => !settings.hiddenStashIds.includes(id));
  }, [allStashIds, settings.hiddenStashIds, settings.filteredStashId]);

  // Find the filtered stash item for display
  const items = data?.items;
  const filteredStashItem = useMemo(() => {
    if (!settings.filteredStashId || !items) return null;
    return items.find((item) => item.id === settings.filteredStashId);
  }, [settings.filteredStashId, items]);

  // Show full spinner only on initial load (no data yet)
  const isInitialLoad = isLoading && !data;

  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center min-h-75">
        <PageLoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl p-8 text-center section-enter"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <Icons.AlertCircle
          size={48}
          className="mx-auto mb-4"
          style={{ color: 'var(--monarch-warning)' }}
        />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          Error Loading History
        </h2>
        <p style={{ color: 'var(--monarch-text-muted)' }}>{error.message}</p>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center section-enter"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <Icons.BarChart2
          size={48}
          className="mx-auto mb-4"
          style={{ color: 'var(--monarch-text-muted)' }}
        />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          No History Yet
        </h2>
        <p style={{ color: 'var(--monarch-text-muted)' }}>
          Start tracking stashes to see your progress over time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter banner - show when a specific stash is filtered */}
      {filteredStashItem && (
        <div
          className="rounded-lg p-3 section-enter flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--monarch-bg-hover)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icons.Filter size={16} style={{ color: 'var(--monarch-text-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
              Showing report for: <span className="font-medium">{filteredStashItem.name}</span>
            </span>
          </div>
          <button
            onClick={clearStashFilter}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors hover:bg-black/5"
            style={{
              color: 'var(--monarch-text-dark)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            <Icons.X size={14} />
            Clear filter
          </button>
        </div>
      )}

      {/* Controls bar - always visible */}
      <div
        className="rounded-lg p-4 section-enter"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* Time range selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              Range:
            </span>
            <div
              className="flex rounded-md overflow-hidden"
              style={{ border: '1px solid var(--monarch-border)' }}
            >
              {TIME_RANGE_OPTIONS.map((option) => {
                const isActive = settings.timeRange === option.value;
                const hoverClass = isActive ? '' : 'hover:bg-(--monarch-bg-hover)';
                const isLastOption = option.value === 'all';
                return (
                  <button
                    key={option.value}
                    onClick={() => setTimeRange(option.value)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${hoverClass}`}
                    style={{
                      backgroundColor: isActive ? 'rgba(0, 0, 0, 0.35)' : 'transparent',
                      color: isActive ? 'white' : 'var(--monarch-text-dark)',
                      borderRight: isLastOption ? 'none' : '1px solid var(--monarch-border)',
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-6" style={{ backgroundColor: 'var(--monarch-border)' }} />

          {/* Tab Navigation */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              View:
            </span>
            <div
              className="flex rounded-md overflow-hidden"
              style={{ border: '1px solid var(--monarch-border)' }}
            >
              {(['timeline', 'contributions'] as const).map((tab) => {
                const isActive = settings.activeTab === tab;
                const label = tab === 'timeline' ? 'Timeline' : 'Commitments';
                const hoverClass = isActive ? '' : 'hover:bg-(--monarch-bg-hover)';
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${hoverClass}`}
                    style={{
                      backgroundColor: isActive ? 'rgba(0, 0, 0, 0.35)' : 'transparent',
                      color: isActive ? 'white' : 'var(--monarch-text-dark)',
                      borderRight: tab === 'timeline' ? '1px solid var(--monarch-border)' : 'none',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content area - show skeletons while loading, cards and chart when loaded */}
      {isLoading ? (
        <>
          <CardsSkeleton />
          <ChartSkeleton />
        </>
      ) : (
        <>
          {/* Summary Cards */}
          <StashSummaryCards data={data} visibleStashIds={visibleStashIds} />

          {/* Chart */}
          <div
            className="rounded-lg p-4 section-enter"
            style={{
              backgroundColor: 'var(--monarch-bg-card)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            <StashProgressChart
              items={data.items}
              months={data.months}
              visibleStashIds={visibleStashIds}
              activeTab={settings.activeTab}
              formatCurrency={(amount) => formatCurrency(amount, currencyOpts)}
            />
          </div>
        </>
      )}
    </div>
  );
}
