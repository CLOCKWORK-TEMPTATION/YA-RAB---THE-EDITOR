// src/nlp/normalization.ts
export function stripTashkeel(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670]/g, "");
}

export function normalizeLine(input: string): string {
  return stripTashkeel(input)
    .replace(/[\u200E\u200F\u061C\uFEFF\t]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeForAnalysis(input: string): string {
  return normalizeLine(input)
    .replace(/^[\-\–\—\:\،\.\(\)\[\]\n\r]+/, "")
    .replace(/[\-\–\—\:\،\.\(\)\[\]\n\r]+$/, "")
    .trim();
}