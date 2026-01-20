/**
 * EditWishlistModal Component
 *
 * Modal for editing an existing wishlist item.
 * Features:
 * - Edit name, amount, target date, emoji
 * - Custom image upload/removal
 * - Archive/Unarchive action
 * - Delete action with confirmation
 * - Live monthly savings calculation
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Tooltip } from '../ui/Tooltip';
import { Icons } from '../icons';
import { EmojiPicker } from '../EmojiPicker';
import {
  useUpdateWishlistMutation,
  useArchiveWishlistMutation,
  useUnarchiveWishlistMutation,
  useDeleteWishlistMutation,
  useLinkWishlistCategoryMutation,
  useWishlistConfigQuery,
} from '../../api/queries';
import { queryKeys, getQueryKey } from '../../api/queries/keys';
import { useDemo } from '../../context/DemoContext';
import { WishlistCategoryModal } from './WishlistCategoryModal';
import type { CategorySelection } from './WishlistCategoryModal';
import { useToast } from '../../context/ToastContext';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { handleApiError } from '../../utils';
import {
  calculateWishlistMonthlyTarget,
  getQuickPickDates,
  formatMonthsRemaining,
  calculateMonthsRemaining,
} from '../../utils/savingsCalculations';
import { WishlistImageUpload } from './WishlistImageUpload';
import { SavingsProgressBar } from '../shared';
import { DeleteWishlistConfirmModal } from './DeleteWishlistConfirmModal';
import type { WishlistItem, ItemStatus } from '../../types';

interface EditWishlistModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly item: WishlistItem | null;
  readonly onSuccess?: () => void;
}

export function EditWishlistModal({
  isOpen,
  onClose,
  item,
  onSuccess,
}: EditWishlistModalProps) {
  const toast = useToast();
  const isRateLimited = useIsRateLimited();
  const queryClient = useQueryClient();
  const isDemo = useDemo();
  const updateMutation = useUpdateWishlistMutation();
  const archiveMutation = useArchiveWishlistMutation();
  const unarchiveMutation = useUnarchiveWishlistMutation();
  const deleteMutation = useDeleteWishlistMutation();
  const linkCategoryMutation = useLinkWishlistCategoryMutation();
  const { data: wishlistConfig } = useWishlistConfigQuery();

  // Form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [amount, setAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [emoji, setEmoji] = useState('');
  const [customImagePath, setCustomImagePath] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryMissingItemId, setCategoryMissingItemId] = useState<string | null>(null);

  // Quick pick dates
  const quickPicks = useMemo(() => getQuickPickDates(), []);

  // Handle emoji selection (adapter for EmojiPicker's async interface)
  const handleEmojiSelect = useCallback(async (selectedEmoji: string) => {
    setEmoji(selectedEmoji);
  }, []);

  // Track last synced item to avoid redundant syncs
  const lastSyncedItemRef = useRef<string | null>(null);

  // Reset form when item changes (legitimate pattern for modal form sync)
  /* eslint-disable react-hooks/set-state-in-effect -- Modal forms need to sync state with props */
  useEffect(() => {
    if (isOpen && item && item.id !== lastSyncedItemRef.current) {
      lastSyncedItemRef.current = item.id;
      setName(item.name);
      setUrl(item.source_url || '');
      setAmount(item.amount.toString());
      // For archived items with past dates, force to today
      const today = new Date().toISOString().split('T')[0] ?? '';
      if (item.is_archived && item.target_date < today) {
        setTargetDate(today);
      } else {
        setTargetDate(item.target_date);
      }
      setEmoji(item.emoji || '');
      setCustomImagePath(item.custom_image_path || null);
      setShowDeleteModal(false);
    }
    // Reset sync tracking when modal closes
    if (!isOpen) {
      lastSyncedItemRef.current = null;
    }
  }, [isOpen, item]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Calculate monthly target based on current inputs
  const monthlyTarget = useMemo(() => {
    const amountNum = parseFloat(amount) || 0;
    if (amountNum <= 0 || !targetDate) return 0;
    const currentBalance = item?.current_balance ?? 0;
    return calculateWishlistMonthlyTarget(amountNum, currentBalance, targetDate);
  }, [amount, targetDate, item?.current_balance]);

  const monthsRemaining = useMemo(() => {
    if (!targetDate) return 0;
    return calculateMonthsRemaining(targetDate);
  }, [targetDate]);

  // Handle image upload
  const handleImageUploaded = useCallback((imagePath: string) => {
    setCustomImagePath(imagePath);
  }, []);

  const handleImageRemoved = useCallback(() => {
    setCustomImagePath(null);
  }, []);

  // Validate form inputs
  const validateForm = (): boolean => {
    const amountNum = parseFloat(amount);
    if (!name.trim()) {
      toast.error('Please enter a name');
      return false;
    }
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return false;
    }
    if (!targetDate) {
      toast.error('Please select a target date');
      return false;
    }
    return true;
  };

  // Build updates object from current form state
  const buildUpdates = (): Parameters<typeof updateMutation.mutateAsync>[0]['updates'] => {
    return {
      name: name.trim(),
      amount: Number.parseFloat(amount),
      target_date: targetDate,
      emoji: emoji || '🎯',
      source_url: url.trim() || null,
      custom_image_path: customImagePath || null,
    };
  };

  // Handle form submission (save only)
  const handleSubmit = async () => {
    if (!item || !validateForm()) return;

    try {
      await updateMutation.mutateAsync({
        id: item.id,
        updates: buildUpdates(),
      });
      toast.success('Wishlist item updated');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(handleApiError(err, 'Updating wishlist item'));
    }
  };

  // Handle save and restore (for archived items)
  const handleSaveAndRestore = async () => {
    if (!item || !validateForm()) return;

    try {
      // First save the updates
      await updateMutation.mutateAsync({
        id: item.id,
        updates: buildUpdates(),
      });

      // Then restore the item
      const result = await unarchiveMutation.mutateAsync(item.id);

      // Check if the category was missing and needs re-linking
      if (result.category_missing) {
        setCategoryMissingItemId(item.id);
        setShowCategoryModal(true);
        toast.info('The linked category was deleted. Please select a new category.');
        return; // Don't close the modal yet
      }

      toast.success('Item restored');
      // Wait for refetch to complete before closing so UI updates immediately
      await queryClient.refetchQueries({
        queryKey: getQueryKey(queryKeys.wishlist, isDemo),
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(handleApiError(err, 'Restoring wishlist item'));
    }
  };

  // Handle archive/unarchive
  const handleArchive = async () => {
    if (!item) return;

    try {
      if (item.is_archived) {
        const result = await unarchiveMutation.mutateAsync(item.id);
        // Check if the category was missing and needs re-linking
        if (result.category_missing) {
          setCategoryMissingItemId(item.id);
          setShowCategoryModal(true);
          toast.info('The linked category was deleted. Please select a new category.');
          return; // Don't close the modal yet
        }
        toast.success('Item restored');
      } else {
        await archiveMutation.mutateAsync(item.id);
        toast.success('Item archived');
      }
      // Wait for refetch to complete before closing so UI updates immediately
      await queryClient.refetchQueries({
        queryKey: getQueryKey(queryKeys.wishlist, isDemo),
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(handleApiError(err, item.is_archived ? 'Restoring wishlist item' : 'Archiving wishlist item'));
    }
  };

  // Handle category selection for restored items with missing category
  const handleCategorySelection = async (selection: CategorySelection) => {
    if (!categoryMissingItemId) return;

    try {
      if (selection.type === 'create_new') {
        await linkCategoryMutation.mutateAsync({
          id: categoryMissingItemId,
          categoryGroupId: selection.categoryGroupId,
        });
      } else {
        await linkCategoryMutation.mutateAsync({
          id: categoryMissingItemId,
          existingCategoryId: selection.categoryId,
        });
      }
      toast.success('Category linked successfully');
      setShowCategoryModal(false);
      setCategoryMissingItemId(null);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(handleApiError(err, 'Linking category'));
    }
  };

  // Handle delete
  const handleDelete = async (deleteCategory: boolean) => {
    if (!item) return;

    try {
      await deleteMutation.mutateAsync({ id: item.id, deleteCategory });
      const message = deleteCategory
        ? 'Wishlist item and category deleted'
        : 'Wishlist item deleted';
      toast.success(message);
      onSuccess?.();
      setShowDeleteModal(false);
      onClose();
    } catch (err) {
      toast.error(handleApiError(err, 'Deleting wishlist item'));
    }
  };

  // Format amount for display (whole numbers only - no decimals)
  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    setAmount(cleaned);
  };

  const isSubmitting =
    updateMutation.isPending || archiveMutation.isPending || unarchiveMutation.isPending || deleteMutation.isPending || linkCategoryMutation.isPending;
  const isDisabled = isSubmitting || isRateLimited;

  if (!item) return null;

  const archiveTooltip = item.is_archived
    ? 'Restore this goal to your active wishlist'
    : 'Archive if this goal is completed early or postponed indefinitely. You can restore it later.';

  const footer = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        {/* Archive button - only show for non-archived items */}
        {!item.is_archived && (
          <Tooltip content={archiveTooltip} side="top">
            <button
              type="button"
              onClick={handleArchive}
              disabled={isDisabled}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md btn-press"
              style={{
                color: 'var(--monarch-text-muted)',
                backgroundColor: 'transparent',
                border: '1px solid var(--monarch-border)',
              }}
            >
              <Icons.Package size={14} />
              Archive
            </button>
          </Tooltip>
        )}

        {/* Delete button */}
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          disabled={isDisabled}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md btn-press"
          style={{
            color: 'var(--monarch-error)',
            backgroundColor: 'transparent',
          }}
        >
          <Icons.Trash size={14} />
          Delete
        </button>
      </div>

      {/* Right side: Save or Save & Restore */}
      {item.is_archived ? (
        <button
          type="button"
          onClick={handleSaveAndRestore}
          disabled={isDisabled}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md btn-press"
          style={{
            backgroundColor: isDisabled ? 'var(--monarch-border)' : 'var(--monarch-teal)',
            color: isDisabled ? 'var(--monarch-text-muted)' : 'white',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          <Icons.Rotate size={14} />
          {isSubmitting ? 'Restoring...' : 'Save & Restore'}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isDisabled}
          className="px-4 py-2 text-sm font-medium rounded-md btn-press"
          style={{
            backgroundColor: isDisabled ? 'var(--monarch-border)' : 'var(--monarch-teal)',
            color: isDisabled ? 'var(--monarch-text-muted)' : 'white',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      )}
    </div>
  );

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Wishlist Item"
      description="Update your savings goal"
      footer={footer}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Custom Image Upload */}
        <div>
          <WishlistImageUpload
            itemId={item.id}
            currentImagePath={customImagePath}
            onImageUploaded={handleImageUploaded}
            onImageRemoved={handleImageRemoved}
          />
          {item.logo_url && !customImagePath && (
            <p className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
              Using logo from source URL. Upload a custom image to override.
            </p>
          )}
        </div>

        {/* Name Input */}
        <div>
          <label
            htmlFor="edit-wishlist-name"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text)' }}
          >
            Name
          </label>
          <div className="flex gap-2 items-center">
            {/* Emoji picker */}
            <div
              className="w-12 h-10 flex items-center justify-center text-lg rounded-md"
              style={{
                backgroundColor: 'var(--monarch-bg-page)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              <EmojiPicker
                currentEmoji={emoji || '🎯'}
                onSelect={handleEmojiSelect}
              />
            </div>
            <input
              id="edit-wishlist-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What are you saving for?"
              className="flex-1 px-3 py-2 rounded-md"
              style={{
                backgroundColor: 'var(--monarch-bg-page)',
                border: '1px solid var(--monarch-border)',
                color: 'var(--monarch-text)',
              }}
            />
          </div>
        </div>

        {/* URL Input */}
        <div>
          <label
            htmlFor="edit-wishlist-url"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text)' }}
          >
            URL <span style={{ color: 'var(--monarch-text-muted)', fontWeight: 'normal' }}>(optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              id="edit-wishlist-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/product"
              className="flex-1 px-3 py-2 rounded-md"
              style={{
                backgroundColor: 'var(--monarch-bg-page)',
                border: '1px solid var(--monarch-border)',
                color: 'var(--monarch-text)',
              }}
            />
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 rounded-md hover:opacity-70"
                style={{
                  backgroundColor: 'var(--monarch-bg-page)',
                  border: '1px solid var(--monarch-border)',
                  color: 'var(--monarch-teal)',
                }}
                aria-label="Open URL"
              >
                <Icons.ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label
            htmlFor="edit-wishlist-amount"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text)' }}
          >
            Goal Amount
          </label>
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              $
            </span>
            <input
              id="edit-wishlist-amount"
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0"
              className="w-full pl-7 pr-3 py-2 rounded-md"
              style={{
                backgroundColor: 'var(--monarch-bg-page)',
                border: '1px solid var(--monarch-border)',
                color: 'var(--monarch-text)',
              }}
            />
          </div>
        </div>

        {/* Target Date */}
        <div>
          <label
            htmlFor="edit-wishlist-date"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text)' }}
          >
            Goal Date
          </label>
          <input
            id="edit-wishlist-date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full px-3 py-2 rounded-md"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              border: '1px solid var(--monarch-border)',
              color: 'var(--monarch-text)',
            }}
          />
          {/* Quick picks */}
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              { label: 'This month', date: quickPicks.thisMonth },
              { label: 'Next month', date: quickPicks.nextMonth },
              { label: '3 months', date: quickPicks.threeMonths },
              { label: '6 months', date: quickPicks.sixMonths },
              { label: '1 year', date: quickPicks.oneYear },
            ].map((pick) => (
              <button
                key={pick.label}
                type="button"
                onClick={() => setTargetDate(pick.date)}
                className={`px-2 py-1 text-xs rounded-md btn-press ${
                  targetDate === pick.date ? 'ring-2 ring-(--monarch-teal)' : ''
                }`}
                style={{
                  backgroundColor:
                    targetDate === pick.date
                      ? 'var(--monarch-teal-light)'
                      : 'var(--monarch-bg-page)',
                  color:
                    targetDate === pick.date
                      ? 'var(--monarch-teal)'
                      : 'var(--monarch-text-muted)',
                  border: '1px solid var(--monarch-border)',
                }}
              >
                {pick.label}
              </button>
            ))}
          </div>
        </div>

        {/* Savings Progress Card */}
        {amount && Number.parseFloat(amount) > 0 && targetDate && (() => {
          const goalAmount = Number.parseFloat(amount);
          const progressPercent = goalAmount > 0 ? Math.min(100, (item.current_balance / goalAmount) * 100) : 0;
          const rolloverAmount = Math.max(0, item.current_balance - item.planned_budget);
          const displayStatus: ItemStatus = item.status;

          return (
            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: 'var(--monarch-bg-page)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              {/* Progress bar */}
              <SavingsProgressBar
                totalSaved={item.current_balance}
                targetAmount={goalAmount}
                progressPercent={progressPercent}
                displayStatus={displayStatus}
                isEnabled={true}
                rolloverAmount={rolloverAmount}
                budgetedThisMonth={item.planned_budget}
              />

              {/* Monthly stats */}
              <div className="flex justify-between text-sm mt-3 pt-3 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
                <div>
                  <span style={{ color: 'var(--monarch-text-muted)' }}>Monthly: </span>
                  <span style={{ color: 'var(--monarch-teal)', fontWeight: 500 }}>
                    ${monthlyTarget}/mo
                  </span>
                </div>
                <div style={{ color: 'var(--monarch-text-muted)' }}>
                  {formatMonthsRemaining(monthsRemaining)} to go
                </div>
              </div>
            </div>
          );
        })()}

        {/* Category Info (read-only) - only show when linked */}
        {item.category_name && item.category_id && (
          <div
            className="flex items-center justify-between p-3 rounded-lg"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            <div className="flex items-center gap-2">
              <Icons.Link size={14} style={{ color: 'var(--monarch-text-muted)' }} />
              <div className="text-sm">
                <span style={{ color: 'var(--monarch-text)' }}>{item.category_name}</span>
                {item.category_group_name && (
                  <span style={{ color: 'var(--monarch-text-muted)' }}>
                    {' '}in {item.category_group_name}
                  </span>
                )}
              </div>
            </div>
            <a
              href={`https://app.monarchmoney.com/categories/${item.category_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs hover:underline"
              style={{ color: 'var(--monarch-teal)' }}
              aria-label="View category in Monarch"
            >
              <span>View</span>
              <Icons.ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>
    </Modal>

    {/* Delete confirmation modal */}
    <DeleteWishlistConfirmModal
      isOpen={showDeleteModal}
      onClose={() => setShowDeleteModal(false)}
      onConfirm={handleDelete}
      item={item}
      isDeleting={deleteMutation.isPending}
    />

    {/* Category selection modal for restored items with missing category */}
    <WishlistCategoryModal
      isOpen={showCategoryModal}
      onClose={() => {
        setShowCategoryModal(false);
        setCategoryMissingItemId(null);
      }}
      onConfirm={handleCategorySelection}
      {...(wishlistConfig?.defaultCategoryGroupId && {
        defaultCategoryGroupId: wishlistConfig.defaultCategoryGroupId,
      })}
      isSubmitting={linkCategoryMutation.isPending}
    />
  </>
  );
}
