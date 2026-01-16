// modules/domTextReplacement.ts
// ==============================
// DOM Text Replacement Utilities
//
// Responsibilities:
// - Replace text in DOM text nodes using regex
// - Preserve DOM structure during replacements
//
// Note: This module provides the applyRegexReplacementToTextNodes function
// used by handlers in THEEditor.tsx

/**
 * @function applyRegexReplacementToTextNodes
 * @description استبدال النص في عقد DOM النصية باستخدام regex
 * @param container - العنصر الحاوي للبحث فيه
 * @param patternSource - مصدر نمط regex
 * @param patternFlags - أعلام regex
 * @param replacement - النص البديل
 * @param replaceAll - استبدال الكل أم الأول فقط
 * @returns عدد الاستبدالات المطبقة
 */
export function applyRegexReplacementToTextNodes(
  container: HTMLElement,
  patternSource: string,
  patternFlags: string,
  replacement: string,
  replaceAll: boolean = true
): number {
  let replacementsApplied = 0;
  const regex = new RegExp(patternSource, patternFlags);

  // جمع جميع عقد النص
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  // تطبيق الاستبدالات
  for (const textNode of textNodes) {
    const originalText = textNode.textContent || "";

    if (regex.test(originalText)) {
      // إعادة تعيين lastIndex للـ regex
      regex.lastIndex = 0;

      let newText: string;
      if (replaceAll) {
        // حساب عدد المطابقات
        const matches = originalText.match(new RegExp(patternSource, patternFlags));
        replacementsApplied += matches ? matches.length : 0;
        newText = originalText.replace(regex, replacement);
      } else {
        // استبدال أول مطابقة فقط
        const singleRegex = new RegExp(patternSource, patternFlags.replace("g", ""));
        if (singleRegex.test(originalText)) {
          replacementsApplied += 1;
          newText = originalText.replace(singleRegex, replacement);
        } else {
          continue;
        }
      }

      textNode.textContent = newText;

      // إذا لم يكن استبدال الكل، توقف بعد أول استبدال
      if (!replaceAll && replacementsApplied > 0) {
        break;
      }
    }
  }

  return replacementsApplied;
}
