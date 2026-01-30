/* eslint-disable max-lines */
/** TimelineEventMarkers - Renders event markers on the timeline chart using Recharts */

import { useState, useCallback, useRef, useLayoutEffect, useMemo, useEffect } from 'react';
import { ReferenceDot } from 'recharts';
import { Pencil, Trash2 } from 'lucide-react';
import type { NamedEvent, TimelineDataPoint, TimelineItemConfig } from '../../../types/timeline';
import { Z_INDEX } from '../../../constants';
import { formatDateDisplay } from '../../../utils/timelineProjection';

/** The marker radius in pixels */
const MARKER_RADIUS = 8;

/** Data for a single event marker position (grouped by date AND item) */
interface EventMarkerData {
  /** Date string (X-axis value) */
  date: string;
  /** Item ID this marker belongs to */
  itemId: string;
  /** Event IDs affecting this item at this date */
  eventIds: string[];
  /** Unique key for this marker (date-itemId) */
  key: string;
}

/** Props for the main TimelineEventMarkers component */
interface TimelineEventMarkersProps {
  /** Data points containing event IDs */
  readonly dataPoints: TimelineDataPoint[];
  /** All events for lookup */
  readonly events: NamedEvent[];
  /** Item configs for displaying affected item names */
  readonly itemConfigs: TimelineItemConfig[];
  /** Called when user wants to edit an event */
  readonly onEditEvent: (event: NamedEvent) => void;
  /** Called when user wants to delete an event */
  readonly onDeleteEvent: (eventId: string) => void;
  /** Format currency for display */
  readonly formatCurrency: (amount: number) => string;
  /** Y-axis value to position markers at (typically minBalance) */
  readonly markerYValue: number;
  /** Reference to the chart container for tooltip positioning */
  readonly chartRef: React.RefObject<HTMLDivElement | null>;
}

/** State for hovered/clicked marker tooltip */
interface MarkerInteractionState {
  date: string;
  itemId: string;
  /** Unique key (date-itemId) for comparison */
  key: string;
  events: NamedEvent[];
  screenX: number;
  screenY: number;
}

/** Props passed to custom marker shape by ReferenceDot */
interface MarkerShapeProps {
  cx?: number;
  cy?: number;
}

/** Props for the EventMarkerShape component */
interface EventMarkerShapeProps extends MarkerShapeProps {
  readonly eventCount: number;
  readonly isHovered: boolean;
  readonly isActive: boolean;
  readonly markerColor: string;
  readonly onMouseEnter: (cx: number, cy: number) => void;
  readonly onMouseLeave: () => void;
  readonly onClick: (cx: number, cy: number) => void;
}

/**
 * EventMarkerShape - SVG shape component for rendering event markers
 * Extracted as a standalone component to avoid inline function definition warnings.
 */
