/**
 * TimelineSidebar - Vertical legend with live projection values
 *
 * Shows each stash item's projected balance at the cursor/hover position,
 * along with APY controls. Replaces the horizontal TimelineLegend.
 */

import { useState, useCallback, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import type {
  TimelineItemConfig,
  ProjectedCardState,
  NamedEvent,
  TimelineResolution,
} from '../../../types/timeline';
import { formatAPY } from '../../../utils/hysaCalculations';
import { parseDateString } from '../../../utils/timelineProjection';
import { createArrowKeyHandler } from '../../../hooks/useArrowKeyIncrement';

/** Format date with full month name and year for sidebar display */
function formatSidebarDate(dateStr: string, resolution: TimelineResolution): string {
  const { year, month, day } = parseDateString(dateStr);
  const date = new Date(year, month - 1, day);

  if (resolution === 'yearly') {
    return String(year);
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

interface TimelineSidebarProps {
  readonly itemConfigs: TimelineItemConfig[];
  /** The date to display projections for (locked cursor or hover) */
  readonly displayDate: string | null;
  /** Whether the current date is a locked cursor (true) or just hover (false) */
  readonly isLocked: boolean;
  /** Projections at the display date */
  readonly projections: Record<string, ProjectedCardState> | null;
  /** Current resolution for date formatting */
  readonly resolution: TimelineResolution;
  /** Called when APY is changed for an item */
  readonly onApyChange: (itemId: string, apy: number) => void;
  /** Called when user clicks Clear Selection */
  readonly onClearCursor: () => void;
  /** Currency formatter */
  readonly formatCurrency: (amount: number) => string;
  /** All timeline events */
  readonly events?: NamedEvent[];
  /** Called when user clicks an event to edit it */
  readonly onEditEvent?: (event: NamedEvent) => void;
}

interface ApyEditorProps {
  readonly currentApy: number;
  readonly onSave: (apy: number) => void;
  readonly onCancel: () => void;
}

function ApyEditor({ currentApy, onSave, onCancel }: ApyEditorProps) {
  const [value, setValue] = useState(String(currentApy * 100));

  const handleSave = useCallback(() => {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) {
      onSave(parsed / 100);
    }
    onCancel();
  }, [value, onSave, onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Handle arrow key increment/decrement
      const currentValue = Number.parseFloat(value) || 0;
      const arrowHandler = createArrowKeyHandler({
        value: currentValue,
        onChange: (newValue) => {
          setValue(String(Math.max(0, Math.min(100, newValue))));
        },
        step: 0.1,
        shiftStep: 1,
        min: 0,
        max: 100,
      });
      arrowHandler(e);

      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    },
    [handleSave, onCancel, value]
  );

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className="w-14 px-1.5 py-0.5 text-xs rounded text-right"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          border: '1px solid var(--monarch-border)',
          color: 'var(--monarch-text-dark)',
        }}
        min="0"
        max="100"
        step="0.1"
        autoFocus
        aria-label="APY percentage"
      />
      <span className="text-[10px]" style={{ color: 'var(--monarch-text-muted)' }}>
        %
      </span>
    </div>
  );
}

interface SidebarItemProps {
  readonly config: TimelineItemConfig;
  readonly projection: ProjectedCardState | undefined;
  readonly onApyChange: (itemId: string, apy: number) => void;
  readonly formatCurrency: (amount: number) => string;
  /** Width for the balance column to ensure alignment */
  readonly balanceWidth: number;
  /** Events for this item at the current display date */
  readonly events: NamedEvent[];
  /** Called when user clicks an event to edit it */
  readonly onEditEvent?: (event: NamedEvent) => void;
}

