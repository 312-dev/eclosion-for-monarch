/**
 * EditWishlistForm Component
 *
 * Form content for editing a wishlist item. Manages its own form state.
 */

import { useState, useMemo, useCallback } from 'react';
import { useWishlistConfigQuery } from '../../api/queries';
import { WishlistCategoryModal, type CategorySelection } from './WishlistCategoryModal';
import { useToast } from '../../context/ToastContext';
import { useIsRateLimited } from '../../context/RateLimitContext';
import {
  calculateWishlistMonthlyTarget,
  getQuickPickDates,
  calculateMonthsRemaining,
} from '../../utils/savingsCalculations';
import { WishlistImageUpload } from './WishlistImageUpload';
import { EditWishlistProgress } from './EditWishlistProgress';
import { DeleteWishlistConfirmModal } from './DeleteWishlistConfirmModal';
import {
  NameInputWithEmoji,
  UrlInput,
  AmountInput,
  TargetDateInput,
  CategoryInfoDisplay,
} from './WishlistFormFields';
import { useEditWishlistHandlers } from './useEditWishlistHandlers';
import type { WishlistItem } from '../../types';

/** Validate form and return first error message or null if valid */
function getFormValidationError(name: string, amount: string, targetDate: string): string | null {
  if (!name.trim()) return 'Please enter a name';
  const amountNum = Number.parseFloat(amount);
  if (!amountNum || amountNum <= 0) return 'Please enter a valid amount';
  if (!targetDate) return 'Please select a target date';
  return null;
}

/** Get the target date, adjusting for archived items with past dates */
function getInitialTargetDate(item: WishlistItem): string {
  const today = new Date().toISOString().split('T')[0] ?? '';
  return item.is_archived && item.target_date < today ? today : item.target_date;
}

interface EditWishlistFormProps {
  readonly item: WishlistItem;
  readonly onSuccess?: (() => void) | undefined;
  readonly onClose: () => void;
  readonly renderFooter: (props: {
    isArchived: boolean;
    isDisabled: boolean;
    isSubmitting: boolean;
    onArchive: () => void;
    onDelete: () => void;
    onSaveAndRestore: () => void;
    onSubmit: () => void;
  }) => React.ReactNode;
}

export function EditWishlistForm({
  item,
  onSuccess,
  onClose,
  renderFooter,
}: EditWishlistFormProps) {
  const toast = useToast();
  const isRateLimited = useIsRateLimited();
  const { data: wishlistConfig } = useWishlistConfigQuery();

  // Initialize form state from item
  const [name, setName] = useState(item.name);
  const [url, setUrl] = useState(item.source_url || '');
  const [amount, setAmount] = useState(item.amount.toString());
  const [targetDate, setTargetDate] = useState(getInitialTargetDate(item));
  const [emoji, setEmoji] = useState(item.emoji || '');
  const [customImagePath, setCustomImagePath] = useState<string | null>(
    item.custom_image_path || null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryMissingItemId, setCategoryMissingItemId] = useState<string | null>(null);

  const quickPicks = useMemo(() => getQuickPickDates(), []);

  const monthlyTarget = useMemo(() => {
    const amountNum = Number.parseFloat(amount) || 0;
    const isValid = amountNum > 0 && targetDate;
    return isValid
      ? calculateWishlistMonthlyTarget(amountNum, item.current_balance, targetDate)
      : 0;
  }, [amount, targetDate, item.current_balance]);

  const monthsRemaining = useMemo(
    () => (targetDate ? calculateMonthsRemaining(targetDate) : 0),
    [targetDate]
  );

  const handleImageUploaded = useCallback((imagePath: string) => setCustomImagePath(imagePath), []);
  const handleImageRemoved = useCallback(() => setCustomImagePath(null), []);

  const handleCategoryMissing = useCallback(
    (itemId: string) => {
      setCategoryMissingItemId(itemId);
      setShowCategoryModal(true);
      toast.info('The linked category was deleted. Please select a new category.');
    },
    [toast]
  );

  const validateForm = useCallback((): boolean => {
    const error = getFormValidationError(name, amount, targetDate);
    if (error) {
      toast.error(error);
      return false;
    }
    return true;
  }, [name, amount, targetDate, toast]);

  const buildUpdates = useCallback(
    () => ({
      name: name.trim(),
      amount: Number.parseFloat(amount),
      target_date: targetDate,
      emoji: emoji || '🎯',
      source_url: url.trim() || null,
      custom_image_path: customImagePath || null,
    }),
    [name, amount, targetDate, emoji, url, customImagePath]
  );

  const {
    handleSubmit,
    handleSaveAndRestore,
    handleArchive,
    handleCategorySelection,
    handleDelete,
    isSubmitting,
    isLinkingCategory,
    isDeletingItem,
  } = useEditWishlistHandlers({
    itemId: item.id,
    isArchived: item.is_archived,
    buildUpdates,
    validateForm,
    onCategoryMissing: handleCategoryMissing,
    onSuccess,
    onClose,
  });

  const isDisabled = isSubmitting || isRateLimited;

  const editQuickPicks = [
    { label: 'This month', date: quickPicks.thisMonth },
    { label: 'Next month', date: quickPicks.nextMonth },
    { label: '3 months', date: quickPicks.threeMonths },
    { label: '6 months', date: quickPicks.sixMonths },
    { label: '1 year', date: quickPicks.oneYear },
  ];

  const onCategoryConfirm = (selection: CategorySelection) =>
    handleCategorySelection(selection, categoryMissingItemId);
  const onCategoryClose = () => {
    setShowCategoryModal(false);
    setCategoryMissingItemId(null);
  };

  return (
    <>
      <div className="space-y-4">
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
        <NameInputWithEmoji
          id="edit-wishlist-name"
          value={name}
          onChange={setName}
          emoji={emoji}
          onEmojiChange={setEmoji}
        />
        <UrlInput id="edit-wishlist-url" value={url} onChange={setUrl} />
        <AmountInput
          id="edit-wishlist-amount"
          value={amount}
          onChange={setAmount}
          label="Goal Amount"
        />
        <TargetDateInput
          id="edit-wishlist-date"
          value={targetDate}
          onChange={setTargetDate}
          quickPickOptions={editQuickPicks}
        />

        {amount && Number.parseFloat(amount) > 0 && targetDate && (
          <EditWishlistProgress
            item={item}
            goalAmount={Number.parseFloat(amount)}
            monthlyTarget={monthlyTarget}
            monthsRemaining={monthsRemaining}
          />
        )}

        {item.category_name && item.category_id && (
          <CategoryInfoDisplay
            categoryName={item.category_name}
            categoryId={item.category_id}
            {...(item.category_group_name && { categoryGroupName: item.category_group_name })}
          />
        )}
      </div>

      {renderFooter({
        isArchived: item.is_archived,
        isDisabled,
        isSubmitting,
        onArchive: handleArchive,
        onDelete: () => setShowDeleteModal(true),
        onSaveAndRestore: handleSaveAndRestore,
        onSubmit: handleSubmit,
      })}

      <DeleteWishlistConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        item={item}
        isDeleting={isDeletingItem}
      />

      <WishlistCategoryModal
        isOpen={showCategoryModal}
        onClose={onCategoryClose}
        onConfirm={onCategoryConfirm}
        {...(wishlistConfig?.defaultCategoryGroupId && {
          defaultCategoryGroupId: wishlistConfig.defaultCategoryGroupId,
        })}
        isSubmitting={isLinkingCategory}
      />
    </>
  );
}
