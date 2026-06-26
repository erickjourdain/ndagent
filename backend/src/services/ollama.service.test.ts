import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaService } from './ollama.service.js';
import { DatabaseService } from './database.service.js';
import fs from 'fs/promises';

// Mock DatabaseService
vi.mock('./database.service.js', () => {
  return {
    DatabaseService: {
      getActivePrompt: vi.fn()
    }
  };
});

// Mock fs/promises
vi.mock('fs/promises', () => {
  return {
    default: {
      readFile: vi.fn()
    }
  };
});

describe('OllamaService', () => {
  const originalEnv = process.env;
  let fetchSpy: any;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    
    // Default mock response from Ollama
    const mockOllamaResponse = {
      message: {
        content: JSON.stringify({
          summary: 'Analysis summary mock',
          riskLevel: 'Low',
          overallAssessment: 'Overall assessment mock',
          clauses: [
            {
              id: 'c1',
              name: 'Confidentiality',
              status: 'Compliant',
              currentText: 'Client text',
              referenceText: 'Reference text',
              deviation: 'None',
              recommendation: 'None',
              proposal: 'Proposed text'
            }
          ]
        })
      }
    };

    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOllamaResponse
    });
    global.fetch = fetchSpy;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should successfully analyze NDA using database prompt and calculate context size', async () => {
    vi.mocked(DatabaseService.getActivePrompt).mockResolvedValue(
      'System: {{referenceNdaText}} {{clausierJson}}'
    );

    const clientNDA = 'Short Client NDA';
    const referenceNDA = 'Short Reference NDA';
    const clausier = { clauses: [{ id: 'c1', name: 'Confidentiality', active: true }] };

    const result = await OllamaService.analyzeNDA(clientNDA, referenceNDA, clausier, 'fr');

    expect(DatabaseService.getActivePrompt).toHaveBeenCalledWith('fr');
    expect(result.summary).toBe('Analysis summary mock');
    expect(result.clauses[0].id).toBe('c1');

    // Verify fetch call and check dynamic context window calculation
    expect(fetchSpy).toHaveBeenCalled();
    const fetchArgs = fetchSpy.mock.calls[0];
    const requestBody = JSON.parse(fetchArgs[1].body);
    
    expect(requestBody.model).toBe(process.env.OLLAMA_MODEL || 'gemma3:4b');
    expect(requestBody.options.temperature).toBe(0.1);
    
    // Input prompt is short: estimatedInputTokens is small, so num_ctx should be clamped to OLLAMA_NUM_CTX floor
    const minFloor = parseInt(process.env.OLLAMA_NUM_CTX || '10000', 10);
    expect(requestBody.options.num_ctx).toBe(minFloor);
  });

  it('should fallback to file system prompts when database has no prompt', async () => {
    vi.mocked(DatabaseService.getActivePrompt).mockResolvedValue(null);
    vi.mocked(fs.readFile).mockResolvedValue('Fallback template: {{referenceNdaText}} {{clausierJson}}');

    const result = await OllamaService.analyzeNDA('Client Text', 'Ref Text', {}, 'en');

    expect(DatabaseService.getActivePrompt).toHaveBeenCalledWith('en');
    expect(fs.readFile).toHaveBeenCalled();
    expect(result.summary).toBe('Analysis summary mock');
  });

  it('should adjust context size dynamically for very long prompts and clamp to maximum ceiling', async () => {
    vi.mocked(DatabaseService.getActivePrompt).mockResolvedValue('Template {{referenceNdaText}} {{clausierJson}}');

    // Simulate huge input text to force high context size calculation
    const longClientNDA = 'a'.repeat(90000); // 90000 characters => ~30000 tokens
    const referenceNDA = 'b'.repeat(15000);  // 15000 characters => ~5000 tokens
    const clausier = { clauses: [] };

    // Set floor to 10000 and max ceiling to 20000
    process.env.OLLAMA_NUM_CTX = '10000';
    process.env.OLLAMA_MAX_CTX = '20000';

    await OllamaService.analyzeNDA(longClientNDA, referenceNDA, clausier, 'fr');

    expect(fetchSpy).toHaveBeenCalled();
    const fetchArgs = fetchSpy.mock.calls[0];
    const requestBody = JSON.parse(fetchArgs[1].body);

    // Calculated required context would be: input (~35000 tokens) + output (4000 tokens) = ~39000.
    // It should be capped at OLLAMA_MAX_CTX ceiling of 20000.
    expect(requestBody.options.num_ctx).toBe(20000);
  });

  it('should throw an error if Ollama API responds with non-ok status', async () => {
    vi.mocked(DatabaseService.getActivePrompt).mockResolvedValue('Template');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    await expect(
      OllamaService.analyzeNDA('Client', 'Ref', {}, 'fr')
    ).rejects.toThrow("Le serveur Ollama a renvoyé le statut 500: Internal Server Error");
  });

  it('should throw an error if Ollama returns invalid JSON structure', async () => {
    vi.mocked(DatabaseService.getActivePrompt).mockResolvedValue('Template');
    
    // Mock response content that is not JSON
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: 'Plain text not JSON'
        }
      })
    });

    await expect(
      OllamaService.analyzeNDA('Client', 'Ref', {}, 'fr')
    ).rejects.toThrow("La sortie d'Ollama n'est pas conforme au format attendu.");
  });

  it('should throw an error if Ollama returns JSON that violates the Zod schema', async () => {
    vi.mocked(DatabaseService.getActivePrompt).mockResolvedValue('Template');
    
    // Mock response missing mandatory 'clauses' array
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: JSON.stringify({
            summary: 'Missing clauses',
            riskLevel: 'Low',
            overallAssessment: 'Assessment text'
          })
        }
      })
    });

    await expect(
      OllamaService.analyzeNDA('Client', 'Ref', {}, 'fr')
    ).rejects.toThrow("La sortie d'Ollama n'est pas conforme au format attendu.");
  });
});
