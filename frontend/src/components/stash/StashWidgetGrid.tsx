/* eslint-disable max-lines */
/**
 * StashWidgetGrid - Resizable widget grid for stash cards
 *
 * Uses react-grid-layout for iOS/Android-style widget resizing.
 * Cards can span 1-2 columns and 1-2 rows.
 *
 * Layout Strategy:
 * - Custom horizontal+vertical compaction (items flow left-to-right, wrap to next row)
 * - Items flow in sort_order (persisted to database)
 * - We save SIZE (col_span, row_span) and ORDER (sort_order) on resize/drag
 * - Grid positions (x, y) are NOT saved - compaction determines them
 *
 * Compaction algorithm based on:
 * https://github.com/shipurjan/buddy-grid-layout/tree/1.4.4-compact-left-v3-dev
 */

import { memo, useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { TOUR_SHOW_RESIZE_HANDLE_EVENT, TOUR_HIDE_ALL_EVENT } from '../layout/stashTourSteps';
import { type LayoutItem } from 'react-grid-layout/legacy';
import RGL from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { StashItem, StashLayoutUpdate } from '../../types';
import type { MonarchGoal, MonarchGoalLayoutUpdate } from '../../types/monarchGoal';
import { StashCard } from './StashCard';
import { MonarchGoalCard } from './MonarchGoalCard';
import { Icons } from '../icons';
import { PlusIcon, type PlusIconHandle } from '../ui/plus';
import { useIsInDistributionMode } from '../../context/DistributionModeContext';

// Use RGL directly instead of WidthProvider to avoid ref conflicts
const GridLayout = RGL;

const COLS = 2;
const ROW_HEIGHT = 300;
const MARGIN: [number, number] = [16, 16];
const ADD_PLACEHOLDER_ID = '__add_stash_placeholder__';
const ARCHIVED_PREFIX = '__archived__';

// Card size constraints
const MIN_W = 1;
const MAX_W = 2;
const MIN_H = 1;
const MAX_H = 2;

interface StashWidgetGridProps {
  readonly items: (StashItem | MonarchGoal)[];
  readonly onEdit: (item: StashItem) => void;
  readonly onAllocate: (itemId: string, amount: number) => Promise<void>;
  readonly onLayoutChange: (layouts: StashLayoutUpdate[]) => void;
  readonly onGoalLayoutChange?: (layouts: MonarchGoalLayoutUpdate[]) => void;
  readonly allocatingItemId?: string | null;
  readonly emptyMessage?: string;
  readonly onAdd: () => void;
  readonly onViewReport?: (stashId: string) => void;
  /** Whether to show type badges (Stash vs Goal) - shown when Monarch goals are enabled */
  readonly showTypeBadges?: boolean;
  /** Archived items to display at the end of the grid (after New Stash card) */
  readonly archivedItems?: StashItem[] | undefined;
}

function PlaceholderCard() {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        borderColor: 'var(--monarch-border)',
      }}
    >
      <div
        className="h-28 flex items-center justify-center relative"
        style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
      >
        <div
          className="w-12 h-12 rounded-full"
          style={{ backgroundColor: 'var(--monarch-border)' }}
        />
        <div className="absolute top-2 right-2">
          <div className="w-16 h-5 rounded" style={{ backgroundColor: 'var(--monarch-border)' }} />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div
              className="w-6 h-6 rounded shrink-0"
              style={{ backgroundColor: 'var(--monarch-border)' }}
            />
            <div
              className="h-5 rounded flex-1"
              style={{ backgroundColor: 'var(--monarch-border)', maxWidth: '120px' }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div
            className="h-4 rounded"
            style={{ backgroundColor: 'var(--monarch-border)', width: '80px' }}
          />
          <div
            className="h-4 rounded"
            style={{ backgroundColor: 'var(--monarch-border)', width: '60px' }}
          />
        </div>
        <div
          className="h-4 rounded mb-3"
          style={{ backgroundColor: 'var(--monarch-border)', width: '140px' }}
        />
        <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--monarch-border)' }} />
      </div>
    </div>
  );
}