function EventMarkerShape({
  cx,
  cy,
  eventCount,
  isHovered,
  isActive,
  markerColor,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: EventMarkerShapeProps) {
  if (cx === undefined || cy === undefined) return null;

  // Use larger radius when showing count or when active/hovered
  const baseRadius = eventCount > 1 ? MARKER_RADIUS + 2 : MARKER_RADIUS;
  const expandedRadius = baseRadius + 2;
  const radius = isActive || isHovered ? expandedRadius : baseRadius;

  return (
    <g
      onMouseEnter={() => onMouseEnter(cx, cy)}
      onMouseLeave={onMouseLeave}
      onClick={() => onClick(cx, cy)}
      style={{ cursor: 'pointer' }}
      className="timeline-event-marker"
    >
      {/* Marker circle */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={markerColor}
        stroke={isActive ? 'var(--monarch-text-dark)' : 'var(--monarch-bg-card)'}
        strokeWidth={isActive ? 3 : 2}
        style={{
          transition: 'r 0.15s ease-out, stroke-width 0.15s ease-out',
          filter: isHovered || isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : undefined,
        }}
      />

      {/* Event count inside circle for multiple events */}
      {eventCount > 1 && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fontWeight={700}
          fill="white"
          style={{ pointerEvents: 'none' }}
        >
          {eventCount}
        </text>
      )}
    </g>
  );
}

/**
 * TimelineEventMarkers - Renders event dots using Recharts ReferenceDot
 *
 * Uses the standard Recharts pattern of ReferenceDot with custom shape prop
 * for rendering markers at specific data coordinates.
 */
export function TimelineEventMarkers({
  dataPoints,
  events,
  itemConfigs,
  onEditEvent,
  onDeleteEvent,
  formatCurrency,
  markerYValue,
  chartRef,
}: TimelineEventMarkersProps) {
  const [hoveredMarker, setHoveredMarker] = useState<MarkerInteractionState | null>(null);
  const [clickedMarker, setClickedMarker] = useState<MarkerInteractionState | null>(null);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Build event lookup map
  const eventMap = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  // Build item color lookup
  const itemColorMap = useMemo(
    () => new Map(itemConfigs.map((c) => [c.itemId, c.color])),
    [itemConfigs]
  );

  // Build item name lookup
  const itemNameMap = useMemo(
    () => new Map(itemConfigs.map((c) => [c.itemId, c.name])),
    [itemConfigs]
  );

  // Build dataPoint lookup by date for balance retrieval
  const dataPointMap = useMemo(() => new Map(dataPoints.map((dp) => [dp.date, dp])), [dataPoints]);

  // Collect markers: group events by (date, itemId) so each line shows its own markers
  const markers: EventMarkerData[] = useMemo(() => {
    const markerMap = new Map<string, EventMarkerData>();

    for (const dp of dataPoints) {
      for (const eventId of dp.eventIds) {
        const event = eventMap.get(eventId);
        if (!event) continue;

        const key = `${dp.date}-${event.itemId}`;
        const existing = markerMap.get(key);

        if (existing) {
          existing.eventIds.push(eventId);
        } else {
          markerMap.set(key, {
            date: dp.date,
            itemId: event.itemId,
            eventIds: [eventId],
            key,
          });
        }
      }
    }

    return Array.from(markerMap.values());
  }, [dataPoints, eventMap]);

  const getItemName = useCallback(
    (itemId: string) => itemNameMap.get(itemId) ?? 'Unknown',
    [itemNameMap]
  );

  const getItemColor = useCallback(
    (itemId: string) => itemColorMap.get(itemId) ?? '#8b5cf6',
    [itemColorMap]
  );

  const handleMarkerMouseEnter = useCallback(
    (marker: EventMarkerData, cx: number, cy: number) => {
      // Don't show hover tooltip if we have a clicked marker open
      if (clickedMarker) return;

      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = null;
      }

      const markerEvents = marker.eventIds
        .map((id) => eventMap.get(id))
        .filter((ev): ev is NamedEvent => ev !== undefined);

      const chartRect = chartRef.current?.getBoundingClientRect();

      setHoveredMarker({
        date: marker.date,
        itemId: marker.itemId,
        key: marker.key,
        events: markerEvents,
        screenX: (chartRect?.left ?? 0) + cx,
        screenY: (chartRect?.top ?? 0) + cy,
      });
    },
    [eventMap, chartRef, clickedMarker]
  );

  const handleMarkerMouseLeave = useCallback(() => {
    // Don't hide if we have a clicked marker
    if (clickedMarker) return;

    tooltipTimeoutRef.current = setTimeout(() => {
      if (!isTooltipHovered) {
        setHoveredMarker(null);
      }
    }, 100);
  }, [isTooltipHovered, clickedMarker]);

  const handleMarkerClick = useCallback(
    (marker: EventMarkerData, cx: number, cy: number) => {
      const markerEvents = marker.eventIds
        .map((id) => eventMap.get(id))
        .filter((ev): ev is NamedEvent => ev !== undefined);

      const chartRect = chartRef.current?.getBoundingClientRect();

      // Toggle: if clicking same marker, close it
      if (clickedMarker?.key === marker.key) {
        setClickedMarker(null);
      } else {
        setClickedMarker({
          date: marker.date,
          itemId: marker.itemId,
          key: marker.key,
          events: markerEvents,
          screenX: (chartRect?.left ?? 0) + cx,
          screenY: (chartRect?.top ?? 0) + cy,
        });
        setHoveredMarker(null);
      }
    },
    [eventMap, chartRef, clickedMarker]
  );

  const handleTooltipMouseEnter = useCallback(() => {
    setIsTooltipHovered(true);
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
  }, []);

  const handleTooltipMouseLeave = useCallback(() => {
    setIsTooltipHovered(false);
    setHoveredMarker(null);
  }, []);

  const handleCloseClickedTooltip = useCallback(() => {
    setClickedMarker(null);
  }, []);

  if (markers.length === 0) {
    return null;
  }

  return (
    <>
      {markers.map((marker) => {
        const eventCount = marker.eventIds.length;
        const isHovered =
          hoveredMarker?.date === marker.date && hoveredMarker?.itemId === marker.itemId;
        const isActive =
          clickedMarker?.date === marker.date && clickedMarker?.itemId === marker.itemId;

        // Get item color directly from the marker's itemId
        const markerColor = getItemColor(marker.itemId);

        // Position marker ON the line at the item's balance for this date
        const dataPoint = dataPointMap.get(marker.date);
        const itemBalance = dataPoint
          ? (dataPoint.balances[marker.itemId] ?? markerYValue)
          : markerYValue;

        return (
          <ReferenceDot
            key={marker.key}
            x={marker.date}
            y={itemBalance}
            r={0} // We render our own shape
            ifOverflow="visible"
            shape={
              <EventMarkerShape
                eventCount={eventCount}
                isHovered={isHovered}
                isActive={isActive}
                markerColor={markerColor}
                onMouseEnter={(cx, cy) => handleMarkerMouseEnter(marker, cx, cy)}
                onMouseLeave={handleMarkerMouseLeave}
                onClick={(cx, cy) => handleMarkerClick(marker, cx, cy)}
              />
            }
          />
        );
      })}

      {/* Clicked marker tooltip (edit mode) - takes precedence */}
      {clickedMarker && (
        <EventMarkerTooltip
          events={clickedMarker.events}
          screenX={clickedMarker.screenX}
          screenY={clickedMarker.screenY}
          getItemName={getItemName}
          getItemColor={getItemColor}
          formatCurrency={formatCurrency}
          onEdit={onEditEvent}
          onDelete={onDeleteEvent}
          onMouseEnter={() => {}}
          onMouseLeave={() => {}}
          isEditMode={true}
          onClose={handleCloseClickedTooltip}
        />
      )}

      {/* Hover tooltip (info mode) - only show if no clicked marker */}
      {!clickedMarker && hoveredMarker && (
        <EventMarkerTooltip
          events={hoveredMarker.events}
          screenX={hoveredMarker.screenX}
          screenY={hoveredMarker.screenY}
          getItemName={getItemName}
          getItemColor={getItemColor}
          formatCurrency={formatCurrency}
          onEdit={onEditEvent}
          onDelete={onDeleteEvent}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          isEditMode={false}
        />
      )}
    </>
  );
}

