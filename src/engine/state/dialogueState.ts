// src/engine/state/dialogueState.ts
// ================================
// Dialogue State (Read-only)
//
// Responsibilities:
// - Derive dialogue block info from previous types
//
// NO state mutation
// NO parsing
// NO flow logic
// NO side effects

export interface DialogueBlockInfo {
  isInDialogueBlock: boolean;
  blockStartType: string | null;
  distanceFromCharacter: number;
}

/**
 * Returns dialogue block info based on previous classified types.
 * Logic copied 1:1 from the monolith.
 */
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

    // Skip blanks
    if (type === "blank" || type === null) continue;

    // Breakers end dialogue block
    if (blockBreakers.includes(type)) {
      return {
        isInDialogueBlock: false,
        blockStartType: null,
        distanceFromCharacter: -1,
      };
    }

    // Character starts dialogue block
    if (type === "character") {
      distanceFromCharacter = currentIndex - i;
      return {
        isInDialogueBlock: true,
        blockStartType: "character",
        distanceFromCharacter,
      };
    }

    // Dialogue / Parenthetical → keep scanning
    if (dialogueBlockTypes.includes(type)) {
      continue;
    }

    // Action breaks dialogue block
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
