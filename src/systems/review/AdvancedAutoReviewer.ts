// src/systems/review/AdvancedAutoReviewer.ts
// ==========================================================
// Advanced Auto Reviewer (Auto-Reviewer v2)
//
// Extracted from THEditor.tsx lines 7947-8241
// 1:1 migration - exact behavior preserved
//
// Responsibilities:
// - Review classifications with smart rules
// - Detect invalid type transitions
// - Apply knowledge base patterns
// - Suggest corrections

export interface ClassificationInput {
  text: string;
  type: string;
  confidence: number;
}

export interface CorrectionSuggestion {
  index: number;
  original: string;
  suggested: string;
  confidence: number;
  reason: string;
  severity: "low" | "medium" | "high";
}

export interface SingleLineSuggestion {
  suggested: string;
  confidence: number;
  reason: string;
  severity: "low" | "medium" | "high";
}

export interface KnowledgeBaseRule {
  pattern: RegExp;
  rules: {
    confirmType: string;
    rejectTypes: string[];
    minConfidence: number;
    explanation: string;
  }[];
}

export interface ExportedKnowledgeBase {
  rules: Array<{
    pattern: string;
    flags: string;
    rules: unknown;
  }>;
  exportedAt: string;
}

/**
 * نظام المراجعة التلقائي المتقدم (Auto-Reviewer v2)
 * يقوم بفحص التصنيفات تلقائياً باستخدام قواعد ذكية ومعرفة مدمجة
 */
export class AdvancedAutoReviewer {
  private knowledgeBase: KnowledgeBaseRule[] = [
    {
      pattern: /^بسم\s+الله\s+الرحمن\s+الرحيم/i,
      rules: [
        {
          confirmType: "basmala",
          rejectTypes: ["action", "scene-header-3"],
          minConfidence: 99,
          explanation: "البسملة يجب أن تكون باسم الله دائماً",
        },
      ],
    },
    {
      pattern: /^مشهد\s*\d+.*[-–:].*(?:داخلي|خارجي|ليل|نهار)/i,
      rules: [
        {
          confirmType: "scene-header-top-line",
          rejectTypes: ["action", "scene-header-3"],
          minConfidence: 95,
          explanation: "رأس مشهد كامل يحتوي على جميع المعلومات",
        },
      ],
    },
    {
      pattern: /^(?:قطع|انتقل|ذهاب|عودة|تلاشي|اختفاء|ظهور)\s*(?:إلى|من|في)/i,
      rules: [
        {
          confirmType: "transition",
          rejectTypes: ["action"],
          minConfidence: 90,
          explanation: "كلمات انتقالية معروفة",
        },
      ],
    },
    {
      pattern: /^\(.+\)$/,
      rules: [
        {
          confirmType: "parenthetical",
          rejectTypes: ["action", "dialogue"],
          minConfidence: 95,
          explanation: "نص بين قوسين هو ملاحظة إخراجية",
        },
      ],
    },
    {
      pattern: /^(?:INT\.|EXT\.|INT\/EXT\.|داخلي|خارجي|داخلي\/خارجي)/i,
      rules: [
        {
          confirmType: "scene-header-3",
          rejectTypes: ["action"],
          minConfidence: 92,
          explanation: "بداية رأس مشهد بمكان داخلي أو خارجي",
        },
      ],
    },
  ];

