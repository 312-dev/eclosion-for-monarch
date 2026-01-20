/**
 * Wishlist Tab
 *
 * Displays wishlist items for savings goals with bookmark sync support.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { usePageTitle, useBookmarks, useWishlistSync } from '../../hooks';
import { PageLoadingSpinner } from '../ui/LoadingSpinner';
import {
  NewWishlistModal,
  EditWishlistModal,
  WishlistWidgetGrid,
  PendingReviewSection,
  IgnoredBookmarksSection,
  WishlistHeader,
  ArchivedItemsSection,
  BrowserSetupModal,
  decodeHtmlEntities,
} from '../wishlist';
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
  useAllocateWishlistMutation,
  useUpdateWishlistLayoutMutation,
} from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { handleApiError } from '../../utils';
import type { WishlistItem, WishlistLayoutUpdate, PendingBookmark } from '../../types';

interface ModalPrefill {
  name?: string;
  sourceUrl?: string;
  sourceBookmarkId?: string;
}

export function WishlistTab() {
  usePageTitle('Wishlist');
  const toast = useToast();

  // Queries
  const { data: configData, isLoading: configLoading } = useWishlistConfigQuery();
  const { data: wishlistData, isLoading, error } = useWishlistQuery();
  const { data: pendingBookmarks = [] } = usePendingBookmarksQuery();
  const { data: _pendingCount = 0 } = usePendingCountQuery();
  const { data: skippedBookmarks = [] } = useSkippedBookmarksQuery();

  // Mutations
  const skipPendingMutation = useSkipPendingMutation();
  const convertPendingMutation = useConvertPendingMutation();
  const allocateMutation = useAllocateWishlistMutation();
  const layoutMutation = useUpdateWishlistLayoutMutation();

  // UI state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [modalPrefill, setModalPrefill] = useState<ModalPrefill | undefined>(undefined);
  const [isPendingExpanded, setIsPendingExpanded] = useState(false);
  const [isIgnoredExpanded, setIsIgnoredExpanded] = useState(false);
  const [selectedPendingBookmark, setSelectedPendingBookmark] = useState<PendingBookmark | null>(
    null
  );
  const [skippingIds, setSkippingIds] = useState<Set<string>>(new Set());
  const [showBrowserSetupWizard, setShowBrowserSetupWizard] = useState(false);
  const [allocatingItemId, setAllocatingItemId] = useState<string | null>(null);
  const pendingSectionRef = useRef<HTMLDivElement>(null);

  const isBrowserConfigured =
    !!configData?.selectedBrowser && (configData?.selectedFolderIds?.length ?? 0) > 0;

  const { isSyncing, syncBookmarks } = useWishlistSync({
    selectedBrowser: configData?.selectedBrowser ?? null,
    selectedFolderIds: configData?.selectedFolderIds ?? null,
    isBrowserConfigured,
    onShowSetupWizard: () => setShowBrowserSetupWizard(true),
  });
  const { onBookmarkChange } = useBookmarks();

  // Subscribe to new bookmark additions
  useEffect(() => {
    if (!isBrowserConfigured) return;
    const unsubscribe = onBookmarkChange((change) => {
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

  // Listen for tour event
  useEffect(() => {
    const handler = () => setIsPendingExpanded(true);
    globalThis.addEventListener(EXPAND_PENDING_SECTION_EVENT, handler);
    return () => globalThis.removeEventListener(EXPAND_PENDING_SECTION_EVENT, handler);
  }, []);

  const { activeItems, archivedItems } = useMemo(() => {
    if (!wishlistData) return { activeItems: [], archivedItems: [] };
    return {
      activeItems: wishlistData.items.filter((item) => !item.is_archived),
      archivedItems: wishlistData.archived_items,
    };
  }, [wishlistData]);

  const handleEdit = useCallback((item: WishlistItem) => setEditingItem(item), []);

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
    (layouts: WishlistLayoutUpdate[]) => layoutMutation.mutate(layouts),
    [layoutMutation]
  );

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

  if (configLoading || isLoading) {
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
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
            Error Loading Wishlist
          </h2>
          <p style={{ color: 'var(--monarch-text-muted)' }}>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content-enter px-6 pb-6 max-w-7xl mx-auto">
      <WishlistHeader
        selectedBrowser={configData?.selectedBrowser ?? null}
        isBrowserConfigured={isBrowserConfigured}
        isSyncingBookmarks={isSyncing}
        onSyncBookmarks={syncBookmarks}
        onAddItem={() => setIsAddModalOpen(true)}
      />
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
      <ArchivedItemsSection
        items={archivedItems}
        onEdit={handleEdit}
        onAllocate={handleAllocate}
        allocatingItemId={allocatingItemId}
      />
      <IgnoredBookmarksSection
        items={skippedBookmarks}
        onCreateTarget={handleCreateTarget}
        isExpanded={isIgnoredExpanded}
        onToggle={() => setIsIgnoredExpanded(!isIgnoredExpanded)}
      />
      <NewWishlistModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setModalPrefill(undefined);
          setSelectedPendingBookmark(null);
        }}
        onSuccess={() => {}}
        {...(modalPrefill && { prefill: modalPrefill })}
        {...(selectedPendingBookmark && { pendingBookmarkId: selectedPendingBookmark.id })}
        onPendingConverted={handlePendingConverted}
      />
      <EditWishlistModal
        isOpen={editingItem !== null}
        onClose={() => setEditingItem(null)}
        item={editingItem}
      />
      <BrowserSetupModal
        isOpen={showBrowserSetupWizard}
        onClose={() => setShowBrowserSetupWizard(false)}
        onComplete={() => setShowBrowserSetupWizard(false)}
      />
    </div>
  );
}
