/**
 * Skeleton Layout Components
 *
 * Composite skeleton components for specific UI layouts.
 * These build on the primitives from Skeleton.tsx.
 */

import { Skeleton, SkeletonCard, SkeletonCircle } from './Skeleton';

/**
 * Tool page header skeleton - matches ToolPageHeader layout
 */
export function SkeletonToolHeader() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        {/* Icon box */}
        <div
          className="w-16 h-16 rounded-lg skeleton shrink-0"
          style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
        />
        {/* Title and description */}
        <div className="flex-1 min-w-0">
          <Skeleton width="w-40" height="h-7" className="mb-2" />
          <Skeleton width="w-64" height="h-4" />
        </div>
        {/* Settings button placeholder */}
        <Skeleton width="w-9" height="h-9" rounded="lg" className="shrink-0" />
      </div>
    </div>
  );
}

/**
 * Horizontal tabs skeleton - matches HorizontalTabsScroll layout
 */
export function SkeletonTabs({ count = 3 }: { readonly count?: number }) {
  return (
    <div className="border-b" style={{ borderColor: 'var(--monarch-border)' }}>
      <div className="flex gap-1 pb-2">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} width="w-28" height="h-10" rounded="none" />
        ))}
      </div>
    </div>
  );
}

/**
 * Stash card skeleton - matches StashCard layout
 */
export function SkeletonStashCard() {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        borderColor: 'var(--monarch-border)',
      }}
    >
      {/* Image area */}
      <div
        className="h-28 flex items-center justify-center relative skeleton"
        style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
      >
        <div className="w-12 h-12 rounded-full skeleton" />
        <div className="absolute top-2 right-2">
          <Skeleton width="w-16" height="h-5" />
        </div>
      </div>
      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Skeleton width="w-6" height="h-6" rounded="md" className="shrink-0" />
            <Skeleton width="w-28" height="h-5" />
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Skeleton width="80px" height="h-4" />
          <Skeleton width="60px" height="h-4" />
        </div>
        <Skeleton width="140px" height="h-4" className="mb-3" />
        <Skeleton height="h-2" rounded="full" />
      </div>
    </div>
  );
}

/**
 * Stash widget grid skeleton - shows placeholder cards
 */
export function SkeletonStashGrid({ count = 4 }: { readonly count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStashCard key={i} />
      ))}
    </div>
  );
}

/**
 * Recurring list item skeleton - matches RecurringRow layout
 */
export function SkeletonRecurringRow() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b"
      style={{ borderColor: 'var(--monarch-border)' }}
    >
      <SkeletonCircle size={32} />
      <div className="flex-1 min-w-0">
        <Skeleton width="w-32" height="h-5" className="mb-1" />
        <Skeleton width="w-24" height="h-3" />
      </div>
      <Skeleton width="w-16" height="h-5" />
      <Skeleton width="w-20" height="h-8" rounded="lg" />
      <Skeleton width="w-8" height="h-8" rounded="lg" />
    </div>
  );
}

/**
 * Recurring list skeleton with multiple rows
 */
export function SkeletonRecurringList({ count = 5 }: { readonly count?: number }) {
  return (
    <SkeletonCard className="p-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRecurringRow key={i} />
      ))}
    </SkeletonCard>
  );
}

/**
 * Rollup zone skeleton - matches RollupZone layout
 */