function AddStashCard({
  onAdd,
  isFirst,
}: {
  readonly onAdd: () => void;
  readonly isFirst: boolean;
}) {
  const iconRef = useRef<PlusIconHandle>(null);

  return (
    <button
      data-tour="stash-add-item"
      onClick={onAdd}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
      className="group rounded-xl border overflow-hidden transition-shadow hover:shadow-md h-full w-full flex flex-col cursor-pointer"
      style={{
        backgroundColor: 'var(--monarch-bg-page)',
        borderColor: 'var(--monarch-border)',
      }}
    >
      {/* Image Area - matches StashCard flex-1 image area */}
      <div
        className="flex-1 min-h-28 flex items-center justify-center"
        style={{
          backgroundColor: 'var(--monarch-border)',
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center transition-transform will-change-transform group-hover:scale-110"
          style={{
            backgroundColor: 'var(--monarch-orange)',
            opacity: 0.9,
          }}
        >
          <PlusIcon ref={iconRef} size={32} style={{ color: '#fff' }} />
        </div>
      </div>

      {/* Content Area - matches StashCard px-4 pt-3 pb-4 with height 112 */}
      <div
        className="px-4 pt-3 pb-4 shrink-0 flex flex-col items-center justify-center"
        style={{ maxHeight: 112 }}
      >
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--monarch-text-dark)' }}>
          New Stash
        </h3>
        <p className="text-sm text-center" style={{ color: 'var(--monarch-text-muted)' }}>
          {isFirst ? "What's first on your list?" : "What's next on your list?"}
        </p>
      </div>
    </button>
  );
}

function EmptyState({ message }: { readonly message: string }) {
  return (
    <div className="relative">
      <div
        className="grid grid-cols-1 min-[801px]:grid-cols-2 gap-4 opacity-30"
        style={{
          maskImage: 'linear-gradient(to bottom, black 0%, black 30%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 30%, transparent 100%)',
        }}
      >
        <PlaceholderCard />
        <PlaceholderCard />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <Icons.Gift size={48} style={{ color: 'var(--monarch-text-muted)' }} className="mb-4" />
        <p className="text-center px-4" style={{ color: 'var(--monarch-text-muted)' }}>
          {message}
        </p>
      </div>
    </div>
  );
}

/**
 * Sort layout items by row then column (top-left to bottom-right order).
 */
function sortLayoutItemsByRowCol(layout: LayoutItem[]): LayoutItem[] {
  return [...layout].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });
}

/**
 * Horizontal+Vertical Compaction
 *
 * Flows items left-to-right, wrapping to the next row when they don't fit.
 * Handles variable-height items by tracking the maximum height per row.
 * Excludes archived items from compaction (they remain at fixed positions).
 *
 * Based on: https://github.com/shipurjan/buddy-grid-layout
 */
function compactHorizontalVertical(layout: readonly LayoutItem[], cols: number): LayoutItem[] {
  // Separate items by type for consistent ordering
  const archivedItems = layout.filter((l) => l.i.startsWith(ARCHIVED_PREFIX));
  const placeholder = layout.find((l) => l.i === ADD_PLACEHOLDER_ID);
  const activeItems = layout.filter(
    (l) => !l.i.startsWith(ARCHIVED_PREFIX) && l.i !== ADD_PLACEHOLDER_ID
  );

  // Sort active items by their current position (row-major order)
  const sorted = sortLayoutItemsByRowCol([...activeItems]);
  const result: LayoutItem[] = [];

  let totalWidth = 0;
  let currentRow = 0;
  let currentRowHeight = 1;

  for (const item of sorted) {
    const l = { ...item };
    const w = Math.min(l.w, cols);
    const h = l.h;

    // Check if there's enough space on the current row
    if (totalWidth + w > cols) {
      // Move to the next row
      currentRow += currentRowHeight;
      totalWidth = 0;
      currentRowHeight = 1;
    }

    // Position the item
    l.y = currentRow;
    l.x = totalWidth;

    // Update tracking
    totalWidth += w;
    currentRowHeight = Math.max(h, currentRowHeight);

    result.push(l);
  }

  // Add placeholder at the end (ensures consistent array order)
  if (placeholder) {
    const p = { ...placeholder };
    if (totalWidth + p.w > cols) {
      currentRow += currentRowHeight;
      totalWidth = 0;
    }
    p.x = totalWidth;
    p.y = currentRow;
    result.push(p);
  }

  // Re-add archived items unchanged (they stay at their fixed positions)
  return [...result, ...archivedItems];
}

/**
 * Create initial layout from items.
 * Uses horizontal+vertical compaction to flow items left-to-right.
 * Archived items are placed after the placeholder and are static (non-draggable/resizable).
 */