  /**
   * مراجعة ذكية تلقائية مع قواعد متقدمة
   * @param classifications قائمة التصنيفات المراد مراجعتها
   * @returns قائمة التصحيحات المقترحة مرتبة حسب الأهمية
   */
  autoReview(
    classifications: ClassificationInput[],
  ): CorrectionSuggestion[] {
    const corrections: CorrectionSuggestion[] = [];

    classifications.forEach((c, index) => {
      // فحص القواعد المعروفة
      for (const kb of this.knowledgeBase) {
        if (kb.pattern.test(c.text)) {
          for (const rule of kb.rules) {
            if (rule.rejectTypes.includes(c.type)) {
              corrections.push({
                index,
                original: c.type,
                suggested: rule.confirmType,
                confidence: Math.min(100, c.confidence + 15),
                reason: rule.explanation,
                severity: c.confidence < 60 ? "high" : "medium",
              });
              break;
            }
          }
        }
      }

      // فحص الانتقالات غير الصحيحة
      if (index > 0) {
        const prevType = classifications[index - 1].type;
        const validNext = this.getValidNextTypes(prevType);

        if (!validNext.includes(c.type) && c.confidence < 80) {
          corrections.push({
            index,
            original: c.type,
            suggested: validNext[0],
            confidence: c.confidence - 10,
            reason: `الانتقال من ${prevType} إلى ${c.type} غير معتاد`,
            severity: "low",
          });
        }
      }
    });

    return corrections.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * الحصول على الأنواع الصالحة التالية بعد نوع معين
   * @param type النوع الحالي
   * @returns قائمة الأنواع الصالحة التالية
   */
  private getValidNextTypes(type: string): string[] {
    const transitions: { [key: string]: string[] } = {
      basmala: ["scene-header-top-line", "action"],
      "scene-header-top-line": ["scene-header-3", "action"],
      "scene-header-3": ["action", "blank"],
      action: ["character", "transition", "action", "blank"],
      character: ["dialogue", "parenthetical"],
      dialogue: ["parenthetical", "action", "character", "blank"],
      parenthetical: ["dialogue", "action", "blank"],
      transition: ["scene-header-top-line", "action"],
      blank: ["action", "character", "scene-header-top-line"],
    };

    return transitions[type] || ["action"];
  }

  /**
   * إضافة قاعدة جديدة إلى قاعدة المعرفة
   * @param pattern النمط للتطابق
   * @param rules القواعد المرتبطة بهذا النمط
   */
  addRule(
    pattern: RegExp,
    rules: {
      confirmType: string;
      rejectTypes: string[];
      minConfidence: number;
      explanation: string;
    }[],
  ): void {
    this.knowledgeBase.push({ pattern, rules });
  }

  /**
   * إزالة قاعدة من قاعدة المعرفة
   * @param pattern النمط المراد إزالته
   * @returns true إذا تمت الإزالة بنجاح
   */
  removeRule(pattern: RegExp): boolean {
    const initialLength = this.knowledgeBase.length;
    this.knowledgeBase = this.knowledgeBase.filter(
      (kb) => kb.pattern.source !== pattern.source,
    );
    return this.knowledgeBase.length < initialLength;
  }

  /**
   * الحصول على عدد القواعد في قاعدة المعرفة
   * @returns عدد القواعد المخزنة
   */
  getRuleCount(): number {
    return this.knowledgeBase.length;
  }

  /**
   * مسح جميع القواعد (إعادة تعيين النظام)
   */
  reset(): void {
    this.knowledgeBase = [];
  }

  /**
   * فحص سطر واحد فقط
   * @param text نص السطر
   * @param type النوع الحالي
   * @param confidence الثقة الحالية
   * @param previousType النوع السابق (اختياري)
   * @returns التصحيح المقترح أو null إذا كان صحيحاً
   */
  reviewSingleLine(
    text: string,
    type: string,
    confidence: number,
    previousType?: string,
  ): SingleLineSuggestion | null {
    // فحص القواعد المعروفة
    for (const kb of this.knowledgeBase) {
      if (kb.pattern.test(text)) {
        for (const rule of kb.rules) {
          if (rule.rejectTypes.includes(type)) {
            return {
              suggested: rule.confirmType,
              confidence: Math.min(100, confidence + 15),
              reason: rule.explanation,
              severity: confidence < 60 ? "high" : "medium",
            };
          }
        }
      }
    }

    // فحص الانتقالات إذا كان هناك نوع سابق
    if (previousType) {
      const validNext = this.getValidNextTypes(previousType);
      if (!validNext.includes(type) && confidence < 80) {
        return {
          suggested: validNext[0],
          confidence: confidence - 10,
          reason: `الانتقال من ${previousType} إلى ${type} غير معتاد`,
          severity: "low",
        };
      }
    }

    return null;
  }

  /**
   * تصدير قاعدة المعرفة كـ JSON
   * @returns JSON string لقاعدة المعرفة
   */
  exportKnowledgeBase(): string {
    return JSON.stringify(
      {
        rules: this.knowledgeBase.map((kb) => ({
          pattern: kb.pattern.source,
          flags: kb.pattern.flags,
          rules: kb.rules,
        })),
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
  }

  /**
   * استيراد قاعدة المعرفة من JSON
   * @param jsonData JSON string تحتوي على القواعد
   * @returns true إذا نجح الاستيراد
   */
  importKnowledgeBase(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.rules && Array.isArray(data.rules)) {
        this.knowledgeBase = data.rules.map(
          (r: { pattern: string; flags?: string; rules?: unknown }) => ({
            pattern: new RegExp(r.pattern, r.flags || "gi"),
            rules: (r.rules || {}) as {
              confirmType: string;
              rejectTypes: string[];
              minConfidence: number;
              explanation: string;
            }[],
          }),
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("فشل استيراد قاعدة المعرفة:", error);
      return false;
    }
  }
}
