import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import HistoryIcon from '@mui/icons-material/History';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import { api } from '../../api/client';
import type { PromptVersion } from '../../api/client';

interface PromptsPanelProps {
  adminPassword: string;
  language: 'fr' | 'en';
  showToast: (msg: string, severity?: 'success' | 'error') => void;
}

export const PromptsPanel: React.FC<PromptsPanelProps> = ({
  adminPassword,
  language,
  showToast,
}) => {
  const [promptsHistory, setPromptsHistory] = useState<any[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [loadedPrompt, setLoadedPrompt] = useState<PromptVersion | null>(null);
  const [activePrompt, setActivePrompt] = useState<PromptVersion | null>(null);

  // Prompts pagination and comment states
  const [promptsPage, setPromptsPage] = useState(1);
  const [promptsTotalPages, setPromptsTotalPages] = useState(1);
  const [saveCommentDialogOpen, setSaveCommentDialogOpen] = useState(false);
  const [promptComment, setPromptComment] = useState('');

  useEffect(() => {
    setPromptsPage(1);
    loadPrompts(language, 1);
  }, [adminPassword, language]);

  const loadPrompts = async (targetLang: 'fr' | 'en' = 'fr', pageNum: number = 1) => {
    setLoadingPrompts(true);
    try {
      const data = await api.getAdminPrompts(adminPassword, targetLang, pageNum, 5);
      setPromptsHistory(data.prompts);
      setPromptsTotalPages(data.pages);
      setPromptsPage(data.page);
      
      const currentActive = data.activePrompt || data.prompts.find((p) => p.is_current === 1) || null;
      setActivePrompt(currentActive);
      
      // Load current content if page is 1
      if (pageNum === 1) {
        if (currentActive) {
          setPromptText(currentActive.content);
          setLoadedPrompt(currentActive);
        } else if (data.prompts.length > 0) {
          setPromptText(data.prompts[0].content);
          setLoadedPrompt(data.prompts[0]);
        } else {
          setPromptText('');
          setLoadedPrompt(null);
        }
      }
    } catch (err: any) {
      showToast('Impossible de charger l\'historique des prompts.', 'error');
    } finally {
      setLoadingPrompts(false);
    }
  };

  const handleOpenSavePromptDialog = () => {
    const hasRefNdaTag = promptText.includes('{{referenceNdaText}}');
    const hasClausierTag = promptText.includes('{{clausierJson}}');
    if (!hasRefNdaTag || !hasClausierTag) {
      showToast('Le prompt doit obligatoirement contenir les balises {{referenceNdaText}} et {{clausierJson}}.', 'error');
      return;
    }
    setPromptComment('');
    setSaveCommentDialogOpen(true);
  };

  const handleSavePromptConfirm = async () => {
    if (!promptComment.trim()) {
      showToast('Veuillez spécifier la description de la modification.', 'error');
      return;
    }

    setSaveCommentDialogOpen(false);
    setSavingPrompt(true);
    try {
      await api.updateAdminPrompt(adminPassword, promptText, promptComment.trim(), language);
      showToast('Prompt enregistré avec succès (une nouvelle version active a été créée).', 'success');
      setPromptsPage(1);
      await loadPrompts(language, 1);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Échec de l\'enregistrement du prompt.';
      showToast(errMsg, 'error');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleActivatePrompt = async (id: number, version: number) => {
    try {
      await api.activateAdminPrompt(adminPassword, id, language);
      showToast(`Version ${version} activée avec succès. Tous les autres prompts de cette langue ont été désactivés.`, 'success');
      setPromptsPage(1);
      await loadPrompts(language, 1);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Échec de l'activation du prompt.";
      showToast(errMsg, 'error');
    }
  };

  const hasRefNdaTag = promptText.includes('{{referenceNdaText}}');
  const hasClausierTag = promptText.includes('{{clausierJson}}');
  const isPromptValid = hasRefNdaTag && hasClausierTag;

  return (
    <Grid container spacing={3}>
      {/* Editor Card */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Card sx={{ backgroundColor: 'rgba(21, 30, 51, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Éditeur de Prompt ({language === 'fr' ? 'Français' : 'Anglais'})
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Version chargée : {loadedPrompt ? `Version ${loadedPrompt.version}` : 'Aucune'}
                  </Typography>
                  {loadedPrompt && activePrompt && loadedPrompt.id === activePrompt.id && (
                    <Chip label="Actif" color="success" size="small" sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }} />
                  )}
                </Box>
              </Box>
              <Box sx={{ alignSelf: 'center' }}>
                {!isPromptValid && (
                  <Chip label="Balises manquantes" color="error" size="small" sx={{ fontWeight: 700 }} />
                )}
                {isPromptValid && (
                  <Chip label="Prêt à sauvegarder" color="success" size="small" sx={{ fontWeight: 700 }} />
                )}
              </Box>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={16}
              variant="outlined"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Saisissez le prompt système ici..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  backgroundColor: 'rgba(10, 15, 25, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  '&:hover fieldset': {
                    borderColor: 'rgba(6, 182, 212, 0.4)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#06B6D4',
                  }
                }
              }}
            />

            {loadedPrompt && loadedPrompt.description && (
              <Box sx={{ p: 2, borderRadius: 1, backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.08)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Commentaire de cette version :
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                  {loadedPrompt.description}
                </Typography>
              </Box>
            )}

            {/* Validation Warnings */}
            <Stack spacing={1}>
              {!hasRefNdaTag && (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  La balise d'intégration du NDA de référence <code>{"{{referenceNdaText}}"}</code> est absente. Elle est obligatoire pour injecter le document de référence.
                </Alert>
              )}
              {!hasClausierTag && (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  La balise d'intégration des règles du clausier <code>{"{{clausierJson}}"}</code> est absente. Elle est obligatoire pour injecter les clauses actives.
                </Alert>
              )}
            </Stack>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              {loadedPrompt && activePrompt && loadedPrompt.id !== activePrompt.id && (
                <Button
                  variant="outlined"
                  color="success"
                  onClick={() => handleActivatePrompt(loadedPrompt.id, loadedPrompt.version)}
                  disabled={savingPrompt}
                  sx={{
                    borderColor: '#2e7d32',
                    color: '#4caf50',
                    fontWeight: 700,
                    '&:hover': {
                      borderColor: '#4caf50',
                      backgroundColor: 'rgba(76, 175, 80, 0.08)',
                    }
                  }}
                >
                  Activer
                </Button>
              )}
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => loadPrompts(language, 1)}
                disabled={savingPrompt}
              >
                Réinitialiser
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={savingPrompt ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleOpenSavePromptDialog}
                disabled={savingPrompt || !isPromptValid}
                sx={{
                  background: isPromptValid ? 'linear-gradient(90deg, #0891B2 0%, #06B6D4 100%)' : undefined,
                  color: isPromptValid ? '#0B0F19' : undefined,
                  fontWeight: 700,
                  '&:hover': isPromptValid ? {
                    boxShadow: '0 0 15px rgba(6, 182, 212, 0.6)',
                  } : {}
                }}
              >
                {savingPrompt ? 'Sauvegarde...' : 'Sauvegarder la version'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* History Card */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ backgroundColor: 'rgba(21, 30, 51, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon color="primary" /> Historique des versions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cliquez sur une version pour la charger dans l'éditeur afin de la modifier ou la réactiver.
            </Typography>

            {loadingPrompts ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={30} color="secondary" />
              </Box>
            ) : (
              <Stack spacing={2} sx={{ maxHeight: 420, overflowY: 'auto', pr: 1 }}>
                {promptsHistory.map((p) => {
                  const isActive = activePrompt ? p.id === activePrompt.id : p.is_current === 1;
                  return (
                    <Box
                      key={p.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: isActive ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: isActive ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Version {p.version}
                        </Typography>
                        {isActive && (
                          <Chip label="Actif" color="success" size="small" sx={{ fontWeight: 700, height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.disabled">
                        Créé le : {new Date(p.created_at).toLocaleString('fr-FR')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap', fontStyle: 'italic', backgroundColor: 'rgba(255,255,255,0.02)', p: 1, borderRadius: 1, border: '1px dashed rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                        {p.description || "Aucun commentaire"}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
                        <Button
                          size="small"
                          variant="text"
                          color="secondary"
                          onClick={() => {
                            setPromptText(p.content);
                            setLoadedPrompt(p);
                            showToast(`Version ${p.version} chargée dans l'éditeur.`, 'success');
                          }}
                          sx={{ textTransform: 'none', fontSize: '0.75rem', p: 0 }}
                        >
                          Charger dans l'éditeur
                        </Button>
                        {!isActive && (
                          <>
                            <Typography variant="caption" color="text.disabled">|</Typography>
                            <Button
                              size="small"
                              variant="text"
                              color="primary"
                              onClick={() => handleActivatePrompt(p.id, p.version)}
                              sx={{ textTransform: 'none', fontSize: '0.75rem', p: 0, fontWeight: 700 }}
                            >
                              Rendre actif
                            </Button>
                          </>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
                {promptsHistory.length === 0 && (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                    Aucun historique trouvé.
                  </Typography>
                )}
              </Stack>
            )}

            {/* Pagination Controls */}
            {!loadingPrompts && promptsTotalPages > 1 && (
              <Stack direction="row" spacing={0.5} sx={{ mt: 2, justifyContent: 'center', alignItems: 'center' }}>
                <IconButton
                  size="small"
                  disabled={promptsPage === 1}
                  onClick={() => loadPrompts(language, 1)}
                  title="Première page"
                  sx={{ color: 'primary.light' }}
                >
                  <FirstPageIcon />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={promptsPage === 1}
                  onClick={() => loadPrompts(language, promptsPage - 1)}
                  title="Page précédente"
                  sx={{ color: 'primary.light' }}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mx: 1.5 }}>
                  Page {promptsPage} sur {promptsTotalPages}
                </Typography>
                <IconButton
                  size="small"
                  disabled={promptsPage === promptsTotalPages}
                  onClick={() => loadPrompts(language, promptsPage + 1)}
                  title="Page suivante"
                  sx={{ color: 'primary.light' }}
                >
                  <ChevronRightIcon />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={promptsPage === promptsTotalPages}
                  onClick={() => loadPrompts(language, promptsTotalPages)}
                  title="Dernière page"
                  sx={{ color: 'primary.light' }}
                >
                  <LastPageIcon />
                </IconButton>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* SAVE PROMPT COMMENT DIALOG */}
      <Dialog open={saveCommentDialogOpen} onClose={() => setSaveCommentDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Commentaire de modification</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Veuillez spécifier la raison du changement ou décrire les modifications apportées à ce prompt (ex: "Correction du ton d'évaluation des clauses"). Le commentaire doit faire au moins 25 caractères.
          </Typography>
          <TextField
            fullWidth
            label="Description des modifications"
            multiline
            rows={3}
            value={promptComment}
            onChange={(e) => setPromptComment(e.target.value)}
            required
            placeholder="Entrez votre commentaire ici (min. 25 caractères)..."
            autoFocus
            error={promptComment.trim().length > 0 && promptComment.trim().length < 25}
            helperText={
              promptComment.trim().length < 25
                ? `Longueur minimale requise : 25 caractères (${promptComment.trim().length}/25)`
                : "Longueur valide !"
            }
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setSaveCommentDialogOpen(false)} color="inherit">
            Annuler
          </Button>
          <Button
            onClick={handleSavePromptConfirm}
            variant="contained"
            color="primary"
            disabled={promptComment.trim().length < 25}
            sx={{
              background: promptComment.trim().length >= 25 ? 'linear-gradient(90deg, #0891B2 0%, #06B6D4 100%)' : undefined,
              color: promptComment.trim().length >= 25 ? '#0B0F19' : undefined,
              fontWeight: 700,
            }}
          >
            Valider & Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default PromptsPanel;
