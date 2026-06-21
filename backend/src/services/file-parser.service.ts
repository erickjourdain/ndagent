import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export class FileParserService {
  /**
   * Parse a buffer based on mime type and return extracted text.
   */
  static async parseFile(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      return this.parsePdf(buffer);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      return this.parseDocx(buffer);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  /**
   * Extract text from PDF buffer.
   */
  private static async parsePdf(buffer: Buffer): Promise<string> {
    try {
      const data = await pdf(buffer);
      return data.text || '';
    } catch (error: any) {
      throw new Error(`Failed to parse PDF file: ${error.message}`);
    }
  }

  /**
   * Extract text from DOCX buffer.
   */
  private static async parseDocx(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (error: any) {
      throw new Error(`Failed to parse DOCX file: ${error.message}`);
    }
  }
}
