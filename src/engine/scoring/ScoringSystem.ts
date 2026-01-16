// src/engine/scoring/ScoringSystem.ts
// Extracted from THEEditor.tsx - Scoring System (1:1 migration)
// Part 1: Imports, Constants, Helper Functions, and Scoring Functions
// This file contains the complete scoring logic from ScreenplayClassifier

import type {
  LineContext,
  ClassificationScore,
  ClassificationResult,
  CandidateType,
  ViterbiState,
} from "../../types";
import { DocumentMemory } from "../../systems/memory/DocumentMemory";
import {
  normalizeLine,
  normalizeForAnalysis,
  wordCount,
  hasSentencePunctuation,
  isBlank,
} from "../../utils/text";

// Constants from THEEditor.tsx
const SCORE_TIE_THRESHOLD = 5;
const NEEDS_REVIEW_THRESHOLD = 60;

// Regex constants needed
const VERB_RE = /(يدخل|يخرج|يقف|يجلس|ينظر|يتحرك|يقترب|يبتعد|يركض|يمشي|يتحدث|يصرخ)/;

const KNOWN_PLACES_RE =
  /(?:^|\b)(مسجد|بيت|منزل|شارع|حديقة|مدرسة|جامعة|مكتب|محل|مستشفى|مطعم|فندق|سيارة|غرفة|قاعة|ممر|سطح|ساحة|مقبرة|مخبز|مكتبة|نهر|بحر|جبل|غابة|سوق|مصنع|بنك|محكمة|سجن|موقف|محطة|مطار|ميناء|كوبرى|نفق|مبنى|قصر|قصر عدلي|نادي|ملعب|ملهى|بار|كازينو|متحف|مسرح|سينما|معرض|مزرعة|مختبر|مستودع|كهف|الكهف|غرفة الكهف|كهف المرايا|كوافير|صالون|حلاق)(?:\b|$)/i;

const LOCATION_PREFIX_RE = /^(داخل|في|أمام|خلف|بجوار|على|تحت|فوق)\s+/;

// Helper function declarations (will be connected to actual implementations)
function startsWithDash(rawLine: string): boolean {
  return /^[\s]*[-–—−‒―]/.test(rawLine);
}

function isActionVerbStart(normalized: string): boolean {
  return false; // Placeholder
}

function matchesActionStartPattern(normalized: string): boolean {
  return false; // Placeholder
}

function isSceneHeaderStart(normalized: string): boolean {
  return false; // Placeholder
}

function isTransition(line: string): boolean {
  return false; // Placeholder
}

function isCharacterLine(line: string): boolean {
  return false; // Placeholder
}

function isParenShaped(line: string): boolean {
  return false; // Placeholder
}

function isLikelyAction(line: string): boolean {
  return false; // Placeholder
}

function normalizeForAnalysis(input: string): string {
  return normalizeLine(input).replace(/^[\s\u200E\u200F\u061C\uFEFF]*[•·∙⋅●○◦■□▪▫◆◇]+\s*/, "");
}

/**
 * getDialogueBlockInfo
 * @description فحص إذا كان السطر الحالي داخل بلوك حوار
 */
function getDialogueBlockInfo(
  previousTypes: (string | null)[],
  currentIndex: number,
): {
  isInDialogueBlock: boolean;
  blockStartType: string | null;
  distanceFromCharacter: number;
} {
  const dialogueBlockTypes = ["character", "dialogue", "parenthetical"];
  const blockBreakers = [
    "scene-header-1",
    "scene-header-2",
    "scene-header-3",
    "scene-header-top-line",
    "transition",
    "basmala",
  ];

  let distanceFromCharacter = -1;

  for (let i = currentIndex - 1; i >= 0; i--) {
    const type = previousTypes[i];

    if (type === "blank" || type === null) continue;

    if (blockBreakers.includes(type)) {
      return {
        isInDialogueBlock: false,
        blockStartType: null,
        distanceFromCharacter: -1,
      };
    }

    if (type === "character") {
      distanceFromCharacter = currentIndex - i;
      return {
        isInDialogueBlock: true,
        blockStartType: "character",
        distanceFromCharacter,
      };
    }

    if (dialogueBlockTypes.slice(1).some(dt => dt === type)) {
      continue;
    }

    if (type === "action") {
      return {
        isInDialogueBlock: false,
        blockStartType: null,
        distanceFromCharacter: -1,
      };
    }
  }

  return {
    isInDialogueBlock: false,
    blockStartType: null,
    distanceFromCharacter: -1,
  };
}

/**
 * buildContext
 * @description بناء سياق السطر - نافذة قبل/بعد مع إحصائيات
 */
function buildContext(
  line: string,
  index: number,
  allLines: string[],
  previousTypes?: (string | null)[],
): LineContext {
  const WINDOW_SIZE = 3;
  const normalized = normalizeForAnalysis(line);
  const wordCountResult = wordCount(normalized);
  const allLinesLength = allLines.length;

  const previousLines: { text: string; type: string }[] = [];
  const nextLines: { text: string; type: string }[] = [];
  let nextLine: string | null = null;
  let prevCollected = 0;
  let nextCollected = 0;

  const maxRange = Math.max(WINDOW_SIZE, allLinesLength - index);
  for (let offset = 1; offset <= maxRange; offset++) {
    // البحث للخلف
    if (prevCollected < WINDOW_SIZE && index - offset >= 0) {
      const prevIndex = index - offset;
      const prevLineText = allLines[prevIndex];
      const type = previousTypes?.[prevIndex] || "unknown";

      if (type !== "blank" && !isBlank(prevLineText)) {
        previousLines.unshift({ text: prevLineText, type });
        prevCollected++;
      }
    }

    // البحث للأمام
    if (index + offset < allLinesLength) {
      const nextIndex = index + offset;
      const currentNextLine = allLines[nextIndex];

      if (!isBlank(currentNextLine)) {
        if (!nextLine) nextLine = currentNextLine;
        if (nextCollected < WINDOW_SIZE) {
          nextLines.push({ text: currentNextLine, type: "unknown" });
          nextCollected++;
        }
      }
    }

    if (prevCollected >= WINDOW_SIZE && nextCollected >= WINDOW_SIZE && nextLine) {
      break;
    }
  }

  const nextWordCount = nextLine ? wordCount(normalizeLine(nextLine)) : undefined;
  const nextLineLength = nextLine?.length ?? undefined;
  const nextHasPunctuation = nextLine ? hasSentencePunctuation(nextLine) : undefined;

  return {
    prevLine: null,
    nextLine: nextLine || null,
    prevNonBlank: null,
    nextNonBlank: nextLine || null,
    position: "middle",
    previousLines,
    nextLines,
    stats: {
      currentLineLength: normalized.length,
      currentWordCount: wordCountResult,
      nextLineLength,
      nextWordCount,
      hasPunctuation: hasSentencePunctuation(normalized),
      nextHasPunctuation,
    },
  };
}

