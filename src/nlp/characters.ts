// src/nlp/characters.ts
export const CHARACTER_RE =
/^[\u0600-\u06FF\s]{2,30}:?$/;

export function isCharacterLine(text: string): boolean {
  return CHARACTER_RE.test(text.trim());
}