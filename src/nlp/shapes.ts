// src/nlp/shapes.ts
export const SCENE_HEADER_RE = /^\s*(?:مشهد|scene)\s*\d+/i;
export const IN_OUT_RE = /(داخلي|خارجي)/i;
export const TIME_RE = /(ليل|نهار|صباح|مساء|فجر|عصر|مغرب|عشاء)/i;
export const TRANSITION_RE = /^(CUT TO:|FADE IN:|FADE OUT:|قطع|انتقال)/i;

export function hasSceneTimeOrInOut(text: string): boolean {
  return IN_OUT_RE.test(text) || TIME_RE.test(text);
}