function getPrevNonBlankType(
  previousTypes: (string | null)[],
  currentIndex: number,
): string | null {
  for (let i = currentIndex - 1; i >= 0; i--) {
    const type = previousTypes[i];
    if (type && type !== "blank") {
      return type;
    }
  }
  return null;
}

// Export all scoring functions
export function scoreAsCharacter(
  rawLine: string,
  normalized: string,
  ctx: LineContext,
  documentMemory?: DocumentMemory,
): ClassificationScore {
  let score = 0;
  const reasons: string[] = [];
  const trimmed = rawLine.trim();
  const wordCount = ctx.stats.currentWordCount;

  if (documentMemory) {
    const nameToCheck = trimmed.replace(/[:：\s]+$/, "");
    const knownStatus = documentMemory.isKnownCharacter(nameToCheck);

    if (knownStatus) {
      if (knownStatus.confidence === "high") {
        score += 60;
        reasons.push("شخصية معروفة من المستند (ثقة عالية)");
      } else if (knownStatus.confidence === "medium") {
        score += 40;
        reasons.push("شخصية معروفة من المستند (ثقة متوسطة)");
      } else {
        score += 20;
        reasons.push("شخصية معروفة من المستند (ثقة منخفضة)");
      }
    }
  }

  const looksLikeAction =
    isActionVerbStart(normalized) || matchesActionStartPattern(normalized);

  if (looksLikeAction) {
    const nameToCheck = trimmed.replace(/[:：\s]+$/, "");
    const isKnown = documentMemory?.isKnownCharacter(nameToCheck);

    if (isKnown) {
      score -= 15;
      reasons.push("يشبه نمط حركة لكنه شخصية معروفة (سالب مخفف)");
    } else {
      score -= 45;
      reasons.push("يبدو كسطر حركة (سالب)");
    }
  }

  const endsWithColon = trimmed.endsWith(":") || trimmed.endsWith("：");
  if (endsWithColon) {
    score += 50;
    reasons.push("ينتهي بنقطتين");
  } else if (trimmed.includes(":") || trimmed.includes("：")) {
    score += 25;
    reasons.push("يحتوي على نقطتين");
  }

  if (wordCount <= 3) {
    score += 20;
    reasons.push(`طول ${wordCount} كلمات (≤3)`);
  } else if (wordCount <= 5) {
    score += 10;
    reasons.push(`طول ${wordCount} كلمات (≤5)`);
  }

  if (!ctx.stats.hasPunctuation) {
    score += 15;
    reasons.push("لا يحتوي على علامات ترقيم نهائية");
  }

  const hasSentenceEndingPunct = /[\.!\؟\?]$/.test(trimmed) || /(\.\.\.|…)/.test(trimmed);
  if (hasSentenceEndingPunct && !endsWithColon) {
    score -= 35;
    reasons.push("يحتوي على علامات ترقيم (سالب)");
  }

  const nextLine = ctx.nextLines[0]?.text;
  if (nextLine && !isSceneHeaderStart(nextLine) && !isTransition(nextLine)) {
    const nextWordCount = ctx.stats.nextWordCount ?? 0;
    if (nextWordCount > 1 && nextWordCount <= 30) {
      score += 25;
      reasons.push("السطر التالي يبدو كحوار");
    }
  }

  if (isActionVerbStart(normalized) || matchesActionStartPattern(normalized)) {
    score -= 20;
    reasons.push("يبدأ كنمط حركة (سالب)");
  }

  const arabicOnly =
    /^[\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF:：]+$/.test(trimmed);
  if (arabicOnly) {
    score += 10;
    reasons.push("أحرف عربية فقط");
  }

  const prevLine = ctx.previousLines[ctx.previousLines.length - 1];
  if (prevLine && prevLine.type !== "character") {
    score += 5;
    reasons.push("السطر السابق ليس شخصية");
  }

  if (normalized.startsWith("صوت") && !endsWithColon) {
    score -= 10;
    reasons.push('يبدأ بـ "صوت" ولكن بدون نقطتين');
  }

  let confidence: "high" | "medium" | "low";
  if (score >= 70) {
    confidence = "high";
  } else if (score >= 40) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    confidence,
    reasons,
  };
}