// ============================================================================
// Event Marker Tooltip
// ============================================================================

interface EventMarkerTooltipProps {
  readonly events: NamedEvent[];
  readonly screenX: number;
  readonly screenY: number;
  readonly getItemName: (itemId: string) => string;
  readonly getItemColor: (itemId: string) => string;
  readonly formatCurrency: (amount: number) => string;
  readonly onEdit: (event: NamedEvent) => void;
  readonly onDelete: (eventId: string) => void;
  readonly onMouseEnter: () => void;
  readonly onMouseLeave: () => void;
  /** Whether this is edit mode (clicked) vs info mode (hovered) */
  readonly isEditMode: boolean;
  /** Called to close the tooltip (only used in edit mode) */
  readonly onClose?: () => void;
}

function EventMarkerTooltip({
  events,
  screenX,
  screenY,
  getItemName,
  getItemColor,
  formatCurrency,
  onEdit,
  onDelete,
  onMouseEnter,
  onMouseLeave,
  isEditMode,
  onClose,
}: EventMarkerTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: screenX, y: screenY });

  // useLayoutEffect is correct for DOM measurements before paint - position adjustment is synchronous
  useLayoutEffect(() => {
    if (!tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    let x = screenX - rect.width / 2;
    let y = screenY - rect.height - 12;
    if (x < 8) x = 8;
    if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
    if (y < 8) y = screenY + 20;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM measurement requires post-render setState
    setPosition({ x, y });
  }, [screenX, screenY]);

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Tooltip needs hover to stay open
    <div
      ref={tooltipRef}
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed rounded-lg shadow-xl text-sm overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
        zIndex: Z_INDEX.TOOLTIP,
        minWidth: 220,
        maxWidth: 300,
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 text-xs font-medium border-b flex items-center justify-between"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          borderColor: 'var(--monarch-border)',
          color: 'var(--monarch-text-muted)',
        }}
      >
        <span>
          {events.length === 1 ? (
            formatDateDisplay(events[0]?.date ?? '', 'monthly')
          ) : (
            <>
              {formatDateDisplay(events[0]?.date ?? '', 'monthly')} &middot; {events.length} events
            </>
          )}
        </span>
        {isEditMode && onClose && (
          <button
            onClick={onClose}
            className="p-0.5 -mr-1 rounded hover:bg-black/10 transition-colors"
            style={{ color: 'var(--monarch-text-muted)' }}
            aria-label="Close"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Event list */}
      <div className="max-h-64 overflow-y-auto">
        {events.map((event, index) => (
          <div
            key={event.id}
            className={`px-3 py-2.5 group ${index > 0 ? 'border-t' : ''}`}
            style={{ borderColor: 'var(--monarch-border)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Event name */}
                <div className="font-medium truncate" style={{ color: 'var(--monarch-text-dark)' }}>
                  {event.name}
                </div>

                {/* Event details */}
                <div
                  className="text-xs mt-1 space-y-0.5"
                  style={{ color: 'var(--monarch-text-muted)' }}
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getItemColor(event.itemId) }}
                    />
                    <span className="truncate">{getItemName(event.itemId)}</span>
                  </div>
                  <div>
                    {event.type === 'deposit' ? (
                      <span style={{ color: 'var(--monarch-success, #22a06b)' }}>
                        +{formatCurrency(event.amount)}
                      </span>
                    ) : (
                      <span>Rate: {formatCurrency(event.amount)}/mo</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons - only show in edit mode */}
              {isEditMode && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(event)}
                    className="p-1.5 rounded hover:bg-black/5 transition-colors"
                    style={{ color: 'var(--monarch-text-muted)' }}
                    aria-label={`Edit ${event.name}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(event.id)}
                    className="p-1.5 rounded hover:bg-red-50 transition-colors"
                    style={{ color: 'var(--monarch-error, #dc2626)' }}
                    aria-label={`Delete ${event.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