function createLayout(
  items: (StashItem | MonarchGoal)[],
  cols: number,
  archivedItems: StashItem[] = []
): LayoutItem[] {
  const layout: LayoutItem[] = items.map((item) => ({
    i: item.id,
    x: 0,
    y: 0,
    w: Math.min(item.col_span ?? 1, cols),
    h: item.row_span ?? 1,
    minW: MIN_W,
    maxW: Math.min(MAX_W, cols),
    minH: MIN_H,
    maxH: MAX_H,
  }));

  // Add placeholder - locked to 1x1, never resizable
  layout.push({
    i: ADD_PLACEHOLDER_ID,
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    minW: 1,
    maxW: 1,
    minH: 1,
    maxH: 1,
    static: true,
    isDraggable: false,
    isResizable: false,
  });

  // Apply compaction to active items + placeholder
  const compacted = compactHorizontalVertical(layout, cols);

  // Add archived items after the placeholder (static, non-draggable)
  if (archivedItems.length > 0) {
    // Find the max Y position after compaction
    let maxY = 0;
    for (const l of compacted) {
      const itemBottom = l.y + l.h;
      if (itemBottom > maxY) {
        maxY = itemBottom;
      }
    }
    const archivedStartY = maxY;

    // Manually position archived items in a simple grid (left-to-right, then wrap)
    let archivedX = 0;
    let archivedY = archivedStartY;

    const archivedLayout: LayoutItem[] = archivedItems.map((item) => {
      // Wrap to next row if needed
      if (archivedX >= cols) {
        archivedX = 0;
        archivedY += 1;
      }

      const layoutItem: LayoutItem = {
        i: `${ARCHIVED_PREFIX}${item.id}`,
        x: archivedX,
        y: archivedY,
        w: 1, // Archived items are always 1x1
        h: 1,
        minW: 1,
        maxW: 1,
        minH: 1,
        maxH: 1,
        static: true,
        isDraggable: false,
        isResizable: false,
      };

      archivedX += 1;
      return layoutItem;
    });

    return [...compacted, ...archivedLayout];
  }

  return compacted;
}

