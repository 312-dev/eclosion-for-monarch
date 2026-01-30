/* eslint-disable sonarjs/no-nested-conditional */
/* eslint-disable max-lines */
/**
 * NewStashForm Component
 *
 * Form content for creating a new stash.
 * Uses key prop for resetting state when modal reopens.
 */

import { useState, useMemo, useCallback } from 'react';
import { useModalFooter } from '../ui/Modal';
import {
  useCreateStashMutation,
  useStashConfigQuery,
  useAvailableToStash,
} from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useStashImageUpload } from '../../hooks';
import { handleApiError } from '../../utils';
import {
  calculateStashMonthlyTarget,
  getQuickPickDates,
  calculateMonthsRemaining,
  formatMonthsRemaining,
} from '../../utils/savingsCalculations';
import { InlineCategorySelector, type CategorySelectionResult } from './InlineCategorySelector';
import { NewStashImageUpload } from './NewStashImageUpload';
import { SavingsProgressBar } from '../shared';
import {
  NameInputWithEmoji,
  UrlDisplay,
  AmountInput,
  TargetDateInput,
  GoalTypeSelector,
  StartingBalanceInput,
} from './StashFormFields';
import { DebtAccountSelectorModal } from './DebtAccountSelectorModal';
import type { StashGoalType, ImageSelection } from '../../types';

interface NewStashFormProps {
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
    onSubmit: () => void | Promise<void>;
  }) => React.ReactNode;
}

