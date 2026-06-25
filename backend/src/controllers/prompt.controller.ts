import { Request, Response } from 'express';
import { DatabaseService } from '../services/database.service.js';

export class PromptController {
  /**
   * Get paginated prompt history for a specific language.
   */
  static async getPrompts(req: Request, res: Response): Promise<void> {
    try {
      const language = req.query.language === 'en' ? 'en' : 'fr';
      
      let page = parseInt(req.query.page as string, 10);
      if (isNaN(page) || page < 1) {
        page = 1;
      }

      let limit = parseInt(req.query.limit as string, 10);
      // Hard security limit: maximum of 5 prompts can be returned per query
      if (isNaN(limit) || limit > 5 || limit < 1) {
        limit = 5;
      }

      const offset = (page - 1) * limit;

      const total = await DatabaseService.getPromptCount(language);
      const history = await DatabaseService.getPromptHistory(language, limit, offset);
      const pages = Math.ceil(total / limit);
      const activePrompt = await DatabaseService.getActivePromptRow(language);

      res.status(200).json({
        prompts: history,
        total,
        page,
        pages,
        limit,
        activePrompt
      });
    } catch (error: any) {
      console.error('Failed to get prompts:', error);
      res.status(500).json({ error: 'Échec de la récupération des prompts.' });
    }
  }

  /**
   * Update (create a new version of) a prompt for a specific language.
   */
  static async updatePrompt(req: Request, res: Response): Promise<void> {
    try {
      const language = (req.body.language === 'en' || req.query.language === 'en') ? 'en' : 'fr';
      const { content, description } = req.body;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        res.status(400).json({ error: 'Le contenu du prompt est requis.' });
        return;
      }

      const comment = description || req.body.comment;
      if (!comment || typeof comment !== 'string' || comment.trim().length < 25) {
        res.status(400).json({ error: 'Le commentaire de modification doit faire au moins 25 caractères.' });
        return;
      }

      // Validation logic: Ensure the prompt has the two mandatory templates
      const hasReferenceNda = content.includes('{{referenceNdaText}}');
      const hasClausier = content.includes('{{clausierJson}}');

      if (!hasReferenceNda || !hasClausier) {
        let missing = [];
        if (!hasReferenceNda) missing.push('{{referenceNdaText}}');
        if (!hasClausier) missing.push('{{clausierJson}}');
        
        res.status(400).json({ 
          error: `Le prompt proposé est invalide car il lui manque le(s) champ(s) d'intégration obligatoire(s) suivant(s) : ${missing.join(', ')}.` 
        });
        return;
      }

      // Add to database (automatically disables the current version and sets this one as current)
      const newPrompt = await DatabaseService.addPrompt(language, content, comment);

      res.status(200).json({
        message: 'Prompt mis à jour avec succès.',
        prompt: newPrompt
      });
    } catch (error: any) {
      console.error('Failed to update prompt:', error);
      res.status(500).json({ error: 'Échec de la mise à jour du prompt.' });
    }
  }

  /**
   * Activate an old prompt version by ID.
   */
  static async activatePrompt(req: Request, res: Response): Promise<void> {
    try {
      const language = req.body.language === 'en' ? 'en' : 'fr';
      const id = parseInt(req.body.id, 10);

      if (isNaN(id) || id <= 0) {
        res.status(400).json({ error: 'Un identifiant de prompt valide (ID) est requis.' });
        return;
      }

      await DatabaseService.activatePrompt(id, language);

      res.status(200).json({
        message: 'Prompt activé avec succès. Tous les autres prompts de cette langue ont été désactivés.'
      });
    } catch (error: any) {
      console.error('Failed to activate prompt:', error);
      res.status(500).json({ error: 'Échec de l\'activation du prompt.' });
    }
  }
}
