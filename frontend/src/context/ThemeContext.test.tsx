import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

describe('ThemeContext', () => {
  beforeEach(() => {
    // Reset document classes
    document.documentElement.classList.remove('light', 'dark');
    delete document.documentElement.dataset['theme'];
  });

  afterEach(() => {
    document.documentElement.classList.remove('light', 'dark');
    delete document.documentElement.dataset['theme'];
  });

  describe('ThemeProvider', () => {
    it('provides theme context to children', () => {
      function TestComponent() {
        const { theme } = useTheme();
        return <div data-testid="theme">{theme}</div>;
      }

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toBeInTheDocument();
    });

    it('defaults to system theme', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe('system');
    });

    it('resolves system theme based on matchMedia', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // matchMedia is mocked to return false (light mode) in setup.ts
      expect(result.current.resolvedTheme).toBe('light');
    });

    it('applies theme class to document', () => {
      renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(
        document.documentElement.classList.contains('light') ||
          document.documentElement.classList.contains('dark')
      ).toBe(true);
    });

    it('sets data-theme attribute on document', () => {
      renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(document.documentElement.dataset['theme']).toBeDefined();
    });
  });

  describe('useTheme', () => {
    it('throws error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('setTheme', () => {
    it('updates theme to light', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.resolvedTheme).toBe('light');
    });

    it('updates theme to dark', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('updates theme to system', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('dark');
      });

      act(() => {
        result.current.setTheme('system');
      });

      expect(result.current.theme).toBe('system');
    });

    it('persists theme preference to localStorage', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('eclosion-theme-preference', 'dark');
    });

    it('updates document classes when theme changes', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);

      act(() => {
        result.current.setTheme('light');
      });

      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('restores theme from localStorage', () => {
      // Set up the mock to return 'dark' for the theme key
      vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
        if (key === 'eclosion-theme-preference') return 'dark';
        return null;
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe('dark');
    });

    it('handles invalid localStorage values', () => {
      // Set up the mock to return invalid value
      vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
        if (key === 'eclosion-theme-preference') return 'invalid';
        return null;
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe('system');
    });
  });

  describe('component integration', () => {
    it('allows changing theme via button click', () => {
      function ThemeToggle() {
        const { theme, setTheme } = useTheme();
        return (
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            Current: {theme}
          </button>
        );
      }

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Current: system');

      fireEvent.click(button);
      expect(button).toHaveTextContent('Current: light');

      fireEvent.click(button);
      expect(button).toHaveTextContent('Current: dark');
    });
  });
});
