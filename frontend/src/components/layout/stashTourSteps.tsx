/**
 * Stash Page Tour Steps
 *
 * Tour step definitions for the stash page guided tour.
 * Each step targets a specific UI element via data-tour attribute.
 *
 * Steps are ordered by importance and visual flow:
 * - Core concepts: available-funds, distribute-mode, hypothesize-mode, add-item
 * - Card interactions: progress-bar, budget-input, take-stash, edit-item, arrange-cards
 * - Secondary features: reports-tab
 * - Monarch Goals: monarch-goal-badge
 * - Browser integration: sync-bookmarks
 * - Pending bookmarks: pending-bookmarks
 *
 * Steps are shown incrementally based on user's data state.
 */

import type { ReactNode } from 'react';
import { TourStepContent } from './TourStepContent';

export type StashTourStepId =
  | 'available-funds'
  | 'distribute-mode'
  | 'hypothesize-mode'
  | 'add-item'
  | 'reports-tab'
  | 'progress-bar'
  | 'budget-input'
  | 'take-stash'
  | 'edit-item'
  | 'arrange-cards'
  | 'monarch-goal-badge'
  | 'sync-bookmarks'
  | 'pending-bookmarks';

/** Custom event dispatched to expand the pending bookmarks section during tour */
export const EXPAND_PENDING_SECTION_EVENT = 'eclosion:expand-pending-section';

/** Custom events to activate tour-specific UI states */
export const TOUR_SHOW_OVERLAY_EVENT = 'eclosion:tour-show-overlay';
export const TOUR_SHOW_EDIT_BUTTON_EVENT = 'eclosion:tour-show-edit-button';
export const TOUR_SHOW_RESIZE_HANDLE_EVENT = 'eclosion:tour-show-resize-handle';
export const TOUR_HIDE_ALL_EVENT = 'eclosion:tour-hide-all';

interface TourStep {
  id: StashTourStepId;
  selector: string;
  content: () => ReactNode;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
}

const hideAllAction = () => globalThis.dispatchEvent(new CustomEvent(TOUR_HIDE_ALL_EVENT));

