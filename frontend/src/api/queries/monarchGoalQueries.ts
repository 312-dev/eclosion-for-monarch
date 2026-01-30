/**
 * React Query Hooks - Monarch Goals
 *
 * Provides React Query hooks for fetching and mutating Monarch savings goals.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import { queryKeys, getQueryKey } from './keys';
import * as api from '../core/monarchGoals';
import * as demoApi from '../demo/demoMonarchGoals';
import type { MonarchGoal, MonarchGoalLayoutUpdate } from '../../types/monarchGoal';

/** Transform API response from snake_case to camelCase */
function transformGoalFromApi(raw: Record<string, unknown>): MonarchGoal {
  return {
    type: 'monarch_goal',
    id: String(raw['id']),
    name: String(raw['name']),
    currentBalance: Number(raw['current_balance'] ?? 0),
    netContribution: Number(raw['net_contribution'] ?? 0),
    targetAmount:
      raw['target_amount'] !== null && raw['target_amount'] !== undefined
        ? Number(raw['target_amount'])
        : null,
    targetDate: typeof raw['target_date'] === 'string' ? raw['target_date'] : null,
    createdAt: typeof raw['created_at'] === 'string' ? raw['created_at'] : new Date().toISOString(),
    // Backend sends progress as decimal (0.55), convert to percentage (55)
    progress: Number(raw['progress'] ?? 0) * 100,
    estimatedMonthsUntilCompletion:
      raw['estimated_months_until_completion'] !== null &&
      raw['estimated_months_until_completion'] !== undefined
        ? Number(raw['estimated_months_until_completion'])
        : null,
    forecastedCompletionDate:
      typeof raw['forecasted_completion_date'] === 'string'
        ? raw['forecasted_completion_date']
        : null,
    plannedMonthlyContribution: Number(raw['planned_monthly_contribution'] ?? 0),
    status: String(raw['status']) as MonarchGoal['status'],
    monthsAheadBehind:
      raw['months_ahead_behind'] !== null && raw['months_ahead_behind'] !== undefined
        ? Number(raw['months_ahead_behind'])
        : null,
    grid_x: Number(raw['grid_x'] ?? 0),
    grid_y: Number(raw['grid_y'] ?? 0),
    col_span: Number(raw['col_span'] ?? 1),
    row_span: Number(raw['row_span'] ?? 1),
    sort_order: Number(raw['sort_order'] ?? 0),
    isArchived: Boolean(raw['is_archived']),
    isCompleted: Boolean(raw['is_completed']),
    imageStorageProvider:
      typeof raw['image_storage_provider'] === 'string' ? raw['image_storage_provider'] : null,
    imageStorageProviderId:
      typeof raw['image_storage_provider_id'] === 'string'
        ? raw['image_storage_provider_id']
        : null,
    icon: typeof raw['icon'] === 'string' ? raw['icon'] : null,
  };
}

/**
 * Fetch Monarch savings goals with grid layout data.
 *
 * Goals are automatically filtered to active (non-archived) only by the backend.
 * Returns goals with financial data, time-based status, and grid positions.
 */
export function useMonarchGoalsQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.monarchGoals, isDemo),
    queryFn: async () => {
      const result = isDemo ? await demoApi.getMonarchGoals() : await api.getMonarchGoals();
      // Demo mode returns MonarchGoal[], production returns snake_case that needs transformation
      if (isDemo) {
        return result.goals;
      }
      // Transform snake_case API response to camelCase TypeScript types
      return (result.goals as unknown as Record<string, unknown>[]).map(transformGoalFromApi);
    },
    // Use reasonable staleTime - mutations invalidate the query for fresh data
    staleTime: 30 * 1000, // Consider stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes for navigation
  });
}

/**
 * Update grid layout positions for one or more Monarch goals.
 *
 * Used when user drags/resizes goal cards in the Stash grid.
 */
export function useUpdateMonarchGoalLayoutsMutation() {
  const isDemo = useDemo();

  return useMutation({
    mutationFn: async (layouts: MonarchGoalLayoutUpdate[]) => {
      const result = isDemo
        ? await demoApi.updateMonarchGoalLayouts(layouts)
        : await api.updateMonarchGoalLayouts(layouts);
      return result;
    },
    // Note: We intentionally do NOT invalidate the monarchGoals query here.
    // The grid component manages layout state locally. Invalidating would
    // cause a refetch → new sort_order → layout recreation → infinite loop.
  });
}
