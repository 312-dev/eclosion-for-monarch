/**
 * Benefits List Component
 *
 * Displays feature benefits in a visually appealing grid or list.
 */

import { Icons } from '../icons';
import type { Benefit } from '../../data/features';

interface BenefitsListProps {
  benefits: Benefit[];
  /** Grid shows 2 columns, list is single column */
  layout?: 'grid' | 'list';
}

export function BenefitsList({ benefits, layout = 'grid' }: BenefitsListProps) {
  return (
    <div
      className={`${
        layout === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
          : 'flex flex-col gap-4'
      }`}
    >
      {benefits.map((benefit, index) => {
        const IconComponent = Icons[benefit.icon];

        return (
          <div
            key={index}
            className="flex items-start gap-4 p-4 rounded-xl bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)]"
          >
            {/* Icon */}
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--monarch-orange)] bg-opacity-10">
              <IconComponent size={20} color="var(--monarch-orange)" />
            </div>

            {/* Content */}
            <div>
              <h4 className="font-semibold text-[var(--monarch-text-dark)] mb-1">
                {benefit.title}
              </h4>
              <p className="text-sm text-[var(--monarch-text)]">
                {benefit.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
