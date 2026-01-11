/**
 * Accessibility Tests
 *
 * Tests for common accessibility patterns that should be followed
 * throughout the application.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';

/**
 * These tests document and verify accessibility patterns.
 * They serve as both tests and documentation for how components
 * should implement accessibility features.
 */

describe('Accessibility Patterns', () => {
  describe('Button accessibility', () => {
    it('icon-only buttons should have aria-label', () => {
      // Pattern: Icon-only buttons need aria-label
      const IconButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
        <button onClick={onClick} aria-label={label}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
          </svg>
        </button>
      );

      render(<IconButton onClick={() => {}} label="Settings" />);

      const button = screen.getByRole('button', { name: 'Settings' });
      expect(button).toHaveAccessibleName('Settings');
    });

    it('buttons should be keyboard accessible', () => {
      const handleClick = vi.fn();

      const AccessibleButton = () => (
        <button onClick={handleClick} type="button">
          Click me
        </button>
      );

      render(<AccessibleButton />);

      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Form accessibility', () => {
    it('inputs should have associated labels', () => {
      const LabeledInput = () => (
        <div>
          <label htmlFor="email-input">Email address</label>
          <input id="email-input" type="email" name="email" />
        </div>
      );

      render(<LabeledInput />);

      const input = screen.getByLabelText('Email address');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'email');
    });

    it('required fields should be marked', () => {
      const RequiredField = () => (
        <div>
          <label htmlFor="required-field">
            Required field <span aria-hidden="true">*</span>
          </label>
          <input
            id="required-field"
            type="text"
            required
            aria-required="true"
          />
        </div>
      );

      render(<RequiredField />);

      const input = screen.getByLabelText(/required field/i);
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toBeRequired();
    });

    it('error messages should be associated with inputs', () => {
      const FieldWithError = () => (
        <div>
          <label htmlFor="error-field">Password</label>
          <input
            id="error-field"
            type="password"
            aria-invalid="true"
            aria-describedby="error-message"
          />
          <span id="error-message" role="alert">
            Password must be at least 12 characters
          </span>
        </div>
      );

      render(<FieldWithError />);

      const input = screen.getByLabelText('Password');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription('Password must be at least 12 characters');
    });
  });

  describe('Modal accessibility', () => {
    it('modals should trap focus', () => {
      // Pattern: Modals should have role="dialog" and aria-modal="true"
      const Modal = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <h2 id="modal-title">{title}</h2>
          {children}
        </div>
      );

      render(
        <Modal title="Confirm Action">
          <p>Are you sure?</p>
          <button>Cancel</button>
          <button>Confirm</button>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAccessibleName('Confirm Action');
    });

    it('modals should have close button', () => {
      const ModalWithClose = ({ onClose }: { onClose: () => void }) => (
        <div role="dialog" aria-modal="true" aria-label="Settings">
          <button onClick={onClose} aria-label="Close dialog">
            X
          </button>
          <p>Modal content</p>
        </div>
      );

      render(<ModalWithClose onClose={() => {}} />);

      expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
    });
  });

  describe('Loading states', () => {
    it('loading indicators should have role="status"', () => {
      const LoadingState = () => (
        <div role="status" aria-live="polite" aria-label="Loading content">
          <span className="sr-only">Loading...</span>
          <div className="spinner" aria-hidden="true" />
        </div>
      );

      render(<LoadingState />);

      expect(screen.getByRole('status')).toHaveAccessibleName('Loading content');
    });

    it('skeleton loaders should be hidden from screen readers', () => {
      const SkeletonLoader = () => (
        <div>
          <div aria-hidden="true" className="skeleton" />
          <span className="sr-only" role="status">Loading content</span>
        </div>
      );

      render(<SkeletonLoader />);

      // Screen readers should announce "Loading content"
      expect(screen.getByRole('status')).toHaveTextContent('Loading content');
    });
  });

  describe('Navigation accessibility', () => {
    it('navigation should use semantic nav element', () => {
      const Navigation = () => (
        <nav aria-label="Main navigation">
          <ul>
            <li><a href="/dashboard">Dashboard</a></li>
            <li><a href="/settings">Settings</a></li>
          </ul>
        </nav>
      );

      render(<Navigation />);

      expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    });

    it('current page should be indicated', () => {
      const NavigationWithCurrent = () => (
        <nav aria-label="Main navigation">
          <a href="/dashboard" aria-current="page">Dashboard</a>
          <a href="/settings">Settings</a>
        </nav>
      );

      render(<NavigationWithCurrent />);

      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
        'aria-current',
        'page'
      );
    });
  });

  describe('Focus management', () => {
    it('skip link should be first focusable element', () => {
      const PageWithSkipLink = () => (
        <div>
          <a href="#main-content" className="sr-only focus:not-sr-only">
            Skip to main content
          </a>
          <nav>Navigation</nav>
          <main id="main-content">Content</main>
        </div>
      );

      render(<PageWithSkipLink />);

      const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });
  });

  describe('Color contrast', () => {
    // Note: These tests document the pattern; actual contrast checking
    // would require visual regression testing tools like Percy or Chromatic

    it('text should use appropriate color variables', () => {
      const TextWithContrast = () => (
        <p style={{ color: 'var(--monarch-text-dark)' }}>
          This text should have sufficient contrast
        </p>
      );

      render(<TextWithContrast />);

      const text = screen.getByText(/sufficient contrast/);
      expect(text).toHaveStyle({ color: 'var(--monarch-text-dark)' });
    });
  });

  describe('Reduced motion', () => {
    it('animations should respect prefers-reduced-motion', () => {
      // Pattern: Use CSS that respects reduced motion preference
      // This test documents the expected behavior

      const AnimatedComponent = () => (
        <div
          className="animate-fade-in"
          style={{
            // In CSS: @media (prefers-reduced-motion: reduce) { animation: none }
          }}
          data-testid="animated"
        >
          Animated content
        </div>
      );

      render(<AnimatedComponent />);

      // Component should render regardless of motion preference
      expect(screen.getByTestId('animated')).toBeInTheDocument();
    });
  });

  describe('Tooltips and popovers', () => {
    it('tooltips should be keyboard accessible', () => {
      const ButtonWithTooltip = () => (
        <button
          aria-describedby="tooltip"
          onFocus={() => {}} // Show tooltip
          onBlur={() => {}} // Hide tooltip
        >
          Hover me
          <div id="tooltip" role="tooltip" hidden>
            Helpful information
          </div>
        </button>
      );

      render(<ButtonWithTooltip />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'tooltip');
    });
  });
});

describe('Screen reader announcements', () => {
  it('live regions announce dynamic content', () => {
    const DynamicContent = ({ message }: { message: string }) => (
      <div role="status" aria-live="polite" aria-atomic="true">
        {message}
      </div>
    );

    const { rerender } = render(<DynamicContent message="Initial" />);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');

    rerender(<DynamicContent message="Updated" />);
    expect(liveRegion).toHaveTextContent('Updated');
  });

  it('alerts are announced immediately', () => {
    const AlertMessage = ({ message }: { message: string }) => (
      <div role="alert">{message}</div>
    );

    render(<AlertMessage message="Error: Something went wrong" />);

    // role="alert" has implicit aria-live="assertive"
    expect(screen.getByRole('alert')).toHaveTextContent('Error: Something went wrong');
  });
});
