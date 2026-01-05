/**
 * MockupRecurringPreview
 *
 * Assembles the full recurring expenses mockup for the landing page.
 * Uses CSS transform scaling to render full-size components as a screenshot-like preview.
 */

import { MockupDeviceFrame } from './MockupDeviceFrame';
import { MockupRollupZone } from './MockupRollupZone';
import { MockupRecurringItem } from './MockupRecurringItem';
import { MockupMonthlySavings } from './MockupMonthlySavings';
import {
  MOCKUP_ROLLUP_ITEMS,
  MOCKUP_INDIVIDUAL_ITEMS,
  MOCKUP_MONTHLY_TOTAL,
} from '../../data/mockupData';

interface MockupRecurringPreviewProps {
  /**
   * Scale factor for the mockup (0.25 = 25% of original size)
   * @default 0.4
   */
  scale?: number;
  className?: string;
}

export function MockupRecurringPreview({
  scale = 0.4,
  className = '',
}: MockupRecurringPreviewProps) {
  // Calculate container dimensions based on content size and scale
  const contentWidth = 900;
  const contentHeight = 500;
  const scaledWidth = contentWidth * scale;
  const scaledHeight = contentHeight * scale;

  return (
    <div className={className} aria-hidden="true">
      <MockupDeviceFrame>
        <div
          className="mockup-scaled-container"
          style={{
            width: scaledWidth,
            height: scaledHeight,
          }}
        >
          <div
            className="mockup-scaled-content"
            style={{
              width: contentWidth,
              transform: `scale(${scale})`,
            }}
          >
            {/* Simulated app content */}
            <div className="p-6 bg-[var(--monarch-bg-page)]">
              <div className="flex gap-6">
                {/* Main content area */}
                <div className="flex-1 space-y-4">
                  {/* Rollup zone */}
                  <MockupRollupZone items={MOCKUP_ROLLUP_ITEMS} />

                  {/* Individual items */}
                  <div className="space-y-3">
                    {MOCKUP_INDIVIDUAL_ITEMS.map((item) => (
                      <MockupRecurringItem key={item.id} item={item} />
                    ))}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="w-64 flex-shrink-0">
                  <MockupMonthlySavings amount={MOCKUP_MONTHLY_TOTAL} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </MockupDeviceFrame>
    </div>
  );
}
