/**
 * useItemSelection - Hook for recurring item selection in wizards
 */

import { useState, useCallback } from 'react';
import type { RecurringItem } from '../../types';
import type { PendingLink } from '../../components/LinkCategoryModal';
import { getErrorMessage } from '../../utils';
import { getDashboard, triggerSync } from '../../api/client';
import { UI } from '../../constants';

export interface UseItemSelectionResult {
  items: RecurringItem[];
  selectedItemIds: Set<string>;
  loadingItems: boolean;
  itemsError: string | null;
  itemsFetched: boolean;
  pendingLinks: Map<string, PendingLink>;
  linkModalItem: RecurringItem | null;
  showLinkTour: boolean;
  showRollupTip: boolean;
  fetchItems: () => Promise<void>;
  handleRefreshItems: () => Promise<void>;
  handleToggleItem: (id: string) => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleToggleGroup: (ids: string[], select: boolean) => void;
  handleOpenLinkModal: (item: RecurringItem) => void;
  handleLinkSuccess: (link?: PendingLink) => void;
  handleUnlink: (itemId: string) => void;
  setLinkModalItem: (item: RecurringItem | null) => void;
  setShowLinkTour: (show: boolean) => void;
  setShowRollupTip: (show: boolean) => void;
}

export function useItemSelection(): UseItemSelectionResult {
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [itemsFetched, setItemsFetched] = useState(false);

  const [pendingLinks, setPendingLinks] = useState<Map<string, PendingLink>>(new Map());
  const [linkModalItem, setLinkModalItem] = useState<RecurringItem | null>(null);

  const [showLinkTour, setShowLinkTour] = useState(false);
  const [linkTourShown, setLinkTourShown] = useState(false);

  const [rollupTipShown, setRollupTipShown] = useState(false);
  const [showRollupTip, setShowRollupTip] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoadingItems(true);
    setItemsError(null);
    try {
      const data = await getDashboard();
      const availableItems = data.items.filter((item) => !item.is_enabled);
      setItems(availableItems);
      setItemsFetched(true);
    } catch (err) {
      setItemsError(getErrorMessage(err));
    } finally {
      setLoadingItems(false);
    }
  }, []);

  const handleRefreshItems = useCallback(async () => {
    setLoadingItems(true);
    setItemsError(null);
    setItemsFetched(false);
    try {
      await triggerSync();
      const data = await getDashboard();
      const availableItems = data.items.filter((item) => !item.is_enabled);
      setItems(availableItems);
      setItemsFetched(true);
    } catch (err) {
      setItemsError(getErrorMessage(err));
    } finally {
      setLoadingItems(false);
    }
  }, []);

  const handleToggleItem = useCallback((id: string) => {
    const item = items.find(i => i.id === id);

    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      const wasEmpty = prev.size === 0;

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);

        if (wasEmpty && !linkTourShown) {
          setTimeout(() => {
            setShowLinkTour(true);
            setLinkTourShown(true);
          }, UI.ANIMATION.NORMAL);
        }

        if (item && item.amount < 60 && !rollupTipShown) {
          setRollupTipShown(true);
          setShowRollupTip(true);
        }
      }
      return next;
    });
  }, [items, linkTourShown, rollupTipShown]);

  const handleSelectAll = useCallback(() => {
    setSelectedItemIds(new Set(items.map((item) => item.id)));
    if (!rollupTipShown && items.some(item => item.amount < 60)) {
      setRollupTipShown(true);
      setShowRollupTip(true);
    }
  }, [items, rollupTipShown]);

  const handleDeselectAll = useCallback(() => {
    setSelectedItemIds(new Set());
  }, []);

  const handleToggleGroup = useCallback((ids: string[], select: boolean) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (select) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  }, []);

  const handleOpenLinkModal = useCallback((item: RecurringItem) => {
    setLinkModalItem(item);
  }, []);

  const handleLinkSuccess = useCallback((link?: PendingLink) => {
    if (link && linkModalItem) {
      setPendingLinks((prev) => {
        const next = new Map(prev);
        next.set(linkModalItem.id, link);
        return next;
      });
    }
    setLinkModalItem(null);
  }, [linkModalItem]);

  const handleUnlink = useCallback((itemId: string) => {
    setPendingLinks((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  }, []);

  return {
    items,
    selectedItemIds,
    loadingItems,
    itemsError,
    itemsFetched,
    pendingLinks,
    linkModalItem,
    showLinkTour,
    showRollupTip,
    fetchItems,
    handleRefreshItems,
    handleToggleItem,
    handleSelectAll,
    handleDeselectAll,
    handleToggleGroup,
    handleOpenLinkModal,
    handleLinkSuccess,
    handleUnlink,
    setLinkModalItem,
    setShowLinkTour,
    setShowRollupTip,
  };
}
