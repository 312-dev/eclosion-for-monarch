/**
 * StashWidgetGrid - Resizable widget grid for stash cards
 *
 * Uses react-grid-layout for iOS/Android-style widget resizing and reordering.
 * Cards can span 1-3 columns and 1-2 rows.
 */

import { memo, useCallback, useRef, useState, useEffect } from 'react';
import {
  Responsive,
  WidthProvider,
  type Layout,
  type LayoutItem,
} from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { StashItem, StashLayoutUpdate } from '../../types';
import type { MonarchGoal, MonarchGoalLayoutUpdate } from '../../types/monarchGoal';
import { StashCard } from './StashCard';
import { MonarchGoalCard } from './MonarchGoalCard';
import { Icons } from '../icons';

const ResponsiveGridLayout = WidthProvider(Responsive);

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
}

const ROW_HEIGHT = 280;
const MARGIN: [number, number] = [16, 16];
const BREAKPOINTS = { lg: 1024, md: 768, sm: 480, xs: 0 };
const COLS_BY_BREAKPOINT = { lg: 3, md: 2, sm: 1, xs: 1 };

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
          <div
            className="w-16 h-5 rounded"
            style={{ backgroundColor: 'var(--monarch-border)' }}
          />
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
        <div
          className="h-2 rounded-full"
          style={{ backgroundColor: 'var(--monarch-border)' }}
        />
      </div>
    </div>
  );
}

