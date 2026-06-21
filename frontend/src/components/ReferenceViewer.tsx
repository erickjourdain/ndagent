import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Paper,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DescriptionIcon from '@mui/icons-material/Description';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

interface ClauseConfig {
  id: string;
  name: string;
  description: string;
  criticality: 'High' | 'Medium' | 'Low';
}

interface ReferenceViewerProps {
  referenceNda: string;
  clausier: ClauseConfig[];
}

export const ReferenceViewer: React.FC<ReferenceViewerProps> = ({
  referenceNda,
  clausier,
}) => {
  const getCriticalityColor = (level: string) => {
    switch (level) {
      case 'High':
        return 'error';
      case 'Medium':
        return 'warning';
      default:
        return 'success';
    }
  };

  const translateSeverity = (level: string) => {
    switch (level) {
      case 'High':
        return 'Élevée';
      case 'Medium':
        return 'Moyenne';
      default:
        return 'Faible';
    }
  };

  return (
    <Box>
      <Accordion defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PlaylistAddCheckIcon sx={{ mr: 1.5, color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Clausier de conformité ({clausier.length} règles)
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <List disablePadding>
            {clausier.map((clause, index) => (
              <React.Fragment key={clause.id}>
                {index > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />}
                <ListItem sx={{ py: 2, px: 3, alignItems: 'flex-start' }}>
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    <ReportProblemIcon
                      color={getCriticalityColor(clause.criticality)}
                      fontSize="small"
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {clause.name}
                        </Typography>
                        <Chip
                          label={`Gravité ${translateSeverity(clause.criticality)}`}
                          color={getCriticalityColor(clause.criticality)}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {clause.description}
                      </Typography>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DescriptionIcon sx={{ mr: 1.5, color: 'secondary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Modèle de NDA de référence
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 3, pb: 3 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              maxHeight: 250,
              overflowY: 'auto',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderColor: 'rgba(255, 255, 255, 0.05)',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              whiteSpace: 'pre-wrap',
              scrollbarWidth: 'thin',
              color: 'text.secondary',
            }}
          >
            {referenceNda || 'Aucun NDA de référence chargé.'}
          </Paper>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default ReferenceViewer;
