/**
 * useAppTour Hook
 *
 * Manages tour state and configuration for the app shell.
 * Determines which tour to show based on current page.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';
import { useRecurringTour, useNotesTour, useStashTour } from './';
import { isTunnelSite } from '../utils/environment';
import type { DashboardData } from '../types';

// Cache tunnel detection at module level (doesn't change during session)
const IS_TUNNEL_SITE = isTunnelSite();

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
    hasSeenIntro: hasSeenStashIntro,
    markIntroSeen: markStashIntroSeen,
  } = useStashTour({
    itemCount: stashItemCount,
    pendingCount,
    isBrowserConfigured,
    isDesktop,
    hasMonarchGoalsEnabled,
    monarchGoalCount,
  });

  // Track whether intro modal just closed (to trigger tour start)
  const [introJustClosed, setIntroJustClosed] = useState(false);

  // Get the correct tour state based on current page
  // On tunnel sites, treat all tours as already seen (skip help tips for remote users)
  const getTourConfig = () => {
    if (isStashPage)
      return {
        steps: stashTourSteps,
        // For stash page, tour is considered "seen" if either:
        // 1. User has seen the tour, OR
        // 2. User hasn't seen the intro yet (intro must come first)
        seen: IS_TUNNEL_SITE || hasSeenStashTour || !hasSeenStashIntro,
        hasSteps: hasStashTourSteps,
      };
    if (isNotesPage)
      return {
        steps: notesTourSteps,
        seen: IS_TUNNEL_SITE || hasSeenNotesTour,
        hasSteps: hasNotesTourSteps,
      };
    return {
      steps: recurringTourSteps,
      seen: IS_TUNNEL_SITE || hasSeenRecurringTour,
      hasSteps: hasRecurringTourSteps,
    };
  };

  const {
    steps: currentTourSteps,
    seen: hasSeenCurrentTour,
    hasSteps: hasCurrentTourSteps,
  } = getTourConfig();

  // Determine if intro modal should show on stash page (first visit, intro not seen)
  const shouldShowStashIntro = isStashPage && !IS_TUNNEL_SITE && !hasSeenStashIntro;

  // Handle intro modal close - mark as seen and trigger tour start
  const handleStashIntroClose = useCallback(() => {
    markStashIntroSeen();
    // Signal that intro just closed so tour can start
    setIntroJustClosed(true);
  }, [markStashIntroSeen]);

  // Auto-start tour on first visit to a page with a tour
  // For stash page, this also handles starting after intro modal closes
  useEffect(() => {
    // Don't start recurring tour if setup wizard is still showing
    if (isRecurringPage && !isRecurringConfigured) return;

    // For stash page: start tour when intro just closed
    if (isStashPage && introJustClosed && !hasSeenStashTour && hasStashTourSteps) {
      const firstStepSelector = stashTourSteps[0]?.selector;
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
          setIntroJustClosed(false);
        } else if (attempts < maxAttempts) {
          timerId = setTimeout(checkElement, pollInterval);
        }
      };

      let timerId = setTimeout(checkElement, pollInterval);
      return () => clearTimeout(timerId);
    }

    // For other pages (or stash page if intro already seen): normal auto-start
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
    introJustClosed,
    hasSeenStashTour,
    hasStashTourSteps,
    stashTourSteps,
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
    // Stash intro modal state (Stashes vs Monarch Goals shown on first visit)
    shouldShowStashIntro,
    handleStashIntroClose,
  };
}
