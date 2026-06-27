import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FileUploader from './FileUploader';

describe('FileUploader Component', () => {
  const onFileSelectMock = vi.fn();
  const onFileClearMock = vi.fn();

  beforeEach(() => {
    onFileSelectMock.mockClear();
    onFileClearMock.mockClear();
    vi.spyOn(window, 'alert').mockImplementation(() => { });
  });

  it('renders upload instructions when no file is selected', () => {
    render(
      <FileUploader
        selectedFile={null}
        onFileSelect={onFileSelectMock}
        onFileClear={onFileClearMock}
        isAnalyzing={false}
        uploadProgress={0}
      />
    );

    expect(screen.getByText('Glissez et déposez votre fichier NDA ici')).toBeInTheDocument();
    expect(screen.getByText("Prend en charge les formats PDF et DOCX jusqu'à 15 Mo")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Parcourir les fichiers' })).toBeInTheDocument();
  });

  it('renders file information when a file is selected', () => {
    const file = new File(['test data'], 'test_contract.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 * 2.5 }); // 2.5 MB

    render(
      <FileUploader
        selectedFile={file}
        onFileSelect={onFileSelectMock}
        onFileClear={onFileClearMock}
        isAnalyzing={false}
        uploadProgress={0}
      />
    );

    expect(screen.getByText('test_contract.pdf')).toBeInTheDocument();
    expect(screen.getByText('2.5 MB')).toBeInTheDocument();
    expect(screen.queryByText('Glissez et déposez votre fichier NDA ici')).not.toBeInTheDocument();
  });

  it('triggers onFileClear when clicking close icon', () => {
    const file = new File(['test data'], 'test.pdf', { type: 'application/pdf' });

    render(
      <FileUploader
        selectedFile={file}
        onFileSelect={onFileSelectMock}
        onFileClear={onFileClearMock}
        isAnalyzing={false}
        uploadProgress={0}
      />
    );

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    expect(onFileClearMock).toHaveBeenCalledTimes(1);
  });

  it('displays analysis progress bar and status when analyzing', () => {
    const file = new File(['test data'], 'test.pdf', { type: 'application/pdf' });

    render(
      <FileUploader
        selectedFile={file}
        onFileSelect={onFileSelectMock}
        onFileClear={onFileClearMock}
        isAnalyzing={true}
        uploadProgress={45}
      />
    );

    expect(screen.getByText('Analyse de conformité du NDA par Ollama...')).toBeInTheDocument();
    expect(screen.getByText('Téléchargement : 45%')).toBeInTheDocument();

    // In progress, close button should be hidden during analysis
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('displays static analysis text when download is 100% but still analyzing', () => {
    const file = new File(['test data'], 'test.pdf', { type: 'application/pdf' });

    render(
      <FileUploader
        selectedFile={file}
        onFileSelect={onFileSelectMock}
        onFileClear={onFileClearMock}
        isAnalyzing={true}
        uploadProgress={100}
      />
    );

    expect(screen.getByText('Analyse du document...')).toBeInTheDocument();
  });

  it('validates and accepts PDF and DOCX files', () => {
    const { container } = render(
      <FileUploader
        selectedFile={null}
        onFileSelect={onFileSelectMock}
        onFileClear={onFileClearMock}
        isAnalyzing={false}
        uploadProgress={0}
      />
    );

    // Get hidden file input
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    expect(input).toBeInTheDocument();

    // Trigger file change with a PDF
    const validFile = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [validFile] } });

    expect(onFileSelectMock).toHaveBeenCalledWith(validFile);
  });

  it('rejects unsupported file formats and alerts user', () => {
    const { container } = render(
      <FileUploader
        selectedFile={null}
        onFileSelect={onFileSelectMock}
        onFileClear={onFileClearMock}
        isAnalyzing={false}
        uploadProgress={0}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const invalidFile = new File(['dummy content'], 'image.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(onFileSelectMock).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(
      'Type de fichier non supporté. Veuillez charger un fichier PDF ou DOCX.'
    );
  });
});