export const StashWidgetGrid = memo(function StashWidgetGrid({
  items,
  onEdit,
  onAllocate,
  onLayoutChange,
  onGoalLayoutChange,
  allocatingItemId,
  emptyMessage = 'No jars, no envelopes, no guesswork. Build your first stash.',
  onAdd,
  onViewReport,
  showTypeBadges = false,
  archivedItems = [],
}: StashWidgetGridProps) {
  const isInDistributionMode = useIsInDistributionMode();

  // Tour-forced resize handle visibility
  const [tourShowResizeHandle, setTourShowResizeHandle] = useState(false);

  // Listen for tour events to show resize handle
  useEffect(() => {
    const handleShowResizeHandle = () => setTourShowResizeHandle(true);
    const handleHideAll = () => setTourShowResizeHandle(false);

    globalThis.addEventListener(TOUR_SHOW_RESIZE_HANDLE_EVENT, handleShowResizeHandle);
    globalThis.addEventListener(TOUR_HIDE_ALL_EVENT, handleHideAll);

    return () => {
      globalThis.removeEventListener(TOUR_SHOW_RESIZE_HANDLE_EVENT, handleShowResizeHandle);
      globalThis.removeEventListener(TOUR_HIDE_ALL_EVENT, handleHideAll);
    };
  }, []);

  // Sort active items by sort_order (from database)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [items]);

  // Sort archived items by completed_at (most recently completed first)
  const sortedArchivedItems = useMemo(() => {
    return [...archivedItems].sort((a, b) => {
      const aDate = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const bDate = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return bDate - aDate; // Most recent first
    });
  }, [archivedItems]);

  // Track container width for responsive behavior
  const [containerWidth, setContainerWidth] = useState(1200);

  // Calculate effective columns based on width
  const effectiveCols = useMemo(() => {
    if (containerWidth <= 800) return 1;
    return COLS; // 2 columns for wider screens
  }, [containerWidth]);

  // Create a stable key for items to detect meaningful changes
  // Includes cols so layout updates when responsive breakpoints change
  const layoutKey = useMemo(() => {
    const activeKey = sortedItems
      .map((i) => `${i.id}:${i.sort_order ?? 0}:${i.col_span ?? 1}:${i.row_span ?? 1}`)
      .join('|');
    const archivedKey = sortedArchivedItems.map((i) => i.id).join('|');
    return `${effectiveCols}::${activeKey}::${archivedKey}`;
  }, [sortedItems, sortedArchivedItems, effectiveCols]);

  // Create layout from sorted items (initial state only)
  const [layout, setLayout] = useState<LayoutItem[]>(() =>
    createLayout(sortedItems, effectiveCols, sortedArchivedItems)
  );

  // Track previous layout key to detect actual changes (using state, not ref, for React Compiler)
  // This follows the React pattern for adjusting state when props change:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevLayoutKey, setPrevLayoutKey] = useState(layoutKey);
  if (layoutKey !== prevLayoutKey) {
    setPrevLayoutKey(layoutKey);
    setLayout(createLayout(sortedItems, effectiveCols, sortedArchivedItems));
  }

  /**
   * Build layout updates for all items based on the compacted layout.
   * Extracts new sort_order from position in the compacted layout.
   */
  const buildLayoutUpdates = useCallback(
    (
      compacted: LayoutItem[]
    ): { stashUpdates: StashLayoutUpdate[]; goalUpdates: MonarchGoalLayoutUpdate[] } => {
      const stashUpdates: StashLayoutUpdate[] = [];
      const goalUpdates: MonarchGoalLayoutUpdate[] = [];

      // Get ordered list of item IDs from compacted layout (excluding placeholder and archived)
      const orderedItems = compacted
        .filter((l) => l.i !== ADD_PLACEHOLDER_ID && !l.i.startsWith(ARCHIVED_PREFIX))
        .sort((a, b) => {
          // Sort by row then column to get visual order
          if (a.y !== b.y) return a.y - b.y;
          return a.x - b.x;
        });

      // Build updates with new sort_order based on position in ordered list
      orderedItems.forEach((l, index) => {
        const item = sortedItems.find((i) => i.id === l.i);
        if (!item) return;

        const isGoal = 'type' in item && item.type === 'monarch_goal';
        if (isGoal) {
          goalUpdates.push({
            goal_id: l.i,
            grid_x: 0, // Not used - compaction handles position
            grid_y: 0,
            col_span: l.w,
            row_span: l.h,
            sort_order: index,
          });
        } else {
          stashUpdates.push({
            id: l.i,
            grid_x: 0,
            grid_y: 0,
            col_span: l.w,
            row_span: l.h,
            sort_order: index,
          });
        }
      });

      return { stashUpdates, goalUpdates };
    },
    [sortedItems]
  );

  // Handle resize stop - save size AND order to backend
  const handleResizeStop = useCallback(
    (newLayout: readonly LayoutItem[]) => {
      // Apply our custom compaction
      const compacted = compactHorizontalVertical(newLayout, effectiveCols);
      setLayout(compacted);

      // Build updates with sizing and ordering
      const { stashUpdates, goalUpdates } = buildLayoutUpdates(compacted);

      if (stashUpdates.length > 0) {
        onLayoutChange(stashUpdates);
      }

      if (goalUpdates.length > 0 && onGoalLayoutChange) {
        onGoalLayoutChange(goalUpdates);
      }
    },
    [effectiveCols, buildLayoutUpdates, onLayoutChange, onGoalLayoutChange]
  );

  // Handle drag stop - save new order to backend
  const handleDragStop = useCallback(
    (newLayout: readonly LayoutItem[]) => {
      // Apply our custom compaction
      const compacted = compactHorizontalVertical(newLayout, effectiveCols);
      setLayout(compacted);

      // Build updates with sizing and ordering
      const { stashUpdates, goalUpdates } = buildLayoutUpdates(compacted);

      if (stashUpdates.length > 0) {
        onLayoutChange(stashUpdates);
      }

      if (goalUpdates.length > 0 && onGoalLayoutChange) {
        onGoalLayoutChange(goalUpdates);
      }
    },
    [effectiveCols, buildLayoutUpdates, onLayoutChange, onGoalLayoutChange]
  );

  // Handle layout change from library - apply our custom compaction
  // Note: Only update if compaction actually changes positions to avoid infinite loops
  const handleLayoutChange = useCallback(
    (newLayout: readonly LayoutItem[]) => {
      const compacted = compactHorizontalVertical(newLayout, effectiveCols);
      // Check if layout actually changed to avoid infinite re-render loop
      // (react-grid-layout calls onLayoutChange whenever layout prop changes)
      setLayout((prevLayout) => {
        if (prevLayout.length !== compacted.length) return compacted;

        // Compare by ID (not index) since array order may differ between RGL and our state
        const prevById = new Map(prevLayout.map((l) => [l.i, l]));
        const changed = compacted.some((item) => {
          const prev = prevById.get(item.i);
          if (!prev) return true;
          return prev.x !== item.x || prev.y !== item.y || prev.w !== item.w || prev.h !== item.h;
        });
        return changed ? compacted : prevLayout;
      });
    },
    [effectiveCols]
  );

  // Measure container width with proper cleanup
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    // Initial measurement
    setContainerWidth(node.offsetWidth);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  if (sortedItems.length === 0) {
    return (
      <div className="w-full">
        <EmptyState message={emptyMessage} />
        {!isInDistributionMode && (
          <div className="flex justify-center mt-6">
            <button
              data-tour="stash-add-item"
              onClick={onAdd}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-base font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: 'var(--monarch-orange)' }}
            >
              <Icons.Plus size={20} />
              Create Your First Stash
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`stash-widget-grid w-full${tourShowResizeHandle ? ' tour-show-resize' : ''}`}
    >
      <GridLayout
        className="layout"
        layout={layout}
        width={containerWidth}
        cols={effectiveCols}
        rowHeight={ROW_HEIGHT}
        onLayoutChange={handleLayoutChange}
        onResizeStop={handleResizeStop}
        onDragStop={handleDragStop}
        isResizable={!isInDistributionMode}
        isDraggable={!isInDistributionMode}
        draggableHandle=".stash-card-image"
        resizeHandles={['se']}
        margin={MARGIN}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
        compactType="vertical"
        preventCollision={false}
      >
        {sortedItems.map((item, index) => {
          const isGoal = 'type' in item && item.type === 'monarch_goal';
          // Find the first Monarch goal for tour targeting
          const firstGoalIndex = sortedItems.findIndex(
            (i) => 'type' in i && i.type === 'monarch_goal'
          );
          const isFirstGoal = isGoal && index === firstGoalIndex;
          // Find the first stash item for tour targeting
          const firstStashIndex = sortedItems.findIndex(
            (i) => !('type' in i) || i.type !== 'monarch_goal'
          );
          const isFirstStash = !isGoal && index === firstStashIndex;

          return (
            <div
              key={item.id}
              className="stash-grid-item relative"
              data-tour={isFirstStash ? 'stash-move-card' : undefined}
            >
              {isGoal ? (
                <MonarchGoalCard
                  goal={item}
                  size={{ cols: item.col_span ?? 1, rows: item.row_span ?? 1 }}
                  showTypeBadge={showTypeBadges}
                  isFirstGoal={isFirstGoal}
                />
              ) : (
                <StashCard
                  item={item}
                  onEdit={onEdit}
                  onAllocate={onAllocate}
                  isAllocating={allocatingItemId === item.id}
                  size={{ cols: item.col_span ?? 1, rows: item.row_span ?? 1 }}
                  isFirstCard={isFirstStash}
                  showTypeBadge={showTypeBadges}
                  {...(onViewReport && { onViewReport })}
                />
              )}
              {isFirstStash && (
                <div
                  data-tour="stash-resize-card"
                  className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none"
                  style={{ zIndex: 1 }}
                />
              )}
            </div>
          );
        })}
        {/* Add placeholder card - unmovable, always at the end, hidden in distribution mode */}
        {!isInDistributionMode && (
          <div key={ADD_PLACEHOLDER_ID} className="stash-grid-item">
            <AddStashCard onAdd={onAdd} isFirst={sortedItems.length === 0} />
          </div>
        )}
        {/* Archived items - static, dimmed, after the Add card */}
        {sortedArchivedItems.map((item) => (
          <div key={`${ARCHIVED_PREFIX}${item.id}`} className="stash-grid-item opacity-60">
            <StashCard
              item={item}
              onEdit={onEdit}
              onAllocate={onAllocate}
              isAllocating={allocatingItemId === item.id}
              size={{ cols: 1, rows: 1 }}
              showTypeBadge={showTypeBadges}
              {...(onViewReport && { onViewReport })}
            />
          </div>
        ))}
      </GridLayout>
    </div>
  );
});
