import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';

// Mock the components and hooks used by UnlockPage
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    authenticated: false,
    needsUnlock: true,
    lockReason: null,
  })),
}));

vi.mock('../hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks')>();
  return {
    ...actual,
    usePageTitle: vi.fn(),
  };
});

vi.mock('../components/passphrase', () => ({
  PassphrasePrompt: ({ mode, onSuccess, onResetApp }: {
    mode: string;
    onSuccess: () => void;
    onResetApp: () => void;
  }) => (
    <div data-testid="passphrase-prompt">
      <span data-testid="mode">{mode}</span>
      <button data-testid="unlock-btn" onClick={onSuccess}>
        Unlock
      </button>
      <button data-testid="reset-btn" onClick={onResetApp}>
        Reset
      </button>
    </div>
  ),
}));

vi.mock('../components/CredentialUpdateForm', () => ({
  CredentialUpdateForm: ({ onSuccess, onCancel }: {
    onSuccess: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="credential-update-form">
      <button data-testid="update-success-btn" onClick={onSuccess}>
        Update Success
      </button>
      <button data-testid="update-cancel-btn" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

vi.mock('../components/ResetAppModal', () => ({
  ResetAppModal: ({ isOpen, onClose, onReset }: {
    isOpen: boolean;
    onClose: () => void;
    onReset: () => void;
  }) =>
    isOpen ? (
      <div data-testid="reset-modal">
        <button data-testid="close-modal-btn" onClick={onClose}>
          Close
        </button>
        <button data-testid="confirm-reset-btn" onClick={onReset}>
          Confirm Reset
        </button>
      </div>
    ) : null,
}));

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: { from: { pathname: '/dashboard' } } }),
  };
});

import { UnlockPage } from './UnlockPage';
import { useAuth } from '../context/AuthContext';

describe('UnlockPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      authenticated: false,
      needsUnlock: true,
      lockReason: null,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      lock: vi.fn(),
      checkAuth: vi.fn(),
      setAuthenticated: vi.fn(),
    });
  });

  describe('rendering', () => {
    it('renders passphrase prompt by default', () => {
      render(<UnlockPage />);

      expect(screen.getByTestId('passphrase-prompt')).toBeInTheDocument();
      expect(screen.getByTestId('mode')).toHaveTextContent('unlock');
    });

    it('does not render reset modal by default', () => {
      render(<UnlockPage />);

      expect(screen.queryByTestId('reset-modal')).not.toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('redirects to destination when already authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        authenticated: true,
        needsUnlock: false,
        lockReason: null,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        lock: vi.fn(),
        checkAuth: vi.fn(),
        setAuthenticated: vi.fn(),
      });

      render(<UnlockPage />);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });

    it('redirects to login when not authenticated and no stored credentials', () => {
      vi.mocked(useAuth).mockReturnValue({
        authenticated: false,
        needsUnlock: false,
        lockReason: null,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        lock: vi.fn(),
        checkAuth: vi.fn(),
        setAuthenticated: vi.fn(),
      });

      render(<UnlockPage />);

      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  describe('reset modal', () => {
    it('shows reset modal when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<UnlockPage />);

      await user.click(screen.getByTestId('reset-btn'));

      expect(screen.getByTestId('reset-modal')).toBeInTheDocument();
    });

    it('hides reset modal when close is clicked', async () => {
      const user = userEvent.setup();
      render(<UnlockPage />);

      await user.click(screen.getByTestId('reset-btn'));
      expect(screen.getByTestId('reset-modal')).toBeInTheDocument();

      await user.click(screen.getByTestId('close-modal-btn'));
      expect(screen.queryByTestId('reset-modal')).not.toBeInTheDocument();
    });

    it('navigates to login after reset is confirmed', async () => {
      const user = userEvent.setup();
      render(<UnlockPage />);

      await user.click(screen.getByTestId('reset-btn'));
      await user.click(screen.getByTestId('confirm-reset-btn'));

      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  describe('unlock flow', () => {
    it('navigates to destination on successful unlock', async () => {
      const user = userEvent.setup();
      render(<UnlockPage />);

      await user.click(screen.getByTestId('unlock-btn'));

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});
