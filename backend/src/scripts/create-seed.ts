import sqlite3 from 'sqlite3';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const seedDir = path.join(__dirname, '..', '..', 'seed');
  const promptDir = path.join(__dirname, '..', '..', 'prompt');
  const referenceDir = path.join(__dirname, '..', '..', 'reference');
  
  // Ensure seed directory exists
  await fs.mkdir(seedDir, { recursive: true });
  
  const dbPath = path.join(seedDir, 'ndagent.db');
  
  // Delete old seed db if exists to ensure a clean rebuild
  try {
    await fs.unlink(dbPath);
  } catch {}

  console.log(`Creating seed database at: ${dbPath}`);

  const db = new sqlite3.Database(dbPath);

  // Helper to run query
  const execQuery = (sql: string) => {
    return new Promise<void>((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  // Helper to run query with params
  const runQuery = (sql: string, params: any[]) => {
    return new Promise<void>((resolve, reject) => {
      db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  try {
    // Create schema
    await execQuery(`
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

      CREATE TABLE IF NOT EXISTS clauses (
        id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        criticality TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        language TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, language)
      );
      CREATE INDEX IF NOT EXISTS idx_clauses_lang_active ON clauses (language, active);
    `);

    console.log('Schema created successfully in seed database.');

    const languages: ('fr' | 'en')[] = ['fr', 'en'];

    // 1. Seed Prompts
    for (const lang of languages) {
      const promptFileName = lang === 'en' ? 'system_prompt_en.txt' : 'system_prompt_fr.txt';
      const promptPath = path.join(promptDir, promptFileName);
      
      let content = '';
      try {
        content = await fs.readFile(promptPath, 'utf8');
      } catch (err) {
        console.error(`Failed to read prompt file at ${promptPath}:`, err);
        throw err;
      }

      await runQuery(
        `INSERT INTO prompts (language, version, content, is_current, description) VALUES (?, ?, ?, ?, ?)`,
        [lang, 1, content, 1, 'Initialisation du prompt par défaut']
      );
      console.log(`Seeded prompt for language "${lang}" into seed database.`);
    }

    // 2. Seed Clauses
    for (const lang of languages) {
      const clausesFileName = `clausier_${lang}.json`;
      const clausesExampleFileName = `clausier_${lang}.example.json`;
      const clausesPath = path.join(referenceDir, clausesFileName);
      const clausesExamplePath = path.join(referenceDir, clausesExampleFileName);

      let raw = '';
      try {
        raw = await fs.readFile(clausesPath, 'utf8');
      } catch (err) {
        try {
          raw = await fs.readFile(clausesExamplePath, 'utf8');
          console.log(`[Seed] Using ${clausesExampleFileName} fallback for clauses language "${lang}"`);
        } catch (exErr) {
          console.error(`Failed to read clauses or example file for "${lang}":`, exErr);
          throw exErr;
        }
      }

      const parsed = JSON.parse(raw);
      const clauses = parsed.clauses || [];

      for (const c of clauses) {
        await runQuery(
          `INSERT OR REPLACE INTO clauses (id, name, description, criticality, active, language) VALUES (?, ?, ?, ?, ?, ?)`,
          [c.id, c.name, c.description, c.criticality, c.active !== false ? 1 : 0, lang]
        );
      }
      console.log(`Seeded ${clauses.length} example clauses for language "${lang}" into seed database.`);
    }

    db.close((err) => {
      if (err) console.error('Error closing database:', err);
      else console.log('Seed database closed successfully.');
    });

  } catch (err) {
    console.error('Failed to create seed database:', err);
    db.close();
    process.exit(1);
  }
}

run();
