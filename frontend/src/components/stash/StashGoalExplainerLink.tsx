/**
 * Stash Goal Explainer Link
 *
 * Subtle link that opens the StashVsGoalsModal explaining the difference
 * between Eclosion's Stash and Monarch Money's Goals.
 */

import { HelpCircle } from 'lucide-react';

interface StashGoalExplainerLinkProps {
  readonly onClick: () => void;
}

export function StashGoalExplainerLink({ onClick }: StashGoalExplainerLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 ml-2 text-sm transition-colors hover:opacity-80"
      style={{ color: 'var(--monarch-orange)' }}
    >
      <HelpCircle size={14} />
      Stash vs Monarch Goals
    </button>
  );
}
