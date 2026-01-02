/**
 * Wizard Components
 *
 * Shared reusable components for setup wizards.
 * Extracted from the original SetupWizard for use in per-tool wizards.
 */

import { useState, useEffect } from 'react';
import { useTour } from '@reactour/tour';
import type { RecurringItem } from '../../types';
import type { PendingLink } from '../LinkCategoryModal';
import { UI } from '../../constants';
import {
  formatCurrency,
  formatFrequency,
  formatDueDate,
} from '../../utils';
import {
  CheckIcon,
  ChevronDownIcon,
  LinkIcon as LinkIconComponent,
} from '../icons';

// Re-export utilities from centralized location for backward compatibility
export {
  formatCurrency,
  formatFrequency,
  formatDueDate,
  FREQUENCY_ORDER,
} from '../../utils';

// Re-export icons from SetupWizardIcons for backward compatibility
export {
  AppIcon,
  RecurringIcon,
  EmptyInboxIcon,
  PackageIcon,
  CheckCircleIcon,
  LinkIcon,
  FrequencyIcon,
} from './SetupWizardIcons';

// Local reference for internal use
import { FrequencyIcon, LinkIcon } from './SetupWizardIcons';

// ============================================================================
// UI Components
// ============================================================================

interface StepIndicatorProps {
  steps: Array<{ id: string; title: string }>;
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300"
            style={{
              backgroundColor: index <= currentStep ? 'var(--monarch-orange)' : 'var(--monarch-bg-page)',
              color: index <= currentStep ? 'white' : 'var(--monarch-text-muted)',
              border: index === currentStep ? '2px solid var(--monarch-orange)' : '1px solid var(--monarch-border)',
              transform: index === currentStep ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {index + 1}
          </div>
          {index < steps.length - 1 && (
            <div
              className="w-6 h-0.5 transition-colors duration-300"
              style={{
                backgroundColor: index < currentStep ? 'var(--monarch-orange)' : 'var(--monarch-border)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg"
      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
          {title}
        </div>
        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          {description}
        </div>
      </div>
    </div>
  );
}

export function MerchantLogo({ item, size = 40 }: { item: RecurringItem; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const displayName = item.merchant_name || item.name;
  const initial = displayName.charAt(0).toUpperCase();

  const colors = [
    '#FF692D', '#4A90D9', '#50C878', '#9B59B6', '#E74C3C',
    '#3498DB', '#1ABC9C', '#F39C12', '#E91E63', '#00BCD4'
  ];
  const colorIndex = displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const bgColor = colors[colorIndex];

  if (item.logo_url && !imgError) {
    return (
      <img
        src={item.logo_url}
        alt=""
        className="rounded-lg object-cover"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="rounded-lg flex items-center justify-center text-white font-semibold"
      style={{ width: size, height: size, backgroundColor: bgColor, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

export interface ItemCardProps {
  item: RecurringItem;
  checked: boolean;
  onChange: () => void;
  onLinkClick: (() => void) | undefined;
  onUnlink: (() => void) | undefined;
  pendingLink: PendingLink | undefined;
}

export function ItemCard({
  item,
  checked,
  onChange,
  onLinkClick,
  onUnlink,
  pendingLink,
}: ItemCardProps) {
  const displayName = item.merchant_name || item.name.split(' (')[0];
  const isLinked = !!pendingLink;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover-item-card-unchecked ${checked ? 'item-card-checked' : ''}`}
      style={{
        backgroundColor: checked ? 'rgba(255, 105, 45, 0.08)' : 'var(--monarch-bg-card)',
        border: checked ? '1px solid var(--monarch-orange)' : '1px solid var(--monarch-border)',
      }}
      onClick={onChange}
    >
      <div
        className="shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
        style={{
          borderColor: checked ? 'var(--monarch-orange)' : 'var(--monarch-border)',
          backgroundColor: checked ? 'var(--monarch-orange)' : 'transparent',
        }}
      >
        {checked && (
          <CheckIcon size={12} color="white" strokeWidth={3} />
        )}
      </div>

      <MerchantLogo item={item} size={40} />

      <div className="flex-1 min-w-0">
        <div className="font-medium truncate" style={{ color: 'var(--monarch-text-dark)' }}>
          {displayName}
        </div>
        <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
          {isLinked ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnlink?.();
              }}
              className="inline-flex items-center gap-1 hover:underline"
              style={{ color: 'var(--monarch-success)' }}
              title="Click to unlink"
            >
              <LinkIconComponent size={12} />
              {pendingLink.categoryIcon && <span>{pendingLink.categoryIcon}</span>}
              {pendingLink.categoryName}
              <span style={{ color: 'var(--monarch-text-muted)' }}>×</span>
            </button>
          ) : (
            formatDueDate(item.next_due_date)
          )}
        </div>
      </div>

      <div className="text-right shrink-0 flex items-center gap-2">
        {checked && onLinkClick && !isLinked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLinkClick();
            }}
            className="p-1.5 rounded transition-colors hover-link-icon"
            title="Link to existing category"
            data-tour="link-icon"
          >
            <LinkIcon size={16} />
          </button>
        )}
        <div>
          <div className="font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
            {formatCurrency(item.monthly_contribution)}/mo
          </div>
          <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
            {formatCurrency(item.amount)} {formatFrequency(item.frequency).toLowerCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FrequencyGroupProps {
  frequency: string;
  items: RecurringItem[];
  selectedIds: Set<string>;
  pendingLinks: Map<string, PendingLink>;
  onToggleItem: (id: string) => void;
  onToggleGroup: (ids: string[], select: boolean) => void;
  onLinkClick: (item: RecurringItem) => void;
  onUnlink: (itemId: string) => void;
}

export function FrequencyGroup({
  frequency,
  items,
  selectedIds,
  pendingLinks,
  onToggleItem,
  onToggleGroup,
  onLinkClick,
  onUnlink,
}: FrequencyGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const groupIds = items.map(i => i.id);
  const selectedCount = groupIds.filter(id => selectedIds.has(id)).length;
  const allSelected = selectedCount === items.length;
  const someSelected = selectedCount > 0 && selectedCount < items.length;
  const totalMonthly = items.reduce((sum, i) => sum + i.monthly_contribution, 0);

  return (
    <div className="mb-4">
      <div
        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
        style={{ backgroundColor: 'var(--monarch-bg-page)' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <button
          className="p-1"
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed(!collapsed);
          }}
        >
          <ChevronDownIcon
            size={16}
            color="var(--monarch-text-muted)"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          />
        </button>

        <FrequencyIcon frequency={frequency} />

        <div className="flex-1">
          <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            {formatFrequency(frequency)}
          </span>
          <span className="text-sm ml-2" style={{ color: 'var(--monarch-text-muted)' }}>
            ({items.length} item{items.length !== 1 ? 's' : ''})
          </span>
        </div>

        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          {formatCurrency(totalMonthly)}/mo
        </div>

        <button
          className="text-xs px-2 py-1 rounded transition-colors"
          style={{
            color: allSelected ? 'var(--monarch-text-muted)' : 'var(--monarch-orange)',
            backgroundColor: 'transparent',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleGroup(groupIds, !allSelected);
          }}
        >
          {allSelected ? 'Deselect' : someSelected ? 'Select all' : 'Select all'}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-2 mt-2 pl-2">
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              checked={selectedIds.has(item.id)}
              onChange={() => onToggleItem(item.id)}
              onLinkClick={() => onLinkClick(item)}
              onUnlink={() => onUnlink(item.id)}
              pendingLink={pendingLinks.get(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface WizardNavigationProps {
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  canGoBack: boolean;
  canProceed: boolean;
  isLastStep: boolean;
  isSaving: boolean;
  nextLabel: string | undefined;
  showSkip?: boolean;
}

export function WizardNavigation({
  onBack,
  onNext,
  onSkip,
  canGoBack,
  canProceed,
  isLastStep,
  isSaving,
  nextLabel,
  showSkip = true,
}: WizardNavigationProps) {
  return (
    <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--monarch-border)' }}>
      <div className="flex gap-3">
        {canGoBack && (
          <button
            onClick={onBack}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg transition-colors btn-hover-lift disabled:opacity-50"
            style={{
              border: '1px solid var(--monarch-border)',
              color: 'var(--monarch-text-dark)',
              backgroundColor: 'var(--monarch-bg-card)',
            }}
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!canProceed || isSaving}
          className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:cursor-not-allowed btn-hover-lift hover-bg-orange-enabled"
          style={{
            backgroundColor: !canProceed || isSaving ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)',
          }}
        >
          {isSaving ? 'Setting up...' : nextLabel || (isLastStep ? 'Get Started' : 'Continue')}
        </button>
      </div>

      {showSkip && onSkip && (
        <div className="flex justify-center mt-4">
          <button
            onClick={onSkip}
            disabled={isSaving}
            className="text-sm px-4 py-1 rounded transition-colors hover:underline disabled:opacity-50"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            Skip setup
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tour Components & Styles (for use with @reactour/tour)
// ============================================================================

/**
 * TourController - Syncs external state with @reactour/tour
 *
 * Use this component inside a TourProvider to control the tour from parent state.
 *
 * @example
 * <TourProvider steps={steps} styles={wizardTourStyles}>
 *   <TourController isOpen={showTour} onClose={() => setShowTour(false)} />
 *   {children}
 * </TourProvider>
 */
export function TourController({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { setIsOpen, isOpen: tourIsOpen } = useTour();

  // Sync external state → tour state
  useEffect(() => {
    setIsOpen(isOpen);
  }, [isOpen, setIsOpen]);

  // Notify parent when tour closes internally
  useEffect(() => {
    if (!isOpen) return;

    const checkClosed = () => {
      if (!tourIsOpen) {
        onClose();
      }
    };

    // Small delay to let tour state settle
    const timer = setTimeout(checkClosed, UI.INTERVAL.TOUR_CLOSE_CHECK);
    return () => clearTimeout(timer);
  }, [isOpen, tourIsOpen, onClose]);

  return null;
}

export const wizardTourStyles = {
  popover: (base: object) => ({
    ...base,
    backgroundColor: 'var(--monarch-bg-card)',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
    border: '1px solid var(--monarch-border)',
    padding: '16px',
    maxWidth: '300px',
  }),
  maskArea: (base: object) => ({
    ...base,
    rx: 8,
  }),
  badge: (base: object) => ({
    ...base,
    display: 'none',
  }),
  controls: (base: object) => ({
    ...base,
    marginTop: '12px',
  }),
  close: (base: object) => ({
    ...base,
    color: 'var(--monarch-text-muted)',
    width: '12px',
    height: '12px',
    top: '12px',
    right: '12px',
  }),
};
