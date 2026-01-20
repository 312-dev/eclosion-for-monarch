/**
 * NewWishlistForm Component
 *
 * Form content for creating a new wishlist item.
 * Uses key prop for resetting state when modal reopens.
 */

import { useState, useMemo, useCallback } from 'react';
import { useCreateWishlistMutation, useWishlistConfigQuery } from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useWishlistImageUpload } from '../../hooks';
import { handleApiError } from '../../utils';
import { calculateWishlistMonthlyTarget, getQuickPickDates } from '../../utils/savingsCalculations';
import { WishlistCategoryModal, type CategorySelection } from './WishlistCategoryModal';
import { NewWishlistImageUpload } from './NewWishlistImageUpload';
import {
  NameInputWithEmoji,
  UrlInput,
  AmountInput,
  TargetDateInput,
  MonthlyTargetPreview,
} from './WishlistFormFields';

interface NewWishlistFormProps {
  readonly prefill?:
    | {
        name?: string | undefined;
        sourceUrl?: string | undefined;
        sourceBookmarkId?: string | undefined;
      }
    | undefined;
  readonly pendingBookmarkId?: string | undefined;
  readonly onPendingConverted?: ((id: string) => Promise<void>) | undefined;
  readonly onSuccess?: (() => void) | undefined;
  readonly onClose: () => void;
  readonly renderFooter: (props: {
    isDisabled: boolean;
    isSubmitting: boolean;
    onSubmit: () => void;
  }) => React.ReactNode;
}

export function NewWishlistForm({
  prefill,
  pendingBookmarkId,
  onPendingConverted,
  onSuccess,
  onClose,
  renderFooter,
}: NewWishlistFormProps) {
  const toast = useToast();
  const isRateLimited = useIsRateLimited();
  const createMutation = useCreateWishlistMutation();
  const { data: wishlistConfig } = useWishlistConfigQuery();
  const { uploadImage, isUploading } = useWishlistImageUpload();
  const quickPicks = useMemo(() => getQuickPickDates(), []);

  // Initialize state from prefill
  const [name, setName] = useState(prefill?.name || '');
  const [url, setUrl] = useState(prefill?.sourceUrl || '');
  const [amount, setAmount] = useState('');
  const [targetDate, setTargetDate] = useState(quickPicks.threeMonths);
  const [emoji, setEmoji] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const monthlyTarget = useMemo(() => {
    const amountNum = Number.parseFloat(amount) || 0;
    return amountNum > 0 && targetDate
      ? calculateWishlistMonthlyTarget(amountNum, 0, targetDate)
      : 0;
  }, [amount, targetDate]);

  const handleImageSelect = useCallback((file: File) => setSelectedImage(file), []);
  const handleImageRemove = useCallback(() => setSelectedImage(null), []);

  const validateAndOpenCategory = useCallback(() => {
    const amountNum = Number.parseFloat(amount);
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!targetDate) {
      toast.error('Please select a target date');
      return;
    }
    setIsCategoryModalOpen(true);
  }, [name, amount, targetDate, toast]);

  const handleCategoryConfirm = useCallback(
    async (selection: CategorySelection) => {
      const amountNum = Number.parseFloat(amount);
      try {
        let customImagePath: string | undefined;
        if (selectedImage) {
          const tempId = `temp-${Date.now()}`;
          customImagePath = (await uploadImage(tempId, selectedImage)) ?? undefined;
        }

        const baseRequest = {
          name: name.trim(),
          amount: amountNum,
          target_date: targetDate,
          ...(url.trim() && { source_url: url.trim() }),
          ...(prefill?.sourceBookmarkId && { source_bookmark_id: prefill.sourceBookmarkId }),
          ...(emoji && { emoji }),
          ...(customImagePath && { custom_image_path: customImagePath }),
        };

        const request =
          selection.type === 'create_new'
            ? { ...baseRequest, category_group_id: selection.categoryGroupId }
            : { ...baseRequest, existing_category_id: selection.categoryId };

        await createMutation.mutateAsync(request);
        toast.success('Wishlist item created');
        setIsCategoryModalOpen(false);

        if (pendingBookmarkId && onPendingConverted) {
          await onPendingConverted(pendingBookmarkId);
        }
        onSuccess?.();
        onClose();
      } catch (err) {
        toast.error(handleApiError(err, 'Creating wishlist item'));
      }
    },
    [
      amount,
      name,
      targetDate,
      url,
      emoji,
      selectedImage,
      prefill,
      createMutation,
      uploadImage,
      toast,
      pendingBookmarkId,
      onPendingConverted,
      onSuccess,
      onClose,
    ]
  );

  const isSubmitting = createMutation.isPending || isUploading;
  const amountNum = Number.parseFloat(amount) || 0;
  const isFormValid = name.trim() && amountNum > 0 && targetDate && monthlyTarget >= 1;
  const isDisabled = isSubmitting || isRateLimited || !isFormValid;

  const newQuickPicks = [
    { label: 'in 2 months', date: quickPicks.twoMonths },
    { label: 'in 3 months', date: quickPicks.threeMonths },
    { label: 'in 6 months', date: quickPicks.sixMonths },
    { label: 'in 1 year', date: quickPicks.oneYear },
  ];

  return (
    <>
      <div className="space-y-4">
        <NewWishlistImageUpload
          sourceUrl={prefill?.sourceUrl}
          selectedImage={selectedImage}
          imagePreview={imagePreview}
          onImageSelect={handleImageSelect}
          onImageRemove={handleImageRemove}
          onPreviewChange={setImagePreview}
        />

        <NameInputWithEmoji
          id="wishlist-name"
          value={name}
          onChange={setName}
          emoji={emoji}
          onEmojiChange={setEmoji}
        />
        <UrlInput id="wishlist-url" value={url} onChange={setUrl} />
        <AmountInput id="wishlist-amount" value={amount} onChange={setAmount} />
        <TargetDateInput
          id="wishlist-date"
          value={targetDate}
          onChange={setTargetDate}
          minDate={today}
          quickPickOptions={newQuickPicks}
        />

        {amount && amountNum > 0 && targetDate && (
          <MonthlyTargetPreview monthlyTarget={monthlyTarget} targetDate={targetDate} />
        )}
      </div>

      {renderFooter({ isDisabled, isSubmitting, onSubmit: validateAndOpenCategory })}

      <WishlistCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onConfirm={handleCategoryConfirm}
        {...(wishlistConfig?.defaultCategoryGroupId && {
          defaultCategoryGroupId: wishlistConfig.defaultCategoryGroupId,
        })}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
