/**
 * Custom React Hooks
 *
 * Re-exports all custom hooks for convenient importing.
 *
 * Usage:
 *   import { useClickOutside, useDropdown, useLocalStorage } from '../hooks';
 */

export { useClickOutside } from './useClickOutside';

export {
  useDropdown,
  type DropdownPosition,
  type UseDropdownOptions,
  type UseDropdownReturn,
} from './useDropdown';

export { usePageTitle, getAppTitle } from './usePageTitle';

export { useLocalStorage } from './useLocalStorage';

export { useKeyboardShortcut, type UseKeyboardShortcutOptions } from './useKeyboardShortcut';

export { useMediaQuery, breakpoints } from './useMediaQuery';

export { useAsyncAction, type UseAsyncActionReturn } from './useAsyncAction';

export { useItemDisplayStatus, calculateItemDisplayStatus } from './useItemDisplayStatus';

export { useApiClient } from './useApiClient';

export { useRecurringItemActions } from './useRecurringItemActions';

export {
  useContributors,
  useAllContributors,
  useUniqueContributors,
  type Contributor,
  type FeatureContributors,
} from './useContributors';

export { useLandingContent } from './useLandingContent';

export { useIsBetaSite } from './useIsBetaSite';

export { useMacOSElectron } from './useMacOSElectron';

export { useWindowsElectron } from './useWindowsElectron';

export { useElectronNavigation } from './useElectronNavigation';

export { useRecurringTour, TOUR_STATE_KEY, type UseRecurringTourReturn } from './useRecurringTour';

export { useNotesTour, NOTES_TOUR_STATE_KEY, type UseNotesTourReturn } from './useNotesTour';

export { useStashTour, STASH_TOUR_STATE_KEY, type UseStashTourReturn } from './useStashTour';

export { useBiometric, type UseBiometricReturn } from './useBiometric';

export { useBackgroundSync, type UseBackgroundSyncReturn } from './useBackgroundSync';

export { useAutoSyncVisibility } from './useAutoSyncVisibility';

export { useSavingStates, type UseSavingStatesReturn } from './useSavingStates';

export { useScrollLock } from './useScrollLock';

export { useSelectKeyboard } from './useSelectKeyboard';

export { useCheckboxState, type UseCheckboxStateReturn } from './useCheckboxState';

export { useHiddenCategories } from './useHiddenCategories';

export { useInheritanceWarning, type InheritanceImpact } from './useInheritanceWarning';

export { useCompactWindowSize, useAutoCompactWindowSize } from './useCompactWindowSize';

export { useBookmarks } from './useBookmarks';

export {
  useBrowserBookmarksSetup,
  type UseBrowserBookmarksSetupResult,
} from './useBrowserBookmarksSetup';

export { useBrowserSelection, type UseBrowserSelectionResult } from './wizard/useBrowserSelection';

export { useFolderSelection, type UseFolderSelectionResult } from './wizard/useFolderSelection';

export { useStashImageUpload, type UseStashImageUploadResult } from './useStashImageUpload';

export { useStashSync } from './useStashSync';

export { useAppTour } from './useAppTour';

// Smart invalidation and page sync
export { useSmartInvalidate, useInvalidateQueries, usePrefetchQueries } from './useSmartInvalidate';

export { usePageSync, useFullSync, useCurrentPage, type SyncScope } from './usePageSync';

export {
  useBackgroundPoller,
  useVisibilityRefresh,
  usePollingControl,
} from './useBackgroundPoller';

export { useAnimatedValue } from './useAnimatedValue';

export {
  useProjectedStashItem,
  useProjectedStashItems,
  type ProjectedStashItem,
} from './useProjectedStashItem';

// Timeline hooks (hypothesize mode)
export { useTimelineProjection, useTimelineItemConfig } from './useTimelineProjection';
export { useTimelineZoom } from './useTimelineZoom';

// Distribution mode
export { useDistributionBannerActions } from './useDistributionBannerActions';

// Arrow key increment/decrement for numeric inputs
export {
  useArrowKeyIncrement,
  combineWithArrowKeyHandler,
  createArrowKeyHandler,
  type ArrowKeyIncrementOptions,
} from './useArrowKeyIncrement';

// Tunnel status for remote access
export { useTunnelStatus, type UseTunnelStatusReturn } from './useTunnelStatus';
