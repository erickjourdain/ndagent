import sqlite3 from 'sqlite3';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DbPrompt {
  id: number;
  language: 'fr' | 'en';
  version: number;
  content: string;
  created_at: string;
  is_current: number;
  description?: string;
}

export class DatabaseService {
  private static db: sqlite3.Database | null = null;

  private static getDataDir(): string {
    // Compiled file is in dist/services/database.service.js
    // Root is at ../.. relative to dist/services/
    return path.join(__dirname, '..', '..', 'data');
  }

  private static getPromptDir(): string {
    return path.join(__dirname, '..', '..', 'prompt');
  }

  /**
   * Initialize SQLite connection, build schemas, and seed prompts if necessary.
   */
  static async init(): Promise<void> {
    const dataDir = this.getDataDir();
    const dbPath = path.join(dataDir, 'ndagent.db');
    
    // Ensure the data directory exists
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      console.error('Failed to create data directory:', err);
    }

    // Check if the database file already exists
    let dbExists = false;
    try {
      await fs.access(dbPath);
      dbExists = true;
    } catch (e) {
      dbExists = false;
    }

    if (!dbExists) {
      // Look for a seed database
      const seedDbPath = path.join(__dirname, '..', '..', 'seed', 'ndagent.db');
      try {
        await fs.access(seedDbPath);
        await fs.copyFile(seedDbPath, dbPath);
        console.log(`[Database] Initialized active database by copying from seed at: ${seedDbPath}`);
      } catch (seedErr: any) {
        console.log(`[Database] No seed database found or failed to copy. Starting fresh: ${seedErr.message}`);
      }
    }

    console.log(`Connecting to SQLite database at: ${dbPath}`);