export const STASH_TOUR_STEPS: TourStep[] = [
  // Phase 1: Core concepts (always shown)
  {
    id: 'available-funds',
    selector: '[data-tour="stash-available-funds"]',
    content: () => (
      <TourStepContent title="Available Funds Widget">
        This widget shows two key numbers: <strong>Cash to Stash</strong> (left) is money you can
        safely allocate without disrupting your budget. <strong>Left to Budget</strong> (right) is
        your unassigned income for the month. Hover over each to see the breakdown.
      </TourStepContent>
    ),
    position: 'top',
    action: hideAllAction,
  },
  {
    id: 'distribute-mode',
    selector: '[data-tour="stash-distribute-mode"]',
    content: () => (
      <TourStepContent title="Distribution Mode">
        Click to enter <strong>Distribution Mode</strong>. This lets you quickly allocate your
        available funds across multiple stashes at once. Type amounts on each card, then apply all
        changes together.
      </TourStepContent>
    ),
    position: 'top',
    action: hideAllAction,
  },
  {
    id: 'hypothesize-mode',
    selector: '[data-tour="stash-hypothesize-mode"]',
    content: () => (
      <TourStepContent title="Hypothesis Mode">
        Enter <strong>Hypothesis Mode</strong> to explore &ldquo;what-if&rdquo; scenarios. Adjust
        your available funds and monthly allocations to see how different strategies affect your
        timeline. Save scenarios to compare them later.
      </TourStepContent>
    ),
    position: 'top',
    action: hideAllAction,
  },
  {
    id: 'add-item',
    selector: '[data-tour="stash-add-item"]',
    content: () => (
      <TourStepContent title="Start a Stash">
        Create your first stash to save for something you want. Set a goal amount, target date, and
        track your progress toward things that matter to you.
      </TourStepContent>
    ),
    position: 'bottom',
    action: hideAllAction,
  },

  // Phase 2: When items exist (card interactions)
  {
    id: 'progress-bar',
    selector: '[data-tour="stash-progress-bar"]',
    content: () => (
      <TourStepContent title="Committed Progress">
        This bar shows how much you&apos;ve <strong>committed</strong> toward your goal. Committed
        funds are rolled over from previous months plus what you&apos;ve budgeted this month. Hover
        to see the breakdown.
      </TourStepContent>
    ),
    position: 'top',
    action: hideAllAction,
  },
  {
    id: 'budget-input',
    selector: '[data-tour="stash-budget-input"]',
    content: () => (
      <TourStepContent title="Monthly Budget">
        Enter how much to budget this month. The number after the slash shows your suggested monthly
        target to reach your goal by the target date. Use arrow keys to quickly adjust.
      </TourStepContent>
    ),
    position: 'left',
    action: hideAllAction,
  },
  {
    id: 'take-stash',
    selector: '[data-tour="stash-take-stash"]',
    content: () => (
      <TourStepContent title="Take or Stash Funds">
        Hover over a card to deposit extra funds or take money out. <strong>Taking</strong> draws
        from your committed balance. <strong>Stashing</strong> moves available funds into this goal.
      </TourStepContent>
    ),
    position: 'left',
    action: () => {
      hideAllAction();
      globalThis.dispatchEvent(new CustomEvent(TOUR_SHOW_OVERLAY_EVENT));
    },
  },
  {
    id: 'edit-item',
    selector: '[data-tour="stash-edit-item"]',
    content: () => (
      <TourStepContent title="Edit Items">
        Click the pencil icon to edit item details like name, amount, target date, or image.
      </TourStepContent>
    ),
    position: 'left',
    action: () => {
      hideAllAction();
      globalThis.dispatchEvent(new CustomEvent(TOUR_SHOW_EDIT_BUTTON_EVENT));
    },
  },
  {
    id: 'arrange-cards',
    selector: '[data-tour="stash-move-card"]',
    content: () => (
      <TourStepContent title="Arrange Cards">
        Drag cards by their image area to rearrange. Drag the bottom-right corner to resize.
      </TourStepContent>
    ),
    position: 'right',
    action: () => {
      hideAllAction();
      globalThis.dispatchEvent(new CustomEvent(TOUR_SHOW_RESIZE_HANDLE_EVENT));
    },
  },

  // Phase 3: Secondary features
  {
    id: 'reports-tab',
    selector: '[data-tour="stash-reports-tab"]',
    content: () => (
      <TourStepContent title="Reports Tab">
        Track your savings progress over time. See charts of your commitment history, monthly
        contributions, and how close you are to reaching each goal.
      </TourStepContent>
    ),
    position: 'bottom',
    action: hideAllAction,
  },

  // Phase 4: When Monarch Goals enabled
  {
    id: 'monarch-goal-badge',
    selector: '[data-tour="stash-monarch-goal"]',
    content: () => (
      <TourStepContent title="Monarch Goals">
        <strong>Monarch Goals</strong> are read-only and synced from Monarch Money.{' '}
        <strong>Stashes</strong> are managed here with more detailed tracking. Both show your
        savings progress, but stashes give you finer control over monthly budgets.
      </TourStepContent>
    ),
    position: 'left',
    action: hideAllAction,
  },

  // Phase 5: Browser integration
  {
    id: 'sync-bookmarks',
    selector: '[data-tour="stash-sync-bookmarks"]',
    content: () => (
      <TourStepContent title="Import from Bookmarks">
        Already have items bookmarked in your browser? Sync them here to quickly import and convert
        them into savings goals.
      </TourStepContent>
    ),
    position: 'bottom',
    action: hideAllAction,
  },

  // Phase 6: Pending bookmarks
  {
    id: 'pending-bookmarks',
    selector: '[data-tour="stash-pending-bookmarks"]',
    content: () => (
      <TourStepContent title="Review Imported Bookmarks">
        Imported bookmarks appear here for review. Click &ldquo;Create Target&rdquo; to add one to
        your stash, or &ldquo;Skip&rdquo; to ignore it.
      </TourStepContent>
    ),
    position: 'bottom',
    action: () => {
      hideAllAction();
      globalThis.dispatchEvent(new CustomEvent(EXPAND_PENDING_SECTION_EVENT));
    },
  },
];
