import type { ReadyToAssign as ReadyToAssignData } from '../../types';
import { formatCurrency } from '../../utils';

interface MobileReadyToAssignProps {
  data: ReadyToAssignData;
  currentMonthlyCost: number;
}

export function MobileReadyToAssign({ data, currentMonthlyCost }: Readonly<MobileReadyToAssignProps>) {
  const isPositive = data.ready_to_assign >= 0;

  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3 bg-monarch-bg-card border-b border-monarch-border">
      {/* Left to Budget */}
      <a
        href="https://app.monarch.com/plan"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${formatCurrency(data.ready_to_assign, { maximumFractionDigits: 0 })} left to budget. Opens Monarch budget in new tab`}
        className={`rounded-lg px-3 py-2 flex flex-col items-center shrink-0 hover:opacity-80 transition-opacity ${isPositive ? 'bg-monarch-success-bg' : 'bg-monarch-error-bg'}`}
      >
        <div className={`text-lg font-bold ${isPositive ? 'text-monarch-success' : 'text-monarch-error'}`}>
          {formatCurrency(data.ready_to_assign, { maximumFractionDigits: 0 })}
        </div>
        <div className={`text-xs flex items-center gap-0.5 ${isPositive ? 'text-monarch-success' : 'text-monarch-error'}`}>
          Left to budget
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </div>
      </a>

      {/* Current Monthly */}
      <div className="text-center shrink-0">
        <div className="text-xs text-monarch-text-muted">Monthly</div>
        <div className="text-base font-semibold text-monarch-orange">
          {formatCurrency(currentMonthlyCost, { maximumFractionDigits: 0 })}
        </div>
      </div>
    </div>
  );
}
