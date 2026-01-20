/**
 * useBrowserBookmarksSetup - Hook for browser bookmarks sync setup wizard
 *
 * Manages browser selection and folder selection for bookmark syncing.
 * This wizard is specifically for setting up browser bookmark integration,
 * not general wishlist configuration.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDemo } from '../context/DemoContext';
import { useBrowserSelection } from './wizard/useBrowserSelection';
import { useFolderSelection } from './wizard/useFolderSelection';
import { useBookmarks } from './useBookmarks';
import {
  useUpdateWishlistConfigMutation,
  useImportBookmarksMutation,
} from '../api/queries/wishlistQueries';
import type { Bookmark, BrowserType, ImportBookmark } from '../types';

// Wizard steps: Browser Selection → Folder Selection
const DESKTOP_STEPS = 2;
const DEMO_STEPS = 0; // No steps in demo mode (bookmarks not available)

/**
 * Decode HTML entities in a string.
 */
function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

/**
 * Recursively collect all URL bookmarks from a folder subtree.
 */
function collectBookmarksFromFolder(
  node: Bookmark,
  targetFolderId: string,
  browserType: BrowserType
): ImportBookmark[] {
  const bookmarks: ImportBookmark[] = [];

  function findAndCollect(current: Bookmark, isInTarget: boolean): void {
    // Check if we've reached the target folder
    const nowInTarget = isInTarget || current.id === targetFolderId;

    if (nowInTarget && current.type === 'url' && current.url) {
      bookmarks.push({
        url: current.url,
        name: decodeHtmlEntities(current.name),
        bookmark_id: current.id,
        browser_type: browserType,
      });
    }

    // Recurse into children
    if (current.children) {
      for (const child of current.children) {
        findAndCollect(child, nowInTarget);
      }
    }
  }

  findAndCollect(node, false);
  return bookmarks;
}

export interface UseBrowserBookmarksSetupOptions {
  onComplete: () => void;
  onCancel?: (() => void) | undefined;
}

export interface UseBrowserBookmarksSetupResult {
  // Step navigation
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];

  // Browser selection (step 0)
  browserSelection: ReturnType<typeof useBrowserSelection>;

  // Folder selection (step 1)
  folderSelection: ReturnType<typeof useFolderSelection>;

  // Navigation
  canGoBack: boolean;
  canProceed: boolean;
  handleNext: () => void;
  handleBack: () => void;
  handleCancel: () => void;

  // Completion
  isSaving: boolean;
  saveError: string | null;
  handleComplete: () => Promise<void>;

  // Mode
  isDemo: boolean;
  isDesktopMode: boolean;
}

export function useBrowserBookmarksSetup({
  onComplete,
  onCancel,
}: UseBrowserBookmarksSetupOptions): UseBrowserBookmarksSetupResult {
  const isDemo = useDemo();
  const browserSelection = useBrowserSelection();
  const folderSelection = useFolderSelection();
  const { getBookmarkTree } = useBookmarks();
  const updateConfigMutation = useUpdateWishlistConfigMutation();
  const importBookmarksMutation = useImportBookmarksMutation();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // In demo mode, bookmarks are not available
  const isDesktopMode = browserSelection.isDesktopMode && !isDemo;
  const totalSteps = isDesktopMode ? DESKTOP_STEPS : DEMO_STEPS;

  // Step titles: Browser Selection → Folder Selection
  const stepTitles = useMemo(() => {
    if (isDesktopMode) {
      return ['Select Browser', 'Select Folder'];
    }
    return [];
  }, [isDesktopMode]);

  // Load folder tree when browser is selected and moving to folder step (step 1)
  useEffect(() => {
    if (
      isDesktopMode &&
      currentStep === 1 &&
      browserSelection.selectedBrowser &&
      browserSelection.permissionGranted &&
      !folderSelection.foldersFetched &&
      !folderSelection.isLoading
    ) {
      folderSelection.loadFolders(browserSelection.selectedBrowser);
    }
    // Intentionally listing specific properties to avoid unnecessary re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isDesktopMode,
    currentStep,
    browserSelection.selectedBrowser,
    browserSelection.permissionGranted,
    folderSelection.foldersFetched,
    folderSelection.isLoading,
    folderSelection.loadFolders,
  ]);

  // Can proceed to next step?
  const canProceed = useMemo(() => {
    if (!isDesktopMode) return false;

    switch (currentStep) {
      case 0:
        // Browser must be selected and have permission
        return browserSelection.selectedBrowser !== null && browserSelection.permissionGranted;
      case 1:
        // A folder must be selected
        return folderSelection.selectedFolderId !== null;
      default:
        return false;
    }
  }, [
    isDesktopMode,
    currentStep,
    browserSelection.selectedBrowser,
    browserSelection.permissionGranted,
    folderSelection.selectedFolderId,
  ]);

  const canGoBack = currentStep > 0 && !isSaving;

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  const handleComplete = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Save browser/folder configuration and mark as configured
      await updateConfigMutation.mutateAsync({
        selectedBrowser: browserSelection.selectedBrowser,
        selectedFolderIds: folderSelection.selectedFolderId
          ? [folderSelection.selectedFolderId]
          : [],
        selectedFolderNames: folderSelection.selectedFolderName
          ? [folderSelection.selectedFolderName]
          : [],
        isConfigured: true,
      });

      // Import bookmarks from selected folder
      if (browserSelection.selectedBrowser && folderSelection.selectedFolderId) {
        try {
          const tree = await getBookmarkTree(browserSelection.selectedBrowser);
          if (tree) {
            const bookmarksToImport = collectBookmarksFromFolder(
              tree,
              folderSelection.selectedFolderId,
              browserSelection.selectedBrowser
            );
            if (bookmarksToImport.length > 0) {
              await importBookmarksMutation.mutateAsync(bookmarksToImport);
            }
          }
        } catch (error_) {
          // Log but don't fail - config was saved successfully
          console.error('Failed to import bookmarks:', error_);
        }
      }

      onComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save configuration';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }, [
    updateConfigMutation,
    browserSelection.selectedBrowser,
    folderSelection.selectedFolderId,
    folderSelection.selectedFolderName,
    getBookmarkTree,
    importBookmarksMutation,
    onComplete,
  ]);

  return {
    currentStep,
    totalSteps,
    stepTitles,
    browserSelection,
    folderSelection,
    canGoBack,
    canProceed,
    handleNext,
    handleBack,
    handleCancel,
    isSaving,
    saveError,
    handleComplete,
    isDemo,
    isDesktopMode,
  };
}
