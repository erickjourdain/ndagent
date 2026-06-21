import React from 'react';
import { Chip, Box } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import WarningIcon from '@mui/icons-material/Warning';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

interface RiskBadgeProps {
  risk: 'Low' | 'Medium' | 'High';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ risk }) => {
  const getBadgeConfig = () => {
    switch (risk) {
      case 'Low':
        return {
          label: 'Risque Faible',
          color: 'success' as const,
          icon: <ShieldIcon fontSize="small" />,
          shadow: '0 0 12px rgba(16, 185, 129, 0.4)',
        };
      case 'Medium':
        return {
          label: 'Risque Moyen',
          color: 'warning' as const,
          icon: <WarningIcon fontSize="small" />,
          shadow: '0 0 12px rgba(245, 158, 11, 0.4)',
        };
      case 'High':
        return {
          label: 'Risque Élevé',
          color: 'error' as const,
          icon: <ReportProblemIcon fontSize="small" />,
          shadow: '0 0 12px rgba(244, 63, 94, 0.5)',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        variant="filled"
        sx={{
          fontSize: '0.875rem',
          fontWeight: 700,
          px: 1,
          height: 32,
          boxShadow: config.shadow,
          transition: 'all 0.3s ease',
          '& .MuiChip-icon': {
            color: 'inherit',
          },
        }}
      />
    </Box>
  );
};

export default RiskBadge;
