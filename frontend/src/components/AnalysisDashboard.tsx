import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import RiskBadge from './RiskBadge';
import type { AnalysisResponse, ClauseAnalysisResult } from '../api/client';

interface AnalysisDashboardProps {
  analysis: AnalysisResponse;
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ analysis }) => {
  const translateStatus = (status: ClauseAnalysisResult['status']) => {
    switch (status) {
      case 'Compliant': return 'Conforme';
      case 'Partially Compliant': return 'Partiellement Conforme';
      case 'Non-Compliant': return 'Non Conforme';
      case 'Missing': return 'Manquante';
      default: return status;
    }
  };

  const getStatusConfig = (status: ClauseAnalysisResult['status']) => {
    switch (status) {
      case 'Compliant':
        return {
          color: 'success' as const,
          icon: <CheckCircleIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />,
          bg: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.15)',
        };
      case 'Partially Compliant':
        return {
          color: 'warning' as const,
          icon: <WarningIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} />,
          bg: 'rgba(245, 158, 11, 0.05)',
          border: '1px solid rgba(245, 158, 11, 0.15)',
        };
      case 'Non-Compliant':
        return {
          color: 'error' as const,
          icon: <CancelIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />,
          bg: 'rgba(244, 63, 94, 0.05)',
          border: '1px solid rgba(244, 63, 94, 0.15)',
        };
      case 'Missing':
      default:
        return {
          color: 'default' as const,
          icon: <InfoIcon fontSize="small" sx={{ mr: 1, color: 'text.disabled' }} />,
          bg: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        };
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      {/* 1. Header Overview Card */}
      <Card sx={{ mb: 4, overflow: 'visible', position: 'relative' }}>
        <Box
          sx={{
            position: 'absolute',
            top: -2,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #6366F1 0%, #06B6D4 100%)',
            borderRadius: '20px 20px 0 0',
          }}
        />
        <CardContent sx={{ p: 4 }}>
          <Grid container spacing={4} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                Résumé du Rapport d'Audit
              </Typography>
              <Typography variant="body1" color="text.secondary" component="p" sx={{ mb: 2 }}>
                {analysis.summary}
              </Typography>
              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.05)' }} />
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 0.5 }}>
                ÉVALUATION JURIDIQUE
              </Typography>
              <Typography variant="body2" color="text.primary">
                {analysis.overallAssessment}
              </Typography>
            </Grid>

            <Grid
              size={{ xs: 12, md: 4 }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: { xs: 'flex-start', md: 'center' },
                justifyContent: 'center',
                borderLeft: { md: '1px solid rgba(255,255,255,0.08)' },
                pl: { md: 4 },
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                NIVEAU DE RISQUE GLOBAL
              </Typography>
              <RiskBadge risk={analysis.riskLevel} />

              <Box sx={{ mt: 3, textAlign: 'center', width: '100%' }}>
                <Grid container spacing={1}>
                  <Grid size={4}>
                    <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 800 }}>
                      {analysis.clauses.filter((c) => c.status === 'Compliant').length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Conformes
                    </Typography>
                  </Grid>
                  <Grid size={4}>
                    <Typography variant="h6" sx={{ color: 'warning.main', fontWeight: 800 }}>
                      {analysis.clauses.filter((c) => c.status === 'Partially Compliant').length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Partielles
                    </Typography>
                  </Grid>
                  <Grid size={4}>
                    <Typography variant="h6" sx={{ color: 'error.main', fontWeight: 800 }}>
                      {analysis.clauses.filter((c) => c.status === 'Non-Compliant' || c.status === 'Missing').length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Rejetées
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 2. Clause Analysis Details */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Analyse Clause par Clause
      </Typography>

      <Box>
        {analysis.clauses.map((clause) => {
          const config = getStatusConfig(clause.status);
          return (
            <Accordion key={clause.id} sx={{ mb: 1.5 }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: config.bg,
                  borderRadius: 3,
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {config.icon}
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {clause.name} ({clause.id})
                  </Typography>
                </Box>

                <Chip
                  label={translateStatus(clause.status)}
                  color={config.color}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                  }}
                />
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, py: 3 }}>
                <Grid container spacing={3}>
                  {/* Left: Comparison Texts */}
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Box sx={{ mb: 2.5 }}>
                      <Typography variant="caption" color="primary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                        DISPOSITION DU NDA CLIENT (CONTRAT CHARGÉ)
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          fontSize: '0.85rem',
                          backgroundColor: 'rgba(0,0,0,0.15)',
                          borderColor: clause.status === 'Non-Compliant' ? 'rgba(244, 63, 94, 0.2)' : 'divider',
                          color: clause.currentText ? 'text.primary' : 'text.disabled',
                          fontStyle: clause.currentText ? 'normal' : 'italic',
                          minHeight: 48,
                        }}
                      >
                        {clause.currentText || '[Cette clause n\'a pas été trouvée dans le contrat du client]'}
                      </Paper>
                    </Box>

                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                        POLITIQUE DE RÉFÉRENCE / FORMULATION CIBLE
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          fontSize: '0.85rem',
                          backgroundColor: 'rgba(0,0,0,0.15)',
                          color: 'text.secondary',
                          minHeight: 48,
                        }}
                      >
                        {clause.referenceText}
                      </Paper>
                    </Box>
                  </Grid>

                  {/* Right: Deviation and Recommendation */}
                  <Grid size={{ xs: 12, md: 5 }} sx={{ borderLeft: { md: '1px solid rgba(255,255,255,0.05)' }, pl: { md: 3 } }}>
                    <Box sx={{ mb: 2.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                        DÉTAILS DE LA DÉVIATION
                      </Typography>
                      <Typography variant="body2">
                        {clause.deviation}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="success.main" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                        RECOMMANDATION / ACTION CORRECTIVE ENVISAGÉE
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                        {clause.recommendation}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* 3. Proposed Clause (New Section) */}
                {clause.status !== 'Compliant' && (
                  <Grid size={{ xs: 12, md: 12 }}>
                    <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 2, borderLeft: '4px solid #3b82f6' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <ArticleOutlinedIcon sx={{ color: 'primary.main', mr: 1 }} />
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>
                          PROPOSITION DE FORMULATION (Selon NDA de Référence / Clausier)
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: 'text.primary' }}>
                        {clause.proposal || ''}
                      </Typography>
                    </Box>
                  </Grid>
                )}

              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    </Box>
  );
};

export default AnalysisDashboard;
