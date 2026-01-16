// src/engine/flow/breakRules.ts
// =============================
// Break Rules (Flow-only)
//
// Responsibilities:
// - Determine whether classification should stop
// - Read dialogue block context from previous types
//
// NO classification
// NO state mutation
// NO flow orchestration
// NO side effects

// =============================
// Types
// =============================

export interface DialogueBlockInfo {
  isInDialogueBlock: boolean;
  blockStartType: string | null;
  distanceFromCharacter: number;
}

// =============================
// Helpers
// =============================

function getPrevNonBlankTypes(
  previousTypes: (string | null)[],
  currentIndex: number,
  count: number = 3,
): (string | null)[] {
  const result: (string | null)[] = [];

  for (let i = currentIndex - 1; i >= 0 && result.length < count; i++) {
    const type = previousTypes[i];
    if (type && type !== "blank") {
      result.push(type);
    }
  }

  return result;
}

// =============================
// Dialogue Block Detection
// =============================

export function getDialogueBlockInfo(
  previousTypes: (string | null)[],
  currentIndex: number,
): DialogueBlockInfo {
  const dialogueBlockTypes = ["character", "dialogue", "parenthetical"];
  const blockBreakers = [
    "scene-header-1",
    "scene-header-2",
    "scene-header-3",
    "scene-header-top-line",
    "transition",
    "basmala",
  ];

  let distanceFromCharacter = -1;

  for (let i = currentIndex - 1; i >= 0; i--) {
    const type = previousTypes[i];

    if (type === "blank" || type === null) continue;

    if (blockBreakers.includes(type)) {
      return {
        isInDialogueBlock: false,
        blockStartType: null,
        distanceFromCharacter: -1,
      };
    }

    if (type === "character") {
      distanceFromCharacter = currentIndex - i;
      return {
        isInDialogueBlock: true,
        blockStartType: "character",
        distanceFromCharacter,
      };
    }

    if (dialogueBlockTypes.includes(type)) {
      continue;
    }

    if (type === "action") {
      return {
        isInDialogueBlock: false,
        blockStartType: null,
        distanceFromCharacter: -1,
      };
    }
  }

  return {
    isInDialogueBlock: false,
    blockStartType: null,
    distanceFromCharacter: -1,
  };
}

// =============================
// Break Rules
// =============================

/**
 * Determines whether classification should stop immediately.
 * Used by classificationFlow to prevent further checks.
 */
export function shouldBreakClassification(
  currentType: string | null,
): boolean {
  if (!currentType) return false;

  const hardBreakTypes = [
    "scene-header-1",
    "scene-header-2",
    "scene-header-3",
    "scene-header-top-line",
    "transition",
    "basmala",
  ];

  return hardBreakTypes.includes(currentType);
}
