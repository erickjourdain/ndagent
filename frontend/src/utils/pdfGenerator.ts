import { jsPDF } from 'jspdf';
import type { AnalysisResponse } from '../api/client';

/**
 * Translates risk level to French.
 */
const translateRiskLevel = (risk: string) => {
  switch (risk) {
    case 'High': return 'ÉLEVÉ';
    case 'Medium': return 'MOYEN';
    case 'Low': return 'FAIBLE';
    default: return risk;
  }
};

/**
 * Translates clause status to French.
 */
const translateStatus = (status: string) => {
  switch (status) {
    case 'Compliant': return 'CONFORME';
    case 'Partially Compliant': return 'PARTIELLEMENT CONFORME';
    case 'Non-Compliant': return 'NON CONFORME';
    case 'Missing': return 'MANQUANTE';
    default: return status;
  }
};

/**
 * Generates and downloads a styled PDF report of the NDA audit.
 */
export const generateAuditPDF = (analysis: AnalysisResponse, originalFileName?: string) => {
  const fileName = originalFileName
    ? `${originalFileName.replace(/\.[^/.]+$/, "")}_rapport_audit.pdf`
    : 'rapport_audit_nda.pdf';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin; // 180

  let y = 20;

  // Helper to draw horizontal lines
  const drawLine = (yPos: number, color: [number, number, number] = [226, 232, 240]) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, yPos, pageWidth - margin, yPos);
  };

  // Helper to write wrapped text and handle pages automatically
  const writeWrappedText = (
    text: string,
    x: number,
    maxWidth: number,
    lineSpacing: number = 5.5,
    fontStyle: 'normal' | 'bold' | 'italic' = 'normal',
    fontSize: number = 9.5,
    textColor: [number, number, number] = [30, 41, 59]
  ) => {
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      if (y + lineSpacing > 270) {
        doc.addPage();
        y = 25; // Header buffer for pages >= 2
      }
      doc.text(line, x, y);
      y += lineSpacing;
    }
  };

  // Helper to draw status pill badge
  const drawStatusBadge = (status: string, x: number, yPos: number) => {
    let color = [100, 116, 139]; // default slate grey
    switch (status) {
      case 'Compliant':
        color = [16, 185, 129]; // green
        break;
      case 'Partially Compliant':
        color = [245, 158, 11]; // orange/warning
        break;
      case 'Non-Compliant':
      case 'Missing':
        color = [244, 63, 94]; // red/error
        break;
    }

    const label = translateStatus(status);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    const textWidth = doc.getTextWidth(label);
    const badgeWidth = textWidth + 6;
    const badgeHeight = 5.5;

    // Draw badge background
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x, yPos - 4, badgeWidth, badgeHeight, 1, 1, 'F');

    // Draw badge text
    doc.setTextColor(255, 255, 255);
    doc.text(label, x + 3, yPos - 0.2);
  };

  // =========================================================================
  // PAGE 1: TITLE & COVER REPORT OVERVIEW
  // =========================================================================

  // Brand Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(99, 102, 241); // Indigo color
  doc.text('ND', margin, y);

  const ndWidth = doc.getTextWidth('ND');
  doc.setTextColor(6, 182, 212); // Cyan color
  doc.text('Agent', margin + ndWidth, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Généré le ${dateStr}`, pageWidth - margin, y - 1, { align: 'right' });

  y += 4;
  drawLine(y, [99, 102, 241]); // Indigo header bar
  y += 10;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text("Rapport d'Audit de Conformité NDA", margin, y);
  y += 6;

  if (originalFileName) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(originalFileName, margin, y);
    y += 6;
  } else {
    y += 2;
  }

  // Split overall assessment to calculate exact dynamic height needed
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const assessmentLines = doc.splitTextToSize(analysis.overallAssessment, contentWidth - 10);
  const assessmentHeight = assessmentLines.length * 4.5;
  const overviewBoxHeight = 34 + assessmentHeight; // Dynamic height based on assessment text length

  // Overview box background
  const overviewBoxY = y;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(241, 245, 249); // Slate 100
  doc.roundedRect(margin, overviewBoxY, contentWidth, overviewBoxHeight, 2, 2, 'FD');

  // Left border highlight
  doc.setFillColor(99, 102, 241); // Indigo
  doc.rect(margin, overviewBoxY, 1.5, overviewBoxHeight, 'F');

  // Overview content
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text("ÉVALUATION DE CONFORMITÉ", margin + 5, y);

  // Risk Level Badge color
  let riskColor = [16, 185, 129];
  if (analysis.riskLevel === 'High') riskColor = [244, 63, 94];
  else if (analysis.riskLevel === 'Medium') riskColor = [245, 158, 11];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.text(`RISQUE GLOBAL : ${translateRiskLevel(analysis.riskLevel)}`, pageWidth - margin - 5, y, { align: 'right' });

  y += 7;

  // Statistics row
  const compliantCount = analysis.clauses.filter((c) => c.status === 'Compliant').length;
  const partialCount = analysis.clauses.filter((c) => c.status === 'Partially Compliant').length;
  const rejectedCount = analysis.clauses.filter((c) => c.status === 'Non-Compliant' || c.status === 'Missing').length;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Statistiques : `, margin + 5, y);

  const statsX = margin + 30;
  // Compliant stats
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`${compliantCount}`, statsX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(' Conformes  |  ', statsX + doc.getTextWidth(`${compliantCount}`), y);

  const partialX = statsX + doc.getTextWidth(`${compliantCount} Conformes  |  `);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 158, 11);
  doc.text(`${partialCount}`, partialX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(' Partielles  |  ', partialX + doc.getTextWidth(`${partialCount}`), y);

  const nonCompliantX = partialX + doc.getTextWidth(`${partialCount} Partielles  |  `);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(244, 63, 94);
  doc.text(`${rejectedCount}`, nonCompliantX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(' Non Conformes / Manquantes', nonCompliantX + doc.getTextWidth(`${rejectedCount}`), y);

  y += 10;

  // Overall assessment title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Avis Juridique Global :", margin + 5, y);

  y += 5;
  // Make sure overall assessment wraps nicely inside the box height
  writeWrappedText(analysis.overallAssessment, margin + 5, contentWidth - 10, 4.5, 'normal', 9, [71, 85, 105]);

  // Adjust y position to end of overview box
  y = overviewBoxY + overviewBoxHeight + 8;

  // Audit Summary Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("Synthèse de l'Audit", margin, y);
  y += 5;
  writeWrappedText(analysis.summary, margin, contentWidth, 5.5, 'normal', 10, [71, 85, 105]);
  y += 6;

  drawLine(y);
  y += 8;

  // =========================================================================
  // SECTION 2: CLAUSE ANALYSIS DETAILS
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("Analyse Clause par Clause", margin, y);
  y += 8;

  analysis.clauses.forEach((clause) => {
    // Check if we have enough space for the clause header (at least 20mm)
    if (y + 20 > 270) {
      doc.addPage();
      y = 25;
    }

    // Clause Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`${clause.name} (${clause.id})`, margin, y);

    // Status Badge right aligned or next to it
    const titleWidth = doc.getTextWidth(`${clause.name} (${clause.id})`);
    drawStatusBadge(clause.status, margin + titleWidth + 4, y);
    y += 6;

    // Line beneath clause header
    drawLine(y, [241, 245, 249]);
    y += 6;

    // Current text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(99, 102, 241);
    doc.text("DISPOSITION DU NDA CLIENT (CONTRAT CHARGÉ) :", margin, y);
    y += 4.5;
    const currentTxt = clause.currentText || '[Cette clause n\'a pas été trouvée dans le contrat du client]';
    writeWrappedText(
      currentTxt,
      margin,
      contentWidth,
      4.5,
      clause.currentText ? 'normal' : 'italic',
      9,
      clause.currentText ? [30, 41, 59] : [148, 163, 184]
    );
    y += 3;

    // Reference text
    if (y + 15 > 270) {
      doc.addPage();
      y = 25;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(14, 165, 233);
    doc.text("POLITIQUE DE RÉFÉRENCE / FORMULATION CIBLE :", margin, y);
    y += 4.5;
    writeWrappedText(clause.referenceText, margin, contentWidth, 4.5, 'normal', 9, [100, 116, 139]);
    y += 3;

    // Deviation details if any
    if (clause.deviation) {
      if (y + 15 > 270) {
        doc.addPage();
        y = 25;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(245, 158, 11);
      doc.text("DÉTAILS DE LA DÉVIATION :", margin, y);
      y += 4.5;
      writeWrappedText(clause.deviation, margin, contentWidth, 4.5, 'normal', 9, [30, 41, 59]);
      y += 3;
    }

    // Recommendation if any
    if (clause.recommendation) {
      if (y + 15 > 270) {
        doc.addPage();
        y = 25;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(16, 185, 129);
      doc.text("RECOMMANDATION / ACTION CORRECTIVE ENVISAGÉE :", margin, y);
      y += 4.5;
      writeWrappedText(clause.recommendation, margin, contentWidth, 4.5, 'bold', 9, [30, 41, 59]);
      y += 3;
    }

    // Proposal formulation if status is not Compliant
    if (clause.status !== 'Compliant' && clause.proposal) {
      // Set font metrics to courier before splitting so character widths match rendering
      doc.setFont('courier', 'normal');
      doc.setFontSize(8.5);

      // Split using courier font metrics with a safe width (leaving padding)
      const proposalLines = doc.splitTextToSize(clause.proposal, contentWidth - 10);
      const containerHeight = proposalLines.length * 4.5 + 9;

      // Check if container height fits on the page, else break page
      if (y + containerHeight > 270) {
        doc.addPage();
        y = 25;
      }

      // Draw light blue background container for the proposal
      doc.setFillColor(239, 246, 255); // Blue 50
      doc.roundedRect(margin, y, contentWidth, containerHeight, 1.5, 1.5, 'F');
      doc.setFillColor(59, 130, 246); // Blue 500 highlight bar
      doc.rect(margin, y, 1, containerHeight, 'F');

      y += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(29, 78, 216); // Blue 700
      doc.text("PROPOSITION DE FORMULATION (Selon NDA de Référence) :", margin + 4, y);
      y += 4.5;

      doc.setFont('courier', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      for (const line of proposalLines) {
        doc.text(line, margin + 4, y);
        y += 4.5;
      }
    }

    y += 8; // Extra padding between clauses
  });

  // =========================================================================
  // RUNNING FOOTERS & RUNNING HEADERS (POST-PROCESSING)
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Draw Footer (on all pages)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(`Page ${i} sur ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    doc.text("Confidentiel — Rapport d'audit généré par NDAgent", margin, pageHeight - 10);
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    // Draw Running Header (only on pages >= 2)
    if (i >= 2) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Rapport de Conformité NDA — NDAgent", margin, 12);
      doc.text(`Généré le ${dateStr}`, pageWidth - margin, 12, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, 15, pageWidth - margin, 15);
    }
  }

  // Save the PDF
  doc.save(fileName);
};
