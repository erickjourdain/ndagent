import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnalysisDashboard from './AnalysisDashboard';
import { generateAuditPDF } from '../utils/pdfGenerator';

// Mock the PDF generator utility
vi.mock('../utils/pdfGenerator', () => ({
  generateAuditPDF: vi.fn(),
}));

const mockAnalysisData = {
  summary: "Ceci est un résumé synthétique de l'analyse.",
  riskLevel: 'Medium' as const,
  overallAssessment: "L'avis juridique global estime que le contrat présente des risques modérés.",
  clauses: [
    {
      id: 'DureeConfidentialite',
      name: 'Durée de confidentialité',
      status: 'Partially Compliant' as const,
      currentText: 'La confidentialité dure 2 ans.',
      referenceText: 'La confidentialité doit durer 5 ans.',
      deviation: 'La durée est insuffisante (2 ans au lieu de 5 ans).',
      recommendation: 'Demander à passer la durée à 5 ans.',
      proposal: 'Les parties s\'engagent à garder confidentielles pendant 5 ans...',
    },
    {
      id: 'Indemnisation',
      name: 'Indemnisation',
      status: 'Compliant' as const,
      currentText: 'Aucune clause d\'indemnisation disproportionnée.',
      referenceText: 'Pas d\'indemnisation unilatérale.',
      deviation: 'Aucune déviation.',
      recommendation: 'Rien à modifier.',
      proposal: '',
    },
    {
      id: 'RestitutionDonnees',
      name: 'Restitution des données',
      status: 'Non-Compliant' as const,
      currentText: '',
      referenceText: 'Les données doivent être restituées sous 30 jours.',
      deviation: 'La clause est absente.',
      recommendation: 'Insérer la clause de restitution.',
      proposal: 'À la fin du contrat, chaque partie restituera...',
    }
  ]
};

describe('AnalysisDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders overall overview card info correctly', () => {
    render(<AnalysisDashboard analysis={mockAnalysisData} fileName="MonContrat.docx" />);

    expect(screen.getByText("Résumé du Rapport d'Audit")).toBeInTheDocument();
    expect(screen.getByText('Document analysé : MonContrat.docx')).toBeInTheDocument();
    expect(screen.getByText("Ceci est un résumé synthétique de l'analyse.")).toBeInTheDocument();
    expect(screen.getByText("L'avis juridique global estime que le contrat présente des risques modérés.")).toBeInTheDocument();

    // Risk level badge (RiskBadge is rendered)
    expect(screen.getByText('Risque Moyen')).toBeInTheDocument();

    // Statistics counts
    // Conformes: 1, Partielles: 1, Rejetées: 1
    expect(screen.getAllByText('1').length).toBe(3);
    expect(screen.getByText('Conformes')).toBeInTheDocument();
    expect(screen.getByText('Partielles')).toBeInTheDocument();
    expect(screen.getByText('Rejetées')).toBeInTheDocument();
  });

  it('lists clauses and statuses in accordions', () => {
    render(<AnalysisDashboard analysis={mockAnalysisData} />);

    expect(screen.getByText("Analyse Clause par Clause")).toBeInTheDocument();

    // Clause titles
    expect(screen.getByText('Durée de confidentialité (DureeConfidentialite)')).toBeInTheDocument();
    expect(screen.getByText('Indemnisation (Indemnisation)')).toBeInTheDocument();
    expect(screen.getByText('Restitution des données (RestitutionDonnees)')).toBeInTheDocument();

    // Status chips
    expect(screen.getByText('Partiellement Conforme')).toBeInTheDocument();
    expect(screen.getByText('Conforme')).toBeInTheDocument();
    expect(screen.getByText('Non Conforme')).toBeInTheDocument();
  });

  it('displays detailed comparison fields inside accordions', () => {
    render(<AnalysisDashboard analysis={mockAnalysisData} />);

    // Check texts from Durée de confidentialité details
    expect(screen.getByText('La confidentialité dure 2 ans.')).toBeInTheDocument();
    expect(screen.getByText('La confidentialité doit durer 5 ans.')).toBeInTheDocument();
    expect(screen.getByText('La durée est insuffisante (2 ans au lieu de 5 ans).')).toBeInTheDocument();
    expect(screen.getByText('Demander à passer la durée à 5 ans.')).toBeInTheDocument();

    // Check proposal section for non-compliant/partially compliant clauses
    expect(screen.getAllByText("PROPOSITION DE FORMULATION (Selon NDA de Référence / Clausier)").length).toBe(2);
    expect(screen.getByText("Les parties s'engagent à garder confidentielles pendant 5 ans...")).toBeInTheDocument();
  });

  it('triggers PDF generation when clicking PDF download button', () => {
    render(<AnalysisDashboard analysis={mockAnalysisData} fileName="test_doc.docx" />);

    const downloadButton = screen.getByRole('button', { name: 'Télécharger le PDF' });
    fireEvent.click(downloadButton);

    expect(generateAuditPDF).toHaveBeenCalledWith(mockAnalysisData, 'test_doc.docx');
  });
});
