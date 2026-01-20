/**
 * Wishlist Tab
 *
 * Displays wishlist items for savings goals.
 * Features:
 * - Card grid of active wishlist items with progress tracking
 * - Collapsible section for archived/completed items
 * - Add new item modal with bookmark sync support
 * - Desktop bookmark sync integration
 * - Browser bookmarks setup wizard (triggered via sync button)
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { WishlistIcon } from '../wizards/WizardComponents';
import { usePageTitle, useBookmarks } from '../../hooks';
import { PageLoadingSpinner } from '../ui/LoadingSpinner';
import {
  NewWishlistModal,
  EditWishlistModal,
  WishlistWidgetGrid,
  WishlistCard,
  PendingReviewSection,
  IgnoredBookmarksSection,
} from '../wishlist';
import { BrowserBookmarksSetupWizard } from '../wizards/wishlist';
import { Portal } from '../Portal';
import { Icons } from '../icons';
import { EXPAND_PENDING_SECTION_EVENT } from '../layout/wishlistTourSteps';
import {
  useWishlistQuery,
  useWishlistConfigQuery,
  usePendingBookmarksQuery,
  usePendingCountQuery,
  useSkippedBookmarksQuery,
  useSkipPendingMutation,
  useConvertPendingMutation,
  useImportBookmarksMutation,
  useAllocateWishlistMutation,
  useUpdateWishlistLayoutMutation,
} from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { handleApiError } from '../../utils';
import { Z_INDEX } from '../../constants';
import type { WishlistItem, WishlistLayoutUpdate, PendingBookmark, Bookmark, ImportBookmark, BrowserType } from '../../types';

/** Get short browser display name */
function getBrowserName(type: BrowserType | null): string {
  switch (type) {
    case 'chrome':
      return 'Chrome';
    case 'edge':
      return 'Edge';
    case 'safari':
      return 'Safari';
    case 'brave':
      return 'Brave';
    default:
      return 'Browser Bookmarks';
  }
}

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
  targetFolderIds: string[],
  browserType: string
): ImportBookmark[] {
  const bookmarks: ImportBookmark[] = [];
  const targetSet = new Set(targetFolderIds);

  function findAndCollect(current: Bookmark, isInTarget: boolean): void {
    // Check if we've reached a target folder
    const nowInTarget = isInTarget || targetSet.has(current.id);

    if (nowInTarget && current.type === 'url' && current.url) {
      bookmarks.push({
        url: current.url,
        name: decodeHtmlEntities(current.name),
        bookmark_id: current.id,
        browser_type: browserType as ImportBookmark['browser_type'],
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

interface ModalPrefill {
  name?: string;
  sourceUrl?: string;
  sourceBookmarkId?: string;
}

export function WishlistTab() {
  usePageTitle('Wishlist');
  const toast = useToast();

  // Config query - for browser sync settings
  const { data: configData, isLoading: configLoading } = useWishlistConfigQuery();

  // Query and mutations - always enabled, will return empty data if no items exist
  const { data: wishlistData, isLoading, error } = useWishlistQuery();

  // Pending bookmarks queries and mutations
  const { data: pendingBookmarks = [] } = usePendingBookmarksQuery();
  const { data: _pendingCount = 0 } = usePendingCountQuery();
  const { data: skippedBookmarks = [] } = useSkippedBookmarksQuery();
  const skipPendingMutation = useSkipPendingMutation();
  const convertPendingMutation = useConvertPendingMutation();
  const importBookmarksMutation = useImportBookmarksMutation();
  const allocateMutation = useAllocateWishlistMutation();
  const layoutMutation = useUpdateWishlistLayoutMutation();

  // UI state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [modalPrefill, setModalPrefill] = useState<ModalPrefill | undefined>(undefined);
  const [isPendingExpanded, setIsPendingExpanded] = useState(false);
  const [isIgnoredExpanded, setIsIgnoredExpanded] = useState(false);
  const [selectedPendingBookmark, setSelectedPendingBookmark] = useState<PendingBookmark | null>(null);
  const [skippingIds, setSkippingIds] = useState<Set<string>>(new Set());
  const [isSyncingBookmarks, setIsSyncingBookmarks] = useState(false);
  const [showBrowserSetupWizard, setShowBrowserSetupWizard] = useState(false);
  const [allocatingItemId, setAllocatingItemId] = useState<string | null>(null);
  const pendingSectionRef = useRef<HTMLDivElement>(null);

  // Check if browser sync is configured
  const isBrowserConfigured =
    !!configData?.selectedBrowser && (configData?.selectedFolderIds?.length ?? 0) > 0;

  // Bookmark sync (desktop only)
  const { onBookmarkChange, getBookmarkTree } = useBookmarks();

  // Subscribe to new bookmark additions (only when browser sync is configured)
  useEffect(() => {
    if (!isBrowserConfigured) return;
    const unsubscribe = onBookmarkChange((change) => {
      // Only prompt for newly added bookmarks
      if (change.changeType === 'added' && change.bookmark.url) {
        setModalPrefill({
          name: decodeHtmlEntities(change.bookmark.name),
          sourceUrl: decodeHtmlEntities(change.bookmark.url),
          sourceBookmarkId: change.bookmark.id,
        });
        setIsAddModalOpen(true);
        toast.success(`New bookmark detected: ${change.bookmark.name}`);
      }
    });
    return unsubscribe;
  }, [isBrowserConfigured, onBookmarkChange, toast]);

  // Listen for tour event to expand pending section
  useEffect(() => {
    const handleExpandPending = () => {
      setIsPendingExpanded(true);
    };
    globalThis.addEventListener(EXPAND_PENDING_SECTION_EVENT, handleExpandPending);
    return () => {
      globalThis.removeEventListener(EXPAND_PENDING_SECTION_EVENT, handleExpandPending);
    };
  }, []);

  // Split items into active and archived
  const { activeItems, archivedItems } = useMemo(() => {
    if (!wishlistData) {
      return { activeItems: [], archivedItems: [] };
    }
    return {
      activeItems: wishlistData.items.filter((item) => !item.is_archived),
      archivedItems: wishlistData.archived_items,
    };
  }, [wishlistData]);

  // Action handlers
  const handleEdit = useCallback((item: WishlistItem) => {
    setEditingItem(item);
  }, []);

  const handleAllocate = useCallback(
    async (itemId: string, amount: number) => {
      setAllocatingItemId(itemId);
      try {
        await allocateMutation.mutateAsync({ id: itemId, amount });
      } catch (err) {
        toast.error(handleApiError(err, 'Allocating funds'));
      } finally {
        setAllocatingItemId(null);
      }
    },
    [allocateMutation, toast]
  );

  const handleLayoutChange = useCallback(
    (layouts: WishlistLayoutUpdate[]) => {
      layoutMutation.mutate(layouts);
    },
    [layoutMutation]
  );

  // Sync bookmarks from configured browser/folder
  const handleSyncBookmarks = useCallback(async () => {
    // If browser not configured, open setup wizard
    if (!isBrowserConfigured) {
      setShowBrowserSetupWizard(true);
      return;
    }

    // At this point, isBrowserConfigured guarantees these are non-null
    const browser = configData?.selectedBrowser;
    const folderIds = configData?.selectedFolderIds;
    if (!browser || !folderIds?.length) return;

    setIsSyncingBookmarks(true);
    try {
      const tree = await getBookmarkTree(browser);
      if (!tree) {
        toast.error('Failed to read bookmarks');
        return;
      }

      const bookmarksToImport = collectBookmarksFromFolder(tree, folderIds, browser);

      if (bookmarksToImport.length === 0) {
        toast.success('No bookmarks found in folder');
        return;
      }

      const result = await importBookmarksMutation.mutateAsync(bookmarksToImport);
      if (result.imported > 0) {
        toast.success(`Imported ${result.imported} new bookmark${result.imported === 1 ? '' : 's'}`);
        // Banner will show, user can click to expand pending section
      } else {
        toast.success('All bookmarks already imported');
      }
    } catch (err) {
      toast.error(handleApiError(err, 'Syncing bookmarks'));
    } finally {
      setIsSyncingBookmarks(false);
    }
  }, [isBrowserConfigured, configData, getBookmarkTree, importBookmarksMutation, toast]);

  const handleAddSuccess = useCallback(() => {
    // Could highlight the new item here
  }, []);

  // Handle browser setup wizard completion
  const handleBrowserSetupComplete = useCallback(() => {
    setShowBrowserSetupWizard(false);
    // Sync will happen automatically after wizard imports bookmarks
  }, []);

  // Pending bookmark handlers
  const handleSkipPending = useCallback(
    async (id: string) => {
      const item = pendingBookmarks.find((b) => b.id === id);
      setSkippingIds((prev) => new Set(prev).add(id));
      try {
        await skipPendingMutation.mutateAsync(id);
        toast.info(`Skipped "${item?.name ?? 'bookmark'}"`);
      } catch (err) {
        toast.error(handleApiError(err, 'Skipping bookmark'));
      } finally {
        setSkippingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [pendingBookmarks, skipPendingMutation, toast]
  );

  const handleCreateTarget = useCallback((item: PendingBookmark) => {
    setSelectedPendingBookmark(item);
    setModalPrefill({
      name: decodeHtmlEntities(item.name),
      sourceUrl: decodeHtmlEntities(item.url),
      sourceBookmarkId: item.bookmark_id,
    });
    setIsAddModalOpen(true);
  }, []);

  const handlePendingConverted = useCallback(
    async (pendingId: string) => {
      try {
        await convertPendingMutation.mutateAsync(pendingId);
        setSelectedPendingBookmark(null);
      } catch (err) {
        toast.error(handleApiError(err, 'Converting pending bookmark'));
      }
    },
    [convertPendingMutation, toast]
  );

  // Loading state for config check
  if (configLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PageLoadingSpinner />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PageLoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-content-enter px-6 pb-6">
        <div
          className="rounded-xl p-8 text-center"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <Icons.AlertCircle
            size={48}
            className="mx-auto mb-4"
            style={{ color: 'var(--monarch-warning)' }}
          />
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            Error Loading Wishlist
          </h2>
          <p style={{ color: 'var(--monarch-text-muted)' }}>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content-enter px-6 pb-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <WishlistIcon size={24} />
          <div>
            <h1
              className="text-xl font-semibold"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              Wishlist
            </h1>
            <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              Save for things you want to buy
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-tour="wishlist-sync-bookmarks"
            onClick={handleSyncBookmarks}
            disabled={isSyncingBookmarks}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-(--monarch-bg-hover)"
            style={{
              backgroundColor: 'var(--monarch-bg-card)',
              color: 'var(--monarch-text-dark)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            {isBrowserConfigured ? (
              <Icons.Refresh
                size={16}
                className={isSyncingBookmarks ? 'animate-spin' : ''}
              />
            ) : (
              <Icons.Download size={16} />
            )}
            Sync {getBrowserName(configData?.selectedBrowser ?? null)}
          </button>
          <button
            data-tour="wishlist-add-item"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: 'var(--monarch-orange)' }}
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>
      </div>

      {/* Pending review section - collapsible list of pending bookmarks */}
      {pendingBookmarks.length > 0 && (
        <div ref={pendingSectionRef}>
          <PendingReviewSection
            isExpanded={isPendingExpanded}
            onToggle={() => setIsPendingExpanded(!isPendingExpanded)}
            pendingItems={pendingBookmarks}
            onSkip={handleSkipPending}
            onCreateTarget={handleCreateTarget}
            skippingIds={skippingIds}
          />
        </div>
      )}

      {/* Active items widget grid */}
      <div className="mb-6 w-full">
        <WishlistWidgetGrid
          items={activeItems}
          onEdit={handleEdit}
          onAllocate={handleAllocate}
          onLayoutChange={handleLayoutChange}
          allocatingItemId={allocatingItemId}
          emptyMessage="No wishlist items yet. Add your first item to start saving!"
        />
      </div>

      {/* Archived items */}
      {archivedItems.length > 0 && (
        <div
          className="section-enter rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="w-full px-5 py-3 flex items-center justify-between hover:bg-(--monarch-bg-hover) transition-colors"
            aria-expanded={showArchived}
          >
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              Past Wishes ({archivedItems.length})
            </span>
            {showArchived ? (
              <ChevronDown size={16} style={{ color: 'var(--monarch-text-muted)' }} />
            ) : (
              <ChevronRight size={16} style={{ color: 'var(--monarch-text-muted)' }} />
            )}
          </button>

          {showArchived && (
            <div
              className="animate-expand border-t p-4"
              style={{ borderColor: 'var(--monarch-border)' }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {archivedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="list-item-enter h-70"
                    style={index < 15 ? { animationDelay: `${index * 50}ms` } : undefined}
                  >
                    <WishlistCard
                      item={item}
                      onEdit={handleEdit}
                      onAllocate={handleAllocate}
                      isAllocating={allocatingItemId === item.id}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ignored bookmarks section - minimal, at bottom of page */}
      <IgnoredBookmarksSection
        items={skippedBookmarks}
        onCreateTarget={handleCreateTarget}
        isExpanded={isIgnoredExpanded}
        onToggle={() => setIsIgnoredExpanded(!isIgnoredExpanded)}
      />

      {/* Add item modal */}
      <NewWishlistModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setModalPrefill(undefined);
          setSelectedPendingBookmark(null);
        }}
        onSuccess={handleAddSuccess}
        {...(modalPrefill && { prefill: modalPrefill })}
        {...(selectedPendingBookmark && { pendingBookmarkId: selectedPendingBookmark.id })}
        onPendingConverted={handlePendingConverted}
      />

      {/* Edit item modal */}
      <EditWishlistModal
        isOpen={editingItem !== null}
        onClose={() => setEditingItem(null)}
        item={editingItem}
      />

      {/* Browser bookmarks setup wizard modal */}
      {showBrowserSetupWizard && (
        <Portal>
          <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowBrowserSetupWizard(false)}
              aria-hidden="true"
            />
            {/* Wizard */}
            <div className="relative" style={{ zIndex: Z_INDEX.MODAL }}>
              <BrowserBookmarksSetupWizard
                onComplete={handleBrowserSetupComplete}
                onCancel={() => setShowBrowserSetupWizard(false)}
              />
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
