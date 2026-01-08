import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDropdown } from './useDropdown';

describe('useDropdown', () => {
  beforeEach(() => {
    // Reset the body
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('initial state', () => {
    it('starts closed by default', () => {
      const { result } = renderHook(() => useDropdown());

      expect(result.current.isOpen).toBe(false);
    });

    it('can start open when initialOpen is true', () => {
      const { result } = renderHook(() => useDropdown({ initialOpen: true }));

      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('toggle', () => {
    it('toggles open state', () => {
      const { result } = renderHook(() => useDropdown());

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('open and close', () => {
    it('open() sets isOpen to true', () => {
      const { result } = renderHook(() => useDropdown());

      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('close() sets isOpen to false', () => {
      const { result } = renderHook(() => useDropdown({ initialOpen: true }));

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('setIsOpen', () => {
    it('directly sets the open state', () => {
      const { result } = renderHook(() => useDropdown());

      act(() => {
        result.current.setIsOpen(true);
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.setIsOpen(false);
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('refs', () => {
    it('provides triggerRef and dropdownRef', () => {
      const { result } = renderHook(() => useDropdown());

      expect(result.current.triggerRef).toBeDefined();
      expect(result.current.dropdownRef).toBeDefined();
      expect(result.current.triggerRef.current).toBeNull();
      expect(result.current.dropdownRef.current).toBeNull();
    });
  });

  describe('position', () => {
    it('has default position values', () => {
      const { result } = renderHook(() => useDropdown());

      expect(result.current.position).toHaveProperty('top');
      expect(typeof result.current.position.top).toBe('number');
    });

    it('calculates position based on trigger element', () => {
      const triggerElement = document.createElement('button');
      triggerElement.style.position = 'absolute';
      triggerElement.style.top = '100px';
      triggerElement.style.left = '50px';
      triggerElement.style.width = '100px';
      triggerElement.style.height = '40px';
      document.body.appendChild(triggerElement);

      // Mock getBoundingClientRect
      triggerElement.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        left: 50,
        right: 150,
        bottom: 140,
        width: 100,
        height: 40,
        x: 50,
        y: 100,
        toJSON: () => ({}),
      }));

      const { result } = renderHook(() => useDropdown());

      // Set the trigger ref
      act(() => {
        (result.current.triggerRef as React.MutableRefObject<HTMLButtonElement>).current =
          triggerElement;
      });

      act(() => {
        result.current.open();
      });

      // Position should be below the trigger (bottom + offset)
      expect(result.current.position.top).toBe(144); // 140 + 4 (default offset)
      expect(result.current.position.left).toBe(50);
    });

    it('aligns to right when alignment is right', () => {
      const triggerElement = document.createElement('button');
      document.body.appendChild(triggerElement);

      triggerElement.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        left: 50,
        right: 150,
        bottom: 140,
        width: 100,
        height: 40,
        x: 50,
        y: 100,
        toJSON: () => ({}),
      }));

      const { result } = renderHook(() => useDropdown({ alignment: 'right' }));

      act(() => {
        (result.current.triggerRef as React.MutableRefObject<HTMLButtonElement>).current =
          triggerElement;
      });

      act(() => {
        result.current.open();
      });

      expect(result.current.position.right).toBeDefined();
      expect(result.current.position.left).toBeUndefined();
    });

    it('flips to above when no space below', () => {
      const triggerElement = document.createElement('button');
      document.body.appendChild(triggerElement);

      // Position trigger near bottom of viewport
      triggerElement.getBoundingClientRect = vi.fn(() => ({
        top: 700,
        left: 50,
        right: 150,
        bottom: 740,
        width: 100,
        height: 40,
        x: 50,
        y: 700,
        toJSON: () => ({}),
      }));

      // Mock window dimensions
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });

      const { result } = renderHook(() => useDropdown());

      act(() => {
        (result.current.triggerRef as React.MutableRefObject<HTMLButtonElement>).current =
          triggerElement;
      });

      act(() => {
        result.current.open();
      });

      // Should flip to above - bottom property should be set instead of top
      expect(result.current.position.bottom).toBeDefined();
      expect(result.current.position.top).toBeUndefined();
    });
  });

  describe('click outside', () => {
    it('closes dropdown when clicking outside', () => {
      const triggerElement = document.createElement('button');
      const dropdownElement = document.createElement('div');
      const outsideElement = document.createElement('div');

      document.body.appendChild(triggerElement);
      document.body.appendChild(dropdownElement);
      document.body.appendChild(outsideElement);

      const { result } = renderHook(() => useDropdown({ initialOpen: true }));

      // Set refs
      act(() => {
        (result.current.triggerRef as React.MutableRefObject<HTMLButtonElement>).current =
          triggerElement;
        (result.current.dropdownRef as React.MutableRefObject<HTMLDivElement>).current =
          dropdownElement;
      });

      expect(result.current.isOpen).toBe(true);

      // Click outside
      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        outsideElement.dispatchEvent(event);
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('does not close when clicking on trigger', () => {
      const triggerElement = document.createElement('button');
      const dropdownElement = document.createElement('div');

      document.body.appendChild(triggerElement);
      document.body.appendChild(dropdownElement);

      const { result } = renderHook(() => useDropdown({ initialOpen: true }));

      act(() => {
        (result.current.triggerRef as React.MutableRefObject<HTMLButtonElement>).current =
          triggerElement;
        (result.current.dropdownRef as React.MutableRefObject<HTMLDivElement>).current =
          dropdownElement;
      });

      // Click on trigger
      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        triggerElement.dispatchEvent(event);
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('does not close when clicking on dropdown', () => {
      const triggerElement = document.createElement('button');
      const dropdownElement = document.createElement('div');

      document.body.appendChild(triggerElement);
      document.body.appendChild(dropdownElement);

      const { result } = renderHook(() => useDropdown({ initialOpen: true }));

      act(() => {
        (result.current.triggerRef as React.MutableRefObject<HTMLButtonElement>).current =
          triggerElement;
        (result.current.dropdownRef as React.MutableRefObject<HTMLDivElement>).current =
          dropdownElement;
      });

      // Click on dropdown
      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        dropdownElement.dispatchEvent(event);
      });

      expect(result.current.isOpen).toBe(true);
    });
  });
});
