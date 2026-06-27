import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { FileParserService } from '../services/file-parser.service.js';
import { OllamaService } from '../services/ollama.service.js';
import { DatabaseService } from '../services/database.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get absolute path to backend reference folder
const getReferenceDir = () => {
  // src/controllers/analysis.controller.ts compiled to dist/controllers/analysis.controller.js
  // reference directory is at project root (../../reference)
  return path.join(__dirname, '..', '..', 'reference');
};

export class AnalysisController {
  /**
   * Upload and analyze a client NDA file (PDF or DOCX).
   */
  static async analyze(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'Veuillez charger un fichier NDA client (.pdf ou .docx).' });
        return;
      }

      const language = (req.body.language === 'en' || req.query.language === 'en') ? 'en' : 'fr';

      // 1. Read Reference files from disk (fallback to example files if not present)
      const referenceDir = getReferenceDir();
      const referenceNdaPath = path.join(referenceDir, language === 'en' ? 'reference-nda_en.txt' : 'reference-nda_fr.txt');
      const referenceNdaExamplePath = path.join(referenceDir, language === 'en' ? 'reference-nda_en.txt' : 'reference-nda_fr.example.txt');

      let referenceNdaText = '';

      try {
        referenceNdaText = await fs.readFile(referenceNdaPath, 'utf8');
      } catch (err) {
        try {
          referenceNdaText = await fs.readFile(referenceNdaExamplePath, 'utf8');
          console.log(`Using ${path.basename(referenceNdaExamplePath)} fallback`);
        } catch (exErr) {
          console.warn(`Could not read ${path.basename(referenceNdaPath)} or ${path.basename(referenceNdaExamplePath)}, using empty default:`, exErr);
        }
      }

      // Retrieve only active clauses from DatabaseService
      const activeClausesForAnalysis = await DatabaseService.getClauses(language, true);
      const clausierJson = { clauses: activeClausesForAnalysis };

      // 2. Parse client document
      console.log(`Parsing file ${file.originalname} (${file.mimetype})...`);
      const clientNdaText = await FileParserService.parseFile(file.buffer, file.mimetype);

      if (!clientNdaText || clientNdaText.trim().length === 0) {
        res.status(400).json({ error: 'Impossible d extraction du contenu texte du fichier chargé.' });
        return;
      }

      // 3. Call Ollama Analysis
      console.log('Sending text content to Ollama service for comparison...');
      const analysisResult = await OllamaService.analyzeNDA(
        clientNdaText,
        referenceNdaText,
        clausierJson,
        language
      );

      res.status(200).json(analysisResult);
    } catch (error: any) {
      console.error('Error during analysis:', error);
      res.status(500).json({ error: error.message || 'Une erreur interne est survenue lors de l analyse.' });
    }
  }

  /**
   * Fetch the current backend-stored Reference NDA and Clausier configurations.
   */
  static async getReferenceData(req: Request, res: Response): Promise<void> {
    try {
      const language = req.query.language === 'en' ? 'en' : 'fr';
      const referenceDir = getReferenceDir();
      const referenceNdaPath = path.join(referenceDir, language === 'en' ? 'reference-nda_en.txt' : 'reference-nda_fr.txt');
      const referenceNdaExamplePath = path.join(referenceDir, language === 'en' ? 'reference-nda_en.txt' : 'reference-nda_fr.example.txt');

      let referenceNda = '';
      try {
        referenceNda = await fs.readFile(referenceNdaPath, 'utf-8');
      } catch (err) {
        referenceNda = await fs.readFile(referenceNdaExamplePath, 'utf-8');
      }

      // Retrieve only active clauses from DatabaseService
      const activeClausesForViewer = await DatabaseService.getClauses(language, true);

      res.status(200).json({
        referenceNda,
        clausier: activeClausesForViewer
      });
    } catch (error: any) {
      console.error('Failed to load reference data:', error);
      res.status(500).json({ error: 'Échec de la récupération de la configuration des fichiers de référence.' });
    }
  }

  /**
   * Detect the language of an uploaded file.
   */
  static async detectLanguage(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'Veuillez charger un fichier.' });
        return;
      }

      console.log(`Detecting language for file ${file.originalname}...`);
      const text = await FileParserService.parseFile(file.buffer, file.mimetype);

      if (!text || text.trim().length === 0) {
        res.status(400).json({ error: 'Impossible d\'extraire le texte pour détecter la langue.' });
        return;
      }

      const detectedLang = FileParserService.detectLanguage(text);
      res.status(200).json({ language: detectedLang });
    } catch (error: any) {
      console.error('Error during language detection:', error);
      res.status(500).json({ error: error.message || 'Une erreur interne est survenue lors de la détection de la langue.' });
    }
  }
}
