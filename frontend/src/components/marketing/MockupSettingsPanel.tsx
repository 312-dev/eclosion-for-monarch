/**
 * MockupSettingsPanel
 *
 * A small mockup showing a settings toggle panel for the landing page.
 * Demonstrates the "enable only what you need" concept.
 * Uses real feature data from features.ts to show accurate feature availability.
 * Responsive: scales to fit container width on smaller screens.
 */

import { useRef, useState, useEffect } from 'react';
import { FEATURES } from '../../data/features';
import { MockupDeviceFrame } from './MockupDeviceFrame';

interface MockupSettingsPanelProps {
  readonly scale?: number;
  readonly className?: string;
}

interface SettingRowProps {
  readonly label: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly color: string;
  readonly comingSoon?: boolean;
}

function SettingRow({
  label,
  description,
  enabled,
  color,
  comingSoon,
}: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-(--monarch-border-light) last:border-0">
      <div className="flex-1 pr-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-(--monarch-text-dark) text-sm">
            {label}
          </span>
          {comingSoon && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-(--monarch-border-light) text-(--monarch-text-muted) whitespace-nowrap">
              Coming Soon
            </span>
          )}
        </div>
        <div className="text-xs text-(--monarch-text-muted)">{description}</div>
      </div>
      <div
        className="w-10 h-6 rounded-full relative transition-colors"
        style={{
          backgroundColor: enabled ? color : 'var(--monarch-border)',
        }}
      >
        <div
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform"
          style={{
            left: enabled ? '22px' : '4px',
          }}
        />
      </div>
    </div>
  );
}

// Color mapping for features
const FEATURE_COLORS: Record<string, string> = {
  recurring: 'var(--monarch-orange)',
  'linked-goals': '#8B5CF6',
  leaderboard: '#3B82F6',
};

export function MockupSettingsPanel({
  scale = 0.4,
  className = '',
}: MockupSettingsPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [effectiveScale, setEffectiveScale] = useState(scale);

  // Content dimensions at full size
  const contentWidth = 400;
  const contentHeight = 280;

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
      <MockupDeviceFrame url="your.eclosion.app/settings">
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
            <div className="p-5 bg-(--monarch-bg-page)">
              <h3 className="text-base font-semibold text-(--monarch-text-dark) mb-4">
                Features
              </h3>
              <div className="bg-(--monarch-bg-card) rounded-xl p-4 border border-(--monarch-border-light)">
                {FEATURES.map((feature) => {
                  const isAvailable = feature.status === 'available';
                  return (
                    <SettingRow
                      key={feature.id}
                      label={feature.name}
                      description={feature.tagline}
                      enabled={isAvailable}
                      color={FEATURE_COLORS[feature.id] ?? 'var(--monarch-teal)'}
                      comingSoon={!isAvailable}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </MockupDeviceFrame>
    </div>
  );
}
