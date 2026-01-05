/**
 * AppShell Tour Configuration
 *
 * Tour steps and styling for the main app tutorial.
 */

// Tour steps for the main app
export const APP_TOUR_STEPS = [
  {
    selector: '[data-tour="rollup-zone"]',
    content: () => (
      <div>
        <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--monarch-text-dark)' }}>
          Rollup Zone
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)' }}>
          Your combined recurring expenses. Items here share a single category in Monarch for simplified budgeting.
        </p>
      </div>
    ),
    position: 'bottom' as const,
  },
  {
    selector: '[data-tour="recurring-list"]',
    content: () => (
      <div>
        <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--monarch-text-dark)' }}>
          Individual Items
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)' }}>
          Recurring expenses tracked individually. Each has its own category in Monarch.
        </p>
      </div>
    ),
    position: 'top' as const,
  },
];

// Tour styling to match app theme
export const appTourStyles = {
  popover: (base: object) => ({
    ...base,
    backgroundColor: 'var(--monarch-bg-card)',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
    border: '1px solid var(--monarch-border)',
    padding: '16px',
    maxWidth: '300px',
  }),
  maskArea: (base: object) => ({
    ...base,
    rx: 8,
  }),
  badge: (base: object) => ({
    ...base,
    backgroundColor: 'var(--monarch-orange)',
  }),
  controls: (base: object) => ({
    ...base,
    marginTop: '12px',
  }),
  close: (base: object) => ({
    ...base,
    color: 'var(--monarch-text-muted)',
    width: '12px',
    height: '12px',
    top: '12px',
    right: '12px',
  }),
};
