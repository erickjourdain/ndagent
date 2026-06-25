import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import TerminalIcon from '@mui/icons-material/Terminal';

import FlagIcon from './FlagIcon';
import AdminLogin from './Admin/AdminLogin';
import ClausesPanel from './Admin/ClausesPanel';
import PromptsPanel from './Admin/PromptsPanel';

interface AdminDashboardProps {
  onBack: () => void;
  adminPassword: string | null;
  setAdminPassword: (pw: string | null) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBack,
  adminPassword,
  setAdminPassword,
}) => {
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [activeTab, setActiveTab] = useState<'clauses' | 'prompts'>('clauses');

  // Status Notification states
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>('success');

  const showToast = (msg: string, severity: 'success' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastSeverity(severity);
  };

  // If not authenticated, show password login screen
  if (!adminPassword) {
    return (
      <>
        <AdminLogin
          onBack={onBack}
          onLoginSuccess={setAdminPassword}
          showToast={showToast}
        />
        <Snackbar
          open={!!toastMsg}
          autoHideDuration={5000}
          onClose={() => setToastMsg(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={() => setToastMsg(null)} severity={toastSeverity} variant="filled" sx={{ width: '100%' }}>
            {toastMsg}
          </Alert>
        </Snackbar>
      </>
    );
  }

  // Admin Dashboard Content (Authenticated)
  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Admin header action area */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={onBack} sx={{ color: 'text.primary', backgroundColor: 'rgba(255,255,255,0.05)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AdminPanelSettingsIcon color="primary" /> Administration de l'Agent
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Administration du clausier et des prompts
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <ToggleButtonGroup
            value={language}
            exclusive
            onChange={(_, newLang) => {
              if (newLang !== null) {
                setLanguage(newLang);
              }
            }}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                px: 2,
                py: 0.5,
                fontSize: '0.8rem',
                fontWeight: 700,
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: '#06B6D4',
                  backgroundColor: 'rgba(6, 182, 212, 0.12)',
                  borderColor: 'rgba(6, 182, 212, 0.4)',
                  '&:hover': {
                    backgroundColor: 'rgba(6, 182, 212, 0.2)',
                  }
                }
              }
            }}
          >
            <ToggleButton value="fr"><FlagIcon country="FR" /> Français</ToggleButton>
            <ToggleButton value="en"><FlagIcon country="GB" /> Anglais</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      {/* Tabs Selector */}
      <Tabs
        value={activeTab}
        onChange={(_, newTab) => setActiveTab(newTab)}
        sx={{
          borderBottom: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
          mb: 1,
          '& .MuiTab-root': {
            fontWeight: 700,
            fontSize: '0.9rem',
            color: 'text.secondary',
            textTransform: 'none',
            '&.Mui-selected': {
              color: '#06B6D4',
            }
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#06B6D4',
          }
        }}
      >
        <Tab icon={<PlaylistAddCheckIcon sx={{ mr: 1, fontSize: 20 }} />} iconPosition="start" label="Règles du Clausier" value="clauses" />
        <Tab icon={<TerminalIcon sx={{ mr: 1, fontSize: 20 }} />} iconPosition="start" label="Prompts de l'Analyseur" value="prompts" />
      </Tabs>

      {/* Tab Subtitle */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {activeTab === 'clauses'
          ? "Gérez les règles de conformité utilisées par le moteur d'analyse IA."
          : "Gérez et versionnez les instructions système de l'agent d'analyse IA."}
      </Typography>

      {/* CLAUSES PANEL */}
      {activeTab === 'clauses' && (
        <ClausesPanel
          adminPassword={adminPassword}
          language={language}
          showToast={showToast}
          onSessionExpired={() => setAdminPassword(null)}
        />
      )}

      {/* PROMPTS PANEL */}
      {activeTab === 'prompts' && (
        <PromptsPanel
          adminPassword={adminPassword}
          language={language}
          showToast={showToast}
        />
      )}

      {/* Toast Alert Feedback */}
      <Snackbar
        open={!!toastMsg}
        autoHideDuration={5000}
        onClose={() => setToastMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setToastMsg(null)} severity={toastSeverity} variant="filled" sx={{ width: '100%' }}>
          {toastMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminDashboard;
