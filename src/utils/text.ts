// src/utils/text.ts
export function normalizeLine(input: string): string {
  return input
    .replace(/[\u200E\u200F\u061C\uFEFF\t]/g, "")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripTashkeel(s: string): string {
  return s.replace(/[\u064B-\u065F\u0670]/g, "");
}

export function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

export function hasSentencePunctuation(s: string): boolean {
  return /[\.!\؟\?]/.test(s);
}

export function isBlank(line: string): boolean {
  return !line || line.trim() === "";
}

export function normalizeForAnalysis(input: string): string {
  return normalizeLine(input).replace(/^[\s\u200E\u200F\u061C\uFEFF]*[•·∙⋅●○◦■□▪▫◆◇]+\s*/, "");
}