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

/** Data for a single event marker position */
interface EventMarkerData {
  /** Date string (X-axis value) */
  date: string;
  /** Event IDs at this date */
  eventIds: string[];
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

/** State for hovered marker tooltip */
interface HoveredMarkerState {
  date: string;
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
  readonly markerColor: string;
  readonly onMouseEnter: (cx: number, cy: number) => void;
  readonly onMouseLeave: () => void;
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
  markerColor,
  onMouseEnter,
  onMouseLeave,
}: EventMarkerShapeProps) {
  if (cx === undefined || cy === undefined) return null;

  // Use larger radius when showing count
  const radius = eventCount > 1 ? MARKER_RADIUS + 2 : MARKER_RADIUS;
  const hoverRadius = radius + 2;

  return (
    <g
      onMouseEnter={() => onMouseEnter(cx, cy)}
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'pointer' }}
      className="timeline-event-marker"
    >
      {/* Marker circle */}
      <circle
        cx={cx}
        cy={cy}
        r={isHovered ? hoverRadius : radius}
        fill={markerColor}
        stroke="var(--monarch-bg-card)"
        strokeWidth={2}
        style={{
          transition: 'r 0.15s ease-out',
          filter: isHovered ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : undefined,
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
  const [hoveredMarker, setHoveredMarker] = useState<HoveredMarkerState | null>(null);
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

  // Collect markers: dates that have events
  const markers: EventMarkerData[] = useMemo(() => {
    return dataPoints
      .filter((dp) => dp.eventIds.length > 0)
      .map((dp) => ({
        date: dp.date,
        eventIds: dp.eventIds,
      }));
  }, [dataPoints]);

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
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = null;
      }

      const markerEvents = marker.eventIds
        .map((id) => eventMap.get(id))
        .filter((ev): ev is NamedEvent => ev !== undefined);

      // Get screen coordinates for tooltip positioning
      const chartRect = chartRef.current?.getBoundingClientRect();

      setHoveredMarker({
        date: marker.date,
        events: markerEvents,
        screenX: (chartRect?.left ?? 0) + cx,
        screenY: (chartRect?.top ?? 0) + cy,
      });
    },
    [eventMap, chartRef]
  );

  const handleMarkerMouseLeave = useCallback(() => {
    // Delay hiding to allow mouse to move to tooltip
    tooltipTimeoutRef.current = setTimeout(() => {
      if (!isTooltipHovered) {
        setHoveredMarker(null);
      }
    }, 100);
  }, [isTooltipHovered]);

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

  if (markers.length === 0) {
    return null;
  }

  return (
    <>
      {markers.map((marker) => {
        const eventCount = marker.eventIds.length;
        const isHovered = hoveredMarker?.date === marker.date;

        // Get the first event's item color for the marker
        const firstEventId = marker.eventIds[0];
        const firstEvent = firstEventId ? eventMap.get(firstEventId) : undefined;
        const markerColor = firstEvent ? getItemColor(firstEvent.itemId) : '#8b5cf6';

        return (
          <ReferenceDot
            key={marker.date}
            x={marker.date}
            y={markerYValue}
            r={0} // We render our own shape
            ifOverflow="visible"
            shape={
              <EventMarkerShape
                eventCount={eventCount}
                isHovered={isHovered}
                markerColor={markerColor}
                onMouseEnter={(cx, cy) => handleMarkerMouseEnter(marker, cx, cy)}
                onMouseLeave={handleMarkerMouseLeave}
              />
            }
          />
        );
      })}

      {/* Tooltip portal */}
      {hoveredMarker && (
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
        className="px-3 py-2 text-xs font-medium border-b"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          borderColor: 'var(--monarch-border)',
          color: 'var(--monarch-text-muted)',
        }}
      >
        {events.length === 1 ? (
          formatDateDisplay(events[0]?.date ?? '', 'monthly')
        ) : (
          <>
            {formatDateDisplay(events[0]?.date ?? '', 'monthly')} &middot; {events.length} events
          </>
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
                      <span style={{ color: 'var(--monarch-success, #22c55e)' }}>
                        +{formatCurrency(event.amount)}
                      </span>
                    ) : (
                      <span>Rate: {formatCurrency(event.amount)}/mo</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
