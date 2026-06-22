import React, { useState, useRef } from 'react';
import { Box, Typography, Button, LinearProgress, IconButton } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloseIcon from '@mui/icons-material/Close';

interface FileUploaderProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onFileClear?: () => void;
  isAnalyzing: boolean;
  uploadProgress: number;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  selectedFile,
  onFileSelect,
  onFileClear,
  isAnalyzing,
  uploadProgress,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSelectFile = (file: File) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (validTypes.includes(file.type) || ['pdf', 'docx', 'doc'].includes(extension || '')) {
      onFileSelect(file);
    } else {
      alert('Type de fichier non supporté. Veuillez charger un fichier PDF ou DOCX.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const clearFile = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    if (onFileClear) {
      onFileClear();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleChange}
        disabled={isAnalyzing}
      />

      <Box
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        sx={{
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'divider',
          borderRadius: 4,
          p: 4,
          textAlign: 'center',
          backgroundColor: dragActive ? 'rgba(99, 102, 241, 0.05)' : 'rgba(21, 30, 51, 0.4)',
          cursor: isAnalyzing ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: isAnalyzing ? 'divider' : 'primary.light',
            backgroundColor: isAnalyzing ? 'rgba(21, 30, 51, 0.4)' : 'rgba(255, 255, 255, 0.01)',
          },
        }}
        onClick={isAnalyzing ? undefined : handleButtonClick}
      >
        {!selectedFile ? (
          <Box sx={{ py: 2 }}>
            <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Glissez et déposez votre fichier NDA ici
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Prend en charge les formats PDF et DOCX jusqu'à 15 Mo
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              disabled={isAnalyzing}
              onClick={(e) => {
                e.stopPropagation();
                handleButtonClick();
              }}
            >
              Parcourir les fichiers
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 3,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', textAlign: 'left' }}>
              <InsertDriveFileIcon sx={{ fontSize: 36, color: 'secondary.main', mr: 2 }} />
              <Box>
                <Typography variant="subtitle1" noWrap sx={{ maxWidth: 300, fontWeight: 600 }}>
                  {selectedFile.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(selectedFile.size)}
                </Typography>
              </Box>
            </Box>
            
            {!isAnalyzing && (
              <IconButton onClick={clearFile} size="small" sx={{ color: 'text.secondary' }}>
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        )}
      </Box>

      {isAnalyzing && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
              Analyse de conformité du NDA par Ollama...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {uploadProgress < 100 ? `Téléchargement : ${uploadProgress}%` : 'Analyse du document...'}
            </Typography>
          </Box>
          <LinearProgress
            variant={uploadProgress < 100 ? 'determinate' : 'indeterminate'}
            value={uploadProgress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.05)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundImage: 'linear-gradient(90deg, #6366F1 0%, #06B6D4 100%)',
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default FileUploader;
