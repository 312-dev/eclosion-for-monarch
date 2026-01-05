/**
 * Tour Steps
 *
 * Tour step definitions for the setup wizard guided experience.
 */

export const SETUP_TOUR_STEPS = [
  {
    selector: '[data-tour="link-icon"]',
    content: () => (
      <div>
        <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--monarch-text-dark)' }}>
          Link to Existing Category
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', marginBottom: '12px' }}>
          Already have a category in Monarch for this expense? Click this icon to link to it instead of creating a new one.
        </p>
        <p style={{ fontSize: '13px', color: 'var(--monarch-text-muted)', fontStyle: 'italic' }}>
          This helps keep your existing budget organization intact.
        </p>
      </div>
    ),
    position: 'left' as const,
  },
];
