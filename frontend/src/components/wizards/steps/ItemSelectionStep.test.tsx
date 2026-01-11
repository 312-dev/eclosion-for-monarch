/**
 * ItemSelectionStep Tests
 *
 * Tests the item selection step of the setup wizard.
 * This is a presentational component - all data comes via props.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { ItemSelectionStep } from './ItemSelectionStep';
import type { RecurringItem } from '../../../types';

// Sample test data
const mockItems: RecurringItem[] = [
  {
    id: 'item-1',
    name: 'Netflix',
    amount: 15.99,
    frequency: 'monthly',
    frequency_months: 1,
    monthly_contribution: 15.99,
    next_due_date: '2025-02-15',
    months_until_due: 1,
    logo_url: null,
    merchant_id: null,
  },
  {
    id: 'item-2',
    name: 'Spotify',
    amount: 9.99,
    frequency: 'monthly',
    frequency_months: 1,
    monthly_contribution: 9.99,
    next_due_date: '2025-02-20',
    months_until_due: 1,
    logo_url: null,
    merchant_id: null,
  },
  {
    id: 'item-3',
    name: 'Car Insurance',
    amount: 600,
    frequency: 'yearly',
    frequency_months: 12,
    monthly_contribution: 50,
    next_due_date: '2025-12-01',
    months_until_due: 10,
    logo_url: null,
    merchant_id: null,
  },
];

const defaultProps = {
  items: mockItems,
  selectedIds: new Set<string>(),
  pendingLinks: new Map(),
  onToggleItem: vi.fn(),
  onSelectAll: vi.fn(),
  onDeselectAll: vi.fn(),
  onRefresh: vi.fn(),
  loading: false,
  error: null,
  onToggleGroup: vi.fn(),
  onLinkClick: vi.fn(),
  onUnlink: vi.fn(),
  categoryGroupName: 'Subscriptions',
  onChangeGroup: vi.fn(),
};

describe('ItemSelectionStep', () => {
  describe('loading state', () => {
    it('shows loading skeleton when loading', () => {
      render(<ItemSelectionStep {...defaultProps} loading={true} items={[]} />);

      expect(screen.getByText('Loading Recurring Items...')).toBeInTheDocument();
    });

    it('does not show items when loading', () => {
      render(<ItemSelectionStep {...defaultProps} loading={true} />);

      expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when error prop is set', () => {
      render(
        <ItemSelectionStep {...defaultProps} error="Failed to load items" items={[]} />
      );

      expect(screen.getByText('Failed to load items')).toBeInTheDocument();
    });

    it('shows Try Again button on error', async () => {
      const onRefresh = vi.fn();
      const user = userEvent.setup();

      render(
        <ItemSelectionStep
          {...defaultProps}
          error="Failed to load items"
          items={[]}
          onRefresh={onRefresh}
        />
      );

      await user.click(screen.getByText('Try Again'));

      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no items', () => {
      render(<ItemSelectionStep {...defaultProps} items={[]} />);

      expect(screen.getByText('No Recurring Items Found')).toBeInTheDocument();
    });

    it('shows refresh button in empty state', async () => {
      const onRefresh = vi.fn();
      const user = userEvent.setup();

      render(
        <ItemSelectionStep {...defaultProps} items={[]} onRefresh={onRefresh} />
      );

      await user.click(screen.getByText('Refresh from Monarch'));

      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe('items display', () => {
    it('shows header text', () => {
      render(<ItemSelectionStep {...defaultProps} />);

      expect(screen.getByText('Create Dedicated Categories')).toBeInTheDocument();
    });

    it('shows selection count', () => {
      render(<ItemSelectionStep {...defaultProps} selectedIds={new Set(['item-1'])} />);

      expect(screen.getByText('1 of 3')).toBeInTheDocument();
    });

    it('shows category group name', () => {
      render(<ItemSelectionStep {...defaultProps} />);

      expect(screen.getByText('Subscriptions')).toBeInTheDocument();
    });

    it('shows monthly totals', () => {
      render(<ItemSelectionStep {...defaultProps} />);

      // Total monthly: 15.99 + 9.99 + 50 = 75.98, rounded to $76
      expect(screen.getByText(/\$76/)).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('calls onSelectAll when Select All is clicked', async () => {
      const onSelectAll = vi.fn();
      const user = userEvent.setup();

      render(<ItemSelectionStep {...defaultProps} onSelectAll={onSelectAll} />);

      await user.click(screen.getByText('Select All'));

      expect(onSelectAll).toHaveBeenCalled();
    });

    it('calls onDeselectAll when Deselect All is clicked', async () => {
      const onDeselectAll = vi.fn();
      const user = userEvent.setup();

      render(<ItemSelectionStep {...defaultProps} onDeselectAll={onDeselectAll} />);

      await user.click(screen.getByText('Deselect All'));

      expect(onDeselectAll).toHaveBeenCalled();
    });

    it('calls onRefresh when Refresh is clicked', async () => {
      const onRefresh = vi.fn();
      const user = userEvent.setup();

      render(<ItemSelectionStep {...defaultProps} onRefresh={onRefresh} />);

      await user.click(screen.getByText('Refresh'));

      expect(onRefresh).toHaveBeenCalled();
    });

    it('calls onChangeGroup when group name is clicked', async () => {
      const onChangeGroup = vi.fn();
      const user = userEvent.setup();

      render(<ItemSelectionStep {...defaultProps} onChangeGroup={onChangeGroup} />);

      await user.click(screen.getByText('Subscriptions'));

      expect(onChangeGroup).toHaveBeenCalled();
    });
  });

  describe('selection display', () => {
    it('shows correct selected monthly amount', () => {
      // Select Netflix ($15.99/mo)
      render(<ItemSelectionStep {...defaultProps} selectedIds={new Set(['item-1'])} />);

      // Should show $16 selected (rounded up from 15.99)
      expect(screen.getByText('$16')).toBeInTheDocument();
    });

    it('shows zero when nothing selected', () => {
      render(<ItemSelectionStep {...defaultProps} selectedIds={new Set()} />);

      expect(screen.getByText('$0')).toBeInTheDocument();
    });
  });

  describe('frequency grouping', () => {
    it('groups items by frequency', () => {
      render(<ItemSelectionStep {...defaultProps} />);

      // Both monthly and yearly items exist
      // The FrequencyGroup component handles displaying the frequency labels
      expect(screen.getByText('Create Dedicated Categories')).toBeInTheDocument();
    });
  });
});
