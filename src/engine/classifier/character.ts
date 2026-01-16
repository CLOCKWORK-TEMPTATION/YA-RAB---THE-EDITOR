// src/engine/classifier/character.ts
// ==================================
// Character Classifier (Pure)
//
// Determines whether a line can be classified as a Character line.
// Stateless. No flow. No state mutation.
// Context is passed in, not computed here.

export interface CharacterContext {
  isInDialogueBlock: boolean;
  lastNonBlankType: string | null;
}

const ARABIC_LETTER_RE = /[\u0600-\u06FF]/;

const CHARACTER_RE = new RegExp(
  "^\\s*(?:صوت\\s+)?[\\u0600-\\u06FF][\\u0600-\\u06FF\\s]{0,30}:?\\s*$",
);

/**
 * Checks whether a line is a Character line.
 * @param rawLine Original line text
 * @param ctx Context info (dialogue block, previous type)
 */
export function isCharacter(
  rawLine: string,
  ctx: CharacterContext,
): boolean {
  if (!rawLine) return false;

  const trimmed = rawLine.trim();
  if (!trimmed) return false;

  // Must contain Arabic letters
  if (!ARABIC_LETTER_RE.test(trimmed)) return false;

  // Too long to be a character name
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount > 7) return false;

  // Inside dialogue block:
  // - Character allowed only if previous was character
  if (ctx.isInDialogueBlock) {
    if (ctx.lastNonBlankType !== "character") {
      return false;
    }
  }

  // Regex shape check
  if (!CHARACTER_RE.test(trimmed)) return false;

  return true;
}
