import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';

import { api } from '../../api/client';
import type { ClauseConfig } from '../../api/client';

interface ClausesPanelProps {
  adminPassword: string;
  language: 'fr' | 'en';
  showToast: (msg: string, severity?: 'success' | 'error') => void;
  onSessionExpired: () => void;
}

export const ClausesPanel: React.FC<ClausesPanelProps> = ({
  adminPassword,
  language,
  showToast,
  onSessionExpired,
}) => {
  const [clauses, setClauses] = useState<ClauseConfig[]>([]);
  const [loadingClauses, setLoadingClauses] = useState(false);

  // Modal / Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCriticality, setFormCriticality] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [manuallyEditedId, setManuallyEditedId] = useState(false);

  // Deactivate confirmation dialog
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivatingClause, setDeactivatingClause] = useState<ClauseConfig | null>(null);

  // Load clauses when password or language changes
  useEffect(() => {
    loadClauses(language);
  }, [adminPassword, language]);

  // Generate ID automatically from Name for new clauses if not manually overridden
  useEffect(() => {
    if (dialogMode === 'create' && !manuallyEditedId && formName) {
      const generated = formName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-zA-Z0-9\s]/g, '') // remove special characters
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
      setFormId(generated);
    }
  }, [formName, dialogMode, manuallyEditedId]);

  const loadClauses = async (targetLang: 'fr' | 'en' = 'fr') => {
    setLoadingClauses(true);
    try {
      const data = await api.getAdminClauses(adminPassword, targetLang);
      // Sort: Active ones first, then alphabetical by name
      const sorted = [...data].sort((a, b) => {
        const aActive = a.active !== false ? 1 : 0;
        const bActive = b.active !== false ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return a.name.localeCompare(b.name);
      });
      setClauses(sorted);
    } catch (err: any) {
      showToast('Impossible de charger la liste des clauses. Session expirée ou mot de passe invalide.', 'error');
      onSessionExpired(); // Force re-authentication
    } finally {
      setLoadingClauses(false);
    }
  };

  const handleOpenCreate = () => {
    setDialogMode('create');
    setEditingId(null);
    setFormId('');
    setFormName('');
    setFormDescription('');
    setFormCriticality('Medium');
    setManuallyEditedId(false);
    setDialogOpen(true);
  };

  const handleOpenEdit = (clause: ClauseConfig) => {
    setDialogMode('edit');
    setEditingId(clause.id);
    setFormId(clause.id);
    setFormName(clause.name);
    setFormDescription(clause.description);
    setFormCriticality(clause.criticality);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formId.trim() || !formName.trim() || !formDescription.trim()) {
      showToast('Tous les champs du formulaire sont requis.', 'error');
      return;
    }

    try {
      if (dialogMode === 'create') {
        await api.createClause(adminPassword, {
          id: formId,
          name: formName,
          description: formDescription,
          criticality: formCriticality,
        }, language);
        showToast('Nouvelle clause créée avec succès !', 'success');
      } else {
        if (!editingId) return;
        await api.updateClause(adminPassword, editingId, {
          name: formName,
          description: formDescription,
          criticality: formCriticality,
        }, language);
        showToast('La clause a été modifiée (l\'ancienne version a été archivée comme inactive et une nouvelle version a été créée).', 'success');
      }
      setDialogOpen(false);
      loadClauses(language);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Une erreur est survenue lors de la sauvegarde de la clause.';
      showToast(errMsg, 'error');
    }
  };

  const handleOpenDeactivateConfirm = (clause: ClauseConfig) => {
    setDeactivatingClause(clause);
    setDeactivateDialogOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingClause) return;
    try {
      await api.deactivateClause(adminPassword, deactivatingClause.id, language);
      showToast(`La clause "${deactivatingClause.name}" a été rendue inactive.`, 'success');
      setDeactivateDialogOpen(false);
      setDeactivatingClause(null);
      loadClauses(language);
    } catch (err: any) {
      showToast('Échec de la désactivation de la clause.', 'error');
    }
  };

  const handleReactivate = async (clause: ClauseConfig) => {
    try {
      await api.reactivateClause(adminPassword, clause.id, language);
      showToast(`La clause "${clause.name}" a été réactivée avec succès.`, 'success');
      loadClauses(language);
    } catch (err: any) {
      showToast('Échec de la réactivation de la clause.', 'error');
    }
  };

  const getCriticalityColor = (level: string) => {
    switch (level) {
      case 'High': return 'error';
      case 'Medium': return 'warning';
      default: return 'success';
    }
  };

  const translateSeverity = (level: string) => {
    switch (level) {
      case 'High': return 'Élevée';
      case 'Medium': return 'Moyenne';
      default: return 'Faible';
    }
  };

  if (loadingClauses) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
        <CircularProgress color="secondary" size={40} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Chargement des clauses...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{
            background: 'linear-gradient(90deg, #0891B2 0%, #06B6D4 100%)',
            color: '#0B0F19',
            fontWeight: 700,
            '&:hover': {
              boxShadow: '0 0 15px rgba(6, 182, 212, 0.6)',
            },
          }}
        >
          Nouvelle Clause
        </Button>
      </Box>

      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: 'rgba(21, 30, 51, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: 'rgba(99, 102, 241, 0.05)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: 'primary.light' }}>Nom</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'primary.light' }}>ID Technique</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'primary.light' }}>Criticité</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'primary.light' }}>Statut</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'primary.light' }}>Description / Règle</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.light' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clauses.map((clause) => {
              const isActive = clause.active !== false;
              return (
                <TableRow
                  key={clause.id}
                  sx={{
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' },
                    opacity: isActive ? 1 : 0.5,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{clause.name}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'secondary.light' }}>
                    {clause.id}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={translateSeverity(clause.criticality)}
                      color={getCriticalityColor(clause.criticality)}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={isActive ? 'Active' : 'Inactive'}
                      color={isActive ? 'success' : 'default'}
                      size="small"
                      sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={clause.description} arrow placement="top">
                      <span>{clause.description}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                      <Tooltip title={isActive ? 'Modifier la clause (archive l\'ancienne)' : 'Impossible de modifier une clause inactive'} arrow>
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={!isActive}
                            onClick={() => handleOpenEdit(clause)}
                            sx={{
                              backgroundColor: 'rgba(99, 102, 241, 0.1)',
                              '&:hover': { backgroundColor: 'rgba(99, 102, 241, 0.2)' },
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      {isActive ? (
                        <Tooltip title="Rendre cette clause inactive" arrow>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenDeactivateConfirm(clause)}
                            sx={{
                              backgroundColor: 'rgba(244, 63, 94, 0.1)',
                              '&:hover': { backgroundColor: 'rgba(244, 63, 94, 0.2)' },
                            }}
                          >
                            <BlockIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Réactiver cette clause" arrow>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleReactivate(clause)}
                            sx={{
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
                            }}
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            {clauses.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Aucune clause trouvée dans le clausier.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* CREATE & EDIT DIALOG */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {dialogMode === 'create' ? 'Créer une Nouvelle Clause' : 'Modifier la Clause'}
        </DialogTitle>
        <form onSubmit={handleFormSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            {dialogMode === 'edit' && (
              <Alert severity="info" icon={<InfoIcon />}>
                Conformément aux règles, cette modification va rendre inactive la version courante ({editingId}) et insérer une nouvelle clause avec un identifiant versionné.
              </Alert>
            )}

            <TextField
              fullWidth
              label="Nom de la clause"
              placeholder="ex: Restitution des données"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />

            <TextField
              fullWidth
              label="Identifiant technique (ID)"
              placeholder="ex: RestitutionDonnees"
              value={formId}
              onChange={(e) => {
                setFormId(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''));
                setManuallyEditedId(true);
              }}
              disabled={dialogMode === 'edit'}
              required
              helperText={
                dialogMode === 'create'
                  ? 'Généré automatiquement ou saisi manuellement. Caractères alphanumériques uniquement.'
                  : 'L\'identifiant de la version en cours ne peut pas être modifié. Le système créera automatiquement la version suivante.'
              }
            />

            <FormControl fullWidth>
              <InputLabel id="criticality-select-label">Gravité / Criticité</InputLabel>
              <Select
                labelId="criticality-select-label"
                value={formCriticality}
                label="Gravité / Criticité"
                onChange={(e) => setFormCriticality(e.target.value as any)}
              >
                <MenuItem value="Low">Faible</MenuItem>
                <MenuItem value="Medium">Moyenne</MenuItem>
                <MenuItem value="High">Élevée</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Description / Formulations recommandées"
              placeholder="Spécifiez ici la description de la règle de conformité et les formulations contractuelles recommandées par rapport au NDA type de l'entreprise..."
              multiline
              rows={5}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              required
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleDialogClose} color="inherit">
              Annuler
            </Button>
            <Button type="submit" variant="contained" color="primary">
              {dialogMode === 'create' ? 'Créer' : 'Appliquer la modification'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* CONFIRM DEACTIVATE DIALOG */}
      <Dialog open={deactivateDialogOpen} onClose={() => setDeactivateDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Confirmer l'inactivation</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Voulez-vous vraiment désactiver la clause{' '}
            <strong>"{deactivatingClause?.name}"</strong> ({deactivatingClause?.id}) ?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon fontSize="small" /> Note : La clause ne sera pas supprimée, mais elle ne sera plus utilisée lors des futures analyses de documents NDA client.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeactivateDialogOpen(false)} color="inherit">
            Annuler
          </Button>
          <Button onClick={handleConfirmDeactivate} variant="contained" color="error" startIcon={<BlockIcon />}>
            Rendre inactive
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClausesPanel;
