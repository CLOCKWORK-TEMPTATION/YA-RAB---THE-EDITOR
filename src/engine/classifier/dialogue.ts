// src/engine/classifier/dialogue.ts
// =================================
// Dialogue Classifier (Pure)
//
// Determines whether a line can be Dialogue.
// Stateless. No flow. No state mutation.
// Dialogue block info is passed in, not computed here.

export interface DialogueBlockInfo {
  isInDialogueBlock: boolean;
  blockStartType: string | null;
  distanceFromCharacter: number;
}

const QUOTE_START_RE = /^[\s]*["«]/;
const ELLIPSIS_START_RE = /^[\s]*(\.\.\.|…)/;
const DASH_START_RE = /^[\s]*[-–—−‒―]/;

/**
 * Checks whether a line can be Dialogue.
 * @param rawLine Original line text
 * @param dialogueBlockInfo Dialogue block context
 */
export function isDialogue(
  rawLine: string,
  dialogueBlockInfo: DialogueBlockInfo,
): boolean {
  if (!rawLine) return false;

  const trimmed = rawLine.trim();
  if (!trimmed) return false;

  // Dialogue almost always lives inside a dialogue block
  if (!dialogueBlockInfo.isInDialogueBlock) {
    return false;
  }

  // 1) Dash inside dialogue block → continuation
  if (DASH_START_RE.test(rawLine)) {
    return true;
  }

  // 2) Ellipsis at start → continuation
  if (ELLIPSIS_START_RE.test(rawLine)) {
    return true;
  }

  // 3) Quotation marks
  if (QUOTE_START_RE.test(rawLine)) {
    return true;
  }

  // 4) Proximity to character line
  if (dialogueBlockInfo.distanceFromCharacter > 0 &&
      dialogueBlockInfo.distanceFromCharacter <= 3) {
    return true;
  }

  return false;
}
