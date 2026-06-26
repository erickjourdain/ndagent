import { describe, it, expect, vi } from 'vitest';
import { FileParserService } from './file-parser.service.js';

vi.mock('pdf-parse', () => {
  return {
    default: vi.fn().mockImplementation((buffer: Buffer) => {
      if (buffer.toString() === 'trigger-error') {
        throw new Error('Mock PDF parse error');
      }
      return { text: 'Parsed PDF Content Mock' };
    })
  };
});

vi.mock('mammoth', () => {
  return {
    default: {
      extractRawText: vi.fn().mockImplementation(({ buffer }: { buffer: Buffer }) => {
        if (buffer.toString() === 'trigger-error') {
          throw new Error('Mock DOCX parse error');
        }
        return { value: 'Parsed DOCX Content Mock' };
      })
    }
  };
});

describe('FileParserService', () => {
  describe('detectLanguage', () => {
    it('should detect French language correctly', () => {
      const frenchText = "Ceci est un accord de confidentialité concernant le projet.";
      const lang = FileParserService.detectLanguage(frenchText);
      expect(lang).toBe('fr');
    });

    it('should detect English language correctly', () => {
      const englishText = "This is a confidentiality agreement between the parties.";
      const lang = FileParserService.detectLanguage(englishText);
      expect(lang).toBe('en');
    });

    it('should fallback to French if stopword counts are equal or zero', () => {
      const emptyText = "";
      const lang = FileParserService.detectLanguage(emptyText);
      expect(lang).toBe('fr');
    });
  });

  describe('parseFile', () => {
    it('should parse PDF correctly', async () => {
      const buffer = Buffer.from('hello pdf');
      const text = await FileParserService.parseFile(buffer, 'application/pdf');
      expect(text).toBe('Parsed PDF Content Mock');
    });

    it('should parse DOCX correctly', async () => {
      const buffer = Buffer.from('hello docx');
      const text = await FileParserService.parseFile(buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(text).toBe('Parsed DOCX Content Mock');
    });

    it('should throw an error for unsupported mime-types', async () => {
      const buffer = Buffer.from('hello plain text');
      await expect(
        FileParserService.parseFile(buffer, 'text/plain')
      ).rejects.toThrow('Unsupported file type: text/plain');
    });

    it('should wrap PDF parser errors correctly', async () => {
      const buffer = Buffer.from('trigger-error');
      await expect(
        FileParserService.parseFile(buffer, 'application/pdf')
      ).rejects.toThrow('Failed to parse PDF file: Mock PDF parse error');
    });

    it('should wrap DOCX parser errors correctly', async () => {
      const buffer = Buffer.from('trigger-error');
      await expect(
        FileParserService.parseFile(
          buffer,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
      ).rejects.toThrow('Failed to parse DOCX file: Mock DOCX parse error');
    });
  });
});
