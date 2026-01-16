// src/engine/classifier/sceneHeader.ts
// ===================================
// Scene Header Classifier (Pure)
//
// Determines whether a line can be a Scene Header.
// Stateless. No flow. No state mutation.
// Parsing & consumption are handled elsewhere.

const SCENE_PREFIX_RE =
  /^\s*(?:مشهد|م\.|scene)\s*([0-9٠-٩]+)\s*(?:[-–—:،]\s*)?(.*)$/i;

/**
 * Checks whether a line can be a Scene Header.
 * @param rawLine Original line text
 */
export function isSceneHeader(rawLine: string): boolean {
  if (!rawLine) return false;

  const trimmed = rawLine.trim();
  if (!trimmed) return false;

  return SCENE_PREFIX_RE.test(trimmed);
}
