// src/engine/finalizer/closeOpenBlocks.ts
// ======================================
//
// NOTE:
// Despite the name, the original system has NO concept of open/closed blocks.
// The ONLY end-of-file finalization logic present in THEEditor.tsx
// is flushing pending blank lines.
//
// This function mirrors that behavior 1:1.
// No scene closure. No dialogue closure. No state cleanup.

export interface FinalizerLine {
  text: string;
  type: string;
}

/**
 * Flushes pending blank lines at end-of-file.
 * Matches applyEnterSpacingRules EOF behavior exactly.
 */
export function closeOpenBlocks(
  result: FinalizerLine[],
  pendingBlanks: FinalizerLine[],
): FinalizerLine[] {
  if (pendingBlanks.length > 0) {
    result.push(...pendingBlanks);
  }

  return result;
}
