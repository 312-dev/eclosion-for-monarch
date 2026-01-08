/**
 * Recurring Page Tour Steps
 *
 * Tour step definitions for the recurring page guided tour.
 * Each step targets a specific UI element via data-tour attribute.
 */

import type { ReactNode } from 'react';
import { CatchUpRateDemo } from './CatchUpRateDemo';

export type RecurringTourStepId =
  | 'rollup-zone'
  | 'rollup-item'
  | 'individual-item'
  | 'item-status'
  | 'disabled-section'
  | 'current-monthly'
  | 'burndown-decline'
  | 'left-to-budget'
  | 'untracked-warning';

interface TourStep {
  id: RecurringTourStepId;
  selector: string;
  content: () => ReactNode;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const RECURRING_TOUR_STEPS: TourStep[] = [
  {
    id: 'rollup-zone',
    selector: '[data-tour="rollup-zone"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Rollup Zone
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Your Rollup Zone combines small subscriptions into one category. Netflix,
          Spotify, cloud storage &ndash; they all share a single budget in Monarch.
          Less clutter, same tracking.
        </p>
      </div>
    ),
    position: 'bottom',
  },
  {
    id: 'rollup-item',
    selector: '[data-tour="rollup-item"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Rollup Items
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Each subscription is tracked separately here. You can see due dates, amounts,
          and progress. Use the menu to remove an item if it needs its own category.
        </p>
      </div>
    ),
    position: 'bottom',
  },
  {
    id: 'individual-item',
    selector: '[data-tour="individual-item"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Individual Items
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Larger expenses like insurance get their own dedicated category. This creates
          a separate budget line in Monarch, making it easier to see and manage big bills.
        </p>
      </div>
    ),
    position: 'bottom',
  },
  {
    id: 'item-status',
    selector: '[data-tour="item-status"]',
    content: () => <CatchUpRateDemo />,
    position: 'left',
  },
  {
    id: 'disabled-section',
    selector: '[data-tour="disabled-section"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Disabled Items
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          These items aren&apos;t being tracked yet. Toggle them on to start building
          savings, or leave them off if you don&apos;t need to prepare for them.
        </p>
      </div>
    ),
    position: 'top',
  },
  {
    id: 'current-monthly',
    selector: '[data-tour="current-monthly"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Monthly Savings Goal
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          This is the sum of all your budget targets. Meet each category&apos;s target
          in the &ldquo;Budgeted&rdquo; column and you&apos;ll hit this number automatically
          &mdash; no extra budgeting needed.
        </p>
      </div>
    ),
    position: 'left',
  },
  {
    id: 'burndown-decline',
    selector: '[data-tour="burndown-decline"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Why It Goes Down
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          The chart shows your monthly contribution decreasing over time. That&apos;s a
          good thing! As you build up savings for each expense, the &ldquo;catch-up&rdquo;
          portion of your payment drops off. You&apos;ll settle into a lower, steady
          amount once all categories are fully funded.
        </p>
      </div>
    ),
    position: 'bottom',
  },
  {
    id: 'left-to-budget',
    selector: '[data-tour="left-to-budget"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Left to Budget
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Quick access to your Monarch budget. Green means you have money available
          to assign; red means you&apos;ve over-budgeted. Click to open Monarch.
        </p>
      </div>
    ),
    position: 'bottom',
  },
  {
    id: 'untracked-warning',
    selector: '[data-tour="untracked-warning"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Untracked Tally
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          We keep a running total of your untracked recurring expenses so you&apos;re
          never surprised. This amount isn&apos;t included in your monthly savings goal,
          but you&apos;ll always know it&apos;s there.
        </p>
      </div>
    ),
    position: 'left',
  },
];
