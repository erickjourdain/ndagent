import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const OLLAMA_NUM_CTX = parseInt(process.env.OLLAMA_NUM_CTX || '20000', 10);

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
    clausierJson: any
  ): Promise<NDAAnalysisResponse> {
    const systemPrompt = `
      Tu es un conseiller juridique spécialisé en droit des contrats et propriété intellectuelle.

      Ton travail consiste à analyser un Accord de Non-Divulgation (NDA) d'un client de l'entreprise fourni par un utilisateur (NDA Client) par rapport à un modèle de référence (NDA de Référence) et un ensemble de règles de conformité (Clausier).
      Ton rôle consiste à protéger les intérêts de l'entreprise en évaluant le NDA Client et en identifiant les faiblesses qui pourraient nuire à l'entreprise.

      Tu dois évaluer la conformité du NDA Client en comparant chaque clause de celui-ci:
      1. Aux obligations légales minimales ou usuelles (définies implicitement par ton expertise).
      2. Aux exigences spécifiques ou formulations préférées contenues dans le Clausier.
      3. À la structure et au contenu du NDA de Référence.

      Toutes les explications rédigées (champs 'summary', 'overallAssessment', 'deviation', 'recommendation' et 'proposal') DOIVENT être rédigées en français.

      Tu dois impérativement retourner un objet JSON valide correspondant au schéma suivant :
      {
        "summary": "Court paragraphe en français résumant le risque global du NDA par rapport au NDA de Référence et au Clausier",
        "riskLevel": "Low" | "Medium" | "High",
        "overallAssessment": "Explication claire en français expliquant pourquoi ce niveau de risque a été choisi et les points critiques que l'utilisateur doit réviser. Pour chaque point critique tu founiras une entrée dans le tableau des clauses ci-dessous.",
        "clauses": [
          {
            "id": "La référence de la clause dans le NDA du client en se limitant à 10 caractères (ex: Article 1.1, Clause 2, Section 3.3). Ne pas intégrer le titre de l'article dans l'id",
            "name": "Nom de la clause",
            "status": "Compliant" | "Partially Compliant" | "Non-Compliant" | "Missing",
            "currentText": "Le texte exact de la clause trouvé dans le NDA Client (ou chaîne vide si manquant)",
            "referenceText": "La règle ou la formulation recommandée issue du clausier/NDA de référence",
            "deviation": "Analyse juridique détaillée en français comparant la formulation du client aux contraintes du clausier",
            "recommendation": "Conseil exploitable en français sur la manière de négocier ou de corriger cette clause",
            "proposal": "Proposition de formulation de la clause adaptée aux contraintes du clausier/NDA de référence",
          }
        ]
      }

      Assure-toi que la sortie est STRICTEMENT un JSON valide. 
      N'inclus pas de bloc markdown comme \`\`\`json. 
      Renvoie UNIQUEMENT la chaîne de caractères JSON.


      Voici les documents de référence :
      
      [TEXTE DU NDA DE RÉFÉRENCE]
      **********************************
      ${referenceNdaText}
      **********************************

      [CLAUSIER / RÈGLES DE CONFORMITÉ]
      **********************************
      ${JSON.stringify(clausierJson, null, 2)}
      **********************************
    `;

    const userPrompt = `

      Ci-dessous se trouve le texte du NDA Client à analyser :

      [NDA CLIENT A ANALYSER]
      **********************************
      ${clientNdaText}
      **********************************
    `;

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
          format: 'json',
          stream: false,
          options: {
            temperature: 0.1, // Keep it deterministic and factual
            num_ctx: OLLAMA_NUM_CTX // Increase context window size to allow larger prompts and responses
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

        const detailMessage = jsonErr instanceof z.ZodError
          ? jsonErr.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
          : jsonErr.message;

        const expectedFormat = `{
  "summary": "résumé en français",
  "riskLevel": "Low" | "Medium" | "High",
  "overallAssessment": "évaluation générale",
  "clauses": [
    {
      "id": "identifiant court (ex: Article 1.1)",
      "name": "nom de la clause",
      "status": "Compliant" | "Partially Compliant" | "Non-Compliant" | "Missing",
      "currentText": "texte client",
      "referenceText": "règle de référence",
      "deviation": "analyse de l'écart",
      "recommendation": "conseil de négociation",
      "proposal": "reformulation proposée"
    }
  ]
}`;
        throw new Error(`La sortie d'Ollama n'est pas conforme au format attendu.\nDétails : ${detailMessage}\nFormat attendu :\n${expectedFormat}`);
      }
    } catch (error: any) {
      console.error('Ollama communication error:', error);
      throw new Error(`Erreur d intégration Ollama: ${error.message}`);
    }
  }
}
