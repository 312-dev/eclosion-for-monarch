/**
 * Skeleton Primitives
 *
 * Base skeleton/placeholder components for loading states.
 * Uses the `.skeleton` CSS class from index.css for shimmer animation.
 *
 * These components show the layout structure while content loads,
 * providing better UX than loading spinners.
 *
 * For composite layouts (tabs, pages), see SkeletonLayouts.tsx
 */

import type { CSSProperties, ReactNode } from 'react';

interface SkeletonProps {
  /** Width - can be Tailwind class like 'w-32' or CSS value */
  readonly width?: string;
  /** Height - can be Tailwind class like 'h-4' or CSS value */
  readonly height?: string;
  /** Border radius - defaults to 'rounded' */
  readonly rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Additional CSS classes */
  readonly className?: string;
  /** Inline styles */
  readonly style?: CSSProperties;
}

const ROUNDED_MAP = {
  none: '',
  sm: 'rounded-sm',
  md: 'rounded',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

/**
 * Base skeleton element with shimmer animation
 */
export function Skeleton({
  width,
  height = 'h-4',
  rounded = 'md',
  className = '',
  style,
}: SkeletonProps) {
  const roundedClass = ROUNDED_MAP[rounded];

  // Determine if width/height are Tailwind classes or CSS values
  const widthClass = width?.startsWith('w-') ? width : '';
  const heightClass = height?.startsWith('h-') ? height : '';

  const inlineStyle: CSSProperties = {
    ...style,
    ...(width && !width.startsWith('w-') ? { width } : {}),
    ...(height && !height.startsWith('h-') ? { height } : {}),
  };

  return (
    <div
      className={`skeleton ${widthClass} ${heightClass} ${roundedClass} ${className}`}
      style={inlineStyle}
    />
  );
}

/**
 * Skeleton text line - simulates a line of text
 */
export function SkeletonText({
  width = 'w-full',
  className = '',
}: {
  readonly width?: string;
  readonly className?: string;
}) {
  return <Skeleton width={width} height="h-4" className={className} />;
}

/**
 * Skeleton heading - simulates a heading
 */
export function SkeletonHeading({
  width = 'w-48',
  size = 'md',
  className = '',
}: {
  readonly width?: string;
  readonly size?: 'sm' | 'md' | 'lg' | 'xl';
  readonly className?: string;
}) {
  const heightMap = {
    sm: 'h-5',
    md: 'h-6',
    lg: 'h-7',
    xl: 'h-8',
  };
  return <Skeleton width={width} height={heightMap[size]} className={className} />;
}

/**
 * Skeleton avatar/icon circle
 */
export function SkeletonCircle({
  size = 40,
  className = '',
}: {
  readonly size?: number;
  readonly className?: string;
}) {
  return (
    <Skeleton
      width={`${size}px`}
      height={`${size}px`}
      rounded="full"
      className={`shrink-0 ${className}`}
    />
  );
}

/**
 * Skeleton button
 */
export function SkeletonButton({
  width = 'w-24',
  height = 'h-9',
  className = '',
}: {
  readonly width?: string;
  readonly height?: string;
  readonly className?: string;
}) {
  return <Skeleton width={width} height={height} rounded="lg" className={className} />;
}

/**
 * Skeleton card container with optional children
 */
export function SkeletonCard({
  children,
  className = '',
}: {
  readonly children?: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      {children}
    </div>
  );
}
