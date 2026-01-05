/**
 * RecurringItemStatus - Status badge with allocation actions
 *
 * Displays status badge with optional allocate confirmation buttons
 * when item is critical and needs funding.
 */

import { useState } from 'react';
import type { RecurringItem, ItemStatus } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { getStatusLabel, getStatusStyles } from '../../utils';

interface RecurringItemStatusProps {
  readonly item: RecurringItem;
  readonly displayStatus: ItemStatus;
  readonly onAllocate: () => Promise<void>;
  readonly isAllocating: boolean;
}

export function RecurringItemStatus({
  item,
  displayStatus,
  onAllocate,
  isAllocating,
}: RecurringItemStatusProps) {
  const [showAllocateConfirm, setShowAllocateConfirm] = useState(false);

  const isCritical = item.is_enabled && item.status === 'critical' && item.amount_needed_now > 0;

  const handleAllocate = async () => {
    await onAllocate();
    setShowAllocateConfirm(false);
  };

  if (isCritical && !showAllocateConfirm) {
    return (
      <Tooltip content="Click to allocate funds">
        <button
          onClick={() => setShowAllocateConfirm(true)}
          className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer bg-monarch-error-bg text-monarch-error"
        >
          Off Track
        </button>
      </Tooltip>
    );
  }

  if (isCritical && showAllocateConfirm) {
    return (
      <div className="flex items-center gap-1 justify-center">
        <button
          onClick={handleAllocate}
          disabled={isAllocating}
          className="px-2 py-1 text-xs font-medium rounded text-white disabled:opacity-50 transition-colors bg-monarch-success"
        >
          {isAllocating ? '...' : 'Allocate'}
        </button>
        <button
          onClick={() => setShowAllocateConfirm(false)}
          className="px-2 py-1 text-xs font-medium rounded transition-colors bg-monarch-bg-page text-monarch-text-dark"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <span
      className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full"
      style={{
        backgroundColor: getStatusStyles(displayStatus, item.is_enabled).bg,
        color: getStatusStyles(displayStatus, item.is_enabled).color,
      }}
    >
      {getStatusLabel(displayStatus, item.is_enabled)}
    </span>
  );
}
