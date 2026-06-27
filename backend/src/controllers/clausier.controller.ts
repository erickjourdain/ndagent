import { Request, Response, NextFunction } from 'express';
import { DatabaseService, Clause } from '../services/database.service.js';

export { Clause }; // Re-export Clause to ensure compatibility if other files import it from here

export class ClausierController {
  /**
   * Middleware to verify the administrator password.
   */
  static verifyAdmin(req: Request, res: Response, next: NextFunction): void {
    const password = req.headers['x-admin-password'] || req.body.password;
    const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (password !== correctPassword) {
      res.status(401).json({ error: 'Mot de passe administrateur incorrect.' });
      return;
    }
    next();
  }

  /**
   * Endpoint to verify only the admin password.
   */
  static async verify(req: Request, res: Response): Promise<void> {
    const { password } = req.body;
    const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (password === correctPassword) {
      res.status(200).json({ success: true });
    } else {
      res.status(401).json({ error: 'Mot de passe administrateur incorrect.' });
    }
  }

  /**
   * Get all clauses (active and inactive).
   */
  static async getClauses(req: Request, res: Response): Promise<void> {
    try {
      const language = req.query.language === 'en' ? 'en' : 'fr';
      const clauses = await DatabaseService.getClauses(language, false);
      res.status(200).json(clauses);
    } catch (error: any) {
      console.error('Failed to get clauses:', error);
      res.status(500).json({ error: 'Échec de la récupération des clauses.' });
    }
  }

  /**
   * Create a new clause.
   */
  static async createClause(req: Request, res: Response): Promise<void> {
    try {
      const language = (req.body.language === 'en' || req.query.language === 'en') ? 'en' : 'fr';
      const { id, name, description, criticality } = req.body;
      if (!id || !name || !description || !criticality) {
        res.status(400).json({ error: 'Tous les champs sont requis (id, name, description, criticality).' });
        return;
      }

      const existingClause = await DatabaseService.getClauseById(id, language);
      if (existingClause) {
        res.status(400).json({ error: `Une clause avec l'identifiant "${id}" existe déjà.` });
        return;
      }

      const newClause: Clause = {
        id,
        name,
        description,
        criticality,
        active: true
      };

      await DatabaseService.addClause(newClause, language);
      res.status(201).json(newClause);
    } catch (error: any) {
      console.error('Failed to create clause:', error);
      res.status(500).json({ error: 'Échec de la création de la clause.' });
    }
  }

  /**
   * Update an existing clause: deactivates the current one and creates a new versioned copy.
   */
  static async updateClause(req: Request, res: Response): Promise<void> {
    try {
      const language = (req.body.language === 'en' || req.query.language === 'en') ? 'en' : 'fr';
      const { id } = req.params;
      const { name, description, criticality } = req.body;

      if (!name || !description || !criticality) {
        res.status(400).json({ error: 'Tous les champs sont requis (name, description, criticality).' });
        return;
      }

      const existingClause = await DatabaseService.getClauseById(id, language);
      if (!existingClause) {
        res.status(404).json({ error: `La clause avec l'identifiant "${id}" n'existe pas.` });
        return;
      }

      // 1. Inactivate the original clause
      await DatabaseService.updateClauseStatus(id, language, false);
      const updatedOldClause = { ...existingClause, active: false };

      // 2. Generate next versioned ID for the new active clause
      const allClauses = await DatabaseService.getClauses(language, false);
      const existingIds = allClauses.map(c => c.id);
      let baseId = id;
      let version = 1;

      const match = id.match(/^(.*)_v(\d+)$/);
      if (match) {
        baseId = match[1];
        version = parseInt(match[2], 10);
      }

      let newId = `${baseId}_v${version + 1}`;
      while (existingIds.includes(newId)) {
        version++;
        newId = `${baseId}_v${version + 1}`;
      }

      // 3. Create the new clause
      const newClause: Clause = {
        id: newId,
        name,
        description,
        criticality,
        active: true
      };

      await DatabaseService.addClause(newClause, language);

      res.status(200).json({
        message: 'Clause modifiée avec succès. L\'ancienne version a été désactivée.',
        oldClause: updatedOldClause,
        newClause
      });
    } catch (error: any) {
      console.error('Failed to update clause:', error);
      res.status(500).json({ error: 'Échec de la modification de la clause.' });
    }
  }

  /**
   * Deactivate a clause.
   */
  static async deactivateClause(req: Request, res: Response): Promise<void> {
    try {
      const language = req.query.language === 'en' ? 'en' : 'fr';
      const { id } = req.params;

      const existingClause = await DatabaseService.getClauseById(id, language);
      if (!existingClause) {
        res.status(404).json({ error: `La clause avec l'identifiant "${id}" n'existe pas.` });
        return;
      }

      await DatabaseService.updateClauseStatus(id, language, false);
      const updatedClause = { ...existingClause, active: false };

      res.status(200).json(updatedClause);
    } catch (error: any) {
      console.error('Failed to deactivate clause:', error);
      res.status(500).json({ error: 'Échec de la désactivation de la clause.' });
    }
  }

  /**
   * Reactivate a clause.
   */
  static async reactivateClause(req: Request, res: Response): Promise<void> {
    try {
      const language = req.query.language === 'en' ? 'en' : 'fr';
      const { id } = req.params;

      const existingClause = await DatabaseService.getClauseById(id, language);
      if (!existingClause) {
        res.status(404).json({ error: `La clause avec l'identifiant "${id}" n'existe pas.` });
        return;
      }

      await DatabaseService.updateClauseStatus(id, language, true);
      const updatedClause = { ...existingClause, active: true };

      res.status(200).json(updatedClause);
    } catch (error: any) {
      console.error('Failed to reactivate clause:', error);
      res.status(500).json({ error: 'Échec de la réactivation de la clause.' });
    }
  }
}
