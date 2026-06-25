import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Stack,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockIcon from '@mui/icons-material/Lock';
import KeyIcon from '@mui/icons-material/Key';
import { api } from '../../api/client';

interface AdminLoginProps {
  onBack: () => void;
  onLoginSuccess: (password: string) => void;
  showToast: (msg: string, severity?: 'success' | 'error') => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onBack,
  onLoginSuccess,
  showToast,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setIsVerifying(true);
    try {
      const isValid = await api.verifyAdminPassword(passwordInput);
      if (isValid) {
        onLoginSuccess(passwordInput);
        showToast('Connexion administrateur réussie.', 'success');
      } else {
        showToast('Mot de passe incorrect.', 'error');
      }
    } catch (err) {
      showToast('Une erreur est survenue lors de la connexion.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
        py: 8,
      }}
    >
      <Card sx={{ maxWidth: 450, width: '100%', boxShadow: '0 8px 32px 0 rgba(99, 102, 241, 0.2)' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px auto',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            <LockIcon color="primary" sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 800 }}>
            Accès Administration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Veuillez saisir le mot de passe administrateur pour modifier les clauses du clausier de conformité.
          </Typography>

          <form onSubmit={handleLoginSubmit}>
            <TextField
              fullWidth
              label="Mot de passe"
              type="password"
              variant="outlined"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              sx={{ mb: 3 }}
              autoFocus
              placeholder="Entrez le mot de passe..."
            />
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
              <Button variant="outlined" color="inherit" onClick={onBack} startIcon={<ArrowBackIcon />}>
                Retour
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isVerifying}
                startIcon={isVerifying ? <CircularProgress size={20} /> : <KeyIcon />}
              >
                {isVerifying ? 'Vérification...' : 'Se connecter'}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminLogin;
