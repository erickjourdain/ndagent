import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  Snackbar,
  CircularProgress,
  Stack,
  Chip,
  Button,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SecurityIcon from '@mui/icons-material/Security';
import InfoIcon from '@mui/icons-material/Info';
import HubIcon from '@mui/icons-material/Hub';

import FileUploader from './components/FileUploader';
import ReferenceViewer from './components/ReferenceViewer';
import AnalysisDashboard from './components/AnalysisDashboard';
import AdminDashboard from './components/AdminDashboard';
import { api } from './api/client';
import type { ReferenceData, AnalysisResponse } from './api/client';
import SettingsIcon from '@mui/icons-material/Settings';

function App() {
  const [view, setView] = useState<'dashboard' | 'admin'>('dashboard');
  const [adminPassword, setAdminPassword] = useState<string | null>(null);

  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [analyzedFileName, setAnalyzedFileName] = useState<string>('');

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);

  // Load Reference NDA & Clausier from backend on mount
  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    setLoadingConfig(true);
    try {
      const data = await api.getReferenceData();
      setReferenceData(data);
      setBackendConnected(true);
    } catch (err: any) {
      console.error('Error fetching reference data:', err);
      setBackendConnected(false);
      setErrorMsg('Impossible de se connecter au serveur backend. Veuillez vérifier qu\'il est démarré.');
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsAnalyzing(true);
    setUploadProgress(0);
    setAnalysisResult(null);
    setAnalyzedFileName(file.name);

    try {
      const result = await api.analyzeNDA(file, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      });
      setAnalysisResult(result);
      setSuccessMsg('Analyse du NDA complétée avec succès !');
    } catch (err: any) {
      console.error('Error uploading/analyzing file:', err);
      const serverError = err.response?.data?.error || err.message || 'Échec du processus de vérification.';
      setErrorMsg(serverError);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileClear = () => {
    setAnalysisResult(null);
    setAnalyzedFileName('');
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Top Navigation / App Title */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 5, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SecurityIcon sx={{ fontSize: 32, mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontFamily: 'Outfit' }}>
            ND<span style={{ color: '#06B6D4' }}>Agent</span>
          </Typography>
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: '14px !important', color: 'primary.light' }} />}
            label="Agent IA"
            size="small"
            sx={{
              ml: 1.5,
              background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
              borderColor: 'rgba(99, 102, 241, 0.3)',
              borderWidth: 1,
              borderStyle: 'solid',
              color: 'primary.light',
              fontWeight: 700,
            }}
          />
        </Box>

        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          {backendConnected === false && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={fetchReferenceData}
              sx={{ borderStyle: 'dashed' }}
            >
              Se reconnecter
            </Button>
          )}
          {backendConnected && view === 'dashboard' && (
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              startIcon={<SettingsIcon />}
              onClick={() => setView('admin')}
            >
              Gérer le clausier
            </Button>
          )}
          <Chip
            icon={<HubIcon />}
            label={
              backendConnected === null
                ? 'Connexion...'
                : backendConnected
                  ? 'Backend Connecté'
                  : 'Hors ligne'
            }
            color={
              backendConnected === null
                ? 'default'
                : backendConnected
                  ? 'success'
                  : 'error'
            }
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      </Box>

      {/* Main Grid Body / Content Area */}
      {loadingConfig ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, py: 8 }}>
          <CircularProgress color="primary" size={50} sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Initialisation des paramètres de conformité...
          </Typography>
        </Box>
      ) : view === 'admin' ? (
        <AdminDashboard
          onBack={() => {
            setView('dashboard');
            fetchReferenceData();
          }}
          adminPassword={adminPassword}
          setAdminPassword={setAdminPassword}
        />
      ) : (
        <Grid container spacing={4} sx={{ flexGrow: 1 }}>

          {/* Left Column: Actions and Configurations */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={3}>

              {/* File Upload Section */}
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                    Chargement du Document Client
                  </Typography>
                  <FileUploader
                    onFileSelect={handleFileSelect}
                    onFileClear={handleFileClear}
                    isAnalyzing={isAnalyzing}
                    uploadProgress={uploadProgress}
                  />
                </CardContent>
              </Card>

              {/* Reference Policies Section */}
              {referenceData && (
                <ReferenceViewer
                  referenceNda={referenceData.referenceNda}
                  clausier={referenceData.clausier}
                />
              )}
            </Stack>
          </Grid>

          {/* Right Column: AI Analysis Outcomes */}
          <Grid size={{ xs: 12, lg: 8 }}>
            {analysisResult ? (
              <AnalysisDashboard analysis={analysisResult} fileName={analyzedFileName} />
            ) : (
              <Card
                sx={{
                  height: '100%',
                  minHeight: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(21, 30, 51, 0.3)',
                  borderStyle: 'dashed',
                  borderWidth: 2,
                  borderColor: 'rgba(255, 255, 255, 0.05)',
                  boxShadow: 'none',
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 4, maxWidth: 500 }}>
                  <InfoIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                    En attente de chargement
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Veuillez charger un fichier NDA client (.pdf ou .docx) dans le panneau latéral. Notre agent de conformité IA l'analysera clause par clause par rapport au document de référence et aux règles établies.
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* Footer */}
      <Box sx={{ mt: 'auto', pt: 6, pb: 2, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <Typography variant="caption" color="text.disabled">
          NDAgent © {new Date().getFullYear()} — Propulsé par des agents LLM Ollama locaux
        </Typography>
      </Box>

      {/* Message Notifications */}
      <Snackbar
        open={!!errorMsg}
        autoHideDuration={6000}
        onClose={() => setErrorMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setErrorMsg(null)} severity="error" variant="filled" sx={{ width: '100%' }}>
          {errorMsg}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!successMsg}
        autoHideDuration={4000}
        onClose={() => setSuccessMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccessMsg(null)} severity="success" variant="filled" sx={{ width: '100%' }}>
          {successMsg}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default App;
