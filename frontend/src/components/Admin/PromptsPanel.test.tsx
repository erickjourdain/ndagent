import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PromptsPanel from './PromptsPanel';
import { api } from '../../api/client';

// Mock the API client
vi.mock('../../api/client', () => ({
  api: {
    getAdminPrompts: vi.fn(),
    updateAdminPrompt: vi.fn(),
    activateAdminPrompt: vi.fn(),
  },
}));

const mockPromptsData = {
  prompts: [
    {
      id: 1,
      language: 'fr' as const,
      version: 2,
      content: 'System prompt containing {{referenceNdaText}} and {{clausierJson}} text.',
      created_at: '2026-06-27T08:00:00Z',
      is_current: 1,
      description: 'Active prompt with custom rules',
    },
    {
      id: 2,
      language: 'fr' as const,
      version: 1,
      content: 'Older prompt version {{referenceNdaText}} {{clausierJson}}',
      created_at: '2026-06-26T08:00:00Z',
      is_current: 0,
      description: 'First version of system prompt',
    }
  ],
  total: 2,
  page: 1,
  pages: 1,
  limit: 5,
};

describe('PromptsPanel Component', () => {
  const showToastMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getAdminPrompts).mockResolvedValue(mockPromptsData);
  });

  it('renders prompts history and loads the current active version into the editor', async () => {
    render(<PromptsPanel adminPassword="admin" language="fr" showToast={showToastMock} />);

    expect(screen.getByText('Historique des versions')).toBeInTheDocument();

    await waitFor(() => {
      expect(api.getAdminPrompts).toHaveBeenCalledWith('admin', 'fr', 1, 5);

      // Editor title
      expect(screen.getByText('Éditeur de Prompt (Français)')).toBeInTheDocument();
      expect(screen.getByText('Version chargée : Version 2')).toBeInTheDocument();

      // Check textarea content
      const textarea = screen.getByPlaceholderText("Saisissez le prompt système ici...") as HTMLTextAreaElement;
      expect(textarea.value).toContain('System prompt containing {{referenceNdaText}}');

      // Check version history items
      expect(screen.getByText('Version 2')).toBeInTheDocument();
      expect(screen.getByText('Version 1')).toBeInTheDocument();
      expect(screen.getAllByText('Active prompt with custom rules').length).toBe(2);
      expect(screen.getByText('First version of system prompt')).toBeInTheDocument();
    });
  });

  it('validates missing template tags in editor text', async () => {
    render(<PromptsPanel adminPassword="admin" language="fr" showToast={showToastMock} />);

    await waitFor(() => {
      expect(screen.getByText('Version chargée : Version 2')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText("Saisissez le prompt système ici...") as HTMLTextAreaElement;

    // Remove tags
    fireEvent.change(textarea, { target: { value: 'Text without required tags.' } });

    expect(screen.getByText('Balises manquantes')).toBeInTheDocument();
    expect(screen.getByText(/La balise d'intégration du NDA de référence/)).toBeInTheDocument();
    expect(screen.getByText(/La balise d'intégration des règles du clausier/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sauvegarder la version' })).toBeDisabled();
  });

  it('opens comment dialog on save and enforces 25-character minimum comment', async () => {
    vi.mocked(api.updateAdminPrompt).mockResolvedValue({
      message: 'Prompt updated',
      prompt: {
        id: 3,
        language: 'fr',
        version: 3,
        content: 'System prompt containing {{referenceNdaText}} and {{clausierJson}} text.',
        created_at: '2026-06-27T09:00:00Z',
        is_current: 1,
        description: 'New comment describing changes in detail.',
      },
    });

    render(<PromptsPanel adminPassword="admin" language="fr" showToast={showToastMock} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sauvegarder la version' })).toBeInTheDocument();
    });

    // Editor already has valid tags in loaded version 2, save button should be enabled
    const saveButton = screen.getByRole('button', { name: 'Sauvegarder la version' });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);

    // Comment modal should open
    expect(screen.getByText('Commentaire de modification')).toBeInTheDocument();

    const submitButton = screen.getByRole('button', { name: 'Valider & Sauvegarder' });
    expect(submitButton).toBeDisabled(); // Disabled initially because comment is empty

    const commentInput = screen.getByLabelText('Description des modifications *');

    // Enter short comment
    fireEvent.change(commentInput, { target: { value: 'Too short' } });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Longueur minimale requise : 25 caractères (9/25)')).toBeInTheDocument();

    // Enter valid comment (>= 25 characters)
    const validComment = 'Ce commentaire fait plus de 25 caractères pour être accepté.';
    fireEvent.change(commentInput, { target: { value: validComment } });
    expect(submitButton).not.toBeDisabled();

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.updateAdminPrompt).toHaveBeenCalledWith(
        'admin',
        mockPromptsData.prompts[0].content,
        validComment,
        'fr'
      );
      expect(showToastMock).toHaveBeenCalledWith(
        'Prompt enregistré avec succès (une nouvelle version active a été créée).',
        'success'
      );
    });
  });

  it('allows activating an older version from history list', async () => {
    vi.mocked(api.activateAdminPrompt).mockResolvedValue({ message: 'Activated' });

    render(<PromptsPanel adminPassword="admin" language="fr" showToast={showToastMock} />);

    await waitFor(() => {
      expect(screen.getByText('Version 1')).toBeInTheDocument();
    });

    // Find "Rendre actif" button for Version 1
    const activateButton = screen.getByRole('button', { name: 'Rendre actif' });
    fireEvent.click(activateButton);

    await waitFor(() => {
      expect(api.activateAdminPrompt).toHaveBeenCalledWith('admin', 2, 'fr');
      expect(showToastMock).toHaveBeenCalledWith(
        'Version 1 activée avec succès. Tous les autres prompts de cette langue ont été désactivés.',
        'success'
      );
    });
  });
});
