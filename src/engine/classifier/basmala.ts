// src/engine/classifier/basmala.ts
// ================================
// Basmala Classifier (Pure)
//
// Detects Basmala lines.
// Stateless. Context-free.
// No flow. No state. No side effects.

const BASMALA_PATTERNS: RegExp[] = [
  // بسم الله الرحمن الرحيم
  /^\s*بسم\s+الله\s+الرحمن\s+الرحيم\s*$/,

  // مع أقواس أو زخرفة
  /^\s*[\(\[\{]*\s*بسم\s+الله\s+الرحمن\s+الرحيم\s*[\)\]\}]*\s*$/,

  // احتمالات مسافات غير منتظمة
  /^\s*بسم\s+الله\s+الرحمن\s+الرحيم\s*$/i,
];

/**
 * Checks whether a line is a Basmala.
 * @param rawLine Original line text
 */
export function isBasmala(rawLine: string): boolean {
  if (!rawLine) return false;

  const trimmed = rawLine.trim();
  if (!trimmed) return false;

  return BASMALA_PATTERNS.some((re) => re.test(trimmed));
}
