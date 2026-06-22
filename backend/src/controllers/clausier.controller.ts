import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get absolute path to backend reference folder
const getReferenceDir = () => {
  return path.join(__dirname, '..', '..', 'reference');
};

export interface Clause {
  id: string;
  name: string;
  description: string;
  criticality: 'High' | 'Medium' | 'Low';
  active?: boolean;
}

const getClausierPath = (language: string = 'fr') => {
  return path.join(getReferenceDir(), language === 'en' ? 'clausier_en.json' : 'clausier_fr.json');
};

const getClausierExamplePath = (language: string = 'fr') => {
  return path.join(getReferenceDir(), language === 'en' ? 'clausier_en.json' : 'clausier_fr.example.json');
};

async function readClausierFile(language: string = 'fr'): Promise<Clause[]> {
  const p = getClausierPath(language);
  const ep = getClausierExamplePath(language);
  let raw = '';
  try {
    raw = await fs.readFile(p, 'utf-8');
  } catch (err) {
    try {
      raw = await fs.readFile(ep, 'utf-8');
    } catch (exErr) {
      return [];
    }
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed.clauses || [];
  } catch {
    return [];
  }
}

async function writeClausierFile(clauses: Clause[], language: string = 'fr'): Promise<void> {
  const p = getClausierPath(language);
  const data = { clauses };
  await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf-8');
}

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
      const clauses = await readClausierFile(language);
      // Explicitly set active default to true for backward compatibility
      const formattedClauses = clauses.map(c => ({
        ...c,
        active: c.active !== false
      }));
      res.status(200).json(formattedClauses);
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

      const clauses = await readClausierFile(language);
      if (clauses.some(c => c.id.toLowerCase() === id.toLowerCase())) {
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

      clauses.push(newClause);
      await writeClausierFile(clauses, language);
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

      const clauses = await readClausierFile(language);
      const index = clauses.findIndex(c => c.id === id);
      if (index === -1) {
        res.status(404).json({ error: `La clause avec l'identifiant "${id}" n'existe pas.` });
        return;
      }

      // 1. Inactivate the original clause
      clauses[index].active = false;

      // 2. Generate next versioned ID for the new active clause
      const existingIds = clauses.map(c => c.id);
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

      clauses.push(newClause);
      await writeClausierFile(clauses, language);

      res.status(200).json({
        message: 'Clause modifiée avec succès. L\'ancienne version a été désactivée.',
        oldClause: clauses[index],
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

      const clauses = await readClausierFile(language);
      const index = clauses.findIndex(c => c.id === id);
      if (index === -1) {
        res.status(404).json({ error: `La clause avec l'identifiant "${id}" n'existe pas.` });
        return;
      }

      clauses[index].active = false;
      await writeClausierFile(clauses, language);

      res.status(200).json(clauses[index]);
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

      const clauses = await readClausierFile(language);
      const index = clauses.findIndex(c => c.id === id);
      if (index === -1) {
        res.status(404).json({ error: `La clause avec l'identifiant "${id}" n'existe pas.` });
        return;
      }

      clauses[index].active = true;
      await writeClausierFile(clauses, language);

      res.status(200).json(clauses[index]);
    } catch (error: any) {
      console.error('Failed to reactivate clause:', error);
      res.status(500).json({ error: 'Échec de la réactivation de la clause.' });
    }
  }
}
