import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminLogin from './AdminLogin';
import { api } from '../../api/client';

// Mock the API client
vi.mock('../../api/client', () => ({
  api: {
    verifyAdminPassword: vi.fn(),
  },
}));

describe('AdminLogin Component', () => {
  const onBackMock = vi.fn();
  const onLoginSuccessMock = vi.fn();
  const showToastMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login card details correctly', () => {
    render(
      <AdminLogin
        onBack={onBackMock}
        onLoginSuccess={onLoginSuccessMock}
        showToast={showToastMock}
      />
    );

    expect(screen.getByText('Accès Administration')).toBeInTheDocument();
    expect(screen.getByText(/Veuillez saisir le mot de passe administrateur/)).toBeInTheDocument();
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retour' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
  });

  it('triggers onBack when clicking back button', () => {
    render(
      <AdminLogin
        onBack={onBackMock}
        onLoginSuccess={onLoginSuccessMock}
        showToast={showToastMock}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it('successfully logs in with correct password', async () => {
    // Mock API to return true for correct password
    vi.mocked(api.verifyAdminPassword).mockResolvedValue(true);

    render(
      <AdminLogin
        onBack={onBackMock}
        onLoginSuccess={onLoginSuccessMock}
        showToast={showToastMock}
      />
    );

    const input = screen.getByLabelText('Mot de passe');
    fireEvent.change(input, { target: { value: 'correct_password' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Se connecter' }));

    expect(screen.getByText('Vérification...')).toBeInTheDocument();

    await waitFor(() => {
      expect(api.verifyAdminPassword).toHaveBeenCalledWith('correct_password');
      expect(onLoginSuccessMock).toHaveBeenCalledWith('correct_password');
      expect(showToastMock).toHaveBeenCalledWith('Connexion administrateur réussie.', 'success');
    });
  });

  it('shows error toast for incorrect password', async () => {
    // Mock API to return false for incorrect password
    vi.mocked(api.verifyAdminPassword).mockResolvedValue(false);

    render(
      <AdminLogin
        onBack={onBackMock}
        onLoginSuccess={onLoginSuccessMock}
        showToast={showToastMock}
      />
    );

    const input = screen.getByLabelText('Mot de passe');
    fireEvent.change(input, { target: { value: 'wrong_password' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => {
      expect(api.verifyAdminPassword).toHaveBeenCalledWith('wrong_password');
      expect(onLoginSuccessMock).not.toHaveBeenCalled();
      expect(showToastMock).toHaveBeenCalledWith('Mot de passe incorrect.', 'error');
    });
  });

  it('shows generic error toast if API call fails', async () => {
    // Mock API to throw an error
    vi.mocked(api.verifyAdminPassword).mockRejectedValue(new Error('Network error'));

    render(
      <AdminLogin
        onBack={onBackMock}
        onLoginSuccess={onLoginSuccessMock}
        showToast={showToastMock}
      />
    );

    const input = screen.getByLabelText('Mot de passe');
    fireEvent.change(input, { target: { value: 'password' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => {
      expect(onLoginSuccessMock).not.toHaveBeenCalled();
      expect(showToastMock).toHaveBeenCalledWith('Une erreur est survenue lors de la connexion.', 'error');
    });
  });
});
