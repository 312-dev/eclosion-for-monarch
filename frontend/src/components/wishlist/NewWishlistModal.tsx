/**
 * NewWishlistModal Component
 *
 * Modal for creating a new wishlist item.
 * Features:
 * - Name input (pre-filled from bookmark if available)
 * - Amount input with currency formatting
 * - Target date picker with quick picks
 * - Two-modal flow: item details → category selection
 * - Optional emoji picker
 * - Live calculation of monthly savings needed
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Icons } from '../icons';
import { EmojiPicker } from '../EmojiPicker';
import {
  useCreateWishlistMutation,
  useWishlistConfigQuery,
} from '../../api/queries';
import { useDemo } from '../../context/DemoContext';
import { useToast } from '../../context/ToastContext';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useWishlistImageUpload } from '../../hooks';
import { handleApiError } from '../../utils';
import {
  calculateWishlistMonthlyTarget,
  getQuickPickDates,
  formatMonthsRemaining,
  calculateMonthsRemaining,
} from '../../utils/savingsCalculations';
import * as api from '../../api/core/wishlist';
import { WishlistCategoryModal, type CategorySelection } from './WishlistCategoryModal';

interface NewWishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Pre-filled data from bookmark sync */
  prefill?: {
    name?: string;
    sourceUrl?: string;
    sourceBookmarkId?: string;
  };
  /** ID of pending bookmark being converted (if any) */
  pendingBookmarkId?: string;
  /** Called when a pending bookmark is successfully converted to a wishlist item */
  onPendingConverted?: (id: string) => Promise<void>;
}