export function scoreAsDialogue(
  rawLine: string,
  normalized: string,
  ctx: LineContext,
  documentMemory?: DocumentMemory,
  dialogueBlockInfo?: {
    isInDialogueBlock: boolean;
    distanceFromCharacter: number;
  },
): ClassificationScore {
  let score = 0;
  const reasons: string[] = [];
  const wordCount = ctx.stats.currentWordCount;

  const prevLine = ctx.previousLines[ctx.previousLines.length - 1];

  // 1. السطر السابق شخصية (40 نقطة)
  const isPrevCharacter = prevLine?.type === "character";
  if (isPrevCharacter) {
    score += 40;
    reasons.push("السطر السابق شخصية");
  }

  // 1b. الشرطة داخل بلوك الحوار
  if (startsWithDash(rawLine)) {
    if (dialogueBlockInfo?.isInDialogueBlock) {
      // داخل بلوك الحوار: الشرطة غالباً استكمال حوار
      score += 35;
      reasons.push("يبدأ بشرطة داخل بلوك حوار (استكمال/نبرة)");

      // مكافأة إضافية إذا قريب من الشخصية
      if (dialogueBlockInfo.distanceFromCharacter <= 3) {
        score += 15;
        reasons.push("قريب من سطر الشخصية");
      }
    } else {
      // خارج بلوك الحوار: الشرطة ليست دليل حوار
      score -= 15;
      reasons.push("يبدأ بشرطة خارج بلوك الحوار (سالب)");
    }
  }

  // 1c. علامات الحوار المستمر
  if (dialogueBlockInfo?.isInDialogueBlock) {
    // Ellipsis في البداية = استكمال
    if (/^[\s]*\.\.\./.test(rawLine) || /^[\s]*…/.test(rawLine)) {
      score += 25;
      reasons.push("يبدأ بـ ... (استكمال حوار)");
    }

    // علامات اقتباس
    if (/^[\s]*["«"]/.test(rawLine)) {
      score += 20;
      reasons.push("يبدأ بعلامة اقتباس");
    }
  }

  const isPrevParenthetical = prevLine?.type === "parenthetical";
  const isPrevDialogue = prevLine?.type === "dialogue";
  const hasDialogueContext = isPrevCharacter || isPrevParenthetical || isPrevDialogue;

  if (!hasDialogueContext) {
    score -= 60;
    reasons.push("لا يوجد سياق حوار (سالب)");

    if (isActionVerbStart(normalized) || matchesActionStartPattern(normalized)) {
      score -= 20;
      reasons.push("يبدو كسطر حركة بدون سياق حوار (سالب)");
    }
  }

  // 1. السطر السابق شخصية (60 نقطة)
  if (isPrevCharacter) {
    score += 60;
    reasons.push("السطر السابق شخصية");
  }

  // 2. السطر السابق ملاحظة (50 نقطة)
  if (isPrevParenthetical) {
    score += 50;
    reasons.push("السطر السابق ملاحظة");
  }

  if (isPrevDialogue) {
    score += 35;
    reasons.push("استمرار حوار");
  }

  // 3. ينتهي بعلامة ترقيم (15 نقطة)
  if (ctx.stats.hasPunctuation) {
    score += 15;
    reasons.push("ينتهي بعلامة ترقيم");
  }

  // 4. طول مناسب للحوار (15 نقطة) - بين 2 و 50 كلمة
  if (wordCount >= 2 && wordCount <= 50) {
    score += 15;
    reasons.push(`طول مناسب ${wordCount} كلمات`);
  } else if (wordCount >= 1 && wordCount <= 60) {
    score += 8;
    reasons.push(`طول مقبول ${wordCount} كلمات`);
  }

  // 5/6. إذا كان السطر يبدأ كنمط حركة، خفّض نقاط الحوار
  if (isActionVerbStart(normalized) || matchesActionStartPattern(normalized)) {
    score -= 25;
    reasons.push("يبدأ كنمط حركة (سالب)");
  }

  // 7. ليس رأس مشهد (20 نقطة سلبية إذا كان)
  if (isSceneHeaderStart(normalized)) {
    score -= 20;
    reasons.push("يبدو كرأس مشهد (سالب)");
  }

  // 8. السطر التالي ليس شخصية أو ملاحظة (10 نقاط)
  const nextLine = ctx.nextLines[0]?.text;
  if (nextLine && !isCharacterLine(nextLine)) {
    score += 10;
    reasons.push("السطر التالي ليس شخصية");
  }

  // 9. لا يحتوي على نقطتين (إلا إذا كان حوار inline) - 10 نقاط
  const hasColon = normalized.includes(":") || normalized.includes("：");
  if (!hasColon) {
    score += 10;
    reasons.push("لا يحتوي على نقطتين");
  } else if (normalized.match(/^[^:：]+[:：].+[:：]/)) {
    // يحتوي على أكثر من نقطتين - غالباً ليس حواراً صافياً
    score -= 10;
    reasons.push("يحتوي على أكثر من نقطتين (سالب)");
  }

  // 10. ليس قصيراً جداً (حوار من كلمة واحدة غير شائع) - 5 نقاط سلبية
  if (wordCount === 1 && !isPrevCharacter && !isPrevParenthetical) {
    score -= 5;
    reasons.push("كلمة واحدة بدون سياق حوار (سالب)");
  }

  // حساب مستوى الثقة
  let confidence: "high" | "medium" | "low";
  if (score >= 70) {
    confidence = "high";
  } else if (score >= 40) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    confidence,
    reasons,
  };
}

export function scoreAsAction(
  rawLine: string,
  normalized: string,
  ctx: LineContext,
  documentMemory?: DocumentMemory,
  dialogueBlockInfo?: {
    isInDialogueBlock: boolean;
    distanceFromCharacter: number;
  },
): ClassificationScore {
  let score = 0;
  const reasons: string[] = [];
  const wordCount = ctx.stats.currentWordCount;

  // === جديد: خصم إذا كان اسم شخصية معروف ===
  if (documentMemory) {
    const trimmed = rawLine.trim().replace(/[:：\s]+$/, "");
    const knownStatus = documentMemory.isKnownCharacter(trimmed);

    if (knownStatus) {
      if (knownStatus.confidence === "high") {
        score -= 50;
        reasons.push("اسم شخصية معروف (سالب قوي)");
      } else if (knownStatus.confidence === "medium") {
        score -= 30;
        reasons.push("اسم شخصية معروف (سالب)");
      }
    }
  }

  // === تعديل: أنماط الأكشن مشروطة ===
  if (isActionVerbStart(normalized)) {
    // تحقق أن السطر ليس كلمة واحدة فقط (احتمال اسم شخصية)
    const wordCount = ctx.stats.currentWordCount;

    if (wordCount === 1) {
      score += 20; // مكافأة أقل لكلمة واحدة
      reasons.push("يبدأ بفعل حركي (كلمة واحدة)");
    } else {
      score += 50; // المكافأة الكاملة
      reasons.push("يبدأ بفعل حركي");
    }
  }

  // 2. يطابق نمط الحركة (40 نقطة)
  if (matchesActionStartPattern(normalized)) {
    score += 40;
    reasons.push("يطابق نمط الحركة");
  }

  // 3. بعد رأس مشهد (30 نقطة)
  const prevLine = ctx.previousLines[ctx.previousLines.length - 1];
  if (
    prevLine &&
    (prevLine.type === "scene-header-1" ||
      prevLine.type === "scene-header-2" ||
      prevLine.type === "scene-header-3" ||
      prevLine.type === "scene-header-top-line")
  ) {
    score += 30;
    reasons.push("يأتي بعد رأس مشهد");
  }

  // 4. السطر التالي أيضاً حركة (10 نقاط)
  const nextLine = ctx.nextLines[0]?.text;
  if (nextLine && isLikelyAction(nextLine)) {
    score += 10;
    reasons.push("السطر التالي يبدو كحركة");
  }

  // 5. يبدأ بشرطة - مشروطة بالسياق
  if (startsWithDash(rawLine)) {
    if (dialogueBlockInfo?.isInDialogueBlock) {
      // داخل بلوك الحوار: الشرطة ليست دليل action
      score -= 20;
      reasons.push("يبدأ بشرطة داخل بلوك حوار (سالب للأكشن)");
    } else {
      // خارج بلوك الحوار: الشرطة دليل action
      score += 25;
      reasons.push("يبدأ بشرطة خارج بلوك الحوار");
    }
  }

  // 5b. فعل حركي بعد شرطة أقوى
  if (startsWithDash(rawLine) && !dialogueBlockInfo?.isInDialogueBlock) {
    // إزالة الشرطة وفحص الفعل
    const withoutDash = rawLine.replace(/^[\s]*[-–—−‒―]\s*/, "");
    if (isActionVerbStart(withoutDash)) {
      score += 30;
      reasons.push("شرطة متبوعة بفعل حركي");
    }
  }

  // 6. طول نصي مناسب (أكثر من 5 كلمات عادة للحركة) - 10 نقاط
  if (wordCount > 5) {
    score += 10;
    reasons.push(`طول نصي مناسب (${wordCount} كلمات)`);
  }

  // 7. السطر السابق حركة (10 نقاط)
  if (prevLine && prevLine.type === "action") {
    score += 10;
    reasons.push("السطر السابق حركة");
  }

  // 8. ليس شخصية أو حوار (20 نقطة سلبية إذا كان)
  if (isCharacterLine(normalized)) {
    score -= 20;
    reasons.push("يبدو كشخصية (سالب)");
  }

  // 9. لا ينتهي بنقطتين (5 نقاط)
  if (!normalized.endsWith(":") && !normalized.endsWith("：")) {
    score += 5;
    reasons.push("لا ينتهي بنقطتين");
  }

  // 10. يحتوي على كلمات وصفية (مثل "بطيء"، "سريع") - 5 نقاط
  const descriptiveWords = ["بطيء", "سريع", "فجأة", "ببطء", "بسرعة", "هدوء", "صمت"];
  const hasDescriptive = descriptiveWords.some((word) => normalized.includes(word));
  if (hasDescriptive) {
    score += 5;
    reasons.push("يحتوي على كلمات وصفية");
  }

  // حساب مستوى الثقة
  let confidence: "high" | "medium" | "low";
  if (score >= 70) {
    confidence = "high";
  } else if (score >= 40) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    confidence,
    reasons,
  };
}

