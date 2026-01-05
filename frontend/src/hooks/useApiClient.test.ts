/**
 * Tests for useApiClient hook
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useApiClient } from './useApiClient';

// Mock the context and API modules
vi.mock('../context/DemoContext', () => ({
  useDemo: vi.fn(),
}));

vi.mock('../api/client', () => ({
  getDashboard: vi.fn(() => Promise.resolve({ items: [] })),
  getVersion: vi.fn(() => Promise.resolve({ version: '1.0.0' })),
}));

vi.mock('../api/demoClient', () => ({
  getDashboard: vi.fn(() => Promise.resolve({ items: ['demo'] })),
  getVersion: vi.fn(() => Promise.resolve({ version: 'demo' })),
}));

import { useDemo } from '../context/DemoContext';
import * as api from '../api/client';
import * as demoApi from '../api/demoClient';

const mockUseDemo = vi.mocked(useDemo);

describe('useApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns production API client when not in demo mode', () => {
    mockUseDemo.mockReturnValue(false);

    const { result } = renderHook(() => useApiClient());

    expect(result.current).toBe(api);
  });

  it('returns demo API client when in demo mode', () => {
    mockUseDemo.mockReturnValue(true);

    const { result } = renderHook(() => useApiClient());

    expect(result.current).toBe(demoApi);
  });

  it('maintains stable reference when demo mode does not change', () => {
    mockUseDemo.mockReturnValue(false);

    const { result, rerender } = renderHook(() => useApiClient());

    const firstClient = result.current;
    rerender();
    const secondClient = result.current;

    expect(firstClient).toBe(secondClient);
  });

  it('updates client when demo mode changes', () => {
    mockUseDemo.mockReturnValue(false);

    const { result, rerender } = renderHook(() => useApiClient());

    expect(result.current).toBe(api);

    mockUseDemo.mockReturnValue(true);
    rerender();

    expect(result.current).toBe(demoApi);
  });
});
