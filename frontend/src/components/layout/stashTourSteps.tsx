/**
 * Stash Page Tour Steps
 *
 * Tour step definitions for the stash page guided tour.
 * Each step targets a specific UI element via data-tour attribute.
 *
 * Steps are shown incrementally based on the user's data:
 * - Empty state: add-item, reports-tab
 * - Has items: progress-bar, budget-input, take-stash, edit-item, arrange-cards
 * - Has Monarch Goals: monarch-goal-badge
 * - Has browser configured: sync-bookmarks
 * - Has pending bookmarks: pending-bookmarks
 */

import type { ReactNode } from 'react';

export type StashTourStepId =
  // Phase 1: Always shown
  | 'add-item'
  | 'reports-tab'
  // Phase 2: When items exist
  | 'progress-bar'
  | 'budget-input'
  | 'take-stash'
  | 'edit-item'
  | 'arrange-cards'
  // Phase 3: When Monarch Goals enabled
  | 'monarch-goal-badge'
  // Phase 4: Browser integration
  | 'sync-bookmarks'
  // Phase 5: Pending bookmarks
  | 'pending-bookmarks';

/** Custom event dispatched to expand the pending bookmarks section during tour */
export const EXPAND_PENDING_SECTION_EVENT = 'eclosion:expand-pending-section';

interface TourStep {
  id: StashTourStepId;
  selector: string;
  content: () => ReactNode;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
}

export const STASH_TOUR_STEPS: TourStep[] = [
  // ====================
  // Phase 1: Always shown (introduce core concepts)
  // ====================
  {
    id: 'add-item',
    selector: '[data-tour="stash-add-item"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Start a Stash
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Create your first stash to save for something you want. Set a goal amount, target date,
          and track your progress toward things that matter to you.
        </p>
      </div>
    ),
    position: 'bottom',
  },
  {
    id: 'reports-tab',
    selector: '[data-tour="stash-reports-tab"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Reports Tab
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Track your savings progress over time. See charts of your commitment history, monthly
          contributions, and how close you are to reaching each goal.
        </p>
      </div>
    ),
    position: 'bottom',
  },

  // ====================
  // Phase 2: When items exist (teach card interactions)
  // ====================
  {
    id: 'progress-bar',
    selector: '[data-tour="stash-progress-bar"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Committed Progress
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          This bar shows how much you&apos;ve <strong>committed</strong> toward your goal. Committed
          funds are rolled over from previous months plus what you&apos;ve budgeted this month.
          Hover to see the breakdown.
        </p>
      </div>
    ),
    position: 'top',
  },
  {
    id: 'budget-input',
    selector: '[data-tour="stash-budget-input"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Monthly Budget
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Enter how much to budget this month. The number after the slash shows your suggested
          monthly target to reach your goal by the target date. Use arrow keys to quickly adjust.
        </p>
      </div>
    ),
    position: 'left',
  },
  {
    id: 'take-stash',
    selector: '[data-tour="stash-take-stash"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Take or Stash Funds
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Hover over a card to deposit extra funds or take money out. <strong>Taking</strong> draws
          from your committed balance. <strong>Stashing</strong> moves available funds into this
          goal.
        </p>
      </div>
    ),
    position: 'left',
  },
  {
    id: 'edit-item',
    selector: '[data-tour="stash-edit-item"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Edit Items
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Click the pencil icon to edit item details like name, amount, target date, or image.
        </p>
      </div>
    ),
    position: 'left',
  },
  {
    id: 'arrange-cards',
    selector: '[data-tour="stash-move-card"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Arrange Cards
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Drag cards by their image area to rearrange. Drag the bottom-right corner to resize.
        </p>
      </div>
    ),
    position: 'right',
  },

  // ====================
  // Phase 3: When Monarch Goals enabled (explain the difference)
  // ====================
  {
    id: 'monarch-goal-badge',
    selector: '[data-tour="stash-monarch-goal"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Monarch Goals
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          <strong>Monarch Goals</strong> are read-only and synced from Monarch Money.{' '}
          <strong>Stashes</strong> are managed here with more detailed tracking. Both show your
          savings progress, but stashes give you finer control over monthly budgets.
        </p>
      </div>
    ),
    position: 'left',
  },

  // ====================
  // Phase 4: Browser integration
  // ====================
  {
    id: 'sync-bookmarks',
    selector: '[data-tour="stash-sync-bookmarks"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Import from Bookmarks
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Already have items bookmarked in your browser? Sync them here to quickly import and
          convert them into savings goals.
        </p>
      </div>
    ),
    position: 'bottom',
  },

  // ====================
  // Phase 5: Pending bookmarks
  // ====================
  {
    id: 'pending-bookmarks',
    selector: '[data-tour="stash-pending-bookmarks"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Review Imported Bookmarks
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Imported bookmarks appear here for review. Click &ldquo;Create Target&rdquo; to add one to
          your stash, or &ldquo;Skip&rdquo; to ignore it.
        </p>
      </div>
    ),
    position: 'bottom',
    action: () => {
      // Dispatch event to expand the pending section when this step is shown
      globalThis.dispatchEvent(new CustomEvent(EXPAND_PENDING_SECTION_EVENT));
    },
  },
];
