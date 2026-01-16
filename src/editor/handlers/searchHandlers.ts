// src/editor/handlers/searchHandlers.ts
// =====================================
// Search Handlers from THEEditor.tsx
//
// Responsibilities:
// - Handle search operations
// - Navigate search results
// - Highlight matches
//
// NO classification logic
// NO state persistence

export interface SearchState {
  query: string;
  results: number[];
  currentIndex: number;
  isRegex: boolean;
  caseSensitive: boolean;
}

export interface SearchHandlers {
  findNext: () => void;
  findPrevious: () => void;
  replaceNext: (replacement: string) => void;
  replaceAll: (replacement: string) => void;
  clearSearch: () => void;
}

export function createSearchHandlers(
  getText: () => string[],
  setText: (text: string[]) => void,
  getCursorPosition: () => number,
  setCursorPosition: (position: number) => void,
  onSearchChange?: (state: SearchState) => void
): SearchHandlers & { getState: () => SearchState } {
  let searchState: SearchState = {
    query: '',
    results: [],
    currentIndex: -1,
    isRegex: false,
    caseSensitive: false
  };

  function performSearch() {
    const text = getText();
    const results: number[] = [];
    
    if (!searchState.query) {
      searchState.results = [];
      searchState.currentIndex = -1;
      onSearchChange?.(searchState);
      return;
    }

    const flags = searchState.caseSensitive ? 'g' : 'gi';
    const regex = searchState.isRegex 
      ? new RegExp(searchState.query, flags)
      : new RegExp(searchState.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

    text.forEach((line, index) => {
      if (regex.test(line)) {
        results.push(index);
      }
    });

    searchState.results = results;
    searchState.currentIndex = results.length > 0 ? 0 : -1;
    
    if (searchState.currentIndex >= 0) {
      setCursorPosition(searchState.results[searchState.currentIndex]);
    }
    
    onSearchChange?.(searchState);
  }

  function findNext() {
    if (searchState.results.length === 0) return;
    
    searchState.currentIndex = (searchState.currentIndex + 1) % searchState.results.length;
    setCursorPosition(searchState.results[searchState.currentIndex]);
    onSearchChange?.(searchState);
  }

  function findPrevious() {
    if (searchState.results.length === 0) return;
    
    searchState.currentIndex = searchState.currentIndex <= 0 
      ? searchState.results.length - 1 
      : searchState.currentIndex - 1;
    setCursorPosition(searchState.results[searchState.currentIndex]);
    onSearchChange?.(searchState);
  }

  function replaceNext(replacement: string) {
    if (searchState.currentIndex < 0 || searchState.results.length === 0) return;
    
    const text = getText();
    const lineIndex = searchState.results[searchState.currentIndex];
    
    const flags = searchState.caseSensitive ? 'g' : 'gi';
    const regex = searchState.isRegex 
      ? new RegExp(searchState.query, flags)
      : new RegExp(searchState.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    
    text[lineIndex] = text[lineIndex].replace(regex, replacement);
    setText(text);
    
    // Re-search after replacement
    performSearch();
  }

  function replaceAll(replacement: string) {
    if (!searchState.query) return;
    
    const text = getText();
    const flags = searchState.caseSensitive ? 'g' : 'gi';
    const regex = searchState.isRegex 
      ? new RegExp(searchState.query, flags)
      : new RegExp(searchState.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    
    const newText = text.map(line => line.replace(regex, replacement));
    setText(newText);
    
    searchState.results = [];
    searchState.currentIndex = -1;
    onSearchChange?.(searchState);
  }

  function clearSearch() {
    searchState.query = '';
    searchState.results = [];
    searchState.currentIndex = -1;
    onSearchChange?.(searchState);
  }

  function updateQuery(query: string) {
    searchState.query = query;
    performSearch();
  }

  function updateOptions(options: Partial<Pick<SearchState, 'isRegex' | 'caseSensitive'>>) {
    Object.assign(searchState, options);
    performSearch();
  }

  return {
    getState: () => ({ ...searchState }),
    findNext,
    findPrevious,
    replaceNext,
    replaceAll,
    clearSearch,
    updateQuery,
    updateOptions
  };
}