function SidebarItem({
  config,
  projection,
  onApyChange,
  formatCurrency,
  balanceWidth,
  events,
  onEditEvent,
}: SidebarItemProps) {
  const [isEditingApy, setIsEditingApy] = useState(false);

  const handleApySave = useCallback(
    (apy: number) => {
      onApyChange(config.itemId, apy);
      setIsEditingApy(false);
    },
    [config.itemId, onApyChange]
  );

  return (
    <div
      className="px-3 py-2 border-b"
      style={{ borderColor: 'var(--monarch-border-subtle, var(--monarch-border))' }}
    >
      {/* Main row: color dot, name, balance, APY */}
      <div className="flex items-center gap-3">
        {/* Color dot */}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: config.color }}
        />

        {/* Name - takes available space */}
        <span
          className="text-sm font-medium truncate flex-1 min-w-0"
          style={{ color: 'var(--monarch-text-dark)' }}
          title={config.name}
        >
          {config.name}
        </span>

        {/* Projected balance - dynamic width for alignment */}
        <span
          className="text-sm font-semibold tabular-nums shrink-0 text-right"
          style={{ color: 'var(--monarch-text-dark)', width: `${balanceWidth}px` }}
        >
          {projection ? formatCurrency(projection.projectedBalance) : '—'}
        </span>

        {/* APY control */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
            APY:
          </span>
          {isEditingApy ? (
            <ApyEditor
              currentApy={config.apy}
              onSave={handleApySave}
              onCancel={() => setIsEditingApy(false)}
            />
          ) : (
            <button
              onClick={() => setIsEditingApy(true)}
              className="text-xs px-1.5 py-0.5 rounded transition-colors hover:bg-(--monarch-bg-hover)"
              style={{
                color: config.apy > 0 ? 'var(--monarch-success)' : 'var(--monarch-text-muted)',
                border: `1px solid ${config.apy > 0 ? 'var(--monarch-success)' : 'var(--monarch-border)'}`,
              }}
              title={`Click to edit APY for ${config.name}`}
              aria-label={`Edit APY for ${config.name}, currently ${formatAPY(config.apy)}`}
            >
              {config.apy > 0 ? formatAPY(config.apy) : 'Set'}
            </button>
          )}
        </div>
      </div>

      {/* Events for this item at the selected date */}
      {events.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 ml-5">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => onEditEvent?.(event)}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full transition-colors hover:bg-(--monarch-bg-hover)"
              style={{
                backgroundColor: 'var(--monarch-bg-page)',
                color: 'var(--monarch-text-muted)',
                border: '1px solid var(--monarch-border)',
              }}
              title={`Edit event: ${event.name}`}
              aria-label={`Edit event ${event.name}`}
            >
              <Calendar size={10} />
              <span className="truncate max-w-24">{event.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Base sidebar width for values under $100k */
const BASE_SIDEBAR_WIDTH = 320;
/** Base balance column width */
const BASE_BALANCE_WIDTH = 64;
/** Additional width per character beyond base */
const WIDTH_PER_CHAR = 8;

export function TimelineSidebar({
  itemConfigs,
  displayDate,
  isLocked,
  projections,
  resolution,
  onApyChange,
  onClearCursor,
  formatCurrency,
  events = [],
  onEditEvent,
}: TimelineSidebarProps) {
  const visibleItems = itemConfigs.filter((c) => c.isVisible);

  // Filter events for the current display date, grouped by itemId
  const eventsByItem = useMemo(() => {
    if (!displayDate || events.length === 0) return new Map<string, NamedEvent[]>();

    const map = new Map<string, NamedEvent[]>();
    for (const event of events) {
      if (event.date === displayDate) {
        const existing = map.get(event.itemId) ?? [];
        existing.push(event);
        map.set(event.itemId, existing);
      }
    }
    return map;
  }, [displayDate, events]);

  // Calculate balance column width based on largest projected value
  const maxBalance = projections
    ? Math.max(...Object.values(projections).map((p) => Math.abs(p.projectedBalance)), 0)
    : 0;
  const formattedMaxBalance = formatCurrency(maxBalance);
  // Base width handles up to ~$99,999 (7 chars). Add space for longer values.
  const extraChars = Math.max(0, formattedMaxBalance.length - 7);
  const balanceWidth = BASE_BALANCE_WIDTH + extraChars * WIDTH_PER_CHAR;
  const sidebarWidth = BASE_SIDEBAR_WIDTH + extraChars * WIDTH_PER_CHAR;

  return (
    <div
      className="border-l flex flex-col shrink-0 h-full"
      style={{
        width: `${sidebarWidth}px`,
        borderColor: 'var(--monarch-border)',
        backgroundColor: 'var(--monarch-bg-card)',
      }}
    >
      {/* Header - shows cursor date or hint */}
      <div
        className="px-3 py-2.5 border-b flex items-center justify-between gap-2 shrink-0"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        {displayDate ? (
          <>
            <span className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              {formatSidebarDate(displayDate, resolution)}
            </span>
            {isLocked && (
              <button
                onClick={onClearCursor}
                className="text-[10px] px-1.5 py-0.5 rounded transition-colors hover:bg-(--monarch-bg-page)"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                Clear
              </button>
            )}
          </>
        ) : (
          <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
            Hover chart to see projections
          </span>
        )}
      </div>

      {/* Item list - scrollable when items exceed container height */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {visibleItems.map((config) => (
          <SidebarItem
            key={config.itemId}
            config={config}
            projection={projections?.[config.itemId]}
            onApyChange={onApyChange}
            formatCurrency={formatCurrency}
            balanceWidth={balanceWidth}
            events={eventsByItem.get(config.itemId) ?? []}
            {...(onEditEvent && { onEditEvent })}
          />
        ))}
      </div>
    </div>
  );
}
