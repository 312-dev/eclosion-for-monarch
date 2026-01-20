/**
 * Custom React Hooks
 *
 * Re-exports all custom hooks for convenient importing.
 *
 * Usage:
 *   import { useClickOutside, useDropdown, useAsync } from '../hooks';
 */

export { useClickOutside } from './useClickOutside';

export {
  useDropdown,
  type DropdownPosition,
  type UseDropdownOptions,
  type UseDropdownReturn,
} from './useDropdown';

export {
  useAsync,
  useAsyncEffect,
  type UseAsyncState,
  type UseAsyncOptions,
  type UseAsyncReturn,
} from './useAsync';

export {
  useEditableField,
  type UseEditableFieldOptions,
  type UseEditableFieldReturn,
} from './useEditableField';

export { usePageTitle, getAppTitle } from './usePageTitle';

export { useLocalStorage } from './useLocalStorage';

export { useKeyboardShortcut, type UseKeyboardShortcutOptions } from './useKeyboardShortcut';

export { useDebounce } from './useDebounce';

export { useMediaQuery, breakpoints } from './useMediaQuery';

export { usePrevious } from './usePrevious';

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

export {
  useWishlistTour,
  WISHLIST_TOUR_STATE_KEY,
  type UseWishlistTourReturn,
} from './useWishlistTour';

export { useBiometric, type UseBiometricReturn } from './useBiometric';

export { useBackgroundSync, type UseBackgroundSyncReturn } from './useBackgroundSync';

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

export {
  useWishlistImageUpload,
  type UseWishlistImageUploadResult,
} from './useWishlistImageUpload';