export function scoreAsParenthetical(
  rawLine: string,
  normalized: string,
  ctx: LineContext,
  dialogueBlockInfo?: {
    isInDialogueBlock: boolean;
    distanceFromCharacter: number;
  },
): ClassificationScore {
  let score = 0;
  const reasons: string[] = [];
  const trimmed = rawLine.trim();
  const wordCount = ctx.stats.currentWordCount;

  const isParenShaped = /^\s*\(.*\)\s*$/.test(trimmed);
  if (!isParenShaped) {
    // بدون أقواس لا يجب أن ينافس كـ Parenthetical إلا في حالات نادرة جداً
    score -= 70;
    reasons.push("ليس بين أقواس (سالب)");
  }

  // 1. يبدأ بقوس وينتهي بقوس (60 نقطة)
  if (/^\s*\(.*\)\s*$/.test(trimmed)) {
    score += 60;
    reasons.push("يبدأ وينتهي بأقواس");
  }

  // 2. السطر السابق شخصية (40 نقطة)
  const prevLine = ctx.previousLines[ctx.previousLines.length - 1];
  const isPrevCharacter = prevLine?.type === "character";
  if (isPrevCharacter) {
    score += 40;
    reasons.push("السطر السابق شخصية");
  }

  // 3. السطر السابق حوار (30 نقطة)
  const isPrevDialogue = prevLine?.type === "dialogue";
  if (isPrevDialogue) {
    score += 30;
    reasons.push("السطر السابق حوار");
  }

  // 4. قصير (عادة 1-5 كلمات) - 15 نقطة
  if (wordCount >= 1 && wordCount <= 5) {
    score += 15;
    reasons.push(`طول قصير (${wordCount} كلمات)`);
  } else if (wordCount <= 10) {
    score += 8;
    reasons.push(`طول متوسط (${wordCount} كلمات)`);
  }

  // 5. لا يبدأ بفعل حركي (10 نقاط)
  if (!isActionVerbStart(normalized)) {
    score += 10;
    reasons.push("لا يبدأ بفعل حركي");
  }

  // 5b. شرطة مع كلمة parenthetical
  if (startsWithDash(rawLine) && dialogueBlockInfo?.isInDialogueBlock) {
    const withoutDash = rawLine.replace(/^[\s]*[-–—−‒―]\s*/, "").trim();

    const parentheticalWords = [
      "همساً",
      "بصوت",
      "مبتسماً",
      "باحتقار",
      "بحزن",
      "بغضب",
      "بفرح",
      "بنظرة",
      "ساخراً",
      "متعجباً",
      "بحدة",
      "بهدوء",
    ];

    const startsWithParentheticalWord = parentheticalWords.some((word) =>
      withoutDash.startsWith(word),
    );

    if (startsWithParentheticalWord && withoutDash.length < 30) {
      score += 40;
      reasons.push("شرطة مع كلمة ملاحظة داخل بلوك حوار");
    }
  }

  // 6. يحتوي على كلمات ملاحظات شائعة (10 نقاط)
  const parentheticalWords = [
    "همساً",
    "بصوت",
    "صوت",
    "مبتسماً",
    "باحتقار",
    "بحزن",
    "بغضب",
    "بفرح",
    "بطريقة",
    "بنظرة",
    "بتحديق",
    "بسرعة",
    "ببطء",
    "فجأة",
    "فوراً",
    "وهو",
    "وهي",
    "مبتسما",
    "مبتسم",
  ];
  const hasParentheticalWord = parentheticalWords.some((word) => normalized.includes(word));
  if (hasParentheticalWord) {
    score += 10;
    reasons.push("يحتوي على كلمة ملاحظة شائعة");
  }

  // 7. لا يحتوي على علامات ترقيم نهائية (5 نقاط)
  if (!ctx.stats.hasPunctuation) {
    score += 5;
    reasons.push("لا يحتوي على علامات ترقيم نهائية");
  }

  // حساب مستوى الثقة
  let confidence: "high" | "medium" | "low";
  if (score >= 70) {
    confidence = "high";
  } else if (score >= 40) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    confidence,
    reasons,
  };
}

