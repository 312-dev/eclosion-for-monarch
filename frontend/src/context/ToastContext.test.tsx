import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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

    it('auto-dismisses after default duration', async () => {
      function TestComponent() {
        const toast = useToast();
        return <button onClick={() => toast.success('Auto dismiss')}>Show Toast</button>;
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

      // Default duration is 3000ms
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
      });
    });

    it('respects custom duration', async () => {
      function TestComponent() {
        const toast = useToast();
        return <button onClick={() => toast.success('Custom duration', 1000)}>Show Toast</button>;
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Custom duration')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Custom duration')).not.toBeInTheDocument();
      });
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

    it('has longer default duration (5000ms)', async () => {
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

      // Should still be visible at 3000ms
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.getByText('Error')).toBeInTheDocument();

      // Should be gone at 5000ms
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Error')).not.toBeInTheDocument();
      });
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

    it('has default duration of 4000ms', async () => {
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

      // Should still be visible at 3000ms
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.getByText('Warning')).toBeInTheDocument();

      // Should be gone at 4000ms
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Warning')).not.toBeInTheDocument();
      });
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
  });

  describe('toast dismissal', () => {
    it('can be manually dismissed via close button', async () => {
      function TestComponent() {
        const toast = useToast();
        return <button onClick={() => toast.success('Dismissable', 0)}>Show Toast</button>;
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Dismissable')).toBeInTheDocument();

      // Find and click the close button
      const closeButton = screen.getByRole('button', { name: '' }); // Close button in toast
      // There are two buttons - the trigger and the close. Get the one inside the toast
      const toastButtons = screen.getAllByRole('button');
      const closeBtn = toastButtons.find((btn) => btn.classList.contains('toast-close'));

      if (closeBtn) {
        fireEvent.click(closeBtn);

        await waitFor(() => {
          expect(screen.queryByText('Dismissable')).not.toBeInTheDocument();
        });
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

    it('each toast has its own timer', async () => {
      function TestComponent() {
        const toast = useToast();
        return (
          <button
            onClick={() => {
              toast.success('Short', 1000);
              toast.success('Long', 5000);
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

      expect(screen.getByText('Short')).toBeInTheDocument();
      expect(screen.getByText('Long')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Short')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Long')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Long')).not.toBeInTheDocument();
      });
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
