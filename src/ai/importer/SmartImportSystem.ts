// src/ai/importer/SmartImportSystem.ts
// ===================================
// AI-powered Import System
//
// Responsibilities:
// - Import various screenplay formats
// - Auto-detect format and encoding
// - Preserve original formatting
//
// NO parsing logic
// NO classification
// NO UI logic

export interface ImportOptions {
  format?: 'fdx' | 'fountain' | 'celtx' | 'pdf' | 'auto';
  encoding?: string;
  preserveFormatting?: boolean;
}

export interface ImportResult {
  text: string;
  format: string;
  metadata: {
    title?: string;
    author?: string;
    scenes: number;
    lines: number;
  };
  warnings: string[];
}

export class SmartImportSystem {
  /**
   * Import screenplay from file or text
   */
  async import(input: string | File, options?: ImportOptions): Promise<ImportResult> {
    if (typeof input === 'string') {
      return this.importText(input, options);
    } else {
      return this.importFile(input, options);
    }
  }

  private async importText(text: string, options?: ImportOptions): Promise<ImportResult> {
    const format = options?.format || this.detectFormat(text);
    
    switch (format) {
      case 'fountain':
        return this.parseFountain(text);
      case 'fdx':
        return this.parseFDX(text);
      default:
        return this.parsePlainText(text);
    }
  }

  private async importFile(file: File, options?: ImportOptions): Promise<ImportResult> {
    const text = await this.readFile(file, options?.encoding);
    return this.importText(text, options);
  }

  private detectFormat(text: string): string {
    // Format detection logic
    if (text.includes('<FinalDraft>') || text.includes('FinalDraft Document')) {
      return 'fdx';
    }
    if (text.match(/^\.+|^\s*INT\.|^\s*EXT\./m)) {
      return 'fountain';
    }
    return 'plain';
  }

  private parseFountain(text: string): ImportResult {
    // Fountain parsing implementation
    const lines = text.split('\n');
    const scenes = lines.filter(line => 
      line.match(/^(INT\.|EXT\.|I\.|E\.)/)
    ).length;

    return {
      text,
      format: 'fountain',
      metadata: {
        scenes,
        lines: lines.length
      },
      warnings: []
    };
  }

  private parseFDX(text: string): ImportResult {
    // FDX parsing implementation
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    
    const scenes = doc.querySelectorAll('Scene').length;
    const paragraphs = doc.querySelectorAll('Paragraph').length;

    return {
      text,
      format: 'fdx',
      metadata: {
        scenes,
        lines: paragraphs
      },
      warnings: []
    };
  }

  private parsePlainText(text: string): ImportResult {
    const lines = text.split('\n');
    
    return {
      text,
      format: 'plain',
      metadata: {
        lines: lines.length,
        scenes: 0
      },
      warnings: ['Unknown format - imported as plain text']
    };
  }

  private readFile(file: File, encoding?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file, encoding || 'utf-8');
    });
  }
}