    return new Promise<void>((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, async (err) => {
        if (err) {
          console.error('Failed to connect to SQLite:', err);
          return reject(err);
        }

        try {
          await this.createSchema();
          await this.seedInitialPrompts();
          resolve();
        } catch (schemaErr) {
          reject(schemaErr);
        }
      });
    });
  }

  /**
   * Helper to run queries that don't return rows (INSERT, UPDATE, DELETE).
   */
  static run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * Helper to fetch a single row.
   */
  static get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  /**
   * Helper to fetch all rows.
   */
  static all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  /**
   * Create schema tables.
   */
  private static async createSchema(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        language TEXT NOT NULL,
        version INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_current INTEGER NOT NULL DEFAULT 0,
        description TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_prompts_lang_current ON prompts (language, is_current);
    `;

    return new Promise<void>((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));
      this.db.exec(createTableSql, (err) => {
        if (err) {
          console.error('Failed to create schema:', err);
          return reject(err);
        }

        // Try adding the column description if the table already existed without it
        this.db!.run('ALTER TABLE prompts ADD COLUMN description TEXT', (alterErr) => {
          if (alterErr && !alterErr.message.includes('duplicate column name')) {
            console.warn('Non-critical warning during schema migration:', alterErr.message);
          }
          resolve();
        });
      });
    });
  }

  /**
   * Seed the database with the initial prompt text files from /prompt if empty.
   */
  private static async seedInitialPrompts(): Promise<void> {
    const checkCount = await this.get<{ count: number }>('SELECT count(*) as count FROM prompts');
    if (checkCount && checkCount.count > 0) {
      console.log('Database already has prompts. Skipping seed.');
      return;
    }

    console.log('Prompts table is empty. Seeding defaults from disk...');
    const languages: ('fr' | 'en')[] = ['fr', 'en'];

    for (const lang of languages) {
      const promptDir = this.getPromptDir();
      const promptFileName = lang === 'en' ? 'system_prompt_en.txt' : 'system_prompt_fr.txt';
      const promptExampleFileName = lang === 'en' ? 'system_prompt_en.txt' : 'system_prompt_fr.example.txt';
      const promptPath = path.join(promptDir, promptFileName);
      const promptExamplePath = path.join(promptDir, promptExampleFileName);

      let content = '';
      try {
        content = await fs.readFile(promptPath, 'utf8');
      } catch (err) {
        try {
          content = await fs.readFile(promptExamplePath, 'utf8');
          console.log(`[Seed] Using ${promptExampleFileName} fallback for language "${lang}"`);
        } catch (exErr) {
          console.warn(`[Seed] Could not read default prompt file for "${lang}". Creating basic placeholder.`);
          content = lang === 'en' 
            ? 'Verify client NDA. Playbook: {{clausierJson}}, Reference NDA: {{referenceNdaText}}'
            : 'Vérifier le NDA client. Clausier: {{clausierJson}}, NDA de Référence: {{referenceNdaText}}';
        }
      }

      await this.run(
        `INSERT INTO prompts (language, version, content, is_current, description) VALUES (?, ?, ?, ?, ?)`,
        [lang, 1, content, 1, 'Initialisation du prompt par défaut']
      );
      console.log(`[Seed] Successfully seeded default prompt for language "${lang}" (v1)`);
    }
  }

  /**
   * Get the active prompt content for a specific language.
   */
  static async getActivePrompt(language: 'fr' | 'en'): Promise<string | null> {
    const row = await this.get<DbPrompt>(
      'SELECT content FROM prompts WHERE language = ? AND is_current = 1 ORDER BY version DESC LIMIT 1',
      [language]
    );
    return row ? row.content : null;
  }

  /**
   * Get the active prompt row for a specific language.
   */
  static async getActivePromptRow(language: 'fr' | 'en'): Promise<DbPrompt | null> {
    const row = await this.get<DbPrompt>(
      'SELECT id, language, version, content, datetime(created_at, "localtime") as created_at, is_current, description FROM prompts WHERE language = ? AND is_current = 1 LIMIT 1',
      [language]
    );
    return row || null;
  }

  /**
   * Get paginated version history for a specific language.
   */
  static async getPromptHistory(language: 'fr' | 'en', limit: number = 5, offset: number = 0): Promise<DbPrompt[]> {
    return this.all<DbPrompt>(
      'SELECT id, language, version, content, datetime(created_at, "localtime") as created_at, is_current, description FROM prompts WHERE language = ? ORDER BY version DESC LIMIT ? OFFSET ?',
      [language, limit, offset]
    );
  }

  /**
   * Get total prompt count for pagination calculation.
   */
  static async getPromptCount(language: 'fr' | 'en'): Promise<number> {
    const row = await this.get<{ count: number }>(
      'SELECT count(*) as count FROM prompts WHERE language = ?',
      [language]
    );
    return row ? row.count : 0;
  }

  /**
   * Add a new prompt version. Sets all previous versions to non-current.
   */
  static async addPrompt(language: 'fr' | 'en', content: string, description: string): Promise<DbPrompt> {
    // 1. Get latest version
    const latest = await this.get<{ version: number }>(
      'SELECT version FROM prompts WHERE language = ? ORDER BY version DESC LIMIT 1',
      [language]
    );
    
    const nextVersion = latest ? latest.version + 1 : 1;

    // 2. Set previous ones to is_current = 0
    await this.run(
      'UPDATE prompts SET is_current = 0 WHERE language = ?',
      [language]
    );

    // 3. Insert new current prompt
    const { lastID } = await this.run(
      'INSERT INTO prompts (language, version, content, is_current, description) VALUES (?, ?, ?, 1, ?)',
      [language, nextVersion, content, description]
    );

    const inserted = await this.get<DbPrompt>('SELECT * FROM prompts WHERE id = ?', [lastID]);
    if (!inserted) {
      throw new Error('Failed to retrieve newly inserted prompt');
    }

    return inserted;
  }

  /**
   * Activate a specific prompt version by id and language.
   * Sets all other prompts of the same language to non-current.
   */
  static async activatePrompt(id: number, language: 'fr' | 'en'): Promise<void> {
    // 1. Set all other prompts of the same language to non-current
    await this.run(
      'UPDATE prompts SET is_current = 0 WHERE language = ?',
      [language]
    );

    // 2. Set the target prompt to current
    await this.run(
      'UPDATE prompts SET is_current = 1 WHERE id = ? AND language = ?',
      [id, language]
    );
  }
}
