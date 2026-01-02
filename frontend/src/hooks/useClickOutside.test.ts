import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useClickOutside } from './useClickOutside';

describe('useClickOutside', () => {
  it('calls callback when clicking outside the element', () => {
    const callback = vi.fn();

    // Create a container and target element
    const container = document.createElement('div');
    const targetElement = document.createElement('div');
    container.appendChild(targetElement);
    document.body.appendChild(container);

    // Render the hook with a ref to the target element
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(targetElement);
      useClickOutside([ref], callback);
      return ref;
    });

    expect(result.current.current).toBe(targetElement);

    // Click outside the element
    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);

    const mouseEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    outsideElement.dispatchEvent(mouseEvent);

    expect(callback).toHaveBeenCalledTimes(1);

    // Cleanup
    document.body.removeChild(container);
    document.body.removeChild(outsideElement);
  });

  it('does not call callback when clicking inside the element', () => {
    const callback = vi.fn();

    const targetElement = document.createElement('div');
    document.body.appendChild(targetElement);

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(targetElement);
      useClickOutside([ref], callback);
      return ref;
    });

    // Click inside the element
    const mouseEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    targetElement.dispatchEvent(mouseEvent);

    expect(callback).not.toHaveBeenCalled();

    // Cleanup
    document.body.removeChild(targetElement);
  });

  it('does not call callback when disabled', () => {
    const callback = vi.fn();

    const targetElement = document.createElement('div');
    document.body.appendChild(targetElement);

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(targetElement);
      useClickOutside([ref], callback, false);
      return ref;
    });

    // Click outside
    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);

    const mouseEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    outsideElement.dispatchEvent(mouseEvent);

    expect(callback).not.toHaveBeenCalled();

    // Cleanup
    document.body.removeChild(targetElement);
    document.body.removeChild(outsideElement);
  });

  it('handles multiple refs correctly', () => {
    const callback = vi.fn();

    const element1 = document.createElement('div');
    const element2 = document.createElement('div');
    const outsideElement = document.createElement('div');
    document.body.appendChild(element1);
    document.body.appendChild(element2);
    document.body.appendChild(outsideElement);

    renderHook(() => {
      const ref1 = useRef<HTMLDivElement>(element1);
      const ref2 = useRef<HTMLDivElement>(element2);
      useClickOutside([ref1, ref2], callback);
      return { ref1, ref2 };
    });

    // Click on element1 - should not trigger
    element1.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(callback).not.toHaveBeenCalled();

    // Click on element2 - should not trigger
    element2.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(callback).not.toHaveBeenCalled();

    // Click outside both - should trigger
    outsideElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(callback).toHaveBeenCalledTimes(1);

    // Cleanup
    document.body.removeChild(element1);
    document.body.removeChild(element2);
    document.body.removeChild(outsideElement);
  });
});
