import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseService } from './database.service.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('DatabaseService', () => {
  beforeAll(async () => {
    // Force test environment
    process.env.NODE_ENV = 'test';
    // Initialize the test database
    await DatabaseService.init();
  });

  afterAll(async () => {
    // Close the connection
    await DatabaseService.close();
    // Clean up data-test directory
    const testDbDir = path.join(__dirname, '..', '..', 'data-test');
    await fs.rm(testDbDir, { recursive: true, force: true });
  });

  it('should initialize and seed default prompts', async () => {
    const activeFr = await DatabaseService.getActivePrompt('fr');
    const activeEn = await DatabaseService.getActivePrompt('en');

    expect(activeFr).not.toBeNull();
    expect(activeEn).not.toBeNull();
    expect(typeof activeFr).toBe('string');
    expect(typeof activeEn).toBe('string');
  });

  it('should count prompts and fetch history', async () => {
    const countFr = await DatabaseService.getPromptCount('fr');
    expect(countFr).toBeGreaterThanOrEqual(1);

    const historyFr = await DatabaseService.getPromptHistory('fr', 5, 0);
    expect(historyFr.length).toBe(countFr);
    expect(historyFr[0].is_current).toBe(1);
  });

  it('should insert new prompts and make older ones inactive', async () => {
    const originalCount = await DatabaseService.getPromptCount('fr');
    const activeRowBefore = await DatabaseService.getActivePromptRow('fr');
    expect(activeRowBefore).not.toBeNull();

    const newPromptContent = 'Nouveau prompt de test';
    const inserted = await DatabaseService.addPrompt('fr', newPromptContent, 'Ajout de test');

    expect(inserted.content).toBe(newPromptContent);
    expect(inserted.version).toBe(activeRowBefore!.version + 1);
    expect(inserted.is_current).toBe(1);

    // Verify older one is now inactive
    const oldPrompt = await DatabaseService.getPromptHistory('fr', 10, 0);
    const prevPromptRow = oldPrompt.find(p => p.id === activeRowBefore!.id);
    expect(prevPromptRow).toBeDefined();
    expect(prevPromptRow!.is_current).toBe(0);

    const newCount = await DatabaseService.getPromptCount('fr');
    expect(newCount).toBe(originalCount + 1);

    const currentActiveContent = await DatabaseService.getActivePrompt('fr');
    expect(currentActiveContent).toBe(newPromptContent);
  });

  it('should activate a specific prompt version', async () => {
    const history = await DatabaseService.getPromptHistory('fr', 10, 0);
    expect(history.length).toBeGreaterThanOrEqual(2);

    // Find the first (older) version
    const firstVersion = history.find(p => p.version === 1);
    expect(firstVersion).toBeDefined();
    expect(firstVersion!.is_current).toBe(0);

    // Activate the first version
    await DatabaseService.activatePrompt(firstVersion!.id, 'fr');

    const activeRow = await DatabaseService.getActivePromptRow('fr');
    expect(activeRow).not.toBeNull();
    expect(activeRow!.version).toBe(1);
    expect(activeRow!.is_current).toBe(1);

    // Verify the previously active one is now inactive
    const updatedHistory = await DatabaseService.getPromptHistory('fr', 10, 0);
    const newerVersion = updatedHistory.find(p => p.version === 2);
    expect(newerVersion).toBeDefined();
    expect(newerVersion!.is_current).toBe(0);
  });

  describe('Clauses DB Operations', () => {
    it('should seed default clauses during initialization', async () => {
      const clausesFr = await DatabaseService.getClauses('fr');
      const clausesEn = await DatabaseService.getClauses('en');

      expect(clausesFr.length).toBeGreaterThan(0);
      expect(clausesEn.length).toBeGreaterThan(0);
      expect(clausesFr[0]).toHaveProperty('id');
      expect(clausesFr[0]).toHaveProperty('name');
      expect(clausesFr[0]).toHaveProperty('description');
      expect(clausesFr[0]).toHaveProperty('criticality');
      expect(clausesFr[0]).toHaveProperty('active');
    });

    it('should retrieve a clause by its ID', async () => {
      const clausesFr = await DatabaseService.getClauses('fr');
      const targetId = clausesFr[0].id;

      const clause = await DatabaseService.getClauseById(targetId, 'fr');
      expect(clause).not.toBeNull();
      expect(clause!.id).toBe(targetId);
      expect(clause!.name).toBe(clausesFr[0].name);
    });

    it('should insert a new clause successfully', async () => {
      const newClause = {
        id: 'test_clause_123',
        name: 'Clause de test',
        description: 'Description de la clause de test',
        criticality: 'Medium' as const,
        active: true
      };

      const inserted = await DatabaseService.addClause(newClause, 'fr');
      expect(inserted.id).toBe(newClause.id);
      expect(inserted.active).toBe(true);

      const retrieved = await DatabaseService.getClauseById(newClause.id, 'fr');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe(newClause.name);
    });

    it('should update clause active status', async () => {
      const clauseId = 'test_clause_123';
      
      // Deactivate it
      await DatabaseService.updateClauseStatus(clauseId, 'fr', false);
      let retrieved = await DatabaseService.getClauseById(clauseId, 'fr');
      expect(retrieved!.active).toBe(false);

      // Verify that getClauses with onlyActive=true filters it out
      const activeClauses = await DatabaseService.getClauses('fr', true);
      expect(activeClauses.some(c => c.id === clauseId)).toBe(false);

      // Reactivate it
      await DatabaseService.updateClauseStatus(clauseId, 'fr', true);
      retrieved = await DatabaseService.getClauseById(clauseId, 'fr');
      expect(retrieved!.active).toBe(true);
    });
  });
});
