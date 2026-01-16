// src/systems/state/AdvancedSearchEngine.ts
// ==========================================
// Advanced Search Engine
//
// Responsibilities:
// - Advanced search capabilities
// - Regex and pattern matching
// - Search result ranking
//
// NO document modification
// NO UI logic

export interface SearchQuery {
  text: string;
  type?: 'text' | 'regex' | 'fuzzy';
  caseSensitive?: boolean;
  wholeWord?: boolean;
  includeTypes?: string[];
  excludeTypes?: string[];
}

export interface SearchResult {
  line: number;
  content: string;
  type: string;
  matches: SearchMatch[];
  score: number;
}

export interface SearchMatch {
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export interface SearchOptions {
  maxResults?: number;
  threshold?: number;  // For fuzzy search
  context?: {
    before?: number;
    after?: number;
  };
}

export class AdvancedSearchEngine {
  private documents: Map<string, string[]> = new Map();
  private types: Map<string, string[]> = new Map();

  /**
   * Add document to search index
   */
  addDocument(id: string, lines: string[], types?: string[]): void {
    this.documents.set(id, lines);
    if (types) {
      this.types.set(id, types);
    }
  }

  /**
   * Remove document from search index
   */
  removeDocument(id: string): void {
    this.documents.delete(id);
    this.types.delete(id);
  }

  /**
   * Search across all documents
   */
  search(query: SearchQuery, options?: SearchOptions): SearchResult[] {
    const results: SearchResult[] = [];
    const maxResults = options?.maxResults || 100;

    for (const [docId, lines] of Array.from(this.documents.entries())) {
      const docTypes = this.types.get(docId);
      const docResults = this.searchDocument(lines, docTypes, query, options);
      results.push(...docResults.map(r => ({ ...r })));
      
      if (results.length >= maxResults) break;
    }

    // Sort by score and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Search specific document
   */
  searchDocument(
    lines: string[],
    types: string[] | undefined,
    query: SearchQuery,
    options?: SearchOptions
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const threshold = options?.threshold || 0.5;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const type = types?.[i];

      // Skip if type filters don't match
      if (query.includeTypes && type && !query.includeTypes.includes(type)) continue;
      if (query.excludeTypes && type && query.excludeTypes.includes(type)) continue;

      const matches = this.findMatches(line, query, threshold);
      if (matches.length > 0) {
        const score = this.calculateScore(matches, query, i, lines.length);
        results.push({
          line: i,
          content: line,
          type: type || 'unknown',
          matches,
          score
        });
      }
    }

    return results;
  }

  /**
   * Replace matches in document
   */
  replace(
    docId: string,
    query: SearchQuery,
    replacement: string,
    options?: { replaceAll?: boolean }
  ): { lines: string[]; replacements: number } {
    const lines = this.documents.get(docId);
    const types = this.types.get(docId);
    
    if (!lines) throw new Error(`Document ${docId} not found`);

    const newLines = [...lines];
    let replacements = 0;

    if (options?.replaceAll) {
      // Replace all matches
      for (let i = 0; i < newLines.length; i++) {
        const matches = this.findMatches(newLines[i], query);
        if (matches.length > 0) {
          newLines[i] = this.replaceMatches(newLines[i], matches, replacement);
          replacements += matches.length;
        }
      }
    } else {
      // Replace first match only
      for (let i = 0; i < newLines.length; i++) {
        const matches = this.findMatches(newLines[i], query);
        if (matches.length > 0) {
          newLines[i] = this.replaceMatches(newLines[i], [matches[0]], replacement);
          replacements = 1;
          break;
        }
      }
    }

    // Update document
    this.documents.set(docId, newLines);

    return { lines: newLines, replacements };
  }

