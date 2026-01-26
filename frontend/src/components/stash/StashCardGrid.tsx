/**
 * StashCardGrid - Grid layout for stash cards with drag/drop reordering
 *
 * Displays stash items in a responsive grid (1-2 columns).
 * Supports drag/drop reordering using @dnd-kit.
 * Includes empty state when no items are present.
 */

import { memo, useCallback } from 'react';
import type { PointerEvent } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { StashItem } from '../../types';
import { StashCard } from './StashCard';
import { Icons } from '../icons';
import { useIsInDistributionMode } from '../../context/DistributionModeContext';

/**
 * Check if the event target is within the drag handle (image area).
 * Dragging is ONLY allowed when starting from the image area.
 */
function shouldHandleEvent(element: Element | null): boolean {
  if (!element) return false;

  // Check element and its ancestors for the drag handle (image area)
  let el: Element | null = element;
  while (el) {
    const tagName = el.tagName.toUpperCase();
    // Skip if it's an interactive element (even within the image area)
    if (
      tagName === 'INPUT' ||
      tagName === 'TEXTAREA' ||
      tagName === 'BUTTON' ||
      tagName === 'A' ||
      tagName === 'SELECT' ||
      (el as HTMLElement).isContentEditable ||
      el.getAttribute('role') === 'button' ||
      (el as HTMLElement).dataset['noDnd'] === 'true'
    ) {
      return false;
    }
    // Only allow drag if we find the drag handle (image area)
    if (el.classList.contains('stash-card-image')) {
      return true;
    }
    el = el.parentElement;
  }
  // Not within the drag handle area - don't allow drag
  return false;
}

/** Custom PointerSensor that ignores interactive elements */
class StashPointerSensor extends PointerSensor {
  static readonly activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (event: PointerEvent) => {
        return shouldHandleEvent(event.target as Element);
      },
    },
  ];
}

interface StashCardGridProps {
  readonly items: StashItem[];
  readonly onEdit: (item: StashItem) => void;
  readonly onAllocate: (itemId: string, amount: number) => Promise<void>;
  readonly onReorder?: (itemIds: string[]) => void;
  readonly allocatingItemId?: string | null;
  readonly emptyMessage?: string;
}

interface SortableCardProps {
  readonly item: StashItem;
  readonly onEdit: (item: StashItem) => void;
  readonly onAllocate: (itemId: string, amount: number) => Promise<void>;
  readonly isAllocating: boolean;
}

/** Sortable wrapper for StashCard */
function SortableCard({ item, onEdit, onAllocate, isAllocating }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Combine attributes and listeners for drag handle - both go ONLY on the image area
  const dragHandleProps = { ...attributes, ...listeners };

  return (
    <div ref={setNodeRef} style={style}>
      <StashCard
        item={item}
        onEdit={onEdit}
        onAllocate={onAllocate}
        isAllocating={isAllocating}
        dragHandleProps={dragHandleProps}
        isDragging={isDragging}
      />
    </div>
  );
}

/** Placeholder card matching StashCard structure */
function PlaceholderCard() {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        borderColor: 'var(--monarch-border)',
      }}
    >
      {/* Image Area */}
      <div
        className="h-28 flex items-center justify-center relative"
        style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
      >
        <div
          className="w-12 h-12 rounded-full"
          style={{ backgroundColor: 'var(--monarch-border)' }}
        />
        {/* Status badge placeholder */}
        <div className="absolute top-2 right-2">
          <div className="w-16 h-5 rounded" style={{ backgroundColor: 'var(--monarch-border)' }} />
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {/* Title row */}
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

        {/* Goal and date */}
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

        {/* Monthly target */}
        <div
          className="h-4 rounded mb-3"
          style={{ backgroundColor: 'var(--monarch-border)', width: '140px' }}
        />

        {/* Progress bar placeholder */}
        <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--monarch-border)' }} />
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="relative">
      {/* Placeholder cards grid with fade mask */}
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

      {/* Centered tip */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <Icons.Gift size={48} style={{ color: 'var(--monarch-text-muted)' }} className="mb-4" />
        <p className="text-center px-4" style={{ color: 'var(--monarch-text-muted)' }}>
          {message}
        </p>
      </div>
    </div>
  );
}

export const StashCardGrid = memo(function StashCardGrid({
  items,
  onEdit,
  onAllocate,
  onReorder,
  allocatingItemId,
  emptyMessage = 'No jars, no envelopes, no guesswork. Build your first stash.',
}: StashCardGridProps) {
  const isInDistributionMode = useIsInDistributionMode();

  // Disable drag sensors in distribution/hypothesize mode
  const activeSensors = useSensors(
    useSensor(StashPointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts (allows clicks)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const disabledSensors = useSensors();
  const sensors = isInDistributionMode ? disabledSensors : activeSensors;

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          // Create new order
          const newItems = [...items];
          const [movedItem] = newItems.splice(oldIndex, 1);
          newItems.splice(newIndex, 0, movedItem!);

          // Call reorder with new order of IDs
          onReorder?.(newItems.map((item) => item.id));
        }
      }
    },
    [items, onReorder]
  );

  if (items.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const itemIds = items.map((item) => item.id);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={itemIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 min-[801px]:grid-cols-2 gap-4">
          {items.map((item) => (
            <SortableCard
              key={item.id}
              item={item}
              onEdit={onEdit}
              onAllocate={onAllocate}
              isAllocating={allocatingItemId === item.id}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
});
