// src/editor/agents/SceneHeaderAgent.ts
// =====================================
// Scene Header Agent from THEEditor.tsx (Lines 8505-8567)
//
// Responsibilities:
// - Parse complex Arabic scene headers
// - Handle multi-line scene headers
// - Extract scene metadata
//
// منقول 1:1 من THEEditor.tsx
// NO classification logic (uses external classifier)
// NO state management

import type React from "react";

// ==================== Types ====================

/**
 * نتيجة تحليل رأس المشهد
 */
export interface ParsedSceneHeader {
  sceneNum: string;
  timeLocation?: string;
  placeInline?: string;
}

/**
 * سياق المعالجة
 */
export interface SceneHeaderContext {
  inDialogue: boolean;
}

/**
 * نتيجة معالجة SceneHeaderAgent
 */
export interface SceneHeaderAgentResult {
  html: string;
  processed: boolean;
}

/**
 * Interface لـ Patterns المستخدمة
 */
export interface SceneHeaderPatterns {
  sceneHeader3: RegExp;
}

/**
 * Interface لـ ScreenplayClassifier المستخدم
 */
export interface ScreenplayClassifierInterface {
  Patterns: SceneHeaderPatterns;
}

/**
 * Static methods من ScreenplayClassifier
 */
export interface ScreenplayClassifierStatic {
  parseSceneHeaderFromLine(line: string): ParsedSceneHeader | null;
  normalizeLine(line: string): string;
}

// ==================== VERB_RE ====================
// منقول 1:1 من THEEditor.tsx (سطر 85-86)

export const VERB_RE =
  /(يدخل|يخرج|يقف|يجلس|ينظر|يتحرك|يقترب|يبتعد|يركض|يمشي|يتحدث|يصرخ|تدخل|تخرج|تقف|تجلس|تنظر|تتحرك|تقترب|تبتعد|تركض|تمشي|تتحدث|تصرخ)/;

// ==================== buildSceneHeaderDOM ====================
// منقول 1:1 من THEEditor.tsx (سطر 562-597)

/**
 * @function buildSceneHeaderDOM
 * @description بناء عنصر DOM لرأس المشهد بناءً على النص المُحلّل
 * @param text - نص رأس المشهد
 * @param getStylesFn - دالة للحصول على الـ styles
 * @param parseSceneHeaderFromLine - دالة تحليل رأس المشهد
 * @returns HTML string لرأس المشهد أو undefined إذا فشل التحليل
 */
export const buildSceneHeaderDOM = (
  text: string,
  getStylesFn: (formatType: string) => React.CSSProperties,
  parseSceneHeaderFromLine: (line: string) => ParsedSceneHeader | null,
): string | undefined => {
  const sceneHeaderParts = parseSceneHeaderFromLine(text);

  if (sceneHeaderParts) {
    const container = document.createElement("div");
    container.className = "scene-header-top-line";
    Object.assign(container.style, getStylesFn("scene-header-top-line"));

    const part1 = document.createElement("span");
    part1.className = "scene-header-1";
    part1.textContent = sceneHeaderParts.sceneNum;
    Object.assign(part1.style, getStylesFn("scene-header-1"));
    container.appendChild(part1);

    if (sceneHeaderParts.timeLocation) {
      const part2 = document.createElement("span");
      part2.className = "scene-header-2";
      part2.textContent = sceneHeaderParts.timeLocation;
      Object.assign(part2.style, getStylesFn("scene-header-2"));
      container.appendChild(part2);
    }

    return container.outerHTML;
  }

  return undefined;
};

// ==================== SceneHeaderAgent ====================
// منقول 1:1 من THEEditor.tsx (سطر 8507-8566)

/**
 * @function SceneHeaderAgent
 * @description معالج رؤوس المشاهد - يحلل سطر النص ويحدد إذا كان رأس مشهد ويقوم بتنسيقه
 * منقول 1:1 من THEEditor.tsx
 * @param line - السطر المراد معالجته
 * @param ctx - السياق (هل نحن في حوار أم لا)
 * @param getFormatStylesFn - دالة للحصول على الـ styles حسب النوع
 * @param classifier - instance من ScreenplayClassifier
 * @param classifierStatic - static methods من ScreenplayClassifier
 * @returns HTML للرأس المنسق أو null إذا لم يكن رأس مشهد
 */
