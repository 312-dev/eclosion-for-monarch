/**
 * useStashTour Hook
 *
 * Manages the stash page guided tour with trigger-based steps.
 * Steps are dynamically generated based on available data.
 * Tour state is persisted in localStorage.
 *
 * Step triggers (progressive disclosure):
 * - Phase 1: Always shown (available-funds, distribute-mode, hypothesize-mode, add-item)
 * - Phase 2: When items exist (progress-bar, budget-input, take-stash, edit-item, arrange-cards)
 * - Phase 3: Secondary features (reports-tab)
 * - Phase 4: When Monarch Goals enabled (monarch-goal-badge)
 * - Phase 5: Browser integration (sync-bookmarks) - desktop or browser configured
 * - Phase 6: Pending bookmarks (pending-bookmarks)
 */

import { useMemo, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { STASH_TOUR_STEPS, type StashTourStepId } from '../components/layout/stashTourSteps';

// localStorage key for tour state
export const STASH_TOUR_STATE_KEY = 'eclosion-stash-tour';

interface TourState {
  hasSeenTour: boolean;
}

const INITIAL_TOUR_STATE: TourState = {
  hasSeenTour: false,
};

/** Data needed to evaluate which tour steps should be shown */
export interface StashTourData {
  /** Number of stash items (not including Monarch goals) */
  itemCount: number;
  /** Number of pending bookmarks awaiting review */
  pendingCount: number;
  /** Whether browser bookmark sync is configured */
  isBrowserConfigured: boolean;
  /** Whether running in desktop mode (Electron) */
  isDesktop: boolean;
  /** Whether Monarch Goals are enabled in settings */
  hasMonarchGoalsEnabled: boolean;
  /** Number of active Monarch goals (when goals are enabled) */
  monarchGoalCount: number;
}

/**
 * Evaluates which tour steps should be shown based on current data.
 * Returns steps in order they should be presented.
 *
 * This implements progressive disclosure - steps only appear when
 * the relevant UI elements and data are available.
 */
function evaluateTriggers(data: StashTourData | undefined): StashTourStepId[] {
  if (!data) return [];

  // Build step list using spread to satisfy linter (no multiple pushes)
  const stepIds: StashTourStepId[] = [
    // Phase 1: Always shown (core concepts - most important first)
    'available-funds',
    'distribute-mode',
    'hypothesize-mode',
    'add-item',

    // Phase 2: When items exist (card interactions)
    ...(data.itemCount > 0
      ? (['progress-bar', 'budget-input', 'take-stash', 'edit-item', 'arrange-cards'] as const)
      : []),

    // Phase 3: Secondary features (always shown)
    'reports-tab',

    // Phase 4: When Monarch Goals enabled
    ...(data.hasMonarchGoalsEnabled && data.monarchGoalCount > 0
      ? (['monarch-goal-badge'] as const)
      : []),

    // Phase 5: Browser integration
    ...(data.isDesktop || data.isBrowserConfigured ? (['sync-bookmarks'] as const) : []),

    // Phase 6: Pending bookmarks
    ...(data.pendingCount > 0 ? (['pending-bookmarks'] as const) : []),
  ];

  return stepIds;
}

export interface UseStashTourReturn {
  /** Tour steps to display, based on current data triggers */
  steps: typeof STASH_TOUR_STEPS;
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
 * Hook for managing the stash page guided tour.
 *
 * @param data - Stash data to evaluate triggers against
 * @returns Tour state and controls
 */
export function useStashTour(data: StashTourData | undefined): UseStashTourReturn {
  const [tourState, setTourState] = useLocalStorage<TourState>(
    STASH_TOUR_STATE_KEY,
    INITIAL_TOUR_STATE
  );

  // Evaluate which steps should be shown based on current data
  const activeStepIds = useMemo(() => evaluateTriggers(data), [data]);

  // Filter tour steps to only include those whose triggers are met
  const steps = useMemo(() => {
    return STASH_TOUR_STEPS.filter((step) => activeStepIds.includes(step.id));
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
