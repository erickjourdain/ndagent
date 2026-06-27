import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ReferenceViewer from './ReferenceViewer';

const mockClausier = [
  {
    id: 'DureeConfidentialite',
    name: 'Durée de confidentialité',
    description: 'La durée doit être d\'au moins 5 ans.',
    criticality: 'High' as const,
  },
  {
    id: 'RestitutionDonnees',
    name: 'Restitution des données',
    description: 'Les données doivent être restituées sous 30 jours.',
    criticality: 'Medium' as const,
  },
  {
    id: 'TribunalCompetent',
    name: 'Tribunal compétent',
    description: 'Le tribunal compétent doit être celui de Paris.',
    criticality: 'Low' as const,
  }
];

describe('ReferenceViewer Component', () => {
  it('renders Accordion headers correctly', () => {
    render(<ReferenceViewer referenceNda="NDA de référence de test" clausier={mockClausier} />);

    expect(screen.getByText('Clausier de conformité (3 règles)')).toBeInTheDocument();
    expect(screen.getByText('Modèle de NDA de référence')).toBeInTheDocument();
  });

  it('renders clausier rules details correctly', () => {
    render(<ReferenceViewer referenceNda="NDA de référence de test" clausier={mockClausier} />);

    // Check rule names
    expect(screen.getByText('Durée de confidentialité')).toBeInTheDocument();
    expect(screen.getByText('Restitution des données')).toBeInTheDocument();
    expect(screen.getByText('Tribunal compétent')).toBeInTheDocument();

    // Check gravity labels
    expect(screen.getByText('Gravité Élevée')).toBeInTheDocument();
    expect(screen.getByText('Gravité Moyenne')).toBeInTheDocument();
    expect(screen.getByText('Gravité Faible')).toBeInTheDocument();

    // Check descriptions
    expect(screen.getByText('La durée doit être d\'au moins 5 ans.')).toBeInTheDocument();
    expect(screen.getByText('Les données doivent être restituées sous 30 jours.')).toBeInTheDocument();
    expect(screen.getByText('Le tribunal compétent doit être celui de Paris.')).toBeInTheDocument();
  });

  it('renders reference NDA text correctly', () => {
    render(<ReferenceViewer referenceNda="NDA de référence de test" clausier={mockClausier} />);
    expect(screen.getByText('NDA de référence de test')).toBeInTheDocument();
  });

  it('renders placeholder if reference NDA text is empty', () => {
    render(<ReferenceViewer referenceNda="" clausier={mockClausier} />);
    expect(screen.getByText('Aucun NDA de référence chargé.')).toBeInTheDocument();
  });
});
