/**
 * MockupRecurringPreview
 *
 * Assembles the full recurring expenses mockup for the landing page.
 * Uses CSS transform scaling to render full-size components as a screenshot-like preview.
 * Responsive: scales to fit container width on smaller screens.
 */

import { useRef, useState, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [effectiveScale, setEffectiveScale] = useState(scale);

  // Content dimensions at full size
  const contentWidth = 900;
  const contentHeight = 500;

  // Calculate the scaled dimensions at the target scale
  const targetScaledWidth = contentWidth * scale;

  // Observe container width and adjust scale if needed
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      // Get available width (account for padding in mockup-content)
      const availableWidth = container.clientWidth - 32; // 1rem padding on each side

      if (availableWidth < targetScaledWidth) {
        // Scale down to fit
        const fitScale = availableWidth / contentWidth;
        setEffectiveScale(fitScale);
      } else {
        setEffectiveScale(scale);
      }
    };

    // Initial calculation
    updateScale();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [scale, targetScaledWidth, contentWidth]);

  const scaledWidth = contentWidth * effectiveScale;
  const scaledHeight = contentHeight * effectiveScale;

  return (
    <div ref={containerRef} className={className} aria-hidden="true">
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
              transform: `scale(${effectiveScale})`,
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