export function NewWishlistModal({
  isOpen,
  onClose,
  onSuccess,
  prefill,
  pendingBookmarkId,
  onPendingConverted,
}: NewWishlistModalProps) {
  const toast = useToast();
  const isDemo = useDemo();
  const isRateLimited = useIsRateLimited();
  const createMutation = useCreateWishlistMutation();
  const { data: wishlistConfig } = useWishlistConfigQuery();
  const { uploadImage, isUploading: isUploadingImage } = useWishlistImageUpload();

  // Form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [amount, setAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [emoji, setEmoji] = useState('');

  // Category selection modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // og:image auto-fetch state
  const [isFetchingOgImage, setIsFetchingOgImage] = useState(false);
  const ogFetchIdRef = useRef(0);

  // Today's date for min validation (YYYY-MM-DD format)
  const today = useMemo(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }, []);

  // Quick pick dates
  const quickPicks = useMemo(() => getQuickPickDates(), []);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(prefill?.name || '');
      setUrl(prefill?.sourceUrl || '');
      setAmount('');
      setTargetDate(quickPicks.threeMonths);
      setEmoji('');
      // Clear image state
      setSelectedImage(null);
      setImagePreview(null);
      setIsFetchingOgImage(false);
      setIsCategoryModalOpen(false);
    }
  }, [isOpen, prefill, quickPicks.threeMonths]);

  // Auto-fetch og:image when modal opens with a URL (desktop only)
  useEffect(() => {
    if (!isOpen || !prefill?.sourceUrl || isDemo) {
      return;
    }

    // Increment fetch ID to invalidate any previous fetch
    const currentFetchId = ++ogFetchIdRef.current;
    setIsFetchingOgImage(true);

    const fetchImage = async () => {
      try {
        const imageData = await api.fetchOgImage(prefill.sourceUrl!);

        // Only apply if this fetch is still the active one and user hasn't selected an image
        if (ogFetchIdRef.current === currentFetchId && imageData) {
          setImagePreview(imageData);
          // Convert base64 to File for upload on submit
          const response = await fetch(imageData);
          const blob = await response.blob();
          const file = new File([blob], 'og-image.jpg', { type: blob.type });
          setSelectedImage(file);
        }
      } catch {
        // Fail silently - no toast as per requirements
      } finally {
        if (ogFetchIdRef.current === currentFetchId) {
          setIsFetchingOgImage(false);
        }
      }
    };

    fetchImage();

    // Cleanup: invalidate this fetch if modal closes or URL changes
    return () => {
      ogFetchIdRef.current++;
    };
  }, [isOpen, prefill?.sourceUrl, isDemo]);

  // Calculate monthly target based on current inputs
  const monthlyTarget = useMemo(() => {
    const amountNum = parseFloat(amount) || 0;
    if (amountNum <= 0 || !targetDate) return 0;
    return calculateWishlistMonthlyTarget(amountNum, 0, targetDate);
  }, [amount, targetDate]);

  const monthsRemaining = useMemo(() => {
    if (!targetDate) return 0;
    return calculateMonthsRemaining(targetDate);
  }, [targetDate]);

  // Image handling
  const handleImageSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    // Cancel any ongoing og:image fetch
    ogFetchIdRef.current++;
    setIsFetchingOgImage(false);

    setSelectedImage(file);
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setImagePreview(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageSelect(file);
    }
  }, [handleImageSelect]);

  const handleImageDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleImageDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleImageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
    e.target.value = '';
  }, [handleImageSelect]);

  const handleImageRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Cancel any ongoing og:image fetch
    ogFetchIdRef.current++;
    setIsFetchingOgImage(false);
    setSelectedImage(null);
    setImagePreview(null);
  }, []);

  // Handle emoji selection (adapter for EmojiPicker's async interface)
  const handleEmojiSelect = useCallback(async (selectedEmoji: string) => {
    setEmoji(selectedEmoji);
  }, []);

  // Handle "Create" button - opens category selection modal
  const handleCreateClick = () => {
    const amountNum = parseFloat(amount);
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

    // Open category selection modal
    setIsCategoryModalOpen(true);
  };

  // Handle category selection and create the item
  const handleCategoryConfirm = async (selection: CategorySelection) => {
    const amountNum = parseFloat(amount);

    try {
      // Upload image first if selected (use temp ID)
      let customImagePath: string | undefined;
      if (selectedImage) {
        const tempId = `temp-${Date.now()}`;
        const uploadedPath = await uploadImage(tempId, selectedImage);
        if (uploadedPath) {
          customImagePath = uploadedPath;
        }
      }

      // Build the request based on selection type
      const baseRequest = {
        name: name.trim(),
        amount: amountNum,
        target_date: targetDate,
        ...(url.trim() && { source_url: url.trim() }),
        ...(prefill?.sourceBookmarkId && { source_bookmark_id: prefill.sourceBookmarkId }),
        ...(emoji && { emoji }),
        ...(customImagePath && { custom_image_path: customImagePath }),
      };

      if (selection.type === 'create_new') {
        await createMutation.mutateAsync({
          ...baseRequest,
          category_group_id: selection.categoryGroupId,
        });
      } else {
        await createMutation.mutateAsync({
          ...baseRequest,
          existing_category_id: selection.categoryId,
        });
      }

      toast.success('Wishlist item created');
      setIsCategoryModalOpen(false);

      // If this was created from a pending bookmark, mark it as converted
      // Must await before calling onClose to ensure the pending item is cleared
      if (pendingBookmarkId && onPendingConverted) {
        await onPendingConverted(pendingBookmarkId);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(handleApiError(err, 'Creating wishlist item'));
    }
  };

  // Format amount for display (whole numbers only - no decimals)
  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    setAmount(cleaned);
  };

  const isSubmitting = createMutation.isPending || isUploadingImage;
  const amountNum = Number.parseFloat(amount) || 0;
  // Form is valid when we have name, amount, date, and monthly target >= $1
  // Category selection happens in the next modal
  const isFormValid = name.trim() && amountNum > 0 && targetDate && monthlyTarget >= 1;
  const isDisabled = isSubmitting || isRateLimited || !isFormValid;

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium rounded-md btn-press"
        style={{
          color: 'var(--monarch-text-muted)',
          backgroundColor: 'transparent',
        }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleCreateClick}
        disabled={isDisabled}
        className="px-4 py-2 text-sm font-medium rounded-md btn-press"
        style={{
          backgroundColor: isDisabled ? 'var(--monarch-border)' : 'var(--monarch-teal)',
          color: isDisabled ? 'var(--monarch-text-muted)' : 'white',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
        }}
      >
        Create
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Wishlist Item"
      description="Save for something you want to buy"
      footer={footer}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Header Image Upload */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => imageInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              imageInputRef.current?.click();
            }
          }}
          onDrop={handleImageDrop}
          onDragOver={handleImageDragOver}
          onDragLeave={handleImageDragLeave}
          className="relative w-full h-32 rounded-lg border-2 border-dashed transition-all cursor-pointer overflow-hidden"
          style={{
            borderColor: isDragging
              ? 'var(--monarch-orange)'
              : 'var(--monarch-border)',
            backgroundColor: isDragging ? 'var(--monarch-orange-bg)' : 'var(--monarch-bg-card)',
          }}
          aria-label={imagePreview ? 'Change image' : 'Upload image'}
        >
          {/* Hidden file input */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageInputChange}
            className="hidden"
            aria-hidden="true"
          />

          {/* Image preview */}
          {imagePreview && (
            <>
              <img
                src={imagePreview}
                alt="Item preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Remove button */}
              <button
                type="button"
                onClick={handleImageRemove}
                className="absolute top-2 right-2 p-1 rounded-full transition-colors z-10"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                }}
                aria-label="Remove image"
              >
                <Icons.X size={16} />
              </button>
              {/* Change overlay on hover */}
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
              >
                <span className="text-sm font-medium text-white">Click to change</span>
              </div>
            </>
          )}

          {/* Empty state / Loading state */}
          {!imagePreview && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              {isFetchingOgImage ? (
                <>
                  <Icons.Refresh
                    size={24}
                    className="animate-spin"
                    style={{ color: 'var(--monarch-teal)' }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: 'var(--monarch-teal)' }}
                  >
                    Fetching image...
                  </span>
                </>
              ) : (
                <>
                  <Icons.Upload
                    size={24}
                    style={{ color: isDragging ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)' }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: isDragging ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)' }}
                  >
                    {isDragging ? 'Drop image here' : 'Add cover image (optional)'}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Name Input */}
        <div>
          <label
            htmlFor="wishlist-name"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text)' }}
          >
            Name
          </label>
          <div className="flex gap-2 items-center">
            {/* Emoji picker */}
            <div
              className="w-12 h-10 flex items-center justify-center text-xl rounded-md"
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
              id="wishlist-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What are you saving for?"
              className="flex-1 h-10 px-3 py-2 rounded-md"
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
            htmlFor="wishlist-url"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text)' }}
          >
            URL <span style={{ color: 'var(--monarch-text-muted)', fontWeight: 'normal' }}>(optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              id="wishlist-url"
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
            htmlFor="wishlist-amount"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text)' }}
          >
            Amount
          </label>
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              $
            </span>
            <input
              id="wishlist-amount"
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
            htmlFor="wishlist-date"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text)' }}
          >
            Goal Date
          </label>
          <input
            id="wishlist-date"
            type="date"
            value={targetDate}
            min={today}
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
              { label: 'in 2 months', date: quickPicks.twoMonths },
              { label: 'in 3 months', date: quickPicks.threeMonths },
              { label: 'in 6 months', date: quickPicks.sixMonths },
              { label: 'in 1 year', date: quickPicks.oneYear },
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

        {/* Monthly Target Preview */}
        {amount && Number.parseFloat(amount) > 0 && targetDate && (
          <div
            className="p-3 rounded-md text-sm"
            style={{
              backgroundColor: monthlyTarget < 1 ? 'var(--monarch-orange-bg)' : 'var(--monarch-teal-light)',
              color: monthlyTarget < 1 ? 'var(--monarch-orange)' : 'var(--monarch-teal)',
            }}
          >
            {monthlyTarget < 1 ? (
              <>
                <strong>Goal date too far:</strong> Choose a closer date to require at least $1/mo
              </>
            ) : (
              <>
                <strong>Monthly savings needed:</strong> ${monthlyTarget}/mo
                <span className="text-xs ml-2">
                  ({formatMonthsRemaining(monthsRemaining)} to goal)
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Category Selection Modal */}
      <WishlistCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onConfirm={handleCategoryConfirm}
        {...(wishlistConfig?.defaultCategoryGroupId && {
          defaultCategoryGroupId: wishlistConfig.defaultCategoryGroupId,
        })}
        isSubmitting={isSubmitting}
      />
    </Modal>
  );
}
