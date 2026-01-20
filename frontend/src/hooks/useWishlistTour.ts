/**
 * useWishlistTour Hook
 *
 * Manages the wishlist page guided tour with trigger-based steps.
 * Steps are dynamically generated based on available data.
 * Tour state is persisted in localStorage.
 */

import { useMemo, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import {
  WISHLIST_TOUR_STEPS,
  type WishlistTourStepId,
} from '../components/layout/wishlistTourSteps';

// localStorage key for tour state
export const WISHLIST_TOUR_STATE_KEY = 'eclosion-wishlist-tour';

interface TourState {
  hasSeenTour: boolean;
}

const INITIAL_TOUR_STATE: TourState = {
  hasSeenTour: false,
};

/** Data needed to evaluate which tour steps should be shown */
export interface WishlistTourData {
  /** Number of wishlist items */
  itemCount: number;
  /** Number of pending bookmarks awaiting review */
  pendingCount: number;
  /** Whether browser bookmark sync is configured */
  isBrowserConfigured: boolean;
  /** Whether running in desktop mode (Electron) */
  isDesktop: boolean;
}

/**
 * Evaluates which tour steps should be shown based on current data.
 * Returns steps in order they should be presented.
 */
function evaluateTriggers(data: WishlistTourData | undefined): WishlistTourStepId[] {
  if (!data) return [];

  const stepIds: WishlistTourStepId[] = [];

  // Step 1: Add Item - always shown as it's the primary action
  stepIds.push('add-item');

  // Step 2: Sync Bookmarks - show if desktop mode or browser configured
  if (data.isDesktop || data.isBrowserConfigured) {
    stepIds.push('sync-bookmarks');
  }

  // Steps 3-5: Card interaction tips - shown when items exist
  if (data.itemCount > 0) {
    stepIds.push('edit-item', 'move-card', 'resize-card');
  }

  // Step 6: Pending Bookmarks - shown when there are pending items to review
  if (data.pendingCount > 0) {
    stepIds.push('pending-bookmarks');
  }

  return stepIds;
}

export interface UseWishlistTourReturn {
  /** Tour steps to display, based on current data triggers */
  steps: typeof WISHLIST_TOUR_STEPS;
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
 * Hook for managing the wishlist page guided tour.
 *
 * @param data - Wishlist data to evaluate triggers against
 * @returns Tour state and controls
 */
export function useWishlistTour(data: WishlistTourData | undefined): UseWishlistTourReturn {
  const [tourState, setTourState] = useLocalStorage<TourState>(
    WISHLIST_TOUR_STATE_KEY,
    INITIAL_TOUR_STATE
  );

  // Evaluate which steps should be shown based on current data
  const activeStepIds = useMemo(() => evaluateTriggers(data), [data]);

  // Filter tour steps to only include those whose triggers are met
  const steps = useMemo(() => {
    return WISHLIST_TOUR_STEPS.filter((step) =>
      activeStepIds.includes(step.id as WishlistTourStepId)
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