export function scoreAsSceneHeader(line: string, ctx: LineContext): ClassificationScore {
  let score = 0;
  const reasons: string[] = [];
  const normalized = normalizeLine(line);

  // 1. يطابق نمط رأس المشهد (70 نقطة)
  if (isSceneHeaderStart(normalized)) {
    score += 70;
    reasons.push("يطابق نمط رأس المشهد");
  }

  // 2. يبدأ بـ "مشهد" أو "م." أو "scene" (50 نقطة)
  const scenePrefix = /^(?:مشهد|m\.|scene)\s*[0-9٠-٩]+/i;
  if (scenePrefix.test(normalized)) {
    score += 50;
    reasons.push("يبدأ بكلمة مشهد");
  }

  // 3. يحتوي على مكان (من الأماكن المعروفة) - 30 نقطة
  const knownPlaces = [
    "مسجد",
    "بيت",
    "منزل",
    "شارع",
    "حديقة",
    "مدرسة",
    "جامعة",
    "مكتب",
    "محل",
    "مستشفى",
    "مطعم",
    "فندق",
    "سيارة",
    "غرفة",
    "قاعة",
    "ممر",
    "سطح",
    "ساحة",
    "مقبرة",
    "مخبز",
    "مكتبة",
    "نهر",
    "بحر",
    "جبل",
    "غابة",
    "سوق",
    "مصنع",
    "بنك",
    "محكمة",
    "سجن",
    "موقف",
    "محطة",
    "مطار",
    "ميناء",
    "كوبرى",
    "نفق",
    "مبنى",
    "قصر",
    "نادي",
    "ملعب",
    "ملهى",
    "بار",
    "كازينو",
    "متحف",
    "مسرح",
    "سينما",
    "معرض",
    "مزرعة",
    "مختبر",
    "مستودع",
    "كهف",
    "قصر عدلي",
  ];
  const hasKnownPlace = knownPlaces.some((place) => normalized.includes(place));
  if (hasKnownPlace) {
    score += 30;
    reasons.push("يحتوي على مكان معروف");
  }

  // 4. يحتوي على وقت (ليل/نهار/صباح/مساء...) - 25 نقطة
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
  ];
  const hasTimeWord = timeWords.some((word) => normalized.includes(word));
  if (hasTimeWord) {
    score += 25;
    reasons.push("يحتوي على كلمة وقت");
  }

  // 5. يحتوي على داخلي/خارجي - 20 نقطة
  if (/داخلي|خارجي|د\.|خ\./i.test(normalized)) {
    score += 20;
    reasons.push("يحتوي على داخلي/خارجي");
  }

  // 6. السطر السابق انتقال أو فارغ (15 نقطة)
  const prevLine = ctx.previousLines[ctx.previousLines.length - 1];
  if (!prevLine || prevLine.type === "transition" || prevLine.text.trim() === "") {
    score += 15;
    reasons.push("السطر السابق انتقال أو فارغ");
  }

  // 7. السطر التالي يبدو كوصف مكان (10 نقاط)
  const nextLine = ctx.nextLines[0]?.text;
  if (nextLine && hasKnownPlace && nextLine.trim().length > 0) {
    if (!isCharacterLine(nextLine) && !isTransition(nextLine)) {
      score += 10;
      reasons.push("السطر التالي يبدو كوصف مكان");
    }
  }

  // حساب مستوى الثقة
  let confidence: "high" | "medium" | "low";
  if (score >= 70) {
    confidence = "high";
  } else if (score >= 40) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    confidence,
    reasons,
  };
}

export function adjustDoubtForDash(text: string, currentDoubt: number): number {
  const hasDash = /[-–—]/.test(text);
  if (!hasDash) return currentDoubt;

  const parts = text.split(/[-–—]/).map((s) => s.trim());
  const afterDash = parts.slice(1).join(" ").trim();

  if (!afterDash) return Math.max(0, currentDoubt - 10);
  if (!VERB_RE.test(afterDash)) return Math.max(0, currentDoubt - 15); // تكملة مكانية → تقليل الشك
  return currentDoubt + 25; // بعد الشرطة فعل → زيادة الشك
}

export function calculateDoubtScore(
  scores: { [type: string]: ClassificationScore },
  lineText?: string,
): { doubtScore: number; needsReview: boolean } {
  const sortedScores = (Object.entries(scores) as [string, ClassificationScore][]).sort(
    (a: [string, ClassificationScore], b: [string, ClassificationScore]) =>
      b[1].score - a[1].score,
  );

  const highest = sortedScores[0];
  const secondHighest = sortedScores[1];

  const scoreDiff = highest
    ? secondHighest
      ? highest[1].score - secondHighest[1].score
      : highest[1].score
    : 0;

  let doubtScore = 0;

  // 1. الفرق بين النقاط
  if (scoreDiff < 15) {
    doubtScore += 50;
  } else if (scoreDiff < 25) {
    doubtScore += 30;
  } else if (scoreDiff < 35) {
    doubtScore += 15;
  }

  // 2. النقاط المنخفضة عموماً
  if (highest && highest[1].score < 40) {
    doubtScore += 30;
  } else if (highest && highest[1].score < 55) {
    doubtScore += 15;
  }

  // 3. تعادل في النقاط العليا
  const maxScore = highest ? highest[1].score : 0;
  const ties = sortedScores.filter(
    (s: [string, ClassificationScore]) =>
      Math.abs(s[1].score - maxScore) < SCORE_TIE_THRESHOLD,
  ).length;
  if (ties > 1) {
    doubtScore += 20;
  }

  // 4. الثقة المنخفضة
  if (highest && highest[1].confidence === "low") {
    doubtScore += 20;
  } else if (highest && highest[1].confidence === "medium") {
    doubtScore += 10;
  }

  // 5. تطبيق adjustDoubtForDash (رقم 6 من TODO)
  if (lineText) {
    doubtScore = adjustDoubtForDash(lineText, doubtScore);
  }

  const finalDoubtScore = Math.min(100, doubtScore);

  // === تحديد الحاجة للمراجعة ===
  const needsReview = finalDoubtScore >= NEEDS_REVIEW_THRESHOLD;

  return { doubtScore: finalDoubtScore, needsReview };
}

export function extractTop2Candidates(scores: {
  [type: string]: ClassificationScore;
}): [CandidateType, CandidateType] | null {
  const sortedEntries = (Object.entries(scores) as [string, ClassificationScore][]).sort(
    (a: [string, ClassificationScore], b: [string, ClassificationScore]) =>
      b[1].score - a[1].score,
  );

  if (sortedEntries.length < 2) return null;

  const [first, second] = sortedEntries;

  return [
    {
      type: first[0],
      score: first[1].score,
      confidence: first[1].confidence,
      reasons: first[1].reasons,
    },
    {
      type: second[0],
      score: second[1].score,
      confidence: second[1].confidence,
      reasons: second[1].reasons,
    },
  ];
}

