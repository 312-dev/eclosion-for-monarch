import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/test-utils';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  describe('rendering', () => {
    it('renders children', () => {
      render(
        <Tooltip content="Tooltip text">
          <button>Hover me</button>
        </Tooltip>
      );

      expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
    });

    it('renders just children when disabled', () => {
      render(
        <Tooltip content="Tooltip text" disabled>
          <button>Hover me</button>
        </Tooltip>
      );

      expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
    });

    it('renders just children when content is empty', () => {
      render(
        <Tooltip content="">
          <button>Hover me</button>
        </Tooltip>
      );

      expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
    });

    it('renders just children when content is null', () => {
      render(
        <Tooltip content={null as unknown as string}>
          <button>Hover me</button>
        </Tooltip>
      );

      expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
    });
  });

  describe('props', () => {
    it('accepts side prop', () => {
      // Just verify it renders without error with different side values
      const { rerender } = render(
        <Tooltip content="Tooltip" side="top">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(
        <Tooltip content="Tooltip" side="bottom">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(
        <Tooltip content="Tooltip" side="left">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(
        <Tooltip content="Tooltip" side="right">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('accepts align prop', () => {
      const { rerender } = render(
        <Tooltip content="Tooltip" align="start">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(
        <Tooltip content="Tooltip" align="center">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(
        <Tooltip content="Tooltip" align="end">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('accepts delayDuration prop', () => {
      render(
        <Tooltip content="Tooltip" delayDuration={500}>
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('content types', () => {
    it('accepts string content', () => {
      render(
        <Tooltip content="Simple text">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('accepts ReactNode content', () => {
      render(
        <Tooltip content={<span>Rich content</span>}>
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
