/**
 * RecurringListEmpty - Empty state component for RecurringList
 */

import { FrequencyIcon } from '../wizards/WizardComponents';

interface RecurringListEmptyProps {
  readonly showEnabled: boolean;
}

export function RecurringListEmpty({ showEnabled }: RecurringListEmptyProps) {
  return (
    <tr>
      <td colSpan={4} className="py-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <FrequencyIcon frequency="monthly" />
          <p style={{ color: 'var(--monarch-text-muted)' }}>
            {showEnabled
              ? 'No tracked recurring items yet. Enable some items to get started!'
              : 'All items are being tracked!'}
          </p>
        </div>
      </td>
    </tr>
  );
}
