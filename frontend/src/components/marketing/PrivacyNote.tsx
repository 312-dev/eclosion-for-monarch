/**
 * PrivacyNote
 *
 * Brief privacy disclosure about data collection practices.
 */

import { ShieldCheckIcon } from '../icons';

export function PrivacyNote() {
  return (
    <div className="flex items-center gap-2 text-xs text-(--monarch-text-muted)">
      <ShieldCheckIcon size={14} className="text-(--monarch-success) shrink-0" />
      <span>
        <strong className="text-(--monarch-text)">Privacy:</strong> Only communicates with Monarch
        Money — no analytics or telemetry
      </span>
    </div>
  );
}
