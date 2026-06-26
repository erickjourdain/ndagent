import dotenv from 'dotenv';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseService } from './database.service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getPromptDir = () => {
  // src/services/ollama.service.ts compiles to dist/services/ollama.service.js
  // prompt directory is at project root (../../prompt)
  return path.join(__dirname, '..', '..', 'prompt');
};

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const OLLAMA_KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || '1h';

export const ClauseAnalysisResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['Compliant', 'Partially Compliant', 'Non-Compliant', 'Missing']),
  currentText: z.string(),
  referenceText: z.string(),
  deviation: z.string(),
  recommendation: z.string(),
  proposal: z.string(),
});

export const NDAAnalysisResponseSchema = z.object({
  summary: z.string(),
  riskLevel: z.enum(['Low', 'Medium', 'High']),
  overallAssessment: z.string(),
  clauses: z.array(ClauseAnalysisResultSchema),
});

export type ClauseAnalysisResult = z.infer<typeof ClauseAnalysisResultSchema>;
export type NDAAnalysisResponse = z.infer<typeof NDAAnalysisResponseSchema>;

export class OllamaService {
  /**
   * Analyze the client NDA text against reference NDA and checklist rules.
   */
  static async analyzeNDA(
    clientNdaText: string,
    referenceNdaText: string,
    clausierJson: any,
    language: 'fr' | 'en' = 'fr'
  ): Promise<NDAAnalysisResponse> {
    let systemPromptTemplate = '';
    
    // Try to fetch active prompt from database first
    try {
      const dbPrompt = await DatabaseService.getActivePrompt(language);
      if (dbPrompt) {
        systemPromptTemplate = dbPrompt;
        console.log(`Using active system prompt from SQLite database for language "${language}"`);
      }
    } catch (dbErr) {
      console.warn('Failed to fetch prompt from database, falling back to file system:', dbErr);
    }

    // Fallback to filesystem if database prompt was not found or failed
    if (!systemPromptTemplate) {
      const promptDir = getPromptDir();
      const promptFileName = language === 'en' ? 'system_prompt_en.txt' : 'system_prompt_fr.txt';
      const promptExampleFileName = language === 'en' ? 'system_prompt_en.txt' : 'system_prompt_fr.example.txt';
      const promptPath = path.join(promptDir, promptFileName);
      const promptExamplePath = path.join(promptDir, promptExampleFileName);

      try {
        systemPromptTemplate = await fs.readFile(promptPath, 'utf8');
      } catch (err) {
        try {
          systemPromptTemplate = await fs.readFile(promptExamplePath, 'utf8');
          console.log(`Using ${promptExampleFileName} fallback`);
        } catch (exErr) {
          console.warn(`Could not read ${promptFileName} or ${promptExampleFileName}, using empty default:`, exErr);
        }
      }
    }

    const systemPrompt = systemPromptTemplate
      .replace('{{referenceNdaText}}', referenceNdaText)
      .replace('{{clausierJson}}', JSON.stringify(clausierJson, null, 2));

    const userPrompt = language === 'en'
      ? `
      Below is the Client NDA text to analyze:

      [CLIENT NDA TO ANALYZE]
      **********************************
      ${clientNdaText}
      **********************************
    `
      : `
      Ci-dessous se trouve le texte du NDA Client à analyser :

      [NDA CLIENT A ANALYSER]
      **********************************
      ${clientNdaText}
      **********************************
    `;

    const totalPromptChars = systemPrompt.length + userPrompt.length;
    const estimatedInputTokens = Math.ceil(totalPromptChars / 3);
    const expectedOutputTokens = 4000; // Reserved space for the JSON output report
    const calculatedCtx = estimatedInputTokens + expectedOutputTokens;

    const numCtxFloor = parseInt(process.env.OLLAMA_NUM_CTX || '12288', 10);
    const numCtxCeiling = parseInt(process.env.OLLAMA_MAX_CTX || '32768', 10);

    const finalNumCtx = Math.min(
      Math.max(calculatedCtx, numCtxFloor),
      numCtxCeiling
    );

    console.log(`Calcul du contexte dynamique : ${totalPromptChars} caractères -> ~${estimatedInputTokens} tokens d'entrée. num_ctx défini à ${finalNumCtx} (min: ${numCtxFloor}, max: ${numCtxCeiling})`);

    try {
      console.log('Lancement de l\'analyse du NDA...');
      const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          format: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              riskLevel: { type: 'string', enum: ['Low', 'Medium', 'High'] },
              overallAssessment: { type: 'string' },
              clauses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    status: { type: 'string', enum: ['Compliant', 'Partially Compliant', 'Non-Compliant', 'Missing'] },
                    currentText: { type: 'string' },
                    referenceText: { type: 'string' },
                    deviation: { type: 'string' },
                    recommendation: { type: 'string' },
                    proposal: { type: 'string' }
                  },
                  required: ['id', 'name', 'status', 'currentText', 'referenceText', 'deviation', 'recommendation', 'proposal']
                }
              }
            },
            required: ['summary', 'riskLevel', 'overallAssessment', 'clauses']
          },
          stream: false,
          keep_alive: OLLAMA_KEEP_ALIVE,
          options: {
            temperature: 0.1, // Keep it deterministic and factual
            num_ctx: finalNumCtx // Use dynamic context size to allow larger prompts and responses
          }
        }),
      });
      console.log('Analyse terminée');

      if (!response.ok) {
        throw new Error(`Le serveur Ollama a renvoyé le statut ${response.status}: ${response.statusText}`);
      }

      console.log('Récupération des données');
      const responseData: any = await response.json();
      const rawText = responseData.message?.content || '';

      try {
        const rawJson = JSON.parse(rawText);

        // Validation of NDAAnalysisResponse structure with Zod
        const parsedJson = NDAAnalysisResponseSchema.parse(rawJson);

        return parsedJson;
      } catch (jsonErr: any) {
        console.error('Failed to parse or validate JSON response from Ollama:', rawText, jsonErr);
        throw new Error('La sortie d\'Ollama n\'est pas conforme au format attendu.');
      }
    } catch (error: any) {
      console.error('Ollama communication error:', error);
      throw new Error(`Erreur d intégration Ollama: ${error.message}`);
    }
  }
}