export function applySmartFallback(
  top2: [CandidateType, CandidateType],
  ctx: LineContext,
  prevNonBlankType: string | null,
  nextLine: string | null,
  currentLine: string,
): { type: string; reason: string } | null {
  const [first, second] = top2;
  const scoreDiff = first.score - second.score;

  // لا نطبق fallback إذا الفرق كبير
  if (scoreDiff > 25) return null;

  const types = [first.type, second.type].sort();

  // === قاعدة 1: character vs action ===
  if (types[0] === "action" && types[1] === "character") {
    // إذا السطر التالي يبدو كحوار → character
    if (nextLine && !isSceneHeaderStart(nextLine) && !isTransition(nextLine)) {
      const nextNormalized = normalizeLine(nextLine);
      const nextWordCount = wordCount(nextNormalized);
      if (nextWordCount > 1 && nextWordCount <= 30) {
        return {
          type: "character",
          reason: "السطر التالي يبدو كحوار",
        };
      }
    }

    // إذا لا يوجد سطر تالي أو السطر التالي ليس حوار → action
    return {
      type: "action",
      reason: "لا يوجد حوار بعده",
    };
  }

  // === قاعدة 2: dialogue vs action ===
  if (types[0] === "action" && types[1] === "dialogue") {
    // إذا السطر السابق character أو parenthetical → dialogue
    if (prevNonBlankType === "character" || prevNonBlankType === "parenthetical") {
      return {
        type: "dialogue",
        reason: "يأتي بعد شخصية أو ملاحظة",
      };
    }

    // إذا السطر السابق dialogue → dialogue (استمرار)
    if (prevNonBlankType === "dialogue") {
      return {
        type: "dialogue",
        reason: "استمرار حوار",
      };
    }

    return {
      type: "action",
      reason: "لا يوجد سياق حوار",
    };
  }

  // === قاعدة 3: parenthetical vs action ===
  if (types[0] === "action" && types[1] === "parenthetical") {
    // إذا السطر السابق character أو dialogue → parenthetical
    if (prevNonBlankType === "character" || prevNonBlankType === "dialogue") {
      return {
        type: "parenthetical",
        reason: "يأتي بعد شخصية أو حوار",
      };
    }

    return {
      type: "action",
      reason: "ليس في سياق حوار",
    };
  }

  // === قاعدة 4: character vs dialogue ===
  if (types[0] === "character" && types[1] === "dialogue") {
    // إذا السطر السابق character → dialogue
    if (prevNonBlankType === "character") {
      return {
        type: "dialogue",
        reason: "يأتي بعد شخصية",
      };
    }

    // إذا ينتهي بنقطتين → character
    const trimmed = currentLine.trim();
    if (trimmed.endsWith(":") || trimmed.endsWith("：")) {
      return {
        type: "character",
        reason: "ينتهي بنقطتين",
      };
    }
  }

  // لا يوجد fallback مناسب
  return null;
}

// ============================================================================
// Helper Functions (Quick Classification)
// ============================================================================

export function isBasmala(line: string): boolean {
  const normalizedLine = line.trim();
  const basmalaPatterns = [
    /^بسم\s+الله\s+الرحمن\s+الرحيم$/i,
    /^[{}]*\s*بسم\s+الله\s+الرحمن\s+الرحيم\s*[{}]*$/i,
  ];
  return basmalaPatterns.some((pattern) => pattern.test(normalizedLine));
}

export function isSceneHeader1(line: string): boolean {
  return /^\s*(?:مشهد|م\.|scene)\s*[0-9٠-٩]+\s*$/i.test(line);
}

export function isParenShapedStatic(line: string): boolean {
  return /^\s*\(.*\)\s*$/.test(line);
}

function buildEmptyContext(): LineContext {
  return {
    prevLine: null,
    nextLine: null,
    prevNonBlank: null,
    nextNonBlank: null,
    position: "middle",
    previousLines: [],
    nextLines: [],
    stats: {
      currentLineLength: 0,
      currentWordCount: 0,
      hasPunctuation: false,
    },
  };
}

interface QuickClassifyOptions {
  documentMemory?: DocumentMemory;
}

function quickClassify(line: string, options?: QuickClassifyOptions): ClassificationResult | null {
  const trimmed = line.trim();

  // BASMALA -> basmala (high)
  if (isBasmala(trimmed)) {
    return {
      type: "basmala",
      confidence: "high",
      scores: {
        basmala: {
          score: 100,
          confidence: "high",
          reasons: ["يطابق نمط البسملة"],
        },
      },
      context: buildEmptyContext(),
      doubtScore: 0,
      needsReview: false,
      top2Candidates: null,
    };
  }

  // Scene Header Start -> scene-header-top-line (high)
  if (isSceneHeaderStart(normalizeLine(trimmed))) {
    return {
      type: "scene-header-top-line",
      confidence: "high",
      scores: {
        "scene-header-top-line": {
          score: 100,
          confidence: "high",
          reasons: ["يطابق نمط رأس المشهد"],
        },
      },
      context: buildEmptyContext(),
      doubtScore: 0,
      needsReview: false,
      top2Candidates: null,
    };
  }

  // Scene Header 1 -> scene-header-1 (high)
  if (isSceneHeader1(trimmed)) {
    return {
      type: "scene-header-1",
      confidence: "high",
      scores: {
        "scene-header-1": {
          score: 100,
          confidence: "high",
          reasons: ["يطابق نمط رأس المشهد الأول"],
        },
      },
      context: buildEmptyContext(),
      doubtScore: 0,
      needsReview: false,
      top2Candidates: null,
    };
  }

  // Transition -> transition (high)
  if (isTransition(trimmed)) {
    return {
      type: "transition",
      confidence: "high",
      scores: {
        transition: {
          score: 100,
          confidence: "high",
          reasons: ["يطابق نمط الانتقال"],
        },
      },
      context: buildEmptyContext(),
      doubtScore: 0,
      needsReview: false,
      top2Candidates: null,
    };
  }

  // Parenthetical shape -> parenthetical (high)
  if (isParenShapedStatic(trimmed)) {
    return {
      type: "parenthetical",
      confidence: "high",
      scores: {
        parenthetical: {
          score: 100,
          confidence: "high",
          reasons: ["بين قوسين"],
        },
      },
      context: buildEmptyContext(),
      doubtScore: 0,
      needsReview: false,
      top2Candidates: null,
    };
  }

  // لم يتم التعرف على نمط ثابت
  return null;
}

