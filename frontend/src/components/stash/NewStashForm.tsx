/**
 * NewStashForm Component
 *
 * Form content for creating a new stash.
 * Uses key prop for resetting state when modal reopens.
 */

import { useState, useMemo, useCallback } from 'react';
import { useCreateStashMutation, useStashConfigQuery } from '../../api/queries';
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
import { StashCategoryModal, type CategorySelection } from './StashCategoryModal';
import { NewStashImageUpload } from './NewStashImageUpload';
import { SavingsProgressBar } from '../shared';
import {
  NameInputWithEmoji,
  UrlDisplay,
  AmountInput,
  TargetDateInput,
  GoalTypeSelector,
} from './StashFormFields';
import type { StashGoalType } from '../../types';

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
    onSubmit: () => void;
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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const monthlyTarget = useMemo(() => {
    const amountNum = Number.parseFloat(amount) || 0;
    return amountNum > 0 && targetDate ? calculateStashMonthlyTarget(amountNum, 0, targetDate) : 0;
  }, [amount, targetDate]);

  const monthsRemaining = useMemo(
    () => (targetDate ? calculateMonthsRemaining(targetDate) : 0),
    [targetDate]
  );

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
          goal_type: goalType,
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
        toast.success('Stash created');
        setIsCategoryModalOpen(false);

        if (pendingBookmarkId && onPendingConverted) {
          await onPendingConverted(pendingBookmarkId);
        }
        onSuccess?.();
        onClose();
      } catch (err) {
        toast.error(handleApiError(err, 'Creating stash'));
      }
    },
    [
      amount,
      name,
      targetDate,
      url,
      emoji,
      goalType,
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

  return (
    <>
      <div className="space-y-3">
        <NewStashImageUpload
          sourceUrl={prefill?.sourceUrl}
          selectedImage={selectedImage}
          imagePreview={imagePreview}
          onImageSelect={handleImageSelect}
          onImageRemove={handleImageRemove}
          onPreviewChange={setImagePreview}
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
            <span className="py-2" style={{ color: 'var(--monarch-text-muted)' }}>
              I intend to save
            </span>
            <AmountInput id="stash-amount" value={amount} onChange={setAmount} hideLabel />
            <span className="py-2" style={{ color: 'var(--monarch-text-muted)' }}>
              {goalType === 'one_time' ? 'for a' : 'as a'}
            </span>
            <div className="basis-full h-0" />
            <GoalTypeSelector value={goalType} onChange={setGoalType} hideLabel />
            <span className="py-2" style={{ color: 'var(--monarch-text-muted)' }}>
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
          </div>

          {/* Progress Preview - shows calculated monthly rate and timeline */}
          {amountNum > 0 && targetDate && (
            <>
              <div className="my-3 border-t" style={{ borderColor: 'var(--monarch-border)' }} />
              <SavingsProgressBar
                totalSaved={0}
                targetAmount={amountNum}
                progressPercent={0}
                displayStatus="behind"
                isEnabled={true}
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
      </div>

      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-(--monarch-border)">
        {renderFooter({ isDisabled, isSubmitting, onSubmit: validateAndOpenCategory })}
      </div>

      <StashCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onConfirm={handleCategoryConfirm}
        {...(stashConfig?.defaultCategoryGroupId && {
          defaultCategoryGroupId: stashConfig.defaultCategoryGroupId,
        })}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
