/**
 * MockupRollupZone
 *
 * Static version of the rollup zone for marketing mockups.
 * Shows bundled subscriptions in a simplified display.
 */

import { Icons, PackageIcon } from '../icons';
import type { MockupRollupItem } from '../../data/mockupData';
import { MOCKUP_ROLLUP_TOTAL } from '../../data/mockupData';

interface MockupRollupZoneProps {
  items: MockupRollupItem[];
  name?: string;
}

export function MockupRollupZone({
  items,
  name = 'Subscriptions',
}: MockupRollupZoneProps) {
  return (
    <div className="bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--monarch-border)] bg-[var(--monarch-bg-page)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--monarch-orange)]/10">
            <PackageIcon
              size={20}
              color="var(--monarch-orange)"
              aria-hidden="true"
            />
          </div>
          <div>
            <div className="font-semibold text-[var(--monarch-text-dark)]">
              {name}
            </div>
            <div className="text-sm text-[var(--monarch-text-muted)]">
              {items.length} items bundled
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-[var(--monarch-text-dark)]">
            ${MOCKUP_ROLLUP_TOTAL.toFixed(2)}/mo
          </div>
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--monarch-success-bg)] text-[var(--monarch-success)]">
            Funded
          </span>
        </div>
      </div>

      {/* Items list */}
      <div className="divide-y divide-[var(--monarch-border)]">
        {items.map((item) => {
          const IconComponent = Icons[item.icon];
          return (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <IconComponent
                  size={16}
                  color={item.iconColor}
                  aria-hidden="true"
                />
                <span className="text-sm text-[var(--monarch-text-dark)]">
                  {item.name}
                </span>
              </div>
              <span className="text-sm font-medium text-[var(--monarch-text-muted)]">
                ${item.amount.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