export const SceneHeaderAgent = (
  line: string,
  ctx: SceneHeaderContext,
  getFormatStylesFn: (formatType: string) => React.CSSProperties,
  classifier: ScreenplayClassifierInterface,
  classifierStatic: ScreenplayClassifierStatic,
): SceneHeaderAgentResult | null => {
  const Patterns = classifier.Patterns;
  const trimmedLine = line.trim();

  const parsed = classifierStatic.parseSceneHeaderFromLine(trimmedLine);
  if (parsed) {
    // استخدام الدالة الموحدة buildSceneHeaderDOM
    let html = buildSceneHeaderDOM(
      trimmedLine,
      getFormatStylesFn,
      classifierStatic.parseSceneHeaderFromLine,
    ) || "";

    if (parsed.placeInline) {
      const placeDiv = document.createElement("div");
      placeDiv.className = "scene-header-3";
      placeDiv.textContent = parsed.placeInline;
      Object.assign(placeDiv.style, getFormatStylesFn("scene-header-3"));
      html += placeDiv.outerHTML;
    }

    ctx.inDialogue = false;
    return { html, processed: true };
  }

  const normalized = classifierStatic.normalizeLine(trimmedLine);
  const wordCount = normalized ? normalized.split(/\s+/).filter(Boolean).length : 0;
  const hasDash = /[-–—]/.test(normalized);
  const hasColon = normalized.includes(":") || normalized.includes("：");
  const hasSentencePunctuation = /[\.!؟\?]/.test(normalized);

  // الخطوة 3: عكس منطق الشرطة - الشرطة بعد مكان = تعزيز (إلا لو فيه فعل)
  const hasVerbAfterDash = hasDash && VERB_RE.test(normalized.split(/[-–—]/)[1] || "");

  if (
    Patterns.sceneHeader3.test(trimmedLine) &&
    wordCount <= 6 &&
    (!hasDash || !hasVerbAfterDash) &&
    !hasColon &&
    !hasSentencePunctuation
  ) {
    const element = document.createElement("div");
    element.className = "scene-header-3";
    element.textContent = trimmedLine;
    Object.assign(element.style, getFormatStylesFn("scene-header-3"));
    ctx.inDialogue = false;
    return { html: element.outerHTML, processed: true };
  }

  return null;
};

// ==================== Legacy Factory (للتوافق مع الكود القديم) ====================

/**
 * @function createSceneHeaderAgent
 * @description Factory function للتوافق مع الكود القديم
 * @deprecated استخدم SceneHeaderAgent مباشرة
 */
export function createSceneHeaderAgent(): {
  parse: (line: string) => ParsedSceneHeader | null;
  parseMultiLine: (lines: string[], startIndex: number) => { parts: ParsedSceneHeader; consumedLines: number } | null;
  format: (parts: ParsedSceneHeader) => string;
} {
  const SCENE_PREFIX_RE = /^\s*(?:مشهد|م\.|scene)\s*([0-9٠-٩]+)\s*(?:[-–—:،]\s*)?(.*)$/i;
  const INTERIOR_RE = /(داخلي|د\.|interior|int\.)/i;
  const EXTERIOR_RE = /(خارجي|خ\.|exterior|ext\.)/i;
  const TIME_RE = /(ليل|نهار|ل\.|ن\.|صباح|مساء|فجر|ظهر|عصر|مغرب|عشاء|morning|evening|day|night)/i;
  const PHOTOMONTAGE_RE = /\(?\s*فوتو\s*مونتاج\s*\)?/i;

  function parse(line: string): ParsedSceneHeader | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const match = trimmed.match(SCENE_PREFIX_RE);
    if (!match) return null;

    const sceneNumber = match[1];
    const remainder = match[2] || '';

    const parts: ParsedSceneHeader = {
      sceneNum: `مشهد ${sceneNumber}`
    };

    // Extract time/location
    let timeLocation = remainder;
    timeLocation = timeLocation.replace(PHOTOMONTAGE_RE, '');
    timeLocation = timeLocation.replace(/^[-–—:\s,]+|[-–—:\s,]+$/g, '');

    if (timeLocation) {
      parts.timeLocation = timeLocation.trim();
    }

    return parts;
  }

  function parseMultiLine(lines: string[], startIndex: number): { parts: ParsedSceneHeader; consumedLines: number } | null {
    const firstParse = parse(lines[startIndex]);
    if (!firstParse) return null;

    let parts = firstParse;
    let consumedLines = 1;

    return { parts, consumedLines };
  }

  function format(parts: ParsedSceneHeader): string {
    let result = parts.sceneNum;

    if (parts.timeLocation) {
      result += ' - ' + parts.timeLocation;
    }

    return result;
  }

  return {
    parse,
    parseMultiLine,
    format
  };
}
