// src/nlp/verbs.ts
import { normalizeLine } from "./normalization";

export const ACTION_VERBS = [
  "يدخل","يخرج","ينظر","يقف","يجلس","يمشي","يركض","يصرخ",
  "يبكي","يضحك","يفتح","يغلق","يقترب","يبتعد","يعود","يأتي",
  "يرفع","ينزل","يصعد","يسقط","ينهض","يستلقي"
];

export const ACTION_VERB_SET = new Set(ACTION_VERBS);

export const VERB_RE = new RegExp(
  `\\b(${ACTION_VERBS.join("|")})\\b`,
  "i"
);

export function isActionVerbStart(line: string): boolean {
  const normalized = normalizeLine(line);
  const firstWord = normalized.split(" ")[0];
  return ACTION_VERB_SET.has(firstWord);
}