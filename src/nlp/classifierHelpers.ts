// src/nlp/classifierHelpers.ts
// ============================================
// Classifier Helper Functions
//
// These functions are used by ScoringSystem to determine
// if a line matches certain patterns for classification.
//
// Extracted from THEditor.tsx

/**
 * Check if a line starts with a dash/hyphen character
 * Used for detecting dialogue continuation or action lines
 */
export function startsWithDash(rawLine: string): boolean {
  return /^[\s]*[-–—−‒―]/.test(rawLine);
}

/**
 * Check if normalized text starts with an Arabic action verb
 * These verbs indicate action lines in Arabic screenplays
 */
export function isActionVerbStart(normalized: string): boolean {
  const actionVerbs = [
    "يدخل",
    "يخرج",
    "يقف",
    "يجلس",
    "ينظر",
    "يتحرك",
    "يقترب",
    "يبتعد",
    "يركض",
    "يمشي",
    "يتحدث",
    "يصرخ",
    "يرفع",
    "ينهض",
    "يميل",
    "يلتفت",
    "يسقط",
    "يرتمي",
    "يستيقظ",
    "ينام",
    "يفتح",
    "يغلق",
    "يبدأ",
    "ينتهي",
    "يتجه",
    "يعود",
    "يغادر",
    "يبكي",
    "يضحك",
    "يريد",
    "يفكر",
    "يتذكر",
    "نسير",
    "نرى",
    "نسمع",
    "نشاهد",
    "نلاحظ",
    "ننتقل",
    "نتابع",
  ];

  const trimmed = normalized.trim();
  for (const verb of actionVerbs) {
    if (trimmed.startsWith(verb)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if line matches action start patterns
 * Includes dash patterns and other action indicators
 */
export function matchesActionStartPattern(normalized: string): boolean {
  // Pattern: starts with dash (after whitespace)
  if (/^[\s]*[-–—−‒―]/.test(normalized)) {
    return true;
  }

  return false;
}

/**
 * Check if line is a scene header
 * Looks for scene patterns like "مشهد 1", locations, or time indicators
 */
export function isSceneHeaderStart(normalized: string): boolean {
  // Scene number patterns
  if (/^(?:مشهد|م\.|scene)\s*[0-9٠-٩]+/i.test(normalized)) {
    return true;
  }

  // Interior/Exterior patterns
  if (/^(?:داخلي|خارجي|د\.|خ\.)/i.test(normalized)) {
    return true;
  }

  // Time indicators
  const timeWords = [
    "ليل",
    "نهار",
    "صباح",
    "مساء",
    "فجر",
    "ظهر",
    "عصر",
    "مغرب",
    "عشاء",
    "الغروب",
    "الفجر",
    "الظهر",
    "العصر",
    "المغرب",
  ];
  for (const word of timeWords) {
    if (normalized.includes(word)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if line is a transition
 * Looks for transition words like "إلى", "من", "متابعة", etc.
 */
export function isTransition(line: string): boolean {
  const trimmed = line.trim();

  const transitionPatterns = [
    /^(?:إلى|من)\s+/i,
    /^(?:متابعة|المتابعة|متابعة:)/i,
    /^CUT\s*TO:?$/i,
    /^FADE\s*(?:IN|OUT):?$/i,
    /^DISSOLVE\s*TO:?$/i,
    /^IRIS\s*(?:IN|OUT)$/i,
    /^WIPE\s*TO:?$/i,
    /^JUMP\s*CUT\s*TO:?$/i,
    /^SMASH\s*CUT\s*TO:?$/i,
  ];

  for (const pattern of transitionPatterns) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if line looks like a character name
 * Character lines are short and often end with colon
 */
export function isCharacterLine(line: string): boolean {
  const trimmed = line.trim().replace(/[:：\s]+$/, "");

  // Must be 1-20 characters, mostly Arabic or Latin letters
  if (trimmed.length < 1 || trimmed.length > 20) {
    return false;
  }

  // Should be primarily letters (Arabic or Latin)
  const letterPattern = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z\s]+$/;
  if (!letterPattern.test(trimmed)) {
    return false;
  }

  return true;
}

/**
 * Check if line is likely an action line
 * Action lines are typically longer and don't end with colon
 */
export function isLikelyAction(line: string): boolean {
  const trimmed = line.trim();

  // Empty lines aren't action
  if (!trimmed) {
    return false;
  }

  // Character-like (short, ends with colon) aren't action
  if (trimmed.length <= 20 && /[:：]$/.test(trimmed)) {
    return false;
  }

  // Very long lines are likely action (descriptions)
  if (trimmed.length > 10) {
    return true;
  }

  return false;
}

/**
 * Check if line is basmala (بسم الله الرحمن الرحيم)
 */
export function isBasmala(line: string): boolean {
  const normalized = line.trim();
  const basmalaPatterns = [
    /^بسم\s+الله\s+الرحمن\s+الرحيم$/i,
    /^[{}]*\s*بسم\s+الله\s+الرحمن\s+الرحيم\s*[{}]*$/i,
  ];
  return basmalaPatterns.some((pattern) => pattern.test(normalized));
}

/**
 * All classifier helpers as a single object
 * Can be passed directly to setClassifierHelpers()
 */
export const classifierHelpers = {
  isActionVerbStart,
  matchesActionStartPattern,
  isSceneHeaderStart,
  isTransition,
  isCharacterLine,
  isLikelyAction,
} as const;

export type ClassifierHelperFunctions = typeof classifierHelpers;
