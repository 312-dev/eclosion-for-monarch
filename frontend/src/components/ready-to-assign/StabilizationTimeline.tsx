import { useCallback } from 'react';
import { Portal } from '../Portal';
import { formatCurrency } from '../../utils';
import { useDropdown } from '../../hooks';
import { AnchorIcon } from '../icons';

interface StabilizationData {
  hasCatchUp: boolean;
  stableMonthlyRate: number;
  monthsUntilStable: number;
  stabilizationDate: string;
}

interface TimelineMonth {
  month: string;
  year: string;
  showYear: boolean;
  amount: number;
}

interface StabilizationPopoverProps {
  popoverId: string;
  infoDropdown: ReturnType<typeof useDropdown<HTMLDivElement, HTMLButtonElement>>;
  stabilization: StabilizationData;
  lowestMonthlyCost: number;
  catchUpAmount: number;
  itemsBehindCount: number;
  currentMonthlyCost: number;
}

export function StabilizationPopover({
  popoverId,
  infoDropdown,
  stabilization,
  lowestMonthlyCost,
  catchUpAmount,
  itemsBehindCount,
  currentMonthlyCost,
}: Readonly<StabilizationPopoverProps>) {
  const handlePopoverKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        infoDropdown.close();
        infoDropdown.triggerRef.current?.focus();
      }
    },
    [infoDropdown]
  );

  if (!infoDropdown.isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-(--z-index-popover)" onClick={infoDropdown.close} aria-hidden="true" />
      <div
        id={popoverId}
        ref={infoDropdown.dropdownRef}
        role="dialog"
        aria-labelledby={`${popoverId}-title`}
        aria-modal="true"
        onKeyDown={handlePopoverKeyDown}
        className="fixed z-(--z-index-popover) rounded-xl shadow-lg p-4 text-left w-70 bg-monarch-bg-card border border-monarch-border"
        style={{ top: infoDropdown.position.top, right: infoDropdown.position.right }}
      >
        <div className="flex justify-between items-start mb-3">
          <h3 id={`${popoverId}-title`} className="font-semibold text-sm text-monarch-text-dark">
            Stabilization Point
          </h3>
          <button
            type="button"
            onClick={infoDropdown.close}
            aria-label="Close dialog"
            className="-mt-1 -mr-1 p-1 transition-colors text-monarch-text-muted"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="text-xs space-y-3 text-monarch-text-muted">
          <p className="leading-relaxed">
            {stabilization.monthsUntilStable > 0 ? (
              <>
                Your monthly rate will stabilize at{' '}
                <span className="font-medium text-monarch-success">
                  {formatCurrency(stabilization.stableMonthlyRate, { maximumFractionDigits: 0 })}
                </span>{' '}
                in {stabilization.monthsUntilStable} month{stabilization.monthsUntilStable === 1 ? '' : 's'} when all catch-up payments complete.
              </>
            ) : (
              <>
                Your monthly rate is already at its stable level of{' '}
                <span className="font-medium text-monarch-success">
                  {formatCurrency(stabilization.stableMonthlyRate, { maximumFractionDigits: 0 })}
                </span>
                .
              </>
            )}
          </p>

          {catchUpAmount > 0 && (
            <div className="rounded-lg p-2 space-y-1 bg-monarch-bg-page">
              <div className="flex justify-between">
                <span>Stable rate</span>
                <span className="font-medium text-monarch-success">
                  {formatCurrency(Math.round(lowestMonthlyCost), { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between text-monarch-orange">
                <span>
                  + Catch-up ({itemsBehindCount} item{itemsBehindCount === 1 ? '' : 's'})
                </span>
                <span className="font-medium">{formatCurrency(catchUpAmount, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between pt-1 font-semibold text-monarch-text-dark border-t border-monarch-border">
                <span>Current</span>
                <span>{formatCurrency(currentMonthlyCost, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          )}

          <p className="text-[11px] italic">
            The stable rate is the sum of each expense's ideal monthly rate (cost ÷ frequency). Over-contributing is not reflected in this projection.
          </p>
        </div>
      </div>
    </Portal>
  );
}

interface StabilizationTimelineProps {
  popoverId: string;
  infoDropdown: ReturnType<typeof useDropdown<HTMLDivElement, HTMLButtonElement>>;
  stabilization: StabilizationData;
  timelineMonths: TimelineMonth[];
}

export function StabilizationTimeline({
  popoverId,
  infoDropdown,
  stabilization,
  timelineMonths,
}: Readonly<StabilizationTimelineProps>) {
  if (!stabilization.hasCatchUp) return null;

  return (
    <button
      ref={infoDropdown.triggerRef}
      type="button"
      aria-label={`View details: Stable rate of ${formatCurrency(stabilization.stableMonthlyRate, { maximumFractionDigits: 0 })} starting ${stabilization.stabilizationDate}`}
      aria-expanded={infoDropdown.isOpen}
      aria-haspopup="dialog"
      aria-controls={infoDropdown.isOpen ? popoverId : undefined}
      className="w-full hover:opacity-90 transition-opacity rounded-b-xl border-x border-b border-monarch-border bg-monarch-bg-card overflow-hidden -mt-px"
      onClick={infoDropdown.toggle}
    >
      {/* Month rows section */}
      <div className="flex px-3 py-2">
        {/* Timeline track */}
        <div className="w-6 flex flex-col items-center relative">
          {/* Vertical line connecting all dots */}
          <div className="absolute left-1/2 -translate-x-1/2 w-px bg-neutral-200 top-2.75 bottom-2.75" />
          {/* Dots - each in a container matching row height */}
          {timelineMonths.slice(0, -1).map((item) => (
            <div key={`dot-${item.month}-${item.year}`} className="h-5.5 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 z-10" />
            </div>
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 flex flex-col">
          {timelineMonths.slice(0, -1).map((item) => (
            <div key={`row-${item.month}-${item.year}`} className="h-5.5 flex items-center text-xs text-monarch-text-muted">
              <span className="flex-1">
                {item.month}
                {item.showYear && ` ${item.year}`}
              </span>
              <span>{formatCurrency(item.amount, { maximumFractionDigits: 0 })}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Stabilization row with success background - styled as link */}
      <div className="flex items-center px-3 py-2 transition-colors" style={{ backgroundColor: 'var(--monarch-success-bg)' }}>
        <div className="w-6 flex justify-center">
          <AnchorIcon size={14} className="text-monarch-success" aria-hidden="true" />
        </div>
        <div className="flex-1 flex items-center justify-between text-monarch-success">
          <span className="text-xs font-medium underline underline-offset-2" style={{ textDecorationColor: 'var(--monarch-success)' }}>
            {stabilization.stabilizationDate}
          </span>
          <span className="text-sm font-semibold">{formatCurrency(stabilization.stableMonthlyRate, { maximumFractionDigits: 0 })}/mo</span>
        </div>
      </div>
    </button>
  );
}

export type { StabilizationData, TimelineMonth };
