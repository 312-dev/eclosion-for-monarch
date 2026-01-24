/**
 * Stashes vs Monarch Goals Modal
 *
 * Explains the differences between Eclosion's Stashes feature and Monarch Money's
 * native Goals feature.
 */

import type { ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import {
  Info,
  Target,
  Banknote,
  Sparkles,
  SlidersHorizontal,
  Calculator,
  HelpCircle,
} from 'lucide-react';
import { StashIcon } from '../wizards/SetupWizardIcons';

interface StashVsGoalsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

interface ComparisonRowProps {
  readonly icon: ReactNode;
  readonly aspect: string;
  readonly stash: string;
  readonly goal: string;
  readonly isEven: boolean;
}

function ComparisonRow({ icon, aspect, stash, goal, isEven }: ComparisonRowProps) {
  return (
    <tr style={isEven ? { backgroundColor: 'var(--monarch-bg-page)' } : undefined}>
      <td className="py-3 px-3 text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--monarch-text-muted)' }}>{icon}</span>
          {aspect}
        </div>
      </td>
      <td className="py-3 px-3 text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
        {stash}
      </td>
      <td className="py-3 px-3 text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
        {goal}
      </td>
    </tr>
  );
}

export function StashVsGoalsModal({ isOpen, onClose }: StashVsGoalsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Info size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          <span>Stashes vs Monarch Goals</span>
        </div>
      }
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Key insight */}
        <p className="text-sm text-center" style={{ color: 'var(--monarch-text-muted)' }}>
          Stashes are <strong>virtual envelopes</strong> in your budget, derived from your available
          cash. Goals are <strong>partitioned money</strong> in dedicated accounts.
        </p>

        {/* Comparison Table */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            border: '1px solid var(--monarch-border)',
          }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
                <th className="py-2.5 px-3" style={{ width: '30%' }} aria-label="Aspect" />
                <th
                  className="py-2.5 px-3 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--monarch-orange)', width: '35%' }}
                >
                  <div className="flex items-center gap-1.5">
                    <StashIcon size={14} />
                    Stashes
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--monarch-green)', width: '35%' }}
                >
                  <div className="flex items-center gap-1.5">
                    <Target size={14} />
                    Monarch Goals
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow
                icon={<Banknote size={16} />}
                aspect="How you fund it"
                stash="Set aside money in a Monarch category"
                goal="Transfer to a linked account or log contributions"
                isEven={false}
              />
              <ComparisonRow
                icon={<Sparkles size={16} />}
                aspect="Best for"
                stash="Flexible savings goals (from shoes to emergency funds)"
                goal="Dedicated savings accounts, multi-account goals"
                isEven
              />
              <ComparisonRow
                icon={<SlidersHorizontal size={16} />}
                aspect="Flexibility"
                stash="Any category can be a goal"
                goal="Requires account linking or manual entry"
                isEven={false}
              />
              <ComparisonRow
                icon={<Calculator size={16} />}
                aspect="Available funds calculation"
                stash="Calculated from cash minus debts and budgets"
                goal="Based on savings account allocations"
                isEven
              />
            </tbody>
          </table>
        </div>

        {/* Can I use both? */}
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <div className="flex items-start gap-3">
            <HelpCircle
              size={20}
              className="shrink-0 mt-0.5"
              style={{ color: 'var(--monarch-blue)' }}
            />
            <div>
              <h4
                className="text-base font-semibold mb-2"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                Can I use both?
              </h4>
              <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                <strong style={{ color: 'var(--monarch-text-dark)' }}>Yes!</strong> Use Goals for
                money in dedicated accounts (like a HYSA), and Stashes for flexible savings in your
                main accounts. Goal balances are automatically excluded from Available to Stash, so
                no double-counting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
