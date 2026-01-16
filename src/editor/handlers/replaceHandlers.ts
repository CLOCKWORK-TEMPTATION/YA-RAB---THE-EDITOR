// src/editor/handlers/replaceHandlers.ts
// ======================================
// Replace Handlers from THEEditor.tsx
//
// Responsibilities:
// - Handle replace operations
// - Track replace history
// - Validate replacements
//
// NO search logic
// NO state persistence

export interface ReplaceOperation {
  from: string;
  to: string;
  position: number;
  timestamp: number;
}

export interface ReplaceHandlers {
  replaceAt: (position: number, replacement: string) => void;
  replaceInSelection: (replacement: string) => void;
  undoLastReplace: () => void;
  getReplaceHistory: () => ReplaceOperation[];
}

export function createReplaceHandlers(
  getText: () => string[],
  setText: (text: string[]) => void,
  getSelection: () => { start: number; end: number } | null
): ReplaceHandlers {
  const replaceHistory: ReplaceOperation[] = [];

  function replaceAt(position: number, replacement: string) {
    const text = getText();
    if (position < 0 || position >= text.length) return;
    
    const originalLine = text[position];
    text[position] = replacement;
    setText(text);
    
    replaceHistory.push({
      from: originalLine,
      to: replacement,
      position,
      timestamp: Date.now()
    });
    
    // Keep history size manageable
    if (replaceHistory.length > 100) {
      replaceHistory.splice(0, 50);
    }
  }

  function replaceInSelection(replacement: string) {
    const selection = getSelection();
    if (!selection) return;
    
    const text = getText();
    const { start, end } = selection;
    
    // Replace each line in selection
    for (let i = start; i <= end && i < text.length; i++) {
      const originalLine = text[i];
      text[i] = replacement;
      
      replaceHistory.push({
        from: originalLine,
        to: replacement,
        position: i,
        timestamp: Date.now()
      });
    }
    
    setText(text);
    
    // Keep history size manageable
    if (replaceHistory.length > 100) {
      replaceHistory.splice(0, 50);
    }
  }

  function undoLastReplace() {
    if (replaceHistory.length === 0) return;
    
    const lastOperation = replaceHistory.pop()!;
    const text = getText();
    
    if (lastOperation.position < text.length) {
      text[lastOperation.position] = lastOperation.from;
      setText(text);
    }
  }

  function getReplaceHistory() {
    return [...replaceHistory];
  }

  return {
    replaceAt,
    replaceInSelection,
    undoLastReplace,
    getReplaceHistory
  };
}
