// src/engine/classifier/transition.ts
// ===================================
// Transition Classifier (Pure)
//
// Detects transition lines.
// Stateless. Context-free.
// No flow. No state. No side effects.

const TRANSITION_RE =
  /^\s*(?:قطع|قطع\s+إلى|إلى|مزج|ذوبان|خارج\s+المشهد|CUT TO:|FADE IN:|FADE OUT:)\s*$/i;

/**
 * Checks whether a line is a Transition.
 * @param rawLine Original line text
 */
export function isTransition(rawLine: string): boolean {
  if (!rawLine) return false;

  const trimmed = rawLine.trim();
  if (!trimmed) return false;

  return TRANSITION_RE.test(trimmed);
}
