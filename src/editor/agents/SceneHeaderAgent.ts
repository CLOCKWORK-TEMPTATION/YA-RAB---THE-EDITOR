// src/editor/agents/SceneHeaderAgent.ts
// =====================================
// Scene Header Agent from THEEditor.tsx (Lines 8505-8567)
//
// منقول 1:1 من THEEditor.tsx
// التوقيع الأصلي محفوظ بالكامل

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

// ==================== VERB_RE ====================
// منقول 1:1 من THEEditor.tsx (سطر 85-86)

export const VERB_RE =
  /(يدخل|يخرج|يقف|يجلس|ينظر|يتحرك|يقترب|يبتعد|يركض|يمشي|يتحدث|يصرخ|تدخل|تخرج|تقف|تجلس|تنظر|تتحرك|تقترب|تبتعد|تركض|تمشي|تتحدث|تصرخ)/;

// ==================== ScreenplayClassifier Stub ====================
// Stub للـ ScreenplayClassifier المطلوب من THEEditor.tsx
// يُستخدم للحفاظ على التوقيع الأصلي 1:1

const SCENE_HEADER_RE = /^\s*(?:مشهد|م\.|scene)\s*([0-9٠-٩]+)\s*(?:[-–—:،]\s*)?(.*)$/i;
const TIME_LOCATION_RE = /(داخلي|خارجي|د\.|خ\.|interior|exterior|int\.|ext\.)\s*[-–—]?\s*(ليل|نهار|صباح|مساء)?/i;

/**
 * @class ScreenplayClassifier
 * @description Stub class للتوافق مع THEEditor.tsx
 * يحتوي فقط على الـ methods المستخدمة في SceneHeaderAgent
 */
export class ScreenplayClassifier {
  /**
   * Patterns المستخدمة في التصنيف
   */
  Patterns = {
    sceneHeader3: /^[\u0600-\u06FF\s\-–—]+$/,
  };

  /**
   * @static parseSceneHeaderFromLine
   * @description تحليل سطر رأس مشهد
   */
  static parseSceneHeaderFromLine(line: string): ParsedSceneHeader | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const match = trimmed.match(SCENE_HEADER_RE);
    if (!match) return null;

    const sceneNumber = match[1];
    const remainder = (match[2] || "").trim();

    const parts: ParsedSceneHeader = {
      sceneNum: `مشهد ${sceneNumber}`,
    };

    if (remainder) {
      // تحليل الوقت/المكان
      const timeMatch = remainder.match(TIME_LOCATION_RE);
      if (timeMatch) {
        parts.timeLocation = remainder;
      } else {
        parts.timeLocation = remainder;
      }

      // التحقق من وجود مكان inline
      const dashParts = remainder.split(/[-–—]/);
      if (dashParts.length > 2) {
        parts.placeInline = dashParts[dashParts.length - 1].trim();
      }
    }

    return parts;
  }

  /**
   * @static normalizeLine
   * @description تطبيع السطر للمعالجة
   */
  static normalizeLine(line: string): string {
    return line.trim().replace(/\s+/g, " ");
  }
}

// ==================== buildSceneHeaderDOM ====================
// منقول 1:1 من THEEditor.tsx (سطر 568-597)
// التوقيع الأصلي: (text, getStylesFn) - بدون معامل ثالث

/**
 * @function buildSceneHeaderDOM
 * @description بناء عنصر DOM لرأس المشهد بناءً على النص المُحلّل (دالة عامة مُصدَّرة)
 * منقول 1:1 من THEEditor.tsx
 * @param text - نص رأس المشهد
 * @param getStylesFn - دالة للحصول على الـ styles
 * @returns HTML string لرأس المشهد أو undefined إذا فشل التحليل
 */
export const buildSceneHeaderDOM = (
  text: string,
  getStylesFn: (formatType: string) => React.CSSProperties,
): string | undefined => {
  const sceneHeaderParts = ScreenplayClassifier.parseSceneHeaderFromLine(text);

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
// منقول 1:1 من THEEditor.tsx (سطر 8515-8566)
// التوقيع الأصلي: (line, ctx, getFormatStylesFn) - 3 معاملات فقط

/**
 * @function SceneHeaderAgent
 * @description معالج رؤوس المشاهد - يحلل سطر النص ويحدد إذا كان رأس مشهد ويقوم بتنسيقه
 * منقول 1:1 من THEEditor.tsx
 * @param line - السطر المراد معالجته
 * @param ctx - السياق (هل نحن في حوار أم لا)
 * @param getFormatStylesFn - دالة للحصول على الـ styles حسب النوع
 * @returns HTML للرأس المنسق أو null إذا لم يكن رأس مشهد
 */
export const SceneHeaderAgent = (
  line: string,
  ctx: { inDialogue: boolean },
  getFormatStylesFn: (formatType: string) => React.CSSProperties,
): SceneHeaderAgentResult | null => {
  const classifier = new ScreenplayClassifier();
  const Patterns = classifier.Patterns;
  const trimmedLine = line.trim();

  const parsed = ScreenplayClassifier.parseSceneHeaderFromLine(trimmedLine);
  if (parsed) {
    // استخدام الدالة الموحدة buildSceneHeaderDOM
    let html = buildSceneHeaderDOM(trimmedLine, getFormatStylesFn) || "";

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

  const normalized = ScreenplayClassifier.normalizeLine(trimmedLine);
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