  /**
   * Get search suggestions
   */
  getSuggestions(partial: string, limit: number = 10): string[] {
    const suggestions = new Set<string>();
    const partialLower = partial.toLowerCase();

    for (const lines of Array.from(this.documents.values())) {
      for (const line of lines) {
        // Extract words from line
        const words = line.match(/\b\w+\b/g) || [];
        
        for (const word of words) {
          if (word.toLowerCase().startsWith(partialLower) && word.length > partial.length) {
            suggestions.add(word);
          }
        }
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }

  private findMatches(line: string, query: SearchQuery, threshold: number = 0.5): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const searchLine = query.caseSensitive ? line : line.toLowerCase();
    const searchText = query.caseSensitive ? query.text : query.text.toLowerCase();

    switch (query.type) {
      case 'regex':
        try {
          const flags = query.caseSensitive ? 'g' : 'gi';
          const regex = new RegExp(searchText, flags);
          let match;
          
          while ((match = regex.exec(line)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              text: match[0],
              confidence: 1.0
            });
          }
        } catch (e) {
          // Invalid regex
        }
        break;

      case 'fuzzy':
        // Simple fuzzy matching - can be enhanced
        const words = line.split(/\s+/);
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const similarity = this.calculateSimilarity(searchText, word);
          
          if (similarity >= threshold) {
            const start = line.indexOf(word);
            matches.push({
              start,
              end: start + word.length,
              text: word,
              confidence: similarity
            });
          }
        }
        break;

      default:
        // Text search
        let index = searchLine.indexOf(searchText);
        while (index !== -1) {
          matches.push({
            start: index,
            end: index + query.text.length,
            text: line.substring(index, index + query.text.length),
            confidence: 1.0
          });
          index = searchLine.indexOf(searchText, index + 1);
        }
    }

    // Filter whole word matches if requested
    if (query.wholeWord) {
      return matches.filter(match => this.isWholeWord(line, match));
    }

    return matches;
  }

  private calculateScore(matches: SearchMatch[], query: SearchQuery, lineIndex: number, totalLines: number): number {
    let score = 0;

    // Base score from matches
    score += matches.reduce((sum, m) => sum + m.confidence, 0);

    // Bonus for exact matches
    const exactMatches = matches.filter(m => m.confidence === 1).length;
    score += exactMatches * 0.5;

    // Position bonus (earlier lines get slightly higher score)
    score += (1 - lineIndex / totalLines) * 0.1;

    // Type-specific bonuses (if applicable)
    // This could be extended based on the query context

    return score;
  }

  private replaceMatches(line: string, matches: SearchMatch[], replacement: string): string {
    // Replace matches from end to start to avoid index shifting
    const sortedMatches = matches.sort((a, b) => b.start - a.start);
    let result = line;

    for (const match of sortedMatches) {
      result = result.substring(0, match.start) + replacement + result.substring(match.end);
    }

    return result;
  }

  private isWholeWord(line: string, match: SearchMatch): boolean {
    const before = match.start === 0 || /\W/.test(line[match.start - 1]);
    const after = match.end === line.length || /\W/.test(line[match.end]);
    return before && after;
  }

  private calculateSimilarity(a: string, b: string): number {
    // Simple similarity calculation - can be enhanced with Levenshtein distance
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;

    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  // ==================== Methods for THEEditor handlers (glue layer) ====================

  /**
   * @method searchInContent
   * @description البحث في المحتوى - يُستخدم من handlers في THEEditor.tsx
   * @param content - النص الكامل للبحث فيه
   * @param searchTerm - مصطلح البحث
   * @returns Promise مع نتيجة البحث
   */
  async searchInContent(
    content: string,
    searchTerm: string
  ): Promise<{
    success: boolean;
    totalMatches?: number;
    matches?: Array<{ index: number; length: number }>;
    error?: string;
  }> {
    try {
      if (!searchTerm.trim()) {
        return { success: false, error: "مصطلح البحث فارغ" };
      }

      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escapedTerm, "gi");
      const matches: Array<{ index: number; length: number }> = [];
      let match;

      while ((match = regex.exec(content)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
        });
      }

      return {
        success: true,
        totalMatches: matches.length,
        matches,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * @method replaceInContent
   * @description الاستبدال في المحتوى - يُستخدم من handlers في THEEditor.tsx
   * @param content - النص الكامل
   * @param searchTerm - مصطلح البحث
   * @param replaceTerm - النص البديل
   * @returns Promise مع معلومات الاستبدال
   */
  async replaceInContent(
    content: string,
    searchTerm: string,
    replaceTerm: string
  ): Promise<{
    success: boolean;
    patternSource?: string;
    patternFlags?: string;
    replaceText?: string;
    replaceAll?: boolean;
    error?: string;
  }> {
    try {
      if (!searchTerm.trim()) {
        return { success: false, error: "مصطلح البحث فارغ" };
      }

      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      return {
        success: true,
        patternSource: escapedTerm,
        patternFlags: "gi",
        replaceText: replaceTerm,
        replaceAll: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