function AddStashCard({ onAdd, isFirst }: { readonly onAdd: () => void; readonly isFirst: boolean }) {
  return (
    <button
      data-tour="stash-add-item"
      onClick={onAdd}
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
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
          style={{
            backgroundColor: 'var(--monarch-orange)',
            opacity: 0.9,
          }}
        >
          <Icons.Plus size={32} style={{ color: '#fff' }} />
        </div>
      </div>

      {/* Content Area - matches StashCard p-4 with maxHeight 140 */}
      <div className="p-4 shrink-0 flex flex-col items-center justify-center" style={{ maxHeight: 140 }}>
        <h3
          className="text-base font-semibold mb-1"
          style={{ color: 'var(--monarch-text-dark)' }}
        >
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
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-30"
        style={{
          maskImage: 'linear-gradient(to bottom, black 0%, black 30%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 30%, transparent 100%)',
        }}
      >
        <PlaceholderCard />
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
 * Check if two layout items collide (overlap).
 */
function itemsCollide(a: LayoutItem, b: LayoutItem): boolean {
  if (a.i === b.i) return false;
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

/**
 * Check if an item collides with any other item in the layout.
 */
function collidesWithAny(item: LayoutItem, layout: LayoutItem[]): boolean {
  return layout.some((other) => itemsCollide(item, other));
}

/**
 * Find the first available position for an item in the grid.
 * Scans row by row, left to right, until finding a spot that doesn't collide.
 */
function findFirstAvailablePosition(
  item: LayoutItem,
  placed: LayoutItem[],
  cols: number
): { x: number; y: number } {
  const w = Math.min(item.w, cols);

  // Try each row starting from 0
  for (let y = 0; y < 100; y++) {
    // Try each x position in this row
    for (let x = 0; x <= cols - w; x++) {
      const testItem = { ...item, x, y, w };
      if (!collidesWithAny(testItem, placed)) {
        return { x, y };
      }
    }
  }

  // Fallback (shouldn't reach here)
  return { x: 0, y: placed.length };
}

/**
 * Compact a layout by placing each item in the first available slot.
 * Items are placed row by row, left to right, filling gaps efficiently.
 */
function compactLayout(layout: LayoutItem[], cols: number = 3): LayoutItem[] {
  // Sort by y then x for consistent ordering (existing positions get priority)
  const sorted = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
  const compacted: LayoutItem[] = [];

  for (const item of sorted) {
    const { x, y } = findFirstAvailablePosition(item, compacted, cols);
    compacted.push({ ...item, x, y, w: Math.min(item.w, cols) });
  }

  return compacted;
}

const ADD_PLACEHOLDER_ID = '__add_stash_placeholder__';

function createLayoutFromItems(items: (StashItem | MonarchGoal)[], cols: number, includeAddPlaceholder: boolean = false): LayoutItem[] {
  // Separate items with explicit positions from new items (grid_x=0, grid_y=0)
  const itemsWithPositions: LayoutItem[] = [];
  const newItems: LayoutItem[] = [];

  items.forEach((item) => {
    const layoutItem = {
      i: item.id,
      x: Math.min(item.grid_x ?? 0, Math.max(0, cols - (item.col_span ?? 1))),
      y: item.grid_y ?? 0,
      w: Math.min(item.col_span ?? 1, cols),
      h: item.row_span ?? 1,
      minW: 1,
      maxW: Math.min(3, cols),
      minH: 1,
      maxH: 2,
    };

    // Check if this is a new item with default position (0,0)
    // Only treat as "new" if both are 0 - otherwise it's an explicit top-left placement
    if ((item.grid_x ?? 0) === 0 && (item.grid_y ?? 0) === 0) {
      newItems.push(layoutItem);
    } else {
      itemsWithPositions.push(layoutItem);
    }
  });

  // Compact existing items first
  let compacted = compactLayout(itemsWithPositions, cols);

  // Add new items at the end (after existing items)
  for (const newItem of newItems) {
    const { x, y } = findFirstAvailablePosition(newItem, compacted, cols);
    compacted.push({ ...newItem, x, y });
  }

  // Add placeholder at the end if requested
  if (includeAddPlaceholder) {
    const placeholder = {
      i: ADD_PLACEHOLDER_ID,
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      minW: 1,
      maxW: Math.min(3, cols),
      minH: 1,
      maxH: 2,
      static: true, // Make it unmovable and non-resizable
      isDraggable: false,
      isResizable: false,
    };
    const { x, y } = findFirstAvailablePosition(placeholder, compacted, cols);
    compacted.push({ ...placeholder, x, y });
  }

  return compacted;
}

type Layouts = Record<string, LayoutItem[]>;

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
}: StashWidgetGridProps) {
  const layoutChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justCompactedRef = useRef(false);
  const [layoutVersion, setLayoutVersion] = useState(0);

  // Create initial layouts
  const [layouts, setLayouts] = useState<Layouts>(() => ({
    lg: createLayoutFromItems(items, 3, true),
    md: createLayoutFromItems(items, 2, true),
    sm: createLayoutFromItems(items, 1, true),
    xs: createLayoutFromItems(items, 1, true),
  }));

  // Sync layouts when items change (add/remove)
  const itemIdsRef = useRef(items.map((i) => i.id).join(','));
  /* eslint-disable react-hooks/set-state-in-effect -- Grid layout sync on item changes is required */
  useEffect(() => {
    const newIds = items.map((i) => i.id).join(',');
    if (itemIdsRef.current !== newIds) {
      itemIdsRef.current = newIds;
      setLayouts({
        lg: createLayoutFromItems(items, 3, true),
        md: createLayoutFromItems(items, 2, true),
        sm: createLayoutFromItems(items, 1, true),
        xs: createLayoutFromItems(items, 1, true),
      });
      // Force grid remount when items are added/removed to avoid
      // react-grid-layout internal ref management infinite loops
      setLayoutVersion((v) => v + 1);
    }
  }, [items]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Handle layout changes from grid (skip if we just compacted)
  // Note: react-grid-layout types are inconsistent - it passes LayoutItem[] arrays
  const handleLayoutChange = useCallback(
    (_layout: Layout, allLayouts: Partial<Record<string, Layout>>) => {
      if (justCompactedRef.current) {
        justCompactedRef.current = false;
        return;
      }

      // Ensure placeholder fills available space (not forced to new row)
      const updatedLayouts: Layouts = {} as Layouts;

      for (const [breakpoint, layout] of Object.entries(allLayouts)) {
        const layoutItems = layout as LayoutItem[];
        const itemsOnly = layoutItems.filter((l) => l.i !== ADD_PLACEHOLDER_ID);

        const placeholder = layoutItems.find((l) => l.i === ADD_PLACEHOLDER_ID);
        if (placeholder) {
          // Get column count for this breakpoint
          const cols = COLS_BY_BREAKPOINT[breakpoint as keyof typeof COLS_BY_BREAKPOINT] ?? 3;
          // Find first available position
          const { x, y } = findFirstAvailablePosition(placeholder, itemsOnly, cols);
          updatedLayouts[breakpoint] = [
            ...itemsOnly,
            { ...placeholder, x, y },
          ];
        } else {
          updatedLayouts[breakpoint] = itemsOnly;
        }
      }

      setLayouts(updatedLayouts);
    },
    []
  );

  // Persist to database on drag/resize stop (with compaction)
  const handleDragOrResizeStop = useCallback(
    (layout: Layout) => {
      if (layoutChangeTimeoutRef.current) {
        clearTimeout(layoutChangeTimeoutRef.current);
      }

      // Separate placeholder from real items
      const layoutItems = layout as LayoutItem[];
      const itemsOnly = layoutItems.filter((l) => l.i !== ADD_PLACEHOLDER_ID);

      // Compact only the real items for lg breakpoint (3 cols)
      const lgLayout = compactLayout(itemsOnly, 3);

      // Find first available position for placeholder (after all real items)
      const placeholderTemplate: LayoutItem = {
        i: ADD_PLACEHOLDER_ID,
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        minW: 1,
        maxW: 3,
        minH: 1,
        maxH: 2,
        static: true,
        isDraggable: false,
        isResizable: false,
      };
      const { x, y } = findFirstAvailablePosition(placeholderTemplate, lgLayout, 3);
      const placeholder: LayoutItem = { ...placeholderTemplate, x, y };

      // Set flag to skip the next onLayoutChange (it fires after onDragStop)
      justCompactedRef.current = true;

      // Update all breakpoints with properly compacted layouts + placeholder
      const lgWithPlaceholder = [...lgLayout.map((l) => ({ ...l, maxW: 3 })), placeholder];

      // For md breakpoint (2 cols), recalculate placeholder position
      const mdLayout = compactLayout(lgLayout.map((l) => ({ ...l, w: Math.min(l.w, 2), maxW: 2 })), 2);
      const mdPlaceholder = { ...placeholderTemplate, maxW: 2, w: Math.min(placeholderTemplate.w, 2) };
      const mdPos = findFirstAvailablePosition(mdPlaceholder, mdLayout, 2);

      // For sm/xs breakpoints (1 col), recalculate placeholder position
      const smLayout = compactLayout(lgLayout.map((l) => ({ ...l, w: 1, maxW: 1 })), 1);
      const smPlaceholder = { ...placeholderTemplate, w: 1, maxW: 1 };
      const smPos = findFirstAvailablePosition(smPlaceholder, smLayout, 1);

      setLayouts({
        lg: lgWithPlaceholder,
        md: [...mdLayout, { ...mdPlaceholder, x: mdPos.x, y: mdPos.y }],
        sm: [...smLayout, { ...smPlaceholder, x: smPos.x, y: smPos.y }],
        xs: [...smLayout, { ...smPlaceholder, x: smPos.x, y: smPos.y }],
      });

      // Force re-render of grid
      setLayoutVersion((v) => v + 1);

      layoutChangeTimeoutRef.current = setTimeout(() => {
        // Filter out the add placeholder and separate Stash items from Goals
        const stashUpdates: StashLayoutUpdate[] = [];
        const goalUpdates: MonarchGoalLayoutUpdate[] = [];

        lgLayout
          .filter((l) => l.i !== ADD_PLACEHOLDER_ID)
          .forEach((l) => {
            const item = items.find((i) => i.id === l.i);
            if (!item) return;

            // Check if item is a MonarchGoal using type discriminator
            const isGoal = 'type' in item && item.type === 'monarch_goal';

            if (isGoal) {
              goalUpdates.push({
                goal_id: l.i,
                grid_x: l.x,
                grid_y: l.y,
                col_span: l.w,
                row_span: l.h,
              });
            } else {
              stashUpdates.push({
                id: l.i,
                grid_x: l.x,
                grid_y: l.y,
                col_span: l.w,
                row_span: l.h,
              });
            }
          });

        // Check for changes in Stash items
        const hasStashChanges = stashUpdates.some((update) => {
          const item = items.find((i) => i.id === update.id);
          if (!item || ('type' in item && item.type === 'monarch_goal')) return false;
          return (
            update.grid_x !== (item.grid_x ?? 0) ||
            update.grid_y !== (item.grid_y ?? 0) ||
            update.col_span !== (item.col_span ?? 1) ||
            update.row_span !== (item.row_span ?? 1)
          );
        });

        // Check for changes in goal items
        const hasGoalChanges = goalUpdates.some((update) => {
          const item = items.find((i) => i.id === update.goal_id);
          if (!item || !('type' in item) || item.type !== 'monarch_goal') return false;
          return (
            update.grid_x !== (item.grid_x ?? 0) ||
            update.grid_y !== (item.grid_y ?? 0) ||
            update.col_span !== (item.col_span ?? 1) ||
            update.row_span !== (item.row_span ?? 1)
          );
        });

        if (hasStashChanges) {
          onLayoutChange(stashUpdates);
        }

        if (hasGoalChanges && onGoalLayoutChange) {
          onGoalLayoutChange(goalUpdates);
        }
      }, 100);
    },
    [items, onLayoutChange, onGoalLayoutChange]
  );

  if (items.length === 0) {
    return (
      <div className="w-full">
        <EmptyState message={emptyMessage} />
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
      </div>
    );
  }

  return (
    <div className="stash-widget-grid">
      <ResponsiveGridLayout
        key={layoutVersion}
        className="layout"
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS_BY_BREAKPOINT}
        rowHeight={ROW_HEIGHT}
        onLayoutChange={handleLayoutChange}
        onDragStop={handleDragOrResizeStop}
        onResizeStop={handleDragOrResizeStop}
        isResizable={true}
        isDraggable={true}
        draggableHandle=".stash-card-image"
        resizeHandles={['se']}
        margin={MARGIN}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
      >
        {items.map((item, index) => {
          const isGoal = 'type' in item && item.type === 'monarch_goal';

          return (
            <div
              key={item.id}
              className="stash-grid-item relative"
              data-tour={index === 0 && !isGoal ? 'stash-move-card' : undefined}
            >
              {isGoal ? (
                <MonarchGoalCard
                  goal={item}
                  size={{ cols: item.col_span ?? 1, rows: item.row_span ?? 1 }}
                  showTypeBadge={showTypeBadges}
                />
              ) : (
                <StashCard
                  item={item}
                  onEdit={onEdit}
                  onAllocate={onAllocate}
                  isAllocating={allocatingItemId === item.id}
                  size={{ cols: item.col_span ?? 1, rows: item.row_span ?? 1 }}
                  isFirstCard={index === 0}
                  showTypeBadge={showTypeBadges}
                  {...(onViewReport && { onViewReport })}
                />
              )}
              {index === 0 && !isGoal && (
                <div
                  data-tour="stash-resize-card"
                  className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none"
                  style={{ zIndex: 1 }}
                />
              )}
            </div>
          );
        })}
        {/* Add placeholder card - unmovable, always at the end */}
        <div key={ADD_PLACEHOLDER_ID} className="stash-grid-item">
          <AddStashCard onAdd={onAdd} isFirst={items.length === 0} />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
});
