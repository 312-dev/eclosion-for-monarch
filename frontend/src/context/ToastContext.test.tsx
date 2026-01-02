import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

describe('ToastContext', () => {
  describe('ToastProvider', () => {
    it('provides toast context to children', () => {
      function TestComponent() {
        const toast = useToast();
        return <button onClick={() => toast.success('Test')}>Show Toast</button>;
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('useToast', () => {
    it('throws error when used outside ToastProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useToast());
      }).toThrow('useToast must be used within a ToastProvider');

      consoleSpy.mockRestore();
    });

    it('provides toast methods', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      expect(result.current.success).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.warning).toBeDefined();
      expect(result.current.info).toBeDefined();
    });
  });

  describe('toast.success', () => {
    it('shows success toast message', () => {
      function TestComponent() {
        const toast = useToast();
        return <button onClick={() => toast.success('Success message')}>Show Toast</button>;
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('renders with success type styling', () => {
      function TestComponent() {
        const toast = useToast();
        return <button onClick={() => toast.success('Success')}>Show Toast</button>;
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));

      const toastItem = document.querySelector('.toast-item');
      expect(toastItem).toHaveAttribute('data-type', 'success');
    });
  });

  describe('toast.error', () => {
    it('shows error toast message', () => {
      function TestComponent() {
        const toast = useToast();
        return <button onClick={() => toast.error('Error message')}>Show Toast</button>;
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('renders with error type styling', () => {
      function TestComponent() {
        const toast = useToast();
        return <button onClick={() => toast.error('Error')}>Show Toast</button>;
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));

      const toastItem = document.querySelector('.toast-item');
      expect(toastItem).toHaveAttribute('data-type', 'error');
    });
  });

  describe('toast.warning', () => {
    it('shows warning toast message', () => {
      function TestComponent() {
        const toast = useToast();
        return <button onClick={() => toast.warning('Warning message')}>Show Toast</button>;
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    it('renders with warning type styling', () => {
      function TestComponent() {
        const toast = useToast();
        return <button onClick={() => toast.warning('Warning')}>Show Toast</button>;
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));

      const toastItem = document.querySelector('.toast-item');
      expect(toastItem).toHaveAttribute('data-type', 'warning');
    });
  });

  describe('toast.info', () => {
    it('shows info toast message', () => {
      function TestComponent() {
        const toast = useToast();
        return <button onClick={() => toast.info('Info message')}>Show Toast</button>;
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    it('renders with info type styling', () => {
      function TestComponent() {
        const toast = useToast();
        return <button onClick={() => toast.info('Info')}>Show Toast</button>;
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));

      const toastItem = document.querySelector('.toast-item');
      expect(toastItem).toHaveAttribute('data-type', 'info');
    });
  });

  describe('toast dismissal', () => {
    it('can be manually dismissed via close button', () => {
      function TestComponent() {
        const toast = useToast();
        // Use duration 0 to prevent auto-dismiss
        return <button onClick={() => toast.success('Dismissable', 0)}>Show Toast</button>;
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Show Toast' }));
      expect(screen.getByText('Dismissable')).toBeInTheDocument();

      // Find and click the close button
      const closeBtn = document.querySelector('.toast-close');
      expect(closeBtn).toBeInTheDocument();

      if (closeBtn) {
        fireEvent.click(closeBtn);
        expect(screen.queryByText('Dismissable')).not.toBeInTheDocument();
      }
    });
  });

  describe('multiple toasts', () => {
    it('can show multiple toasts at once', () => {
      function TestComponent() {
        const toast = useToast();
        return (
          <button
            onClick={() => {
              toast.success('First toast');
              toast.error('Second toast');
              toast.info('Third toast');
            }}
          >
            Show Toasts
          </button>
        );
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('First toast')).toBeInTheDocument();
      expect(screen.getByText('Second toast')).toBeInTheDocument();
      expect(screen.getByText('Third toast')).toBeInTheDocument();
    });

    it('assigns unique IDs to each toast', () => {
      function TestComponent() {
        const toast = useToast();
        return (
          <button
            onClick={() => {
              toast.success('Toast 1');
              toast.success('Toast 2');
            }}
          >
            Show Toasts
          </button>
        );
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));

      const toastItems = document.querySelectorAll('.toast-item');
      expect(toastItems.length).toBe(2);
    });
  });

  describe('toast container', () => {
    it('does not render container when there are no toasts', () => {
      render(
        <ToastProvider>
          <div>Content</div>
        </ToastProvider>
      );

      expect(document.querySelector('.toast-container')).not.toBeInTheDocument();
    });

    it('renders container when there are toasts', () => {
      function TestComponent() {
        const toast = useToast();
        return <button onClick={() => toast.success('Toast')}>Show Toast</button>;
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(document.querySelector('.toast-container')).toBeInTheDocument();
    });
  });
});
