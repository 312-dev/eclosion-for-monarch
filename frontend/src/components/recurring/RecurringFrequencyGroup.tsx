/**
 * RecurringFrequencyGroup - Frequency group header/separator component
 */

import { formatFrequency } from '../../utils';

interface RecurringFrequencyGroupProps {
  readonly frequency: string;
}

export function RecurringFrequencyGroup({ frequency }: RecurringFrequencyGroupProps) {
  return (
    <tr>
      <td
        colSpan={5}
        className="py-2 px-5 text-xs font-medium uppercase tracking-wide"
        style={{ backgroundColor: 'var(--monarch-bg-hover)', color: 'var(--monarch-text-muted)' }}
      >
        {formatFrequency(frequency)}
      </td>
    </tr>
  );
}
