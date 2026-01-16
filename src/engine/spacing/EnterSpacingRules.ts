// src/engine/spacing/EnterSpacingRules.ts
// Extracted from THEEditor.tsx lines 3049-3125
// 1:1 migration - exact behavior preserved

import type { ViterbiState } from "../../types";

/**
 * getEnterSpacingRule
 * @description قاعدة التباعد بين نوعين (سطر فارغ أو لا)
 *
 * @param prevType النوع السابق
 * @param nextType النوع اللاحق
 * @returns true = أضف سطر فارغ، false = لا تضف، null = لا قاعدة
 */
export function getEnterSpacingRule(
  prevType: string,
  nextType: string,
): boolean | null {
  // === جديد: تجاهل blank في قواعد التباعد ===
  if (prevType === "blank" || nextType === "blank") {
    return null; // لا قاعدة محددة
  }

  if (
    prevType === "basmala" &&
    (nextType === "scene-header-1" || nextType === "scene-header-top-line")
  ) {
    return true;
  }
  if (prevType === "scene-header-3" && nextType === "action") return true;
  if (prevType === "action" && nextType === "action") return true;
  if (prevType === "action" && nextType === "character") return true;
  if (prevType === "character" && nextType === "dialogue") return false;
  if (prevType === "dialogue" && nextType === "character") return true;
  if (prevType === "dialogue" && nextType === "action") return true;
  if (prevType === "dialogue" && nextType === "transition") return true;
  if (prevType === "action" && nextType === "transition") return true;
  if (
    prevType === "transition" &&
    (nextType === "scene-header-1" || nextType === "scene-header-top-line")
  ) {
    return true;
  }
  return null;
}

/**
 * applyEnterSpacingRules
 * @description تطبيق قواعد التباعد على مجموعة أسطر
 *
 * @param lines مصفوفة الأسطر { text, type }[]
 * @returns مصفوفة الأسطور بعد تطبيق القواعد
 */
export function applyEnterSpacingRules(
  lines: { text: string; type: string }[],
): { text: string; type: string }[] {
  const result: { text: string; type: string }[] = [];
  let prevNonBlankType: string | null = null;
  let pendingBlanks: { text: string; type: string }[] = [];

  const isBlankLine = (line: { text: string; type: string }): boolean => {
    if (line.type !== "action") return false;
    return (line.text || "").trim() === "";
  };

  for (const line of lines) {
    if (isBlankLine(line)) {
      pendingBlanks.push(line);
      continue;
    }

    if (!prevNonBlankType) {
      result.push(...pendingBlanks);
      pendingBlanks = [];
      result.push(line);
      prevNonBlankType = line.type;
      continue;
    }

    const spacingRule = getEnterSpacingRule(prevNonBlankType, line.type);

    if (spacingRule === true) {
      if (pendingBlanks.length > 0) {
        result.push(pendingBlanks[0]);
      } else {
        result.push({ text: "", type: "action" });
      }
    } else if (spacingRule === false) {
      // لا نضيف السطور الفارغة - نتجاهلها
    } else if (spacingRule === null) {
      result.push(...pendingBlanks);
    }

    pendingBlanks = [];
    result.push(line);
    prevNonBlankType = line.type;
  }

  result.push(...pendingBlanks);
  return result;
}

/**
 * isSceneHeader1
 * @description فحص إذا كان السطر رأس مشهد-1 (مشهد + رقم فقط)
 *
 * @param line السطر المراد فحصه
 * @returns true إذا كان رأس مشهد-1
 */
export function isSceneHeader1(line: string): boolean {
  return /^\s*(?:مشهد|م\.|scene)\s*[0-9٠-٩]+\s*$/i.test(line);
}
