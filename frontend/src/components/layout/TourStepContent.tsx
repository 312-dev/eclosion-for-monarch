/**
 * TourStepContent - Reusable content component for tour steps
 *
 * Renders tour step title and description with consistent styling.
 */

interface TourStepContentProps {
  /** Step title displayed in bold */
  readonly title: string;
  /** Step description (can include JSX) */
  readonly children: React.ReactNode;
}

export function TourStepContent({ title, children }: TourStepContentProps) {
  return (
    <div>
      <div
        style={{
          fontWeight: 600,
          marginBottom: '8px',
          color: 'var(--monarch-text-dark)',
        }}
      >
        {title}
      </div>
      <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>{children}</p>
    </div>
  );
}
