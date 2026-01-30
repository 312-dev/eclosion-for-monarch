/**
 * useAppTour Hook
 *
 * Manages tour state and configuration for the app shell.
 * Determines which tour to show based on current page.
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';
import { useRecurringTour, useNotesTour, useStashTour } from './';
import type { DashboardData } from '../types';

interface UseAppTourParams {
  dashboardData: DashboardData | undefined;
  stashItemCount: number;
  pendingCount: number;
  isBrowserConfigured: boolean;
  isDesktop: boolean;
  hasMonarchGoalsEnabled: boolean;
  monarchGoalCount: number;
}

export function useAppTour({
  dashboardData,
  stashItemCount,
  pendingCount,
  isBrowserConfigured,
  isDesktop,
  hasMonarchGoalsEnabled,
  monarchGoalCount,
}: UseAppTourParams) {
  const [showTour, setShowTour] = useState(false);
  const location = useLocation();
  const isDemo = useDemo();

  // Demo-aware path prefix
  const pathPrefix = isDemo ? '/demo' : '';

  // Check which page we're on
  const isRecurringPage =
    location.pathname === '/recurring' || location.pathname === '/demo/recurring';
  const isNotesPage = location.pathname === '/notes' || location.pathname === '/demo/notes';
  const isStashPage = location.pathname === '/stashes' || location.pathname === '/demo/stashes';
  const hasTour = isRecurringPage || isNotesPage || isStashPage;

  // Check if recurring is configured (setup wizard completed)
  const isRecurringConfigured = dashboardData?.config.target_group_id != null;

  // Get recurring tour steps and state
  const {
    steps: recurringTourSteps,
    hasSeenTour: hasSeenRecurringTour,
    markAsSeen: markRecurringTourSeen,
    hasTourSteps: hasRecurringTourSteps,
  } = useRecurringTour(dashboardData);

  // Get notes tour steps and state
  const {
    steps: notesTourSteps,
    hasSeenTour: hasSeenNotesTour,
    markAsSeen: markNotesTourSeen,
    hasTourSteps: hasNotesTourSteps,
  } = useNotesTour();

  // Get stash tour steps and state
  const {
    steps: stashTourSteps,
    hasSeenTour: hasSeenStashTour,
    markAsSeen: markStashTourSeen,
    hasTourSteps: hasStashTourSteps,
  } = useStashTour({
    itemCount: stashItemCount,
    pendingCount,
    isBrowserConfigured,
    isDesktop,
    hasMonarchGoalsEnabled,
    monarchGoalCount,
  });

  // Get the correct tour state based on current page
  const getTourConfig = () => {
    if (isStashPage)
      return {
        steps: stashTourSteps,
        seen: hasSeenStashTour,
        hasSteps: hasStashTourSteps,
      };
    if (isNotesPage)
      return { steps: notesTourSteps, seen: hasSeenNotesTour, hasSteps: hasNotesTourSteps };
    return {
      steps: recurringTourSteps,
      seen: hasSeenRecurringTour,
      hasSteps: hasRecurringTourSteps,
    };
  };

  const {
    steps: currentTourSteps,
    seen: hasSeenCurrentTour,
    hasSteps: hasCurrentTourSteps,
  } = getTourConfig();

  // Auto-start tour on first visit to a page with a tour
  useEffect(() => {
    // Don't start recurring tour if setup wizard is still showing
    if (isRecurringPage && !isRecurringConfigured) return;

    if (hasTour && hasCurrentTourSteps && !hasSeenCurrentTour) {
      // Get the first step's selector to wait for it to exist
      const firstStepSelector = currentTourSteps[0]?.selector;
      if (!firstStepSelector) return;

      // Poll for the target element to exist before starting tour
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait
      const pollInterval = 100;

      const checkElement = () => {
        attempts++;
        const element = document.querySelector(firstStepSelector);
        if (element) {
          setShowTour(true);
        } else if (attempts < maxAttempts) {
          timerId = setTimeout(checkElement, pollInterval);
        }
      };

      let timerId = setTimeout(checkElement, pollInterval);
      return () => clearTimeout(timerId);
    }
  }, [
    hasTour,
    hasCurrentTourSteps,
    hasSeenCurrentTour,
    isRecurringPage,
    isNotesPage,
    isStashPage,
    isRecurringConfigured,
    currentTourSteps,
  ]);

  // Handle tour close - mark as seen
  const handleTourClose = () => {
    setShowTour(false);
    if (isStashPage) {
      markStashTourSeen();
    } else if (isNotesPage) {
      markNotesTourSeen();
    } else if (isRecurringPage) {
      markRecurringTourSeen();
    }
  };

  // Key to force TourProvider remount when switching between tour types
  const getTourKey = () => {
    if (isStashPage) return 'stash-tour';
    if (isNotesPage) return 'notes-tour';
    return 'recurring-tour';
  };

  return {
    showTour,
    setShowTour,
    currentTourSteps,
    tourKey: getTourKey(),
    hasTour,
    handleTourClose,
    pathPrefix,
  };
}
