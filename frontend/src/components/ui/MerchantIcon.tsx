/**
 * MerchantIcon Component
 *
 * Displays a merchant logo with fallback icon.
 * Replaces duplicated MerchantIconWithFallback in RecurringList and RollupZone.
 */

import { useState, type ComponentType } from 'react';
import {
  TvIcon,
  MusicIcon,
  WifiIcon,
  PhoneIcon,
  ZapIcon,
  DropletIcon,
  FlameIcon,
  CarIcon,
  HeartIcon,
  HomeIcon,
  GamepadIcon,
  DumbbellIcon,
  CloudIcon,
  NewspaperIcon,
  RepeatIcon,
  ShieldIcon,
} from '../icons';
import type { LucideProps } from '../icons';

export interface MerchantIconProps {
  /** URL of the merchant logo */
  logoUrl: string | null;
  /** Item name for category-based fallback icon (demo mode) */
  itemName?: string;
  /** Size of the icon */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Alt text for the image */
  alt?: string;
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const ICON_SIZES = {
  sm: 14,
  md: 20,
  lg: 24,
};

/**
 * Keyword patterns mapped to category icons.
 * Order matters - first match wins.
 */
type CategoryIconComponent = ComponentType<LucideProps>;

const CATEGORY_PATTERNS: Array<{ keywords: string[]; icon: CategoryIconComponent }> = [
  // Streaming/Entertainment
  { keywords: ['netflix', 'hulu', 'disney', 'hbo', 'max', 'prime video', 'peacock', 'paramount', 'apple tv', 'streaming'], icon: TvIcon },
  { keywords: ['spotify', 'apple music', 'pandora', 'tidal', 'deezer', 'music'], icon: MusicIcon },
  { keywords: ['xbox', 'playstation', 'nintendo', 'steam', 'gaming', 'game pass'], icon: GamepadIcon },

  // Utilities
  { keywords: ['electric', 'power', 'energy', 'pge', 'edison'], icon: ZapIcon },
  { keywords: ['water', 'sewer'], icon: DropletIcon },
  { keywords: ['gas', 'propane'], icon: FlameIcon },
  { keywords: ['internet', 'wifi', 'comcast', 'xfinity', 'spectrum', 'att', 'verizon fios', 'isp'], icon: WifiIcon },
  { keywords: ['phone', 'mobile', 'verizon', 't-mobile', 'tmobile', 'at&t', 'cellular', 'cell'], icon: PhoneIcon },

  // Insurance
  { keywords: ['auto insurance', 'car insurance', 'geico', 'progressive', 'state farm', 'allstate'], icon: CarIcon },
  { keywords: ['health insurance', 'medical', 'dental', 'vision', 'healthcare'], icon: HeartIcon },
  { keywords: ['insurance', 'life insurance', 'renters', 'homeowners'], icon: ShieldIcon },

  // Housing
  { keywords: ['mortgage', 'rent', 'hoa', 'housing', 'lease'], icon: HomeIcon },

  // Fitness
  { keywords: ['gym', 'fitness', 'planet fitness', 'equinox', 'crossfit', 'peloton', 'workout'], icon: DumbbellIcon },

  // Cloud/Software
  { keywords: ['cloud', 'dropbox', 'google drive', 'icloud', 'storage', 'onedrive'], icon: CloudIcon },

  // News/Media
  { keywords: ['news', 'times', 'post', 'journal', 'newspaper', 'magazine', 'medium', 'substack'], icon: NewspaperIcon },
];

/**
 * Get the appropriate category icon based on item name keywords.
 */
function getCategoryIcon(itemName: string): CategoryIconComponent {
  const lowerName = itemName.toLowerCase();

  for (const { keywords, icon } of CATEGORY_PATTERNS) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return icon;
    }
  }

  // Default fallback
  return RepeatIcon;
}

/**
 * Merchant icon with automatic fallback to placeholder.
 * When no logo is available and itemName is provided, shows a category-appropriate icon.
 */
export function MerchantIcon({
  logoUrl,
  itemName,
  size = 'md',
  className = '',
  alt = '',
}: MerchantIconProps) {
  const [hasError, setHasError] = useState(false);

  const sizeClass = SIZE_CLASSES[size];
  const iconSize = ICON_SIZES[size];
  const showFallback = !logoUrl || hasError;

  // Get category icon if we have an item name
  const CategoryIcon = itemName ? getCategoryIcon(itemName) : null;

  return (
    <div className={`relative shrink-0 ${className}`}>
      {logoUrl && !hasError && (
        <img
          src={logoUrl}
          alt={alt}
          className={`${sizeClass} rounded-full object-cover bg-white`}
          onError={() => setHasError(true)}
        />
      )}
      {showFallback && (
        <div
          className={`${sizeClass} rounded-full flex items-center justify-center`}
          style={{ backgroundColor: 'var(--monarch-bg-page)' }}
        >
          {CategoryIcon ? (
            <CategoryIcon
              size={iconSize}
              color="var(--monarch-text-muted)"
              strokeWidth={1.5}
            />
          ) : (
            <svg
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--monarch-text-muted)"
              strokeWidth="1.5"
            >
              <path d="M4 4h16v16H4zM4 8h16M8 4v4" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
