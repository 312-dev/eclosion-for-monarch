/**
 * MerchantLogo - Displays merchant logo with fallback to colored initial
 */

import { useState } from 'react';
import type { RecurringItem } from '../../../types';

const LOGO_COLORS = [
  '#FF692D',
  '#4A90D9',
  '#50C878',
  '#9B59B6',
  '#E74C3C',
  '#3498DB',
  '#1ABC9C',
  '#F39C12',
  '#E91E63',
  '#00BCD4',
];

interface MerchantLogoProps {
  readonly item: RecurringItem;
  readonly size?: number;
}

export function MerchantLogo({ item, size = 40 }: MerchantLogoProps) {
  const [imgError, setImgError] = useState(false);
  const displayName = item.merchant_name || item.name;
  const initial = displayName.charAt(0).toUpperCase();

  const colorIndex =
    displayName.split('').reduce((acc, char) => acc + (char.codePointAt(0) ?? 0), 0) %
    LOGO_COLORS.length;
  const bgColor = LOGO_COLORS[colorIndex];

  if (item.logo_url && !imgError) {
    return (
      <img
        src={item.logo_url}
        alt=""
        className="rounded-lg object-cover"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="rounded-lg flex items-center justify-center text-white font-semibold"
      style={{ width: size, height: size, backgroundColor: bgColor, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}
