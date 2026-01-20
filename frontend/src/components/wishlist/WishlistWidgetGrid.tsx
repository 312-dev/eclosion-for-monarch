/**
 * WishlistWidgetGrid - Resizable widget grid for wishlist cards
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
import type { WishlistItem, WishlistLayoutUpdate } from '../../types';
import { WishlistCard } from './WishlistCard';
import { Icons } from '../icons';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface WishlistWidgetGridProps {
  readonly items: WishlistItem[];
  readonly onEdit: (item: WishlistItem) => void;
  readonly onAllocate: (itemId: string, amount: number) => Promise<void>;
  readonly onLayoutChange: (layouts: WishlistLayoutUpdate[]) => void;
  readonly allocatingItemId?: string | null;
  readonly emptyMessage?: string;
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

function createLayoutFromItems(items: WishlistItem[], cols: number): LayoutItem[] {
  const layout = items.map((item) => ({
    i: item.id,
    x: Math.min(item.grid_x ?? 0, Math.max(0, cols - (item.col_span ?? 1))),
    y: item.grid_y ?? 0,
    w: Math.min(item.col_span ?? 1, cols),
    h: item.row_span ?? 1,
    minW: 1,
    maxW: Math.min(3, cols),
    minH: 1,
    maxH: 2,
  }));

  return compactLayout(layout, cols);
}

type Layouts = Record<string, LayoutItem[]>;

export const WishlistWidgetGrid = memo(function WishlistWidgetGrid({
  items,
  onEdit,
  onAllocate,
  onLayoutChange,
  allocatingItemId,
  emptyMessage = 'No wishlist items yet. Add your first item to start saving!',
}: WishlistWidgetGridProps) {
  const layoutChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justCompactedRef = useRef(false);
  const [layoutVersion, setLayoutVersion] = useState(0);

  // Create initial layouts
  const [layouts, setLayouts] = useState<Layouts>(() => ({
    lg: createLayoutFromItems(items, 3),
    md: createLayoutFromItems(items, 2),
    sm: createLayoutFromItems(items, 1),
    xs: createLayoutFromItems(items, 1),
  }));

  // Sync layouts when items change (add/remove)
  const itemIdsRef = useRef(items.map((i) => i.id).join(','));
  /* eslint-disable react-hooks/set-state-in-effect -- Grid layout sync on item changes is required */
  useEffect(() => {
    const newIds = items.map((i) => i.id).join(',');
    if (itemIdsRef.current !== newIds) {
      itemIdsRef.current = newIds;
      setLayouts({
        lg: createLayoutFromItems(items, 3),
        md: createLayoutFromItems(items, 2),
        sm: createLayoutFromItems(items, 1),
        xs: createLayoutFromItems(items, 1),
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
      // Cast to our Layouts type (actual runtime type is LayoutItem[][] despite typing)
      setLayouts(allLayouts as unknown as Layouts);
    },
    []
  );

  // Persist to database on drag/resize stop (with compaction)
  const handleDragOrResizeStop = useCallback(
    (layout: Layout) => {
      if (layoutChangeTimeoutRef.current) {
        clearTimeout(layoutChangeTimeoutRef.current);
      }

      // Compact the layout for lg breakpoint (3 cols), then derive others
      const lgLayout = compactLayout(layout as LayoutItem[], 3);

      // Set flag to skip the next onLayoutChange (it fires after onDragStop)
      justCompactedRef.current = true;

      // Update all breakpoints with properly compacted layouts
      setLayouts({
        lg: lgLayout.map((l) => ({ ...l, maxW: 3 })),
        md: compactLayout(lgLayout.map((l) => ({ ...l, w: Math.min(l.w, 2), maxW: 2 })), 2),
        sm: compactLayout(lgLayout.map((l) => ({ ...l, w: 1, maxW: 1 })), 1),
        xs: compactLayout(lgLayout.map((l) => ({ ...l, w: 1, maxW: 1 })), 1),
      });

      // Force re-render of grid
      setLayoutVersion((v) => v + 1);

      layoutChangeTimeoutRef.current = setTimeout(() => {
        const updates: WishlistLayoutUpdate[] = lgLayout.map((l) => ({
          id: l.i,
          grid_x: l.x,
          grid_y: l.y,
          col_span: l.w,
          row_span: l.h,
        }));

        const hasChanges = updates.some((update) => {
          const item = items.find((i) => i.id === update.id);
          if (!item) return false;
          return (
            update.grid_x !== (item.grid_x ?? 0) ||
            update.grid_y !== (item.grid_y ?? 0) ||
            update.col_span !== (item.col_span ?? 1) ||
            update.row_span !== (item.row_span ?? 1)
          );
        });

        if (hasChanges) {
          onLayoutChange(updates);
        }
      }, 100);
    },
    [items, onLayoutChange]
  );

  if (items.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="wishlist-widget-grid">
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
        resizeHandles={['se']}
        margin={MARGIN}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            className="wishlist-grid-item relative"
            data-tour={index === 0 ? 'wishlist-move-card' : undefined}
          >
            <WishlistCard
              item={item}
              onEdit={onEdit}
              onAllocate={onAllocate}
              isAllocating={allocatingItemId === item.id}
              size={{ cols: item.col_span ?? 1, rows: item.row_span ?? 1 }}
              isFirstCard={index === 0}
            />
            {index === 0 && (
              <div
                data-tour="wishlist-resize-card"
                className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none"
                style={{ zIndex: 1 }}
              />
            )}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
});
