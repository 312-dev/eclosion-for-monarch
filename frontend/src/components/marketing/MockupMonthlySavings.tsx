/**
 * MockupMonthlySavings
 *
 * Static version of the monthly savings badge for marketing mockups.
 * Shows the total monthly contribution needed.
 */

interface MockupMonthlySavingsProps {
  amount: number;
}

export function MockupMonthlySavings({ amount }: MockupMonthlySavingsProps) {
  return (
    <div className="bg-(--monarch-bg-card) border border-(--monarch-border) rounded-xl p-4">
      <div className="text-sm text-(--monarch-text-muted) mb-2">Monthly savings needed</div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-(--monarch-orange) text-white font-bold text-lg">
          ${amount.toFixed(2)}/mo
        </span>
      </div>
      <div className="mt-3 text-xs text-(--monarch-text-muted)">
        Set this as your category target in Monarch
      </div>
    </div>
  );
}