export function NewStashForm({
  prefill,
  pendingBookmarkId,
  onPendingConverted,
  onSuccess,
  onClose,
  renderFooter,
}: NewStashFormProps) {
  const toast = useToast();
  const isRateLimited = useIsRateLimited();
  const renderInFooter = useModalFooter();
  const createMutation = useCreateStashMutation();
  const { data: stashConfig } = useStashConfigQuery();
  const { uploadImage, isUploading } = useStashImageUpload();
  const quickPicks = useMemo(() => getQuickPickDates(), []);

  // Initialize state from prefill
  const [name, setName] = useState(prefill?.name || '');
  const [url, setUrl] = useState(prefill?.sourceUrl || '');
  const [amount, setAmount] = useState('');
  const [targetDate, setTargetDate] = useState(quickPicks.threeMonths);
  const [emoji, setEmoji] = useState('');
  const [goalType, setGoalType] = useState<StashGoalType>('one_time');
  const [categorySelection, setCategorySelection] = useState<CategorySelectionResult>({
    mode: 'create_new',
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [openverseImage, setOpenverseImage] = useState<ImageSelection | null>(null);
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [startingBalance, setStartingBalance] = useState('');
  const [isStartingBalanceFocused, setIsStartingBalanceFocused] = useState(false);
  const [isDebtSelectorOpen, setIsDebtSelectorOpen] = useState(false);

  // Get available to stash amount for validation
  // Use the same options as the widget so the numbers match
  const { data: availableData, isLoading: isLoadingAvailable } = useAvailableToStash({
    includeExpectedIncome: stashConfig?.includeExpectedIncome ?? false,
    bufferAmount: stashConfig?.bufferAmount ?? 0,
  });

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const startingBalanceNum = Number.parseInt(startingBalance, 10) || 0;

  const monthlyTarget = useMemo(() => {
    const amountNum = Number.parseFloat(amount) || 0;
    return amountNum > 0 && targetDate
      ? calculateStashMonthlyTarget(amountNum, startingBalanceNum, targetDate)
      : 0;
  }, [amount, targetDate, startingBalanceNum]);

  const monthsRemaining = targetDate ? calculateMonthsRemaining(targetDate) : 0;

  const handleImageSelect = useCallback((file: File) => {
    setSelectedImage(file);
    setOpenverseImage(null); // Clear Openverse selection when local file is selected
  }, []);
  const handleImageRemove = useCallback(() => {
    setSelectedImage(null);
    setOpenverseImage(null);
  }, []);
  const handleOpenverseSelect = useCallback((selection: ImageSelection) => {
    // Clear local file when Openverse image is selected
    if (selection.url) {
      setSelectedImage(null);
      setOpenverseImage(selection);
    } else {
      setOpenverseImage(null);
    }
  }, []);

  // eslint-disable-next-line sonarjs/cognitive-complexity -- Form validation requires multiple checks
  const handleSubmit = useCallback(async () => {
    const amountNum = Number.parseFloat(amount);

    // Validate form
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

    // Validate category selection
    const { mode, categoryGroupId, categoryId, flexibleGroupId } = categorySelection;
    if (mode === 'create_new' && !categoryGroupId) {
      toast.error('Please select a category group');
      return;
    }
    if (mode === 'use_existing' && !categoryId && !flexibleGroupId) {
      toast.error('Please select a category');
      return;
    }

    try {
      let customImagePath: string | undefined;

      // Handle local file upload
      if (selectedImage) {
        const tempId = `temp-${Date.now()}`;
        customImagePath = (await uploadImage(tempId, selectedImage)) ?? undefined;
      }
      // Handle Openverse image URL (store URL directly)
      else if (openverseImage?.url) {
        customImagePath = openverseImage.url;
      }

      const baseRequest = {
        name: name.trim(),
        amount: amountNum,
        target_date: targetDate,
        goal_type: goalType,
        ...(url.trim() && { source_url: url.trim() }),
        ...(prefill?.sourceBookmarkId && { source_bookmark_id: prefill.sourceBookmarkId }),
        ...(emoji && { emoji }),
        ...(customImagePath && { custom_image_path: customImagePath }),
        // Store Openverse attribution if using an Openverse image
        ...(openverseImage?.attribution && { image_attribution: openverseImage.attribution }),
        // Starting balance - set initial rollover balance
        ...(startingBalanceNum > 0 && { starting_balance: startingBalanceNum }),
      };

      let request;
      if (mode === 'create_new' && categoryGroupId) {
        request = { ...baseRequest, category_group_id: categoryGroupId };
      } else if (flexibleGroupId) {
        // use_flexible_group - link to the group directly for group-level rollover
        request = { ...baseRequest, flexible_group_id: flexibleGroupId };
      } else if (categoryId) {
        request = { ...baseRequest, existing_category_id: categoryId };
      } else {
        toast.error('Please select a category');
        return;
      }

      await createMutation.mutateAsync(request);
      toast.success('Stash created');

      if (pendingBookmarkId && onPendingConverted) {
        await onPendingConverted(pendingBookmarkId);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(handleApiError(err, 'Creating stash'));
    }
  }, [
    amount,
    name,
    targetDate,
    url,
    emoji,
    goalType,
    categorySelection,
    selectedImage,
    openverseImage,
    prefill,
    createMutation,
    uploadImage,
    toast,
    pendingBookmarkId,
    onPendingConverted,
    onSuccess,
    onClose,
    startingBalanceNum,
  ]);

  const isSubmitting = createMutation.isPending || isUploading;
  const amountNum = Number.parseFloat(amount) || 0;

  // Category validation
  const isCategoryValid =
    categorySelection.mode === 'create_new'
      ? Boolean(categorySelection.categoryGroupId)
      : Boolean(categorySelection.categoryId) || Boolean(categorySelection.flexibleGroupId);

  // Starting balance validation - cannot exceed available to stash
  const availableAmount = availableData?.available;
  const isStartingBalanceOverAvailable =
    availableAmount !== undefined && startingBalanceNum > availableAmount;

  const isFormValid =
    name.trim() &&
    amountNum > 0 &&
    targetDate &&
    monthlyTarget >= 1 &&
    isCategoryValid &&
    !isStartingBalanceOverAvailable;
  const isDisabled = isSubmitting || isRateLimited || !isFormValid;

  return (
    <div className="space-y-3">
      <NewStashImageUpload
        sourceUrl={prefill?.sourceUrl}
        selectedImage={selectedImage}
        imagePreview={imagePreview}
        onImageSelect={handleImageSelect}
        onImageRemove={handleImageRemove}
        onPreviewChange={setImagePreview}
        onOpenverseSelect={handleOpenverseSelect}
        openverseImageUrl={openverseImage?.thumbnail}
      />

      <div>
        <NameInputWithEmoji
          id="stash-name"
          value={name}
          onChange={setName}
          emoji={emoji}
          onEmojiChange={setEmoji}
          onFocusChange={setIsNameFocused}
        />
        {/* Aligned with text input (after emoji picker w-12 + gap-2) */}
        <div
          className={`pl-14 transition-all duration-200 overflow-hidden ${
            isNameFocused || url || isUrlModalOpen
              ? 'opacity-100 translate-y-0 mt-1 h-auto'
              : 'opacity-0 -translate-y-1 pointer-events-none h-0'
          }`}
        >
          <UrlDisplay value={url} onChange={setUrl} onModalOpenChange={setIsUrlModalOpen} />
        </div>
      </div>

      {/* Goal container - intention inputs + progress preview */}
      <div
        className="p-4 rounded-lg"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        {/* Sentence-style intention input: "Save $X as a [type] by [date]" */}
        <div className="flex items-center gap-x-2 gap-y-1 flex-wrap justify-center">
          <span
            className="h-10 inline-flex items-center"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            I intend to save
          </span>
          <AmountInput
            id="stash-amount"
            value={amount}
            onChange={setAmount}
            hideLabel
            showSearchButton={goalType === 'debt'}
            onSearchClick={() => setIsDebtSelectorOpen(true)}
          />
          <span
            className="h-10 inline-flex items-center"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            {goalType === 'one_time' ? 'for a' : goalType === 'debt' ? 'towards a' : 'as a'}
          </span>
          <div className="basis-full h-0" />
          <GoalTypeSelector value={goalType} onChange={setGoalType} hideLabel />
          <span
            className="h-10 inline-flex items-center"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            by
          </span>
          <TargetDateInput
            id="stash-date"
            value={targetDate}
            onChange={setTargetDate}
            minDate={today}
            quickPickOptions={[]}
            hideLabel
          />
          <div className="basis-full h-0" />
          <span
            className="h-10 inline-flex items-center self-start"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            I&apos;ve already saved
          </span>
          <StartingBalanceInput
            value={startingBalance}
            onChange={setStartingBalance}
            availableAmount={availableAmount}
            isLoading={isLoadingAvailable}
            isFocused={isStartingBalanceFocused}
            onFocusChange={setIsStartingBalanceFocused}
          />
        </div>

        {/* Progress Preview - shows calculated monthly rate and timeline */}
        {amountNum > 0 && targetDate && (
          <>
            <div className="my-3 border-t" style={{ borderColor: 'var(--monarch-border)' }} />
            <SavingsProgressBar
              totalSaved={startingBalanceNum}
              targetAmount={amountNum}
              progressPercent={
                amountNum > 0 ? Math.min(100, (startingBalanceNum / amountNum) * 100) : 0
              }
              displayStatus={startingBalanceNum >= amountNum ? 'funded' : 'behind'}
              isEnabled={true}
              savedLabel="committed"
            />
            <div
              className="flex justify-between text-sm mt-3 pt-3 border-t"
              style={{ borderColor: 'var(--monarch-border)' }}
            >
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
          </>
        )}
      </div>

      {/* Category Selection */}
      <InlineCategorySelector
        value={categorySelection}
        onChange={setCategorySelection}
        defaultCategoryGroupId={stashConfig?.defaultCategoryGroupId ?? undefined}
      />

      {/* Footer portaled to Modal's sticky footer area */}
      {renderInFooter(
        <div className="p-4 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
          {renderFooter({
            isDisabled,
            isSubmitting,
            onSubmit: handleSubmit,
          })}
        </div>
      )}

      {/* Debt Account Selector Modal */}
      <DebtAccountSelectorModal
        isOpen={isDebtSelectorOpen}
        onClose={() => setIsDebtSelectorOpen(false)}
        onSelect={(account) => {
          setAmount(Math.abs(account.balance).toString());
        }}
      />
    </div>
  );
}
