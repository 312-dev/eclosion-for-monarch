import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/test-utils';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  describe('rendering', () => {
    it('renders with correct label for on_track status', () => {
      render(<StatusBadge status="on_track" />);
      expect(screen.getByText('On Track')).toBeInTheDocument();
    });

    it('renders with correct label for funded status', () => {
      render(<StatusBadge status="funded" />);
      expect(screen.getByText('Funded')).toBeInTheDocument();
    });

    it('renders with correct label for behind status', () => {
      render(<StatusBadge status="behind" />);
      expect(screen.getByText('Behind')).toBeInTheDocument();
    });

    it('renders with correct label for ahead status', () => {
      render(<StatusBadge status="ahead" />);
      expect(screen.getByText('Ahead')).toBeInTheDocument();
    });

    it('renders with correct label for critical status', () => {
      render(<StatusBadge status="critical" />);
      expect(screen.getByText('Off Track')).toBeInTheDocument();
    });

    it('renders with correct label for due_now status', () => {
      render(<StatusBadge status="due_now" />);
      expect(screen.getByText('Due Now')).toBeInTheDocument();
    });

    it('renders with correct label for inactive status', () => {
      render(<StatusBadge status="inactive" />);
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('renders with correct label for disabled status', () => {
      render(<StatusBadge status="disabled" />);
      expect(screen.getByText('Untracked')).toBeInTheDocument();
    });
  });

  describe('isEnabled prop', () => {
    it('shows Untracked when isEnabled is false', () => {
      render(<StatusBadge status="on_track" isEnabled={false} />);
      expect(screen.getByText('Untracked')).toBeInTheDocument();
    });

    it('shows normal status when isEnabled is true', () => {
      render(<StatusBadge status="on_track" isEnabled={true} />);
      expect(screen.getByText('On Track')).toBeInTheDocument();
    });
  });

  describe('onClick prop', () => {
    it('calls onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<StatusBadge status="on_track" onClick={handleClick} />);

      fireEvent.click(screen.getByText('On Track'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('has button role when onClick is provided', () => {
      const handleClick = vi.fn();
      render(<StatusBadge status="on_track" onClick={handleClick} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('does not have button role when onClick is not provided', () => {
      render(<StatusBadge status="on_track" />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('responds to Enter key when onClick is provided', () => {
      const handleClick = vi.fn();
      render(<StatusBadge status="on_track" onClick={handleClick} />);

      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('size prop', () => {
    it('applies small size classes by default', () => {
      render(<StatusBadge status="on_track" />);
      const badge = screen.getByText('On Track');

      expect(badge.className).toContain('text-xs');
      expect(badge.className).toContain('px-2');
    });

    it('applies medium size classes when size is md', () => {
      render(<StatusBadge status="on_track" size="md" />);
      const badge = screen.getByText('On Track');

      expect(badge.className).toContain('text-sm');
      expect(badge.className).toContain('px-3');
    });
  });

  describe('interactive prop', () => {
    it('applies hover styles when interactive is true', () => {
      render(<StatusBadge status="on_track" interactive />);
      const badge = screen.getByText('On Track');

      expect(badge.className).toContain('cursor-pointer');
      expect(badge.className).toContain('hover:opacity-80');
    });

    it('applies hover styles when onClick is provided', () => {
      render(<StatusBadge status="on_track" onClick={() => {}} />);
      const badge = screen.getByText('On Track');

      expect(badge.className).toContain('cursor-pointer');
    });
  });

  describe('className prop', () => {
    it('applies custom className', () => {
      render(<StatusBadge status="on_track" className="my-custom-class" />);
      const badge = screen.getByText('On Track');

      expect(badge.className).toContain('my-custom-class');
    });
  });

  describe('styling', () => {
    it('applies inline styles for background and text color', () => {
      render(<StatusBadge status="on_track" />);
      const badge = screen.getByText('On Track');

      expect(badge).toHaveStyle({ backgroundColor: 'var(--monarch-success-bg)' });
      expect(badge).toHaveStyle({ color: 'var(--monarch-success)' });
    });

    it('has rounded-full class for pill shape', () => {
      render(<StatusBadge status="on_track" />);
      const badge = screen.getByText('On Track');

      expect(badge.className).toContain('rounded-full');
    });
  });
});
