/**
 * useRecurringTour Hook
 *
 * Manages the recurring page guided tour with trigger-based steps.
 * Steps are dynamically generated based on available data.
 * Tour state is persisted in localStorage.
 */

import { useMemo, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { DashboardData } from '../types';
import { RECURRING_TOUR_STEPS, type RecurringTourStepId } from '../components/layout/recurringTourSteps';

// localStorage key for tour state
export const TOUR_STATE_KEY = 'eclosion-recurring-tour';

interface TourState {
  hasSeenTour: boolean;
}

const INITIAL_TOUR_STATE: TourState = {
  hasSeenTour: false,
};

/**
 * Evaluates which tour steps should be shown based on current data.
 * Returns steps in order they should be presented.
 */
function evaluateTriggers(data: DashboardData | undefined): RecurringTourStepId[] {
  if (!data) return [];

  const stepIds: RecurringTourStepId[] = [];

  // Step 1 & 2: Rollup Zone and Rollup Item - when rollup has items
  if (data.rollup?.items && data.rollup.items.length > 0) {
    stepIds.push('rollup-zone', 'rollup-item');
  }

  // Step 3: Individual Item - when there are enabled non-rollup items
  const enabledIndividual = data.items.filter(
    (item) => item.is_enabled && !item.is_in_rollup
  );
  if (enabledIndividual.length > 0) {
    stepIds.push('individual-item');
  }

  // Step 4: Status/Catch-up - when there's an item with "behind" status
  const behindItems = data.items.filter(
    (item) => item.is_enabled && item.status === 'behind'
  );
  if (behindItems.length > 0) {
    stepIds.push('item-status');
  }

  // Step 5: Disabled Items - when there are disabled items
  const disabledItems = data.items.filter((item) => !item.is_enabled);
  if (disabledItems.length > 0) {
    stepIds.push('disabled-section');
  }

  // Step 6: Current Monthly - always shown
  stepIds.push('current-monthly');

  // Step 7: Burndown Decline - when the chart shows a decline (catch-up payments will complete)
  // This happens when current monthly cost > lowest monthly cost (sum of ideal rates)
  const currentMonthlyCost = data.summary.total_monthly_contribution;
  const lowestMonthlyCost = data.items
    .filter((item) => item.is_enabled)
    .reduce((sum, item) => sum + item.ideal_monthly_rate, 0);
  if (currentMonthlyCost > lowestMonthlyCost) {
    stepIds.push('burndown-decline');
  }

  // Step 8: Untracked Warning - only when there are disabled items (shown right after monthly since it's part of that display)
  if (disabledItems.length > 0) {
    stepIds.push('untracked-warning');
  }

  // Step 9: Left to Budget - always shown
  stepIds.push('left-to-budget');

  return stepIds;
}

export interface UseRecurringTourReturn {
  /** Tour steps to display, based on current data triggers */
  steps: typeof RECURRING_TOUR_STEPS;
  /** Whether user has already seen the tour */
  hasSeenTour: boolean;
  /** Mark the tour as seen (call when tour completes or is dismissed) */
  markAsSeen: () => void;
  /** Reset tour state (for replay functionality) */
  resetTour: () => void;
  /** Whether there are any steps available to show */
  hasTourSteps: boolean;
}

/**
 * Hook for managing the recurring page guided tour.
 *
 * @param data - Dashboard data to evaluate triggers against
 * @returns Tour state and controls
 */
export function useRecurringTour(
  data: DashboardData | undefined
): UseRecurringTourReturn {
  const [tourState, setTourState] = useLocalStorage<TourState>(
    TOUR_STATE_KEY,
    INITIAL_TOUR_STATE
  );

  // Evaluate which steps should be shown based on current data
  const activeStepIds = useMemo(() => evaluateTriggers(data), [data]);

  // Filter tour steps to only include those whose triggers are met
  const steps = useMemo(() => {
    return RECURRING_TOUR_STEPS.filter((step) =>
      activeStepIds.includes(step.id as RecurringTourStepId)
    );
  }, [activeStepIds]);

  const markAsSeen = useCallback(() => {
    setTourState({ hasSeenTour: true });
  }, [setTourState]);

  const resetTour = useCallback(() => {
    setTourState(INITIAL_TOUR_STATE);
  }, [setTourState]);

  return {
    steps,
    hasSeenTour: tourState.hasSeenTour,
    markAsSeen,
    resetTour,
    hasTourSteps: steps.length > 0,
  };
}
