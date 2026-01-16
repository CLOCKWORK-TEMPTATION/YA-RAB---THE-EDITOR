// src/editor/handlers/navigationHandlers.ts
// =======================================
// Navigation Handlers from THEEditor.tsx
//
// Responsibilities:
// - Handle cursor navigation
// - Jump to scenes/lines
// - Navigate search results
//
// NO search logic
// NO text manipulation

export interface NavigationHandlers {
  goToLine: (lineNumber: number) => void;
  goToScene: (sceneNumber: number) => void;
  nextScene: () => void;
  previousScene: () => void;
  jumpToPosition: (position: number) => void;
}

export function createNavigationHandlers(
  getText: () => string[],
  setCursorPosition: (position: number) => void,
  getCursorPosition: () => number,
  getSceneNumbers: () => number[]
): NavigationHandlers {
  
  function goToLine(lineNumber: number) {
    const text = getText();
    if (lineNumber < 0) lineNumber = 0;
    if (lineNumber >= text.length) lineNumber = text.length - 1;
    
    setCursorPosition(lineNumber);
  }

  function goToScene(sceneNumber: number) {
    const text = getText();
    const sceneRegex = /^\s*(?:مشهد|م\.|scene)\s*([0-9٠-٩]+)/i;
    
    let currentScene = 0;
    for (let i = 0; i < text.length; i++) {
      const match = text[i].match(sceneRegex);
      if (match) {
        currentScene = parseInt(match[1].replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), 10);
        if (currentScene === sceneNumber) {
          setCursorPosition(i);
          return;
        }
      }
    }
  }

  function nextScene() {
    const text = getText();
    const currentPos = getCursorPosition();
    const sceneRegex = /^\s*(?:مشهد|م\.|scene)\s*([0-9٠-٩]+)/i;
    
    for (let i = currentPos + 1; i < text.length; i++) {
      if (sceneRegex.test(text[i])) {
        setCursorPosition(i);
        return;
      }
    }
  }

  function previousScene() {
    const text = getText();
    const currentPos = getCursorPosition();
    const sceneRegex = /^\s*(?:مشهد|م\.|scene)\s*([0-9٠-٩]+)/i;
    
    for (let i = currentPos - 1; i >= 0; i--) {
      if (sceneRegex.test(text[i])) {
        setCursorPosition(i);
        return;
      }
    }
  }

  function jumpToPosition(position: number) {
    const text = getText();
    if (position < 0) position = 0;
    if (position >= text.length) position = text.length - 1;
    
    setCursorPosition(position);
  }

  return {
    goToLine,
    goToScene,
    nextScene,
    previousScene,
    jumpToPosition
  };
}
