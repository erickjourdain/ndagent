import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { FileParserService } from '../services/file-parser.service.js';
import { OllamaService } from '../services/ollama.service.js';

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

      // 1. Read Reference files from disk (fallback to example files if not present)
      const referenceDir = getReferenceDir();
      const referenceNdaPath = path.join(referenceDir, 'reference-nda.txt');
      const referenceNdaExamplePath = path.join(referenceDir, 'reference-nda.example.txt');
      const clausierPath = path.join(referenceDir, 'clausier.json');
      const clausierExamplePath = path.join(referenceDir, 'clausier.example.json');

      let referenceNdaText = '';
      let clausierJson = { clauses: [] };

      try {
        referenceNdaText = await fs.readFile(referenceNdaPath, 'utf8');
      } catch (err) {
        try {
          referenceNdaText = await fs.readFile(referenceNdaExamplePath, 'utf8');
          console.log('Using reference-nda.example.txt fallback');
        } catch (exErr) {
          console.warn('Could not read reference-nda.txt or reference-nda.example.txt, using empty default:', exErr);
        }
      }

      try {
        const clausierRaw = await fs.readFile(clausierPath, 'utf8');
        clausierJson = JSON.parse(clausierRaw);
      } catch (err) {
        try {
          const clausierRaw = await fs.readFile(clausierExamplePath, 'utf8');
          clausierJson = JSON.parse(clausierRaw);
          console.log('Using clausier.example.json fallback');
        } catch (exErr) {
          console.warn('Could not read clausier.json or clausier.example.json, using empty default:', exErr);
        }
      }

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
        clausierJson
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
      const referenceDir = getReferenceDir();
      const referenceNdaPath = path.join(referenceDir, 'reference-nda.txt');
      const referenceNdaExamplePath = path.join(referenceDir, 'reference-nda.example.txt');
      const clausierPath = path.join(referenceDir, 'clausier.json');
      const clausierExamplePath = path.join(referenceDir, 'clausier.example.json');

      let referenceNda = '';
      try {
        referenceNda = await fs.readFile(referenceNdaPath, 'utf-8');
      } catch (err) {
        referenceNda = await fs.readFile(referenceNdaExamplePath, 'utf-8');
      }

      let clausier;
      try {
        const clausierRaw = await fs.readFile(clausierPath, 'utf-8');
        clausier = JSON.parse(clausierRaw);
      } catch (err) {
        const clausierRaw = await fs.readFile(clausierExamplePath, 'utf-8');
        clausier = JSON.parse(clausierRaw);
      }

      res.status(200).json({
        referenceNda,
        clausier: clausier.clauses || []
      });
    } catch (error: any) {
      console.error('Failed to load reference data:', error);
      res.status(500).json({ error: 'Échec de la récupération de la configuration des fichiers de référence.' });
    }
  }
}
