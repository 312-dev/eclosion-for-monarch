/**
 * Rollup Tip Modal
 *
 * Educational modal explaining the rollup category feature.
 */

interface RollupTipModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function RollupTipModal({ isOpen, onClose }: RollupTipModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-modal-backdrop"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      />
      <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            maxWidth: '340px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div className="font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
            Here's a tip!
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
            Smaller recurring items can be left unchecked here and combined into a shared rollup category in the next step.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors hover-bg-orange-to-orange-hover"
            style={{
              color: 'white',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </>
  );
}
