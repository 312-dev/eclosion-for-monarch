/**
 * useReportSettings Hook
 *
 * Manages stash report settings with localStorage persistence.
 */

import { useState, useCallback, useEffect } from 'react';
import type { StashReportSettings, StashReportTimeRange, StashReportTabMode } from '../../types';
import { DEFAULT_REPORT_SETTINGS } from '../../types';

const STORAGE_KEY = 'eclosion-stash-report-settings';

/**
 * Load settings from localStorage, merging with defaults.
 */
function loadSettings(): StashReportSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<StashReportSettings>;
      // Merge with defaults to ensure all fields are present
      return { ...DEFAULT_REPORT_SETTINGS, ...parsed };
    }
  } catch {
    // Invalid JSON, ignore
  }
  return DEFAULT_REPORT_SETTINGS;
}

/**
 * Save settings to localStorage.
 */
function saveSettings(settings: StashReportSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage not available or full, ignore
  }
}

/**
 * Hook for managing stash report settings with localStorage persistence.
 *
 * @returns Settings state and update functions
 */
export function useReportSettings() {
  const [settings, setSettingsState] = useState<StashReportSettings>(loadSettings);

  // Persist settings changes to localStorage
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const setTimeRange = useCallback((timeRange: StashReportTimeRange) => {
    setSettingsState((prev) => ({ ...prev, timeRange }));
  }, []);

  const setActiveTab = useCallback((activeTab: StashReportTabMode) => {
    setSettingsState((prev) => ({ ...prev, activeTab }));
  }, []);

  const setShowBalanceLines = useCallback((showBalanceLines: boolean) => {
    setSettingsState((prev) => ({ ...prev, showBalanceLines }));
  }, []);

  const setShowMonthlyContributions = useCallback((showMonthlyContributions: boolean) => {
    setSettingsState((prev) => ({ ...prev, showMonthlyContributions }));
  }, []);

  const toggleStashVisibility = useCallback((stashId: string) => {
    setSettingsState((prev) => {
      const isCurrentlyHidden = prev.hiddenStashIds.includes(stashId);
      return {
        ...prev,
        hiddenStashIds: isCurrentlyHidden
          ? prev.hiddenStashIds.filter((id) => id !== stashId)
          : [...prev.hiddenStashIds, stashId],
      };
    });
  }, []);

  const showAllStashes = useCallback(() => {
    setSettingsState((prev) => ({ ...prev, hiddenStashIds: [] }));
  }, []);

  const hideAllStashes = useCallback((stashIds: string[]) => {
    setSettingsState((prev) => ({ ...prev, hiddenStashIds: stashIds }));
  }, []);

  const isStashVisible = useCallback(
    (stashId: string) => !settings.hiddenStashIds.includes(stashId),
    [settings.hiddenStashIds]
  );

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_REPORT_SETTINGS);
  }, []);

  const setFilteredStashId = useCallback((filteredStashId: string | null) => {
    setSettingsState((prev) => ({ ...prev, filteredStashId }));
  }, []);

  const clearStashFilter = useCallback(() => {
    setSettingsState((prev) => ({ ...prev, filteredStashId: null }));
  }, []);

  return {
    settings,
    setTimeRange,
    setActiveTab,
    setShowBalanceLines,
    setShowMonthlyContributions,
    toggleStashVisibility,
    showAllStashes,
    hideAllStashes,
    isStashVisible,
    resetSettings,
    setFilteredStashId,
    clearStashFilter,
  };
}
