// src/engine/classifier/parenthetical.ts
// ======================================
// Parenthetical Classifier (Pure)
//
// Detects parenthetical lines by shape.
// Stateless. Context-free.
// No dialogue state. No flow. No side effects.

const PARENTHETICAL_SHAPE_RE = /^\s*\(.*?\)\s*$/;

/**
 * Checks whether a line is a Parenthetical.
 * @param rawLine Original line text
 */
export function isParenthetical(rawLine: string): boolean {
  if (!rawLine) return false;

  const trimmed = rawLine.trim();
  if (!trimmed) return false;

  return PARENTHETICAL_SHAPE_RE.test(trimmed);
}