// ============================================================================
// Main Classification Functions
// ============================================================================

interface AdaptiveClassificationSystem {
  improveClassificationScore(
    type: string,
    context: { previousType: string; lineText: string },
    currentScore: number,
  ): number;
}

interface ConfidenceCalculatorType {
  calculateMultiDimensionalConfidence(
    line: string,
    classifiedType: string,
    context: {
      previousType: string | null;
      nextLine: string;
      documentPosition: number;
      totalLines: number;
      typeFrequencyMap: { [type: string]: number };
    },
  ): {
    overall: "high" | "medium" | "low";
    dimensions: {
      context: number;
      pattern: number;
      consistency: number;
    };
  };
}

// Placeholder for ConfidenceCalculator - to be connected later
const ConfidenceCalculator: ConfidenceCalculatorType = {
  calculateMultiDimensionalConfidence: () => ({
    overall: "medium",
    dimensions: { context: 50, pattern: 50, consistency: 50 },
  }),
};

export interface ClassifyWithScoringOptions {
  documentMemory?: DocumentMemory;
  adaptiveSystem?: AdaptiveClassificationSystem;
}

export function classifyWithScoring(
  line: string,
  index: number,
  allLines: string[],
  previousTypes?: (string | null)[],
  options?: ClassifyWithScoringOptions,
): ClassificationResult {
  const quickCheck = quickClassify(line, options);
  if (quickCheck) {
    return quickCheck;
  }

  const ctx = buildContext(line, index, allLines, previousTypes);
  const normalized = normalizeLine(line);

  // حساب معلومات بلوك الحوار
  const dialogueBlockInfo = previousTypes
    ? getDialogueBlockInfo(previousTypes, index)
    : {
        isInDialogueBlock: false,
        blockStartType: null,
        distanceFromCharacter: -1,
      };

  // حساب النقاط لكل نوع مع تمرير معلومات البلوك و documentMemory
  const characterScore = scoreAsCharacter(line, normalized, ctx, options?.documentMemory);
  const dialogueScore = scoreAsDialogue(
    line,
    normalized,
    ctx,
    options?.documentMemory,
    dialogueBlockInfo,
  );
  const actionScore = scoreAsAction(
    line,
    normalized,
    ctx,
    options?.documentMemory,
    dialogueBlockInfo,
  );
  const parentheticalScore = scoreAsParenthetical(line, normalized, ctx, dialogueBlockInfo);

  // تحسين إضافي: إذا كان السطر يبدأ بفعل حركي، اجعل نقطة الأكشن أعلى
  if (isActionVerbStart(normalized)) {
    actionScore.score += 30;
    actionScore.confidence = "high";
    actionScore.reasons.push("يبدأ بفعل حركي قوي");
  }

  // === تعديل: استخدام prevNonBlankType بدلاً من prevType مباشرة ===
  const prevNonBlankType = previousTypes ? getPrevNonBlankType(previousTypes, index) : null;

  // تحسين حاسم: لا تسمح لبلوك الحوار بابتلاع أسطر الأكشن
  // مثال: (Character) ثم سطر يبدأ بـ (نرى/نسمع/ترفع/ينهض...) يجب أن يبقى Action.
  const looksLikeActionStart =
    isActionVerbStart(normalized) || matchesActionStartPattern(normalized);

  if (prevNonBlankType === "character" && looksLikeActionStart) {
    dialogueScore.score -= 55;
    dialogueScore.reasons.push("سطر حركة رغم أن السابق شخصية (سالب)");
    actionScore.score += 25;
    actionScore.reasons.push("سطر حركة بعد شخصية (ترجيح للأكشن)");
  }

  // تحسين إضافي: إذا كان السطر طويلاً ويحتوي على علامات ترقيم، رجح الأكشن
  if (line.length > 50 && hasSentencePunctuation(normalized)) {
    actionScore.score += 20;
    actionScore.reasons.push("سطر طويل مع علامات ترقيم (غالباً أكشن)");
  }

  // جمع النقاط في كائن واحد
  const scores: { [type: string]: ClassificationScore } = {
    character: characterScore,
    dialogue: dialogueScore,
    action: actionScore,
    parenthetical: parentheticalScore,
  };

  // === تطبيق الأوزان التكيفية ===
  if (options?.adaptiveSystem) {
    const prevNonBlankTypeLocal = previousTypes
      ? getPrevNonBlankType(previousTypes, index)
      : null;
    const lineText = line.trim();

    for (const [type, score] of Object.entries(scores)) {
      const improvedScore = options.adaptiveSystem.improveClassificationScore(
        type,
        { previousType: prevNonBlankTypeLocal || "blank", lineText },
        score.score,
      );
      score.score = improvedScore;
    }
  }

  // استخراج أعلى مرشحين
  const top2Candidates = extractTop2Candidates(scores);

  // حساب درجة الشك (مع تمرير النص لتطبيق adjustDoubtForDash)
  const { doubtScore, needsReview } = calculateDoubtScore(scores, line);

  // إيجاد النوع الأعلى نقاطاً
  let bestType = "action";
  let bestScore = 0;

  for (const [type, score] of Object.entries(scores) as [string, ClassificationScore][]) {
    if (score.score > bestScore) {
      bestScore = score.score;
      bestType = type;
    }
  }

  // === Viterbi Override المشدد (رقم 7 من TODO) ===
  // إذا كان التصنيف character بعد scene-header والنص يبدو كمكان → override إلى scene-header-3
  if (
    bestType === "character" &&
    (prevNonBlankType === "scene-header-2" ||
      prevNonBlankType === "scene-header-1" ||
      prevNonBlankType === "scene-header-top-line")
  ) {
    if (KNOWN_PLACES_RE.test(normalized) || LOCATION_PREFIX_RE.test(normalized)) {
      // تطبيق Override - هذا مكان وليس شخصية
      bestType = "scene-header-3";

      // تحديث النقاط لتعكس القرار
      if (!scores["scene-header-3"]) {
        scores["scene-header-3"] = {
          score: 85,
          confidence: "high",
          reasons: ["Override: مكان معروف بعد رأس مشهد"],
        };
      } else {
        scores["scene-header-3"].score = Math.max(scores["scene-header-3"].score, 85);
        scores["scene-header-3"].reasons.push("Override: مكان معروف بعد رأس مشهد");
      }
    }
  }

  // === جديد: تطبيق fallback ذكي عند الشك ===
  let fallbackApplied: { originalType: string; fallbackType: string; reason: string } | undefined;

  if (needsReview && top2Candidates) {
    const prevNonBlankTypeLocal = previousTypes
      ? getPrevNonBlankType(previousTypes, index)
      : null;
    const nextLine = index + 1 < allLines.length ? allLines[index + 1] : null;
    const fallback = applySmartFallback(
      top2Candidates,
      ctx,
      prevNonBlankTypeLocal,
      nextLine,
      line,
    );

    if (fallback && fallback.type !== bestType) {
      fallbackApplied = {
        originalType: bestType,
        fallbackType: fallback.type,
        reason: fallback.reason,
      };
      bestType = fallback.type;
    }
  }

  // === جديد: تحديث القاموس بعد تحديد النوع ===
  if (options?.documentMemory && bestType === "character") {
    const trimmed = line.trim();
    const endsWithColon = trimmed.endsWith(":") || trimmed.endsWith("：");
    const confidence = endsWithColon ? "high" : "medium";

    // استخراج اسم الشخصية
    const characterName = trimmed.replace(/[:：\s]+$/, "");
    options.documentMemory.addCharacter(characterName, confidence);
  }

  // === جديد: حساب الثقة متعددة الأبعاد باستخدام ConfidenceCalculator ===
  let multiDimensionalConfidence:
    | ReturnType<typeof ConfidenceCalculator.calculateMultiDimensionalConfidence>
    | undefined;

  // بناء typeFrequencyMap من الأنواع السابقة
  const typeFrequencyMap: { [type: string]: number } = {};
  if (previousTypes) {
    for (const type of previousTypes) {
      if (type) {
        typeFrequencyMap[type] = (typeFrequencyMap[type] || 0) + 1;
      }
    }
  }

  try {
    const prevNonBlankLocal = previousTypes ? getPrevNonBlankType(previousTypes, index) : null;

    multiDimensionalConfidence = ConfidenceCalculator.calculateMultiDimensionalConfidence(
      line,
      bestType,
      {
        previousType: prevNonBlankLocal,
        nextLine: index + 1 < allLines.length ? allLines[index + 1] || "" : "",
        documentPosition: index,
        totalLines: allLines.length,
        typeFrequencyMap,
      },
    );
  } catch (error) {
    console.warn("[ConfidenceCalculator] خطأ في حساب الثقة متعددة الأبعاد:", error);
  }

  return {
    type: bestType,
    confidence: scores[bestType].confidence,
    scores,
    context: ctx,
    doubtScore,
    needsReview,
    top2Candidates,
    fallbackApplied,
    multiDimensionalConfidence,
  };
}

