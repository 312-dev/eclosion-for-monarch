/**
 * Stash vs Monarch Goals Modal
 *
 * Explains the differences between Eclosion's Stash feature and Monarch Money's
 * native Goals feature, including methodology and available funds calculations.
 */

import type { ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import {
  HelpCircle,
  Wallet,
  Target,
  Banknote,
  TrendingUp,
  Sparkles,
  CreditCard,
  SlidersHorizontal,
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
      <td
        className="py-3 px-3 text-sm font-medium"
        style={{ color: 'var(--monarch-text-dark)' }}
      >
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
          <HelpCircle size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          <span>Stash vs Monarch Goals</span>
        </div>
      }
      maxWidth="xl"
    >
      <div className="space-y-6">
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
                <th
                  className="py-2.5 px-3"
                  style={{ width: '30%' }}
                  aria-label="Aspect"
                />
                <th
                  className="py-2.5 px-3 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--monarch-orange)', width: '35%' }}
                >
                  <div className="flex items-center gap-1.5">
                    <StashIcon size={14} />
                    Stash
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
                icon={<TrendingUp size={16} />}
                aspect="Progress tracking"
                stash="Category balance (income − spending)"
                goal="Sum of contributions to linked accounts"
                isEven
              />
              <ComparisonRow
                icon={<Sparkles size={16} />}
                aspect="Best for"
                stash="Virtual envelopes, wish-list items"
                goal="Dedicated savings accounts, multi-account goals"
                isEven={false}
              />
              <ComparisonRow
                icon={<CreditCard size={16} />}
                aspect="Spending from it"
                stash="Category spending reduces balance"
                goal="Withdrawals reduce balance"
                isEven
              />
              <ComparisonRow
                icon={<SlidersHorizontal size={16} />}
                aspect="Flexibility"
                stash="Any category can be a goal"
                goal="Requires account linking or manual entry"
                isEven={false}
              />
            </tbody>
          </table>
        </div>

        {/* When to use each */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: 'var(--monarch-orange-light)',
              border: '1px solid var(--monarch-orange)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <StashIcon size={18} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
                Stash works best when...
              </h3>
            </div>
            <ul
              className="text-sm space-y-1.5 ml-1"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              <li>• You use category-based budgeting ("envelope" style)</li>
              <li>• You want to save without moving money between accounts</li>
              <li>• You're tracking wish-list items you might buy</li>
            </ul>
          </div>

          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: 'var(--monarch-green-light)',
              border: '1px solid var(--monarch-green)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Target size={18} style={{ color: 'var(--monarch-green)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
                Monarch Goals work best when...
              </h3>
            </div>
            <ul
              className="text-sm space-y-1.5 ml-1"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              <li>• You transfer money to dedicated savings accounts</li>
              <li>• You want Monarch's forecasting and completion estimates</li>
              <li>• You're saving across multiple accounts toward one goal</li>
            </ul>
          </div>
        </div>

        {/* Available Funds Calculation Comparison */}
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={18} style={{ color: 'var(--monarch-text-muted)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
              How "available funds" is calculated
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p
                className="text-xs font-medium uppercase tracking-wide mb-1.5"
                style={{ color: 'var(--monarch-orange)' }}
              >
                Eclosion: Available to Stash
              </p>
              <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                Starts with <strong>all cash accounts</strong>, then subtracts credit card balances,
                unspent budgets, and existing goals/stashes.
              </p>
              <p
                className="text-xs mt-2 italic"
                style={{ color: 'var(--monarch-text-light, #a3a09d)' }}
              >
                Answers: "How much can I safely save without disrupting my budget?"
              </p>
            </div>

            <div>
              <p
                className="text-xs font-medium uppercase tracking-wide mb-1.5"
                style={{ color: 'var(--monarch-green)' }}
              >
                Monarch: Available for Goals
              </p>
              <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                Sums <strong>only accounts linked to goals</strong> that have positive or
                over-allocated balances.
              </p>
              <p
                className="text-xs mt-2 italic"
                style={{ color: 'var(--monarch-text-light, #a3a09d)' }}
              >
                Answers: "How much is sitting in my goal accounts ready to allocate?"
              </p>
            </div>
          </div>

          <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            <strong>Why the difference?</strong> Monarch assumes you've already moved money to goal
            accounts. Eclosion calculates what's <em>actually available</em> after all your
            obligations—even money still in checking.
          </p>
        </div>

        {/* Bottom note */}
        <p
          className="text-sm text-center"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Both Stash balances and Monarch Goal balances reduce your available funds equally—money
          committed to either is money you shouldn't spend elsewhere.
        </p>
      </div>
    </Modal>
  );
}
