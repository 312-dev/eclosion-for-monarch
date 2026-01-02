/**
 * RecurringListIcons - Icon components for the RecurringList
 *
 * @deprecated Use the centralized icons from '../icons' instead.
 * These are kept temporarily for backward compatibility.
 */

import { WarningFilledIcon, ExternalLinkIcon } from '../icons';

export function WarningIcon() {
  return <WarningFilledIcon size={16} color="var(--monarch-warning)" className="shrink-0" />;
}

export function LinkedCategoryIcon() {
  return <ExternalLinkIcon size={12} />;
}
