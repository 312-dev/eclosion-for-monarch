import { formatCurrency } from '../../utils';
import { AnchorIcon } from '../icons';
import { Tooltip } from '../ui/Tooltip';

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

interface StabilizationTimelineProps {
  stabilization: StabilizationData;
  timelineMonths: TimelineMonth[];
  catchUpAmount: number;
  itemsBehindCount: number;
  currentMonthlyCost: number;
}

export function StabilizationTimeline({
  stabilization,
  timelineMonths,
  catchUpAmount,
  itemsBehindCount,
  currentMonthlyCost,
}: Readonly<StabilizationTimelineProps>) {
  if (!stabilization.hasCatchUp) return null;

  const tooltipContent = (
    <div className="text-xs space-y-2">
      <p className="leading-relaxed">
        Your monthly rate will stabilize at{' '}
        <span className="font-medium text-monarch-success">
          {formatCurrency(stabilization.stableMonthlyRate, { maximumFractionDigits: 0 })}
        </span>{' '}
        in {stabilization.monthsUntilStable} month{stabilization.monthsUntilStable === 1 ? '' : 's'}{' '}
        when all catch-up payments complete.
      </p>

      {catchUpAmount > 0 && (
        <div className="rounded-lg p-2 space-y-1 bg-black/10">
          <div className="flex justify-between">
            <span>Stable rate</span>
            <span className="font-medium text-monarch-success">
              {formatCurrency(stabilization.stableMonthlyRate, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between text-monarch-orange">
            <span>
              + Catch-up ({itemsBehindCount} item{itemsBehindCount === 1 ? '' : 's'})
            </span>
            <span className="font-medium">
              {formatCurrency(catchUpAmount, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between pt-1 font-semibold border-t border-white/20">
            <span>Current</span>
            <span>{formatCurrency(currentMonthlyCost, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full rounded-b-xl border-x border-b border-monarch-border bg-monarch-bg-card overflow-hidden -mt-px">
      {/* Month rows section */}
      <div className="flex px-3 py-2">
        {/* Timeline track */}
        <div className="w-6 flex flex-col items-center relative">
          {/* Vertical line connecting all dots */}
          <div className="absolute left-1/2 -translate-x-1/2 w-px bg-neutral-200 top-2.75 bottom-2.75" />
          {/* Dots - each in a container matching row height */}
          {timelineMonths.slice(0, -1).map((item) => (
            <div
              key={`dot-${item.month}-${item.year}`}
              className="h-5.5 flex items-center justify-center"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 z-10" />
            </div>
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 flex flex-col">
          {timelineMonths.slice(0, -1).map((item) => (
            <div
              key={`row-${item.month}-${item.year}`}
              className="h-5.5 flex items-center text-xs text-monarch-text-muted"
            >
              <span className="flex-1">
                {item.month}
                {item.showYear && ` ${item.year}`}
              </span>
              <span>{formatCurrency(item.amount, { maximumFractionDigits: 0 })}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Stabilization row with success background */}
      <div
        className="flex items-center px-3 py-2"
        style={{ backgroundColor: 'var(--monarch-success-bg)' }}
      >
        <div className="w-6 flex justify-center">
          <AnchorIcon size={14} className="text-monarch-success" aria-hidden="true" />
        </div>
        <div className="flex-1 flex items-center justify-between text-monarch-success">
          <Tooltip content={tooltipContent} side="bottom" align="start">
            <span className="text-xs font-medium cursor-help underline decoration-dotted underline-offset-2">
              {stabilization.stabilizationDate}
            </span>
          </Tooltip>
          <span className="text-sm font-semibold">
            {formatCurrency(stabilization.stableMonthlyRate, { maximumFractionDigits: 0 })}/mo
          </span>
        </div>
      </div>
    </div>
  );
}

export type { StabilizationData, TimelineMonth };