export interface BatchClassificationResult {
  text: string;
  type: string;
  confidence: "high" | "medium" | "low";
  doubtScore: number;
  needsReview: boolean;
  top2Candidates?: [CandidateType, CandidateType];
  fallbackApplied?: { originalType: string; fallbackType: string; reason: string };
}

export function classifyBatchDetailed(
  text: string,
  useContext: boolean = true,
  documentMemory?: DocumentMemory,
): BatchClassificationResult[] {
  const lines = text.split(/\r?\n/);
  const results: BatchClassificationResult[] = [];
  const previousTypes: (string | null)[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] || "";

    // التعامل مع السطور الفارغة
    if (isBlank(rawLine)) {
      results.push({
        text: rawLine,
        type: "blank",
        confidence: "high",
        doubtScore: 0,
        needsReview: false,
      });
      previousTypes.push("blank");
      continue;
    }

    if (useContext) {
      const result = classifyWithScoring(rawLine, i, lines, previousTypes, { documentMemory });

      results.push({
        text: rawLine,
        type: result.type,
        confidence: result.confidence,
        doubtScore: result.doubtScore || 0,
        needsReview: result.needsReview || false,
        top2Candidates: result.top2Candidates,
        fallbackApplied: result.fallbackApplied,
      });

      previousTypes.push(result.type);
    } else {
      // Fallback للطريقة القديمة
      results.push({
        text: rawLine,
        type: "action",
        confidence: "medium",
        doubtScore: 0,
        needsReview: false,
      });
      previousTypes.push("action");
    }
  }

  // تحويل blank إلى action في الإخراج
  return results.map((r) => ({
    ...r,
    type: r.type === "blank" ? "action" : r.type,
  }));
}

export interface ReviewableLineUI extends BatchClassificationResult {
  lineIndex: number;
  index: number;
  currentType: string;
  suggestedTypes: CandidateType[];
}

export function getReviewableLines(results: BatchClassificationResult[]): ReviewableLineUI[] {
  return results
    .map((r, index) => ({ ...r, lineIndex: index }))
    .filter((r) => r.needsReview)
    .map((r) => ({
      type: r.type,
      lineIndex: r.lineIndex,
      index: r.lineIndex,
      text: r.text,
      currentType: r.type,
      doubtScore: r.doubtScore || 0,
      suggestedTypes: r.top2Candidates
        ? [
            {
              type: r.top2Candidates[0].type,
              score: r.top2Candidates[0].score,
              reasons: r.top2Candidates[0].reasons,
            },
            {
              type: r.top2Candidates[1].type,
              score: r.top2Candidates[1].score,
              reasons: r.top2Candidates[1].reasons,
            },
          ]
        : [],
      fallbackApplied: r.fallbackApplied || undefined,
    }));
}

export function getDoubtStatistics(results: BatchClassificationResult[]): {
  totalLines: number;
  needsReviewCount: number;
  needsReviewPercentage: number;
  topAmbiguousPairs: { pair: string; count: number }[];
} {
  const needsReviewLines = results.filter((r) => r.needsReview);

  // حساب أكثر الأزواج غموضاً
  const pairCounts = new Map<string, number>();

  for (const line of needsReviewLines) {
    if (line.top2Candidates) {
      const pair = [line.top2Candidates[0].type, line.top2Candidates[1].type].sort().join(" vs ");
      pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
    }
  }

  const topAmbiguousPairs = Array.from(pairCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pair, count]) => ({ pair, count }));

  const nonEmptyLines = results.filter((r) => r.text.trim() !== "");

  return {
    totalLines: nonEmptyLines.length,
    needsReviewCount: needsReviewLines.length,
    needsReviewPercentage: Math.round(
      (needsReviewLines.length / Math.max(1, nonEmptyLines.length)) * 100,
    ),
    topAmbiguousPairs,
  };
}
