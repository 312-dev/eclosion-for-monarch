/**
 * Archived Items Section
 *
 * Collapsible section showing archived/completed stash items.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { StashCard } from './StashCard';
import type { StashItem } from '../../types';

interface ArchivedItemsSectionProps {
  items: StashItem[];
  onEdit: (item: StashItem) => void;
  onAllocate: (itemId: string, amount: number) => Promise<void>;
  allocatingItemId: string | null;
}

export function ArchivedItemsSection({
  items,
  onEdit,
  onAllocate,
  allocatingItemId,
}: ArchivedItemsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="section-enter rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-(--monarch-bg-hover) transition-colors"
        aria-expanded={isExpanded}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
          Past / Archived ({items.length})
        </span>
        {isExpanded ? (
          <ChevronDown size={16} style={{ color: 'var(--monarch-text-muted)' }} />
        ) : (
          <ChevronRight size={16} style={{ color: 'var(--monarch-text-muted)' }} />
        )}
      </button>

      {isExpanded && (
        <div
          className="animate-expand border-t p-4"
          style={{ borderColor: 'var(--monarch-border)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="list-item-enter h-70"
                style={index < 15 ? { animationDelay: `${index * 50}ms` } : undefined}
              >
                <StashCard
                  item={item}
                  onEdit={onEdit}
                  onAllocate={onAllocate}
                  isAllocating={allocatingItemId === item.id}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
