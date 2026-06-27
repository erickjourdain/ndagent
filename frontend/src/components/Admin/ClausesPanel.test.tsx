import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClausesPanel from './ClausesPanel';
import { api } from '../../api/client';

// Mock the API client
vi.mock('../../api/client', () => ({
  api: {
    getAdminClauses: vi.fn(),
    createClause: vi.fn(),
    updateClause: vi.fn(),
    deactivateClause: vi.fn(),
    reactivateClause: vi.fn(),
  },
}));

const mockClauses = [
  {
    id: 'DureeConfidentialite',
    name: 'Durée de confidentialité',
    description: 'Doit être de 5 ans.',
    criticality: 'High' as const,
    active: true,
  },
  {
    id: 'LoiApplicable',
    name: 'Loi applicable',
    description: 'Doit être la loi française.',
    criticality: 'Medium' as const,
    active: false,
  }
];

describe('ClausesPanel Component', () => {
  const showToastMock = vi.fn();
  const onSessionExpiredMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getAdminClauses).mockResolvedValue(mockClauses);
  });

  it('renders loading spinner and then lists clauses', async () => {
    render(
      <ClausesPanel
        adminPassword="admin"
        language="fr"
        showToast={showToastMock}
        onSessionExpired={onSessionExpiredMock}
      />
    );

    expect(screen.getByText('Chargement des clauses...')).toBeInTheDocument();

    await waitFor(() => {
      expect(api.getAdminClauses).toHaveBeenCalledWith('admin', 'fr');
      expect(screen.getByText('Durée de confidentialité')).toBeInTheDocument();
      expect(screen.getByText('Loi applicable')).toBeInTheDocument();
    });
  });

  it('triggers session expiry when loading fails', async () => {
    vi.mocked(api.getAdminClauses).mockRejectedValue(new Error('Unauthorized'));

    render(
      <ClausesPanel
        adminPassword="wrong"
        language="fr"
        showToast={showToastMock}
        onSessionExpired={onSessionExpiredMock}
      />
    );

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        'Impossible de charger la liste des clauses. Session expirée ou mot de passe invalide.',
        'error'
      );
      expect(onSessionExpiredMock).toHaveBeenCalledTimes(1);
    });
  });

  it('allows opening the creation modal and submitting a new clause', async () => {
    vi.mocked(api.createClause).mockResolvedValue({
      id: 'RestitutionDonnees',
      name: 'Restitution des données',
      description: '30 jours.',
      criticality: 'Low',
      active: true,
    });

    render(
      <ClausesPanel
        adminPassword="admin"
        language="fr"
        showToast={showToastMock}
        onSessionExpired={onSessionExpiredMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Nouvelle Clause' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nouvelle Clause' }));

    // Modal is open, let's fill the fields
    const nameInput = screen.getByLabelText('Nom de la clause *');
    fireEvent.change(nameInput, { target: { value: 'Restitution des données' } });

    const descInput = screen.getByLabelText('Description / Formulations recommandées *');
    fireEvent.change(descInput, { target: { value: 'Les données doivent être restituées sous 30 jours.' } });

    // Submit form
    fireEvent.submit(screen.getByRole('button', { name: 'Créer' }));

    await waitFor(() => {
      expect(api.createClause).toHaveBeenCalledWith(
        'admin',
        {
          id: 'RestitutionDesDonnees',
          name: 'Restitution des données',
          description: 'Les données doivent être restituées sous 30 jours.',
          criticality: 'Medium',
        },
        'fr'
      );
      expect(showToastMock).toHaveBeenCalledWith('Nouvelle clause créée avec succès !', 'success');
    });
  });

  it('allows opening the edit modal and updating a clause', async () => {
    vi.mocked(api.updateClause).mockResolvedValue({
      message: 'Success',
      oldClause: mockClauses[0],
      newClause: { ...mockClauses[0], name: 'Modified Name' },
    });

    render(
      <ClausesPanel
        adminPassword="admin"
        language="fr"
        showToast={showToastMock}
        onSessionExpired={onSessionExpiredMock}
      />
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Durée de confidentialité')).toBeInTheDocument();
    });

    // Click edit button for Durée de confidentialité
    const editButtons = screen.getAllByRole('button');
    // The edit button has a Tooltip wrapper, let's select by class/icon or filter index
    // Usually the first button is 'Nouvelle Clause', then we have rows.
    // In our list: first row active has EditIcon.
    const editButton = editButtons.find((btn) => btn.querySelector('svg[data-testid="EditIcon"]'));
    expect(editButton).toBeInTheDocument();
    fireEvent.click(editButton!);

    // Dialog is open with prefilled fields
    const nameInput = screen.getByLabelText('Nom de la clause *');
    expect(nameInput).toHaveValue('Durée de confidentialité');

    // Modify name
    fireEvent.change(nameInput, { target: { value: 'Durée de confidentialité modifiée' } });

    // Submit modification
    fireEvent.submit(screen.getByRole('button', { name: 'Appliquer la modification' }));

    await waitFor(() => {
      expect(api.updateClause).toHaveBeenCalledWith(
        'admin',
        'DureeConfidentialite',
        {
          name: 'Durée de confidentialité modifiée',
          description: 'Doit être de 5 ans.',
          criticality: 'High',
        },
        'fr'
      );
      expect(showToastMock).toHaveBeenCalledWith(
        'La clause a été modifiée (l\'ancienne version a été archivée comme inactive et une nouvelle version a été créée).',
        'success'
      );
    });
  });

  it('allows deactivating an active clause', async () => {
    vi.mocked(api.deactivateClause).mockResolvedValue({ ...mockClauses[0], active: false });

    render(
      <ClausesPanel
        adminPassword="admin"
        language="fr"
        showToast={showToastMock}
        onSessionExpired={onSessionExpiredMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Durée de confidentialité')).toBeInTheDocument();
    });

    // Find and click BlockIcon button (deactivate)
    const buttons = screen.getAllByRole('button');
    const deactivateButton = buttons.find((btn) => btn.querySelector('svg[data-testid="BlockIcon"]'));
    expect(deactivateButton).toBeInTheDocument();
    fireEvent.click(deactivateButton!);

    // Confirm dialog is shown
    expect(screen.getByText("Confirmer l'inactivation")).toBeInTheDocument();

    // Click confirm button
    fireEvent.click(screen.getByRole('button', { name: 'Rendre inactive' }));

    await waitFor(() => {
      expect(api.deactivateClause).toHaveBeenCalledWith('admin', 'DureeConfidentialite', 'fr');
      expect(showToastMock).toHaveBeenCalledWith(
        'La clause "Durée de confidentialité" a été rendue inactive.',
        'success'
      );
    });
  });

  it('allows reactivating an inactive clause', async () => {
    vi.mocked(api.reactivateClause).mockResolvedValue({ ...mockClauses[1], active: true });

    render(
      <ClausesPanel
        adminPassword="admin"
        language="fr"
        showToast={showToastMock}
        onSessionExpired={onSessionExpiredMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Loi applicable')).toBeInTheDocument();
    });

    // Find and click CheckCircleIcon button (reactivate) for the second row
    const buttons = screen.getAllByRole('button');
    const reactivateButton = buttons.find((btn) => btn.querySelector('svg[data-testid="CheckCircleIcon"]'));
    expect(reactivateButton).toBeInTheDocument();
    fireEvent.click(reactivateButton!);

    await waitFor(() => {
      expect(api.reactivateClause).toHaveBeenCalledWith('admin', 'LoiApplicable', 'fr');
      expect(showToastMock).toHaveBeenCalledWith(
        'La clause "Loi applicable" a été réactivée avec succès.',
        'success'
      );
    });
  });
});
