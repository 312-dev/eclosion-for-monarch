/**
 * useEditWishlistHandlers Hook
 *
 * Custom hook that encapsulates mutation handlers for the EditWishlistModal.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useUpdateWishlistMutation,
  useArchiveWishlistMutation,
  useUnarchiveWishlistMutation,
  useDeleteWishlistMutation,
  useLinkWishlistCategoryMutation,
} from '../../api/queries';
import { queryKeys, getQueryKey } from '../../api/queries/keys';
import { useDemo } from '../../context/DemoContext';
import { useToast } from '../../context/ToastContext';
import { handleApiError } from '../../utils';
import type { CategorySelection } from './WishlistCategoryModal';

interface WishlistUpdates {
  name: string;
  amount: number;
  target_date: string;
  emoji: string;
  source_url: string | null;
  custom_image_path: string | null;
}

interface UseEditWishlistHandlersParams {
  itemId: string | null;
  isArchived: boolean;
  buildUpdates: () => WishlistUpdates;
  validateForm: () => boolean;
  onCategoryMissing: (itemId: string) => void;
  onSuccess?: (() => void) | undefined;
  onClose: () => void;
}

export function useEditWishlistHandlers({
  itemId,
  isArchived,
  buildUpdates,
  validateForm,
  onCategoryMissing,
  onSuccess,
  onClose,
}: UseEditWishlistHandlersParams) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const isDemo = useDemo();
  const updateMutation = useUpdateWishlistMutation();
  const archiveMutation = useArchiveWishlistMutation();
  const unarchiveMutation = useUnarchiveWishlistMutation();
  const deleteMutation = useDeleteWishlistMutation();
  const linkCategoryMutation = useLinkWishlistCategoryMutation();

  const refetchAndClose = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: getQueryKey(queryKeys.wishlist, isDemo) });
    onSuccess?.();
    onClose();
  }, [queryClient, isDemo, onSuccess, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!itemId || !validateForm()) return;
    try {
      await updateMutation.mutateAsync({ id: itemId, updates: buildUpdates() });
      toast.success('Wishlist item updated');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(handleApiError(err, 'Updating wishlist item'));
    }
  }, [itemId, validateForm, buildUpdates, updateMutation, toast, onSuccess, onClose]);

  const handleUnarchiveItem = useCallback(async (): Promise<boolean> => {
    if (!itemId) return false;
    const result = await unarchiveMutation.mutateAsync(itemId);
    if (result.category_missing) {
      onCategoryMissing(itemId);
      return false;
    }
    toast.success('Item restored');
    return true;
  }, [itemId, unarchiveMutation, onCategoryMissing, toast]);

  const handleSaveAndRestore = useCallback(async () => {
    if (!itemId || !validateForm()) return;
    try {
      await updateMutation.mutateAsync({ id: itemId, updates: buildUpdates() });
      const success = await handleUnarchiveItem();
      if (!success) return;
      await refetchAndClose();
    } catch (err) {
      toast.error(handleApiError(err, 'Restoring wishlist item'));
    }
  }, [
    itemId,
    validateForm,
    buildUpdates,
    updateMutation,
    handleUnarchiveItem,
    refetchAndClose,
    toast,
  ]);

  const handleArchive = useCallback(async () => {
    if (!itemId) return;
    try {
      if (isArchived) {
        const success = await handleUnarchiveItem();
        if (!success) return;
      } else {
        await archiveMutation.mutateAsync(itemId);
        toast.success('Item archived');
      }
      await refetchAndClose();
    } catch (err) {
      toast.error(handleApiError(err, isArchived ? 'Restoring' : 'Archiving'));
    }
  }, [itemId, isArchived, handleUnarchiveItem, archiveMutation, toast, refetchAndClose]);

  const handleCategorySelection = useCallback(
    async (selection: CategorySelection, categoryMissingItemId: string | null) => {
      if (!categoryMissingItemId) return;
      const params =
        selection.type === 'create_new'
          ? { id: categoryMissingItemId, categoryGroupId: selection.categoryGroupId }
          : { id: categoryMissingItemId, existingCategoryId: selection.categoryId };
      try {
        await linkCategoryMutation.mutateAsync(params);
        toast.success('Category linked successfully');
        onSuccess?.();
        onClose();
      } catch (err) {
        toast.error(handleApiError(err, 'Linking category'));
      }
    },
    [linkCategoryMutation, toast, onSuccess, onClose]
  );

  const handleDelete = useCallback(
    async (deleteCategory: boolean) => {
      if (!itemId) return;
      try {
        await deleteMutation.mutateAsync({ id: itemId, deleteCategory });
        toast.success(
          deleteCategory ? 'Wishlist item and category deleted' : 'Wishlist item deleted'
        );
        onSuccess?.();
        onClose();
      } catch (err) {
        toast.error(handleApiError(err, 'Deleting wishlist item'));
      }
    },
    [itemId, deleteMutation, toast, onSuccess, onClose]
  );

  const isSubmitting =
    updateMutation.isPending ||
    archiveMutation.isPending ||
    unarchiveMutation.isPending ||
    deleteMutation.isPending ||
    linkCategoryMutation.isPending;

  return {
    handleSubmit,
    handleSaveAndRestore,
    handleArchive,
    handleCategorySelection,
    handleDelete,
    isSubmitting,
    isLinkingCategory: linkCategoryMutation.isPending,
    isDeletingItem: deleteMutation.isPending,
  };
}