export function SkeletonRollupZone() {
  return (
    <SkeletonCard className="mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SkeletonCircle size={24} />
          <Skeleton width="w-32" height="h-6" />
        </div>
        <Skeleton width="w-24" height="h-8" rounded="lg" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <SkeletonCircle size={20} />
            <Skeleton width="w-24" height="h-4" className="flex-1" />
            <Skeleton width="w-16" height="h-4" />
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

/**
 * Ready to assign sidebar skeleton
 */
export function SkeletonReadyToAssign() {
  return (
    <SkeletonCard>
      <Skeleton width="w-32" height="h-5" className="mb-4" />
      <Skeleton width="w-full" height="h-12" className="mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between">
            <Skeleton width="w-24" height="h-4" />
            <Skeleton width="w-16" height="h-4" />
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

/**
 * Notes category group skeleton
 */
export function SkeletonCategoryGroup() {
  return (
    <SkeletonCard className="mb-3">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton width="w-5" height="h-5" />
        <Skeleton width="w-40" height="h-5" />
      </div>
      <div className="pl-7 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <SkeletonCircle size={16} />
            <Skeleton width="w-28" height="h-4" />
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

/**
 * Notes tab skeleton - category tree with sidebar
 */
export function SkeletonNotesTab() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCategoryGroup key={i} />
        ))}
      </div>
      <div className="hidden lg:block">
        <SkeletonCard>
          <Skeleton width="w-32" height="h-5" className="mb-4" />
          <Skeleton width="w-full" height="h-32" />
        </SkeletonCard>
      </div>
    </div>
  );
}

/**
 * Month selector skeleton
 */
export function SkeletonMonthSelector() {
  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      <Skeleton width="w-8" height="h-8" rounded="lg" />
      <Skeleton width="w-40" height="h-8" rounded="lg" />
      <Skeleton width="w-8" height="h-8" rounded="lg" />
    </div>
  );
}

/**
 * Summary cards skeleton (4 cards in a row)
 */
export function SkeletonSummaryCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i}>
          <div className="flex items-center justify-between mb-8">
            <Skeleton width="w-20" height="h-3.5" />
            {i % 2 === 1 && <Skeleton width="w-12" height="h-3.5" />}
          </div>
          <Skeleton width="w-28" height="h-9" />
        </SkeletonCard>
      ))}
    </div>
  );
}

/**
 * Chart skeleton
 */
export function SkeletonChart({ height = 'h-80' }: { readonly height?: string }) {
  return (
    <SkeletonCard>
      <Skeleton width="w-full" height={height} />
    </SkeletonCard>
  );
}

/**
 * Modal content skeleton
 */
export function SkeletonModalContent({ rows = 4 }: { readonly rows?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonCircle size={24} />
          <div className="flex-1">
            <Skeleton width="w-32" height="h-4" className="mb-1" />
            <Skeleton width="w-24" height="h-3" />
          </div>
          <Skeleton width="w-16" height="h-4" />
        </div>
      ))}
    </div>
  );
}

/**
 * Account list skeleton for CashAccountSelectionModal
 */
export function SkeletonAccountList({ count = 5 }: { readonly count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton width="w-5" height="h-5" rounded="md" className="shrink-0" />
          <Skeleton width="w-40" height="h-4" className="flex-1" />
          <Skeleton width="w-16" height="h-4" />
        </div>
      ))}
    </div>
  );
}

/**
 * App shell skeleton - full page layout with header, sidebar, and content
 * Used during initial app load before dashboard data is available
 */
export function SkeletonAppShell() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
      {/* Header skeleton */}
      <header
        className="h-12 border-b flex items-center justify-between px-4"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          borderColor: 'var(--monarch-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <Skeleton width="w-8" height="h-8" rounded="lg" />
          <Skeleton width="w-24" height="h-5" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton width="w-8" height="h-8" rounded="lg" />
          <Skeleton width="w-8" height="h-8" rounded="lg" />
          <Skeleton width="w-8" height="h-8" rounded="lg" />
        </div>
      </header>

      {/* Body with sidebar and content */}
      <div className="flex">
        {/* Sidebar skeleton */}
        <aside
          className="w-56 min-h-[calc(100vh-48px)] border-r p-4 hidden md:block"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            borderColor: 'var(--monarch-border)',
          }}
        >
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <Skeleton width="w-5" height="h-5" rounded="md" />
                <Skeleton width="w-20" height="h-4" />
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2">
                  <Skeleton width="w-5" height="h-5" rounded="md" />
                  <Skeleton width="w-16" height="h-4" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content skeleton */}
        <main className="flex-1 p-6">
          <SkeletonToolHeader />
          <SkeletonTabs count={3} />
          <div className="mt-6">
            <SkeletonStashGrid count={4} />
          </div>
        </main>
      </div>
    </div>
  );
}
