// src/ai/suggest.ts
export interface SuggestionRequest {
  context: string;
  cursorPosition: number;
  lastLines: string[];
}

export interface Suggestion {
  text: string;
  type: 'action' | 'dialogue' | 'character' | 'scene';
  confidence: number;
}

export async function getSuggestions(request: SuggestionRequest): Promise<Suggestion[]> {
  // TODO: Implement AI suggestion logic
  return [];
}